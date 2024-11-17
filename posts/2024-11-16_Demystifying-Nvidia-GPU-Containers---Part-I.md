---
publish_date: 2024-11-16
title: Demystifying Nvidia GPU Containers - Part I
---

# Demystifying Nvidia GPU Containers - Part I

This blog post is a deep dive into how Nvidia GPU containers work "under the hood" on platforms like Kubernetes and Docker when you request a GPU container. The information presented here is relevant to Kubernetes, Docker, and any other container platform that uses containerd (or CRI-O)

**Disclaimer:** To the best of my knowledge, the information in this post is correct. However, this is a complicated topic with many layers and wrappers. Please feel free to reach out to me on Twitter if you have any suggested corrections, and I'll update this post.

## Prerequisites

I'm going to assume you have a basic working knowledge of Docker and or Kubernetes and know how to request a GPU container. If you'd like to brush up on your knowledge of the various layers of Kubernetes, see my article on [Kubernetes Container Acronyms](https://gflarity.deno.dev/2024-03-20_Kubernetes-Container-Acronyms).

## Turtles All The way Down

### containerd

Both Docker and most managed Kubernetes platforms utilize `containerd` as their default container runtime. However, `containerd` in turn relies itself relies on various OCI (Open Container Initiative) runtimes to create and manage containers. These include `runc`, `crun`, and `runsc` (gvisor). Let's just use `runc` as a placeholder for OCI Runtime.

### nvidia-container-runtime

GPU containers are special, instead of calling `runc` directly, it calls the [Nvidia Container Runtime](https://github.com/NVIDIA/nvidia-container-toolkit/tree/main/cmd/nvidia-container-runtime) instead. The Nvidia Container Runtime is mostly just a pass-through wrapper, **except** when the "create" argument is passed to the OCI runtime ([source code](https://github.com/NVIDIA/nvidia-container-toolkit/blob/1995925a7df644ead7afb767608841d9a08bcbc4/internal/runtime/runtime_factory.go#L39)). For create operations, the OCI runtime `config.json` (spec) is modified.

There's a lot of old code and pathways for backward compatibility, but on the modern hardware I've played with, the wrapper always seems to default to "legacy". In legacy mode, the `config.json` seems to be modified in two main ways:

1.  **Adding environment variables:** Most notably, `NVIDIA_VISIBLE_DEVICES=0`, which contains a comma-separated list of IDs that reference the Nvidia visible devices to be shared with the container. A full list of other environment variables that might be added is available [here](https://github.com/NVIDIA/nvidia-container-toolkit/tree/main/cmd/nvidia-container-runtime#environment-variables-oci-spec).

2.  **Adding a prestart hook:**

    ```json
    "hooks": {
      "prestart": [
        {
          "path": "/usr/bin/nvidia-container-runtime-hook",
          "args": [
            "nvidia-container-runtime-hook",
            "prestart"
          ]
        }
      ]
    },
    ```

The prestart hook will get called when a container is created/started as part of the [OCI Runtime Lifecyle](https://github.com/opencontainers/runtime-spec/blob/main/runtime.md#runtime-and-lifecycle). Namely, right before it starts.

### nvidia-container-runtime-hook

The primary purpose of [nvidia-container-runtime-hook](https://github.com/NVIDIA/nvidia-container-toolkit/tree/main/cmd/nvidia-container-runtime-hook) seems to be calling the [nvidia-container-cli](https://github.com/NVIDIA/libnvidia-container).

# nvidia-container-cli

The [nvidia-container-cli](https://github.com/NVIDIA/libnvidia-container),
is responsible for making GPUs accessible within the container. This CLI, written in C, is a [relatively thin wrapper](https://github.com/NVIDIA/nvidia-container-toolkit/blob/1995925a7df644ead7afb767608841d9a08bcbc4/cmd/nvidia-container-runtime-hook/main.go#L66). While its documentation is limited, we can gain insights into its workings through the [command-line example](https://github.com/NVIDIA/libnvidia-container?tab=readme-ov-file#command-line-example) that Nvidia provides:

```bash
# Setup a new set of namespaces
cd $(mktemp -d) && mkdir rootfs
sudo unshare --mount --pid --fork

# Setup a rootfs based on Ubuntu 16.04 inside the new namespaces
curl [http://cdimage.ubuntu.com/ubuntu-base/releases/16.04/release/ubuntu-base-16.04.6-base-amd64.tar.gz](http://cdimage.ubuntu.com/ubuntu-base/releases/16.04/release/ubuntu-base-16.04.6-base-amd64.tar.gz) | tar -C rootfs -xz
useradd -R $(realpath rootfs) -U -u 1000 -s /bin/bash nvidia
mount --bind rootfs rootfs
mount --make-private rootfs
cd rootfs

# Mount standard filesystems
mount -t proc none proc
mount -t sysfs none sys
mount -t tmpfs none tmp
mount -t tmpfs none run
```

This code snippet creates the assemblage of a container, prepares the filesystem, creates a new user, and mounts `proc`, `sysfs`, `tmp`, and `run`. This is what `runc` would do before calling the `nvidia-container-runtime-hook`.

Now, the still-mysterious [nvidia-container-cli](https://github.com/NVIDIA/libnvidia-container) is run.

```bash
# Isolate the first GPU device along with basic utilities
nvidia-container-cli --load-kmods configure --ldconfig=@/sbin/ldconfig.real --no-cgroups --utility --device 0 $(pwd)
```

I'm hoping to take a more detailed look at what this does in a future post. However, we can gain some quick insights using `diff` along with filesystem hierarchy snapshots taken before and after running it.

```bash
diff before.txt after.txt
48a49
> ./dev/nvidia0
75a77
> ./dev/nvidiactl
32169a32172,32174
> ./proc/driver/nvidia/params
> ./proc/driver/nvidia/version
> ./proc/driver/nvidia/registry
32175,32196d32179
< ./proc/driver/nvidia/gpus/0000:00:05.0
< ./proc/driver/nvidia/gpus/0000:00:05.0/power
< ./proc/driver/nvidia/gpus/0000:00:05.0/registry
< ./proc/driver/nvidia/gpus/0000:00:05.0/information
< ./proc/driver/nvidia/params
< ./proc/driver/nvidia/patches
< ./proc/driver/nvidia/patches/README
< ./proc/driver/nvidia/suspend
< ./proc/driver/nvidia/version
< ./proc/driver/nvidia/registry
< ./proc/driver/nvidia/warnings
< ./proc/driver/nvidia/warnings/README
< ./proc/driver/nvidia/capabilities
< ./proc/driver/nvidia/capabilities/mig
< ./proc/driver/nvidia/capabilities/mig/config
< ./proc/driver/nvidia/capabilities/mig/monitor
< ./proc/driver/nvidia/capabilities/gpu0
< ./proc/driver/nvidia/capabilities/gpu0/mig
< ./proc/driver/nvidia/capabilities/gpu1
< ./proc/driver/nvidia/capabilities/gpu1/mig
< ./proc/driver/nvidia/capabilities/fabric-imex-mgmt
< ./proc/driver/nvidia/suspend_depth
32596,32959c32579,32942

... A bunch of /proc/#/ stuff removed as it's irrelevant, difference processes where running...

32991a32975
> ./usr/bin/nvidia-smi
33025a33010
> ./usr/bin/nvidia-debugdump
33159a33145
> ./usr/bin/nvidia-persistenced
35768a35755
> ./usr/lib/x86_64-linux-gnu/libnvidia-ml.so.560.35.03
36616a36604
> ./usr/lib/x86_64-linux-gnu/libnvidia-ml.so.1
36618a36607
> ./usr/lib/x86_64-linux-gnu/libnvidia-cfg.so.560.35.03
36623a36613
> ./usr/lib/x86_64-linux-gnu/libnvidia-cfg.so.1
36971a36962,36966
> ./lib/firmware
> ./lib/firmware/nvidia
> ./lib/firmware/nvidia/560.35.03
> ./lib/firmware/nvidia/560.35.03/gsp_ga10x.bin
> ./lib/firmware/nvidia/560.35.03/gsp_tu10x.bin
```

Key take aways:

- The GPU device `/dev/nvidia0` was mounted into the namespace.
- `/dev/nvidiactl` was mounted.
- The Nvidia device driver was mounted.
- Various tools were mounted (`nvidia-smi`, `nvidia-debugdump`, `nvidia-persistenced`, etc.).
- Various libraries were mounted.

So, from a high level, `nvidia-container-cli` helps the OCI runtime by making all the various GPU devices, drivers, libraries, and tooling available to the container.

Finally, in the example, we see the container finalized by isolating the container/process to the isolated namespace/filesystem and then running `nvidia-smi` to prove it all worked.

```bash
# Change into the new rootfs
pivot_root . mnt
umount -l mnt
exec chroot --userspec 1000:1000 . env -i bash

# Run nvidia-smi from within the container
nvidia-smi -L
```

## Conclusion

For me, the takeaway is that the "magic" really happens in [nvidia-container-cli](https://github.com/NVIDIA/libnvidia-container), and everything else seems to be helper wrappers, or maybe shims, to ensure that it's called at the right time with the right parameters.

As mentioned, I intend to dig into `nvidia-container-cli` in more detail. Also, enspired by Nvidia's example, I'd like to create a container from scratch using command line utulities. So stay tuned!
'

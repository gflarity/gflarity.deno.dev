---
publish_date: 2024-03-20
title: Kubernetes Checkpoint & Restore In 2024
---

Despite [debuting in Kubernetes 1.25](https://kubernetes.io/blog/2022/12/05/forensic-container-checkpointing-alpha/), it Kubernetes Checkpoint/Restore functionality doesn’t seem to have moved forward much. Support was only recently added to [containerd](https://github.com/containerd/containerd/pull/6965) (which powers most of the managed Kubernetes offering’s AFAIK). It’s also still only meant for “foresenics” and only exposed via the [Kubelet API](https://kubernetes.io/docs/reference/node/kubelet-checkpoint-api/). 

Fortunately, CRI-O supports running images built with snapshots. So we’re going to reproduce [Martin Hein’s blog post](https://martinheinz.dev/blog/85) and show how you can get setup a cluster with cri-o/runc/criu using [Kubeadm](https://kubernetes.io/docs/reference/setup-tools/kubeadm/). See my previous post if you [want to know what all these acronyms are](https://gflarity.deno.dev/2024-03-20_Kubernetes-Container-Acronyms)

Note: *I’m using [Lima](https://github.com/lima-vm/lima) on my Macbook to setup an ARM64 Ubuntu VM running linux. These instructions should be good for anyone using a Debian based linux distribution, and should still be helpful for those using other Linux distributions.* 

First, let’s install CRI-O and CIRU.

```bash
# install cri-o
curl -LO https://storage.googleapis.com/cri-o/artifacts/cri-o.arm64.v1.29.2.tar.gz
tar xzf cri-o.arm64.v1.29.2.tar.gz
cd cri-o
sudo ./install 

# install criu
apt-get install criu -y
```

Note: *CRI-O distributes both runc and crun, so we’re covered there.* 

Despite crun supporting checkpointing, I had to configure CRI-O to use runc in addition to enabling criu support. This can be done by changing `default_runtime = "crun"`  adding `enable_criu_support = true`to the crio configuration under [crio.runtime]. In my case the file I edited was `/etc/crio/crio.conf.d/10-crio.conf`.

```bash
[crio.runtime]
default_runtime = "runc"
enable_criu_support = true
```

Then have systemd start and run CRI-O on boot.

```bash
sudo systemctl daemon-reload
sudo systemctl enable crio
sudo systemctl start crio
```

Now let’s check that cri-o started properly.

```bash
root@lima-default:~# systemctl status crio
● crio.service - Container Runtime Interface for OCI (CRI-O)
     Loaded: loaded (/usr/local/lib/systemd/system/crio.service; enabled; preset: enabled)
     Active: active (running) since Mon 2024-03-18 13:18:11 EDT; 2min 36s ago
       Docs: https://github.com/cri-o/cri-o
   Main PID: 4066 (crio)
      Tasks: 9
     Memory: 8.4M
        CPU: 49ms
     CGroup: /system.slice/crio.service
             └─4066 /usr/local/bin/crio

Mar 18 13:18:11 lima-default crio[4066]: time="2024-03-18 13:18:11.596451833-04:00" level=info msg="Conmon does support the --log-global-size-max option"
Mar 18 13:18:11 lima-default crio[4066]: time="2024-03-18 13:18:11.597602736-04:00" level=info msg="Found CNI network crio (type=bridge) at /etc/cni/net.d/11-crio-ipv4-bridge.conflist"
Mar 18 13:18:11 lima-default crio[4066]: time="2024-03-18 13:18:11.597623070-04:00" level=info msg="Updated default CNI network name to crio"
Mar 18 13:18:11 lima-default crio[4066]: time="2024-03-18 13:18:11.597757865-04:00" level=info msg="Attempting to restore irqbalance config from /etc/sysconfig/orig_irq_banned_cpus"
Mar 18 13:18:11 lima-default crio[4066]: time="2024-03-18 13:18:11.597784282-04:00" level=info msg="Restore irqbalance config: failed to get current CPU ban list, ignoring"
Mar 18 13:18:11 lima-default crio[4066]: time="2024-03-18 13:18:11.598965270-04:00" level=info msg="Registered SIGHUP reload watcher"
Mar 18 13:18:11 lima-default crio[4066]: time="2024-03-18 13:18:11.598977020-04:00" level=info msg="Starting seccomp notifier watcher"
Mar 18 13:18:11 lima-default crio[4066]: time="2024-03-18 13:18:11.598993437-04:00" level=info msg="Create NRI interface"
Mar 18 13:18:11 lima-default crio[4066]: time="2024-03-18 13:18:11.598998813-04:00" level=info msg="NRI interface is disabled in the configuration."
Mar 18 13:18:11 lima-default systemd[1]: Started crio.service - Container Runtime Interface for OCI (CRI-O).
```

Looking good, now let’s confirm checkpoint/restore functionality was enabled.

```bash
journalctl -u crio.service
```

We’re looking for something like:

```bash
Mar 18 13:18:11 lima-default crio[4066]: time="2024-03-18 13:18:11.585774692-04:00" level=info msg="Checkpoint/restore support enabled"
```

Now that we have the foundation in place, let’s install kubeadm, kubectl, and kubelet by following instructions from the [kubernetes documentation](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/).  Update the `apt` package index and install packages needed to use the Kubernetes `apt` repository.

```bash

sudo apt-get update
# apt-transport-https may be a dummy package; if so, you can skip that package
sudo apt-get install -y apt-transport-https ca-certificates curl gpg

```

Download the public signing key for the Kubernetes package repositories. The same signing key is used for all repositories so you can disregard the version in the URL.

```bash
# If the directory `/etc/apt/keyrings` does not exist, it should be created before the curl command, read the note below.
# sudo mkdir -p -m 755 /etc/apt/keyrings
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
```

Add the appropriate Kubernetes `apt` repository.

```bash
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list
```

Note: *Please note that this repository have packages only for Kubernetes 1.29; for other Kubernetes minor versions, you need to change the Kubernetes minor version in the URL to match your desired minor version (you should also check that you are reading the documentation for the version of Kubernetes that you plan to install.*

Update the `apt` package index, install kubelet, kubeadm and kubectl, and pin their version:

```bash
sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl
# This prevents apt from updating these with automatical updates.
# It's not really necessary for this use case.
sudo apt-mark hold kubelet kubeadm kubectl
```

We need to know the IP of the VM we’re running on, just use ifconfig. My ip was `192.168.5.15`.

```bash
apt-get install net-tools
ifconfig

```

Create some kubeadm config following Martin’s instructions, I’ve updated the Kubernetes version to 1.29 and used the IP that I found with ifconfig. 

```bash
# kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: 192.168.5.15
  bindPort: 6443
nodeRegistration:
  criSocket: "unix:///var/run/crio/crio.sock"
---
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
featureGates:
  ContainerCheckpoint: true
---
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
kubernetesVersion: v1.29.0
apiServer:
  extraArgs:
    feature-gates: "ContainerCheckpoint=true"
controllerManager:
  extraArgs:
    feature-gates: "ContainerCheckpoint=true"
scheduler:
  extraArgs:
    feature-gates: "ContainerCheckpoint=true"
networking:
  podSubnet: 10.244.0.0/16
```

Note that kubernetes/kubeadm, at least for this installation, needs netfilter be able to act on bridged traffic. Run this:

```bash
sudo modprobe br_netfilter
```

If you want to make this change persistent: 

```bash
echo 'br_netfilter' | sudo tee -a /etc/modules-load.d/modules.conf
```

After loading the module, ensure that the **`bridge-nf-call-iptables`** is set to 1:

```bash
echo '1' | sudo tee /proc/sys/net/bridge/bridge-nf-call-iptables
```

Kubernetes generally also requires IP forwarding to route the traffic correctly. To enable IP forwarding, execute:

```bash
sudo sysctl -w net.ipv4.ip_forward=1
```

To make the change permanent, edit the file **`/etc/sysctl.conf`** and add the following line:

```bash
net.ipv4.ip_forward = 1
```

Now run kubeadm.

```bash
kubeadm init --config=./kubeadm-config.yaml --upload-certs | tee kubeadm-init.out
```

If all goes well, follow the instructions kubeadm gives yout o connect to your new kubernetes cluster. I ran this as root:

```bash
export KUBECONFIG=/etc/kubernetes/admin.conf
kubectl get nodes
```

If all went well, you should see:

```bash
root@lima-default:/home/geoff.linux# kubectl get nodes
NAME           STATUS   ROLES           AGE     VERSION
lima-default   Ready    control-plane   6m21s   v1.29.3
```

Before we can run the nginx pod we’re going to be using to test, we need to untaint the control plane mode so that pods can run there.

```bash
kubectl taint nodes --all node-role.kubernetes.io/control-plane-
```

Then we can run our nginx pod.

```bash
kubectl run webserver --image=nginx -n default
kubectl get pods 
```

Once the pod is running, we can play around with checkpointing.

```bash
curl -sk -X POST  "https://localhost:10250/checkpoint/default/webserver/webserver"   --key /etc/kubernetes/pki/apiserver-kubelet-client.key   --cacert /etc/kubernetes/pki/ca.crt   --cert /etc/kubernetes/pki/apiserver-kubelet-client.crt

```
This returns the following result with the location of the checkpoint tar file.
```json
{"items":["/var/lib/kubelet/checkpoints/checkpoint-webserver_default-webserver-2024-03-18T15:50:57-04:00.tar"]}
```

Let’s take a look inside the tar file.
```json
# tar tf /var/lib/kubelet/checkpoints/checkpoint-webserver_default-webserver-2024-03-18T15:50:57-04:00.tar
stats-dump
dump.log
checkpoint/
checkpoint/cgroup.img
checkpoint/core-1.img
checkpoint/core-29.img
checkpoint/core-30.img
checkpoint/core-31.img
checkpoint/core-32.img
checkpoint/descriptors.json
checkpoint/fdinfo-2.img
checkpoint/fdinfo-3.img
checkpoint/fdinfo-4.img
checkpoint/fdinfo-5.img
checkpoint/fdinfo-6.img
checkpoint/files.img
checkpoint/fs-1.img
checkpoint/fs-29.img
checkpoint/fs-30.img
checkpoint/fs-31.img
checkpoint/fs-32.img
checkpoint/ids-1.img
checkpoint/ids-29.img
checkpoint/ids-30.img
checkpoint/ids-31.img
checkpoint/ids-32.img
checkpoint/inventory.img
checkpoint/ipcns-var-11.img
checkpoint/memfd.img
checkpoint/mm-1.img
checkpoint/mm-29.img
checkpoint/mm-30.img
checkpoint/mm-31.img
checkpoint/mm-32.img
checkpoint/mountpoints-13.img
checkpoint/netns-10.img
checkpoint/pagemap-1.img
checkpoint/pagemap-29.img
checkpoint/pagemap-30.img
checkpoint/pagemap-31.img
checkpoint/pagemap-32.img
checkpoint/pagemap-shmem-1046.img
checkpoint/pages-1.img
checkpoint/pages-2.img
checkpoint/pages-3.img
checkpoint/pages-4.img
checkpoint/pages-5.img
checkpoint/pages-6.img
checkpoint/pstree.img
checkpoint/seccomp.img
checkpoint/timens-0.img
checkpoint/tmpfs-dev-174.tar.gz.img
checkpoint/tmpfs-dev-179.tar.gz.img
checkpoint/tmpfs-dev-180.tar.gz.img
checkpoint/tmpfs-dev-181.tar.gz.img
checkpoint/utsns-12.img
config.dump
spec.dump
bind.mounts
rootfs-diff.tar
io.kubernetes.cri-o.LogPath
```

Note: *Neato!* 

Let’s build a new image from this snapshot, we’re going to use `buildah` to build the OCI compliant image (though apparently docker works too).
```json
sudo apt-get -y install buildah
```

Create the Dockerfile.
```docker
FROM scratch
ADD webserver.tar .
```

Note:  *We use ADD because it extracts archives for us.* 

Copy the tar file into the directory with the Dockerfile.

```bash
cp /var/lib/kubelet/checkpoints/checkpoint-webserver_default-webserver-2024-03-18T15:50:57-04:00.tar ./webserver.tar
```

Now build the image.
```json
buildah build --annotation=io.kubernetes.cri-o.annotations.checkpoint.name=webserver  -t restore-webserver:latest .
```
Note:  *Notice the magic annotation we added, [this is for CRI-O](https://github.com/cri-o/cri-o/blob/49689790e0a8182897bbc4964ecd4c0a36131463/pkg/annotations/checkpoint.go#L6). When this annotation is set, CRI-O will restore the checkpoint rather than start it up as a regular container image. It’s like a flag for the restore magic.* 

Now push it. You’ll need be authenticated to a repository, I’m using Docker hub, see their documentation for instructions on how to authenticate.

```bash
buildah push localhost/restore-webserver:latest docker.io/<your username>/restore-webserver:latest
```

Now let’s restore it! Here’s the pod yaml we’ll be applying.

```bash
# pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: restore-webserver
  labels:
    app: nginx
spec:
  containers:
  - name: webserver
    image: docker.io/<your username>/restore-webserver:latest

```

And let’s apply it:

```bash
kubectl apply -f pod.yaml
```

Once created we can test it out with curl:

```bash
curl http://$(kubectl get pod restore-webserver -o=jsonpath='{.status.podIP}')
```

You should see the nginx welcome page.  Congratulations, you’ve just restored a checkpoint of a running container successfully!

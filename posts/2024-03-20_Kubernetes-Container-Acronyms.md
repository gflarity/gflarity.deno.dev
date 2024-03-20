---
publish_date: 2024-03-20
title: Kubernetes Container Acronyms (KCA)
---

What are the building blocks of the Kubernetes Container landscape? CRI, OCI, CRI-O, containerd, runc, crun, runsc... There’s, well, a lot of c’s in there! It can be easy to mix these up, and annoying to understand how they all relate. I’m going to quickly break these down, if for no other reason than to provide myself with a reference in the future. We're start from the top and work our way down. 


# Kubelet

Kubelet is a key component of the Kubernetes system. It is an agent that runs on each node in the cluster and ensures that containers are running in a pod as expected. It takes a set of PodSpecs that are provided (via various means) and ensures that the containers described in those PodSpecs are running and healthy. The Kubelet doesn't manage containers which were not created by Kubernetes.

# CRI

Container Runtime Interface, is an API used by Kubernetes to leverage a variety of container runtimes, without needing to understand the specifics of each one. Its purpose is to provide a common way to interface with the underlying container runtimes.

When a container is to be run in Kubernetes, the Container Runtime Interface (CRI) communicates with the container runtime, such as containerd. The CRI does not need to understand the specifics of the container runtime; it simply provides a standard way to communicate with it.

CRI is a protocol buffers-based API, which involves two major communication components - the Image Service and the Runtime Service. The Image Service provides RPCs to pull an image from a repository, inspect image, and remove an image, while the Runtime Service involves operations such as creating, starting, stopping, and deleting a container. As for the technologies, CRI can interface with various container runtimes, including but not limited to, containerd, CRI-O, and Docker.

# OCI

OCI stands for Open Container Initiative. In the context of Kubernetes, it’s a project that provides a set of industry standards for a container runtime environment, which ensures interoperability between different container tools and technologies.

# OCI Runtime

An OCI Runtime is a piece of software that implements the OCI runtime specification. It's responsible for the execution of containers in accordance with the OCI container runtime specification. Examples of OCI Runtimes include runc and crun.

# CRI-O

CRI-O is a CRI container runtime built specifically for Kubernetes. It allows Kubernetes to use any OCI-compliant runtime as the container runtime for running Pods, processes running on a host in a Kubernetes cluster. It’s used by OpenShift in particular. 

# containerd

containerd is a OCI  container runtime that also provides the CRI API. It's a daemon for Linux and Windows, managing the full container lifecycle of its host system, from image transfer and storage, to container execution and supervision, to low-level storage, and network attachments.

# runc

runc is an example of an OCI Runtime. It's a CLI tool for spawning and running containers according to the OCI specification. It's essentially the container runtime that Docker (via containerd) uses by default. It's written in the Go programming language.

# crun

crun is another example of an OCI Runtime. Similar to runc, it is a tool for spawning and running containers according to the OCI specification. However, unlike runc, crun is written in C, the goal being to allow it to start faster and use less memory than runc. 

*Note: as far as the author can tell, most managed Kubernetes solutions (EKS, GKE) use containerd + runc. Perhaps because [containerd + runc is the default with docker,](https://docs.docker.com/engine/alternative-runtimes/) and thus potentially more mature. This just my speculation though.* 

# runsc

runsc, Google's implementation of an OCI Runtime, provides a unique isolation boundary between the application and the host kernel. Unlike traditional container runtimes that share the host kernel's system calls directly with the applications, runsc intercepts these system calls and handles them within the sandbox environment. This adds an extra layer of security and isolation, as it limits the application's direct interaction with the host kernel. It's a part of gVisor, a project aimed at providing a more secure and sandboxed environment for running containers and is designed to work with Kubernetes, Docker, and containerd.

# CRIU

CRIU, short for Checkpoint/Restore In Userspace, is a Linux software that allows freezing a running application (or a part of it) and saving it as a checkpoint to the hard drive. This can be used to later put the application back into the exact same state. It's often used in container technology for tasks like live migration, fast software restart, and saving resources by freezing rarely used applications. The runtime runc, crun, runsc all claim to work with CRIU. 

Note:  *In my experimentation, runc doesn’t seem to support CRIU ‘out of the box’, by default [despite merging CRIU support back in 2020](https://github.com/containers/crun/issues/71). I’ve only successfully gotten it to work via CRI-O with runc at the time of writing.*
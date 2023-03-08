---
publish_date: 2012-12-28
layout: post
title: SSH Agent Forwarding
categories:
- blog
---

I was having some issues getting my SSH Agent to forward. Turns out my understanding was completely inadequate. Here's a quick run through for anyone else who might benefit.

# High Level Concept

Say you have hosts A B C and you want to connect like so: A->B->C. SSH allows you forward your 'Agent' such that your credentials for host A can be used on on host C as if B wasn't even involved. It does so by forwarding a unix domain socket provided by A's agent to B (usually in /tmp/ssh-??) when you connect from A->B. Then when you connect B->C instead of C interacting with B's agent, it interacts with the forwarded Agent provided by A. 

# Configuration

   - Make sure 'AllowAgentForwarding no' is *not* set it in /etc/ssh/sshd_config on B (it defaults to yes if it's not explicitly set to no).
   - Make sure your client config has 'ForwardAgent yes', you'll likely want to do this which specific hosts you trust/control, as a program on B will able to login as you (only while you're connected) if it wants. Edit ~/.ssh/config and add something similar to the following:
<pre>
Host examplehost.com
  ForwardAgent yes
</pre>
<p></p>
   - Tell your ssh-agent on A that you want make an identity available through it. Run the follow from a terminal:
<pre>
ssh-add
</pre>
<p></p>
That's it. You should be able to login to C from B using your credentials securely stored on A. 



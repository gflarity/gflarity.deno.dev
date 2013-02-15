---
layout: post
title: Secure Replication With Postgres 9.1
categories:
- blog
---

Have having been the MySQL DBA-By-Default (DBA-B-D) in another life, I've must to admit to being much happier with postgres despite what I consider to be documentation holes. As a DBA-B-D (aka DevOps, aka Co-Founder) I find lacking concise up-to-date documentation for specific tasks or howtos. Replication is one such task. I had to merge bits and pieces from a number of sources, including mailing list posts,  together in order to get what I wanted. I'm not complaining though, rather this my contribution to improving this situation. 

# Why Secure Replication

The Cloud, aka outsourced VPS hosting with an API. Most of the documentation seems to expect you to be running this in our private secure network partitioned data center. 

# High Level Overview

TODO

# Secure Replication With Postgres 9.1

Generate a self signed keypair and CA ( assuming you don't have one already ).

## On The Master

Update the postgres.conf on your master to enable WAL support for replication:
<p/>
<pre>
wal_level = hot_standby
max_wal_senders = 3
</pre>
<p/>

Add the following to authorize the client to replicate against the db. Note that we're only authorizing an SSL connection from replication user on all databases from $SLAVE_IP with password based authentication (md5).

<p/>
<pre>
hostssl replication all $SLAVE_IP/32    md5
</pre>
<p/>

The Postgres data dir for Ubuntu 12-04 is in /var/lib/postgresql/9.1/main

You'll need an SSL key and cert and root cert (CA). You can generate your own CA and self signed cert if you want as well. To do so see the Keys and Certs section of http://gflarity.github.com/2012/07/25/client-ssl-auth/

## On The Slave

If postgres is running on the SLAVE, bring it down. You're going to wipe out whatever is there and create a backup from the master. 

Switch to postgres user from here on. 

First, delete the the contents of $PG_DATA ( /var/lib/postgresql/9.1/main/ on Ubuntu/Debian ).

<p/>
<pre>
sudo su - postgres
rm -rf /var/lib/postgresql/9.1/main/
</pre>
<p/>

Now use pg_basebackup to create the backup we're going to start replicaiton from. You'll be prompted for the postgres user password ($PG_PASS).

<p/>
<pre>
pg_basebackup -D /var/lib/postgresql/9.1/main/ -x -h $MASTER_IP
</pre>
<p/>

Once complete, create a file called recovery.conf with the following contents inside your postgres data dir on the slave. 
<p/>
<pre>
standby_mode = 'on'
# 'touch' the file below to initiate fail over ( break replication, become read-write )
trigger_file = '$PG_DATA/failover'
primary_conninfo='host=$MASTER_IP port=5432 sslmode=verify-ca password=$PG_PASS'
</pre>
<p/>

Add the followng to the postgres.conf file:
<p/>
<pre>
hot_standby = on
</pre>
</p>

Link to the root cert used to verify the master:
<p/>
<pre>
ln -s /etc/ssl/
</pre>
</p>


Start postgres and tail the log, you should see replication starting. On Ubuntu:
<p/>
<pre>
service postgres start
tail -f /var/log/postgresql/postgresql-9.1-main.log
</pre>
</p>





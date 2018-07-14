---
date: 2012-04-05
layout: post
title: Finding Quality Node Modules
categories:
- blog
---

Last night we had a great second Node.js Toronto meetup. There was some frustration directed towards the problem knowing which modules are of high quality. This is an acknowledged pain point in the node.js community but it'll get better soon.

It's worth noting this problem has been discussed a couple times by the current node Project Manager [isaacs](https://github.com/isaacs) on the [NodeUp](http:///nodeup.com)* podcast, though I'm not exactly sure which. Apparently they're working a new version of [npm](http://npmjs.org) website right now. 

In the meantime, finding quality node modules isn't all that hard. With a bit of experience you'll start to recognize names and learn to judge module quality quite quickly. Here's some tips:


- the following gives you the most depended on modules [http://search.npmjs.org/#/_browse/deps](http://search.npmjs.org/#/_browse/deps)
- take a look at this list first
- take note of the names of these authors
- you'll notice certain people or organizations publish a lot (substack and NodeJitsu for instance )
- also take a look at the modules wiki at https://github.com/joyent/node/wiki/modules
- otherwise search http://search.npmjs.org/
- visit the github page for the module, it's usually next to the name
- there's no real excuse not to have a github page (or google code I supposed), I avoid these modules
- look for a clean well written README
- if someone really wants you to use their module they'll make it easy to do so with a synopsis/quick start/tutorial
- does the module have watchers?
- tests?
- how does the code look?
- are there alternatives?
- how hard is to write your own?

\* The NodeUp podcast is great. I highly recommend it.

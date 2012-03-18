---
layout: post
title: Disqus On Github
categories:
- blog
---

I had some trouble getting disqus to work with my github page. Turns out I needed to add the following to my disqus javascript:

`
var disqus_url = 'http://gflarity.github.com{{ page.url }}';
`

Now it all works like a charm. 

Thanks to [http://davidwinter.me/articles/2011/10/29/setting-up-github-pages/](http://davidwinter.me/articles/2011/10/29/setting-up-github-pages/).


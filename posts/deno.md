---
title: "Deno" # Title of the blog post.
date: 2021-03-12T21:48:15-05:00 # Date of post creation.
description: "Geoff's initial review of deno (https://deno.land)." # Description used for search engine.
featured: true # Sets if post is a featured post, making appear on the home page side bar.
draft: true # Sets whether to render this page. Draft of true will not be rendered.
toc: false # Controls if a table of contents should be generated for first-level links automatically.
# menu: main
#featureImage: "/images/path/file.jpg" # Sets featured image on blog post.
#thumbnail: "/images/path/thumbnail.png" # Sets thumbnail image appearing inside card on homepage.
#shareImage: "/images/path/share.png" # Designate a separate image for social media sharing.
codeMaxLines: 10 # Override global value for how many lines within a code block before auto-collapsing.
codeLineNumbers: false # Override global value for showing of line numbers within code block.
figurePositionShow: true # Override global value for showing the figure label.
categories:
  - Technology
tags:
  - Tag_name1
  - Tag_name2
# comment: false # Disable comment if false.
---

I recently decided to kick the tires of [Deno](https://deno.land/). While Golang is still my goto language of choice, I must say that Deno has a number of design choices that seem run the gamet of good, to "why has this taken so long, this is great.". Let's break those down.

## First Class Typescript Support

JavaScript is ubiquitous, and the chrome derived run-times are impressive features of engineering. However, JavasScript in large projects can be come wieldy and compile time type checking is a feature not a bug.  TypeScript is weird in it's own way, but the language itself it's better than vanilla JavaScript (it's an ergonomic superset so this almost has to be true). The tooling though, well dealing with typescript compilers can quickly become a PITA, and even a bit of dark art.

After using Deno with TypeScript, the first thought that comes to mind is "finally!". Deno solves the main disadvantage of TypeScript by having first class typescript support without needing to fiddle around with npm packages and compiler settings. With Deno, TypeScript has arrived. I wonder if browsers will ever let you just load .ts directly now.

## Permissions

From the [Deno website](https://deno.land/manual@v1.8.1/getting_started/permissions): 
> Access to security-sensitive areas or functions requires the use of permissions to be granted to a Deno process on the command line.

Here's a real example for illustration:

```sh
deno run --allow-net https://deno.land/std/examples/echo_server.ts
```

If this seems familiar, it is. This is analogous to the permissions that mobile apps require. It's also similar to the capabilities you can drop and then add to docker containers.

## Running Scripts From Urls
It may not be obvious at first, but the ability to run scripts from websites securely with permissions that are remenscient of mobile apps is powerful.

```sh
deno run --allow-net https://deno.land/std/examples/echo_server.ts
```

## Importing Modules as URLs

Rather than maintaining a package.json, supports importing (versioned) URLs. 

```typescript
import { walk, WalkEntry, WalkOptions } from "https://deno.land/std@0.88.0/fs/mod.ts";
```

### Good

* No need for a package manager, that functionality is built into deno itself. (good?) This recognizes that node without npm isn't node. 
* No need for a centralized registery. (good?)
* filesystem-less usecases?

### Bad

* Scanning for vulns?

## Standalone Executables

* for making proprietary binaries?
* bundling command line utilities is better?
* cleaner?
* just seems to make it a first class command line utility language

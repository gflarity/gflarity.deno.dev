---
publish_date: 2023-03-10
title: Deno Fresh Deep Dive - Part I - The Manifest
---
One of the first things you might find surprising about Fresh, is the file called `fresh.gen.ts`. This file comes part of a fresh (pun intended) project scaffolding. It contains the 'manifest', it looks like this for a brand new project:

```TypeScript
// DO NOT EDIT. This file is generated by fresh.
// This file SHOULD be checked into source version control.
// This file is automatically updated during development when running `dev.ts`.

import config from "./deno.json" assert { type: "json" };
import * as $0 from "./routes/[name].tsx";
import * as $1 from "./routes/api/joke.ts";
import * as $2 from "./routes/index.tsx";
import * as $$0 from "./islands/Counter.tsx";

const manifest = {
  routes: {
    "./routes/[name].tsx": $0,
    "./routes/api/joke.ts": $1,
    "./routes/index.tsx": $2,
  },
  islands: {
    "./islands/Counter.tsx": $$0,
  },
  baseUrl: import.meta.url,
  config,
};

export default manifest;
```

Where does it come from? Well if we delete and then start the dev server using `deno task start` it comes right back. So it's generated during the development process, namely whenever it restarts thanks to the --watch you see the in task definition:

```JSON
{
  "tasks": {
    "start": "deno run -A --watch=static/,routes/ dev.ts"
  },
  "importMap": "./import_map.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "preact"
  }
}
```

But where does this happen? Open up the `dev.ts` file:

```TypeScript
#!/usr/bin/env -S deno run -A --watch=static/,routes/

import dev from "$fresh/dev.ts";

await dev(import.meta.url, "./main.ts");
```

There's only one function here. Let's follow the rabbit:

```TypeScript
export async function dev(base: string, entrypoint: string) {
  ensureMinDenoVersion();

  entrypoint = new URL(entrypoint, base).href;

  const dir = dirname(fromFileUrl(base));

  let currentManifest: Manifest;
  const prevManifest = Deno.env.get("FRSH_DEV_PREVIOUS_MANIFEST");
  if (prevManifest) {
    currentManifest = JSON.parse(prevManifest);
  } else {
    currentManifest = { islands: [], routes: [] };
  }
  const newManifest = await collect(dir);
  Deno.env.set("FRSH_DEV_PREVIOUS_MANIFEST", JSON.stringify(newManifest));

  const manifestChanged =
    !arraysEqual(newManifest.routes, currentManifest.routes) ||
    !arraysEqual(newManifest.islands, currentManifest.islands);

  if (manifestChanged) await generate(dir, newManifest);

  await import(entrypoint);
}
```

So the very first thing Fresh does in development mode, is check the version of Deno. Next it either loads the previous manifest by the previous dev process, or creates a starter fake stub of one. 


```TypeScript
  let currentManifest: Manifest;
  const prevManifest = Deno.env.get("FRSH_DEV_PREVIOUS_MANIFEST");
  if (prevManifest) {
    currentManifest = JSON.parse(prevManifest);
  } else {
    currentManifest = { islands: [], routes: [] };
  }
```

Turns out this environment variable, is just a stringified output of the 'collect' function, not an actual `fresh.gen.ts` file. You can check out the code (at the time of writing),  [here](https://github.com/denoland/fresh/blob/7e72fa236c1abc183aae31e5532af914ed060ec5/src/dev/mod.ts#L36). As you can see it walks the routes and island directories, collecting files. 

One interesting thing to note is the following lines:

```TypeScript
    if (entry.isDirectory) {
        error(
          `Found subdirectory '${entry.name}' in islands/. The islands/ folder must not contain any subdirectories.`,
        );
      }
```

No islands on the island allowed! ;)  Now back to our regular scheduled deep dive...

With this file/manifest information, it's possible to diff the past with present structures to determine if a new `fresh.gen.ts` is needed, or worth generating:


```TypeScript
  const manifestChanged =
    !arraysEqual(newManifest.routes, currentManifest.routes) ||
    !arraysEqual(newManifest.islands, currentManifest.islands);

  if (manifestChanged) await generate(dir, newManifest);
```

You can find the code for generate, at the time of writing, [here](https://github.com/denoland/fresh/blob/7e72fa236c1abc183aae31e5532af914ed060ec5/src/dev/mod.ts#L99). Unsurprisingly, it turns the directory structure arrays into a `fresh.gen.ts` file as shown above.

Where does this file get used? Well the last thing the dev function does is load up main.ts:

```TypeScript
export async function dev(base: string, entrypoint: string) {
  //...
  await import(entrypoint);
}

// Back in the dev.ts we see that entry point is main.ts:
 await dev(import.meta.url, "./main.ts");
```

So this manifest must be used by main.ts or a dependency. Indeed if we load up main.ts, there it is:

```TypeScript
/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";

import twindPlugin from "$fresh/plugins/twind.ts";
import twindConfig from "./twind.config.ts";

await start(manifest, { plugins: [twindPlugin(twindConfig)] });
```

Finally, if we load up the start function we see that it's used right away to generate a 'ServerContext':

```TypeScript
export async function start(routes: Manifest, opts: StartOptions = {}) {
  const ctx = await ServerContext.fromManifest(routes, opts);
```

The Server Context will be the focus on the next part of the series. "Contexts" will be subject of the next post in the series. Stay stuned! If you'd like comment, send feedback, or ask questions, [here's the tweet for this post](https://twitter.com/gflarity/status/1634325424011464708). I'll announce follows on twitter as well.

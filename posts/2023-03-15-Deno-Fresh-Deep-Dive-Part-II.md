---
publish_date: 2023-03-15
title: Deno Fresh Deep Dive Part II - Server Contexts
---

In [part I](https://gflarity.deno.dev/2023-03-10-Deno-Fresh-Deep-Dive-Part-I), we dug into manifests and `fresh.gen.ts`. Recall that "development mode" differs from "production mode" in that it watches for filesystem changes to the file based routing, and then re-generates `fresh.gen.ts` file before calling `main.ts`.  In part II, we're going pick up were we left off, digging into Server Context generation.

The "main" fresh entry point, `main.ts` is pretty simple. It just loads the manifest from `fresh.gen.ts`, configures [Twind](https://twind.dev/), and then calls start from server.ts.

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

The first thing start does is generate a ServerContext from the manifest:

```TypeScript
export async function start(routes: Manifest, opts: StartOptions = {}) {
  const ctx = await ServerContext.fromManifest(routes, opts);
```

Let's take a look at the [fromManifest](https://github.com/denoland/fresh/blob/891503e77f1d9ea04767dc135377d0cdf1b72cdc/src/server/context.ts#L102) function inside context. Does the rubber meet the road here? There's a lot of code to read through..., but it seems to mostly be organizing things and associating specific routes which handler functions. However those handler functions tend to take a separate render function. Some examples below.

[GET handler for every route that calls the render function passed](https://github.com/denoland/fresh/blob/891503e77f1d9ea04767dc135377d0cdf1b72cdc/src/server/context.ts#L165):

```TypeScript
   for (const [self, module] of Object.entries(manifest.routes)) {
    //...
    handler.GET = (_req, { render }) => render();
```

Setting up non-200 code handlers: 
```TypeScript      
} else if (
        path === "/_404.tsx" || path === "/_404.ts" ||
        path === "/_404.jsx" || path === "/_404.js"
      ) {
        const { default: component, config } = module as UnknownPageModule;
        let { handler } = module as UnknownPageModule;
        if (component && handler === undefined) {
          handler = (_req, { render }) => render();
        }
// ...
   } else if (
        path === "/_500.tsx" || path === "/_500.ts" ||
        path === "/_500.jsx" || path === "/_500.js"
      ) {
        const { default: component, config } = module as ErrorPageModule;
        let { handler } = module as ErrorPageModule;
        if (component && handler === undefined) {
          handler = (_req, { render }) => render();
        }
```

In addition to bundling paths/routers with handler functions, it also looks for files with `_middleware.tsx` or similar. Gathering up the middleware modules. Similarily there's gathering and a bit of setup work for islands and static files:

```TypeScript
  // ... Middleware setup
  const isMiddleware = path.endsWith("/_middleware.tsx") ||
        path.endsWith("/_middleware.ts") || path.endsWith("/_middleware.jsx") ||
        path.endsWith("/_middleware.js");
  // ...
  } else if (isMiddleware) {
        middlewares.push({
          ...middlewarePathToPattern(baseRoute),
          ...module as MiddlewareModule,
        });
  // ... Islands setup
    for (const [self, module] of Object.entries(manifest.islands)) {
      const url = new URL(self, baseUrl).href;
      if (!url.startsWith(baseUrl)) {
        throw new TypeError("Island is not a child of the basepath.");
      }
      const path = url.substring(baseUrl.length).substring("islands".length);
      const baseRoute = path.substring(1, path.length - extname(path).length);
      const name = sanitizeIslandName(baseRoute);
      const id = name.toLowerCase();
      if (typeof module.default !== "function") {
        throw new TypeError(
          `Islands must default export a component ('${self}').`,
        );
      }
      islands.push({ id, name, url, component: module.default });

  // ... Static files setup
        const staticFolder = new URL(
        opts.staticDir ?? "./static",
        manifest.baseUrl,
      );
      const entires = walk(fromFileUrl(staticFolder), {
        includeFiles: true,
        includeDirs: false,
        followSymlinks: false,
      });
      const encoder = new TextEncoder();
      for await (const entry of entires) {
        const localUrl = toFileUrl(entry.path);
        const path = localUrl.href.substring(staticFolder.href.length);
        const stat = await Deno.stat(localUrl);
        const contentType = typeByExtension(extname(path)) ??
          "application/octet-stream";
        const etag = await crypto.subtle.digest(
          "SHA-1",
          encoder.encode(BUILD_ID + path),
        ).then((hash) =>
          Array.from(new Uint8Array(hash))
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("")
        );
        const staticFile: StaticFile = {
          localUrl,
          path,
          size: stat.size,
          contentType,
          etag,
        };
        staticFiles.push(staticFile);
```

It's worth noting that it really does seem to just be organizing things and doing a bit of prep work for the "main event". The constructor call for ServerConext is just passed the various organized and associated bits:

```TypeScript
    return new ServerContext(
      routes,
      islands,
      staticFiles,
      opts.render ?? DEFAULT_RENDER_FN,
      middlewares,
      app,
      notFound,
      error,
      opts.plugins ?? [],
      importMapURL,
      jsxConfig,
    );
```

Once again, while the ServerContext now has handler functions for each route, island etc, the actual rendering of said pieces are passed to the handler as render functions. I'm not sure what the benefits are of splitting out this prep work logically, as opposed to logical grouping/separating the combined handling/render logic for routes, island, static files etc. Regardless, in the next part in this series we'll take a look at how the handlers and rendering logic come together.

If you'd like comment, send feedback, or ask questions, [here's the tweet for this post](https://twitter.com/gflarity/status/1636040225272086529). I'll announce future parts on twitter as well.
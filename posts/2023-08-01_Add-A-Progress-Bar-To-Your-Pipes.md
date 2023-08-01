---
publish_date: 2023-08-01
title: Add A Progress Bar To Your Pipes
---

Just a quick post to announce [my new Deno module](https://deno.land/x/progress_bar_transform_stream) that simplifies attaching a progress bar to your streams/pipes.

Here's a (basic) wget in 13 lines:

```TypeScript
import { ProgressBarTransformStream } from "https://deno.land/x/progress_bar_transform_stream@v1.0.0/mod.ts";

const url = Deno.args[0];
const splitUrl = url.split("/");
const fileName = splitUrl[splitUrl.length - 1];
const response = await fetch(url);
const contentLength = parseInt(response.headers.get("content-length")!);
const out = await Deno.open("./" + fileName, { write: true, create: true });
response.body
  ?.pipeThrough(
    new ProgressBarTransformStream({ total: contentLength, title: fileName })
  )
  .pipeTo(out.writable);
```

Then you run it!

```sh
 deno run --allow-net --allow-write  wget.ts https://github.com/denoland/deno/releases/download/v1.35.3/deno-x86_64-apple-darwin.zip
```

Even compile it!

```sh
deno compile --allow-net --allow-write  wget.ts
./wget https://github.com/denoland/deno/releases/download/v1.35.3/deno-x86_64-apple-darwin.zip
```

Fin

---
publish_date: 2023-03-20
title: Deno TSX(JSX) Support - The Missing Example
---
`Deno has built-in support for JSX in both .jsx files and .tsx files. JSX in Deno can be handy for server-side rendering or generating code for consumption in a browser.` - Deno Manual

## The Missing Example
Although it's easy to enough use once you know what you're doing, it sure would be nice if there's an example one could read through. So I made one:


```TSX
#!/usr/bin/env deno run
/** @jsxImportSource https://esm.sh/preact */

import { render } from "https://esm.sh/preact-render-to-string@5.2.6";

export function App() {
  return (
    <html lang="en">
      <head>
        <title>title</title>
      </head>
      <body>
        Hello World!
      </body>
    </html>
  );
}
console.log(render(App()));
```

For an even more complex example that involves creating a local web app, read about MinIMG below. 


## jsxImportSource 

While we're here, I'll point out a couple of things that I figured out that might help you move faster. The main "trick" with Deno TSX/JSX support is specifying `jsxImportSource`. According to the TypeScript documentation site, `jsxImportSource`: 

```
Declares the module specifier to be used for importing the jsx and jsxs factory functions when using jsx as "react-jsx" or "react-jsxdev" which were introduced in TypeScript 4.1.
```

Without adding specifying this specifier, neither Deno nor the Deno language server will work on your `.TSX` file. You can specify it two ways (that I currently know of):

  1. Inside your deno.json file: 
      ```JSON
      {
        "compilerOptions": {
          "jsx": "react-jsx",
          "jsxImportSource": "https://esm.sh/preact"
        }
      }
      ```
  2. At the very top of your `.TSX` file using `/** @jsxImportSource https://esm.sh/preact */`

Note that you'll want to use the second option if you don't want to bundle a deno.json file with your `.tsx/.jsx` file.

## MinIMG

 Presenting [MinIMG](http://github.com/gflarity/minimg), a minimalist local image viewer web app built with Deno (and your browser of choice). The main application is a "single" `.tsx` file (there's css/js files but that's for syntax editor/syntax highlighting support). I'm going to make MinIMG extensible so it can server as the core of other tools (such as an image picker I'm working on).

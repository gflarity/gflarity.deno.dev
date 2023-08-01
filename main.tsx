/** @jsx h */

import blog, { ga, redirects, h } from "blog";
import "https://esm.sh/prismjs@1.29.0/components/prism-typescript";
import "https://esm.sh/prismjs@1.29.0/components/prism-bash";
import "https://esm.sh/prismjs@1.29.0/components/prism-go";

blog({
  title: "Geoff's Blog",
  description: "This is Geoff's new blog!",
  // header: <header>Your custom header</header>,
  // section: <section>Your custom section</section>,
  // footer: <footer>Your custom footer</footer>,
  avatar: "https://deno-avatar.deno.dev/avatar/blog.svg",
  avatarClass: "rounded-full",
  author: "Geoff Flarity",

  // middlewares: [

  // If you want to set up Google Analytics, paste your GA key here.
  // ga("UA-XXXXXXXX-X"),

  // If you want to provide some redirections, you can specify them here,
  // pathname specified in a key will redirect to pathname in the value.
  // redirects({
  //  "/hello_world.html": "/hello_world",
  // }),

  // ]
});

# Built With
`hugo v0.81.0+extended`

# Quick Start
```sh
cd src
hugo -d ../docs
# commit and push
```

# Adding New Post
```sh
cd src
hugo new post/<name>.md
# set draft: false to actually publish
```

# Notes
* I've symlinked ./posts ./src/content/post so that it's easy to change the theme, or every use something different later.
* ./src is used to generate the site
* static files go in ./docs and github is setup to use that dir




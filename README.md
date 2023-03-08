# Built With
https://deno.land/x/blog

# Quick Start
```sh
# start up the development server
deno task start
```
# Adding New Post
```sh
DATE=`date +%Y-%m-%d`
TITLE="Your Title"
echo -e "---\npublish_date: $DATE\ntitle: $TITLE\n >> ./posts/$DATE_$TITLE.md
```


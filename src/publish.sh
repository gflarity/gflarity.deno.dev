#!/bin/bash
hugo -d ../
git add ..
git commit -m "publishing..."
git push

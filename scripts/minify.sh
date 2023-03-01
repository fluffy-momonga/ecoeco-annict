#!/bin/sh -x

# using
# https://github.com/jakubpawlowicz/clean-css-cli
# https://github.com/mishoo/UglifyJS
# https://github.com/kangax/html-minifier

cd `dirname $0`
cd ..

cd css
cleancss --source-map -o style.min.css style.css
cd ..

cd js
uglifyjs service.js -m -c --source-map "url='service.min.js.map'" -o service.min.js
uglifyjs annict.js -m -c reduce_vars=false --source-map "url='annict.min.js.map'" -o annict.min.js
uglifyjs dialog.js -m -c --source-map "url='dialog.min.js.map'" -o dialog.min.js
uglifyjs header.js -m -c --source-map "url='header.min.js.map'" -o header.min.js
uglifyjs watching.js -m -c --source-map "url='watching.min.js.map'" -o watching.min.js
uglifyjs search.js -m -c --source-map "url='search.min.js.map'" -o search.min.js
cd ..

html-minifier --collapse-whitespace index.html -o index.min.html

exit

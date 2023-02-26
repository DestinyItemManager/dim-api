#!/bin/sh -ex

# Prepare the generated source directory
rm -f dim-api-types/*.js
rm -f dim-api-types/*.ts
rm -f api/shapes/index.ts
rm -rf dim-api-types/esm
node ./transform-dim-api-types.js > api/shapes/index.ts

babel ./api/shapes/**/* --out-dir dim-api-types --extensions ".ts"
tsc -p tsconfig.dim-api-types.json

rm -f api/shapes/index.ts


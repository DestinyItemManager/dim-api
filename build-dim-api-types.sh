#!/bin/sh -ex

# Prepare the generated source directory
rm -f dim-api-types/*.js
rm -f dim-api-types/*.ts
rm -f api/shapes/index.ts
rm -rf dim-api-types/esm
ls api/shapes/*.ts | ruby ./transform-dim-api-types.rb > api/shapes/index.ts

babel ./api/shapes/**/* --out-dir dim-api-types --extensions ".ts"
tsc -p tsconfig.dim-api-types.json
babel --no-babelrc --config-file ./babel-esm.config.json ./api/shapes/**/* --out-dir dim-api-types/esm --extensions ".ts"

rm api/shapes/index.ts || true


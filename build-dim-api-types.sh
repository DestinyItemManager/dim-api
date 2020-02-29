#!/bin/sh -ex

# Prepare the generated source directory
rm dim-api-types/*.js || true
rm dim-api-types/*.ts || true
rm api/shapes/index.ts || true
ls api/shapes/*.ts | ruby ./transform-dim-api-types.rb > api/shapes/index.ts
tsc -p tsconfig.dim-api-types.json
rm api/shapes/index.ts || true


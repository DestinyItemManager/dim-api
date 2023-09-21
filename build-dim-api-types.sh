#!/bin/bash -ex
shopt -s extglob

# Prepare the generated source directory
rm -f dim-api-types/*.js
rm -f dim-api-types/*.ts
rm -f api/shapes/index.ts
rm -rf dim-api-types/esm
node ./transform-dim-api-types.js > api/shapes/index.ts

tsc -p tsconfig.dim-api-types.json
rollup -c
rm dim-api-types/index.d.ts
cat dim-api-types/*.d.ts | grep -v "from '\." | grep -v "export {}" > dim-api-types/index.d.ts
grep '^import' dim-api-types/index.d.ts | uniq > sorted-imports.tmp
grep -v '^import' dim-api-types/index.d.ts >> sorted-imports.tmp
mv sorted-imports.tmp dim-api-types/index.d.ts

rm dim-api-types/!(index).d.ts
rm -f api/shapes/index.ts
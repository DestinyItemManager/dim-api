#!/bin/bash -eux

set -o pipefail

# Initialize our schema
pushd api
npx db-migrate up -e test
popd

cp build/.env.travis .env

echo "Build api"
yarn build:api
echo "Test"
yarn test
echo "Lint"
yarn run lint-check

#!/bin/bash -e

set -o pipefail

# Initialize our schema
pushd api
npx db-migrate up -e test
popd

cp build/.env.travis .env

yarn build:api
yarn test
yarn run lint-check

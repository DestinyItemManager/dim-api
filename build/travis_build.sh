#!/bin/bash -e

set -o pipefail

# Create a database within the postgres install
psql -c 'create database travis_ci_test;' -U postgres

# Initialize our schema
pushd api
npx db-migrate up -e test
popd

yarn build:api
yarn test
yarn run lint-check

#!/bin/sh

export NODE_ENV="production"

# Use "exec" so we inherit signals
exec node dist/api/index.js --async-stack-traces --experimental-json-modules

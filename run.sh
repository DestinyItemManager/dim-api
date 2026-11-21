#!/bin/sh

export NODE_ENV="production"

# Use "exec" so we inherit signals
exec node --import ./api/instrument.js api/index.js --async-stack-traces --experimental-json-modules --enable-source-maps

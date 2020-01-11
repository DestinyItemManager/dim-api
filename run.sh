#!/bin/sh

env

# Use "exec" so we inherit signals
exec node dist/api/index.js

#!/bin/bash -ex

ROOT=$(git rev-parse --show-toplevel)
COMMITHASH=$(git rev-parse HEAD)
IMAGE="destinyitemmanager/dim-api:$COMMITHASH"

rm -rf dist && yarn build:api && docker buildx build --platform linux/amd64 --push -t "$IMAGE" "$ROOT"

mkdir -p "$ROOT/deployment"

cp "$ROOT/kubernetes/dim-api-deployment.yaml" "$ROOT/deployment"

sed -i'' -e "s/\$COMMITHASH/$COMMITHASH/" "$ROOT/deployment/dim-api-deployment.yaml"

kubectl apply -f "$ROOT/deployment/dim-api-deployment.yaml"

rm -rf "$ROOT/deployment"

sentry-cli releases --org destiny-item-manager new "$COMMITHASH" -p dim-api --finalize
sentry-cli releases --org destiny-item-manager set-commits "$COMMITHASH" --auto

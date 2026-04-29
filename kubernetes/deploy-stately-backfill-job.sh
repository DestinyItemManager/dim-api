#!/bin/bash -ex

ROOT=$(git rev-parse --show-toplevel)
COMMITHASH=${GITHUB_SHA:-$(git rev-parse HEAD)}
IMAGE="destinyitemmanager/dim-api:$COMMITHASH"

rm -rf dist && pnpm build:api && docker buildx build --platform linux/amd64 --push -t "$IMAGE" "$ROOT"

mkdir -p "$ROOT/deployment"
cp "$ROOT/kubernetes/dim-api-stately-backfill-job.yaml" "$ROOT/deployment"

sed -i'' -e "s/\$COMMITHASH/$COMMITHASH/" "$ROOT/deployment/dim-api-stately-backfill-job.yaml"

# Job specs are immutable in Kubernetes; delete the old Job before applying updates.
kubectl delete job dim-api-stately-backfill --ignore-not-found=true
kubectl apply -f "$ROOT/deployment/dim-api-stately-backfill-job.yaml"

rm -rf "$ROOT/deployment"

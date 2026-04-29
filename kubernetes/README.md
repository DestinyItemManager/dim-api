# Kubernetes Services

## Grafana

A graphing and monitoring system we use to monitor the API. Deployed via grafana-\*.yaml.

## Graphite/StatsD

A metrics database and collector. Deployed via graphite-\*.yaml.

## Postgres

A database, only installed on local dev (we used hosted Postgres in prod). Deployed via postgres-\*.yaml.

## NGINX Ingress

An Ingress Controller that uses NGINX. Deployed only on DigitalOcean, by following https://kubernetes.github.io/ingress-nginx/deploy/

## DIM API

Our NodeJS service. Deployed via dim-api-\*.yaml.

## Stately Backfill Job

Run a one-time migration scan from StatelyDB into Postgres with
`dim-api-stately-backfill-job.yaml`.

The job is resumable across pod restarts by storing scan token state in a PVC.

One-pod parallelization options:

- `BACKFILL_PARALLEL_SEGMENTS`: Number of segment workers to run concurrently in one pod.
- `BACKFILL_TOTAL_SEGMENTS`: Optional explicit total segment count (defaults to `BACKFILL_PARALLEL_SEGMENTS`).
- `BACKFILL_SEGMENT_INDEX`: Optional explicit segment index for single-segment worker mode.

For one-pod parallel mode, set only `BACKFILL_PARALLEL_SEGMENTS` to the desired worker count and leave
`BACKFILL_SEGMENT_INDEX` unset.

Segment workers automatically use segment-specific token files derived from `BACKFILL_TOKEN_PATH`.

Required environment inputs:

- `dim-api-config` ConfigMap (same values used by API deployment)
- `dim-api-secret` keys:
  - `pg_password`
  - `stately_access_key`
  - `stately_store_id`

Build and push image:

```sh
COMMITHASH=$(git rev-parse HEAD)
docker buildx build --platform linux/amd64 --push -t destinyitemmanager/dim-api:$COMMITHASH .
```

Apply the job manifest:

```sh
mkdir -p deployment
cp kubernetes/dim-api-stately-backfill-job.yaml deployment/
sed -i'' -e "s/\$COMMITHASH/$COMMITHASH/" deployment/dim-api-stately-backfill-job.yaml
kubectl apply -f deployment/dim-api-stately-backfill-job.yaml
```

Inspect progress:

```sh
kubectl logs -f job/dim-api-stately-backfill
```

If re-running after completion, delete and recreate the job:

```sh
kubectl delete job dim-api-stately-backfill
kubectl apply -f deployment/dim-api-stately-backfill-job.yaml
```

## Stately to Postgres Migration Worker

Run continuous workers that claim `migration_state` rows in `Stately` state and
migrate each claimed profile to Postgres.

Use `dim-api-migration-worker-deployment.yaml`.

This is a Deployment (not a Job) so you can scale replicas for parallelism. Each
replica safely claims work via optimistic state transitions in `migration_state`
(`Stately` -> `MigratingToPostgres`).

Worker environment knobs:

- `MIGRATION_WORKER_BATCH_SIZE`: Number of rows to claim per poll (default `25`).
- `MIGRATION_WORKER_IDLE_DELAY_MS`: Sleep delay when no work is available (default `5000`).
- `MIGRATION_WORKER_BETWEEN_USERS_DELAY_MS`: Delay between processing users in a claimed batch (default `100`).

Apply the worker deployment:

```sh
pnpm run deploy:migration-worker
```

Scale workers:

```sh
kubectl scale deployment dim-api-migration-worker --replicas=4
```

Inspect worker logs:

```sh
kubectl logs -f deployment/dim-api-migration-worker
```

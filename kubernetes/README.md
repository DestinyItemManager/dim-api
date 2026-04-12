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

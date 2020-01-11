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

# Kubernetes Services

## Gateway (routing + TLS)

All public traffic enters through a single Gateway API `Gateway` (`gateway.yaml`).
It uses the `cilium` GatewayClass, which DOKS installs and manages, so there's no
ingress controller to maintain. The Gateway provisions one DigitalOcean Load
Balancer, and every hostname shares it via `HTTPRoute`s.

Every hostname is proxied by Cloudflare, which serves the public certificates.
The Cloudflare to origin hop uses Cloudflare Origin CA certificates (15-year
validity) stored as Secrets, created by `origin-cert-secrets.sh`. Nothing renews
automatically, and nothing needs to. Cloudflare SSL/TLS mode should be
**Full (strict)** for both zones.

## Grafana

A graphing and monitoring system we use to monitor the API. Deployed via grafana-\*.yaml.

## Graphite/StatsD

A metrics database and collector. Deployed via graphite-\*.yaml.

## Postgres

A database, only installed on local dev (we used hosted Postgres in prod). Deployed via postgres-\*.yaml.

## DIM API

Our NodeJS service. Deployed via dim-api-\*.yaml.

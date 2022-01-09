# The Destiny Item Manager API (DIM Sync)

[Destiny Item Manager (DIM)](https://destinyitemmanager.com) primarily uses the [Bungie.net API](https://github.com/Bungie-net/api) to read information about Destiny game state, and to move or change items. However, DIM offers features beyond what Bungie.net's API does: tags and notes for items, saved loadouts, etc. To allow users to save this data and sync it between different clients (mobile, desktop, etc), we built our own API, which is branded as "DIM Sync" in our application. While this API was developed with DIM in mind, *it is not exclusive to DIM*. We designed it to be used by other Destiny community tools, and we welcome them to use it. Today, these other applications make use of DIM Sync:

* [D2Checklist](https://d2checklist.com) - You can sync your notes and tags between DIM and D2Checklist.

### API Types

The types for all API requests and responses are written out as TypeScript in [the `api/shapes` folder](https://github.com/DestinyItemManager/dim-api/tree/master/api/shapes). You can use the npm package `@destinyitemmanager/dim-api-types` to reference these types in your own code. [This file](https://github.com/DestinyItemManager/DIM/blob/master/src/app/dim-api/dim-api.ts) in DIM's source code also lists out all the API endpoints, and shows examples of how to call them.

### Get an API key

To use the DIM API, you will need a DIM API key. Anyone can get an API key for localhost development — to get a production development token, join the [DIM Discord](https://t.co/70AKGCbEM5) and message `bhollis`.

Before interacting with the DIM API: This document assumes you have already set up your application to talk to the Bungie.net API. DIM's API piggybacks on Bungie.net's authentication: information is passed along, through the DIM API, to the Bungie.net API. So you will need to be ready with the [Bungie.net API information](https://www.bungie.net/en/Application) for your development application.

Once your application is set up at Bungie.net, you can request a DIM API key for development. The payload is JSON, and requires three pieces of information:
- an id for your app (please use the format `username-dev`)
- your Bungie.net API key
- the full address of your local development server.

Using your preferred method of making HTTP calls, perform a request to the DIM API's `new_app` endpoint:
```
curl 'https://api.destinyitemmanager.com/new_app' \
-X 'POST' \
-H 'Content-Type: application/json' \
--data-binary '{"id":"myusername-dev","bungieApiKey":"my-bungie-api-key","origin":"https://localhost:8080"}'
```

The response will contain a `dimApiKey` field - that's your DIM API key. If you ever forget it, make the request above again, and the same key will be returned to you.

Alternatively, you can [set up DIM for local development](https://github.com/DestinyItemManager/DIM/blob/master/docs/CONTRIBUTING.md) — the "Enter API Credentials" step brings you to a developer page, which will have a button to fetch a DIM API key as well.

### Authenticating

As mentioned above, DIM's API piggybacks on Bungie.net's authentication: it knows a user is who they claim to be, because DIM confirms that their credentials check out with Bungie.net.

To authenticate a user of your application with the DIM Sync API, you will exchange their Bungie.net auth token for a DIM auth token. Just like the Bungie.net authentication system, the DIM auth token has an expiration time, after which you'll have to get a new one. Unlike the Bungie.net API, there's no refresh token — you just make the same request you made for the initial token. [Here's how DIM does it.](https://github.com/DestinyItemManager/DIM/blob/master/src/app/dim-api/dim-api-helper.ts#L141-L192)

To issue or reissue the DIM API token, you'll need your user's Bungie.net membership ID, an unexpired and valid Bungie.net access token, and your DIM API key. The DIM API will query the Bungie.net API using the user's access token, to verify that it belongs to the given membership ID — we don't store the token or use it for anything else.

```
curl 'https://api.destinyitemmanager.com/auth/token'
-X 'POST' \
-H 'Content-Type: application/json'
-H 'X-API-Key: dimApiKey'
{
  bungieAccessToken: 'foo',
  membershipId: '1234',
}
```

The returned token has an expiration - do not use the token after that expiration. For all subsequent DIM API calls, you'll include the DIM API token and the DIM API key as HTTP headers, like so:
```
Authentication: Bearer xxxThisUsersDimAccesTokenxxx
X-API-Key: xxxYourDimApiKeyxxx
```

### Reading profile data

The DIM API is meant to be familiar to users of the Bungie.net API — there is a single, central read API:
`GET https://api.destinyitemmanager.com/profile?platformMembershipId=1234&components=tags,loadouts`

The platform membership ID is required and should correspond to the Bungie.net platform you're loading for. DIM API data is stored per-platform. You should specify which components you want returned in the result. The current available components are:

* `tags`: Tags and notes on items, corresponding to `DestinyItemComponent.itemInstanceId`. These are returned as a list of [ItemAnnotation](https://github.com/DestinyItemManager/dim-api/blob/master/api/shapes/item-annotations.ts) objects.
* `loadouts`: Saved loadouts. These are a list of [Loadout](https://github.com/DestinyItemManager/dim-api/blob/master/api/shapes/loadouts.ts) objects.
* `hashtags`: Tags and notes by DestinyInventoryItemDefinition hash. These are like `tags` but meant for uninstanced items like shaders and mods.
* `triumphs`: A simple list of DestinyRecordDefinition hashes for tracked triumphs. This allows for tracking more triumphs than allowed in the game.
* `searches`: Saved searches. Likely only useful to DIM, this powers DIM's search history.

### Updating profile data

DIM API is meant to be usable "offline". A client can collect a sequence of change operations called `updates`, and then send them to be applied them in bulk, when the client is ready to make a request to the DIM API.
By sending deltas in this way, the DIM API can effectively keep synchronized between different clients even if they're out of date, since you only send updates for what has changed.

As such, there's a single, central update endpoint:
`POST https://api.destinyitemmanager.com/profile`

The body is a JSON object containing the `destinyVersion` (DIM supports D1 still!), the `platformMembershipId`, and a list of `updates`. Each update is one of the [update types](https://github.com/DestinyItemManager/dim-api/blob/master/api/shapes/profile.ts#L31). So you can flush the local queue, and apply a series of changes consisting of different tag updates, loadouts, etc. — all interleaved together.

# Cloud Architecture

The DIM API is a NodeJS server application that is deployed in the DigitalOcean cloud via Kubernetes.

* Requests to `api.destinyitemmanager.com` are routed to CloudFlare, a CDN which helps to cache data and provide traffic management. Most of the API calls are not cached, but the server application can return [Cache-Control headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control) to customize what CloudFlare will cache, which can save both bandwidth and server costs.
* CloudFlare is configured to forward requests to a [DigitalOcean Load Balancer](https://docs.digitalocean.com/products/networking/load-balancers/). This is a TCP load balancer (L4) that simply forwards traffic to our Kubernetes Cluster's nodes. The LB is configured automatically by Kubernetes via a Service ([`ingress-nginx/ingress-nginx`](https://github.com/DestinyItemManager/dim-api/blob/master/kubernetes/ingress-nginx-service.yaml)) with type LoadBalancer.
* Each of the Kubernetes Cluster's Nodes runs the [Nginx Ingress Controller](https://kubernetes.github.io/ingress-nginx/). It was set up following [this guide](https://www.digitalocean.com/community/tutorials/how-to-set-up-an-nginx-ingress-with-cert-manager-on-digitalocean-kubernetes) but has been customized to run as a [DaemonSet](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/) so that it is present on every node. It also has [some custom settings](https://github.com/DestinyItemManager/dim-api/blob/master/kubernetes/ingress-nginx-config.yaml). The ingress controller has an automatically renewing LetsEncrypt SSL certificate associated with it, which is handled by a custom Kubernetes resource.
* The Ingress Controller is [configured](https://github.com/DestinyItemManager/dim-api/blob/master/kubernetes/ingress.yaml) to forward `api.destinyitemmanager.com` to our `dim-api` application. It also handles other subdomains like our Grafana metrics dashboard.
* The `dim-api` deployment runs our actual service. It's [deployed](https://github.com/DestinyItemManager/dim-api/blob/master/kubernetes/dim-api-deployment.yaml) as a small pod that is sized to fit multiple copies per node, which is nice because NodeJS is single-threaded so you want to run multiple copies. It has a [Horizontal Pod Autoscaler (HPA)](https://github.com/DestinyItemManager/dim-api/blob/master/kubernetes/dim-api-hpa.yaml) associated with it that adds and removes pods to maintain a target CPU usage. If the number of pods needed exceeds the number of nodes, new nodes will automatically be added, and they get removed again when load drops.
* We also run Graphite, StatsD, and Grafana as pods on the same clusters alongside our DIM API pods.
* The DIM API application talks to a hosted Postgres SQL database that is managed by DigitalOcean.
* The DIM API itself is using the Express framework to handle requests, route them to handler functions, and apply middlewares that observe the request lifecycle. See [`server.ts`](https://github.com/DestinyItemManager/dim-api/blob/master/api/server.ts) for details. Most requests are authenticated by a JWT bearer token.

# Local Development

### Local Postgres

The API server requires a Postgres database for storage. In production we use a hosted Postgres, but in development you need to run your own. You can install Postgres however you'd like, but one way is through Docker Desktop's local Kubernetes support:

1. Go to hub.docker.com, sign up for an account, and download Docker Desktop.
2. Open Docker preferences, go to the Kubernetes tab, and enable Kubernetes.
3. Run `kubectl apply -f kubernetes/postgres-configmap.yaml` - this contains our development password and configures Postgres.
4. Run `kubectl apply -f kubernetes/postgres-deployment.yaml` - this actually runs Postgres on port 31744. It will pull the latest Postgres image from Docker.

You can now connect to postgres on port 31744 with the username and password from the configmap file. Next, install the schema using a migration command.

### DB Migrations

We use [`db-migrate`](https://db-migrate.readthedocs.io/en/latest/) to manage the schema in the database. Migrations allow you to make versioned changes to the schema and then apply them — first locally, and then to the production database.

- Run `cd api && npx db-migrate up` to update the database to the current version.
- Run `cd api && npx db-migrate create settings_table` to create a new migration file in the `migrations` folder, where you can use the db-migrate API to modify the database. Check in all migrations.
- If you have a configuration in `api/database.json` for the Prod database, you can update prod with `cd api && npx db-migrate up -e prod`. Make sure to do this before deploying!

### Running the server

1. Run `yarn` to install packages.
2. Run `yarn start` to run a development server that will reload when you change files. It'll need a Postgres server running on port 31744 that has been migrated to the latest schema for the server to work.

### Running tests

1. Run `yarn test`. You'll need a Postgres server running on port 31744 that has been migrated to the latest schema for the tests to work.

# Production Deployment and Administration

To access the production Postgres DB (either to run commands via the postgres shell or something like [PSequel](http://www.psequel.com)), you need to log into the DigitalOcean control panel, and copy the "Public Network" connection info for the `dim-api-db` database. You also need to add your home IP address to the "Trusted Sources" list.

You may also want to edit two files to include that information. These changes *must never be checked in*!

* `api/database.json` - this tells db-migrate how to connect to the database. You only need it if you're going to run a DB migration on prod.
* `kubernetes/dim-api-configmap.yaml` - this gets deployed to the production Kubernetes cluster and is loaded as environment variables into the app. You only need this if you want to update the production configmap, which shouldn't be often.

### kubectl access

To be able to inspect or edit Kubernetes resources, or deploy, you will need to have your kubectl context set up. Log in to the DigitalOcean control panel, navigate to the Kubernetes cluster, and follow the instructions next to "Download Config File". It's easiest to install the `doctl` tool and ask it to create the kubectl context for you.

### Deploying

Before deploying, run `cd api && npx db-migrate up -e prod` if you've created any new database migrations. If you forget to do this, the app will likely crash as it will try to do things with an outdated schema.

Deployment is done by running `yarn deploy`. This will build the application into a Docker image, push that image to the global Docker container registry, and then apply an updated deployment config that points to the new image. You can run `kubectl get pods` to watch the pods cycle over to the new version, which takes a minute.

### Handy Commands

* `kubectl get pods` - see all pods and their state
* `kubectl describe pod <podname>` - see details about a pod
* `kubectl get nodes` - see all nodes in the cluster
* `kubectl describe node <nodename>` - see details about a node, including which pods are on it
* `kubectl top pods` - see resource utilization per pod
* `kubectl top nodes` - see resource utilization per node

### Metrics

You can visit our metrics dashboard at https://grafana.destinyitemmanager.com to see how the API is doing. Access is granted through GitHub to DIM core team members.

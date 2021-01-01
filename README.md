# Setup

1. Go to hub.docker.com, sign up for an account, and download Docker Desktop.
2. Open Docker preferences, go to the Kubernetes tab, and enable Kubernetes.
3. Run 'yarn start'

# Development Postgres

In production we use a hosted Postgres, but in development we'll deploy it using Kubernetes.

1. `kubectl apply -f kubernetes/postgres-configmap.yaml` - this contains our development password.
2. `kubectl apply -f kubernetes/postgres-deployment.yaml` - this actually runs Postgres on port 31744.

You can now connect to postgres on port 31744 with the username and password from the configmap.

# DB Migrations

Run `cd api && npx db-migrate up` to update the database to the current version. Run `cd api && npx db-migrate create settings_table` to create a new migration file in the `migrations` folder, where you can use the db-migrate API to modify the database. Check in all migrations.

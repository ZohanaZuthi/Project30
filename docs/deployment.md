# Deployment setup

## Railway

Create one Railway project with:

1. A PostgreSQL service named `Postgres`.
2. A GitHub-backed Strapi service whose root directory is `/backend`.
3. A generated public domain for the Strapi service.

Configure the Strapi service in `Settings`:

```text
Root Directory: /backend
Build Command: npm run build
Start Command: npm run start
Healthcheck Path: /api/health
Healthcheck Timeout: 120 seconds
Restart Policy: On Failure
Serverless: Disabled
```

Leave the Railway Config File path empty. The deprecated
`railway.json`/`railway.toml` Config as Code format is not used. Railway's newer
project-level `.railway/railway.ts` IaC is optional and is unnecessary for this
small manually provisioned assignment deployment.

Set these Strapi service variables:

```text
NODE_ENV=production
HOST=0.0.0.0
PUBLIC_URL=https://<backend-domain>
IS_PROXIED=true
CLIENT_URLS=https://<frontend-domain>
DATABASE_CLIENT=postgres
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_NAME=${{Postgres.PGDATABASE}}
DATABASE_USERNAME=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
DATABASE_SSL=true
APP_KEYS=<four comma-separated random values>
API_TOKEN_SALT=<random value>
ADMIN_JWT_SECRET=<random value>
TRANSFER_TOKEN_SALT=<random value>
JWT_SECRET=<random value>
ENCRYPTION_KEY=<random value>
```

Generate each secret locally with `openssl rand -base64 32`. Never commit the
generated output. The Railway service dashboard stores the build, start,
restart, and `/api/health` readiness configuration.

After the first deployment, open `<backend-domain>/admin` and create the Strapi
CMS administrator. This account is separate from the LMS application Admin.

## Vercel

Import the same GitHub repository and configure:

```text
Root Directory: frontend
Framework: Next.js
STRAPI_URL=https://<backend-domain>
```

`STRAPI_URL` is server-only. It must not be renamed to `NEXT_PUBLIC_STRAPI_URL`.
Redeploy the frontend after adding or changing environment variables.

## Smoke checks

```text
GET https://<backend-domain>/api/health
GET https://<frontend-domain>/api/health
GET https://<backend-domain>/admin
```

The frontend health response returns HTTP 200 only when it can connect to the
backend. A 503 with `backend: unavailable` means the frontend itself is running
but the Railway URL, deployment, or environment variable needs attention.

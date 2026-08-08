# Export OS - CI/CD

Pipeline is fully defined in `.github/workflows/`:

| Workflow | Triggers | What it does |
| --- | --- | --- |
| `ci.yml` | PR to `main`, push to `main` | `pnpm install`, `typecheck`, `build` |
| `migrate.yml` | push touching `supabase/migrations` or `seed.sql` on `main`/`preview`, or manual | Applies `supabase/migrations/*.sql` in order via `psql`; seeds the preview DB |
| `deploy.yml` | PR to `main` (preview), push to `main` (prod) | Deploys to Vercel via `amondnet/vercel-action` |

## Branches

- `main`  -> production
- `preview` -> staging (optional; migrations target it)

## Required GitHub Secrets (Settings -> Secrets and variables -> Actions)

| Secret | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side service role key |
| `PUBLIC_SITE_JWT_SECRET` | Long random string for tenant site tokens |
| `OPENAI_API_KEY` | Required at build time by `/api/ai/*` routes |
| `SUPABASE_DB_URL` | **Production** postgres connection string — MUST use the **Session pooler ("Session", port 5432)** with the `*.pooler.supabase.com` host. Do **not** use the Direct host (`db.<ref>.supabase.co`) — it is IPv6-only on the free plan, and GitHub Actions runners have no IPv6 route, so migrations fail with "Network is unreachable". Also **not** the Transaction pooler (port 6543) — DDL (`CREATE TABLE`/`EXTENSION`) fails there. |
| `SUPABASE_PREVIEW_DB_URL` | **Preview/staging** postgres connection string — same Session-pooler requirement |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | Only when deploying via GitHub Actions (alternative to Vercel's native Git integration) |

## Required Vercel environment variables

Set the app-level `NEXT_PUBLIC_*` variables in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_BASE_HOST`
- Optional: Razorpay keys, AWS SES vars

## Note on deploy methods

Recommended: use Vercel's native **Git integration** (import the repo at vercel.com) —
Vercel then builds previews for every PR and production on `main` automatically.
The `deploy.yml` workflow is provided as an alternative for token-based deploys;
delete it if you rely on the native integration (Vercel's own deployments would
otherwise run in parallel).

## Note on the AI build-time requirement

`/api/ai/assist` instantiates the OpenAI client at build time, so a build
fails without `OPENAI_API_KEY`. Put a valid key in GitHub Secrets for CI/flows
and in Vercel env vars, or the build step will fail.
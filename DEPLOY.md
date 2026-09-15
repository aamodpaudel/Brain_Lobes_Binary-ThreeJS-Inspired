# Deploying (free): Vercel + Turso + Cloudflare R2

This app needs a server (API routes, an authenticated admin panel) and persistent storage (a
database, uploaded files), which is why it can't go on GitHub Pages and can't go on Vercel
as-is — Vercel's functions have no persistent disk. This setup swaps the local SQLite file for
[Turso](https://turso.tech) (free, SQLite-compatible) and local file uploads for
[Cloudflare R2](https://developers.cloudflare.com/r2/) (free tier, S3-compatible), then hosts the
app itself on [Vercel](https://vercel.com)'s free Hobby plan. All three have genuinely free tiers
that comfortably cover a personal site.

The code already supports this — locally, with no Turso/R2 env vars set, it just uses the local
sqlite file and `public/uploads/` like before (see `LOCAL_SETUP.md`). This guide is only about
the production side.

## 1. Turso (database)

No CLI install needed — everything here works from [app.turso.tech](https://app.turso.tech) plus
commands run from this project.

1. Sign up at [turso.tech](https://turso.tech) (free — no card required for the free tier).
2. In the dashboard, create a database (pick any name and a region close to you) — this is a
   button right in the UI now, not CLI-only.
3. Open the database you just created. Its detail page shows the connection URL
   (`libsql://<name>-<org>.turso.io`) — that's `TURSO_DATABASE_URL`.
4. Create an auth token for it from the same page (or the account/database token settings) —
   that's `TURSO_AUTH_TOKEN`. Keep both; you'll paste them into Vercel in step 5.
5. Push this project's schema to it. Prisma's own `migrate`/`db push` commands only ever target
   the local file (see the comment in `prisma.config.ts` for why), and the dashboard doesn't
   have a SQL console — so this repo has a small script that applies the schema straight over
   Turso's HTTP API instead, no CLI required:
   ```bash
   # bash
   TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." node scripts/turso-apply-schema.mjs
   ```
   ```powershell
   # PowerShell
   $env:TURSO_DATABASE_URL="libsql://..."; $env:TURSO_AUTH_TOKEN="..."; node scripts/turso-apply-schema.mjs
   ```
   It prints `Done.` on success. (If you do have the Turso CLI installed, `turso db shell
   <name> < schema.sql` works too — see "Ongoing schema changes" at the bottom either way.)

6. Seed it with the admin account and starter content, the same way, pointed at Turso instead of
   the local file:
   ```bash
   TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." npx tsx prisma/seed.ts
   ```
   (PowerShell: `$env:TURSO_DATABASE_URL="..."; $env:TURSO_AUTH_TOKEN="..."; $env:ADMIN_EMAIL="..."; $env:ADMIN_PASSWORD="..."; npx tsx prisma/seed.ts` — `ADMIN_EMAIL`/`ADMIN_PASSWORD` also need to be set for this one run if they're not already in your `.env`.)

## 2. Cloudflare R2 (file storage)

1. Sign up at [cloudflare.com](https://dash.cloudflare.com) (free) and open **R2** in the
   dashboard.
2. Create a bucket (any name, e.g. `mind-in-a-box-uploads`).
3. Under the bucket's **Settings**, enable **Public access** via the `r2.dev` subdomain (or
   attach your own custom domain if you'd rather serve uploads from `files.yourdomain.com`).
   Copy that public URL — it's `R2_PUBLIC_URL`.
4. Under **R2 → Manage API Tokens**, create an API token with read/write access scoped to this
   bucket. You'll get an Access Key ID and Secret Access Key.
5. Your Account ID is shown on the R2 overview page (or any Cloudflare dashboard page's right
   sidebar).

You now have all five R2 values: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
`R2_BUCKET_NAME`, `R2_PUBLIC_URL`.

## 3. Vercel (hosting)

1. Sign up at [vercel.com](https://vercel.com) with your GitHub account (free Hobby plan).
2. **Add New Project** → import this repo.
3. Before the first deploy, add these environment variables (Project Settings → Environment
   Variables — or the form shown during import):

   | Name | Value |
   |---|---|
   | `TURSO_DATABASE_URL` | from step 1.3–1.4 |
   | `TURSO_AUTH_TOKEN` | from step 1.3–1.4 |
   | `R2_ACCOUNT_ID` | from step 2 |
   | `R2_ACCESS_KEY_ID` | from step 2 |
   | `R2_SECRET_ACCESS_KEY` | from step 2 |
   | `R2_BUCKET_NAME` | from step 2 |
   | `R2_PUBLIC_URL` | from step 2 |
   | `ADMIN_EMAIL` | only needed again if you ever re-run the seed script |
   | `ADMIN_PASSWORD` | only needed again if you ever re-run the seed script |

   `LOCAL_DATABASE_URL` is deliberately **not** set here — leaving it unset in production is
   fine, since the app only falls back to it when `TURSO_DATABASE_URL` is absent (see
   `src/lib/prisma.ts`), and the build doesn't need a live database connection.
4. Deploy. Vercel builds with `npm run build` and serves it — no other config needed.
5. Once it's live, visit `/admin/login` on your new domain and sign in with the admin account
   you seeded in step 1.6.

## Ongoing schema changes

Whenever you change `prisma/schema.prisma` again later, diff it against the schema as it was
*before* your edit (rather than against the live Turso database directly, which needs its own
shadow database to compare against) — the version already committed in git is exactly that:

```bash
npx prisma db push   # updates your LOCAL dev.db, as always — do this first

git show HEAD:prisma/schema.prisma > /tmp/old-schema.prisma
npx prisma migrate diff \
  --from-schema-datamodel /tmp/old-schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > change.sql

TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." node scripts/turso-apply-schema.mjs change.sql
# (or, with the Turso CLI installed: turso db shell my-mind-in-a-box < change.sql)
```

Skim `change.sql` before applying it, the same way you'd review any migration. Then commit and
push your code changes — Vercel redeploys automatically on every push to `main`.

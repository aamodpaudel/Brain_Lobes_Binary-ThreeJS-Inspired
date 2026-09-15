# Local Setup

This guide helps you run this portfolio locally on Windows/macOS/Linux.

## Prerequisites

- `node` 20.x or newer
- `npm` 10.x or newer
- Git

Check versions:

```bash
node -v
npm -v
```

## 1. Install dependencies

From the project root:

```bash
npm install
```

## 2. Configure environment variables

Create or verify `.env` in the project root with:

```env
LOCAL_DATABASE_URL="file:./dev.db"
ADMIN_EMAIL="you@example.com"
ADMIN_PASSWORD="choose-a-password"
```

Notes:

- This project uses SQLite (via Prisma's libSQL driver adapter — see `src/lib/prisma.ts`). The
  file used is `prisma/dev.db`.
- Local dev never needs Turso or Cloudflare R2 — those are production-only. See `DEPLOY.md` for
  the free hosting setup (Vercel + Turso + R2) and what the extra env vars in `.env` are for.
- File uploads (note attachments, gallery photos) fall back to writing under `public/uploads/`
  when the R2 env vars are unset, which is the case for a plain local `.env`.

## 3. Initialize Prisma

Run:

```bash
npx prisma generate
npx prisma db push
```

Optional: seed starter data

```bash
npx prisma db seed
```

## 4. Start the dev server

```bash
npm run dev
```

Open:

- http://localhost:3000

## 5. Production check (optional)

```bash
npm run build
npm run start
```

## Useful commands

- Lint: `npm run lint`
- Reset local Prisma DB quickly (destructive): `npx prisma migrate reset`

## Troubleshooting

- Port in use: run with a different port, e.g. `npm run dev -- -p 3001`
- Prisma client issues after schema changes: rerun `npx prisma generate`
- Missing modules: delete `node_modules` and `package-lock.json`, then run `npm install`

import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// The Prisma CLI (migrate/db push/studio) always talks to a local SQLite file, never directly
// to Turso — see the comment on the datasource block in prisma/schema.prisma for why, and
// LOCAL_SETUP.md / DEPLOY.md for the workflow this implies for shipping schema changes.
//
// This file is also loaded by `prisma generate`, which runs on every `npm install` (see the
// postinstall script) — including on Vercel, where LOCAL_DATABASE_URL is deliberately unset
// (production uses TURSO_DATABASE_URL at runtime instead, see src/lib/prisma.ts). `generate`
// itself never connects to this URL, it only needs the schema shape, so a plain JS fallback
// here (rather than prisma/config's `env()` helper, which throws if the var is missing) keeps
// that install from failing without requiring a pointless placeholder env var in Vercel.
export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
        seed: 'tsx prisma/seed.ts',
    },
    datasource: {
        url: process.env.LOCAL_DATABASE_URL ?? 'file:./prisma/dev.db',
    },
});

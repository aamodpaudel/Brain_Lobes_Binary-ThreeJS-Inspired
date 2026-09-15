import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// The Prisma CLI (migrate/db push/studio) always talks to a local SQLite file, never directly
// to Turso — see the comment on the datasource block in prisma/schema.prisma for why, and
// LOCAL_SETUP.md / DEPLOY.md for the workflow this implies for shipping schema changes.
export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
        seed: 'tsx prisma/seed.ts',
    },
    datasource: {
        url: env('LOCAL_DATABASE_URL'),
    },
});

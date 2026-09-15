import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import path from 'path';

// Same libSQL adapter either way — only the URL differs. With TURSO_DATABASE_URL unset (plain
// local dev, no Vercel/Turso account needed to run `npm run dev`), it points at the local
// sqlite file directly; set, it talks to the real remote Turso database instead. This is what
// makes the file-vs-remote distinction from prisma.config.ts (CLI-only) not leak into runtime.
const url =
    process.env.TURSO_DATABASE_URL ||
    `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`;

const adapter = new PrismaLibSQL({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

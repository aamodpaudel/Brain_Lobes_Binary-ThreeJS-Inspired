#!/usr/bin/env node
// Applies SQL to a Turso database over its HTTP API — no Turso CLI install needed, just this
// script. With no argument, applies the *entire* current prisma/schema.prisma (for a fresh,
// empty database). Pass a path to apply an arbitrary .sql file instead — e.g. a diff generated
// for a later schema change, see "Ongoing schema changes" in DEPLOY.md.
//
// Usage:
//   TURSO_DATABASE_URL=libsql://your-db-org.turso.io TURSO_AUTH_TOKEN=... node scripts/turso-apply-schema.mjs [path/to/change.sql]

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const dbUrl = process.env.TURSO_DATABASE_URL;
const token = process.env.TURSO_AUTH_TOKEN;

if (!dbUrl || !token) {
    console.error('Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in the environment first.');
    process.exit(1);
}

const sqlFilePath = process.argv[2];
const sql = sqlFilePath
    ? readFileSync(sqlFilePath, 'utf8')
    : execSync('npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script', {
          encoding: 'utf8',
      });

const statements = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

if (statements.length === 0) {
    console.log('Nothing to apply.');
    process.exit(0);
}

console.log(`Applying ${statements.length} statement(s) to ${dbUrl} …`);

const httpUrl = `${dbUrl.replace(/^libsql:\/\//, 'https://')}/v2/pipeline`;
const body = {
    requests: [...statements.map((s) => ({ type: 'execute', stmt: { sql: s } })), { type: 'close' }],
};

const res = await fetch(httpUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
});

const result = await res.json();
if (!res.ok) {
    console.error('Request failed:', JSON.stringify(result, null, 2));
    process.exit(1);
}

const errors = (result.results ?? []).filter((r) => r.type === 'error');
if (errors.length > 0) {
    console.error('Some statements failed:', JSON.stringify(errors, null, 2));
    process.exit(1);
}

console.log('Done.');

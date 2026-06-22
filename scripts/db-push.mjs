#!/usr/bin/env node
/**
 * Apply SQL migrations to Supabase via the Management API (works over HTTPS/443).
 * Requires a control-plane credential: SUPABASE_ACCESS_TOKEN (a Supabase PAT, sbp_...).
 *
 * Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/db-push.mjs
 * Project ref is read from SUPABASE_PROJECT_REF or parsed from NEXT_PUBLIC_SUPABASE_URL.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "supabase", "migrations");

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref =
  process.env.SUPABASE_PROJECT_REF ||
  (process.env.NEXT_PUBLIC_SUPABASE_URL || "").match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];

if (!token) {
  console.error("✗ SUPABASE_ACCESS_TOKEN is not set (a Supabase Personal Access Token, sbp_...).");
  console.error("  Add it to the environment, then re-run: npm run db:push");
  process.exit(1);
}
if (!ref) {
  console.error("✗ Could not determine project ref (set SUPABASE_PROJECT_REF or NEXT_PUBLIC_SUPABASE_URL).");
  process.exit(1);
}

const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
if (files.length === 0) {
  console.error("✗ No .sql migrations found in", migrationsDir);
  process.exit(1);
}

const endpoint = `https://api.supabase.com/v1/projects/${ref}/database/query`;

for (const file of files) {
  const query = readFileSync(join(migrationsDir, file), "utf8");
  process.stdout.write(`→ applying ${file} ... `);
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    console.error(`FAILED (${res.status})`);
    console.error(await res.text());
    process.exit(1);
  }
  console.log("ok");
}

console.log(`✓ Applied ${files.length} migration(s) to project ${ref}.`);

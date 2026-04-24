#!/usr/bin/env node
/**
 * Admin migration runner. Verilen SQL dosyalarını sırayla Neon'da çalıştırır.
 * DATABASE_URL env zorunlu. Statement'ları ';' ile split eder, boş/comment'leri atlar.
 *
 * Kullanım:
 *   DATABASE_URL=postgresql://... node scripts/migrate.mjs
 *   DATABASE_URL=postgresql://... node scripts/migrate.mjs migrations/001-init-admin.sql
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable zorunlu.");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

function listMigrations() {
  const dir = join(ROOT, "migrations");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => join(dir, f));
}

function splitStatements(text) {
  const out = [];
  let buf = "";
  let inDollar = false;
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("--")) continue;
    if (line.includes("$$")) inDollar = !inDollar;
    buf += line + "\n";
    if (!inDollar && trimmed.endsWith(";")) {
      const stmt = buf.trim();
      if (stmt) out.push(stmt);
      buf = "";
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

async function runFile(path) {
  const content = readFileSync(path, "utf8");
  const stmts = splitStatements(content);
  console.log(`\n→ ${path}`);
  for (const stmt of stmts) {
    const first = stmt.split("\n")[0].slice(0, 80);
    process.stdout.write(`  ${first} ... `);
    try {
      await sql.query(stmt);
      console.log("ok");
    } catch (err) {
      console.log("FAIL");
      console.error(err.message);
      process.exit(1);
    }
  }
}

const args = process.argv.slice(2);
const files = args.length > 0 ? args.map((a) => resolve(a)) : listMigrations();

if (files.length === 0) {
  console.log("Migration dosyası bulunamadı.");
  process.exit(0);
}

console.log(`${files.length} migration dosyası çalıştırılacak.`);
for (const f of files) {
  await runFile(f);
}
console.log("\nTamamlandı.");

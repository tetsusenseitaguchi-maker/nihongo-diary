#!/usr/bin/env node
/**
 * Find diaries that DRAW wrong Japanese, by rendering every one of them.
 *
 *   node scripts/scan-ruby-duplicates.mjs                 # everything
 *   node scripts/scan-ruby-duplicates.mjs --days 30       # the last month
 *   node scripts/scan-ruby-duplicates.mjs --field corrected_japanese
 *   node scripts/scan-ruby-duplicates.mjs --verbose       # show every hit in full
 *
 * Read-only. It writes nothing, anywhere.
 *
 * ── Why this exists, and why it is a script and not a guard ─────────────────
 * On 2026-08-06 a learner's diary drew 食べべます. The stored string was
 *
 *     <ruby>食べ<rt>た</rt></ruby>べます
 *
 * — the okurigana inside the ruby base AND again after it. The renderer is
 * innocent: it shows exactly what it was given. The model wrote it.
 *
 * The obvious fix, dropping a kana when a base ends with the one that follows
 * it, was considered and rejected. It would run against all 1,210 diaries to
 * repair one, in a function that had just demonstrated how easily this class
 * of repair breaks working text: the previous guard rescued four shapes and
 * still misses two. Scanning monthly finds a recurrence while it is still a
 * handful of rows, and nothing that works today can be broken by it.
 *
 * ── Why it renders instead of searching ────────────────────────────────────
 * grep cannot see this. The stored text has ruby tags between the two べ, so
 * the literal string 食べべ appears nowhere in the database — the first search
 * for it came back empty on the very row that had the bug. The duplication
 * only exists once the markup is resolved, so every row is put through
 * parseRubySegments, the same function the app draws with.
 *
 * ── What it looks for ──────────────────────────────────────────────────────
 *   1. base-echo — a ruby base ending in the kana that starts the text after
 *      it. This is the 食べ|べます shape, and nothing in the renderer catches
 *      it: dropEchoedOkurigana compares the READING with what follows, and
 *      here the reading (た) is not involved at all.
 *   2. triple kana — the same kana three times in the drawn text. A wider,
 *      dumber net for whatever the next variant turns out to be. Real
 *      Japanese almost never does this, so a hit is worth a look even when it
 *      is not case 1.
 *
 * Both report the diary id and the drawn text around the hit, because the fix
 * is always a judgement about one sentence, never a rule.
 */
import { readFileSync, mkdtempSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const value = (n, d) => {
  const i = argv.indexOf(n);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : d;
};
const FIELD = value("--field", "natural_japanese");
const DAYS = Number(value("--days", "0")) || 0;
const VERBOSE = flag("--verbose");

/**
 * The app's own parser, never a copy of it.
 *
 * Node 24 can import TypeScript directly; older versions cannot, so it falls
 * back to compiling the one file into a temp directory. furigana.ts imports
 * nothing, which is what makes either route work.
 */
async function loadParser() {
  const src = join(ROOT, "src", "lib", "furigana.ts");
  try {
    return await import(pathToFileURL(src).href);
  } catch {
    const out = mkdtempSync(join(tmpdir(), "furigana-"));
    execFileSync(
      "npx",
      ["tsc", src, "--outDir", out, "--module", "commonjs", "--target", "es2020", "--skipLibCheck"],
      { cwd: ROOT, stdio: "pipe" },
    );
    return await import(pathToFileURL(join(out, "furigana.js")).href);
  }
}

function env() {
  const out = {};
  for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const E = env();
if (!E.NEXT_PUBLIC_SUPABASE_URL || !E.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("✗ .env.local needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const { parseRubySegments } = await loadParser();
const admin = createClient(E.NEXT_PUBLIC_SUPABASE_URL, E.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const KANA = /[ぁ-ゖ]/;
const PAGE = 1000;

/** What the learner actually sees: ruby bases and plain text, no readings. */
function drawn(segments) {
  return segments.map((s) => (s.type === "ruby" ? s.base : s.value)).join("");
}

function around(text, index, before = 12, after = 12) {
  return text.slice(Math.max(0, index - before), index + after).replace(/\n/g, "⏎");
}

const hits = [];
let scanned = 0;

for (let from = 0; ; from += PAGE) {
  let q = admin
    .from("diary_entries")
    .select(`id,diary_date,${FIELD}`)
    .not(FIELD, "is", null)
    .order("diary_date", { ascending: false })
    .range(from, from + PAGE - 1);
  if (DAYS > 0) {
    const since = new Date(Date.now() - DAYS * 86400000).toISOString().slice(0, 10);
    q = q.gte("diary_date", since);
  }

  const { data, error } = await q;
  if (error) {
    console.error(`✗ query failed: ${error.message}`);
    process.exit(1);
  }
  if (!data || data.length === 0) break;

  for (const row of data) {
    scanned++;
    const raw = row[FIELD] ?? "";
    const segments = parseRubySegments(raw);
    const text = drawn(segments);

    // ① base-echo
    for (let i = 0; i < segments.length - 1; i++) {
      const ruby = segments[i];
      const next = segments[i + 1];
      if (ruby.type !== "ruby" || next.type !== "text") continue;
      const last = ruby.base.slice(-1);
      const first = (next.value ?? "")[0];
      if (last && first && last === first && KANA.test(last)) {
        hits.push({
          kind: "base-echo",
          id: row.id,
          date: row.diary_date,
          detail: `<ruby>${ruby.base}<rt>${ruby.rt}</rt></ruby>${(next.value ?? "").slice(0, 6)}`,
          drawn: around(text, text.indexOf(ruby.base + first)),
        });
      }
    }

    // ② the same kana three times in the drawn text
    const triple = text.match(/([ぁ-ゖ])\1\1/);
    if (triple) {
      hits.push({
        kind: "triple-kana",
        id: row.id,
        date: row.diary_date,
        detail: `「${triple[0]}」`,
        drawn: around(text, text.indexOf(triple[0])),
      });
    }
  }

  if (data.length < PAGE) break;
}

console.log(`field   : ${FIELD}`);
console.log(`scanned : ${scanned} diaries${DAYS ? ` (last ${DAYS} days)` : ""}`);
console.log(`hits    : ${hits.length}`);

if (hits.length === 0) {
  console.log("\n✓ Nothing draws a duplicated kana.");
  process.exit(0);
}

const byKind = {};
for (const h of hits) byKind[h.kind] = (byKind[h.kind] ?? 0) + 1;
console.log("");
for (const [k, n] of Object.entries(byKind)) console.log(`  ${String(n).padStart(3)}  ${k}`);

console.log("");
for (const h of hits) {
  console.log(`${h.kind.padEnd(12)} ${h.date}  ${h.id}`);
  console.log(`  stored : ${h.detail}`);
  console.log(`  drawn  : 「${h.drawn}」`);
  if (VERBOSE) console.log(`  fix    : read the sentence before changing it — the answer is not always "drop one"`);
}

console.log("\nEach of these is one sentence to judge, not a rule to write.");
console.log("The 2026-08-06 case was repaired by moving the okurigana out of the ruby base:");
console.log("  <ruby>食べ<rt>た</rt></ruby>べます  →  <ruby>食<rt>た</rt></ruby>べます");

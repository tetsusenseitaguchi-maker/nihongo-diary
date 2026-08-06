#!/usr/bin/env node
/**
 * Re-send the confirmation email to learners who never got one.
 *
 *   node scripts/resend-confirmations.mjs                      # dry run: who would be sent to
 *   node scripts/resend-confirmations.mjs --only you@icloud.com --send
 *   node scripts/resend-confirmations.mjs --limit 5 --send     # the first careful batch
 *   node scripts/resend-confirmations.mjs --limit 20 --send    # …then wider
 *   node scripts/resend-confirmations.mjs --send               # the rest
 *
 * ⚠️ SENDS REAL EMAIL to real people. Dry run is the default; nothing leaves
 * the machine without --send.
 *
 * ── Why not admin.generateLink ──────────────────────────────────────────────
 * generateLink() builds a link and hands it back. It does NOT send anything —
 * delivering it would be this script's job, which would mean composing the
 * message here and having a second copy of the template to keep in step with
 * the one in the dashboard. auth.resend() asks Supabase to send its own
 * confirmation mail, through the project's SMTP and the template that is
 * live right now. That is the whole point of this run: the template changed,
 * and these people need the new one.
 *
 * generateLink has a sharper edge too — for type "signup" it takes a password
 * and will happily create or overwrite a user. Nothing here should be able to
 * touch a password.
 *
 * The service role is used for exactly one thing: listing who is unconfirmed.
 * The sending itself goes through the ordinary public endpoint, the same one
 * the app would call.
 *
 * ── Pacing ──────────────────────────────────────────────────────────────────
 * Default 120 seconds between messages, i.e. 30 an hour. Two limits meet here
 * and the lower one wins:
 *
 *   · Supabase's "Rate limit for sending emails" (Auth → Rate Limits). 30/hour
 *     is the common setting with custom SMTP. Exceed it and the answer is 429
 *     over_email_send_rate_limit — the send simply does not happen.
 *   · Apple. 22 of these are iCloud and every previous message to them
 *     bounced. A burst to one domain, from a sender it has just been
 *     rejecting, is the shape of a spam run. The mail is legitimate; it
 *     should not look like it is in a hurry.
 *
 * ⚠️ The backlog is NOT all iCloud, which the first dry run is what showed:
 * 40 of the 82 are gmail.com, and Resend logged those as Delivered. Those
 * people got the mail and are still unconfirmed, so something else stopped
 * them — most likely the link itself, which needed the browser that opened
 * it to be the browser that signed up. That is fixed in the same release
 * this run goes out with, which is the reason to resend to them at all.
 *
 * 78 addresses at 120s is about two and a half hours. That is a feature: send
 * five, look at Resend, and only then let the rest go.
 *
 * A 429 stops the run rather than retrying. The log means the next run picks
 * up where this one stopped.
 *
 * ── Resuming ────────────────────────────────────────────────────────────────
 * Every attempt is appended to scripts/logs/resend-confirmations.jsonl, and
 * anyone already logged ok is skipped on later runs. So --limit 5 then --send
 * with no limit sends to the other 72, not to all 77 again.
 *
 * The log holds email addresses. It is gitignored, and it should stay that way.
 */
import { readFileSync, appendFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOG_PATH = join(ROOT, "scripts", "logs", "resend-confirmations.jsonl");

// ── Arguments ───────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const SEND = flag("--send");
const LIMIT = Number(value("--limit", "0")) || 0;
const ONLY = value("--only", null);
const DELAY_MS = Number(value("--delay-ms", "120000"));
const ASSUME_YES = flag("--yes");
const INCLUDE_SUSPECT = flag("--include-suspect");

// ── Environment, read the same way the app does ─────────────────────────────
function env() {
  const out = {};
  const text = readFileSync(join(ROOT, ".env.local"), "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const E = env();
const URL_ = E.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = E.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = E.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!URL_ || !SERVICE_KEY || !ANON_KEY) {
  console.error("✗ .env.local needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const admin = createClient(URL_, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const pub = createClient(URL_, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

// ── Who has already been written down ───────────────────────────────────────
function alreadySent() {
  if (!existsSync(LOG_PATH)) return new Set();
  const done = new Set();
  for (const line of readFileSync(LOG_PATH, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line);
      if (row.ok) done.add(row.email);
    } catch {
      /* a half-written line is not worth failing over */
    }
  }
  return done;
}

function record(row) {
  mkdirSync(dirname(LOG_PATH), { recursive: true });
  appendFileSync(LOG_PATH, JSON.stringify({ at: new Date().toISOString(), ...row }) + "\n");
}

// ── Everyone with no confirmed email ────────────────────────────────────────
async function unconfirmed() {
  const out = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const users = data?.users ?? [];
    for (const u of users) {
      if (u.email && !u.email_confirmed_at) {
        out.push({ id: u.id, email: u.email, created_at: u.created_at });
      }
    }
    if (users.length < 200) break;
  }
  out.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  return out;
}

/**
 * Addresses that cannot receive anything, held out by default.
 *
 * A typo domain does not bounce softly — it fails to resolve, and a run of
 * hard bounces is the single fastest way to lose the sender reputation this
 * whole exercise is trying to recover. These were read off the live list
 * rather than imagined; --include-suspect sends to them anyway.
 *
 * Nothing is dropped silently: excluded addresses are printed under their own
 * heading so the decision stays visible.
 */
const SUSPECT_DOMAINS = new Set([
  "gmail.vom",
  "gmail.con",
  "gnail.com",
  "gmial.com",
  "gmai.com",
  "hotmial.com",
  "outlok.com",
  "icloud.con",
  "no.com",
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Run ─────────────────────────────────────────────────────────────────────
const all = await unconfirmed();
const done = alreadySent();

let targets = all.filter((u) => !done.has(u.email));

const suspect = targets.filter((u) => SUSPECT_DOMAINS.has(u.email.split("@")[1] ?? ""));
if (!INCLUDE_SUSPECT) {
  targets = targets.filter((u) => !SUSPECT_DOMAINS.has(u.email.split("@")[1] ?? ""));
}

if (ONLY) targets = targets.filter((u) => u.email === ONLY);
if (LIMIT > 0) targets = targets.slice(0, LIMIT);

const domains = {};
for (const u of all) {
  const d = u.email.split("@")[1] ?? "?";
  domains[d] = (domains[d] ?? 0) + 1;
}

console.log(`unconfirmed accounts : ${all.length}`);
console.log(`already sent (log)   : ${done.size}`);
console.log(`this run would send  : ${targets.length}`);
console.log(`interval             : ${DELAY_MS / 1000}s  (~${Math.round(3600000 / DELAY_MS)}/hour)`);
console.log(`estimated wall clock : ${Math.round((targets.length * DELAY_MS) / 60000)} min`);
console.log("\nby domain (all unconfirmed):");
for (const [d, n] of Object.entries(domains).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${d}`);
}
if (suspect.length > 0) {
  console.log(`\nheld back — the domain looks like a typo (${INCLUDE_SUSPECT ? "SENDING ANYWAY" : "use --include-suspect to send"}):`);
  for (const u of suspect) console.log(`  ${u.email}`);
}

console.log("\nrecipients this run:");
for (const u of targets) console.log(`  ${u.created_at?.slice(0, 10)}  ${u.email}`);

if (!SEND) {
  console.log("\nDRY RUN — nothing was sent. Add --send to actually send.");
  process.exit(0);
}
if (targets.length === 0) {
  console.log("\nNothing to do.");
  process.exit(0);
}

if (!ASSUME_YES) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`\nSend ${targets.length} confirmation email(s)? type "yes" to proceed: `);
  rl.close();
  if (answer.trim() !== "yes") {
    console.log("Aborted. Nothing sent.");
    process.exit(0);
  }
}

let ok = 0;
let failed = 0;

for (const [i, u] of targets.entries()) {
  const { error } = await pub.auth.resend({
    type: "signup",
    email: u.email,
    // Read only if the live template builds its link from ConfirmationURL.
    // The current one uses TokenHash and ignores this; it is set so the two
    // cannot disagree if the template is ever rolled back.
    options: { emailRedirectTo: "https://nihongodiary.app/auth/confirm" },
  });

  if (error) {
    failed++;
    record({ email: u.email, ok: false, code: error.code ?? null, status: error.status ?? null, message: error.message });
    console.log(`  ✗ ${u.email}  ${error.status ?? ""} ${error.code ?? ""} ${error.message}`);

    // Rate limited. Stopping beats hammering: the remaining addresses stay
    // unsent in the log's eyes, so the next run continues from here.
    if (error.status === 429 || error.code === "over_email_send_rate_limit") {
      console.log("\n⚠️  Rate limited by Supabase. Stopping.");
      console.log("    Raise Auth → Rate Limits, or wait an hour and run again —");
      console.log("    the log means this picks up where it left off.");
      break;
    }
  } else {
    ok++;
    record({ email: u.email, ok: true });
    console.log(`  ✓ ${u.email}`);
  }

  if (i < targets.length - 1) await sleep(DELAY_MS);
}

console.log(`\nsent ${ok}, failed ${failed}, log: ${LOG_PATH}`);
console.log("Check Resend for Delivered vs Bounced before sending the next batch.");

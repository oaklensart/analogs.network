#!/usr/bin/env node
/**
 * ANALOGS.NETWORK — reservation tool (zero dependencies)
 *
 * The RESERVED / pre-light state (manual §8): a NON-PERMANENT hold on
 * a seat the owner wants to light for an invitee before they accept.
 * Two guardrails are structural here, not policy:
 *
 *   1. No speculative identity is ever published. status.json gets the
 *      seat number, the dates, and an opaque key — nothing else. The
 *      invitee's name travels ONLY in the private preview link this
 *      tool prints (a URL hash fragment: never sent to a server,
 *      never in a served file, never in git).
 *   2. Holds expire. The page treats a past-`until` hold as vacant the
 *      moment it loads, and build-manifest.mjs prunes it on the next
 *      compile — a wave of non-answers can't lock up the low numbers.
 *
 * Usage (run from the repo root, then commit status.json):
 *   node scripts/reserve.mjs hold <seat> --name "Their Name" [--weeks 3 | --days 2 | --hours 24]
 *   node scripts/reserve.mjs release <seat>
 *   node scripts/reserve.mjs list
 *   node scripts/reserve.mjs prune
 *
 * `hold` prints the private preview link — send it to the invitee and
 * nowhere public. Re-running `hold` on the same seat renews the hold
 * with a NEW key (old links die). Seats already in nodes/ are refused:
 * claimed numbers are permanent, dark numbers are retired.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STATUS = join(ROOT, 'status.json');
const NODES_DIR = join(ROOT, 'nodes');
const SITE = 'https://analogs.network/';

const [, , cmd, seatArg] = process.argv;
const arg = f => {
  const i = process.argv.indexOf('--' + f);
  return i > 0 ? process.argv[i + 1] : null;
};
const die = m => { console.error('reserve: ' + m); process.exit(1); };

const status = existsSync(STATUS)
  ? JSON.parse(readFileSync(STATUS, 'utf8'))
  : { network: 'analogs.network', generated: null, swept: null, nodes: {} };
const reserved = status.reserved || {};

const day = 86400000;
const iso = t => new Date(t).toISOString().slice(0, 10);
const expired = h => !h || !h.until || Date.parse(h.until) <= Date.now();

function save() {
  if (Object.keys(reserved).length) status.reserved = reserved;
  else delete status.reserved;
  writeFileSync(STATUS, JSON.stringify(status, null, 2) + '\n');
}

if (cmd === 'list') {
  const keys = Object.keys(reserved);
  if (!keys.length) { console.log('no holds.'); process.exit(0); }
  for (const s of keys.sort((a, b) => a - b)) {
    const h = reserved[s];
    console.log(`seat ${String(s).padStart(3, '0')}  held ${h.held}  until ${h.until}` +
                (expired(h) ? '  [EXPIRED — prune me]' : ''));
  }
  process.exit(0);
}

if (cmd === 'prune') {
  let n = 0;
  for (const s of Object.keys(reserved)) if (expired(reserved[s])) { delete reserved[s]; n++; }
  save();
  console.log(`pruned ${n} expired hold(s).`);
  process.exit(0);
}

const seat = parseInt(seatArg, 10);
if (cmd !== 'hold' && cmd !== 'release')
  die('usage: reserve.mjs hold <seat> --name "Name" [--weeks 3 | --days 2 | --hours 24] | release <seat> | list | prune');
if (!Number.isInteger(seat) || seat < 0) die('seat must be a non-negative integer');

if (cmd === 'release') {
  if (!reserved[seat]) die(`seat ${seat} has no hold`);
  delete reserved[seat];
  save();
  console.log(`released seat ${String(seat).padStart(3, '0')} → vacant. Commit status.json.`);
  process.exit(0);
}

/* hold */
const name = arg('name');
if (!name) die('hold needs --name "Their Name" (goes ONLY into the printed link)');

/* hold length: --weeks / --days / --hours (combined; default 3 weeks). --hours
   stores a precise timestamp so a 24h social hold is a REAL 24h; weeks/days
   store a date (the hold lapses at UTC midnight). Capped at 8 weeks — a hold is
   never permanent (manual §8). Date.parse reads both forms, so the page and
   build-manifest.mjs need no change. */
const numFlag = f => { const v = arg(f); return v == null ? null : parseFloat(v); };
const wk = numFlag('weeks'), dy = numFlag('days'), hr = numFlag('hours');
if ([wk, dy, hr].some(v => v != null && !(v >= 0))) die('hold length must be a non-negative number');
const ms = (wk == null && dy == null && hr == null)
  ? 3 * 7 * day
  : (wk || 0) * 7 * day + (dy || 0) * day + (hr || 0) * 3600000;
if (ms <= 0) die('hold length must be positive (use --weeks / --days / --hours)');
if (ms > 8 * 7 * day) die('a hold caps at 8 weeks — it is never permanent');
const until = hr != null
  ? new Date(Date.now() + ms).toISOString().replace(/\.\d{3}Z$/, 'Z')  /* precise (sub-day) */
  : iso(Date.now() + ms);                                              /* date only */
const dur = hr != null ? `~${Math.round(ms / 3600000)} hr`
          : ms % (7 * day) === 0 ? `~${ms / (7 * day)} wk`
          : `~${Math.round(ms / day)} day`;

/* claimed and dark numbers are never holdable — permanence is theirs */
for (const f of readdirSync(NODES_DIR).filter(f => /^\d{3}-.+\.json$/.test(f))) {
  const n = JSON.parse(readFileSync(join(NODES_DIR, f), 'utf8'));
  if (n.node === seat) die(`seat ${seat} belongs to ${n.slug} (${n.status}) — not holdable`);
}

const key = randomBytes(4).toString('hex');
reserved[seat] = { held: iso(Date.now()), until, key };
save();

const payload = Buffer.from(JSON.stringify({ s: seat, k: key, n: name }))
  .toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
console.log(`seat ${String(seat).padStart(3, '0')} held until ${reserved[seat].until} (${dur}).`);
console.log('');
console.log('PRIVATE preview link — send to the invitee only, never post it:');
console.log('  ' + SITE + '#hold=' + payload);
console.log('');
console.log('Now commit status.json. Renewing this seat re-keys the link; ' +
            'release/expiry kills it.');

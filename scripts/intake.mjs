#!/usr/bin/env node
/**
 * ANALOGS.NETWORK — intake tool (zero dependencies)
 *
 * The founding-node routine as one command. You feed it the three things a
 * join request carries — site, name, discipline number — and it:
 *
 *   STEP 1  prints the ACKNOWLEDGMENT email (send it the moment the request
 *           lands, before you've done anything);
 *   STEP 2  runs the checks (valid https URL, discipline in range, slug free,
 *           not a duplicate), assigns the next join-order number, writes
 *           nodes/{NNN}-{slug}.json, and recompiles manifest.json/status.json;
 *   STEP 3  prints the YOU'RE LIT email — their node number, the promotion
 *           note computed from the LIVE reserved holds, the badge handshake,
 *           the signature.
 *
 * Numbers are join-order and never reused (manual §1.6): the next number is
 * one past the highest number any node OR reserved seat already occupies — a
 * held seat keeps its number even before it's claimed (see reserve.mjs, §8).
 *
 * Usage (run from the repo root):
 *   node scripts/intake.mjs --url <url> --name "Name / studio" --disc <1-7>
 *        [--slug <slug>]   override the auto slug (default: from the domain)
 *        [--to "Name"]     salutation (default: name before the first "/")
 *        [--est YYYY-MM-DD] join date (default: today)
 *        [--links "Label|https://a.com, Label2|https://b.com"]  up to 4
 *        [--dry]           preview everything, write NOTHING
 *        [--ack]           print only the acknowledgment email and exit
 *
 * Disciplines (same order and numbering applicants see on the ring):
 *   1 Photography  2 Digital Art  3 Writing  4 Code  5 Music  6 Design
 *   7 Architecture
 *
 * After a real run: commit the new node + recompiled manifest, push to main
 * (the printed git line does exactly that).
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NODES_DIR = join(ROOT, 'nodes');
const STATUS = join(ROOT, 'status.json');
const BADGE = 'https://analogs.network/assets/buttons/analogs-network.svg';
const SITE = 'https://analogs.network';

/* discipline order MUST match CATS in index.html — that's the [1]-[7] list
   applicants pick from in the intake email. */
const DISCIPLINES = ['Photography', 'Digital Art', 'Writing', 'Code',
                     'Music', 'Design', 'Architecture'];

const has = f => process.argv.includes('--' + f);
const arg = f => { const i = process.argv.indexOf('--' + f); return i > 0 ? process.argv[i + 1] : null; };
const die = m => { console.error('intake: ' + m); process.exit(1); };

const iso = t => new Date(t).toISOString().slice(0, 10);
const pad = n => String(n).padStart(3, '0');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                'August', 'September', 'October', 'November', 'December'];
const longDate = d => { const [, m, day] = d.split('-').map(Number); return `${MONTHS[m - 1]} ${day}`; };
const rule = '─'.repeat(66);
const block = (title, body) => console.log('\n' + rule + '\n' + title + '\n' + rule + '\n\n' + body + '\n');

/* seats as prose: [1] → "001"; [1,2] → "001 and 002"; [1,2,3] → "001, 002, and 003" */
function seatProse(seats) {
  const p = seats.map(pad);
  if (p.length === 1) return p[0];
  if (p.length === 2) return `${p[0]} and ${p[1]}`;
  return p.slice(0, -1).join(', ') + ', and ' + p[p.length - 1];
}

/* ── inputs ─────────────────────────────────────────────────────────── */
const name = arg('name');
if (!name) die('need --name "Their Name"');
if (name.length > 40) die(`name too long (max 40): ${name}`);
const salutation = (arg('to') || name.split('/')[0]).trim();

/* the acknowledgment email carries no node number — safe to send before any
   work, so --ack short-circuits here. */
function ackEmail() {
  return [
    'Subject: Received // analogs.network',
    '',
    `${salutation},`,
    '',
    'Got your note. Your request to join the ring is in. I run a couple of',
    'quick checks (that the site is really yours to list, and that the content',
    'is safe for a public directory), then your socket goes live.',
    '',
    'I will follow up the moment your light is on.',
    '',
    '// THE MONITOR //'
  ].join('\n');
}
if (has('ack')) { block('STEP 1 // ACKNOWLEDGMENT EMAIL  (send now)', ackEmail()); process.exit(0); }

/* url + discipline are required for a real add */
let url = arg('url');
if (!url) die('need --url https://their-site');
url = 'https://' + url.replace(/^https?:\/\//i, '').replace(/\/+$/, '');   // force https, drop trailing slash
let host;
try { host = new URL(url).hostname; } catch { die('could not parse --url: ' + url); }
const bareHost = host.replace(/^www\./, '');

const discNum = parseInt(arg('disc'), 10);
if (!(discNum >= 1 && discNum <= 7)) die('need --disc 1-7  (1 Photography, 4 Code, 7 Architecture, ...)');
const discipline = DISCIPLINES[discNum - 1];

let slug = (arg('slug') || bareHost.split('.')[0]).toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 40) die('bad slug (pass --slug): ' + slug);

const est = arg('est') || iso(Date.now());
if (!/^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(est)) die('bad --est (YYYY-MM-DD): ' + est);

/* optional card links: "Label|https://a.com, Label2|https://b.com" (max 4) */
let links = null;
if (arg('links')) {
  links = arg('links').split(',').map(s => s.trim()).filter(Boolean).map(pair => {
    const [label, u] = pair.split('|').map(x => (x || '').trim());
    if (!label || !u) die(`bad --links entry "${pair}" (use "Label|https://...")`);
    if (label.length > 32) die('link label too long (max 32): ' + label);
    return { label, url: 'https://' + u.replace(/^https?:\/\//i, '').replace(/\/+$/, '') };
  });
  if (links.length > 4) die('max 4 links');
}

/* ── the ring's current state ───────────────────────────────────────── */
const nodes = readdirSync(NODES_DIR)
  .filter(f => /^\d{3}-.+\.json$/.test(f))
  .map(f => JSON.parse(readFileSync(join(NODES_DIR, f), 'utf8')));
if (nodes.some(n => n.slug === slug)) die(`slug "${slug}" already exists — pass a different --slug`);
if (nodes.some(n => { try { return new URL(n.url).hostname.replace(/^www\./, '') === bareHost; } catch { return false; } }))
  die(`a node already lists ${bareHost} — refusing a duplicate`);

const status = existsSync(STATUS) ? JSON.parse(readFileSync(STATUS, 'utf8')) : {};
const reserved = status.reserved || {};

/* next join-order number: one past the highest occupied node OR reserved seat */
const node = Math.max(-1, ...nodes.map(n => n.node), ...Object.keys(reserved).map(Number)) + 1;
const founding = node < 100;

const record = { node, slug, name, url, disciplines: [discipline], est, status: 'online' };
if (founding) record.founding = true;
if (links) record.links = links;

/* promotion note: reserved holds BELOW this number that are still live can
   lapse and pull everyone up (manual §8). Compute the honest ceiling. */
const stillHeld = h => h && h.until && Date.parse(h.until) > Date.now();
const holdsBelow = Object.keys(reserved).map(Number)
  .filter(s => s < node && stillHeld(reserved[s])).sort((a, b) => a - b);

function numberPara() {
  const H = holdsBelow.length;
  if (!H) return '';
  const untils = [...new Set(holdsBelow.map(s => reserved[s].until))].sort();
  const expiry = untils.map(longDate).join(H > 1 && untils.length > 1 ? ' and ' : '');
  const ceiling = node - H;
  const lapse = H === 1 ? 'it lapses' : H === 2 ? 'either lapses' : 'any of them lapse';
  const couldBe = H === 1
    ? `You might find yourself ${pad(node - 1)} before the founding window closes.`
    : `You might find yourself ${pad(node - 1)}, maybe ${pad(ceiling)}, before the founding window closes.`;
  return `A note on your number, because it may not stay ${pad(node)}. ${cap(WORDS[H])} ` +
    `${H === 1 ? 'seat' : 'seats'} ahead of you (${seatProse(holdsBelow)}) ${H === 1 ? 'is' : 'are'} ` +
    `reserved but not yet claimed, holds that expire ${expiry}. The ring rewards showing up: if ` +
    `${lapse} unclaimed, everyone below settles upward, automatically, and you move with it. So ` +
    `${pad(node)} is your floor, not your ceiling. ${couldBe}`;
}

function litEmail() {
  const np = numberPara();
  const out = [
    `Subject: Your node is lit // N#${pad(node)} // analogs.network`,
    '',
    `${salutation},`,
    '',
    `Your light is on. You're N#${pad(node)}, ${founding ? 'a founding node, ' : ''}` +
      `discipline ${discipline.toUpperCase()}. Pull up analogs.network and you'll find yourself ` +
      `lit on the coil${founding ? ', one of the first hundred' : ''}.`
  ];
  if (np) out.push('', np);
  out.push('',
    `The ring runs one light per creative, so ${bareHost} is your node.` +
      (links ? '' : ' If you keep other corners of the web (another project, a shop, a second site), ' +
        'I can set them as links right on your card, up to a few. Just send them over.'),
    '',
    'And there is a button for the old-web handshake, an 88x31 you can put anywhere and point back to the ring:',
    '',
    `  ${BADGE}  →  links to  →  ${SITE}`,
    '',
    'Appreciated, never required. The ring holds either way.',
    '',
    'Good to have you early.',
    '',
    '// THE MONITOR //');
  return out.join('\n');
}

/* ── output ─────────────────────────────────────────────────────────── */
block('STEP 1 // ACKNOWLEDGMENT EMAIL  (send the moment the request lands)', ackEmail());

block('STEP 2 // CHECKS', [
  `discipline    ${discNum} → ${discipline}`,
  `slug          ${slug}`,
  `url           ${url}`,
  `next number   N#${pad(node)}${founding ? '   (founding — within the first 100)' : ''}`,
  `holds ahead   ${holdsBelow.length ? holdsBelow.map(pad).join(', ') + '  (unclaimed — promotion possible)' : 'none'}`,
  `file          nodes/${pad(node)}-${slug}.json`
].join('\n'));

if (has('dry')) {
  console.log('[dry run] nothing written. Re-run without --dry to add the node.\n');
  block("STEP 3 // YOU'RE LIT EMAIL  (preview — send after merge)", litEmail());
  process.exit(0);
}

const file = join(NODES_DIR, `${pad(node)}-${slug}.json`);
writeFileSync(file, JSON.stringify(record, null, 2) + '\n');
try {
  execSync('node scripts/validate-nodes.mjs', { cwd: ROOT, stdio: 'pipe' });
  const compiled = execSync('node scripts/build-manifest.mjs', { cwd: ROOT, stdio: 'pipe' }).toString().trim();
  block('STEP 2 // ADDED & COMPILED', `wrote nodes/${pad(node)}-${slug}.json\n${compiled}`);
} catch (e) {
  die('validate/compile failed after writing the node:\n' + (e.stdout || e.stderr || e).toString());
}

block("STEP 3 // YOU'RE LIT EMAIL  (send after you push)", litEmail());

console.log('Next — commit & deploy:');
console.log(`  git add -A && git commit -m ${JSON.stringify(`Node ${pad(node)}: ${name} joins the ring (${discipline}) [skip-manifest]`)} && git push origin main`);
console.log('');

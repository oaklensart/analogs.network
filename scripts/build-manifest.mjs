#!/usr/bin/env node
/**
 * ANALOGS.NETWORK — manifest compiler (zero dependencies)
 *
 * Compiles the registry (nodes/*.json, the permanent record) into the
 * serving artifacts the page fetches (the data island):
 *
 *   manifest.json — the ring's row set: every node, join order, the
 *                   long-term fields only. Regenerated wholesale on
 *                   every merge that touches nodes/**.
 *   status.json   — liveness overlay owned by the (future) weekly
 *                   sweep. This script only ADDS new slugs (online)
 *                   and DROPS removed ones — it never overwrites a
 *                   state the sweep has written. DORMANT lives here,
 *                   never in the manifest (dark is the only permanent
 *                   manifest state).
 *
 * Usage:
 *   node scripts/build-manifest.mjs          # write both files
 *   node scripts/build-manifest.mjs --dry    # compile + report, no writes
 *
 * Run validate-nodes.mjs first; this script trusts the registry.
 * Exit 0 on success, 1 on any read/parse failure.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NODES_DIR = join(ROOT, 'nodes');
const MANIFEST = join(ROOT, 'manifest.json');
const STATUS = join(ROOT, 'status.json');
const DRY = process.argv.includes('--dry');

const files = readdirSync(NODES_DIR).filter(f => /^\d{3}-.+\.json$/.test(f)).sort();
const nodes = [];
for (const file of files) {
  try {
    nodes.push(JSON.parse(readFileSync(join(NODES_DIR, file), 'utf8')));
  } catch (e) {
    console.error(`build-manifest: ${file}: ${e.message}`);
    process.exit(1);
  }
}
nodes.sort((a, b) => a.node - b.node);

/* deterministic field order so diffs stay readable in git */
const row = n => {
  const r = {
    node: n.node,
    slug: n.slug,
    name: n.name,
    url: n.url,
    disciplines: n.disciplines,
    est: n.est,
    status: n.status
  };
  if (n.founding) r.founding = true;
  if (n.button) r.button = n.button;
  if (n.feed) r.feed = n.feed;
  return r;
};

const manifest = {
  network: 'analogs.network',
  generated: new Date().toISOString().slice(0, 19) + 'Z',
  count: nodes.length,
  online: nodes.filter(n => n.status === 'online').length,
  nodes: nodes.map(row)
};

/* status.json: merge — keep every state the sweep already wrote */
let prior = {};
if (existsSync(STATUS)) {
  try { prior = JSON.parse(readFileSync(STATUS, 'utf8')).nodes || {}; }
  catch { prior = {}; }
}
const status = {
  network: 'analogs.network',
  generated: manifest.generated,
  swept: null,                       /* the weekly sweep stamps this */
  nodes: {}
};
for (const n of nodes) {
  if (n.status === 'dark') continue; /* dark is permanent, manifest-side */
  status.nodes[n.slug] = prior[n.slug] || { state: 'online' };
}

const mOut = JSON.stringify(manifest, null, 2) + '\n';
const sOut = JSON.stringify(status, null, 2) + '\n';
if (DRY) {
  console.log(`build-manifest --dry: ${manifest.count} node(s), ${manifest.online} online — OK`);
} else {
  writeFileSync(MANIFEST, mOut);
  writeFileSync(STATUS, sOut);
  console.log(`build-manifest: wrote manifest.json (${manifest.count} node(s)) + status.json`);
}

#!/usr/bin/env node
/**
 * ANALOGS.NETWORK — node manifest validator (zero dependencies)
 *
 * Implements the contract in nodes/node.schema.json as plain checks so
 * CI needs nothing but Node itself. Rules:
 *   - filename {NNN}-{slug}.json; NNN === node, slug === slug
 *   - required fields, strict types, no unknown fields
 *   - https-only URLs, canonical disciplines, YYYY-MM est
 *   - registry-wide: unique node numbers, slugs, and URL hosts
 * Exit 0 clean, 1 with a per-file report.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const NODES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'nodes');
const DISCIPLINES = ['Photography', 'Digital Art', 'Writing', 'Code', 'Music', 'Design', 'Architecture'];
const REQUIRED = ['node', 'slug', 'name', 'url', 'disciplines', 'est', 'status'];
const OPTIONAL = ['founding', 'button', 'feed', 'links'];

const files = readdirSync(NODES_DIR).filter(f => /^\d{3}-.+\.json$/.test(f)).sort();
const errors = [];
const seen = { node: new Map(), slug: new Map(), host: new Map() };

const err = (file, msg) => errors.push(`  ${file}: ${msg}`);
const httpsUrl = v => {
  try { return typeof v === 'string' && new URL(v).protocol === 'https:'; }
  catch { return false; }
};

for (const file of files) {
  let n;
  try { n = JSON.parse(readFileSync(join(NODES_DIR, file), 'utf8')); }
  catch (e) { err(file, `not valid JSON (${e.message})`); continue; }

  for (const k of REQUIRED) if (!(k in n)) err(file, `missing required field "${k}"`);
  for (const k of Object.keys(n)) {
    if (!REQUIRED.includes(k) && !OPTIONAL.includes(k)) {
      err(file, `unknown field "${k}" — the manifest is core long-term metadata only`);
    }
  }

  if ('node' in n && (!Number.isInteger(n.node) || n.node < 0)) err(file, `"node" must be an integer >= 0`);
  if ('slug' in n && !(typeof n.slug === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(n.slug) && n.slug.length <= 40)) {
    err(file, `"slug" must be lowercase kebab-case, max 40 chars`);
  }
  if ('name' in n && !(typeof n.name === 'string' && n.name.length >= 1 && n.name.length <= 40)) {
    err(file, `"name" must be a string, 1-40 chars`);
  }
  if ('url' in n && !httpsUrl(n.url)) err(file, `"url" must be a valid https:// URL`);
  if ('disciplines' in n) {
    const d = n.disciplines;
    if (!Array.isArray(d) || d.length < 1 || d.length > 3) err(file, `"disciplines" must list 1-3 entries`);
    else {
      for (const x of d) if (!DISCIPLINES.includes(x)) err(file, `unknown discipline "${x}" (canonical: ${DISCIPLINES.join(', ')})`);
      if (new Set(d).size !== d.length) err(file, `"disciplines" has duplicates`);
    }
  }
  if ('est' in n && !(typeof n.est === 'string' && /^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(n.est))) {
    err(file, `"est" must be "YYYY-MM-DD"`);
  }
  if ('status' in n && !['online', 'dark'].includes(n.status)) err(file, `"status" must be "online" or "dark"`);
  if ('founding' in n && typeof n.founding !== 'boolean') err(file, `"founding" must be a boolean`);
  for (const k of ['button', 'feed']) if (k in n && !httpsUrl(n[k])) err(file, `"${k}" must be a valid https:// URL`);
  if ('links' in n) {
    const L = n.links;
    if (!Array.isArray(L) || L.length > 4) err(file, `"links" must be an array of at most 4 entries`);
    else L.forEach((x, i) => {
      if (!x || typeof x !== 'object' || Array.isArray(x)) return err(file, `"links[${i}]" must be an object {label, url}`);
      for (const k of Object.keys(x)) if (k !== 'label' && k !== 'url') err(file, `"links[${i}]" unknown field "${k}"`);
      if (!(typeof x.label === 'string' && x.label.length >= 1 && x.label.length <= 32)) err(file, `"links[${i}].label" must be a string, 1-32 chars`);
      if (!httpsUrl(x.url)) err(file, `"links[${i}].url" must be a valid https:// URL`);
    });
  }

  /* filename <-> manifest agreement */
  const m = file.match(/^(\d{3})-(.+)\.json$/);
  if (m && 'node' in n && Number(m[1]) !== n.node) err(file, `filename number ${m[1]} !== "node" ${n.node}`);
  if (m && 'slug' in n && m[2] !== n.slug) err(file, `filename slug "${m[2]}" !== "slug" "${n.slug}"`);

  /* registry-wide uniqueness — numbers are permanent, never reused */
  if (Number.isInteger(n.node)) {
    if (seen.node.has(n.node)) err(file, `node number ${n.node} already taken by ${seen.node.get(n.node)}`);
    seen.node.set(n.node, file);
  }
  if (typeof n.slug === 'string') {
    if (seen.slug.has(n.slug)) err(file, `slug "${n.slug}" already taken by ${seen.slug.get(n.slug)}`);
    seen.slug.set(n.slug, file);
  }
  if (httpsUrl(n.url)) {
    const host = new URL(n.url).host;
    if (seen.host.has(host)) err(file, `host "${host}" already registered by ${seen.host.get(host)}`);
    seen.host.set(host, file);
  }
}

if (!files.length) {
  console.log('NODES // none found — nothing to validate');
} else if (errors.length) {
  console.error(`NODES // ${files.length} manifest(s), ${errors.length} problem(s):\n${errors.join('\n')}`);
  process.exit(1);
} else {
  console.log(`NODES // ${files.length} manifest(s) valid — ring integrity holds`);
}

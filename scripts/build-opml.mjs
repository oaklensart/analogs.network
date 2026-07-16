#!/usr/bin/env node
/**
 * ANALOGS.NETWORK — OPML compile (zero-dep)
 *
 * Every online node with a registered feed becomes one <outline>:
 * subscribe to the entire ring in a single import. This is the
 * quiet counterpart of the visualization — the ring as something
 * your feed reader can hold. Runs in CI next to build-manifest.mjs
 * and commits /analogs.opml.
 *
 * All registry strings are XML-escaped: node files arrive by PR and
 * are untrusted until a human merges them — and even then, escape.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NODES_DIR = join(ROOT, 'nodes');
const OUT = join(ROOT, 'analogs.opml');

const esc = s => String(s).replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const files = readdirSync(NODES_DIR).filter(f => /^\d{3}-.+\.json$/.test(f)).sort();
const nodes = files.map(f => JSON.parse(readFileSync(join(NODES_DIR, f), 'utf8')));

const feeds = nodes
  .filter(n => n.status === 'online' && typeof n.feed === 'string' && n.feed.startsWith('https://'))
  .sort((a, b) => a.node - b.node);

/* no timestamp in the head — output is a pure function of the registry,
   so recompiles of an unchanged ring produce a clean git diff */
const lines = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<opml version="2.0">',
  '  <head>',
  '    <title>ANALOGS.NETWORK — every node with a signal</title>',
  '    <ownerName>analogs.network</ownerName>',
  '    <docs>https://analogs.network</docs>',
  '  </head>',
  '  <body>',
  '    <outline text="ANALOGS.NETWORK">',
  ...feeds.map(n =>
    `      <outline type="rss" text="${esc(n.name)}" title="${esc(n.name)}" xmlUrl="${esc(n.feed)}" htmlUrl="${esc(n.url)}"/>`),
  '    </outline>',
  '  </body>',
  '</opml>',
  ''
];

writeFileSync(OUT, lines.join('\n'));
console.log(`analogs.opml — ${feeds.length} feed(s) of ${nodes.length} node(s)`);

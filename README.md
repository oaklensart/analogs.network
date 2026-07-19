# ANALOGS.NETWORK

> **SYS // PRE-INIT**

A global network of creatives who run their own corner of the web — a modern webring.

This repository is the open-source node registry and core infrastructure for the network: `nodes/*.json` is the permanent record, CI validates and compiles it into the `manifest.json` the ring reads, and the site itself is one dependency-free page.

## Audio Attribution

Ambient loop: ["Ominous and Deep Ambience"](https://freesound.org/s/467026/) by Resaural — Creative Commons 0 (no attribution required; credited anyway). Transcoded to Ogg/Opus and AAC for web delivery.

## Live Status

**The Ring is live** at [analogs.network](https://analogs.network/) — the full network interface: every seat rendered, members lit in discipline color, search, index, and drift. Merging a node PR lights its socket within minutes.

## Roadmap

- ~~**Node Manifests**: Open PRs for creatives to register their nodes (`nodes/*.json`).~~ Live.
- ~~**Validation CI**: Automated JSON-schema validation for node intake.~~ Live.
- ~~**The Ring**: the live network interface — discipline filters, search, and drift.~~ Live.
- **Accessible Intake**: GitHub issue forms to automate node PRs for non-developers.

## Join the Network

The founding hundred seats are open, and joining is free — always. Two doors, same ring:

- **One email**: send your site's address to `themonitor@analogs.network` with the subject `add me` (the site's ADD YOUR SITE button pre-fills everything).
- **One PR**: add `nodes/{NNN}-{slug}.json` (see [`nodes/README.md`](nodes/README.md) for the schema and the permanence rules). The PR is the consent record; merge is the moderation gate.

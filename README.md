# ANALOGS.NETWORK — pre-init placeholder

> Staged in `docs/` (assetsignored — never served on oaklens.art). These files
> are the seed of the future **`oaklensart/analogs-network`** repo. Copy them to
> that repo's root and deploy; nothing here depends on this codebase.

A global network of creatives who run their own corner of the web — a 2026
webring. This placeholder holds the domain while the node schema, PR intake,
and terminal map UI are built.

## Contents

| File | Purpose |
|------|---------|
| `index.html` | The whole site: one page, zero dependencies, no build step. OLED black / signal red / paper white. CSS-only rotating wireframe globe, orbiting OAKLENS.ART callsign, `AWAITING NODES` message linking to os.oaklens.art. Film grain, vignette, and specular glass details. One small inline script drives the ambient piano loop (auto-play at 75 % volume with a slow fade-in, HUD toggle, choice remembered in `localStorage`); the page degrades to fully static without JS. Mobile-safe (safe-area insets, `prefers-reduced-motion` honored). |
| `favicon.svg` | Node motif — red beacon in a wire ring on black. |
| `_headers` | Cloudflare Pages security headers. CSP allows only inline styles/script, self-served media, and self/data images — no external surface. |
| `assets/audio/` | Ambient loop, two encodes of the same source: `piano-loop.ogg` (Opus, Chrome/Firefox) and `piano-loop.m4a` (AAC, Safari/iOS). |

## Audio attribution

"piano loop 0Y83" by **Setuniman** — <https://freesound.org/s/180249/> —
License: [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/).
Changes: transcoded to Ogg/Opus and AAC for web delivery. Attribution is also
shown on-page (bottom-center credit link) and in an HTML comment beside the
`<audio>` element.

## Day-one deploy (once the domain is registered)

1. Register `analogs.network` (Porkbun, WHOIS privacy on; note the renewal price, not just year one).
2. Add the domain to Cloudflare (Free plan) → point Porkbun's nameservers at the two Cloudflare gives you.
3. Create `oaklensart/analogs-network` (public), push these files to its root.
4. Cloudflare Pages → connect the repo → no build command, output directory `/` → deploy.
5. Pages project → Custom domains → add `analogs.network` (and `www.analogs.network`, which Pages redirects to the apex).
6. Optional hygiene: Cloudflare Email Routing for a `hello@` forward, plus null SPF (`v=spf1 -all`) and a `p=reject` DMARC record since the domain sends no mail.

## Later (not day one)

- `nodes/*.json` — one file per member (single-array manifests conflict on every PR).
- JSON-schema CI validation on PRs; merge = accepted.
- GitHub issue-form intake for non-git creatives → Action converts to a PR.
- Merge Action compiles `nodes/*.json` → `network.json`; the map page fetches it.
- The full terminal map UI (discipline filters, coarse-region dots).
- Only after it's live and crawlable: consider the oaklens.art entity-graph link (`sameAs` discipline — manual §2.3).

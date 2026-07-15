# NODES // THE REGISTRY

Every file in this directory is one creative's seat on the ring.
The registry is the network: versioned, public, reviewable — a webring
whose member list is a git history.

> **STATUS: PRE-INIT.** The schema is live; PR intake is not open yet.
> Watch the repository — when the ring lights up, this is where you join.

## Joining (when intake opens)

One pull request. That's the whole bar.

1. Copy `000-oaklens-art.json` as a template.
2. Name your file `{NNN}-{your-slug}.json`, where `NNN` is the next free
   number (maintainers confirm it at merge — join order IS ring order).
3. Fill in the core metadata (see `node.schema.json` for the contract):

   | Field | What it is |
   |-------|------------|
   | `node` | Your permanent ring number. Assigned at merge, never reused. |
   | `slug` | Stable lowercase id. Matches the filename. |
   | `name` | Display name, as it should read on the ring. |
   | `url` | Your own corner of the web. HTTPS only. |
   | `disciplines` | 1–3 from the canonical list; the first sets your light color. |
   | `est` | `YYYY-MM-DD` you joined (cards display `YYYY.MM`; `DAY n` counts from it). |
   | `status` | `online`. (`dark` is maintainer-set — see below.) |
   | `button` | *(optional)* your 88x31 button, for other nodes to display. |
   | `feed` | *(optional)* RSS/Atom — reserved for a future fresh-signal indicator. |

4. Open the PR. CI validates the manifest; a maintainer merges; your
   socket lights up.

No server requirements, no code to install, no uptime contract. If you
want to return the handshake, display the ring's 88x31 button
(`https://analogs.network/assets/buttons/analogs-network.svg`) linking
back to `https://analogs.network` — appreciated, not required.

## Permanence

Node numbers are **positional and permanent**. A node that goes offline
is never deleted from the registry — its manifest flips to
`status: "dark"` and its socket goes inert on the ring, number retained.
The network remembers. Counts stay honest, citations stay valid, and no
one ever inherits a dead node's number.

## Disciplines (canonical)

`Photography` · `Digital Art` · `Writing` · `Code` · `Music` · `Design` · `Architecture`

These map 1:1 to the ring's light palette. Propose a new discipline via
issue, not PR — palette changes are a design decision.

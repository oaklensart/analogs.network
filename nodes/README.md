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
   | `feed` | *(optional)* RSS/Atom. Goes into `/analogs.opml` — one import subscribes a reader to the whole ring — and will power the fresh-signal indicator. Worth adding. |

4. Open the PR. CI validates the manifest; a maintainer merges; your
   socket lights up.

No server requirements, no code to install, no uptime contract. If you
want to return the handshake, display the ring's 88x31 button
(`https://analogs.network/assets/buttons/analogs-network.svg`) linking
back to `https://analogs.network` — appreciated, not required.

## Verification (optional — but here's why you'd want it)

Joining never requires it: a maintainer verifies your PR by hand and
merges. If you want the extra layer, serve one plain-text file at:

```
https://your-site/.well-known/analogs.txt
```

containing a single line with your seat on the ring:

```
analogs.network//node-007//your-slug
```

What the token buys you:

- **Self-service.** Proving control of the domain IS proving you're the
  member — future listing changes and removal work without email
  round-trips, no accounts, no stored contact info.
- **Squat protection.** Domains lapse. If yours ever expires and a
  stranger picks it up, the missing token lets the sweep dim your
  listing automatically — the ring stops vouching for whoever bought
  your old address, and your number stays yours (numbers are permanent
  either way).

The token contains nothing secret — it's a claim, not a key. Remove it
any time; removal simply returns you to manual-verification handling.

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

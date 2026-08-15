# Aragocor Minerals — AI sourcing desk

A self-contained mineral intelligence and lead-capture app for **aragocorminerals.com**.
No build step, no framework, no server code. Plain HTML, CSS and ES5 JavaScript.

---

## Run it

Double-click `index.html`, or serve the folder:

```bash
cd aragocor-ai
python3 -m http.server 8080
# → http://localhost:8080
```

A server is only needed if you want the embed widget to load in an iframe;
the app itself works straight off the filesystem.

---

## What's in it

| File | Does |
| --- | --- |
| `index.html` | The shell: masthead, rail, six panels, RFQ modal |
| `css/styles.css` | The whole visual system |
| `js/storage.js` | Persistence, with an in-memory fallback if the browser blocks storage |
| `js/catalog.js` | Nine minerals with assays, grades, sizes, packing — plus the specimen cards |
| `js/calculator.js` | Container / bag / desiccant math, transit matrix, stowage diagram |
| `js/api.js` | Both engines: Gemini live, and the offline mineral knowledge base |
| `js/rfq.js` | Quotation requests, tracking IDs, the structured email handoff |
| `js/widget.js` | Widget preview mode and the embed snippet |
| `js/app.js` | Wiring: tabs, thread, markdown, speech, files, backup |
| `embed/aragocor-widget.js` | The one-tag loader for the live website |
| `netlify-rfq.html` | Hidden form so Netlify registers the RFQ fields at deploy |

---

## The two engines

**Offline** is the default and needs no key or network. It answers on assays,
grades, sieve and micron conversion, packing, container counts, cargo care and
Incoterms, straight out of `catalog.js`.

**Live** calls Google Gemini. Open **Settings → Intelligence engine**, paste a key
from [aistudio.google.com](https://aistudio.google.com/apikey), press **Test key**,
switch the radio to Live. The key is held in this browser only and is deliberately
excluded from backup files. If a live call fails, the answer falls back to the
offline engine rather than erroring out.

The catalog is injected into the model's system instruction, so live answers stay
inside your published spec ranges instead of inventing figures.

---

## Put it on the website

1. Upload this folder to your host, e.g. `https://aragocorminerals.com/ai/`.
2. Copy the snippet from the **Embed** tab and paste it before `</body>` on every page:

```html
<script src="https://aragocorminerals.com/ai/embed/aragocor-widget.js"
        data-host="https://aragocorminerals.com/ai/"
        data-accent="#5c3d91"
        data-label="Ask about minerals" defer></script>
```

The loader builds its bubble and panel inside a shadow root, so it cannot inherit
or break the site's CSS. Options: `data-side="left"`, `data-accent`, `data-label`.

---

## Changing the data

Everything a buyer sees comes from two objects.

- **Add a mineral** — push an entry onto `MINERALS` in `js/catalog.js`. Give it a
  `habit` (one of the six in `HABITS`), a `streak` colour, a three-item `strip` for
  the card, the `assay` rows, and a `density` (bulk, t/m³) so the freight cube is right.
  It appears in the catalog, both dropdowns, the RFQ form and the AI's context
  with no other edits.
- **Change stowage assumptions** — `PACKS` in `catalog.js` holds bags per box;
  `BOX` in `calculator.js` holds payload, cube and tare.
- **Change routes** — `LOAD_PORTS`, `DEST_PORTS` and `TRANSIT` in `calculator.js`.
  Transit figures are planning estimates, not schedules; replace them with your
  forwarder's numbers before quoting them to a customer.

---

## Notes on the numbers

- Assays are typical commercial production ranges. Every shipment still ships
  against its own COA.
- Freight figures assume a 20′ GP at 27 MT practical payload and 30 m³ usable
  cube, and cap each box at whichever of weight or volume runs out first.
- Transit is port-to-port sailing time, direct or one transhipment. It excludes
  inland haulage, customs and terminal dwell.
- Lead capture is configured in **Settings → Lead capture** (see below).

---

## Lead capture

**Settings → Lead capture** decides where a request goes the moment it is raised.

| Mode | What happens | Set up |
| --- | --- | --- |
| Email handoff | Opens the buyer's mail client with a filled draft | Nothing — but the buyer has to press send |
| POST as JSON | `fetch` POST of the request as JSON | Paste a Formspree / Getform / own endpoint URL |
| Netlify Forms | Form-encoded POST to the site root | Deploy `netlify-rfq.html`, set the endpoint to `/` |

The order in `save()` matters and is deliberate:

1. Write the request to local storage, with a tracking ID and `status: pending`.
2. POST it to the endpoint.
3. Mark it `sent` or `failed` and show that on the request card.

Because step 1 happens first, a dead network or a closed tab cannot lose a lead.
Anything still `pending` or `failed` is retried automatically on the next load,
up to five attempts, and a **Send again** button appears on any request that
did not get through. Failed requests show what the endpoint actually said.

**Formspree** — create a form, copy the `https://formspree.io/f/xxxxxxxx` URL,
choose *POST as JSON*, press **Send a test request**. `RFQ-AGM-TEST01` should
appear in the Formspree dashboard within seconds.

**Netlify** — deploy `netlify-rfq.html` with the site (it is a hidden form that
exists only so Netlify registers the field list), choose *Netlify Forms*, set the
endpoint to `/`. Requests arrive under **Forms → aragocor-rfq**; add a
notification there so they reach the sales inbox.

**Your own handler** — choose *POST as JSON* and point it anywhere that accepts
a JSON body. The shape is whatever `RFQ.payload()` returns:
`trackingId, raisedAt, source, page, name, company, email, phone, mineral,
grade, volumeMT, particleSize, packing, incoterm, destinationPort, notes`.
It must send CORS headers allowing the site's origin, or the browser blocks the
post and the request lands in the retry queue.

Whichever mode is on, **Open email** stays on every request card, so the desk can
still hand a request to a mail client by choice rather than by necessity.

---

## Browser support

Chrome, Edge, Safari, Firefox. Dictation uses the Web Speech API, which only
Chrome and Edge implement — the button explains itself elsewhere. Reading aloud
works everywhere.

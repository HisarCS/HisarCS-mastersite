<!--
  Worked example for docs/research-publishing-framework.md — the full source of
  a research page in the site's Markdown dialect. Fictional data. Paste the
  body below into the editor's Write tab to see it rendered; image paths are
  placeholders for files uploaded under the entry's Files panel.
-->

```stats
€4.10 | per panel
14 | days grow time
α 0.68 | @ 2 kHz
85% | waste-derived
```

Can sound-absorbing panels grown from **mycelium** and coffee waste match
store-bought acoustic foam — at a quarter of the price? We grew, dried, and
measured nine panels to find out. Per band, absorption follows
$\alpha = 1 - 10^{-L/10}$.

![Batch C, panel 2, after drying and edge trim. The surface texture is the mycelium skin itself — no coating.](panel-final.jpg)

![Day 0 — substrate packed in the mold.](day0.jpg) ![Day 3 — hyphae reach the surface.](day3.jpg) ![Day 9 — mold in batch B; discarded.](day9.jpg) ![Day 14 — batch C demolded.](day14.jpg)

## What happened

Three batches of three panels. Batch A shrank 8% on drying — the substrate was
too wet. Batch B grew green mold by day 9; we traced it to an unsterilized
mixing tub and lost all three panels. Batch C, mixed in a bleach-cleaned tub
and kept at 22 °C in the dark, colonized fully in 14 days with no loss.

![The test rig, mid-sweep.](test-rig.jpg 'right 35')

Absorption was measured against an €18 store foam panel of the same size in
the same test box: a 250 Hz – 4 kHz sine sweep, recorded with the panel, the
empty box, and the foam reference; three sweeps per configuration, averaged:

$$\bar{\alpha} = \frac{1}{n}\sum_{i=1}^{n} \alpha_i$$

```chart
type: bar
question: Does it match foam above 1 kHz?
x: 250 Hz, 1 kHz, 2 kHz, 4 kHz
Panel: 0.31, 0.55, 0.68, 0.74
Foam: 0.42, 0.61, 0.72, 0.78
```

From 1 kHz upward the grown panels stay within 0.06 α of the foam. Below
500 Hz the foam wins — thickness, not material, is the limit.

## Recipe (per 40×40×4 cm panel)

| Component            | Share | Source                 |
| -------------------- | ----- | ---------------------- |
| Spent coffee grounds | 60%   | school cafeteria, free |
| Hemp hurd            | 25%   | garden supplier        |
| _P. ostreatus_ spawn | 12%   | grow shop              |
| Wheat flour          | 3%    | —                      |

Grow: 22 °C, dark, 60–70% RH · Dry: 70 °C, 6 h.

## Measurement protocol

1. Seal the panel into the test box; speaker at one end, measurement mic at the other.
2. Play a 250 Hz – 4 kHz sine sweep; record with the panel in place.
3. Repeat with the empty box, then with the foam reference.
4. Compute absorption as the level difference vs. the empty box, per band.
5. Three sweeps per configuration; report the mean.

> It sounds like the room got smaller — in a good way.
> — classmate, first listening test in the music room

[Grow & test protocol (PDF)](https://example.com/protocol.pdf) ·
[Measurement data (CSV)](https://example.com/data.csv) ·
[14-day growth time-lapse](https://example.com/timelapse)

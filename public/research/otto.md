**A parametric design tool that doesn't make you pick a language.**

Otto is a free, open-source 2D CAD environment built for laser cutting, where visual programming blocks, text-based parametric code, and direct canvas editing all drive the same underlying model — synced live, in both directions. Change your mind about how you want to work mid-design, and nothing gets lost in translation.

```stats
3 | editing modes
35+ | shape primitives
SVG / DXF export
Open source
```

![A parametric construction kit defined in `params` and `shapes` (left), edited live on canvas (center), and laser-cut and assembled (right).](/research/otto/01-a-parametric-construction-kit-de-w2400.jpg)

## The idea — One model, three ways in

Parametric CAD is powerful — change one number and a whole design updates consistently, joints and all. But most parametric tools assume you already think in code, which is exactly the barrier that keeps them out of K-12 classrooms and casual FabLab use. Traditional CAD instruction doesn't help: it teaches commands to memorize, not the parameter-and-constraint relationships that actually make a design parametric, and that costs engagement long before it costs capability.

Otto's answer is to stop picking a single interface and hoping everyone adapts to it. **Write parametric definitions as text. Snap them together as visual programming blocks. Or drag shapes directly on a canvas.** All three read and write the same model, live.

> **> Every edit updates the same AST** — a typed parameter, a dragged block, a moved anchor. Switch modes mid-design and the model doesn't reset; it just keeps evaluating.

## Three ways in — Type it. Snap it. Drag it.

The same parametric language, exposed through three interaction modalities that stay in sync — because different students (and different edits) call for different modes.

```cards
# 01 — Text | Type the parameters
Write shapes, params, and constraints directly. A lexer tokenizes the source, an AST parser builds the model, and a topological evaluator resolves dependent shapes in the right order — no separate compile step.
> param tabLenth 30
> shape polygon hex {
>   radius: polyRadius
>   sides: 6
> }

# 02 — Blocks | Snap together logic
The same language as draggable visual programming blocks — Turtle, Shapes, Parameters, Boolean, Math, Text, Lists. Built for the students who found text-mode loop syntax hard to hold onto, but visibly thrived once they could see the structure.
> [ shape rectangle ]
>   ⌙ [ position 100,100 ]
>   ⌙ [ width 60 ] [ height 60 ]

# 03 — Canvas | Drag it into place
Direct manipulation with a live Parameters and Constraints panel — coincidence, distance, horizontal/vertical alignment — solved continuously with a Levenberg–Marquardt solver, so a dragged edge doesn't quietly break the rest of the design.
> Coincident → rectangle1.center = rectangle1.center
> Apply Distance → 100
```

## System design — What's actually running

Otto is a JavaScript-based interpreter, not a wrapper around an existing CAD kernel — built so text, blocks, and canvas all reach the same evaluation path.

|                 |                                                                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PIPELINE**    | Lexer → tokenizer → AST parser → **topological evaluator**, so dependent shapes update in dependency order regardless of which mode made the edit. |
| **PRIMITIVES**  | **35+ shapes** (circles, polygons) plus the 2D joints laser-cut assembly actually depends on — finger, cross-lap, and dovetail joints.             |
| **BOOLEANS**    | Union, difference, and intersection, implemented with the **Vatti clipping algorithm** and exposed as compositional blocks.                        |
| **CONSTRAINTS** | Geometric consistency held live with a **Levenberg–Marquardt solver** as parameters or dragged anchors change.                                     |
| **EXPORT**      | Finished designs export straight to **SVG or DXF** — ready for the laser cutter, no intermediate translation step.                                 |
| **LICENSE**     | Open-source and modular by design, so the shape and constraint vocabulary is meant to be extended, not fixed.                                      |

![The same union of two rectangles and two circles, held open in every mode at once: text, blocks, live parameters, constraints.](/research/otto/02-the-same-union-of-two-rectangles-w2400.jpg)

## The pilot — Ten FabLab students, fifteen minutes of intro

A small trial with FabLab students of varying CAD background — most had little to none, one was already comfortable with parametric CAD.

```tiles
10 | Students
15–20m | Intro before building
1 | Already fluent in parametric CAD
10 / 10 | Left with a fabrication-ready model
```

```findings
# Live feedback made the abstract legible
The Constraints and Parameters menus did the most work — seeing a relationship update immediately turned "trust the math" into something students could just watch happen.

# note | The right modality is per-student, not universal
Some students found textual loop syntax difficult to reason about, then thrived immediately after switching to block-based programming — the clearest evidence yet that offering all three modes isn't redundant.

# issue | Canvas responsiveness was the rough edge
Participants noticed lag during quick, successive edits on the canvas — the main friction point surfaced by the trial, and the clearest next thing to fix.
```

## What they built — Ten students, one afternoon

Designs made in Otto and cut on the FabLab's carbon laser cutter — participant work from the pilot trial.

![Acrylic · arrow / fob form](/research/otto/03-acrylic-arrow-fob-form-w2400.jpg)
![Plywood · jointed figure](/research/otto/04-plywood-jointed-figure-w2400.jpg)
![Acrylic · interlocking tiles](/research/otto/05-acrylic-interlocking-tiles-w2400.jpg)

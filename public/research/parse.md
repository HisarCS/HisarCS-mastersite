**Teaching how AI learns to find an answer — with plywood, marbles, and no screen at all.**

Three tangible, unplugged modules let middle schoolers physically work through the mechanisms behind machine learning: exploring a search space blind, narrowing it through constraints, and building a model from noisy, accumulated feedback.

```stats
120 | students
Grades 5–8
3 | mechanisms
0 | screens
```

![Left to right: Module 1 (random search), Module 2 (iterative refinement), Module 3 (strategic inference).](/research/parse/01-left-to-right-module-1-random-se-w2400.jpg)

## The idea — What Parse actually is

Most AI education for kids happens behind glass: drag a slider, watch a model train, take the result on faith. **Parse strips that away.** It's three laser-cut puzzle-boxes — no batteries, no code — where the thing you're searching for by hand is functionally the same thing a simple classifier searches for internally: a configuration that works, found by generating candidates, testing them against reality, and using what you learn to inform the next attempt.

Digital AI curricula for this age group lean almost entirely on **supervised learning** — label data, train a model, watch it predict. The feedback-driven processes underneath — blind search, constraint narrowing, inference from noisy observation — rarely get a hands-on treatment, digital or otherwise. Parse was built to fill exactly that gap, one mechanism per module.

> **Each box isolates one mechanism** most AI curricula skip over: how a model explores a space of candidates with no signal to guide it, how solving part of a problem narrows what's left, and how a model gets built from evidence that only becomes meaningful once you've accumulated enough of it.

## The modules — Three boxes, three mechanisms

Every module is a single physical puzzle with one solution. What differs is the kind of feedback you get while looking for it — and that difference is the whole lesson.

```cards
# Module 1 · Random Search | No signal, no shortcuts
Teaches: how one generation of candidate models gets built Two eight-position wheels lock into place; drop a marble in and it either finds a path through or it doesn't. Seven of eight positions on each wheel are walled off — only 1 of 64 combinations opens a path, and nothing tells you when you're close. With no proximity signal, the only way through is exhaustive, systematic search: the same brute-force logic behind generating and screening a batch of random candidates. 2 WHEELS · 8 POSITIONS EACH · 1 / 64 OPENS Redesigned from a single rotating drum — see "From drawing board to classroom" below.

# Module 2 · Iterative Refinement | One solved piece changes the rest
Teaches: why building across generations beats building once Three uniquely shaped "tubes" sit hidden inside a case, only their notches showing. Try a shape-matched "disk" against one at a time — a correct match seats fully and clicks. Finding one tube doesn't just score a point: it removes that shape from contention for every match after it, so each solved piece makes the rest easier. This is constraint propagation and version-space narrowing, felt by hand. 6 TUBES · 3 LOADED PER ROUND · 1 MATCHING DISK EACH

# Module 3 · Strategic Inference | Proving it isn't just luck
Teaches: inference from accumulated, noisy feedback Sliding keys hide a grid of holes; marbles are dropped in blind, then the keys are drawn back just enough to reveal where a few landed. Play solo — recall enough hidden coordinates to picture the whole board — or in groups, calling out coordinates for points. Guess at random and it drags on. Track which coordinates have already turned up something, and the board resolves fast. 7 KEYS · 3 BALLS PER ROUND · SOLO OR GROUP SCORING
```

![Two teal laser-cut wheels, each with eight notched positions, mounted on a plywood base.](/research/parse/02-two-teal-laser-cut-wheels-each-w-w2400.jpg)
![Loose laser-cut disks and cylindrical tube pieces in pink and pale blue next to a wooden case with three round holes.](/research/parse/03-loose-laser-cut-disks-and-cylind-w2400.jpg)
![A wooden box with seven sliding keys revealing a grid of holes, some containing small colored marbles.](/research/parse/04-a-wooden-box-with-seven-sliding--w2400.jpg)

## Five workshop cohorts — From drawing board to classroom

Parse was rebuilt between each of five sequential cohorts based on what the room actually did with it. Module 1 changed the most.

The first version of Module 1 hid a marble inside a rotating 12-hole drum: line up a hole with the case opening, press a button, and a spring-loaded pin tried to eject the ball. It broke often under repeated pressing, and worse — it resolved too quickly for students to ever settle into a deliberate search strategy. Both problems pointed the same direction, so the module was rebuilt around a slower, two-stage interaction: two wheels that had to be independently locked before a single attempt was even possible.

![Before · Single rotating drum, 12 positions, spring-pin ejector. Mechanically fragile, and solved in seconds.](/research/parse/05-before-single-rotating-drum-12-p-w2400.jpg)
![After · Two independent wheels, 64 combinations, two-stage lock-in. Forces a real search strategy to emerge.](/research/parse/06-after-two-independent-wheels-64--w2400.jpg)

> "We haven't tried all of these yet."
>
> — a student, switching the group from spinning both wheels randomly to fixing one and rotating the other systematically

Modules 2 and 3 stayed structurally stable across cohorts. The lesson that outlasted the redesign: **how long an interaction sustains engagement before resolving may matter as much as what it's teaching** — resolve too fast, and no strategy ever gets the chance to form.

## The pilot — Putting it in front of 120 students

Five workshops, run across existing class groups, each following the same 80-minute structure: a brief intro, all three modules in sequence, then a survey — no computers, no internet, no prior AI experience required.

```tiles
120 | Students
5 | Workshop cohorts
5–8 | Grades (ages 10–14)
80m | Session length
2–3 | Students per group
```

Self-reported familiarity, before → after

```chart
type: bar
question: Every module moved the needle. Not equally.
x: Module 1, Module 2, Module 3
Pre-workshop: 2.0, 2.0, 2.0
Post-workshop: 4.0, 3.5, 3.0
```

5-point Likert scale, self-reported. Module 1's immediate, unambiguous pass/fail feedback produced the largest jump and the fastest shift to systematic strategy; Module 3's delayed, aggregated feedback proved hardest to internalize — its transfer-question accuracy followed the same gradient, with Module 1 alone reaching 82%.

| Module                          | Pre | Post | Δ    |
| ------------------------------- | --- | ---- | ---- |
| Module 1 — Random Search        | 2.0 | 4.0  | +2.0 |
| Module 2 — Iterative Refinement | 2.0 | 3.5  | +1.5 |
| Module 3 — Strategic Inference  | 2.0 | 3.0  | +1.0 |

## Findings — What held up, and what didn't

```findings
# Timing is as pedagogical as the mechanism itself
An interaction that resolves too fast never gives a strategy the chance to form — the exact problem that forced Module 1's redesign.

# note | Immediate feedback wins, reliably
Module 2's audible click on a correct match produced the most consistent engagement of the three — no ambiguity about whether progress was made.

# Delayed feedback stayed hard, in every cohort
Module 3 produced the smallest gains and the most divergent play. Some students tracked coordinates early; most defaulted to guessing throughout — this may be a boundary condition of the concept itself, not a solvable design problem.

# issue | Read the results with the sample in mind
Single private school, a convenience sample; cohorts played slightly different module versions as the design evolved; all measures are self-reported. Directional, not conclusive.
```

![Groups of two to three worked through all three modules in sequence — 80 minutes, no digital device in sight.](/research/parse/07-groups-of-two-to-three-worked-th-w2400.jpg)

**Parametric CAD, taught the way a rocket gets built — one parameter at a time.**

Parametrix is a web platform that introduces K-12 students to parametric design. Type what you want in plain language, watch a fine-tuned language model turn it into real geometry, and export straight to 3D printing or laser cutting.

```stats
9 | guided tutorials
2D & 3D workspaces
STL / DXF export
LLM-driven
```

!["Create a circle with a radius of 5..." → a printed rocket.](/research/parametrix/01-create-a-circle-with-a-radius-of-w2400.jpg)

## The idea — Teach parametric thinking as a sentence, not a syntax

Parametric CAD is powerful — change one number, and a whole design updates consistently. But nearly every tool built around it assumes fluency in commands or code already, which is exactly the barrier that keeps it out of K-12 classrooms and out of reach for beginners in digital fabrication.

Parametrix's answer: **let students describe geometry in plain language.** A student types "create a circle with a radius of 5 on XYConstructionPlane at (0,0,2)," and a language model fine-tuned specifically for this task — flan-t5, trained on the team's own custom prompts — parses that sentence into real, editable parametric geometry, live, in a split-screen construction environment.

> Every tutorial pairs a plain-language instruction booklet with a live construction view — text on one side, geometry on the other — so the connection between a sentence and a shape is never abstract.

## How it works — Learn it, prompt it, print it

The team's own workflow diagram color-codes every step by which of three stages it belongs to — the same three stages the platform is built around.

```cards
# L — Learning | Follow the booklet
Nine tutorials, from a simple cube to a full space rocket. Each is broken into plain-language steps that introduce one new parametric concept before asking the student to try it themselves. *9 TUTORIALS · CUBE → ROCKET.*

# P — Programming | Prompt the model
Type what you want in plain English. A fine-tuned language model parses intent into structured parametric data, extruded live in the construction environment via a JSON editor. *FLAN-T5, FINE-TUNED IN-HOUSE.*

# M — 3D Printing | Send it to the machine
Export as STL for 3D printing or DXF for laser cutting. Slice in a tool like Bambu Studio, and watch a typed sentence become a physical part. *STL · DXF EXPORT.*
```

![The nine-step Parametrix workflow — red for learning, blue for programming, gold for 3D printing.](/research/parametrix/02-the-nine-step-parametrix-workflo-w2400.jpg)

## System design — Two interfaces, one parametric core

#### Tutorial interface

The starting point for beginners — a split-screen environment pairing a step-by-step instruction booklet with a live construction view, walking students through all nine guided designs.

#### Playground interface

Once a student knows the vocabulary, the playground offers free-form prototyping in either a 2D or 3D workspace — no booklet, just the prompt and the model.

![From prompt to printed part: home screen → tutorial view → prompting space → JSON editor → STL export → slicer → finished print.](/research/parametrix/03-from-prompt-to-printed-part-home-w2400.jpg)

## Where it's headed — What's next

```findings
# AI-driven personalization
The team's next step is a generative model that responds to a full design brief — "a rocket body with a 100-unit cylinder and cone nose, plus 4 fins" — with a sequential framework that guides a student through the build, rather than handing over the finished design outright.

# note | Classroom testing, planned
Real classroom trials are planned next, in middle-level K-12 classrooms spanning computer science, physical computing, AI, and engineering-themed courses.

# Not a CAD replacement
Parametrix is positioned explicitly as a quick-prototyping and education tool — a way in to parametric thinking, not a substitute for professional CAD software.
```

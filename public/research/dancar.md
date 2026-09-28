**A private dance instructor, rebuilt as an AR feedback loop.**

DancÆR is an augmented-reality iOS app that teaches dance choreography with the kind of continuous, corrective feedback a private instructor gives — built on real-time pose tracking and a neural network trained to tell a good move from a bad one.

```stats
MoveNet + custom NN
95.8% | train accuracy
Swift / iOS
n=200 | planned study
```

![The team's own interface concept — home, song and mode selection, live AR tracking, and a per-move scoring screen.](/research/dancar/01-the-team-s-own-interface-concept-w2400.jpg)

## The idea — Dance apps rarely tell you what you did wrong

Dance carries real physical and psychological benefits for adolescents — fitness, sleep, motor skills, confidence — on top of being one of the oldest tools humans have for social bonding. But learning it well depends on feedback, and most self-directed dance tools don't really give any. **Just Dance** and similar games have you imitate an on-screen teacher with no correction; instructional videos are one-directional by nature.

DancÆR's proposal: build an AI system that behaves the way an actual dance instructor would — tracking a student's position and timing against a professional reference, gradually ramping difficulty, and pointing out exactly where a move goes wrong.

> DancÆR "essentially imitates private instruction through an intelligent system that combines summative and formative feedback" — gradually teaching a choreography while correcting mistakes as they happen.

## How a session works — From a chosen song to a scored performance

```cards
# 1 | Pick a routine
Choreographies are sourced from dance video databases and broken into step-by-step movements through rhythm-based segmentation of the backing track.

# 2 | Learn it slow
An AR instructor demonstrates each movement to a metronome count, starting well under the song's real tempo.

# 3 | Get corrected live
As the student mimics the instructor, the app compares their movement to the reference and projects the correct positioning as a low-opacity "movement marker" avatar to fill in.

# 4 | Speed up gradually
Tempo increases step by step until the choreography is danced at the song's original speed — with the instructor noting exactly where a student keeps struggling.

# 5 | Score, reflect, remix
A final scored performance (gamified points, shareable, with a 2D-avatar anonymity option), followed by self-evaluation notes — a student can even remix the choreography and upload it as their own alternative version.
```

![The system's own flow diagram, from device input through AR instruction to movement comparison.](/research/dancar/02-the-system-s-own-flow-diagram-fr-w2400.jpg)

## Under the hood — Scoring a dancer against a reference

Built for iOS in Swift, using the TensorFlow Lite MoveNet pose-estimation model — light enough for mobile, and able to track 17 joints — paired with the team's own neural network for pose classification.

|                    |                                                                                                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PIPELINE**       | Camera frame → MoveNet joint extraction (17 points) → a sequential dense-layer network predicts **pose class**, run every frame.                                                        |
| **POSITION SCORE** | Compares the student's joint position and angle ratios against a professional reference video, following an affine-transformation approach adapted from prior pose-evaluation research. |
| **TIMING SCORE**   | Compares the midpoint timing of the student's move against the reference video, extracted from 60fps footage against the track's actual beats-per-minute.                               |
| **FINAL SCORE**    | A weighted average of position and timing accuracy across the full sequence — the same balance a human instructor would judge by eye and ear.                                           |

## What's actually been trained — 95.8% training accuracy, from scratch

To validate the pose-classification approach, the team built its own dataset from professional and hobbyist dancers performing the choreography to "Gangnam Style" — chosen for being popular enough to source easily and simple enough (two distinct moves) to classify cleanly.

```tiles
95.8% | Train accuracy
93.5% | Validation accuracy
```

![A line chart titled 'Model accuracy' showing training accuracy in orange and validation accuracy in blue rising together from about 0.5 to roughly 0.95 over 50 training epochs.](/research/dancar/03-a-line-chart-titled-model-accura-w2400.jpg)

**10,000 training images, 1,000 test images, 50 epochs** — with images deliberately blurred and noise-injected to keep the model from overfitting to near-identical frames in the dataset.

## The planned study — Testing DancÆR against the alternatives

The next step is a controlled comparison: one group learns with DancÆR, and two control groups learn the same choreography without it.

```tiles
200 | Participants
3 | Groups (1 experimental, 2 control)
2 wks | Learning window
10 | Third-party dance-instructor judges
```

```findings
# Two control groups, two different questions
One control group learns from a non-interactive instructional video; the other gets private, in-person lessons. That lets the study show both whether DancÆR beats doing nothing special, *and* how close it gets to the quality of a real private instructor.

# note | Scored two ways, checked against each other
Performance is graded by the AI algorithm — trained on professional reference footage — and separately by 10 third-party dance instructors, letting the team correlate machine scoring against human judgment.

# Measuring the person, not just the dance
A pre-study questionnaire captures prior dance, sport, music, and art experience, while post-session ratings capture confidence, engagement, and enjoyment — separating actual skill transfer from who was already primed to do well.
```

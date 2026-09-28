**An AI companion that starts as a $122 tortoise — and keeps learning after the last screw goes in.**

TESTUDO is an affordable, open-source robotics kit built around a Raspberry Pi 4 and a locally-run language model. Students build a tortoise-shaped companion, then talk to it — and a custom AI model keeps adapting its behavior to that student long after assembly is done.

```stats
$122 / 4,650 TL | kit cost
2h 7m | print time
Raspberry Pi 4
Voice-driven
```

![Walking, talking, playing music, answering questions — the same kit, four modes.](/research/testudo/01-walking-talking-playing-music-an-w2400.jpg)

## The idea — A STEM kit that doesn't stop teaching at assembly

AI-driven STEM kits already exist — but most are priced out of reach for the classrooms that need them most, and nearly all of them are static: the learning experience is fixed the moment the last part clicks into place. TESTUDO was built to break both constraints. It costs roughly **$122 in parts**, and it's designed to keep going after assembly, not stop there.

Once a student builds their tortoise, a custom-trained AI model starts learning from every conversation — logging what the student asks, how they interact, where they struggle — and uses that to adjust TESTUDO's own development path over time.

> "Unlike traditional STEM kits that follow a fixed assembly process and become obsolete once completed, TESTUDO provides learning opportunities after the initial build."

## Three parts, one companion — What's actually inside the shell

```cards
# Hardware | Built to be built
FDM-printed in PLA — 2 hours 7 minutes per kit — and assembled with magnets and snap-fit joints so it stays easy to put together without sacrificing durability. Powered by a Raspberry Pi 4, a ReSpeaker 2-Mic Hat, and an Adafruit 16-channel PWM driver running 4 SG90 servos. *~$122 / 4,650 TL TOTAL.*

# Voice & AI | A model that's actually listening
Say "Testudo" to wake it. Real-time speech-to-text captures what follows, and a locally-hosted Wizard Vicuna language model — run through LMStudio in the ideaLab — combines NLP, prompt engineering, and context management to hold a real conversation. *WAKE WORD → STT → LOCAL LLM → TTS.*

# Personalization | Keeps evolving after assembly
Every interaction is logged to a per-student JSON profile. The model reads that profile back into each conversation, adjusting TESTUDO's development path and unlocking more advanced build guides as a student's skills grow. *USER DATA → ADAPTIVE GUIDES.*
```

## Under the hood — Say "Testudo," and it's listening

The full loop, from wake word to spoken response — including where movement commands like "go forward" branch off to run directly.

![Wake word → speech-to-text → local LLM (with user data + system prompt) → spoken response, with voice commands branching straight to movement scripts.](/research/testudo/02-wake-word-speech-to-text-local-l-w2400.jpg)

## In use — An eight-step relationship, not a single build

The team's own user-workflow diagram, from power-on to shutdown — including the example conversation starters they tested it with.

![Power on → connect to Wi-Fi → say "Testudo" → talk → shut down.](/research/testudo/03-power-on-connect-to-wi-fi-say-te-w2400.jpg)

**Example conversation starters**

- "Move forward"
- "What's the best way for beginners to start robotics?"
- "Why are jellyfish transparent?"
- "How do car engines work?"
- "How do waves happen?"

## Built for the classroom — Same kit, different depth

```findings
# Learning scales with the builder
Higher-level K-12 students integrate AI into the Raspberry Pi in a range of different ways; students with less experience focus on core software concepts — the same kit meets both where they are.

# note | 4 to 8 two-hour lectures to build
Full assembly time depends on the class's prior experience with CAD, 3D printing, and programming — built in as a discovery process, not a fixed script.

# Next: outside the lab
TESTUDO has been built and tested inside the ideaLab. The team's next step is testing it in an actual K-12 classroom environment.
```

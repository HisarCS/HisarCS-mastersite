**A robot dog that teaches kids to code by handing them the code blocks.**

Pomelo is a collaborative robot that teaches basic algorithmic thinking through physical, ArUco-marker code blocks, answers questions by voice through Google Assistant, and plays social games with a classroom — designed to be a classmate, not a screen.

```stats
Physical code blocks
Raspberry Pi 3
Voice + vision
HRI '19 Student Design Competition
```

![Testing Pomelo with a remote control, before handing over the physical code blocks.](/research/pomelo/01-testing-pomelo-with-a-remote-con-w2400.jpg)

## The idea — A classmate, not a screen

Kids are exposed to technology very young, but rarely taught to use it well — and the wrong kind of use quietly shifts technology's role in a classroom from educational to addictive. Pomelo's answer is to interact with children the way children interact with each other: not a supervisor, not a second teacher, but part of the group.

It also has a practical job. A typical elementary classroom here runs about **24 students to one teacher** — plenty of small questions go unanswered simply for lack of time. Pomelo takes the simple ones on, so the teacher can stay focused on the room.

> "Increasing the positive reinforcement through visual and audio outputs will increase the interest of younger users and create a more clear system of communication."

## Three design goals — Habits, capacity, and thinking

```cards
# Good habits | A peer, not an escape
Pomelo is built to induce self-driven, social learning motivation — technology that pulls kids toward each other instead of away, countering the passive, addictive pull of a normal screen.

# Classroom support | Answering what the teacher can't get to
With natural language processing built in, Pomelo answers the simpler questions students have mid-class — basic math, quick clarifications — while the teacher stays focused on the overall lesson.

# Algorithmic thinking | Code you can pick up and hand to a friend
Kids program Pomelo's movement with physical ArUco-marker code blocks. Teachers assign puzzles and mazes solved with the blocks — turning software logic into something a whole group can gather around.
```

## Under the hood — What makes it see, hear, and move

A Raspberry Pi 3 as the brain, a Pololu DRV8835 driving two rear motor wheels with a front caster, and a camera in Pomelo's mouth reading ArUco markers through OpenCV.

![RASPBERRY PI 3 · SPEAKER · WIRING](/research/pomelo/02-raspberry-pi-3-speaker-wiring-w2400.jpg)
![4.3″ LCD EYES, ANIMATED IN MAYA](/research/pomelo/03-4-3-lcd-eyes-animated-in-maya-w2400.jpg)
![ONE OF POMELO'S ARUCO CODE BLOCKS](/research/pomelo/04-one-of-pomelo-s-aruco-code-block-w2400.jpg)

The eyes react to input with different expressions; a Voice HAT board connects the Pi to Google Assistant so Pomelo can hold up its end of a conversation through the API — question, response, and all.

![The full behavior loop — face/emotion recognition, ArUco block reading, and hotword-triggered voice interaction, all running in parallel.](/research/pomelo/05-the-full-behavior-loop-face-emot-w2400.jpg)

## Evolution — From an exposed circuit board to a dog

![PROTOTYPE 1 — PLEXIGLASS BASE, ELECTRONICS EXPOSED](/research/pomelo/06-prototype-1-plexiglass-base-elec-w2400.jpg)
![THE 3D-PRINTED DOG SHELL, BUILT ON THE SAME BASE](/research/pomelo/07-the-3d-printed-dog-shell-built-o-w2400.jpg)

## Testing it on real kids — A second-grader and a sixth-grader

Both were first allowed to freely drive Pomelo with a remote control to get familiar with how it moves. Then the physical code blocks were introduced, and the remote was taken away.

```findings
# Different ages, different draws
The second-grader was captivated by Pomelo's eye movements and expressions, repeatedly pressing the button on its head. The sixth-grader was drawn straight to coding Pomelo's movement with the blocks.

# note | Peer modeling worked, unprompted
After watching the sixth-grader use the ArUco blocks, the second-grader got curious and wanted to try them too — without being told to. Nobody asked for that; it just happened.

# Reinforcement is the lever
The team's conclusion: stronger visual and audio positive reinforcement would pull in younger users faster, and physical code blocks measurably simplify algorithmic thinking for a younger age than screen-based coding tools.
```

## What's next — Beyond the first prototype

```findings
# Face and emotion recognition
Planned next: student-specific responses that actually track who's interacting with Pomelo and how they're feeling, rather than one generic behavior for everyone.

# note | A model that improves with use
A learning mechanism to make Pomelo's reading of sensory and perceptual input more accurate over time, instead of staying fixed at whatever accuracy it launched with.

# Group play: dance and storytelling
A dance mode that plays music and moves in response to the kids, and storytelling sessions that build a story around the group's own collaborative input.
```

**Three robots, three levels of biological complexity — build your way from a fish to a dog.**

Lemon is a prototyping education kit built around three progressively complex biomimetic robots: Lime (a fish), Satsuma (a turtle), and Lemon (a dog). Each level layers on new skills — assembly, electronics, coding — until students are building and customizing a companion of their own design.

```stats
3 | progressive levels
Raspberry Pi Pico
Open-sourced online
Cheaper than Stanford Pupper
```

![Satsuma the turtle, Lime the fish, and Lemon the dog — the three builds in the kit.](/research/lemon/01-satsuma-the-turtle-lime-the-fish-w2400.jpg)

## The idea — One skill per robot, not everything at once

Most K-12 robotics kits either teach everything in a single build, or ask students to follow instructions passively. Lemon does neither. It's split into three separate robots, each a fully realized creature in its own right, each one adding exactly one new domain of skill — assembly, then electronics, then advanced coding.

The team drew inspiration from the **Stanford Pupper**, an open-source quadruped built for K-12 and undergraduate robotics education — but Pupper is a single ~8-hour, ~$900 build. Lemon takes the same "learn robotics by building a robot dog" idea and stages it: three cheaper, sequential robots, so every essential topic gets its own dedicated build instead of being compressed into one.

> The gamification isn't a layer added on top — it _is_ the fabrication process. Kids don't just receive a robot; they build, then customize, their own ideal pet.

## Three levels — Fish, then turtle, then dog

```cards
# 01Lime | Assembly, electronics, and code — from scratch
Students learn to integrate servo motors into a design, wire them through a Raspberry Pi Pico, and move them with Adafruit CircuitPython — simple and compatible enough to teach a real coding foundation. Once the fish moves, the actual lesson starts: modify it, color it, customize it to reflect their own identity. *SERVOS · RASPBERRY PI PICO · CIRCUITPYTHON*

# 02Satsuma | More complex movement, more complex electronics
Satsuma builds on Lime's foundation by adding electronic breadboards, voltage regulators, and servo boards — enough to allow noticeably more complicated movement — plus ultrasonic sensors that improve the model thematically as well as functionally. *BREADBOARDS · VOLTAGE REGULATORS · ULTRASONIC SENSORS*

# 03Lemon | Inverse kinematics — and a dog that acts like one
The final model adds inverse kinematics to the coding process, the hardest skill layer in the kit. Paired with ultrasonic sensors and a speaker system, the finished prototype can replicate specific dog behaviors — following a person, barking. *INVERSE KINEMATICS · SPEAKER · SENSING*
```

## Built to be customized — Every fish comes out different

After finishing the guided build, kids are pushed to make it their own — with whatever materials are on hand.

![TWO LIME BUILDS — SAME KIT, DIFFERENT IDENTITY](/research/lemon/02-two-lime-builds-same-kit-differe-w2400.jpg)
![DESIGNED AFTER A VICTORIAN WALL-TILE FISH](/research/lemon/03-designed-after-a-victorian-wall--w2400.jpg)

One student, after completing the full Lemon kit, went further — independently designing a snake robot of their own from scratch, applying everything the kit taught about assembly, electronics, and code to a creature the kit never covered.

## A kit with a website — The fabrication process is the interface

Lemon isn't just a physical kit. An open-source online platform hosts tutorials and a direct channel for students to request changes or optimizations to a model — being involved in manufacturing and assembling your own robot is, itself, a mode of human-computer interaction.

![The Lemon Educational Kit platform — tutorials, customization requests, and open-sourced models.](/research/lemon/04-the-lemon-educational-kit-platfo-w2400.jpg)

## Where it fits — Related work, and what's different here

```findings
# Vs. Pomelo, an earlier ideaLab project
Pomelo taught algorithmic thinking through tangible code blocks and a given robot dog. Lemon pushes further into an active-creator role — kids don't just program a robot they're handed, they build it, then everything after is their own.

# note | Tested on real newcomers
Introduced to middle and high schoolers in the lab with no prior experience. Their feedback on what was hard to build directly shaped what got fixed — and one student's independent snake-robot project became the clearest evidence the transfer of skills actually worked.
```

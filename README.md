# Dining Philosophers Problem - Interactive Simulation

**[🔗 Live Demo](https://nathannorman.github.io/dining-philosophers/index-minimal.html)**

An interactive visualization of the classic Dining Philosophers Problem, inspired by the discussion from Pantheon Season 1, Episode 1.

## About the Problem

The Dining Philosophers Problem is a classic synchronization problem in computer science that illustrates challenges in concurrent programming:

- **N philosophers** sit around a circular table
- Each philosopher has a **plate** and there are **N chopsticks** (one between each pair of philosophers)
- To eat, a philosopher needs **both chopsticks** (left and right)
- Philosophers alternate between **thinking**, **being hungry**, and **eating**

## Two Solutions Implemented

### 1. Classic Solution (Deadlock-Prone)
The naive approach where philosophers can pick up chopsticks independently. This can lead to deadlock when all philosophers simultaneously pick up their left chopstick, leaving no right chopsticks available.

### 2. Waiter Solution (Third Party)
As discussed in Pantheon, this introduces a **third party** (waiter) who acts as a mutex/arbitrator:
- Philosophers must get **permission** from the waiter before picking up chopsticks
- The waiter ensures only a limited number of philosophers can attempt to eat simultaneously
- This prevents deadlock by controlling access to resources

## Features

- **Interactive Controls**: Switch between solutions, adjust number of philosophers (3-8), and simulation speed
- **Visual Feedback**: See philosophers thinking (🧠), hungry (🍜), waiting (⏳), and eating (🍽️)
- **Real-time Statistics**: Track deadlocks, meals eaten, and average waiting time
- **Responsive Design**: Works on desktop and mobile devices

## Running the Simulation

Simply open `index.html` in a web browser. No additional setup required!

## Technical Details

- **Pure JavaScript** - No frameworks or dependencies
- **CSS Animations** - Smooth visual transitions and state indicators
- **Async/Await** - Simulates concurrent philosopher behavior
- **Deadlock Detection** - Automatic detection and recovery in classic mode

## Inspiration

This project was inspired by the dining philosophers discussion in Pantheon Season 1, Episode 1, where the protagonist Caspian explains the waiter solution as a practical approach to preventing deadlock in concurrent systems.

## Running Tests

The project includes a comprehensive test suite to ensure synchronization correctness:

```bash
# Run automated tests via Node.js
node run-tests.js

# Or open in browser for visual test runner
open test-runner.html
```

## Development

Built with Claude Code, focusing on educational clarity and preventing synchronization bugs through comprehensive testing.
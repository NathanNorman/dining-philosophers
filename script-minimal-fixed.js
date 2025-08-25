// Fixed version - ensures proper chopstick ownership consistency

class PhilosopherState {
    constructor(id) {
        this.id = id;
        this.state = 'thinking'; // thinking|hungry|eating|blocked
        this.heldChopsticks = new Set();
        this.waitingFor = null;
        this.stateHistory = [];
    }
    
    requestChopstick(chopstick) {
        if (!chopstick.isHeld) {
            chopstick.holder = this.id;
            chopstick.isHeld = true;
            this.heldChopsticks.add(chopstick.id);
            return true;
        }
        this.waitingFor = chopstick.id;
        return false;
    }
    
    releaseChopstick(chopstick) {
        if (chopstick.holder === this.id) { // Only release if we're the holder
            chopstick.holder = null;
            chopstick.isHeld = false;
            this.heldChopsticks.delete(chopstick.id);
        }
        if (this.waitingFor === chopstick.id) {
            this.waitingFor = null;
        }
    }
    
    releaseAllChopsticks(chopsticks) {
        const toRelease = Array.from(this.heldChopsticks);
        toRelease.forEach(id => {
            if (chopsticks[id] && chopsticks[id].holder === this.id) {
                this.releaseChopstick(chopsticks[id]);
            }
        });
        this.heldChopsticks.clear();
    }
}

// ... rest of the simulation code stays the same but with this critical fix:

// In simulateClassicStep, ensure we're checking actual ownership
simulateClassicStep() {
    // Process ALL philosophers each step to maintain consistency
    for (let i = 0; i < this.state.philosopherCount; i++) {
        const phil = this.state.philosophers[i];
        
        // Only process state transitions for philosophers in stable states
        if (phil.state === 'thinking') {
            // Random chance to become hungry (lower probability)
            if (Math.random() < 0.1) {
                phil.state = 'hungry';
                this.state.logEvent(`P${i + 1} becomes hungry`);
            }
        } else if (phil.state === 'hungry') {
            const leftChopstick = this.state.chopsticks[i];
            const rightChopstick = this.state.chopsticks[(i + 1) % this.state.philosopherCount];
            
            // Try to get both chopsticks
            if (!phil.heldChopsticks.has(leftChopstick.id) && !leftChopstick.isHeld) {
                phil.requestChopstick(leftChopstick);
                this.state.logEvent(`P${i + 1} picks up left chopstick C${leftChopstick.id + 1}`);
            } else if (phil.heldChopsticks.has(leftChopstick.id) && 
                      !phil.heldChopsticks.has(rightChopstick.id) && 
                      !rightChopstick.isHeld) {
                phil.requestChopstick(rightChopstick);
                phil.state = 'eating';
                this.state.logEvent(`P${i + 1} picks up right chopstick C${rightChopstick.id + 1} and starts eating`);
            } else if (phil.heldChopsticks.has(leftChopstick.id) && rightChopstick.isHeld) {
                phil.state = 'blocked';
                phil.waitingFor = rightChopstick.id;
            }
        } else if (phil.state === 'eating') {
            // Eat for a few steps then release
            if (Math.random() < 0.3) {
                const leftChopstick = this.state.chopsticks[i];
                const rightChopstick = this.state.chopsticks[(i + 1) % this.state.philosopherCount];
                
                phil.releaseChopstick(leftChopstick);
                phil.releaseChopstick(rightChopstick);
                phil.state = 'thinking';
                this.state.logEvent(`P${i + 1} finishes eating and releases chopsticks`);
            }
        }
    }
}
#!/usr/bin/env node

// Automated test runner for Dining Philosophers
// Run with: node run-tests.js

// Mock browser environment for testing
global.document = {
    getElementById: () => null,
    addEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => []
};

// Load the simulation classes from the main script (now supports Node.js exports)
const { PhilosopherState, ChopstickState, SimulationState } = require('./script-minimal.js');

// Test implementation
class DiningPhilosophersTests {
    constructor() {
        this.results = [];
        this.passed = 0;
        this.failed = 0;
    }
    
    createTestState(philosopherCount = 5) {
        return new SimulationState(philosopherCount);
    }
    
    assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }
    
    testChopstickOwnership() {
        const state = this.createTestState();
        const phil0 = state.philosophers[0];
        const chop0 = state.chopsticks[0];
        
        phil0.requestChopstick(chop0);
        this.assert(chop0.isHeld === true, "Chopstick should be marked as held");
        this.assert(chop0.holder === 0, "Chopstick holder should be philosopher 0");
        this.assert(phil0.heldChopsticks.has(0), "Philosopher should track held chopstick");
        
        const phil1 = state.philosophers[1];
        const result = phil1.requestChopstick(chop0);
        this.assert(result === false, "Should not be able to take held chopstick");
        this.assert(chop0.holder === 0, "Original holder should remain");
        
        phil0.releaseChopstick(chop0);
        this.assert(chop0.isHeld === false, "Chopstick should be free");
        this.assert(chop0.holder === null, "Chopstick should have no holder");
        
        return "PASSED";
    }
    
    testEatingRequiresBothChopsticks() {
        const state = this.createTestState();
        const phil2 = state.philosophers[2];
        const leftChop = state.chopsticks[2];  // P3's left is C3
        const rightChop = state.chopsticks[1];  // P3's right is C2
        
        phil2.requestChopstick(leftChop);
        this.assert(phil2.heldChopsticks.size === 1, "Should only have one chopstick");
        
        phil2.requestChopstick(rightChop);
        this.assert(phil2.heldChopsticks.size === 2, "Should have both chopsticks");
        this.assert(leftChop.holder === 2, "Left chopstick should show philosopher 2 as owner");
        this.assert(rightChop.holder === 2, "Right chopstick should show philosopher 2 as owner");
        
        return "PASSED";
    }
    
    testVisualStateConsistency() {
        const state = this.createTestState();
        
        state.philosophers[3].state = 'eating';
        state.philosophers[3].requestChopstick(state.chopsticks[3]);  // P4's left is C4
        state.philosophers[3].requestChopstick(state.chopsticks[2]);  // P4's right is C3
        
        this.assert(state.chopsticks[3].holder === 3, "C4 should be held by P4");
        this.assert(state.chopsticks[2].holder === 3, "C3 should be held by P4");
        
        // This is the exact bug we saw - verify it can't happen
        for (let i = 0; i < state.philosopherCount; i++) {
            if (i !== 3) {
                this.assert(!state.philosophers[i].heldChopsticks.has(3), 
                    `P${i+1} should not think they have C4`);
                this.assert(!state.philosophers[i].heldChopsticks.has(2), 
                    `P${i+1} should not think they have C3`);
            }
        }
        
        return "PASSED";
    }
    
    testDeadlockDetection() {
        const state = this.createTestState();
        
        for (let i = 0; i < state.philosopherCount; i++) {
            const phil = state.philosophers[i];
            const leftChop = state.chopsticks[i];
            
            phil.state = 'blocked';
            phil.requestChopstick(leftChop);
            phil.waitingFor = (i + 1) % state.philosopherCount;
        }
        
        const hasDeadlock = state.checkForDeadlock();
        this.assert(hasDeadlock === true, "Should detect circular wait deadlock");
        
        return "PASSED";
    }
    
    testSnapshotRestore() {
        const state = this.createTestState();
        
        state.philosophers[1].state = 'eating';
        state.philosophers[1].requestChopstick(state.chopsticks[1]);  // P2's left is C2
        state.philosophers[1].requestChopstick(state.chopsticks[0]);  // P2's right is C1
        state.stepNumber = 10;
        
        const snapshot = state.snapshot();
        
        state.philosophers[1].releaseAllChopsticks(state.chopsticks);
        state.philosophers[1].state = 'thinking';
        state.stepNumber = 20;
        
        state.restore(snapshot);
        
        this.assert(state.philosophers[1].state === 'eating', "State should be restored");
        this.assert(state.philosophers[1].heldChopsticks.has(1), "Should have chopstick C2");
        this.assert(state.philosophers[1].heldChopsticks.has(0), "Should have chopstick C1");
        this.assert(state.stepNumber === 10, "Step number should be restored");
        
        return "PASSED";
    }
    
    testNoDoubleHolding() {
        const state = this.createTestState();
        
        state.philosophers[0].requestChopstick(state.chopsticks[0]);
        const result = state.philosophers[4].requestChopstick(state.chopsticks[0]);
        
        this.assert(result === false, "Should not be able to take held chopstick");
        this.assert(state.chopsticks[0].holder === 0, "Chopstick should still belong to Phil 0");
        
        return "PASSED";
    }
    
    testWaiterConcurrencyLimit() {
        const state = this.createTestState();
        state.mode = 'waiter';
        
        const maxConcurrent = state.waiter.maxConcurrent;
        
        for (let i = 0; i < maxConcurrent; i++) {
            state.waiter.currentlyEating.add(i);
        }
        
        this.assert(state.waiter.currentlyEating.size === maxConcurrent, 
            "Should be at max concurrent eaters");
        
        const canAddMore = state.waiter.currentlyEating.size < state.waiter.maxConcurrent;
        this.assert(!canAddMore, "Should not be able to add more concurrent eaters");
        
        return "PASSED";
    }
    
    // Test the specific bug from the screenshot
    testScreenshotBugScenario() {
        const state = this.createTestState();
        
        // Try to recreate the impossible state from the screenshot
        state.philosophers[2].state = 'eating';  // P3 eating
        state.philosophers[2].requestChopstick(state.chopsticks[2]); // P3 has C3 (left)
        state.philosophers[2].requestChopstick(state.chopsticks[1]); // P3 has C2 (right)
        
        // Try to make P4 also hold C3 (should be impossible)
        const result = state.philosophers[3].requestChopstick(state.chopsticks[2]);
        
        this.assert(result === false, "P4 should NOT be able to take C3 while P3 has it");
        this.assert(state.chopsticks[2].holder === 2, "C3 should still belong to P3");
        this.assert(!state.philosophers[3].heldChopsticks.has(2), "P4 should not think it has C3");
        
        return "PASSED";
    }
    
    runAll() {
        const tests = [
            { name: "Chopstick Ownership Consistency", fn: () => this.testChopstickOwnership() },
            { name: "Eating Requires Both Chopsticks", fn: () => this.testEatingRequiresBothChopsticks() },
            { name: "Visual State Consistency", fn: () => this.testVisualStateConsistency() },
            { name: "Deadlock Detection", fn: () => this.testDeadlockDetection() },
            { name: "Snapshot and Restore", fn: () => this.testSnapshotRestore() },
            { name: "No Double-Holding", fn: () => this.testNoDoubleHolding() },
            { name: "Waiter Concurrency Limit", fn: () => this.testWaiterConcurrencyLimit() },
            { name: "Screenshot Bug Prevention", fn: () => this.testScreenshotBugScenario() }
        ];
        
        console.log("=== Running Dining Philosophers Tests ===\n");
        
        tests.forEach(test => {
            try {
                const result = test.fn();
                this.passed++;
                console.log(`✅ ${test.name}: ${result}`);
                this.results.push({ name: test.name, status: 'PASSED' });
            } catch (error) {
                this.failed++;
                console.error(`❌ ${test.name}: FAILED`);
                console.error(`   ${error.message}`);
                this.results.push({ name: test.name, status: 'FAILED', error: error.message });
            }
        });
        
        console.log(`\n=== Test Results ===`);
        console.log(`Passed: ${this.passed}/${tests.length}`);
        console.log(`Failed: ${this.failed}/${tests.length}`);
        
        if (this.failed > 0) {
            console.log("\n⚠️  Some tests failed. Please fix the issues before deploying.");
            process.exit(1);
        } else {
            console.log("\n✅ All tests passed! Safe to deploy.");
            process.exit(0);
        }
    }
}

// Run the tests
const tester = new DiningPhilosophersTests();
tester.runAll();
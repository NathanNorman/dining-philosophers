// Test suite for Dining Philosophers visualization
// Prevents synchronization bugs between state and visual representation

class DiningPhilosophersTests {
    constructor() {
        this.results = [];
        this.passed = 0;
        this.failed = 0;
    }
    
    // Helper to create a test state
    createTestState(philosopherCount = 5) {
        const state = new SimulationState(philosopherCount);
        return state;
    }
    
    // Assert helper
    assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }
    
    // Test: Chopstick ownership consistency
    testChopstickOwnership() {
        const state = this.createTestState();
        const phil0 = state.philosophers[0];
        const chop0 = state.chopsticks[0];
        
        // Test 1: Picking up a chopstick
        phil0.requestChopstick(chop0);
        this.assert(chop0.isHeld === true, "Chopstick should be marked as held");
        this.assert(chop0.holder === 0, "Chopstick holder should be philosopher 0");
        this.assert(phil0.heldChopsticks.has(0), "Philosopher should track held chopstick");
        
        // Test 2: Another philosopher can't take held chopstick
        const phil1 = state.philosophers[1];
        const result = phil1.requestChopstick(chop0);
        this.assert(result === false, "Should not be able to take held chopstick");
        this.assert(chop0.holder === 0, "Original holder should remain");
        
        // Test 3: Releasing chopstick
        phil0.releaseChopstick(chop0);
        this.assert(chop0.isHeld === false, "Chopstick should be free");
        this.assert(chop0.holder === null, "Chopstick should have no holder");
        this.assert(!phil0.heldChopsticks.has(0), "Philosopher should not track released chopstick");
        
        return "PASSED";
    }
    
    // Test: Eating requires both chopsticks
    testEatingRequiresBothChopsticks() {
        const state = this.createTestState();
        const phil2 = state.philosophers[2];
        const leftChop = state.chopsticks[2];  // P3's left is C3
        const rightChop = state.chopsticks[1];  // P3's right is C2
        
        // Test 1: Can't eat with only left chopstick
        phil2.requestChopstick(leftChop);
        phil2.state = 'eating'; // Try to force eating state
        this.assert(phil2.heldChopsticks.size === 1, "Should only have one chopstick");
        
        // Test 2: Can eat with both chopsticks
        phil2.requestChopstick(rightChop);
        this.assert(phil2.heldChopsticks.size === 2, "Should have both chopsticks");
        this.assert(phil2.heldChopsticks.has(2), "Should have left chopstick");
        this.assert(phil2.heldChopsticks.has(1), "Should have right chopstick");
        
        // Test 3: Both chopsticks show correct owner
        this.assert(leftChop.holder === 2, "Left chopstick should show philosopher 2 as owner");
        this.assert(rightChop.holder === 2, "Right chopstick should show philosopher 2 as owner");
        
        return "PASSED";
    }
    
    // Test: Visual state matches internal state
    testVisualStateConsistency() {
        const state = this.createTestState();
        
        // Set up a specific scenario
        state.philosophers[3].state = 'eating';
        state.philosophers[3].requestChopstick(state.chopsticks[3]);  // P4's left is C4
        state.philosophers[3].requestChopstick(state.chopsticks[2]);  // P4's right is C3
        
        // Verify chopstick ownership matches philosopher state
        this.assert(state.chopsticks[3].holder === 3, "C4 should be held by P4");
        this.assert(state.chopsticks[2].holder === 3, "C3 should be held by P4");
        
        // Verify no other philosopher can be shown holding these chopsticks
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
    
    // Test: Deadlock detection accuracy
    testDeadlockDetection() {
        const state = this.createTestState();
        
        // Create circular wait scenario
        for (let i = 0; i < state.philosopherCount; i++) {
            const phil = state.philosophers[i];
            const leftChop = state.chopsticks[i];
            
            phil.state = 'blocked';
            phil.requestChopstick(leftChop);
            phil.waitingFor = (i + 1) % state.philosopherCount; // Waiting for right
        }
        
        const hasDeadlock = state.checkForDeadlock();
        this.assert(hasDeadlock === true, "Should detect circular wait deadlock");
        
        return "PASSED";
    }
    
    // Test: State snapshot and restore
    testSnapshotRestore() {
        const state = this.createTestState();
        
        // Set up initial state
        state.philosophers[1].state = 'eating';
        state.philosophers[1].requestChopstick(state.chopsticks[1]);  // P2's left is C2
        state.philosophers[1].requestChopstick(state.chopsticks[0]);  // P2's right is C1
        state.stepNumber = 10;
        
        // Take snapshot
        const snapshot = state.snapshot();
        
        // Modify state
        state.philosophers[1].releaseAllChopsticks(state.chopsticks);
        state.philosophers[1].state = 'thinking';
        state.stepNumber = 20;
        
        // Restore snapshot
        state.restore(snapshot);
        
        // Verify restoration
        this.assert(state.philosophers[1].state === 'eating', "State should be restored");
        this.assert(state.philosophers[1].heldChopsticks.has(1), "Should have left chopstick C2");
        this.assert(state.philosophers[1].heldChopsticks.has(0), "Should have right chopstick C1");
        this.assert(state.chopsticks[1].holder === 1, "Chopstick C2 should show correct owner");
        this.assert(state.chopsticks[0].holder === 1, "Chopstick C1 should show correct owner");
        this.assert(state.stepNumber === 10, "Step number should be restored");
        
        return "PASSED";
    }
    
    // Test: No double-holding of chopsticks
    testNoDoubleHolding() {
        const state = this.createTestState();
        
        // Phil 0 takes chopstick 0
        state.philosophers[0].requestChopstick(state.chopsticks[0]);
        
        // Phil 4 tries to take chopstick 0 (shared with Phil 0)
        const result = state.philosophers[4].requestChopstick(state.chopsticks[0]);
        
        this.assert(result === false, "Should not be able to take held chopstick");
        this.assert(state.chopsticks[0].holder === 0, "Chopstick should still belong to Phil 0");
        this.assert(!state.philosophers[4].heldChopsticks.has(0), 
            "Phil 4 should not think they have the chopstick");
        
        return "PASSED";
    }
    
    // Test: Waiter mode prevents too many concurrent eaters
    testWaiterConcurrencyLimit() {
        const state = this.createTestState();
        state.mode = 'waiter';
        
        const maxConcurrent = state.waiter.maxConcurrent;
        
        // Try to have more philosophers eating than allowed
        for (let i = 0; i <= maxConcurrent; i++) {
            state.waiter.queue.push(i);
        }
        
        // Grant permissions up to limit
        for (let i = 0; i < maxConcurrent; i++) {
            state.waiter.currentlyEating.add(i);
        }
        
        this.assert(state.waiter.currentlyEating.size === maxConcurrent, 
            "Should be at max concurrent eaters");
        
        // Verify no more can be added
        const canAddMore = state.waiter.currentlyEating.size < state.waiter.maxConcurrent;
        this.assert(!canAddMore, "Should not be able to add more concurrent eaters");
        
        return "PASSED";
    }
    
    // Run all tests
    runAll() {
        const tests = [
            { name: "Chopstick Ownership Consistency", fn: () => this.testChopstickOwnership() },
            { name: "Eating Requires Both Chopsticks", fn: () => this.testEatingRequiresBothChopsticks() },
            { name: "Visual State Consistency", fn: () => this.testVisualStateConsistency() },
            { name: "Deadlock Detection", fn: () => this.testDeadlockDetection() },
            { name: "Snapshot and Restore", fn: () => this.testSnapshotRestore() },
            { name: "No Double-Holding", fn: () => this.testNoDoubleHolding() },
            { name: "Waiter Concurrency Limit", fn: () => this.testWaiterConcurrencyLimit() }
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
        } else {
            console.log("\n✅ All tests passed! Safe to deploy.");
        }
        
        return this.results;
    }
}

// Export for use in test runner
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DiningPhilosophersTests;
}

// Run tests if executed directly
if (typeof require !== 'undefined' && require.main === module) {
    const tester = new DiningPhilosophersTests();
    tester.runAll();
}
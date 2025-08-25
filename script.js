class DiningPhilosophers {
    constructor() {
        this.philosophers = [];
        this.chopsticks = [];
        this.philosopherCount = 5;
        this.isRunning = false;
        this.currentSolution = 'classic';
        this.speed = 1;
        this.waiter = null;
        
        // Statistics
        this.deadlockCount = 0;
        this.mealsEaten = 0;
        this.totalWaitTime = 0;
        this.waitingSessions = 0;
        
        this.initializeElements();
        this.setupEventListeners();
        this.createSimulation();
    }
    
    initializeElements() {
        this.table = document.getElementById('table');
        this.waiterElement = document.getElementById('waiter');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.philSlider = document.getElementById('philSlider');
        this.speedSlider = document.getElementById('speedSlider');
        this.philCountDisplay = document.getElementById('philCount');
        this.speedValueDisplay = document.getElementById('speedValue');
        this.solutionRadios = document.querySelectorAll('input[name="solution"]');
        
        // Stats elements
        this.deadlockCountEl = document.getElementById('deadlock-count');
        this.mealsCountEl = document.getElementById('meals-count');
        this.avgWaitEl = document.getElementById('avg-wait');
    }
    
    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startSimulation());
        this.pauseBtn.addEventListener('click', () => this.pauseSimulation());
        this.resetBtn.addEventListener('click', () => this.resetSimulation());
        
        this.philSlider.addEventListener('input', (e) => {
            this.philosopherCount = parseInt(e.target.value);
            this.philCountDisplay.textContent = this.philosopherCount;
            if (!this.isRunning) {
                this.createSimulation();
            }
        });
        
        this.speedSlider.addEventListener('input', (e) => {
            this.speed = parseFloat(e.target.value);
            this.speedValueDisplay.textContent = `${this.speed}x`;
        });
        
        this.solutionRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.currentSolution = e.target.value;
                this.waiterElement.classList.toggle('hidden', this.currentSolution !== 'waiter');
                if (!this.isRunning) {
                    this.createSimulation();
                }
            });
        });
    }
    
    createSimulation() {
        this.table.innerHTML = '';
        this.philosophers = [];
        this.chopsticks = [];
        
        const radius = 120;
        const angleStep = (2 * Math.PI) / this.philosopherCount;
        
        // Create philosophers
        for (let i = 0; i < this.philosopherCount; i++) {
            const angle = i * angleStep - Math.PI / 2;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            
            const philosopher = {
                id: i,
                element: this.createPhilosopherElement(i, x, y),
                state: 'thinking',
                leftChopstick: i,
                rightChopstick: (i + 1) % this.philosopherCount,
                thinkingTime: 0,
                eatingTime: 0,
                waitingStart: 0,
                hasLeftChopstick: false,
                hasRightChopstick: false,
                waitingForPermission: false
            };
            
            this.philosophers.push(philosopher);
            this.table.appendChild(philosopher.element);
        }
        
        // Create chopsticks
        for (let i = 0; i < this.philosopherCount; i++) {
            const angle = (i + 0.5) * angleStep - Math.PI / 2;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            
            const chopstick = {
                id: i,
                element: this.createChopstickElement(i, x, y, angle),
                taken: false,
                takenBy: null
            };
            
            this.chopsticks.push(chopstick);
            this.table.appendChild(chopstick.element);
        }
        
        // Initialize waiter for waiter solution
        if (this.currentSolution === 'waiter') {
            this.waiter = {
                permissions: new Set(),
                maxConcurrentEaters: Math.floor(this.philosopherCount / 2)
            };
        }
        
        this.updateStats();
    }
    
    createPhilosopherElement(id, x, y) {
        const element = document.createElement('div');
        element.className = 'philosopher thinking';
        element.style.left = `calc(50% + ${x}px - 30px)`;
        element.style.top = `calc(50% + ${y}px - 30px)`;
        element.textContent = '🧠';
        element.title = `Philosopher ${id + 1}`;
        return element;
    }
    
    createChopstickElement(id, x, y, angle) {
        const element = document.createElement('div');
        element.className = 'chopstick';
        element.style.left = `calc(50% + ${x}px - 2px)`;
        element.style.top = `calc(50% + ${y}px - 20px)`;
        element.style.transform = `rotate(${angle + Math.PI / 2}rad)`;
        element.title = `Chopstick ${id + 1}`;
        return element;
    }
    
    startSimulation() {
        this.isRunning = true;
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        
        this.philosophers.forEach(philosopher => {
            this.runPhilosopher(philosopher);
        });
        
        // Start deadlock detection
        this.deadlockCheckInterval = setInterval(() => {
            this.checkForDeadlock();
        }, 2000);
    }
    
    pauseSimulation() {
        this.isRunning = false;
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        clearInterval(this.deadlockCheckInterval);
    }
    
    resetSimulation() {
        this.pauseSimulation();
        this.deadlockCount = 0;
        this.mealsEaten = 0;
        this.totalWaitTime = 0;
        this.waitingSessions = 0;
        this.createSimulation();
    }
    
    async runPhilosopher(philosopher) {
        while (this.isRunning) {
            // Thinking phase
            await this.think(philosopher);
            
            if (!this.isRunning) break;
            
            // Hungry phase
            await this.tryToEat(philosopher);
            
            if (!this.isRunning) break;
        }
    }
    
    async think(philosopher) {
        this.setPhilosopherState(philosopher, 'thinking', '🧠');
        const thinkTime = (Math.random() * 2000 + 1000) / this.speed;
        await this.sleep(thinkTime);
    }
    
    async tryToEat(philosopher) {
        this.setPhilosopherState(philosopher, 'hungry', '🍜');
        
        if (this.currentSolution === 'classic') {
            await this.classicEating(philosopher);
        } else {
            await this.waiterEating(philosopher);
        }
    }
    
    async classicEating(philosopher) {
        const waitStart = Date.now();
        
        // Try to pick up chopsticks
        while (this.isRunning) {
            const leftChopstick = this.chopsticks[philosopher.leftChopstick];
            const rightChopstick = this.chopsticks[philosopher.rightChopstick];
            
            if (!leftChopstick.taken && !rightChopstick.taken) {
                // Pick up both chopsticks
                leftChopstick.taken = true;
                leftChopstick.takenBy = philosopher.id;
                rightChopstick.taken = true;
                rightChopstick.takenBy = philosopher.id;
                
                leftChopstick.element.classList.add('taken');
                rightChopstick.element.classList.add('taken');
                
                philosopher.hasLeftChopstick = true;
                philosopher.hasRightChopstick = true;
                
                break;
            } else if (!leftChopstick.taken) {
                // Pick up left chopstick and wait for right
                leftChopstick.taken = true;
                leftChopstick.takenBy = philosopher.id;
                leftChopstick.element.classList.add('taken');
                philosopher.hasLeftChopstick = true;
                
                this.setPhilosopherState(philosopher, 'waiting', '⏳');
                
                // Wait for right chopstick
                while (this.isRunning && rightChopstick.taken) {
                    await this.sleep(50);
                }
                
                if (this.isRunning) {
                    rightChopstick.taken = true;
                    rightChopstick.takenBy = philosopher.id;
                    rightChopstick.element.classList.add('taken');
                    philosopher.hasRightChopstick = true;
                    break;
                }
            } else {
                // Wait for chopsticks
                this.setPhilosopherState(philosopher, 'waiting', '⏳');
                await this.sleep(100);
            }
        }
        
        if (this.isRunning) {
            // Record wait time
            const waitTime = Date.now() - waitStart;
            this.totalWaitTime += waitTime;
            this.waitingSessions++;
            
            // Eat
            await this.eat(philosopher);
            
            // Put down chopsticks
            this.releaseChopsticks(philosopher);
        }
    }
    
    async waiterEating(philosopher) {
        const waitStart = Date.now();
        philosopher.waitingForPermission = true;
        this.setPhilosopherState(philosopher, 'waiting', '⏳');
        
        // Request permission from waiter
        while (this.isRunning && !this.waiter.permissions.has(philosopher.id)) {
            if (this.waiter.permissions.size < this.waiter.maxConcurrentEaters) {
                // Grant permission
                this.waiter.permissions.add(philosopher.id);
                this.waiterElement.classList.add('active');
                setTimeout(() => this.waiterElement.classList.remove('active'), 500);
                break;
            }
            await this.sleep(100);
        }
        
        if (this.isRunning && this.waiter.permissions.has(philosopher.id)) {
            // Now can safely pick up chopsticks
            const leftChopstick = this.chopsticks[philosopher.leftChopstick];
            const rightChopstick = this.chopsticks[philosopher.rightChopstick];
            
            leftChopstick.taken = true;
            leftChopstick.takenBy = philosopher.id;
            rightChopstick.taken = true;
            rightChopstick.takenBy = philosopher.id;
            
            leftChopstick.element.classList.add('taken');
            rightChopstick.element.classList.add('taken');
            
            philosopher.hasLeftChopstick = true;
            philosopher.hasRightChopstick = true;
            
            // Record wait time
            const waitTime = Date.now() - waitStart;
            this.totalWaitTime += waitTime;
            this.waitingSessions++;
            
            // Eat
            await this.eat(philosopher);
            
            // Release chopsticks and permission
            this.releaseChopsticks(philosopher);
            this.waiter.permissions.delete(philosopher.id);
        }
        
        philosopher.waitingForPermission = false;
    }
    
    async eat(philosopher) {
        this.setPhilosopherState(philosopher, 'eating', '🍽️');
        const eatTime = (Math.random() * 1500 + 1000) / this.speed;
        await this.sleep(eatTime);
        
        this.mealsEaten++;
        this.updateStats();
    }
    
    releaseChopsticks(philosopher) {
        if (philosopher.hasLeftChopstick) {
            const leftChopstick = this.chopsticks[philosopher.leftChopstick];
            leftChopstick.taken = false;
            leftChopstick.takenBy = null;
            leftChopstick.element.classList.remove('taken');
            philosopher.hasLeftChopstick = false;
        }
        
        if (philosopher.hasRightChopstick) {
            const rightChopstick = this.chopsticks[philosopher.rightChopstick];
            rightChopstick.taken = false;
            rightChopstick.takenBy = null;
            rightChopstick.element.classList.remove('taken');
            philosopher.hasRightChopstick = false;
        }
    }
    
    setPhilosopherState(philosopher, state, emoji) {
        philosopher.state = state;
        philosopher.element.className = `philosopher ${state}`;
        philosopher.element.textContent = emoji;
    }
    
    checkForDeadlock() {
        if (this.currentSolution === 'waiter') return; // Waiter solution prevents deadlock
        
        const hungryPhilosophers = this.philosophers.filter(p => p.state === 'hungry' || p.state === 'waiting');
        
        if (hungryPhilosophers.length === this.philosopherCount) {
            // Check if all chopsticks are taken and no one is eating
            const allChopsticksTaken = this.chopsticks.every(c => c.taken);
            const noOneEating = this.philosophers.every(p => p.state !== 'eating');
            
            if (allChopsticksTaken && noOneEating) {
                this.deadlockCount++;
                this.updateStats();
                
                // Break deadlock by forcing one philosopher to release chopsticks
                const randomPhilosopher = hungryPhilosophers[Math.floor(Math.random() * hungryPhilosophers.length)];
                this.releaseChopsticks(randomPhilosopher);
                this.setPhilosopherState(randomPhilosopher, 'thinking', '🧠');
            }
        }
    }
    
    updateStats() {
        this.deadlockCountEl.textContent = this.deadlockCount;
        this.mealsCountEl.textContent = this.mealsEaten;
        
        const avgWait = this.waitingSessions > 0 ? 
            Math.round(this.totalWaitTime / this.waitingSessions) : 0;
        this.avgWaitEl.textContent = `${avgWait}ms`;
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the simulation when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new DiningPhilosophers();
});
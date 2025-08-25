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
        this.stats = {
            deadlockCount: 0,
            mealsEaten: 0,
            totalWaitTime: 0,
            waitingSessions: 0,
            startTime: null,
            totalRunTime: 0
        };
        
        // Visual elements
        this.canvas = null;
        this.ctx = null;
        this.animationFrame = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupCanvas();
        this.createSimulation();
    }
    
    initializeElements() {
        // Table and containers
        this.table = document.getElementById('table');
        this.tableContainer = document.getElementById('table-container');
        this.waiterContainer = document.getElementById('waiter-container');
        this.waiterFigure = document.querySelector('.waiter-figure');
        this.permissionQueue = document.getElementById('permission-queue');
        this.deadlockWarning = document.getElementById('deadlock-warning');
        
        // Controls
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
        this.efficiencyEl = document.getElementById('efficiency');
        
        // Canvas for connections
        this.canvas = document.getElementById('connection-canvas');
        this.timelineCanvas = document.getElementById('timeline-chart');
    }
    
    setupCanvas() {
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());
        }
        
        if (this.timelineCanvas) {
            this.timelineCtx = this.timelineCanvas.getContext('2d');
            this.timelineData = [];
            this.resizeTimelineCanvas();
        }
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.offsetWidth;
        this.canvas.height = container.offsetHeight;
    }
    
    resizeTimelineCanvas() {
        const container = this.timelineCanvas.parentElement;
        this.timelineCanvas.width = container.offsetWidth - 32;
        this.timelineCanvas.height = container.offsetHeight - 32;
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
                this.waiterContainer.classList.toggle('hidden', this.currentSolution !== 'waiter');
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
        this.permissionQueue.innerHTML = '';
        
        const tableRect = this.table.getBoundingClientRect();
        const centerX = tableRect.width / 2;
        const centerY = tableRect.height / 2;
        const radius = Math.min(centerX, centerY) - 50;
        const angleStep = (2 * Math.PI) / this.philosopherCount;
        
        // Create philosophers
        for (let i = 0; i < this.philosopherCount; i++) {
            const angle = i * angleStep - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            
            const philosopher = {
                id: i,
                element: this.createPhilosopherElement(i, x, y),
                state: 'thinking',
                leftChopstick: i,
                rightChopstick: (i + 1) % this.philosopherCount,
                hasLeftChopstick: false,
                hasRightChopstick: false,
                waitingForPermission: false,
                waitStartTime: null,
                x: x,
                y: y,
                angle: angle
            };
            
            this.philosophers.push(philosopher);
            this.table.appendChild(philosopher.element);
        }
        
        // Create chopsticks positioned between philosophers
        for (let i = 0; i < this.philosopherCount; i++) {
            const angle = (i + 0.5) * angleStep - Math.PI / 2;
            const x = centerX + radius * 0.7 * Math.cos(angle);
            const y = centerY + radius * 0.7 * Math.sin(angle);
            
            const chopstick = {
                id: i,
                element: this.createChopstickElement(i, x, y, angle),
                taken: false,
                takenBy: null,
                x: x,
                y: y
            };
            
            this.chopsticks.push(chopstick);
            this.table.appendChild(chopstick.element);
        }
        
        // Initialize waiter for waiter solution
        if (this.currentSolution === 'waiter') {
            this.waiter = {
                permissions: new Set(),
                queue: [],
                maxConcurrentEaters: Math.floor(this.philosopherCount / 2)
            };
        }
        
        this.updateStats();
        this.drawConnections();
    }
    
    createPhilosopherElement(id, x, y) {
        const element = document.createElement('div');
        element.className = 'philosopher thinking';
        element.style.left = `${x - 35}px`;
        element.style.top = `${y - 35}px`;
        
        const emoji = document.createElement('div');
        emoji.className = 'philosopher-emoji';
        emoji.textContent = '🤔';
        element.appendChild(emoji);
        
        const label = document.createElement('div');
        label.className = 'philosopher-label';
        label.textContent = `P${id + 1}`;
        element.appendChild(label);
        
        element.title = `Philosopher ${id + 1}`;
        return element;
    }
    
    createChopstickElement(id, x, y, angle) {
        const element = document.createElement('div');
        element.className = 'chopstick';
        element.style.left = `${x - 30}px`;
        element.style.top = `${y - 2}px`;
        element.style.transform = `rotate(${angle + Math.PI / 2}rad)`;
        element.title = `Chopstick ${id + 1}`;
        return element;
    }
    
    drawConnections() {
        if (!this.ctx) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw connections between philosophers and their held chopsticks
        this.philosophers.forEach(phil => {
            if (phil.hasLeftChopstick) {
                this.drawConnection(phil, this.chopsticks[phil.leftChopstick]);
            }
            if (phil.hasRightChopstick) {
                this.drawConnection(phil, this.chopsticks[phil.rightChopstick]);
            }
        });
    }
    
    drawConnection(philosopher, chopstick) {
        const tableRect = this.table.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        const philX = philosopher.x + tableRect.left - canvasRect.left;
        const philY = philosopher.y + tableRect.top - canvasRect.top;
        const chopX = chopstick.x + tableRect.left - canvasRect.left;
        const chopY = chopstick.y + tableRect.top - canvasRect.top;
        
        this.ctx.beginPath();
        this.ctx.moveTo(philX, philY);
        this.ctx.lineTo(chopX, chopY);
        
        const gradient = this.ctx.createLinearGradient(philX, philY, chopX, chopY);
        if (philosopher.state === 'eating') {
            gradient.addColorStop(0, 'rgba(16, 185, 129, 0.6)');
            gradient.addColorStop(1, 'rgba(16, 185, 129, 0.2)');
        } else {
            gradient.addColorStop(0, 'rgba(245, 158, 11, 0.6)');
            gradient.addColorStop(1, 'rgba(245, 158, 11, 0.2)');
        }
        
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
    }
    
    startSimulation() {
        this.isRunning = true;
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.stats.startTime = Date.now();
        
        // Clear deadlock warning
        this.deadlockWarning.classList.add('hidden');
        
        // Start philosopher processes
        this.philosophers.forEach(philosopher => {
            this.runPhilosopher(philosopher);
        });
        
        // Start animation loop
        this.animate();
        
        // Start deadlock detection for classic mode
        if (this.currentSolution === 'classic') {
            this.deadlockCheckInterval = setInterval(() => {
                this.checkForDeadlock();
            }, 2000 / this.speed);
        }
        
        // Start timeline updates
        this.timelineInterval = setInterval(() => {
            this.updateTimeline();
        }, 100);
    }
    
    pauseSimulation() {
        this.isRunning = false;
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        
        if (this.deadlockCheckInterval) {
            clearInterval(this.deadlockCheckInterval);
        }
        if (this.timelineInterval) {
            clearInterval(this.timelineInterval);
        }
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }
    
    resetSimulation() {
        this.pauseSimulation();
        this.stats = {
            deadlockCount: 0,
            mealsEaten: 0,
            totalWaitTime: 0,
            waitingSessions: 0,
            startTime: null,
            totalRunTime: 0
        };
        this.timelineData = [];
        this.deadlockWarning.classList.add('hidden');
        this.createSimulation();
    }
    
    animate() {
        if (!this.isRunning) return;
        
        this.drawConnections();
        this.updateStats();
        
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }
    
    async runPhilosopher(philosopher) {
        while (this.isRunning) {
            // Thinking phase
            await this.think(philosopher);
            
            if (!this.isRunning) break;
            
            // Hungry phase - try to eat
            philosopher.waitStartTime = Date.now();
            await this.tryToEat(philosopher);
            
            if (!this.isRunning) break;
        }
    }
    
    async think(philosopher) {
        this.setPhilosopherState(philosopher, 'thinking', '🤔');
        const thinkTime = (Math.random() * 3000 + 2000) / this.speed;
        await this.sleep(thinkTime);
    }
    
    async tryToEat(philosopher) {
        this.setPhilosopherState(philosopher, 'hungry', '😋');
        
        if (this.currentSolution === 'classic') {
            await this.classicEating(philosopher);
        } else {
            await this.waiterEating(philosopher);
        }
    }
    
    async classicEating(philosopher) {
        while (this.isRunning) {
            const leftChopstick = this.chopsticks[philosopher.leftChopstick];
            const rightChopstick = this.chopsticks[philosopher.rightChopstick];
            
            // Try to pick up left chopstick first
            if (!leftChopstick.taken) {
                leftChopstick.taken = true;
                leftChopstick.takenBy = philosopher.id;
                leftChopstick.element.classList.add('taken');
                philosopher.hasLeftChopstick = true;
                
                // Small delay before trying right chopstick
                await this.sleep(100 / this.speed);
                
                // Try to pick up right chopstick
                if (!rightChopstick.taken) {
                    rightChopstick.taken = true;
                    rightChopstick.takenBy = philosopher.id;
                    rightChopstick.element.classList.add('taken');
                    philosopher.hasRightChopstick = true;
                    
                    // Both chopsticks acquired - eat!
                    this.recordWaitTime(philosopher);
                    await this.eat(philosopher);
                    this.releaseChopsticks(philosopher);
                    break;
                } else {
                    // Can't get right chopstick - show waiting state
                    this.setPhilosopherState(philosopher, 'waiting', '⏳');
                }
            } else {
                // Can't even get left chopstick
                this.setPhilosopherState(philosopher, 'waiting', '⏳');
            }
            
            await this.sleep(200 / this.speed);
        }
    }
    
    async waiterEating(philosopher) {
        // Add to queue and show in UI
        this.waiter.queue.push(philosopher.id);
        this.updatePermissionQueue();
        
        this.setPhilosopherState(philosopher, 'waiting', '⏳');
        
        // Wait for permission from waiter
        while (this.isRunning && !this.waiter.permissions.has(philosopher.id)) {
            if (this.waiter.permissions.size < this.waiter.maxConcurrentEaters) {
                // Grant permission
                this.waiter.permissions.add(philosopher.id);
                this.waiter.queue = this.waiter.queue.filter(id => id !== philosopher.id);
                this.updatePermissionQueue();
                
                // Animate waiter granting permission
                this.waiterFigure.classList.add('granting');
                setTimeout(() => this.waiterFigure.classList.remove('granting'), 500);
                
                break;
            }
            await this.sleep(100 / this.speed);
        }
        
        if (this.isRunning && this.waiter.permissions.has(philosopher.id)) {
            // Permission granted - pick up both chopsticks safely
            const leftChopstick = this.chopsticks[philosopher.leftChopstick];
            const rightChopstick = this.chopsticks[philosopher.rightChopstick];
            
            // Waiter ensures both chopsticks are available
            await this.sleep(200 / this.speed);
            
            leftChopstick.taken = true;
            leftChopstick.takenBy = philosopher.id;
            rightChopstick.taken = true;
            rightChopstick.takenBy = philosopher.id;
            
            leftChopstick.element.classList.add('taken');
            rightChopstick.element.classList.add('taken');
            
            philosopher.hasLeftChopstick = true;
            philosopher.hasRightChopstick = true;
            
            this.recordWaitTime(philosopher);
            await this.eat(philosopher);
            
            // Release chopsticks and permission
            this.releaseChopsticks(philosopher);
            this.waiter.permissions.delete(philosopher.id);
            this.updatePermissionQueue();
        }
    }
    
    async eat(philosopher) {
        this.setPhilosopherState(philosopher, 'eating', '🍜');
        const eatTime = (Math.random() * 2000 + 1500) / this.speed;
        await this.sleep(eatTime);
        
        this.stats.mealsEaten++;
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
        philosopher.element.querySelector('.philosopher-emoji').textContent = emoji;
    }
    
    recordWaitTime(philosopher) {
        if (philosopher.waitStartTime) {
            const waitTime = Date.now() - philosopher.waitStartTime;
            this.stats.totalWaitTime += waitTime;
            this.stats.waitingSessions++;
            philosopher.waitStartTime = null;
        }
    }
    
    checkForDeadlock() {
        // Check if all philosophers are waiting with at least one chopstick
        const waitingWithChopstick = this.philosophers.filter(p => 
            (p.state === 'waiting' || p.state === 'hungry') && 
            (p.hasLeftChopstick || p.hasRightChopstick)
        );
        
        if (waitingWithChopstick.length === this.philosopherCount) {
            // Deadlock detected!
            this.stats.deadlockCount++;
            this.deadlockWarning.classList.remove('hidden');
            
            // Break deadlock by forcing one philosopher to release
            const victim = waitingWithChopstick[Math.floor(Math.random() * waitingWithChopstick.length)];
            this.releaseChopsticks(victim);
            this.setPhilosopherState(victim, 'thinking', '🤔');
            
            // Hide warning after 2 seconds
            setTimeout(() => {
                this.deadlockWarning.classList.add('hidden');
            }, 2000);
        }
    }
    
    updatePermissionQueue() {
        this.permissionQueue.innerHTML = '';
        this.waiter.queue.forEach(philId => {
            const queueItem = document.createElement('div');
            queueItem.className = 'queue-item';
            queueItem.textContent = philId + 1;
            this.permissionQueue.appendChild(queueItem);
        });
    }
    
    updateStats() {
        this.deadlockCountEl.textContent = this.stats.deadlockCount;
        this.mealsCountEl.textContent = this.stats.mealsEaten;
        
        const avgWait = this.stats.waitingSessions > 0 ? 
            Math.round(this.stats.totalWaitTime / this.stats.waitingSessions) : 0;
        this.avgWaitEl.textContent = `${avgWait}ms`;
        
        // Calculate efficiency
        if (this.stats.startTime) {
            const runTime = (Date.now() - this.stats.startTime) / 1000;
            const theoreticalMaxMeals = runTime * this.philosopherCount / 3; // Assuming 3 seconds per meal cycle
            const efficiency = Math.min(100, Math.round((this.stats.mealsEaten / theoreticalMaxMeals) * 100));
            this.efficiencyEl.textContent = `${efficiency}%`;
        } else {
            this.efficiencyEl.textContent = '0%';
        }
    }
    
    updateTimeline() {
        if (!this.timelineCtx) return;
        
        // Add current state to timeline data
        const eatingCount = this.philosophers.filter(p => p.state === 'eating').length;
        const waitingCount = this.philosophers.filter(p => p.state === 'waiting').length;
        
        this.timelineData.push({
            eating: eatingCount,
            waiting: waitingCount,
            timestamp: Date.now()
        });
        
        // Keep only last 50 data points
        if (this.timelineData.length > 50) {
            this.timelineData.shift();
        }
        
        // Draw timeline chart
        this.drawTimelineChart();
    }
    
    drawTimelineChart() {
        const ctx = this.timelineCtx;
        const width = this.timelineCanvas.width;
        const height = this.timelineCanvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        if (this.timelineData.length < 2) return;
        
        const maxValue = this.philosopherCount;
        const stepX = width / (this.timelineData.length - 1);
        
        // Draw eating line (green)
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
        ctx.lineWidth = 2;
        
        this.timelineData.forEach((data, i) => {
            const x = i * stepX;
            const y = height - (data.eating / maxValue) * height;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
        
        // Draw waiting line (orange)
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
        ctx.lineWidth = 2;
        
        this.timelineData.forEach((data, i) => {
            const x = i * stepX;
            const y = height - (data.waiting / maxValue) * height;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the simulation when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new DiningPhilosophers();
});
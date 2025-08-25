// Minimal Dining Philosophers Visualization
// Focus: Educational clarity over visual effects

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
        chopstick.holder = null;
        chopstick.isHeld = false;
        this.heldChopsticks.delete(chopstick.id);
        if (this.waitingFor === chopstick.id) {
            this.waitingFor = null;
        }
    }
    
    releaseAllChopsticks(chopsticks) {
        this.heldChopsticks.forEach(id => {
            this.releaseChopstick(chopsticks[id]);
        });
    }
}

class ChopstickState {
    constructor(id) {
        this.id = id;
        this.isHeld = false;
        this.holder = null;
    }
}

class SimulationState {
    constructor(philosopherCount = 5) {
        this.philosopherCount = philosopherCount;
        this.philosophers = [];
        this.chopsticks = [];
        this.mode = 'classic';
        this.stepNumber = 0;
        this.eventLog = [];
        this.isDeadlocked = false;
        this.waiter = {
            queue: [],
            currentlyEating: new Set(),
            maxConcurrent: Math.floor(philosopherCount / 2)
        };
        
        this.initializeState();
    }
    
    initializeState() {
        // Create philosophers
        for (let i = 0; i < this.philosopherCount; i++) {
            this.philosophers.push(new PhilosopherState(i));
        }
        
        // Create chopsticks
        for (let i = 0; i < this.philosopherCount; i++) {
            this.chopsticks.push(new ChopstickState(i));
        }
    }
    
    reset() {
        this.philosophers = [];
        this.chopsticks = [];
        this.stepNumber = 0;
        this.eventLog = [];
        this.isDeadlocked = false;
        this.waiter.queue = [];
        this.waiter.currentlyEating.clear();
        this.initializeState();
    }
    
    logEvent(message, type = 'info') {
        const timestamp = (this.stepNumber * 0.1).toFixed(1);
        this.eventLog.push({
            step: this.stepNumber,
            time: timestamp,
            message: message,
            type: type
        });
        
        // Keep only last 10 events
        if (this.eventLog.length > 10) {
            this.eventLog.shift();
        }
    }
    
    checkForDeadlock() {
        // Check if all philosophers are blocked with at least one chopstick
        const waitingPhilosophers = this.philosophers.filter(p => 
            p.state === 'blocked' && p.heldChopsticks.size > 0
        );
        
        if (waitingPhilosophers.length === this.philosopherCount) {
            // Check for circular wait
            let hasCircularWait = true;
            for (let p of waitingPhilosophers) {
                if (p.waitingFor === null) {
                    hasCircularWait = false;
                    break;
                }
            }
            
            if (hasCircularWait) {
                this.isDeadlocked = true;
                this.logEvent('DEADLOCK DETECTED! All philosophers are waiting in a circle.', 'error');
                return true;
            }
        }
        
        return false;
    }
    
    // Create a snapshot for history/undo
    snapshot() {
        return {
            philosophers: this.philosophers.map(p => ({
                id: p.id,
                state: p.state,
                heldChopsticks: new Set(p.heldChopsticks),
                waitingFor: p.waitingFor
            })),
            chopsticks: this.chopsticks.map(c => ({
                id: c.id,
                isHeld: c.isHeld,
                holder: c.holder
            })),
            stepNumber: this.stepNumber,
            eventLog: [...this.eventLog],
            isDeadlocked: this.isDeadlocked
        };
    }
    
    restore(snapshot) {
        this.philosophers = snapshot.philosophers.map(p => {
            const phil = new PhilosopherState(p.id);
            phil.state = p.state;
            phil.heldChopsticks = new Set(p.heldChopsticks);
            phil.waitingFor = p.waitingFor;
            return phil;
        });
        
        this.chopsticks = snapshot.chopsticks.map(c => {
            const chop = new ChopstickState(c.id);
            chop.isHeld = c.isHeld;
            chop.holder = c.holder;
            return chop;
        });
        
        this.stepNumber = snapshot.stepNumber;
        this.eventLog = [...snapshot.eventLog];
        this.isDeadlocked = snapshot.isDeadlocked;
    }
}

class MinimalRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.centerX = canvas.width / 2;
        this.centerY = canvas.height / 2;
        this.tableRadius = 120;
    }
    
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    render(state) {
        this.clear();
        
        // Draw table (simple circle)
        this.drawTable();
        
        // Draw waiter in center if in waiter mode
        if (state.mode === 'waiter') {
            this.drawWaiter(state);
        }
        
        // Draw chopsticks
        this.drawChopsticks(state);
        
        // Draw philosophers
        this.drawPhilosophers(state);
        
        // Draw wait dependencies
        this.drawWaitGraph(state);
    }
    
    drawTable() {
        this.ctx.strokeStyle = '#ccc';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.tableRadius, 0, Math.PI * 2);
        this.ctx.stroke();
    }
    
    drawWaiter(state) {
        // Draw waiter/mutex in the center
        const waiterRadius = 30;
        
        // Draw waiter circle
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, waiterRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#9c27b0';  // Purple for the waiter
        this.ctx.fill();
        this.ctx.strokeStyle = '#6a1b9a';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Draw waiter icon/text
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 16px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('W', this.centerX, this.centerY - 5);
        
        // Show current permissions
        this.ctx.font = '10px sans-serif';
        const eatingCount = state.waiter.currentlyEating.size;
        const maxCount = state.waiter.maxConcurrent;
        this.ctx.fillText(`${eatingCount}/${maxCount}`, this.centerX, this.centerY + 10);
        
        // Draw connections to currently eating philosophers
        state.waiter.currentlyEating.forEach(philId => {
            const angleStep = (Math.PI * 2) / state.philosopherCount;
            const angle = philId * angleStep - Math.PI / 2;
            const philX = this.centerX + this.tableRadius * Math.cos(angle);
            const philY = this.centerY + this.tableRadius * Math.sin(angle);
            
            // Draw permission line from waiter to eating philosopher
            this.ctx.save();
            this.ctx.strokeStyle = '#4caf50';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.globalAlpha = 0.5;
            this.ctx.beginPath();
            this.ctx.moveTo(this.centerX, this.centerY);
            this.ctx.lineTo(philX, philY);
            this.ctx.stroke();
            this.ctx.restore();
        });
    }
    
    drawPhilosophers(state) {
        const angleStep = (Math.PI * 2) / state.philosopherCount;
        
        state.philosophers.forEach((phil, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const x = this.centerX + this.tableRadius * Math.cos(angle);
            const y = this.centerY + this.tableRadius * Math.sin(angle);
            
            // Draw philosopher circle
            this.ctx.beginPath();
            this.ctx.arc(x, y, 25, 0, Math.PI * 2);
            
            // Color based on state
            switch(phil.state) {
                case 'thinking':
                    this.ctx.fillStyle = '#e0e0e0';
                    break;
                case 'hungry':
                    this.ctx.fillStyle = '#ffeb3b';
                    break;
                case 'eating':
                    this.ctx.fillStyle = '#4caf50';
                    break;
                case 'blocked':
                    this.ctx.fillStyle = '#f44336';
                    break;
            }
            
            this.ctx.fill();
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Draw philosopher number
            this.ctx.fillStyle = '#333';
            this.ctx.font = 'bold 14px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(`P${i + 1}`, x, y);
            
            // Draw state icon
            this.ctx.font = '10px sans-serif';
            let icon = '';
            switch(phil.state) {
                case 'thinking': icon = '💭'; break;
                case 'hungry': icon = '🍽️'; break;
                case 'eating': icon = '🍜'; break;
                case 'blocked': icon = '🔒'; break;
            }
            this.ctx.fillText(icon, x, y + 15);
        });
    }
    
    drawChopsticks(state) {
        const angleStep = (Math.PI * 2) / state.philosopherCount;
        
        state.chopsticks.forEach((chop, i) => {
            const angle = (i + 0.5) * angleStep - Math.PI / 2;
            const innerRadius = this.tableRadius * 0.6;
            const outerRadius = this.tableRadius * 0.85;
            
            const x1 = this.centerX + innerRadius * Math.cos(angle);
            const y1 = this.centerY + innerRadius * Math.sin(angle);
            const x2 = this.centerX + outerRadius * Math.cos(angle);
            const y2 = this.centerY + outerRadius * Math.sin(angle);
            
            // Draw subtle connection line to holder if held
            if (chop.isHeld) {
                const holderAngle = chop.holder * angleStep - Math.PI / 2;
                const holderX = this.centerX + this.tableRadius * Math.cos(holderAngle);
                const holderY = this.centerY + this.tableRadius * Math.sin(holderAngle);
                
                this.ctx.save();
                this.ctx.strokeStyle = '#ddd';
                this.ctx.lineWidth = 1;
                this.ctx.setLineDash([2, 2]);
                this.ctx.beginPath();
                this.ctx.moveTo((x1 + x2) / 2, (y1 + y2) / 2);
                this.ctx.lineTo(holderX, holderY);
                this.ctx.stroke();
                this.ctx.restore();
            }
            
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            
            // Color based on holder
            if (chop.isHeld) {
                // Use philosopher's color
                const holder = state.philosophers[chop.holder];
                switch(holder.state) {
                    case 'eating':
                        this.ctx.strokeStyle = '#4caf50';
                        this.ctx.lineWidth = 4;
                        break;
                    case 'blocked':
                        this.ctx.strokeStyle = '#f44336';
                        this.ctx.lineWidth = 4;
                        break;
                    default:
                        this.ctx.strokeStyle = '#ff9800';
                        this.ctx.lineWidth = 3;
                }
            } else {
                this.ctx.strokeStyle = '#999';
                this.ctx.lineWidth = 2;
            }
            
            this.ctx.stroke();
            
            // Draw chopstick label with ownership indicator
            const labelX = this.centerX + (outerRadius + 10) * Math.cos(angle);
            const labelY = this.centerY + (outerRadius + 10) * Math.sin(angle);
            
            // Show ownership in label
            let label = `C${i + 1}`;
            if (chop.isHeld) {
                label = `C${i + 1}`;
                // Draw ownership indicator below
                this.ctx.fillStyle = this.ctx.strokeStyle; // Use chopstick color
                this.ctx.font = 'bold 10px sans-serif';
            } else {
                this.ctx.fillStyle = '#666';
                this.ctx.font = '10px sans-serif';
            }
            
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(label, labelX, labelY);
            
            // Add holder indicator if held
            if (chop.isHeld) {
                this.ctx.font = '8px sans-serif';
                this.ctx.fillText(`(P${chop.holder + 1})`, labelX, labelY + 10);
            }
        });
    }
    
    drawWaitGraph(state) {
        const angleStep = (Math.PI * 2) / state.philosopherCount;
        
        state.philosophers.forEach((phil, i) => {
            if (phil.waitingFor !== null) {
                const philAngle = i * angleStep - Math.PI / 2;
                const philX = this.centerX + this.tableRadius * Math.cos(philAngle);
                const philY = this.centerY + this.tableRadius * Math.sin(philAngle);
                
                const chopAngle = (phil.waitingFor + 0.5) * angleStep - Math.PI / 2;
                const chopX = this.centerX + this.tableRadius * 0.7 * Math.cos(chopAngle);
                const chopY = this.centerY + this.tableRadius * 0.7 * Math.sin(chopAngle);
                
                // Draw dotted line from philosopher to chopstick they're waiting for
                this.ctx.strokeStyle = '#ff5722';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.moveTo(philX, philY);
                this.ctx.lineTo(chopX, chopY);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
                
                // Draw arrow
                const angle = Math.atan2(chopY - philY, chopX - philX);
                const arrowSize = 8;
                this.ctx.beginPath();
                this.ctx.moveTo(chopX, chopY);
                this.ctx.lineTo(
                    chopX - arrowSize * Math.cos(angle - Math.PI / 6),
                    chopY - arrowSize * Math.sin(angle - Math.PI / 6)
                );
                this.ctx.moveTo(chopX, chopY);
                this.ctx.lineTo(
                    chopX - arrowSize * Math.cos(angle + Math.PI / 6),
                    chopY - arrowSize * Math.sin(angle + Math.PI / 6)
                );
                this.ctx.stroke();
            }
        });
    }
    
    getClickedElement(x, y, state) {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = x - rect.left;
        const clickY = y - rect.top;
        const angleStep = (Math.PI * 2) / state.philosopherCount;
        
        // Check philosophers
        for (let i = 0; i < state.philosopherCount; i++) {
            const angle = i * angleStep - Math.PI / 2;
            const philX = this.centerX + this.tableRadius * Math.cos(angle);
            const philY = this.centerY + this.tableRadius * Math.sin(angle);
            
            const dist = Math.sqrt((clickX - philX) ** 2 + (clickY - philY) ** 2);
            if (dist < 25) {
                return { type: 'philosopher', id: i };
            }
        }
        
        // Check chopsticks
        for (let i = 0; i < state.philosopherCount; i++) {
            const angle = (i + 0.5) * angleStep - Math.PI / 2;
            const chopX = this.centerX + this.tableRadius * 0.7 * Math.cos(angle);
            const chopY = this.centerY + this.tableRadius * 0.7 * Math.sin(angle);
            
            const dist = Math.sqrt((clickX - chopX) ** 2 + (clickY - chopY) ** 2);
            if (dist < 20) {
                return { type: 'chopstick', id: i };
            }
        }
        
        return null;
    }
}

class SimulationController {
    constructor() {
        this.state = new SimulationState(5);
        this.renderer = new MinimalRenderer(document.getElementById('mainCanvas'));
        this.history = [];
        this.historyIndex = -1;
        this.isPlaying = false;
        this.playInterval = null;
        this.speed = 1;
        
        this.initializeElements();
        this.attachEventListeners();
        this.saveHistory();
        this.render();
    }
    
    initializeElements() {
        this.stepBackBtn = document.getElementById('stepBackBtn');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.stepForwardBtn = document.getElementById('stepForwardBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.speedSlider = document.getElementById('speedSlider');
        this.speedValue = document.getElementById('speedValue');
        this.scenarioSelect = document.getElementById('scenarioSelect');
        this.modeRadios = document.querySelectorAll('input[name="mode"]');
        this.eventLogContent = document.getElementById('eventLogContent');
        this.stepCounter = document.getElementById('stepCounter');
        this.deadlockWarning = document.getElementById('deadlockWarning');
        this.waiterQueue = document.getElementById('waiterQueue');
        this.queueList = document.getElementById('queueList');
        this.eatingList = document.getElementById('eatingList');
    }
    
    attachEventListeners() {
        this.stepBackBtn.addEventListener('click', () => this.stepBack());
        this.playPauseBtn.addEventListener('click', () => this.togglePlay());
        this.stepForwardBtn.addEventListener('click', () => this.stepForward());
        this.resetBtn.addEventListener('click', () => this.reset());
        
        this.speedSlider.addEventListener('input', (e) => {
            this.speed = parseFloat(e.target.value);
            this.speedValue.textContent = `${this.speed}x`;
            if (this.isPlaying) {
                this.pause();
                this.play();
            }
        });
        
        this.scenarioSelect.addEventListener('change', (e) => {
            this.loadScenario(e.target.value);
        });
        
        this.modeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.state.mode = e.target.value;
                this.waiterQueue.classList.toggle('hidden', e.target.value !== 'waiter');
                this.reset();
            });
        });
        
        this.renderer.canvas.addEventListener('click', (e) => {
            const element = this.renderer.getClickedElement(e.clientX, e.clientY, this.state);
            if (element) {
                this.handleElementClick(element);
            }
        });
    }
    
    handleElementClick(element) {
        if (element.type === 'philosopher') {
            const phil = this.state.philosophers[element.id];
            if (phil.state === 'thinking') {
                phil.state = 'hungry';
                this.state.logEvent(`P${element.id + 1} becomes hungry (user click)`, 'info');
                this.saveHistory();
                this.render();
            }
        } else if (element.type === 'chopstick') {
            // Show who can reach this chopstick
            const leftPhil = element.id;
            const rightPhil = (element.id - 1 + this.state.philosopherCount) % this.state.philosopherCount;
            this.state.logEvent(`C${element.id + 1} can be reached by P${leftPhil + 1} and P${rightPhil + 1}`, 'info');
            this.render();
        }
    }
    
    saveHistory() {
        // Remove any future history if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        this.history.push(this.state.snapshot());
        this.historyIndex = this.history.length - 1;
        
        // Limit history size
        if (this.history.length > 100) {
            this.history.shift();
            this.historyIndex--;
        }
    }
    
    stepBack() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.state.restore(this.history[this.historyIndex]);
            this.render();
        }
    }
    
    stepForward() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.state.restore(this.history[this.historyIndex]);
        } else {
            this.simulateStep();
            this.saveHistory();
        }
        this.render();
    }
    
    simulateStep() {
        this.state.stepNumber++;
        
        if (this.state.mode === 'classic') {
            this.simulateClassicStep();
        } else {
            this.simulateWaiterStep();
        }
        
        this.state.checkForDeadlock();
    }
    
    simulateClassicStep() {
        // Simple round-robin simulation
        const philId = this.state.stepNumber % this.state.philosopherCount;
        const phil = this.state.philosophers[philId];
        
        if (phil.state === 'thinking') {
            // Random chance to become hungry
            if (Math.random() < 0.3) {
                phil.state = 'hungry';
                this.state.logEvent(`P${philId + 1} becomes hungry`);
            }
        } else if (phil.state === 'hungry') {
            const leftChopstick = this.state.chopsticks[philId];
            const rightChopstick = this.state.chopsticks[(philId - 1 + this.state.philosopherCount) % this.state.philosopherCount];
            
            if (!phil.heldChopsticks.has(leftChopstick.id)) {
                // Try to pick up left chopstick
                if (phil.requestChopstick(leftChopstick)) {
                    this.state.logEvent(`P${philId + 1} picks up left chopstick C${leftChopstick.id + 1}`);
                } else {
                    phil.state = 'blocked';
                    this.state.logEvent(`P${philId + 1} blocked waiting for C${leftChopstick.id + 1}`, 'warning');
                }
            } else if (!phil.heldChopsticks.has(rightChopstick.id)) {
                // Try to pick up right chopstick
                if (phil.requestChopstick(rightChopstick)) {
                    phil.state = 'eating';
                    this.state.logEvent(`P${philId + 1} picks up right chopstick C${rightChopstick.id + 1} and starts eating`);
                } else {
                    phil.state = 'blocked';
                    this.state.logEvent(`P${philId + 1} blocked waiting for C${rightChopstick.id + 1}`, 'warning');
                }
            }
        } else if (phil.state === 'eating') {
            // Finish eating and release chopsticks
            const leftChopstick = this.state.chopsticks[philId];
            const rightChopstick = this.state.chopsticks[(philId - 1 + this.state.philosopherCount) % this.state.philosopherCount];
            
            phil.releaseChopstick(leftChopstick);
            phil.releaseChopstick(rightChopstick);
            phil.state = 'thinking';
            this.state.logEvent(`P${philId + 1} finishes eating and releases chopsticks`);
        } else if (phil.state === 'blocked') {
            // Try again to get needed chopstick
            if (phil.waitingFor !== null) {
                const chopstick = this.state.chopsticks[phil.waitingFor];
                if (!chopstick.isHeld) {
                    phil.requestChopstick(chopstick);
                    
                    // Check if we can eat now
                    const leftChopstick = this.state.chopsticks[philId];
                    const rightChopstick = this.state.chopsticks[(philId - 1 + this.state.philosopherCount) % this.state.philosopherCount];
                    
                    if (phil.heldChopsticks.has(leftChopstick.id) && 
                        phil.heldChopsticks.has(rightChopstick.id)) {
                        phil.state = 'eating';
                        this.state.logEvent(`P${philId + 1} finally gets C${chopstick.id + 1} and starts eating`);
                    } else {
                        phil.state = 'hungry';
                    }
                }
            }
        }
    }
    
    simulateWaiterStep() {
        // Waiter-controlled simulation
        const philId = this.state.stepNumber % this.state.philosopherCount;
        const phil = this.state.philosophers[philId];
        
        if (phil.state === 'thinking') {
            // Random chance to become hungry
            if (Math.random() < 0.3) {
                phil.state = 'hungry';
                // Add to waiter queue
                if (!this.state.waiter.queue.includes(philId)) {
                    this.state.waiter.queue.push(philId);
                    this.state.logEvent(`P${philId + 1} becomes hungry and joins queue`);
                }
            }
        } else if (phil.state === 'hungry') {
            // Check if waiter grants permission
            if (this.state.waiter.currentlyEating.size < this.state.waiter.maxConcurrent &&
                this.state.waiter.queue[0] === philId) {
                
                // Check if neighbors are eating (they would have the shared chopsticks)
                const leftNeighbor = (philId - 1 + this.state.philosopherCount) % this.state.philosopherCount;
                const rightNeighbor = (philId + 1) % this.state.philosopherCount;
                
                if (!this.state.waiter.currentlyEating.has(leftNeighbor) && 
                    !this.state.waiter.currentlyEating.has(rightNeighbor)) {
                    // Grant permission
                    this.state.waiter.queue.shift();
                    this.state.waiter.currentlyEating.add(philId);
                    
                    // Get both chopsticks atomically
                    const leftChopstick = this.state.chopsticks[philId];
                    const rightChopstick = this.state.chopsticks[(philId - 1 + this.state.philosopherCount) % this.state.philosopherCount];
                    
                    phil.requestChopstick(leftChopstick);
                    phil.requestChopstick(rightChopstick);
                    phil.state = 'eating';
                    
                    this.state.logEvent(`Waiter grants permission to P${philId + 1} - starts eating`);
                }
            }
        } else if (phil.state === 'eating') {
            // Finish eating and release chopsticks
            const leftChopstick = this.state.chopsticks[philId];
            const rightChopstick = this.state.chopsticks[(philId - 1 + this.state.philosopherCount) % this.state.philosopherCount];
            
            phil.releaseChopstick(leftChopstick);
            phil.releaseChopstick(rightChopstick);
            phil.state = 'thinking';
            
            // Remove from currently eating
            this.state.waiter.currentlyEating.delete(philId);
            
            this.state.logEvent(`P${philId + 1} finishes eating and returns permission to waiter`);
        }
    }
    
    loadScenario(scenario) {
        this.reset();
        
        switch(scenario) {
            case 'perfect-storm':
                // All philosophers become hungry at once
                this.state.philosophers.forEach((phil, i) => {
                    phil.state = 'hungry';
                    this.state.logEvent(`P${i + 1} becomes hungry (scenario)`);
                });
                break;
                
            case 'cascade':
                // Sequential hunger
                for (let i = 0; i < this.state.philosopherCount; i++) {
                    setTimeout(() => {
                        this.state.philosophers[i].state = 'hungry';
                        this.state.logEvent(`P${i + 1} becomes hungry (cascade)`);
                        this.saveHistory();
                        this.render();
                    }, i * 200);
                }
                break;
                
            case 'near-miss':
                // Almost deadlock
                for (let i = 0; i < this.state.philosopherCount - 1; i++) {
                    this.state.philosophers[i].state = 'hungry';
                    this.state.logEvent(`P${i + 1} becomes hungry (near-miss)`);
                }
                break;
        }
        
        this.saveHistory();
        this.render();
    }
    
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    play() {
        this.isPlaying = true;
        this.playPauseBtn.textContent = '⏸ Pause';
        
        this.playInterval = setInterval(() => {
            this.stepForward();
            
            // Stop if deadlocked
            if (this.state.isDeadlocked) {
                this.pause();
            }
        }, 1000 / this.speed);
    }
    
    pause() {
        this.isPlaying = false;
        this.playPauseBtn.textContent = '▶ Play';
        
        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }
    }
    
    reset() {
        this.pause();
        this.state.reset();
        this.history = [];
        this.historyIndex = -1;
        this.saveHistory();
        this.render();
    }
    
    render() {
        // Render canvas
        this.renderer.render(this.state);
        
        // Update UI elements
        this.stepCounter.textContent = this.state.stepNumber;
        
        // Update event log
        this.eventLogContent.innerHTML = '';
        this.state.eventLog.forEach(entry => {
            const div = document.createElement('div');
            div.className = `log-entry ${entry.type}`;
            div.textContent = `[${entry.time}s] ${entry.message}`;
            this.eventLogContent.appendChild(div);
        });
        
        // Scroll to bottom of log
        this.eventLogContent.scrollTop = this.eventLogContent.scrollHeight;
        
        // Update deadlock warning
        this.deadlockWarning.classList.toggle('hidden', !this.state.isDeadlocked);
        
        // Update waiter queue display
        if (this.state.mode === 'waiter') {
            this.queueList.innerHTML = '';
            this.state.waiter.queue.forEach(philId => {
                const div = document.createElement('div');
                div.className = 'queue-item';
                div.textContent = `P${philId + 1} (waiting)`;
                this.queueList.appendChild(div);
            });
            
            const eating = Array.from(this.state.waiter.currentlyEating)
                .map(id => `P${id + 1}`)
                .join(', ');
            this.eatingList.textContent = eating || 'None';
        }
        
        // Update button states
        this.stepBackBtn.disabled = this.historyIndex <= 0;
    }
}

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        new SimulationController();
    });
}

// Node.js export support (for testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PhilosopherState,
        ChopstickState,
        SimulationState,
        MinimalRenderer,
        SimulationController
    };
}
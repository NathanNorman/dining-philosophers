const { chromium } = require('playwright');

async function testDiningPhilosophers() {
    // Launch browser
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        console.log('Visiting GitHub Pages site...');
        await page.goto('https://nathannorman.github.io/dining-philosophers/');
        
        // Wait for the page to load
        await page.waitForSelector('#table');
        
        console.log('Taking screenshot of initial state...');
        await page.screenshot({ path: 'initial-state.png', fullPage: true });
        
        // Test classic solution first
        console.log('Testing classic solution...');
        await page.click('input[value="classic"]');
        await page.click('#startBtn');
        
        // Let it run for a few seconds
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'classic-running.png', fullPage: true });
        
        // Stop and switch to waiter solution
        await page.click('#pauseBtn');
        await page.click('#resetBtn');
        
        console.log('Testing waiter solution...');
        await page.click('input[value="waiter"]');
        
        // Take screenshot before starting waiter solution
        await page.screenshot({ path: 'waiter-before-start.png', fullPage: true });
        
        await page.click('#startBtn');
        
        // Let waiter solution run
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'waiter-running.png', fullPage: true });
        
        // Check if waiter element is visible
        const waiterVisible = await page.isVisible('#waiter:not(.hidden)');
        console.log('Waiter element visible:', waiterVisible);
        
        // Get current stats
        const stats = await page.evaluate(() => {
            return {
                deadlocks: document.getElementById('deadlock-count').textContent,
                meals: document.getElementById('meals-count').textContent,
                waitTime: document.getElementById('avg-wait').textContent
            };
        });
        
        console.log('Current stats:', stats);
        
        // Test different philosopher counts
        console.log('Testing with different philosopher counts...');
        await page.click('#resetBtn');
        
        // Set to 7 philosophers
        await page.fill('#philSlider', '7');
        await page.screenshot({ path: 'seven-philosophers.png', fullPage: true });
        
        await page.click('#startBtn');
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'seven-philosophers-running.png', fullPage: true });
        
        console.log('Screenshots saved successfully!');
        
    } catch (error) {
        console.error('Error during testing:', error);
        await page.screenshot({ path: 'error-state.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

testDiningPhilosophers();
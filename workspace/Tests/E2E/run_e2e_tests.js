/**
 * Automated Black-Box E2E Test Runner for Traffic Light System
 * Executed against actual index.html and app.js
 * 
 * Traceability:
 * @req_id: REQ-1-01 - Traffic Light Demonstration Layout and Initialization
 * @req_id: REQ-1-02 - Traffic Light Button Toggles and State Logic
 * @req_id: REQ-2-01 - Traffic Light Timer Input Configuration and Controls
 * @req_id: REQ-2-02 - Automatic Color Switching Cycle and Manual Interruption Logic
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// ============================================================================
// HTML Parser and Mock DOM Environment Setup
// ============================================================================

class DOMClassList {
    constructor(initialClasses = []) {
        this.classes = new Set(initialClasses);
    }
    add(...tokens) {
        tokens.forEach(t => {
            if (t) this.classes.add(t);
        });
    }
    remove(...tokens) {
        tokens.forEach(t => {
            if (t) this.classes.delete(t);
        });
    }
    contains(token) {
        return this.classes.has(token);
    }
    toArray() {
        return Array.from(this.classes);
    }
}

class DOMElement {
    constructor(tagName, id = '', className = '', attributes = {}, textContent = '') {
        this.tagName = tagName.toUpperCase();
        this.id = id;
        this.attributes = { ...attributes };
        this.classList = new DOMClassList(className ? className.split(/\s+/).filter(Boolean) : []);
        this.listeners = {};
        this.textContent = textContent;
        this.value = attributes.value !== undefined ? attributes.value : '';
    }

    getAttribute(name) {
        if (name === 'value') return this.value;
        return this.attributes[name] !== undefined ? this.attributes[name] : null;
    }

    setAttribute(name, val) {
        this.attributes[name] = String(val);
        if (name === 'value') this.value = String(val);
    }

    hasAttribute(name) {
        return name in this.attributes;
    }

    addEventListener(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    dispatchEvent(eventName, eventObj = {}) {
        if (this.listeners[eventName]) {
            const list = [...this.listeners[eventName]];
            list.forEach(cb => cb({ target: this, ...eventObj }));
        }
    }

    click() {
        this.dispatchEvent('click');
    }

    type(newValue) {
        this.value = newValue;
        this.dispatchEvent('input');
        this.dispatchEvent('change');
    }
}

class DOMDocument {
    constructor(htmlContent) {
        this.elementsById = new Map();
        this.elements = [];
        this.listeners = {};
        this.parseHTML(htmlContent);
    }

    parseHTML(html) {
        const openTagRegex = /<([a-zA-Z0-9]+)((?:\s+[^=>\s]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^>\s]+))?)*)\s*(\/?)>/g;
        let match;

        while ((match = openTagRegex.exec(html)) !== null) {
            const tagName = match[1];
            const attrString = match[2];
            const isSelfClosing = match[3] === '/';
            const endIndex = openTagRegex.lastIndex;

            // Extract inner text if not self closing
            let text = '';
            if (!isSelfClosing) {
                const rest = html.slice(endIndex);
                const closeRegex = new RegExp('^([^<]*)<\\/\\s*' + tagName + '\\s*>', 'i');
                const closeMatch = rest.match(closeRegex);
                if (closeMatch) {
                    text = closeMatch[1].trim();
                }
            }

            // Extract attributes
            const attrMap = {};
            const attrRegex = /([a-zA-Z0-9_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
            let attrMatch;
            while ((attrMatch = attrRegex.exec(attrString)) !== null) {
                const key = attrMatch[1];
                const val = attrMatch[2] !== undefined ? attrMatch[2] : (attrMatch[3] !== undefined ? attrMatch[3] : (attrMatch[4] !== undefined ? attrMatch[4] : true));
                attrMap[key] = val;
            }

            const elemId = attrMap.id || '';
            const elemClass = attrMap.class || '';

            const element = new DOMElement(tagName, elemId, elemClass, attrMap, text);

            if (elemId) {
                this.elementsById.set(elemId, element);
            }
            this.elements.push(element);
        }
    }

    getElementById(id) {
        return this.elementsById.get(id) || null;
    }

    querySelectorAll(selector) {
        if (selector === '.traffic-light .light') {
            return this.elements.filter(e => e.classList.contains('light'));
        }
        if (selector === '.traffic-light .light.active') {
            return this.elements.filter(e => e.classList.contains('light') && e.classList.contains('active'));
        }
        if (selector === '.controls button') {
            return this.elements.filter(e => e.tagName === 'BUTTON' && ['red-btn', 'yellow-btn', 'green-btn'].includes(e.id));
        }
        return [];
    }

    querySelector(selector) {
        const results = this.querySelectorAll(selector);
        return results.length > 0 ? results[0] : null;
    }

    addEventListener(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    dispatchEvent(event) {
        if (this.listeners[event]) {
            [...this.listeners[event]].forEach(cb => cb());
        }
    }
}

// ============================================================================
// Virtual Clock for Time Acceleration
// ============================================================================

class VirtualClock {
    constructor() {
        this.currentTime = 0;
        this.intervals = new Map();
        this.nextId = 1;
        this.originalSetInterval = global.setInterval;
        this.originalClearInterval = global.clearInterval;
    }

    install() {
        this.intervals.clear();
        this.currentTime = 0;
        this.nextId = 1;

        global.setInterval = (callback, delay, ...args) => {
            const id = this.nextId++;
            const numericDelay = Math.max(1, Number(delay) || 1);
            this.intervals.set(id, {
                callback,
                delay: numericDelay,
                nextRun: this.currentTime + numericDelay,
                args
            });
            return id;
        };

        global.clearInterval = (id) => {
            this.intervals.delete(id);
        };
    }

    uninstall() {
        global.setInterval = this.originalSetInterval;
        global.clearInterval = this.originalClearInterval;
        this.intervals.clear();
        this.currentTime = 0;
    }

    tick(ms) {
        const targetTime = this.currentTime + ms;
        let loopSafety = 10000;
        while (loopSafety-- > 0) {
            let earliestId = null;
            let earliestTime = Infinity;

            for (const [id, timer] of this.intervals.entries()) {
                if (timer.nextRun <= targetTime && timer.nextRun < earliestTime) {
                    earliestTime = timer.nextRun;
                    earliestId = id;
                }
            }

            if (earliestId === null) {
                break;
            }

            this.currentTime = earliestTime;
            const timer = this.intervals.get(earliestId);
            if (timer) {
                timer.nextRun += timer.delay;
                timer.callback(...timer.args);
            }
        }
        this.currentTime = targetTime;
    }

    getActiveIntervalCount() {
        return this.intervals.size;
    }
}

// ============================================================================
// E2E Test Suite Runner
// ============================================================================

const htmlPath = path.resolve(__dirname, '../../Code/index.html');
const rawHtml = fs.readFileSync(htmlPath, 'utf8');

const { TrafficLightUI } = require('../../Code/app');

const clock = new VirtualClock();
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];

function e2eTest(reqTag, description, testFn) {
    totalTests++;
    clock.install();

    // Instantiate fresh DOM from actual index.html
    const doc = new DOMDocument(rawHtml);
    global.document = doc;

    // Instantiate app UI
    const ui = new TrafficLightUI();

    try {
        testFn({ doc, ui, clock });
        passedTests++;
        console.log(`  ✓ [${reqTag}] ${description}`);
        testResults.push({ reqTag, description, status: 'PASS' });
    } catch (err) {
        failedTests++;
        console.error(`  ✗ [${reqTag}] ${description}`);
        console.error(`    Assertion Error: ${err.message}`);
        testResults.push({ reqTag, description, status: 'FAIL', error: err.message });
    } finally {
        if (ui && ui.timer) {
            ui.timer.stop();
        }
        clock.uninstall();
    }
}

console.log('\n======================================================================');
console.log('       STARTING E2E BLACK-BOX VERIFICATION RUNNER                    ');
console.log('======================================================================');

// ============================================================================
// SECTION 1: REQ-2-01 Timer Configuration & Control Black-Box Assertions
// ============================================================================
console.log('\n--- Running E2E Test Suite: REQ-2-01 (Timer Configuration & Controls) ---');

e2eTest('REQ-2-01', 'Timer interval input exists with type=number, min=1, and default value=3', ({ doc }) => {
    const input = doc.getElementById('timer-interval-input');
    assert.ok(input !== null, '#timer-interval-input must exist in DOM');
    assert.strictEqual(input.getAttribute('type'), 'number', 'Input must have type="number"');
    assert.strictEqual(input.getAttribute('min'), '1', 'Input must have min="1"');
    assert.strictEqual(input.value, '3', 'Input default value must be 3');
});

e2eTest('REQ-2-01', 'Timer toggle button displays "Start Timer" initially without stop-btn style', ({ doc }) => {
    const toggleBtn = doc.getElementById('timer-toggle-btn');
    assert.ok(toggleBtn !== null, '#timer-toggle-btn must exist in DOM');
    assert.strictEqual(toggleBtn.textContent, 'Start Timer', 'Initial button text must be "Start Timer"');
    assert.strictEqual(toggleBtn.classList.contains('stop-btn'), false, 'Initial button must not have "stop-btn" class');
});

e2eTest('REQ-2-01', 'Entering invalid non-positive input (<=0) displays validation error and rejects starting timer', ({ doc, ui }) => {
    const input = doc.getElementById('timer-interval-input');
    const toggleBtn = doc.getElementById('timer-toggle-btn');
    const errorMsg = doc.getElementById('timer-error-msg');
    const redLight = doc.getElementById('red-light');

    // Input 0
    input.type('0');
    assert.strictEqual(errorMsg.textContent, 'Please enter a valid positive number.');
    toggleBtn.click();
    assert.strictEqual(toggleBtn.textContent, 'Start Timer', 'Timer must not start on invalid input 0');
    assert.strictEqual(redLight.classList.contains('active'), false, 'Red light must not illuminate');
    assert.strictEqual(ui.timer.isRunning(), false);

    // Input negative value -5
    input.type('-5');
    assert.strictEqual(errorMsg.textContent, 'Please enter a valid positive number.');
    toggleBtn.click();
    assert.strictEqual(toggleBtn.textContent, 'Start Timer', 'Timer must not start on invalid input -5');
    assert.strictEqual(ui.timer.isRunning(), false);

    // Empty input
    input.type('');
    assert.strictEqual(errorMsg.textContent, 'Please enter a valid positive number.');
    toggleBtn.click();
    assert.strictEqual(toggleBtn.textContent, 'Start Timer');
    assert.strictEqual(ui.timer.isRunning(), false);
});

e2eTest('REQ-2-01', 'Entering a valid positive interval clears error message and updates interval', ({ doc, ui }) => {
    const input = doc.getElementById('timer-interval-input');
    const errorMsg = doc.getElementById('timer-error-msg');

    // Introduce invalid state
    input.type('0');
    assert.ok(errorMsg.textContent.length > 0);

    // Update with valid positive interval
    input.type('2');
    assert.strictEqual(errorMsg.textContent, '', 'Error message should be cleared on valid input');
    assert.strictEqual(ui.timer.getInterval(), 2, 'Timer interval should be updated to 2s');
});

e2eTest('REQ-2-01', 'Clicking "Start Timer" toggles text to "Stop Timer", and clicking "Stop Timer" reverts text', ({ doc, ui, clock }) => {
    const toggleBtn = doc.getElementById('timer-toggle-btn');

    toggleBtn.click();
    assert.strictEqual(ui.timer.isRunning(), true, 'Timer should be running');
    assert.strictEqual(toggleBtn.textContent, 'Stop Timer', 'Toggle button text must switch to "Stop Timer"');
    assert.strictEqual(toggleBtn.classList.contains('stop-btn'), true, 'Toggle button must have "stop-btn" class');

    toggleBtn.click();
    assert.strictEqual(ui.timer.isRunning(), false, 'Timer should be stopped');
    assert.strictEqual(toggleBtn.textContent, 'Start Timer', 'Toggle button text must revert to "Start Timer"');
    assert.strictEqual(toggleBtn.classList.contains('stop-btn'), false, 'Toggle button must remove "stop-btn" class');

    // Verify time tick does not cause cycling when stopped
    clock.tick(10000);
    assert.strictEqual(toggleBtn.textContent, 'Start Timer');
});

// ============================================================================
// SECTION 2: REQ-2-02 Automatic Cycling & Interruption Black-Box Assertions
// ============================================================================
console.log('\n--- Running E2E Test Suite: REQ-2-02 (Automatic Cycling & Manual Interruption) ---');

e2eTest('REQ-2-02', 'Starting timer when no light is on immediately activates Red light', ({ doc, ui }) => {
    const toggleBtn = doc.getElementById('timer-toggle-btn');
    const redLight = doc.getElementById('red-light');
    const yellowLight = doc.getElementById('yellow-light');
    const greenLight = doc.getElementById('green-light');

    // Initial check: all off
    assert.strictEqual(redLight.classList.contains('active'), false);
    assert.strictEqual(yellowLight.classList.contains('active'), false);
    assert.strictEqual(greenLight.classList.contains('active'), false);

    // Click Start Timer
    toggleBtn.click();

    // Red light immediately active
    assert.strictEqual(redLight.classList.contains('active'), true, 'Red light must be active immediately upon start');
    assert.strictEqual(redLight.classList.contains('red'), true, 'Red light must have color class "red"');
    assert.strictEqual(yellowLight.classList.contains('active'), false);
    assert.strictEqual(greenLight.classList.contains('active'), false);
});

e2eTest('REQ-2-02', 'Sequential transitions follow Red -> Green -> Yellow -> Red at configured interval', ({ doc, clock }) => {
    const input = doc.getElementById('timer-interval-input');
    const toggleBtn = doc.getElementById('timer-toggle-btn');
    const redLight = doc.getElementById('red-light');
    const yellowLight = doc.getElementById('yellow-light');
    const greenLight = doc.getElementById('green-light');

    // Configure 2s interval
    input.type('2');
    toggleBtn.click();

    // Step 0: Initial Red
    assert.strictEqual(redLight.classList.contains('active'), true);
    assert.strictEqual(greenLight.classList.contains('active'), false);
    assert.strictEqual(yellowLight.classList.contains('active'), false);

    // After 2s: Red -> Green
    clock.tick(2000);
    assert.strictEqual(redLight.classList.contains('active'), false, 'Red light must deactivate');
    assert.strictEqual(greenLight.classList.contains('active'), true, 'Green light must activate');
    assert.strictEqual(greenLight.classList.contains('green'), true);
    assert.strictEqual(yellowLight.classList.contains('active'), false);

    // After 2s: Green -> Yellow
    clock.tick(2000);
    assert.strictEqual(redLight.classList.contains('active'), false);
    assert.strictEqual(greenLight.classList.contains('active'), false, 'Green light must deactivate');
    assert.strictEqual(yellowLight.classList.contains('active'), true, 'Yellow light must activate');
    assert.strictEqual(yellowLight.classList.contains('yellow'), true);

    // After 2s: Yellow -> Red
    clock.tick(2000);
    assert.strictEqual(redLight.classList.contains('active'), true, 'Red light must activate');
    assert.strictEqual(greenLight.classList.contains('active'), false);
    assert.strictEqual(yellowLight.classList.contains('active'), false, 'Yellow light must deactivate');

    // After 2s: Red -> Green (loop verification)
    clock.tick(2000);
    assert.strictEqual(greenLight.classList.contains('active'), true, 'Green light must activate on 2nd cycle');
    assert.strictEqual(redLight.classList.contains('active'), false);
    assert.strictEqual(yellowLight.classList.contains('active'), false);
});

e2eTest('REQ-2-02', 'Strict mutual exclusion is maintained: exactly one light active at every cycle step', ({ doc, clock }) => {
    const toggleBtn = doc.getElementById('timer-toggle-btn');
    const redLight = doc.getElementById('red-light');
    const yellowLight = doc.getElementById('yellow-light');
    const greenLight = doc.getElementById('green-light');

    toggleBtn.click(); // Start 3s cycle

    for (let step = 0; step < 12; step++) {
        const activeCount = [redLight, yellowLight, greenLight].filter(l => l.classList.contains('active')).length;
        assert.strictEqual(activeCount, 1, `Step ${step}: Exactly one light must be active, found ${activeCount}`);
        clock.tick(3000);
    }
});

e2eTest('REQ-2-02', 'Clicking manual color button while timer is running halts timer immediately and switches button to "Start Timer"', ({ doc, ui, clock }) => {
    const toggleBtn = doc.getElementById('timer-toggle-btn');
    const redLight = doc.getElementById('red-light');
    const yellowLight = doc.getElementById('yellow-light');
    const greenBtn = doc.getElementById('green-btn');
    const greenLight = doc.getElementById('green-light');

    toggleBtn.click(); // Start (Red is active)
    assert.strictEqual(ui.timer.isRunning(), true);
    assert.strictEqual(toggleBtn.textContent, 'Stop Timer');
    assert.strictEqual(redLight.classList.contains('active'), true);

    // Manual click on green button
    greenBtn.click();

    // Assert immediate halt
    assert.strictEqual(ui.timer.isRunning(), false, 'Timer must be stopped immediately');
    assert.strictEqual(toggleBtn.textContent, 'Start Timer', 'Button text must revert to "Start Timer"');
    assert.strictEqual(toggleBtn.classList.contains('stop-btn'), false, 'Button stop-btn class must be removed');
    assert.strictEqual(greenLight.classList.contains('active'), true, 'Green light must be active from manual click');
    assert.strictEqual(redLight.classList.contains('active'), false, 'Red light must be deactivated');

    // Verify timer does not transition automatically
    clock.tick(15000);
    assert.strictEqual(greenLight.classList.contains('active'), true, 'Green light must remain active');
    assert.strictEqual(yellowLight.classList.contains('active'), false);
    assert.strictEqual(redLight.classList.contains('active'), false);
    assert.strictEqual(ui.timer.isRunning(), false);
});

e2eTest('REQ-2-02', 'Clicking Stop Timer button preserves currently active light without further transitions', ({ doc, ui, clock }) => {
    const toggleBtn = doc.getElementById('timer-toggle-btn');
    const redLight = doc.getElementById('red-light');
    const yellowLight = doc.getElementById('yellow-light');
    const greenLight = doc.getElementById('green-light');

    toggleBtn.click(); // Starts at Red
    clock.tick(3000);  // Advances to Green
    assert.strictEqual(greenLight.classList.contains('active'), true);

    // Click Stop Timer
    toggleBtn.click();
    assert.strictEqual(ui.timer.isRunning(), false);
    assert.strictEqual(toggleBtn.textContent, 'Start Timer');
    assert.strictEqual(greenLight.classList.contains('active'), true, 'Green light must remain active after stopping');

    // Advance 20 seconds - verify no change occurs
    clock.tick(20000);
    assert.strictEqual(greenLight.classList.contains('active'), true, 'Green light must persist indefinitely');
    assert.strictEqual(redLight.classList.contains('active'), false);
    assert.strictEqual(yellowLight.classList.contains('active'), false);
});

// ============================================================================
// SECTION 3: Regression Suite for REQ-1-01 and REQ-1-02
// ============================================================================
console.log('\n--- Running Regression E2E Test Suite: REQ-1-01 & REQ-1-02 ---');

e2eTest('REQ-1-01', 'Initial vertical layout contains 3 lights and 3 buttons all off by default', ({ doc }) => {
    const redLight = doc.getElementById('red-light');
    const yellowLight = doc.getElementById('yellow-light');
    const greenLight = doc.getElementById('green-light');
    const redBtn = doc.getElementById('red-btn');
    const yellowBtn = doc.getElementById('yellow-btn');
    const greenBtn = doc.getElementById('green-btn');

    assert.ok(redLight && yellowLight && greenLight, 'All 3 light elements must exist');
    assert.ok(redBtn && yellowBtn && greenBtn, 'All 3 button elements must exist');

    assert.strictEqual(redLight.classList.contains('active'), false);
    assert.strictEqual(yellowLight.classList.contains('active'), false);
    assert.strictEqual(greenLight.classList.contains('active'), false);
});

e2eTest('REQ-1-02', 'Manual button clicks toggle lights on/off and enforce mutual exclusion', ({ doc }) => {
    const redBtn = doc.getElementById('red-btn');
    const yellowBtn = doc.getElementById('yellow-btn');
    const redLight = doc.getElementById('red-light');
    const yellowLight = doc.getElementById('yellow-light');

    // Click Red -> on
    redBtn.click();
    assert.strictEqual(redLight.classList.contains('active'), true);
    assert.strictEqual(yellowLight.classList.contains('active'), false);

    // Click Yellow -> Yellow on, Red off
    yellowBtn.click();
    assert.strictEqual(yellowLight.classList.contains('active'), true);
    assert.strictEqual(redLight.classList.contains('active'), false);

    // Click Yellow again -> off
    yellowBtn.click();
    assert.strictEqual(yellowLight.classList.contains('active'), false);
    assert.strictEqual(redLight.classList.contains('active'), false);
});

// ============================================================================
// FINAL EXECUTION SUMMARY
// ============================================================================
console.log('\n======================================================================');
console.log('                 E2E TEST RUNNER EXECUTION SUMMARY                     ');
console.log('======================================================================');
console.log(`Total E2E Tests:  ${totalTests}`);
console.log(`Passed Tests:     ${passedTests}`);
console.log(`Failed Tests:     ${failedTests}`);
console.log('======================================================================\n');

if (failedTests > 0) {
    console.error(`E2E TEST RUN FAILED with ${failedTests} failure(s).`);
    process.exit(1);
} else {
    console.log('ALL E2E BLACK-BOX TESTS PASSED SUCCESSFULLY! ✓');
    process.exit(0);
}

/**
 * White-box unit and integration tests for Traffic Light Timer controls and cycling logic.
 * Covers requirements REQ-2-01 and REQ-2-02.
 * 
 * Traceability:
 * @req_id: REQ-2-01 - Timer Input Configuration and Controls
 * @req_id: REQ-2-02 - Automatic Color Switching Cycle and Manual Interruption Logic
 */

const assert = require('assert');

// ============================================================================
// Test Mock Framework: DOM and Clock Abstractions
// ============================================================================

class DOMTokenList {
    constructor() {
        this.classes = new Set();
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

class MockElement {
    constructor(id) {
        this.id = id;
        this.classList = new DOMTokenList();
        this.listeners = {};
        this.value = (id === 'timer-interval-input') ? '3' : '';
        this.textContent = (id === 'timer-toggle-btn') ? 'Start Timer' : '';
    }

    addEventListener(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    trigger(event, eventObj = {}) {
        if (this.listeners[event]) {
            const callbacks = [...this.listeners[event]];
            callbacks.forEach(cb => cb(eventObj));
        }
    }

    click() {
        this.trigger('click');
    }

    input(newValue) {
        this.value = newValue;
        this.trigger('input');
    }
}

class MockDocument {
    constructor() {
        this.elements = new Map();
        this.listeners = {};
    }

    getElementById(id) {
        if (!this.elements.has(id)) {
            this.elements.set(id, new MockElement(id));
        }
        return this.elements.get(id);
    }

    addEventListener(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    reset() {
        this.elements.clear();
        this.listeners = {};
    }
}

class MockClock {
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

    getTimerCount() {
        return this.intervals.size;
    }
}

// Global test fixtures
const mockDoc = new MockDocument();
global.document = mockDoc;
const clock = new MockClock();

const { TrafficLightState, TrafficLightTimer, TrafficLightUI } = require('../../Code/app');

// ============================================================================
// Test Suite Runner
// ============================================================================

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function test(reqTag, description, testFn) {
    totalTests++;
    clock.install();
    mockDoc.reset();
    try {
        testFn();
        passedTests++;
        console.log(`  ✓ [${reqTag}] ${description}`);
    } catch (err) {
        failedTests++;
        console.error(`  ✗ [${reqTag}] ${description}`);
        console.error(`    Error: ${err.message}`);
        failures.push({ reqTag, description, error: err });
    } finally {
        clock.uninstall();
    }
}

// ============================================================================
// REQ-2-01: Timer Input Configuration and Lifecycle Unit Tests
// ============================================================================

console.log('\n=== Running REQ-2-01: TrafficLightTimer Configuration & Controls Tests ===');

/**
 * @req_id: REQ-2-01
 */
test('REQ-2-01', 'TrafficLightTimer defaults interval to 3 seconds when initialized with no options', () => {
    const state = new TrafficLightState();
    const timer = new TrafficLightTimer(state);
    assert.strictEqual(timer.getInterval(), 3, 'Default interval must be 3 seconds');
    assert.strictEqual(timer.isRunning(), false, 'Timer should not be running upon construction');
    assert.strictEqual(timer.getIsRunning(), false, 'getIsRunning() alias must return false initially');
});

/**
 * @req_id: REQ-2-01
 */
test('REQ-2-01', 'TrafficLightTimer accepts custom initial interval in constructor options', () => {
    const state = new TrafficLightState();
    const timer = new TrafficLightTimer(state, { interval: 5 });
    assert.strictEqual(timer.getInterval(), 5, 'Constructor options.interval must be applied');
});

/**
 * @req_id: REQ-2-01
 */
test('REQ-2-01', 'setInterval updates interval with valid positive integers and floats', () => {
    const state = new TrafficLightState();
    const timer = new TrafficLightTimer(state);

    assert.strictEqual(timer.setInterval(4), true, 'Valid positive integer should return true');
    assert.strictEqual(timer.getInterval(), 4, 'Interval should be updated to 4');

    assert.strictEqual(timer.setInterval(1.5), true, 'Valid positive decimal should return true');
    assert.strictEqual(timer.getInterval(), 1.5, 'Interval should be updated to 1.5');

    assert.strictEqual(timer.setInterval('2.5'), true, 'Valid positive numeric string should return true');
    assert.strictEqual(timer.getInterval(), 2.5, 'Interval should be updated to 2.5');
});

/**
 * @req_id: REQ-2-01
 */
test('REQ-2-01', 'setInterval rejects non-positive numbers (<= 0) and preserves previous valid interval', () => {
    const state = new TrafficLightState();
    const timer = new TrafficLightTimer(state);
    timer.setInterval(5);

    assert.strictEqual(timer.setInterval(0), false, 'Zero interval must return false');
    assert.strictEqual(timer.getInterval(), 5, 'Interval must remain 5 after zero rejection');

    assert.strictEqual(timer.setInterval(-1), false, 'Negative interval must return false');
    assert.strictEqual(timer.getInterval(), 5, 'Interval must remain 5 after negative rejection');

    assert.strictEqual(timer.setInterval(-0.5), false, 'Negative decimal interval must return false');
    assert.strictEqual(timer.getInterval(), 5, 'Interval must remain 5');
});

/**
 * @req_id: REQ-2-01
 */
test('REQ-2-01', 'setInterval rejects non-numeric and non-finite inputs, preserving previous interval', () => {
    const state = new TrafficLightState();
    const timer = new TrafficLightTimer(state);
    timer.setInterval(3);

    const invalidInputs = [NaN, 'abc', '', '   ', null, undefined, Infinity, -Infinity, {}, []];
    for (const invalid of invalidInputs) {
        assert.strictEqual(timer.setInterval(invalid), false, `Input ${String(invalid)} must be rejected`);
        assert.strictEqual(timer.getInterval(), 3, `Interval must remain 3 after rejecting ${String(invalid)}`);
    }
});

/**
 * @req_id: REQ-2-01
 */
test('REQ-2-01', 'start(customInterval) sets valid interval and initiates timer', () => {
    const state = new TrafficLightState();
    const timer = new TrafficLightTimer(state);

    const success = timer.start(7);
    assert.strictEqual(success, true, 'start(7) should succeed');
    assert.strictEqual(timer.getInterval(), 7, 'Interval should be updated to 7');
    assert.strictEqual(timer.isRunning(), true, 'Timer should be running');
    assert.strictEqual(timer.getIsRunning(), true, 'getIsRunning() should return true');
    timer.stop();
});

/**
 * @req_id: REQ-2-01
 */
test('REQ-2-01', 'start(customInterval) rejects invalid custom intervals and does not start', () => {
    const state = new TrafficLightState();
    const timer = new TrafficLightTimer(state);

    assert.strictEqual(timer.start(-2), false, 'start(-2) should fail');
    assert.strictEqual(timer.isRunning(), false, 'Timer must not be running after invalid start');
    assert.strictEqual(timer.getInterval(), 3, 'Interval must remain default 3');

    assert.strictEqual(timer.start('invalid'), false, 'start("invalid") should fail');
    assert.strictEqual(timer.isRunning(), false, 'Timer must not be running');
});

/**
 * @req_id: REQ-2-01
 */
test('REQ-2-01', 'start and stop toggle running state and clear active intervals', () => {
    const state = new TrafficLightState();
    let stopCallbackFired = false;
    const timer = new TrafficLightTimer(state, {
        onStop: () => { stopCallbackFired = true; }
    });

    assert.strictEqual(timer.isRunning(), false);
    timer.start();
    assert.strictEqual(timer.isRunning(), true);
    assert.strictEqual(timer.getIsRunning(), true);
    assert.strictEqual(clock.getTimerCount(), 1, 'Mock clock should have 1 active interval');

    timer.stop();
    assert.strictEqual(timer.isRunning(), false);
    assert.strictEqual(timer.getIsRunning(), false);
    assert.strictEqual(clock.getTimerCount(), 0, 'Active interval should be cleared upon stop');
    assert.strictEqual(stopCallbackFired, true, 'onStop callback should have fired');
});

/**
 * @req_id: REQ-2-01
 */
test('REQ-2-01', 'calling start() when already running returns true without creating redundant intervals', () => {
    const state = new TrafficLightState();
    const timer = new TrafficLightTimer(state);

    timer.start();
    assert.strictEqual(timer.isRunning(), true);
    assert.strictEqual(clock.getTimerCount(), 1);

    const secondStart = timer.start();
    assert.strictEqual(secondStart, true);
    assert.strictEqual(timer.isRunning(), true);
    assert.strictEqual(clock.getTimerCount(), 1, 'Should not create duplicate interval timer');
    timer.stop();
});

/**
 * @req_id: REQ-2-01
 */
test('REQ-2-01', 'calling stop() when not running is safe and does not error', () => {
    const state = new TrafficLightState();
    const timer = new TrafficLightTimer(state);

    assert.doesNotThrow(() => timer.stop(), 'stop() on stopped timer should not throw');
    assert.strictEqual(timer.isRunning(), false);
});

/**
 * @req_id: REQ-2-01
 */
test('REQ-2-01', 'updating interval dynamically while running restarts active interval with new period', () => {
    const state = new TrafficLightState();
    const transitions = [];
    const timer = new TrafficLightTimer(state, {
        interval: 2,
        onTick: (c) => transitions.push(c)
    });

    timer.start(); // initial illumination to 'red'
    assert.deepStrictEqual(transitions, ['red']);

    // Advance 2s -> green
    clock.tick(2000);
    assert.deepStrictEqual(transitions, ['red', 'green']);

    // Update interval to 5 seconds dynamically while running
    const updated = timer.setInterval(5);
    assert.strictEqual(updated, true);
    assert.strictEqual(timer.getInterval(), 5);

    // Advance 2s -> should NOT transition yet (new period is 5s)
    clock.tick(2000);
    assert.deepStrictEqual(transitions, ['red', 'green'], 'Should not transition after only 2s on 5s interval');

    // Advance remaining 3s (total 5s) -> transitions to yellow
    clock.tick(3000);
    assert.deepStrictEqual(transitions, ['red', 'green', 'yellow'], 'Should transition after full 5s period');

    timer.stop();
});

// ============================================================================
// REQ-2-02: Automatic Cycle Sequencing & Interruption Unit Tests
// ============================================================================

console.log('\n=== Running REQ-2-02: Automatic Cycle Sequencing & Interruption Logic Tests ===');

/**
 * @req_id: REQ-2-02
 */
test('REQ-2-02', 'getNextColor deterministically advances sequence Red -> Green -> Yellow -> Red', () => {
    const state = new TrafficLightState();
    const timer = new TrafficLightTimer(state);

    assert.strictEqual(timer.getNextColor('red'), 'green', 'Red must transition to Green');
    assert.strictEqual(timer.getNextColor('green'), 'yellow', 'Green must transition to Yellow');
    assert.strictEqual(timer.getNextColor('yellow'), 'red', 'Yellow must transition to Red');
    assert.strictEqual(timer.getNextColor(null), 'red', 'Null state must transition to Red');
    assert.strictEqual(timer.getNextColor('unknown'), 'red', 'Unrecognized state must transition to Red');
});

/**
 * @req_id: REQ-2-02
 */
test('REQ-2-02', 'start() illuminates Red immediately if no light is currently active', () => {
    const state = new TrafficLightState();
    assert.strictEqual(state.getActiveLight(), null);

    let callbackColor = null;
    const timer = new TrafficLightTimer(state, {
        onTick: (color) => { callbackColor = color; }
    });

    timer.start();
    assert.strictEqual(state.getActiveLight(), 'red', 'Red light should illuminate immediately on start when none was active');
    assert.strictEqual(callbackColor, 'red', 'onTick callback must be called with "red" on immediate illumination');
    timer.stop();
});

/**
 * @req_id: REQ-2-02
 */
test('REQ-2-02', 'start() leaves active light intact if a light is already active', () => {
    const state = new TrafficLightState();
    state.setActiveLight('yellow');

    let onTickFired = false;
    const timer = new TrafficLightTimer(state, {
        onTick: () => { onTickFired = true; }
    });

    timer.start();
    assert.strictEqual(state.getActiveLight(), 'yellow', 'Yellow should remain active when starting');
    assert.strictEqual(onTickFired, false, 'onTick should not fire immediately if light was already active');
    timer.stop();
});

/**
 * @req_id: REQ-2-02
 */
test('REQ-2-02', 'step() and tick() advance state sequentially and invoke onTick callback', () => {
    const state = new TrafficLightState();
    const transitions = [];
    const timer = new TrafficLightTimer(state, {
        onTick: (c) => transitions.push(c)
    });

    state.setActiveLight('red');
    const step1 = timer.step();
    assert.strictEqual(step1, 'green');
    assert.strictEqual(state.getActiveLight(), 'green');

    const step2 = timer.tick();
    assert.strictEqual(step2, 'yellow');
    assert.strictEqual(state.getActiveLight(), 'yellow');

    const step3 = timer.step();
    assert.strictEqual(step3, 'red');
    assert.strictEqual(state.getActiveLight(), 'red');

    assert.deepStrictEqual(transitions, ['green', 'yellow', 'red']);
});

/**
 * @req_id: REQ-2-02
 */
test('REQ-2-02', 'step() from null state initializes to Red', () => {
    const state = new TrafficLightState();
    const timer = new TrafficLightTimer(state);

    assert.strictEqual(state.getActiveLight(), null);
    const result = timer.step();
    assert.strictEqual(result, 'red');
    assert.strictEqual(state.getActiveLight(), 'red');
});

/**
 * @req_id: REQ-2-02
 */
test('REQ-2-02', 'autonomous cycling adheres to Red -> Green -> Yellow -> Red across multiple cycles', () => {
    const state = new TrafficLightState();
    const recordedColors = [];
    const timer = new TrafficLightTimer(state, {
        interval: 3,
        onTick: (c) => recordedColors.push(c)
    });

    // Start with all lights off -> immediate Red
    timer.start();
    assert.deepStrictEqual(recordedColors, ['red']);

    // Tick 1 (3s) -> Green
    clock.tick(3000);
    assert.deepStrictEqual(recordedColors, ['red', 'green']);

    // Tick 2 (3s) -> Yellow
    clock.tick(3000);
    assert.deepStrictEqual(recordedColors, ['red', 'green', 'yellow']);

    // Tick 3 (3s) -> Red
    clock.tick(3000);
    assert.deepStrictEqual(recordedColors, ['red', 'green', 'yellow', 'red']);

    // Tick 4 (3s) -> Green
    clock.tick(3000);
    assert.deepStrictEqual(recordedColors, ['red', 'green', 'yellow', 'red', 'green']);

    // Tick 5 (3s) -> Yellow
    clock.tick(3000);
    assert.deepStrictEqual(recordedColors, ['red', 'green', 'yellow', 'red', 'green', 'yellow']);

    // Tick 6 (3s) -> Red
    clock.tick(3000);
    assert.deepStrictEqual(recordedColors, ['red', 'green', 'yellow', 'red', 'green', 'yellow', 'red']);

    timer.stop();
});

/**
 * @req_id: REQ-2-02
 */
test('REQ-2-02', 'mutual exclusion is strictly preserved: exactly one light is active at every tick', () => {
    const state = new TrafficLightState();
    const timer = new TrafficLightTimer(state, { interval: 1 });

    timer.start();
    for (let i = 0; i < 15; i++) {
        const active = state.getActiveLight();
        assert.ok(['red', 'yellow', 'green'].includes(active), `Active light must be a valid color, got ${active}`);
        clock.tick(1000);
    }
    timer.stop();
});

/**
 * @req_id: REQ-2-02
 */
test('REQ-2-02', 'stopping timer leaves active light intact without advancing further in time', () => {
    const state = new TrafficLightState();
    const timer = new TrafficLightTimer(state, { interval: 3 });

    timer.start(); // Red
    clock.tick(3000); // Green
    assert.strictEqual(state.getActiveLight(), 'green');

    // Stop timer
    timer.stop();
    assert.strictEqual(timer.isRunning(), false);
    assert.strictEqual(state.getActiveLight(), 'green', 'Green light must remain active after stopping timer');

    // Advance time significantly
    clock.tick(15000);
    assert.strictEqual(state.getActiveLight(), 'green', 'Light must not advance when timer is stopped');
});

// ============================================================================
// REQ-2-01 & REQ-2-02: TrafficLightUI Integration Tests
// ============================================================================

console.log('\n=== Running TrafficLightUI DOM & Controller Integration Tests ===');

/**
 * @req_id: REQ-2-01
 */
test('REQ-2-01', 'TrafficLightUI initializes with interval input value 3, "Start Timer" button, and no error', () => {
    const ui = new TrafficLightUI();
    const intervalInput = mockDoc.getElementById('timer-interval-input');
    const toggleBtn = mockDoc.getElementById('timer-toggle-btn');
    const errorMsg = mockDoc.getElementById('timer-error-msg');

    assert.strictEqual(intervalInput.value, '3', 'Input should default to 3');
    assert.strictEqual(toggleBtn.textContent, 'Start Timer', 'Button should display "Start Timer"');
    assert.strictEqual(toggleBtn.classList.contains('stop-btn'), false, 'Button should not have stop-btn class');
    assert.strictEqual(errorMsg.textContent, '', 'Error message should be empty');
    assert.strictEqual(ui.timer.getInterval(), 3, 'Timer instance interval should be 3');
});

/**
 * @req_id: REQ-2-01
 */
test('REQ-2-01', 'TrafficLightUI.validateInterval enforces positive finite numbers strictly', () => {
    const ui = new TrafficLightUI();

    assert.strictEqual(ui.validateInterval('3'), true);
    assert.strictEqual(ui.validateInterval(3), true);
    assert.strictEqual(ui.validateInterval('0.5'), true);
    assert.strictEqual(ui.validateInterval(10), true);

    assert.strictEqual(ui.validateInterval('0'), false);
    assert.strictEqual(ui.validateInterval(0), false);
    assert.strictEqual(ui.validateInterval('-1'), false);
    assert.strictEqual(ui.validateInterval(-5), false);
    assert.strictEqual(ui.validateInterval(''), false);
    assert.strictEqual(ui.validateInterval('abc'), false);
    assert.strictEqual(ui.validateInterval(null), false);
    assert.strictEqual(ui.validateInterval(undefined), false);
    assert.strictEqual(ui.validateInterval(NaN), false);
});

/**
 * @req_id: REQ-2-01
 */
test('REQ-2-01', 'UI handles valid interval input: updates timer interval and clears error message', () => {
    const ui = new TrafficLightUI();
    const intervalInput = mockDoc.getElementById('timer-interval-input');
    const errorMsg = mockDoc.getElementById('timer-error-msg');

    intervalInput.input('5');
    assert.strictEqual(errorMsg.textContent, '', 'Error message should be cleared');
    assert.strictEqual(ui.timer.getInterval(), 5, 'Timer interval should be updated to 5');

    intervalInput.input('1.5');
    assert.strictEqual(errorMsg.textContent, '');
    assert.strictEqual(ui.timer.getInterval(), 1.5, 'Timer interval should be updated to 1.5');
});

/**
 * @req_id: REQ-2-01
 */
test('REQ-2-01', 'UI handles invalid interval input: displays validation error and preserves timer interval', () => {
    const ui = new TrafficLightUI();
    const intervalInput = mockDoc.getElementById('timer-interval-input');
    const errorMsg = mockDoc.getElementById('timer-error-msg');

    intervalInput.input('4'); // valid
    assert.strictEqual(ui.timer.getInterval(), 4);

    intervalInput.input('-2'); // invalid negative
    assert.strictEqual(errorMsg.textContent, 'Please enter a valid positive number.');
    assert.strictEqual(ui.timer.getInterval(), 4, 'Timer interval should retain previous valid value');

    intervalInput.input('0'); // invalid zero
    assert.strictEqual(errorMsg.textContent, 'Please enter a valid positive number.');
    assert.strictEqual(ui.timer.getInterval(), 4);

    intervalInput.input('not-a-number'); // invalid NaN
    assert.strictEqual(errorMsg.textContent, 'Please enter a valid positive number.');
    assert.strictEqual(ui.timer.getInterval(), 4);
});

/**
 * @req_id: REQ-2-01
 */
test('REQ-2-01', 'clicking "Start Timer" button starts cycling and updates button label to "Stop Timer"', () => {
    const ui = new TrafficLightUI();
    const toggleBtn = mockDoc.getElementById('timer-toggle-btn');
    const errorMsg = mockDoc.getElementById('timer-error-msg');

    toggleBtn.click();
    assert.strictEqual(ui.timer.isRunning(), true, 'Timer should be running');
    assert.strictEqual(toggleBtn.textContent, 'Stop Timer', 'Button text should be "Stop Timer"');
    assert.strictEqual(toggleBtn.classList.contains('stop-btn'), true, 'Button should have stop-btn class');
    assert.strictEqual(errorMsg.textContent, '', 'Error message should be empty');

    // Click again to stop
    toggleBtn.click();
    assert.strictEqual(ui.timer.isRunning(), false, 'Timer should be stopped');
    assert.strictEqual(toggleBtn.textContent, 'Start Timer', 'Button text should be "Start Timer"');
    assert.strictEqual(toggleBtn.classList.contains('stop-btn'), false, 'stop-btn class should be removed');
});

/**
 * @req_id: REQ-2-01
 */
test('REQ-2-01', 'clicking "Start Timer" with invalid input does not start timer and displays error', () => {
    const ui = new TrafficLightUI();
    const intervalInput = mockDoc.getElementById('timer-interval-input');
    const toggleBtn = mockDoc.getElementById('timer-toggle-btn');
    const errorMsg = mockDoc.getElementById('timer-error-msg');

    intervalInput.value = '-5';
    toggleBtn.click();

    assert.strictEqual(ui.timer.isRunning(), false, 'Timer should not start with invalid interval');
    assert.strictEqual(toggleBtn.textContent, 'Start Timer', 'Button should remain "Start Timer"');
    assert.strictEqual(errorMsg.textContent, 'Please enter a valid positive number.', 'Error message should be shown');
});

/**
 * @req_id: REQ-2-02
 */
test('REQ-2-02', 'starting timer from all-off state illuminates Red light circle in the DOM immediately', () => {
    const ui = new TrafficLightUI();
    const toggleBtn = mockDoc.getElementById('timer-toggle-btn');
    const redLight = mockDoc.getElementById('red-light');
    const yellowLight = mockDoc.getElementById('yellow-light');
    const greenLight = mockDoc.getElementById('green-light');

    assert.strictEqual(redLight.classList.contains('active'), false);
    assert.strictEqual(yellowLight.classList.contains('active'), false);
    assert.strictEqual(greenLight.classList.contains('active'), false);

    toggleBtn.click(); // Start timer
    assert.strictEqual(redLight.classList.contains('active'), true, 'Red light must have active class');
    assert.strictEqual(redLight.classList.contains('red'), true, 'Red light must have red color class');
    assert.strictEqual(yellowLight.classList.contains('active'), false, 'Yellow must be off');
    assert.strictEqual(greenLight.classList.contains('active'), false, 'Green must be off');

    toggleBtn.click(); // Stop timer
});

/**
 * @req_id: REQ-2-02
 */
test('REQ-2-02', 'DOM rendering strictly maintains mutual exclusion across automatic transitions', () => {
    const ui = new TrafficLightUI();
    const toggleBtn = mockDoc.getElementById('timer-toggle-btn');
    const redLight = mockDoc.getElementById('red-light');
    const yellowLight = mockDoc.getElementById('yellow-light');
    const greenLight = mockDoc.getElementById('green-light');

    toggleBtn.click(); // Started: Red illuminated
    assert.strictEqual(redLight.classList.contains('active'), true);

    // Transition 1 -> Green
    clock.tick(3000);
    assert.strictEqual(redLight.classList.contains('active'), false, 'Red must be deactivated');
    assert.strictEqual(greenLight.classList.contains('active'), true, 'Green must be activated');
    assert.strictEqual(yellowLight.classList.contains('active'), false, 'Yellow must be inactive');

    // Transition 2 -> Yellow
    clock.tick(3000);
    assert.strictEqual(redLight.classList.contains('active'), false);
    assert.strictEqual(greenLight.classList.contains('active'), false, 'Green must be deactivated');
    assert.strictEqual(yellowLight.classList.contains('active'), true, 'Yellow must be activated');

    // Transition 3 -> Red
    clock.tick(3000);
    assert.strictEqual(redLight.classList.contains('active'), true, 'Red must be activated');
    assert.strictEqual(greenLight.classList.contains('active'), false);
    assert.strictEqual(yellowLight.classList.contains('active'), false);

    toggleBtn.click(); // Stop
});

/**
 * @req_id: REQ-2-02
 */
test('REQ-2-02', 'clicking manual color button immediately halts running timer and updates button controls', () => {
    const ui = new TrafficLightUI();
    const toggleBtn = mockDoc.getElementById('timer-toggle-btn');
    const redLight = mockDoc.getElementById('red-light');
    const greenLight = mockDoc.getElementById('green-light');
    const greenBtn = mockDoc.getElementById('green-btn');

    toggleBtn.click(); // Start timer (Red is active)
    assert.strictEqual(ui.timer.isRunning(), true);
    assert.strictEqual(redLight.classList.contains('active'), true);

    // Manual click on green button while timer is running
    greenBtn.click();

    assert.strictEqual(ui.timer.isRunning(), false, 'Timer must be stopped immediately upon manual button click');
    assert.strictEqual(toggleBtn.textContent, 'Start Timer', 'Timer button should revert to "Start Timer"');
    assert.strictEqual(toggleBtn.classList.contains('stop-btn'), false, 'stop-btn class should be removed');
    assert.strictEqual(greenLight.classList.contains('active'), true, 'Green light must now be active');
    assert.strictEqual(redLight.classList.contains('active'), false, 'Red light must now be inactive');

    // Verify timer does NOT advance automatically anymore
    clock.tick(10000);
    assert.strictEqual(greenLight.classList.contains('active'), true, 'Green light must remain active');
    assert.strictEqual(ui.timer.isRunning(), false);
});

/**
 * @req_id: REQ-2-02
 */
test('REQ-2-02', 'clicking manual button of currently active color turns off light and halts running timer', () => {
    const ui = new TrafficLightUI();
    const toggleBtn = mockDoc.getElementById('timer-toggle-btn');
    const redLight = mockDoc.getElementById('red-light');
    const redBtn = mockDoc.getElementById('red-btn');

    toggleBtn.click(); // Starts timer -> Red is active
    assert.strictEqual(ui.timer.isRunning(), true);
    assert.strictEqual(redLight.classList.contains('active'), true);

    // Click red button to toggle it off
    redBtn.click();

    assert.strictEqual(ui.timer.isRunning(), false, 'Timer must halt immediately');
    assert.strictEqual(toggleBtn.textContent, 'Start Timer');
    assert.strictEqual(redLight.classList.contains('active'), false, 'Red light must be turned off');
    assert.strictEqual(ui.state.getActiveLight(), null, 'No light should be active');

    clock.tick(10000);
    assert.strictEqual(ui.state.getActiveLight(), null, 'Should remain all lights off');
});

/**
 * @req_id: REQ-2-02
 */
test('REQ-2-02', 'stopping timer via "Stop Timer" button leaves currently active light illuminated in DOM', () => {
    const ui = new TrafficLightUI();
    const toggleBtn = mockDoc.getElementById('timer-toggle-btn');
    const yellowLight = mockDoc.getElementById('yellow-light');

    toggleBtn.click(); // Start (Red)
    clock.tick(3000); // -> Green
    clock.tick(3000); // -> Yellow
    assert.strictEqual(yellowLight.classList.contains('active'), true);

    toggleBtn.click(); // Click "Stop Timer"
    assert.strictEqual(ui.timer.isRunning(), false);
    assert.strictEqual(toggleBtn.textContent, 'Start Timer');
    assert.strictEqual(yellowLight.classList.contains('active'), true, 'Yellow light must remain active after stopping');

    clock.tick(10000);
    assert.strictEqual(yellowLight.classList.contains('active'), true, 'Yellow light must stay unchanged');
});

// ============================================================================
// Test Execution Summary
// ============================================================================

console.log('\n========================================');
console.log('       UNIT TEST EXECUTION REPORT       ');
console.log('========================================');
console.log(`Total Tests Run:  ${totalTests}`);
console.log(`Passed:           ${passedTests}`);
console.log(`Failed:           ${failedTests}`);
console.log('========================================\n');

if (failedTests > 0) {
    console.error(`FAILURE: ${failedTests} test(s) failed:`);
    failures.forEach((f, idx) => {
        console.error(`${idx + 1}. [${f.reqTag}] ${f.description}: ${f.error.message}`);
    });
    process.exit(1);
} else {
    console.log('ALL TIMER UNIT TESTS PASSED SUCCESSFULLY! ✓');
    process.exit(0);
}

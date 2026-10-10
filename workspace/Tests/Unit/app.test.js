const assert = require('assert');

// Mock DOM
class DOMTokenList {
    constructor() {
        this.classes = new Set();
    }
    add(...tokens) { tokens.forEach(t => this.classes.add(t)); }
    remove(...tokens) { tokens.forEach(t => this.classes.delete(t)); }
    contains(token) { return this.classes.has(token); }
}

class MockElement {
    constructor(id) {
        this.id = id;
        this.classList = new DOMTokenList();
        this.listeners = {};
    }
    addEventListener(event, callback) {
        this.listeners[event] = callback;
    }
    click() {
        if (this.listeners['click']) {
            this.listeners['click']();
        }
    }
}

global.document = {
    elements: {},
    getElementById(id) {
        if (!this.elements[id]) {
            this.elements[id] = new MockElement(id);
        }
        return this.elements[id];
    },
    addEventListener(event, callback) {
        // mock document event listener
    },
    reset() {
        this.elements = {};
    }
};

const { TrafficLightState, TrafficLightUI } = require('../../Code/app');

async function runTests() {
    console.log('Running TrafficLightState Tests...');
    let state = new TrafficLightState();
    
    // Test 1
    assert.strictEqual(state.getActiveLight(), null, 'Should initialize with no active light');
    
    // Test 2
    state.toggleLight('red');
    assert.strictEqual(state.getActiveLight(), 'red', 'Should set active light to toggled color');
    
    // Test 3
    state.toggleLight('red');
    assert.strictEqual(state.getActiveLight(), null, 'Should turn off if same color toggled');
    
    // Test 4
    state.toggleLight('yellow');
    state.toggleLight('green');
    assert.strictEqual(state.getActiveLight(), 'green', 'Should switch to new color');
    
    console.log('TrafficLightState Tests Passed!');
    
    console.log('Running TrafficLightUI Tests...');
    document.reset();
    let ui = new TrafficLightUI();
    
    const redLight = document.getElementById('red-light');
    const yellowLight = document.getElementById('yellow-light');
    const greenLight = document.getElementById('green-light');
    const redBtn = document.getElementById('red-btn');
    const yellowBtn = document.getElementById('yellow-btn');
    
    // Initial State
    assert.strictEqual(redLight.classList.contains('active'), false);
    assert.strictEqual(yellowLight.classList.contains('active'), false);
    assert.strictEqual(greenLight.classList.contains('active'), false);
    
    // Click Red
    redBtn.click();
    assert.strictEqual(ui.state.getActiveLight(), 'red');
    assert.strictEqual(redLight.classList.contains('active'), true);
    assert.strictEqual(redLight.classList.contains('red'), true);
    assert.strictEqual(yellowLight.classList.contains('active'), false);
    
    // Click Yellow
    yellowBtn.click();
    assert.strictEqual(ui.state.getActiveLight(), 'yellow');
    assert.strictEqual(redLight.classList.contains('active'), false);
    assert.strictEqual(yellowLight.classList.contains('active'), true);
    assert.strictEqual(yellowLight.classList.contains('yellow'), true);
    
    // Click Yellow again
    yellowBtn.click();
    assert.strictEqual(ui.state.getActiveLight(), null);
    assert.strictEqual(yellowLight.classList.contains('active'), false);
    
    console.log('TrafficLightUI Tests Passed!');
    console.log('ALL TESTS PASSED');
}

runTests().catch(err => {
    console.error('TEST FAILED:', err);
    process.exit(1);
});

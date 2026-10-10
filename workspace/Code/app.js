/**
 * Manages the state of the traffic light demonstration.
 * Ensures mutual exclusion of active lights.
 * @req_id: REQ-1-01, REQ-1-02, REQ-2-02
 */
class TrafficLightState {
    constructor() {
        this.activeLight = null;
    }

    /**
     * Toggles a light on or off. If another light is active, switches to the specified color.
     * @req_id: REQ-1-02, REQ-2-02
     * @param {string} color - 'red', 'yellow', or 'green'
     */
    toggleLight(color) {
        if (this.activeLight === color) {
            this.activeLight = null; // Turn off if it's already on
        } else {
            this.activeLight = color; // Turn on new light (and implicitly turn off others)
        }
    }

    /**
     * Sets the active light color explicitly.
     * @req_id: REQ-2-02
     * @param {string|null} color - 'red', 'yellow', 'green', or null
     */
    setActiveLight(color) {
        this.activeLight = color;
    }

    /**
     * Gets the currently active light.
     * @req_id: REQ-1-01, REQ-1-02
     * @returns {string|null} - Current active color or null if all off.
     */
    getActiveLight() {
        return this.activeLight;
    }

    /**
     * Resets state with all lights off.
     * @req_id: REQ-1-01
     */
    reset() {
        this.activeLight = null;
    }
}

/**
 * Autonomous scheduling controller for the traffic light demonstration.
 * Decoupled from the DOM, operates on TrafficLightState via callbacks.
 * @req_id: REQ-2-01, REQ-2-02
 */
class TrafficLightTimer {
    /**
     * Constructs a TrafficLightTimer instance.
     * @req_id: REQ-2-01
     * @param {TrafficLightState} state - Injected TrafficLightState instance.
     * @param {Object} [options={}] - Optional configuration parameters.
     * @param {number} [options.interval=3] - Initial interval duration in seconds.
     * @param {Function} [options.onTick=null] - Callback invoked on state transition.
     * @param {Function} [options.onStop=null] - Callback invoked when timer halts.
     */
    constructor(state, options = {}) {
        this.state = state;
        this.interval = 3;
        this.timerId = null;
        this._isRunning = false;
        this.onTick = typeof options.onTick === 'function' ? options.onTick : null;
        this.onStop = typeof options.onStop === 'function' ? options.onStop : null;

        if (options.interval !== undefined) {
            this.setInterval(options.interval);
        }
    }

    /**
     * Sets the timer interval in seconds. Restarts timer if already running.
     * @req_id: REQ-2-01
     * @param {number} seconds - Positive number of seconds.
     * @returns {boolean} - True if valid and set, false otherwise.
     */
    setInterval(seconds) {
        const val = Number(seconds);
        if (!Number.isFinite(val) || val <= 0) {
            return false;
        }
        this.interval = val;
        if (this._isRunning) {
            if (this.timerId !== null) {
                clearInterval(this.timerId);
            }
            this.timerId = setInterval(() => this.tick(), this.interval * 1000);
        }
        return true;
    }

    /**
     * Gets the configured interval in seconds.
     * @req_id: REQ-2-01
     * @returns {number} - Interval in seconds.
     */
    getInterval() {
        return this.interval;
    }

    /**
     * Checks whether the timer is currently active.
     * @req_id: REQ-2-01
     * @returns {boolean} - True if timer is running, false otherwise.
     */
    isRunning() {
        return this._isRunning;
    }

    /**
     * Alias for isRunning() as specified in architecture.
     * @req_id: REQ-2-01
     * @returns {boolean} - True if timer is running, false otherwise.
     */
    getIsRunning() {
        return this._isRunning;
    }

    /**
     * Determines the next color in the transition cycle: Red -> Green -> Yellow -> Red.
     * Defaults to 'red' if currentColor is null or unrecognized.
     * @req_id: REQ-2-02
     * @param {string|null} currentColor - Current active color or null.
     * @returns {string} - Next color in cycle.
     */
    getNextColor(currentColor) {
        switch (currentColor) {
            case 'red':
                return 'green';
            case 'green':
                return 'yellow';
            case 'yellow':
                return 'red';
            default:
                return 'red';
        }
    }

    /**
     * Advances the traffic light cycle to the next sequential color.
     * @req_id: REQ-2-02
     * @returns {string} - The new active color.
     */
    tick() {
        const current = this.state ? this.state.getActiveLight() : null;
        const nextColor = this.getNextColor(current);
        if (this.state) {
            this.state.setActiveLight(nextColor);
        }
        if (this.onTick) {
            this.onTick(nextColor);
        }
        return nextColor;
    }

    /**
     * Alias for tick() to fulfill architectural step specification.
     * @req_id: REQ-2-02
     * @returns {string} - The new active color.
     */
    step() {
        return this.tick();
    }

    /**
     * Starts the automatic cycling timer.
     * If no light is currently active, starts by illuminating Red immediately.
     * @req_id: REQ-2-01, REQ-2-02
     * @param {number} [customInterval] - Optional interval in seconds.
     * @returns {boolean} - True if started successfully, false if interval invalid.
     */
    start(customInterval) {
        if (customInterval !== undefined) {
            const valid = this.setInterval(customInterval);
            if (!valid) {
                return false;
            }
        } else if (!Number.isFinite(this.interval) || this.interval <= 0) {
            return false;
        }

        if (this._isRunning) {
            return true;
        }

        // If no light is active when timer starts, illuminate Red immediately (REQ-2-02)
        if (this.state && this.state.getActiveLight() === null) {
            this.state.setActiveLight('red');
            if (this.onTick) {
                this.onTick('red');
            }
        }

        this._isRunning = true;
        if (this.timerId !== null) {
            clearInterval(this.timerId);
        }
        this.timerId = setInterval(() => this.tick(), this.interval * 1000);
        return true;
    }

    /**
     * Stops the automatic timer and clears intervals.
     * Preserves current light state.
     * @req_id: REQ-2-01, REQ-2-02
     */
    stop() {
        if (this.timerId !== null) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        this._isRunning = false;
        if (this.onStop) {
            this.onStop();
        }
    }
}

/**
 * Presentation coordinator managing DOM interaction, event bindings, and UI state rendering.
 * @req_id: REQ-1-01, REQ-1-02, REQ-2-01, REQ-2-02
 */
class TrafficLightUI {
    /**
     * Constructs a TrafficLightUI instance and binds elements.
     * @req_id: REQ-2-01, REQ-2-02
     */
    constructor() {
        this.state = new TrafficLightState();
        this.timer = new TrafficLightTimer(this.state, {
            onTick: () => this.render(),
            onStop: () => this.renderTimerControls()
        });

        this.lights = {
            red: typeof document !== 'undefined' ? document.getElementById('red-light') : null,
            yellow: typeof document !== 'undefined' ? document.getElementById('yellow-light') : null,
            green: typeof document !== 'undefined' ? document.getElementById('green-light') : null
        };
        this.buttons = {
            red: typeof document !== 'undefined' ? document.getElementById('red-btn') : null,
            yellow: typeof document !== 'undefined' ? document.getElementById('yellow-btn') : null,
            green: typeof document !== 'undefined' ? document.getElementById('green-btn') : null
        };
        this.intervalInput = typeof document !== 'undefined' ? document.getElementById('timer-interval-input') : null;
        this.timerToggleBtn = typeof document !== 'undefined' ? document.getElementById('timer-toggle-btn') : null;
        this.timerErrorMsg = typeof document !== 'undefined' ? document.getElementById('timer-error-msg') : null;

        this.init();
    }

    /**
     * Initializes event listeners and initial DOM state.
     * @req_id: REQ-1-01, REQ-2-01, REQ-2-02
     */
    init() {
        // Add event listeners for manual light buttons
        for (const [color, button] of Object.entries(this.buttons)) {
            if (button && typeof button.addEventListener === 'function') {
                button.addEventListener('click', () => this.handleButtonClick(color));
            }
        }

        // Add event listener for timer toggle button
        if (this.timerToggleBtn && typeof this.timerToggleBtn.addEventListener === 'function') {
            this.timerToggleBtn.addEventListener('click', () => this.handleTimerToggle());
        }

        // Add event listener for timer interval input
        if (this.intervalInput && typeof this.intervalInput.addEventListener === 'function') {
            this.intervalInput.addEventListener('input', () => this.handleIntervalInput());
        }

        this.render();
        this.renderTimerControls();
    }

    /**
     * Handles manual light button clicks. Halts timer immediately before toggling light.
     * @req_id: REQ-1-02, REQ-2-02
     * @param {string} color - Color clicked ('red', 'yellow', or 'green').
     */
    handleButtonClick(color) {
        if (this.timer) {
            this.timer.stop();
        }
        this.state.toggleLight(color);
        this.render();
        this.renderTimerControls();
    }

    /**
     * Validates if the given value is a positive finite number (> 0).
     * @req_id: REQ-2-01
     * @param {*} value - Value to validate.
     * @returns {boolean} - True if valid positive number.
     */
    validateInterval(value) {
        if (value === null || value === undefined || value === '') {
            return false;
        }
        const num = Number(value);
        return Number.isFinite(num) && num > 0;
    }

    /**
     * Handles interval input changes and displays validation errors if needed.
     * @req_id: REQ-2-01
     */
    handleIntervalInput() {
        if (!this.intervalInput) return;
        const val = this.intervalInput.value;
        if (!this.validateInterval(val)) {
            if (this.timerErrorMsg) {
                this.timerErrorMsg.textContent = 'Please enter a valid positive number.';
            }
        } else {
            if (this.timerErrorMsg) {
                this.timerErrorMsg.textContent = '';
            }
            const intervalSec = parseFloat(val);
            if (this.timer) {
                this.timer.setInterval(intervalSec);
            }
        }
    }

    /**
     * Handles clicks on the Start/Stop Timer button.
     * @req_id: REQ-2-01, REQ-2-02
     */
    handleTimerToggle() {
        if (!this.timer) return;

        if (this.timer.isRunning()) {
            this.timer.stop();
            this.renderTimerControls();
        } else {
            const rawVal = this.intervalInput ? this.intervalInput.value : '3';
            if (!this.validateInterval(rawVal)) {
                if (this.timerErrorMsg) {
                    this.timerErrorMsg.textContent = 'Please enter a valid positive number.';
                }
                return;
            }

            if (this.timerErrorMsg) {
                this.timerErrorMsg.textContent = '';
            }

            const interval = parseFloat(rawVal);
            this.timer.start(interval);
            this.render();
            this.renderTimerControls();
        }
    }

    /**
     * Updates DOM visual states of traffic light elements.
     * @req_id: REQ-1-01, REQ-1-02
     */
    render() {
        const active = this.state.getActiveLight();
        
        for (const [color, lightElement] of Object.entries(this.lights)) {
            if (lightElement && lightElement.classList) {
                if (color === active) {
                    lightElement.classList.add('active', color);
                } else {
                    lightElement.classList.remove('active', color);
                }
            }
        }
    }

    /**
     * Updates timer controls UI (button label and running style).
     * @req_id: REQ-2-01
     */
    renderTimerControls() {
        if (this.timerToggleBtn) {
            if (this.timer && this.timer.isRunning()) {
                this.timerToggleBtn.textContent = 'Stop Timer';
                if (this.timerToggleBtn.classList) {
                    this.timerToggleBtn.classList.add('stop-btn');
                }
            } else {
                this.timerToggleBtn.textContent = 'Start Timer';
                if (this.timerToggleBtn.classList) {
                    this.timerToggleBtn.classList.remove('stop-btn');
                }
            }
        }
    }
}

// Initialize the app when the DOM is fully loaded
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', () => {
        new TrafficLightUI();
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TrafficLightState, TrafficLightTimer, TrafficLightUI };
}

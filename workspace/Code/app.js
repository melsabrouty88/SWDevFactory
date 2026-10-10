class TrafficLightState {
    constructor() {
        this.activeLight = null;
    }

    toggleLight(color) {
        if (this.activeLight === color) {
            this.activeLight = null; // Turn off if it's already on
        } else {
            this.activeLight = color; // Turn on new light (and implicitly turn off others)
        }
    }

    getActiveLight() {
        return this.activeLight;
    }
}

class TrafficLightUI {
    constructor() {
        this.state = new TrafficLightState();
        this.lights = {
            red: document.getElementById('red-light'),
            yellow: document.getElementById('yellow-light'),
            green: document.getElementById('green-light')
        };
        this.buttons = {
            red: document.getElementById('red-btn'),
            yellow: document.getElementById('yellow-btn'),
            green: document.getElementById('green-btn')
        };
        this.init();
    }

    init() {
        // Add event listeners
        for (const [color, button] of Object.entries(this.buttons)) {
            button.addEventListener('click', () => this.handleButtonClick(color));
        }
        this.render(); // Initial render to make sure everything is off
    }

    handleButtonClick(color) {
        this.state.toggleLight(color);
        this.render();
    }

    render() {
        const active = this.state.getActiveLight();
        
        for (const [color, lightElement] of Object.entries(this.lights)) {
            if (color === active) {
                lightElement.classList.add('active', color);
            } else {
                lightElement.classList.remove('active', color);
            }
        }
    }
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    new TrafficLightUI();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TrafficLightState, TrafficLightUI };
}

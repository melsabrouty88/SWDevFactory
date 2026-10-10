/**
 * End-to-End Black-Box Cypress Test Suite for Traffic Light Demonstration - Ticket #2
 * 
 * Traceability:
 * @req_id: REQ-2-01 - Traffic Light Timer Input Configuration and Controls
 * @req_id: REQ-2-02 - Automatic Color Switching Cycle and Manual Interruption Logic
 */

describe('Traffic Light Timer E2E Black-Box Suite', () => {
    beforeEach(() => {
        // Visit the application entry point
        cy.visit('index.html');
    });

    // =========================================================================
    // REQ-2-01: Timer Input Configuration and Controls
    // =========================================================================
    describe('@req_id: REQ-2-01 - Timer Input Configuration and Controls', () => {
        /**
         * Acceptance Criteria:
         * - A numeric text box input allows the user to specify the timer interval in seconds, defaulting to 3 seconds.
         * - A control button labeled "Start Timer" initiates the automatic cycling using the configured interval.
         */
        it('@req_id: REQ-2-01 - Verifies #timer-interval-input attributes, default value of 3s, and "Start Timer" toggle button', () => {
            // Assert timer interval input element existence and HTML attributes
            cy.get('#timer-interval-input')
                .should('exist')
                .and('be.visible')
                .and('have.attr', 'type', 'number')
                .and('have.attr', 'min', '1')
                .and('have.value', '3');

            // Assert timer toggle button exists with initial text "Start Timer"
            cy.get('#timer-toggle-btn')
                .should('exist')
                .and('be.visible')
                .and('have.text', 'Start Timer')
                .and('not.have.class', 'stop-btn');

            // Assert error message container exists and is initially blank
            cy.get('#timer-error-msg')
                .should('exist')
                .and('have.text', '');
        });

        /**
         * Acceptance Criteria:
         * - The timer interval input requires a positive number (greater than 0); non-positive or invalid inputs are prevented or ignored.
         */
        it('@req_id: REQ-2-01 - Entering non-positive (<=0) or invalid inputs displays validation error and does not start cycling', () => {
            // Test 1: Zero input
            cy.get('#timer-interval-input').clear().type('0');
            cy.get('#timer-error-msg')
                .should('be.visible')
                .and('contain.text', 'Please enter a valid positive number');
            
            // Attempt to start with zero
            cy.get('#timer-toggle-btn').click();
            cy.get('#timer-toggle-btn').should('have.text', 'Start Timer');
            cy.get('#red-light').should('not.have.class', 'active');

            // Test 2: Negative input
            cy.get('#timer-interval-input').clear().type('-4');
            cy.get('#timer-error-msg')
                .should('be.visible')
                .and('contain.text', 'Please enter a valid positive number');

            cy.get('#timer-toggle-btn').click();
            cy.get('#timer-toggle-btn').should('have.text', 'Start Timer');
            cy.get('#red-light').should('not.have.class', 'active');

            // Test 3: Empty input
            cy.get('#timer-interval-input').clear();
            cy.get('#timer-error-msg')
                .should('be.visible')
                .and('contain.text', 'Please enter a valid positive number');

            cy.get('#timer-toggle-btn').click();
            cy.get('#timer-toggle-btn').should('have.text', 'Start Timer');
            cy.get('#red-light').should('not.have.class', 'active');
        });

        /**
         * Acceptance Criteria:
         * - Entering valid interval updates configuration and clears any error message.
         */
        it('@req_id: REQ-2-01 - Entering a valid positive interval updates input and clears error message', () => {
            // Introduce invalid state
            cy.get('#timer-interval-input').clear().type('0');
            cy.get('#timer-error-msg').should('not.be.empty');

            // Enter valid positive interval (2s)
            cy.get('#timer-interval-input').clear().type('2');
            cy.get('#timer-interval-input').should('have.value', '2');
            cy.get('#timer-error-msg').should('have.text', '');

            // Enter valid positive interval with float (1.5s)
            cy.get('#timer-interval-input').clear().type('1.5');
            cy.get('#timer-interval-input').should('have.value', '1.5');
            cy.get('#timer-error-msg').should('have.text', '');
        });

        /**
         * Acceptance Criteria:
         * - A control button labeled "Start Timer" initiates the automatic cycling using the configured interval.
         * - When the timer is active, the control button toggles to display "Stop Timer" and halts cycling when clicked.
         */
        it('@req_id: REQ-2-01 - Clicking "Start Timer" toggles button to "Stop Timer", and clicking "Stop Timer" halts cycling and resets label', () => {
            cy.clock();

            // Click Start Timer
            cy.get('#timer-toggle-btn').click();
            cy.get('#timer-toggle-btn')
                .should('have.text', 'Stop Timer')
                .and('have.class', 'stop-btn');

            // Click Stop Timer
            cy.get('#timer-toggle-btn').click();
            cy.get('#timer-toggle-btn')
                .should('have.text', 'Start Timer')
                .and('not.have.class', 'stop-btn');

            // Ensure clock tick does not advance light after stopping
            cy.tick(6000);
            cy.get('#timer-toggle-btn').should('have.text', 'Start Timer');
        });
    });

    // =========================================================================
    // REQ-2-02: Automatic Color Switching Cycle and Manual Interruption Logic
    // =========================================================================
    describe('@req_id: REQ-2-02 - Automatic Color Switching Cycle and Manual Interruption Logic', () => {
        /**
         * Acceptance Criteria:
         * - If no light is active when the timer starts, the cycle begins by illuminating Red.
         */
        it('@req_id: REQ-2-02 - Starting timer with no active light immediately activates Red light', () => {
            cy.clock();

            // Confirm initially all lights are off
            cy.get('#red-light').should('not.have.class', 'active');
            cy.get('#yellow-light').should('not.have.class', 'active');
            cy.get('#green-light').should('not.have.class', 'active');

            // Start timer
            cy.get('#timer-toggle-btn').click();

            // Red light illuminates immediately
            cy.get('#red-light').should('have.class', 'active').and('have.class', 'red');
            cy.get('#yellow-light').should('not.have.class', 'active');
            cy.get('#green-light').should('not.have.class', 'active');
        });

        /**
         * Acceptance Criteria:
         * - While the timer is active, the traffic light sequentially transitions colors in the order: Red -> Green -> Yellow -> Red at the configured interval.
         */
        it('@req_id: REQ-2-02 - Automatically transitions Red -> Green -> Yellow -> Red at configured interval', () => {
            cy.clock();

            // Configure custom 2 second interval
            cy.get('#timer-interval-input').clear().type('2');
            cy.get('#timer-toggle-btn').click();

            // Initial immediate activation: Red
            cy.get('#red-light').should('have.class', 'active').and('have.class', 'red');
            cy.get('#green-light').should('not.have.class', 'active');
            cy.get('#yellow-light').should('not.have.class', 'active');

            // Tick 2000ms: Red -> Green
            cy.tick(2000);
            cy.get('#green-light').should('have.class', 'active').and('have.class', 'green');
            cy.get('#red-light').should('not.have.class', 'active');
            cy.get('#yellow-light').should('not.have.class', 'active');

            // Tick 2000ms: Green -> Yellow
            cy.tick(2000);
            cy.get('#yellow-light').should('have.class', 'active').and('have.class', 'yellow');
            cy.get('#green-light').should('not.have.class', 'active');
            cy.get('#red-light').should('not.have.class', 'active');

            // Tick 2000ms: Yellow -> Red
            cy.tick(2000);
            cy.get('#red-light').should('have.class', 'active').and('have.class', 'red');
            cy.get('#yellow-light').should('not.have.class', 'active');
            cy.get('#green-light').should('not.have.class', 'active');

            // Tick 2000ms: Red -> Green (second loop)
            cy.tick(2000);
            cy.get('#green-light').should('have.class', 'active').and('have.class', 'green');
            cy.get('#red-light').should('not.have.class', 'active');
            cy.get('#yellow-light').should('not.have.class', 'active');
        });

        /**
         * Acceptance Criteria:
         * - Only one light is active at any point in the cycle, preserving mutual exclusion.
         */
        it('@req_id: REQ-2-02 - Preserves strict mutual exclusion across multiple cycle iterations', () => {
            cy.clock();

            cy.get('#timer-toggle-btn').click();

            for (let i = 0; i < 9; i++) {
                cy.get('.traffic-light .light.active').should('have.length', 1);
                cy.tick(3000);
            }
        });

        /**
         * Acceptance Criteria:
         * - Clicking any individual color button (Red, Yellow, Green) or clicking Stop Timer immediately halts the automatic timer.
         */
        it('@req_id: REQ-2-02 - Clicking manual color button (Red, Yellow, Green) while timer is active halts the timer immediately', () => {
            cy.clock();

            // Start timer (Red is active)
            cy.get('#timer-toggle-btn').click();
            cy.get('#timer-toggle-btn').should('have.text', 'Stop Timer');
            cy.get('#red-light').should('have.class', 'active');

            // Manual click on Green button
            cy.get('#green-btn').click();

            // Timer must be halted immediately and toggle button reset to "Start Timer"
            cy.get('#timer-toggle-btn')
                .should('have.text', 'Start Timer')
                .and('not.have.class', 'stop-btn');
            cy.get('#green-light').should('have.class', 'active');
            cy.get('#red-light').should('not.have.class', 'active');

            // Verify cycling does not resume autonomously
            cy.tick(12000);
            cy.get('#green-light').should('have.class', 'active');
            cy.get('#yellow-light').should('not.have.class', 'active');
            cy.get('#red-light').should('not.have.class', 'active');
            cy.get('#timer-toggle-btn').should('have.text', 'Start Timer');
        });

        /**
         * Acceptance Criteria:
         * - Clicking Stop Timer immediately halts the automatic timer and preserves currently active light without further transitions.
         */
        it('@req_id: REQ-2-02 - Clicking Stop Timer preserves currently active light without further transitions', () => {
            cy.clock();

            cy.get('#timer-toggle-btn').click(); // Starts at Red
            cy.tick(3000); // Advances to Green
            cy.tick(3000); // Advances to Yellow
            cy.get('#yellow-light').should('have.class', 'active');

            // Click Stop Timer
            cy.get('#timer-toggle-btn').click();
            cy.get('#timer-toggle-btn').should('have.text', 'Start Timer');
            cy.get('#yellow-light').should('have.class', 'active');

            // Fast-forward time to ensure Yellow light remains unchanged
            cy.tick(15000);
            cy.get('#yellow-light').should('have.class', 'active');
            cy.get('#red-light').should('not.have.class', 'active');
            cy.get('#green-light').should('not.have.class', 'active');
        });
    });
});

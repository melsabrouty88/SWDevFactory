describe('Traffic Light Demonstration E2E Tests', () => {
    beforeEach(() => {
        // Serve index.html or open the local file
        cy.visit('index.html');
    });

    it('REQ-1-01: Displays vertical layout with three buttons and all lights initially off', () => {
        // Verify traffic light layout and lights exist
        cy.get('.traffic-light').should('exist');
        cy.get('#red-light').should('exist');
        cy.get('#yellow-light').should('exist');
        cy.get('#green-light').should('exist');

        // Verify order: Red, Yellow, Green vertically
        cy.get('.traffic-light .light').eq(0).should('have.id', 'red-light');
        cy.get('.traffic-light .light').eq(1).should('have.id', 'yellow-light');
        cy.get('.traffic-light .light').eq(2).should('have.id', 'green-light');

        // Verify 3 buttons are provided
        cy.get('.controls button').should('have.length', 3);
        cy.get('#red-btn').should('contain', 'Red');
        cy.get('#yellow-btn').should('contain', 'Yellow');
        cy.get('#green-btn').should('contain', 'Green');

        // Verify all lights are off by default (no active class)
        cy.get('#red-light').should('not.have.class', 'active');
        cy.get('#yellow-light').should('not.have.class', 'active');
        cy.get('#green-light').should('not.have.class', 'active');
    });

    it('REQ-1-02: Clicking a button for an inactive light turns it on, and clicking it again turns it off', () => {
        // Turn Red on
        cy.get('#red-btn').click();
        cy.get('#red-light').should('have.class', 'active').and('have.class', 'red');
        cy.get('#yellow-light').should('not.have.class', 'active');
        cy.get('#green-light').should('not.have.class', 'active');

        // Turn Red off
        cy.get('#red-btn').click();
        cy.get('#red-light').should('not.have.class', 'active');
    });

    it('REQ-1-02: Turning on any light automatically turns off any other light that is currently active', () => {
        // Turn Red on
        cy.get('#red-btn').click();
        cy.get('#red-light').should('have.class', 'active');

        // Turn Yellow on
        cy.get('#yellow-btn').click();
        cy.get('#yellow-light').should('have.class', 'active');
        cy.get('#red-light').should('not.have.class', 'active'); // Red should turn off

        // Turn Green on
        cy.get('#green-btn').click();
        cy.get('#green-light').should('have.class', 'active');
        cy.get('#yellow-light').should('not.have.class', 'active'); // Yellow should turn off
        cy.get('#red-light').should('not.have.class', 'active');
    });
});

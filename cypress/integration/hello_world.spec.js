describe('Hello World Test', () => {
    it('should display hello world message', () => {
        cy.visit('http://localhost:3000'); // Adjust the URL as needed
        cy.contains('Hello World'); // Adjust the text as needed
    });
});
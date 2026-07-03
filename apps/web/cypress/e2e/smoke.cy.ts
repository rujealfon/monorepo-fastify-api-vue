// Smoke driver for the web app. Drives every route end-to-end and drops
// screenshots in cypress/screenshots/smoke.cy.ts/.
//
// Works with or without the API: the health page shows "ok" when the
// Fastify API answers on /api, "unavailable" when it does not. Both are
// real, rendered states — the assertion accepts either and the screenshot
// records which one you got.
describe('smoke', () => {
  it('home renders with navigation', () => {
    cy.visit('/')
    cy.contains('h1', 'You did it!')
    cy.contains('nav a', 'Home')
    cy.contains('nav a', 'About')
    cy.contains('nav a', 'Health')
    cy.screenshot('01-home')
  })

  it('navigates to about', () => {
    cy.visit('/')
    cy.contains('nav a', 'About').click()
    cy.location('pathname').should('eq', '/about')
    cy.contains('h1', 'This is an about page')
    cy.screenshot('02-about')
  })

  it('health page queries the API and allows manual refetch', () => {
    cy.visit('/')
    cy.contains('nav a', 'Health').click()
    cy.location('pathname').should('eq', '/health')
    cy.contains('h1', 'Health')

    // 'ok' with API running, 'unavailable' without it — never stuck on 'checking'
    cy.get('.status', { timeout: 10000 }).should(($el) => {
      expect($el.text().trim()).to.be.oneOf(['ok', 'unavailable'])
    })

    cy.contains('button', 'Check again').click()
    cy.get('.status', { timeout: 10000 }).should(($el) => {
      expect($el.text().trim()).to.be.oneOf(['ok', 'unavailable'])
    })
    cy.screenshot('03-health')
  })
})

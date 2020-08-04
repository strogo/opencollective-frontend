const title = `New event ${Math.round(Math.random() * 10000)}`;
const updatedTitle = `New event updated ${Math.round(Math.random() * 10000)}`;

describe('event.create.test.js', () => {
  let collectiveSlug = null;

  before(() => {
    cy.createHostedCollective().then(({ slug }) => {
      collectiveSlug = slug;
    });
  });

  beforeEach(() => {
    cy.login({ redirect: `/${collectiveSlug}/events/create` });
  });

  it('create an event', () => {
    cy.get('.inputs .inputField.name input', { timeout: 20000 }).type(title);
    cy.get('.inputField.endsAt input').focus();
    cy.get('.rdtNext span').click;
    cy.get('.endsAt .rdtDay:not(.rdtOld):not(.rdtDisabled)').first().click();
    cy.get('.geosuggest__input').type('Superfilles');
    cy.wait(100);
    cy.get('.geosuggest__suggests > :nth-child(1)').click();
    cy.get('#location .address').contains('Lesbroussart');
    cy.get('#location .address').contains('1050');
    cy.get('.EditTiers .tier .inputField.name input').type('Free ticket');
    cy.get('.EditTiers .tier .inputField.description textarea').type('Free ticket for students');
    cy.get('.EditTiers .tier .inputField.maxQuantity input').type('10');
    cy.get('.addTier').click();
    cy.get('.EditTiers .tier').last().find('.inputField.name input').type('Paid ticket');
    cy.get('.EditTiers .tier').last().find('.inputField.amount input').type(15).blur();
    cy.get('.actions button.save').click();
    cy.get('#location .address').contains('Lesbroussart');
    cy.get('#location .address').contains('1050');
    cy.get('[data-cy=Tickets] [data-cy=contribute-card-tier]').should('have.length', 2);
    cy.get('[data-cy=Tickets] [data-cy=contribute-card-tier] [data-cy=amount]').contains(15);
    cy.disableSmoothScroll();
    cy.get('#top').scrollIntoView();
    cy.getByDataCy('edit-collective-btn').click();
    // edit event info
    cy.get('.inputs .inputField.name input').type(`{selectall}${updatedTitle}`);
    cy.get('.actions > .btn').click();
    cy.get('.actions > .btn').contains('Saved');
    // edit event tickets
    cy.getByDataCy('menu-item-tickets').click();
    cy.get('.EditTiers .tier:nth-child(2) .removeTier').click();
    cy.get('.actions > .btn').click();
    cy.get('.actions > .btn').contains('Saved');
    // edit event tiers
    cy.getByDataCy('menu-item-tiers').click();
    cy.get('.addTier').click();
    cy.get('.EditTiers .tier .inputField.name input').type('Sponsor');
    cy.get('.EditTiers .tier .inputField.description textarea').type('Become a sponsor');
    cy.get('.EditTiers .tier .inputField.amount input').type(200);
    cy.get('.actions > .btn').click();
    cy.get('.actions > .btn').contains('Saved');
    // verify update
    cy.get('h1 a').click();
    cy.get('[data-cy=Tickets] [data-cy=contribute-card-tier]').should('have.length', 1);
    cy.wait(100);
    cy.get('[data-cy="financial-contributions"] [data-cy=contribute-card-tier]').should('have.length', 1);
    cy.get('h1[data-cy=collective-title]').contains(updatedTitle);
    // delete event tiers
    cy.getByDataCy('edit-collective-btn').click();
    cy.getByDataCy('menu-item-advanced').click();
    cy.contains('button', 'Delete this Event').click();
    cy.get('[data-cy=delete]').click();
    cy.wait(1000);
    cy.location().should(location => {
      expect(location.search).to.eq('?type=EVENT');
    });
    cy.contains('h1', 'Your event has been deleted.');
  });
});

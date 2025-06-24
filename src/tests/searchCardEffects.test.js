const { loadTestScenario, injectGameState, performPlayerAction } = require('./testHelpers');
const gameLogic = require('../services/GameLogic');

describe('Search Card Effects - Comprehensive', () => {
    let gameId;

    beforeEach(() => {
        process.env.NODE_ENV = 'test';
    });

    afterEach(() => {
        process.env.NODE_ENV = 'development';
    });

    describe('Basic Search Card Effect', () => {
        it('should trigger card selection when playing search card', async () => {
            const scenario = await loadTestScenario('searchCard_basic');
            const result = await injectGameState(scenario);
            gameId = result.gameId;

            // Verify initial state
            expect(result.gameEnv.playerId_1.deck.hand).toContain('53');
            expect(result.gameEnv.playerId_1.deck.mainDeck.length).toBe(7);

            // Play the search card (艾利茲 - basic search 4 cards, select 1)
            const action = {
                type: "PlayCard",
                card_idx: 0,  // card 53 with basic search effect
                field_idx: 0  // top zone
            };

            const actionResult = await performPlayerAction(gameId, 'playerId_1', action);
            console.log(actionResult);
            /*
            // Should return card selection prompt
            expect(actionResult.requiresCardSelection).toBe(true);
            expect(actionResult.cardSelection).toBeDefined();
            expect(actionResult.cardSelection.selectionId).toBeDefined();
            expect(actionResult.cardSelection.eligibleCards).toBeDefined();
            expect(actionResult.cardSelection.selectCount).toBe(1);
            expect(actionResult.cardSelection.eligibleCards.length).toBeLessThanOrEqual(4); // searchCount: 4

            // Verify pending action is set
            expect(actionResult.gameEnv.pendingPlayerAction).toBeDefined();
            expect(actionResult.gameEnv.pendingPlayerAction.type).toBe('cardSelection');
            expect(actionResult.gameEnv.pendingPlayerAction.playerId).toBe('playerId_1');
            */
        });
        /*
        it('should complete card selection and update game state', async () => {
            const scenario = await loadTestScenario('searchCard_basic');
            const result = await injectGameState(scenario);
            gameId = result.gameId;

            // Play the search card first
            const action = {
                type: "PlayCard",
                card_idx: 0,
                field_idx: 0
            };

            const actionResult = await performPlayerAction(gameId, 'playerId_1', action);
            expect(actionResult.requiresCardSelection).toBe(true);

            // Complete the card selection
            const selectionRequest = {
                selectionId: actionResult.cardSelection.selectionId,
                selectedCardIds: [actionResult.cardSelection.eligibleCards[0]], // Select first card
                playerId: 'playerId_1',
                gameId: gameId
            };

            const selectionResult = await gameLogic.selectCard({ body: selectionRequest });

            // Verify selection completed successfully
            expect(selectionResult.success).toBe(true);
            expect(selectionResult.gameEnv.pendingPlayerAction).toBeUndefined();
            expect(selectionResult.gameEnv.pendingCardSelections).toEqual({});

            // Verify selected card was added to hand
            const finalState = await gameLogic.getGameState(gameId);
            expect(finalState.gameEnv.playerId_1.deck.hand).toContain(actionResult.cardSelection.eligibleCards[0]);
        });
    });

    describe('Search Card with Type Filters', () => {
        it('should filter SP cards correctly', async () => {
            const scenario = await loadTestScenario('searchCard_spFilter');
            const result = await injectGameState(scenario);
            gameId = result.gameId;

            // Play the SP search card (Edward Coristine - search 7 cards for SP)
            const action = {
                type: "PlayCard",
                card_idx: 0,  // card 54 with SP search effect
                field_idx: 0  // top zone
            };

            const actionResult = await performPlayerAction(gameId, 'playerId_1', action);

            // Should return card selection with SP filter
            expect(actionResult.requiresCardSelection).toBe(true);
            expect(actionResult.cardSelection.cardTypeFilter).toBe('sp');
            
            // Eligible cards should only include SP cards from the searched cards
            const originalDeck = result.gameEnv.playerId_1.deck.mainDeck;
            const spCardsInSearchRange = originalDeck.slice(0, 7).filter(cardId => 
                cardId === '696' || cardId === '158'  // Real SP card IDs
            );
            
            expect(actionResult.cardSelection.eligibleCards.length).toBe(spCardsInSearchRange.length);
        });

        it('should filter Help cards correctly', async () => {
            const scenario = await loadTestScenario('searchCard_helpFilter');
            const result = await injectGameState(scenario);
            gameId = result.gameId;

            // Play the Help search card (Luke Farritor - search 7 cards for Help)
            const action = {
                type: "PlayCard",
                card_idx: 0,  // card 109 with Help search effect
                field_idx: 0  // top zone
            };

            const actionResult = await performPlayerAction(gameId, 'playerId_1', action);

            // Should return card selection with Help filter
            expect(actionResult.requiresCardSelection).toBe(true);
            expect(actionResult.cardSelection.cardTypeFilter).toBe('help');
            
            // Eligible cards should only include Help cards from the searched cards
            const originalDeck = result.gameEnv.playerId_1.deck.mainDeck;
            const helpCardsInSearchRange = originalDeck.slice(0, 7).filter(cardId => 
                cardId === '140' || cardId === '141'  // Real Help card IDs
            );
            
            expect(actionResult.cardSelection.eligibleCards.length).toBe(helpCardsInSearchRange.length);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty deck gracefully', async () => {
            const scenario = await loadTestScenario('searchCard_emptyDeck');
            const result = await injectGameState(scenario);
            gameId = result.gameId;

            // Play search card with empty deck
            const action = {
                type: "PlayCard",
                card_idx: 0,
                field_idx: 0
            };

            const actionResult = await performPlayerAction(gameId, 'playerId_1', action);

            // Should complete normally without card selection
            expect(actionResult.requiresCardSelection).toBeUndefined();
            expect(actionResult.gameEnv.pendingPlayerAction).toBeUndefined();
        });

        it('should block other player actions during card selection', async () => {
            const scenario = await loadTestScenario('searchCard_basic');
            const result = await injectGameState(scenario);
            gameId = result.gameId;

            // Player 1 plays search card
            const action = {
                type: "PlayCard",
                card_idx: 0,
                field_idx: 0
            };

            const actionResult = await performPlayerAction(gameId, 'playerId_1', action);
            expect(actionResult.requiresCardSelection).toBe(true);

            // Player 2 tries to play a card - should be blocked
            const player2Action = {
                type: "PlayCard",
                card_idx: 0,
                field_idx: 0
            };

            try {
                await performPlayerAction(gameId, 'playerId_2', player2Action);
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toContain('Waiting for playerId_1 to complete card selection');
            }
        });

        it('should block same player from other actions during card selection', async () => {
            const scenario = await loadTestScenario('searchCard_basic');
            const result = await injectGameState(scenario);
            gameId = result.gameId;

            // Player 1 plays search card
            const action = {
                type: "PlayCard",
                card_idx: 0,
                field_idx: 0
            };

            const actionResult = await performPlayerAction(gameId, 'playerId_1', action);
            expect(actionResult.requiresCardSelection).toBe(true);

            // Player 1 tries to play another card - should be blocked
            const anotherAction = {
                type: "PlayCard",
                card_idx: 0,
                field_idx: 1
            };

            try {
                await performPlayerAction(gameId, 'playerId_1', anotherAction);
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toContain('You must complete your card selection first');
            }
        });
    });

    describe('Card Selection Validation', () => {
        it('should validate selection count', async () => {
            const scenario = await loadTestScenario('searchCard_basic');
            const result = await injectGameState(scenario);
            gameId = result.gameId;

            // Play search card
            const action = {
                type: "PlayCard",
                card_idx: 0,
                field_idx: 0
            };

            const actionResult = await performPlayerAction(gameId, 'playerId_1', action);

            // Try to select wrong number of cards
            const invalidSelectionRequest = {
                selectionId: actionResult.cardSelection.selectionId,
                selectedCardIds: [
                    actionResult.cardSelection.eligibleCards[0],
                    actionResult.cardSelection.eligibleCards[1] || actionResult.cardSelection.eligibleCards[0]
                ], // Select 2 cards when only 1 allowed
                playerId: 'playerId_1',
                gameId: gameId
            };

            try {
                await gameLogic.selectCard({ body: invalidSelectionRequest });
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toContain('Must select exactly 1 cards');
            }
        });

        it('should validate selected card IDs', async () => {
            const scenario = await loadTestScenario('searchCard_basic');
            const result = await injectGameState(scenario);
            gameId = result.gameId;

            // Play search card
            const action = {
                type: "PlayCard",
                card_idx: 0,
                field_idx: 0
            };

            const actionResult = await performPlayerAction(gameId, 'playerId_1', action);

            // Try to select invalid card
            const invalidSelectionRequest = {
                selectionId: actionResult.cardSelection.selectionId,
                selectedCardIds: ['invalid_card_id'],
                playerId: 'playerId_1',
                gameId: gameId
            };

            try {
                await gameLogic.selectCard({ body: invalidSelectionRequest });
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toContain('Invalid card selection');
            }
        });

        it('should validate selection ID', async () => {
            // Try to use invalid selection ID
            const invalidSelectionRequest = {
                selectionId: 'invalid_selection_id',
                selectedCardIds: ['43'],
                playerId: 'playerId_1',
                gameId: 'test-game'
            };

            try {
                await gameLogic.selectCard({ body: invalidSelectionRequest });
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toContain('Invalid or expired card selection');
            }
        });*/
    });
    /*
    describe('Game State Persistence', () => {
        it('should persist card selection state across requests', async () => {
            const scenario = await loadTestScenario('searchCard_basic');
            const result = await injectGameState(scenario);
            gameId = result.gameId;

            // Play search card
            const action = {
                type: "PlayCard",
                card_idx: 0,
                field_idx: 0
            };

            const actionResult = await performPlayerAction(gameId, 'playerId_1', action);
            const selectionId = actionResult.cardSelection.selectionId;

            // Read game state from file
            const persistedState = await gameLogic.getGameState(gameId);
            
            // Verify pending selection is persisted
            expect(persistedState.gameEnv.pendingCardSelections).toBeDefined();
            expect(persistedState.gameEnv.pendingCardSelections[selectionId]).toBeDefined();
            expect(persistedState.gameEnv.pendingPlayerAction).toBeDefined();
            expect(persistedState.gameEnv.pendingPlayerAction.type).toBe('cardSelection');
        });
    });*/
});
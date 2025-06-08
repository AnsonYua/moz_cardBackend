const { loadTestScenario, injectGameState, performPlayerAction } = require('./testHelpers');

describe('Card Effects', () => {
    let gameId;

    beforeEach(() => {
        // Set NODE_ENV to test
        process.env.NODE_ENV = 'test';
    });

    afterEach(() => {
        // Reset NODE_ENV
        process.env.NODE_ENV = 'development';
    });

    describe('Wind Effect', () => {
        beforeEach(async () => {
            const scenario = await loadTestScenario('windEffect');
            const result = await injectGameState(scenario);
            gameId = result.gameId;
        });

        it('should apply wind effect correctly', async () => {
            const result = await performPlayerAction(gameId, 'playerId_1', {
                type: 'playCard',
                cardId: 'wind_001',
                position: 0
            });

            expect(result.gameEnv.playerId_1.Field.sky[0].value).toBe(1500); // 1000 + 500 from effect
        });
    });

    describe('All Attribute Effect', () => {
        beforeEach(async () => {
            const scenario = await loadTestScenario('allAttributeEffect');
            const result = await injectGameState(scenario);
            gameId = result.gameId;
        });

        it('should apply all attribute effect correctly', async () => {
            const result = await performPlayerAction(gameId, 'playerId_1', {
                type: 'playCard',
                cardId: 'all_001',
                position: 0
            });

            expect(result.gameEnv.playerId_1.Field.sky[0].value).toBe(1100); // 800 + 300 from effect
        });
    });

    describe('Combination Effect', () => {
        beforeEach(async () => {
            const scenario = await loadTestScenario('combinationEffect');
            const result = await injectGameState(scenario);
            gameId = result.gameId;
        });

        it('should apply combination effect correctly', async () => {
            // Play first wind card
            await performPlayerAction(gameId, 'playerId_1', {
                type: 'playCard',
                cardId: 'wind_001',
                position: 0
            });

            // Play second wind card
            const result = await performPlayerAction(gameId, 'playerId_1', {
                type: 'playCard',
                cardId: 'wind_002',
                position: 1
            });

            // Both cards should have increased value
            expect(result.gameEnv.playerId_1.Field.sky[0].value).toBe(1500); // 1000 + 500 from effect
            expect(result.gameEnv.playerId_1.Field.sky[1].value).toBe(1500); // 1000 + 500 from effect
        });
    });
}); 
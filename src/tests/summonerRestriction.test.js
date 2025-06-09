const { loadTestScenario, injectGameState, makePostRequest, performPlayerAction } = require('./testHelpers');

describe('Summoner Restrictions', () => {
    let gameId;

    beforeEach(() => {
        // Set NODE_ENV to test
        process.env.NODE_ENV = 'test';
    });

    afterEach(() => {
        // Reset NODE_ENV
        process.env.NODE_ENV = 'development';
    });
    
    describe('Dragon Summon Restriction', () => {
        beforeEach(async () => {
            const scenario = await loadTestScenario('summonerRestriction');
            const result = await injectGameState(scenario);
            gameId = result.gameId;
        });
        /*
        it('should add dragon restriction when opponent"s summoner is 顧寧特', async () => {
            // Player 1 ready (player 2 is already ready in the scenario)
            const result = await makePostRequest('/player/startReady', {
                playerId: "playerId_1",
                gameId: gameId,
                redraw: false
            });

            // Check if player2 (opponent) has the dragon restriction
            expect(result.gameEnv.playerId_2.restrictions).toBeDefined();
            expect(result.gameEnv.playerId_2.restrictions.summonRestrictions).toContain('dragon');
        });*/ 

        it('should prevent playing dragon cards when restricted', async () => {
            // Player 1 ready (player 2 is already ready in the scenario)
            await makePostRequest('/player/startReady', {
                playerId: "playerId_1",
                gameId: gameId,
                redraw: false
            });

            // Try to play a dragon card
            const result = await performPlayerAction(gameId, 'playerId_2', {
                type: "PlayCard",
                card_idx: 0,  // d001 is the first card in hand
                field_idx: 0  // sky position
            });
           
            console.log("-----------result------------");
            console.log(result);
            console.log("--------------------------------");
            // Should return error
            expect(result.error).toBeDefined();
            expect(result.error).toContain('Cannot summon dragon type monsters due to opponent summoner effect');
        });
        /*
        it('should allow playing non-dragon cards when restricted', async () => {
            // Play a non-dragon card
            const result = await performPlayerAction(gameId, 'playerId_2', {
                type: 'PlayCard',
                card_idx: 1, // Assuming second card is not a dragon
                field_idx: 0
            });

            // Check if the card was played successfully
            expect(result.gameEnv.playerId_2.Field.sky[0]).toBeDefined();
            expect(result.gameEnv.playerId_2.Field.sky[0].cardDetails[0].monsterType).not.toBe('dragon');
        });
        */
    });
}); 
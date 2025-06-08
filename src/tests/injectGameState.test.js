const axios = require('axios');
const { TEST_CARDS } = require('./testHelpers');

const domainPath = "http://localhost:3000/api/game";

describe('Inject Game State API', () => {
    beforeEach(() => {
        // Set NODE_ENV to test
        process.env.NODE_ENV = 'test';
    });

    afterEach(() => {
        // Reset NODE_ENV
        process.env.NODE_ENV = 'development';
    });

    test('should inject custom game state', async () => {
        const customGameState = {
            currentPlayer: "playerId_1",
            phase: "MAIN_PHASE",
            currentTurn: 1,
            playerId_1: {
                deck: {
                    currentSummonerIdx: 0,
                    summoner: [TEST_CARDS.summonerCard],
                    hand: [TEST_CARDS.windCard, TEST_CARDS.allAttributeCard],
                    mainDeck: []
                },
                Field: {
                    sky: [],
                    left: [],
                    right: [],
                    help: [],
                    sp: [],
                    summonner: []
                },
                playerPoint: 1000
            },
            playerId_2: {
                deck: {
                    currentSummonerIdx: 0,
                    summoner: [TEST_CARDS.summonerCard],
                    hand: [TEST_CARDS.windCard],
                    mainDeck: []
                },
                Field: {
                    sky: [],
                    left: [],
                    right: [],
                    help: [],
                    sp: [],
                    summonner: []
                },
                playerPoint: 500
            }
        };

        const response = await axios.post(`${domainPath}/test/injectGameState`, {
            gameEnv: customGameState
        });

        expect(response.status).toBe(200);
        expect(response.data.gameId).toBeDefined();
        expect(response.data.gameEnv).toEqual(customGameState);
    });

    test('should reject request in non-test environment', async () => {
        process.env.NODE_ENV = 'development';
        
        try {
            await axios.post(`${domainPath}/test/injectGameState`, {
                gameEnv: {}
            });
            fail('Should have thrown an error');
        } catch (error) {
            expect(error.response.status).toBe(403);
            expect(error.response.data.error).toBe('This endpoint is only available in test environment');
        }
    });

    test('should require gameEnv parameter', async () => {
        try {
            await axios.post(`${domainPath}/test/injectGameState`, {});
            fail('Should have thrown an error');
        } catch (error) {
            expect(error.response.status).toBe(400);
            expect(error.response.data.error).toBe('gameEnv is required');
        }
    });
}); 
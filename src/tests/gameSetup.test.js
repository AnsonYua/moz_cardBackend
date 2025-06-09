const { setupTestGame, makePostRequest } = require('./testHelpers');

describe('Game Setup Tests', () => {
    let gameId;
    let startGameResp;
    let p1_startReadyResp;
    let p2_startReadyResp;
    let cardsData;
    let summonerCards;
    let decksData;

    beforeAll(async () => {
        // Load test data
        [cardsData, summonerCards, decksData] = await Promise.all([
            require('../data/cards.json'),
            require('../data/summonerCards.json'),
            require('../data/decks.json')
        ]);
    });

    beforeEach(async () => {
        // Start a new game before each test
        startGameResp = await setupTestGame();
        gameId = startGameResp.gameId;

        // Both players ready
        p1_startReadyResp = await makePostRequest(
            '/player/startReady',
            {
                gameId: gameId,
                playerId: "playerId_1",
                redraw: false
            }
        );

        p2_startReadyResp = await makePostRequest(
            '/player/startReady',
            {
                gameId: gameId,
                playerId: "playerId_2",
                redraw: false
            }
        );
    });

    test('Game initialization should set up correct game state', () => {
        // Check game ID
        expect(gameId).toBeDefined();

        // Check summoners
        expect(startGameResp.gameEnv.playerId_1.deck.summoner).toBeDefined();
        expect(startGameResp.gameEnv.playerId_2.deck.summoner).toBeDefined();
    });

    test('Player ready should set up correct deck state', () => {
        const gameEnv = p2_startReadyResp.gameEnv;

        // Check first player and current player
        expect(gameEnv.firstPlayer).toBeDefined();
        expect(gameEnv.currentPlayer).toBeDefined();
        console.log("-----------gameEnv.currentPlayer------------");
        console.log(gameEnv.currentPlayer);
        console.log("--------------------------------");
        if(gameEnv.currentPlayer == "playerId_1"){
            // Check player 1 deck state
            expect(gameEnv.playerId_1.deck.hand).toHaveLength(8);
            expect(gameEnv.playerId_1.deck.mainDeck).toHaveLength(decksData.playerDecks.playerId_1.decks.deck001.cards.length - 8);
            expect(gameEnv.playerId_1.Field.summonner).toBeDefined();

            // Check player 2 deck state
            expect(gameEnv.playerId_2.deck.hand).toHaveLength(7);
            expect(gameEnv.playerId_2.deck.mainDeck).toHaveLength(decksData.playerDecks.playerId_2.decks.deck001.cards.length - 7);
            expect(gameEnv.playerId_2.Field.summonner).toBeDefined();
        }

    });

    test('Hand cards should be valid and from deck', () => {
        const gameEnv = p2_startReadyResp.gameEnv;
        const players = ["playerId_1", "playerId_2"];

        players.forEach(playerId => {
            const hand = gameEnv[playerId].deck.hand;
            const mainDeck = gameEnv[playerId].deck.mainDeck;
            const originalDeck = decksData.playerDecks[playerId].decks.deck001.cards;

            // Check if all hand cards are in original deck
            hand.forEach(cardId => {
                expect(originalDeck).toContain(cardId);
                expect(cardsData.cards).toHaveProperty(cardId);
            });

            // Check if all main deck cards are in original deck
            mainDeck.forEach(cardId => {
                expect(originalDeck).toContain(cardId);
                expect(cardsData.cards).toHaveProperty(cardId);
            });

            // Check total cards
            expect(hand.length + mainDeck.length).toBe(originalDeck.length);
        });
    });
}); 
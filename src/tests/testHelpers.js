const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const domainPath = 'http://localhost:3000/api/game';

async function makePostRequest(endpoint, data) {
    try {
        const response = await axios.post(endpoint, data);
        return response.data;
    } catch (error) {
        if (error.response) {
            throw new Error(error.response.data.error || error.message);
        }
        throw error;
    }
}

async function loadTestScenario(scenarioName) {
    try {
        const filePath = path.join(__dirname, 'scenarios', `${scenarioName}.json`);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        throw new Error(`Failed to load test scenario: ${error.message}`);
    }
}

async function injectGameState(scenario) {
    try {
        return await makePostRequest(
            domainPath + '/test/injectGameState',
            scenario
        );
    } catch (error) {
        throw new Error(`Failed to inject game state: ${error.message}`);
    }
}

async function setupTestGame() {
    try {
        const result = await makePostRequest(
            domainPath + '/player/startGame',
            {
                playerId: 'playerId_1',
                deckId: 'test_deck_1'
            }
        );
        return {
            gameId: result.gameId,
            gameState: result.gameEnv
        };
    } catch (error) {
        throw new Error(`Failed to setup test game: ${error.message}`);
    }
}

async function performPlayerAction(gameId, playerId, action) {
    try {
        return await makePostRequest(
            domainPath + '/player/playerAction',
            {
                playerId: playerId,
                gameId: gameId,
                action: action
            }
        );
    } catch (error) {
        console.log("-----------error------------");
        console.log(error);
        console.log("--------------------------------");
        throw new Error(`Failed to perform player action: ${error.message}`);
    }
}

module.exports = {
    loadTestScenario,
    injectGameState,
    setupTestGame,
    performPlayerAction,
    makePostRequest
}; 
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const domainPath = "http://localhost:3000/api/game";

async function loadTestScenario(scenarioName) {
    const scenarioPath = path.join(__dirname, 'scenarios', `${scenarioName}.json`);
    const scenarioData = await fs.readFile(scenarioPath, 'utf8');
    return JSON.parse(scenarioData);
}

async function injectGameState(gameEnv) {
    const response = await axios.post(`${domainPath}/test/injectGameState`, {
        gameEnv
    });
    return response.data;
}

async function makePostRequest(endpoint, data) {
    try {
        const response = await axios.post(endpoint, data);
        return response.data;
    } catch (error) {
        if (error.response) {
            return error.response.data;
        }
        throw new Error(`Failed to make request to ${endpoint}: ${error.message}`);
    }
}

async function setupTestGame() {
    try {
        // Start a new game
        const startGameResp = await makePostRequest(
            domainPath + '/player/startGame',
            {
                playerId: "playerId_1",
                players: ["playerId_1", "playerId_2"]
            }
        );
        
        const gameId = startGameResp.gameId;
        
        // Both players ready
        await makePostRequest(
            domainPath + '/player/startReady',
            {
                gameId: gameId,
                playerId: "playerId_1",
                redraw: false
            }
        );
        
        const gameState = await makePostRequest(
            domainPath + '/player/startReady',
            {
                gameId: gameId,
                playerId: "playerId_2",
                redraw: false
            }
        );
        
        return { gameId, gameState };
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
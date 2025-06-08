// src/controllers/gameController.js
const gameLogic = require('../services/GameLogic');
const deckManager = require('../services/DeckManager');
const { stack } = require('../routes/gameRoutes');
class GameController {
    async startGame(req, res) {
        try {
            const gameState = await gameLogic.createNewGame(req);
            res.json(gameState);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getPlayerDecks(req, res) {
        try {
            const { playerId } = req.params;
            const decks = await deckManager.getPlayerDecks(playerId);
            res.json(decks);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async startReady(req, res) {
        try {
            const gameState = await gameLogic.startReady(req);
            res.json(gameState);
        } catch (error) {
            res.status(500).json({ error: error.message ,stack: error.stack});
        }
    }

    async playerAction(req, res) {
        try {
            const gameState = await gameLogic.processPlayerAction(req);
            res.json(gameState);
        } catch (error) {
            res.status(500).json({ error: error.message ,stack: error.stack});
        }
    }

    async getPlayerData(req, res) {
        try {
            const { playerId } = req.params;
            let gameState = gameLogic.getGameState(playerId);
            
            if (!gameState) {
                gameState = gameLogic.createNewGame(playerId);
            }

            res.json(gameState);
        } catch (error) {
            res.status(500).json({ error: error.message ,stack: error.stack});
        }
    }

    async playerAIAction(req, res) {
        try {
            let gameState = await gameLogic.playerAIAction(req);
            res.json(gameState);
        } catch (error) {
            res.status(500).json({ error: error.message  ,stack: error.stack});
        }
    }

    async setCase(req, res) {
        try {
            const result = await gameLogic.setCaseInGameLogic(req);
            res.json(result);
        } catch (error) {
            console.error('Error in setCase:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async updateScore(req, res) {
        try {
            const { playerId } = req.params;
            const { score } = req.body;
            
            const updatedState = gameLogic.updateGameState(playerId, { score });
            res.json(updatedState);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async processAction(req, res) {
        try {
            const { playerId } = req.params;
            const { action, targetId } = req.body;

            const result = gameLogic.processPlayerAction(playerId, action, targetId);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async injectGameState(req, res) {
        try {
            const { gameId, gameEnv } = req.body;
            
            if (!gameEnv) {
                return res.status(400).json({ error: 'gameEnv is required' });
            }

            const result = await gameLogic.injectGameState(gameId, gameEnv);
            res.json(result);
        } catch (error) {
            console.error('Error in injectGameState:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new GameController();
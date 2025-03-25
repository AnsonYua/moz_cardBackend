// src/routes/gameRoutes.js
const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');

router.get('/player/:playerId', gameController.getPlayerData);
router.put('/player/:playerId/score', gameController.updateScore);
router.post('/player/:playerId/action', gameController.processAction);

router.post('/player/:playerId/deck', gameController.getPlayerDecks);

router.post('/player/startGame', gameController.startGame);
router.post('/player/startReady', gameController.startReady);
router.post('/player/playerAction', gameController.playerAction);
router.post('/player/playerAiAction', gameController.playerAIAction);
router.post('/test/setCase', gameController.setCase);
module.exports = router;
// src/services/GameLogic.js
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const deckManager = require('../services/DeckManager');
const mozDeckHelper = require('../mozGame/mozDeckHelper');
const mozGamePlay = require('../mozGame/mozGamePlay');

const path = require('path');
const mozAIClass = require('../mozGame/mozAIClass');
const { json } = require('stream/consumers');


class GameLogic {
    constructor() {
        // You can initialize game constants here
        this.MAX_LEVEL = 100;
        this.POINTS_PER_LEVEL = 1000;
        this.MAX_HEALTH = 100;
        
        // You could store temporary game data here or use a database
        this.activeGames = new Map();
        this.mozGamePlay = mozGamePlay;
    }


    async createNewGame(req) {
        var { playerId ,gameId, players} = req.body;
        if (!gameId) {
            gameId = uuidv4();
        }     

        const startTask = []
        const playerArr = []
        for (let i = 0; i < players.length; i++) {
            const playerId = players[i];
            playerArr.push(playerId);
            startTask.push(mozDeckHelper.prepareDeckForPlayer(playerId));
        }

        const results = await Promise.all(startTask);
        
        var gameEnv = {}
        for (let i = 0; i < playerArr.length; i++) {
            gameEnv[playerArr[i]] = {
                "deck":results[i],
            };
        }
        gameEnv = this.mozGamePlay.updateInitialGameEnvironment(gameEnv);

        const newGame = {
            "gameId":gameId,
            "gameEnv":gameEnv,
            lastUpdate: new Date()
        };
        await this.saveOrCreateGame(newGame, gameId);
        return newGame;
    }

    async startReady(req) {
        var {playerId ,gameId,isRedraw} = req.body;
        var gameData = await this.readJSONFileAsync(gameId);
        const gameEnv = await this.mozGamePlay.redrawInBegining(gameData.gameEnv,playerId,isRedraw);
        gameData.gameEnv = gameEnv;
        await this.saveOrCreateGame(gameData, gameId);
        return gameData
    }
    
    async processPlayerAction(req) {
        console.log("---------processPlayerAction-------" + JSON.stringify(req.body));
        var {playerId ,gameId,action} = req.body;
        var gameData = await this.readJSONFileAsync(gameId);
        const result = await this.mozGamePlay.checkIsPlayOkForAction(gameData.gameEnv,playerId,action);
        if(!result){
            console.log("---------processPlayerAction------- Not your turn");
            return this.mozGamePlay.throwError("Not your turn");
        }else{
            gameData.gameEnv = await this.mozGamePlay.processAction(gameData.gameEnv,playerId,action);
            if (gameData.gameEnv.hasOwnProperty('error')){
                console.log("---------processPlayerAction------- attribute not match/other error");
                return gameData.gameEnv;
            }else{
                var gameData = this.addUpdateUUID(gameData) 
                await this.saveOrCreateGame(gameData, gameId);
                console.log("---------processPlayerAction------- normal");
                return gameData;
            }
        }
    }

    async playerAIAction(req) {
        var {playerId ,gameId} = req.body;
        var gameData = await this.readJSONFileAsync(gameId);
        return await mozAIClass.getAIAction(gameData.gameEnv,playerId);
    }

    addUpdateUUID(returnVale){
        returnVale["updateUUID"] = uuidv4();
        returnVale["lastUpdate"] = new Date()
        return returnVale;
    }
    async setCaseInGameLogic(req) {
        const {caseFile,gameId} = req.body;
        var game = await this.readJSONFileAsync(caseFile,"../testData/")
        await this.saveOrCreateGame(game, gameId);
        return game;
    }

    async injectGameState(gameId, gameEnv) {
        // Only allow in test environment
        /*
        if (process.env.NODE_ENV !== 'test') {
            throw new Error('This method is only available in test environment');
        }*/

        // Create a new game ID if not provided
        if (!gameId) {
            gameId = uuidv4();
        }

        // Create new game with injected state
        const newGame = {
            gameId: gameId,
            gameEnv: gameEnv,
            lastUpdate: new Date()
        };

        await this.saveOrCreateGame(newGame, gameId);
        return newGame;
    }

    async saveOrCreateGame(data, gameId) {
        const jsonString = JSON.stringify(data, null, 2); // The '2' adds nice formatting
        //await fs.writeFile(path.join(__dirname, '../gameData/'+gameId+'.json'), jsonString);
        await this.writeFileAsync(path.join(__dirname, '../gameData/'+gameId+'.json'), jsonString);
    }
    async writeFileAsync(filename, data) {
        return new Promise((resolve, reject) => {
          try {
            fs.writeFileSync(filename, data); // Synchronous file write
            resolve(); // Resolve the promise when the operation succeeds
          } catch (error) {
            reject(error); // Reject the promise if an error occurs
          }
        });
    }
    async readJSONFileAsync(gameId, folderPath='../gameData/') {
        const filename = path.join(__dirname, folderPath+gameId+'.json');
        return new Promise((resolve, reject) => {
            fs.readFile(filename, (error, data) => {
                if (error) {
                    if (error.code === 'ENOENT') {
                        console.error('File not found:', filename);
                    } else {
                        console.error('Error reading file:', error.message);
                    }
                    reject(error);
                    return;
                }
                
                try {
                    const jsonData = JSON.parse(data);
                    resolve(jsonData);
                } catch (parseError) {
                    console.error('Error parsing JSON:', parseError.message);
                    reject(parseError);
                }
            });
        });
    }

    getGameState(playerId) {
        const game = this.activeGames.get(playerId);
        if (!game) {
            return null;
        }

        return {
            ...game,
            level: this.calculateLevel(game.score),
            experience: this.calculateExperience(game.score)
        };
    }

    updateGameState(playerId, updates) {
        const game = this.activeGames.get(playerId);
        if (!game) {
            throw new Error('Game not found');
        }

        // Update game state
        Object.assign(game, {
            ...updates,
            lastUpdate: new Date()
        });

        return this.getGameState(playerId);
    }
}

module.exports = new GameLogic();
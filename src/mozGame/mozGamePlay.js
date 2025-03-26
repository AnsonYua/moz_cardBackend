const mozDeckHelper = require('./mozDeckHelper');
const mozPhaseManager = require('./mozPhaseManager');
const CardEffectManager = require('../services/CardEffectManager');

const TurnPhase = {
    START_REDRAW: 'START_REDRAW',
    DRAW_PHASE: 'DRAW_PHASE',
    MAIN_PHASE: 'MAIN_PHASE',
    END_SUMMONER_BATTLE: 'END_SUMMONER_BATTLE',
    MAIN_PHASE_1: 'MAIN_PHASE_1',
    BATTLE_PHASE: 'BATTLE_PHASE',
    MAIN_PHASE_2: 'MAIN_PHASE_2',
    END_PHASE: 'END_PHASE',
    GAME_END: 'GAME_END'
};
class mozGamePlay{
    constructor() {
        this.cardEffectManager = new CardEffectManager();
    }
    updateInitialGameEnvironment(gameEnv){
        // decide who goes first
        const summonerList = []
        const playerList = this.getPlayerFromGameEnv(gameEnv);
        for (let playerId in playerList){
            summonerList.push(mozDeckHelper.getCurrentSummoner(gameEnv, playerList[playerId]));
        }
        var firstPlayer = 0; 
        if (summonerList[1].initialPoint>summonerList[0].initialPoint){
            firstPlayer = 1;
        }else if (summonerList[1].initialPoint===summonerList[0].initialPoint){
            firstPlayer = Math.floor(Math.random() * 2);
        }
        gameEnv["firstPlayer"] = firstPlayer;
        mozPhaseManager.setCurrentPhase(TurnPhase.START_REDRAW)
        gameEnv["phase"] = mozPhaseManager.currentPhase;
        for (let playerId in playerList){
            gameEnv[playerList[playerId]].redraw = 0;
        }
        return gameEnv;
    }
    
    async redrawInBegining(gameEnvInput,playerId,isRedraw){
        var gameEnv = gameEnvInput;
        if(gameEnv[playerId].redraw == 0){
            gameEnv[playerId].redraw = 1;
            if (isRedraw){
                const {hand,mainDeck} =  await mozDeckHelper.reshuffleForPlayer(playerId);
                gameEnv[playerId].deck.hand = hand;
                gameEnv[playerId].deck.mainDeck = mainDeck;
            }
        }
        const playerList = this.getPlayerFromGameEnv(gameEnv);
        var allReady = true;
        for (let playerId in playerList){
            if(gameEnv[playerList[playerId]].redraw == 0){
                allReady = false;
            } 
        }
        if (allReady && gameEnv["phase"] == TurnPhase.START_REDRAW){
           var hand = gameEnv[playerList[gameEnv["firstPlayer"]]].deck.hand
           var mainDeck = gameEnv[playerList[gameEnv["firstPlayer"]]].deck.mainDeck
           const result = mozDeckHelper.drawToHand(hand,mainDeck);
           gameEnv[playerList[gameEnv["firstPlayer"]]].deck.hand = result["hand"];
           gameEnv[playerList[gameEnv["firstPlayer"]]].deck.mainDeck = result["mainDeck"];
           mozPhaseManager.setCurrentPhase(TurnPhase.MAIN_PHASE)
           gameEnv["phase"] = mozPhaseManager.currentPhase;
           gameEnv["currentPlayer"] = playerList[gameEnv["firstPlayer"]];
           gameEnv["currentTurn"] = 0;
          
           for (let playerId in playerList){
               gameEnv[playerList[playerId]]["turnAction"] = []
               gameEnv[playerList[playerId]]["Field"] = {};
               gameEnv[playerList[playerId]]["Field"]["summonner"] = mozDeckHelper.getCurrentSummoner(gameEnv, playerList[playerId]);
               gameEnv[playerList[playerId]]["Field"]["right"] = [];
               gameEnv[playerList[playerId]]["Field"]["left"] = [];
               gameEnv[playerList[playerId]]["Field"]["sky"] = [];
               gameEnv[playerList[playerId]]["Field"]["help"] = [];
               gameEnv[playerList[playerId]]["Field"]["sp"] = [];
            }
        }
        return gameEnv;
    }

    async processAction(gameEnvInput,playerId,action){ 
        var gameEnv = gameEnvInput;
        if(action["type"] == "PlayCard" || action["type"] == "PlayCardBack"){
            var isPlayBack = false;
            if(action["type"] == "PlayCardBack"){
                isPlayBack = true;
            }
            const positionDict = ["sky","left","right"];
            if (action["field_idx"]>=positionDict.length){
                return this.throwError("position out of range");
            }
            const playPos = positionDict[action["field_idx"]]
            var hand = [...gameEnv[playerId].deck.hand];
            console.log("---hand "+hand.length + " "+action["card_idx"]  + JSON.stringify(hand) )
            if (action["card_idx"]>=hand.length){
                return this.throwError("hand card out of range");
            }
            const cardToPlay = hand[action["card_idx"]];
            const cardDetails = mozDeckHelper.getDeckCardDetails(cardToPlay);
            
            if (cardDetails["type"] == "monster" && 
                !isPlayBack && (playPos == "help" || playPos == "sp")){
                return this.throwError("Can't play monster card (faceup)in this position");
            }
            if(await this.monsterInField(gameEnv[playerId].Field[playPos])){
                console.log("monsterInField "+JSON.stringify(gameEnv[playerId].Field[playPos]))
                return this.throwError("Monster already in this position");
            }
            if (cardDetails["type"] == "monster" &&
                !isPlayBack
            ){
                const isMatch = this.isCardMatchingSummoner(cardDetails,
                    mozDeckHelper.getCurrentSummoner(gameEnv, playerId)
                    ,playPos);
                    if(!isMatch){   
                        return this.throwError("Attribute not match");
                    }
            }
            
            var cardObj = {
                "card": hand.splice(action["card_idx"],1),
                "cardDetails": [cardDetails],
                "isBack": [isPlayBack]
            }
            gameEnv[playerId].deck.hand = hand;
            gameEnv[playerId].Field[positionDict[action["field_idx"]]].push(cardObj);
            action["selectedCard"] = cardObj;
            gameEnv[playerId]["turnAction"].push(action);
            action["turn"] = gameEnv["currentTurn"];

            // Apply card effects if the card is played face up
            if (!isPlayBack && cardDetails.type === "monster") {
                gameEnv = this.cardEffectManager.applyCardEffect(gameEnv, playerId, cardDetails, gameEnv[playerId].Field);
            }

            gameEnv[playerId]["playerPoint"] = await this.calculatePlayerPoint(gameEnv,playerId);
            const isSummonBattleReady = await this.checkIsSummonBattleReady(gameEnv);
            if(!isSummonBattleReady){
                gameEnv = await this.shouldUpdateTurn(gameEnv,playerId);
            }else{
                console.log("l am here 123")
                gameEnv = await this.concludeSummonerBattleAndNewStart(gameEnv,playerId);
                console.log("l am here 4555")
            }
        }
        return gameEnv;
    }

    

    async concludeSummonerBattleAndNewStart(gameEnvInput,playerId){
        var gameEnv = gameEnvInput;
        const playerList = this.getPlayerFromGameEnv(gameEnv);
        var crtPlayer = playerId;
        var opponent = playerList[0];
        if(playerList[0] === playerId){
            opponent = playerList[1];
        }

        console.log("player " + crtPlayer + " "+ opponent)

        gameEnv[crtPlayer]["playerPoint"] = await this.calculatePlayerPoint(gameEnv,crtPlayer);
        gameEnv[opponent]["playerPoint"] = await this.calculatePlayerPoint(gameEnv,opponent);
        if(gameEnv[crtPlayer]["playerPoint"] > gameEnv[opponent]["playerPoint"] && 
           gameEnv[crtPlayer]["playerPoint"] - gameEnv[opponent]["playerPoint"] > 50){
            gameEnv["phase"] = TurnPhase.GAME_END;
            gameEnv["winner"] = crtPlayer;
            return gameEnv;
        }else if(gameEnv[crtPlayer]["playerPoint"] < gameEnv[opponent]["playerPoint"] && 
                gameEnv[opponent]["playerPoint"] - gameEnv[crtPlayer]["playerPoint"] > 50){
            gameEnv["phase"] = TurnPhase.GAME_END;
            gameEnv["winner"] = opponent;
            return gameEnv; 
        }
        if(!gameEnv[crtPlayer].hasOwnProperty("overallGamePoint")){
            gameEnv[crtPlayer]["overallGamePoint"] = 0;
        }
        if(!gameEnv[opponent].hasOwnProperty("overallGamePoint")){
            gameEnv[opponent]["overallGamePoint"] = 0;
        }
        var summonerBattleWinner = crtPlayer;
        if(gameEnv[crtPlayer]["playerPoint"] > gameEnv[opponent]["playerPoint"]){
            gameEnv[crtPlayer]["overallGamePoint"] += gameEnv[crtPlayer]["playerPoint"]-gameEnv[opponent]["playerPoint"];
            if(gameEnv[crtPlayer]["overallGamePoint"]>50){
                gameEnv["phase"] = TurnPhase.GAME_END;
                gameEnv["winner"] = crtPlayer;
                return gameEnv; 
            }
        } 
        if(gameEnv[opponent]["playerPoint"] > gameEnv[crtPlayer]["playerPoint"]){
            gameEnv[opponent]["overallGamePoint"] += gameEnv[opponent]["playerPoint"]-gameEnv[crtPlayer]["playerPoint"];
            summonerBattleWinner = opponent;
            if(gameEnv[opponent]["overallGamePoint"]>50){
                gameEnv["phase"] = TurnPhase.GAME_END;
                gameEnv["winner"] = opponent;
                return gameEnv; 
            }
        } 
        if(gameEnv[opponent]["playerPoint"] == gameEnv[crtPlayer]["playerPoint"]){
            summonerBattleWinner = "";
        }
        gameEnv[opponent]['turnAction'].push(
            this.endBattleObject(summonerBattleWinner,gameEnv["currentTurn"]));
        gameEnv[crtPlayer]['turnAction'].push(
            this.endBattleObject(summonerBattleWinner,gameEnv["currentTurn"]));
        gameEnv[opponent].Field["sky"] = [];
        gameEnv[opponent].Field["right"] = [];
        gameEnv[opponent].Field["left"] = [];
        gameEnv[crtPlayer].Field["sky"] = [];
        gameEnv[crtPlayer].Field["right"] = [];
        gameEnv[crtPlayer].Field["left"] = [];
        gameEnv[crtPlayer]["playerPoint"] = 0;
        gameEnv[opponent]["playerPoint"] = 0;

        if(gameEnv[opponent].deck.currentSummonerIdx == gameEnv[opponent].deck.summoner.length-1){
            if(gameEnv[opponent]["playerPoint"] > gameEnv[crtPlayer]["playerPoint"]){
                gameEnv["phase"] = TurnPhase.GAME_END;
                gameEnv["winner"] = opponent;
                return gameEnv; 
            }else{
                gameEnv["phase"] = TurnPhase.GAME_END;
                gameEnv["winner"] = crtPlayer;
                return gameEnv; 
            }
        }else{
            gameEnv[opponent].deck.currentSummonerIdx = gameEnv[opponent].deck.currentSummonerIdx + 1;
            gameEnv[opponent].Field["summonner"] = mozDeckHelper.getCurrentSummoner(gameEnv, opponent);
            gameEnv[crtPlayer].deck.currentSummonerIdx = gameEnv[crtPlayer].deck.currentSummonerIdx + 1; 
            gameEnv[crtPlayer].Field["summonner"] = mozDeckHelper.getCurrentSummoner(gameEnv, crtPlayer);
        }
        gameEnv = await this.startNewTurn(gameEnv);
        return gameEnv;
    }
    resetField(gameEnvInput){
        var gameEnv = gameEnvInput;
        const playerList = this.getPlayerFromGameEnv(gameEnv);
        for (let playerId in playerList){
            gameEnv[playerList[playerId]]["Field"]["sky"] = [];
            gameEnv[playerList[playerId]]["Field"]["right"] = [];
            gameEnv[playerList[playerId]]["Field"]["left"] = [];
        }
        return gameEnv;
    }
    endBattleObject(winner, turn){
       if (winner == ""){
            return  {
                "turn": turn,
                "type": "EndSummonerBattle",
                "winner": "draw"
            }
       }
       return  {
            "turn": turn,
            "type": "EndSummonerBattle",
            "winner": winner
        }
    }

    async monsterInField(fieldArea){
        var monsterInField = false
        console.log("fieldArea "+JSON.stringify(fieldArea))
        for(let i = 0; i < fieldArea.length; i++){
            if(fieldArea[i]["cardDetails"][0]["type"] == "monster"){
                monsterInField = true;
                break;
            }
        }
        return monsterInField;
    }
    async checkIsSummonBattleReady(gameEnv){
        const playerList =  this.getPlayerFromGameEnv(gameEnv);
        const area = ["sky","left","right"];
        var allFillWithMonster = true;
       
        for (let playerListIdx in playerList){
            for (let areaIdx in area){
                const player = playerList[playerListIdx]
                const monsterArr = gameEnv[player].Field[area[areaIdx]];
                var areaContainMonster = false;
                for(let monsterArrIdx in monsterArr){
                   if(monsterArr[monsterArrIdx]["isBack"][0]){
                        areaContainMonster = true;
                   }else if(monsterArr[monsterArrIdx]["cardDetails"][0]["type"] == "monster"){
                        areaContainMonster = true;
                        break;
                   }
                }
                if(!areaContainMonster){
                    allFillWithMonster = false;
                }
            }
       }
       return allFillWithMonster;
    }

    async shouldUpdateTurn(gameEnvInput,playerId){
        var gameEnv = gameEnvInput;
        

        var currentTurnActionComplete = false
        //end currentPlayer Turn
        if(gameEnv["phase"] == TurnPhase.MAIN_PHASE){
            const playerAction = gameEnv[playerId]["turnAction"];
            const currentTurn = gameEnv["currentTurn"];
            for (let idx in playerAction){
                if((playerAction[idx]["type"]=="PlayCard" ||
                    playerAction[idx]["type"]=="PlayCardBack")&&
                    playerAction[idx]["turn"] == currentTurn){
                    currentTurnActionComplete = true;
                }
            }
        }
        if(currentTurnActionComplete){
            gameEnv = await this.startNewTurn(gameEnv);
        }
        return gameEnv;
    }

    async startNewTurn(gameEnvInput){
        var gameEnv = gameEnvInput;
        gameEnv["currentTurn"] = gameEnv["currentTurn"] + 0.5;
        const playerArr = this.getPlayerFromGameEnv(gameEnv)
        gameEnv["currentPlayer"] = playerArr[gameEnv["firstPlayer"]];
        if(gameEnv["currentTurn"] * 10 % 10 == 5){
            if(gameEnv["firstPlayer"] == 0){
                gameEnv["currentPlayer"] = playerArr[1];
            }else{
                gameEnv["currentPlayer"] = playerArr[0];
            }
        }
        //draw card
        var hand = gameEnv[gameEnv["currentPlayer"]].deck.hand
        var mainDeck = gameEnv[gameEnv["currentPlayer"]].deck.mainDeck   
        const result = mozDeckHelper.drawToHand(hand,mainDeck);
        gameEnv[gameEnv["currentPlayer"]].deck.hand = result["hand"];
        gameEnv[gameEnv["currentPlayer"]].deck.mainDeck = result["mainDeck"];
        return gameEnv;
    }
    async calculatePlayerPoint(gameEnv, playerId) {
        let totalPoints = 0;
        const fields = ['sky', 'left', 'right'];
        const currentSummoner = mozDeckHelper.getCurrentSummoner(gameEnv, playerId);

        for (const field of fields) {
            const fieldCards = gameEnv[playerId].Field[field];
            for (const cardObj of fieldCards) {
                if (!cardObj.isBack[0] && cardObj.cardDetails[0].type === "monster") {
                    // Apply card effects before calculating points
                    gameEnv = this.cardEffectManager.applyCardEffect(gameEnv, playerId, cardObj.cardDetails[0], gameEnv[playerId].Field);
                    totalPoints += await this.getMonsterPoint(cardObj.cardDetails[0], currentSummoner);
                }
            }
        }

        return totalPoints;
    }

    async getMonsterPoint(card,summoner){
        var returnValue = card["value"];
        const cardAttr = card["attribute"];
        const summonerNativeAddition = summoner["nativeAddition"];
        var addVal = {}
        for(let key in summonerNativeAddition){
            addVal[summonerNativeAddition[key]["type"]] = summonerNativeAddition[key]["value"];
        }
        for(let key in cardAttr){
            if (addVal.hasOwnProperty(cardAttr[key])){
                returnValue += addVal[cardAttr[key]];
            }
        }
        return returnValue;
    }
    async checkIsPlayOkForAction(gameEnv,playerId,action){
        var returnValue = false
        if(gameEnv["phase"]== TurnPhase.MAIN_PHASE && gameEnv["currentPlayer"] == playerId){ 
            returnValue = true;
        }
        return returnValue;
    }

    
    isCardMatchingSummoner(card, summoner, area ){
        var returnValue = false;
        for (let idx in card["attribute"]){
            if(card["attribute"][idx] == "all"){
                returnValue = true;
                return returnValue;
            }
        }
        if(area == "help" || area == "sp"){
            return true;
        }
        summoner[area].forEach(function(attr){
            if(attr == "all"){
                returnValue = true;
                return returnValue;
            }
            var isAttrMatch = false;
            for (let key in card["attribute"]){
                if(card["attribute"][key] == attr){
                    isAttrMatch = true;
                }
            }
            if (isAttrMatch){
                returnValue = true;
            }
        });
        return returnValue
    }

    throwError(errorText){
        var returnObj = {}
        returnObj = {
            "error": errorText
        }
        return returnObj
    }

    getPlayerFromGameEnv(gameEnv){
        const playerArr = []   
        for (let playerId in gameEnv){
            if(playerId.includes("playerId_")){
                playerArr.push(playerId);
            }
        }
        return playerArr;
    }

    isSummonBattleEnd(gameEnv){
        var returnValue = false;
        if(gameEnv["phase"] == TurnPhase.END_SUMMONER_BATTLE){
            returnValue = true;
        }
        return returnValue;
    }
}
module.exports = new mozGamePlay();
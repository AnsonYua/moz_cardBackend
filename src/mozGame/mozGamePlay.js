const mozDeckHelper = require('./mozDeckHelper');
const mozPhaseManager = require('./mozPhaseManager');
const CardEffectManager = require('../services/CardEffectManager');
const { getPlayerFromGameEnv } = require('../utils/gameUtils');
const CardInfoUtils = require('../services/CardInfoUtils');
const TurnPhase = {
    START_REDRAW: 'START_REDRAW',
    DRAW_PHASE: 'DRAW_PHASE',
    MAIN_PHASE: 'MAIN_PHASE',
    SP_PHASE: 'SP_PHASE',
    END_SUMMONER_BATTLE: 'END_SUMMONER_BATTLE',
    MAIN_PHASE_1: 'MAIN_PHASE_1',
    BATTLE_PHASE: 'BATTLE_PHASE',
    MAIN_PHASE_2: 'MAIN_PHASE_2',
    END_PHASE: 'END_PHASE',
    GAME_END: 'GAME_END',
    END_LEADER_BATTLE: 'END_LEADER_BATTLE'
};

class mozGamePlay {
    constructor() {
        this.cardEffectManager = CardEffectManager;
        this.cardInfoUtils = CardInfoUtils;
    }

    updateInitialGameEnvironment(gameEnv){
        // decide who goes first
        const leaderList = []
        const playerList = mozGamePlay.getPlayerFromGameEnv(gameEnv);
        for (let playerId in playerList){
            let leader = this.cardInfoUtils.getCurrentLeader(gameEnv, playerList[playerId]);
            leaderList.push(leader);
        }
        var firstPlayer = 0; 
        if (leaderList[1].initialPoint>leaderList[0].initialPoint){
            firstPlayer = 1;
        }else if (leaderList[1].initialPoint===leaderList[0].initialPoint){
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
        const playerList = mozGamePlay.getPlayerFromGameEnv(gameEnv);

        /*
        when all player have redraw 1 and turnPhase is startRedraw,
        meaning all player is ready to start the game
        so we can change the phase to main phase
        */
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
               let leader = this.cardInfoUtils.getCurrentLeader(gameEnv, playerList[playerId]);
               gameEnv[playerList[playerId]]["turnAction"] = []
               gameEnv[playerList[playerId]]["Field"] = {};
               gameEnv[playerList[playerId]]["Field"]["leader"] = leader;
               gameEnv[playerList[playerId]]["Field"]["right"] = [];
               gameEnv[playerList[playerId]]["Field"]["left"] = [];
               gameEnv[playerList[playerId]]["Field"]["top"] = [];
               gameEnv[playerList[playerId]]["Field"]["help"] = [];
               gameEnv[playerList[playerId]]["Field"]["sp"] = [];
            }

         
        }
        return gameEnv;
    }

    /**
     * Processes a player action in the game
     * Handles card placement, validation, and effect processing for all card types
     * @param {Object} gameEnvInput - Current game environment state
     * @param {string} playerId - ID of the player making the action
     * @param {Object} action - Action object containing type, card_idx, field_idx
     * @returns {Object} Updated game environment or error object
     */
    async processAction(gameEnvInput, playerId, action) {
        var gameEnv = gameEnvInput;
        
        // Handle card play actions (face up or face down)
        if (action["type"] == "PlayCard" || action["type"] == "PlayCardBack") {
            var isPlayInFaceDown = action["type"] == "PlayCardBack";
            const positionDict = ["top", "left", "right", "help", "sp"];
            
            // Validate field position
            if (action["field_idx"] >= positionDict.length) {
                return this.throwError("position out of range");
            }
            
            const playPos = positionDict[action["field_idx"]];
            var hand = [...gameEnv[playerId].deck.hand];
            
            // Validate card index in hand
            if (action["card_idx"] >= hand.length) {
                return this.throwError("hand card out of range");
            }
            
            // Get card details from deck manager
            const cardToPlay = hand[action["card_idx"]];
            const cardDetails = mozDeckHelper.getDeckCardDetails(cardToPlay);
            
            if (!cardDetails) {
                return this.throwError("Card not found");
            }

            // Check advanced placement restrictions (zone compatibility, special effects)
            const placementCheck = await this.cardEffectManager.checkSummonRestriction(
                gameEnv,
                playerId,
                cardDetails,
                playPos
            );

            if (!placementCheck.canPlace) {
                return this.throwError(placementCheck.reason);
            }

            // Log any override effects that allowed placement
            if (placementCheck.overrideInfo) {
                console.log(`Card placement allowed due to override from ${placementCheck.overrideInfo.overrideCardType} card: ${placementCheck.overrideInfo.overrideCardId}`);
                console.log(`Reason: ${placementCheck.overrideInfo.overrideReason}`);
            }

            // Validate card type and position compatibility based on game rules
            if (isPlayInFaceDown) {
                // Face-down placement rules: Used for bluffing and strategic play
                if (cardDetails["cardType"] == "character" && (playPos == "top" || playPos == "left" || playPos == "right")) {
                    return this.throwError("Can't play character card (face down) in character zones");
                }
                if ((cardDetails["cardType"] == "help" || cardDetails["cardType"] == "sp") && (playPos == "top" || playPos == "left" || playPos == "right")) {
                    return this.throwError("Can't play utility card (face down) in character zones");
                }
            } else {
                // Face-up card placement validation by card type
                if (cardDetails["cardType"] == "character") {
                    // Character cards can only go in top/left/right zones
                    if (playPos == "help" || playPos == "sp") {
                        return this.throwError("Can't play character card in utility zones");
                    }
                    // Ensure only one character per zone (no stacking)
                    if (playPos == "top" || playPos == "left" || playPos == "right") {
                        if (await this.monsterInField(gameEnv[playerId].Field[playPos])) {
                            return this.throwError("Character already in this position");
                        }
                    }
                } else if (cardDetails["cardType"] == "help") {
                    // Help cards provide utility effects, only one allowed
                    if (playPos != "help") {
                        return this.throwError("Help cards can only be played in help zone");
                    }
                    if (gameEnv[playerId].Field[playPos].length > 0) {
                        return this.throwError("Help zone already occupied");
                    }
                } else if (cardDetails["cardType"] == "sp") {
                    // SP cards are special powerful effects, only one allowed
                    if (playPos != "sp") {
                        return this.throwError("SP cards can only be played in SP zone");
                    }
                    if (gameEnv[playerId].Field[playPos].length > 0) {
                        return this.throwError("SP zone already occupied");
                    }
                }
            }

            // Create card object for field placement
            var cardObj = {
                "card": hand.splice(action["card_idx"], 1),        // Remove card from hand
                "cardDetails": [cardDetails],                      // Store card data
                "isBack": [isPlayInFaceDown],                     // Track if face down
                "valueOnField": isPlayInFaceDown ? 0 : cardDetails["power"]  // Power for calculations
            };

            // Update game state with card placement
            gameEnv[playerId].deck.hand = hand;                   // Update hand
            gameEnv[playerId].Field[playPos].push(cardObj);       // Place card on field
            action["selectedCard"] = cardObj;                     // Track action details
            action["turn"] = gameEnv["currentTurn"];
            gameEnv[playerId]["turnAction"].push(action);         // Record action history

            // Process immediate card effects (triggered effects only if face up)
            if (!isPlayInFaceDown) {
                if (cardDetails["cardType"] == "character") {
                    // Character summon effects (e.g., draw cards, search deck)
                    await this.processCharacterSummonEffects(gameEnv, playerId, cardDetails);
                } else if (cardDetails["cardType"] == "help" || cardDetails["cardType"] == "sp") {
                    // Utility card play effects (e.g., discard opponent cards, boost power)
                    await this.processUtilityCardEffects(gameEnv, playerId, cardDetails);
                }
            }
            
            // Recalculate player points with all active effects
            gameEnv[playerId]["playerPoint"] = await this.calculatePlayerPoint(gameEnv, playerId);
            
            // Check if all character zones are filled (battle ready)
            const isSummonBattleReady = await this.checkIsSummonBattleReady(gameEnv);
            
            if (!isSummonBattleReady) {
                // Continue turn-based play
                gameEnv = await this.shouldUpdateTurn(gameEnv, playerId);
            } else {
                // All zones filled - prepare for battle resolution
                const needsSpPhase = await this.checkNeedsSpPhase(gameEnv);
                if (needsSpPhase) {
                    // Execute SP cards in priority order before battle
                    gameEnv = await this.startSpPhase(gameEnv);
                } else {
                    // Proceed directly to battle resolution
                    gameEnv = await this.concludeLeaderBattleAndNewStart(gameEnv, playerId);
                }
            }
        }
        return gameEnv;
    }

    

    async concludeLeaderBattleAndNewStart(gameEnvInput,playerId){
        var gameEnv = gameEnvInput;
        const playerList = mozGamePlay.getPlayerFromGameEnv(gameEnv);
        var crtPlayer = playerId;
        var opponent = playerList[0];
        if(playerList[0] === playerId){
            opponent = playerList[1];
        }

        console.log("player " + crtPlayer + " "+ opponent)

        // Calculate final points for this round
        gameEnv[crtPlayer]["playerPoint"] = await this.calculatePlayerPoint(gameEnv,crtPlayer);
        gameEnv[opponent]["playerPoint"] = await this.calculatePlayerPoint(gameEnv,opponent);
        
        // Initialize victory points if not present
        if(!gameEnv[crtPlayer].hasOwnProperty("victoryPoints")){
            gameEnv[crtPlayer]["victoryPoints"] = 0;
        }
        if(!gameEnv[opponent].hasOwnProperty("victoryPoints")){
            gameEnv[opponent]["victoryPoints"] = 0;
        }
        
        // Determine round winner and award victory points
        var leaderBattleWinner = "";
        const pointDifference = gameEnv[crtPlayer]["playerPoint"] - gameEnv[opponent]["playerPoint"];
        
        if(pointDifference > 0){
            // Current player wins
            leaderBattleWinner = crtPlayer;
            gameEnv[crtPlayer]["victoryPoints"] += pointDifference;
        } else if(pointDifference < 0){
            // Opponent wins
            leaderBattleWinner = opponent;
            gameEnv[opponent]["victoryPoints"] += Math.abs(pointDifference);
        }
        // If equal, no winner (leaderBattleWinner remains "")
        
        // Check for game end condition (50 victory points)
        if(gameEnv[crtPlayer]["victoryPoints"] >= 50){
            gameEnv["phase"] = TurnPhase.GAME_END;
            gameEnv["winner"] = crtPlayer;
            return gameEnv;
        }
        if(gameEnv[opponent]["victoryPoints"] >= 50){
            gameEnv["phase"] = TurnPhase.GAME_END;
            gameEnv["winner"] = opponent;
            return gameEnv;
        }
        gameEnv[opponent]['turnAction'].push(
            this.endBattleObject(leaderBattleWinner,gameEnv["currentTurn"]));
        gameEnv[crtPlayer]['turnAction'].push(
            this.endBattleObject(leaderBattleWinner,gameEnv["currentTurn"]));
        gameEnv[opponent].Field["top"] = [];
        gameEnv[opponent].Field["right"] = [];
        gameEnv[opponent].Field["left"] = [];
        gameEnv[crtPlayer].Field["top"] = [];
        gameEnv[crtPlayer].Field["right"] = [];
        gameEnv[crtPlayer].Field["left"] = [];
        gameEnv[crtPlayer]["playerPoint"] = 0;
        gameEnv[opponent]["playerPoint"] = 0;

        // Check if this was the last leader battle  
        if(gameEnv[opponent].deck.currentLeaderIdx == gameEnv[opponent].deck.leader.length-1){
            // Final leader battle completed - determine winner by victory points
            if(gameEnv[crtPlayer]["victoryPoints"] > gameEnv[opponent]["victoryPoints"]){
                gameEnv["phase"] = TurnPhase.GAME_END;
                gameEnv["winner"] = crtPlayer;
                return gameEnv; 
            } else if(gameEnv[opponent]["victoryPoints"] > gameEnv[crtPlayer]["victoryPoints"]){
                gameEnv["phase"] = TurnPhase.GAME_END;
                gameEnv["winner"] = opponent;
                return gameEnv; 
            } else {
                // Tie game - could add tiebreaker logic here
                gameEnv["phase"] = TurnPhase.GAME_END;
                gameEnv["winner"] = "draw";
                return gameEnv;
            }
        } else {
            // Move to next leader
            gameEnv[opponent].deck.currentLeaderIdx = gameEnv[opponent].deck.currentLeaderIdx + 1;
            let opponentLeader = this.cardInfoUtils.getCurrentLeader(gameEnv, opponent);
            gameEnv[opponent].Field["leader"] = opponentLeader
            
            gameEnv[crtPlayer].deck.currentLeaderIdx = gameEnv[crtPlayer].deck.currentLeaderIdx + 1; 
            let crtLeader = this.cardInfoUtils.getCurrentLeader(gameEnv, crtPlayer);
            gameEnv[crtPlayer].Field["leader"] = crtLeader
        }
        gameEnv = await this.startNewTurn(gameEnv);
        return gameEnv;
    }
    resetField(gameEnvInput){
        var gameEnv = gameEnvInput;
        const playerList = mozGamePlay.getPlayerFromGameEnv(gameEnv);
        for (let playerId in playerList){
            gameEnv[playerList[playerId]]["Field"]["top"] = [];
            gameEnv[playerList[playerId]]["Field"]["right"] = [];
            gameEnv[playerList[playerId]]["Field"]["left"] = [];
        }
        return gameEnv;
    }
    endBattleObject(winner, turn){
       if (winner == ""){
            return  {
                "turn": turn,
                "type": "EndLeaderBattle",
                "winner": "draw"
            }
       }
       return  {
            "turn": turn,
            "type": "EndLeaderBattle",
            "winner": winner
        }
    }

    async monsterInField(fieldArea){
        var monsterInField = false
        console.log("fieldArea "+JSON.stringify(fieldArea))
        for(let i = 0; i < fieldArea.length; i++){
            if(fieldArea[i]["cardDetails"][0]["cardType"] == "character"){
                monsterInField = true;
                break;
            }
        }
        return monsterInField;
    }
    async checkIsSummonBattleReady(gameEnv){
        const playerList =  mozGamePlay.getPlayerFromGameEnv(gameEnv);
        const area = ["top","left","right"];
        var allFillWithMonster = true;
       
        for (let playerListIdx in playerList){
            for (let areaIdx in area){
                const player = playerList[playerListIdx]
                const monsterArr = gameEnv[player].Field[area[areaIdx]];
                var areaContainMonster = false;
                for(let monsterArrIdx in monsterArr){
                   if(monsterArr[monsterArrIdx]["isBack"][0]){
                        areaContainMonster = true;
                   }else if(monsterArr[monsterArrIdx]["cardDetails"][0]["cardType"] == "character"){
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
        const playerArr = mozGamePlay.getPlayerFromGameEnv(gameEnv)
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
    /**
     * Calculates total player points including all effects and combos
     * This is the core scoring function that determines battle outcomes
     * @param {Object} gameEnv - Current game environment
     * @param {string} playerId - Player whose points to calculate
     * @returns {number} Total points including base power, effects, and combos
     */
    async calculatePlayerPoint(gameEnv, playerId) {
        let totalPoints = 0;
        const fields = ['top', 'left', 'right'];
        const playerField = gameEnv[playerId].Field;
        const currentLeader = playerField.leader;
        
        // Load all card data for effect processing
        const characterCards = require('../data/characterCards.json');
        const utilityCards = require('../data/utilityCards.json');
        const leaderCards = require('../data/leaderCards.json');
        
        // Step 1: Calculate base power for each face-up character card
        let characterPowers = {};
        for (const zone of fields) {
            if (playerField[zone] && playerField[zone].length > 0) {
                for (const cardObj of playerField[zone]) {
                    // Only count face-up character cards for power calculation
                    if (cardObj.cardDetails[0].cardType === 'character' && !cardObj.isBack[0]) {
                        const cardId = cardObj.cardDetails[0].id;
                        const basePower = cardObj.cardDetails[0].power || 0;
                        characterPowers[cardId] = { basePower, zone, modifiers: 0 };
                    }
                }
            }
        }
        
        // Step 2: Apply leader continuous effects (always active)
        if (currentLeader && currentLeader.effects && currentLeader.effects.rules) {
            for (const rule of currentLeader.effects.rules) {
                if (rule.type === 'continuous') {
                    characterPowers = this.applyEffectRule(rule, characterPowers, playerField, gameEnv, playerId, 'leader');
                }
            }
        }
        
        // Step 3: Apply utility card continuous effects (help and SP cards)
        const utilityZones = ['help', 'sp'];
        for (const zone of utilityZones) {
            if (playerField[zone] && playerField[zone].length > 0) {
                for (const cardObj of playerField[zone]) {
                    // Only apply effects from face-up utility cards
                    if (!cardObj.isBack[0]) {
                        const cardId = cardObj.cardDetails[0].id;
                        const utilityCard = utilityCards.cards[cardId];
                        if (utilityCard && utilityCard.effects && utilityCard.effects.rules) {
                            for (const rule of utilityCard.effects.rules) {
                                if (rule.type === 'continuous') {
                                    characterPowers = this.applyEffectRule(rule, characterPowers, playerField, gameEnv, playerId, 'utility');
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Step 4: Calculate total power from all characters (enforce minimum 0)
        for (const cardId in characterPowers) {
            const finalPower = Math.max(0, characterPowers[cardId].basePower + characterPowers[cardId].modifiers);
            totalPoints += finalPower;
        }
        
        // Step 5: Add combo bonuses for special card combinations
        const comboBonus = this.calculateComboBonus(characterPowers, characterCards, gameEnv, playerId);
        totalPoints += comboBonus;
        
        return totalPoints;
    }

    async getMonsterPoint(card,leader){
        var returnValue = card["power"];
        const cardAttr = card["traits"];
        const leaderNativeAddition = leader["nativeAddition"];
        var addVal = {}
        for(let key in leaderNativeAddition){
            addVal[leaderNativeAddition[key]["type"]] = leaderNativeAddition[key]["value"];
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

    
    isCardMatchingLeader(card, leader, area ){
        var returnValue = false;
        for (let idx in card["traits"]){
            if(card["traits"][idx] == "all"){
                returnValue = true;
                return returnValue;
            }
        }
        if(area == "help" || area == "sp"){
            return true;
        }
        leader[area].forEach(function(attr){
            if(attr == "all"){
                returnValue = true;
                return returnValue;
            }
            var isAttrMatch = false;
            for (let key in card["traits"]){
                if(card["traits"][key] == attr){
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

    applyEffectRule(rule, characterPowers, playerField, gameEnv, playerId, sourceType) {
        // Check if rule conditions are met
        if (!this.checkRuleConditions(rule.trigger.conditions, playerField, gameEnv, playerId)) {
            return characterPowers;
        }
        
        // Apply effect based on target
        const targets = this.getEffectTargets(rule.target, playerField, gameEnv, playerId);
        
        for (const target of targets) {
            if (rule.effect.type === 'modifyPower') {
                const cardId = target.cardId;
                if (characterPowers[cardId]) {
                    if (rule.effect.operation === 'add') {
                        characterPowers[cardId].modifiers += rule.effect.value;
                    } else if (rule.effect.operation === 'set') {
                        characterPowers[cardId].modifiers = rule.effect.value - characterPowers[cardId].basePower;
                    }
                }
            }
        }
        
        return characterPowers;
    }
    
    checkRuleConditions(conditions, playerField, gameEnv, playerId) {
        if (!conditions || conditions.length === 0) return true;
        
        for (const condition of conditions) {
            if (condition.type === 'selfHasCharacterWithName') {
                const hasCharacter = this.hasCharacterWithName(playerField, condition.value);
                if (!hasCharacter) return false;
            } else if (condition.type === 'selfHasLeader') {
                const hasLeader = playerField.leader && playerField.leader.name && playerField.leader.name.includes(condition.value);
                if (!hasLeader) return false;
            } else if (condition.type === 'opponentHandCardCountMoreThan') {
                const opponentId = this.getOpponentId(gameEnv, playerId);
                const opponentHandCount = gameEnv[opponentId].deck.hand.length;
                if (opponentHandCount <= condition.value) return false;
            } else if (condition.type === 'zoneEmpty') {
                const zone = condition.zone;
                if (playerField[zone] && playerField[zone].length > 0) return false;
            } else if (condition.type === 'opponentHasCharacterWithName') {
                const opponentId = this.getOpponentId(gameEnv, playerId);
                const hasCharacter = this.hasCharacterWithName(gameEnv[opponentId].Field, condition.value);
                if (!hasCharacter) return false;
            } else if (condition.type === 'opponentHasLeader') {
                const opponentId = this.getOpponentId(gameEnv, playerId);
                const hasLeader = gameEnv[opponentId].Field.leader && gameEnv[opponentId].Field.leader.name && gameEnv[opponentId].Field.leader.name.includes(condition.value);
                if (!hasLeader) return false;
            } else if (condition.type === 'or') {
                // Handle OR conditions
                let orConditionMet = false;
                for (const orCondition of condition.conditions) {
                    if (this.checkRuleConditions([orCondition], playerField, gameEnv, playerId)) {
                        orConditionMet = true;
                        break;
                    }
                }
                if (!orConditionMet) return false;
            }
        }
        
        return true;
    }
    
    hasCharacterWithName(playerField, name) {
        const fields = ['top', 'left', 'right'];
        for (const zone of fields) {
            if (playerField[zone] && playerField[zone].length > 0) {
                for (const cardObj of playerField[zone]) {
                    if (cardObj.cardDetails[0].name && cardObj.cardDetails[0].name.includes(name)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    getEffectTargets(target, playerField, gameEnv, playerId) {
        const targets = [];
        const fields = target.zones || ['top', 'left', 'right'];
        
        // Determine which player's field to check
        let targetField;
        if (target.owner === 'self') {
            targetField = playerField;
        } else if (target.owner === 'opponent') {
            const playerList = mozGamePlay.getPlayerFromGameEnv(gameEnv);
            const opponentId = playerList.find(p => p !== playerId);
            targetField = gameEnv[opponentId].Field;
        }
        
        if (!targetField) return targets;
        
        for (const zone of fields) {
            if (targetField[zone] && targetField[zone].length > 0) {
                for (const cardObj of targetField[zone]) {
                    if (this.matchesFilters(cardObj, target.filters)) {
                        targets.push({ cardId: cardObj.cardDetails[0].id, zone, cardObj });
                        if (target.limit && targets.length >= target.limit) {
                            return targets;
                        }
                    }
                }
            }
        }
        
        return targets;
    }
    
    matchesFilters(cardObj, filters) {
        if (!filters || filters.length === 0) return true;
        
        for (const filter of filters) {
            if (filter.type === 'hasTrait') {
                const traits = cardObj.cardDetails[0].traits || [];
                if (!traits.includes(filter.value)) return false;
            } else if (filter.type === 'hasGameType') {
                const gameType = cardObj.cardDetails[0].gameType;
                if (Array.isArray(filter.value)) {
                    if (!filter.value.includes(gameType)) return false;
                } else {
                    if (gameType !== filter.value) return false;
                }
            }
        }
        
        return true;
    }
    
    calculateComboBonus(characterPowers, characterCards, gameEnv, playerId) {
        let comboBonus = 0;
        const combos = characterCards.combos || {};
        
        // Get all face-up character cards
        const activeCards = [];
        for (const cardId in characterPowers) {
            const cardData = characterCards.cards[cardId];
            if (cardData) {
                activeCards.push(cardData);
            }
        }
        
        if (activeCards.length === 0) return 0;
        
        // Check for combo types
        if (combos.all_same_type && this.checkAllSameType(activeCards)) {
            comboBonus += combos.all_same_type.bonus;
        }
        
        if (combos.all_different_type && this.checkAllDifferentType(activeCards)) {
            comboBonus += combos.all_different_type.bonus;
        }
        
        if (combos.high_power_trio && this.checkHighPowerTrio(activeCards)) {
            comboBonus += combos.high_power_trio.bonus;
        }
        
        if (combos.trait_synergy && this.checkTraitSynergy(activeCards)) {
            comboBonus += combos.trait_synergy.bonus;
        }
        
        if (combos.balanced_power && this.checkBalancedPower(activeCards)) {
            comboBonus += combos.balanced_power.bonus;
        }
        
        return comboBonus;
    }
    
    checkAllSameType(cards) {
        if (cards.length < 2) return false;
        const firstType = cards[0].gameType;
        return cards.every(card => card.gameType === firstType);
    }
    
    checkAllDifferentType(cards) {
        if (cards.length < 2) return false;
        const types = new Set(cards.map(card => card.gameType));
        return types.size === cards.length;
    }
    
    checkHighPowerTrio(cards) {
        if (cards.length < 3) return false;
        return cards.every(card => card.power >= 80);
    }
    
    checkTraitSynergy(cards) {
        if (cards.length < 2) return false;
        const allTraits = cards.flatMap(card => card.traits || []);
        const traitCounts = {};
        for (const trait of allTraits) {
            traitCounts[trait] = (traitCounts[trait] || 0) + 1;
        }
        return Object.values(traitCounts).some(count => count >= 2);
    }
    
    checkBalancedPower(cards) {
        if (cards.length < 3) return false;
        const powers = cards.map(card => card.power).sort((a, b) => a - b);
        const diff = powers[powers.length - 1] - powers[0];
        return diff <= 30;
    }
    
    /**
     * Processes character card summon effects
     * Executes triggered effects that occur when a character is summoned to the field
     * @param {Object} gameEnv - Current game environment
     * @param {string} playerId - Player who summoned the character
     * @param {Object} cardDetails - Details of the summoned character card
     */
    async processCharacterSummonEffects(gameEnv, playerId, cardDetails) {
        if (!cardDetails.effects || !cardDetails.effects.rules) return;
        
        const characterCards = require('../data/characterCards.json');
        const cardData = characterCards.cards[cardDetails.id];
        
        if (cardData && cardData.effects && cardData.effects.rules) {
            for (const rule of cardData.effects.rules) {
                // Execute onSummon triggered effects (e.g., draw cards, search deck)
                if (rule.type === 'triggered' && rule.trigger.event === 'onSummon') {
                    await this.executeEffectRule(rule, gameEnv, playerId);
                }
            }
        }
    }
    
    /**
     * Processes utility card (help/SP) play effects
     * Executes triggered effects that occur when utility cards are played
     * @param {Object} gameEnv - Current game environment
     * @param {string} playerId - Player who played the utility card
     * @param {Object} cardDetails - Details of the played utility card
     */
    async processUtilityCardEffects(gameEnv, playerId, cardDetails) {
        if (!cardDetails.effects || !cardDetails.effects.rules) return;
        
        const utilityCards = require('../data/utilityCards.json');
        const cardData = utilityCards.cards[cardDetails.id];
        
        if (cardData && cardData.effects && cardData.effects.rules) {
            for (const rule of cardData.effects.rules) {
                // Execute onPlay triggered effects (e.g., discard cards, force actions)
                if (rule.type === 'triggered' && rule.trigger.event === 'onPlay') {
                    await this.executeEffectRule(rule, gameEnv, playerId);
                }
                // Note: Continuous effects are processed during calculatePlayerPoint
            }
        }
    }
    
    /**
     * Executes a specific effect rule
     * Handles various types of card effects like drawing cards, discarding, searching deck
     * @param {Object} rule - Effect rule from card data
     * @param {Object} gameEnv - Current game environment
     * @param {string} playerId - Player who triggered the effect
     */
    async executeEffectRule(rule, gameEnv, playerId) {
        // Check if effect conditions are met before executing
        if (!this.checkRuleConditions(rule.trigger.conditions, gameEnv[playerId].Field, gameEnv, playerId)) {
            return;
        }
        
        // Determine target player (self or opponent)
        const targetPlayerId = rule.target.owner === 'opponent' ? this.getOpponentId(gameEnv, playerId) : playerId;
        
        // Execute different types of triggered effects
        if (rule.effect.type === 'drawCard') {
            // Force target to draw cards from deck
            await this.drawCardsForPlayer(gameEnv, targetPlayerId, rule.effect.value);
        } else if (rule.effect.type === 'discardRandomCard') {
            // Force target to randomly discard cards from hand
            await this.discardRandomCards(gameEnv, targetPlayerId, rule.effect.value);
        } else if (rule.effect.type === 'searchCard') {
            // Search deck for specific cards and add to hand
            await this.searchCardEffect(gameEnv, targetPlayerId, rule.effect);
        } else if (rule.effect.type === 'forcePlaySP') {
            // Force opponent to play SP card in next SP phase
            gameEnv[targetPlayerId]['forcedSpPlay'] = true;
        }
        // Note: Continuous effects (modifyPower, invalidateEffect, etc.) are handled in calculatePlayerPoint
    }
    
    /**
     * Gets the opponent's player ID
     * @param {Object} gameEnv - Current game environment
     * @param {string} playerId - Current player's ID
     * @returns {string} Opponent's player ID
     */
    getOpponentId(gameEnv, playerId) {
        const playerList = mozGamePlay.getPlayerFromGameEnv(gameEnv);
        return playerList.find(p => p !== playerId);
    }
    
    /**
     * Executes search card effect - allows player to search deck for specific cards
     * Used by cards like "海湖莊園" to search for character cards
     * @param {Object} gameEnv - Current game environment
     * @param {string} playerId - Player performing the search
     * @param {Object} effect - Search effect parameters (searchCount, selectCount, cardTypeFilter)
     */
    async searchCardEffect(gameEnv, playerId, effect) {
        const deck = gameEnv[playerId].deck.mainDeck;
        const hand = gameEnv[playerId].deck.hand;
        
        if (deck.length === 0) return;
        
        // Look at top N cards from deck
        const searchCount = Math.min(effect.searchCount, deck.length);
        const topCards = deck.slice(0, searchCount);
        
        // Filter cards by type if specified (e.g., only character cards)
        let eligibleCards = topCards;
        if (effect.cardTypeFilter) {
            const characterCards = require('../data/characterCards.json');
            const utilityCards = require('../data/utilityCards.json');
            
            eligibleCards = topCards.filter(cardId => {
                const charCard = characterCards.cards[cardId];
                const utilCard = utilityCards.cards[cardId];
                const card = charCard || utilCard;
                return card && card.cardType === effect.cardTypeFilter;
            });
        }
        
        // Select cards to add to hand (random selection for AI simplicity)
        const selectCount = Math.min(effect.selectCount, eligibleCards.length);
        const selectedCards = [];
        for (let i = 0; i < selectCount; i++) {
            if (eligibleCards.length > 0) {
                const randomIndex = Math.floor(Math.random() * eligibleCards.length);
                selectedCards.push(eligibleCards.splice(randomIndex, 1)[0]);
            }
        }
        
        // Add selected cards to player's hand
        for (const cardId of selectedCards) {
            hand.push(cardId);
            // Remove from deck
            const deckIndex = deck.indexOf(cardId);
            if (deckIndex !== -1) {
                deck.splice(deckIndex, 1);
            }
        }
        
        // Put remaining searched cards to bottom of deck (shuffle effect)
        const remainingSearched = topCards.filter(cardId => !selectedCards.includes(cardId));
        for (const cardId of remainingSearched) {
            const deckIndex = deck.indexOf(cardId);
            if (deckIndex !== -1) {
                deck.splice(deckIndex, 1);
                deck.push(cardId); // Add to bottom
            }
        }
    }
    
    /**
     * Forces a player to draw cards from their deck
     * Used by card effects like "bitcoin 真香" (draw 2 cards)
     * @param {Object} gameEnv - Current game environment
     * @param {string} playerId - Player who should draw cards
     * @param {number} count - Number of cards to draw
     */
    async drawCardsForPlayer(gameEnv, playerId, count) {
        for (let i = 0; i < count; i++) {
            const hand = gameEnv[playerId].deck.hand;
            const mainDeck = gameEnv[playerId].deck.mainDeck;
            const result = mozDeckHelper.drawToHand(hand, mainDeck);
            gameEnv[playerId].deck.hand = result["hand"];
            gameEnv[playerId].deck.mainDeck = result["mainDeck"];
        }
    }
    
    /**
     * Forces a player to randomly discard cards from their hand
     * Used by card effects like "You have no card" (discard 2 cards if opponent has >4 cards)
     * @param {Object} gameEnv - Current game environment
     * @param {string} targetPlayerId - Player who should discard cards
     * @param {number} count - Number of cards to discard
     */
    async discardRandomCards(gameEnv, targetPlayerId, count) {
        const hand = gameEnv[targetPlayerId].deck.hand;
        for (let i = 0; i < count && hand.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * hand.length);
            hand.splice(randomIndex, 1);
        }
    }
    
    /**
     * Checks if SP phase is needed before battle resolution
     * SP phase occurs when any player has played SP cards
     * @param {Object} gameEnv - Current game environment
     * @returns {boolean} True if SP phase is needed
     */
    async checkNeedsSpPhase(gameEnv) {
        const playerList = mozGamePlay.getPlayerFromGameEnv(gameEnv);
        
        // Check if any player has SP cards on the field
        for (const playerId of playerList) {
            if (gameEnv[playerId].Field.sp && gameEnv[playerId].Field.sp.length > 0) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Starts the SP phase - executes all SP card effects in priority order
     * SP cards execute based on leader initial points (highest first)
     * @param {Object} gameEnv - Current game environment
     * @returns {Object} Updated game environment after SP phase
     */
    async startSpPhase(gameEnv) {
        mozPhaseManager.setCurrentPhase(TurnPhase.SP_PHASE);
        gameEnv["phase"] = mozPhaseManager.currentPhase;
        
        // Execute all SP cards in priority order (leader initial points determine order)
        await this.executeSpCardsInPriorityOrder(gameEnv);
        
        // After SP phase completes, proceed to battle resolution
        return await this.concludeLeaderBattleAndNewStart(gameEnv, gameEnv["currentPlayer"]);
    }
    
    /**
     * Executes all SP cards in priority order based on leader initial points
     * Higher leader initial points = higher priority = executes first
     * @param {Object} gameEnv - Current game environment
     */
    async executeSpCardsInPriorityOrder(gameEnv) {
        const playerList = mozGamePlay.getPlayerFromGameEnv(gameEnv);
        const spCardPriorities = [];
        
        // Collect all face-up SP cards with their player's leader priority
        for (const playerId of playerList) {
            const leader = this.cardInfoUtils.getCurrentLeader(gameEnv, playerId);
            const spCards = gameEnv[playerId].Field.sp || [];
            
            for (const spCardObj of spCards) {
                // Only process face-up SP cards
                if (!spCardObj.isBack[0]) {
                    spCardPriorities.push({
                        playerId,
                        cardObj: spCardObj,
                        leaderPriority: leader.initialPoint || 0
                    });
                }
            }
        }
        
        // Sort by leader initial points (highest priority executes first)
        spCardPriorities.sort((a, b) => b.leaderPriority - a.leaderPriority);
        
        // Execute SP card effects in priority order
        const utilityCards = require('../data/utilityCards.json');
        for (const spCard of spCardPriorities) {
            const cardData = utilityCards.cards[spCard.cardObj.cardDetails[0].id];
            if (cardData && cardData.effects && cardData.effects.rules) {
                for (const rule of cardData.effects.rules) {
                    // Execute SP phase specific effects
                    if (rule.type === 'triggered' && rule.trigger.event === 'spPhase') {
                        await this.executeEffectRule(rule, gameEnv, spCard.playerId);
                    }
                }
            }
        }
    }
    
    static getPlayerFromGameEnv(gameEnv) {
        return getPlayerFromGameEnv(gameEnv);
    }

    isSummonBattleEnd(gameEnv){
        var returnValue = false;
        if(gameEnv["phase"] == TurnPhase.END_LEADER_BATTLE){
            returnValue = true;
        }
        return returnValue;
    }
}
module.exports = new mozGamePlay();
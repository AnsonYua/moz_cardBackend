const DeckManager = require('./DeckManager');
const CardInfoUtils = require('./CardInfoUtils');
const { 
    getPlayerFromGameEnv,
    getOpponentPlayer,
    isConditionMatch
 } = require('../utils/gameUtils');

class CardEffectManager {
    constructor() {
        this.deckManager = DeckManager;
        this.cardInfoUtils = CardInfoUtils;
    }

    /**
     * Check if a card can be summoned to a specific position
     */
    async checkSummonRestriction(gameEnv, currentPlayerId, cardDetails, playPos) {
        // 1. Basic position validation
        if (cardDetails.type === 'monster') {
            // Monsters can only be placed in sky, left, or right
            if (playPos === 'help' || playPos === 'sp') {
                return {
                    canPlace: false,
                    reason: `Monster cards cannot be placed in ${playPos} position`
                };
            }
        }

        // 2. Check summoner restrictions
        const summoner = gameEnv[currentPlayerId].Field.summonner;
        if (summoner) {
            const allowedFields = summoner[playPos] || [];
            if (!allowedFields.includes('all') && !allowedFields.includes(cardDetails.attribute[0])) {
                return {
                    canPlace: false,
                    reason: `Summoner does not allow ${cardDetails.attribute[0]} type cards in ${playPos} field`
                };
            }
        }
        let opponentPlayerId = getOpponentPlayer(gameEnv);
        let playerIdArr = [currentPlayerId, opponentPlayerId];
        // 3. Check SP card restrictions
        for(let playerId of playerIdArr){
            const spCards = gameEnv[playerId].Field.sp || [];
            for (const spCard of spCards) {
                const effectRules = spCard.cardDetails[0].effectRules || [];
                for (const rule of effectRules) {
                    if (rule.effectType === 'blockSummonCard') {
                        let isOpponent = playerId === opponentPlayerId;
                        const isTargetMatch = await this.checkIsTargetMatch(rule.effectType, rule.target, gameEnv, isOpponent, cardDetails, playPos);
                        const canPlace = await this.evaluatePlacementCondition(rule, gameEnv, currentPlayerId, cardDetails);
                        if (!canPlace && isTargetMatch) {
                            return {
                                canPlace: false,
                                reason: rule.reason || 'SP card effect prevents card placement'
                            };
                        }
                    }
                }
            }
        }

        // 4. Check help card restrictions
        const helpCards = gameEnv[currentPlayerId].Field.help || [];
        for (const helpCard of helpCards) {
            const effectRules = helpCard.cardDetails[0].effectRules || [];
            for (const rule of effectRules) {
                if (rule.effectType === 'blockSummonCard') {
                    const canPlace = await this.evaluatePlacementCondition(rule, gameEnv, currentPlayerId, cardDetails);
                    if (!canPlace) {
                        return {
                            canPlace: false,
                            reason: rule.reason || 'Help card effect prevents card placement'
                        };
                    }
                }
            }
        }

        // 5. Check monster card restrictions
        const monsters = gameEnv[currentPlayerId].Field[playPos] || [];
        for (const monster of monsters) {
            const effectRules = monster.cardDetails[0].effectRules || [];
            for (const rule of effectRules) {
                if (rule.effectType === 'blockSummonCard') {
                    const canPlace = await this.evaluatePlacementCondition(rule, gameEnv, currentPlayerId, cardDetails);
                    if (!canPlace) {
                        return {
                            canPlace: false,
                            reason: rule.reason || 'Monster effect prevents card placement'
                        };
                    }
                }
            }
        }

        // 6. Check for overrides
        const overrideResult = await this.checkOverrideRestrictions(gameEnv, currentPlayerId, cardDetails, playPos);
        if (overrideResult.hasOverride) {
            return {
                canPlace: true,
                overrideInfo: {
                    overrideCardId: overrideResult.overrideCardId,
                    overrideCardType: overrideResult.overrideCardType,
                    overrideReason: overrideResult.overrideReason
                }
            };
        }

        return { canPlace: true };
    }

    async checkIsTargetMatch(
        effectType,
        target, 
        gameEnv, 
        isOpponent, 
        cardDetails,
        playPos) {
        let returnValue = false;

        switch(effectType){
            case "blockSummonCard":
                returnValue = await this.checkBlockSummonCard(target, gameEnv, isOpponent, cardDetails, playPos);
                break;
        }
        return returnValue;
    }

    async checkBlockSummonCard(target, gameEnv, isOpponent, cardDetails, playPos) {
        let returnValue = false;
        let lookingAt = "self"
        if(isOpponent){
            target.type = "opponent";
        }
        if(target.type == lookingAt && target.scope.includes(playPos)){
            let subScope = target.subScope;
            if(subScope.includes("attr_")){
                let attribute = subScope.split("_")[1];
                returnValue = cardDetails.attribute.includes(attribute);
            }else if(subScope.includes("monsterType_")){
                let monsterType = subScope.split("_")[1];
                returnValue = cardDetails.monsterType.includes(monsterType);
            }else if(subScope.includes("name_")){
                let monsterName = subScope.split("_")[1];
                returnValue = cardDetails.cardName.includes(monsterName);
            }else if(subScope.includes("all")){
                returnValue = true;
            }
        }
        return returnValue;
    }

    /**
     * Evaluate placement condition for a specific rule
     */
    async evaluatePlacementCondition(rule, gameEnv, playerId, cardDetails) {
        const condition = rule.condition;
        
        switch (condition.type) {
            case 'opponentHasSummoner':
                return this.checkOpponentHasSummoner(gameEnv, playerId, condition.value);
            
            case 'opponentSummonerHasType':
                return this.checkOpponentSummonerType(gameEnv, playerId, condition.value);
            
            case 'selfHasMonster':
                return this.checkSelfHasMonster(gameEnv, playerId, condition.value);
            
            case 'selfHasMonsterWithAttribute':
                return this.checkSelfHasMonsterWithAttribute(gameEnv, playerId, condition.value);
            
            case 'cardHasAttribute':
                return this.checkCardHasAttribute(cardDetails, condition.value);
            
            case 'cardHasMonsterType':
                return this.checkCardHasMonsterType(cardDetails, condition.value);
            
            default:
                return true;
        }
    }

    /**
     * Check for override restrictions
     */
    async checkOverrideRestrictions(gameEnv, playerId, cardDetails, playPos) {
        // Check SP cards for overrides
        const spCards = gameEnv[playerId].Field.sp || [];
        for (const spCard of spCards) {
            const effectRules = spCard.cardDetails[0].effectRules || [];
            for (const rule of effectRules) {
                if (rule.effectType === 'overrideRestriction') {
                    const canOverride = await this.evaluatePlacementCondition(rule, gameEnv, playerId, cardDetails);
                    if (canOverride) {
                        return {
                            hasOverride: true,
                            overrideCardId: spCard.cardDetails[0].id,
                            overrideCardType: 'SP',
                            overrideReason: rule.reason || 'SP card overrides placement restriction'
                        };
                    }
                }
            }
        }

        // Check help cards for overrides
        const helpCards = gameEnv[playerId].Field.help || [];
        for (const helpCard of helpCards) {
            const effectRules = helpCard.cardDetails[0].effectRules || [];
            for (const rule of effectRules) {
                if (rule.effectType === 'overrideRestriction') {
                    const canOverride = await this.evaluatePlacementCondition(rule, gameEnv, playerId, cardDetails);
                    if (canOverride) {
                        return {
                            hasOverride: true,
                            overrideCardId: helpCard.cardDetails[0].id,
                            overrideCardType: 'HELP',
                            overrideReason: rule.reason || 'Help card overrides placement restriction'
                        };
                    }
                }
            }
        }

        return { hasOverride: false };
    }

    // Helper methods for condition evaluation
    checkOpponentHasSummoner(gameEnv, playerId, summonerName) {
        const opponentId = this.getOpponentId(playerId);
        const opponentSummoner = gameEnv[opponentId].Field.summonner;
        return opponentSummoner && opponentSummoner.name === summonerName;
    }

    checkOpponentSummonerType(gameEnv, playerId, type) {
        const opponentId = this.getOpponentId(playerId);
        const opponentSummoner = gameEnv[opponentId].Field.summonner;
        return opponentSummoner && opponentSummoner.type.includes(type);
    }

    checkSelfHasMonster(gameEnv, playerId, monsterName) {
        return ['sky', 'left', 'right'].some(field => {
            return gameEnv[playerId].Field[field].some(monster => 
                monster.cardDetails[0].cardName === monsterName
            );
        });
    }

    checkSelfHasMonsterWithAttribute(gameEnv, playerId, attribute) {
        return ['sky', 'left', 'right'].some(field => {
            return gameEnv[playerId].Field[field].some(monster => 
                monster.cardDetails[0].attribute.includes(attribute)
            );
        });
    }

    checkCardHasAttribute(card, attribute) {
        return card.attribute.includes(attribute);
    }

    checkCardHasMonsterType(card, monsterType) {
        return card.monsterType && card.monsterType.includes(monsterType);
    }

    getOpponentId(playerId) {
        return playerId === 'playerId_1' ? 'playerId_2' : 'playerId_1';
    }

    /**
     * Helper method to check if a monster is on the field
     */
    hasMonsterOnField(gameEnv, playerId, monsterName) {
        const fields = ['sky', 'left', 'right'];
        return fields.some(field => {
            return gameEnv[playerId].Field[field].some(cardObj => {
                return !cardObj.isBack[0] && cardObj.cardDetails[0].cardName === monsterName;
            });
        });
    }

    /**
     * Helper method to check if a monster type is on the field
     */
    hasMonsterTypeOnField(gameEnv, playerId, monsterType) {
        const fields = ['sky', 'left', 'right'];
        return fields.some(field => {
            return gameEnv[playerId].Field[field].some(cardObj => {
                return !cardObj.isBack[0] && 
                       cardObj.cardDetails[0].monsterType && 
                       cardObj.cardDetails[0].monsterType.includes(monsterType);
            });
        });
    }

    /**
     * Helper method to set a card's value
     */
    setCardValue(gameEnv, playerId, target, value) {
        const fields = ['sky', 'left', 'right'];
        fields.forEach(field => {
            gameEnv[playerId].Field[field].forEach(cardObj => {
                if (!cardObj.isBack[0] && cardObj.cardDetails[0].id === target.cardId) {
                    cardObj.valueOnField = value;
                }
            });
        });
    }

    /**
     * Helper method to set opponent's monster value
     */
    setOpponentMonsterValue(gameEnv, opponentId, monsterName, value) {
        const fields = ['sky', 'left', 'right'];
        fields.forEach(field => {
            gameEnv[opponentId].Field[field].forEach(cardObj => {
                if (!cardObj.isBack[0] && cardObj.cardDetails[0].cardName === monsterName) {
                    cardObj.cardDetails[0].value = value;
                }
            });
        });
    }

    /**
     * Helper method to check if a help card was played
     */
    isHelpCardPlayed(gameEnv, playerId, helpCardName) {
        return gameEnv[playerId].Field.help.some(cardObj => {
            return !cardObj.isBack[0] && cardObj.cardDetails[0].cardName === helpCardName;
        });
    }

    /**
     * Helper method to set adjacent monsters' values
     */
    setAdjacentMonstersValue(gameEnv, opponentId, value) {
        ['left', 'right'].forEach(field => {
            gameEnv[opponentId].Field[field].forEach(cardObj => {
                if (!cardObj.isBack[0]) {
                    cardObj.cardDetails[0].value = value;
                }
            });
        });
    }

    /**
     * Helper method to set value for all monsters of a specific type
     */
    setMonsterTypeValue(gameEnv, playerId, monsterType, value) {
        const fields = ['sky', 'left', 'right'];
        fields.forEach(field => {
            gameEnv[playerId].Field[field].forEach(cardObj => {
                if (!cardObj.isBack[0] && 
                    cardObj.cardDetails[0].monsterType && 
                    cardObj.cardDetails[0].monsterType.includes(monsterType)) {
                    cardObj.cardDetails[0].value = value;
                }
            });
        });
    }

    /**
     * Helper method to set value for monsters with specific value
     */
    setValueBasedMonsterValue(gameEnv, playerId, targetValue, newValue) {
        const fields = ['sky', 'left', 'right'];
        fields.forEach(field => {
            gameEnv[playerId].Field[field].forEach(cardObj => {
                if (!cardObj.isBack[0] && cardObj.cardDetails[0].value === targetValue) {
                    cardObj.cardDetails[0].value = newValue;
                }
            });
        });
    }

    /**
     * Helper method to set value for all opponent's monsters
     */
    setAllOpponentMonsterValue(gameEnv, opponentId, value) {
        const fields = ['sky', 'left', 'right'];
        fields.forEach(field => {
            gameEnv[opponentId].Field[field].forEach(cardObj => {
                if (!cardObj.isBack[0]) {
                    cardObj.cardDetails[0].value = value;
                }
            });
        });
    }

    /**
     * Initialize restrictions for a player if they don't exist
     * @param {Object} gameEnv - Current game environment
     * @param {string} playerId - ID of the player to initialize restrictions for
     */
    initializeRestrictions(gameEnv, playerId) {
        if (!gameEnv[playerId].restrictions) {
            gameEnv[playerId].restrictions = { summonRestrictions: [] };
        }
        if (!gameEnv[playerId].restrictions.summonRestrictions) {
            gameEnv[playerId].restrictions.summonRestrictions = [];
        }
    }
}

module.exports = new CardEffectManager(); 
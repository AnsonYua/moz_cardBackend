const DeckManager = require('./DeckManager');
const CardInfoUtils = require('./CardInfoUtils');
const { getPlayerFromGameEnv } = require('../utils/gameUtils');

class CardEffectManager {
    constructor() {
        this.deckManager = DeckManager;
        this.cardInfoUtils = CardInfoUtils;
    }

    /**
     * Apply card effects based on the game state
     * @param {Object} gameEnv - Current game environment
     * @param {string} playerId - ID of the player who owns the card
     * @param {Object} card - Card object with effect to apply
     * @param {Object} field - Current field state
     * @returns {Object} - Modified game environment
     */
    applyCardEffect(gameEnv, playerId, card, field) {
        if (!card.effectRules || card.effectRules.length === 0) {
            return gameEnv;
        }

        // Get opponent ID
        const players = getPlayerFromGameEnv(gameEnv);
        const opponentId = players.find(id => id !== playerId);

        // Apply each effect rule
        card.effectRules.forEach(rule => {
            if (this.checkCondition(gameEnv, playerId, rule.condition)) {
                this.applyEffect(gameEnv, playerId, opponentId, rule);
            }
        });

        return gameEnv;
    }

    /**
     * Check if a condition is met
     */
    checkCondition(gameEnv, playerId, condition) {
        const players = getPlayerFromGameEnv(gameEnv);
        const opponentId = players.find(id => id !== playerId);

        switch (condition.type) {
            case 'summoner':
                return this.cardInfoUtils.getCurrentSummonerName(gameEnv, playerId).includes(condition.value);
            
            case 'opponentHasMonster':
                return this.hasMonsterOnField(gameEnv, opponentId, condition.monsterName);
            
            case 'selfHasMonster':
                return this.hasMonsterOnField(gameEnv, playerId, condition.monsterName);
            
            case 'selfHasMonsterType':
                return this.hasMonsterTypeOnField(gameEnv, playerId, condition.monsterType);
            
            case 'helpCardUsed':
                return this.isHelpCardPlayed(gameEnv, playerId, condition.cardName);
            
            case 'opponentHasSummoner':
                const opponentSummonerName = this.cardInfoUtils.getCurrentSummonerName(gameEnv, opponentId);
                return opponentSummonerName.includes(condition.opponentName);
            
            case 'opponentSummonerHasType':
                const opponentSummonerType = this.cardInfoUtils.getCurrentSummonerType(gameEnv, opponentId);
                return opponentSummonerType.includes(condition.opponentType);
            
            case 'always':
                return true;
            
            default:
                return false;
        }
    }

    /**
     * Apply an effect based on its target and type
     */
    applyEffect(gameEnv, playerId, opponentId, rule) {
        const { target, effectType, value } = rule;

        switch (effectType) {
            case 'valueModification':
                this.applyValueModification(gameEnv, playerId, opponentId, target, value);
                break;
            case 'summonCondition':
                // Handle summon conditions if needed
                break;
        }
    }

    /**
     * Apply value modification effect
     */
    applyValueModification(gameEnv, playerId, opponentId, target, value) {
        switch (target.type) {
            case 'self':
                if (target.scope === 'single') {
                    this.setCardValue(gameEnv, playerId, target, value);
                }
                break;
            
            case 'opponent':
                switch (target.scope) {
                    case 'single':
                        if (target.monsterName) {
                            this.setOpponentMonsterValue(gameEnv, opponentId, target.monsterName, value);
                        }
                        break;
                    case 'all':
                        if (target.monsterType) {
                            this.setMonsterTypeValue(gameEnv, opponentId, target.monsterType, value);
                        } else if (target.value) {
                            this.setValueBasedMonsterValue(gameEnv, opponentId, target.value, value);
                        } else {
                            this.setAllOpponentMonsterValue(gameEnv, opponentId, value);
                        }
                        break;
                    case 'adjacent':
                        this.setAdjacentMonstersValue(gameEnv, opponentId, value);
                        break;
                }
                break;
            
            case 'component':
                if (target.scope === 'all' && target.monsterType) {
                    this.setMonsterTypeValue(gameEnv, playerId, target.monsterType, value);
                }
                break;
        }
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
     * Apply summoner's native addition effects to a single value
     * @param {number} baseValue - The base value to apply effects to
     * @param {Array} cardAttr - Card's attributes
     * @param {Object} summonerNativeAddition - Summoner's native addition object
     * @returns {number} - The total value after applying native addition effects
     */
    applySummonerNativeAddition(baseValue, cardAttr, summonerNativeAddition) {
        let totalValue = baseValue;

        // Check for "all" type in summoner's native addition
        for (let key in summonerNativeAddition) {
            if (summonerNativeAddition[key].type === "all") {
                totalValue += summonerNativeAddition[key].value;
                return totalValue; // Return immediately after applying "all" bonus
            }
        }

        // If no "all" type in summoner, check for matching attributes
        for (let key in summonerNativeAddition) {
            const additionType = summonerNativeAddition[key].type;
            if (cardAttr.includes(additionType)) {
                totalValue += summonerNativeAddition[key].value;
            }
        }

        return totalValue;
    }

    /**
     * Get modified native addition values based on summoner effects
     * @param {Object} gameEnv - Current game environment
     * @param {string} playerId - ID of the player who owns the summoner
     * @param {Object} summoner - Current summoner object
     * @returns {Array} - Modified native addition values
     */
    getModifiedNativeAddition(gameEnv, playerId, summoner) {
        // Create a copy of the summoner's nativeAddition to modify
        let modifiedNativeAddition = [...summoner.nativeAddition];
        
        // Apply summoner effect rules if they exist
        if (summoner.effectRules && summoner.effectRules.length > 0) {
            const players = getPlayerFromGameEnv(gameEnv);
            const opponentId = players.find(id => id !== playerId);
            
            for (const rule of summoner.effectRules) {
                // Check for opponentHasSummoner condition
                if (rule.effectType === 'valueModification' && 
                    rule.target.type === 'self' &&
                    rule.target.modificationType === 'nativeAddition') {
                    let isConditionMet = false;
                    if(rule.condition.type === 'opponentHasSummoner'){
                        const opponentSummonerName = this.cardInfoUtils.getCurrentSummonerName(gameEnv, opponentId);
                        if (opponentSummonerName.includes(rule.condition.opponentName)) {
                            isConditionMet = true;
                        }
                    }else if(rule.condition.type === 'opponentSummonerHasType'){
                        const opponentSummonerType = this.cardInfoUtils.getCurrentSummonerType(gameEnv, opponentId);
                        if (opponentSummonerType.includes(rule.condition.opponentType)) {
                            isConditionMet = true;
                        }
                    }

                    if(isConditionMet){
                        modifiedNativeAddition = modifiedNativeAddition.map(addition => ({
                            ...addition,
                            value: rule.value
                        }));
                    }
                
                }
            }
        }
        
        return modifiedNativeAddition;
    }

    /**
     * Apply summoner's native addition effects to monster cards
     * @param {Object} gameEnv - Current game environment
     * @param {string} playerId - ID of the player who owns the card
     * @param {Object} cardObj - Card object to apply effects to
     * @param {Object} summoner - Current summoner object
     * @returns {Object} - Modified game environment
     */
    async applySummonerEffect(gameEnv, playerId, cardObj, summoner) {
        const cardAttr = cardObj.cardDetails[0].attribute;
        const baseValue = cardObj.valueOnField || cardObj.cardDetails[0].value;
        
        // Get modified native addition values
        const modifiedNativeAddition = this.getModifiedNativeAddition(gameEnv, playerId, summoner);
        console.log("-----------modifiedNativeAddition------------");
        console.log(JSON.stringify(modifiedNativeAddition, null, 2));
        console.log("--------------------------------");
        // Apply the modified native addition effects
        const totalValue = this.applySummonerNativeAddition(baseValue, cardAttr, modifiedNativeAddition);
        
        // Update the card object in gameEnv
        cardObj.valueOnField = totalValue;
        return gameEnv;
    }

    /**
     * Update summon restrictions for both players at the start of turn
     * @param {Object} gameEnv - Current game environment
     * @returns {Object} - Updated game environment
     */
    updateSummonRestrictions(gameEnv) {
        const players = getPlayerFromGameEnv(gameEnv);

        // Reset restrictions for both players
        players.forEach(playerId => {
            if (!gameEnv[playerId].restrictions) {
                gameEnv[playerId].restrictions = { summonRestrictions: [] };
            }
            gameEnv[playerId].restrictions.summonRestrictions = [];
        });

        // Check summoner effects for both players
        players.forEach(playerId => {
            const summoner = this.cardInfoUtils.getCurrentSummoner(gameEnv, playerId);
            if (summoner.effectRules) {
                summoner.effectRules.forEach(rule => {
                    if (rule.effectType === 'summonRestriction' && 
                        this.checkCondition(gameEnv, playerId, rule.condition)) {
                        let targetPlayerId = players.find(id => id !== playerId);
                        if(rule.target.type === 'self'){
                            targetPlayerId = playerId;
                        }
                        this.addSummonRestriction(gameEnv, targetPlayerId, rule.target.monsterType);
                    }
                });
            }
        });

        return gameEnv;
    }

    /**
     * Add a monster type to player's summon restrictions
     * @param {Object} gameEnv - Current game environment
     * @param {string} playerId - ID of the player to add restriction to
     * @param {string} monsterType - Type of monster to restrict
     */
    addSummonRestriction(gameEnv, playerId, monsterType) {
        if (!gameEnv[playerId].restrictions) {
            gameEnv[playerId].restrictions = { summonRestrictions: [] };
        }
        if (!gameEnv[playerId].restrictions.summonRestrictions) {
            gameEnv[playerId].restrictions.summonRestrictions = [];
        }
        
        // Add the restriction if it's not already there
        if (!gameEnv[playerId].restrictions.summonRestrictions.includes(monsterType)) {
            gameEnv[playerId].restrictions.summonRestrictions.push(monsterType);
        }
    }

    /**
     * Check if a card can be summoned based on current restrictions
     * @param {Object} gameEnv - Current game environment
     * @param {string} playerId - ID of the player attempting to summon
     * @param {Object} cardDetails - Details of the card being summoned
     * @param {boolean} isPlayInFaceDown - Whether the card is being played face down
     * @returns {Object|null} - Error object if restricted, null if allowed
     */
    checkSummonRestriction(gameEnv, playerId, cardDetails, isPlayInFaceDown) {
        if (!isPlayInFaceDown && 
            cardDetails.type === "monster" && 
            gameEnv[playerId].restrictions && 
            gameEnv[playerId].restrictions.summonRestrictions && 
            cardDetails.monsterType.some(type => 
                gameEnv[playerId].restrictions.summonRestrictions.includes(type)
            )) {
                return  `Cannot summon ${cardDetails.monsterType.join(', ')} type monsters due to opponent summoner effect`
        }
        return null;
    }
}

module.exports = new CardEffectManager(); 
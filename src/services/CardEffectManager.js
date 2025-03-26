const DeckManager = require('./DeckManager');

class CardEffectManager {
    constructor() {
        this.deckManager = new DeckManager();
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
        if (!card.effects || card.effects === "") {
            return gameEnv;
        }

        // Get opponent ID
        const players = Object.keys(gameEnv).filter(key => key !== "currentTurn" && key !== "currentPlayer" && key !== "firstPlayer");
        const opponentId = players.find(id => id !== playerId);

        // Handle different types of effects
        if (this.isSummonerDependentEffect(card.effects)) {
            return this.applySummonerEffect(gameEnv, playerId, card);
        }
        
        if (this.isMonsterDependentEffect(card.effects)) {
            return this.applyMonsterDependentEffect(gameEnv, playerId, opponentId, card);
        }

        if (this.isHelpCardDependentEffect(card.effects)) {
            return this.applyHelpCardEffect(gameEnv, playerId, card);
        }

        if (this.isMonsterTypeEffect(card.effects)) {
            return this.applyMonsterTypeEffect(gameEnv, playerId, opponentId, card);
        }

        return gameEnv;
    }

    /**
     * Check if effect depends on current summoner
     */
    isSummonerDependentEffect(effect) {
        return effect.includes("if your current summoner is");
    }

    /**
     * Check if effect depends on specific monster on field
     */
    isMonsterDependentEffect(effect) {
        return effect.includes("if you have") || effect.includes("if your opponent having");
    }

    /**
     * Check if effect depends on help card
     */
    isHelpCardDependentEffect(effect) {
        return effect.includes("when you use help card");
    }

    /**
     * Check if effect targets monster types
     */
    isMonsterTypeEffect(effect) {
        return effect.includes("monsterType");
    }

    /**
     * Apply effects that depend on current summoner
     */
    applySummonerEffect(gameEnv, playerId, card) {
        const currentSummoner = this.getCurrentSummonerName(gameEnv, playerId);
        const effectParts = card.effects.split("if your current summoner is ");
        const requiredSummoner = effectParts[1].split(",")[0];

        if (currentSummoner === requiredSummoner) {
            const newValue = parseInt(effectParts[1].match(/\d+/)[0]);
            card.value = newValue;
        }

        return gameEnv;
    }

    /**
     * Apply effects that depend on specific monsters
     */
    applyMonsterDependentEffect(gameEnv, playerId, opponentId, card) {
        const effect = card.effects;
        
        if (effect.includes("if you have")) {
            // Handle effects that check player's field
            const requiredMonster = effect.match(/if you have '(.+?)'/)[1];
            if (this.hasMonsterOnField(gameEnv, playerId, requiredMonster)) {
                const newValue = parseInt(effect.match(/value become (\d+)/)[1]);
                card.value = newValue;
            }
        } else if (effect.includes("if your opponent having")) {
            // Handle effects that check opponent's field
            const requiredMonster = effect.match(/monster\((.+?)\)/)[1];
            if (this.hasMonsterOnField(gameEnv, opponentId, requiredMonster)) {
                // Find the opponent's monster and set its value to 0
                this.setOpponentMonsterValue(gameEnv, opponentId, requiredMonster, 0);
            }
        }

        return gameEnv;
    }

    /**
     * Apply effects that depend on help cards
     */
    applyHelpCardEffect(gameEnv, playerId, card) {
        const effect = card.effects;
        const helpCard = effect.match(/'(.+?)'/)[1];
        
        if (this.isHelpCardPlayed(gameEnv, playerId, helpCard)) {
            const newValue = parseInt(effect.match(/value become (\d+)/)[1]);
            card.value = newValue;

            // Handle additional effects
            if (effect.includes("opponent right and left monster")) {
                this.setAdjacentMonstersValue(gameEnv, playerId, 0);
            }
        }

        return gameEnv;
    }

    /**
     * Apply effects that target monster types
     */
    applyMonsterTypeEffect(gameEnv, playerId, opponentId, card) {
        const effect = card.effects;
        const targetType = effect.match(/monsterType '(.+?)'/)[1];
        
        if (effect.includes("your opponent")) {
            // Set value of all opponent's monsters of specific type to 0
            this.setMonsterTypeValue(gameEnv, opponentId, targetType, 0);
        }

        return gameEnv;
    }

    /**
     * Helper method to get current summoner name
     */
    getCurrentSummonerName(gameEnv, playerId) {
        const deck = gameEnv[playerId].deck;
        const currentSummonerCard = deck.summoner[deck.currentSummonerIdx];
        return this.deckManager.getSummonerCards(currentSummonerCard).name;
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
}

module.exports = CardEffectManager; 
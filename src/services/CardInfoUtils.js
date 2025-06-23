const DeckManager = require('./DeckManager');
class CardInfoUtils {
    constructor() {
        this.deckManager = DeckManager;
    }

    getCurrentLeaderName(gameEnv, playerId) {
        const deck = gameEnv[playerId].deck;
        const currentLeaderCard = deck.leader[deck.currentLeaderIdx];
        return this.deckManager.getLeaderCards(currentLeaderCard).name;
    }

    getCurrentLeader(gameEnv, playerId){
        const deck = gameEnv[playerId].deck;
        const crtLeaderCard = deck.leader[deck.currentLeaderIdx]
        return this.deckManager.getLeaderCards(crtLeaderCard);
    }

    getCurrentLeaderType(gameEnv, playerId) {
        const currentLeader = this.getCurrentLeader(gameEnv, playerId);
        return currentLeader.type || [];
    }

    getCurrentLeaderLevel(gameEnv, playerId) {
        const currentLeader = this.getCurrentLeader(gameEnv, playerId);
        return currentLeader.level || 0;
    }
}

module.exports = new CardInfoUtils();
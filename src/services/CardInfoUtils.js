const DeckManager = require('./DeckManager');
class CardInfoUtils {
    constructor() {
        this.deckManager = DeckManager;
    }

    getCurrentSummonerName(gameEnv, playerId) {
        const deck = gameEnv[playerId].deck;
        const currentSummonerCard = deck.summoner[deck.currentSummonerIdx];
        return this.deckManager.getSummonerCards(currentSummonerCard).name;
    }

    getCurrentSummoner(gameEnv, playerId){
        const deck = gameEnv[playerId].deck;
        const crtSummonCard = deck.summoner[deck.currentSummonerIdx]
        return this.deckManager.getSummonerCards(crtSummonCard);
    }
}

module.exports = new CardInfoUtils();
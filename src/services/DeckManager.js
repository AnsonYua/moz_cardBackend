// src/services/DeckManager.js
const fs = require('fs').promises;
const path = require('path');

class DeckManager {
    constructor() {
        this.cardsPath = path.join(__dirname, '../data/cards.json');
        this.summonerCardPath = path.join(__dirname, '../data/summonerCards.json');
        this.decksPath = path.join(__dirname, '../data/decks.json');
        this.cards = null;
        this.decks = null;
    }

    async initialize() {
        try {
            const [cardsData, summonerCards, decksData] = await Promise.all([
                fs.readFile(this.cardsPath, 'utf8'),
                fs.readFile(this.summonerCardPath, 'utf8'),
                fs.readFile(this.decksPath, 'utf8')
            ]);

            this.cards = JSON.parse(cardsData);
            this.summonerCards = JSON.parse(summonerCards);
            this.decks = JSON.parse(decksData);
        } catch (error) {
            console.error('Error initializing DeckManager:', error);
            throw error;
        }
    }

    async getPlayerDecks(playerId) {
        const playerData = this.decks.playerDecks[playerId];
        return playerData;
    }
    getSummonerCards(cardId){
        const summonerCards = this.summonerCards.cards[cardId];
        return summonerCards;
    }


    async saveDecks() {
        await fs.writeFile(this.decksPath, JSON.stringify(this.decks, null, 2));
    }

    getCardDetails(cardId) {
        return this.cards.cards[cardId];
    }

    async drawCards(playerId, count = 1) {
        const playerData = await this.getPlayerDecks(playerId);
        const activeDeck = playerData.decks[playerData.activeDeck];
        
        if (!activeDeck) {
            throw new Error('No active deck found');
        }

        // Simulate drawing cards
        const drawnCards = [];
        const remainingCards = [...activeDeck.cards];
        
        for (let i = 0; i < count && remainingCards.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * remainingCards.length);
            const cardId = remainingCards.splice(randomIndex, 1)[0];
            drawnCards.push(this.getCardDetails(cardId));
        }

        return drawnCards;
    }
}

module.exports = new DeckManager();
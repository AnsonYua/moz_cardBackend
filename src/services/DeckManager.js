// src/services/DeckManager.js
const fs = require('fs').promises;
const path = require('path');

class DeckManager {
    constructor() {
        this.cardsPath = path.join(__dirname, '../data/cards.json');
        this.leaderCardPath = path.join(__dirname, '../data/leaderCards.json');
        this.decksPath = path.join(__dirname, '../data/decks.json');
        this.spCardPath = path.join(__dirname, '../data/spCard.json');
        this.cards = null;
        this.decks = null;
    }

    async initialize() {
        try {
            const [cardsData, leaderCards, decksData, spCardData] = await Promise.all([
                fs.readFile(this.cardsPath, 'utf8'),
                fs.readFile(this.leaderCardPath, 'utf8'),
                fs.readFile(this.decksPath, 'utf8'),
                fs.readFile(this.spCardPath, 'utf8')
            ]);

            this.cards = JSON.parse(cardsData);
            this.leaderCards = JSON.parse(leaderCards);
            this.decks = JSON.parse(decksData);
            const spCards = JSON.parse(spCardData);
            
            // Merge spCards into this.cards
            if (this.cards && this.cards.cards) {
                this.cards.cards = {
                    ...this.cards.cards,
                    ...spCards.spCards
                };
            }
        } catch (error) {
            console.error('Error initializing DeckManager:', error);
            throw error;
        }
    }

    async getPlayerDecks(playerId) {
        const playerData = this.decks.playerDecks[playerId];
        return playerData;
    }
    getLeaderCards(cardId){
        const leaderCards = this.leaderCards.cards[cardId];
        return leaderCards;
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
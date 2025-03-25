const deckManager = require('../services/DeckManager');
class mozDeckLogic{
    async prepareDeckForPlayer(playerId) {
        var playerDeck = await deckManager.getPlayerDecks(playerId);
        playerDeck = JSON.parse(JSON.stringify(playerDeck));
        const sumCardList = this.possessSummonnerCard(playerDeck.decks["deck001"]);
        const mainDeckCard = this.possesesMainDeckCard(playerDeck.decks["deck001"]);
        
        const { drawnCards, mainDeck } = this.drawCards(mainDeckCard, 7);
        const hand = drawnCards;
        
        return {
            currentSummonerIdx: 0,
            summoner: sumCardList,
            hand: hand,
            mainDeck: mainDeck,
        };
    }

    async reshuffleForPlayer(playerId) {
        const playerDeck = await deckManager.getPlayerDecks(playerId);
        const mainDeckCard = this.possesesMainDeckCard(playerDeck.decks["deck001"]);
        const { drawnCards, mainDeck } = this.drawCards(mainDeckCard, 7);
        const hand = drawnCards;
        return {
            hand: hand,
            mainDeck: mainDeck,
        };
    }

    drawToHand(hand, mainDeckOrginal, count = 1) {
        const { drawnCards, mainDeck } = this.drawCards(mainDeckOrginal, count);
        for (let i = 0; i < drawnCards.length; i++) {
            hand.push(drawnCards[i]);
        }
        return {
            hand: hand,
            mainDeck: mainDeck
        };

    }

    drawCards(mainDeck, count = 1) {
        if (count > mainDeck.length) {
            throw new Error(`Cannot draw ${count} cards. Only ${mainDeck.length} cards remaining.`);
        }
        const drawnCards = mainDeck.splice(0, count);
        return {
            drawnCards,    // Cards that were drawn
            mainDeck      // Updated main deck
        };
    }

    possesesMainDeckCard(decks){
        return this.shuffle(decks.cards);
    }
    possessSummonnerCard(decks){
        return this.shuffle(decks.summoner).slice(0, 5);
    }
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    getCurrentSummoner(gameEnv, playerId){
        const deck = gameEnv[playerId].deck;
        const crtSummonCard = deck.summoner[deck.currentSummonerIdx]
        return deckManager.getSummonerCards(crtSummonCard);
    }
    getDeckCardDetails(cardId){
        const crtCard = deckManager.getCardDetails(cardId);
        return crtCard;
    }

    monsterInField(fieldArea){
        var monsterInField = false
        for(let i = 0; i < fieldArea.length; i++){
            if(fieldArea[i]["cardDetails"][0]["type"] == "monster"){
                monsterInField = true;
                break;
            }
        }
        return monsterInField;
    }

    getFieldIdx(field){
        const fieldArr = ["sky","left","right","help","sp"];
        for(let i = 0; i < fieldArr.length; i++){
            if(fieldArr[i] == field){
                return i;
            }
        }
        return -1;
    }
    isCardEligibleForField(card, summoner, area){
        var returnValue = false;
        for (let idx in card["attribute"]){
            if(card["attribute"][idx] == "all"){
                returnValue = true;
                return returnValue;
            }
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
}

module.exports = new mozDeckLogic();
# TCG Engine Documentation

## Overview
This is a Trading Card Game (TCG) engine that manages game state, card interactions, and gameplay mechanics. The engine is designed to handle complex card interactions, summoner battles, and game progression.

## Data Structure

### Game Environment (`gameEnv`)
The game environment is stored in JSON format and contains the following key components:

#### Player Data Structure
Each player (`playerId_1`, `playerId_2`) contains:
- **Deck Information**
  - `currentSummonerIdx`: Index of the active summoner
  - `summoner`: Array of summoner card IDs
  - `hand`: Array of cards in player's hand
  - `mainDeck`: Array of cards in the main deck
- **Game State**
  - `redraw`: Number of redraws available
  - `turnAction`: Array of actions taken in the current turn
  - `Field`: Current state of the player's field
  - `playerPoint`: Current points for the player
  - `overallGamePoint`: Total points accumulated

#### Field Structure
Each player's field contains:
- `summonner`: Active summoner card details
- `right`: Right field zone cards
- `left`: Left field zone cards
- `sky`: Sky zone cards
- `help`: Help zone cards
- `sp`: Special zone cards

### Card Types

#### Monster Cards
Monster cards have the following properties:
- `id`: Unique card identifier
- `attribute`: Array of card attributes (e.g., "wind", "water")
- `monsterType`: Array of monster types (e.g., "beast", "bird")
- `value`: Base power value
- `type`: Card type (e.g., "monster")
- `cardName`: Name of the card
- `effects`: Text description of effects
- `effectRules`: Array of effect rules with conditions and targets

#### Summoner Cards
Summoner cards have additional properties:
- `sky`: Array of allowed sky zone attributes
- `left`: Array of allowed left zone attributes
- `right`: Array of allowed right zone attributes
- `age`: Age value (-1 for unknown)
- `gender`: Gender of the summoner
- `nativeAddition`: Array of native bonuses
- `level`: Summoner level
- `type`: Array of summoner types
- `initialPoint`: Starting points

## Game Phases

1. **START_REDRAW**
   - Initial phase where players can redraw cards
   - Players have limited redraw attempts

2. **MAIN_PHASE**
   - Players can play cards from their hand
   - Cards can be played face-up or face-down
   - Effects are resolved based on card rules

## Card Effects System

The engine supports various effect types:
- Value modifications
- Conditional effects
- Zone-specific effects
- Card type interactions

### Effect Rules Structure
```json
{
  "condition": {
    "type": "condition_type",
    "value": "condition_value"
  },
  "target": {
    "type": "target_type",
    "scope": "target_scope"
  },
  "effectType": "effect_type",
  "value": effect_value
}
```

## Summoner Effects System

The engine supports various summoner effect types:
- Native addition effects (base attribute bonuses)
- Conditional effects based on opponent's summoner
- Value modifications

### Summoner Effect Rules Structure
```json
{
  "condition": {
    "type": "opponentHasSummoner",
    "opponentName": "summoner_name"
  },
  "effectType": "valueModification",
  "target": {
    "type": "self",
    "scope": "all",
    "modificationType": "nativeAddition"
  },
  "value": 0
}
```

### Effect Processing
1. Summoner effects are processed when calculating card values
2. Effects can modify the summoner's native addition values
3. Modified values are then applied to cards on the field

### Example
When a summoner has an effect that checks for opponent's summoner:
- If the condition is met (opponent has specified summoner)
- The summoner's native addition values are modified
- These modified values are used when calculating card values

## Game Flow

1. Game initialization with player decks and summoners
2. Redraw phase for initial hand adjustment
3. Main phase where players:
   - Play cards to appropriate zones
   - Activate card effects
   - Engage in summoner battles
4. Turn-based progression with action tracking
5. Point accumulation and victory determination

## File Structure

- `src/gameData/`: Contains game state files
- `src/data/`: Contains card data files
  - `cards.json`: Monster and spell card definitions
  - `summonerCards.json`: Summoner card definitions
  - `decks.json`: Predefined deck configurations
  - `spCard.json`: Special card definitions

## Usage

1. Initialize a new game with player decks
2. Load the game environment
3. Process player actions
4. Update game state
5. Handle effect resolution
6. Track game progression

## Notes

- Card IDs starting with 'S' are summoner cards
- Card IDs starting with 's' are regular cards
- Effects are processed in order of play
- Zone restrictions are enforced based on summoner attributes 
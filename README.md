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
- `effectRules`: Array of effect rules (see [Effect Rules Documentation](docs/effectRules.md))

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
   - Effects are resolved based on card rules (see [Effect Rules Documentation](docs/effectRules.md))

## Game Flow

1. Game initialization with player decks and summoners
2. Redraw phase for initial hand adjustment
3. Main phase where players:
   - Play cards to appropriate zones
   - Activate card effects
   - Engage in summoner battles
4. Turn-based progression with action tracking
5. Point accumulation and victory determination

## Game Start Logic

The game initialization follows these steps:

1. **Initial Game State**
   - Game state is injected with initial deck setup
   - Both players' hands are dealt
   - Summoners are selected
   - Game phase is set to `START_REDRAW`

2. **Player Ready Phase**
   - Players must declare ready using `/api/game/player/startReady`
   - Request format:
     ```json
     {
         "playerId": "playerId_X",
         "gameId": "game-id",
         "redraw": false
     }
     ```
   - When both players are ready:
     - Game phase changes to `MAIN_PHASE`
     - Summoner effects are applied
     - First player's turn begins

3. **Game Flow**
   - After initialization, game follows normal turn structure
   - Players can perform actions based on current phase and restrictions

## File Structure

- `src/gameData/`: Contains game state files
- `src/data/`: Contains card data files
  - `cards.json`: Monster and spell card definitions
  - `summonerCards.json`: Summoner card definitions
  - `decks.json`: Predefined deck configurations
  - `spCard.json`: Special card definitions
- `docs/`: Documentation files
  - `effectRules.md`: Detailed documentation of effect rules

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
- Zone restrictions are enforced based on summoner attributes
- For detailed information about effect rules and their implementation, please refer to [Effect Rules Documentation](docs/effectRules.md) 
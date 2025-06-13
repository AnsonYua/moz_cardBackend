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

For detailed information about effect rules, please refer to [Effect Rules Documentation](docs/effectRules.md).

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
     - Summoner effects are applied (e.g., summon restrictions)
     - First player's turn begins

3. **Summoner Effects**
   - Effects are checked and applied when both players are ready
   - Example: 杜吉亞(檔案大師)'s effect prevents opponent from summoning dragon-type monsters if opponent"s summoner is 顧寧特

4. **Game Flow**
   - After initialization, game follows normal turn structure
   - Players can perform actions based on current phase and restrictions

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

# Summoner Effect Rules Schema

## Overview
Summoner effect rules define special abilities and restrictions that summoners can apply during the game. Each rule consists of a condition, effect type, target, and value.

## Rule Structure
```json
{
    "condition": {
        "type": string,        // Type of condition
        // Additional condition-specific fields
    },
    "effectType": string,      // Type of effect
    "target": {
        "type": string,        // Who is affected
        "scope": string,       // Where the effect applies
        // Additional target-specific fields
    },
    "value": any              // Effect value
}
```

## Condition Types
1. `opponentHasSummoner`
   ```json
   {
       "type": "opponentHasSummoner",
       "opponentName": string  // Name of the summoner to check for
   }
   ```

2. `opponentSummonerHasType`
   ```json
   {
       "type": "opponentSummonerHasType",
       "opponentType": string  // Type to check for (e.g., "mechanic")
   }
   ```

3. `opponentSummonerHasLevel`
   ```json
   {
       "type": "opponentSummonerHasLevel",
       "opponentLevel": number,
       "operator": string      // "OverOrEqual", "UnderOrEqual", "Equal"
   }
   ```

4. `opponentDontHasSummoner`
   ```json
   {
       "type": "opponentDontHasSummoner",
       "opponentName": string  // Name of the summoner to check for
   }
   ```

## Effect Types
1. `valueModification`
   - Modifies values of cards
   - Used with `modificationType: "nativeAddition"` to modify summoner's native addition values

2. `summonRestriction`
   - Restricts what cards can be summoned
   - Can target specific positions or card types

## Target Types
1. `self`
   - Affects the summoner's own cards/field

2. `opponent`
   - Affects the opponent's cards/field

## Target Scopes
1. `all`
   - For valueModification: Affects all valid targets
   - For summonRestriction: Affects all field positions and can include monster type restrictions

2. `sp`
   - Affects special cards
   - Used with `modificationType: "disable"` to prevent playing special cards

3. `sky`
   - Affects sky position only
   - Used with `modificationType: "disable"` to prevent playing cards in sky position

## Example Rules

### Value Modification Example
```json
{
    "condition": {
        "type": "opponentHasSummoner",
        "opponentName": "顧寧特"
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

### Summon Restriction Example
```json
{
    "condition": {
        "type": "opponentSummonerHasLevel",
        "opponentLevel": 7,
        "operator": "OverOrEqual"
    },
    "effectType": "summonRestriction",
    "target": {
        "type": "self",
        "scope": "sp",
        "modificationType": "disable"
    }
}
```

## Notes
- Conditions are checked before effects are applied
- Effects can be either positive (value increases) or negative (restrictions)
- Some effects may have multiple conditions
- Target scope determines where the effect applies
- Monster type restrictions can be applied to specific card types
- The `all` scope has different meanings depending on the effect type:
  - For valueModification: affects all valid targets
  - For summonRestriction: affects all field positions 
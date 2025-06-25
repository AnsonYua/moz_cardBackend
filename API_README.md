# Revolution and Rebellion - TCG Backend API

This document describes the REST API endpoints for the Revolution and Rebellion trading card game backend.

## Base URL
```
http://localhost:3000/api
```

## Health Check

### GET /health
Check if the API server is running.

**Response:**
```json
{
  "status": "ok"
}
```

## Game Management

### POST /player/startGame
Initialize a new game session.

**Request Body:**
```json
{
  "playerId": "string",
  "gameConfig": {
    // Game configuration options
  }
}
```

**Response:**
```json
{
  "gameId": "string",
  "gameEnv": {
    // Complete game state
  },
  "success": true
}
```

### POST /player/startReady
Mark a player as ready to start the game.

**Request Body:**
```json
{
  "playerId": "string",
  "gameId": "string"
}
```

**Response:**
```json
{
  "gameEnv": {
    // Updated game state
  },
  "success": true
}
```

## Player Actions

### POST /player/playerAction
Process a player's game action (card placement, etc.).

**Request Body:**
```json
{
  "playerId": "string",
  "gameId": "string",
  "action": {
    "type": "string",        // Action type (e.g., "place_card")
    "card_idx": "number",    // Index of card in hand
    "field_idx": "number"    // Target field/zone index
  }
}
```

**Response (Normal Action):**
```json
{
  "gameEnv": {
    // Updated game state after action
    "pendingPlayerAction": null  // No pending actions
  },
  "success": true
}
```

**Response (Card Selection Required):**
```json
{
  "requiresCardSelection": true,
  "cardSelection": {
    "selectionId": "string",           // Unique selection ID
    "eligibleCards": ["card1", "card2"], // Cards player can select from
    "selectCount": 2,                  // Number of cards to select
    "cardTypeFilter": "character",     // Filter applied (if any)
    "prompt": "Select 2 card(s) from 5 available cards"
  },
  "gameEnv": {
    // Current game state with pending selection
    "pendingPlayerAction": {
      "type": "cardSelection",
      "playerId": "player1",
      "selectionId": "player1_1640995200000",
      "description": "Waiting for player1 to select 2 card(s)",
      "timestamp": 1640995200000
    }
  }
}
```

### POST /player/selectCard
Complete a pending card selection triggered by a card effect.

**Request Body:**
```json
{
  "selectionId": "string",              // ID from the card selection prompt
  "selectedCardIds": ["card1", "card2"], // Selected card IDs
  "playerId": "string",
  "gameId": "string"
}
```

**Response:**
```json
{
  "success": true,
  "gameEnv": {
    // Updated game state after selection
  }
}
```

### POST /player/playerAiAction
Trigger AI to make an action.

**Request Body:**
```json
{
  "playerId": "string",
  "gameId": "string"
}
```

**Response:**
```json
{
  "gameEnv": {
    // Game state after AI action
  },
  "success": true
}
```

## Player Data Management

### GET /player/:playerId?gameId=gameId
Get current game state for a specific player.

**URL Parameters:**
- `playerId`: Unique identifier for the player

**Query Parameters:**
- `gameId`: Unique identifier for the game (required)

**Response:**
```json
{
  "gameEnv": {
    "players": [],
    "currentPhase": "string",
    "turnPlayer": "string",
    // ... complete game state
  }
}
```

### PUT /player/:playerId/score
Update a player's score.

**URL Parameters:**
- `playerId`: Unique identifier for the player

**Request Body:**
```json
{
  "score": "number",
  "gameId": "string"
}
```

**Response:**
```json
{
  "gameEnv": {
    // Updated game state with new score
  },
  "success": true
}
```


## Deck Management

### POST /player/:playerId/deck
Get available decks for a player.

**URL Parameters:**
- `playerId`: Unique identifier for the player

**Request Body:**
```json
{
  // Deck query parameters (optional)
}
```

**Response:**
```json
{
  "decks": [
    {
      "deckId": "string",
      "name": "string",
      "cards": [],
      "leaderCards": []
    }
  ]
}
```

## Testing Endpoints

### POST /test/setCase
Set up a specific test case scenario.

**Request Body:**
```json
{
  "caseId": "string",
  "scenario": {
    // Test scenario configuration
  }
}
```

**Response:**
```json
{
  "success": true,
  "caseId": "string"
}
```

### POST /test/injectGameState
Inject a specific game state for testing purposes.

**Request Body:**
```json
{
  "gameId": "string",
  "gameEnv": {
    // Complete game environment state
    "players": [],
    "currentPhase": "string",
    "turnPlayer": "string"
  }
}
```

**Response:**
```json
{
  "success": true,
  "gameId": "string"
}
```

## Error Handling

All endpoints return errors in the following format:

```json
{
  "error": "Error message description",
  "stack": "Error stack trace (in development)"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (missing required parameters)
- `403`: Forbidden (test endpoint in production)
- `500`: Internal Server Error

## Game Flow Example

1. **Start Game**: POST `/player/startGame`
2. **Player Ready**: POST `/player/startReady`
3. **Main Phase Actions**: POST `/player/playerAction` (character and help cards only)
4. **Card Selection** (if triggered): POST `/player/selectCard`
5. **SP Phase Actions**: POST `/player/playerAction` (SP cards only, after all character zones filled)
6. **AI Actions**: POST `/player/playerAiAction` (if playing against AI)
7. **Check State**: GET `/player/:playerId`

## Card Selection Flow

When certain card effects are triggered (e.g., search deck, draw specific cards), the game may require player input:

1. **Player Action**: POST `/player/playerAction` with card that has search effect
2. **Check Game State**: API returns normal game data with `pendingPlayerAction` and `pendingCardSelections` populated
3. **Player Selection**: POST `/player/selectCard` with chosen cards (using data from `pendingCardSelections`)
4. **Continue Game**: Normal game flow resumes with pending states cleared

**Key Change**: Instead of separate `requiresCardSelection` and `cardSelection` fields, clients detect card selection requirements by checking if `gameEnv.pendingPlayerAction` exists and looking up details in `gameEnv.pendingCardSelections`.

### Client Usage Example
```javascript
// After calling /player/playerAction
const response = await fetch('/api/player/playerAction', { ... });
const gameData = await response.json();

// Check if card selection is required
if (gameData.gameEnv.pendingPlayerAction?.type === 'cardSelection') {
    const selectionId = gameData.gameEnv.pendingPlayerAction.selectionId;
    const selectionData = gameData.gameEnv.pendingCardSelections[selectionId];
    
    // Show card selection UI
    showCardSelection({
        eligibleCards: selectionData.eligibleCards,
        selectCount: selectionData.selectCount,
        cardTypeFilter: selectionData.cardTypeFilter,
        onSelect: (selectedCards) => selectCard(selectionId, selectedCards)
    });
} else {
    // Normal game flow continues
    updateGameUI(gameData.gameEnv);
}
```

## Game State Management

The game tracks pending actions that require player input. When a player action is required:

### Pending Player Action Object (Simplified Structure)
```json
{
  "pendingPlayerAction": {
    "type": "cardSelection",              // Type of action required
    "selectionId": "player1_1640995200000" // Reference ID linking to pendingCardSelections
  }
}
```

### Pending Card Selections Object (Detailed Data)
```json
{
  "pendingCardSelections": {
    "player1_1640995200000": {
      "playerId": "player1",              // Which player needs to act
      "eligibleCards": ["43", "44", "45"], // Cards available for selection
      "searchedCards": ["43", "44", "45", "46"], // All cards that were searched
      "selectCount": 1,                   // Number of cards to select
      "cardTypeFilter": null,             // Optional filter (e.g., "sp", "help")
      "effect": { /* original effect data */ },
      "timestamp": 1640995200000          // When the action was initiated
    }
  }
}
```

### Blocking Behavior
- When `pendingPlayerAction` exists, normal card play is blocked
- The specified player must complete their required action first
- Other players receive "waiting" messages if they try to act
- Actions are unblocked when the required action is completed

### Data Storage Pattern
The system uses a **dual-state approach** for efficiency:
- `pendingPlayerAction`: Lightweight indicator with just type and reference ID
- `pendingCardSelections`: Complete selection data keyed by selection ID
- This eliminates data duplication while maintaining clean separation of concerns

### Error Responses During Blocking
```json
{
  "error": "You must complete your card selection first. Select 1 card(s)."
}
```

```json
{
  "error": "Waiting for player1 to complete card selection. Please wait."
}
```

## Game Phases and Card Types

The game follows a strict phase-based system:

### MAIN_PHASE
- **Character Cards**: Can be placed in top/left/right zones (one per zone)
- **Help Cards**: Can be placed in help zone (one per player)
- **SP Cards**: ❌ Cannot be played during MAIN_PHASE

### SP_PHASE (triggered when all character zones are filled)
- **SP Cards**: Can be placed in SP zone for powerful effects (one per player)
- **Character/Help Cards**: ❌ Cannot be played during SP_PHASE

### Card Types:
- **Leader Cards**: Determine zone compatibility and provide bonuses (set at game start)
- **Character Cards**: Combat units with power values  
- **Help Cards**: Utility effects to support your strategy  
- **SP Cards**: Special powerful effects that execute before battle resolution

### Zone Compatibility Rules:
- Character placement is validated using the card's `gameType` field against the leader's `zoneCompatibility`
- **IMPORTANT**: Zone checking uses `cardDetails.gameType` (string), NOT `cardDetails.traits` (array)
- `traits` are used for card effects and abilities; `gameType` determines placement restrictions
- Leaders with `"all"` in their zone compatibility can place any character type in that zone

### Correct Zone Compatibility Access Pattern:
```javascript
// CORRECT: Access via zoneCompatibility object
const allowedTypes = leader.zoneCompatibility[zone]; // e.g., ["右翼", "自由", "經濟"]

// INCORRECT: Direct leader property access
const allowedTypes = leader[zone]; // This will be undefined
```

**Common Mistake Prevention**: Always access zone compatibility through `leader.zoneCompatibility[zone]`, never directly via `leader[zone]`. The leader object structure contains the zone rules under the `zoneCompatibility` property as defined in `leaderCards.json`.

## Common Development Pitfalls

### ❌ Zone Compatibility Errors
```javascript
// WRONG: Direct access to leader properties
const allowedTypes = leader[zone]; // Undefined!

// CORRECT: Access via zoneCompatibility object  
const allowedTypes = leader.zoneCompatibility[zone];
```

### ❌ Card Type vs Traits Confusion
```javascript
// WRONG: Using traits for zone placement
if (allowedTypes.includes(cardDetails.traits[0])) { ... }

// CORRECT: Using gameType for zone placement
if (allowedTypes.includes(cardDetails.gameType)) { ... }
```

### ❌ GameEnv Structure Mixing (Fixed)
```javascript
// OLD APPROACH: Separate API response fields (eliminated)
return { requiresCardSelection: true, cardSelection: {...}, gameEnv: actualGameState };

// NEW APPROACH: All data in gameEnv (simplified)
gameData.gameEnv = actualGameState; // Contains pendingPlayerAction & pendingCardSelections
return gameData; // Client derives selection state from gameEnv
```

Common action types:
- `place_card`: Place a card from hand to field (phase-restricted)
- `activate_effect`: Activate a card's special effect
- `end_turn`: End current player's turn

## Program Architecture

### Game State Storage
The backend uses **file-based game state management** instead of in-memory storage:

```
src/gameData/
├── {gameId1}.json
├── {gameId2}.json
└── ...
```

### Data Flow Pattern
All game operations follow this consistent pattern:

```javascript
// 1. Read game state from file
const gameData = await this.readJSONFileAsync(gameId);

// 2. Perform game logic modifications
const actionResult = await this.mozGamePlay.processAction(gameData.gameEnv, playerId, action);

// 3. Always update gameEnv and save (simplified flow)
gameData.gameEnv = actionResult.requiresCardSelection ? actionResult.gameEnv : actionResult;
const updatedGameData = this.addUpdateUUID(gameData);
await this.saveOrCreateGame(updatedGameData, gameId);

// 4. Return updated game data - client derives card selection state from gameEnv
return updatedGameData;
```

### File Structure
Each game file contains:
```json
{
  "gameId": "uuid-string",
  "gameEnv": {
    "playerId_1": { /* player 1 data */ },
    "playerId_2": { /* player 2 data */ },
    "firstPlayer": 0,
    "phase": "MAIN_PHASE", 
    "currentPlayer": "playerId_1",
    "currentTurn": 0,
    "pendingPlayerAction": {
      "type": "cardSelection",
      "selectionId": "playerId_1_1640995200000"
    },
    "pendingCardSelections": {
      "playerId_1_1640995200000": { /* selection details */ }
    }
  },
  "updateUUID": "uuid-string",
  "lastUpdate": "2024-01-01T00:00:00.000Z"
}
```

**Important**: The `gameEnv` contains ONLY game state data. There are no separate API response fields - all card selection information is embedded within the game state via `pendingPlayerAction` and `pendingCardSelections`.

### Key Benefits
- **Persistence**: Games survive server restarts
- **Scalability**: No memory limitations for concurrent games
- **Debugging**: Direct file inspection possible
- **Consistency**: Single pattern across all operations

## Development Notes

- The API includes comprehensive error handling with stack traces in development
- Test endpoints are available for scenario injection and testing
- All game state is managed server-side via JSON files
- The API supports both human players and AI opponents
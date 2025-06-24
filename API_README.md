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

**Response:**
```json
{
  "gameEnv": {
    // Updated game state after action
  },
  "success": true
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

### GET /player/:playerId
Get current game state for a specific player.

**URL Parameters:**
- `playerId`: Unique identifier for the player

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
  "score": "number"
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

### POST /player/:playerId/action
Process a specific action for a player (alternative endpoint).

**URL Parameters:**
- `playerId`: Unique identifier for the player

**Request Body:**
```json
{
  "action": "string",      // Action type
  "targetId": "string"     // Target identifier (optional)
}
```

**Response:**
```json
{
  "result": {
    // Action result
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
3. **Game Actions**: POST `/player/playerAction` (repeat as needed)
4. **AI Actions**: POST `/player/playerAiAction` (if playing against AI)
5. **Check State**: GET `/player/:playerId`

## Card Types and Actions

The game supports the following card types:
- **Character Cards**: Placed in top/left/right zones
- **Help Cards**: Placed in help zone for utility effects
- **SP Cards**: Placed in SP zone for powerful effects
- **Leader Cards**: Determine zone compatibility and provide bonuses

Common action types:
- `place_card`: Place a card from hand to field
- `activate_effect`: Activate a card's special effect
- `end_turn`: End current player's turn

## Development Notes

- The API includes comprehensive error handling with stack traces in development
- Test endpoints are available for scenario injection and testing
- All game state is managed server-side
- The API supports both human players and AI opponents
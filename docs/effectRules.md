# Effect Rules Documentation

## Overview
Effect rules define the behavior and interactions of cards in the game. Each card can have multiple effect rules that determine when and how its effects are applied. The rules system supports various card types including monsters, summoners, help cards, and special cards (SP).

## Schema Structure

### Root Structure
```typescript
interface EffectRule {
    condition: Condition;
    target: Target;
    effectType: EffectType;
    value: string | number;
    operation?: Operation;
    span: Span;
    priority?: number;
}
```

### Condition Types
```typescript
interface Condition {
    type: "and" | "or" | "not" | "always" | BasicConditionType;
    conditions?: Condition[];  // For composite conditions (and/or)
    condition?: Condition;     // For not condition
    value?: string | number;   // For basic conditions
    operator?: Operator;       // For level comparison
    attribute?: string;        // For attribute checks
    cardName?: string;        // For card name checks
}

type BasicConditionType = 
    // Self Conditions
    | "selfHasMonster"              // Check if self has specific monster
    | "selfHasSummoner"             // Check if self has specific summoner
    | "selfHasMonsterWithAttribute" // Check if self has monster with attribute
    | "selfSummonerHasLevel"        // Check summoner's level
    | "selfHasHelpCardOnField"      // Check if help card is on field
    | "handCardLessThan"            // Check hand card count
    
    // Opponent Conditions
    | "opponentHasMonster"          // Check if opponent has specific monster
    | "opponentHasHelpCardOnField"  // Check if opponent has help card
    | "opponentHasSummoner"         // Check if opponent has specific summoner
    | "opponentSummonerHasType"     // Check opponent summoner's type
    | "opponentSummonerHasLevel"    // Check opponent summoner's level
    | "opponentDontHasSummoner"     // Check if opponent doesn't have summoner
    | "always";                     // Always true condition

type Operator = "BelowOrEqual" | "OverOrEqual" | "Equal";
```

### Target Structure
```typescript
interface Target {
    type: "self" | "opponent";
    scope: Scope[];
    subScope: SubScope[];
    action?: string[];  // Optional, used for specific actions
}

type Scope = 
    // Field Positions
    | "sky"
    | "left"
    | "right"
    // Card Types
    | "monster"
    | "help"
    | "sp"
    | "summoner";

type SubScope = 
    | "all"
    | `name_${string}`    // e.g., "name_天災"
    | `attr_${string}`;   // e.g., "attr_all"
```

### Effect Types
```typescript
type EffectType = 
    // Monster Effects
    | "modifyMonsterValue"      // Modify monster's current value
    | "resetToOriginalValue"    // Reset monster to original value
    
    // Summoner Effects
    | "modifyNativeAddition"    // Modify summoner's native addition value
    | "blockSummonCard"         // Prevent summoning specific card types
    | "ableToSummon"           // Control ability to summon cards
    
    // Card Effects
    | "invalidCardEffect"       // Make card effects invalid after summon
    | "drawCardToLimit"         // Draw cards up to limit
    | "swapMonsterPosition"     // Swap monster positions
    | "swapSummonerCard"        // Swap summoner card
    
    // Special Effects
    | "removeAllEffectFromOpponent"  // Remove all opponent effects
    | "finalPointReduction";         // Reduce final points
```

### Operations
```typescript
type Operation = 
    | "set"      // Set value directly
    | "multiply" // Multiply current value
    | "add"      // Add to current value
    | "";        // No operation
```

### Spans
```typescript
type Span = 
    | "allTime"  // Effect lasts until removed
    | "oneOff";  // Effect occurs once
```

## Effect Type Details

### 1. Monster Value Effects

#### modifyMonsterValue
- Modifies the current value of monsters on the field
- Can use operations: set, multiply, add
- Example (Setting value to 0):
```json
{
    "effectType": "modifyMonsterValue",
    "value": "0",
    "operation": "set",
    "span": "allTime"
}
```
- Example (Multiplying value):
```json
{
    "effectType": "modifyMonsterValue",
    "value": "10",
    "operation": "multiply",
    "span": "allTime"
}
```

#### resetToOriginalValue
- Resets monster's value to its original value
- Ignores operation field
- Example:
```json
{
    "effectType": "resetToOriginalValue",
    "value": "0",
    "span": "allTime"
}
```

### 2. Summoner Effects

#### modifyNativeAddition
- Modifies the summoner's native addition value
- Affects all valid positions (sky, left, right)
- Example:
```json
{
    "effectType": "modifyNativeAddition",
    "value": "0",
    "operation": "set",
    "span": "allTime"
}
```

#### blockSummonCard
- Prevents summoning specific types of cards
- Applied before card placement
- Example:
```json
{
    "effectType": "blockSummonCard",
    "value": "0",
    "span": "allTime"
}
```

#### ableToSummon
- Controls whether a card can be summoned
- Used for conditional summoning restrictions
- Example:
```json
{
    "effectType": "ableToSummon",
    "value": "0",
    "operation": "set",
    "span": "allTime"
}
```

### 3. Card Effects

#### invalidCardEffect
- Makes card effects invalid after they are summoned
- Different from blockSummonCard as it affects already summoned cards
- Example:
```json
{
    "effectType": "invalidCardEffect",
    "value": "0",
    "span": "allTime"
}
```

#### drawCardToLimit
- Draws cards until reaching specified limit
- Example:
```json
{
    "effectType": "drawCardToLimit",
    "value": "7",
    "span": "oneOff"
}
```

## Implementation Guidelines

### 1. Condition Evaluation
- Composite conditions ("and", "or", "not") should be evaluated recursively
- Basic conditions should be evaluated based on the current game state
- The "always" condition always returns true
- Level comparisons should use the specified operator

### 2. Target Resolution
- Scope arrays can contain multiple positions/types
- SubScope provides additional filtering:
  - "all": affects all targets in scope
  - "name_X": affects targets with name X
  - "attr_X": affects targets with attribute X
- When targeting self card, use "this" scope instead of "all"

### 3. Effect Application
- Effects are applied based on their type and operation
- Value modifications should respect the operation type
- Some effects may require priority handling
- String values should be used for consistency

### 4. Opponent Handling
When dealing with opponent-related effects, follow these guidelines:

1. **Target Type**
   - Use `"type": "opponent"` in the target structure to affect opponent's cards
   - Use `"type": "self"` for effects on your own cards

2. **Common Opponent Scopes**
   ```typescript
   // Opponent's monster field positions
   scope: ["sky", "left", "right"]
   
   // Opponent's card types
   scope: ["monster", "help", "sp", "summoner"]
   ```

3. **Opponent Conditions**
   ```typescript
   // Check opponent's summoner
   {
       "type": "opponentHasSummoner",
       "value": "summonerName"
   }
   
   // Check opponent's monster
   {
       "type": "opponentHasMonster",
       "value": "monsterName"
   }
   
   // Check opponent's help card
   {
       "type": "opponentHasHelpCardOnField",
       "value": "helpCardName"
   }
   ```

4. **Example: Opponent Monster Value Modification**
   ```json
   {
       "condition": {
           "type": "and",
           "conditions": [
               {
                   "type": "always"
               }
           ]
       },
       "target": {
           "type": "opponent",
           "scope": ["sky", "left", "right"],
           "subScope": ["attr_dragon"]
       },
       "effectType": "modifyMonsterValue",
       "value": "0",
       "operation": "set",
       "span": "allTime"
   }
   ```

5. **Example: Opponent Card Effect Invalidation**
   ```json
   {
       "condition": {
           "type": "and",
           "conditions": [
               {
                   "type": "opponentSummonerHasLevel",
                   "value": "7",
                   "operator": "OverOrEqual"
               }
           ]
       },
       "target": {
           "type": "opponent",
           "scope": ["sp"],
           "subScope": ["all"]
       },
       "effectType": "invalidCardEffect",
       "value": "0",
       "span": "allTime"
   }
   ```

6. **Best Practices for Opponent Effects**
   - Always verify opponent's game state before applying effects
   - Use appropriate scope combinations for targeting
   - Consider using subScope for more specific targeting
   - Handle cases where opponent might not have the target card
   - Use priority when multiple opponent effects might conflict

### 5. Player Filtering
When working with player-related effects, the game environment provides player filtering functionality:

1. **Player Environment**
   ```typescript
   // Game environment contains current player information
   const currentPlayer = gameEnv["currentPlayer"];
   
   // Filter players from game environment
   const players = getPlayerFromGameEnv(gameEnv);
   const currentPlayerData = players.filter(player => player === currentPlayer);
   ```

2. **Player Targeting**
   - Use `"type": "self"` to target the current player
   - Use `"type": "opponent"` to target the other player
   - The game environment automatically handles player switching

3. **Example: Current Player Effect**
   ```json
   {
       "condition": {
           "type": "and",
           "conditions": [
               {
                   "type": "selfHasSummoner",
                   "value": "summonerName"
               }
           ]
       },
       "target": {
           "type": "self",
           "scope": ["this"],
           "subScope": ["all"]
       },
       "effectType": "modifyMonsterValue",
       "value": "500",
       "operation": "set",
       "span": "allTime"
   }
   ```

4. **Example: Opponent Player Effect**
   ```json
   {
       "condition": {
           "type": "and",
           "conditions": [
               {
                   "type": "opponentHasSummoner",
                   "value": "summonerName"
               }
           ]
       },
       "target": {
           "type": "opponent",
           "scope": ["sky", "left", "right"],
           "subScope": ["all"]
       },
       "effectType": "modifyMonsterValue",
       "value": "0",
       "operation": "set",
       "span": "allTime"
   }
   ```

5. **Best Practices for Player Filtering**
   - Always use the game environment to determine current player
   - Use player filtering to ensure effects target the correct player
   - Consider player switching when designing effects
   - Handle cases where player data might be undefined
   - Use appropriate target types based on the current player

## Best Practices

1. **Effect Type Selection**
   - Use modifyMonsterValue for changing monster values
   - Use modifyNativeAddition for changing summoner additions
   - Use blockSummonCard to prevent summoning
   - Use invalidCardEffect to disable existing cards
   - Use ableToSummon for conditional summoning

2. **Target Selection**
   - Use "this" scope when effect targets the card itself
   - Use "all" scope when effect targets all cards in a category
   - Use specific subScopes for targeted effects
   - Validate scope and subScope combinations

3. **Effect Application**
   - Use string values for consistency
   - Specify operation type for value modifications
   - Set appropriate span based on effect duration
   - Handle operation edge cases

4. **Error Handling**
   - Validate all input parameters
   - Handle missing or invalid values
   - Provide meaningful error messages

5. **Performance**
   - Optimize condition evaluation
   - Cache target lists when possible
   - Batch effect applications when appropriate

6. **Card-Specific Considerations**
   - Monster cards: Focus on value modifications
   - Summoner cards: Handle native additions and summoning restrictions
   - Help cards: Implement one-off effects
   - SP cards: Manage special game mechanics

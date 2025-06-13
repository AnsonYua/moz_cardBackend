# Effect Rules Documentation

## Overview
Effect rules define special abilities and restrictions that can be applied during the game. These rules are used by both summoners and cards to modify game mechanics and card interactions.

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

### 1. selfHasSummoner
Checks if your own summoner matches a specific name.
```json
{
    "type": "selfHasSummoner",
    "value": string  // Name of the summoner to check for
}
```
Example:
```json
{
    "type": "selfHasSummoner",
    "value": "柏古蘭巴杜"
}
```

### 2. opponentHasSummoner
Checks if the opponent has a specific summoner.
```json
{
    "type": "opponentHasSummoner",
    "opponentName": string  // Name of the summoner to check for
}
```
Example:
```json
{
    "type": "opponentHasSummoner",
    "opponentName": "顧寧特"
}
```

### 3. opponentSummonerHasType
Checks if the opponent's summoner has a specific type.
```json
{
    "type": "opponentSummonerHasType",
    "opponentType": string  // Type to check for (e.g., "mechanic")
}
```
Example:
```json
{
    "type": "opponentSummonerHasType",
    "opponentType": "mechanic"
}
```

### 4. opponentSummonerHasLevel
Checks if the opponent's summoner level meets certain criteria.
```json
{
    "type": "opponentSummonerHasLevel",
    "opponentLevel": number,
    "operator": string      // "OverOrEqual", "UnderOrEqual", "Equal"
}
```
Example:
```json
{
    "type": "opponentSummonerHasLevel",
    "opponentLevel": 7,
    "operator": "OverOrEqual"
}
```

### 5. opponentDontHasSummoner
Checks if the opponent does not have a specific summoner.
```json
{
    "type": "opponentDontHasSummoner",
    "opponentName": string  // Name of the summoner to check for
}
```
Example:
```json
{
    "type": "opponentDontHasSummoner",
    "opponentName": "古列特拉圖"
}
```

### 6. selfHasMonster
Checks if you have a specific monster on the field.
```json
{
    "type": "selfHasMonster",
    "monsterName": string  // Name of the monster to check for
}
```
Example:
```json
{
    "type": "selfHasMonster",
    "monsterName": "天馬"
}
```

### 7. opponentHasMonster
Checks if the opponent has a specific monster on the field.
```json
{
    "type": "opponentHasMonster",
    "monsterName": string  // Name of the monster to check for
}
```
Example:
```json
{
    "type": "opponentHasMonster",
    "monsterName": "食草貝"
}
```

### 8. selfHasMonsterType
Checks if you have a monster of a specific type on the field.
```json
{
    "type": "selfHasMonsterType",
    "monsterType": string  // Type of monster to check for
}
```
Example:
```json
{
    "type": "selfHasMonsterType",
    "monsterType": "shell"
}
```

### 9. selfHasHelpCardOnField
Checks if you have a specific help card on the field.
```json
{
    "type": "selfHasHelpCardOnField",
    "cardName": string  // Name of the help card to check for
}
```
Example:
```json
{
    "type": "selfHasHelpCardOnField",
    "cardName": "1000年"
}
```

### 10. always
Always returns true, used for effects that should always be active.
```json
{
    "type": "always"
}
```

## Effect Types

### 1. valueModification
Modifies values of cards or summoner abilities.
- Used with `modificationType: "nativeAddition"` to modify summoner's native addition values
- Can affect all valid targets or specific positions
- Can modify specific card values or all cards of a type

Example:
```json
{
    "effectType": "valueModification",
    "target": {
        "type": "self",
        "scope": "selfCard"
    },
    "value": 500
}
```

### 2. summonRestriction
Restricts what cards can be summoned or where they can be played.
- Can target specific positions or card types
- Can disable entire card types or positions
- Can be used as a summon condition

Example:
```json
{
    "effectType": "summonRestriction",
    "target": {
        "type": "self",
        "scope": "sp",
        "modificationType": "disable"
    }
}
```

### 3. summonCondition
Specifies conditions that must be met to summon a card.
- Used to restrict when a card can be played
- Often used with selfHasSummoner condition

Example:
```json
{
    "effectType": "summonCondition",
    "target": {
        "type": "self",
        "scope": "single"
    }
}
```

## Target Types

### 1. self
Affects the summoner's own cards/field.
- Used when the effect should apply to the rule owner's cards
- Common in value modifications and self-imposed restrictions

### 2. opponent
Affects the opponent's cards/field.
- Used when the effect should apply to the opponent's cards
- Common in restrictions that limit opponent's options

## Target Scopes

### 1. all
Has different meanings based on effect type:
- For valueModification: affects all valid targets
- For summonRestriction: affects all field positions and can include monster type restrictions

### 2. selfCard
Affects only the card that has the effect:
- Used for self-modifying effects
- Common in conditional value modifications

### 3. single
Affects a single target:
- Used for specific card effects
- Common in summon conditions

### 4. sp
Affects special cards:
- Used with `modificationType: "disable"` to prevent playing special cards
- Applies to all special cards regardless of position

### 5. sky
Affects sky position only:
- Used with `modificationType: "disable"` to prevent playing cards in sky position
- Specific to the sky position on the field

### 6. left/right
Affects specific side positions:
- Used to target left or right field positions
- Can be used for position-specific effects

## Complete Examples

### Example 1: Self-Modifying Card
```json
{
    "condition": {
        "type": "selfHasSummoner",
        "value": "柏古蘭巴杜"
    },
    "effectType": "valueModification",
    "target": {
        "type": "self",
        "scope": "selfCard"
    },
    "value": 500
}
```

### Example 2: Opponent Monster Effect
```json
{
    "condition": {
        "type": "opponentHasMonster",
        "monsterName": "食草貝"
    },
    "effectType": "valueModification",
    "target": {
        "type": "opponent",
        "scope": "selfCard"
    },
    "value": 0
}
```

### Example 3: Help Card Triggered Effect
```json
{
    "condition": {
        "type": "selfHasHelpCardOnField",
        "cardName": "1000年"
    },
    "effectType": "valueModification",
    "target": {
        "type": "self",
        "scope": "selfCard"
    },
    "value": 100
}
```

### Example 4: Summon Condition
```json
{
    "condition": {
        "type": "selfHasSummoner",
        "value": "波尤"
    },
    "effectType": "summonCondition",
    "target": {
        "type": "self",
        "scope": "single"
    }
}
```

## Implementation Notes
1. Conditions are checked before effects are applied
2. Effects can be either positive (value increases) or negative (restrictions)
3. Some effects may have multiple conditions
4. Target scope determines where the effect applies
5. Monster type restrictions can be applied to specific card types
6. The `all` scope has different meanings depending on the effect type
7. Effects are processed in order of play
8. Restrictions are enforced based on the current game state
9. Card effects can modify their own values or affect other cards
10. Summoner effects can modify native additions and apply field-wide restrictions 
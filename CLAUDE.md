# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Node.js backend for "Revolution and Rebellion", a trading card game where leaders summon characters to compete based on power and combinations rather than direct combat. The game features a unique round-based system where judges award points to the most impressive rosters.

## Development Commands

```bash
# Start development server with hot reload
npm run dev

# Start production server  
npm start

# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run specific test file
npm test -- --testNamePattern="cardEffects"

# Run custom test scenarios (full game flow validation)
npm run run-test
npm run run-testcase1
```

## Architecture Overview

### Core Game Flow
The game follows a specific battle flow managed by `mozGamePlay.js`:
1. **START_REDRAW** - Initial hand management
2. **DRAW_PHASE** - Card drawing 
3. **MAIN_PHASE** - Character/card placement
4. **BATTLE_PHASE** - Power calculation and winner determination
5. **END_PHASE** - Cleanup and next round preparation

### Key Modules

**Game Logic Layer:**
- `src/services/GameLogic.js` - Main game coordinator, handles game creation and flow
- `src/mozGame/mozGamePlay.js` - Core gameplay mechanics and phase management
- `src/mozGame/mozPhaseManager.js` - Game phase state management
- `src/services/CardEffectManager.js` - Card placement validation and effect processing

**Data Management:**
- `src/services/DeckManager.js` - Deck loading and player deck management
- `src/services/CardInfoUtils.js` - Card data utilities and queries
- `src/mozGame/mozDeckHelper.js` - Deck preparation for games
- `src/data/` - JSON files containing card definitions (cards.json, decks.json, etc.)

**API Layer:**
- `src/controllers/gameController.js` - HTTP request handlers
- `src/routes/gameRoutes.js` - Route definitions
- `server.js` - Express server setup with CORS and error handling

### Game Concepts

**Leaders/Summoners:** Each player has 4 leader cards that fight in sequence. Leaders have zone compatibility rules determining which character types can be summoned to their top/left/right zones.

**Character Cards:** Have power values and types/attributes. Must match leader's zone compatibility. Some have special effects or traits.

**Game Zones:** 
- Character zones (top, left, right) - for summoned characters
- Help card zone - for utility cards  
- Special (SP) card zone - for powerful special effects

**Victory:** First team to 50 victory points wins. Points awarded based on power totals and combos.

### Testing Structure

Tests are located in `src/tests/` with Jest configuration. The test system uses:
- **Jest tests** (`*.test.js`) - Unit tests for game logic components
- **Test scenarios** (`src/tests/scenarios/`) - JSON definitions for complex game situations
- **Setup/teardown** - Automatic server start/stop for integration tests (`setup.js`, `teardown.js`)
- **Test helpers** (`testHelpers.js`) - Utilities for API calls and test data management
- **Custom test scripts** (`test.cjs`, `test_case1.cjs`) - Full game flow validation and debugging tools

### Data Files

Game data is stored in JSON format with a new extensible structure:
- `src/data/characterCards.json` - Character card definitions with combo rules
- `src/data/leaderCards.json` - Leader/summoner card definitions with zone compatibility  
- `src/data/utilityCards.json` - Help and SP card definitions
- `src/data/decks.json` - Predefined deck configurations
- `src/gameData/` - Test scenario data files

#### New JSON Structure Features
**Unified Effect System:**
- Effect types: `continuous`, `triggered`
- Trigger events: `always`, `onSummon`, `onPlay`, `spPhase`, `finalCalculation`
- Advanced targeting with filters for game types and traits
- Priority system and unremovable effects for complex interactions

**Card Structure:**
- **Character Cards**: `gameType` (single), `traits` (array), `power`, `effects.rules[]`
- **Leader Cards**: `zoneCompatibility` object, `initialPoint`, `level`, `effects.rules[]`
- **Utility Cards**: Help and SP cards with unified effect system

**Combo System:**
Character card JSON includes combo rules:
- All same type: +250 points
- Two same type: +50 points  
- Freedom + Economy: +170 points
- Right-wing + Patriot: +150 points
- Left-wing + Economy: +120 points

#### Migration Notes
The previous JSON structure has been replaced:
- `cards.json` → `characterCards.json` (enhanced with combo rules)
- `summonerCards.json` → `leaderCards.json` (enhanced with zone compatibility)
- `spCard.json` → `utilityCards.json` (combined help and SP cards)

The new structure provides better type safety, extensibility, and programmer-friendly effect definitions.

## Recent Major Updates (January 2025)

### Card Structure Migration
- **Completed:** Full migration from old card structure to new extensible JSON format
- **Updated field mappings:**
  - `card["type"]` → `card["cardType"]` 
  - `card["value"]` → `card["power"]`
  - `card["attribute"]` → `card["traits"]`
  - `"monster"` → `"character"`
  - `"sky"` → `"top"`

### New Game Features Implemented
- **SP_PHASE:** Added to TurnPhase enum for special card execution
- **Card Effect System:** Complete implementation with continuous and triggered effects
- **Combo System:** 5 different combo types with point calculations
- **Priority System:** SP cards execute based on leader initial points (highest first)
- **Victory Conditions:** Round-based scoring with 50 victory points to win
- **Character Effects:** Process immediately on summon
- **Leader Effects:** Apply continuously throughout game

### Effect System
The game now supports complex card effects with:
- **Continuous effects:** Always active (e.g., power modifications)
- **Triggered effects:** Activate on specific events (e.g., onSummon, spPhase)
- **Targeting system:** Can target self, opponent, or both players' cards
- **Filtering system:** Target cards by type, traits, power, etc.
- **Priority system:** Effects execute in order of leader initial points
- **Two-phase SP execution:** Before combo calculation and after combo calculation
- **Face-down bypass:** Face-down cards don't trigger effects until revealed

### Phase Skipping System
Automatic phase skipping for pre-occupied zones:
- **Help Phase Skipping:** When Help zone is already occupied via search effects, players cannot play additional Help cards during MAIN_PHASE
- **SP Phase Skipping:** When SP zones are pre-occupied via search effects, the game automatically skips SP_PHASE if no players can play SP cards
- **Smart Phase Management:** The game checks all players' zones and hand contents to determine if phases should be skipped
- **Implementation:** `advanceToSpPhaseOrBattle()` function handles automatic phase progression with skipping logic

### SP Phase Complete System
Automatic SP reveal and battle calculation:
- **Face-down Enforcement:** All cards in SP zone must be played face-down during SP_PHASE
- **Auto-reveal Trigger:** When both players fill SP zones, cards automatically reveal
- **Priority Execution:** SP effects execute in leader initialPoint order (higher first, first player breaks ties)
- **Two-phase Effects:** Effects marked with combo keywords execute after combo calculation
- **Battle Results:** Complete power + combo calculation excluding face-down cards
- **Next Round API:** `POST /player/nextRound` advances to next leader after battle

### Main Phase Completion Logic
Enhanced main phase completion requirements:
- **Character Zone Requirement:** All 3 character zones (top, left, right) must be filled for each player
- **Help Zone Requirement:** Each player must have placed 1 card in Help zone (any card face-up or face-down)
- **Face-Down Card Mechanic:** Players can play any card face-down in Help zone if they don't want to use a Help card effect
- **Turn Skipping:** Players automatically skip turns when all character zones AND Help zone are occupied
- **Implementation:** `checkIsMainPhaseComplete()` validates both character and Help zone requirements before advancing to SP phase
- **Normal Flow:** Players typically have 4 turns (3 character cards + 1 card in Help zone) before SP phase
- **Card Effect Flow:** When search effects pre-place cards, players may skip turns and advance to SP phase early
- **Calculation:** Face-down cards in Help zone have no effect during power calculation

### Card Selection System
Interactive card selection for search effects:
- **Search Effects**: Cards can search deck for specific cards and prompt player selection
- **Destination Options**: 
  - `"hand"` - Selected cards go to hand (default)
  - `"spZone"` - Selected cards placed directly in SP zone
  - `"helpZone"` - Selected cards placed directly in Help zone
  - `"conditionalHelpZone"` - Conditional placement based on Help zone status
- **Card Examples**: 
  - **Edward Coristine (c-10)**: Search 7 cards, select 1 SP card to SP zone
  - **Luke Farritor (c-12)**: Search 7 cards, select 1 Help card → Help zone if empty, otherwise hand
  - **Elijah (c-9)**: Search 4 cards, select 1 card to hand
- **Conditional Logic**: 
  - Luke Farritor's effect always triggers the search
  - Selected Help card placement depends on Help zone availability at completion time
  - If Help zone empty → place in Help zone (triggers Help card effects)
  - If Help zone occupied → place in hand (no zone effects)
- **Implementation**: `completeCardSelection()` in `mozGamePlay.js` handles destination routing and conditional logic

### Test Suite Status
⚠️ **Note:** Test scenarios require updating to use new card IDs and structure
- Old test scenarios use deprecated card IDs (s47, S051, etc.)
- Test field references need updating from "sky" to "top"
- Card structure in test scenarios needs migration to new JSON format

### Data Structure
- **characterCards.json:** Character cards with combo rules and effects
- **leaderCards.json:** Leader cards with zone compatibility and continuous effects  
- **utilityCards.json:** Combined help/SP cards with priority and effect rules

When modifying game logic, ensure compatibility with the phase-based system and validate against existing test scenarios after updating them to the new structure.

## Face-Down Card Implementation
Strategic face-down placement system:
- **Complete restriction bypass:** Face-down cards ignore zone compatibility and card effect restrictions
- **Power/combo exclusion:** Face-down cards contribute 0 power and don't count toward combos  
- **Action types:** `"PlayCard"` (face-up) vs `"PlayCardBack"` (face-down)
- **SP zone enforcement:** During SP_PHASE, only face-down placement allowed in SP zone
- **Permanent status:** Face-down cards stay face-down except SP zone auto-reveal
- **Strategic uses:** Zone filling, bluffing, hand management, resource conservation
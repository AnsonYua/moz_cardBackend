/**
 * Utility functions for game-related operations
 */

/**
 * Get list of player IDs from game environment
 * @param {Object} gameEnv - Current game environment
 * @returns {Array} - Array of player IDs
 */
function getPlayerFromGameEnv(gameEnv) {
    const playerArr = [];   
    for (let playerId in gameEnv) {
        if (playerId.includes("playerId_")) {
            playerArr.push(playerId);
        }
    }
    return playerArr;
}

module.exports = {
    getPlayerFromGameEnv
}; 
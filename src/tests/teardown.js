const { stopServer } = require('./setup');

module.exports = async () => {
    await stopServer();
}; 
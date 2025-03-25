const express = require('express');
const cors = require('cors');
const config = require('./src/config/config');
const gameRoutes = require('./src/routes/gameRoutes');
const deckManager = require('./src/services/DeckManager');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/game', gameRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Initialize deck manager and start server
async function startServer() {
    try {
        // Initialize deck manager first
        await deckManager.initialize();
        console.log('Deck Manager initialized successfully');

        // Then start the server
        app.listen(config.port, () => {
            console.log(`Server is running on port ${config.port}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
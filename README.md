# Card Game Backend

A Node.js backend service for a Trading Card Game (TCG) that handles game logic, player actions, and card effects.

## Features

- Game state management
- Player action processing
- Card effect system
- Turn management
- Deck management
- Comprehensive test suite

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:
```bash
git clone [your-repository-url]
cd cardBackend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
PORT=3000
NODE_ENV=development
```

## Project Structure

```
cardBackend/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Route controllers
│   ├── data/          # Game data
│   ├── gameData/      # Game state data
│   ├── mozGame/       # Game logic implementation
│   ├── routes/        # API routes
│   ├── services/      # Business logic services
│   └── tests/         # Test files
├── server.js          # Main application entry point
├── package.json       # Project dependencies and scripts
└── README.md         # Project documentation
```

## Available Scripts

- `npm start` - Start the server in production mode
- `npm run dev` - Start the server in development mode with hot-reload
- `npm test` - Run the test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run run-test` - Run the main test file
- `npm run run-testcase1` - Run test case 1

## API Endpoints

### Game Management
- `GET /api/game/health` - Health check endpoint
- `POST /api/game/player/startGame` - Start a new game
- `POST /api/game/player/startReady` - Player ready status
- `POST /api/game/player/playerAction` - Process player actions

## Testing

The project uses Jest for testing. Tests are located in the `src/tests` directory.

To run tests:
```bash
npm test
```

For watch mode:
```bash
npm run test:watch
```

## Development

1. Start the development server:
```bash
npm run dev
```

2. The server will be available at `http://localhost:3000`

## Error Handling

The application includes comprehensive error handling for:
- Invalid player actions
- Game state validation
- Server errors
- Route not found errors

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Acknowledgments

- Express.js for the web framework
- Jest for testing framework
- All contributors who have helped shape this project 
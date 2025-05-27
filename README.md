# Green Harvest Smart Market Backend

This is the backend service for the Green Harvest Smart Market application, featuring AI-powered market analysis and dynamic data management.

## Features

- AI-powered market analysis using OpenAI's GPT models
- MongoDB database integration for data persistence
- RESTful API endpoints for market data
- Real-time market insights and predictions

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/green-harvest
OPENAI_API_KEY=your_openai_api_key_here
```

3. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Market Analysis
- `POST /api/analyze-market`
  - Body: `{ "query": "your market analysis query" }`
  - Returns AI-powered market insights

## Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server

## Technologies Used

- Node.js
- Express
- TypeScript
- MongoDB
- OpenAI API
- LangChain 
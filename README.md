# Green Harvest Backend

A robust backend service for the Green Harvest agricultural marketplace platform.

## Features

- User authentication and authorization
- Product management
- Image upload and storage
- Trade management
- Expense tracking
- Analytics and reporting
- AI-powered market analysis using Google's Gemini AI

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Google AI Studio API key

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/green-harvest
JWT_SECRET=your_jwt_secret_here
GEMINI_API_KEY=your_gemini_api_key_here
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- POST /api/auth/register - Register a new user
- POST /api/auth/login - Login user
- POST /api/auth/logout - Logout user
- GET /api/auth/profile - Get user profile

### Products
- GET /api/products - Get all products
- POST /api/products - Create a new product
- GET /api/products/:id - Get product by ID
- PUT /api/products/:id - Update product
- DELETE /api/products/:id - Delete product

### Farmer Features
- POST /api/farmer/expenses - Add expense
- GET /api/farmer/expenses - Get all expenses
- PUT /api/farmer/expenses/:id - Update expense
- DELETE /api/farmer/expenses/:id - Delete expense
- GET /api/farmer/trades - Get all trades
- PUT /api/farmer/trades/:id/status - Update trade status
- GET /api/farmer/analytics/sales - Get sales analytics
- GET /api/farmer/analytics/inventory - Get inventory analytics
- GET /api/farmer/analytics/expenses - Get expense analytics
- POST /api/farmer/ai-analytics - Get AI-powered analytics
- GET /api/farmer/ai-recommendations - Get product recommendations
- GET /api/farmer/market-insights - Get market insights

### Upload
- POST /api/upload - Upload image

## Dependencies

- Express.js
- MongoDB with Mongoose
- JWT for authentication
- Multer for file uploads
- Google AI SDK for AI features
- TypeScript for type safety

## Development

The project uses TypeScript for development. To build the project:

```bash
npm run build
```

## Testing

Run tests using Jest:

```bash
npm test
``` 
# StockHints 📊

An AI-powered stock analysis web application that provides investment recommendations, portfolio tracking, and real-time market insights.

## Features

- **AI-Powered Analysis**: Get intelligent stock recommendations using OpenAI
- **Real-time Research**: Fetch latest news and market data via Brave Search
- **Portfolio Tracking**: Track your investments and monitor performance
- **Investment Hints**: Receive BUY/HOLD/SELL recommendations with confidence scores
- **Risk Analysis**: Understand opportunities and risks for each stock
- **Performance Metrics**: View earnings data, price changes, and profit/loss

## Tech Stack

### Backend
- Node.js + Express + TypeScript
- OpenAI API for AI analysis
- Brave Search API for market research
- RESTful API architecture

### Frontend
- React + TypeScript
- Tailwind CSS for styling
- Axios for API calls
- Responsive design

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- Brave Search API key (Optional - [Get one here](https://brave.com/search/api/))

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Edit the `.env` file and add your API keys:
```
PORT=3001
OPENAI_API_KEY=your_openai_api_key_here
BRAVE_API_KEY=your_brave_search_api_key_here
```

5. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:3001`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Usage

1. **Analyze a Stock**:
   - Enter a stock symbol (e.g., AAPL, GOOGL, TSLA)
   - Optionally provide the company name
   - Click "Analyze Stock"
   - Wait for AI to research and analyze

2. **View Analysis**:
   - See AI recommendation (BUY/HOLD/SELL)
   - Review confidence score
   - Read key points, opportunities, and risks
   - Check latest news and earnings data

3. **Add to Portfolio**:
   - Click "Add to Portfolio" button
   - Enter number of shares
   - Set purchase price and date
   - Track performance over time

4. **Manage Portfolio**:
   - View all holdings
   - See profit/loss for each position
   - Refresh prices to update values
   - Remove stocks when sold

## API Endpoints

### POST `/api/stock/analyze`
Analyze a stock and get AI recommendations
```json
{
  "symbol": "AAPL",
  "companyName": "Apple Inc."
}
```

### GET `/api/stock/portfolio`
Get all portfolio holdings

### POST `/api/stock/portfolio`
Add a stock to portfolio
```json
{
  "symbol": "AAPL",
  "shares": 10,
  "purchasePrice": 150.00,
  "purchaseDate": "2024-01-01"
}
```

### DELETE `/api/stock/portfolio/:symbol`
Remove a stock from portfolio

### POST `/api/stock/quick-prices`
Get current prices for multiple stocks
```json
{
  "symbols": ["AAPL", "GOOGL", "TSLA"]
}
```

## Project Structure

```
stockhints/
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── stockResearchService.ts
│   │   │   └── aiAnalysisService.ts
│   │   ├── routes/
│   │   │   └── stockRoutes.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── server.ts
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── StockSearch.tsx
    │   │   ├── AnalysisDisplay.tsx
    │   │   ├── Portfolio.tsx
    │   │   └── AddToPortfolioModal.tsx
    │   ├── services/
    │   │   └── api.ts
    │   ├── types/
    │   │   └── index.ts
    │   └── App.tsx
    └── package.json
```

## Important Notes

⚠️ **Disclaimer**: This application is for educational purposes only. The AI-generated recommendations should not be considered as financial advice. Always do your own research and consult with a financial advisor before making investment decisions.

**Security**: Never commit your `.env` file with real API keys to version control. Keep your API keys secret.

**API Costs**: Be aware that using OpenAI API and Brave Search API may incur costs based on usage. Monitor your API usage to avoid unexpected charges.

## Development

### Backend Development
```bash
cd backend
npm run dev  # Runs with nodemon for auto-reload
```

### Frontend Development
```bash
cd frontend
npm start  # Runs with hot reload
```

### Build for Production

Backend:
```bash
cd backend
npm run build
npm start
```

Frontend:
```bash
cd frontend
npm run build
```

## Future Enhancements

- [ ] Add historical price charts
- [ ] Implement user authentication
- [ ] Add database for persistent storage
- [ ] Support multiple portfolios
- [ ] Email alerts for price targets
- [ ] Technical indicators (RSI, MACD, etc.)
- [ ] Comparison between multiple stocks
- [ ] Export portfolio data to CSV
- [ ] Dark mode support

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

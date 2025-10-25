# Quick Start Guide

## Prerequisites
Make sure you have your API keys ready:
1. OpenAI API Key - Get from https://platform.openai.com/api-keys
2. (Optional) Brave Search API Key - Get from https://brave.com/search/api/

## Step 1: Configure Backend

1. Open `backend/.env` file
2. Add your OpenAI API key:
```
OPENAI_API_KEY=sk-your-key-here
```
3. (Optional) Add Brave Search API key for better stock data:
```
BRAVE_API_KEY=your-brave-key-here
```

## Step 2: Start Backend

Open a terminal and run:
```bash
cd ~/Desktop/code/stockhints/backend
npm run dev
```

You should see:
```
StockHints backend running on http://localhost:3001
API endpoint: http://localhost:3001/api/stock
```

## Step 3: Start Frontend

Open a NEW terminal (keep backend running) and run:
```bash
cd ~/Desktop/code/stockhints/frontend
npm start
```

Your browser should automatically open to `http://localhost:3000`

## Step 4: Try It Out!

1. Enter a stock symbol like "AAPL" or "GOOGL"
2. (Optional) Enter the company name
3. Click "Analyze Stock"
4. Wait for AI analysis (takes 10-30 seconds)
5. Review the recommendation, key points, and news
6. Click "Add to Portfolio" to track the stock

## Troubleshooting

### Backend won't start
- Check that port 3001 is not in use
- Verify your `.env` file has the OpenAI API key
- Run `npm install` in the backend directory

### Frontend won't start
- Check that port 3000 is not in use
- Run `npm install` in the frontend directory
- Clear npm cache: `npm cache clean --force`

### Analysis fails
- Verify your OpenAI API key is correct
- Check you have credits in your OpenAI account
- Look at backend terminal for error messages

### "Failed to analyze stock" error
- Backend might not be running
- Check backend is on http://localhost:3001
- Try refreshing the frontend page

## What to Try

1. **Analyze Popular Stocks**: AAPL, GOOGL, MSFT, TSLA, AMZN
2. **Add to Portfolio**: Analyze a stock and add it with your purchase info
3. **Track Performance**: Refresh prices to see profit/loss
4. **Review AI Insights**: Check opportunities and risks for each stock

## Next Steps

- Read the full README.md for more details
- Customize the AI prompts in `backend/src/services/aiAnalysisService.ts`
- Add more stocks to your portfolio
- Monitor your investments over time

Enjoy using StockHints!

# Setup Checklist

Use this checklist to get StockHints up and running!

## ✅ Prerequisites

- [ ] Node.js installed (check with `node --version`)
- [ ] npm installed (check with `npm --version`)
- [ ] OpenAI account with API access
- [ ] (Optional) Brave Search API account

## ✅ Get API Keys

### OpenAI API Key (Required)
- [ ] Go to https://platform.openai.com/api-keys
- [ ] Sign in or create an account
- [ ] Click "Create new secret key"
- [ ] Copy the key (starts with `sk-`)
- [ ] ⚠️ Save it somewhere safe - you can't view it again!

### Brave Search API Key (Optional, but recommended)
- [ ] Go to https://brave.com/search/api/
- [ ] Sign up for API access
- [ ] Get your API key
- [ ] Copy the key

## ✅ Backend Setup

- [ ] Navigate to backend directory
  ```bash
  cd ~/Desktop/code/stockhints/backend
  ```

- [ ] Verify dependencies are installed
  ```bash
  npm install
  ```

- [ ] Open the `.env` file
  ```bash
  # You can use any text editor, for example:
  open .env
  # or
  nano .env
  ```

- [ ] Add your OpenAI API key to `.env`:
  ```
  PORT=3001
  OPENAI_API_KEY=sk-your-actual-key-here
  BRAVE_API_KEY=your-brave-key-here-or-leave-empty
  ```

- [ ] Save the file

- [ ] Test the backend builds:
  ```bash
  npm run build
  ```

- [ ] Start the backend:
  ```bash
  npm run dev
  ```

- [ ] Verify you see:
  ```
  🚀 StockHints backend running on http://localhost:3001
  📊 API endpoint: http://localhost:3001/api/stock
  ```

- [ ] **Keep this terminal open!**

## ✅ Frontend Setup

- [ ] Open a NEW terminal window/tab

- [ ] Navigate to frontend directory
  ```bash
  cd ~/Desktop/code/stockhints/frontend
  ```

- [ ] Verify dependencies are installed (should already be done)
  ```bash
  npm install
  ```

- [ ] Start the frontend:
  ```bash
  npm start
  ```

- [ ] Browser should open automatically to http://localhost:3000

- [ ] Verify you see the StockHints welcome screen

## ✅ First Test

- [ ] In the web interface, enter "AAPL" as the stock symbol

- [ ] (Optional) Enter "Apple Inc." as company name

- [ ] Click "Analyze Stock"

- [ ] Wait 10-30 seconds for analysis

- [ ] Verify you see:
  - [ ] Stock price
  - [ ] BUY/HOLD/SELL recommendation
  - [ ] Confidence score
  - [ ] Key points
  - [ ] Opportunities and risks
  - [ ] News articles (if Brave API key is configured)

- [ ] Click "Add to Portfolio"

- [ ] Fill in:
  - [ ] Number of shares (e.g., 10)
  - [ ] Purchase price (e.g., 150.00)
  - [ ] Purchase date

- [ ] Click "Add to Portfolio"

- [ ] Verify the stock appears in your portfolio with P/L calculation

## ✅ Troubleshooting

If analysis fails:
- [ ] Check backend terminal for errors
- [ ] Verify OpenAI API key is correct in `.env`
- [ ] Check you have credits in OpenAI account
- [ ] Try a different stock symbol

If portfolio doesn't update:
- [ ] Refresh the page
- [ ] Check browser console for errors (F12 → Console)
- [ ] Verify backend is still running

If nothing works:
- [ ] Restart both backend and frontend
- [ ] Clear browser cache
- [ ] Check both terminals for error messages
- [ ] Verify all dependencies installed: `npm install` in both directories

## ✅ You're All Set!

Once everything is working:
- [ ] Try analyzing different stocks
- [ ] Build your portfolio
- [ ] Monitor performance
- [ ] Explore the AI recommendations

## 📚 Next Steps

- [ ] Read README.md for detailed documentation
- [ ] Review PROJECT_SUMMARY.md to understand the architecture
- [ ] Customize AI prompts in `backend/src/services/aiAnalysisService.ts`
- [ ] Experiment with different stocks and strategies

## 💡 Tips

1. **API Costs**: Each analysis costs ~$0.01-0.02 in OpenAI credits
2. **Mock Data**: App works without Brave API key (uses mock data)
3. **Portfolio**: Data stored in memory - restart backend clears it
4. **Recommendations**: For educational purposes only, not financial advice!

## ✨ Enjoy StockHints!

Happy investing! 📈

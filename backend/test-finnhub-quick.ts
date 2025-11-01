import dotenv from 'dotenv';
dotenv.config();

import { FinnhubService } from './src/services/finnhubService.js';

async function testFinnhub() {
  console.log('Testing Finnhub with API key:', process.env.FINNHUB_API_KEY?.substring(0, 10) + '...');
  
  const finnhubService = new FinnhubService();
  const data = await finnhubService.getFinnhubData('TSLA');
  
  console.log('\n✅ Finnhub Data Retrieved:');
  console.log('  Sentiment Score:', data.sentimentScore);
  console.log('  Article Count:', data.articleCount);
  console.log('  Reddit Mentions:', data.redditMentions);
  console.log('  Reddit Sentiment:', data.redditSentiment);
}

testFinnhub().catch(console.error);

import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';

async function testMarketaux() {
  console.log('Testing Marketaux with API key:', process.env.MARKETAUX_API_KEY?.substring(0, 10) + '...');

  try {
    const response = await axios.get('https://api.marketaux.com/v1/news/all', {
      params: {
        api_token: process.env.MARKETAUX_API_KEY,
        symbols: 'TSLA',
        filter_entities: true,
        limit: 5,
        language: 'en',
        sort: 'published_at'
      },
      timeout: 8000
    });

    const articles = response.data?.data || [];
    console.log(`\n✅ Marketaux API Working!`);
    console.log(`   Found ${articles.length} articles for TSLA`);

    if (articles.length > 0) {
      console.log(`\n   First article:`);
      console.log(`   - Title: ${articles[0].title}`);
      const sentiment = articles[0].entities?.[0]?.sentiment_score;
      console.log(`   - Sentiment: ${sentiment || 'N/A'}`);
    }
  } catch (error: any) {
    console.error('\n❌ Marketaux API Error:');
    console.error('   Status:', error.response?.status);
    console.error('   Message:', error.response?.data || error.message);
  }
}

testMarketaux();

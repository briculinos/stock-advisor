import { StockResearchService } from './src/services/stockResearchService.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testMarketaux() {
  console.log('🧪 Testing Marketaux Integration...\n');

  const researchService = new StockResearchService();

  // Test with a popular stock that should have news
  const symbol = 'TSLA';
  console.log(`📊 Fetching research data for ${symbol}...\n`);

  try {
    const researchData = await researchService.researchStock(symbol);

    console.log('✅ Research data retrieved successfully!\n');
    console.log(`Company: ${researchData.companyName || symbol}`);
    console.log(`Price: ${researchData.currentPrice} ${researchData.currency}`);
    console.log(`Industry: ${researchData.industry || 'N/A'}`);
    console.log(`\n📰 News Articles (${researchData.news.length}):\n`);

    researchData.news.forEach((article, index) => {
      console.log(`${index + 1}. ${article.title}`);
      console.log(`   Source: ${article.source}`);
      console.log(`   Published: ${article.publishedAt}`);

      if (article.sentiment) {
        const sentimentEmoji = article.sentiment === 'positive' ? '🟢' : article.sentiment === 'negative' ? '🔴' : '🟡';
        console.log(`   Sentiment: ${sentimentEmoji} ${article.sentiment.toUpperCase()} ${article.sentimentScore ? `(${(article.sentimentScore * 100).toFixed(0)}%)` : ''}`);
      }

      console.log(`   Snippet: ${article.snippet.substring(0, 100)}...`);
      console.log('');
    });

    // Calculate overall sentiment
    const newsWithSentiment = researchData.news.filter(n => n.sentimentScore !== undefined);
    if (newsWithSentiment.length > 0) {
      const avgSentiment = newsWithSentiment.reduce((sum, n) => sum + (n.sentimentScore || 0), 0) / newsWithSentiment.length;
      const overallEmoji = avgSentiment > 0.2 ? '🟢' : avgSentiment < -0.2 ? '🔴' : '🟡';
      console.log(`\n📊 Overall News Sentiment: ${overallEmoji} ${(avgSentiment * 100).toFixed(0)}%\n`);
    } else {
      console.log('\n⚠️  No sentiment data available (Marketaux may not be configured or no results)\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testMarketaux();

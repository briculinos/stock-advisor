import { StockResearchService } from './src/services/stockResearchService.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testQuiverIntegration() {
  console.log('🧪 Testing Quiver + Marketaux Full Integration...\n');

  const researchService = new StockResearchService();

  // Test with NVDA - likely to have congressional trades and Reddit mentions
  const symbol = 'NVDA';
  console.log(`📊 Fetching full research data for ${symbol}...\n`);

  try {
    const researchData = await researchService.researchStock(symbol);

    console.log('✅ Research data retrieved successfully!\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📈 ${researchData.companyName || symbol}`);
    console.log(`💰 Price: ${researchData.currentPrice} ${researchData.currency}`);
    console.log(`🏢 Industry: ${researchData.industry || 'N/A'}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Display News Sentiment
    console.log('📰 NEWS SENTIMENT:\n');
    const newsWithSentiment = researchData.news.filter(n => n.sentimentScore !== undefined);
    if (newsWithSentiment.length > 0) {
      const avgSentiment = newsWithSentiment.reduce((sum, n) => sum + (n.sentimentScore || 0), 0) / newsWithSentiment.length;
      const overallEmoji = avgSentiment > 0.2 ? '🟢' : avgSentiment < -0.2 ? '🔴' : '🟡';
      console.log(`   Overall Sentiment: ${overallEmoji} ${(avgSentiment * 100).toFixed(0)}%`);
      console.log(`   Articles with sentiment: ${newsWithSentiment.length}/${researchData.news.length}\n`);
    } else {
      console.log('   ⚠️  No sentiment data available\n');
    }

    // Display Quiver Data (the star of the show!)
    console.log('🏛️  QUIVER QUANTITATIVE DATA (Political & Social Signals):\n');
    if (researchData.quiverData) {
      const q = researchData.quiverData;

      console.log('   📊 SUMMARY:');
      console.log(`   ${q.activitySummary || 'No recent activity'}\n`);

      console.log('   🏛️  CONGRESSIONAL TRADING (Last 30 days):');
      console.log(`   └─ Purchases: ${q.congressionalBuys}`);
      console.log(`   └─ Sales: ${q.congressionalSells}`);

      if (q.congressionalBuys > 0) {
        console.log('   ✅ SIGNAL: Politicians are buying - potential bullish indicator');
      } else if (q.congressionalSells > 0) {
        console.log('   ⚠️  SIGNAL: Politicians are selling - potential bearish indicator');
      } else {
        console.log('   ℹ️  No recent congressional activity');
      }
      console.log('');

      console.log('   👔 INSIDER TRADING (Last 30 days):');
      console.log(`   └─ Buys: ${q.insiderBuys}`);
      console.log(`   └─ Sells: ${q.insiderSells}`);

      if (q.insiderBuys > q.insiderSells) {
        console.log('   ✅ SIGNAL: Net insider buying - executives are bullish');
      } else if (q.insiderSells > q.insiderBuys) {
        console.log('   ⚠️  SIGNAL: Net insider selling - could be routine or bearish');
      } else if (q.insiderBuys > 0 || q.insiderSells > 0) {
        console.log('   ℹ️  Mixed insider activity');
      } else {
        console.log('   ℹ️  No recent insider activity');
      }
      console.log('');

      console.log('   🚀 REDDIT WSB MENTIONS (Last 7 days):');
      console.log(`   └─ Mentions: ${q.redditMentions}`);

      if (q.redditMentions > 100) {
        console.log('   🔥 SIGNAL: HIGH retail interest - moonshot potential or meme stock');
      } else if (q.redditMentions > 10) {
        console.log('   📈 SIGNAL: Moderate retail interest');
      } else if (q.redditMentions > 0) {
        console.log('   ℹ️  Low retail interest');
      } else {
        console.log('   ℹ️  No recent WSB mentions');
      }
      console.log('');

      // Moonshot Score Calculation
      console.log('   🌙 MOONSHOT POTENTIAL ASSESSMENT:');
      let moonshotScore = 0;
      const factors: string[] = [];

      if (q.congressionalBuys > 0) {
        moonshotScore += 25;
        factors.push('Congressional buying (+25)');
      }
      if (q.insiderBuys > q.insiderSells && q.insiderBuys > 0) {
        moonshotScore += 20;
        factors.push('Net insider buying (+20)');
      }
      if (q.redditMentions > 50) {
        moonshotScore += 30;
        factors.push('High Reddit buzz (+30)');
      } else if (q.redditMentions > 10) {
        moonshotScore += 15;
        factors.push('Moderate Reddit buzz (+15)');
      }

      const avgSentiment = newsWithSentiment.length > 0
        ? newsWithSentiment.reduce((sum, n) => sum + (n.sentimentScore || 0), 0) / newsWithSentiment.length
        : 0;

      if (avgSentiment > 0.2) {
        moonshotScore += 25;
        factors.push('Positive news sentiment (+25)');
      }

      console.log(`   └─ Score: ${moonshotScore}/100`);
      if (factors.length > 0) {
        console.log('   └─ Factors:');
        factors.forEach(f => console.log(`      • ${f}`));
      }

      if (moonshotScore >= 70) {
        console.log('   🚀 HIGH moonshot potential - strong political, insider, and social signals');
      } else if (moonshotScore >= 40) {
        console.log('   📈 MODERATE moonshot potential - some positive signals');
      } else if (moonshotScore > 0) {
        console.log('   ⚠️  LOW moonshot potential - limited signals');
      } else {
        console.log('   ❌ NO moonshot potential - no positive signals detected');
      }

    } else {
      console.log('   ⚠️  Quiver data not available (API not configured or failed)\n');
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testQuiverIntegration();

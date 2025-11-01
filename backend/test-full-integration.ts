import { StockResearchService } from './src/services/stockResearchService.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testFullIntegration() {
  console.log('🧪 Testing FULL API Integration (Marketaux + Quiver + Alpha Vantage)...\n');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const researchService = new StockResearchService();

  // Test with TSLA - likely to have data from all sources
  const symbol = 'TSLA';
  console.log(`📊 Fetching complete research data for ${symbol}...\n`);

  try {
    const researchData = await researchService.researchStock(symbol);

    console.log('✅ Research data retrieved successfully!\n');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log(`📈 ${researchData.companyName || symbol}`);
    console.log(`💰 Price: $${researchData.currentPrice} ${researchData.currency}`);
    console.log(`🏢 Industry: ${researchData.industry || 'N/A'}`);
    console.log('═══════════════════════════════════════════════════════════════════\n');

    // 1. MARKETAUX NEWS SENTIMENT
    console.log('📰 [1] MARKETAUX NEWS SENTIMENT:\n');
    const newsWithSentiment = researchData.news.filter(n => n.sentimentScore !== undefined);
    if (newsWithSentiment.length > 0) {
      const avgSentiment = newsWithSentiment.reduce((sum, n) => sum + (n.sentimentScore || 0), 0) / newsWithSentiment.length;
      const overallEmoji = avgSentiment > 0.2 ? '🟢' : avgSentiment < -0.2 ? '🔴' : '🟡';
      console.log(`   ✅ Marketaux Working`);
      console.log(`   Overall Sentiment: ${overallEmoji} ${(avgSentiment * 100).toFixed(0)}%`);
      console.log(`   Articles with sentiment: ${newsWithSentiment.length}/${researchData.news.length}`);

      // Show sample articles
      console.log(`\n   Sample Articles:`);
      newsWithSentiment.slice(0, 2).forEach((article, i) => {
        const sentimentEmoji = article.sentiment === 'positive' ? '🟢' : article.sentiment === 'negative' ? '🔴' : '🟡';
        console.log(`   ${i + 1}. ${sentimentEmoji} [${article.sentiment?.toUpperCase()}] ${article.title.substring(0, 60)}...`);
      });
    } else {
      console.log('   ⚠️  Marketaux not working or no sentiment data');
    }
    console.log('');

    // 2. QUIVER QUANTITATIVE DATA
    console.log('🏛️  [2] QUIVER QUANTITATIVE (Political & Social):\n');
    if (researchData.quiverData) {
      const q = researchData.quiverData;
      console.log(`   Summary: ${q.activitySummary || 'No recent activity'}`);
      console.log(`   └─ Congressional: ${q.congressionalBuys} buys / ${q.congressionalSells} sells (30d)`);
      console.log(`   └─ Insiders: ${q.insiderBuys} buys / ${q.insiderSells} sells (30d)`);
      console.log(`   └─ Reddit WSB: ${q.redditMentions} mentions (7d)`);

      if (q.congressionalBuys > 0 || q.congressionalSells > 0 || q.insiderBuys > 0 || q.insiderSells > 0 || q.redditMentions > 0) {
        console.log(`   ✅ Quiver has data (but some endpoints may have limited access)`);
      } else {
        console.log(`   ⚠️  Quiver connected but no recent activity OR limited API access`);
      }
    } else {
      console.log('   ❌ Quiver data not available');
    }
    console.log('');

    // 3. ALPHA VANTAGE DATA
    console.log('📊 [3] ALPHA VANTAGE (RapidAPI - Professional Data):\n');
    if (researchData.alphaVantageData) {
      const av = researchData.alphaVantageData;
      const sentimentEmoji = av.newsSentiment === 'Bullish' ? '🟢' : av.newsSentiment === 'Bearish' ? '🔴' : '🟡';

      console.log(`   ✅ Alpha Vantage Working`);
      console.log(`   News Sentiment: ${sentimentEmoji} ${av.newsSentiment}`);
      console.log(`   Sentiment Score: ${(av.sentimentScore * 100).toFixed(0)}% (${av.sentimentScore > 0.15 ? 'Bullish' : av.sentimentScore < -0.15 ? 'Bearish' : 'Neutral'})`);
      console.log(`   Articles Analyzed: ${av.articleCount}`);

      if (av.fundamentals) {
        console.log(`\n   Fundamentals:`);
        console.log(`   └─ P/E Ratio: ${av.fundamentals.pe}`);
        console.log(`   └─ EPS: ${av.fundamentals.eps}`);
        console.log(`   └─ Profit Margin: ${av.fundamentals.profitMargin}`);
        console.log(`   └─ Debt/Equity: ${av.fundamentals.debtToEquity}`);
        console.log(`   └─ Analyst Target: $${av.fundamentals.analystTarget}`);
      } else {
        console.log(`   ⚠️  Fundamentals data not available`);
      }
    } else {
      console.log('   ❌ Alpha Vantage data not available');
    }
    console.log('');

    // MOONSHOT SCORING PREVIEW
    console.log('🌙 [BONUS] MOONSHOT POTENTIAL SCORE:\n');
    let moonshotScore = 0;
    const factors: string[] = [];

    // Marketaux sentiment
    if (newsWithSentiment.length > 0) {
      const avgSentiment = newsWithSentiment.reduce((sum, n) => sum + (n.sentimentScore || 0), 0) / newsWithSentiment.length;
      if (avgSentiment > 0.2) {
        moonshotScore += 20;
        factors.push('Positive Marketaux sentiment (+20)');
      }
    }

    // Alpha Vantage sentiment
    if (researchData.alphaVantageData && researchData.alphaVantageData.sentimentScore > 0.15) {
      moonshotScore += 20;
      factors.push('Bullish Alpha Vantage sentiment (+20)');
    }

    // Quiver data
    if (researchData.quiverData) {
      const q = researchData.quiverData;
      if (q.congressionalBuys > 0) {
        moonshotScore += 25;
        factors.push(`Congressional buying (+25)`);
      }
      if (q.insiderBuys > q.insiderSells && q.insiderBuys > 0) {
        moonshotScore += 15;
        factors.push('Net insider buying (+15)');
      }
      if (q.redditMentions > 50) {
        moonshotScore += 20;
        factors.push('High Reddit buzz (+20)');
      } else if (q.redditMentions > 10) {
        moonshotScore += 10;
        factors.push('Moderate Reddit buzz (+10)');
      }
    }

    console.log(`   Moonshot Score: ${moonshotScore}/100`);
    if (factors.length > 0) {
      console.log(`   Factors:`);
      factors.forEach(f => console.log(`   • ${f}`));
    }

    if (moonshotScore >= 70) {
      console.log(`\n   🚀 HIGH moonshot potential!`);
    } else if (moonshotScore >= 40) {
      console.log(`\n   📈 MODERATE moonshot potential`);
    } else if (moonshotScore > 0) {
      console.log(`\n   ⚠️  LOW moonshot potential`);
    } else {
      console.log(`\n   ❌ NO moonshot signals detected`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('\n✅ INTEGRATION TEST COMPLETE\n');

    // Summary
    const workingAPIs: string[] = [];
    if (newsWithSentiment.length > 0) workingAPIs.push('Marketaux');
    if (researchData.alphaVantageData?.articleCount > 0) workingAPIs.push('Alpha Vantage');
    if (researchData.quiverData) workingAPIs.push('Quiver (partial)');

    console.log(`Working APIs: ${workingAPIs.join(', ')}`);
    console.log(`Total data sources: ${workingAPIs.length}/3`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testFullIntegration();

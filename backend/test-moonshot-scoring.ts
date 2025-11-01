import { StockResearchService } from './src/services/stockResearchService.js';
import { MoonshotScoringService } from './src/services/moonshotScoringService.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testMoonshotScoring() {
  console.log('🌙 MOONSHOT SCORING SYSTEM TEST\n');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const researchService = new StockResearchService();
  const scoringService = new MoonshotScoringService();

  // Test with multiple stocks to show scoring diversity
  const testSymbols = ['TSLA', 'GME', 'NVDA'];

  for (const symbol of testSymbols) {
    console.log(`\n📊 Analyzing ${symbol}...`);
    console.log('─'.repeat(70));

    try {
      // Get research data
      const researchData = await researchService.researchStock(symbol);

      // Calculate moonshot score
      const moonshotScore = scoringService.calculateMoonshotScore(researchData);

      // Display results
      console.log(`\n🎯 MOONSHOT SCORE: ${moonshotScore.totalScore}/100 [Grade: ${moonshotScore.grade}]`);
      console.log(`📈 Category: ${moonshotScore.category}`);
      console.log(`⚠️  Risk Level: ${moonshotScore.riskLevel}\n`);

      // Component breakdown
      console.log('📋 SCORE BREAKDOWN:\n');

      // 1. Rumors & Politics (50%)
      const rp = moonshotScore.components.rumorsAndPolitics;
      console.log(`   1️⃣  Rumors + Politics + Tariffs: ${rp.score}/50 (${(rp.weight * 100).toFixed(0)}% weight)`);
      if (rp.details.length > 0) {
        rp.details.forEach(d => console.log(`       • ${d}`));
      }
      console.log('');

      // 2. News Impact (25%)
      const ni = moonshotScore.components.newsImpact;
      console.log(`   2️⃣  News Impact: ${ni.score}/25 (${(ni.weight * 100).toFixed(0)}% weight)`);
      if (ni.details.length > 0) {
        ni.details.forEach(d => console.log(`       • ${d}`));
      }
      console.log('');

      // 3. Social Sentiment (15%)
      const ss = moonshotScore.components.socialSentiment;
      console.log(`   3️⃣  Social Sentiment: ${ss.score}/15 (${(ss.weight * 100).toFixed(0)}% weight)`);
      if (ss.details.length > 0) {
        ss.details.forEach(d => console.log(`       • ${d}`));
      }
      console.log('');

      // 4. Insider Activity (10%)
      const ia = moonshotScore.components.insiderActivity;
      console.log(`   4️⃣  Insider Activity: ${ia.score}/10 (${(ia.weight * 100).toFixed(0)}% weight)`);
      if (ia.details.length > 0) {
        ia.details.forEach(d => console.log(`       • ${d}`));
      }
      console.log('');

      // Strengths & Weaknesses
      if (moonshotScore.strengths.length > 0) {
        console.log('✅ STRENGTHS:');
        moonshotScore.strengths.forEach(s => console.log(`   • ${s}`));
        console.log('');
      }

      if (moonshotScore.weaknesses.length > 0) {
        console.log('⚠️  WEAKNESSES:');
        moonshotScore.weaknesses.forEach(w => console.log(`   • ${w}`));
        console.log('');
      }

      // Recommendation
      console.log(`💡 RECOMMENDATION:\n   ${moonshotScore.recommendation}`);

      console.log('\n' + '═'.repeat(70));

      // Add delay between requests to avoid rate limits
      if (testSymbols.indexOf(symbol) < testSymbols.length - 1) {
        console.log('\nWaiting 3 seconds before next request...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

    } catch (error: any) {
      console.error(`❌ Error analyzing ${symbol}:`, error.message);
    }
  }

  console.log('\n\n🏆 SCORING SYSTEM SUMMARY:\n');
  console.log('The moonshot scoring algorithm evaluates stocks across 4 dimensions:');
  console.log('');
  console.log('1. 🏛️  RUMORS + POLITICS + TARIFFS (50% weight)');
  console.log('   - Congressional trading activity (politicians buying/selling)');
  console.log('   - Political news sentiment (regulations, subsidies, tariffs)');
  console.log('   - Lobbying and government contract activity');
  console.log('');
  console.log('2. 📰 NEWS IMPACT (25% weight)');
  console.log('   - Marketaux AI sentiment analysis');
  console.log('   - Alpha Vantage professional sentiment');
  console.log('   - News volume and coverage intensity');
  console.log('');
  console.log('3. 🚀 SOCIAL SENTIMENT (15% weight)');
  console.log('   - Reddit WSB mentions (meme stock detector)');
  console.log('   - Social momentum and retail interest');
  console.log('   - Community buzz and trending status');
  console.log('');
  console.log('4. 👔 INSIDER ACTIVITY (10% weight)');
  console.log('   - Executive buying/selling patterns');
  console.log('   - Insider confidence signals');
  console.log('   - Net insider positioning');
  console.log('');
  console.log('Grade Scale:');
  console.log('  S (85-100): Exceptional moonshot - Multiple strong catalysts');
  console.log('  A (70-84):  Strong moonshot - Clear momentum building');
  console.log('  B (55-69):  Good moonshot - Solid potential');
  console.log('  C (40-54):  Moderate moonshot - Mixed signals');
  console.log('  D (25-39):  Weak moonshot - Limited catalysts');
  console.log('  F (0-24):   Not a moonshot - Traditional analysis better');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════\n');
}

testMoonshotScoring();

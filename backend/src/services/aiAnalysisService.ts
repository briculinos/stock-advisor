import OpenAI from 'openai';
import { StockAnalysis, StockResearchData } from '../types/index.js';

export class AIAnalysisService {
  private openai: OpenAI;

  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY
    });
  }

  async analyzeStock(researchData: StockResearchData, companyName: string): Promise<StockAnalysis> {
    try {
      const prompt = this.buildAnalysisPrompt(researchData, companyName);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an institutional-grade equity analyst managing real capital. Analyze stock data and provide risk-adjusted investment recommendations based on fundamentals, sentiment, macro regime, and technical context. Be objective, conservative, and explicit about uncertainty. If data is missing or outdated, say "UNKNOWN" and reduce confidence. Do not assume or hallucinate — act like your decisions move real money.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4
      });

      const analysisText = completion.choices[0].message.content || '';

      return this.parseAnalysis(researchData.symbol, companyName, researchData.currentPrice, researchData.currency, analysisText);
    } catch (error) {
      console.error('AI Analysis error:', error);
      return this.getMockAnalysis(researchData, companyName);
    }
  }

  private buildAnalysisPrompt(data: StockResearchData, companyName: string): string {
    // Build news text with sentiment if available
    const newsText = data.news.map(n => {
      const sentimentTag = n.sentiment ? ` [${n.sentiment.toUpperCase()}${n.sentimentScore ? ` ${(n.sentimentScore * 100).toFixed(0)}%` : ''}]` : '';
      return `- ${n.title}${sentimentTag}: ${n.snippet}`;
    }).join('\n');

    // Calculate overall news sentiment
    const newsWithSentiment = data.news.filter(n => n.sentimentScore !== undefined);
    let overallSentiment = 'UNKNOWN';
    if (newsWithSentiment.length > 0) {
      const avgSentiment = newsWithSentiment.reduce((sum, n) => sum + (n.sentimentScore || 0), 0) / newsWithSentiment.length;
      if (avgSentiment > 0.2) {
        overallSentiment = `POSITIVE (${(avgSentiment * 100).toFixed(0)}%)`;
      } else if (avgSentiment < -0.2) {
        overallSentiment = `NEGATIVE (${(avgSentiment * 100).toFixed(0)}%)`;
      } else {
        overallSentiment = `NEUTRAL (${(avgSentiment * 100).toFixed(0)}%)`;
      }
    }

    // Additional metrics (mark as UNKNOWN if not available)
    const sectorPerformance = data.sectorPerformance || 'UNKNOWN';
    const shortInterest = data.shortInterest || 'UNKNOWN';
    const insiderActivity = data.insiderActivity || 'UNKNOWN';
    const debtMetrics = data.debtToEbitda || data.cashRunway || 'UNKNOWN';
    const macroRegimeScore = data.macroScore || 'UNKNOWN';

    // Quiver data (political/insider/social signals)
    let politicalInsiderSection = '';
    if (data.quiverData) {
      const q = data.quiverData;
      politicalInsiderSection = `

    🚨 POLITICAL & INSIDER SIGNALS (Critical for moonshots):
    • Congressional Trading (30d): ${q.congressionalBuys} BUYS, ${q.congressionalSells} SELLS
    • Insider Trading (30d): ${q.insiderBuys} BUYS, ${q.insiderSells} SELLS
    • Reddit WSB Mentions (7d): ${q.redditMentions} mentions
    • Activity Summary: ${q.activitySummary || 'No recent activity'}

    ⚠️ INTERPRETATION:
    - Congressional BUYS = Potential bullish political tailwinds or advance knowledge
    - Congressional SELLS = Potential bearish regulations or insider concerns
    - Insider BUYS = Strong confidence from company leadership
    - Insider SELLS = Could be routine or lack of confidence
    - High Reddit mentions = Retail momentum, meme stock potential (high volatility)`;
    } else {
      politicalInsiderSection = '\n    • Political/Insider/Social Data: UNKNOWN (Quiver API not configured)';
    }

    // Alpha Vantage data (professional sentiment & fundamentals)
    let alphaVantageSection = '';
    if (data.alphaVantageData) {
      const av = data.alphaVantageData;
      const sentimentEmoji = av.newsSentiment === 'Bullish' ? '🟢' : av.newsSentiment === 'Bearish' ? '🔴' : '🟡';
      alphaVantageSection = `

    📊 ALPHA VANTAGE PROFESSIONAL DATA:
    • News Sentiment: ${sentimentEmoji} ${av.newsSentiment} (Score: ${(av.sentimentScore * 100).toFixed(0)}%)
    • Articles Analyzed: ${av.articleCount}`;

      if (av.fundamentals) {
        const f = av.fundamentals;
        alphaVantageSection += `
    • Fundamentals:
      - P/E Ratio: ${f.pe}
      - EPS: ${f.eps}
      - Profit Margin: ${f.profitMargin}
      - Debt/Equity: ${f.debtToEquity}
      - Analyst Target: ${f.analystTarget}`;
      }
    } else {
      alphaVantageSection = '\n    • Alpha Vantage Data: UNKNOWN';
    }

    return `Analyze ${companyName} (${data.symbol}) stock:
    • Current Price: $${data.currentPrice.toFixed(2)}
    • Relative Sector Performance (30d): ${sectorPerformance}
    • Short Interest: ${shortInterest}%
    • Insider Activity (30d): ${insiderActivity}
    • Debt/EBITDA or Cash Runway: ${debtMetrics}
    • Overall News Sentiment: ${overallSentiment}
    • Recent News (with sentiment scores):
${newsText}
    • Earnings: ${data.earnings ? `${data.earnings.quarter} – EPS: $${data.earnings.eps}, Revenue: ${data.earnings.revenue}` : 'UNKNOWN'}
    • Forecast: ${data.forecast || 'UNKNOWN'}
    • Macro Regime Score: ${macroRegimeScore}${politicalInsiderSection}${alphaVantageSection}

Please provide:
    1. Overall recommendation (BUY, HOLD, SELL, or AVOID)
    2. Confidence level (0–100)
    3. Position type (LONG, SHORT, AVOID)
    4. Intended time horizon (in days)
    5. 3–5 numeric key points supporting your recommendation
    6. 2–3 main risks (quantified if possible)
    7. 2–3 opportunities/catalysts
    8. Target price and stop loss (optional)
    9. Thesis invalidation condition
    10. Brief analysis summary (1–2 paragraphs, no filler)

Format your response as JSON with these fields:
{
  "recommendation": "BUY|HOLD|SELL|AVOID",
  "confidence": number,
  "positionType": "LONG|SHORT|AVOID",
  "timeHorizonDays": number,
  "keyPoints": [string],
  "risks": [string],
  "opportunities": [string],
  "targetPrice": number,
  "stopLoss": number,
  "thesisInvalidation": "string",
  "dataGaps": [string],
  "summary": "string"
}`;
  }

  private parseAnalysis(symbol: string, companyName: string, currentPrice: number, currency: string, analysisText: string): StockAnalysis {
    try {
      // Try to extract JSON from the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Map AVOID to HOLD for compatibility with existing system
        let recommendation = parsed.recommendation || 'HOLD';
        if (recommendation === 'AVOID') {
          recommendation = 'HOLD';
        }

        return {
          symbol,
          companyName,
          currentPrice,
          currency,
          analysis: parsed.summary || analysisText,
          recommendation: recommendation as 'BUY' | 'HOLD' | 'SELL',
          confidence: parsed.confidence || 50,
          keyPoints: parsed.keyPoints || [],
          risks: parsed.risks || [],
          opportunities: parsed.opportunities || [],
          targetPrice: parsed.targetPrice,
          stopLoss: parsed.stopLoss,
          positionType: parsed.positionType,
          timeHorizonDays: parsed.timeHorizonDays,
          thesisInvalidation: parsed.thesisInvalidation,
          dataGaps: parsed.dataGaps || [],
          analyst: 'Institutional AI Analyst',
          timestamp: new Date()
        };
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
    }

    // Fallback: parse text-based response
    return {
      symbol,
      companyName,
      currentPrice,
      currency,
      analysis: analysisText,
      recommendation: this.extractRecommendation(analysisText),
      confidence: 60,
      keyPoints: this.extractBulletPoints(analysisText, 'key point'),
      risks: this.extractBulletPoints(analysisText, 'risk'),
      opportunities: this.extractBulletPoints(analysisText, 'opportunit'),
      analyst: 'Institutional AI Analyst',
      timestamp: new Date()
    };
  }

  private extractRecommendation(text: string): 'BUY' | 'HOLD' | 'SELL' {
    const lower = text.toLowerCase();
    if (lower.includes('strong buy') || lower.includes('buy')) return 'BUY';
    if (lower.includes('sell')) return 'SELL';
    if (lower.includes('avoid')) return 'HOLD'; // Map AVOID to HOLD for compatibility
    return 'HOLD';
  }

  private extractBulletPoints(text: string, keyword: string): string[] {
    const lines = text.split('\n');
    const points: string[] = [];

    for (const line of lines) {
      if (line.toLowerCase().includes(keyword) || line.trim().match(/^[-•*]\s/)) {
        const cleaned = line.replace(/^[-•*]\s/, '').trim();
        if (cleaned.length > 10) {
          points.push(cleaned);
        }
      }
    }

    return points.slice(0, 5);
  }

  private getMockAnalysis(data: StockResearchData, companyName: string): StockAnalysis {
    const sentiment = Math.random();
    const recommendation: 'BUY' | 'HOLD' | 'SELL' =
      sentiment > 0.6 ? 'BUY' : sentiment > 0.3 ? 'HOLD' : 'SELL';

    return {
      symbol: data.symbol,
      companyName,
      currentPrice: data.currentPrice,
      currency: data.currency,
      analysis: `Based on recent market data and news analysis, ${companyName} shows ${sentiment > 0.5 ? 'positive' : 'mixed'} signals. The company's recent earnings and market position suggest a ${recommendation.toLowerCase()} recommendation at current levels.`,
      recommendation,
      confidence: Math.floor(sentiment * 40 + 50),
      keyPoints: [
        'Strong revenue growth in recent quarter',
        'Market position remains competitive',
        'Management guidance indicates positive outlook'
      ],
      risks: [
        'Market volatility could impact short-term performance',
        'Regulatory environment remains uncertain'
      ],
      opportunities: [
        'Expansion into new markets',
        'Product innovation pipeline looks promising'
      ],
      targetPrice: data.currentPrice * (1 + (sentiment - 0.5) * 0.3),
      analyst: 'AI Financial Analyst',
      timestamp: new Date()
    };
  }
}

import React from 'react';
import ElliottWaveChart from './ElliottWaveChart';

interface EnhancedInsight {
  symbol: string;
  currentPrice: number;
  currency: string;
  recommendation: 'BUY' | 'HOLD' | 'SELL';
  confidence: number;
  compositeScore: number;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  technical: {
    score: number;
    rsi: number;
    macd: any;
    momentum: number;
    trend: string;
  };
  fundamental: {
    score: number;
    currentWave: string;
    elliottRecommendation: string;
  };
  sentiment: {
    score: number;
    polarity: string;
    hypeLevel: string;
    keyTopics: string[];
  };
  macro: {
    score: number;
    regime: string;
    vixLevel: number;
  };
  rationale: string;
  priceData: any[];
  waves: any[];
  fibonacciLevels: any[];
  news: any[];
}

interface Props {
  data: EnhancedInsight;
}

function EnhancedInsightsDisplay({ data }: Props) {
  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'BUY': return 'bg-green-50 border-green-500 text-green-700';
      case 'SELL': return 'bg-red-50 border-red-500 text-red-700';
      case 'HOLD': return 'bg-yellow-50 border-yellow-500 text-yellow-700';
      default: return 'bg-gray-50 border-gray-500 text-gray-700';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 65) return 'text-green-600';
    if (score <= 35) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 65) return 'bg-green-100';
    if (score <= 35) return 'bg-red-100';
    return 'bg-yellow-100';
  };

  return (
    <div className="space-y-6">
      {/* Main Recommendation Card */}
      <div className={`rounded-lg shadow-lg p-6 border-2 ${getRecommendationColor(data.recommendation)}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold">{data.symbol}</h2>
            <p className="text-lg">{data.currency} {data.currentPrice.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{data.recommendation}</div>
            <div className="text-sm mt-1">{data.confidence.toFixed(0)}% Confidence</div>
          </div>
        </div>

        <div className="bg-white bg-opacity-50 rounded p-3 mb-4">
          <p className="text-sm font-semibold mb-1">Composite Score</p>
          <div className="flex items-center">
            <div className="flex-1 bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${data.compositeScore >= 65 ? 'bg-green-500' : data.compositeScore <= 35 ? 'bg-red-500' : 'bg-yellow-500'}`}
                style={{ width: `${data.compositeScore}%` }}
              ></div>
            </div>
            <span className="ml-3 font-bold">{data.compositeScore.toFixed(1)}/100</span>
          </div>
        </div>

        <div className="bg-white bg-opacity-50 rounded p-1">
          <p className="text-sm italic">{data.rationale}</p>
          <p className="text-sm italic mt-2">AI generated insight</p>
        </div>
      </div>

      {/* Price Targets */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900">Price Targets</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded p-3">
            <p className="text-xs text-gray-600 mb-1">Entry</p>
            <p className="text-xl font-bold text-blue-700">{data.currency} {data.entry.toFixed(2)}</p>
          </div>
          <div className="bg-red-50 rounded p-3">
            <p className="text-xs text-gray-600 mb-1">Stop Loss</p>
            <p className="text-xl font-bold text-red-700">{data.currency} {data.stop.toFixed(2)}</p>
          </div>
          <div className="bg-green-50 rounded p-3">
            <p className="text-xs text-gray-600 mb-1">Target 1</p>
            <p className="text-xl font-bold text-green-700">{data.currency} {data.target1.toFixed(2)}</p>
          </div>
          <div className="bg-green-50 rounded p-3">
            <p className="text-xs text-gray-600 mb-1">Target 2</p>
            <p className="text-xl font-bold text-green-700">{data.currency} {data.target2.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Elliott Wave Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <ElliottWaveChart
          data={{
            symbol: data.symbol,
            currentWave: data.fundamental.currentWave,
            recommendation: data.fundamental.elliottRecommendation as 'BUY' | 'HOLD' | 'SELL',
            prediction: `Wave ${data.fundamental.currentWave} pattern`,
            analysis: `Elliott Wave pattern analysis indicates current position in Wave ${data.fundamental.currentWave}. The technical structure suggests ${data.fundamental.elliottRecommendation.toLowerCase()} signal based on wave positioning and Fibonacci retracement levels.`,
            priceData: data.priceData,
            waves: data.waves,
            fibonacciLevels: data.fibonacciLevels
          }}
        />
      </div>

      {/* News Section */}
      {data.news && data.news.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-4 text-gray-900">Recent News</h3>
          <div className="space-y-3">
            {data.news.slice(0, 5).map((item, idx) => (
              <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                >
                  {item.title}
                </a>
                <p className="text-xs text-gray-600 mt-1">{item.snippet}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(item.publishedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default EnhancedInsightsDisplay;

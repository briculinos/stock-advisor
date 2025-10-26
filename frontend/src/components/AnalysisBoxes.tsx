import React from 'react';

interface AnalysisData {
  technical: {
    score: number;
    rsi: number;
    macd: any;
    momentum: number;
    trend: string;
    supportResistance?: {
      support: number[];
      resistance: number[];
      pivotPoint?: number;
    };
    explanation: string;
  };
  fundamental: {
    score: number;
    currentWave: string;
    elliottRecommendation: string;
    explanation: string;
  };
  sentiment: {
    score: number;
    polarity: string;
    hypeLevel: string;
    keyTopics: string[];
    explanation: string;
  };
  macro: {
    score: number;
    regime: string;
    vixLevel: number;
    explanation: string;
  };
}

interface Props {
  data: AnalysisData;
}

function AnalysisBoxes({ data }: Props) {
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
    <div className="space-y-4">
      {/* Technical Analysis */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-900">Technical Analysis</h3>
          <div className={`px-3 py-1 rounded-full font-bold ${getScoreBgColor(data.technical.score)}`}>
            <span className={getScoreColor(data.technical.score)}>{data.technical.score.toFixed(0)}/100</span>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">RSI (14):</span>
            <span className="font-semibold">{data.technical.rsi.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">MACD:</span>
            <span className="font-semibold">{data.technical.macd.macd.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Histogram:</span>
            <span className={`font-semibold ${data.technical.macd.histogram > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.technical.macd.histogram.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Momentum:</span>
            <span className={`font-semibold ${data.technical.momentum > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.technical.momentum.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Trend:</span>
            <span className="font-semibold capitalize">{data.technical.trend}</span>
          </div>
        </div>

        {/* Support and Resistance Levels */}
        {data.technical.supportResistance && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="space-y-2 text-sm">
              {data.technical.supportResistance.pivotPoint && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Pivot Point:</span>
                  <span className="font-semibold text-blue-600">{data.technical.supportResistance.pivotPoint.toFixed(2)}</span>
                </div>
              )}
              {data.technical.supportResistance.support.length > 0 && (
                <div>
                  <p className="text-gray-600 mb-1">Support Levels:</p>
                  <div className="flex flex-wrap gap-1">
                    {data.technical.supportResistance.support.map((level, idx) => (
                      <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                        {level.toFixed(2)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {data.technical.supportResistance.resistance.length > 0 && (
                <div>
                  <p className="text-gray-600 mb-1">Resistance Levels:</p>
                  <div className="flex flex-wrap gap-1">
                    {data.technical.supportResistance.resistance.map((level, idx) => (
                      <span key={idx} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                        {level.toFixed(2)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-gray-700 italic">
          {data.technical.explanation}
        </div>
      </div>

      {/* Fundamental Analysis */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-900">Fundamental Analysis</h3>
          <div className={`px-3 py-1 rounded-full font-bold ${getScoreBgColor(data.fundamental.score)}`}>
            <span className={getScoreColor(data.fundamental.score)}>{data.fundamental.score.toFixed(0)}/100</span>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Elliott Wave:</span>
            <span className="font-semibold">{data.fundamental.currentWave}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Wave Signal:</span>
            <span className={`font-semibold ${
              data.fundamental.elliottRecommendation === 'BUY' ? 'text-green-600' :
              data.fundamental.elliottRecommendation === 'SELL' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {data.fundamental.elliottRecommendation}
            </span>
          </div>
        </div>
        <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-gray-700 italic">
          {data.fundamental.explanation}
        </div>
      </div>

      {/* Sentiment Analysis */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-900">Sentiment Analysis</h3>
          <div className={`px-3 py-1 rounded-full font-bold ${getScoreBgColor(data.sentiment.score)}`}>
            <span className={getScoreColor(data.sentiment.score)}>{data.sentiment.score.toFixed(0)}/100</span>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Polarity:</span>
            <span className={`font-semibold capitalize ${
              data.sentiment.polarity === 'positive' ? 'text-green-600' :
              data.sentiment.polarity === 'negative' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {data.sentiment.polarity}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Hype Level:</span>
            <span className="font-semibold capitalize">{data.sentiment.hypeLevel}</span>
          </div>
          {data.sentiment.keyTopics.length > 0 && (
            <div>
              <p className="text-gray-600 mb-1">Key Topics:</p>
              <div className="flex flex-wrap gap-1">
                {data.sentiment.keyTopics.map((topic, idx) => (
                  <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-gray-700 italic">
          {data.sentiment.explanation}
        </div>
      </div>

      {/* Macro Analysis */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-900">Macro Analysis</h3>
          <div className={`px-3 py-1 rounded-full font-bold ${getScoreBgColor(data.macro.score)}`}>
            <span className={getScoreColor(data.macro.score)}>{data.macro.score.toFixed(0)}/100</span>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Market Regime:</span>
            <span className="font-semibold capitalize">{data.macro.regime}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">VIX Level:</span>
            <span className="font-semibold">{data.macro.vixLevel.toFixed(2)}</span>
          </div>
        </div>
        <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-gray-700 italic">
          {data.macro.explanation}
        </div>
      </div>
    </div>
  );
}

export default AnalysisBoxes;

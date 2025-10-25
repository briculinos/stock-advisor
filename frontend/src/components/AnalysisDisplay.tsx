import React from 'react';
import { StockAnalysis, StockResearchData } from '../types';
import StockChart from './StockChart';

interface AnalysisDisplayProps {
  research: StockResearchData;
  analysis: StockAnalysis;
  onAddToPortfolio: () => void;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({
  research,
  analysis,
  onAddToPortfolio,
}) => {
  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'BUY':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'SELL':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    const currencySymbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CAD': 'C$',
      'AUD': 'A$',
    };

    // Use symbol if available, otherwise use currency code
    if (currencySymbols[currency]) {
      return `${currencySymbols[currency]}${amount.toFixed(2)}`;
    } else {
      return `${amount.toFixed(2)} ${currency}`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">{analysis.symbol}</h2>
            <p className="text-gray-600">{analysis.companyName}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(analysis.currentPrice, analysis.currency)}
            </p>
          </div>
        </div>
      </div>

      {/* Stock Chart */}
      <StockChart symbol={analysis.symbol} currency={analysis.currency} />

      {/* Recommendation */}
      <div className={`border-2 rounded-lg p-4 ${getRecommendationColor(analysis.recommendation)}`}>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium">AI Recommendation</p>
            <p className="text-2xl font-bold">{analysis.recommendation}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">Confidence</p>
            <p className="text-2xl font-bold">{analysis.confidence}%</p>
          </div>
        </div>
        {analysis.targetPrice && (
          <p className="mt-2 text-sm">
            Target Price: {formatCurrency(analysis.targetPrice, analysis.currency)} (
            {((analysis.targetPrice / analysis.currentPrice - 1) * 100).toFixed(1)}% upside)
          </p>
        )}
      </div>

      {/* Key Points */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Key Points</h3>
        <ul className="space-y-2">
          {analysis.keyPoints.map((point, index) => (
            <li key={index} className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span className="text-gray-700">{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Opportunities */}
      {analysis.opportunities.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Opportunities</h3>
          <ul className="space-y-2">
            {analysis.opportunities.map((opp, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-500 mr-2">↑</span>
                <span className="text-gray-700">{opp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risks */}
      {analysis.risks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Risks</h3>
          <ul className="space-y-2">
            {analysis.risks.map((risk, index) => (
              <li key={index} className="flex items-start">
                <span className="text-red-500 mr-2">⚠</span>
                <span className="text-gray-700">{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Analysis Summary */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Analysis</h3>
        <p className="text-gray-700 whitespace-pre-line">{analysis.analysis}</p>
      </div>

      {/* Earnings */}
      {research.earnings && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Recent Earnings</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">Quarter</p>
              <p className="font-semibold">{research.earnings.quarter}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">EPS</p>
              <p className="font-semibold">${research.earnings.eps}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Revenue</p>
              <p className="font-semibold">{research.earnings.revenue}</p>
            </div>
          </div>
        </div>
      )}

      {/* News */}
      {research.news.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Recent News</h3>
          <div className="space-y-3">
            {research.news.map((item, index) => (
              <a
                key={index}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
              >
                <p className="font-medium text-gray-900">{item.title}</p>
                <p className="text-sm text-gray-600 mt-1">{item.snippet}</p>
                <p className="text-xs text-gray-500 mt-1">{item.source}</p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="border-t pt-4">
        <button
          onClick={onAddToPortfolio}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
        >
          Add to Portfolio
        </button>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Analysis by {analysis.analyst} • {new Date(analysis.timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default AnalysisDisplay;

import React from 'react';

interface MoonshotCardProps {
  symbol: string;
  companyName: string;
  industry: string;
  currentPrice: number;
  currency: string;
  moonshotScore: number;
  keyReason: string;
  riskLevel: 'very-high' | 'high' | 'medium';
  isSelected: boolean;
  onClick: () => void;
}

const MoonshotCard: React.FC<MoonshotCardProps> = ({
  symbol,
  companyName,
  industry,
  currentPrice,
  currency,
  moonshotScore,
  keyReason,
  riskLevel,
  isSelected,
  onClick
}) => {
  const getRiskColor = () => {
    switch (riskLevel) {
      case 'very-high': return 'bg-red-100 text-red-700 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    return 'text-gray-600';
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-md p-4 hover:shadow-xl transition-all cursor-pointer border-2 ${
        isSelected ? 'border-purple-600' : 'border-transparent'
      }`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900">{symbol}</h3>
          <p className="text-sm text-gray-600">{companyName}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">
            {currentPrice.toFixed(2)} {currency}
          </p>
        </div>
      </div>

      {/* Moonshot Score */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600">Moonshot Score</span>
          <span className={`text-lg font-bold ${getScoreColor(moonshotScore)}`}>
            {moonshotScore.toFixed(0)}/100
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
            style={{ width: `${moonshotScore}%` }}
          ></div>
        </div>
      </div>

      {/* Industry */}
      <div className="mb-3">
        <p className="text-xs text-gray-700">
          {industry}
        </p>
      </div>

      {/* Risk Level Badge */}
      <div className="flex justify-end">
        <span className={`px-2 py-1 rounded text-xs font-semibold border ${getRiskColor()}`}>
          {riskLevel.toUpperCase().replace('-', ' ')} RISK
        </span>
      </div>
    </div>
  );
};

export default MoonshotCard;

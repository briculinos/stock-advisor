import React from 'react';

interface MoonshotScoreBreakdownProps {
  moonshotScore: {
    totalScore: number;
    grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
    category: string;
    riskLevel: string;
    components: {
      rumorsAndPolitics: {
        score: number;
        weight: number;
        details: string[];
      };
      newsImpact: {
        score: number;
        weight: number;
        details: string[];
      };
      socialSentiment: {
        score: number;
        weight: number;
        details: string[];
      };
      insiderActivity: {
        score: number;
        weight: number;
        details: string[];
      };
    };
    strengths: string[];
    weaknesses: string[];
    recommendation: string;
  };
}

const MoonshotScoreBreakdown: React.FC<MoonshotScoreBreakdownProps> = ({ moonshotScore }) => {
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'S': return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
      case 'A': return 'bg-gradient-to-r from-green-400 to-green-600 text-white';
      case 'B': return 'bg-gradient-to-r from-blue-400 to-blue-600 text-white';
      case 'C': return 'bg-gradient-to-r from-gray-400 to-gray-600 text-white';
      case 'D': return 'bg-gradient-to-r from-orange-400 to-orange-600 text-white';
      case 'F': return 'bg-gradient-to-r from-red-400 to-red-600 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Very High': return 'text-red-600 font-bold';
      case 'High': return 'text-orange-600 font-bold';
      case 'Medium': return 'text-yellow-600 font-bold';
      case 'Low': return 'text-green-600 font-bold';
      default: return 'text-gray-600';
    }
  };

  const getScoreBarColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 75) return 'bg-green-500';
    if (percentage >= 50) return 'bg-blue-500';
    if (percentage >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const ComponentBar: React.FC<{
    title: string;
    score: number;
    maxScore: number;
    weight: number;
    details: string[];
    icon: string;
  }> = ({ title, score, maxScore, weight, details, icon }) => (
    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <div>
            <h4 className="font-semibold text-gray-900">{title}</h4>
            <p className="text-xs text-gray-500">{(weight * 100).toFixed(0)}% weight</p>
          </div>
        </div>
        <span className="text-lg font-bold text-gray-700">
          {score}/{maxScore}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
        <div
          className={`${getScoreBarColor(score, maxScore)} h-3 rounded-full transition-all`}
          style={{ width: `${Math.min((score / maxScore) * 100, 100)}%` }}
        ></div>
      </div>

      {/* Details */}
      {details.length > 0 && (
        <div className="mt-2 space-y-1">
          {details.map((detail, idx) => (
            <p key={idx} className="text-xs text-gray-600 pl-4">
              • {detail}
            </p>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Moonshot Analysis</h2>
        <div className={`px-6 py-3 rounded-full ${getGradeColor(moonshotScore.grade)}`}>
          <span className="text-3xl font-bold">Grade {moonshotScore.grade}</span>
        </div>
      </div>

      {/* Total Score */}
      <div className="mb-6 p-6 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Total Moonshot Score</h3>
            <p className="text-sm text-gray-600">{moonshotScore.category}</p>
            <p className={`text-sm ${getRiskColor(moonshotScore.riskLevel)}`}>
              Risk Level: {moonshotScore.riskLevel}
            </p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold text-purple-600">
              {moonshotScore.totalScore}
              <span className="text-2xl text-gray-500">/100</span>
            </div>
          </div>
        </div>

        {/* Main Progress Bar */}
        <div className="w-full bg-white rounded-full h-4 mt-4">
          <div
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-4 rounded-full transition-all"
            style={{ width: `${moonshotScore.totalScore}%` }}
          ></div>
        </div>
      </div>

      {/* Component Scores */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Score Components</h3>

        <ComponentBar
          title="Rumors + Politics + Tariffs"
          score={moonshotScore.components.rumorsAndPolitics.score}
          maxScore={50}
          weight={moonshotScore.components.rumorsAndPolitics.weight}
          details={moonshotScore.components.rumorsAndPolitics.details}
          icon="🏛️"
        />

        <ComponentBar
          title="News Impact"
          score={moonshotScore.components.newsImpact.score}
          maxScore={25}
          weight={moonshotScore.components.newsImpact.weight}
          details={moonshotScore.components.newsImpact.details}
          icon="📰"
        />

        <ComponentBar
          title="Social Sentiment"
          score={moonshotScore.components.socialSentiment.score}
          maxScore={15}
          weight={moonshotScore.components.socialSentiment.weight}
          details={moonshotScore.components.socialSentiment.details}
          icon="🚀"
        />

        <ComponentBar
          title="Insider Activity"
          score={moonshotScore.components.insiderActivity.score}
          maxScore={10}
          weight={moonshotScore.components.insiderActivity.weight}
          details={moonshotScore.components.insiderActivity.details}
          icon="👔"
        />
      </div>

      {/* Strengths */}
      {moonshotScore.strengths.length > 0 && (
        <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
            <span>✅</span> Strengths
          </h4>
          <ul className="space-y-1">
            {moonshotScore.strengths.map((strength, idx) => (
              <li key={idx} className="text-sm text-green-800 pl-4">
                • {strength}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weaknesses */}
      {moonshotScore.weaknesses.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
          <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
            <span>⚠️</span> Weaknesses
          </h4>
          <ul className="space-y-1">
            {moonshotScore.weaknesses.map((weakness, idx) => (
              <li key={idx} className="text-sm text-red-800 pl-4">
                • {weakness}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendation */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <span>💡</span> Recommendation
        </h4>
        <p className="text-sm text-blue-800">{moonshotScore.recommendation}</p>
      </div>
    </div>
  );
};

export default MoonshotScoreBreakdown;

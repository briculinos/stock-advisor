import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MoonshotCard from '../components/MoonshotCard';
import { getMoonshotCandidates } from '../services/api';

interface NewsSignal {
  title: string;
  url: string;
  snippet: string;
  publishedAt: string;
}

interface MoonshotCandidate {
  symbol: string;
  companyName: string;
  industry: string;
  currentPrice: number;
  currency: string;
  moonshotScore: number;
  rumorsPoliticsTariffsScore: number;
  technicalScore: number;
  newsScore: number;
  keyReason: string;
  rumorSignals: NewsSignal[];
  politicalFactors: NewsSignal[];
  tariffImpacts: NewsSignal[];
  technicalSignals: string[];
  newsHighlights: NewsSignal[];
  riskLevel: 'very-high' | 'high' | 'medium';
  volatility: number;
  recentNews: any[];
}

interface ChartData {
  date: string;
  price: number;
}

function Moonshots() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<MoonshotCandidate[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load cached moonshots on mount
  useEffect(() => {
    const cachedMoonshots = sessionStorage.getItem('moonshotCandidates');
    if (cachedMoonshots) {
      try {
        const parsed = JSON.parse(cachedMoonshots);
        setCandidates(parsed);
        setHasLoaded(true);
      } catch (err) {
        console.error('Error parsing cached moonshots:', err);
        sessionStorage.removeItem('moonshotCandidates');
      }
    }
  }, []);

  useEffect(() => {
    if (selectedCandidate) {
      loadChartData(selectedCandidate.symbol);
    }
  }, [selectedIndex, candidates]);

  const loadChartData = async (symbol: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/stock/history/${symbol}?period=1mo`);
      const data = await response.json();
      setChartData(data);
    } catch (err) {
      console.error('Error loading chart data:', err);
      setChartData([]);
    }
  };

  const loadMoonshots = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getMoonshotCandidates();
      setCandidates(data);
      setHasLoaded(true);
      // Cache moonshots in sessionStorage
      sessionStorage.setItem('moonshotCandidates', JSON.stringify(data));
    } catch (err) {
      console.error('Error loading moonshots:', err);
      setError('Failed to load moonshot candidates. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleStockClick = (symbol: string, companyName: string) => {
    navigate('/insights', { state: { symbol, companyName, autoGenerate: true } });
  };

  const selectedCandidate = candidates[selectedIndex];

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInHours < 24) {
      if (diffInHours === 0) return 'Just now';
      if (diffInHours === 1) return '1 hour ago';
      return `${diffInHours} hours ago`;
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays <= 3) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const generateMoonshotVerdict = (candidate: MoonshotCandidate): string => {
    const parts: string[] = [];

    // Overall assessment
    parts.push(`${candidate.symbol} qualifies as a moonshot opportunity with an overall score of ${candidate.moonshotScore.toFixed(0)}/100, indicating ${candidate.moonshotScore >= 70 ? 'strong' : candidate.moonshotScore >= 50 ? 'moderate' : 'emerging'} potential for significant short-term price movement.`);

    // Analyze rumors/politics/tariffs component (50% weight)
    if (candidate.rumorsPoliticsTariffsScore >= 60) {
      const catalysts: string[] = [];
      if (candidate.rumorSignals.length > 0) catalysts.push('market rumors and speculation');
      if (candidate.politicalFactors.length > 0) catalysts.push('political/regulatory developments');
      if (candidate.tariffImpacts.length > 0) catalysts.push('tariff and trade policy changes');

      if (catalysts.length > 0) {
        parts.push(`The primary catalyst driving this opportunity comes from ${catalysts.join(', ')}, which collectively scored ${candidate.rumorsPoliticsTariffsScore.toFixed(0)}/100 and represents 50% of the overall moonshot rating.`);
      }
    }

    // Technical analysis component (25% weight)
    if (candidate.technicalScore >= 50 && candidate.technicalSignals.length > 0) {
      parts.push(`Technical analysis supports this thesis with a score of ${candidate.technicalScore.toFixed(0)}/100, showing ${candidate.technicalSignals.length} bullish signal${candidate.technicalSignals.length > 1 ? 's' : ''} that suggest favorable entry timing.`);
    } else if (candidate.technicalScore < 50) {
      parts.push(`Technical indicators show a score of ${candidate.technicalScore.toFixed(0)}/100, suggesting caution on entry timing despite strong fundamental catalysts.`);
    }

    // News impact component (25% weight)
    if (candidate.newsScore >= 50 && candidate.newsHighlights.length > 0) {
      parts.push(`Recent news coverage scored ${candidate.newsScore.toFixed(0)}/100, with ${candidate.newsHighlights.length} high-impact headline${candidate.newsHighlights.length > 1 ? 's' : ''} creating market attention and potential momentum.`);
    }

    // Risk assessment
    const riskDescription = candidate.riskLevel === 'very-high' ? 'very high' : candidate.riskLevel === 'high' ? 'high' : 'moderate';
    parts.push(`This opportunity carries ${riskDescription} risk with ${candidate.volatility.toFixed(1)}% annualized volatility, making it suitable only for investors with high risk tolerance and short-term trading horizons.`);

    return parts.join(' ');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-gray-900">
              Moonshots
              <span className="text-purple-600">.</span>
            </h1>
            <button
              onClick={loadMoonshots}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-semibold text-sm"
            >
              Refresh Moonshots
            </button>
          </div>
          <p className="text-gray-600">
            AI-powered high-risk, high-reward investment opportunities based on rumors, politics, tariffs & technical analysis
          </p>
        </div>

        {loading && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Analyzing market for moonshot opportunities...</p>
            <p className="text-gray-500 text-sm mt-2">Searching rumors, politics, tariffs & technical signals...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-6 text-center">
            <p className="text-red-700 font-semibold">{error}</p>
            <button
              onClick={loadMoonshots}
              className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && candidates.length === 0 && !hasLoaded && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg font-semibold mb-2">Ready to find moonshot opportunities?</p>
            <p className="text-gray-500 text-sm mb-6">Click "Refresh Moonshots" to analyze the market for high-risk, high-reward investment opportunities.</p>
            <button
              onClick={loadMoonshots}
              className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              Find Moonshots
            </button>
          </div>
        )}

        {!loading && !error && candidates.length === 0 && hasLoaded && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">No moonshot candidates found at this time.</p>
            <p className="text-gray-500 text-sm mt-2">Try refreshing later for new opportunities.</p>
          </div>
        )}

        {!loading && !error && candidates.length > 0 && (
          <div className="grid grid-cols-12 gap-6">
            {/* Left Side - Moonshot Cards */}
            <div className="col-span-12 md:col-span-4 space-y-4">
              {candidates.map((candidate, index) => (
                <MoonshotCard
                  key={candidate.symbol}
                  symbol={candidate.symbol}
                  companyName={candidate.companyName}
                  industry={candidate.industry}
                  currentPrice={candidate.currentPrice}
                  currency={candidate.currency}
                  moonshotScore={candidate.moonshotScore}
                  keyReason={candidate.keyReason}
                  riskLevel={candidate.riskLevel}
                  isSelected={selectedIndex === index}
                  onClick={() => handleStockClick(candidate.symbol, candidate.companyName)}
                />
              ))}
            </div>

            {/* Right Side - Detailed Argumentation */}
            {selectedCandidate && (
              <div className="col-span-12 md:col-span-8">
                <div className="bg-white rounded-lg shadow-md p-6">
                  {/* Header */}
                  <div className="mb-6 pb-4 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">
                      {selectedCandidate.symbol} - {selectedCandidate.companyName}
                    </h2>
                    <div className="flex items-center gap-4">
                      <span className="text-3xl font-bold text-purple-600">
                        {selectedCandidate.currentPrice.toFixed(2)}
                      </span>
                      <span className="text-sm text-gray-600">
                        Volatility: {selectedCandidate.volatility.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* 30-Day Price Chart */}
                  {chartData.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Last 30 Days</h3>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex">
                        <div className="flex flex-col justify-between text-xs text-gray-600 mr-2 py-2">
                          {(() => {
                            const prices = chartData.map(d => d.price);
                            const maxPrice = Math.max(...prices);
                            const minPrice = Math.min(...prices);
                            const midPrice = (maxPrice + minPrice) / 2;

                            return (
                              <>
                                <div>{maxPrice.toFixed(2)}</div>
                                <div>{midPrice.toFixed(2)}</div>
                                <div>{minPrice.toFixed(2)}</div>
                              </>
                            );
                          })()}
                        </div>
                        <svg width="100%" height="200" viewBox="0 0 800 200" preserveAspectRatio="none">
                          {(() => {
                            const prices = chartData.map(d => d.price);
                            const maxPrice = Math.max(...prices);
                            const minPrice = Math.min(...prices);
                            const priceRange = maxPrice - minPrice;
                            const padding = 10;

                            const points = chartData.map((d, i) => {
                              const x = (i / (chartData.length - 1)) * (800 - 2 * padding) + padding;
                              const y = 200 - padding - ((d.price - minPrice) / priceRange) * (200 - 2 * padding);
                              return `${x},${y}`;
                            }).join(' ');

                            return (
                              <>
                                <polyline
                                  points={points}
                                  fill="none"
                                  stroke="#9333ea"
                                  strokeWidth="2"
                                />
                                <polyline
                                  points={points}
                                  fill="url(#gradient)"
                                  opacity="0.3"
                                />
                                <defs>
                                  <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#9333ea" stopOpacity="0.5" />
                                    <stop offset="100%" stopColor="#9333ea" stopOpacity="0" />
                                  </linearGradient>
                                </defs>
                              </>
                            );
                          })()}
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Moonshot Verdict */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Why This is a Moonshot</h3>
                    <div className="text-black bg-gray-50 p-4 rounded-lg border border-gray-200 leading-relaxed">
                      {generateMoonshotVerdict(selectedCandidate)}
                    </div>
                  </div>

                  {/* Score Breakdown */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Score Breakdown</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Rumors + Politics + Tariffs</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {selectedCandidate.rumorsPoliticsTariffsScore.toFixed(0)}
                        </p>
                        <p className="text-xs text-gray-500">50% weight</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Technical Analysis</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {selectedCandidate.technicalScore.toFixed(0)}
                        </p>
                        <p className="text-xs text-gray-500">25% weight</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">News Impact</p>
                        <p className="text-2xl font-bold text-green-600">
                          {selectedCandidate.newsScore.toFixed(0)}
                        </p>
                        <p className="text-xs text-gray-500">25% weight</p>
                      </div>
                    </div>
                  </div>

                  {/* Rumors */}
                  {selectedCandidate.rumorSignals.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Rumors About {selectedCandidate.symbol}
                      </h3>
                      <p className="text-xs text-gray-600 mb-3">
                        Unconfirmed market speculation that could drive rapid price movements
                      </p>
                      <div className="space-y-3">
                        {selectedCandidate.rumorSignals.slice(0, 2).map((signal, idx) => (
                          <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              {signal.url ? (
                                <a
                                  href={signal.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block"
                                  onClick={(e) => {
                                    console.log('Clicking URL:', signal.url);
                                    if (!signal.url || signal.url === '') {
                                      e.preventDefault();
                                      alert('No URL available for this source');
                                    }
                                  }}
                                >
                                  <span className="text-xs font-semibold text-purple-600 hover:underline cursor-pointer">
                                    SOURCE {idx + 1} - Click to read full article
                                  </span>
                                </a>
                              ) : (
                                <span className="inline-block text-xs font-semibold text-gray-400">
                                  SOURCE {idx + 1} - No URL available
                                </span>
                              )}
                              <span className="text-xs text-gray-500">{formatDate(signal.publishedAt)}</span>
                            </div>
                            <h4 className="text-sm font-semibold text-black mb-2">
                              {signal.title}
                            </h4>
                            <p className="text-xs text-gray-700 leading-relaxed">{signal.snippet}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Political Factors */}
                  {selectedCandidate.politicalFactors.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Political & Regulatory News
                      </h3>
                      <p className="text-xs text-gray-600 mb-3">
                        Government actions and regulatory decisions affecting {selectedCandidate.symbol}
                      </p>
                      <div className="space-y-3">
                        {selectedCandidate.politicalFactors.slice(0, 2).map((signal, idx) => (
                          <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              {signal.url ? (
                                <a
                                  href={signal.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block"
                                  onClick={(e) => {
                                    console.log('Clicking URL:', signal.url);
                                    if (!signal.url || signal.url === '') {
                                      e.preventDefault();
                                      alert('No URL available for this source');
                                    }
                                  }}
                                >
                                  <span className="text-xs font-semibold text-purple-600 hover:underline cursor-pointer">
                                    SOURCE {idx + 1} - Click to read full article
                                  </span>
                                </a>
                              ) : (
                                <span className="inline-block text-xs font-semibold text-gray-400">
                                  SOURCE {idx + 1} - No URL available
                                </span>
                              )}
                              <span className="text-xs text-gray-500">{formatDate(signal.publishedAt)}</span>
                            </div>
                            <h4 className="text-sm font-semibold text-black mb-2">
                              {signal.title}
                            </h4>
                            <p className="text-xs text-gray-700 leading-relaxed">{signal.snippet}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tariff Impacts */}
                  {selectedCandidate.tariffImpacts.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Tariff & Trade Policy News
                      </h3>
                      <p className="text-xs text-gray-600 mb-3">
                        Trade policy developments and tariff impacts affecting {selectedCandidate.symbol}
                      </p>
                      <div className="space-y-3">
                        {selectedCandidate.tariffImpacts.slice(0, 2).map((signal, idx) => (
                          <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              {signal.url ? (
                                <a
                                  href={signal.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block"
                                  onClick={(e) => {
                                    console.log('Clicking URL:', signal.url);
                                    if (!signal.url || signal.url === '') {
                                      e.preventDefault();
                                      alert('No URL available for this source');
                                    }
                                  }}
                                >
                                  <span className="text-xs font-semibold text-purple-600 hover:underline cursor-pointer">
                                    SOURCE {idx + 1} - Click to read full article
                                  </span>
                                </a>
                              ) : (
                                <span className="inline-block text-xs font-semibold text-gray-400">
                                  SOURCE {idx + 1} - No URL available
                                </span>
                              )}
                              <span className="text-xs text-gray-500">{formatDate(signal.publishedAt)}</span>
                            </div>
                            <h4 className="text-sm font-semibold text-black mb-2">
                              {signal.title}
                            </h4>
                            <p className="text-xs text-gray-700 leading-relaxed">{signal.snippet}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Technical Signals */}
                  {selectedCandidate.technicalSignals.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Technical Analysis
                      </h3>
                      <p className="text-xs text-gray-600 mb-3">
                        Technical indicators and momentum signals for {selectedCandidate.symbol}
                      </p>
                      <ul className="space-y-2">
                        {selectedCandidate.technicalSignals.map((signal, idx) => (
                          <li key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <p className="text-sm text-black">{signal}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* News Highlights */}
                  {selectedCandidate.newsHighlights.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Recent News About {selectedCandidate.symbol}
                      </h3>
                      <p className="text-xs text-gray-600 mb-3">
                        High-impact news driving market attention and momentum
                      </p>
                      <div className="space-y-3">
                        {selectedCandidate.newsHighlights.slice(0, 2).map((signal, idx) => (
                          <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              {signal.url ? (
                                <a
                                  href={signal.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block"
                                  onClick={(e) => {
                                    console.log('Clicking URL:', signal.url);
                                    if (!signal.url || signal.url === '') {
                                      e.preventDefault();
                                      alert('No URL available for this source');
                                    }
                                  }}
                                >
                                  <span className="text-xs font-semibold text-purple-600 hover:underline cursor-pointer">
                                    SOURCE {idx + 1} - Click to read full article
                                  </span>
                                </a>
                              ) : (
                                <span className="inline-block text-xs font-semibold text-gray-400">
                                  SOURCE {idx + 1} - No URL available
                                </span>
                              )}
                              <span className="text-xs text-gray-500">{formatDate(signal.publishedAt)}</span>
                            </div>
                            <h4 className="text-sm font-semibold text-black mb-2">
                              {signal.title}
                            </h4>
                            <p className="text-xs text-gray-700 leading-relaxed">{signal.snippet}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warning */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-black font-semibold">High Risk Warning</p>
                    <p className="text-xs text-black mt-1">
                      Moonshots are highly speculative investments based on rumors, news, and volatile conditions.
                      Risk level: <span className="font-bold">{selectedCandidate.riskLevel.toUpperCase().replace('-', ' ')}</span>.
                      Only invest what you can afford to lose. Always do your own research.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default Moonshots;

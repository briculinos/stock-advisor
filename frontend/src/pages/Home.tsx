import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AddStockModal from '../components/AddStockModal';
import OwnedStockCard from '../components/OwnedStockCard';
import FollowedStockCard from '../components/FollowedStockCard';
import { getQuickPrice, getExchangeRateToSEK, searchSymbol, getCachedInsights, syncPortfolio } from '../services/api';

interface Purchase {
  shares: number;
  purchaseDate: string;
  purchasePrice: number;
}

interface OwnedStock {
  symbol: string;
  companyName: string;
  currentPrice: number;
  currency: string;
  purchases: Purchase[];
  isEditing?: boolean;
}

interface FollowedStock {
  symbol: string;
  companyName: string;
  currentPrice: number;
  currency: string;
}

function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [ownedStocks, setOwnedStocks] = useState<OwnedStock[]>(() => {
    const saved = localStorage.getItem('ownedStocks');
    return saved ? JSON.parse(saved) : [];
  });
  const [followedStocks, setFollowedStocks] = useState<FollowedStock[]>(() => {
    const saved = localStorage.getItem('followedStocks');
    return saved ? JSON.parse(saved) : [];
  });
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showOwnedStocks, setShowOwnedStocks] = useState(true);
  const [showFollowedStocks, setShowFollowedStocks] = useState(true);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [isUpdatingNames, setIsUpdatingNames] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cachedInsights, setCachedInsights] = useState<Record<string, { recommendation: 'BUY' | 'HOLD' | 'SELL' | 'AVOID'; confidence: number; compositeScore: number; timestamp: number }>>({});

  const handleStockClick = (symbol: string, companyName: string) => {
    navigate('/insights', { state: { symbol, companyName, autoGenerate: true } });
  };

  const handleDeleteOwnedStock = (symbol: string) => {
    setOwnedStocks(prev => prev.filter(stock => stock.symbol !== symbol));
  };

  const handleDeleteFollowedStock = (symbol: string) => {
    setFollowedStocks(prev => prev.filter(stock => stock.symbol !== symbol));
  };

  const handleRefreshStocks = async () => {
    setIsRefreshing(true);
    try {
      // Refresh owned stocks
      const updatedOwnedStocks = await Promise.all(
        ownedStocks.map(async (stock) => {
          try {
            const { price } = await getQuickPrice(stock.symbol);
            return { ...stock, currentPrice: price };
          } catch (error) {
            console.error(`Error refreshing ${stock.symbol}:`, error);
            return stock; // Keep old data if refresh fails
          }
        })
      );

      // Refresh followed stocks
      const updatedFollowedStocks = await Promise.all(
        followedStocks.map(async (stock) => {
          try {
            const { price } = await getQuickPrice(stock.symbol);
            return { ...stock, currentPrice: price };
          } catch (error) {
            console.error(`Error refreshing ${stock.symbol}:`, error);
            return stock; // Keep old data if refresh fails
          }
        })
      );

      setOwnedStocks(updatedOwnedStocks);
      setFollowedStocks(updatedFollowedStocks);
    } catch (error) {
      console.error('Error refreshing stocks:', error);
      alert('Failed to refresh stock prices');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Save owned stocks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('ownedStocks', JSON.stringify(ownedStocks));
  }, [ownedStocks]);

  // Save followed stocks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('followedStocks', JSON.stringify(followedStocks));
  }, [followedStocks]);

  // Update stocks with incorrect company names (migration for existing stocks)
  useEffect(() => {
    const updateStockNames = async () => {
      setIsUpdatingNames(true);
      let ownedUpdated = false;
      let followedUpdated = false;

      // Update owned stocks
      const updatedOwnedStocks = await Promise.all(
        ownedStocks.map(async (stock) => {
          // Check if company name is just the symbol (needs update)
          if (stock.companyName === stock.symbol || stock.companyName.includes('.')) {
            try {
              const searchResults = await searchSymbol(stock.symbol);
              if (searchResults && searchResults.length > 0) {
                const exactMatch = searchResults.find((r: any) => r.symbol === stock.symbol);
                const newCompanyName = exactMatch ? exactMatch.name : searchResults[0].name;
                ownedUpdated = true;
                return { ...stock, companyName: newCompanyName };
              }
            } catch (error) {
              console.error(`Error fetching company name for ${stock.symbol}:`, error);
            }
          }
          return stock;
        })
      );

      // Update followed stocks
      const updatedFollowedStocks = await Promise.all(
        followedStocks.map(async (stock) => {
          // Check if company name is just the symbol (needs update)
          if (stock.companyName === stock.symbol || stock.companyName.includes('.')) {
            try {
              const searchResults = await searchSymbol(stock.symbol);
              if (searchResults && searchResults.length > 0) {
                const exactMatch = searchResults.find((r: any) => r.symbol === stock.symbol);
                const newCompanyName = exactMatch ? exactMatch.name : searchResults[0].name;
                followedUpdated = true;
                return { ...stock, companyName: newCompanyName };
              }
            } catch (error) {
              console.error(`Error fetching company name for ${stock.symbol}:`, error);
            }
          }
          return stock;
        })
      );

      if (ownedUpdated) {
        setOwnedStocks(updatedOwnedStocks);
      }
      if (followedUpdated) {
        setFollowedStocks(updatedFollowedStocks);
      }

      setIsUpdatingNames(false);
    };

    // Only run once on mount if there are stocks that need updating
    const needsUpdate =
      ownedStocks.some(s => s.companyName === s.symbol || s.companyName.includes('.')) ||
      followedStocks.some(s => s.companyName === s.symbol || s.companyName.includes('.'));

    if (needsUpdate) {
      updateStockNames();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Fetch exchange rates when owned stocks change
  useEffect(() => {
    const fetchExchangeRates = async () => {
      const uniqueCurrencies = Array.from(new Set(ownedStocks.map(stock => stock.currency)));
      const rates: Record<string, number> = {};

      for (const currency of uniqueCurrencies) {
        if (currency === 'SEK') {
          rates[currency] = 1;
        } else {
          try {
            const rate = await getExchangeRateToSEK(currency);
            rates[currency] = rate;
          } catch (error) {
            console.error(`Error fetching exchange rate for ${currency}:`, error);
            rates[currency] = 1; // Fallback
          }
        }
      }

      setExchangeRates(rates);
    };

    if (ownedStocks.length > 0) {
      fetchExchangeRates();
    }
  }, [ownedStocks.map(s => s.currency).join(',')]);

  // Fetch cached insights and sync portfolio to backend
  useEffect(() => {
    const fetchInsightsAndSync = async () => {
      if (ownedStocks.length === 0 && followedStocks.length === 0) {
        return;
      }

      try {
        // Get all unique symbols
        const allSymbols = [
          ...ownedStocks.map(s => s.symbol),
          ...followedStocks.map(s => s.symbol)
        ];
        const uniqueSymbols = Array.from(new Set(allSymbols));

        // Fetch cached insights
        const insights = await getCachedInsights(uniqueSymbols);
        setCachedInsights(insights);

        // Sync portfolio to backend
        await syncPortfolio(
          followedStocks.map(s => ({ symbol: s.symbol, companyName: s.companyName })),
          ownedStocks.map(s => ({ symbol: s.symbol, companyName: s.companyName }))
        );
      } catch (error) {
        console.error('Error fetching insights or syncing portfolio:', error);
      }
    };

    fetchInsightsAndSync();
  }, [ownedStocks.length, followedStocks.length]);

  const handleSearch = async (symbol: string, companyName: string = '', ownershipType: 'own' | 'follow' = 'follow') => {
    setLoading(true);
    try {
      const { price, currency } = await getQuickPrice(symbol.toUpperCase());

      // Try to fetch company name if not provided
      let finalCompanyName = companyName;
      if (!companyName || companyName === symbol) {
        try {
          const searchResults = await searchSymbol(symbol.toUpperCase());
          if (searchResults && searchResults.length > 0) {
            // Find exact symbol match or use first result
            const exactMatch = searchResults.find((r: any) => r.symbol === symbol.toUpperCase());
            finalCompanyName = exactMatch ? exactMatch.name : searchResults[0].name;
          }
        } catch (error) {
          console.error('Error fetching company name:', error);
          // Fallback to symbol if search fails
          finalCompanyName = symbol;
        }
      }

      if (ownershipType === 'own') {
        const newStock: OwnedStock = {
          symbol: symbol.toUpperCase(),
          companyName: finalCompanyName || symbol,
          currentPrice: price,
          currency,
          purchases: [],
          isEditing: true
        };
        setOwnedStocks(prev => [...prev, newStock]);
      } else {
        const newStock: FollowedStock = {
          symbol: symbol.toUpperCase(),
          companyName: finalCompanyName || symbol,
          currentPrice: price,
          currency
        };
        setFollowedStocks(prev => [...prev, newStock]);
      }
    } catch (error) {
      console.error('Error fetching stock price:', error);
      alert('Failed to fetch stock price');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-4 md:py-8">
        {/* Updating company names indicator */}
        {isUpdatingNames && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <p className="text-sm text-blue-800">Updating company names...</p>
          </div>
        )}
        {!loading && ownedStocks.length === 0 && followedStocks.length === 0 && (
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setShowAddStockModal(true)}
              className="bg-blue-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-semibold text-base md:text-lg shadow-lg flex items-center gap-2"
            >
              <span className="text-xl md:text-2xl">+</span> Add Stock
            </button>
          </div>
        )}

        {/* Section Controls */}
        {(ownedStocks.length > 0 || followedStocks.length > 0) && (
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center mb-4 md:mb-6 gap-3">
            <div className="flex gap-2 md:gap-3">
              {ownedStocks.length > 0 && (
                <button
                  onClick={() => setShowOwnedStocks(!showOwnedStocks)}
                  className={`px-4 md:px-6 py-3 rounded-lg font-semibold transition-colors text-sm md:text-base ${
                    showOwnedStocks
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-700 active:bg-gray-300'
                  }`}
                >
                  My Stocks ({ownedStocks.length})
                </button>
              )}
              {followedStocks.length > 0 && (
                <button
                  onClick={() => setShowFollowedStocks(!showFollowedStocks)}
                  className={`px-4 md:px-6 py-3 rounded-lg font-semibold transition-colors text-sm md:text-base ${
                    showFollowedStocks
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-700 active:bg-gray-300'
                  }`}
                >
                  Followed ({followedStocks.length})
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRefreshStocks}
                disabled={isRefreshing}
                className="bg-blue-600 text-white px-4 md:px-6 py-3 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-semibold text-sm md:text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRefreshing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <span className="text-lg md:text-xl">↻</span> Refresh
                  </>
                )}
              </button>
              <button
                onClick={() => setShowAddStockModal(true)}
                className="bg-blue-600 text-white px-4 md:px-6 py-3 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-semibold text-sm md:text-base flex items-center justify-center gap-2"
              >
                <span className="text-lg md:text-xl">+</span> Add Stock
              </button>
            </div>
          </div>
        )}

        {/* Owned Stocks Section */}
        {ownedStocks.length > 0 && showOwnedStocks && (
          <div className="mb-8">

            {/* Portfolio Total - Single Line */}
            {(() => {
              const portfolioTotal = ownedStocks.reduce((total, stock) => {
                const totalShares = stock.purchases.reduce((sum, p) => sum + p.shares, 0);
                const currentValue = totalShares * stock.currentPrice;
                const exchangeRate = exchangeRates[stock.currency] || 1;
                return total + (currentValue * exchangeRate);
              }, 0);

              const portfolioInvested = ownedStocks.reduce((total, stock) => {
                const totalInvested = stock.purchases.reduce((sum, p) => sum + (p.shares * p.purchasePrice), 0);
                const exchangeRate = exchangeRates[stock.currency] || 1;
                return total + (totalInvested * exchangeRate);
              }, 0);

              const portfolioProfitLoss = portfolioTotal - portfolioInvested;
              const portfolioProfitLossPercent = portfolioInvested > 0 ? (portfolioProfitLoss / portfolioInvested) * 100 : 0;

              return (
                <div className="bg-white rounded-lg shadow-md p-5 mb-6 flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-500">Portfolio Total: </span>
                    <span className="text-3xl font-bold text-gray-900">{portfolioTotal.toFixed(2)} SEK</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-sm text-gray-500">Invested: </span>
                      <span className="text-lg font-semibold text-gray-700">{portfolioInvested.toFixed(2)} SEK</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">P/L: </span>
                      <span className={`text-lg font-bold ${portfolioProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {portfolioProfitLoss >= 0 ? '+' : ''}{Math.abs(portfolioProfitLoss).toFixed(2)} SEK
                      </span>
                      <span className={`ml-2 text-xl font-bold ${portfolioProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ({portfolioProfitLoss >= 0 ? '+' : ''}{portfolioProfitLossPercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ownedStocks.map((stock) => (
                <OwnedStockCard
                  key={stock.symbol}
                  symbol={stock.symbol}
                  companyName={stock.companyName}
                  currentPrice={stock.currentPrice}
                  currency={stock.currency}
                  exchangeRateToSEK={exchangeRates[stock.currency] || 1}
                  initialPurchases={stock.purchases}
                  isEditing={stock.isEditing}
                  onSave={(purchases) => {
                    setOwnedStocks(prev => prev.map((s) =>
                      s.symbol === stock.symbol ? { ...s, purchases, isEditing: false } : s
                    ));
                  }}
                  onClick={() => handleStockClick(stock.symbol, stock.companyName)}
                  onDelete={() => handleDeleteOwnedStock(stock.symbol)}
                  recommendation={cachedInsights[stock.symbol]?.recommendation}
                />
              ))}
            </div>
          </div>
        )}

        {/* Followed Stocks Section */}
        {followedStocks.length > 0 && showFollowedStocks && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Followed Stocks</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {followedStocks.map((stock) => (
                <FollowedStockCard
                  key={stock.symbol}
                  symbol={stock.symbol}
                  companyName={stock.companyName}
                  currentPrice={stock.currentPrice}
                  currency={stock.currency}
                  onClick={() => handleStockClick(stock.symbol, stock.companyName)}
                  onDelete={() => handleDeleteFollowedStock(stock.symbol)}
                  recommendation={cachedInsights[stock.symbol]?.recommendation}
                />
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center max-w-2xl mx-auto">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Loading stock data...</p>
          </div>
        )}
      </main>

      {/* Add Stock Modal */}
      {showAddStockModal && (
        <AddStockModal
          onSearch={handleSearch}
          onClose={() => setShowAddStockModal(false)}
        />
      )}
    </div>
  );
}

export default Home;

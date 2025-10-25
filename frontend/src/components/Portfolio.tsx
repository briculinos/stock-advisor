import React, { useEffect, useState } from 'react';
import { PortfolioItem } from '../types';
import { getPortfolio, removeFromPortfolio, getQuickPrices } from '../services/api';

interface PortfolioProps {
  onStockClick?: (symbol: string) => void;
  refreshTrigger?: number;
}

const Portfolio: React.FC<PortfolioProps> = ({ onStockClick, refreshTrigger }) => {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    // Format with thousands separators
    const formattedAmount = amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    // Always use currency code
    return `${formattedAmount} ${currency}`;
  };

  const formatTimeAgo = (timestamp?: string) => {
    if (!timestamp) return 'Never';

    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const loadPortfolio = async (showLoading: boolean = false) => {
    try {
      if (showLoading) {
        setInitialLoading(true);
      }

      const items = await getPortfolio();

      if (items.length > 0) {
        // Fetch current prices, currencies, and SEK conversions
        const symbols = items.map((item) => item.symbol);
        const priceData = await getQuickPrices(symbols);

        // Calculate values
        const enrichedItems = items.map((item) => {
          const stockData = priceData[item.symbol];
          const currentPrice = stockData?.price || item.purchasePrice;
          const currentPriceInSEK = stockData?.priceInSEK || item.purchasePrice;
          const currency = stockData?.currency || 'USD';
          const lastUpdated = stockData?.lastUpdated;
          const totalValue = currentPrice * item.shares;
          const totalValueInSEK = currentPriceInSEK * item.shares;
          const profitLoss = totalValue - item.purchasePrice * item.shares;
          const profitLossPercent = (profitLoss / (item.purchasePrice * item.shares)) * 100;

          return {
            ...item,
            currentPrice,
            currency,
            totalValue,
            totalValueInSEK,
            profitLoss,
            profitLossPercent,
            lastUpdated,
          };
        });

        setPortfolio(enrichedItems);
      } else {
        setPortfolio([]);
      }
    } catch (error) {
      console.error('Error loading portfolio:', error);
    } finally {
      if (showLoading) {
        setInitialLoading(false);
      }
    }
  };

  useEffect(() => {
    // Initial load with loading state
    loadPortfolio(true);

    // Auto-refresh every 15 minutes (matches backend cache)
    const intervalId = setInterval(() => {
      loadPortfolio(false);
    }, 900000); // 900000ms = 15 minutes

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Refresh when trigger changes (e.g., after adding to portfolio)
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      loadPortfolio(false);
    }
  }, [refreshTrigger]);

  const handleRemove = async (symbol: string) => {
    if (window.confirm(`Remove ${symbol} from portfolio?`)) {
      try {
        await removeFromPortfolio(symbol);
        // Just remove from local state without reloading
        setPortfolio(prev => prev.filter(item => item.symbol !== symbol));
      } catch (error) {
        console.error('Error removing from portfolio:', error);
      }
    }
  };

  // Calculate totals in SEK
  const totalValueSEK = portfolio.reduce((sum, item) => sum + (item.totalValueInSEK || 0), 0);
  const totalInvestedSEK = portfolio.reduce((sum, item) => {
    // We need to convert purchase price to SEK as well
    // For now, we'll approximate using the current exchange rate ratio
    const currentPriceInSEK = item.totalValueInSEK ? item.totalValueInSEK / item.shares : item.purchasePrice;
    const exchangeRate = item.currentPrice ? currentPriceInSEK / item.currentPrice : 1;
    return sum + (item.purchasePrice * item.shares * exchangeRate);
  }, 0);
  const totalProfitLossSEK = totalValueSEK - totalInvestedSEK;
  const totalProfitLossPercentSEK = totalInvestedSEK > 0 ? (totalProfitLossSEK / totalInvestedSEK) * 100 : 0;

  // Detect if portfolio has mixed currencies (for display purposes)
  const currencies = Array.from(new Set(portfolio.map(item => item.currency).filter(Boolean)));
  const hasMixedCurrencies = currencies.length > 1;

  if (initialLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Portfolio</h2>
        <p className="text-gray-600">Loading portfolio...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Portfolio</h2>

      {portfolio.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Your portfolio is empty.</p>
          <p className="text-sm mt-2">Analyze stocks and add them to your portfolio!</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="bg-white rounded-lg p-6 mb-6 border border-gray-200">
            {hasMixedCurrencies && (
              <p className="text-xs text-blue-600 mb-4 text-center">
                💱 Portfolio totals converted to SEK
              </p>
            )}
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-gray-500 mb-2">Value</p>
                <p className="text-sm font-bold text-gray-900">
                  {formatCurrency(totalValueSEK, 'SEK')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">Invested</p>
                <p className="text-sm font-bold text-gray-900">
                  {formatCurrency(totalInvestedSEK, 'SEK')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">P/L</p>
                <p
                  className={`text-sm font-bold ${
                    totalProfitLossSEK > 0 ? 'text-green-600' :
                    totalProfitLossSEK < 0 ? 'text-red-600' :
                    'text-gray-600'
                  }`}
                >
                  {formatCurrency(totalProfitLossSEK, 'SEK')}
                </p>
                <p className={`text-xs mt-1 ${
                    totalProfitLossSEK > 0 ? 'text-green-600' :
                    totalProfitLossSEK < 0 ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                  ({totalProfitLossPercentSEK.toFixed(2)}%)
                </p>
              </div>
            </div>
          </div>

          {/* Holdings */}
          <div className="space-y-4">
            {portfolio.map((item) => (
              <div key={item.symbol} className="border border-gray-200 rounded-lg p-5 hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer bg-white"
                onClick={() => onStockClick && onStockClick(item.symbol)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{item.symbol}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {item.shares} shares @ {formatCurrency(item.purchasePrice, item.currency)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(item.symbol);
                    }}
                    className="px-4 py-2 text-red-600 hover:text-white hover:bg-red-600 border border-red-600 rounded-md text-sm font-medium transition-colors"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Now</p>
                    <p className="text-xs font-semibold text-gray-900">
                      {item.currentPrice ? formatCurrency(item.currentPrice, item.currency) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total</p>
                    <p className="text-xs font-semibold text-gray-900">
                      {item.totalValue ? formatCurrency(item.totalValue, item.currency) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">P/L</p>
                    <p
                      className={`text-xs font-semibold ${
                        (item.profitLoss || 0) > 0 ? 'text-green-600' :
                        (item.profitLoss || 0) < 0 ? 'text-red-600' :
                        'text-gray-600'
                      }`}
                    >
                      {item.profitLoss !== undefined ? formatCurrency(item.profitLoss, item.currency) : 'N/A'}
                    </p>
                    <p
                      className={`text-[10px] mt-0.5 ${
                        (item.profitLossPercent || 0) > 0 ? 'text-green-600' :
                        (item.profitLossPercent || 0) < 0 ? 'text-red-600' :
                        'text-gray-600'
                      }`}
                    >
                      {item.profitLoss === 0 ? '(no change)' : `(${item.profitLossPercent?.toFixed(2) || '0.00'}%)`}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    Purchased {new Date(item.purchaseDate).toLocaleDateString()}
                  </p>
                  {item.lastUpdated && (
                    <p className="text-xs text-blue-500">
                      Updated {formatTimeAgo(item.lastUpdated)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Portfolio;

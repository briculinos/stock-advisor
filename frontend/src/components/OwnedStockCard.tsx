import React, { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

interface Purchase {
  shares: number;
  purchaseDate: string;
  purchasePrice: number;
}

interface ChartData {
  date: string;
  price: number;
}

interface OwnedStockCardProps {
  symbol: string;
  companyName: string;
  currentPrice: number;
  currency: string;
  exchangeRateToSEK?: number;
  initialPurchases?: Purchase[];
  isEditing?: boolean;
  onSave: (purchases: Purchase[]) => void;
  onClick?: () => void;
  onDelete?: () => void;
  recommendation?: 'BUY' | 'HOLD' | 'SELL' | 'AVOID';
}

const OwnedStockCard: React.FC<OwnedStockCardProps> = ({
  symbol,
  companyName,
  currentPrice,
  currency,
  exchangeRateToSEK = 1,
  initialPurchases = [],
  isEditing = true,
  onSave,
  onClick,
  onDelete,
  recommendation
}) => {
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases);
  const [editMode, setEditMode] = useState(isEditing);
  const [showAddForm, setShowAddForm] = useState(false);
  const [shares, setShares] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'1d' | '1wk' | '1mo' | '1y'>('1mo');

  // Get card background color based on recommendation
  const getCardColor = () => {
    if (!recommendation) return 'bg-white';
    switch (recommendation) {
      case 'BUY': return 'bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300';
      case 'SELL': return 'bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300';
      case 'HOLD': return 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300';
      case 'AVOID': return 'bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-400';
      default: return 'bg-white';
    }
  };

  // Fetch chart data when in view mode or period changes
  useEffect(() => {
    if (!editMode) {
      const fetchChartData = async () => {
        try {
          const response = await fetch(`/api/stock/history/${symbol}?period=${selectedPeriod}`);
          const data = await response.json();
          setChartData(data);
        } catch (error) {
          console.error('Error fetching chart data:', error);
        }
      };
      fetchChartData();
    }
  }, [editMode, symbol, selectedPeriod]);

  const handleDateChange = async (date: string) => {
    setPurchaseDate(date);
    if (date) {
      setLoadingPrice(true);
      try {
        // Fetch historical price for this date
        const response = await fetch(`/api/stock/historical-price/${symbol}?date=${date}`);
        const data = await response.json();
        setPurchasePrice(data.price);
      } catch (error) {
        console.error('Error fetching historical price:', error);
        setPurchasePrice(currentPrice); // Fallback to current price
      } finally {
        setLoadingPrice(false);
      }
    }
  };

  const handleAddPurchase = () => {
    if (shares && purchaseDate && purchasePrice !== null) {
      const newPurchase: Purchase = {
        shares: parseFloat(shares),
        purchaseDate,
        purchasePrice
      };
      setPurchases([...purchases, newPurchase]);
      setShares('');
      setPurchaseDate('');
      setPurchasePrice(null);
      setShowAddForm(false);
    }
  };

  const handleSave = () => {
    setEditMode(false);
    onSave(purchases);
  };

  // Calculate totals (in original currency)
  const totalShares = purchases.reduce((sum, p) => sum + p.shares, 0);
  const totalInvested = purchases.reduce((sum, p) => sum + (p.shares * p.purchasePrice), 0);
  const currentValue = totalShares * currentPrice;
  const profitLoss = currentValue - totalInvested;
  const profitLossPercent = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

  // Calculate price range for Y-axis
  const prices = chartData.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  const yAxisMin = minPrice - (priceRange * 0.1); // Add 10% padding
  const yAxisMax = maxPrice + (priceRange * 0.1);

  // Calculate stock price trend percentage (from chart data)
  const stockTrendPercent = chartData.length >= 2
    ? ((chartData[chartData.length - 1].price - chartData[0].price) / chartData[0].price) * 100
    : 0;

  // Period labels
  const periodLabels = {
    '1d': '1 Day',
    '1wk': '1 Week',
    '1mo': '1 Month',
    '1y': '1 Year'
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Only allow click when not in edit mode
    if (!editMode && onClick) {
      onClick();
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && window.confirm(`Delete ${symbol} from your portfolio?`)) {
      onDelete();
    }
  };

  return (
    <div
      className={`${getCardColor()} rounded-lg shadow-md p-4 transition-shadow ${!editMode ? 'hover:shadow-xl cursor-pointer' : ''}`}
      onClick={handleCardClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900">{symbol}</h3>
          <p className="text-sm text-gray-600">{companyName}</p>
        </div>
        <div className="text-right flex items-start gap-2">
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {currentPrice.toFixed(2)} {currency}
            </p>
          </div>
          {onDelete && (
            <button
              onClick={handleDeleteClick}
              className="text-gray-400 hover:text-red-600 transition-colors p-1"
              title="Delete stock"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {editMode ? (
        <>
          {/* Purchase Entries */}
          <div className="space-y-2 mb-3">
            {purchases.length > 0 ? (
              purchases.map((purchase, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded text-sm">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="font-semibold">{purchase.shares} shares @ {purchase.purchasePrice.toFixed(2)} {currency}</div>
                      <div className="text-xs text-gray-500">{new Date(purchase.purchaseDate).toLocaleDateString()}</div>
                    </div>
                    <button
                      onClick={() => {
                        const newPurchases = purchases.filter((_, i) => i !== index);
                        setPurchases(newPurchases);
                      }}
                      className="ml-2 text-red-500 hover:text-red-700 p-1"
                      title="Remove this purchase"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-blue-50 p-3 rounded text-sm text-center text-gray-600">
                No purchases yet. Add your first purchase below.
              </div>
            )}
          </div>

          {/* Add Purchase Form */}
          {showAddForm ? (
        <div className="bg-blue-50 p-3 rounded space-y-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Number of Shares
            </label>
            <input
              type="number"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              placeholder="e.g., 10"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Purchase Price ({currency})
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={purchasePrice ?? ''}
                onChange={(e) => setPurchasePrice(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Enter purchase price"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                disabled={loadingPrice}
              />
              {loadingPrice && (
                <div className="absolute right-2 top-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
            {purchaseDate && purchasePrice !== null && !loadingPrice && (
              <p className="text-xs text-gray-500 mt-1">
                Price automatically loaded for {purchaseDate}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Purchase Date
            </label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddPurchase}
              disabled={!shares || !purchaseDate || purchasePrice === null}
              className="flex-1 bg-green-600 text-white py-2 px-3 rounded-md hover:bg-green-700 disabled:bg-gray-400 text-sm font-semibold"
            >
              Add
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-3 rounded-md hover:bg-gray-400 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full bg-blue-100 text-blue-700 py-2 px-3 rounded-md hover:bg-blue-200 text-sm font-semibold flex items-center justify-center gap-1"
        >
          <span className="text-lg">+</span> Add Purchase
        </button>
      )}

          {/* Summary in Edit Mode */}
          {purchases.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg space-y-2 mt-3">
              <div className="text-xs font-semibold text-gray-700 mb-2">Summary</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-xs text-gray-600">Total Shares</div>
                  <div className="font-bold text-gray-900">{totalShares}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Total Invested</div>
                  <div className="font-bold text-gray-900">{totalInvested.toFixed(2)} {currency}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Current Value</div>
                  <div className="font-bold text-gray-900">{currentValue.toFixed(2)} {currency}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">P/L</div>
                  <div className={`font-bold ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profitLoss >= 0 ? '+' : ''}{profitLoss.toFixed(2)} {currency}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save and Cancel Buttons */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSave}
              disabled={purchases.length === 0}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
            >
              Save Changes
            </button>
            <button
              onClick={() => {
                setPurchases(initialPurchases);
                setEditMode(false);
                setShowAddForm(false);
              }}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 font-semibold"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          {/* View Mode - Show Summary */}
          <div className="space-y-3">
            {/* Mini Chart */}
            {chartData.length > 0 && (
              <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-purple-500/10"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-medium text-gray-300">{periodLabels[selectedPeriod]} Trend</div>
                    <div className={`text-xs font-bold ${stockTrendPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {stockTrendPercent >= 0 ? '↗' : '↘'} {Math.abs(stockTrendPercent).toFixed(1)}%
                    </div>
                  </div>
                  {/* Period Selector */}
                  <div className="flex gap-1 mb-3" onClick={(e) => e.stopPropagation()}>
                    {(['1d', '1wk', '1mo', '1y'] as const).map((period) => (
                      <button
                        key={period}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPeriod(period);
                        }}
                        className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                          selectedPeriod === period
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                        }`}
                      >
                        {period === '1d' ? '1D' : period === '1wk' ? '1W' : period === '1mo' ? '1M' : '1Y'}
                      </button>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="0%"
                            stopColor={stockTrendPercent >= 0 ? "#10b981" : "#ef4444"}
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="100%"
                            stopColor={stockTrendPercent >= 0 ? "#10b981" : "#ef4444"}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                        tickLine={{ stroke: '#374151' }}
                        axisLine={{ stroke: '#374151' }}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getMonth() + 1}/${date.getDate()}`;
                        }}
                        interval="preserveStartEnd"
                        minTickGap={30}
                      />
                      <YAxis
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                        tickLine={{ stroke: '#374151' }}
                        axisLine={{ stroke: '#374151' }}
                        domain={[yAxisMin, yAxisMax]}
                        tickFormatter={(value) => `${value.toFixed(0)}`}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #374151',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                        labelStyle={{ color: '#9ca3af' }}
                        itemStyle={{ color: stockTrendPercent >= 0 ? '#10b981' : '#ef4444' }}
                        formatter={(value: number) => [`${value.toFixed(2)} ${currency}`, 'Price']}
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke={stockTrendPercent >= 0 ? "#10b981" : "#ef4444"}
                        strokeWidth={2.5}
                        dot={false}
                        fill={`url(#gradient-${symbol})`}
                        activeDot={{ r: 4, strokeWidth: 2, fill: stockTrendPercent >= 0 ? "#10b981" : "#ef4444" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-gray-600 mb-1">Total Shares</div>
              <div className="text-lg font-bold text-gray-900">{totalShares}</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-xs text-gray-600">Invested</div>
                <div className="text-sm font-semibold text-gray-900">{totalInvested.toFixed(2)} {currency}</div>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-xs text-gray-600">Current Value</div>
                <div className="text-sm font-semibold text-gray-900">{currentValue.toFixed(2)} {currency}</div>
              </div>
            </div>

            <div className={`p-3 rounded ${profitLoss >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="text-xs text-gray-600 mb-1">Profit/Loss</div>
              <div className={`text-lg font-bold ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profitLoss >= 0 ? '+' : ''}{profitLoss.toFixed(2)} {currency} ({profitLossPercent >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%)
              </div>
            </div>

            {/* Purchase Details */}
            <div className="pt-2 border-t border-gray-200">
              <div className="text-xs text-gray-600 mb-2">Purchase History</div>
              <div className="space-y-1">
                {purchases.map((purchase, index) => (
                  <div key={index} className="text-xs text-gray-700 flex justify-between">
                    <span>{purchase.shares} shares @ {purchase.purchasePrice.toFixed(2)} {currency}</span>
                    <span className="text-gray-500">{new Date(purchase.purchaseDate).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditMode(true);
              }}
              className="w-full text-sm text-blue-600 hover:text-blue-800 py-2 font-semibold"
            >
              Edit
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default OwnedStockCard;

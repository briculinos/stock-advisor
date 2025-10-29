import React, { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

interface ChartData {
  date: string;
  price: number;
}

interface FollowedStockCardProps {
  symbol: string;
  companyName: string;
  currentPrice: number;
  currency: string;
  onClick?: () => void;
  onDelete?: () => void;
  recommendation?: 'BUY' | 'HOLD' | 'SELL' | 'AVOID';
}

const FollowedStockCard: React.FC<FollowedStockCardProps> = ({
  symbol,
  companyName,
  currentPrice,
  currency,
  onClick,
  onDelete,
  recommendation
}) => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'1d' | '1wk' | '1mo' | '1y'>('1mo');

  // Get card background color based on recommendation
  const getCardColor = () => {
    if (!recommendation) return 'bg-white';
    switch (recommendation) {
      case 'BUY': return 'bg-gradient-to-br from-green-50/50 to-green-50/75 border border-green-200/60';
      case 'SELL': return 'bg-gradient-to-br from-red-50/50 to-red-50/75 border border-red-200/60';
      case 'HOLD': return 'bg-gradient-to-br from-yellow-50/50 to-yellow-50/75 border border-yellow-200/60';
      case 'AVOID': return 'bg-gradient-to-br from-gray-50/50 to-gray-50/75 border border-gray-200/60';
      default: return 'bg-white';
    }
  };

  useEffect(() => {
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
  }, [symbol, selectedPeriod]);

  // Calculate price range for Y-axis
  const prices = chartData.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  const yAxisMin = minPrice - (priceRange * 0.1);
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

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && window.confirm(`Remove ${symbol} from followed stocks?`)) {
      onDelete();
    }
  };

  return (
    <div className={`${getCardColor()} rounded-lg shadow-md p-4 hover:shadow-xl transition-shadow cursor-pointer`} onClick={onClick}>
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
              title="Remove stock"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Chart */}
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
                  <linearGradient id={`gradient-followed-${symbol}`} x1="0" y1="0" x2="0" y2="1">
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
                  fill={`url(#gradient-followed-${symbol})`}
                  activeDot={{ r: 4, strokeWidth: 2, fill: stockTrendPercent >= 0 ? "#10b981" : "#ef4444" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default FollowedStockCard;

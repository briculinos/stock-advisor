import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

interface StockChartProps {
  symbol: string;
  currency: string;
}

interface ChartDataPoint {
  date: string;
  price: number;
}

const StockChart: React.FC<StockChartProps> = ({ symbol, currency }) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('3mo');

  const formatCurrency = (value: number, decimals: number = 0) => {
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
      return `${currencySymbols[currency]}${value.toFixed(decimals)}`;
    } else {
      return `${value.toFixed(decimals)} ${currency}`;
    }
  };

  useEffect(() => {
    fetchChartData();
  }, [symbol, period]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/stock/history/${symbol}?period=${period}`);
      setChartData(response.data);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Price History</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('1mo')}
            className={`px-3 py-1 text-sm rounded ${
              period === '1mo'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            1M
          </button>
          <button
            onClick={() => setPeriod('3mo')}
            className={`px-3 py-1 text-sm rounded ${
              period === '3mo'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            3M
          </button>
          <button
            onClick={() => setPeriod('6mo')}
            className={`px-3 py-1 text-sm rounded ${
              period === '6mo'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            6M
          </button>
          <button
            onClick={() => setPeriod('1y')}
            className={`px-3 py-1 text-sm rounded ${
              period === '1y'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            1Y
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              // Show fewer ticks for better readability
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
            minTickGap={30}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            domain={['auto', 'auto']}
            tickFormatter={(value) => formatCurrency(value)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
            }}
            formatter={(value: any) => [formatCurrency(Number(value), 2), 'Price']}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockChart;

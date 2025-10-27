import React from 'react';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart } from 'recharts';

interface PricePoint {
  date: string;
  price: number;
  timestamp: number;
}

interface Wave {
  startIndex: number;
  endIndex: number;
  startPrice: number;
  endPrice: number;
  type: 'impulse' | 'correction';
  label: string;
}

interface FibonacciLevel {
  level: number;
  price: number;
  label: string;
}

interface ElliottWaveData {
  symbol: string;
  priceData: PricePoint[];
  waves: Wave[];
  fibonacciLevels: FibonacciLevel[];
  currentWave: string;
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  prediction: string;
  analysis: string;
}

interface ElliottWaveChartProps {
  data: ElliottWaveData;
}

const ElliottWaveChart: React.FC<ElliottWaveChartProps> = ({ data }) => {
  const { priceData, waves, fibonacciLevels, currentWave, recommendation, prediction, analysis, symbol } = data;

  // Add wave labels to price data
  const chartData = priceData.map((point, index) => {
    const wave = waves.find(w => index >= w.startIndex && index <= w.endIndex);
    return {
      ...point,
      waveLabel: wave ? wave.label : null,
      waveType: wave ? wave.type : null
    };
  });

  // Get key Fibonacci levels for display (38.2%, 50%, 61.8%)
  const keyFibLevels = fibonacciLevels.filter(fib =>
    [0.382, 0.5, 0.618].includes(fib.level)
  );

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-semibold">{data.date}</p>
          <p className="text-blue-600">Price: {data.price.toFixed(2)}</p>
          {data.waveLabel && (
            <p className={`text-sm ${data.waveType === 'impulse' ? 'text-green-600' : 'text-orange-600'}`}>
              Wave {data.waveLabel} ({data.waveType})
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
      <div className="mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-2">
          Elliott Wave Analysis - {symbol}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4">
          <div className="bg-blue-50 p-3 rounded">
            <p className="text-sm text-gray-600">Current Wave</p>
            <p className="text-xl font-bold text-blue-600">{currentWave}</p>
          </div>
          <div className="bg-purple-50 p-3 rounded">
            <p className="text-sm text-gray-600">Prediction</p>
            <p className="text-sm font-semibold text-purple-700">{prediction}</p>
          </div>
        </div>
      </div>

      {/* Chart - Wider on mobile for better readability */}
      <div className="mb-4 md:mb-[2px] -ml-8 md:mx-0 overflow-x-auto">
        <div className="min-w-[400px] md:min-w-0 pr-10">
          <ResponsiveContainer width="100%" height={450} className="h-[50px] md:!h-[450px]">
            <ComposedChart data={chartData} margin={{ top: 20, right: 35, left: 10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              interval={Math.floor(chartData.length / 8)}
              angle={0}
            />
            <YAxis
              domain={[(dataMin: number) => dataMin * 0.95, (dataMax: number) => dataMax * 1.05]}
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => `${value.toFixed(2)}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {/* Fibonacci Levels as Reference Lines */}
            {keyFibLevels.map((fib) => (
              <ReferenceLine
                key={fib.level}
                y={fib.price}
                stroke={
                  fib.level === 0.382 ? '#10B981' :
                  fib.level === 0.5 ? '#F59E0B' :
                  '#EF4444'
                }
                strokeDasharray="5 5"
                label={{
                  value: fib.label,
                  position: 'right',
                  fill: '#666',
                  fontSize: 11
                }}
              />
            ))}

            {/* Price Line */}
            <Line
              type="monotone"
              dataKey="price"
              stroke="#2563EB"
              strokeWidth={2}
              dot={false}
              name="Price"
            />

            {/* Wave Markers */}
            {waves.map((wave, index) => (
              <ReferenceLine
                key={`wave-${index}`}
                x={chartData[wave.endIndex]?.date}
                stroke={wave.type === 'impulse' ? '#10B981' : '#F59E0B'}
                strokeWidth={2}
                label={{
                  value: wave.label,
                  position: 'top',
                  fill: wave.type === 'impulse' ? '#10B981' : '#F59E0B',
                  fontSize: 14,
                  fontWeight: 'bold'
                }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
        </div>
      </div>

      {/* Fibonacci Levels Table */}
      <div className="mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3">Fibonacci Retracement Levels</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {fibonacciLevels.map((fib) => (
            <div
              key={fib.level}
              className={`p-2 md:p-3 rounded border ${
                [0.382, 0.5, 0.618].includes(fib.level)
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-gray-50 border-gray-300'
              }`}
            >
              <p className="text-xs text-gray-600">{fib.label}</p>
              <p className="text-base md:text-lg font-bold text-gray-900">{fib.price.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Analysis */}
      <div className="bg-gray-50 p-3 md:p-4 rounded">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">Analysis</h3>
        <p className="text-xs md:text-sm text-gray-700 whitespace-pre-line leading-relaxed">{analysis}</p>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-600 mb-2">Legend:</p>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Impulse Waves (1,3,5)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span>Corrective Waves (2,4,A,B,C)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-12 h-0.5 bg-green-500"></div>
            <span>Fib 38.2%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-12 h-0.5 bg-orange-500"></div>
            <span>Fib 50%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-12 h-0.5 bg-red-500"></div>
            <span>Fib 61.8%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ElliottWaveChart;

import React from 'react';

interface StockCardProps {
  symbol: string;
  companyName: string;
  price: number;
  currency: string;
  onClick?: () => void;
}

const StockCard: React.FC<StockCardProps> = ({ symbol, companyName, price, currency, onClick }) => {
  return (
    <div
      className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{symbol}</h3>
          <p className="text-sm text-gray-600">{companyName}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">
            {currency === 'USD' ? '$' : currency}{price.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StockCard;

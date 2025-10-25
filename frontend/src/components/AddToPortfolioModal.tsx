import React, { useState } from 'react';

interface AddToPortfolioModalProps {
  symbol: string;
  currentPrice: number;
  currency: string;
  onAdd: (shares: number, purchasePrice: number, purchaseDate: string) => void;
  onClose: () => void;
}

const AddToPortfolioModal: React.FC<AddToPortfolioModalProps> = ({
  symbol,
  currentPrice,
  currency,
  onAdd,
  onClose,
}) => {
  const [shares, setShares] = useState('');
  const [purchasePrice, setPurchasePrice] = useState(currentPrice.toString());
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  const formatCurrency = (amount: number, curr: string) => {
    const currencySymbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CAD': 'C$',
      'AUD': 'A$',
    };

    // Use symbol if available, otherwise use currency code
    if (currencySymbols[curr]) {
      return `${currencySymbols[curr]}${amount.toFixed(2)}`;
    } else {
      return `${amount.toFixed(2)} ${curr}`;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (shares && purchasePrice) {
      onAdd(parseFloat(shares), parseFloat(purchasePrice), purchaseDate);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-2xl font-bold mb-4 text-gray-900">Add {symbol} to Portfolio</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="shares" className="block text-sm font-medium text-gray-700 mb-1">
              Number of Shares
            </label>
            <input
              type="number"
              id="shares"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              step="0.01"
              min="0"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Price per Share
            </label>
            <input
              type="number"
              id="purchasePrice"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              step="0.01"
              min="0"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Date
            </label>
            <input
              type="date"
              id="purchaseDate"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {shares && purchasePrice && (
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm text-gray-700">
                Total Investment: <span className="font-bold">{formatCurrency(parseFloat(shares) * parseFloat(purchasePrice), currency)}</span>
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Add to Portfolio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddToPortfolioModal;

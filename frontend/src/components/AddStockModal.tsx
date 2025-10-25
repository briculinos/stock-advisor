import React, { useState, useEffect, useRef } from 'react';
import { searchSymbol } from '../services/api';

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

interface AddStockModalProps {
  onSearch: (symbol: string, companyName: string, ownershipType: 'own' | 'follow') => void;
  onClose: () => void;
}

const AddStockModal: React.FC<AddStockModalProps> = ({ onSearch, onClose }) => {
  const [companyName, setCompanyName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showOwnershipPopup, setShowOwnershipPopup] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (companyName.trim().length >= 2) {
        setSearching(true);
        try {
          const results = await searchSymbol(companyName);
          setSearchResults(results);
          setShowDropdown(results.length > 0);
        } catch (error) {
          console.error('Error searching symbols:', error);
          setSearchResults([]);
        }
        setSearching(false);
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [companyName]);

  const handleSelectResult = (result: SearchResult) => {
    setSymbol(result.symbol);
    setCompanyName(result.name);
    setShowDropdown(false);
    setSearchResults([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol.trim() || companyName.trim()) {
      setShowOwnershipPopup(true);
    }
  };

  const handleOwnershipChoice = (type: 'own' | 'follow') => {
    onSearch(symbol.toUpperCase() || '', companyName, type);
    setShowOwnershipPopup(false);
    onClose();
  };

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Add Stock</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative" ref={dropdownRef}>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
              Company Name
            </label>
            <input
              type="text"
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g., Apple, Microsoft, Tesla..."
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            {searching && (
              <div className="absolute right-3 top-10 text-gray-400">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            )}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    onClick={() => handleSelectResult(result)}
                    className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-semibold text-gray-900">{result.symbol}</div>
                    <div className="text-sm text-gray-600">{result.name}</div>
                    <div className="text-xs text-gray-400">{result.exchange}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 mb-1">
              Stock Symbol
            </label>
            <input
              type="text"
              id="symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="e.g., AAPL"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={!symbol.trim() && !companyName.trim()}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
          >
            Find Stock
          </button>

          {!symbol && companyName.trim().length >= 2 && (
            <p className="text-xs text-gray-500 text-center">
              💡 Select a company from the dropdown to auto-fill the symbol
            </p>
          )}
        </form>
      </div>
    </div>

    {/* Ownership Popup */}
    {showOwnershipPopup && (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
        <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-sm mx-4">
          <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
            How do you want to track this stock?
          </h3>
          <div className="space-y-3">
            <button
              onClick={() => handleOwnershipChoice('own')}
              className="w-full bg-green-600 text-white py-4 px-6 rounded-lg hover:bg-green-700 transition-colors font-semibold text-lg"
            >
              Own Shares
            </button>
            <button
              onClick={() => handleOwnershipChoice('follow')}
              className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg"
            >
              Follow
            </button>
          </div>
          <button
            onClick={() => setShowOwnershipPopup(false)}
            className="w-full mt-4 text-gray-500 hover:text-gray-700 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    )}
    </>
  );
};

export default AddStockModal;

import React, { useState, useEffect, useRef } from 'react';
import { searchSymbol } from '../services/api';

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

interface InsightsSearchProps {
  onSearch: (symbol: string, companyName: string) => void;
  loading: boolean;
  initialSymbol?: string;
  initialCompanyName?: string;
  disableAutocomplete?: boolean; // Disable autocomplete when navigating from Home/Moonshot
}

const InsightsSearch: React.FC<InsightsSearchProps> = ({
  onSearch,
  loading,
  initialSymbol = '',
  initialCompanyName = '',
  disableAutocomplete = false
}) => {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);

  // Update state when initial values change
  useEffect(() => {
    if (initialSymbol) setSymbol(initialSymbol);
    if (initialCompanyName) setCompanyName(initialCompanyName);
  }, [initialSymbol, initialCompanyName]);

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
    // Skip autocomplete if disabled (when navigating from Home/Moonshot)
    if (disableAutocomplete) {
      return;
    }

    // Skip autocomplete on initial load with pre-filled values
    if (isInitialLoad.current && initialCompanyName) {
      isInitialLoad.current = false;
      return;
    }
    isInitialLoad.current = false;

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
  }, [companyName, initialCompanyName, disableAutocomplete]);

  const handleSelectResult = (result: SearchResult) => {
    setSymbol(result.symbol);
    setCompanyName(result.name);
    setShowDropdown(false);
    setSearchResults([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol.trim()) {
      onSearch(symbol.toUpperCase(), companyName);
      setShowDropdown(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-gray-800">Stock Insights</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="symbol" className="block text-sm md:text-base font-medium text-gray-700 mb-2">
            Stock Symbol
          </label>
          <input
            type="text"
            id="symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="e.g., AAPL"
            className="w-full px-4 py-3 md:py-2 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
        </div>
        <div className="relative" ref={dropdownRef}>
          <label htmlFor="companyName" className="block text-sm md:text-base font-medium text-gray-700 mb-2">
            {disableAutocomplete ? 'Company Name' : 'Company Name'}
          </label>
          <input
            type="text"
            id="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g., Apple, Microsoft, Tesla..."
            className="w-full px-4 py-3 md:py-2 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
          {searching && (
            <div className="absolute right-3 top-10 md:top-9 text-gray-400">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          )}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {searchResults.map((result, index) => (
                <div
                  key={index}
                  onClick={() => handleSelectResult(result)}
                  className="px-4 py-3 active:bg-blue-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-semibold text-gray-900 text-base">{result.symbol}</div>
                  <div className="text-sm text-gray-600">{result.name}</div>
                  <div className="text-xs text-gray-400">{result.exchange}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || (!symbol.trim() && !companyName.trim())}
          className="w-full bg-blue-600 text-white py-3 md:py-2 px-4 rounded-md hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold text-base"
        >
          {loading ? 'Generating...' : 'Generate Insights'}
        </button>
        {!symbol && companyName.trim().length >= 2 && !disableAutocomplete && (
          <p className="text-xs text-gray-500 mt-2">
            Start typing to search for stock symbol
          </p>
        )}
      </form>
    </div>
  );
};

export default InsightsSearch;

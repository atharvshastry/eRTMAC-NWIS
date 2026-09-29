import React from 'react';

export default function SearchBar({ query, setQuery }) {
  const handleChange = (e) => {
    setQuery(e.target.value);
  };

  const handleSearch = () => {
    // No action needed; filtering occurs via state change
  };

  return (
    <div className="flex items-center space-x-2">
      <input
        type="text"
        placeholder="Search wells, formations, events, reports, lessons learned..."
        value={query}
        onChange={handleChange}
        className="flex-1 px-4 py-2 bg-slate-800 text-slate-100 rounded border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={handleSearch}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition"
      >
        Search
      </button>
    </div>
  );
}

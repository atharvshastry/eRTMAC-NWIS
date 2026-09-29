import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import SearchBar from '../components/knowledge/SearchBar';
import KnowledgeFilters from '../components/knowledge/KnowledgeFilters';
import KnowledgeResult from '../components/knowledge/KnowledgeResult';
import KnowledgeResultDetails from '../components/knowledge/KnowledgeResultDetails';
import { searchKnowledge } from '../services/aiApi';
import mockKnowledge from '../data/mockKnowledge';

export default function KnowledgeRepository() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    well: '',
    formation: '',
    eventType: '',
    depthMin: '',
    depthMax: '',
    severity: '',
    documentType: '',
  });
  const [selectedResult, setSelectedResult] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isBackendLive, setIsBackendLive] = useState(false);

  // The backend's /knowledge/search is a real text search (TF-IDF over event/report text,
  // not a "browse everything" listing) and intentionally returns nothing for an empty query.
  // Don't call it -- or paper over the blank state with canned demo rows -- until the person
  // has actually typed something; otherwise the page looks broken on first load.
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsBackendLive(false);
      return;
    }
    async function executeSearch() {
      try {
        const res = await searchKnowledge(searchQuery, filters);
        setSearchResults(res.results || []);
        setIsBackendLive(!!res.isBackendLive);
      } catch {
        // Backend genuinely unreachable (not just "no results") -- fall back to local
        // filtering over the demo dataset, same as the rest of the app's offline mode.
        const q = searchQuery.toLowerCase();
        const filtered = mockKnowledge.filter((item) => {
          const matchesQuery =
            !q ||
            item.wellId.toLowerCase().includes(q) ||
            item.documentName.toLowerCase().includes(q) ||
            item.formation.toLowerCase().includes(q) ||
            item.event.toLowerCase().includes(q);

          const matchesFilters =
            (!filters.well || item.wellId === filters.well) &&
            (!filters.formation || item.formation === filters.formation) &&
            (!filters.eventType || item.event === filters.eventType) &&
            (!filters.severity || item.severity === filters.severity) &&
            (!filters.documentType || item.documentType === filters.documentType) &&
            (!filters.depthMin || item.depth >= Number(filters.depthMin)) &&
            (!filters.depthMax || item.depth <= Number(filters.depthMax));

          return matchesQuery && matchesFilters;
        });
        setSearchResults(filtered);
        setIsBackendLive(false);
      }
    }
    executeSearch();
  }, [searchQuery, filters]);

  const filteredData = searchResults;

  const handleResultClick = (result) => {
    setSelectedResult(result);
  };

  const closeModal = () => {
    setSelectedResult(null);
  };

  const openWellIntelligence = (wellId) => {
    navigate(`/well-intelligence?wellId=${wellId}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Repository"
        subtitle="Search historical drilling reports, operational events, lessons learned, and mitigation records."
      />
      <div className="space-y-4">
        <SearchBar query={searchQuery} setQuery={setSearchQuery} />
        <KnowledgeFilters filters={filters} setFilters={setFilters} />
        <div className="space-y-2">
          {!searchQuery.trim() ? (
            <div className="p-6 text-center border border-dashed border-slate-800 rounded-sm">
              <p className="text-sm text-slate-400">
                Type a search term above to search historical drilling reports, events, and lessons learned.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Try "mud loss", "stuck pipe", "kick", or a well ID like OIL-DEMO-003.
              </p>
            </div>
          ) : (
            <>
              {filteredData.map((item) => (
                <KnowledgeResult key={item.id} data={item} onViewDetails={handleResultClick} />
              ))}
              {filteredData.length === 0 && (
                <p className="text-sm text-slate-400">No matching records found.</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {selectedResult && (
        <KnowledgeResultDetails
          data={selectedResult}
          onClose={closeModal}
          onOpenWellIntelligence={openWellIntelligence}
        />
      )}
    </div>
  );
}

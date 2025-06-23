import React, { useState, useEffect } from 'react';
import './App.css';
import BountiesTable from './components/BountiesTable';
import BountyBucketWeightTable from './components/BountyBucketWeightTable';
import RawBountyBucketWeightTable from './components/RawBountyBucketWeightTable';
import AIBountiesModal from './components/AIBountiesModal';

function App() {
  const [activeTab, setActiveTab] = useState<'bounties' | 'categories' | 'raw'>('bounties');
  const [isAIBountiesModalOpen, setIsAIBountiesModalOpen] = useState(false);

  // Debug logging to track modal state changes
  useEffect(() => {
    console.log('App: AIBountiesModal state changed:', isAIBountiesModalOpen);
  }, [isAIBountiesModalOpen]);

  // Ensure modal starts closed and stays closed on mount
  useEffect(() => {
    console.log('App: Component mounted, ensuring modal is closed');
    setIsAIBountiesModalOpen(false);
  }, []);

  const handleOpenAIBountiesModal = () => {
    console.log('App: AI Bounties button clicked, opening modal');
    setIsAIBountiesModalOpen(true);
  };

  const handleCloseAIBountiesModal = () => {
    console.log('App: AI Bounties modal closing');
    setIsAIBountiesModalOpen(false);
  };

  console.log('App: Rendering with modal state:', isAIBountiesModalOpen);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Bounty Tracker</h1>
        <button 
          className="ai-bounties-button"
          onClick={handleOpenAIBountiesModal}
        >
          AI Bounties
        </button>
      </header>
      <main className="App-main">
        <div className="tabs">
          <button 
            className={`tab-button ${activeTab === 'bounties' ? 'active' : ''}`}
            onClick={() => setActiveTab('bounties')}
          >
            Bounties
          </button>
          <button 
            className={`tab-button ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            Bounties with Categories
          </button>
          <button 
            className={`tab-button ${activeTab === 'raw' ? 'active' : ''}`}
            onClick={() => setActiveTab('raw')}
          >
            Raw Bucket Weight Data
          </button>
        </div>
        
        <div className="tab-content">
          {activeTab === 'bounties' && <BountiesTable />}
          {activeTab === 'categories' && <BountyBucketWeightTable />}
          {activeTab === 'raw' && <RawBountyBucketWeightTable />}
        </div>
      </main>

      <AIBountiesModal 
        isOpen={isAIBountiesModalOpen}
        onClose={handleCloseAIBountiesModal}
      />
    </div>
  );
}

export default App;

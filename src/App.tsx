import React, { useState } from 'react';
import './App.css';
import BountiesTable from './components/BountiesTable';
import BountyBucketWeightTable from './components/BountyBucketWeightTable';
import RawBountyBucketWeightTable from './components/RawBountyBucketWeightTable';
import AIBountiesModal from './components/AIBountiesModal';
import EnvironmentDebug from './components/EnvironmentDebug';

function App() {
  const [activeTab, setActiveTab] = useState<'bounties' | 'categories' | 'raw'>('bounties');
  const [isAIBountiesModalOpen, setIsAIBountiesModalOpen] = useState(false);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Bounty Tracker</h1>
        <button 
          className="ai-bounties-button"
          onClick={() => setIsAIBountiesModalOpen(true)}
        >
          AI Bounties
        </button>
      </header>
      
      {/* Temporary Environment Debug Component */}
      <EnvironmentDebug />
      
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
        onClose={() => setIsAIBountiesModalOpen(false)}
      />
    </div>
  );
}

export default App;

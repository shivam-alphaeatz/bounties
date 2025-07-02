import React, { useState } from 'react';
import './App.css';
import BountiesTable from './components/BountiesTable';
import BountyBucketWeightTable from './components/BountyBucketWeightTable';
import RawBountyBucketWeightTable from './components/RawBountyBucketWeightTable';
import AIBountiesTab from './components/AIBountiesTab';
import BountyPromptsTable from './components/BountyPromptsTable';

function App() {
  const [activeTab, setActiveTab] = useState<'bounties' | 'categories' | 'raw' | 'ai-bounties' | 'prompts'>('bounties');

  return (
    <div className="App">
      <header className="App-header">
        <h1>Bounty Tracker</h1>
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
          <button 
            className={`tab-button ${activeTab === 'ai-bounties' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai-bounties')}
          >
            AI Bounties
          </button>
          <button 
            className={`tab-button ${activeTab === 'prompts' ? 'active' : ''}`}
            onClick={() => setActiveTab('prompts')}
          >
            Bounty Prompts
          </button>
        </div>
        
        <div className="tab-content">
          {activeTab === 'bounties' && <BountiesTable />}
          {activeTab === 'categories' && <BountyBucketWeightTable />}
          {activeTab === 'raw' && <RawBountyBucketWeightTable />}
          {activeTab === 'ai-bounties' && <AIBountiesTab />}
          {activeTab === 'prompts' && <BountyPromptsTable />}
        </div>
      </main>
    </div>
  );
}

export default App;

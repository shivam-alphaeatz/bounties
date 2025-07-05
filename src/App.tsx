import React, { useState } from 'react';
import './App.css';
import BountiesTable from './components/BountiesTable';
import AIBountiesTab from './components/AIBountiesTab';
import BountyPromptsTable from './components/BountyPromptsTable';
import AcceptedBountiesTab from './components/AcceptedBountiesTab';

function App() {
  const [activeTab, setActiveTab] = useState<'bounties' | 'ai-bounties' | 'prompts' | 'accepted-bounties'>('bounties');

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
            className={`tab-button ${activeTab === 'ai-bounties' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai-bounties')}
          >
            AI Bounties
          </button>
          <button 
            className={`tab-button ${activeTab === 'accepted-bounties' ? 'active' : ''}`}
            onClick={() => setActiveTab('accepted-bounties')}
          >
            Accepted Bounties
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
          {activeTab === 'ai-bounties' && <AIBountiesTab onNavigateToAcceptedBounties={() => setActiveTab('accepted-bounties')} />}
          {activeTab === 'accepted-bounties' && <AcceptedBountiesTab />}
          {activeTab === 'prompts' && <BountyPromptsTable />}
        </div>
      </main>
    </div>
  );
}

export default App;

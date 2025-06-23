import React from 'react';

const EnvironmentDebug: React.FC = () => {
  const envVars = {
    'REACT_APP_SUPABASE_URL': process.env.REACT_APP_SUPABASE_URL,
    'REACT_APP_SUPABASE_ANON_KEY': process.env.REACT_APP_SUPABASE_ANON_KEY,
    'REACT_APP_SUPABASE_EDGE_FUNCTION_URL': process.env.REACT_APP_SUPABASE_EDGE_FUNCTION_URL,
    'REACT_APP_GOOGLE_SHEETS_API_KEY': process.env.REACT_APP_GOOGLE_SHEETS_API_KEY,
    'REACT_APP_GOOGLE_SHEET_ID': process.env.REACT_APP_GOOGLE_SHEET_ID,
  };

  const hasAllRequiredVars = envVars['REACT_APP_SUPABASE_ANON_KEY'] && envVars['REACT_APP_SUPABASE_URL'];

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f5f5f5', 
      border: '1px solid #ddd', 
      borderRadius: '8px',
      margin: '20px 0',
      fontFamily: 'monospace',
      fontSize: '12px'
    }}>
      <h3>Environment Variables Debug</h3>
      <div style={{ marginBottom: '10px' }}>
        <strong>Status: </strong>
        <span style={{ 
          color: hasAllRequiredVars ? 'green' : 'red',
          fontWeight: 'bold'
        }}>
          {hasAllRequiredVars ? '✅ All Required Variables Set' : '❌ Missing Required Variables'}
        </span>
      </div>
      
      {Object.entries(envVars).map(([key, value]) => (
        <div key={key} style={{ marginBottom: '8px' }}>
          <strong>{key}:</strong>
          <div style={{ 
            marginLeft: '10px',
            color: value ? 'green' : 'red',
            wordBreak: 'break-all'
          }}>
            {value ? (
              <>
                <span>✅ Set</span>
                <br />
                <span style={{ fontSize: '10px', color: '#666' }}>
                  Length: {value.length} | 
                  Preview: {value.substring(0, 20)}...
                </span>
              </>
            ) : (
              <span>❌ Not Set</span>
            )}
          </div>
        </div>
      ))}
      
      <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#fff', borderRadius: '4px' }}>
        <strong>Instructions:</strong>
        <ol style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>Go to your Vercel project dashboard</li>
          <li>Navigate to Settings → Environment Variables</li>
          <li>Add the missing variables listed above</li>
          <li>Redeploy your project</li>
        </ol>
      </div>
    </div>
  );
};

export default EnvironmentDebug; 
import { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:3000';

function App() {
  const [nodes, setNodes] = useState([]);
  const [nodeName, setNodeName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch nodes
  const fetchNodes = async () => {
    try {
      const response = await fetch(`${API_URL}/nodes`);
      const data = await response.json();
      console.log('Fetched nodes:', data); // Debug log
      setNodes(data);
    } catch (err) {
      console.error('Failed to fetch nodes:', err);
    }
  };

  // Auto-refresh nodes every 3 seconds
  useEffect(() => {
    fetchNodes();
    const interval = setInterval(fetchNodes, 3000);
    return () => clearInterval(interval);
  }, []);

  // Create node
  const createNode = async () => {
    if (!nodeName.trim()) {
      setError('Please enter a node name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nodeName })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create node');
      }

      setNodeName('');
      await fetchNodes();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Run node
  const runNode = async (id) => {
    try {
      const response = await fetch(`${API_URL}/nodes/${id}/run`, {
        method: 'POST'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to run node');
      }

      const result = await response.json();
      console.log('Run node result:', result); // Debug log
      
      await fetchNodes();
      
      // Show message if Guacamole registration failed
      if (result.message && result.message.includes('failed')) {
        alert('VM started but Guacamole connection failed. Try accessing via VNC directly on port ' + result.vncPort);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Stop node
  const stopNode = async (id) => {
    try {
      const response = await fetch(`${API_URL}/nodes/${id}/stop`, {
        method: 'POST'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to stop node');
      }

      await fetchNodes();
    } catch (err) {
      alert(err.message);
    }
  };

  // Wipe node
  const wipeNode = async (id) => {
    if (!confirm('Are you sure you want to wipe this node? This will reset it to base state.')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/nodes/${id}/wipe`, {
        method: 'POST'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to wipe node');
      }

      await fetchNodes();
    } catch (err) {
      alert(err.message);
    }
  };

  // Delete node
  const deleteNode = async (id) => {
    if (!confirm('Are you sure you want to delete this node permanently?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/nodes/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete node');
      }

      await fetchNodes();
    } catch (err) {
      alert(err.message);
    }
  };

  // Open Guacamole console
  const openConsole = (node) => {
    console.log('Opening console for node:', node); // Debug log
    
    if (!node.guacamoleUrl) {
      // Show detailed error message
      const message = `Console URL not available for ${node.name}.\n\n` +
        `Possible solutions:\n` +
        `1. Wait 5 seconds after starting the VM and try again\n` +
        `2. Access Guacamole directly: http://localhost:8080/guacamole\n` +
        `   Login: guacadmin / guacadmin\n` +
        `3. Use VNC client on localhost:${node.vncPort}\n\n` +
        `Connection ID: ${node.connectionId || 'Not registered'}`;
      
      alert(message);
      
      // Try to open Guacamole home anyway
      window.open('http://localhost:8080/guacamole', '_blank');
      return;
    }
    
    console.log('Opening URL:', node.guacamoleUrl); // Debug log
    window.open(node.guacamoleUrl, '_blank');
  };

  // Test Guacamole connectivity
  const testGuacamole = async () => {
    try {
      const response = await fetch('http://localhost:8080/guacamole/');
      if (response.ok) {
        alert('✅ Guacamole is accessible!\nOpening Guacamole...');
        window.open('http://localhost:8080/guacamole', '_blank');
      } else {
        alert('❌ Guacamole responded but with error status: ' + response.status);
      }
    } catch (err) {
      alert('❌ Cannot connect to Guacamole:\n' + err.message + '\n\nMake sure Docker containers are running:\ndocker-compose ps');
    }
  };

  return (
    <div className="App">
      <header>
        <h1>🖥️ Network Lab</h1>
        <p>Virtual Machine Management Platform</p>
        <button onClick={testGuacamole} className="test-btn">
          🔧 Test Guacamole Connection
        </button>
      </header>

      <div className="container">
        {/* Create Node Section */}
        <div className="create-section">
          <h2>Create New Node</h2>
          <div className="create-form">
            <input
              type="text"
              placeholder="Enter node name..."
              value={nodeName}
              onChange={(e) => setNodeName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createNode()}
              disabled={loading}
            />
            <button 
              onClick={createNode} 
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Creating...' : 'Add Node'}
            </button>
          </div>
          {error && <div className="error">{error}</div>}
        </div>

        {/* Nodes List */}
        <div className="nodes-section">
          <h2>Nodes ({nodes.length})</h2>
          
          {nodes.length === 0 ? (
            <div className="empty-state">
              <p>No nodes yet. Create your first node above!</p>
            </div>
          ) : (
            <div className="nodes-grid">
              {nodes.map((node) => (
                <div key={node.id} className="node-card">
                  <div className="node-header">
                    <h3>{node.name}</h3>
                    <span className={`status status-${node.status}`}>
                      {node.status === 'running' ? '🟢' : '🔴'} {node.status}
                    </span>
                  </div>
                  
                  <div className="node-info">
                    <div className="info-item">
                      <span className="label">ID:</span>
                      <span className="value">{node.id}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">VNC Port:</span>
                      <span className="value">{node.vncPort}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Guac ID:</span>
                      <span className="value">{node.connectionId || 'Not registered'}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Created:</span>
                      <span className="value">
                        {new Date(node.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="node-actions">
                    {node.status === 'stopped' ? (
                      <button 
                        onClick={() => runNode(node.id)}
                        className="btn btn-success"
                      >
                        ▶️ Run
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={() => stopNode(node.id)}
                          className="btn btn-danger"
                        >
                          ⏹️ Stop
                        </button>
                        <button 
                          onClick={() => openConsole(node)}
                          className="btn btn-info"
                          title={node.guacamoleUrl ? 'Open console' : 'Console not ready - click for options'}
                        >
                          💻 Console
                        </button>
                      </>
                    )}
                    
                    <button 
                      onClick={() => wipeNode(node.id)}
                      className="btn btn-warning"
                      disabled={node.status === 'running'}
                    >
                      🔄 Wipe
                    </button>
                    
                    <button 
                      onClick={() => deleteNode(node.id)}
                      className="btn btn-danger"
                      disabled={node.status === 'running'}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer>
        <p>Built with QEMU, VNC, and Guacamole</p>
        <p style={{fontSize: '0.8rem', marginTop: '0.5rem'}}>
          💡 Tip: If console doesn't work, try the "Test Guacamole Connection" button above
        </p>
      </footer>
    </div>
  );
}

export default App; 
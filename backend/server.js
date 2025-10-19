const express = require('express');
const cors = require('cors');
const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Store node information
const nodes = new Map();
let nextVncPort = 5900;
let nextNodeId = 1;

// Guacamole configuration
const GUACAMOLE_URL = 'http://localhost:8080/guacamole';
const GUACAMOLE_USER = 'guacadmin';
const GUACAMOLE_PASS = 'guacadmin';

// Paths
const IMAGES_DIR = path.join(__dirname, '..', 'images');
const OVERLAYS_DIR = path.join(__dirname, '..', 'overlays');
const BASE_IMAGE = path.join(IMAGES_DIR, 'base.qcow2');

// Ensure directories exist
async function initDirs() {
  try {
    await fs.mkdir(IMAGES_DIR, { recursive: true });
    await fs.mkdir(OVERLAYS_DIR, { recursive: true });
    console.log('✅ Directories initialized');
  } catch (err) {
    console.error('Error creating directories:', err);
  }
}

// Get Guacamole auth token
async function getGuacamoleToken() {
  try {
    const response = await axios.post(`${GUACAMOLE_URL}/api/tokens`, {
      username: GUACAMOLE_USER,
      password: GUACAMOLE_PASS
    });
    return response.data.authToken;
  } catch (err) {
    console.error('Failed to get Guacamole token:', err.message);
    return null;
  }
}

// Register VNC connection in Guacamole
async function registerGuacamoleConnection(nodeId, nodeName, vncPort) {
  try {
    const token = await getGuacamoleToken();
    if (!token) return null;

    const connectionData = {
      name: nodeName,
      protocol: 'vnc',
      parameters: {
        hostname: 'host.docker.internal',
        port: vncPort.toString(),
        password: ''
      },
      parentIdentifier: 'ROOT',
      attributes: {
        'max-connections': '',
        'max-connections-per-user': ''
      }
    };

    const response = await axios.post(
      `${GUACAMOLE_URL}/api/session/data/postgresql/connections?token=${token}`,
      connectionData
    );

    console.log(`✅ Registered ${nodeName} in Guacamole`);
    return response.data.identifier;
  } catch (err) {
    console.error('Failed to register in Guacamole:', err.message);
    return null;
  }
}

// Delete Guacamole connection
async function deleteGuacamoleConnection(connectionId) {
  try {
    const token = await getGuacamoleToken();
    if (!token || !connectionId) return;

    await axios.delete(
      `${GUACAMOLE_URL}/api/session/data/postgresql/connections/${connectionId}?token=${token}`
    );
    console.log(`✅ Deleted connection ${connectionId} from Guacamole`);
  } catch (err) {
    console.error('Failed to delete from Guacamole:', err.message);
  }
}

// CREATE NODE - POST /nodes
app.post('/nodes', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Node name is required' });
    }

    const nodeId = `node_${nextNodeId++}`;
    const overlayPath = path.join(OVERLAYS_DIR, `${nodeId}.qcow2`);
    
    // Check if base image exists
    try {
      await fs.access(BASE_IMAGE);
    } catch (err) {
      return res.status(500).json({ 
        error: 'Base image not found. Please create base.qcow2 first.' 
      });
    }

    // Create overlay disk
    const createOverlay = spawn('qemu-img', [
      'create',
      '-f', 'qcow2',
      '-b', BASE_IMAGE,
      '-F', 'qcow2',
      overlayPath
    ]);

    createOverlay.on('close', (code) => {
      if (code === 0) {
        const vncPort = nextVncPort++;
        const node = {
          id: nodeId,
          name,
          status: 'stopped',
          overlayPath,
          vncPort,
          process: null,
          connectionId: null,
          createdAt: new Date().toISOString()
        };
        
        nodes.set(nodeId, node);
        console.log(`✅ Created node: ${name} (${nodeId})`);
        res.json(node);
      } else {
        res.status(500).json({ error: 'Failed to create overlay disk' });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET ALL NODES - GET /nodes
app.get('/nodes', (req, res) => {
  const nodeList = Array.from(nodes.values()).map(node => ({
    id: node.id,
    name: node.name,
    status: node.status,
    vncPort: node.vncPort,
    createdAt: node.createdAt,
    guacamoleUrl: node.connectionId 
      ? `${GUACAMOLE_URL}/#/client/${node.connectionId}?username=${GUACAMOLE_USER}&password=${GUACAMOLE_PASS}`
      : null
  }));
  res.json(nodeList);
});

// RUN NODE - POST /nodes/:id/run
app.post('/nodes/:id/run', async (req, res) => {
  try {
    const { id } = req.params;
    const node = nodes.get(id);

    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    if (node.status === 'running') {
      return res.status(400).json({ error: 'Node is already running' });
    }

    // Start QEMU with VNC
    const vncDisplay = node.vncPort - 5900;
    const qemuProcess = spawn('qemu-system-x86_64', [
      '-hda', node.overlayPath,
      '-m', '512',
      '-vnc', `:${vncDisplay}`,
      '-enable-kvm',
      '-nographic'
    ], {
      detached: true,
      stdio: 'ignore'
    });

    qemuProcess.unref();

    // Wait a bit for QEMU to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Register in Guacamole
    const connectionId = await registerGuacamoleConnection(id, node.name, node.vncPort);

    node.status = 'running';
    node.process = qemuProcess.pid;
    node.connectionId = connectionId;
    nodes.set(id, node);

    console.log(`✅ Started node: ${node.name} (PID: ${qemuProcess.pid}, VNC: ${node.vncPort})`);
    
    res.json({
      ...node,
      guacamoleUrl: connectionId 
        ? `${GUACAMOLE_URL}/#/client/${connectionId}?username=${GUACAMOLE_USER}&password=${GUACAMOLE_PASS}`
        : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// STOP NODE - POST /nodes/:id/stop
app.post('/nodes/:id/stop', async (req, res) => {
  try {
    const { id } = req.params;
    const node = nodes.get(id);

    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    if (node.status === 'stopped') {
      return res.status(400).json({ error: 'Node is already stopped' });
    }

    // Kill QEMU process
    if (node.process) {
      try {
        process.kill(node.process, 'SIGTERM');
        console.log(`✅ Stopped node: ${node.name} (PID: ${node.process})`);
      } catch (err) {
        console.error('Failed to kill process:', err.message);
      }
    }

    // Delete Guacamole connection
    if (node.connectionId) {
      await deleteGuacamoleConnection(node.connectionId);
    }

    node.status = 'stopped';
    node.process = null;
    node.connectionId = null;
    nodes.set(id, node);

    res.json(node);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WIPE NODE - POST /nodes/:id/wipe
app.post('/nodes/:id/wipe', async (req, res) => {
  try {
    const { id } = req.params;
    const node = nodes.get(id);

    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    // Stop if running
    if (node.status === 'running') {
      if (node.process) {
        try {
          process.kill(node.process, 'SIGTERM');
        } catch (err) {
          console.error('Failed to kill process:', err.message);
        }
      }
      if (node.connectionId) {
        await deleteGuacamoleConnection(node.connectionId);
      }
    }

    // Delete old overlay
    try {
      await fs.unlink(node.overlayPath);
    } catch (err) {
      console.error('Failed to delete overlay:', err.message);
    }

    // Create new overlay
    const createOverlay = spawn('qemu-img', [
      'create',
      '-f', 'qcow2',
      '-b', BASE_IMAGE,
      '-F', 'qcow2',
      node.overlayPath
    ]);

    createOverlay.on('close', (code) => {
      if (code === 0) {
        node.status = 'stopped';
        node.process = null;
        node.connectionId = null;
        nodes.set(id, node);
        console.log(`✅ Wiped node: ${node.name}`);
        res.json(node);
      } else {
        res.status(500).json({ error: 'Failed to recreate overlay' });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE NODE - DELETE /nodes/:id
app.delete('/nodes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const node = nodes.get(id);

    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    // Stop if running
    if (node.status === 'running' && node.process) {
      try {
        process.kill(node.process, 'SIGTERM');
      } catch (err) {
        console.error('Failed to kill process:', err.message);
      }
    }

    // Delete Guacamole connection
    if (node.connectionId) {
      await deleteGuacamoleConnection(node.connectionId);
    }

    // Delete overlay
    try {
      await fs.unlink(node.overlayPath);
    } catch (err) {
      console.error('Failed to delete overlay:', err.message);
    }

    nodes.delete(id);
    console.log(`✅ Deleted node: ${node.name}`);
    res.json({ message: 'Node deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', nodes: nodes.size });
});

// Initialize and start server
initDirs().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    console.log(`📊 Nodes: ${nodes.size}`);
  });
});
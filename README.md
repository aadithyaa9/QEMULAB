# 🌐 QEMULAB - Virtual Network Topology Builder

<div align="center">

![QEMULAB Banner](https://img.shields.io/badge/QEMU-Network%20Lab-00d4ff?style=for-the-badge&logo=qemu&logoColor=white)
[![Docker](https://img.shields.io/badge/Docker-Required-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)


**A modern, browser-based virtual machine network lab powered by QEMU, ReactFlow, and Apache Guacamole**

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Documentation](#-documentation) • [Troubleshooting](#-troubleshooting)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Quick Start Guide](#-quick-start-guide)
- [Project Structure](#-project-structure)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Network Architecture](#-network-architecture)
- [Configuration](#-configuration)
- [Troubleshooting](#-troubleshooting)
- [Development](#-development)
- [Performance Tuning](#-performance-tuning)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

QEMULAB is a powerful web-based virtual machine management platform that enables users to create, configure, and manage network topologies directly from their browser. Built on top of QEMU virtualization, it provides an intuitive drag-and-drop interface for designing network infrastructures with real virtual machines.


### 🎥 Video Tutorial
[![QEMULAB Demo](https://img.youtube.com/vi/your-video-id/maxresdefault.jpg)]([https://youtu.be/your-video-id](https://www.youtube.com/watch?v=t_aa7fEJAm8))

---

## ✨ Features

### 🖥️ **Virtual Machine Management**
- **One-Click VM Creation**: Deploy PCs and routers instantly
- **Lifecycle Control**: Run, Stop, Wipe, and Delete operations
- **Resource Management**: Configurable RAM and disk allocation
- **Overlay Disks**: Efficient storage using QEMU copy-on-write

### 🌐 **Network Topology Builder**
- **Visual Interface**: Drag-and-drop topology design with ReactFlow
- **Cable Management**: Interactive cable mode for connecting devices
- **Interface Selection**: Choose specific network interfaces for connections
- **Real-Time Status**: Live updates of node and connection states
- **MiniMap Navigation**: Bird's-eye view of complex topologies

### 💻 **Browser Console Access**
- **Apache Guacamole Integration**: Full VNC access via web browser
- **No Client Required**: Access VMs directly from your browser
- **Multi-User Support**: Concurrent console sessions
- **Clipboard Support**: Copy/paste between host and VMs

### 🔌 **Advanced Networking**
- **Virtual Network Links**: Multicast socket-based connections
- **MAC Address Management**: Automatic generation and assignment
- **Multiple Interfaces**: Support for routers with multiple NICs
- **Link Labels**: Visual identification of connection points

### 🎨 **Modern UI/UX**
- **Glassmorphism Design**: Beautiful backdrop blur effects
- **Responsive Layout**: Works on desktop and tablet devices
- **Dark Theme**: Easy on the eyes for long sessions
- **Smooth Animations**: Polished user experience
- **Context Menus**: Right-click for quick actions

---

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Client)                      │
│  ┌─────────────────┐  ┌──────────────────────────────────┐ │
│  │  React Frontend │  │     Apache Guacamole Web UI      │ │
│  │   (Port 5173)   │  │        (Port 8080)               │ │
│  └────────┬────────┘  └────────────┬─────────────────────┘ │
└───────────┼──────────────────────────┼───────────────────────┘
            │                          │
            │ HTTP/WS                  │ HTTP/WS
            │                          │
┌───────────▼──────────────────────────▼───────────────────────┐
│                      Docker Network (lab-net)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Backend    │  │   Guacamole  │  │   PostgreSQL     │  │
│  │ (Express.js) │  │   (Tomcat)   │  │   (Database)     │  │
│  │  Port 3001   │  │  Port 8080   │  │   Port 5432      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────┘  │
│         │                  │                                  │
│         │ Controls         │ VNC Proxy                       │
│         │                  │                                  │
│  ┌──────▼──────────────────▼────────────────────────────┐  │
│  │              QEMU Virtual Machines                    │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │  │
│  │  │   PC 1   │  │  Router  │  │      PC 2        │  │  │
│  │  │ VNC:5918 │  │ VNC:5932 │  │   VNC:5938       │  │  │
│  │  └────┬─────┘  └────┬─────┘  └──────┬───────────┘  │  │
│  │       │   Multicast   │   Multicast   │              │  │
│  │       │   Network     │   Network     │              │  │
│  │       └───────────────┴───────────────┘              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

#### Frontend
- **React 18.x** - UI framework
- **ReactFlow** - Topology visualization
- **Vite** - Build tool and dev server
- **CSS3** - Styling with animations

#### Backend
- **Node.js 18.x** - Runtime environment
- **Express.js** - REST API server
- **PostgreSQL** - Database for Guacamole
- **QEMU** - Virtualization engine
- **Docker** - Containerization

#### Services
- **Apache Guacamole** - HTML5 remote desktop gateway
- **guacd** - Guacamole proxy daemon

---

## 📋 Prerequisites

### System Requirements

#### Minimum
- **CPU**: 4 cores (2 for host, 2 for VMs)
- **RAM**: 8GB (4GB for host, 4GB for VMs)
- **Storage**: 20GB free space
- **OS**: Windows 10/11, macOS 11+, or Linux (Ubuntu 20.04+)

#### Recommended
- **CPU**: 8+ cores with VT-x/AMD-V support
- **RAM**: 16GB+
- **Storage**: 50GB+ SSD
- **Network**: Gigabit ethernet

### Software Dependencies

1. **Docker Desktop** (Latest version)
   - [Windows](https://docs.docker.com/desktop/install/windows-install/)
   - [macOS](https://docs.docker.com/desktop/install/mac-install/)
   - [Linux](https://docs.docker.com/desktop/install/linux-install/)

2. **Docker Compose** (Usually included with Docker Desktop)
   ```bash
   docker-compose --version
   # Should show v2.x or higher
   ```

3. **Node.js 18.x** (For frontend development)
   ```bash
   node --version
   # Should show v18.x or higher
   ```

4. **Git** (For cloning the repository)
   ```bash
   git --version
   ```

---

## 🚀 Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/aadithyaa9/QEMULAB.git
cd QEMULAB
```

### Step 2: Prepare Base Images

You need to create base VM images for QEMU. Here's how to set up Alpine Linux:

```bash
# Create directories
mkdir -p images overlays

# Download Alpine Linux
cd images
wget https://dl-cdn.alpinelinux.org/alpine/v3.22/releases/x86_64/alpine-virt-3.22.2-x86_64.iso

# Create base disk image (2GB)
qemu-img create -f qcow2 base.qcow2 2G

# Boot Alpine installer
qemu-system-x86_64 \
  -hda base.qcow2 \
  -cdrom alpine-virt-3.22.2-x86_64.iso \
  -boot d \
  -m 512 \
  -display gtk

# In the Alpine installer:
# 1. Login as 'root' (no password)
# 2. Run: setup-alpine
# 3. Follow prompts (use defaults)
# 4. For disk: select 'sda' and 'sys' install
# 5. After installation: poweroff

# Create router image (copy of base)
cp base.qcow2 router.qcow2

cd ..
```

### Step 3: Configure Docker

Ensure Docker Desktop has sufficient resources:

**Settings → Resources:**
- **Memory**: 4GB minimum (8GB recommended)
- **CPUs**: 4 minimum (8 recommended)
- **Disk**: 20GB minimum

### ⚙️ Local configuration (.env)
Create a local `.env` with the host KVM GID before starting the stack:


```bash
# Run in project root
echo "KVM_GID=$(stat -c '%g' /dev/kvm)" > .env
grep -qxF ".env" .gitignore || echo ".env" >> .gitignore
```
### Step 4: Start Services

```bash
# Build and start all containers
docker-compose up --build -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### Step 5: Access Applications

Wait ~30 seconds for services to initialize, then access:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Guacamole**: http://localhost:8080/guacamole
  - Username: `guacadmin`
  - Password: `guacadmin`

---

## 🎮 Quick Start Guide

### Creating Your First Network

1. **Open the Frontend**
   - Navigate to http://localhost:5173
   - Click "🧩 Open Topology Builder"

2. **Add Devices**
   - Drag a **Router** from the palette onto the canvas
   - Drag two **PCs** onto the canvas
   - Name them when prompted

3. **Connect Devices**
   - Click the **Cable** button (or palette item)
   - Click on the first PC
   - Select an interface (e.g., `eth0`)
   - Click on the Router
   - Select an interface (e.g., `GigabitEthernet0/0`)
   - Repeat to connect the second PC

4. **Start VMs**
   - Right-click on a device
   - Select **▶ Run**
   - Wait for the status to show "running" (green border)

5. **Access Console**
   - Click on a running device (or right-click → 💻 Console)
   - Guacamole will open in a new tab
   - You're now in the VM console!

---

## 📁 Project Structure

```
QEMULAB/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── App.jsx          # Main React component
│   │   ├── App.css          # Styling
│   │   ├── main.jsx         # Entry point
│   │   └── images/          # Device icons
│   │       ├── router.png
│   │       └── pc.png
│   ├── index.html           # HTML template
│   ├── package.json         # Frontend dependencies
│   └── vite.config.js       # Vite configuration
│
├── backend/                  # Node.js backend server
│   ├── server.js            # Express API server
│   ├── package.json         # Backend dependencies
│   ├── Dockerfile           # Backend container image
│
├── images/                   # QEMU base images
│   ├── base.qcow2           # Alpine Linux base image
│   └── router.qcow2         # Router base image
│
├── overlays/                 # VM overlay disks (auto-generated)
│   ├── <uuid>.qcow2         # Per-VM overlay files
│   └── <uuid>.log           # QEMU logs
│
├── docker-compose.yml        # Multi-container orchestration
├── initdb.sql               # Guacamole database schema
├── README.md                # This file
└── .gitignore               # Git ignore rules
```

### Key Files Explained

#### Frontend (`frontend/src/App.jsx`)
- **ReactFlow Integration**: Topology visualization
- **Node Management**: Create, update, delete nodes
- **Cable Mode**: Interactive connection builder
- **Context Menu**: Right-click actions
- **Real-time Updates**: 3-second refresh interval

#### Backend (`backend/server.js`)
- **REST API**: CRUD operations for nodes
- **QEMU Management**: Spawn and control VMs
- **Network Configuration**: Multicast socket setup
- **Guacamole Integration**: VNC connection registration
- **PostgreSQL**: Database operations

#### Docker Compose (`docker-compose.yml`)
- **Multi-service orchestration**
- **Network isolation**
- **Volume management**
- **Health checks**

---

## 📚 Usage

### Node Operations

#### Create Node
```bash
# Via API
curl -X POST http://localhost:3001/nodes \
  -H "Content-Type: application/json" \
  -d '{"name": "MyRouter", "deviceType": "router"}'

# Via Frontend: Drag device from palette
```

#### List Nodes
```bash
curl http://localhost:3001/nodes
```

#### Run Node
```bash
curl -X POST http://localhost:3001/nodes/<node-id>/run \
  -H "Content-Type: application/json" \
  -d '{"connections": [...]}'
```

#### Stop Node
```bash
curl -X POST http://localhost:3001/nodes/<node-id>/stop
```

#### Wipe Node (Reset to Base Image)
```bash
curl -X POST http://localhost:3001/nodes/<node-id>/wipe
```

#### Delete Node
```bash
curl -X DELETE http://localhost:3001/nodes/<node-id>
```

### Network Configuration

Nodes automatically configure network interfaces based on connections:

```javascript
// Connection format
{
  "interface": "GigabitEthernet0/0",
  "linkId": "edge-abc-def-123",
  "remoteNode": "node-uuid",
  "remoteInterface": "eth0"
}
```

Each link gets:
- **Unique multicast address**: `230.0.0.X` (derived from linkId)
- **Unique multicast port**: `10000-19999` (derived from linkId)
- **MAC address**: Auto-generated per interface

---

## 🔌 API Documentation

### Base URL
```
http://localhost:3001
```

### Endpoints

#### **GET** `/nodes`
Get all nodes

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Router1",
    "deviceType": "router",
    "status": "running",
    "vncPort": 5918,
    "guacamoleUrl": "http://...",
    "interfaces": ["GigabitEthernet0/0", "GigabitEthernet0/1"],
    "overlayPath": "/app/overlays/uuid.qcow2"
  }
]
```

#### **POST** `/nodes`
Create a new node

**Request Body:**
```json
{
  "name": "MyRouter",
  "deviceType": "router"
}
```

**Response:** Node object

#### **POST** `/nodes/:id/run`
Start a VM with network configuration

**Request Body:**
```json
{
  "connections": [
    {
      "interface": "GigabitEthernet0/0",
      "linkId": "edge-123",
      "remoteNode": "uuid",
      "remoteInterface": "eth0"
    }
  ]
}
```

**Response:** Updated node object with status "running"

#### **POST** `/nodes/:id/stop`
Stop a running VM

**Response:** Updated node object with status "stopped"

#### **POST** `/nodes/:id/wipe`
Reset VM to base image (deletes overlay)

**Response:** Updated node object

#### **DELETE** `/nodes/:id`
Permanently delete a node

**Response:**
```json
{
  "message": "Deleted"
}
```

#### **GET** `/health`
Health check endpoint

**Response:**
```json
{
  "status": "ok",
  "kvm": true,
  "nodes": 3,
  "running": 2
}
```

---

## 🌐 Network Architecture

### Multicast Socket Networking

QEMULAB uses QEMU's multicast socket networking to create virtual network segments:

```
┌─────────────┐                    ┌─────────────┐
│   PC 1      │                    │   Router    │
│  (eth0)     │ ←── Multicast ──→ │ (Gi0/0)    │
│ MAC: aa:bb: │    230.0.0.97     │ MAC: cc:dd: │
│     cc:dd   │    Port: 19200    │     ee:ff   │
└─────────────┘                    └─────────────┘
```

### Link Configuration

Each cable connection creates:

1. **Unique Multicast Group**: Derived from edge ID using MD5 hash
2. **Unique Port**: 10000-19999 range
3. **MAC Addresses**: Auto-generated per interface

### QEMU Network Arguments

```bash
-netdev socket,id=net_eth0,mcast=230.0.0.97:19200
-device e1000,netdev=net_eth0,mac=52:54:00:aa:bb:cc
```

---




### Resource Allocation

Edit `backend/server.js` to change VM resources:

```javascript
const qemuArgs = [
    "-hda", node.overlayPath,
    "-m", node.deviceType === "router" ? "512" : "256", // RAM in MB
    // ... other args
];
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. **VMs Won't Start**

**Symptoms:**
- Node shows "stopped" immediately after run
- No VNC console available

**Solutions:**
```bash
# Check if base images exist
docker exec -it backend ls -la /app/images/

# Check QEMU logs
docker exec -it backend cat /app/overlays/<node-id>.log

# Check if QEMU processes are running
docker exec -it backend ps aux | grep qemu

# Verify images are bootable
docker exec -it backend qemu-img info /app/images/base.qcow2
```

#### 2. **Guacamole Can't Connect to VNC**

**Symptoms:**
- "Unable to connect to VNC server"
- Connection drops immediately

**Solutions:**
```bash
# Check if VNC ports are listening
docker exec -it backend netstat -tulpn | grep 59

# Test VNC connectivity from guacd
docker exec -it guacd nc -zv backend 5918

# Check network connectivity
docker network inspect qemulab_lab-net

# Restart Guacamole service
docker-compose restart guacamole
```

#### 3. **Frontend Can't Connect to Backend**

**Symptoms:**
- API errors in browser console
- Nodes don't load

**Solutions:**
```bash
# Check backend health
curl http://localhost:3001/health

# Check backend logs
docker-compose logs backend

# Verify CORS configuration in server.js
# Ensure app.use(cors()) is present
```

#### 4. **Router Takes Too Long to Boot**

**Symptoms:**
- Router shows "running" but console is blank
- Takes 5+ minutes to boot

**Solutions:**
- Reduce RAM allocation: Change router RAM from 512MB to 384MB
- Use a lighter router image (Alpine Linux is recommended)
- Enable KVM if on Linux: Ensure `/dev/kvm` exists
- Check if host has enough resources

#### 5. **PostgreSQL Connection Failed**

**Symptoms:**
- Backend won't start
- "Failed to connect to PostgreSQL" errors

**Solutions:**
```bash
# Check PostgreSQL health
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Wait longer (may take 30-60 seconds to initialize)
docker-compose up -d
sleep 60

# Reset database
docker-compose down -v
docker-compose up -d
```

### Debug Commands

```bash
# Enter backend container
docker exec -it backend bash

# Check running VMs
ps aux | grep qemu

# Check VNC ports
netstat -tulpn | grep 59

# Test QEMU manually
qemu-system-x86_64 -hda /app/images/base.qcow2 -m 256 -vnc 0.0.0.0:99

# Check network interfaces
docker network inspect qemulab_lab-net

# View all container logs
docker-compose logs --tail=100 -f

# Restart specific service
docker-compose restart backend
```

---

## 🛠️ Development

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (with hot reload)
npm run dev

```

### Docker Development

```bash
# Rebuild specific service
docker-compose build backend

# Rebuild without cache
docker-compose build --no-cache

# View real-time logs
docker-compose logs -f backend

# Execute commands in container
docker exec -it backend bash
```

### Code Structure Best Practices

#### Frontend
- Keep components modular
- Use React hooks for state management
- Implement error boundaries
- Add loading indicators
- Cache API responses

#### Backend
- Validate all inputs
- Use async/await for promises
- Implement proper error handling
- Log important operations
- Clean up resources on shutdown

---

## 📈 Performance Tuning

### Host System Optimization

```bash
# Linux: Enable KVM
sudo apt install qemu-kvm
sudo usermod -aG kvm $USER

# Increase Docker resources
# Docker Desktop → Settings → Resources
# - CPUs: 8
# - Memory: 8GB
# - Swap: 2GB
```

### VM Optimization

```javascript
// Reduce VM overhead in server.js
const qemuArgs = [
    "-hda", node.overlayPath,
    "-m", "256",              // Lower RAM
    "-cpu", "host",            // Use host CPU features
    "-enable-kvm",             // Enable KVM (if available)
    "-display", "none",        // No display overhead
    "-vnc", `0.0.0.0:${display}`,
];
```

### Network Optimization

- Use fewer VMs simultaneously (max 5-10)
- Limit network connections per VM
- Use lighter OS images (Alpine vs Ubuntu)
- Disable unnecessary services in VMs

### Database Optimization

```sql
-- In initdb.sql, add indexes
CREATE INDEX idx_connection_name ON guacamole_connection(connection_name);
CREATE INDEX idx_entity_name ON guacamole_entity(name);
```

---

## 🤝 Contributing

We welcome contributions! Here's how:

### Reporting Issues

1. Check existing issues first
2. Provide detailed description
3. Include steps to reproduce
4. Share relevant logs
5. Specify your environment

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Add comments for complex logic
- Update documentation
- Test thoroughly
- Keep commits atomic

---

## 🙏 Acknowledgments

- **QEMU Project** - Virtualization engine
- **Apache Guacamole** - Clientless remote desktop gateway
- **ReactFlow** - Flow-based UI library
- **Docker** - Containerization platform
- **PostgreSQL** - Database system
- **Alpine Linux** - Lightweight Linux distribution

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/aadithyaa9/QEMULAB/issues)
- **Discussions**: [GitHub Discussions](https://github.com/aadithyaa9/QEMULAB/discussions)

---


## 📊 Statistics

![GitHub Stars](https://img.shields.io/github/stars/aadithyaa9/QEMULAB?style=social)
![GitHub Forks](https://img.shields.io/github/forks/aadithyaa9/QEMULAB?style=social)
![GitHub Issues](https://img.shields.io/github/issues/aadithyaa9/QEMULAB)
![GitHub PRs](https://img.shields.io/github/issues-pr/aadithyaa9/QEMULAB)

---

<div align="center">

**Made with ❤️ by [Aadithyaa](https://github.com/aadithyaa9)**

⭐ Star this repo if you find it useful!

[Report Bug](https://github.com/aadithyaa9/QEMULAB/issues) • [Request Feature](https://github.com/aadithyaa9/QEMULAB/issues)

</div>

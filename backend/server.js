// const express = require("express");
// const cors = require("cors");
// const { v4: uuidv4 } = require("uuid");
// const { spawn, exec, execSync } = require("child_process");
// const fs = require("fs");
// const path = require("path");
// const { Pool } = require("pg");
// const crypto = require("crypto");

// const app = express();
// app.use(cors());
// app.use(express.json());

// const PORT = 3001;

// // ------------------ PATHS ------------------
// const IMAGES_DIR = path.join(__dirname, "images"); // Relative to container
// const OVERLAYS_DIR = path.join(__dirname, "overlays"); // Relative to container
// const DATA_FILE = path.join(__dirname, "nodes.json");

// const BASE_IMAGE = path.join(IMAGES_DIR, "base.qcow2");
// const ROUTER_IMAGE = path.join(IMAGES_DIR, "router.qcow2");

// if (!fs.existsSync(OVERLAYS_DIR))
//     fs.mkdirSync(OVERLAYS_DIR, { recursive: true });

// // ------------------ STATE ------------------
// let nodes = [];
// let counters = { pc: 0, router: 0 };
// let runningProcs = {}; // Store running QEMU processes

// // start fresh each time
// nodes = [];
// counters = { pc: 0, router: 0 };
// runningProcs = {};
// saveState();
// console.log("🧹 Cleared stale nodes, starting fresh");
// // Clean up any old QEMU processes on start
// try {
//     console.log("Killing old QEMU processes...");
//     execSync(`pkill -f qemu-system-x86_64`);
// } catch (e) {
//     console.warn("No old QEMU processes to kill.");
// }

// // ------------------ HELPERS ------------------
// function saveState() {
//     fs.writeFileSync(DATA_FILE, JSON.stringify({ nodes, counters }, null, 2));
// }

// function uniqueName(type) {
//     const prefix = type === "router" ? "Router" : "PC";
//     counters[type]++;
//     return `${prefix} ${counters[type]}`;
// }

// function runCommand(cmd) {
//     return new Promise((resolve, reject) => {
//         exec(cmd, (err, stdout, stderr) => {
//             if (err) reject(stderr || err.message);
//             else resolve(stdout);
//         });
//     });
// }

// async function detectFormat(imagePath) {
//     try {
//         const info = await runCommand(
//             `qemu-img info --output=json "${imagePath}"`
//         );
//         return JSON.parse(info).format || "qcow2";
//     } catch (e) {
//         console.error(`Error detecting format for ${imagePath}:`, e);
//         return "qcow2"; // Fallback
//     }
// }

// function getDefaultInterfaces(type) {
//     return type === "router"
//         ? ["GigabitEthernet0/0", "GigabitEthernet0/1"]
//         : ["eth0"];
// }

// async function safeDelete(file) {
//     if (!fs.existsSync(file)) return;
//     try {
//         fs.unlinkSync(file);
//     } catch (err) {
//         console.warn(`⚠️ Error deleting ${file}: ${err.message}`);
//     }
// }

// // --- Networking Helpers ---
// function getMcastPortForLink(linkId) {
//     const hash = crypto.createHash("md5").update(linkId).digest("hex");
//     const port = 10000 + (parseInt(hash.substring(0, 4), 16) % 10000);
//     return port;
// }
// function getMcastIpForLink(linkId) {
//     const hash = crypto.createHash("md5").update(linkId).digest("hex");
//     const ipPart = 1 + (parseInt(hash.substring(4, 6), 16) % 254);
//     return `230.0.0.${ipPart}`;
// }
// function getMacForInterface(nodeId, ifaceName) {
//     const hash = crypto
//         .createHash("md5")
//         .update(nodeId + ifaceName)
//         .digest("hex");
//     return `00:00:01:${hash.substring(0, 2)}:${hash.substring(
//         2,
//         4
//     )}:${hash.substring(4, 6)}`;
// }

// // ------------------ GUAC SETUP ------------------
// const pool = new Pool({
//     host: "postgres", // DOCKER-UPDATE: Connect to service name
//     port: 5432,
//     database: "guacamole_db",
//     user: "guacamole_user",
//     password: "guacadmin",
// });

// let guacAdminEntityId = null; // Store the admin's ID

// async function registerVncConnection(nodeName, vncPort) {
//     try {
//         await deleteVncConnectionByName(nodeName);

//         const res = await pool.query(
//             `INSERT INTO guacamole_connection (connection_name, protocol)
//        VALUES ($1, 'vnc') RETURNING connection_id`,
//             [nodeName]
//         );
//         const connId = res.rows[0].connection_id;

//         const params = [
//             // DOCKER-UPDATE: Tell Guacamole to find VNC on the 'backend' container
//             [connId, "hostname", "backend"], 
//             [connId, "port", String(vncPort)],
//             [connId, "password", ""],
//         ];

//         for (const [cid, key, val] of params) {
//             await pool.query(
//                 `INSERT INTO guacamole_connection_parameter (connection_id, parameter_name, parameter_value)
//          VALUES ($1, $2, $3)`,
//                 [cid, key, val]
//             );
//         }

//         // --- **PERMISSION FIX** ---
//         if (guacAdminEntityId) {
//             try {
//                 // Grant 'READ' permission to 'guacadmin' for this new connection
//                 await pool.query(
//                     `INSERT INTO guacamole_connection_permission (entity_id, connection_id, permission)
//                      VALUES ($1, $2, 'READ')
//                      ON CONFLICT (entity_id, connection_id, permission) DO NOTHING`, // Ignore if perm already exists
//                     [guacAdminEntityId, connId]
//                 );
//                 console.log(`🔵 Granted READ permission for ${nodeName} to guacadmin`);
//             } catch (permErr) {
//                 console.error(`❌ Failed to grant permission: ${permErr.message}`);
//             }
//         } else {
//             console.warn(`⚠️ guacAdminEntityId not set. Cannot grant permission for ${nodeName}.`);
//         }
//         // --- END PERMISSION FIX ---

//         console.log(`🟢 Registered ${nodeName} → backend:${vncPort}`);
//         return connId;
//     } catch (err) {
//         console.error("❌ Guac registration failed:", err.message);
//         return null;
//     }
// }

// async function deleteVncConnectionByName(name) {
//     try {
//         await pool.query(
//             `DELETE FROM guacamole_connection WHERE connection_name = $1`,
//             [name]
//         );
//         console.log(`🗑 Deleted Guac entry for ${name}`);
//     } catch (err) {
//         console.error(`⚠️ Guac deletion failed: ${err.message}`);
//     }
// }

// // ------------------ ROUTES ------------------
// app.get("/nodes", (_, res) => res.json(nodes));

// // ---- CREATE NODE ----
// app.post("/nodes", async (req, res) => {
//     try {
//         // Use the name from the frontend prompt
//         const { deviceType, name } = req.body;
//         if (!deviceType || !name)
//             return res.status(400).json({ error: "deviceType and name required" });

//         const id = uuidv4();
//         const baseImage = deviceType === "router" ? ROUTER_IMAGE : BASE_IMAGE;
//         if (!fs.existsSync(baseImage))
//             return res
//                 .status(400)
//                 .json({ error: `Base image missing: ${baseImage}` });

//         const overlayPath = path.join(OVERLAYS_DIR, `${id}.qcow2`);
//         const format = await detectFormat(baseImage);
//         await runCommand(
//             `qemu-img create -f qcow2 -b "${baseImage}" -F ${format} "${overlayPath}"`
//         );

//         const node = {
//             id,
//             name, // Use the name from the request
//             deviceType,
//             overlayPath,
//             status: "stopped",
//             vncPort: null,
//             guacamoleUrl: null,
//             interfaces: getDefaultInterfaces(deviceType),
//         };
//         nodes.push(node);
//         // counters are no longer needed for names
//         saveState();
//         console.log(`🆕 Created ${deviceType}: ${name}`);
//         res.status(201).json(node);
//     } catch (err) {
//         console.error("❌ Node creation failed:", err);
//         res.status(500).json({ error: err.message });
//     }
// });

// // ---- RUN NODE ----
// app.post("/nodes/:id/run", async (req, res) => {
//     try {
//         const node = nodes.find((n) => n.id === req.params.id);
//         if (!node) return res.status(404).json({ error: "Node not found" });
//         if (node.status === "running") {
//             console.warn(`⚠️ ${node.name} is already running.`);
//             return res.status(200).json(node);
//         }

//         if (!fs.existsSync(node.overlayPath)) {
//             console.warn(`⚠️ Overlay missing for ${node.name}, rebuilding...`);
//             const base =
//                 node.deviceType === "router" ? ROUTER_IMAGE : BASE_IMAGE;
//             const format = await detectFormat(base);
//             await runCommand(
//                 `qemu-img create -f qcow2 -b "${base}" -F ${format} "${node.overlayPath}"`
//             );
//         }

//         const display = Math.floor(Math.random() * 50) + 1; // VNC display :1, :2, etc.
//         const vncPort = 5900 + display;
        
//         const qemuArgs = [
//             "-hda", node.overlayPath,
//             // --- RAM FIX ---
//             "-m", node.deviceType === "router" ? "2048" : "256", // 2048MB (2G) for router
//             // --- END RAM FIX ---
//             "-display", "none",
//             "-monitor", "none",
//             // VNC listening on all container interfaces
//             "-vnc", `0.0.0.0:${display}`
//             // --- KVM FLAGS REMOVED ---
//         ];

//         // --- ADD NETWORKING ---
//         const { connections } = req.body; 
        
//         if (connections && connections.length > 0) {
//             console.log(`🔌 Configuring networking for ${node.name}...`);
//             for (const conn of connections) {
//                 const ifaceName = conn.interface;
//                 const netId = `net_${ifaceName.replace(/\//g, '_')}`; // Handle '/' in router interface names
//                 const mcastIp = getMcastIpForLink(conn.linkId);
//                 const mcastPort = getMcastPortForLink(conn.linkId);
//                 const mac = getMacForInterface(node.id, ifaceName);

//                 qemuArgs.push(
//                     "-netdev",
//                     `socket,id=${netId},mcast=${mcastIp}:${mcastPort}`,
//                     "-device",
//                     `e1000,netdev=${netId},mac=${mac}`
//                 );
//             }
//         } else {
//             console.log(`💨 ${node.name} running with no network.`);
//         }
        
//         console.log(`Spawning QEMU with args: ${qemuArgs.join(" ")}`);

//         const proc = spawn("qemu-system-x86_64", qemuArgs, {
//             detached: true,
//             stdio: "ignore", 
//         });
//         proc.unref(); 
//         runningProcs[node.id] = proc.pid;

//         await new Promise((r) => setTimeout(r, 1500)); 
//         const connId = await registerVncConnection(node.name, vncPort);

//         node.status = "running";
//         node.vncPort = vncPort;
//         node.guacamoleUrl = connId
//             ? `http://localhost:8080/guacamole/#/client/${btoa(
//                   `${connId}\0c\0postgres`
//               )}`
//             : null;
//         saveState();

//         console.log(`▶ ${node.name} (PID ${proc.pid}) running on VNC ${vncPort}`);
//         return res.status(200).json(node);
//     } catch (err) {
//         console.error("❌ Run failed:", err);
//         res.status(500).json({ error: err.message });
//     }
// });

// // ---- STOP NODE ----
// app.post("/nodes/:id/stop", async (req, res) => {
//     const node = nodes.find((n) => n.id === req.params.id);
//     if (!node) return res.status(404).json({ error: "Node not found" });

//     const pid = runningProcs[node.id];
//     if (pid) {
//         try {
//             process.kill(pid); // Send SIGTERM
//             console.log(`⏹ Stopped ${node.name} (PID ${pid})`);
//         } catch (e) {
//             console.warn(`⚠️ Failed to kill PID ${pid}: ${e.message}.`);
//         }
//         delete runningProcs[node.id];
//     } else {
//         console.warn(`⚠️ ${node.name} was not in runningProcs, stopping all QEMU.`);
//          try {
//             execSync(`pkill -f qemu-system-x86_64`);
//         } catch {}
//     }

//     await deleteVncConnectionByName(node.name);

//     node.status = "stopped";
//     node.vncPort = null;
//     node.guacamoleUrl = null;
//     saveState();
//     res.json(node);
// });

// // ---- WIPE NODE ----
// app.post("/nodes/:id/wipe", async (req, res) => {
//     const node = nodes.find((n) => n.id === req.params.id);
//     if (!node) return res.status(404).json({ error: "Node not found" });

//     if (node.status === "running") {
//         const pid = runningProcs[node.id];
//         if (pid) {
//             try { process.kill(pid); } catch (e) {}
//             delete runningProcs[node.id];
//         }
//     }

//     try {
//         await safeDelete(node.overlayPath);
//         const base = node.deviceType === "router" ? ROUTER_IMAGE : BASE_IMAGE;
//         const format = await detectFormat(base);
//         await runCommand(
//             `qemu-img create -f qcow2 -b "${base}" -F ${format} "${overlayPath}"`
//         );
//         await deleteVncConnectionByName(node.name);

//         node.status = "stopped";
//         node.vncPort = null;
//         node.guacamoleUrl = null;
//         saveState();

//         console.log(`🔄 Wiped ${node.name}`);
//         res.json(node);
//     } catch (err) {
//         console.error("❌ Wipe failed:", err);
//         res.status(500).json({ error: err.message });
//     }
// });


// // ---- DELETE NODE ----
// app.delete("/nodes/:id", async (req, res) => {
//     const idx = nodes.findIndex((n) => n.id === req.params.id);
//     if (idx === -1) return res.status(404).json({ error: "Node not found" });

//     const node = nodes[idx];
//     if (node.status === "running") {
//          const pid = runningProcs[node.id];
//         if (pid) {
//             try { process.kill(pid); } catch {}
//             delete runningProcs[node.id];
//         }
//     }
    
//     await deleteVncConnectionByName(node.name);
//     await safeDelete(node.overlayPath);

//     nodes.splice(idx, 1);
//     saveState();
//     console.log(`🗑 Deleted ${node.name}`);
//     res.json({ message: "Deleted" });
// });

// // ------------------ START SERVER ------------------

// // New function to find the admin user's ID on startup
// async function findGuacAdmin() {
//     try {
//         const res = await pool.query("SELECT entity_id FROM guacamole_entity WHERE name = 'guacadmin' AND type = 'USER'");
//         if (res.rows.length === 0) {
//             console.error("❌ CRITICAL: Could not find 'guacadmin' entity_id. Permissions will fail.");
//             return false;
//         }
//         guacAdminEntityId = res.rows[0].entity_id;
//         console.log(`✅ Found guacadmin entity_id: ${guacAdminEntityId}`);
//         return true;
//     } catch (err) {
//         console.error("❌ Failed to query for guacadmin:", err.message);
//         return false;
//     }
// }

// // New server startup logic to handle race condition
// async function startServer() {
//     let retries = 10;
//     while (retries > 0) {
//         try {
//             // Wait for DB to be ready
//             await pool.query("SELECT 1"); 
//             console.log("✅ Connected to PostgreSQL");

//             // --- **STALE CONNECTION FIX** ---
//             console.log("🧹 Clearing stale Guacamole connections...");
//             await pool.query("DELETE FROM guacamole_connection");
//             console.log("✅ Stale Guacamole connections cleared");
//             // --- END FIX ---

//             // Get the admin ID we need for permissions
//             const adminFound = await findGuacAdmin();
//             if (!adminFound) {
//                 console.error("Could not find guacadmin. This is bad.");
//             }

//             // Start the web server
//             app.listen(PORT, () =>
//                 console.log(`✅ Backend running on http://localhost:${PORT}`)
//             );
//             return; // Success, exit loop

//         } catch (err) {
//             console.error("❌ Failed to connect to PostgreSQL. Retrying in 5s...");
//             console.error(err.message);
//             retries--;
//             await new Promise(r => setTimeout(r, 5000)); // Wait 5s
//         }
//     }
//     console.error("❌ Exhausted all retries. Could not connect to database. Exiting.");
//     process.exit(1);
// }

// // Graceful shutdown
// process.on('SIGTERM', () => {
//     console.log('📴 SIGTERM received, shutting down gracefully...');
    
//     // Kill all running QEMU processes
//     Object.values(runningProcs).forEach(pid => {
//         try {
//             process.kill(pid, 'SIGTERM');
//         } catch (e) {
//             console.warn(`⚠️ Failed to kill PID ${pid}: ${e.message}`);
//         }
//     });
    
//     process.exit(0);
// });

// process.on('SIGINT', () => {
//     console.log('📴 SIGINT received, shutting down gracefully...');
    
//     // Kill all running QEMU processes
//     Object.values(runningProcs).forEach(pid => {
//         try {
//             process.kill(pid, 'SIGTERM');
//         } catch (e) {
//             console.warn(`⚠️ Failed to kill PID ${pid}: ${e.message}`);
//         }
//     });
    
//     process.exit(0);
// });

// startServer(); // Call the new startup function
const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const { spawn, exec, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

// ------------------ PATHS ------------------
const IMAGES_DIR = path.join(__dirname, "images"); // Relative to container
const OVERLAYS_DIR = path.join(__dirname, "overlays"); // Relative to container
const DATA_FILE = path.join(__dirname, "nodes.json");

const BASE_IMAGE = path.join(IMAGES_DIR, "base.qcow2");
const ROUTER_IMAGE = path.join(IMAGES_DIR, "router.qcow2");

if (!fs.existsSync(OVERLAYS_DIR))
    fs.mkdirSync(OVERLAYS_DIR, { recursive: true });

// ------------------ STATE ------------------
let nodes = [];
let counters = { pc: 0, router: 0 };
let runningProcs = {}; // Store running QEMU processes

// Start fresh each time
nodes = [];
counters = { pc: 0, router: 0 };
runningProcs = {};
saveState();
console.log("🧹 Cleared stale nodes, starting fresh");
// Clean up any old QEMU processes on start
try {
    console.log("Killing old QEMU processes...");
    execSync(`pkill -f qemu-system-x86_64`);
} catch (e) {
    console.warn("No old QEMU processes to kill.");
}

// ------------------ HELPERS ------------------
function saveState() {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ nodes, counters }, null, 2));
}

// Note: uniqueName is not used if frontend sends 'name'
function uniqueName(type) {
    const prefix = type === "router" ? "Router" : "PC";
    counters[type]++;
    return `${prefix}${counters[type]}`;
}

function runCommand(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (err, stdout, stderr) => {
            if (err) reject(stderr || err.message);
            else resolve(stdout);
        });
    });
}

async function detectFormat(imagePath) {
    try {
        const info = await runCommand(
            `qemu-img info --output=json "${imagePath}"`
        );
        return JSON.parse(info).format || "qcow2";
    } catch (e) {
        console.error(`Error detecting format for ${imagePath}:`, e);
        return "qcow2"; // Fallback
    }
}

function getDefaultInterfaces(type) {
    return type === "router"
        ? ["GigabitEthernet0/0", "GigabitEthernet0/1"]
        : ["eth0"];
}

async function safeDelete(file) {
    if (!fs.existsSync(file)) return;
    try {
        fs.unlinkSync(file);
    } catch (err) {
        console.warn(`⚠️ Error deleting ${file}: ${err.message}`);
    }
}

// --- Networking Helpers ---
function getMcastPortForLink(linkId) {
    const hash = crypto.createHash("md5").update(linkId).digest("hex");
    const port = 10000 + (parseInt(hash.substring(0, 4), 16) % 10000);
    return port;
}
function getMcastIpForLink(linkId) {
    const hash = crypto.createHash("md5").update(linkId).digest("hex");
    const ipPart = 1 + (parseInt(hash.substring(4, 6), 16) % 254);
    return `230.0.0.${ipPart}`;
}
function getMacForInterface(nodeId, ifaceName) {
    const hash = crypto
        .createHash("md5")
        .update(nodeId + ifaceName)
        .digest("hex");
    return `00:00:01:${hash.substring(0, 2)}:${hash.substring(
        2,
        4
    )}:${hash.substring(4, 6)}`;
}

// ------------------ GUAC SETUP ------------------
const pool = new Pool({
    host: "postgres", // DOCKER-UPDATE: Connect to service name
    port: 5432,
    database: "guacamole_db",
    user: "guacamole_user",
    password: "guacadmin",
});

let guacAdminEntityId = null; // Store the admin's ID

// *** TELNET/VNC FIX ***
async function registerGuacConnection(nodeName, protocol, port) {
    try {
        await deleteVncConnectionByName(nodeName); // Clear old connection

        const res = await pool.query(
            `INSERT INTO guacamole_connection (connection_name, protocol)
       VALUES ($1, $2) RETURNING connection_id`,
            [nodeName, protocol] // Use dynamic protocol
        );
        const connId = res.rows[0].connection_id;

        const params = [
            [connId, "hostname", "backend"],
            [connId, "port", String(port)],
        ];

        // Add Telnet-specific parameters
        if (protocol === 'telnet') {
            params.push([connId, "font-name", "monospace"]);
            params.push([connId, "font-size", "10"]);
        }

        for (const [cid, key, val] of params) {
            await pool.query(
                `INSERT INTO guacamole_connection_parameter (connection_id, parameter_name, parameter_value)
         VALUES ($1, $2, $3)`,
                [cid, key, val]
            );
        }

        // --- **PERMISSION FIX** ---
        if (guacAdminEntityId) {
            try {
                await pool.query(
                    `INSERT INTO guacamole_connection_permission (entity_id, connection_id, permission)
                     VALUES ($1, $2, 'READ')
                     ON CONFLICT (entity_id, connection_id, permission) DO NOTHING`,
                    [guacAdminEntityId, connId]
                );
                console.log(`🔵 Granted READ permission for ${nodeName} to guacadmin`);
            } catch (permErr) {
                console.error(`❌ Failed to grant permission: ${permErr.message}`);
            }
        } else {
            console.warn(`⚠️ guacAdminEntityId not set. Cannot grant permission for ${nodeName}.`);
        }
        // --- END PERMISSION FIX ---

        console.log(`🟢 Registered ${nodeName} → ${protocol}://backend:${port}`);
        return connId;
    } catch (err) {
        console.error("❌ Guac registration failed:", err.message);
        return null;
    }
}
// *** END TELNET/VNC FIX ***

async function deleteVncConnectionByName(name) {
    try {
        await pool.query(
            `DELETE FROM guacamole_connection WHERE connection_name = $1`,
            [name]
        );
        console.log(`🗑 Deleted Guac entry for ${name}`);
    } catch (err) {
        console.error(`⚠️ Guac deletion failed: ${err.message}`);
    }
}

// ------------------ ROUTES ------------------
app.get("/nodes", (_, res) => res.json(nodes));

// ---- CREATE NODE ----
app.post("/nodes", async (req, res) => {
    try {
        const { deviceType, name } = req.body;
        if (!deviceType || !name)
            return res.status(400).json({ error: "deviceType and name required" });

        const id = uuidv4();
        const baseImage = deviceType === "router" ? ROUTER_IMAGE : BASE_IMAGE;
        if (!fs.existsSync(baseImage))
            return res
                .status(400)
                .json({ error: `Base image missing: ${baseImage}` });

        const overlayPath = path.join(OVERLAYS_DIR, `${id}.qcow2`);
        const format = await detectFormat(baseImage);
        await runCommand(
            `qemu-img create -f qcow2 -b "${baseImage}" -F ${format} "${overlayPath}"`
        );

        const node = {
            id,
            name,
            deviceType,
            overlayPath,
            status: "stopped",
            protocol: null, // To store vnc/telnet
            port: null,
            guacamoleUrl: null,
            interfaces: getDefaultInterfaces(deviceType),
        };
        nodes.push(node);
        saveState();
        console.log(`🆕 Created ${deviceType}: ${name}`);
        res.status(201).json(node);
    } catch (err) {
        console.error("❌ Node creation failed:", err);
        res.status(500).json({ error: err.message });
    }
});

// ---- RUN NODE ----
app.post("/nodes/:id/run", async (req, res) => {
    try {
        const node = nodes.find((n) => n.id === req.params.id);
        if (!node) return res.status(404).json({ error: "Node not found" });
        if (node.status === "running") {
            console.warn(`⚠️ ${node.name} is already running.`);
            return res.status(200).json(node);
        }

        if (!fs.existsSync(node.overlayPath)) {
            console.warn(`⚠️ Overlay missing for ${node.name}, rebuilding...`);
            const base =
                node.deviceType === "router" ? ROUTER_IMAGE : BASE_IMAGE;
            const format = await detectFormat(base);
            await runCommand(
                `qemu-img create -f qcow2 -b "${base}" -F ${format} "${node.overlayPath}"`
            );
        }

        // --- **KVM FIX: Use virtio disk & -enable-kvm** ---
        const qemuArgs = [
            "-enable-kvm", // Force KVM
            "-drive", `file=${node.overlayPath},if=virtio,media=disk`, // Use virtio disk
            "-m", node.deviceType === "router" ? "2048" : "512", // 2GB for router, 512MB for PC
            "-display", "none",
            "-monitor", "none",
        ];
        // --- END KVM FIX ---

        let protocol, port, connId;

        // --- **TELNET/VNC FIX: Divert based on type** ---
        if (node.deviceType === 'router') {
            protocol = 'telnet';
            port = Math.floor(Math.random() * 50) + 23000; // Use port range 23000-23050
            qemuArgs.push("-serial", `telnet:0.0.0.0:${port},server,nowait`);
            console.log(`🚦 ${node.name} (Router) will use TELNET on port ${port}`);
        } else {
            protocol = 'vnc';
            const display = Math.floor(Math.random() * 50) + 1; // VNC display :1, :2, etc.
            port = 5900 + display;
            qemuArgs.push("-vnc", `0.0.0.0:${display}`);
            console.log(`🖥️ ${node.name} (PC) will use VNC on port ${port}`);
        }
        // --- END TELNET/VNC FIX ---

        // --- ADD NETWORKING ---
        const { connections } = req.body; 
        
        if (connections && connections.length > 0) {
            console.log(`🔌 Configuring networking for ${node.name}...`);
            for (const conn of connections) {
                const ifaceName = conn.interface;
                const netId = `net_${ifaceName.replace(/\//g, '_')}`; // Handle '/' in router iface names
                const mcastIp = getMcastIpForLink(conn.linkId);
                const mcastPort = getMcastPortForLink(conn.linkId);
                const mac = getMacForInterface(node.id, ifaceName);

                qemuArgs.push(
                    "-netdev",
                    `socket,id=${netId},mcast=${mcastIp}:${mcastPort}`,
                    "-device",
                    `e1000,netdev=${netId},mac=${mac}`
                );
            }
        } else {
            console.log(`💨 ${node.name} running with no network.`);
        }
        
        console.log(`Spawning QEMU with args: qemu-system-x86_64 ${qemuArgs.join(" ")}`);

        const proc = spawn("qemu-system-x86_64", qemuArgs, {
            detached: true,
            stdio: "ignore", 
        });
        proc.unref(); 
        runningProcs[node.id] = proc.pid;

        await new Promise((r) => setTimeout(r, 1500)); 
        
        // Use the new dynamic registration function
        connId = await registerGuacConnection(node.name, protocol, port);

        node.status = "running";
        node.protocol = protocol;
        node.port = port;
        node.guacamoleUrl = connId
            ? `http://localhost:8080/guacamole/#/client/${btoa(
                  `${connId}\0c\0postgres`
              )}`
            : null;
        saveState();

        console.log(`▶ ${node.name} (PID ${proc.pid}) running on ${protocol} port ${port}`);
        return res.status(200).json(node);
    } catch (err) {
        console.error("❌ Run failed:", err);
        res.status(500).json({ error: err.message });
    }
});

// ---- STOP NODE ----
app.post("/nodes/:id/stop", async (req, res) => {
    const node = nodes.find((n) => n.id === req.params.id);
    if (!node) return res.status(404).json({ error: "Node not found" });

    const pid = runningProcs[node.id];
    if (pid) {
        try {
            process.kill(pid); // Send SIGTERM
            console.log(`⏹ Stopped ${node.name} (PID ${pid})`);
        } catch (e) {
            console.warn(`⚠️ Failed to kill PID ${pid}: ${e.message}.`);
        }
        delete runningProcs[node.id];
    } else {
        console.warn(`⚠️ ${node.name} was not in runningProcs.`);
    }

    await deleteVncConnectionByName(node.name);

    node.status = "stopped";
    node.port = null;
    node.protocol = null;
    node.guacamoleUrl = null;
    saveState();
    res.json(node);
});

// ---- WIPE NODE ----
app.post("/nodes/:id/wipe", async (req, res) => {
    const node = nodes.find((n) => n.id === req.params.id);
    if (!node) return res.status(404).json({ error: "Node not found" });

    if (node.status === "running") {
        const pid = runningProcs[node.id];
        if (pid) {
            try { process.kill(pid); } catch (e) {}
            delete runningProcs[node.id];
        }
    }

    try {
        await safeDelete(node.overlayPath);
        const base = node.deviceType === "router" ? ROUTER_IMAGE : BASE_IMAGE;
        const format = await detectFormat(base);
        await runCommand(
            `qemu-img create -f qcow2 -b "${base}" -F ${format} "${overlayPath}"`
        );
        await deleteVncConnectionByName(node.name);

        node.status = "stopped";
        node.port = null;
        node.protocol = null;
        node.guacamoleUrl = null;
        saveState();

        console.log(`🔄 Wiped ${node.name}`);
        res.json(node);
    } catch (err) {
        console.error("❌ Wipe failed:", err);
        res.status(500).json({ error: err.message });
    }
});


// ---- DELETE NODE ----
app.delete("/nodes/:id", async (req, res) => {
    const idx = nodes.findIndex((n) => n.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Node not found" });

    const node = nodes[idx];
    if (node.status === "running") {
         const pid = runningProcs[node.id];
        if (pid) {
            try { process.kill(pid); } catch {}
            delete runningProcs[node.id];
        }
    }
    
    await deleteVncConnectionByName(node.name);
    await safeDelete(node.overlayPath);

    nodes.splice(idx, 1);
    saveState();
    console.log(`🗑 Deleted ${node.name}`);
    res.json({ message: "Deleted" });
});

// ------------------ START SERVER ------------------

async function findGuacAdmin() {
    try {
        const res = await pool.query("SELECT entity_id FROM guacamole_entity WHERE name = 'guacadmin' AND type = 'USER'");
        if (res.rows.length === 0) {
            console.error("❌ CRITICAL: Could not find 'guacadmin' entity_id. Permissions will fail.");
            return false;
        }
        guacAdminEntityId = res.rows[0].entity_id;
        console.log(`✅ Found guacadmin entity_id: ${guacAdminEntityId}`);
        return true;
    } catch (err) {
        console.error("❌ Failed to query for guacadmin:", err.message);
        return false;
    }
}

async function startServer() {
    let retries = 10;
    while (retries > 0) {
        try {
            // Wait for DB to be ready
            await pool.query("SELECT 1"); 
            console.log("✅ Connected to PostgreSQL");

            // Clear stale Guacamole connections
            try {
                await pool.query("DELETE FROM guacamole_connection");
                console.log("🧹 Stale Guacamole connections cleared");
            } catch (clearErr) {
                console.error("⚠️ Could not clear stale connections:", clearErr.message);
            }

            // Get the admin ID we need for permissions
            const adminFound = await findGuacAdmin();
            if (!adminFound) {
                console.error("Could not find guacadmin. This is bad.");
            }

            // Start the web server
            app.listen(PORT, () =>
                console.log(`✅ Backend running on http://localhost:${PORT}`)
            );
            return; // Success, exit loop

        } catch (err) {
            console.error("❌ Failed to connect to PostgreSQL. Retrying in 5s...");
            console.error(err.message);
            retries--;
            await new Promise(r => setTimeout(r, 5000)); // Wait 5s
        }
    }
    console.error("❌ Exhausted all retries. Could not connect to database. Exiting.");
    process.exit(1);
}

startServer(); // Call the new startup function
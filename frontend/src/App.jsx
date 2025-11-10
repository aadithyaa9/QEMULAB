import { useState, useCallback, useRef, useEffect, useMemo } from "react";
// 1. UPDATED: Import from 'reactflow' (v11/v12)
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Handle,
    Position,
} from "reactflow"; 
// 2. ADDED: Required CSS for reactflow
import "reactflow/dist/style.css"; 
import "./App.css";

// 3. CORRECTED: This is the robust way to import images in Vite
const routerImg = new URL("./images/router.png", import.meta.url).href;
const pcImg = new URL("./images/pc.png", import.meta.url).href;

const API_URL = "http://localhost:3001";

const devicePalette = [
    { type: "router", label: "Router", icon: "⚙️" },
    { type: "pc", label: "PC", icon: "🖥️" },
];

const deviceImages = {
    router: routerImg,
    pc: pcImg,
};

const deviceDimensions = {
    router: { w: 80, h: 80 },
    pc: { w: 70, h: 70 },
};

export default function App() {
    const [view, setView] = useState("home");
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [contextMenu, setContextMenu] = useState(null);
    const [linkMode, setLinkMode] = useState(false);
    const [selectedEndpoints, setSelectedEndpoints] = useState([]);
    const [showInterfaceModal, setShowInterfaceModal] = useState(null);
    const reactFlowWrapper = useRef(null);
    const refreshInterval = useRef(null);

    // Load nodes from backend with auto-refresh
    const loadNodes = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/nodes`);
            const data = await res.json();
            
            setNodes((prevNodes) => 
                data.map((n, i) => {
                    const existing = prevNodes.find(pn => pn.id === n.id);
                    return {
                        id: n.id,
                        type: n.deviceType || "router",
                        position: existing ? existing.position : { x: 150 + i * 250, y: 100 },
                        data: n,
                    };
                })
            );

        } catch (e) {
            console.error("Failed to load nodes:", e);
        }
    }, [setNodes]);

    useEffect(() => {
        loadNodes();
        // Auto-refresh every 3 seconds when in topology view
        if (view === "topology") {
            refreshInterval.current = setInterval(loadNodes, 3000);
        }
        return () => {
            if (refreshInterval.current) {
                clearInterval(refreshInterval.current);
            }
        };
    }, [view, loadNodes]);

    // Handle actions (run, stop, wipe) with connection data
    const handleRun = async (node) => {
        try {
            // Find all edges connected to this node
            const connectedEdges = edges.filter(
                (e) => e.source === node.id || e.target === node.id
            );
            
            // Format connections for the backend
            const connections = connectedEdges.map((e) => {
                const isSource = e.source === node.id;
                return {
                    interface: isSource ? e.sourceHandle : e.targetHandle,
                    linkId: e.id,
                    remoteNode: isSource ? e.target : e.source,
                    remoteInterface: isSource ? e.targetHandle : e.sourceHandle,
                };
            });

            const res = await fetch(`${API_URL}/nodes/${node.id}/run`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ connections }),
            });
            
            const updated = await res.json();
            setNodes((nds) =>
                nds.map((n) => (n.id === node.id ? { ...n, data: updated } : n))
            );
        } catch (e) {
            console.error("Failed to run node:", e);
        }
    };

    const handleAction = async (action, nodeId) => {
        try {
            const res = await fetch(`${API_URL}/nodes/${nodeId}/${action}`, {
                method: "POST",
            });
            const updated = await res.json();
            setNodes((nds) =>
                nds.map((n) => (n.id === nodeId ? { ...n, data: updated } : n))
            );
        } catch (e) {
            console.error(e);
        }
    };

    const deleteNode = async (nodeId) => {
        // Use a simple prompt for confirmation
        const isConfirmed = window.confirm("Are you sure you want to delete this node?");
        if (!isConfirmed) return;
        
        try {
            await fetch(`${API_URL}/nodes/${nodeId}`, { method: "DELETE" });
            setNodes((nds) => nds.filter((n) => n.id !== nodeId));
            setEdges((eds) =>
                eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
            );
        } catch (e) {
            console.error("Failed to delete node:", e);
        }
    };

    // Handle drag-drop creation
    const onDrop = useCallback(
        async (event) => {
            event.preventDefault();
            const type = event.dataTransfer.getData("application/reactflow");
            if (!type) return;

            const bounds = reactFlowWrapper.current.getBoundingClientRect();
            const position = {
                x: event.clientX - bounds.left - 40,
                y: event.clientY - bounds.top - 40,
            };

            const name = prompt(`Enter name for ${type}:`);
            if (!name) return;

            try {
                const res = await fetch(`${API_URL}/nodes`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, deviceType: type }),
                });
                const node = await res.json();

                setNodes((nds) =>
                    nds.concat({
                        id: node.id,
                        type,
                        position,
                        data: node,
                    })
                );
            } catch (e) {
                console.error("Failed to create node:", e);
            }
        },
        [setNodes]
    );

    const onDragOver = useCallback((e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    }, []);

    // ========== Cable Mode ==========
    const handleDeviceClick = (node) => {
        if (!linkMode) {
            // Open console if running
            if (node.data.status === "running" && node.data.guacamoleUrl) {
                window.open(node.data.guacamoleUrl, "_blank");
            }
            return;
        }
        
        // Start cabling process - get interfaces from server data or use defaults
        const interfaces = node.data.interfaces || 
            (node.type === "router"
                ? ["GigabitEthernet0/0", "GigabitEthernet0/1"]
                : ["eth0"]);
        
        // Find interfaces already used by existing edges
        const usedIfaces = edges
            .filter((e) => e.source === node.id || e.target === node.id)
            .map((e) =>
                e.source === node.id ? e.sourceHandle : e.targetHandle
            );

        const freeIfaces = interfaces.map((iface) => ({
            name: iface,
            used: usedIfaces.includes(iface),
        }));

        setShowInterfaceModal({ node, freeIfaces });
    };

    const chooseInterface = (iface) => {
        if (!showInterfaceModal) return;
        const { node } = showInterfaceModal;
        const newSel = [...selectedEndpoints, { 
            nodeId: node.id, 
            iface, 
            nodeType: node.type 
        }];
        setShowInterfaceModal(null);

        if (newSel.length === 2) {
            const [a, b] = newSel;
            const newEdge = {
                id: `edge-${a.nodeId}-${b.nodeId}-${Date.now()}`,
                source: a.nodeId,
                target: b.nodeId,
                sourceHandle: a.iface,
                targetHandle: b.iface,
                type: "smoothstep",
                animated: a.nodeType === 'router' && b.nodeType === 'router', // Animate router-router links
                style: { stroke: "#00d4ff", strokeWidth: 2 },
                label: `${a.iface} ↔ ${b.iface}`,
                labelBgStyle: { fill: "#000", color: "#fff", opacity: 0.7 },
            };

            setEdges((eds) => [...eds, newEdge]);
            setSelectedEndpoints([]);
            setLinkMode(false);
            document.body.style.cursor = "default";
        } else {
            setSelectedEndpoints(newSel);
        }
    };
    
    const cancelLinkMode = () => {
        setLinkMode(false);
        setSelectedEndpoints([]);
        setShowInterfaceModal(null);
        document.body.style.cursor = "default";
    };

    const toggleCableMode = () => {
        if (linkMode) {
            cancelLinkMode();
        } else {
            setLinkMode(true);
            document.body.style.cursor = "crosshair";
        }
    };

    // ========== Context Menu ==========
    const onNodeContextMenu = useCallback((event, node) => {
        event.preventDefault();
        setContextMenu({ node, x: event.clientX, y: event.clientY });
    }, []);

    const handleMenuAction = async (action) => {
        if (!contextMenu) return;
        const { node } = contextMenu;
        
        switch (action) {
            case "run":
                await handleRun(node);
                break;
            case "stop":
            case "wipe":
                await handleAction(action, node.id);
                break;
            case "console":
                if (node.data.status === "running" && node.data.guacamoleUrl) {
                    window.open(node.data.guacamoleUrl, "_blank");
                } else {
                    // Simple alert, as requested to avoid window.alert
                    console.warn("Node must be running to access console");
                }
                break;
            case "delete":
                await deleteNode(node.id);
                break;
        }
        setContextMenu(null);
    };

    // ========== Node Components (with invisible Handles) ==========
    // Define CustomNode outside of App component to prevent re-creation
    const CustomNode = useCallback(({ id, type, data }) => {
        const dimensions = deviceDimensions[type] || { w: 60, h: 60 };
        const img = deviceImages[type];
        const isRunning = data.status === "running";
        const isStopped = data.status === "stopped";

        // Get interfaces from server or use defaults
        const interfaces = data.interfaces || 
            (type === "router"
                ? ["GigabitEthernet0/0", "GigabitEthernet0/1"]
                : ["eth0"]);

        return (
            <div
                className={`custom-node ${isRunning ? "node-running" : isStopped ? "node-stopped" : "node-idle"}`}
                style={{
                    cursor: linkMode ? "crosshair" : "pointer",
                    border: isRunning
                        ? "3px solid #10b981"
                        : isStopped 
                        ? "3px solid #ef4444" 
                        : "3px solid transparent",
                    borderRadius: "12px",
                    padding: "8px",
                    textAlign: "center",
                    color: "#fff",
                    background: "rgba(26, 26, 46, 0.7)",
                    backdropFilter: "blur(10px)",
                    position: "relative",
                }}
                onClick={() => handleDeviceClick({ id, data, type })}
                onContextMenu={(e) => onNodeContextMenu(e, { id, data, type })}>
                <img
                    src={img}
                    alt={type}
                    width={dimensions.w}
                    height={dimensions.h}
                    style={{ 
                        filter: isRunning ? "brightness(1.2)" : "brightness(0.8)",
                        transition: "filter 0.3s ease"
                    }}
                />
                <div className="node-name" style={{ 
                    marginTop: "8px",
                    fontWeight: "600",
                    fontSize: "14px"
                }}>
                    {data.name}
                </div>
                {data.status && (
                    <div style={{ 
                        fontSize: "11px",
                        color: isRunning ? "#10b981" : isStopped ? "#ef4444" : "#6b7280",
                        marginTop: "4px",
                        textTransform: "uppercase",
                        fontWeight: "700"
                    }}>
                        {data.status}
                    </div>
                )}

                {/* Invisible Handles for cabling */}
                {interfaces.map((iface, i) => (
                    <Handle
                        key={`${iface}-source`}
                        type="source"
                        position={i % 2 === 0 ? Position.Left : Position.Right}
                        id={iface}
                        style={{
                            top: `${30 + i * 20}%`,
                            opacity: 0,
                            background: "red",
                            width: "10px",
                            height: "10px",
                        }}
                    />
                ))}
                {interfaces.map((iface, i) => (
                    <Handle
                        key={`${iface}-target`}
                        type="target"
                        position={i % 2 === 0 ? Position.Left : Position.Right}
                        id={iface}
                        style={{
                            top: `${30 + i * 20}%`,
                            opacity: 0,
                            background: "blue",
                            width: "10px",
                            height: "10px",
                        }}
                    />
                ))}
            </div>
        );
    }, [linkMode, edges]); // Memoize based on linkMode and edges

    const nodeTypes = useMemo(
        () => ({
            router: CustomNode,
            pc: CustomNode,
        }),
        [CustomNode] // Only re-create if CustomNode function itself changes
    );

    // ========== UI ==========
    return (
        <div className="App" onClick={() => contextMenu && setContextMenu(null)}>
            {view === "home" && (
                <div className="home-container">
                    <header className="header">
                        <h1>Network Lab</h1>
                        <p>Design and simulate your virtual network</p>
                    </header>

                    <div className="create-section">
                        <button
                            onClick={() => setView("topology")}
                            className="btn-create">
                            🧩 Open Topology Builder
                        </button>
                    </div>
                    
                    <div className="features-section">
                        <div className="feature">
                            <span className="feature-icon">🖥️</span>
                            <h3>Virtual Machines</h3>
                            <p>Create and manage QEMU-based VMs</p>
                        </div>
                        <div className="feature">
                            <span className="feature-icon">🔌</span>
                            <h3>Network Topology</h3>
                            <p>Connect devices with virtual cables</p>
                        </div>
                        <div className="feature">
                            <span className="feature-icon">💻</span>
                            <h3>Browser Console</h3>
                            <p>Access VMs via Guacamole in your browser</p>
                        </div>
                    </div>
                </div>
            )}

            {view === "topology" && (
                <div className="topology-fullscreen" ref={reactFlowWrapper}>
                    <div className="topbar">
                        <button
                            className="btn-home"
                            onClick={() => setView("home")}>
                            🏠 Home
                        </button>
                    </div>

                    <div className="palette">
                        <h3>Devices</h3>
                        {devicePalette.map((item) => (
                            <div
                                key={item.type}
                                className="palette-item"
                                draggable
                                onDragStart={(e) =>
                                    e.dataTransfer.setData(
                                        "application/reactflow",
                                        item.type
                                    )
                                }>
                                <span className="palette-icon">
                                    {item.icon}
                                </span>
                                <span>{item.label}</span>
                            </div>
                        ))}
                        <div
                            className={`palette-item cable-item ${linkMode ? "active" : ""}`}
                            onClick={toggleCableMode}>
                            <span className="palette-icon">🔌</span>
                            <span>Cable</span>
                        </div>
                        {linkMode && (
                            <div className="cable-hint" onClick={cancelLinkMode}>
                                Click two devices to link
                                <br />
                                <span style={{ fontSize: "0.8em", cursor: "pointer" }}>
                                    (Cancel)
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="topology-canvas">
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            nodeTypes={nodeTypes}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onDrop={onDrop}
                            onDragOver={onDragOver}
                            fitView>
                            <Background color="#00d4ff" gap={16} />
                            <MiniMap 
                                nodeColor={(node) => {
                                    if (node.data.status === "running") return "#10b981";
                                    if (node.data.status === "stopped") return "#ef4444";
                                    return "#6b7280";
                                }}
                            />
                            <Controls />
                        </ReactFlow>
                    </div>

                    {contextMenu && (
                        <div
                            className="context-menu"
                            style={{
                                top: contextMenu.y,
                                left: contextMenu.x,
                            }}>
                            <button onClick={() => handleMenuAction("run")}>
                                ▶ Run
                            </button>
                            <button onClick={() => handleMenuAction("stop")}>
                                ⏹ Stop
                            </button>
                            <button onClick={() => handleMenuAction("console")}>
                                💻 Console
                            </button>
                            <button onClick={() => handleMenuAction("wipe")}>
                                🔄 Wipe
                            </button>
                            <button onClick={() => handleMenuAction("delete")}>
                                🗑 Delete
                            </button>
                        </div>
                    )}

                    {showInterfaceModal && (
                        <div className="interface-modal">
                            <div className="modal-content">
                                <h3>Select Interface for {showInterfaceModal.node.data.name}:</h3>
                                {showInterfaceModal.freeIfaces.map((iface) => (
                                    <button
                                        key={iface.name}
                                        className="iface-btn"
                                        onClick={() =>
                                            !iface.used &&
                                            chooseInterface(iface.name)
                                        }
                                        disabled={iface.used}>
                                        {iface.name}{" "}
                                        {iface.used ? "(in use)" : ""}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setShowInterfaceModal(null)}
                                    className="cancel-btn"
                                    style={{ marginTop: "10px", background: "#555" }}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
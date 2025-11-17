/**
 * ============================================================================
 * DARK MATTER JS - MULTIPLAYER SERVER
 * ============================================================================
 * 
 * WebSocket server for handling multiplayer game connections.
 * Supports:
 * - Player connection management
 * - Game state synchronization
 * - Room/Lobby system
 * - Custom message routing
 * - Time synchronization
 * 
 * USAGE:
 * node server.js [port]
 * 
 * Default port: 8080
 * ============================================================================
 */

const WebSocket = require('ws');
const http = require('http');
const url = require('url');

// Configuration
const PORT = process.argv[2] || 8080;
const TICK_RATE = 20; // Server updates per second
const TIME_SYNC_INTERVAL = 5000; // Sync time every 5 seconds

// Create HTTP server
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Dark Matter JS Multiplayer Server\n');
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Server state
const clients = new Map(); // Map of ws -> client data
const players = new Map(); // Map of playerId -> player data
const rooms = new Map(); // Map of roomId -> room data
const networkedObjects = new Map(); // Map of networkId -> object data

let nextPlayerId = 1;
let nextRoomId = 1;
let nextNetworkId = 1;

console.log(`[Server] Starting Dark Matter JS Multiplayer Server on port ${PORT}...`);

// ============================================================================
// WebSocket Connection Handling
// ============================================================================

wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`[Server] New connection from ${clientIp}`);
    
    // Initialize client data
    const clientData = {
        ws: ws,
        playerId: null,
        playerName: 'Player',
        roomId: null,
        lastActivity: Date.now(),
        connectedAt: Date.now()
    };
    
    clients.set(ws, clientData);
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            handleMessage(ws, data);
            clientData.lastActivity = Date.now();
        } catch (error) {
            console.error('[Server] Error parsing message:', error);
        }
    });
    
    ws.on('close', () => {
        handleDisconnect(ws);
    });
    
    ws.on('error', (error) => {
        console.error('[Server] WebSocket error:', error);
    });
});

// ============================================================================
// Message Handling
// ============================================================================

function handleMessage(ws, message) {
    const { type, data } = message;
    const client = clients.get(ws);
    
    if (!client) return;
    
    switch (type) {
        case 'join':
            handleJoin(ws, data);
            break;
            
        case 'updateState':
            handleUpdateState(ws, data);
            break;
            
        case 'spawn':
            handleSpawn(ws, data);
            break;
            
        case 'destroy':
            handleDestroy(ws, data);
            break;
            
        case 'createRoom':
            handleCreateRoom(ws, data);
            break;
            
        case 'joinRoom':
            handleJoinRoom(ws, data);
            break;
            
        case 'leaveRoom':
            handleLeaveRoom(ws, data);
            break;
            
        case 'getRoomList':
            handleGetRoomList(ws);
            break;
            
        default:
            // Forward custom messages to room members
            if (client.roomId) {
                broadcastToRoom(client.roomId, {
                    type: type,
                    data: data,
                    senderId: client.playerId
                }, ws);
            }
            break;
    }
}

function handleJoin(ws, data) {
    const client = clients.get(ws);
    if (!client) return;
    
    // Assign player ID
    const playerId = `player_${nextPlayerId++}`;
    client.playerId = playerId;
    client.playerName = data.playerName || 'Player';
    
    // Create player data
    const playerData = {
        playerId: playerId,
        playerName: client.playerName,
        connectedAt: client.connectedAt,
        roomId: null
    };
    
    players.set(playerId, playerData);
    
    // Send welcome message
    send(ws, {
        type: 'welcome',
        data: {
            playerId: playerId,
            serverTime: Date.now(),
            serverVersion: '1.0.0'
        }
    });
    
    console.log(`[Server] Player joined: ${playerId} (${client.playerName})`);
}

function handleUpdateState(ws, data) {
    const client = clients.get(ws);
    if (!client || !client.playerId) return;
    
    // Update networked objects owned by this player
    if (data.objects) {
        for (const objData of data.objects) {
            networkedObjects.set(objData.networkId, {
                ...objData,
                ownerId: client.playerId,
                lastUpdate: Date.now()
            });
        }
    }
    
    // Broadcast state to room members
    if (client.roomId) {
        broadcastToRoom(client.roomId, {
            type: 'gameState',
            data: {
                objects: data.objects,
                senderId: client.playerId
            }
        }, ws);
    }
}

function handleSpawn(ws, data) {
    const client = clients.get(ws);
    if (!client || !client.playerId) return;
    
    // Generate network ID
    const networkId = `obj_${nextNetworkId++}`;
    
    // Create networked object
    const objData = {
        networkId: networkId,
        prefabName: data.prefabName,
        x: data.x,
        y: data.y,
        ownerId: client.playerId,
        data: data.data || {},
        createdAt: Date.now()
    };
    
    networkedObjects.set(networkId, objData);
    
    // Broadcast spawn to all room members
    if (client.roomId) {
        broadcastToRoom(client.roomId, {
            type: 'spawn',
            data: objData
        });
    }
    
    console.log(`[Server] Spawned object: ${networkId} by ${client.playerId}`);
}

function handleDestroy(ws, data) {
    const client = clients.get(ws);
    if (!client || !client.playerId) return;
    
    const obj = networkedObjects.get(data.networkId);
    
    // Verify ownership
    if (obj && obj.ownerId === client.playerId) {
        networkedObjects.delete(data.networkId);
        
        // Broadcast destruction to room members
        if (client.roomId) {
            broadcastToRoom(client.roomId, {
                type: 'destroy',
                data: { networkId: data.networkId }
            });
        }
        
        console.log(`[Server] Destroyed object: ${data.networkId}`);
    }
}

function handleCreateRoom(ws, data) {
    const client = clients.get(ws);
    if (!client || !client.playerId) return;
    
    const roomId = `room_${nextRoomId++}`;
    const room = {
        roomId: roomId,
        roomName: data.roomName || `Room ${nextRoomId}`,
        hostId: client.playerId,
        maxPlayers: data.maxPlayers || 4,
        isPrivate: data.isPrivate || false,
        players: new Set([client.playerId]),
        createdAt: Date.now()
    };
    
    rooms.set(roomId, room);
    client.roomId = roomId;
    
    const player = players.get(client.playerId);
    if (player) {
        player.roomId = roomId;
    }
    
    send(ws, {
        type: 'roomCreated',
        data: {
            roomId: roomId,
            roomName: room.roomName,
            hostId: room.hostId
        }
    });
    
    console.log(`[Server] Room created: ${roomId} by ${client.playerId}`);
}

function handleJoinRoom(ws, data) {
    const client = clients.get(ws);
    if (!client || !client.playerId) return;
    
    const room = rooms.get(data.roomId);
    
    if (!room) {
        send(ws, {
            type: 'error',
            data: { message: 'Room not found' }
        });
        return;
    }
    
    if (room.players.size >= room.maxPlayers) {
        send(ws, {
            type: 'error',
            data: { message: 'Room is full' }
        });
        return;
    }
    
    // Leave current room if any
    if (client.roomId) {
        handleLeaveRoom(ws, { roomId: client.roomId });
    }
    
    // Join new room
    room.players.add(client.playerId);
    client.roomId = data.roomId;
    
    const player = players.get(client.playerId);
    if (player) {
        player.roomId = data.roomId;
    }
    
    send(ws, {
        type: 'roomJoined',
        data: {
            roomId: data.roomId,
            roomName: room.roomName,
            hostId: room.hostId,
            playerCount: room.players.size
        }
    });
    
    // Notify other players
    broadcastToRoom(data.roomId, {
        type: 'playerJoined',
        data: {
            playerId: client.playerId,
            playerName: client.playerName
        }
    }, ws);
    
    // Send existing room state to new player
    const roomObjects = Array.from(networkedObjects.values()).filter(obj => {
        const ownerClient = Array.from(clients.values()).find(c => c.playerId === obj.ownerId);
        return ownerClient && ownerClient.roomId === data.roomId;
    });
    
    if (roomObjects.length > 0) {
        send(ws, {
            type: 'gameState',
            data: { objects: roomObjects }
        });
    }
    
    console.log(`[Server] Player ${client.playerId} joined room: ${data.roomId}`);
}

function handleLeaveRoom(ws, data) {
    const client = clients.get(ws);
    if (!client || !client.playerId) return;
    
    const roomId = data.roomId || client.roomId;
    if (!roomId) return;
    
    const room = rooms.get(roomId);
    if (room) {
        room.players.delete(client.playerId);
        
        // Notify other players
        broadcastToRoom(roomId, {
            type: 'playerLeft',
            data: { playerId: client.playerId }
        }, ws);
        
        // Delete room if empty or host left
        if (room.players.size === 0 || room.hostId === client.playerId) {
            rooms.delete(roomId);
            console.log(`[Server] Room deleted: ${roomId}`);
        }
    }
    
    client.roomId = null;
    
    const player = players.get(client.playerId);
    if (player) {
        player.roomId = null;
    }
    
    send(ws, {
        type: 'roomLeft',
        data: { roomId: roomId }
    });
    
    console.log(`[Server] Player ${client.playerId} left room: ${roomId}`);
}

function handleGetRoomList(ws) {
    const roomList = Array.from(rooms.values())
        .filter(room => !room.isPrivate)
        .map(room => ({
            roomId: room.roomId,
            roomName: room.roomName,
            playerCount: room.players.size,
            maxPlayers: room.maxPlayers,
            hostId: room.hostId
        }));
    
    send(ws, {
        type: 'roomList',
        data: { rooms: roomList }
    });
}

function handleDisconnect(ws) {
    const client = clients.get(ws);
    if (!client) return;
    
    console.log(`[Server] Player disconnected: ${client.playerId || 'unknown'}`);
    
    // Leave room
    if (client.roomId) {
        handleLeaveRoom(ws, { roomId: client.roomId });
    }
    
    // Remove player's networked objects
    if (client.playerId) {
        for (const [networkId, obj] of networkedObjects.entries()) {
            if (obj.ownerId === client.playerId) {
                networkedObjects.delete(networkId);
            }
        }
        
        players.delete(client.playerId);
    }
    
    clients.delete(ws);
}

// ============================================================================
// Utility Functions
// ============================================================================

function send(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}

function broadcast(message, exclude = null) {
    for (const [ws, client] of clients.entries()) {
        if (ws !== exclude) {
            send(ws, message);
        }
    }
}

function broadcastToRoom(roomId, message, exclude = null) {
    const room = rooms.get(roomId);
    if (!room) return;
    
    for (const [ws, client] of clients.entries()) {
        if (client.roomId === roomId && ws !== exclude) {
            send(ws, message);
        }
    }
}

// ============================================================================
// Server Tick Loop
// ============================================================================

setInterval(() => {
    // Clean up stale objects
    const now = Date.now();
    const STALE_TIME = 30000; // 30 seconds
    
    for (const [networkId, obj] of networkedObjects.entries()) {
        if (now - obj.lastUpdate > STALE_TIME) {
            networkedObjects.delete(networkId);
        }
    }
}, 10000);

// ============================================================================
// Time Synchronization
// ============================================================================

setInterval(() => {
    const message = {
        type: 'timeSync',
        data: { serverTime: Date.now() }
    };
    
    broadcast(message);
}, TIME_SYNC_INTERVAL);

// ============================================================================
// Start Server
// ============================================================================

server.listen(PORT, () => {
    console.log(`[Server] Dark Matter JS Multiplayer Server running on port ${PORT}`);
    console.log(`[Server] WebSocket URL: ws://localhost:${PORT}`);
    console.log(`[Server] Press Ctrl+C to stop`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[Server] Shutting down...');
    
    // Notify all clients
    broadcast({
        type: 'serverShutdown',
        data: { message: 'Server is shutting down' }
    });
    
    // Close all connections
    wss.clients.forEach(ws => ws.close());
    
    server.close(() => {
        console.log('[Server] Server stopped');
        process.exit(0);
    });
});
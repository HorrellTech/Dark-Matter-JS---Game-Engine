/**
 * ============================================================================
 * MULTIPLAYER MANAGER
 * ============================================================================
 * 
 * Handles client-side multiplayer functionality including:
 * - WebSocket connection management
 * - Player synchronization
 * - Network object replication
 * - Client-side prediction
 * - Lag compensation
 * - Lobby management
 * 
 * USAGE:
 * 
 * // Initialize multiplayer
 * engine.multiplayer.connect('ws://localhost:8080');
 * 
 * // Create a networked game object
 * const player = engine.scene.addGameObject('Player', 100, 100);
 * player.isNetworked = true;
 * player.networkOwner = engine.multiplayer.playerId;
 * 
 * // Send custom messages
 * engine.multiplayer.send('chat', { message: 'Hello!' });
 * 
 * // Listen for custom messages
 * engine.multiplayer.on('chat', (data) => {
 *     console.log('Chat:', data.message);
 * });
 * 
 * ============================================================================
 */

class MultiplayerManager {
    constructor(engine) {
        this.engine = engine;
        this.socket = null;
        this.connected = false;
        this.playerId = null;
        this.players = new Map(); // Map of playerId -> player data
        this.networkedObjects = new Map(); // Map of networkId -> GameObject
        this.pendingSpawns = [];
        
        // Network settings
        this.serverUrl = '';
        this.updateRate = 20; // Updates per second to send to server
        this.lastUpdateTime = 0;
        this.interpolationDelay = 100; // ms to delay for smooth interpolation
        
        // Client-side prediction
        this.enablePrediction = true;
        this.inputSequenceNumber = 0;
        this.pendingInputs = [];
        
        // Synchronization state
        this.serverTime = 0;
        this.clientTime = 0;
        this.timeOffset = 0;
        
        // Event handlers
        this.eventHandlers = new Map();
        
        // Room/Lobby system
        this.currentRoom = null;
        this.roomList = [];
        
        // Automatic sync for game objects
        this.autoSyncEnabled = true;
        this.syncProperties = ['x', 'y', 'rotation', 'scaleX', 'scaleY', 'velocityX', 'velocityY'];
        
        console.log('[Multiplayer] Manager initialized');
    }
    
    /**
     * Connect to multiplayer server
     */
    connect(serverUrl, options = {}) {
        if (this.connected) {
            console.warn('[Multiplayer] Already connected');
            return;
        }
        
        this.serverUrl = serverUrl;
        this.socket = new WebSocket(serverUrl);
        
        this.socket.onopen = () => {
            console.log('[Multiplayer] Connected to server');
            this.connected = true;
            this._trigger('connected');
            
            // Send initial join message
            this.send('join', {
                playerName: options.playerName || 'Player',
                gameVersion: options.gameVersion || '1.0.0'
            });
        };
        
        this.socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this._handleMessage(message);
            } catch (error) {
                console.error('[Multiplayer] Error parsing message:', error);
            }
        };
        
        this.socket.onerror = (error) => {
            console.error('[Multiplayer] WebSocket error:', error);
            this._trigger('error', error);
        };
        
        this.socket.onclose = () => {
            console.log('[Multiplayer] Disconnected from server');
            this.connected = false;
            this._trigger('disconnected');
            this._cleanup();
        };
    }
    
    /**
     * Disconnect from server
     */
    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this._cleanup();
    }
    
    /**
     * Send a message to the server
     */
    send(type, data = {}) {
        if (!this.connected || !this.socket) {
            console.warn('[Multiplayer] Cannot send - not connected');
            return;
        }
        
        const message = {
            type: type,
            data: data,
            timestamp: Date.now()
        };
        
        this.socket.send(JSON.stringify(message));
    }
    
    /**
     * Register event handler
     */
    on(eventName, callback) {
        if (!this.eventHandlers.has(eventName)) {
            this.eventHandlers.set(eventName, []);
        }
        this.eventHandlers.get(eventName).push(callback);
    }
    
    /**
     * Unregister event handler
     */
    off(eventName, callback) {
        if (!this.eventHandlers.has(eventName)) return;
        
        const handlers = this.eventHandlers.get(eventName);
        const index = handlers.indexOf(callback);
        if (index > -1) {
            handlers.splice(index, 1);
        }
    }
    
    /**
     * Update function called by engine every frame
     */
    update(deltaTime) {
        if (!this.connected) return;
        
        this.clientTime += deltaTime;
        
        // Send periodic updates to server
        const now = Date.now();
        if (now - this.lastUpdateTime >= 1000 / this.updateRate) {
            this._sendGameState();
            this.lastUpdateTime = now;
        }
        
        // Interpolate networked objects
        this._interpolateNetworkedObjects(deltaTime);
    }
    
    /**
     * Spawn a networked game object
     */
    spawnNetworkedObject(prefabName, x, y, data = {}) {
        if (!this.connected) {
            console.warn('[Multiplayer] Cannot spawn - not connected');
            return null;
        }
        
        this.send('spawn', {
            prefabName: prefabName,
            x: x,
            y: y,
            data: data
        });
        
        return null; // Object will be created when server confirms
    }
    
    /**
     * Register a game object for network synchronization
     */
    registerNetworkedObject(gameObject, isOwned = true) {
        if (!gameObject.networkId) {
            gameObject.networkId = this._generateNetworkId();
        }
        
        gameObject.isNetworked = true;
        gameObject.networkOwner = isOwned ? this.playerId : null;
        gameObject.lastNetworkUpdate = Date.now();
        gameObject.targetState = null; // For interpolation
        
        this.networkedObjects.set(gameObject.networkId, gameObject);
        
        console.log(`[Multiplayer] Registered networked object: ${gameObject.networkId}`);
    }
    
    /**
     * Unregister a networked game object
     */
    unregisterNetworkedObject(gameObject) {
        if (gameObject.networkId && this.networkedObjects.has(gameObject.networkId)) {
            this.networkedObjects.delete(gameObject.networkId);
            
            // Notify server of destruction
            if (gameObject.networkOwner === this.playerId) {
                this.send('destroy', {
                    networkId: gameObject.networkId
                });
            }
        }
    }
    
    /**
     * Create or join a room
     */
    createRoom(roomName, maxPlayers = 4, isPrivate = false) {
        this.send('createRoom', {
            roomName: roomName,
            maxPlayers: maxPlayers,
            isPrivate: isPrivate
        });
    }
    
    joinRoom(roomId) {
        this.send('joinRoom', { roomId: roomId });
    }
    
    leaveRoom() {
        if (this.currentRoom) {
            this.send('leaveRoom', { roomId: this.currentRoom });
        }
    }
    
    getRoomList() {
        this.send('getRoomList');
    }
    
    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================
    
    _handleMessage(message) {
        const { type, data } = message;
        
        switch (type) {
            case 'welcome':
                this._handleWelcome(data);
                break;
                
            case 'playerJoined':
                this._handlePlayerJoined(data);
                break;
                
            case 'playerLeft':
                this._handlePlayerLeft(data);
                break;
                
            case 'gameState':
                this._handleGameState(data);
                break;
                
            case 'spawn':
                this._handleSpawn(data);
                break;
                
            case 'destroy':
                this._handleDestroy(data);
                break;
                
            case 'roomCreated':
                this._handleRoomCreated(data);
                break;
                
            case 'roomJoined':
                this._handleRoomJoined(data);
                break;
                
            case 'roomLeft':
                this._handleRoomLeft(data);
                break;
                
            case 'roomList':
                this._handleRoomList(data);
                break;
                
            case 'timeSync':
                this._handleTimeSync(data);
                break;
                
            default:
                // Custom message type - trigger event handlers
                this._trigger(type, data);
                break;
        }
    }
    
    _handleWelcome(data) {
        this.playerId = data.playerId;
        this.serverTime = data.serverTime;
        this.timeOffset = Date.now() - data.serverTime;
        
        console.log(`[Multiplayer] Assigned player ID: ${this.playerId}`);
        this._trigger('welcome', data);
    }
    
    _handlePlayerJoined(data) {
        this.players.set(data.playerId, data);
        console.log(`[Multiplayer] Player joined: ${data.playerId}`);
        this._trigger('playerJoined', data);
    }
    
    _handlePlayerLeft(data) {
        this.players.delete(data.playerId);
        
        // Remove all objects owned by this player
        for (const [networkId, obj] of this.networkedObjects.entries()) {
            if (obj.networkOwner === data.playerId) {
                this.networkedObjects.delete(networkId);
                if (this.engine.scene && obj.scene === this.engine.scene) {
                    this.engine.scene.removeGameObject(obj);
                }
            }
        }
        
        console.log(`[Multiplayer] Player left: ${data.playerId}`);
        this._trigger('playerLeft', data);
    }
    
    _handleGameState(data) {
        if (!data.objects) return;
        
        // Update networked objects from server state
        for (const objData of data.objects) {
            const obj = this.networkedObjects.get(objData.networkId);
            
            if (obj) {
                // Skip if we own this object (client-side prediction)
                if (obj.networkOwner === this.playerId && this.enablePrediction) {
                    continue;
                }
                
                // Store target state for interpolation
                obj.targetState = {
                    x: objData.x,
                    y: objData.y,
                    rotation: objData.rotation,
                    scaleX: objData.scaleX,
                    scaleY: objData.scaleY,
                    velocityX: objData.velocityX,
                    velocityY: objData.velocityY,
                    timestamp: Date.now(),
                    ...objData.customData
                };
            } else {
                // Object doesn't exist locally, might be a new spawn
                console.log(`[Multiplayer] Unknown networked object: ${objData.networkId}`);
            }
        }
    }
    
    _handleSpawn(data) {
        if (!this.engine.scene) {
            this.pendingSpawns.push(data);
            return;
        }
        
        // Create the game object
        const obj = this.engine.scene.addGameObject(data.prefabName, data.x, data.y);
        
        if (obj) {
            obj.networkId = data.networkId;
            obj.isNetworked = true;
            obj.networkOwner = data.ownerId;
            
            // Apply custom data
            if (data.data) {
                Object.assign(obj, data.data);
            }
            
            this.networkedObjects.set(data.networkId, obj);
            console.log(`[Multiplayer] Spawned networked object: ${data.networkId}`);
            this._trigger('objectSpawned', data);
        }
    }
    
    _handleDestroy(data) {
        const obj = this.networkedObjects.get(data.networkId);
        
        if (obj) {
            this.networkedObjects.delete(data.networkId);
            
            if (this.engine.scene && obj.scene === this.engine.scene) {
                this.engine.scene.removeGameObject(obj);
            }
            
            console.log(`[Multiplayer] Destroyed networked object: ${data.networkId}`);
            this._trigger('objectDestroyed', data);
        }
    }
    
    _handleRoomCreated(data) {
        this.currentRoom = data.roomId;
        console.log(`[Multiplayer] Room created: ${data.roomId}`);
        this._trigger('roomCreated', data);
    }
    
    _handleRoomJoined(data) {
        this.currentRoom = data.roomId;
        console.log(`[Multiplayer] Joined room: ${data.roomId}`);
        this._trigger('roomJoined', data);
    }
    
    _handleRoomLeft(data) {
        this.currentRoom = null;
        console.log(`[Multiplayer] Left room`);
        this._trigger('roomLeft', data);
    }
    
    _handleRoomList(data) {
        this.roomList = data.rooms;
        this._trigger('roomList', data);
    }
    
    _handleTimeSync(data) {
        this.serverTime = data.serverTime;
        this.timeOffset = Date.now() - data.serverTime;
    }
    
    _sendGameState() {
        if (!this.autoSyncEnabled) return;
        
        const ownedObjects = [];
        
        for (const [networkId, obj] of this.networkedObjects.entries()) {
            if (obj.networkOwner === this.playerId) {
                const objData = {
                    networkId: networkId,
                    x: obj.x,
                    y: obj.y,
                    rotation: obj.rotation || 0,
                    scaleX: obj.scaleX || 1,
                    scaleY: obj.scaleY || 1,
                    velocityX: obj.velocityX || 0,
                    velocityY: obj.velocityY || 0
                };
                
                // Include custom synced properties
                if (obj.customSyncProperties) {
                    objData.customData = {};
                    for (const prop of obj.customSyncProperties) {
                        if (obj.hasOwnProperty(prop)) {
                            objData.customData[prop] = obj[prop];
                        }
                    }
                }
                
                ownedObjects.push(objData);
            }
        }
        
        if (ownedObjects.length > 0) {
            this.send('updateState', {
                objects: ownedObjects
            });
        }
    }
    
    _interpolateNetworkedObjects(deltaTime) {
        const interpolationSpeed = 10; // Adjust for smoother/snappier movement
        
        for (const [networkId, obj] of this.networkedObjects.entries()) {
            // Skip if we own this object or no target state
            if (obj.networkOwner === this.playerId || !obj.targetState) {
                continue;
            }
            
            const target = obj.targetState;
            const t = Math.min(1, deltaTime * interpolationSpeed);
            
            // Interpolate position
            obj.x = this._lerp(obj.x, target.x, t);
            obj.y = this._lerp(obj.y, target.y, t);
            
            // Interpolate rotation
            if (target.rotation !== undefined) {
                obj.rotation = this._lerpAngle(obj.rotation || 0, target.rotation, t);
            }
            
            // Interpolate scale
            if (target.scaleX !== undefined) {
                obj.scaleX = this._lerp(obj.scaleX || 1, target.scaleX, t);
            }
            if (target.scaleY !== undefined) {
                obj.scaleY = this._lerp(obj.scaleY || 1, target.scaleY, t);
            }
            
            // Apply custom data
            if (target.customData) {
                Object.assign(obj, target.customData);
            }
        }
    }
    
    _lerp(a, b, t) {
        return a + (b - a) * t;
    }
    
    _lerpAngle(a, b, t) {
        let diff = b - a;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return a + diff * t;
    }
    
    _generateNetworkId() {
        return `${this.playerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    _trigger(eventName, data) {
        if (this.eventHandlers.has(eventName)) {
            for (const handler of this.eventHandlers.get(eventName)) {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`[Multiplayer] Error in event handler '${eventName}':`, error);
                }
            }
        }
    }
    
    _cleanup() {
        this.connected = false;
        this.playerId = null;
        this.players.clear();
        this.networkedObjects.clear();
        this.pendingSpawns = [];
        this.currentRoom = null;
    }
}

// Make available globally if engine is global
if (typeof window !== 'undefined') {
    window.MultiplayerManager = MultiplayerManager;
}
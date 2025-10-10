/**
 * Metroidvania Tilemap Module
 * Handles 2D tile-based world with collision detection and room management
 */
class MetroidvaniaTilemap extends Module {
    static namespace = "Metroidvania";
    static description = "2D tile-based world with collision detection and room management";
    static allowMultiple = false;
    static iconClass = "fas fa-th";
    static color = "#2196F3";

    constructor() {
        super("MetroidvaniaTilemap");

        // Tilemap properties
        this.tileSize = 32;
        this.mapWidth = 50; // In tiles
        this.mapHeight = 30; // In tiles
        this.rooms = [];

        // Visual properties
        this.backgroundColor = "#87CEEB";
        this.gridColor = "#CCCCCC";
        this.showGrid = true;
        this.showCollision = true;

        // Room properties
        this.currentRoom = null;
        this.roomTransitionSpeed = 300; // Pixels per second
        this.isTransitioning = false;
        this.transitionProgress = 0;

        // Collision properties
        this.collisionLayer = [];
        this.solidTiles = new Set([1, 2, 3]); // Tile IDs that are solid

        // Camera reference for room switching
        this.cameraModule = null;

        // Initialize empty tilemap
        this.initializeTilemap();

        this.setupProperties();
    }

    setupProperties() {
        this.exposeProperty("tileSize", "number", this.tileSize, {
            description: "Size of each tile in pixels",
            min: 16, max: 128,
            onChange: (value) => {
                this.tileSize = value;
                this.updateTilemap();
            }
        });

        this.exposeProperty("mapWidth", "number", this.mapWidth, {
            description: "Map width in tiles",
            min: 10, max: 200,
            onChange: (value) => {
                this.mapWidth = value;
                this.updateTilemap();
            }
        });

        this.exposeProperty("mapHeight", "number", this.mapHeight, {
            description: "Map height in tiles",
            min: 10, max: 200,
            onChange: (value) => {
                this.mapHeight = value;
                this.updateTilemap();
            }
        });

        this.exposeProperty("backgroundColor", "color", this.backgroundColor, {
            description: "Background color",
            onChange: (value) => { this.backgroundColor = value; }
        });

        this.exposeProperty("showGrid", "boolean", this.showGrid, {
            description: "Show grid lines",
            onChange: (value) => { this.showGrid = value; }
        });

        this.exposeProperty("showCollision", "boolean", this.showCollision, {
            description: "Show collision areas",
            onChange: (value) => { this.showCollision = value; }
        });

        this.exposeProperty("roomTransitionSpeed", "number", this.roomTransitionSpeed, {
            description: "Room transition speed in pixels per second",
            min: 100, max: 1000,
            onChange: (value) => { this.roomTransitionSpeed = value; }
        });
    }

    initializeTilemap() {
        // Initialize collision layer with empty tiles (0 = empty, 1 = solid)
        this.collisionLayer = [];
        for (let y = 0; y < this.mapHeight; y++) {
            this.collisionLayer[y] = [];
            for (let x = 0; x < this.mapWidth; x++) {
                this.collisionLayer[y][x] = 0;
            }
        }

        // Create default rooms
        this.createDefaultRooms();
    }

    createDefaultRooms() {
        // Create a simple starting room
        const startRoom = {
            id: "room_0_0",
            x: 0,
            y: 0,
            width: 20,
            height: 15,
            name: "Starting Room",
            backgroundColor: "#87CEEB",
            tiles: this.createRoomTiles(20, 15)
        };

        this.rooms = [startRoom];
        this.currentRoom = startRoom;

        // Apply room tiles to collision layer
        this.applyRoomToCollisionLayer(startRoom);
    }

    createRoomTiles(width, height) {
        const tiles = [];

        for (let y = 0; y < height; y++) {
            tiles[y] = [];
            for (let x = 0; x < width; x++) {
                // Create walls around the room
                if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                    tiles[y][x] = 1; // Wall
                } else if (y === height - 2 && x > 2 && x < width - 3) {
                    tiles[y][x] = 2; // Platform
                } else {
                    tiles[y][x] = 0; // Empty
                }
            }
        }

        return tiles;
    }

    applyRoomToCollisionLayer(room) {
        for (let y = 0; y < room.height; y++) {
            for (let x = 0; x < room.width; x++) {
                const worldX = room.x * 20 + x;
                const worldY = room.y * 15 + y;

                if (worldX >= 0 && worldX < this.mapWidth && worldY >= 0 && worldY < this.mapHeight) {
                    this.collisionLayer[worldY][worldX] = room.tiles[y][x];
                }
            }
        }
    }

    updateTilemap() {
        // Reinitialize tilemap with new dimensions
        this.initializeTilemap();
    }

    start() {
        this.findCameraModule();
    }

    loop(deltaTime) {
        this.updateRoomTransition(deltaTime);
        this.findCameraModule();
    }

    findCameraModule() {
        if (this.cameraModule) return;

        // Find camera module in scene
        const scene = window.engine?.scene;
        if (!scene) return;

        for (const gameObject of scene.gameObjects) {
            const cameraModule = gameObject.getModuleByType("MetroidvaniaCamera");
            if (cameraModule) {
                this.cameraModule = cameraModule;
                break;
            }
        }
    }

    updateRoomTransition(deltaTime) {
        if (!this.isTransitioning) return;

        this.transitionProgress += (this.roomTransitionSpeed * deltaTime) / 100;

        if (this.transitionProgress >= 1) {
            this.finishRoomTransition();
        }
    }

    switchToRoom(roomId) {
        const targetRoom = this.rooms.find(room => room.id === roomId);
        if (!targetRoom || targetRoom === this.currentRoom) return;

        if (this.cameraModule) {
            this.startRoomTransition(targetRoom);
        } else {
            this.currentRoom = targetRoom;
            this.applyRoomToCollisionLayer(targetRoom);
        }
    }

    startRoomTransition(targetRoom) {
        this.isTransitioning = true;
        this.transitionProgress = 0;
        this.targetRoom = targetRoom;

        // Calculate transition direction
        const dx = targetRoom.x - this.currentRoom.x;
        const dy = targetRoom.y - this.currentRoom.y;

        if (Math.abs(dx) > Math.abs(dy)) {
            this.transitionDirection = dx > 0 ? 'right' : 'left';
        } else {
            this.transitionDirection = dy > 0 ? 'down' : 'up';
        }
    }

    finishRoomTransition() {
        this.isTransitioning = false;
        this.currentRoom = this.targetRoom;
        this.applyRoomToCollisionLayer(this.currentRoom);

        if (this.cameraModule) {
            this.cameraModule.snapToRoom(this.currentRoom);
        }
    }

    // Collision detection methods
    isSolidAt(worldX, worldY) {
        const tileX = Math.floor(worldX / this.tileSize);
        const tileY = Math.floor(worldY / this.tileSize);

        if (tileX < 0 || tileX >= this.mapWidth || tileY < 0 || tileY >= this.mapHeight) {
            return true; // Treat out of bounds as solid
        }

        const tileId = this.collisionLayer[tileY][tileX];
        return this.solidTiles.has(tileId);
    }

    getTileAt(worldX, worldY) {
        const tileX = Math.floor(worldX / this.tileSize);
        const tileY = Math.floor(worldY / this.tileSize);

        if (tileX < 0 || tileX >= this.mapWidth || tileY < 0 || tileY >= this.mapHeight) {
            return null;
        }

        return {
            x: tileX,
            y: tileY,
            id: this.collisionLayer[tileY][tileX],
            worldX: tileX * this.tileSize,
            worldY: tileY * this.tileSize,
            solid: this.solidTiles.has(this.collisionLayer[tileY][tileX])
        };
    }

    // Room management methods
    addRoom(room) {
        this.rooms.push(room);
    }

    removeRoom(roomId) {
        this.rooms = this.rooms.filter(room => room.id !== roomId);
    }

    getRoomAt(worldX, worldY) {
        const tileX = Math.floor(worldX / this.tileSize);
        const tileY = Math.floor(worldY / this.tileSize);

        for (const room of this.rooms) {
            if (tileX >= room.x * 20 && tileX < (room.x * 20) + room.width &&
                tileY >= room.y * 15 && tileY < (room.y * 15) + room.height) {
                return room;
            }
        }

        return null;
    }

    // Editor methods for tile editing
    setTile(tileX, tileY, tileId) {
        if (tileX >= 0 && tileX < this.mapWidth && tileY >= 0 && tileY < this.mapHeight) {
            this.collisionLayer[tileY][tileX] = tileId;
        }
    }

    fillRect(startX, startY, width, height, tileId) {
        for (let y = startY; y < startY + height; y++) {
            for (let x = startX; x < startX + width; x++) {
                this.setTile(x, y, tileId);
            }
        }
    }

    draw(ctx) {
        ctx.save();

        // Draw background
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(0, 0, this.mapWidth * this.tileSize, this.mapHeight * this.tileSize);

        // Draw tiles
        this.drawTiles(ctx);

        // Draw grid
        if (this.showGrid) {
            this.drawGrid(ctx);
        }

        // Draw collision areas
        if (this.showCollision) {
            this.drawCollisionAreas(ctx);
        }

        // Draw room transition effect
        if (this.isTransitioning) {
            this.drawTransitionEffect(ctx);
        }

        ctx.restore();
    }

    drawTiles(ctx) {
        ctx.fillStyle = "#8B4513"; // Brown for walls

        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const tileId = this.collisionLayer[y][x];
                if (tileId === 1) { // Wall
                    ctx.fillRect(
                        x * this.tileSize,
                        y * this.tileSize,
                        this.tileSize,
                        this.tileSize
                    );
                } else if (tileId === 2) { // Platform
                    ctx.fillStyle = "#654321"; // Darker brown for platforms
                    ctx.fillRect(
                        x * this.tileSize,
                        y * this.tileSize,
                        this.tileSize,
                        this.tileSize
                    );
                    ctx.fillStyle = "#8B4513"; // Reset to wall color
                }
            }
        }
    }

    drawGrid(ctx) {
        ctx.strokeStyle = this.gridColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);

        // Draw vertical lines
        for (let x = 0; x <= this.mapWidth; x++) {
            ctx.beginPath();
            ctx.moveTo(x * this.tileSize, 0);
            ctx.lineTo(x * this.tileSize, this.mapHeight * this.tileSize);
            ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = 0; y <= this.mapHeight; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * this.tileSize);
            ctx.lineTo(this.mapWidth * this.tileSize, y * this.tileSize);
            ctx.stroke();
        }

        ctx.setLineDash([]);
    }

    drawCollisionAreas(ctx) {
        ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
        ctx.strokeStyle = "#FF0000";
        ctx.lineWidth = 2;

        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                if (this.solidTiles.has(this.collisionLayer[y][x])) {
                    ctx.fillRect(
                        x * this.tileSize,
                        y * this.tileSize,
                        this.tileSize,
                        this.tileSize
                    );
                    ctx.strokeRect(
                        x * this.tileSize,
                        y * this.tileSize,
                        this.tileSize,
                        this.tileSize
                    );
                }
            }
        }
    }

    drawTransitionEffect(ctx) {
        const progress = this.transitionProgress;

        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, this.gameObject.position.x + this.mapWidth * this.tileSize, this.mapHeight * this.tileSize);

        // Draw transition indicator
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
            `Entering ${this.targetRoom?.name || 'Room'}`,
            (this.mapWidth * this.tileSize) / 2,
            (this.mapHeight * this.tileSize) / 2
        );
    }

    drawGizmos(ctx) {
        // Draw room boundaries
        ctx.strokeStyle = "#FFFF00";
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);

        for (const room of this.rooms) {
            ctx.strokeRect(
                room.x * 20 * this.tileSize,
                room.y * 15 * this.tileSize,
                room.width * this.tileSize,
                room.height * this.tileSize
            );
        }

        ctx.setLineDash([]);

        // Draw current room highlight
        if (this.currentRoom) {
            ctx.strokeStyle = "#00FF00";
            ctx.lineWidth = 4;
            ctx.strokeRect(
                this.currentRoom.x * 20 * this.tileSize,
                this.currentRoom.y * 15 * this.tileSize,
                this.currentRoom.width * this.tileSize,
                this.currentRoom.height * this.tileSize
            );
        }
    }

    // Public API methods
    getTileSize() {
        return this.tileSize;
    }

    getMapDimensions() {
        return {
            width: this.mapWidth * this.tileSize,
            height: this.mapHeight * this.tileSize,
            tileWidth: this.mapWidth,
            tileHeight: this.mapHeight
        };
    }

    addSolidTile(tileId) {
        this.solidTiles.add(tileId);
    }

    removeSolidTile(tileId) {
        this.solidTiles.delete(tileId);
    }

    toJSON() {
        const json = super.toJSON();
        json.tileSize = this.tileSize;
        json.mapWidth = this.mapWidth;
        json.mapHeight = this.mapHeight;
        json.backgroundColor = this.backgroundColor;
        json.gridColor = this.gridColor;
        json.showGrid = this.showGrid;
        json.showCollision = this.showCollision;
        json.collisionLayer = this.collisionLayer;
        json.solidTiles = Array.from(this.solidTiles);
        json.rooms = this.rooms;
        json.currentRoom = this.currentRoom;
        json.roomTransitionSpeed = this.roomTransitionSpeed;
        return json;
    }

    fromJSON(json) {
        super.fromJSON(json);
        if (json.tileSize !== undefined) this.tileSize = json.tileSize;
        if (json.mapWidth !== undefined) this.mapWidth = json.mapWidth;
        if (json.mapHeight !== undefined) this.mapHeight = json.mapHeight;
        if (json.backgroundColor !== undefined) this.backgroundColor = json.backgroundColor;
        if (json.gridColor !== undefined) this.gridColor = json.gridColor;
        if (json.showGrid !== undefined) this.showGrid = json.showGrid;
        if (json.showCollision !== undefined) this.showCollision = json.showCollision;
        if (json.collisionLayer !== undefined) this.collisionLayer = json.collisionLayer;
        if (json.solidTiles !== undefined) this.solidTiles = new Set(json.solidTiles);
        if (json.rooms !== undefined) this.rooms = json.rooms;
        if (json.currentRoom !== undefined) this.currentRoom = json.currentRoom;
        if (json.roomTransitionSpeed !== undefined) this.roomTransitionSpeed = json.roomTransitionSpeed;
    }
}

window.MetroidvaniaTilemap = MetroidvaniaTilemap;
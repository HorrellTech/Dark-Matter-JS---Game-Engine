/**
 * Wolf3DMap - Map module for Wolf3D-style games
 *
 * Handles level/map data for walls and objects, including loading,
 * saving, and managing map layouts in a grid-based format.
 */
class Wolf3DMap extends Module {
    static namespace = "Wolf3D";
    static iconClass = "fas fa-map";

    constructor() {
        super("Wolf3DMap");

        // Map properties
        this.mapWidth = 20; // Map width in cells
        this.mapHeight = 20; // Map height in cells
        this.cellSize = 64; // Size of each cell in world units

        // Map data
        this.wallMap = []; // 2D array of wall types
        this.objectMap = []; // 2D array of object types
        this.floorMap = []; // 2D array of floor types

        // Wall and object definitions
        this.wallTypes = new Map(); // Map of wall type names to wall data
        this.objectTypes = new Map(); // Map of object type names to object data
        this.floorTypes = new Map(); // Map of floor type names to floor data

        // Map generation settings
        this.autoGenerate = false;
        this.generationSeed = 12345;
        this.generationAlgorithm = "rooms"; // "rooms", "maze", "dungeon"

        // Map validation and bounds checking
        this.validateOnLoad = true;
        this.wrapAround = false; // Whether map edges wrap around

        // Performance settings
        this.cullDistance = 10; // Distance beyond which to cull map cells
        this.loadRadius = 15; // Radius of cells to keep loaded around player

        // Expose properties for editor
        this.exposeProperty("mapWidth", "number", 20, {
            min: 5, max: 100, onChange: (val) => {
                this.mapWidth = val;
                this.resizeMap();
            }
        });
        this.exposeProperty("mapHeight", "number", 20, {
            min: 5, max: 100, onChange: (val) => {
                this.mapHeight = val;
                this.resizeMap();
            }
        });
        this.exposeProperty("cellSize", "number", 64, {
            min: 16, max: 256, onChange: (val) => this.cellSize = val
        });
        this.exposeProperty("autoGenerate", "boolean", false, {
            onChange: (val) => this.autoGenerate = val
        });
        this.exposeProperty("generationSeed", "number", 12345, {
            onChange: (val) => this.generationSeed = val
        });
        this.exposeProperty("generationAlgorithm", "dropdown", "rooms", {
            options: ["rooms", "maze", "dungeon"], onChange: (val) => this.generationAlgorithm = val
        });
        this.exposeProperty("cullDistance", "number", 10, {
            min: 5, max: 50, onChange: (val) => this.cullDistance = val
        });
        this.exposeProperty("loadRadius", "number", 15, {
            min: 5, max: 50, onChange: (val) => this.loadRadius = val
        });

        // Initialize empty map
        this.initializeMap();
    }

    start() {
        if (this.autoGenerate) {
            this.generateMap();
        }
    }

    /**
     * Initialize an empty map
     */
    initializeMap() {
        // Initialize wall map (0 = no wall, 1+ = wall type index)
        this.wallMap = [];
        for (let y = 0; y < this.mapHeight; y++) {
            this.wallMap[y] = [];
            for (let x = 0; x < this.mapWidth; x++) {
                this.wallMap[y][x] = 0;
            }
        }

        // Initialize object map (0 = no object, 1+ = object type index)
        this.objectMap = [];
        for (let y = 0; y < this.mapHeight; y++) {
            this.objectMap[y] = [];
            for (let x = 0; x < this.mapWidth; x++) {
                this.objectMap[y][x] = 0;
            }
        }

        // Initialize floor map (0 = default floor, 1+ = floor type index)
        this.floorMap = [];
        for (let y = 0; y < this.mapHeight; y++) {
            this.floorMap[y] = [];
            for (let x = 0; x < this.mapWidth; x++) {
                this.floorMap[y][x] = 0;
            }
        }

        // Set up default wall and object types
        this.setupDefaultTypes();
    }

    /**
     * Resize the map and reinitialize
     */
    resizeMap() {
        this.initializeMap();
    }

    /**
     * Set up default wall and object types
     */
    setupDefaultTypes() {
        // Default wall types
        this.wallTypes.set("stone", {
            name: "Stone Wall",
            color: "#888888",
            texture: null,
            height: 64,
            solid: true
        });

        this.wallTypes.set("brick", {
            name: "Brick Wall",
            color: "#CC4444",
            texture: null,
            height: 64,
            solid: true
        });

        this.wallTypes.set("wood", {
            name: "Wood Wall",
            color: "#8B4513",
            texture: null,
            height: 64,
            solid: true
        });

        // Default object types
        this.objectTypes.set("barrel", {
            name: "Barrel",
            sprite: null,
            width: 32,
            height: 32,
            solid: true,
            interactive: false
        });

        this.objectTypes.set("lamp", {
            name: "Lamp",
            sprite: null,
            width: 16,
            height: 48,
            solid: false,
            interactive: true
        });

        this.objectTypes.set("enemy", {
            name: "Enemy",
            sprite: null,
            width: 32,
            height: 32,
            solid: true,
            interactive: true
        });

        // Default floor types
        this.floorTypes.set("stone", {
            name: "Stone Floor",
            color: "#666666",
            texture: null
        });

        this.floorTypes.set("tile", {
            name: "Tile Floor",
            color: "#CCCCCC",
            texture: null
        });
    }

    /**
     * Generate a map using the specified algorithm
     */
    generateMap() {
        // Set random seed for reproducible generation
        Math.random = this.seededRandom(this.generationSeed);

        switch (this.generationAlgorithm) {
            case "rooms":
                this.generateRoomsMap();
                break;
            case "maze":
                this.generateMazeMap();
                break;
            case "dungeon":
                this.generateDungeonMap();
                break;
            default:
                this.generateRoomsMap();
        }
    }

    /**
     * Generate a rooms-based map
     */
    generateRoomsMap() {
        // Clear map first
        this.clearMap();

        const roomCount = Math.floor((this.mapWidth * this.mapHeight) / 200) + 2;
        const rooms = [];

        // Generate rooms
        for (let i = 0; i < roomCount; i++) {
            const room = this.generateRoom();
            if (room) {
                rooms.push(room);
                this.placeRoom(room);
            }
        }

        // Connect rooms with corridors
        for (let i = 0; i < rooms.length - 1; i++) {
            this.connectRooms(rooms[i], rooms[i + 1]);
        }

        // Add some random objects
        this.addRandomObjects();
    }

    /**
     * Generate a single room
     */
    generateRoom() {
        const maxAttempts = 50;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const width = Math.floor(Math.random() * 6) + 3; // 3-8 cells wide
            const height = Math.floor(Math.random() * 6) + 3; // 3-8 cells tall
            const x = Math.floor(Math.random() * (this.mapWidth - width - 2)) + 1;
            const y = Math.floor(Math.random() * (this.mapHeight - height - 2)) + 1;

            const room = { x, y, width, height };

            // Check if room overlaps with existing rooms
            if (!this.roomOverlaps(room, 1)) { // 1 cell padding
                return room;
            }
        }
        return null;
    }

    /**
     * Check if a room overlaps with existing rooms
     */
    roomOverlaps(room, padding = 0) {
        for (let y = Math.max(0, room.y - padding); y < Math.min(this.mapHeight, room.y + room.height + padding); y++) {
            for (let x = Math.max(0, room.x - padding); x < Math.min(this.mapWidth, room.x + room.width + padding); x++) {
                if (this.wallMap[y][x] !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Place a room in the map
     */
    placeRoom(room) {
        // Place walls around room perimeter
        for (let y = room.y; y < room.y + room.height; y++) {
            for (let x = room.x; x < room.x + room.width; x++) {
                if (x === room.x || x === room.x + room.width - 1 ||
                    y === room.y || y === room.y + room.height - 1) {
                    this.wallMap[y][x] = 1; // Stone wall
                }
            }
        }
    }

    /**
     * Connect two rooms with a corridor
     */
    connectRooms(room1, room2) {
        // Simple L-shaped corridor
        const x1 = Math.floor(room1.x + room1.width / 2);
        const y1 = Math.floor(room1.y + room1.height / 2);
        const x2 = Math.floor(room2.x + room2.width / 2);
        const y2 = Math.floor(room2.y + room2.height / 2);

        // Horizontal corridor
        const startX = Math.min(x1, x2);
        const endX = Math.max(x1, x2);
        for (let x = startX; x <= endX; x++) {
            if (this.isValidCell(x, y1)) {
                this.wallMap[y1][x] = 0; // Clear wall for corridor
            }
        }

        // Vertical corridor
        const startY = Math.min(y1, y2);
        const endY = Math.max(y1, y2);
        for (let y = startY; y <= endY; y++) {
            if (this.isValidCell(x2, y)) {
                this.wallMap[y][x2] = 0; // Clear wall for corridor
            }
        }
    }

    /**
     * Generate a maze map
     */
    generateMazeMap() {
        this.clearMap();

        // Simple maze generation using recursive backtracking
        const stack = [];
        const visited = Array(this.mapHeight).fill().map(() => Array(this.mapWidth).fill(false));

        // Start from top-left corner
        let currentX = 1;
        let currentY = 1;
        visited[currentY][currentX] = true;

        while (true) {
            const neighbors = this.getUnvisitedNeighbors(currentX, currentY, visited);

            if (neighbors.length > 0) {
                // Choose random neighbor
                const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];

                // Remove wall between current and neighbor
                const wallX = currentX + (neighbor.x - currentX) / 2;
                const wallY = currentY + (neighbor.y - currentY) / 2;

                this.wallMap[wallY][wallX] = 0;

                // Move to neighbor
                stack.push({ x: currentX, y: currentY });
                currentX = neighbor.x;
                currentY = neighbor.y;
                visited[currentY][currentX] = true;
            } else if (stack.length > 0) {
                // Backtrack
                const back = stack.pop();
                currentX = back.x;
                currentY = back.y;
            } else {
                break;
            }
        }

        // Add outer walls
        this.addOuterWalls();
    }

    /**
     * Generate a dungeon-style map
     */
    generateDungeonMap() {
        this.generateRoomsMap(); // Start with rooms

        // Add more complex features like secret rooms, traps, etc.
        this.addDungeonFeatures();
    }

    /**
     * Add random objects to the map
     */
    addRandomObjects() {
        const objectCount = Math.floor((this.mapWidth * this.mapHeight) / 50);

        for (let i = 0; i < objectCount; i++) {
            const x = Math.floor(Math.random() * this.mapWidth);
            const y = Math.floor(Math.random() * this.mapHeight);

            if (this.wallMap[y][x] === 0) { // Only place on empty cells
                const objectType = Math.random() < 0.7 ? 1 : 2; // 70% barrels, 30% lamps
                this.objectMap[y][x] = objectType;
            }
        }
    }

    /**
     * Add dungeon-specific features
     */
    addDungeonFeatures() {
        // Add some treasure, traps, or secret areas
        // This is a simple implementation - could be expanded
        const featureCount = Math.floor(this.mapWidth * this.mapHeight / 100);

        for (let i = 0; i < featureCount; i++) {
            const x = Math.floor(Math.random() * this.mapWidth);
            const y = Math.floor(Math.random() * this.mapHeight);

            if (this.wallMap[y][x] === 0) {
                // 50% chance of treasure, 50% chance of trap
                this.objectMap[y][x] = Math.random() < 0.5 ? 3 : 4;
            }
        }
    }

    /**
     * Clear the entire map
     */
    clearMap() {
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                this.wallMap[y][x] = 0;
                this.objectMap[y][x] = 0;
                this.floorMap[y][x] = 0;
            }
        }
    }

    /**
     * Add outer walls around the entire map
     */
    addOuterWalls() {
        // Top and bottom walls
        for (let x = 0; x < this.mapWidth; x++) {
            this.wallMap[0][x] = 1;
            this.wallMap[this.mapHeight - 1][x] = 1;
        }

        // Left and right walls
        for (let y = 0; y < this.mapHeight; y++) {
            this.wallMap[y][0] = 1;
            this.wallMap[y][this.mapWidth - 1] = 1;
        }
    }

    /**
     * Get unvisited neighbors for maze generation
     */
    getUnvisitedNeighbors(x, y, visited) {
        const neighbors = [];
        const directions = [
            { x: x + 2, y: y },     // Right
            { x: x - 2, y: y },     // Left
            { x: x, y: y + 2 },     // Down
            { x: x, y: y - 2 }      // Up
        ];

        directions.forEach(dir => {
            if (dir.x > 0 && dir.x < this.mapWidth - 1 &&
                dir.y > 0 && dir.y < this.mapHeight - 1 &&
                !visited[dir.y][dir.x]) {
                neighbors.push(dir);
            }
        });

        return neighbors;
    }

    /**
     * Check if a cell coordinate is valid
     */
    isValidCell(x, y) {
        return x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight;
    }

    /**
     * Set a wall at a specific map position
     */
    setWall(x, y, wallType) {
        if (this.isValidCell(x, y)) {
            this.wallMap[y][x] = wallType;
        }
    }

    /**
     * Get the wall type at a specific map position
     */
    getWall(x, y) {
        if (this.isValidCell(x, y)) {
            return this.wallMap[y][x];
        }
        return 0;
    }

    /**
     * Set an object at a specific map position
     */
    setObject(x, y, objectType) {
        if (this.isValidCell(x, y)) {
            this.objectMap[y][x] = objectType;
        }
    }

    /**
     * Get the object type at a specific map position
     */
    getObject(x, y) {
        if (this.isValidCell(x, y)) {
            return this.objectMap[y][x];
        }
        return 0;
    }

    /**
     * Set a floor type at a specific map position
     */
    setFloor(x, y, floorType) {
        if (this.isValidCell(x, y)) {
            this.floorMap[y][x] = floorType;
        }
    }

    /**
     * Get the floor type at a specific map position
     */
    getFloor(x, y) {
        if (this.isValidCell(x, y)) {
            return this.floorMap[y][x];
        }
        return 0;
    }

    /**
     * Convert world coordinates to map cell coordinates
     */
    worldToMap(worldX, worldY) {
        return {
            x: Math.floor(worldX / this.cellSize),
            y: Math.floor(worldY / this.cellSize)
        };
    }

    /**
     * Convert map cell coordinates to world coordinates
     */
    mapToWorld(mapX, mapY) {
        return {
            x: (mapX + 0.5) * this.cellSize,
            y: (mapY + 0.5) * this.cellSize
        };
    }

    /**
     * Get all walls within a certain radius of a position
     */
    getWallsInRadius(worldX, worldY, radius) {
        const centerCell = this.worldToMap(worldX, worldY);
        const cellRadius = Math.ceil(radius / this.cellSize);
        const walls = [];

        for (let y = Math.max(0, centerCell.y - cellRadius);
             y < Math.min(this.mapHeight, centerCell.y + cellRadius + 1); y++) {
            for (let x = Math.max(0, centerCell.x - cellRadius);
                 x < Math.min(this.mapWidth, centerCell.x + cellRadius + 1); x++) {
                if (this.wallMap[y][x] > 0) {
                    const worldPos = this.mapToWorld(x, y);
                    const distance = Math.sqrt(
                        Math.pow(worldX - worldPos.x, 2) +
                        Math.pow(worldY - worldPos.y, 2)
                    );

                    if (distance <= radius) {
                        walls.push({
                            x: x,
                            y: y,
                            worldX: worldPos.x,
                            worldY: worldPos.y,
                            type: this.wallMap[y][x],
                            wallData: this.wallTypes.get(this.getWallTypeName(this.wallMap[y][x]))
                        });
                    }
                }
            }
        }

        return walls;
    }

    /**
     * Get all objects within a certain radius of a position
     */
    getObjectsInRadius(worldX, worldY, radius) {
        const centerCell = this.worldToMap(worldX, worldY);
        const cellRadius = Math.ceil(radius / this.cellSize);
        const objects = [];

        for (let y = Math.max(0, centerCell.y - cellRadius);
             y < Math.min(this.mapHeight, centerCell.y + cellRadius + 1); y++) {
            for (let x = Math.max(0, centerCell.x - cellRadius);
                 x < Math.min(this.mapWidth, centerCell.x + cellRadius + 1); x++) {
                if (this.objectMap[y][x] > 0) {
                    const worldPos = this.mapToWorld(x, y);
                    const distance = Math.sqrt(
                        Math.pow(worldX - worldPos.x, 2) +
                        Math.pow(worldY - worldPos.y, 2)
                    );

                    if (distance <= radius) {
                        objects.push({
                            x: x,
                            y: y,
                            worldX: worldPos.x,
                            worldY: worldPos.y,
                            type: this.objectMap[y][x],
                            objectData: this.objectTypes.get(this.getObjectTypeName(this.objectMap[y][x]))
                        });
                    }
                }
            }
        }

        return objects;
    }

    /**
     * Get the name of a wall type by its index
     */
    getWallTypeName(index) {
        // This is a simple implementation - in a real game you'd have a proper mapping
        switch (index) {
            case 1: return "stone";
            case 2: return "brick";
            case 3: return "wood";
            default: return "stone";
        }
    }

    /**
     * Get the name of an object type by its index
     */
    getObjectTypeName(index) {
        // This is a simple implementation - in a real game you'd have a proper mapping
        switch (index) {
            case 1: return "barrel";
            case 2: return "lamp";
            case 3: return "enemy";
            case 4: return "treasure";
            default: return "barrel";
        }
    }

    /**
     * Create a seeded random number generator
     */
    seededRandom(seed) {
        let m = 2 ** 35 - 31;
        let a = 185852;
        let s = seed % m;

        return function () {
            return (s = (s * a) % m) / m;
        };
    }

    /**
     * Save the map to a JSON object
     */
    toJSON() {
        return {
            ...super.toJSON(),
            mapWidth: this.mapWidth,
            mapHeight: this.mapHeight,
            cellSize: this.cellSize,
            wallMap: this.wallMap,
            objectMap: this.objectMap,
            floorMap: this.floorMap,
            wallTypes: Array.from(this.wallTypes.entries()),
            objectTypes: Array.from(this.objectTypes.entries()),
            floorTypes: Array.from(this.floorTypes.entries()),
            generationSeed: this.generationSeed,
            generationAlgorithm: this.generationAlgorithm
        };
    }

    /**
     * Load the map from a JSON object
     */
    fromJSON(json) {
        super.fromJSON(json);

        if (json.mapWidth !== undefined) this.mapWidth = json.mapWidth;
        if (json.mapHeight !== undefined) this.mapHeight = json.mapHeight;
        if (json.cellSize !== undefined) this.cellSize = json.cellSize;

        if (json.wallMap) this.wallMap = json.wallMap;
        if (json.objectMap) this.objectMap = json.objectMap;
        if (json.floorMap) this.floorMap = json.floorMap;

        if (json.wallTypes) this.wallTypes = new Map(json.wallTypes);
        if (json.objectTypes) this.objectTypes = new Map(json.objectTypes);
        if (json.floorTypes) this.floorTypes = new Map(json.floorTypes);

        if (json.generationSeed !== undefined) this.generationSeed = json.generationSeed;
        if (json.generationAlgorithm !== undefined) this.generationAlgorithm = json.generationAlgorithm;

        // Reinitialize if map dimensions changed
        if (json.mapWidth || json.mapHeight) {
            this.resizeMap();
        }
    }

    draw(ctx) {
        // Map rendering is handled by the Wolf3DRenderer
        // This method can be used for debug drawing if needed
    }

    drawGizmos(ctx) {
        if (!this.gameObject) return;

        // Draw map grid
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);

        const startX = this.gameObject.position.x - (this.mapWidth * this.cellSize) / 2;
        const startY = this.gameObject.position.y - (this.mapHeight * this.cellSize) / 2;

        // Draw vertical lines
        for (let x = 0; x <= this.mapWidth; x++) {
            const worldX = startX + x * this.cellSize;
            ctx.beginPath();
            ctx.moveTo(worldX, startY);
            ctx.lineTo(worldX, startY + this.mapHeight * this.cellSize);
            ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = 0; y <= this.mapHeight; y++) {
            const worldY = startY + y * this.cellSize;
            ctx.beginPath();
            ctx.moveTo(startX, worldY);
            ctx.lineTo(startX + this.mapWidth * this.cellSize, worldY);
            ctx.stroke();
        }

        ctx.setLineDash([]);

        // Draw wall cells
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                if (this.wallMap[y][x] > 0) {
                    const worldX = startX + x * this.cellSize;
                    const worldY = startY + y * this.cellSize;

                    ctx.fillStyle = '#ff0000';
                    ctx.fillRect(worldX, worldY, this.cellSize, this.cellSize);
                }
            }
        }
    }
}

window.Wolf3DMap = Wolf3DMap;
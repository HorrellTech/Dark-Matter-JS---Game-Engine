class TilemapSystem extends Module {
    static namespace = "World";
    static description = "Grid-based tilemap system with procedural generation";
    static allowMultiple = false;
    static iconClass = "fas fa-th";
    static iconColor = "#a200ffff";

    constructor() {
        super("TilemapSystem");

        // Tilemap properties
        this.tileSize = 32;
        this.worldWidth = 200;
        this.worldHeight = 100;
        this.seed = 12345;
        
        // Generation settings
        this.grassHeight = 20;
        this.dirtDepth = 15;
        this.stoneDepth = 30;
        this.caveFrequency = 0.3;
        this.oreFrequency = 0.05;
        
        // Visual settings
        this.showGrid = false;
        this.gridColor = "#444444";
        
        // Tile definitions
        this.tileTypes = {
            0: { name: "Air", color: "transparent", solid: false },
            1: { name: "Grass", color: "#4CAF50", solid: true },
            2: { name: "Dirt", color: "#8D6E63", solid: true },
            3: { name: "Stone", color: "#607D8B", solid: true },
            4: { name: "Coal", color: "#37474F", solid: true },
            5: { name: "Iron", color: "#FF7043", solid: true },
            6: { name: "Gold", color: "#FFD700", solid: true }
        };
        
        // Initialize grid
        this.tiles = [];
        this.generateWorld();
        
        // Expose properties
        this.exposeProperty("tileSize", "number", this.tileSize, {
            description: "Size of each tile in pixels",
            onChange: (val) => {
                this.tileSize = val;
                this.generateWorld();
            }
        });
        
        this.exposeProperty("worldWidth", "number", this.worldWidth, {
            description: "World width in tiles",
            onChange: (val) => {
                this.worldWidth = val;
                this.generateWorld();
            }
        });
        
        this.exposeProperty("worldHeight", "number", this.worldHeight, {
            description: "World height in tiles",
            onChange: (val) => {
                this.worldHeight = val;
                this.generateWorld();
            }
        });
        
        this.exposeProperty("seed", "number", this.seed, {
            description: "World generation seed",
            onChange: (val) => {
                this.seed = val;
                this.generateWorld();
            }
        });
        
        this.exposeProperty("grassHeight", "number", this.grassHeight, {
            description: "Surface grass layer height",
            onChange: (val) => {
                this.grassHeight = val;
                this.generateWorld();
            }
        });
        
        this.exposeProperty("dirtDepth", "number", this.dirtDepth, {
            description: "Dirt layer depth",
            onChange: (val) => {
                this.dirtDepth = val;
                this.generateWorld();
            }
        });
        
        this.exposeProperty("stoneDepth", "number", this.stoneDepth, {
            description: "Stone layer depth",
            onChange: (val) => {
                this.stoneDepth = val;
                this.generateWorld();
            }
        });
        
        this.exposeProperty("caveFrequency", "number", this.caveFrequency, {
            description: "Cave generation frequency",
            onChange: (val) => {
                this.caveFrequency = val;
                this.generateWorld();
            }
        });
        
        this.exposeProperty("oreFrequency", "number", this.oreFrequency, {
            description: "Ore generation frequency",
            onChange: (val) => {
                this.oreFrequency = val;
                this.generateWorld();
            }
        });
        
        this.exposeProperty("showGrid", "boolean", this.showGrid, {
            description: "Show tile grid lines",
            onChange: (val) => {
                this.showGrid = val;
            }
        });
        
        this.exposeProperty("gridColor", "color", this.gridColor, {
            description: "Grid line color",
            onChange: (val) => {
                this.gridColor = val;
            }
        });
    }

    style(style) {
        style.startGroup("World Generation", false, { 
            backgroundColor: 'rgba(76,175,80,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        
        style.exposeProperty("seed", "number", this.seed, {
            description: "Random seed for world generation",
            style: { label: "Seed" }
        });
        
        style.exposeProperty("worldWidth", "number", this.worldWidth, {
            description: "World width in tiles",
            min: 50,
            max: 1000,
            step: 10,
            style: { label: "World Width", slider: true }
        });
        
        style.exposeProperty("worldHeight", "number", this.worldHeight, {
            description: "World height in tiles",
            min: 50,
            max: 500,
            step: 5,
            style: { label: "World Height", slider: true }
        });
        
        style.endGroup();
        
        style.startGroup("Terrain Settings", false, {
            backgroundColor: 'rgba(141,110,99,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        
        style.exposeProperty("grassHeight", "number", this.grassHeight, {
            description: "Height variation of grass surface",
            min: 5,
            max: 50,
            step: 1,
            style: { label: "Grass Height", slider: true }
        });
        
        style.exposeProperty("dirtDepth", "number", this.dirtDepth, {
            description: "Depth of dirt layer",
            min: 5,
            max: 50,
            step: 1,
            style: { label: "Dirt Depth", slider: true }
        });
        
        style.exposeProperty("stoneDepth", "number", this.stoneDepth, {
            description: "Depth of stone layer",
            min: 10,
            max: 100,
            step: 5,
            style: { label: "Stone Depth", slider: true }
        });
        
        style.endGroup();
        
        style.startGroup("Generation Settings", false, {
            backgroundColor: 'rgba(96,125,139,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        
        style.exposeProperty("caveFrequency", "number", this.caveFrequency, {
            description: "Frequency of cave generation",
            min: 0.1,
            max: 1.0,
            step: 0.05,
            style: { label: "Cave Frequency", slider: true }
        });
        
        style.exposeProperty("oreFrequency", "number", this.oreFrequency, {
            description: "Frequency of ore generation",
            min: 0.01,
            max: 0.2,
            step: 0.01,
            style: { label: "Ore Frequency", slider: true }
        });
        
        style.endGroup();
        
        style.startGroup("Visual Settings", false, {
            backgroundColor: 'rgba(68,68,68,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        
        style.exposeProperty("tileSize", "number", this.tileSize, {
            description: "Size of each tile in pixels",
            min: 8,
            max: 128,
            step: 8,
            style: { label: "Tile Size", slider: true }
        });
        
        style.exposeProperty("showGrid", "boolean", this.showGrid, {
            description: "Show grid lines",
            style: { label: "Show Grid" }
        });
        
        style.exposeProperty("gridColor", "color", this.gridColor, {
            description: "Color of grid lines",
            style: { label: "Grid Color" }
        });
        
        style.endGroup();
        
        style.addDivider();
        style.addHelpText("Procedural tilemap system with Terraria-style generation. Automatically culls tiles outside viewport for performance.");
    }

    // Simple seeded random number generator
    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }
    
    // Perlin-like noise function
    noise(x, y, scale = 1) {
        const seedOffset = this.seed * 9999;
        const scaledX = x * scale;
        const scaledY = y * scale;
        
        const n1 = this.seededRandom(scaledX * 12.9898 + scaledY * 78.233 + seedOffset);
        const n2 = this.seededRandom(scaledX * 37.719 + scaledY * 17.2131 + seedOffset + 1000);
        
        return (n1 + n2) / 2;
    }

    generateWorld() {
        // Initialize 2D array
        this.tiles = [];
        for (let x = 0; x < this.worldWidth; x++) {
            this.tiles[x] = [];
            for (let y = 0; y < this.worldHeight; y++) {
                this.tiles[x][y] = 0; // Air by default
            }
        }

        // Generate surface terrain
        const surfaceHeights = [];
        for (let x = 0; x < this.worldWidth; x++) {
            const height = Math.floor(this.grassHeight + 
                this.noise(x, 0, 0.05) * 10 + 
                this.noise(x, 0, 0.1) * 5);
            surfaceHeights[x] = height;
        }

        // Fill terrain layers
        for (let x = 0; x < this.worldWidth; x++) {
            const surfaceY = surfaceHeights[x];
            
            for (let y = surfaceY; y < this.worldHeight; y++) {
                if (y === surfaceY) {
                    this.tiles[x][y] = 1; // Grass
                } else if (y < surfaceY + this.dirtDepth) {
                    this.tiles[x][y] = 2; // Dirt
                } else if (y < surfaceY + this.dirtDepth + this.stoneDepth) {
                    this.tiles[x][y] = 3; // Stone
                } else {
                    this.tiles[x][y] = 3; // Deep stone
                }
            }
        }

        // Generate caves
        for (let x = 0; x < this.worldWidth; x++) {
            for (let y = this.grassHeight; y < this.worldHeight; y++) {
                const caveNoise = this.noise(x, y, 0.08);
                if (caveNoise > (1 - this.caveFrequency)) {
                    this.tiles[x][y] = 0; // Air (cave)
                }
            }
        }

        // Generate ores
        for (let x = 0; x < this.worldWidth; x++) {
            for (let y = this.grassHeight + this.dirtDepth; y < this.worldHeight; y++) {
                if (this.tiles[x][y] === 3) { // Only in stone
                    const oreNoise = this.noise(x, y, 0.15);
                    if (oreNoise > (1 - this.oreFrequency)) {
                        const depth = y - (this.grassHeight + this.dirtDepth);
                        if (depth < 10) {
                            this.tiles[x][y] = 4; // Coal
                        } else if (depth < 25) {
                            this.tiles[x][y] = 5; // Iron
                        } else {
                            this.tiles[x][y] = 6; // Gold
                        }
                    }
                }
            }
        }
    }

    draw(ctx) {
        const viewport = window.engine.viewport;
        const worldPos = this.gameObject.getWorldPosition();
        
        // Calculate visible tile range
        const startX = Math.max(0, Math.floor((viewport.x - worldPos.x) / this.tileSize));
        const endX = Math.min(this.worldWidth, Math.ceil((viewport.x + viewport.width - worldPos.x) / this.tileSize));
        const startY = Math.max(0, Math.floor((viewport.y - worldPos.y) / this.tileSize));
        const endY = Math.min(this.worldHeight, Math.ceil((viewport.y + viewport.height - worldPos.y) / this.tileSize));

        // Draw visible tiles
        for (let x = startX; x < endX; x++) {
            for (let y = startY; y < endY; y++) {
                const tileType = this.tiles[x][y];
                if (tileType === 0) continue; // Skip air tiles
                
                const tileData = this.tileTypes[tileType];
                if (!tileData) continue;
                
                const drawX = x * this.tileSize;
                const drawY = y * this.tileSize;
                
                ctx.fillStyle = tileData.color;
                ctx.fillRect(drawX, drawY, this.tileSize, this.tileSize);
            }
        }

        // Draw grid if enabled
        if (this.showGrid) {
            ctx.strokeStyle = this.gridColor;
            ctx.lineWidth = 1;
            
            // Vertical lines
            for (let x = startX; x <= endX; x++) {
                const lineX = x * this.tileSize;
                ctx.beginPath();
                ctx.moveTo(lineX, startY * this.tileSize);
                ctx.lineTo(lineX, endY * this.tileSize);
                ctx.stroke();
            }
            
            // Horizontal lines
            for (let y = startY; y <= endY; y++) {
                const lineY = y * this.tileSize;
                ctx.beginPath();
                ctx.moveTo(startX * this.tileSize, lineY);
                ctx.lineTo(endX * this.tileSize, lineY);
                ctx.stroke();
            }
        }
    }

    // PUBLIC API METHODS

    // Get tile type at grid position
    getTileAt(x, y) {
        if (x < 0 || x >= this.worldWidth || y < 0 || y >= this.worldHeight) {
            return 0; // Air outside world bounds
        }
        return this.tiles[x][y];
    }

    // Set tile type at grid position
    setTileAt(x, y, tileType) {
        if (x < 0 || x >= this.worldWidth || y < 0 || y >= this.worldHeight) {
            return false;
        }
        this.tiles[x][y] = tileType;
        return true;
    }

    // Get tile at world position
    getTileAtWorldPos(worldX, worldY) {
        const localPos = this.worldToLocal(worldX, worldY);
        return this.getTileAt(localPos.x, localPos.y);
    }

    // Set tile at world position
    setTileAtWorldPos(worldX, worldY, tileType) {
        const localPos = this.worldToLocal(worldX, worldY);
        return this.setTileAt(localPos.x, localPos.y, tileType);
    }

    // Convert world position to grid coordinates
    worldToGrid(worldX, worldY) {
        const worldPos = this.gameObject.getWorldPosition();
        const localX = worldX - worldPos.x;
        const localY = worldY - worldPos.y;
        return {
            x: Math.floor(localX / this.tileSize),
            y: Math.floor(localY / this.tileSize)
        };
    }

    // Convert grid coordinates to world position (top-left of tile)
    gridToWorld(gridX, gridY) {
        const worldPos = this.gameObject.getWorldPosition();
        return {
            x: worldPos.x + gridX * this.tileSize,
            y: worldPos.y + gridY * this.tileSize
        };
    }

    // Get center world position of tile
    getTileCenterWorld(gridX, gridY) {
        const worldPos = this.gridToWorld(gridX, gridY);
        return {
            x: worldPos.x + this.tileSize / 2,
            y: worldPos.y + this.tileSize / 2
        };
    }

    // Check if tile is solid (for collision)
    isTileSolid(x, y) {
        const tileType = this.getTileAt(x, y);
        const tileData = this.tileTypes[tileType];
        return tileData ? tileData.solid : false;
    }

    // Check if world position is solid
    isWorldPosSolid(worldX, worldY) {
        const gridPos = this.worldToGrid(worldX, worldY);
        return this.isTileSolid(gridPos.x, gridPos.y);
    }

    // Get all tiles in a rectangular area
    getTilesInArea(startX, startY, width, height) {
        const tiles = [];
        for (let x = startX; x < startX + width; x++) {
            for (let y = startY; y < startY + height; y++) {
                tiles.push({
                    x: x,
                    y: y,
                    type: this.getTileAt(x, y)
                });
            }
        }
        return tiles;
    }

    // Get tile data definition
    getTileData(tileType) {
        return this.tileTypes[tileType] || null;
    }

    // Get all tile types
    getAllTileTypes() {
        return this.tileTypes;
    }

    // Regenerate world with current settings
    regenerateWorld() {
        this.generateWorld();
    }

    // Helper method for world to local conversion
    worldToLocal(worldX, worldY) {
        const worldPos = this.gameObject.getWorldPosition();
        return {
            x: Math.floor((worldX - worldPos.x) / this.tileSize),
            y: Math.floor((worldY - worldPos.y) / this.tileSize)
        };
    }

    toJSON() {
        return {
            ...super.toJSON(),
            tileSize: this.tileSize,
            worldWidth: this.worldWidth,
            worldHeight: this.worldHeight,
            seed: this.seed,
            grassHeight: this.grassHeight,
            dirtDepth: this.dirtDepth,
            stoneDepth: this.stoneDepth,
            caveFrequency: this.caveFrequency,
            oreFrequency: this.oreFrequency,
            showGrid: this.showGrid,
            gridColor: this.gridColor,
            tiles: this.tiles
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        if (!data) return;

        this.tileSize = data.tileSize || 32;
        this.worldWidth = data.worldWidth || 200;
        this.worldHeight = data.worldHeight || 100;
        this.seed = data.seed || 12345;
        this.grassHeight = data.grassHeight || 20;
        this.dirtDepth = data.dirtDepth || 15;
        this.stoneDepth = data.stoneDepth || 30;
        this.caveFrequency = data.caveFrequency || 0.3;
        this.oreFrequency = data.oreFrequency || 0.05;
        this.showGrid = data.showGrid || false;
        this.gridColor = data.gridColor || "#444444";
        
        if (data.tiles) {
            this.tiles = data.tiles;
        } else {
            this.generateWorld();
        }
    }
}

window.TilemapSystem = TilemapSystem;
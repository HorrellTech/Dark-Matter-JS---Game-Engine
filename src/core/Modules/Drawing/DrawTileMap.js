class TilemapSystem extends Module {
    static namespace = "World";
    static description = "Infinite grid-based tilemap system with procedural generation and interactive editing";
    static allowMultiple = false;
    static iconClass = "fas fa-th";
    static iconColor = "#a200ffff";

    constructor() {
        super("TilemapSystem");

        // Chunk-based infinite world
        this.chunkSize = 32; // tiles per chunk
        this.tileSize = 32; // pixels per tile
        this.chunks = new Map(); // stores generated chunks
        this.chunkLoadRadius = 3; // how many chunks to keep loaded around viewport

        this.seed = 12345;

        // Generation settings
        this.generationType = "terraria"; // terraria, perlin, caverns, islands, flat
        this.grassHeight = 20;
        this.dirtDepth = 15;
        this.stoneDepth = 30;
        this.caveFrequency = 0.3;
        this.oreFrequency = 0.05;

        // Terrain variation settings
        this.terrainScale = 0.05;
        this.terrainOctaves = 3;
        this.terrainPersistence = 0.5;
        this.mountainHeight = 40;
        this.valleyDepth = 10;

        // Visual settings
        this.showGrid = false;
        this.gridColor = "#444444";
        this.enableBlending = true;
        this.blendStrength = 0.7;
        this.enableShading = true;
        this.shadingStrength = 0.3;

        // Editor settings
        this.editMode = "draw"; // draw, erase, fill, eyedropper
        this.selectedTileType = 1;
        this.brushSize = 1;
        this.showBrushPreview = true;

        // Tile definitions with gradient colors for blending
        this.tileTypes = {
            0: { name: "Air", color: "transparent", solid: false, blend: [] },
            1: { name: "Grass", color: "#4CAF50", solid: true, blend: ["#5CB860", "#3D9142", "#6DC974"] },
            2: { name: "Dirt", color: "#8D6E63", solid: true, blend: ["#9D7E73", "#7D5E53", "#AD8E83"] },
            3: { name: "Stone", color: "#607D8B", solid: true, blend: ["#708D9B", "#506D7B", "#809DAB"] },
            4: { name: "Coal", color: "#37474F", solid: true, blend: ["#47575F", "#27373F", "#57676F"] },
            5: { name: "Iron", color: "#FF7043", solid: true, blend: ["#FF8053", "#EF6033", "#FF9063"] },
            6: { name: "Gold", color: "#FFD700", solid: true, blend: ["#FFE710", "#EFC700", "#FFF720"] },
            7: { name: "Sand", color: "#F4E4C1", solid: true, blend: ["#FFF4D1", "#E4D4B1", "#FFFCE1"] },
            8: { name: "Snow", color: "#ECEFF1", solid: true, blend: ["#FCFFFF", "#DCEEF1", "#FFFFFF"] },
            9: { name: "Ice", color: "#B3E5FC", solid: true, blend: ["#C3F5FF", "#A3D5EC", "#D3FFFF"] }
        };

        // Editor state
        this.isEditing = false;
        this.lastEditTile = { x: -1, y: -1 };
        this.hoveredTile = { x: -1, y: -1 };
        this.showGizmos = true;

        this.setupProperties();
    }

    setupProperties() {
        this.exposeProperty("generationType", "select", this.generationType, {
            description: "Terrain generation algorithm",
            options: [
                { value: "terraria", label: "Terraria Style" },
                { value: "perlin", label: "Perlin Noise" },
                { value: "caverns", label: "Cave Systems" },
                { value: "islands", label: "Floating Islands" },
                { value: "flat", label: "Flat World" },
                { value: "mountains", label: "Mountain Ranges" }
            ],
            onChange: (val) => {
                this.generationType = val;
                this.clearChunks();
            }
        });

        this.exposeProperty("tileSize", "number", this.tileSize, {
            description: "Size of each tile in pixels",
            onChange: (val) => {
                this.tileSize = val;
            }
        });

        this.exposeProperty("chunkSize", "number", this.chunkSize, {
            description: "Tiles per chunk (affects generation performance)",
            onChange: (val) => {
                this.chunkSize = val;
                this.clearChunks();
            }
        });

        this.exposeProperty("seed", "number", this.seed, {
            description: "World generation seed",
            onChange: (val) => {
                this.seed = val;
                this.clearChunks();
            }
        });

        this.exposeProperty("grassHeight", "number", this.grassHeight, {
            description: "Base surface height",
            onChange: (val) => {
                this.grassHeight = val;
                this.clearChunks();
            }
        });

        this.exposeProperty("terrainScale", "number", this.terrainScale, {
            description: "Scale of terrain features",
            onChange: (val) => {
                this.terrainScale = val;
                this.clearChunks();
            }
        });

        this.exposeProperty("mountainHeight", "number", this.mountainHeight, {
            description: "Height of mountains/hills",
            onChange: (val) => {
                this.mountainHeight = val;
                this.clearChunks();
            }
        });

        this.exposeProperty("dirtDepth", "number", this.dirtDepth, {
            description: "Depth of dirt layer",
            onChange: (val) => {
                this.dirtDepth = val;
                this.clearChunks();
            }
        });

        this.exposeProperty("stoneDepth", "number", this.stoneDepth, {
            description: "Depth of stone layer",
            onChange: (val) => {
                this.stoneDepth = val;
                this.clearChunks();
            }
        });

        this.exposeProperty("caveFrequency", "number", this.caveFrequency, {
            description: "Frequency of cave generation",
            onChange: (val) => {
                this.caveFrequency = val;
                this.clearChunks();
            }
        });

        this.exposeProperty("oreFrequency", "number", this.oreFrequency, {
            description: "Frequency of ore generation",
            onChange: (val) => {
                this.oreFrequency = val;
                this.clearChunks();
            }
        });

        this.exposeProperty("enableBlending", "boolean", this.enableBlending, {
            description: "Enable smooth tile blending",
            onChange: (val) => {
                this.enableBlending = val;
            }
        });

        this.exposeProperty("blendStrength", "number", this.blendStrength, {
            description: "Strength of tile blending effect",
            min: 0, max: 1, step: 0.1,
            onChange: (val) => {
                this.blendStrength = val;
            }
        });

        this.exposeProperty("enableShading", "boolean", this.enableShading, {
            description: "Enable depth-based shading",
            onChange: (val) => {
                this.enableShading = val;
            }
        });

        this.exposeProperty("shadingStrength", "number", this.shadingStrength, {
            description: "Strength of shading effect",
            min: 0, max: 1, step: 0.1,
            onChange: (val) => {
                this.shadingStrength = val;
            }
        });

        this.exposeProperty("editMode", "select", this.editMode, {
            description: "Editing mode",
            options: [
                { value: "draw", label: "Draw" },
                { value: "erase", label: "Erase" },
                { value: "fill", label: "Fill" },
                { value: "eyedropper", label: "Eyedropper" }
            ],
            onChange: (val) => {
                this.editMode = val;
            }
        });

        this.exposeProperty("selectedTileType", "select", this.selectedTileType, {
            description: "Tile type to place",
            options: Object.keys(this.tileTypes).map(k => ({
                value: parseInt(k),
                label: this.tileTypes[k].name
            })),
            onChange: (val) => {
                this.selectedTileType = val;
            }
        });

        this.exposeProperty("brushSize", "number", this.brushSize, {
            description: "Brush size for drawing",
            min: 1, max: 10,
            onChange: (val) => {
                this.brushSize = val;
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
        style.startGroup("Generation Settings", false, {
            backgroundColor: 'rgba(76,175,80,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("generationType", "select", this.generationType, {
            description: "Terrain generation algorithm",
            options: [
                { value: "terraria", label: "🏔️ Terraria Style" },
                { value: "perlin", label: "🌊 Perlin Noise" },
                { value: "caverns", label: "🕳️ Cave Systems" },
                { value: "islands", label: "🏝️ Floating Islands" },
                { value: "flat", label: "📏 Flat World" },
                { value: "mountains", label: "⛰️ Mountain Ranges" }
            ],
            style: { label: "Generation Type" }
        });

        style.exposeProperty("seed", "number", this.seed, {
            description: "Random seed for world generation",
            style: { label: "Seed" }
        });

        style.exposeProperty("chunkSize", "number", this.chunkSize, {
            description: "Tiles per chunk",
            min: 16,
            max: 64,
            step: 8,
            style: { label: "Chunk Size", slider: true }
        });

        style.endGroup();

        style.startGroup("Terrain Parameters", false, {
            backgroundColor: 'rgba(141,110,99,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("grassHeight", "number", this.grassHeight, {
            description: "Base surface height",
            min: 5,
            max: 50,
            step: 1,
            style: { label: "Surface Height", slider: true }
        });

        style.exposeProperty("terrainScale", "number", this.terrainScale, {
            description: "Scale of terrain features",
            min: 0.01,
            max: 0.2,
            step: 0.01,
            style: { label: "Terrain Scale", slider: true }
        });

        style.exposeProperty("mountainHeight", "number", this.mountainHeight, {
            description: "Height of mountains/hills",
            min: 10,
            max: 100,
            step: 5,
            style: { label: "Mountain Height", slider: true }
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

        style.startGroup("Cave & Ore Settings", false, {
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
            backgroundColor: 'rgba(33,150,243,0.1)',
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

        style.exposeProperty("enableBlending", "boolean", this.enableBlending, {
            description: "Enable smooth tile color blending",
            style: { label: "Enable Blending" }
        });

        style.exposeProperty("blendStrength", "number", this.blendStrength, {
            description: "Strength of blending effect",
            min: 0,
            max: 1,
            step: 0.1,
            style: { label: "Blend Strength", slider: true }
        });

        style.exposeProperty("enableShading", "boolean", this.enableShading, {
            description: "Enable depth-based shading",
            style: { label: "Enable Shading" }
        });

        style.exposeProperty("shadingStrength", "number", this.shadingStrength, {
            description: "Strength of shading",
            min: 0,
            max: 1,
            step: 0.1,
            style: { label: "Shading Strength", slider: true }
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

        style.startGroup("Editor Tools", false, {
            backgroundColor: 'rgba(255,152,0,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("editMode", "select", this.editMode, {
            description: "Current editing mode",
            options: [
                { value: "draw", label: "✏️ Draw" },
                { value: "erase", label: "🧹 Erase" },
                { value: "fill", label: "🪣 Fill" },
                { value: "eyedropper", label: "💧 Eyedropper" }
            ],
            style: { label: "Edit Mode" }
        });

        style.exposeProperty("selectedTileType", "select", this.selectedTileType, {
            description: "Tile type to place",
            options: Object.keys(this.tileTypes).map(k => ({
                value: parseInt(k),
                label: this.tileTypes[k].name
            })),
            style: { label: "Selected Tile" }
        });

        style.exposeProperty("brushSize", "number", this.brushSize, {
            description: "Size of brush for drawing",
            min: 1,
            max: 10,
            step: 1,
            style: { label: "Brush Size", slider: true }
        });

        style.endGroup();

        style.addDivider();
        style.addHelpText("🌍 Infinite procedural terrain! Pan around to explore. Hold Ctrl and click to paint tiles. The world generates infinitely in all directions based on the seed.");
    }

    // ========================================
    // CHUNK MANAGEMENT
    // ========================================

    getChunkKey(chunkX, chunkY) {
        return `${chunkX},${chunkY}`;
    }

    worldToChunk(worldX, worldY) {
        return {
            x: Math.floor(worldX / (this.chunkSize * this.tileSize)),
            y: Math.floor(worldY / (this.chunkSize * this.tileSize))
        };
    }

    getChunk(chunkX, chunkY) {
        const key = this.getChunkKey(chunkX, chunkY);
        if (!this.chunks.has(key)) {
            this.generateChunk(chunkX, chunkY);
        }
        return this.chunks.get(key);
    }

    clearChunks() {
        this.chunks.clear();
    }

    generateChunk(chunkX, chunkY) {
        const chunk = {
            x: chunkX,
            y: chunkY,
            tiles: []
        };

        // Initialize chunk tiles
        for (let x = 0; x < this.chunkSize; x++) {
            chunk.tiles[x] = [];
            for (let y = 0; y < this.chunkSize; y++) {
                chunk.tiles[x][y] = 0; // Air by default
            }
        }

        // Generate based on selected type
        switch (this.generationType) {
            case "terraria":
                this.generateChunkTerraria(chunk);
                break;
            case "perlin":
                this.generateChunkPerlin(chunk);
                break;
            case "caverns":
                this.generateChunkCaverns(chunk);
                break;
            case "islands":
                this.generateChunkIslands(chunk);
                break;
            case "flat":
                this.generateChunkFlat(chunk);
                break;
            case "mountains":
                this.generateChunkMountains(chunk);
                break;
            default:
                this.generateChunkTerraria(chunk);
        }

        // Add ores (except for islands which handles its own)
        if (this.generationType !== "islands") {
            this.generateChunkOres(chunk);
        }

        const key = this.getChunkKey(chunkX, chunkY);
        this.chunks.set(key, chunk);
    }

    // ========================================
    // NOISE AND RANDOM
    // ========================================

    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    noise(x, y, scale = 1, octaves = 1, persistence = 0.5) {
        let total = 0;
        let frequency = scale;
        let amplitude = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            const seedOffset = this.seed * 9999 + i * 1000;
            const scaledX = x * frequency;
            const scaledY = y * frequency;

            const n1 = this.seededRandom(scaledX * 12.9898 + scaledY * 78.233 + seedOffset);
            const n2 = this.seededRandom(scaledX * 37.719 + scaledY * 17.2131 + seedOffset + 1000);

            total += ((n1 + n2) / 2) * amplitude;
            maxValue += amplitude;

            amplitude *= persistence;
            frequency *= 2;
        }

        return total / maxValue;
    }

    // ========================================
    // CHUNK GENERATION METHODS
    // ========================================

    generateChunkTerraria(chunk) {
        const chunkWorldX = chunk.x * this.chunkSize;
        const chunkWorldY = chunk.y * this.chunkSize;

        // Generate surface terrain for this chunk
        for (let x = 0; x < this.chunkSize; x++) {
            const worldX = chunkWorldX + x;
            const height = Math.floor(
                this.grassHeight +
                this.noise(worldX, 0, this.terrainScale, this.terrainOctaves, this.terrainPersistence) * this.mountainHeight
            );

            for (let y = 0; y < this.chunkSize; y++) {
                const worldY = chunkWorldY + y;

                if (worldY < height) {
                    chunk.tiles[x][y] = 0; // Air
                } else if (worldY === height) {
                    chunk.tiles[x][y] = 1; // Grass
                } else if (worldY < height + this.dirtDepth) {
                    chunk.tiles[x][y] = 2; // Dirt
                } else {
                    chunk.tiles[x][y] = 3; // Stone
                }
            }
        }

        // Generate caves
        for (let x = 0; x < this.chunkSize; x++) {
            const worldX = chunkWorldX + x;
            for (let y = 0; y < this.chunkSize; y++) {
                const worldY = chunkWorldY + y;

                if (chunk.tiles[x][y] === 0 || worldY < this.grassHeight + 5) continue;

                const caveNoise = this.noise(worldX, worldY, 0.08, 2, 0.5);
                if (caveNoise > (1 - this.caveFrequency)) {
                    chunk.tiles[x][y] = 0; // Air (cave)
                }
            }
        }
    }

    generateChunkPerlin(chunk) {
        const chunkWorldX = chunk.x * this.chunkSize;
        const chunkWorldY = chunk.y * this.chunkSize;

        for (let x = 0; x < this.chunkSize; x++) {
            const worldX = chunkWorldX + x;
            for (let y = 0; y < this.chunkSize; y++) {
                const worldY = chunkWorldY + y;

                const noiseValue = this.noise(worldX, worldY, this.terrainScale, this.terrainOctaves, this.terrainPersistence);
                const depthFactor = (worldY - this.grassHeight) / 100;
                const threshold = 0.4 - (depthFactor * 0.3);

                if (noiseValue > threshold && worldY >= this.grassHeight) {
                    const depth = worldY - this.grassHeight;
                    if (depth < 3) {
                        chunk.tiles[x][y] = 1; // Grass
                    } else if (depth < this.dirtDepth) {
                        chunk.tiles[x][y] = 2; // Dirt
                    } else {
                        chunk.tiles[x][y] = 3; // Stone
                    }
                }
            }
        }
    }

    generateChunkCaverns(chunk) {
        const chunkWorldX = chunk.x * this.chunkSize;
        const chunkWorldY = chunk.y * this.chunkSize;

        for (let x = 0; x < this.chunkSize; x++) {
            const worldX = chunkWorldX + x;
            for (let y = 0; y < this.chunkSize; y++) {
                const worldY = chunkWorldY + y;

                if (worldY < this.grassHeight) {
                    chunk.tiles[x][y] = 0; // Air
                } else if (worldY < this.grassHeight + this.dirtDepth) {
                    chunk.tiles[x][y] = 2; // Dirt
                } else {
                    chunk.tiles[x][y] = 3; // Stone
                }
            }
        }

        // Add grass surface
        for (let x = 0; x < this.chunkSize; x++) {
            const worldX = chunkWorldX + x;
            for (let y = 0; y < this.chunkSize; y++) {
                const worldY = chunkWorldY + y;
                if (worldY === this.grassHeight && chunk.tiles[x][y] !== 0) {
                    chunk.tiles[x][y] = 1;
                    break;
                }
            }
        }

        // Create caverns
        for (let x = 0; x < this.chunkSize; x++) {
            const worldX = chunkWorldX + x;
            for (let y = 0; y < this.chunkSize; y++) {
                const worldY = chunkWorldY + y;

                if (chunk.tiles[x][y] === 0 || worldY < this.grassHeight + this.dirtDepth) continue;

                const cave1 = this.noise(worldX, worldY, 0.04, 3, 0.5);
                const cave2 = this.noise(worldX + 5000, worldY + 5000, 0.08, 2, 0.5);
                const cave3 = this.noise(worldX + 10000, worldY + 10000, 0.15, 1, 0.5);

                const caveThreshold = 0.65 - (this.caveFrequency * 0.2);

                if (cave1 > caveThreshold || cave2 > 0.7 || cave3 > 0.75) {
                    chunk.tiles[x][y] = 0; // Air
                }
            }
        }
    }

    generateChunkIslands(chunk) {
        const chunkWorldX = chunk.x * this.chunkSize;
        const chunkWorldY = chunk.y * this.chunkSize;

        // Check if any islands should be in this chunk
        // We generate island centers based on a grid with some randomness
        const islandSpacing = 40;
        const searchRadius = 3;

        for (let ix = -searchRadius; ix <= searchRadius; ix++) {
            for (let iy = -searchRadius; iy <= searchRadius; iy++) {
                const islandGridX = Math.floor(chunkWorldX / islandSpacing) + ix;
                const islandGridY = Math.floor(chunkWorldY / islandSpacing) + iy;

                const islandSeed = this.seed + islandGridX * 123.456 + islandGridY * 456.789;

                // Random chance for island to exist
                if (this.seededRandom(islandSeed) < 0.3) continue;

                const centerX = islandGridX * islandSpacing + this.seededRandom(islandSeed + 1) * 20 - 10;
                const centerY = islandGridY * islandSpacing + this.seededRandom(islandSeed + 2) * 20 - 10;
                const islandWidth = Math.floor(this.seededRandom(islandSeed + 3) * 15 + 10);
                const islandHeight = Math.floor(this.seededRandom(islandSeed + 4) * 8 + 6);

                // Generate island tiles that overlap this chunk
                for (let x = 0; x < this.chunkSize; x++) {
                    const worldX = chunkWorldX + x;
                    for (let y = 0; y < this.chunkSize; y++) {
                        const worldY = chunkWorldY + y;

                        const dx = (worldX - centerX) / islandWidth;
                        const dy = (worldY - centerY) / islandHeight;
                        const dist = Math.sqrt(dx * dx + dy * dy * 1.5);

                        const noiseVal = this.noise(worldX, worldY, 0.15, 2, 0.5);
                        const threshold = 0.9 + noiseVal * 0.3;

                        if (dist < threshold) {
                            const depthInIsland = worldY - (centerY - islandHeight);

                            if (depthInIsland < 2) {
                                chunk.tiles[x][y] = 1; // Grass
                            } else if (depthInIsland < 6) {
                                chunk.tiles[x][y] = 2; // Dirt
                            } else {
                                chunk.tiles[x][y] = 3; // Stone
                            }

                            // Add ores
                            if (chunk.tiles[x][y] === 3 && this.seededRandom(worldX * worldY + this.seed) > 0.95) {
                                chunk.tiles[x][y] = this.seededRandom(worldX * worldY + this.seed + 100) > 0.5 ? 5 : 6;
                            }
                        }
                    }
                }
            }
        }
    }

    generateChunkFlat(chunk) {
        const chunkWorldY = chunk.y * this.chunkSize;
        const surfaceY = this.grassHeight;

        for (let x = 0; x < this.chunkSize; x++) {
            for (let y = 0; y < this.chunkSize; y++) {
                const worldY = chunkWorldY + y;

                if (worldY < surfaceY) {
                    chunk.tiles[x][y] = 0; // Air
                } else if (worldY === surfaceY) {
                    chunk.tiles[x][y] = 1; // Grass
                } else if (worldY < surfaceY + this.dirtDepth) {
                    chunk.tiles[x][y] = 2; // Dirt
                } else {
                    chunk.tiles[x][y] = 3; // Stone
                }
            }
        }
    }

    generateChunkMountains(chunk) {
        const chunkWorldX = chunk.x * this.chunkSize;
        const chunkWorldY = chunk.y * this.chunkSize;

        for (let x = 0; x < this.chunkSize; x++) {
            const worldX = chunkWorldX + x;

            const baseHeight = this.noise(worldX, 0, 0.015, 1, 0.5) * this.mountainHeight * 0.5;
            const mountainNoise = this.noise(worldX, 100, 0.05, 4, 0.6) * (this.mountainHeight * 1.2);
            const detailNoise = this.noise(worldX, 200, 0.1, 2, 0.5) * (this.mountainHeight * 0.3);
            const surfaceY = Math.floor(this.grassHeight + baseHeight + mountainNoise + detailNoise);

            for (let y = 0; y < this.chunkSize; y++) {
                const worldY = chunkWorldY + y;

                if (worldY < surfaceY) {
                    chunk.tiles[x][y] = 0; // Air
                } else if (worldY === surfaceY) {
                    // Snow on high peaks
                    if (surfaceY < this.grassHeight - 15) {
                        chunk.tiles[x][y] = 8; // Snow
                    } else {
                        chunk.tiles[x][y] = 1; // Grass
                    }
                } else if (worldY < surfaceY + this.dirtDepth) {
                    chunk.tiles[x][y] = 2; // Dirt
                } else {
                    chunk.tiles[x][y] = 3; // Stone
                }
            }
        }

        // Add caves
        for (let x = 0; x < this.chunkSize; x++) {
            const worldX = chunkWorldX + x;
            for (let y = 0; y < this.chunkSize; y++) {
                const worldY = chunkWorldY + y;

                if (chunk.tiles[x][y] === 0 || worldY < this.grassHeight) continue;

                const caveNoise = this.noise(worldX, worldY, 0.07, 2, 0.5);
                if (caveNoise > (1 - this.caveFrequency * 0.4)) {
                    chunk.tiles[x][y] = 0; // Air
                }
            }
        }
    }

    generateChunkOres(chunk) {
        const chunkWorldX = chunk.x * this.chunkSize;
        const chunkWorldY = chunk.y * this.chunkSize;

        for (let x = 0; x < this.chunkSize; x++) {
            const worldX = chunkWorldX + x;
            for (let y = 0; y < this.chunkSize; y++) {
                const worldY = chunkWorldY + y;

                if (chunk.tiles[x][y] !== 3) continue; // Only in stone
                if (worldY < this.grassHeight + this.dirtDepth) continue;

                const oreNoise = this.noise(worldX, worldY, 0.2, 2, 0.5);
                if (oreNoise > (1 - this.oreFrequency)) {
                    const depth = worldY - (this.grassHeight + this.dirtDepth);
                    const depthRatio = Math.min(depth / 100, 1);

                    if (depthRatio < 0.2) {
                        chunk.tiles[x][y] = 4; // Coal
                    } else if (depthRatio < 0.5) {
                        chunk.tiles[x][y] = 5; // Iron
                    } else if (depthRatio < 0.8) {
                        chunk.tiles[x][y] = 6; // Gold
                    } else {
                        chunk.tiles[x][y] = this.seededRandom(worldX * worldY + this.seed) > 0.5 ? 6 : 5;
                    }
                }
            }
        }
    }

    // ========================================
    // TILE ACCESS (handles chunk boundaries)
    // ========================================

    worldToTile(worldX, worldY) {
        return {
            x: Math.floor(worldX / this.tileSize),
            y: Math.floor(worldY / this.tileSize)
        };
    }

    getTileAt(tileX, tileY) {
        const chunkX = Math.floor(tileX / this.chunkSize);
        const chunkY = Math.floor(tileY / this.chunkSize);
        const localX = tileX - chunkX * this.chunkSize;
        const localY = tileY - chunkY * this.chunkSize;

        const chunk = this.getChunk(chunkX, chunkY);
        if (!chunk || localX < 0 || localX >= this.chunkSize || localY < 0 || localY >= this.chunkSize) {
            return 0;
        }

        return chunk.tiles[localX][localY];
    }

    setTileAt(tileX, tileY, tileType) {
        const chunkX = Math.floor(tileX / this.chunkSize);
        const chunkY = Math.floor(tileY / this.chunkSize);
        const localX = tileX - chunkX * this.chunkSize;
        const localY = tileY - chunkY * this.chunkSize;

        const chunk = this.getChunk(chunkX, chunkY);
        if (!chunk || localX < 0 || localX >= this.chunkSize || localY < 0 || localY >= this.chunkSize) {
            return false;
        }

        chunk.tiles[localX][localY] = tileType;
        return true;
    }

    // ========================================
    // RENDERING
    // ========================================

    getBlendedColor(tileX, tileY) {
        const tileType = this.getTileAt(tileX, tileY);
        if (tileType === 0) return null;

        const tileData = this.tileTypes[tileType];
        if (!tileData || !this.enableBlending) {
            return tileData ? tileData.color : null;
        }

        const neighbors = [
            this.getTileAt(tileX - 1, tileY),
            this.getTileAt(tileX + 1, tileY),
            this.getTileAt(tileX, tileY - 1),
            this.getTileAt(tileX, tileY + 1)
        ];

        const differentNeighbors = neighbors.filter(n => n !== tileType && n !== 0).length;

        if (differentNeighbors === 0 || !tileData.blend || tileData.blend.length === 0) {
            return tileData.color;
        }

        const blendIndex = Math.floor(this.noise(tileX, tileY, 0.3) * tileData.blend.length);
        const blendColor = tileData.blend[blendIndex % tileData.blend.length];
        const blendAmount = (differentNeighbors / 4) * this.blendStrength;

        return this.mixColors(tileData.color, blendColor, blendAmount);
    }

    mixColors(color1, color2, ratio) {
        const c1 = this.hexToRgb(color1);
        const c2 = this.hexToRgb(color2);

        const r = Math.round(c1.r * (1 - ratio) + c2.r * ratio);
        const g = Math.round(c1.g * (1 - ratio) + c2.g * ratio);
        const b = Math.round(c1.b * (1 - ratio) + c2.b * ratio);

        return `rgb(${r}, ${g}, ${b})`;
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    draw(ctx) {
        const viewport = window.engine.viewport;

        // Disable smoothing so rectangles snap to pixel grid when possible
        ctx.save();
        if (ctx.imageSmoothingEnabled !== undefined) ctx.imageSmoothingEnabled = false;

        // Calculate viewport center in world coordinates
        const viewportCenterX = viewport.x + viewport.width / 2;
        const viewportCenterY = viewport.y + viewport.height / 2;

        // Calculate visible tile range
        const startTileX = Math.floor(viewport.x / this.tileSize);
        const endTileX = Math.ceil((viewport.x + viewport.width) / this.tileSize);
        const startTileY = Math.floor(viewport.y / this.tileSize);
        const endTileY = Math.ceil((viewport.y + viewport.height) / this.tileSize);

        // Calculate which chunks are visible
        const startChunkX = Math.floor(startTileX / this.chunkSize);
        const endChunkX = Math.floor(endTileX / this.chunkSize);
        const startChunkY = Math.floor(startTileY / this.chunkSize);
        const endChunkY = Math.floor(endTileY / this.chunkSize);

        // Load visible chunks
        for (let cx = startChunkX; cx <= endChunkX; cx++) {
            for (let cy = startChunkY; cy <= endChunkY; cy++) {
                this.getChunk(cx, cy);
            }
        }

        // Draw visible tiles
        for (let tileX = startTileX; tileX < endTileX; tileX++) {
            for (let tileY = startTileY; tileY < endTileY; tileY++) {
                const tileType = this.getTileAt(tileX, tileY);
                if (tileType === 0) continue;

                // compute pixel-aligned coordinates to avoid sub-pixel seams
                const drawX = tileX * this.tileSize;
                const drawY = tileY * this.tileSize;

                // round to nearest integer pixel and expand to cover any rounding gaps
                const px = Math.round(drawX);
                const py = Math.round(drawY);
                const pSize = Math.ceil(this.tileSize);

                const color = this.getBlendedColor(tileX, tileY);
                if (!color) continue;

                ctx.fillStyle = color;
                ctx.fillRect(px, py, pSize, pSize);

                // Add shading based on depth
                if (this.enableShading && tileY > this.grassHeight) {
                    const depth = (tileY - this.grassHeight) / 100;
                    const shadingAlpha = Math.min(depth * this.shadingStrength, this.shadingStrength);
                    ctx.fillStyle = `rgba(0, 0, 0, ${shadingAlpha})`;
                    ctx.fillRect(px, py, pSize, pSize);
                }

                // Add edge highlights
                if (this.enableShading) {
                    const hasAirAbove = this.getTileAt(tileX, tileY - 1) === 0;
                    const hasAirLeft = this.getTileAt(tileX - 1, tileY) === 0;

                    if (hasAirAbove) {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                        ctx.fillRect(px, py, pSize, 2);
                    }
                    if (hasAirLeft) {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                        ctx.fillRect(px, py, 2, pSize);
                    }
                }

                // Shading/highlights only on exposed faces to avoid seams between adjacent tiles
                if (this.enableShading) {
                    const up = this.getTileAt(tileX, tileY - 1);
                    const down = this.getTileAt(tileX, tileY + 1);
                    const left = this.getTileAt(tileX - 1, tileY);
                    const right = this.getTileAt(tileX + 1, tileY);

                    const depth = Math.max(0, tileY - this.grassHeight) / 100;
                    const shadingAlpha = Math.min(depth * this.shadingStrength, this.shadingStrength);

                    // strip size drawn inside the tile (prevents overlapping with neighbor drawing)
                    const strip = Math.max(1, Math.floor(this.tileSize * 0.12));

                    // Top highlight when exposed above (air)
                    if (up === 0) {
                        ctx.fillStyle = `rgba(255,255,255,${0.15})`;
                        ctx.fillRect(px, py, pSize, strip);
                    }

                    // Bottom shadow when exposed below (air)
                    if (down === 0) {
                        ctx.fillStyle = `rgba(0,0,0,${shadingAlpha})`;
                        ctx.fillRect(px, py + pSize - strip, pSize, strip);
                    }

                    // Left highlight when exposed left (air)
                    if (left === 0) {
                        ctx.fillStyle = `rgba(255,255,255,${0.12})`;
                        ctx.fillRect(px, py, strip, pSize);
                    }

                    // Right shadow when exposed right (air)
                    if (right === 0) {
                        ctx.fillStyle = `rgba(0,0,0,${shadingAlpha * 0.9})`;
                        ctx.fillRect(px + pSize - strip, py, strip, pSize);
                    }
                }
            }
        }

        // Draw grid if enabled (use 0.5 offsets for crisp 1px strokes)
        if (this.showGrid) {
            ctx.strokeStyle = this.gridColor;
            ctx.lineWidth = 1;

            for (let x = startTileX; x <= endTileX; x++) {
                const lineX = Math.round(x * this.tileSize) + 0.5;
                ctx.beginPath();
                ctx.moveTo(lineX, Math.round(startTileY * this.tileSize));
                ctx.lineTo(lineX, Math.round(endTileY * this.tileSize));
                ctx.stroke();
            }

            for (let y = startTileY; y <= endTileY; y++) {
                const lineY = Math.round(y * this.tileSize) + 0.5;
                ctx.beginPath();
                ctx.moveTo(Math.round(startTileX * this.tileSize), lineY);
                ctx.lineTo(Math.round(endTileX * this.tileSize), lineY);
                ctx.stroke();
            }
        }

        // Cleanup distant chunks to save memory
        this.cleanupDistantChunks(viewportCenterX, viewportCenterY);

        ctx.restore();
    }

    cleanupDistantChunks(centerX, centerY) {
        const centerChunk = this.worldToChunk(centerX, centerY);
        const keysToDelete = [];

        for (const [key, chunk] of this.chunks) {
            const dx = Math.abs(chunk.x - centerChunk.x);
            const dy = Math.abs(chunk.y - centerChunk.y);

            if (dx > this.chunkLoadRadius * 2 || dy > this.chunkLoadRadius * 2) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.chunks.delete(key));
    }

    drawGizmos(ctx) {
        if (!this.showGizmos) return;

        const viewport = window.engine.viewport;

        // Draw hover preview
        if (this.hoveredTile.x !== undefined && this.hoveredTile.y !== undefined) {
            // Draw brush preview
            if (this.showBrushPreview) {
                for (let bx = -Math.floor(this.brushSize / 2); bx <= Math.floor(this.brushSize / 2); bx++) {
                    for (let by = -Math.floor(this.brushSize / 2); by <= Math.floor(this.brushSize / 2); by++) {
                        const tx = this.hoveredTile.x + bx;
                        const ty = this.hoveredTile.y + by;

                        const px = Math.round(tx * this.tileSize);
                        const py = Math.round(ty * this.tileSize);
                        const pSize = Math.ceil(this.tileSize);

                        // Different preview based on mode
                        if (this.editMode === "draw") {
                            const tileData = this.tileTypes[this.selectedTileType];
                            ctx.fillStyle = tileData.color;
                            ctx.globalAlpha = 0.5;
                            ctx.fillRect(px, py, pSize, pSize);
                            ctx.globalAlpha = 1;
                        } else if (this.editMode === "erase") {
                            ctx.strokeStyle = "#FF0000";
                            ctx.lineWidth = 2;
                            ctx.strokeRect(px, py, pSize, pSize);
                        } else if (this.editMode === "fill") {
                            ctx.strokeStyle = "#00FF00";
                            ctx.lineWidth = 2;
                            ctx.strokeRect(px, py, pSize, pSize);
                        } else if (this.editMode === "eyedropper") {
                            ctx.strokeStyle = "#0088FF";
                            ctx.lineWidth = 3;
                            ctx.strokeRect(px, py, pSize, pSize);
                        }
                    }
                }
            }

            // Draw cursor highlight
            const drawX = Math.round(this.hoveredTile.x * this.tileSize);
            const drawY = Math.round(this.hoveredTile.y * this.tileSize);
            ctx.strokeStyle = "#FFFF00";
            ctx.lineWidth = 2;
            ctx.strokeRect(drawX, drawY, Math.ceil(this.tileSize), Math.ceil(this.tileSize));
        }

        // Draw edit mode indicator
        if (this.gameObject && this.gameObject.isEditorSelected) {
            const centerX = viewport.x + viewport.width / 2;
            const centerY = viewport.y - viewport.height / 2 + 40;

            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);

            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(centerX - 120, centerY - 25, 240, 50);

            ctx.fillStyle = "#FFFFFF";
            ctx.font = "14px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            let modeText = "";
            switch (this.editMode) {
                case "draw": modeText = "✏️ Draw Mode"; break;
                case "erase": modeText = "🧹 Erase Mode"; break;
                case "fill": modeText = "🪣 Fill Mode"; break;
                case "eyedropper": modeText = "💧 Eyedropper"; break;
            }

            ctx.fillText(modeText, centerX, centerY - 5);

            const tileData = this.tileTypes[this.selectedTileType];
            ctx.fillText(`Tile: ${tileData.name} | Brush: ${this.brushSize}`, centerX, centerY + 12);

            ctx.restore();
        }
    }

    // ========================================
    // EDITOR INTERACTION
    // ========================================

    onMouseDown(worldPos, button) {
        if (!this.gameObject || !this.gameObject.isEditorSelected) return false;

        const tile = this.worldToTile(worldPos.x, worldPos.y);

        this.isEditing = true;
        this.lastEditTile = { x: tile.x, y: tile.y };

        this.handleEdit(tile.x, tile.y);
        return true;
    }

    onMouseMove(worldPos) {
        if (!this.gameObject || !this.gameObject.isEditorSelected) return false;

        const tile = this.worldToTile(worldPos.x, worldPos.y);
        this.hoveredTile = tile;

        if (this.isEditing && (tile.x !== this.lastEditTile.x || tile.y !== this.lastEditTile.y)) {
            this.handleEdit(tile.x, tile.y);
            this.lastEditTile = { x: tile.x, y: tile.y };
        }

        return true;
    }

    onMouseUp(worldPos, button) {
        this.isEditing = false;
        return false;
    }

    handleEdit(x, y) {
        switch (this.editMode) {
            case "draw":
                this.drawAtTile(x, y);
                break;
            case "erase":
                this.eraseAtTile(x, y);
                break;
            case "fill":
                this.fillAtTile(x, y);
                break;
            case "eyedropper":
                this.eyedropperAtTile(x, y);
                break;
        }
    }

    drawAtTile(x, y) {
        const halfBrush = Math.floor(this.brushSize / 2);

        for (let bx = -halfBrush; bx <= halfBrush; bx++) {
            for (let by = -halfBrush; by <= halfBrush; by++) {
                const tx = x + bx;
                const ty = y + by;

                const dist = Math.sqrt(bx * bx + by * by);
                if (dist <= this.brushSize / 2) {
                    this.setTileAt(tx, ty, this.selectedTileType);
                }
            }
        }
    }

    eraseAtTile(x, y) {
        const halfBrush = Math.floor(this.brushSize / 2);

        for (let bx = -halfBrush; bx <= halfBrush; bx++) {
            for (let by = -halfBrush; by <= halfBrush; by++) {
                const tx = x + bx;
                const ty = y + by;

                const dist = Math.sqrt(bx * bx + by * by);
                if (dist <= this.brushSize / 2) {
                    this.setTileAt(tx, ty, 0);
                }
            }
        }
    }

    fillAtTile(x, y) {
        const targetType = this.getTileAt(x, y);
        if (targetType === this.selectedTileType) return;

        const stack = [[x, y]];
        const visited = new Set();
        const maxFill = 10000;
        let fillCount = 0;

        while (stack.length > 0 && fillCount < maxFill) {
            const [cx, cy] = stack.pop();
            const key = `${cx},${cy}`;

            if (visited.has(key)) continue;
            visited.add(key);

            if (this.getTileAt(cx, cy) !== targetType) continue;

            this.setTileAt(cx, cy, this.selectedTileType);
            fillCount++;

            stack.push([cx + 1, cy]);
            stack.push([cx - 1, cy]);
            stack.push([cx, cy + 1]);
            stack.push([cx, cy - 1]);
        }
    }

    eyedropperAtTile(x, y) {
        const tileType = this.getTileAt(x, y);
        if (tileType !== 0) {
            this.selectedTileType = tileType;
        }
    }

    // ========================================
    // PUBLIC API METHODS
    // ========================================

    getTileAtWorldPos(worldX, worldY) {
        const tile = this.worldToTile(worldX, worldY);
        return this.getTileAt(tile.x, tile.y);
    }

    setTileAtWorldPos(worldX, worldY, tileType) {
        const tile = this.worldToTile(worldX, worldY);
        return this.setTileAt(tile.x, tile.y, tileType);
    }

    worldToGrid(worldX, worldY) {
        return this.worldToTile(worldX, worldY);
    }

    gridToWorld(gridX, gridY) {
        return {
            x: gridX * this.tileSize,
            y: gridY * this.tileSize
        };
    }

    getTileCenterWorld(gridX, gridY) {
        const worldPos = this.gridToWorld(gridX, gridY);
        return {
            x: worldPos.x + this.tileSize / 2,
            y: worldPos.y + this.tileSize / 2
        };
    }

    isTileSolid(x, y) {
        const tileType = this.getTileAt(x, y);
        const tileData = this.tileTypes[tileType];
        return tileData ? tileData.solid : false;
    }

    isWorldPosSolid(worldX, worldY) {
        const tile = this.worldToTile(worldX, worldY);
        return this.isTileSolid(tile.x, tile.y);
    }

    checkPointCollision(worldX, worldY) {
        return this.isWorldPosSolid(worldX, worldY);
    }

    checkRectCollision(worldX, worldY, width, height) {
        const startTile = this.worldToTile(worldX, worldY);
        const endTile = this.worldToTile(worldX + width, worldY + height);

        for (let x = startTile.x; x <= endTile.x; x++) {
            for (let y = startTile.y; y <= endTile.y; y++) {
                if (this.isTileSolid(x, y)) {
                    return true;
                }
            }
        }
        return false;
    }

    checkCircleCollision(centerX, centerY, radius) {
        const startTile = this.worldToTile(centerX - radius, centerY - radius);
        const endTile = this.worldToTile(centerX + radius, centerY + radius);

        for (let x = startTile.x; x <= endTile.x; x++) {
            for (let y = startTile.y; y <= endTile.y; y++) {
                if (this.isTileSolid(x, y)) {
                    const tileCenter = this.getTileCenterWorld(x, y);
                    const dx = Math.abs(centerX - tileCenter.x);
                    const dy = Math.abs(centerY - tileCenter.y);

                    if (dx > (this.tileSize / 2 + radius)) continue;
                    if (dy > (this.tileSize / 2 + radius)) continue;

                    if (dx <= (this.tileSize / 2)) return true;
                    if (dy <= (this.tileSize / 2)) return true;

                    const cornerDistSq = Math.pow(dx - this.tileSize / 2, 2) +
                        Math.pow(dy - this.tileSize / 2, 2);

                    if (cornerDistSq <= (radius * radius)) return true;
                }
            }
        }
        return false;
    }

    getSolidTilesInRect(worldX, worldY, width, height) {
        const solidTiles = [];
        const startTile = this.worldToTile(worldX, worldY);
        const endTile = this.worldToTile(worldX + width, worldY + height);

        for (let x = startTile.x; x <= endTile.x; x++) {
            for (let y = startTile.y; y <= endTile.y; y++) {
                if (this.isTileSolid(x, y)) {
                    solidTiles.push({
                        gridX: x,
                        gridY: y,
                        worldX: x * this.tileSize,
                        worldY: y * this.tileSize,
                        type: this.getTileAt(x, y)
                    });
                }
            }
        }
        return solidTiles;
    }

    raycast(startX, startY, endX, endY) {
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.ceil(distance / (this.tileSize / 2));

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = startX + dx * t;
            const y = startY + dy * t;

            if (this.isWorldPosSolid(x, y)) {
                const tile = this.worldToTile(x, y);
                return {
                    hit: true,
                    gridX: tile.x,
                    gridY: tile.y,
                    worldX: x,
                    worldY: y,
                    distance: Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2)),
                    tileType: this.getTileAt(tile.x, tile.y)
                };
            }
        }

        return { hit: false };
    }

    getClosestSolidTile(worldX, worldY, searchRadius = 5) {
        const centerTile = this.worldToTile(worldX, worldY);
        let closestTile = null;
        let closestDist = Infinity;

        for (let x = centerTile.x - searchRadius; x <= centerTile.x + searchRadius; x++) {
            for (let y = centerTile.y - searchRadius; y <= centerTile.y + searchRadius; y++) {
                if (this.isTileSolid(x, y)) {
                    const tileCenter = this.getTileCenterWorld(x, y);
                    const dist = Math.sqrt(
                        Math.pow(worldX - tileCenter.x, 2) +
                        Math.pow(worldY - tileCenter.y, 2)
                    );

                    if (dist < closestDist) {
                        closestDist = dist;
                        closestTile = {
                            gridX: x,
                            gridY: y,
                            worldX: tileCenter.x,
                            worldY: tileCenter.y,
                            distance: dist,
                            type: this.getTileAt(x, y)
                        };
                    }
                }
            }
        }

        return closestTile;
    }

    hasGroundBelow(worldX, worldY, maxDistance = 100) {
        const startTile = this.worldToTile(worldX, worldY);
        const maxTiles = Math.ceil(maxDistance / this.tileSize);

        for (let dy = 1; dy <= maxTiles; dy++) {
            if (this.isTileSolid(startTile.x, startTile.y + dy)) {
                return {
                    hasGround: true,
                    gridY: startTile.y + dy,
                    worldY: (startTile.y + dy) * this.tileSize,
                    distance: dy * this.tileSize
                };
            }
        }

        return { hasGround: false };
    }

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

    getTileData(tileType) {
        return this.tileTypes[tileType] || null;
    }

    getAllTileTypes() {
        return this.tileTypes;
    }

    regenerateWorld() {
        this.clearChunks();
    }

    // ========================================
    // SERIALIZATION
    // ========================================

    toJSON() {
        // Convert chunks map to array for serialization
        const chunksArray = [];
        for (const [key, chunk] of this.chunks) {
            chunksArray.push(chunk);
        }

        return {
            ...super.toJSON(),
            chunkSize: this.chunkSize,
            tileSize: this.tileSize,
            seed: this.seed,
            generationType: this.generationType,
            grassHeight: this.grassHeight,
            dirtDepth: this.dirtDepth,
            stoneDepth: this.stoneDepth,
            caveFrequency: this.caveFrequency,
            oreFrequency: this.oreFrequency,
            terrainScale: this.terrainScale,
            terrainOctaves: this.terrainOctaves,
            terrainPersistence: this.terrainPersistence,
            mountainHeight: this.mountainHeight,
            showGrid: this.showGrid,
            gridColor: this.gridColor,
            enableBlending: this.enableBlending,
            blendStrength: this.blendStrength,
            enableShading: this.enableShading,
            shadingStrength: this.shadingStrength,
            chunks: chunksArray
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        if (!data) return;

        this.chunkSize = data.chunkSize || 32;
        this.tileSize = data.tileSize || 32;
        this.seed = data.seed || 12345;
        this.generationType = data.generationType || "terraria";
        this.grassHeight = data.grassHeight || 20;
        this.dirtDepth = data.dirtDepth || 15;
        this.stoneDepth = data.stoneDepth || 30;
        this.caveFrequency = data.caveFrequency || 0.3;
        this.oreFrequency = data.oreFrequency || 0.05;
        this.terrainScale = data.terrainScale || 0.05;
        this.terrainOctaves = data.terrainOctaves || 3;
        this.terrainPersistence = data.terrainPersistence || 0.5;
        this.mountainHeight = data.mountainHeight || 40;
        this.showGrid = data.showGrid || false;
        this.gridColor = data.gridColor || "#444444";
        this.enableBlending = data.enableBlending !== undefined ? data.enableBlending : true;
        this.blendStrength = data.blendStrength !== undefined ? data.blendStrength : 0.7;
        this.enableShading = data.enableShading !== undefined ? data.enableShading : true;
        this.shadingStrength = data.shadingStrength !== undefined ? data.shadingStrength : 0.3;

        // Restore chunks if they were saved
        if (data.chunks && Array.isArray(data.chunks)) {
            this.chunks.clear();
            for (const chunk of data.chunks) {
                const key = this.getChunkKey(chunk.x, chunk.y);
                this.chunks.set(key, chunk);
            }
        }
    }
}

window.TilemapSystem = TilemapSystem;
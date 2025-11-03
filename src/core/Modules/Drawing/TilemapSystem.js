class TilemapSystem extends Module {
    static namespace = "World";
    static description = "Infinite grid-based tilemap system with procedural generation and interactive editing";
    static allowMultiple = false;
    static iconClass = "fas fa-th";
    static iconColor = "#a200ffff";

    constructor() {
        super("TilemapSystem");

        // Chunk-based finite world
        this.chunkSize = 32; // tiles per chunk
        this.tileSize = 32; // pixels per tile
        this.chunks = new Map(); // stores generated chunks
        this.worldWidthTiles = 100; // finite world width in tiles
        this.worldHeightTiles = 100; // finite world height in tiles (ignored if infinite)
        this.infiniteWorld = false;

        this.chunkLoadRadius = 5;

        this.seed = 12345;

        // Generation settings
        this.generationType = "terraria"; // terraria, perlin, caverns, islands, flat
        this.randomizePerChunk = false; // New option for per-chunk randomization
        this.grassHeight = 5;
        this.dirtDepth = 3;
        this.stoneDepth = 2;
        this.caveFrequency = 0.3;
        this.oreFrequency = 0.05;

        // Terrain variation settings
        this.terrainScale = 0.05;
        this.terrainOctaves = 3;
        this.terrainPersistence = 0.5;
        this.mountainHeight = 7;
        this.valleyDepth = 10;

        // Visual settings
        this.showGrid = true;
        this.gridColor = "#e2e2e2ff";
        this.enableBlending = true;
        this.blendStrength = 0.7;
        this.enableShading = true;
        this.shadingStrength = 0.3;

        // Lighting settings
        this.enableLighting = false;
        this.lightingGradientSize = 5;
        this.smoothLighting = true;
        this.darknessSubdivisions = 2; // Number of subdivisions per tile for smooth lighting

        // Editor settings
        this.editMode = "draw"; // draw, erase, fill, eyedropper
        this.selectedTileType = 1;
        this.brushSize = 1;
        this.showBrushPreview = true;

        this.editTileTypes = false;

        // Texture settings
        this.enableTexture = true;
        this.textureScale = 0.02;
        this.textureContrast = 0.7;

        // Texture map settings (add after enableTexture properties)
        this.useTextureMap = false;
        this.tilesHor = 4; // Number of tiles horizontally in texture
        this.tilesVert = 4; // Number of tiles vertically in texture
        this.spriteRendererReference = null;
        this.enableAutotile = false;

        this.tiles = this.createEmptyTileArray();
        this.lighting = this.createEmptyTileArray();

        // Tile definitions with gradient colors for blending
        this.tileTypes = {
            0: { name: "Air", color: "transparent", solid: false, blend: [], enableTexture: false, textureScale: 0.02, textureContrast: 0.3, enableSquares: false, squareCount: 0, squareSize: 4, squareSpacing: 8, squareOpacity: 0.6, tileMapX: 0, tileMapY: 0, enableAutotile: false },
            1: { name: "Grass", color: "#4CAF50", solid: true, blend: ["#47575F", "#27373F", "#57676F"], enableTexture: true, textureScale: 0.02, textureContrast: 0.3, enableSquares: true, squareCount: 3, squareSize: 4, squareSpacing: 8, squareOpacity: 0.2, tileMapX: 0, tileMapY: 0, enableAutotile: true },
            2: { name: "Dirt", color: "#8D6E63", solid: true, blend: ["#47575F", "#27373F", "#57676F"], enableTexture: true, textureScale: 0.015, textureContrast: 0.3, enableSquares: true, squareCount: 2, squareSize: 3, squareSpacing: 6, squareOpacity: 0.3, tileMapX: 1, tileMapY: 0, enableAutotile: true },
            3: { name: "Stone", color: "#607D8B", solid: true, blend: ["#47575F", "#27373F", "#57676F"], enableTexture: true, textureScale: 0.025, textureContrast: 0.4, enableSquares: true, squareCount: 1, squareSize: 2, squareSpacing: 4, squareOpacity: 0.2, tileMapX: 2, tileMapY: 0, enableAutotile: true },
            4: { name: "Coal", color: "#37474F", solid: true, blend: ["#47575F", "#27373F", "#57676F"], enableTexture: true, textureScale: 0.02, textureContrast: 0.3, enableSquares: false, squareCount: 0, squareSize: 2, squareSpacing: 4, squareOpacity: 0.2, tileMapX: 3, tileMapY: 0, enableAutotile: false },
            5: { name: "Iron", color: "#FF7043", solid: true, blend: ["#47575F", "#27373F", "#57676F"], enableTexture: true, textureScale: 0.02, textureContrast: 0.4, enableSquares: false, squareCount: 0, squareSize: 2, squareSpacing: 4, squareOpacity: 0.2, tileMapX: 0, tileMapY: 1, enableAutotile: false },
            6: { name: "Gold", color: "#FFD700", solid: true, blend: ["#47575F", "#27373F", "#57676F"], enableTexture: true, textureScale: 0.02, textureContrast: 0.3, enableSquares: false, squareCount: 0, squareSize: 2, squareSpacing: 4, squareOpacity: 0.2, tileMapX: 1, tileMapY: 1, enableAutotile: false },
            7: { name: "Sand", color: "#F4E4C1", solid: true, blend: ["#47575F", "#27373F", "#57676F"], enableTexture: true, textureScale: 0.015, textureContrast: 0.3, enableSquares: true, squareCount: 2, squareSize: 3, squareSpacing: 6, squareOpacity: 0.3, tileMapX: 2, tileMapY: 1, enableAutotile: false },
            8: { name: "Snow", color: "#ECEFF1", solid: true, blend: ["#FCFFFF", "#DCEEF1", "#FFFFFF"], enableTexture: true, textureScale: 0.02, textureContrast: 0.2, enableSquares: false, squareCount: 0, squareSize: 2, squareSpacing: 4, squareOpacity: 0.2, tileMapX: 3, tileMapY: 1, enableAutotile: false },
            9: { name: "Ice", color: "#B3E5FC", solid: true, blend: ["#47575F", "#27373F", "#57676F"], enableTexture: true, textureScale: 0.02, textureContrast: 0.3, enableSquares: false, squareCount: 0, squareSize: 2, squareSpacing: 4, squareOpacity: 0.1, tileMapX: 0, tileMapY: 2, enableAutotile: false }
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
                this.regenerateWorld();
            }
        });

        this.exposeProperty("randomizePerChunk", "boolean", this.randomizePerChunk, {
            description: "Randomize generation per chunk for more variety (still seed-based)",
            onChange: (val) => {
                this.randomizePerChunk = val;
                this.regenerateWorld();
            }
        });

        this.exposeProperty("tileSize", "number", this.tileSize, {
            description: "Size of each tile in pixels",
            onChange: (val) => {
                this.tileSize = val;
                this.regenerateWorld();
            }
        });

        this.exposeProperty("infiniteWorld", "boolean", this.infiniteWorld, {
            description: "Enable infinite world generation (chunks generated on demand)",
            onChange: (val) => {
                this.infiniteWorld = val;
                if (this.infiniteWorld) {
                    // Clear finite tiles and regenerate chunks as needed
                    this.tiles = null; // Not needed for infinite
                    this.lighting = null; // Not needed for infinite
                    this.chunks.clear();
                } else {
                    // Reinitialize finite arrays
                    this.tiles = this.createEmptyTileArray();
                    this.lighting = this.createEmptyTileArray();
                    this.regenerateWorld();
                }
            }
        });

        this.exposeProperty("worldWidthTiles", "number", this.worldWidthTiles, {
            description: "Width of the world in chunks (finite world size)",
            min: 1,
            max: 1000,
            onChange: (val) => {
                this.worldWidthTiles = val;
                this.regenerateWorld();
            }
        });

        this.exposeProperty("worldHeightTiles", "number", this.worldHeightTiles, {
            description: "Height of the world in chunks (finite world size)",
            min: 1,
            max: 1000,
            onChange: (val) => {
                this.worldHeightTiles = val;
                this.regenerateWorld();
            }
        });

        this.exposeProperty("seed", "number", this.seed, {
            description: "World generation seed",
            onChange: (val) => {
                this.seed = val;
                this.regenerateWorld();
            }
        });

        this.exposeProperty("grassHeight", "number", this.grassHeight, {
            description: "Base surface height",
            onChange: (val) => {
                this.grassHeight = val;
                this.regenerateWorld();
            }
        });

        this.exposeProperty("terrainScale", "number", this.terrainScale, {
            description: "Scale of terrain features",
            onChange: (val) => {
                this.terrainScale = val;
                this.regenerateWorld();
            }
        });

        this.exposeProperty("mountainHeight", "number", this.mountainHeight, {
            description: "Height of mountains/hills",
            onChange: (val) => {
                this.mountainHeight = val;
                this.regenerateWorld();
            }
        });

        this.exposeProperty("dirtDepth", "number", this.dirtDepth, {
            description: "Depth of dirt layer",
            onChange: (val) => {
                this.dirtDepth = val;
                this.regenerateWorld();
            }
        });

        this.exposeProperty("stoneDepth", "number", this.stoneDepth, {
            description: "Depth of stone layer",
            onChange: (val) => {
                this.stoneDepth = val;
                this.regenerateWorld();
            }
        });

        this.exposeProperty("caveFrequency", "number", this.caveFrequency, {
            description: "Frequency of cave generation",
            onChange: (val) => {
                this.caveFrequency = val;
                this.regenerateWorld();
            }
        });

        this.exposeProperty("oreFrequency", "number", this.oreFrequency, {
            description: "Frequency of ore generation",
            onChange: (val) => {
                this.oreFrequency = val;
                this.regenerateWorld();
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

        this.exposeProperty("enableLighting", "boolean", this.enableLighting, {
            description: "Enable distance-based lighting from air blocks",
            onChange: (val) => {
                this.enableLighting = val;
                if (this.enableLighting) {
                    this.computeLighting();
                }
            }
        });

        this.exposeProperty("smoothLighting", "boolean", this.smoothLighting, {
            description: "Enable smooth gradient lighting (uses radial gradients per tile)",
            onChange: (val) => {
                this.smoothLighting = val;
            }
        });

        this.exposeProperty("darknessSubdivisions", "number", this.darknessSubdivisions, {
            description: "Number of subdivisions per tile for smooth lighting",
            min: 1, max: 16, step: 1,
            onChange: (val) => {
                this.darknessSubdivisions = val;
                if (this.enableLighting) {
                    this.computeLighting();
                }
            }
        });

        this.exposeProperty("lightingGradientSize", "number", this.lightingGradientSize, {
            description: "Number of tiles to fade to black from air blocks",
            min: 1, max: 50, step: 1,
            onChange: (val) => {
                this.lightingGradientSize = val;
                if (this.enableLighting) {
                    this.computeLighting();
                }
            }
        });


        this.exposeProperty("enableTexture", "boolean", this.enableTexture, {
            description: "Enable procedural texture generation for tiles",
            onChange: (val) => {
                this.enableTexture = val;
            }
        });

        this.exposeProperty("textureScale", "number", this.textureScale, {
            description: "Global scale for texture patterns",
            min: 0.001,
            max: 0.1,
            step: 0.001,
            onChange: (val) => {
                this.textureScale = val;
            }
        });

        this.exposeProperty("textureContrast", "number", this.textureContrast, {
            description: "Global contrast for texture patterns",
            min: 0,
            max: 1,
            step: 0.05,
            onChange: (val) => {
                this.textureContrast = val;
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

        this.exposeProperty("editTileTypes", "boolean", this.editTileTypes, {
            description: "Enable tile type editing",
            onChange: (val) => {
                this.editTileTypes = val;
            }
        });

        for (const [key, tileData] of Object.entries(this.tileTypes)) {
            this.exposeProperty(`tileColor_${key}`, "color", tileData.color, {
                description: `Color for ${tileData.name} tile`,
                onChange: (val) => {
                    this.tileTypes[key].color = val;
                }
            });
            this.exposeProperty('tileSolid_' + key, "boolean", tileData.solid, {
                description: `Solid property for ${tileData.name} tile`,
                onChange: (val) => {
                    this.tileTypes[key].solid = val;
                }
            });
            this.exposeProperty(`tileTexture_${key}`, "boolean", tileData.enableTexture, {
                description: `Enable texture for ${tileData.name} tile`,
                onChange: (val) => {
                    this.tileTypes[key].enableTexture = val;
                }
            });

            this.exposeProperty(`tileTextureScale_${key}`, "number", tileData.textureScale, {
                description: `Texture scale for ${tileData.name} tile`,
                min: 0.001,
                max: 0.1,
                step: 0.001,
                onChange: (val) => {
                    this.tileTypes[key].textureScale = val;
                }
            });

            this.exposeProperty(`tileTextureContrast_${key}`, "number", tileData.textureContrast, {
                description: `Texture contrast for ${tileData.name} tile`,
                min: 0,
                max: 1,
                step: 0.05,
                onChange: (val) => {
                    this.tileTypes[key].textureContrast = val;
                }
            });

            this.exposeProperty(`tileSquares_${key}`, "boolean", tileData.enableSquares, {
                description: `Enable decorative squares for ${tileData.name} tile`,
                onChange: (val) => {
                    this.tileTypes[key].enableSquares = val;
                }
            });

            this.exposeProperty(`tileSquareCount_${key}`, "number", tileData.squareCount, {
                description: `Number of squares per ${tileData.name} tile`,
                min: 0,
                max: 10,
                onChange: (val) => {
                    this.tileTypes[key].squareCount = val;
                }
            });

            this.exposeProperty(`tileSquareSize_${key}`, "number", tileData.squareSize, {
                description: `Square size for ${tileData.name} tile`,
                min: 1,
                max: 20,
                onChange: (val) => {
                    this.tileTypes[key].squareSize = val;
                }
            });

            this.exposeProperty(`tileSquareSpacing_${key}`, "number", tileData.squareSpacing, {
                description: `Square spacing for ${tileData.name} tile`,
                min: 2,
                max: 50,
                onChange: (val) => {
                    this.tileTypes[key].squareSpacing = val;
                }
            });

            this.exposeProperty(`tileSquareOpacity_${key}`, "number", tileData.squareOpacity, {
                description: `Square opacity for ${tileData.name} tile`,
                min: 0,
                max: 1,
                step: 0.05,
                onChange: (val) => {
                    this.tileTypes[key].squareOpacity = val;
                }
            });

            this.exposeProperty(`tileAutotile_${key}`, "boolean", tileData.enableAutotile || false, {
                description: `Enable autotiling for ${tileData.name} tile`,
                onChange: (val) => {
                    this.tileTypes[key].enableAutotile = val;
                }
            });

            // Add tileMapX and tileMapY properties INSIDE the loop
            this.exposeProperty(`tileMapX_${key}`, "number", tileData.tileMapX || 0, {
                description: `Texture map X coordinate for ${tileData.name} tile`,
                min: 0,
                max: 31,
                onChange: (val) => {
                    this.tileTypes[key].tileMapX = val;
                }
            });

            this.exposeProperty(`tileMapY_${key}`, "number", tileData.tileMapY || 0, {
                description: `Texture map Y coordinate for ${tileData.name} tile`,
                min: 0,
                max: 31,
                onChange: (val) => {
                    this.tileTypes[key].tileMapY = val;
                }
            });
        }

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

        // Move the tile type loop to a separate method
        this.setupTileTypeProperties();
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

        style.exposeProperty("randomizePerChunk", "boolean", this.randomizePerChunk, {
            description: "Randomize generation per chunk for more variety (still seed-based)"
        });

        style.exposeProperty("seed", "number", this.seed, {
            description: "Random seed for world generation",
            style: { label: "Seed" }
        });

        /*style.exposeProperty("chunkSize", "number", this.chunkSize, {
            description: "Tiles per chunk",
            min: 16,
            max: 64,
            step: 8,
            style: { label: "Chunk Size", slider: true }
        });*/

        style.exposeProperty("tileSize", "number", this.tileSize, {
            description: "Size of each tile in pixels",
            min: 8,
            max: 128,
            step: 8,
            style: { label: "Tile Size", slider: true }
        });

        style.exposeProperty("infiniteWorld", "boolean", this.infiniteWorld, {
            description: "Enable infinite world generation (chunks generated on demand)"
        });

        if (!this.infiniteWorld) {
            style.exposeProperty("worldWidthTiles", "number", this.worldWidthTiles, {
                description: "Width of the world in chunks (finite world size)",
                min: 1,
                max: 1000
            });

            style.exposeProperty("worldHeightTiles", "number", this.worldHeightTiles, {
                description: "Height of the world in chunks (finite world size)",
                min: 1,
                max: 1000
            });
        }

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

        style.exposeProperty("enableLighting", "boolean", this.enableLighting, {
            description: "Enable distance-based lighting from air blocks",
            style: { label: "Enable Lighting" }
        });

        if (this.enableLighting) {
            style.exposeProperty("smoothLighting", "boolean", this.smoothLighting, {
                description: "Enable smooth gradient lighting with radial gradients per tile",
                style: { label: "Smooth Lighting" }
            });

            style.exposeProperty("darknessSubdivisions", "number", this.darknessSubdivisions, {
                description: "Number of subdivisions per tile for smooth lighting",
                min: 1, max: 16, step: 1
            });

            style.exposeProperty("lightingGradientSize", "number", this.lightingGradientSize, {
                description: "Number of tiles to fade to black from air blocks",
                min: 1, max: 50, step: 1
            });
        }

        style.exposeProperty("enableTexture", "boolean", this.enableTexture, {
            description: "Enable procedural texture generation for tiles"
        });

        style.exposeProperty("textureScale", "number", this.textureScale, {
            description: "Global scale for texture patterns",
            min: 0.001,
            max: 0.1,
            step: 0.001
        });

        style.exposeProperty("textureContrast", "number", this.textureContrast, {
            description: "Global contrast for texture patterns",
            min: 0,
            max: 1,
            step: 0.05
        });

        style.startGroup("Texture Map Settings", false, {
            backgroundColor: 'rgba(156,39,176,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("useTextureMap", "boolean", this.useTextureMap, {
            description: "Use sprite sheet as texture map for tiles",
            style: { label: "Use Texture Map" },
            onChange: (val) => {
                this.useTextureMap = val;
            }
        });

        if (this.useTextureMap) {
            // Check if SpriteRenderer is available
            if (!this.spriteRendererReference) {
                this.spriteRendererReference = this.getModule("SpriteRenderer");
            }

            if (!this.spriteRendererReference) {
                style.addHelpText("⚠️ SpriteRenderer not found. Please add a SpriteRenderer module to this GameObject to use texture maps.");
            } else {
                style.addHelpText("✓ Using texture from SpriteRenderer");

                style.exposeProperty("tilesHor", "number", this.tilesHor, {
                    description: "Number of tile textures horizontally in sprite sheet",
                    min: 1,
                    max: 32,
                    step: 1,
                    style: { label: "Tiles Horizontal" },
                    onChange: (val) => {
                        this.tilesHor = val;
                    }
                });

                style.exposeProperty("tilesVert", "number", this.tilesVert, {
                    description: "Number of tile textures vertically in sprite sheet",
                    min: 1,
                    max: 32,
                    step: 1,
                    style: { label: "Tiles Vertical" },
                    onChange: (val) => {
                        this.tilesVert = val;
                    }
                });
            }
        }

        style.endGroup();

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

        style.startGroup("Tile Types", false, {
            backgroundColor: 'rgba(255,193,7,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("editTileTypes", "boolean", this.editTileTypes, {
            description: "Enable tile type editing"
        });

        if (this.editTileTypes) {
            // Add loop for tile type colors in style
            for (const [key, tileData] of Object.entries(this.tileTypes)) {
                if (key == 0) continue; // Skip air tile
                style.startGroup(`${tileData.name} Tile`, false, {
                    backgroundColor: 'rgba(255, 235, 59, 0.1)',
                    borderRadius: '6px',
                    padding: '8px'
                });

                style.exposeProperty(`tileColor_${key}`, "color", tileData.color, {
                    description: `Color for ${tileData.name} tile`,
                    style: { label: tileData.name }
                });
                style.exposeProperty(`tileSolid_${key}`, "boolean", tileData.solid, {
                    description: `Solid property for ${tileData.name} tile`,
                    style: { label: `${tileData.name} Solid` }
                });

                style.exposeProperty(`tileTexture_${key}`, "boolean", tileData.enableTexture, {
                    description: `Enable texture for ${tileData.name} tile`
                });

                style.exposeProperty(`tileTextureScale_${key}`, "number", tileData.textureScale, {
                    description: `Texture scale for ${tileData.name} tile`,
                    min: 0.001,
                    max: 0.1,
                    step: 0.001
                });

                style.exposeProperty(`tileTextureContrast_${key}`, "number", tileData.textureContrast, {
                    description: `Texture contrast for ${tileData.name} tile`,
                    min: 0,
                    max: 1,
                    step: 0.05
                });

                style.exposeProperty(`tileSquares_${key}`, "boolean", tileData.enableSquares, {
                    description: `Enable decorative squares for ${tileData.name} tile`
                });

                style.exposeProperty(`tileSquareCount_${key}`, "number", tileData.squareCount, {
                    description: `Number of squares per ${tileData.name} tile`,
                    min: 0,
                    max: 10
                });

                style.exposeProperty(`tileSquareSize_${key}`, "number", tileData.squareSize, {
                    description: `Square size for ${tileData.name} tile`,
                    min: 1,
                    max: 20
                });

                style.exposeProperty(`tileSquareSpacing_${key}`, "number", tileData.squareSpacing, {
                    description: `Square spacing for ${tileData.name} tile`,
                    min: 2,
                    max: 50
                });

                style.exposeProperty(`tileSquareOpacity_${key}`, "number", tileData.squareOpacity, {
                    description: `Square opacity for ${tileData.name} tile`,
                    min: 0,
                    max: 1,
                    step: 0.05
                });

                if (this.useTextureMap && this.spriteRendererReference) {
                    style.startGroup(`${tileData.name} Texture Index`, false, {
                        backgroundColor: 'rgba(255, 235, 59, 0.1)',
                        borderRadius: '6px',
                        padding: '8px'
                    });

                    style.exposeProperty(`tileAutotile_${key}`, "boolean", tileData.enableAutotile, {
                        description: `Enable autotiling for ${tileData.name} tile (requires 4x4 tile grid)`,
                        style: { label: "Enable Autotile" },
                        onChange: (val) => {
                            this.tileTypes[key].enableAutotile = val;
                        }
                    });

                    style.exposeProperty(`tileMapX_${key}`, "number", tileData.tileMapX, {
                        description: `Texture X position for ${tileData.name} tile (column index)`,
                        min: 0,
                        max: this.tilesHor - 1,
                        step: 1,
                        style: { label: "Texture X" },
                        onChange: (val) => {
                            this.tileTypes[key].tileMapX = val;
                        }
                    });

                    style.exposeProperty(`tileMapY_${key}`, "number", tileData.tileMapY, {
                        description: `Texture Y position for ${tileData.name} tile (row index)`,
                        min: 0,
                        max: this.tilesVert - 1,
                        step: 1,
                        style: { label: "Texture Y" },
                        onChange: (val) => {
                            this.tileTypes[key].tileMapY = val;
                        }
                    });

                    style.endGroup();
                }

                style.endGroup();
            }
        }

        style.endGroup();

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
        style.addHelpText("🌍 TileMap terrain with generation. Hold Ctrl and click to paint tiles. The world generates infinitely in all directions based on the seed.");
    }

    setupTileTypeProperties() {
        for (const [key, tileData] of Object.entries(this.tileTypes)) {
            this.exposeProperty(`tileColor_${key}`, "color", tileData.color, {
                description: `Color for ${tileData.name} tile`,
                onChange: (val) => {
                    this.tileTypes[key].color = val;
                }
            });
            this.exposeProperty('tileSolid_' + key, "boolean", tileData.solid, {
                description: `Solid property for ${tileData.name} tile`,
                onChange: (val) => {
                    this.tileTypes[key].solid = val;
                }
            });
            this.exposeProperty(`tileTexture_${key}`, "boolean", tileData.enableTexture, {
                description: `Enable texture for ${tileData.name} tile`,
                onChange: (val) => {
                    this.tileTypes[key].enableTexture = val;
                }
            });

            this.exposeProperty(`tileTextureScale_${key}`, "number", tileData.textureScale, {
                description: `Texture scale for ${tileData.name} tile`,
                min: 0.001,
                max: 0.1,
                step: 0.001,
                onChange: (val) => {
                    this.tileTypes[key].textureScale = val;
                }
            });

            this.exposeProperty(`tileTextureContrast_${key}`, "number", tileData.textureContrast, {
                description: `Texture contrast for ${tileData.name} tile`,
                min: 0,
                max: 1,
                step: 0.05,
                onChange: (val) => {
                    this.tileTypes[key].textureContrast = val;
                }
            });

            this.exposeProperty(`tileSquares_${key}`, "boolean", tileData.enableSquares, {
                description: `Enable decorative squares for ${tileData.name} tile`,
                onChange: (val) => {
                    this.tileTypes[key].enableSquares = val;
                }
            });

            this.exposeProperty(`tileSquareCount_${key}`, "number", tileData.squareCount, {
                description: `Number of squares per ${tileData.name} tile`,
                min: 0,
                max: 10,
                onChange: (val) => {
                    this.tileTypes[key].squareCount = val;
                }
            });

            this.exposeProperty(`tileSquareSize_${key}`, "number", tileData.squareSize, {
                description: `Square size for ${tileData.name} tile`,
                min: 1,
                max: 20,
                onChange: (val) => {
                    this.tileTypes[key].squareSize = val;
                }
            });

            this.exposeProperty(`tileSquareSpacing_${key}`, "number", tileData.squareSpacing, {
                description: `Square spacing for ${tileData.name} tile`,
                min: 2,
                max: 50,
                onChange: (val) => {
                    this.tileTypes[key].squareSpacing = val;
                }
            });

            this.exposeProperty(`tileSquareOpacity_${key}`, "number", tileData.squareOpacity, {
                description: `Square opacity for ${tileData.name} tile`,
                min: 0,
                max: 1,
                step: 0.05,
                onChange: (val) => {
                    this.tileTypes[key].squareOpacity = val;
                }
            });

            this.exposeProperty(`tileAutotile_${key}`, "boolean", tileData.enableAutotile || false, {
                description: `Enable autotiling for ${tileData.name} tile`,
                onChange: (val) => {
                    this.tileTypes[key].enableAutotile = val;
                }
            });

            // Add tileMapX and tileMapY properties INSIDE the loop
            this.exposeProperty(`tileMapX_${key}`, "number", tileData.tileMapX || 0, {
                description: `Texture map X coordinate for ${tileData.name} tile`,
                min: 0,
                max: 31,
                onChange: (val) => {
                    this.tileTypes[key].tileMapX = val;
                }
            });

            this.exposeProperty(`tileMapY_${key}`, "number", tileData.tileMapY || 0, {
                description: `Texture map Y coordinate for ${tileData.name} tile`,
                min: 0,
                max: 31,
                onChange: (val) => {
                    this.tileTypes[key].tileMapY = val;
                }
            });
        }
    }

    async start() {
        if (this.infiniteWorld) {
            this.gameObject.position.x = 0;
            this.gameObject.position.y = 0;
        }

        // Always re-acquire SpriteRenderer reference from this GameObject's modules
        // This ensures cloned TilemapSystems get their own SpriteRenderer reference
        this.spriteRendererReference = this.getModule("SpriteRenderer");

        if (this.spriteRendererReference) {
            this.spriteRendererReference.visible = false;
        }
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

    noise(x, y, scale = 1, octaves = 1, persistence = 0.5, seed = this.seed) {
        let total = 0;
        let frequency = scale;
        let amplitude = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            const seedOffset = seed * 9999 + i * 1000;
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
        const chunkSeed = this.randomizePerChunk ? this.seed + chunk.x * 1000000 + chunk.y * 1000000 : this.seed;

        // Generate surface terrain for this chunk
        for (let x = 0; x < this.chunkSize; x++) {
            const worldX = chunkWorldX + x;

            // Generate surface height with smoother noise
            const height = Math.floor(
                this.grassHeight +
                this.noise(worldX, 0, this.terrainScale, this.terrainOctaves, this.terrainPersistence, chunkSeed) * this.mountainHeight
            );

            for (let y = 0; y < this.chunkSize; y++) {
                const worldY = chunkWorldY + y;

                if (worldY < height) {
                    chunk.tiles[x][y] = 0; // Air above surface
                } else if (worldY === height) {
                    chunk.tiles[x][y] = 1; // Grass surface layer
                } else if (worldY < height + this.dirtDepth) {
                    chunk.tiles[x][y] = 2; // Dirt layer
                } else {
                    chunk.tiles[x][y] = 3; // Stone layer (everything below)
                }
            }
        }

        // Generate caves by carving through existing terrain
        for (let x = 0; x < this.chunkSize; x++) {
            const worldX = chunkWorldX + x;
            for (let y = 0; y < this.chunkSize; y++) {
                const worldY = chunkWorldY + y;

                // Only carve caves in solid blocks and below a certain depth
                if (chunk.tiles[x][y] === 0 || worldY < this.grassHeight + 5) continue;

                // Use multiple noise octaves for more interesting cave systems
                const cave1 = this.noise(worldX, worldY, 0.08, 3, 0.5, chunkSeed);
                const cave2 = this.noise(worldX + 1000, worldY + 1000, 0.05, 2, 0.6, chunkSeed);

                // Combine noise values for worm-like caves
                const caveValue = cave1 * 0.6 + cave2 * 0.4;

                if (caveValue > (1 - this.caveFrequency)) {
                    chunk.tiles[x][y] = 0; // Carve out cave
                }
            }
        }
    }

    generateChunkPerlin(chunk) {
        const chunkWorldX = chunk.x * this.chunkSize;
        const chunkWorldY = chunk.y * this.chunkSize;
        const chunkSeed = this.randomizePerChunk ? this.seed + chunk.x * 1000000 + chunk.y * 1000000 : this.seed;

        for (let x = 0; x < this.chunkSize; x++) {
            const worldX = chunkWorldX + x;
            for (let y = 0; y < this.chunkSize; y++) {
                const worldY = chunkWorldY + y;

                const noiseValue = this.noise(worldX, worldY, this.terrainScale, this.terrainOctaves, this.terrainPersistence, chunkSeed);
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
        const chunkSeed = this.randomizePerChunk ? this.seed + chunk.x * 1000000 + chunk.y * 1000000 : this.seed;

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

                const cave1 = this.noise(worldX, worldY, 0.04, 3, 0.5, chunkSeed);
                const cave2 = this.noise(worldX + 5000, worldY + 5000, 0.08, 2, 0.5, chunkSeed);
                const cave3 = this.noise(worldX + 10000, worldY + 10000, 0.15, 1, 0.5, chunkSeed);

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
        const chunkSeed = this.randomizePerChunk ? this.seed + chunk.x * 1000000 + chunk.y * 1000000 : this.seed;

        // Check if any islands should be in this chunk
        // We generate island centers based on a grid with some randomness
        const islandSpacing = 40;
        const searchRadius = 5; // Increased from 3 for more coverage

        for (let ix = -searchRadius; ix <= searchRadius; ix++) {
            for (let iy = -searchRadius; iy <= searchRadius; iy++) {
                const islandGridX = Math.floor(chunkWorldX / islandSpacing) + ix;
                const islandGridY = Math.floor(chunkWorldY / islandSpacing) + iy;

                const islandSeed = this.seed + islandGridX * 123.456 + islandGridY * 456.789;

                // Random chance for island to exist
                if (this.seededRandom(islandSeed) < 0.6) continue; // Increased from 0.3

                const centerX = islandGridX * islandSpacing + this.seededRandom(islandSeed + 1) * 20 - 10;
                const centerY = islandGridY * islandSpacing + this.seededRandom(islandSeed + 2) * 20 - 10;
                const islandWidth = Math.floor(this.seededRandom(islandSeed + 3) * 25 + 15); // Increased min/max size
                const islandHeight = Math.floor(this.seededRandom(islandSeed + 4) * 12 + 8); // Slightly increased

                // Generate island tiles that overlap this chunk
                for (let x = 0; x < this.chunkSize; x++) {
                    const worldX = chunkWorldX + x;
                    for (let y = 0; y < this.chunkSize; y++) {
                        const worldY = chunkWorldY + y;

                        const dx = (worldX - centerX) / islandWidth;
                        const dy = (worldY - centerY) / islandHeight;
                        const dist = Math.sqrt(dx * dx + dy * dy * 1.5);

                        const noiseVal = this.noise(worldX, worldY, 0.15, 2, 0.5, chunkSeed);
                        const threshold = 1.0 + noiseVal * 0.4; // Relaxed from 0.9-1.2 to 1.0-1.4 for more coverage

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
        const chunkSeed = this.randomizePerChunk ? this.seed + chunk.x * 1000000 + chunk.y * 1000000 : this.seed;

        for (let x = 0; x < this.chunkSize; x++) {
            const worldX = chunkWorldX + x;

            const baseHeight = Math.max(this.noise(worldX, 0, 0.015, 1, 0.5, chunkSeed) * this.mountainHeight * 0.5, 10); // Ensure minimum height of 10
            const mountainNoise = this.noise(worldX, 100, 0.05, 4, 0.6, chunkSeed) * (this.mountainHeight * 0.8); // Reduced multiplier for more consistent heights
            const detailNoise = this.noise(worldX, 200, 0.1, 2, 0.5, chunkSeed) * (this.mountainHeight * 0.2); // Reduced multiplier
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

                const caveNoise = this.noise(worldX, worldY, 0.07, 2, 0.5, chunkSeed);
                if (caveNoise > (1 - this.caveFrequency * 0.4)) {
                    chunk.tiles[x][y] = 0; // Air
                }
            }
        }
    }

    generateChunkOres(chunk) {
        const chunkWorldX = chunk.x * this.chunkSize;
        const chunkWorldY = chunk.y * this.chunkSize;
        const chunkSeed = this.randomizePerChunk ? this.seed + chunk.x * 1000000 + chunk.y * 1000000 : this.seed;

        for (let x = 0; x < this.chunkSize; x++) {
            const worldX = chunkWorldX + x;
            for (let y = 0; y < this.chunkSize; y++) {
                const worldY = chunkWorldY + y;

                if (chunk.tiles[x][y] !== 3) continue; // Only in stone
                if (worldY < this.grassHeight + this.dirtDepth) continue;

                const oreNoise = this.noise(worldX, worldY, 0.2, 2, 0.5, chunkSeed);
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
                        chunk.tiles[x][y] = this.seededRandom(worldX * worldY + chunkSeed) > 0.5 ? 6 : 5;
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
        // Defensive checks
        if (typeof tileX !== "number" || typeof tileY !== "number") return 0;

        if (!this.infiniteWorld) {
            // Ensure tile storage exists
            if (!this.tiles) {
                this.tiles = this.createEmptyTileArray();
                if (!this.tiles) return 0;
            }

            if (tileX < 0 || tileX >= this.worldWidthTiles || tileY < 0 || tileY >= this.worldHeightTiles) {
                return 0;
            }

            const col = this.tiles[tileX];
            if (!col) return 0;
            return col[tileY] !== undefined ? col[tileY] : 0;
        } else {
            // Infinite: Get from chunks (handle negative coords cleanly)
            const chunkX = Math.floor(tileX / this.chunkSize);
            const chunkY = Math.floor(tileY / this.chunkSize);
            const chunk = this.getChunk(chunkX, chunkY);
            if (!chunk || !chunk.tiles) return 0;

            // positive modulo for local indices
            const localX = ((tileX % this.chunkSize) + this.chunkSize) % this.chunkSize;
            const localY = ((tileY % this.chunkSize) + this.chunkSize) % this.chunkSize;

            const col = chunk.tiles[localX];
            if (!col) return 0;
            return col[localY] !== undefined ? col[localY] : 0;
        }
    }

    setTileAt(tileX, tileY, tileType) {
        if (typeof tileX !== "number" || typeof tileY !== "number") return false;

        if (!this.infiniteWorld) {
            // Ensure tile storage exists
            if (!this.tiles) this.tiles = this.createEmptyTileArray();
            if (!this.tiles) return false;

            if (tileX < 0 || tileX >= this.worldWidthTiles || tileY < 0 || tileY >= this.worldHeightTiles) {
                return false;
            }

            if (!this.tiles[tileX]) this.tiles[tileX] = new Array(this.worldHeightTiles).fill(0);
            this.tiles[tileX][tileY] = tileType;
            return true;
        } else {
            // Infinite: Set in chunks (handle negative coords)
            const chunkX = Math.floor(tileX / this.chunkSize);
            const chunkY = Math.floor(tileY / this.chunkSize);
            const chunk = this.getChunk(chunkX, chunkY);
            if (!chunk) return false;

            const localX = ((tileX % this.chunkSize) + this.chunkSize) % this.chunkSize;
            const localY = ((tileY % this.chunkSize) + this.chunkSize) % this.chunkSize;

            if (!chunk.tiles[localX]) chunk.tiles[localX] = new Array(this.chunkSize).fill(0);
            chunk.tiles[localX][localY] = tileType;
            return true;
        }
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

    getTexturedColor(tileX, tileY) {
        const tileType = this.getTileAt(tileX, tileY);
        if (tileType === 0) return null;

        const tileData = this.tileTypes[tileType];
        if (!tileData || !this.enableTexture || !tileData.enableTexture) {
            return this.getBlendedColor(tileX, tileY);
        }

        const baseColor = this.getBlendedColor(tileX, tileY);
        if (!baseColor) return null;

        // Generate texture pattern
        const textureIntensity = this.generateTexturePattern(tileX * this.tileSize, tileY * this.tileSize, tileData.textureScale, tileData.textureContrast);

        // Apply texture as overlay
        return this.applyTextureOverlay(baseColor, textureIntensity, tileData.textureContrast);
    }

    generateTexturePattern(x, y, scale, contrast) {
        // Offset texture noise coordinates to avoid correlation with terrain generation noise
        const offsetX = 10000; // Arbitrary large offset to shift into a different noise space
        const offsetY = 10000;

        // Create a tilable noise pattern with offset
        const noise1 = this.noise(x * scale + offsetX, y * scale + offsetY);
        const noise2 = this.noise(x * scale * 2.1 + offsetX, y * scale * 1.7 + offsetY);
        const noise3 = this.noise(x * scale * 4.3 + offsetX, y * scale * 3.9 + offsetY);

        let texture = (noise1 * 0.4 + noise2 * 0.3 + noise3 * 0.3);

        // Apply contrast
        texture = (texture - 0.5) * contrast * 1.5 + 0.5;

        return Math.max(0, Math.min(1, texture));
    }

    applyTextureOverlay(baseColor, textureIntensity, contrast) {
        // Parse baseColor (supports both #RRGGBB and rgb(r,g,b) formats)
        let r, g, b;
        if (baseColor.startsWith('#')) {
            // Hex format
            const hex = baseColor.replace('#', '');
            r = parseInt(hex.substr(0, 2), 16);
            g = parseInt(hex.substr(2, 2), 16);
            b = parseInt(hex.substr(4, 2), 16);
        } else if (baseColor.startsWith('rgb(')) {
            // RGB format
            const rgbMatch = baseColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (rgbMatch) {
                r = parseInt(rgbMatch[1], 10);
                g = parseInt(rgbMatch[2], 10);
                b = parseInt(rgbMatch[3], 10);
            } else {
                // Fallback to default if parsing fails
                r = g = b = 128;
            }
        } else {
            // Fallback for unexpected formats
            r = g = b = 128;
        }

        // Mix base color with texture pattern
        const mixRatio = textureIntensity * 0.3;
        const texR = Math.floor(r * (1 - mixRatio) + (textureIntensity * 255) * mixRatio);
        const texG = Math.floor(g * (1 - mixRatio) + (textureIntensity * 255) * mixRatio);
        const texB = Math.floor(b * (1 - mixRatio) + (textureIntensity * 255) * mixRatio);

        return `rgb(${Math.max(0, Math.min(255, texR))}, ${Math.max(0, Math.min(255, texG))}, ${Math.max(0, Math.min(255, texB))})`;
    }

    computeLighting() {
        if (this.infiniteWorld) {
            // For infinite worlds, lighting is complex; skip or implement per-chunk
            // For now, disable lighting for infinite worlds to avoid performance issues
            console.warn("Lighting not supported for infinite worlds.");
            return;
        }

        // Initialize lighting to 0 (dark)
        for (let x = 0; x < this.worldWidthTiles; x++) {
            for (let y = 0; y < this.worldHeightTiles; y++) {
                this.lighting[x][y] = 0;
            }
        }

        // Use BFS to compute distance from air blocks
        const queue = [];
        const visited = new Set();

        // Mark all solid blocks adjacent to air as fully lit (distance 0)
        const directions = [
            { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 },
            { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }, { dx: 1, dy: 1 }
        ];

        for (let x = 0; x < this.worldWidthTiles; x++) {
            for (let y = 0; y < this.worldHeightTiles; y++) {
                if (this.tiles[x][y] === 0) continue; // Skip air

                // Check if this solid block has any air neighbors
                let hasAirNeighbor = false;
                for (const dir of directions) {
                    const nx = x + dir.dx;
                    const ny = y + dir.dy;
                    if (nx >= 0 && nx < this.worldWidthTiles && ny >= 0 && ny < this.worldHeightTiles) {
                        if (this.tiles[nx][ny] === 0) { // Has an air neighbor
                            hasAirNeighbor = true;
                            break;
                        }
                    }
                }

                if (hasAirNeighbor) {
                    queue.push({ x, y, dist: 0 });
                    visited.add(`${x},${y}`);
                    this.lighting[x][y] = 1; // Full light for blocks touching air
                }
            }
        }

        while (queue.length > 0) {
            const { x, y, dist } = queue.shift();
            const light = Math.max(0, 1 - dist / this.lightingGradientSize);
            this.lighting[x][y] = light;

            if (dist >= this.lightingGradientSize) continue; // No need to propagate further

            for (const dir of directions) {
                const nx = x + dir.dx;
                const ny = y + dir.dy;
                const key = `${nx},${ny}`;

                if (nx >= 0 && nx < this.worldWidthTiles && ny >= 0 && ny < this.worldHeightTiles && !visited.has(key)) {
                    visited.add(key);
                    queue.push({ x: nx, y: ny, dist: dist + 1 });
                }
            }
        }
    }

    applyLighting(color, light) {
        // Parse color and multiply by light
        let r, g, b;
        if (color.startsWith('#')) {
            const hex = color.replace('#', '');
            r = parseInt(hex.substr(0, 2), 16);
            g = parseInt(hex.substr(2, 2), 16);
            b = parseInt(hex.substr(4, 2), 16);
        } else if (color.startsWith('rgb(')) {
            const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (rgbMatch) {
                r = parseInt(rgbMatch[1], 10);
                g = parseInt(rgbMatch[2], 10);
                b = parseInt(rgbMatch[3], 10);
            } else {
                r = g = b = 128;
            }
        } else {
            r = g = b = 128;
        }

        r = Math.floor(r * light);
        g = Math.floor(g * light);
        b = Math.floor(b * light);

        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Calculates the correct tileset offset for a tile based on its neighbors.
     * This function uses a 16-tile "blob" pattern based on the 4 cardinal neighbors.
     *
     * It can optionally replace the 4 inner-corner tiles with 4 ramp tiles
     * if the 'enableRamps' flag is set to true.
     *
     * @param {number} tileX - The X coordinate of the tile to check.
     * @param {number} tileY - The Y coordinate of the tile to check.
     * @param {boolean} [enableRamps=false] - Optional. If true, overrides inner-corners with ramps.
     * @returns {{offsetX: number, offsetY: number}} - The (x, y) offset in the tileset.
     */
    getAutotileOffset(tileX, tileY, enableRamps = false) {
        const currentType = this.getTileAt(tileX, tileY);

        // Check cardinal neighbors - only same type counts as neighbor
        const up = this.getTileAt(tileX, tileY - 1) > 0;
        const down = this.getTileAt(tileX, tileY + 1) > 0;
        const left = this.getTileAt(tileX - 1, tileY) > 0;
        const right = this.getTileAt(tileX + 1, tileY) > 0;

        // If tile has neighbors on all 4 sides, use the 4x4 blob section (columns 4-7)
        if (up && down && left && right) {
            // Check diagonal neighbors for corner variations
            const nw = this.getTileAt(tileX - 1, tileY - 1) > 0;
            const ne = this.getTileAt(tileX + 1, tileY - 1) > 0;
            const sw = this.getTileAt(tileX - 1, tileY + 1) > 0;
            const se = this.getTileAt(tileX + 1, tileY + 1) > 0;

            // 4x4 blob mapping for platformer tiles (columns 4-7, rows 0-3)
            // Row 0
            if (nw && ne && sw && se) return { offsetX: 2, offsetY: 2 }; // All corners - fully surrounded
            if (!nw && ne && sw && se) return { offsetX: 5, offsetY: 1 }; // Missing NW
            if (nw && !ne && sw && se) return { offsetX: 4, offsetY: 1 }; // Missing NE
            if (!nw && !ne && sw && se) return { offsetX: 4, offsetY: 3 }; // Missing both top corners

            // Row 1
            if (nw && ne && !sw && se) return { offsetX: 2, offsetY: 2 }; // Missing SW
            if (!nw && ne && !sw && se) return { offsetX: 2, offsetY: 2 }; // Missing NW+SW
            if (nw && !ne && sw && !se) return { offsetX: 6, offsetY: 1 }; // Missing NE+SE
            if (nw && ne && sw && !se) return { offsetX: 2, offsetY: 2 }; // Missing SE

            // Row 2
            if (!nw && !ne && !sw && se) return { offsetX: 4, offsetY: 2 }; // Only SE
            if (nw && !ne && !sw && se) return { offsetX: 5, offsetY: 2 }; // NW+SE diagonal
            if (!nw && ne && sw && !se) return { offsetX: 6, offsetY: 2 }; // NE+SW diagonal
            if (!nw && ne && !sw && !se) return { offsetX: 7, offsetY: 2 }; // Only NE

            // Row 3
            if (nw && ne && !sw && !se) return { offsetX: 3, offsetY: 2 }; // Missing both bottom
            if (!nw && !ne && sw && !se) return { offsetX: 5, offsetY: 3 }; // Only SW
            if (!nw && !ne && !sw && !se) return { offsetX: 4, offsetY: 3 }; // No corners
            if (nw && !ne && !sw && !se) return { offsetX: 7, offsetY: 3 }; // Only NW

            return { offsetX: 2, offsetY: 2 }; // Default to fully surrounded
        }

        // Compute diagonal neighbors (safe even if some cardinals are missing)
        const nw = this.getTileAt(tileX - 1, tileY - 1) > 0;
        const ne = this.getTileAt(tileX + 1, tileY - 1) > 0;
        const sw = this.getTileAt(tileX - 1, tileY + 1) > 0;
        const se = this.getTileAt(tileX + 1, tileY + 1) > 0;

        // If both top diagonals are missing and left is missing, and up/down are present -> use tile at (4,0)
        if (up && down && right && sw && se && !nw && !ne && !left) {
            return { offsetX: 4, offsetY: 0 };
        }

        // If both top diagonals are missing and right is missing, and up/down are present -> use tile at (5,0)
        if (up && down && left && se && sw && !nw && !ne && !right) {
            return { offsetX: 5, offsetY: 0 };
        }

        // For tiles without all 4 cardinal neighbors, use columns 0-3

        // Row 0: Isolated or horizontal-only tiles
        if (!up && !down && !left && !right) return { offsetX: 0, offsetY: 0 }; // Isolated
        if (!up && !down && !left && right) return { offsetX: 1, offsetY: 0 }; // Only right
        if (!up && !down && left && right) return { offsetX: 2, offsetY: 0 }; // Horizontal line
        if (!up && !down && left && !right) return { offsetX: 3, offsetY: 0 }; // Only left

        // Row 1: Bottom connection
        if (!up && down && !left && !right) return { offsetX: 0, offsetY: 1 }; // Only down
        if (!up && down && !left && right) return { offsetX: 1, offsetY: 1 }; // Down+right corner
        if (!up && down && left && right) return { offsetX: 2, offsetY: 1 }; // T-shape top
        if (!up && down && left && !right) return { offsetX: 3, offsetY: 1 }; // Down+left corner

        // Row 2: Vertical or T-shapes
        if (up && down && !left && !right) return { offsetX: 0, offsetY: 2 }; // Vertical line
        if (up && down && !left && right) return { offsetX: 1, offsetY: 2 }; // T-shape left
        if (up && down && left && !right) return { offsetX: 3, offsetY: 2 }; // T-shape right

        // Row 3: Top connection
        if (up && !down && !left && !right) return { offsetX: 0, offsetY: 3 }; // Only up
        if (up && !down && !left && right) return { offsetX: 1, offsetY: 3 }; // Up+right corner
        if (up && !down && left && right) return { offsetX: 2, offsetY: 3 }; // T-shape bottom
        if (up && !down && left && !right) return { offsetX: 3, offsetY: 3 }; // Up+left corner

        // Fallback
        return { offsetX: 0, offsetY: 0 };
    }

    draw(ctx) {
        const viewport = window.engine.viewport;

        ctx.save();
        if (ctx.imageSmoothingEnabled !== undefined) ctx.imageSmoothingEnabled = false;

        // Preload chunks around the viewport for infinite worlds to improve performance
        if (this.infiniteWorld) {
            const centerX = viewport.x + viewport.width / 2;
            const centerY = viewport.y + viewport.height / 2;
            this.preloadChunks(centerX, centerY);
        }

        let startTileX, endTileX, startTileY, endTileY;

        if (this.infiniteWorld) {
            // For infinite worlds, render based on viewport only
            startTileX = Math.floor(viewport.x / this.tileSize);
            endTileX = Math.ceil((viewport.x + viewport.width) / this.tileSize);
            startTileY = Math.floor(viewport.y / this.tileSize);
            endTileY = Math.ceil((viewport.y + viewport.height) / this.tileSize);
        } else {
            // For finite worlds, clamp to actual world dimensions
            startTileX = Math.max(0, Math.floor(viewport.x / this.tileSize));
            endTileX = Math.min(this.worldWidthTiles, Math.ceil((viewport.x + viewport.width) / this.tileSize));
            startTileY = Math.max(0, Math.floor(viewport.y / this.tileSize));
            endTileY = Math.min(this.worldHeightTiles, Math.ceil((viewport.y + viewport.height) / this.tileSize));
        }

        for (let tileX = startTileX; tileX < endTileX; tileX++) {
            for (let tileY = startTileY; tileY < endTileY; tileY++) {
                const tileType = this.getTileAt(tileX, tileY);
                if (tileType === 0) continue;

                const drawX = tileX * this.tileSize;
                const drawY = tileY * this.tileSize;

                // PIXEL-PERFECT ROUNDING: Use floor instead of round to prevent gaps
                const px = Math.floor(drawX);
                const py = Math.floor(drawY);
                // Use ceiling + 1 to ensure tiles overlap slightly and prevent gaps
                const pSize = Math.floor(this.tileSize + 0.999);


                // Check if we should use texture map
                if (this.useTextureMap && this.spriteRendererReference &&
                    this.spriteRendererReference._image && this.spriteRendererReference._isLoaded) {

                    // Apply lighting check
                    let light = 1;
                    if (this.enableLighting && !this.infiniteWorld) {
                        light = this.lighting[tileX][tileY];
                    }

                    // If fully dark, just draw a black square (skip texture for performance)
                    if (this.enableLighting && !this.infiniteWorld && light <= 0.01) {
                        ctx.fillStyle = '#000000';
                        ctx.fillRect(px, py, pSize, pSize);
                        continue;
                    }

                    const img = this.spriteRendererReference._image;
                    const imgWidth = this.spriteRendererReference._imageWidth;
                    const imgHeight = this.spriteRendererReference._imageHeight;
                    const tileData = this.tileTypes[tileType];

                    // Calculate texture tile dimensions
                    const textureTileWidth = imgWidth / this.tilesHor;
                    const textureTileHeight = imgHeight / this.tilesVert;

                    // Get base tile map coordinates
                    let tileMapX = tileData.tileMapX || 0;
                    let tileMapY = tileData.tileMapY || 0;

                    // Apply autotiling if enabled
                    if (tileData.enableAutotile) {
                        const offset = this.getAutotileOffset(tileX, tileY, tileType);
                        tileMapX += offset.offsetX;
                        tileMapY += offset.offsetY;
                    }

                    // Calculate source coordinates
                    const sourceX = tileMapX * textureTileWidth;
                    const sourceY = tileMapY * textureTileHeight;

                    // Draw the texture tile
                    ctx.drawImage(
                        img,
                        Math.floor(sourceX), Math.floor(sourceY), Math.floor(textureTileWidth), Math.floor(textureTileHeight),
                        px, py, pSize, pSize
                    );

                    // Apply lighting by drawing a darkening overlay
                    if (this.enableLighting && !this.infiniteWorld && this.smoothLighting) {
                        // Get corner light values
                        const tl = this.getCornerLight(tileX, tileY);
                        const tr = this.getCornerLight(tileX + 1, tileY);
                        const bl = this.getCornerLight(tileX, tileY + 1);
                        const br = this.getCornerLight(tileX + 1, tileY + 1);

                        // Subdivide tile into a grid for smooth bilinear interpolation
                        const subdivisions = this.darknessSubdivisions; // 4x4 grid per tile
                        const subSize = pSize / subdivisions;

                        for (let sy = 0; sy < subdivisions; sy++) {
                            for (let sx = 0; sx < subdivisions; sx++) {
                                // Calculate interpolation factors for this sub-tile
                                const u0 = sx / subdivisions;
                                const u1 = (sx + 1) / subdivisions;
                                const v0 = sy / subdivisions;
                                const v1 = (sy + 1) / subdivisions;

                                // Bilinear interpolation for each corner of the sub-tile
                                const subTL = (1 - u0) * (1 - v0) * (1 - tl) + u0 * (1 - v0) * (1 - tr) +
                                    (1 - u0) * v0 * (1 - bl) + u0 * v0 * (1 - br);
                                const subTR = (1 - u1) * (1 - v0) * (1 - tl) + u1 * (1 - v0) * (1 - tr) +
                                    (1 - u1) * v0 * (1 - bl) + u1 * v0 * (1 - br);
                                const subBL = (1 - u0) * (1 - v1) * (1 - tl) + u0 * (1 - v1) * (1 - tr) +
                                    (1 - u0) * v1 * (1 - bl) + u0 * v1 * (1 - br);
                                const subBR = (1 - u1) * (1 - v1) * (1 - tl) + u1 * (1 - v1) * (1 - tr) +
                                    (1 - u1) * v1 * (1 - bl) + u1 * v1 * (1 - br);

                                const avgSubDark = (subTL + subTR + subBL + subBR) / 4;

                                const subX = Math.floor(px + sx * subSize);
                                const subY = Math.floor(py + sy * subSize);

                                ctx.fillStyle = `rgba(0, 0, 0, ${avgSubDark * 2})`;
                                ctx.fillRect(subX, subY, Math.ceil(subSize), Math.ceil(subSize));
                            }
                        }
                    } else if (this.enableLighting && !this.infiniteWorld && light < 1) {
                        const darkness = 1 - light;
                        ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
                        ctx.fillRect(px, py, pSize, pSize);
                    }
                } else {
                    // Original color-based drawing
                    let color = this.getTexturedColor(tileX, tileY);
                    if (!color) continue;

                    // Apply lighting
                    if (this.smoothLighting) {
                        // Draw base color first
                        ctx.fillStyle = color;
                        ctx.fillRect(px, py, pSize + 1, pSize + 1);

                        const neighbors = [
                            { tile: this.getTileAt(tileX, tileY - 1), dx: 0, dy: -1 },
                            { tile: this.getTileAt(tileX, tileY + 1), dx: 0, dy: 1 },
                            { tile: this.getTileAt(tileX - 1, tileY), dx: -1, dy: 0 },
                            { tile: this.getTileAt(tileX + 1, tileY), dx: 1, dy: 0 },
                        ];

                        let gradientAngle = 0;
                        let hasLighterNeighbor = false;
                        let lightestNeighborLight = 0;

                        for (const n of neighbors) {
                            const neighborX = tileX + n.dx;
                            const neighborY = tileY + n.dy;

                            if (neighborX >= 0 && neighborX < this.worldWidthTiles &&
                                neighborY >= 0 && neighborY < this.worldHeightTiles) {
                                const neighborLight = this.lighting[neighborX][neighborY];

                                if (neighborLight > light) {
                                    if (!hasLighterNeighbor || neighborLight > lightestNeighborLight) {
                                        hasLighterNeighbor = true;
                                        lightestNeighborLight = neighborLight;
                                        gradientAngle = Math.atan2(n.dy, n.dx);
                                    }
                                }
                            }
                        }

                        if (hasLighterNeighbor) {
                            const centerX = px + pSize / 2;
                            const centerY = py + pSize / 2;
                            const distance = pSize * 0.7;

                            const x0 = centerX - Math.cos(gradientAngle) * distance;
                            const y0 = centerY - Math.sin(gradientAngle) * distance;
                            const x1 = centerX + Math.cos(gradientAngle) * distance;
                            const y1 = centerY + Math.sin(gradientAngle) * distance;

                            const gradient = ctx.createLinearGradient(x0, y0, x1, y1);

                            const lighterDarkness = 1 - lightestNeighborLight;
                            const currentDarkness = 1 - light;

                            gradient.addColorStop(0, `rgba(0, 0, 0, ${lighterDarkness})`);
                            gradient.addColorStop(1, `rgba(0, 0, 0, ${currentDarkness})`);
                            ctx.fillStyle = gradient;
                        } else {
                            const darkness = 1 - light;
                            ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
                        }

                        ctx.fillRect(px, py, pSize, pSize);
                        continue;
                    }

                    ctx.fillStyle = color;
                    ctx.fillRect(px, py, pSize + 1, pSize + 1);

                    if (this.enableTexture && this.tileTypes[tileType].enableSquares) {
                        this.drawDecorativeSquares(ctx, tileX, tileY, px, py, pSize, this.tileTypes[tileType]);
                    }
                }

                // Shading effects (apply to both texture and color modes)
                if (this.enableShading && tileY > this.grassHeight) {
                    const depth = (tileY - this.grassHeight) / 100;
                    const shadingAlpha = Math.min(depth * this.shadingStrength, this.shadingStrength);
                    ctx.fillStyle = `rgba(0, 0, 0, ${shadingAlpha})`;
                    ctx.fillRect(px, py, pSize, pSize);
                }

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

                if (this.enableShading) {
                    const up = this.getTileAt(tileX, tileY - 1);
                    const down = this.getTileAt(tileX, tileY + 1);
                    const left = this.getTileAt(tileX - 1, tileY);
                    const right = this.getTileAt(tileX + 1, tileY);

                    const depth = Math.max(0, tileY - this.grassHeight) / 100;
                    const shadingAlpha = Math.min(depth * this.shadingStrength, this.shadingStrength);

                    const strip = Math.max(1, Math.floor(this.tileSize * 0.12));

                    if (up === 0) {
                        ctx.fillStyle = `rgba(255,255,255,${0.15})`;
                        ctx.fillRect(px, py, pSize, strip);
                    }
                    if (down === 0) {
                        ctx.fillStyle = `rgba(0,0,0,${shadingAlpha})`;
                        ctx.fillRect(px, py + pSize - strip, pSize, strip);
                    }
                    if (left === 0) {
                        ctx.fillStyle = `rgba(255,255,255,${0.12})`;
                        ctx.fillRect(px, py, strip, pSize);
                    }
                    if (right === 0) {
                        ctx.fillStyle = `rgba(0,0,0,${shadingAlpha * 0.9})`;
                        ctx.fillRect(px + pSize - strip, py, strip, pSize);
                    }
                }
            }
        }

        ctx.restore();
    }

    normalizeDarkness(darkness, minDark, maxDark) {
        // Map darkness from actual range to 0-1 display range
        if (maxDark - minDark < 0.01) {
            return darkness; // No normalization needed if range is tiny
        }

        // Normalize: 0 = brightest in area, 1 = darkest in area
        const normalized = (darkness - minDark) / (maxDark - minDark);
        return Math.max(0, Math.min(1, normalized));
    }

    getCornerLight(cornerX, cornerY) {
        // A corner is shared by up to 4 tiles - average their lighting
        const tiles = [
            { x: cornerX - 1, y: cornerY - 1 },
            { x: cornerX, y: cornerY - 1 },
            { x: cornerX - 1, y: cornerY },
            { x: cornerX, y: cornerY }
        ];

        let sum = 0;
        let count = 0;

        for (const t of tiles) {
            if (t.x >= 0 && t.x < this.worldWidthTiles &&
                t.y >= 0 && t.y < this.worldHeightTiles) {
                // Treat air tiles as fully lit (light = 1)
                const tileType = this.getTileAt(t.x, t.y);
                const lightValue = tileType === 0 ? 1 : this.lighting[t.x][t.y];
                sum += lightValue;
                count++;
            }
        }

        return count > 0 ? sum / count : 1;
    }

    getLightAt(x, y) {
        // Clamp to valid coordinates
        const tx = Math.max(0, Math.min(this.worldWidthTiles - 1, Math.floor(x)));
        const ty = Math.max(0, Math.min(this.worldHeightTiles - 1, Math.floor(y)));
        return this.lighting[tx][ty];
    }

    getTileLight(x, y) {
        if (x >= 0 && x < this.worldWidthTiles && y >= 0 && y < this.worldHeightTiles) {
            return this.lighting[x][y];
        }
        return 1; // Full light outside bounds
    }

    preloadChunks(centerX, centerY) {
        const centerChunk = this.worldToChunk(centerX, centerY);
        for (let dx = -this.chunkLoadRadius; dx <= this.chunkLoadRadius; dx++) {
            for (let dy = -this.chunkLoadRadius; dy <= this.chunkLoadRadius; dy++) {
                const chunkX = centerChunk.x + dx;
                const chunkY = centerChunk.y + dy;
                this.getChunk(chunkX, chunkY); // Generates if not exists
            }
        }
        // Optionally clean up distant chunks to save memory
        this.cleanupDistantChunks(centerX, centerY);
    }

    drawGizmos(ctx) {
        if (!this.showGizmos) return;

        const viewport = window.engine.viewport;
        const worldPos = this.gameObject.getWorldPosition();
        // Calculate offset based on game object's position
        const offsetX = worldPos.x || 0;
        const offsetY = worldPos.y || 0;

        // Draw hover preview
        if (this.hoveredTile.x !== undefined && this.hoveredTile.y !== undefined) {
            // Draw brush preview
            if (this.showBrushPreview) {
                for (let bx = -Math.floor(this.brushSize / 2); bx <= Math.floor(this.brushSize / 2); bx++) {
                    for (let by = -Math.floor(this.brushSize / 2); by <= Math.floor(this.brushSize / 2); by++) {
                        const tx = this.hoveredTile.x + bx;
                        const ty = this.hoveredTile.y + by;

                        const px = Math.round(tx * this.tileSize) + offsetX;  // Added offset
                        const py = Math.round(ty * this.tileSize) + offsetY;  // Added offset
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
            const drawX = Math.round(this.hoveredTile.x * this.tileSize) + offsetX;  // Added offset
            const drawY = Math.round(this.hoveredTile.y * this.tileSize) + offsetY;  // Added offset
            ctx.strokeStyle = "#FFFF00";
            ctx.lineWidth = 2;
            ctx.strokeRect(drawX, drawY, Math.ceil(this.tileSize), Math.ceil(this.tileSize));
        }

        // Draw grid if enabled (moved from draw() to here for editor-only display)
        if (this.showGrid) {
            const startTileX = Math.max(0, Math.floor(viewport.x / this.tileSize));
            const endTileX = Math.min(this.worldWidthTiles, Math.ceil((viewport.x + viewport.width) / this.tileSize));
            const startTileY = Math.max(0, Math.floor(viewport.y / this.tileSize));
            const endTileY = Math.min(this.worldHeightTiles, Math.ceil((viewport.y + viewport.height) / this.tileSize));

            ctx.strokeStyle = this.gridColor;
            ctx.lineWidth = 1;

            for (let x = startTileX; x <= endTileX; x++) {
                const lineX = Math.round(x * this.tileSize) + 0.5 + offsetX;  // Added offset
                ctx.beginPath();
                ctx.moveTo(lineX, Math.round(startTileY * this.tileSize) + offsetY);  // Added offset
                ctx.lineTo(lineX, Math.round(endTileY * this.tileSize) + offsetY);  // Added offset
                ctx.stroke();
            }

            for (let y = startTileY; y <= endTileY; y++) {
                const lineY = Math.round(y * this.tileSize) + 0.5 + offsetY;  // Added offset
                ctx.beginPath();
                ctx.moveTo(Math.round(startTileX * this.tileSize) + offsetX, lineY);  // Added offset
                ctx.lineTo(Math.round(endTileX * this.tileSize) + offsetX, lineY);  // Added offset
                ctx.stroke();
            }
        }

        const startTileX = Math.max(0, Math.floor(viewport.x / this.tileSize));
        const endTileX = Math.min(this.worldWidthTiles, Math.ceil((viewport.x + viewport.width) / this.tileSize));
        const startTileY = Math.max(0, Math.floor(viewport.y / this.tileSize));
        const endTileY = Math.min(this.worldHeightTiles, Math.ceil((viewport.y + viewport.height) / this.tileSize));

        for (let tileX = startTileX; tileX < endTileX; tileX++) {
            for (let tileY = startTileY; tileY < endTileY; tileY++) {
                const tileType = this.getTileAt(tileX, tileY);
                if (tileType === 0) continue; // Skip air tiles

                const tileData = this.tileTypes[tileType];
                if (!tileData) continue;

                const px = Math.round(tileX * this.tileSize) + offsetX;
                const py = Math.round(tileY * this.tileSize) + offsetY;
                const pSize = Math.ceil(this.tileSize);

                ctx.fillStyle = tileData.color; // Use base color only
                ctx.fillRect(px, py, pSize, pSize);
            }
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

    drawDecorativeSquares(ctx, tileX, tileY, px, py, pSize, tileData) {
        const squares = this.generateDecorativeSquares(tileX, tileY, this.tileSize, tileData);
        squares.forEach(square => {
            ctx.fillStyle = `rgba(0, 0, 0, ${square.opacity})`; // Simple black squares for now
            ctx.fillRect(px + square.x - square.size / 2, py + square.y - square.size / 2, square.size, square.size);
        });
    }

    generateDecorativeSquares(tileX, tileY, tileSize, tileData) {
        const squares = [];
        const squareCount = tileData.squareCount;
        const squareSize = tileData.squareSize;
        const minSpacing = tileData.squareSpacing;

        // Create seed based on tile position
        const cellSeed = tileX * 1000000 + tileY * 10000 + this.seed;
        const random = this.seededRandomGeneral(cellSeed);

        for (let i = 0; i < squareCount; i++) {
            let attempts = 0;
            let validPosition = false;
            let squareX, squareY;

            while (!validPosition && attempts < 50) {
                squareX = random() * tileSize;
                squareY = random() * tileSize;

                validPosition = true;

                // Check distance from other squares
                for (const existingSquare of squares) {
                    const distance = Math.sqrt(
                        Math.pow(squareX - existingSquare.x, 2) +
                        Math.pow(squareY - existingSquare.y, 2)
                    );

                    if (distance < minSpacing) {
                        validPosition = false;
                        break;
                    }
                }

                attempts++;
            }

            if (validPosition) {
                squares.push({
                    x: squareX,
                    y: squareY,
                    size: squareSize + random() * squareSize * 0.5,
                    opacity: tileData.squareOpacity * (0.5 + random() * 0.5)
                });
            }
        }

        return squares;
    }

    seededRandomGeneral(seed) {
        let x = Math.sin(seed) * 10000;
        return function () {
            x = Math.sin(x) * 10000;
            return x - Math.floor(x);
        };
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

    // ========================================
    // EDITOR INTERACTION
    // ========================================

    onMouseDown(worldPos, button) {
        if (!this.gameObject || !this.gameObject.isEditorSelected) return false;

        // Adjust mouse position by subtracting the game object's position to get relative coordinates
        const adjustedX = worldPos.x - (this.gameObject.position?.x || 0);
        const adjustedY = worldPos.y - (this.gameObject.position?.y || 0);
        const tile = this.worldToTile(adjustedX, adjustedY);

        this.isEditing = true;
        this.lastEditTile = { x: tile.x, y: tile.y };

        this.handleEdit(tile.x, tile.y);
        return true;
    }

    onMouseMove(worldPos) {
        if (!this.gameObject || !this.gameObject.isEditorSelected) return false;

        // Adjust mouse position by subtracting the game object's position to get relative coordinates
        const adjustedX = worldPos.x - (this.gameObject.position?.x || 0);
        const adjustedY = worldPos.y - (this.gameObject.position?.y || 0);
        const tile = this.worldToTile(adjustedX, adjustedY);
        this.hoveredTile = tile;

        if (this.isEditing) {
            // Get all tiles along the line from lastEditTile to current tile
            const tilesAlongLine = this.getTilesAlongLine(this.lastEditTile.x, this.lastEditTile.y, tile.x, tile.y);

            // Edit each tile along the path (handles brush size automatically in handleEdit)
            for (const lineTile of tilesAlongLine) {
                this.handleEdit(lineTile.x, lineTile.y);
            }

            // Update lastEditTile to current tile
            this.lastEditTile = { x: tile.x, y: tile.y };
        }

        return true;
    }

    onMouseUp(worldPos, button) {
        this.isEditing = false;
        return false;
    }

    // Helper method to get tiles along a line using Bresenham's line algorithm
    getTilesAlongLine(startX, startY, endX, endY) {
        const tiles = [];
        const dx = Math.abs(endX - startX);
        const dy = Math.abs(endY - startY);
        const sx = startX < endX ? 1 : -1;
        const sy = startY < endY ? 1 : -1;
        let err = dx - dy;

        let x = startX;
        let y = startY;

        while (true) {
            tiles.push({ x, y });

            if (x === endX && y === endY) break;

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }

        return tiles;
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
        if (this.enableLighting) {
            this.computeLighting();
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
        if (this.enableLighting) {
            this.computeLighting();
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
        if (this.enableLighting) {
            this.computeLighting();
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
        // Updated: For infinite worlds, restrict collision to original finite bounds
        if (this.infiniteWorld && (x < 0 || x >= this.worldWidthTiles || y < 0 || y >= this.worldHeightTiles)) {
            return false;
        }
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
        if (!this.infiniteWorld) {
            this.generateWorld();
        } else {
            // For infinite, clear chunks and regenerate on demand
            this.chunks.clear();
        }
        if (this.enableLighting && !this.infiniteWorld) {
            this.computeLighting();
        }
    }

    generateWorld() {
        if (this.infiniteWorld) return;

        // Initialize all to air
        for (let x = 0; x < this.worldWidthTiles; x++) {
            for (let y = 0; y < this.worldHeightTiles; y++) {
                this.tiles[x][y] = 0;
            }
        }

        // Generate based on type
        switch (this.generationType) {
            case "terraria":
                this.generateWorldTerraria();
                break;
            case "perlin":
                this.generateWorldPerlin();
                break;
            case "caverns":
                this.generateWorldCaverns();
                break;
            case "islands":
                this.generateWorldIslands();
                break;
            case "flat":
                this.generateWorldFlat();
                break;
            case "mountains":
                this.generateWorldMountains();
                break;
            default:
                this.generateWorldTerraria();
        }

        // Add ores
        if (this.generationType !== "islands") {
            this.generateWorldOres();
        }
    }

    generateWorldOres() {
        for (let x = 0; x < this.worldWidthTiles; x++) {
            for (let y = 0; y < this.worldHeightTiles; y++) {
                if (this.tiles[x][y] !== 3 || y < this.grassHeight + this.dirtDepth) continue;
                const oreNoise = this.noise(x, y, 0.2, 2, 0.5);
                if (oreNoise > (1 - this.oreFrequency)) {
                    const depth = y - (this.grassHeight + this.dirtDepth);
                    const depthRatio = Math.min(depth / 100, 1);
                    if (depthRatio < 0.2) {
                        this.tiles[x][y] = 4;
                    } else if (depthRatio < 0.5) {
                        this.tiles[x][y] = 5;
                    } else if (depthRatio < 0.8) {
                        this.tiles[x][y] = 6;
                    } else {
                        this.tiles[x][y] = this.seededRandom(x * y + this.seed) > 0.5 ? 6 : 5;
                    }
                }
            }
        }
    }

    generateWorldTerraria() {
        // First pass: Generate solid terrain layers
        for (let x = 0; x < this.worldWidthTiles; x++) {
            // Generate surface height with noise
            const height = Math.floor(
                this.grassHeight +
                this.noise(x, 0, this.terrainScale, this.terrainOctaves, this.terrainPersistence) * this.mountainHeight
            );

            for (let y = 0; y < this.worldHeightTiles; y++) {
                if (y < height) {
                    this.tiles[x][y] = 0; // Air above surface
                } else if (y === height) {
                    this.tiles[x][y] = 1; // Grass surface layer
                } else if (y < height + this.dirtDepth) {
                    this.tiles[x][y] = 2; // Dirt layer
                } else {
                    this.tiles[x][y] = 3; // Stone layer (everything below)
                }
            }
        }

        // Second pass: Carve caves through the terrain
        for (let x = 0; x < this.worldWidthTiles; x++) {
            for (let y = 0; y < this.worldHeightTiles; y++) {
                // Only carve caves in solid blocks and below surface
                if (this.tiles[x][y] === 0 || y < this.grassHeight + 5) continue;

                // Use multiple noise layers for cave generation
                const cave1 = this.noise(x, y, 0.08, 3, 0.5);
                const cave2 = this.noise(x + 1000, y + 1000, 0.05, 2, 0.6);

                // Combine noise values for worm-like cave patterns
                const caveValue = cave1 * 0.6 + cave2 * 0.4;

                if (caveValue > (1 - this.caveFrequency)) {
                    this.tiles[x][y] = 0; // Carve cave
                }
            }
        }
    }

    generateWorldCaverns() {
        for (let x = 0; x < this.worldWidthTiles; x++) {
            for (let y = 0; y < this.worldHeightTiles; y++) {
                const caveNoise = this.noise(x, y, 0.05, 3, 0.5);
                if (caveNoise > (1 - this.caveFrequency)) {
                    this.tiles[x][y] = 0;
                }
            }
        }
    }

    generateWorldFlat() {
        for (let x = 0; x < this.worldWidthTiles; x++) {
            for (let y = 0; y < this.worldHeightTiles; y++) {
                if (y < this.grassHeight) {
                    this.tiles[x][y] = 0; // Air
                } else if (y === this.grassHeight) {
                    this.tiles[x][y] = 1; // Grass
                } else if (y < this.grassHeight + this.dirtDepth) {
                    this.tiles[x][y] = 2; // Dirt
                } else {
                    this.tiles[x][y] = 3; // Stone
                }
            }
        }
    }

    generateWorldIslands() {
        for (let x = 0; x < this.worldWidthTiles; x++) {
            const height = Math.floor(
                this.grassHeight +
                this.noise(x, 0, this.terrainScale, this.terrainOctaves, this.terrainPersistence) * this.mountainHeight
            );
            for (let y = 0; y < this.worldHeightTiles; y++) {
                if (y < height) {
                    this.tiles[x][y] = 0; // Air
                } else if (y === height) {
                    this.tiles[x][y] = 1; // Grass
                } else if (y < height + this.dirtDepth) {
                    this.tiles[x][y] = 2; // Dirt
                } else {
                    this.tiles[x][y] = 3; // Stone
                }
            }
        }
    }

    generateWorldMountains() {
        for (let x = 0; x < this.worldWidthTiles; x++) {
            const height = Math.floor(
                this.grassHeight +
                this.noise(x, 0, this.terrainScale, this.terrainOctaves, this.terrainPersistence) * this.mountainHeight
            );
            for (let y = 0; y < this.worldHeightTiles; y++) {
                if (y < height) {
                    this.tiles[x][y] = 0; // Air
                } else if (y === height) {
                    this.tiles[x][y] = 1; // Grass
                } else if (y < height + this.dirtDepth) {
                    this.tiles[x][y] = 2; // Dirt
                } else {
                    this.tiles[x][y] = 3; // Stone
                }
            }
        }
    }

    generateWorldPerlin() {
        for (let x = 0; x < this.worldWidthTiles; x++) {
            const height = Math.floor(
                this.grassHeight +
                this.noise(x, 0, this.terrainScale, this.terrainOctaves, this.terrainPersistence) * this.mountainHeight
            );
            for (let y = 0; y < this.worldHeightTiles; y++) {
                if (y < height) {
                    this.tiles[x][y] = 0; // Air
                }
                else if (y === height) {
                    this.tiles[x][y] = 1; // Grass
                } else if (y < height + this.dirtDepth) {
                    this.tiles[x][y] = 2; // Dirt
                } else {
                    this.tiles[x][y] = 3; // Stone
                }
            }
        }
    }

    createEmptyTileArray() {
        if (this.infiniteWorld) return null;

        // Use safe integer dimensions (fall back to reasonable defaults if something overwrote them)
        const width = Math.max(1, Math.floor(this.worldWidthTiles || 100));
        const height = Math.max(1, Math.floor(this.worldHeightTiles || 100));

        const tiles = new Array(width);
        for (let x = 0; x < width; x++) {
            tiles[x] = new Array(height);
            for (let y = 0; y < height; y++) {
                tiles[x][y] = 0; // Default to air
            }
        }
        return tiles;
    }

    createDefaultTileTypes() {
        return {
            0: { name: "Air", color: "transparent", solid: false, blend: [], enableTexture: false, textureScale: 0.02, textureContrast: 0.3, enableSquares: false, squareCount: 0, squareSize: 4, squareSpacing: 8, squareOpacity: 0.6, tileMapX: 0, tileMapY: 0, enableAutotile: false },
            1: { name: "Grass", color: "#4CAF50", solid: true, blend: ["#47575F", "#27373F", "#57676F"], enableTexture: true, textureScale: 0.02, textureContrast: 0.3, enableSquares: true, squareCount: 3, squareSize: 4, squareSpacing: 8, squareOpacity: 0.2, tileMapX: 0, tileMapY: 0, enableAutotile: true },
            2: { name: "Dirt", color: "#8D6E63", solid: true, blend: ["#47575F", "#27373F", "#57676F"], enableTexture: true, textureScale: 0.015, textureContrast: 0.3, enableSquares: true, squareCount: 2, squareSize: 3, squareSpacing: 6, squareOpacity: 0.3, tileMapX: 1, tileMapY: 0, enableAutotile: true },
            3: { name: "Stone", color: "#607D8B", solid: true, blend: ["#47575F", "#27373F", "#57676F"], enableTexture: true, textureScale: 0.025, textureContrast: 0.4, enableSquares: true, squareCount: 1, squareSize: 2, squareSpacing: 4, squareOpacity: 0.2, tileMapX: 2, tileMapY: 0, enableAutotile: true },
            4: { name: "Coal", color: "#37474F", solid: true, blend: ["#47575F", "#27373F", "#57676F"], enableTexture: true, textureScale: 0.02, textureContrast: 0.3, enableSquares: false, squareCount: 0, squareSize: 2, squareSpacing: 4, squareOpacity: 0.2, tileMapX: 3, tileMapY: 0, enableAutotile: false },
            5: { name: "Iron", color: "#FF7043", solid: true, blend: ["#47575F", "#27373F", "#57676F"], enableTexture: true, textureScale: 0.02, textureContrast: 0.4, enableSquares: false, squareCount: 0, squareSize: 2, squareSpacing: 4, squareOpacity: 0.2, tileMapX: 0, tileMapY: 1, enableAutotile: false },
            6: { name: "Gold", color: "#FFD700", solid: true, blend: ["#47575F", "#27373F", "#57676F"], enableTexture: true, textureScale: 0.02, textureContrast: 0.3, enableSquares: false, squareCount: 0, squareSize: 2, squareSpacing: 4, squareOpacity: 0.2, tileMapX: 1, tileMapY: 1, enableAutotile: false },
            7: { name: "Sand", color: "#F4E4C1", solid: true, blend: ["#47575F", "#27373F", "#57676F"], enableTexture: true, textureScale: 0.015, textureContrast: 0.3, enableSquares: true, squareCount: 2, squareSize: 3, squareSpacing: 6, squareOpacity: 0.3, tileMapX: 2, tileMapY: 1, enableAutotile: false },
            8: { name: "Snow", color: "#ECEFF1", solid: true, blend: ["#FCFFFF", "#DCEEF1", "#FFFFFF"], enableTexture: true, textureScale: 0.02, textureContrast: 0.2, enableSquares: false, squareCount: 0, squareSize: 2, squareSpacing: 4, squareOpacity: 0.2, tileMapX: 3, tileMapY: 1, enableAutotile: false },
            9: { name: "Ice", color: "#B3E5FC", solid: true, blend: ["#47575F", "#27373F", "#57676F"], enableTexture: true, textureScale: 0.02, textureContrast: 0.3, enableSquares: false, squareCount: 0, squareSize: 2, squareSpacing: 4, squareOpacity: 0.1, tileMapX: 0, tileMapY: 2, enableAutotile: false }
        };
    }

    // ========================================
    // SERIALIZATION
    // ========================================

    toJSON() {
        // Convert chunks map to array for serialization
        //const chunksArray = [];
        //for (const [key, chunk] of this.chunks) {
        //    chunksArray.push(chunk);
        //}

        return {
            ...super.toJSON(),
            chunkSize: this.chunkSize,
            tileSize: this.tileSize,
            infiniteWorld: this.infiniteWorld,
            worldWidthTiles: this.worldWidthTiles,
            worldHeightTiles: this.worldHeightTiles,
            chunkLoadRadius: this.chunkLoadRadius,  // Added missing property
            seed: this.seed,
            generationType: this.generationType,
            randomizePerChunk: this.randomizePerChunk,
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
            enableTexture: this.enableTexture,
            textureScale: this.textureScale,
            textureContrast: this.textureContrast,
            tiles: this.infiniteWorld ? null : this.tiles,
            lighting: this.infiniteWorld ? null : this.lighting,
            enableLighting: this.enableLighting,
            lightingGradientSize: this.lightingGradientSize,
            chunks: this.infiniteWorld ? [] : Array.from(this.chunks.values()),
            useTextureMap: this.useTextureMap,
            tilesHor: this.tilesHor,
            tilesVert: this.tilesVert,
            tileTypes: this.tileTypes,
            smoothLighting: this.smoothLighting,
            darknessSubdivisions: this.darknessSubdivisions
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        if (!data) return;

        this.chunks.clear();

        this.chunkSize = data.chunkSize || 32;
        this.tileSize = data.tileSize || 32;
        this.infiniteWorld = data.infiniteWorld || false;
        this.worldWidthTiles = data.worldWidthTiles || 100;
        this.worldHeightTiles = data.worldHeightTiles || 100;
        this.chunkLoadRadius = data.chunkLoadRadius || 5;  // Added missing property
        this.seed = data.seed || 12345;
        this.generationType = data.generationType || "terraria";
        this.randomizePerChunk = data.randomizePerChunk !== undefined ? data.randomizePerChunk : false;
        this.grassHeight = data.grassHeight || 20;
        this.dirtDepth = data.dirtDepth || 15;
        this.stoneDepth = data.stoneDepth || 30;
        this.caveFrequency = data.caveFrequency || 0.3;
        this.oreFrequency = data.oreFrequency || 0.05;
        this.terrainScale = data.terrainScale || 0.05;
        this.terrainOctaves = data.terrainOctaves || 3;
        this.terrainPersistence = data.terrainPersistence || 0.5;
        this.mountainHeight = data.mountainHeight || 40;
        this.showGrid = data.showGrid !== undefined ? data.showGrid : true;  // Fixed default to match constructor
        this.gridColor = data.gridColor || "#e2e2e2ff";  // Fixed default to match constructor
        this.enableBlending = data.enableBlending !== undefined ? data.enableBlending : true;
        this.blendStrength = data.blendStrength !== undefined ? data.blendStrength : 0.7;
        this.enableShading = data.enableShading !== undefined ? data.enableShading : true;
        this.shadingStrength = data.shadingStrength !== undefined ? data.shadingStrength : 0.3;
        this.enableTexture = data.enableTexture !== undefined ? data.enableTexture : true;
        this.textureScale = data.textureScale || 0.02;  // Fixed default to match constructor
        this.textureContrast = data.textureContrast || 0.7;  // Fixed default to match constructor
        this.tiles = this.infiniteWorld ? null : (data.tiles || this.createEmptyTileArray());
        this.lighting = this.infiniteWorld ? null : (data.lighting || this.createEmptyTileArray());
        this.enableLighting = data.enableLighting || false;
        this.lightingGradientSize = data.lightingGradientSize || 5;
        this.useTextureMap = data.useTextureMap || false;
        this.tilesHor = data.tilesHor || 4;
        this.tilesVert = data.tilesVert || 4;
        this.smoothLighting = data.smoothLighting !== undefined ? data.smoothLighting : true;
        this.darknessSubdivisions = data.darknessSubdivisions || 2;

        // Restore tile types from saved data, with fallback to default tile types
        if (data.tileTypes && typeof data.tileTypes === 'object') {
            // Merge saved tile types with default tile types to ensure all properties are present
            const defaultTileTypes = this.createDefaultTileTypes();
            this.tileTypes = {};

            // Include all default tile types
            for (const [key, defaultTile] of Object.entries(defaultTileTypes)) {
                if (data.tileTypes[key]) {
                    // Merge saved properties with defaults
                    this.tileTypes[key] = { ...defaultTile, ...data.tileTypes[key] };
                } else {
                    // Use default if not saved
                    this.tileTypes[key] = { ...defaultTile };
                }
            }

            // Also include any custom tile types that were saved but not in defaults
            for (const [key, savedTile] of Object.entries(data.tileTypes)) {
                if (!this.tileTypes[key]) {
                    this.tileTypes[key] = { ...savedTile };
                }
            }
        } else {
            // Use default tile types if none saved
            this.tileTypes = this.createDefaultTileTypes();
        }

        // Re-expose tile type properties with loaded values
        this.setupTileTypeProperties();

        // Restore chunks if finite and saved
        if (!this.infiniteWorld && data.chunks && Array.isArray(data.chunks)) {
            this.chunks.clear();
            for (const chunk of data.chunks) {
                const key = this.getChunkKey(chunk.x, chunk.y);
                this.chunks.set(key, chunk);
            }
        }
    }
}

window.TilemapSystem = TilemapSystem;
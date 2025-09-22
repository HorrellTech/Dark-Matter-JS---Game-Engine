class MarchingCubesTerrain extends Module {
    static namespace = "Drawing";
    static description = "Marching cubes grid-based terrain system with multiple biomes";
    static allowMultiple = false;
    static iconClass = "fas fa-mountain";

    constructor() {
        super("MarchingCubesTerrain");

        // Configuration properties
        this.gridSize = 64;
        this.gridResolution = 2;
        this.threshold = 0.5;
        this.noiseScale = 0.015;
        this.noiseOctaves = 4;
        this.noisePersistence = 0.5;
        this.noiseLacunarity = 2.0;
        this.terrainHeight = 100;
        this.lineWidth = 2;
        this.smoothTerrain = true;
        this.seed = 12345;
        this.viewportMargin = 200;
        this.biomeScale = 0.005;
        this.showDebug = false;

        // Generation type configuration
        this.generationType = "Random"; // Random, Maze, HeightConstrained, PerlinNoise, SimplexNoise, Voronoi
        this.mazeComplexity = 0.7; // 0-1, higher values create more complex mazes
        this.minHeight = 500; // Minimum height for HeightConstrained generation
        this.voronoiSites = 50; // Number of sites for Voronoi generation
        this.voronoiRelaxation = 1; // Number of Lloyd relaxation iterations

        //  Rigidbody management properties
        this.enableRigidbodies = false; // Enable/disable rigidbody generation
        this.rigidbodyRadius = 100; // Default radius for rigidbody activation
        this.activeRigidbodies = new Map(); // Track active rigidbodies by grid key
        this.rigidbodyGridSize = 64; // Size of rigidbody grid cells (larger than terrain grid)
        this.rigidbodyCleanupThreshold = 200; // Distance threshold for cleanup
        this.activeActivationPoints = new Map(); // Track all active activation regions
        this.activationPointId = 0; // Unique ID for activation points

        // Biome configurations
        this.biomes = {
            grass: {
                name: "Grass",
                color: "#4a7c59",
                fillColor: this.rgbaStringToHex("rgba(105, 69, 54, 0.8)"),
                heightRange: [0.35, 0.75],
                temperature: "temperate",
                humidity: "moderate",
                // New color variation properties
                colorVariation: 0.1, // 0-1, amount of random color variation
                darkenAmount: 0.2, // 0-1, how much to darken filled areas
                lightenAmount: 0.1, // 0-1, how much to lighten filled areas
                // Texture generation properties
                textureScale: 0.02, // Scale for texture pattern generation
                textureContrast: 0.3, // 0-1, contrast of texture pattern
                // Square decoration properties
                enableSquares: true, // Enable random squares around cells
                squareCount: 3, // Number of squares per cell
                squareSize: 4, // Size of decorative squares (pixels)
                squareSpacing: 8, // Minimum spacing between squares
                squareOpacity: 0.6 // Opacity of decorative squares
            }/*,
            dirt: {
                name: "Dirt",
                color: this.rgbaStringToHex("rgba(156, 110, 90, 0.8)"),
                fillColor: this.rgbaStringToHex("rgba(105, 69, 54, 0.8)"),
                heightRange: [0.35, 0.75],
                temperature: "warm",
                humidity: "dry",
                // New color variation properties
                colorVariation: 0.4,
                darkenAmount: 0.15,
                lightenAmount: 0.05,
                // Texture generation properties
                textureScale: 0.015,
                textureContrast: 0.6,
                // Square decoration properties
                enableSquares: true,
                squareCount: 2,
                squareSize: 3,
                squareSpacing: 6,
                squareOpacity: 0.5
            },
            stone: {
                name: "Stone",
                color: "#696969",
                fillColor: this.rgbaStringToHex("rgba(105, 105, 105, 0.8)"),
                heightRange: [0.75, 1.0],
                temperature: "cold",
                humidity: "dry",
                // New color variation properties
                colorVariation: 0.2,
                darkenAmount: 0.3,
                lightenAmount: 0.05,
                // Texture generation properties
                textureScale: 0.025,
                textureContrast: 0.4,
                // Square decoration properties
                enableSquares: false,
                squareCount: 1,
                squareSize: 2,
                squareSpacing: 4,
                squareOpacity: 0.4
            }*/
        };

        // Internal state
        this.gridCache = new Map();
        this.activeGrids = new Set();

        // Fixed marching squares lookup table
        this.marchingSquaresTable = this.initMarchingSquaresTable();

        this.setupProperties();
    }

    setupProperties() {
        // Basic terrain properties
        this.exposeProperty("gridSize", "number", 20, {
            description: "Size of each grid cell",
            onChange: (val) => {
                this.gridSize = Math.max(5, Math.floor(val));
                this.clearCache();
            }
        });

        this.exposeProperty("gridResolution", "number", 16, {
            description: "Grid resolution (cells per grid)",
            onChange: (val) => {
                this.gridResolution = Math.max(4, Math.floor(val));
                this.clearCache();
            }
        });

        this.exposeProperty("threshold", "number", 0.5, {
            description: "Terrain generation threshold (0-1)",
            onChange: (val) => {
                this.threshold = Math.max(0, Math.min(1, val));
                this.clearCache();
            }
        });

        this.exposeProperty("noiseScale", "number", 0.015, {
            description: "Noise scale for terrain generation",
            onChange: (val) => {
                this.noiseScale = Math.max(0.001, val);
                this.clearCache();
            }
        });

        this.exposeProperty("biomeScale", "number", 0.005, {
            description: "Scale for biome determination",
            onChange: (val) => {
                this.biomeScale = Math.max(0.001, val);
                this.clearCache();
            }
        });

        this.exposeProperty("lineWidth", "number", 1.5, {
            description: "Line width for terrain edges",
            onChange: (val) => {
                this.lineWidth = Math.max(0.5, val);
            }
        });

        this.exposeProperty("smoothTerrain", "boolean", true, {
            description: "Enable smooth terrain interpolation",
            onChange: (val) => {
                this.smoothTerrain = val;
                this.clearCache();
            }
        });

        this.exposeProperty("seed", "number", 12345, {
            description: "Seed for deterministic terrain generation",
            onChange: (val) => {
                this.seed = val;
                this.clearCache();
            }
        });

        this.exposeProperty("showDebug", "boolean", false, {
            description: "Show debug information",
            onChange: (val) => {
                this.showDebug = val;
            }
        });

        // Generation type properties
        this.exposeProperty("generationType", "select", "Random", {
            description: "Terrain generation algorithm",
            //options: ["Random", "Maze", "HeightConstrained", "PerlinNoise", "SimplexNoise", "Voronoi"],
            options: ["Random", "HeightConstrained", "SimplexNoise"],
            onChange: (val) => {
                this.generationType = val;
                this.clearCache();
            }
        });

        /*this.exposeProperty("mazeComplexity", "number", 0.7, {
            description: "Maze complexity (0-1, higher = more complex)",
            min: 0,
            max: 1,
            step: 0.1,
            onChange: (val) => {
                this.mazeComplexity = Math.max(0, Math.min(1, val));
                this.clearCache();
            }
        });*/

        this.exposeProperty("minHeight", "number", 500, {
            description: "Minimum height for HeightConstrained generation",
            min: 0,
            max: 2000,
            onChange: (val) => {
                this.minHeight = Math.max(0, val);
                this.clearCache();
            }
        });

        /*this.exposeProperty("voronoiSites", "number", 50, {
            description: "Number of sites for Voronoi generation",
            min: 10,
            max: 200,
            onChange: (val) => {
                this.voronoiSites = Math.max(10, Math.min(200, val));
                this.clearCache();
            }
        });

        this.exposeProperty("voronoiRelaxation", "number", 1, {
            description: "Lloyd relaxation iterations for Voronoi",
            min: 0,
            max: 5,
            onChange: (val) => {
                this.voronoiRelaxation = Math.max(0, Math.min(5, val));
                this.clearCache();
            }
        });*/

        this.exposeProperty("enableRigidbodies", "boolean", false, {
            description: "Enable automatic rigidbody generation for terrain",
            onChange: (val) => {
                this.enableRigidbodies = val;
                if (!val) {
                    this.clearAllRigidbodies();
                }
            }
        });

        this.exposeProperty("rigidbodyRadius", "number", 100, {
            description: "Radius for rigidbody activation around objects",
            min: 10,
            max: 500,
            onChange: (val) => {
                this.rigidbodyRadius = Math.max(10, Math.min(500, val));
            }
        });

        this.exposeProperty("rigidbodyGridSize", "number", 50, {
            description: "Grid size for rigidbody management",
            min: 20,
            max: 200,
            onChange: (val) => {
                this.rigidbodyGridSize = Math.max(20, Math.min(200, val));
                this.clearAllRigidbodies();
            }
        });

        // Biome color properties
        Object.keys(this.biomes).forEach(biomeKey => {
            const biome = this.biomes[biomeKey];

            this.exposeProperty(`${biomeKey}Color`, "color", biome.color, {
                description: `${biome.name} line color`,
                onChange: (val) => {
                    this.biomes[biomeKey].color = val;
                }
            });

            this.exposeProperty(`${biomeKey}FillColor`, "color", biome.fillColor, {
                description: `${biome.name} fill color`,
                onChange: (val) => {
                    this.biomes[biomeKey].fillColor = val;
                }
            });

            this.exposeProperty(`${biomeKey}MinHeight`, "number", biome.heightRange[0], {
                description: `${biome.name} minimum height`,
                onChange: (val) => {
                    this.biomes[biomeKey].heightRange[0] = Math.max(0, val);
                }
            });

            this.exposeProperty(`${biomeKey}MaxHeight`, "number", biome.heightRange[1], {
                description: `${biome.name} maximum height`,
                onChange: (val) => {
                    this.biomes[biomeKey].heightRange[1] = Math.max(0, val);
                }
            });

            // New color variation properties
            this.exposeProperty(`${biomeKey}ColorVariation`, "number", biome.colorVariation, {
                description: `${biome.name} color variation (0-1)`,
                min: 0,
                max: 1,
                step: 0.05,
                onChange: (val) => {
                    this.biomes[biomeKey].colorVariation = Math.max(0, Math.min(1, val));
                }
            });

            this.exposeProperty(`${biomeKey}DarkenAmount`, "number", biome.darkenAmount, {
                description: `${biome.name} fill darken amount (0-1)`,
                min: 0,
                max: 1,
                step: 0.05,
                onChange: (val) => {
                    this.biomes[biomeKey].darkenAmount = Math.max(0, Math.min(1, val));
                }
            });

            this.exposeProperty(`${biomeKey}LightenAmount`, "number", biome.lightenAmount, {
                description: `${biome.name} fill lighten amount (0-1)`,
                min: 0,
                max: 1,
                step: 0.05,
                onChange: (val) => {
                    this.biomes[biomeKey].lightenAmount = Math.max(0, Math.min(1, val));
                }
            });

            // New texture properties
            this.exposeProperty(`${biomeKey}TextureScale`, "number", biome.textureScale, {
                description: `${biome.name} texture pattern scale`,
                min: 0.001,
                max: 0.1,
                step: 0.001,
                onChange: (val) => {
                    this.biomes[biomeKey].textureScale = Math.max(0.001, Math.min(0.1, val));
                }
            });

            this.exposeProperty(`${biomeKey}TextureContrast`, "number", biome.textureContrast, {
                description: `${biome.name} texture contrast (0-1)`,
                min: 0,
                max: 1,
                step: 0.05,
                onChange: (val) => {
                    this.biomes[biomeKey].textureContrast = Math.max(0, Math.min(1, val));
                }
            });

            // New square decoration properties
            this.exposeProperty(`${biomeKey}EnableSquares`, "boolean", biome.enableSquares, {
                description: `Enable ${biome.name} decorative squares`,
                onChange: (val) => {
                    this.biomes[biomeKey].enableSquares = val;
                }
            });

            this.exposeProperty(`${biomeKey}SquareCount`, "number", biome.squareCount, {
                description: `${biome.name} squares per cell`,
                min: 0,
                max: 10,
                onChange: (val) => {
                    this.biomes[biomeKey].squareCount = Math.max(0, Math.floor(val));
                }
            });

            this.exposeProperty(`${biomeKey}SquareSize`, "number", biome.squareSize, {
                description: `${biome.name} square size (pixels)`,
                min: 1,
                max: 20,
                onChange: (val) => {
                    this.biomes[biomeKey].squareSize = Math.max(1, Math.floor(val));
                }
            });

            this.exposeProperty(`${biomeKey}SquareSpacing`, "number", biome.squareSpacing, {
                description: `${biome.name} minimum square spacing`,
                min: 2,
                max: 50,
                onChange: (val) => {
                    this.biomes[biomeKey].squareSpacing = Math.max(2, Math.floor(val));
                }
            });

            this.exposeProperty(`${biomeKey}SquareOpacity`, "number", biome.squareOpacity, {
                description: `${biome.name} square opacity (0-1)`,
                min: 0,
                max: 1,
                step: 0.05,
                onChange: (val) => {
                    this.biomes[biomeKey].squareOpacity = Math.max(0, Math.min(1, val));
                }
            });
        });
    }

    start() {
        this.gameObject.position.x = 0;
        this.gameObject.position.y = 0;
    }

    clearCache() {
        this.gridCache.clear();
        this.activeGrids.clear();
    }

    rgbaToHex(r, g, b, a = 1) {
        // Ensure values are within valid ranges
        r = Math.max(0, Math.min(255, Math.round(r)));
        g = Math.max(0, Math.min(255, Math.round(g)));
        b = Math.max(0, Math.min(255, Math.round(b)));
        a = Math.max(0, Math.min(1, a));

        // Convert alpha from 0-1 to 0-255
        const alpha = Math.round(a * 255);

        // Convert to hex
        const toHex = (n) => n.toString(16).padStart(2, '0');

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    rgbaStringToHex(rgba) {
        const [r, g, b, a] = rgba.match(/\d+/g).map(Number);
        return this.rgbaToHex(r, g, b, a);
    }

    generateBiomeColor(baseColor, variation = 0) {
        if (variation === 0) return baseColor;
        
        // Convert hex to RGB
        const hex = baseColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // Create a seed based on color and position for consistent variation
        const colorSeed = this.seed + r * 1000 + g * 100 + b * 10;
        const random = this.seededRandomGeneral(colorSeed);
        
        // Apply random variation
        const variationAmount = variation * 100;
        const newR = Math.max(0, Math.min(255, r + (random() - 0.5) * variationAmount * 2));
        const newG = Math.max(0, Math.min(255, g + (random() - 0.5) * variationAmount * 2));
        const newB = Math.max(0, Math.min(255, b + (random() - 0.5) * variationAmount * 2));
        
        return this.rgbaToHex(newR, newG, newB);
    }

    // New method to darken/lighten colors
    adjustColorBrightness(color, darkenAmount = 0, lightenAmount = 0) {
        const hex = color.replace('#', '');
        let r = parseInt(hex.substr(0, 2), 16);
        let g = parseInt(hex.substr(2, 2), 16);
        let b = parseInt(hex.substr(4, 2), 16);
        
        // Apply darkening
        if (darkenAmount > 0) {
            const darkenFactor = 1 - darkenAmount;
            r = Math.floor(r * darkenFactor);
            g = Math.floor(g * darkenFactor);
            b = Math.floor(b * darkenFactor);
        }
        
        // Apply lightening
        if (lightenAmount > 0) {
            const lightenFactor = 1 + lightenAmount;
            r = Math.min(255, Math.floor(r * lightenFactor));
            g = Math.min(255, Math.floor(g * lightenFactor));
            b = Math.min(255, Math.floor(b * lightenFactor));
        }
        
        return this.rgbaToHex(r, g, b);
    }

    applyTextureOverlay(baseColor, textureIntensity, contrast = 0.5) {
        // Create texture pattern using noise
        const textureColor = this.generateTextureColor(textureIntensity, contrast);
        
        // Apply texture as overlay - mix base color with texture pattern
        const hex = baseColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // Mix base color with texture pattern
        const mixRatio = textureIntensity * 0.3; // Control texture strength
        const texR = Math.floor(r * (1 - mixRatio) + textureColor.r * mixRatio);
        const texG = Math.floor(g * (1 - mixRatio) + textureColor.g * mixRatio);
        const texB = Math.floor(b * (1 - mixRatio) + textureColor.b * mixRatio);
        
        return this.rgbaToHex(texR, texG, texB);
    }

    generateTextureColor(intensity, contrast) {
        // Create varied texture colors based on intensity
        const baseIntensity = intensity * contrast;
        
        // Generate different texture colors for variety
        const textureVariations = [
            { r: 30, g: 20, b: 10 },   // Dark brown
            { r: 50, g: 40, b: 30 },   // Medium brown
            { r: 20, g: 30, b: 15 },   // Dark green
            { r: 40, g: 35, b: 25 },   // Light brown
            { r: 25, g: 25, b: 35 }    // Dark blue-gray
        ];
        
        // Select texture color based on intensity
        const colorIndex = Math.floor(intensity * textureVariations.length);
        const selectedColor = textureVariations[Math.min(colorIndex, textureVariations.length - 1)];
        
        // Apply intensity variation
        const intensityFactor = 0.7 + baseIntensity * 0.6;
        return {
            r: Math.floor(selectedColor.r * intensityFactor),
            g: Math.floor(selectedColor.g * intensityFactor),
            b: Math.floor(selectedColor.b * intensityFactor)
        };
    }

    // New method to generate tilable texture pattern
    generateTexturePattern(x, y, scale, contrast) {
        // Create a more complex tilable noise pattern
        const noise1 = this.octaveNoise(x * scale, y * scale);
        const noise2 = this.octaveNoise(x * scale * 2.1, y * scale * 1.7);
        const noise3 = this.octaveNoise(x * scale * 4.3, y * scale * 3.9);
        const noise4 = this.octaveNoise(x * scale * 7.1, y * scale * 5.3);
        
        // Combine noises for more complex texture
        let texture = (noise1 * 0.4 + noise2 * 0.3 + noise3 * 0.2 + noise4 * 0.1);
        
        // Apply contrast and create more variation
        texture = (texture - 0.5) * contrast * 1.5 + 0.5;
        
        // Add some cellular-like patterns for more realistic texture
        const cellular = Math.sin(x * scale * 3) * Math.cos(y * scale * 3) * 0.1;
        texture += cellular;
        
        return Math.max(0, Math.min(1, texture));
    }

    // New method to generate random squares around a cell
    generateDecorativeSquares(cellX, cellY, cellSize, biome, polygons) {
        const squares = [];
        const squareCount = biome.squareCount;
        const squareSize = biome.squareSize;
        const minSpacing = biome.squareSpacing;
        
        // Create seed based on cell position and biome for consistent generation
        const cellSeed = cellX * 1000000 + cellY * 10000 + this.seed;
        const random = this.seededRandomGeneral(cellSeed);
        
        for (let i = 0; i < squareCount; i++) {
            let attempts = 0;
            let validPosition = false;
            let squareX, squareY;
            
            // Try to find a valid position (not too close to other squares and in filled area)
            while (!validPosition && attempts < 50) {
                squareX = cellX + random() * cellSize;
                squareY = cellY + random() * cellSize;
                
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
                
                // Check if all corners of the square are within any filled polygon area
                if (validPosition) {
                    const halfSize = squareSize / 2;
                    const corners = [
                        { x: squareX - halfSize, y: squareY - halfSize }, // Top-left
                        { x: squareX + halfSize, y: squareY - halfSize }, // Top-right
                        { x: squareX + halfSize, y: squareY + halfSize }, // Bottom-right
                        { x: squareX - halfSize, y: squareY + halfSize }  // Bottom-left
                    ];
                    
                    let allCornersInside = true;
                    for (const corner of corners) {
                        let cornerInside = false;
                        for (const polygon of polygons) {
                            if (this.isPointInPolygon(corner.x, corner.y, polygon.points)) {
                                cornerInside = true;
                                break;
                            }
                        }
                        if (!cornerInside) {
                            allCornersInside = false;
                            break;
                        }
                    }
                    
                    if (!allCornersInside) {
                        validPosition = false;
                    }
                }
                
                attempts++;
            }
            
            if (validPosition) {
                // Generate seeded random color variations for this square
                const squareSeed = cellSeed + i * 1000; // Unique seed per square
                const squareRandom = this.seededRandomGeneral(squareSeed);
                
                // Generate random darken/lighten amounts based on biome ranges
                const darkenAmount = squareRandom() * biome.darkenAmount * 2; // 0 to 2x biome amount
                const lightenAmount = squareRandom() * biome.lightenAmount * 2; // 0 to 2x biome amount
                
                squares.push({
                    x: squareX,
                    y: squareY,
                    size: squareSize + random() * squareSize * 0.5, // Vary size slightly
                    opacity: biome.squareOpacity * (0.5 + random() * 0.5), // Vary opacity
                    darkenAmount: darkenAmount,
                    lightenAmount: lightenAmount
                });
            }
        }
        
        return squares;
    }

    // Fixed marching squares lookup table - corrected bit order and edge connections
    initMarchingSquaresTable() {
        // Each entry contains line segments defined by edge pairs
        // Edges: 0=top, 1=right, 2=bottom, 3=left
        // Corners: TL=8, TR=4, BR=2, BL=1 (binary: TL TR BR BL)
        return [
            [], // 0: 0000 - no corners filled
            [[2, 3]], // 1: 0001 - bottom-left corner
            [[1, 2]], // 2: 0010 - bottom-right corner  
            [[1, 3]], // 3: 0011 - bottom edge
            [[0, 1]], // 4: 0100 - top-right corner
            [[0, 1], [2, 3]], // 5: 0101 - diagonal opposite corners
            [[0, 2]], // 6: 0110 - right edge
            [[0, 3]], // 7: 0111 - missing top-left
            [[0, 3]], // 8: 1000 - top-left corner
            [[0, 2]], // 9: 1001 - left edge
            [[0, 3], [1, 2]], // 10: 1010 - diagonal opposite corners
            [[0, 1]], // 11: 1011 - missing top-right
            [[1, 3]], // 12: 1100 - top edge
            [[1, 2]], // 13: 1101 - missing bottom-right
            [[2, 3]], // 14: 1110 - missing bottom-left
            [] // 15: 1111 - all corners filled
        ];
    }

    // Improved noise function using multiple octaves
    noise(x, y) {
        // Handle negative coordinates and very large coordinates properly
        const safeX = x === -0 ? 0 : x; // Handle negative zero
        const safeY = y === -0 ? 0 : y; // Handle negative zero

        let n = Math.sin(safeX * 12.9898 + safeY * 78.233 + this.seed * 37.719) * 43758.5453;
        return (n - Math.floor(n));
    }

    // Main generation function that dispatches to appropriate algorithm
    generateHeight(x, y) {
        switch (this.generationType) {
            case "Random":
                return this.octaveNoise(x, y);
            case "Maze":
                return this.generateMazeHeight(x, y);
            case "HeightConstrained":
                return this.generateHeightConstrained(x, y);
            case "PerlinNoise":
                return this.perlinNoise(x, y);
            case "SimplexNoise":
                return this.simplexNoise(x, y);
            case "Voronoi":
                return this.voronoiNoise(x, y);
            default:
                return this.octaveNoise(x, y);
        }
    }

    // Height-constrained generation (only generates terrain above minHeight)
    generateHeightConstrained(x, y) {
        const baseHeight = this.octaveNoise(x, y);

        // Only generate terrain above the minimum height
        if (y < this.minHeight) {
            // Create a smooth transition zone
            const transitionHeight = 100; // pixels
            const distanceFromMin = this.minHeight - y;

            if (distanceFromMin < transitionHeight) {
                const fadeFactor = distanceFromMin / transitionHeight;
                return baseHeight * fadeFactor * fadeFactor; // Smooth quadratic fade
            } else {
                return 0; // No terrain below minimum height
            }
        }

        return baseHeight;
    }

    // Maze-based height generation with improved randomness
    generateMazeHeight(x, y) {
        // Generate a maze for this grid area
        const gridSize = this.gridSize * this.gridResolution;
        const gridX = Math.floor(x / gridSize);
        const gridY = Math.floor(y / gridSize);

        // Create a deterministic maze based on grid position and seed
        const mazeSeed = gridX * 10000 + gridY * 100 + this.seed;
        const random = this.seededRandom(mazeSeed);

        const mazeWidth = Math.floor(this.gridResolution / 2);
        const mazeHeight = Math.floor(this.gridResolution / 2);

        // Generate maze pattern with improved algorithm
        const maze = this.generateImprovedMazePattern(mazeWidth, mazeHeight, random, this.mazeComplexity);

        // Convert to height values with more variation
        return this.improvedMazeToHeightPattern(maze, x, y, this.gridSize);
    }

     // Seeded random number generator for deterministic maze generation
    seededRandom(seed) {
        let x = Math.sin(seed) * 10000;
        return function () {
            x = Math.sin(x) * 10000;
            return x - Math.floor(x);
        };
    }

    // General seeded random number generator for consistent generation
    seededRandomGeneral(seed) {
        let x = Math.sin(seed) * 10000;
        return function () {
            x = Math.sin(x) * 10000;
            return x - Math.floor(x);
        };
    }

    // Generate improved maze pattern with more randomness and variation
    generateImprovedMazePattern(width, height, random, complexity = 0.7) {
        const maze = Array(height).fill().map(() => Array(width).fill(1));

        // Use Prim's algorithm for more organic maze generation
        const frontiers = new Set();
        const visited = new Set();

        // Start from a random position
        const startX = Math.floor(random() * width);
        const startY = Math.floor(random() * height);
        visited.add(`${startX},${startY}`);
        maze[startY][startX] = 0;

        // Add initial frontiers
        this.addFrontiers(startX, startY, width, height, frontiers, visited);

        while (frontiers.size > 0) {
            // Pick random frontier
            const frontierArray = Array.from(frontiers);
            const randomIndex = Math.floor(random() * frontierArray.length);
            const frontier = frontierArray[randomIndex];
            frontiers.delete(frontier);

            const [x, y] = frontier.split(',').map(Number);
            const neighbors = this.getValidNeighbors(x, y, width, height, visited);

            if (neighbors.length > 0) {
                // Pick random neighbor
                const neighborIndex = Math.floor(random() * neighbors.length);
                const [nx, ny] = neighbors[neighborIndex];

                // Carve path
                const wallX = (x + nx) / 2;
                const wallY = (y + ny) / 2;
                maze[wallY][wallX] = 0;
                maze[y][x] = 0;

                visited.add(frontier);
                this.addFrontiers(x, y, width, height, frontiers, visited);
            }
        }

        // Add some randomness by removing some walls based on complexity
        if (complexity < 1.0) {
            this.addMazeImperfections(maze, random, complexity);
        }

        return maze;
    }

    // Add frontier cells around a carved cell
    addFrontiers(x, y, width, height, frontiers, visited) {
        const directions = [[0, 2], [2, 0], [0, -2], [-2, 0]];

        directions.forEach(([dx, dy]) => {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const key = `${nx},${ny}`;
                if (!visited.has(key)) {
                    frontiers.add(key);
                }
            }
        });
    }

    // Get valid neighbors for maze generation
    getValidNeighbors(x, y, width, height, visited) {
        const neighbors = [];
        const directions = [[0, 2], [2, 0], [0, -2], [-2, 0]];

        directions.forEach(([dx, dy]) => {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const key = `${nx},${ny}`;
                if (visited.has(key)) {
                    neighbors.push([nx, ny]);
                }
            }
        });

        return neighbors;
    }

    // Add imperfections to make maze less perfect and more varied
    addMazeImperfections(maze, random, complexity) {
        const height = maze.length;
        const width = maze[0].length;

        // Remove some walls to create loops and alternative paths
        const wallsToRemove = Math.floor((height * width * (1 - complexity)) / 4);

        for (let i = 0; i < wallsToRemove; i++) {
            const x = Math.floor(random() * width);
            const y = Math.floor(random() * height);

            // Only remove walls, not paths
            if (maze[y][x] === 1) {
                // Check if removing this wall creates a valid opening
                const neighbors = this.getAdjacentCells(x, y, width, height);
                const pathCount = neighbors.filter(([nx, ny]) => maze[ny][nx] === 0).length;

                // Only remove if it connects to exactly one path (creates a dead end)
                if (pathCount === 1) {
                    maze[y][x] = 0;
                }
            }
        }
    }

    // Get adjacent cells (including diagonals)
    getAdjacentCells(x, y, width, height) {
        const cells = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    cells.push([nx, ny]);
                }
            }
        }
        return cells;
    }

    // Convert improved maze pattern to height values with more variation
    improvedMazeToHeightPattern(maze, x, y, cellSize) {
        const mazeX = Math.floor(x / cellSize);
        const mazeY = Math.floor(y / cellSize);

        if (mazeX >= 0 && mazeX < maze[0].length && mazeY >= 0 && mazeY < maze.length) {
            const cellValue = maze[mazeY][mazeX];

            // Create more varied height patterns
            let baseHeight;
            if (cellValue === 0) {
                // Path cells - vary height based on position and noise
                const positionNoise = this.noise(x * 0.05, y * 0.05);
                const detailNoise = this.noise(x * 0.2, y * 0.2) * 0.3;
                baseHeight = 0.6 + positionNoise * 0.3 + detailNoise;
            } else {
                // Wall cells - vary height for more organic look
                const wallNoise = this.noise(x * 0.08, y * 0.08);
                const heightVariation = this.noise(x * 0.15, y * 0.15) * 0.2;
                baseHeight = 0.1 + wallNoise * 0.2 + heightVariation;
            }

            // Add some micro-detail
            const microNoise = this.noise(x * 0.5, y * 0.5) * 0.05;
            const finalHeight = Math.max(0, Math.min(1, baseHeight + microNoise));

            return finalHeight;
        }

        return 0.1; // Default wall height for out-of-bounds
    }

    // Multi-octave noise function
    octaveNoise(x, y) {
        let value = 0;
        let amplitude = 1;
        let frequency = this.noiseScale;
        let maxValue = 0;

        for (let i = 0; i < this.noiseOctaves; i++) {
            value += this.noise(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= this.noisePersistence;
            frequency *= this.noiseLacunarity;
        }

        return value / maxValue;
    }

    // Improved Perlin noise function with proper gradients and permutation table
    perlinNoise(x, y) {
        // Create permutation table based on seed for deterministic randomness
        const perm = this.generatePermutationTable(this.seed);

        // Handle negative coordinates properly for infinite world generation
        const X = ((Math.floor(x) % 256) + 256) % 256;
        const Y = ((Math.floor(y) % 256) + 256) % 256;

        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);

        // Smooth the fractional parts
        const u = this.fade(xf);
        const v = this.fade(yf);

        // Hash coordinates of the 4 square corners
        const A = perm[X] + Y;
        const AA = perm[A];
        const AB = perm[A + 1];
        const B = perm[X + 1] + Y;
        const BA = perm[B];
        const BB = perm[B + 1];

        // Add blended results from 4 corners of the square
        const x1 = this.lerp(this.grad(AA, xf, yf), this.grad(BA, xf - 1, yf), u);
        const x2 = this.lerp(this.grad(AB, xf, yf - 1), this.grad(BB, xf - 1, yf - 1), u);

        return this.lerp(x1, x2, v);
    }

    // Generate permutation table for Perlin noise
    generatePermutationTable(seed) {
        const p = new Array(256);
        for (let i = 0; i < 256; i++) {
            p[i] = i;
        }

        // Shuffle using seed
        let n = 0;
        for (let i = 255; i > 0; i--) {
            n = (n + seed + i) % (i + 1);
            const temp = p[i];
            p[i] = p[n];
            p[n] = temp;
        }

        // Duplicate the array to avoid overflow
        return [...p, ...p];
    }

    // Fade function for smooth interpolation
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    // Linear interpolation
    lerp(a, b, t) {
        return a + t * (b - a);
    }

    // Gradient function for Perlin noise
    grad(hash, x, y) {
        const h = hash & 15;
        const gradX = h < 8 ? (h < 4 ? x : y) : (h === 12 || h === 14 ? x : -y);
        const gradY = h < 4 ? y : (h === 12 || h === 14 ? -x : (h & 2 ? -y : x));
        return (h & 1 ? -gradX : gradX) + (h & 2 ? -gradY : gradY);
    }

    // Improved Simplex noise implementation
    simplexNoise(x, y) {
        // Simplex constants
        const F2 = 0.5 * (Math.sqrt(3) - 1);
        const G2 = (3 - Math.sqrt(3)) / 6;
        const F3 = 1 / 3;
        const G3 = 1 / 6;

        // Skew the input space to determine which simplex cell we're in
        const s = (x + y) * F2;
        const xs = x + s;
        const ys = y + s;
        // Handle negative coordinates properly for infinite world generation
        const i = Math.floor(xs < 0 ? xs - 1 : xs);
        const j = Math.floor(ys < 0 ? ys - 1 : ys);

        // Unskew the cell origin back to (x,y) space
        const t = (i + j) * G2;
        const X0 = i - t;
        const Y0 = j - t;
        const x0 = x - X0;
        const y0 = y - Y0;

        // Determine which simplex we are in
        const i1 = x0 > y0 ? 1 : 0;
        const j1 = x0 > y0 ? 0 : 1;

        // Offsets for middle corner in (x,y) unskewed coords
        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1 + 2 * G2;
        const y2 = y0 - 1 + 2 * G2;

        // Generate permutation table for this seed
        const perm = this.generatePermutationTable(this.seed);

        // Calculate the contribution from the three corners
        const t0 = 0.5 - x0 * x0 - y0 * y0;
        const n0 = t0 < 0 ? 0 : Math.pow(t0, 4) * this.dot2D(perm[i + perm[j]], x0, y0);

        const t1 = 0.5 - x1 * x1 - y1 * y1;
        const n1 = t1 < 0 ? 0 : Math.pow(t1, 4) * this.dot2D(perm[i + i1 + perm[j + j1]], x1, y1);

        const t2 = 0.5 - x2 * x2 - y2 * y2;
        const n2 = t2 < 0 ? 0 : Math.pow(t2, 4) * this.dot2D(perm[i + 1 + perm[j + 1]], x2, y2);

        // Add contributions from each corner and scale the result
        return 45.0 * (n0 + n1 + n2);
    }

    // 2D dot product for simplex noise
    dot2D(hash, x, y) {
        const h = hash & 7;
        const u = h < 4 ? x : y;
        const v = h < 4 ? y : x;
        return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
    }

    // Voronoi diagram generation
    voronoiNoise(x, y) {
        let minDist = Infinity;
        let minDist2 = Infinity;

        // Generate sites based on seed AND world coordinates for infinite generation
        const sites = [];
        const gridSize = 2000; // Size of each Voronoi cell in world units
        const gridX = Math.floor(x / gridSize);
        const gridY = Math.floor(y / gridSize);

        // Generate sites for current grid and neighboring grids
        for (let gx = gridX - 1; gx <= gridX + 1; gx++) {
            for (let gy = gridY - 1; gy <= gridY + 1; gy++) {
                for (let i = 0; i < this.voronoiSites; i++) {
                    // Include grid coordinates in the seed for unique patterns per grid
                    const siteSeed = gx * 1000000 + gy * 10000 + i * 100 + this.seed;
                    const siteX = gx * gridSize + this.noise(siteSeed, 0) * gridSize;
                    const siteY = gy * gridSize + this.noise(siteSeed + 100, 0) * gridSize;
                    sites.push({ x: siteX, y: siteY });
                }
            }
        }

        // Apply Lloyd relaxation if enabled
        for (let iter = 0; iter < this.voronoiRelaxation; iter++) {
            sites.forEach(site => {
                let sumX = 0, sumY = 0, count = 0;
                sites.forEach(otherSite => {
                    if (otherSite !== site) {
                        const dx = otherSite.x - site.x;
                        const dy = otherSite.y - site.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < 1000) { // Only consider nearby sites
                            sumX += otherSite.x;
                            sumY += otherSite.y;
                            count++;
                        }
                    }
                });
                if (count > 0) {
                    site.x = sumX / count;
                    site.y = sumY / count;
                }
            });
        }

        // Find closest sites
        sites.forEach(site => {
            const dx = site.x - x * 100;
            const dy = site.y - y * 100;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < minDist) {
                minDist2 = minDist;
                minDist = dist;
            } else if (dist < minDist2) {
                minDist2 = dist;
            }
        });

        // Return F1-F2 distance for more interesting patterns
        return (minDist2 - minDist) / 100;
    }

    // Maze generation using recursive backtracking
    generateMaze(width, height) {
        const maze = Array(height).fill().map(() => Array(width).fill(1)); // 1 = wall, 0 = path

        function carve(x, y) {
            const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
            // Shuffle directions for randomness
            for (let i = directions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [directions[i], directions[j]] = [directions[j], directions[i]];
            }

            directions.forEach(([dx, dy]) => {
                const nx = x + dx * 2;
                const ny = y + dy * 2;

                if (nx >= 0 && nx < width && ny >= 0 && ny < height && maze[ny][nx] === 1) {
                    maze[y + dy][x + dx] = 0; // Remove wall
                    maze[ny][nx] = 0; // Create path
                    carve(nx, ny);
                }
            });
        }

        // Start carving from a random position
        const startX = Math.floor(Math.random() * Math.floor(width / 2)) * 2;
        const startY = Math.floor(Math.random() * Math.floor(height / 2)) * 2;
        maze[startY][startX] = 0;
        carve(startX, startY);

        return maze;
    }

    // Convert maze to height values
    mazeToHeight(maze, x, y, cellSize) {
        const mazeX = Math.floor(x / cellSize);
        const mazeY = Math.floor(y / cellSize);

        if (mazeX >= 0 && mazeX < maze[0].length && mazeY >= 0 && mazeY < maze.length) {
            // Add some noise to make it less perfect
            const baseHeight = maze[mazeY][mazeX] === 0 ? 0.8 : 0.2;
            const noise = this.noise(x * 0.1, y * 0.1) * 0.1;
            return Math.max(0, Math.min(1, baseHeight + noise));
        }

        return 0.2; // Default to wall height
    }

    // Determine biome based on noise values and height
    getBiome(x, y, height) {
        const biomeNoise = this.octaveNoise(x * this.biomeScale, y * this.biomeScale);
        const temperatureNoise = this.octaveNoise(x * this.biomeScale * 1.3, y * this.biomeScale * 0.7);
        const humidityNoise = this.octaveNoise(x * this.biomeScale * 0.8, y * this.biomeScale * 1.5);

        /*if (height < 0.5) {
            // Lowland areas
            if (temperatureNoise > 0.7) {
                return 'dirt';
            }
            return biomeNoise < 0.5 ? 'grass' : 'dirt';
        }

        if (height < 0.75) {
            // Mid-range areas
            if (temperatureNoise > 0.6 && humidityNoise > 0.4) {
                return 'dirt';
            }
            return 'grass';
        }*/

        // High altitude areas
        return 'grass';
    }

    // Get grid coordinates for world position
    getGridCoords(worldX, worldY) {
        const gridWorldSize = this.gridSize * this.gridResolution;
        return {
            x: Math.floor(worldX / gridWorldSize),
            y: Math.floor(worldY / gridWorldSize)
        };
    }

    // Generate grid key
    getGridKey(gridX, gridY) {
        return `${gridX},${gridY}`;
    }

    // Generate terrain data for a specific grid
    generateGrid(gridX, gridY) {
        const gridKey = this.getGridKey(gridX, gridY);

        if (this.gridCache.has(gridKey)) {
            return this.gridCache.get(gridKey);
        }

        const gridWorldSize = this.gridSize * this.gridResolution;
        const gridWorldX = gridX * gridWorldSize;
        const gridWorldY = gridY * gridWorldSize;

        const cells = [];

        // Generate grid cells
        for (let cellY = 0; cellY < this.gridResolution; cellY++) {
            for (let cellX = 0; cellX < this.gridResolution; cellX++) {
                const worldX = gridWorldX + cellX * this.gridSize;
                const worldY = gridWorldY + cellY * this.gridSize;

                // Generate corner height values (clockwise from top-left)
                const tl = this.generateHeight(worldX, worldY);
                const tr = this.generateHeight(worldX + this.gridSize, worldY);
                const br = this.generateHeight(worldX + this.gridSize, worldY + this.gridSize);
                const bl = this.generateHeight(worldX, worldY + this.gridSize);

                // Determine biome for this cell
                const avgHeight = (tl + tr + br + bl) / 4;
                const biome = this.getBiomeWithTransitions(worldX + this.gridSize / 2, worldY + this.gridSize / 2, avgHeight);

                const cell = {
                    x: worldX,
                    y: worldY,
                    values: [tl, tr, br, bl], // Store in clockwise order
                    biome: biome,
                    avgHeight: avgHeight,
                    contours: [],
                    polygons: [],
                    // New texture and decoration data
                    texturePattern: this.generateTexturePattern(worldX, worldY, 
                        this.biomes[biome].textureScale, this.biomes[biome].textureContrast),
                    decorativeSquares: [] // Initialize as empty array
                };

                // Generate marching squares contours and polygons
                this.generateContours(cell);

                // Generate decorative squares AFTER polygons are created
                if (this.biomes[biome].enableSquares) {
                    cell.decorativeSquares = this.generateDecorativeSquares(
                        worldX, worldY, this.gridSize, this.biomes[biome], cell.polygons
                    );
                }

                cells.push(cell);
            }
        }

        this.gridCache.set(gridKey, cells);
        return cells;
    }

    // Generate contours and polygons for a cell using marching squares
    generateContours(cell) {
        const threshold = this.threshold;

        // Convert values to binary based on threshold
        // Use correct bit positions: TL=8, TR=4, BR=2, BL=1
        const tl = cell.values[0] > threshold ? 8 : 0;
        const tr = cell.values[1] > threshold ? 4 : 0;
        const br = cell.values[2] > threshold ? 2 : 0;
        const bl = cell.values[3] > threshold ? 1 : 0;

        // Calculate marching squares case
        const caseIndex = tl + tr + br + bl;
        const edges = this.marchingSquaresTable[caseIndex];

        if (!edges || edges.length === 0) {
            // Check if this is a full cell (all corners above threshold)
            if (caseIndex === 15) {
                // Create full cell polygon
                cell.polygons.push({
                    points: [
                        { x: cell.x, y: cell.y },
                        { x: cell.x + this.gridSize, y: cell.y },
                        { x: cell.x + this.gridSize, y: cell.y + this.gridSize },
                        { x: cell.x, y: cell.y + this.gridSize }
                    ]
                });
            }
            return;
        }

        // Generate contour lines
        edges.forEach(([start, end]) => {
            const startPos = this.getEdgePosition(start, cell, threshold);
            const endPos = this.getEdgePosition(end, cell, threshold);

            if (startPos && endPos) {
                cell.contours.push({
                    startX: startPos.x,
                    startY: startPos.y,
                    endX: endPos.x,
                    endY: endPos.y
                });
            }
        });

        // Create polygons for filled areas
        this.generatePolygons(cell, caseIndex, threshold);
    }

    // Generate polygons for filled terrain areas
    generatePolygons(cell, caseIndex, threshold) {
        const cellSize = this.gridSize;
        const corners = [
            { x: cell.x, y: cell.y }, // top-left (0)
            { x: cell.x + cellSize, y: cell.y }, // top-right (1)
            { x: cell.x + cellSize, y: cell.y + cellSize }, // bottom-right (2)
            { x: cell.x, y: cell.y + cellSize } // bottom-left (3)
        ];

        // Get interpolated edge positions
        const getEdgePos = (edge) => this.getEdgePosition(edge, cell, threshold);

        let polygonPoints = [];

        // Generate polygon points based on marching squares case
        switch (caseIndex) {
            case 0: // 0000 - empty
                break;
            case 1: // 0001 - bottom-left corner only
                polygonPoints = [corners[3], getEdgePos(2), getEdgePos(3)];
                break;
            case 2: // 0010 - bottom-right corner only
                polygonPoints = [getEdgePos(1), corners[2], getEdgePos(2)];
                break;
            case 3: // 0011 - bottom edge
                polygonPoints = [getEdgePos(1), corners[2], corners[3], getEdgePos(3)];
                break;
            case 4: // 0100 - top-right corner only
                polygonPoints = [getEdgePos(0), corners[1], getEdgePos(1)];
                break;
            case 5: // 0101 - diagonal opposite corners (saddle point)
                // Create two separate triangles to avoid ambiguity
                polygonPoints = [getEdgePos(0), corners[1], getEdgePos(1)];
                cell.polygons.push({ points: polygonPoints.filter(p => p) });
                polygonPoints = [corners[3], getEdgePos(2), getEdgePos(3)];
                break;
            case 6: // 0110 - right edge
                polygonPoints = [getEdgePos(0), corners[1], corners[2], getEdgePos(2)];
                break;
            case 7: // 0111 - missing top-left
                polygonPoints = [getEdgePos(0), corners[1], corners[2], corners[3], getEdgePos(3)];
                break;
            case 8: // 1000 - top-left corner only
                polygonPoints = [corners[0], getEdgePos(0), getEdgePos(3)];
                break;
            case 9: // 1001 - left edge
                polygonPoints = [corners[0], getEdgePos(0), getEdgePos(2), corners[3]];
                break;
            case 10: // 1010 - diagonal opposite corners (saddle point)
                // Create two separate triangles to avoid ambiguity
                polygonPoints = [corners[0], getEdgePos(0), getEdgePos(3)];
                cell.polygons.push({ points: polygonPoints.filter(p => p) });
                polygonPoints = [getEdgePos(1), corners[2], getEdgePos(2)];
                break;
            case 11: // 1011 - missing top-right
                polygonPoints = [corners[0], getEdgePos(0), getEdgePos(1), corners[2], corners[3]];
                break;
            case 12: // 1100 - top edge
                polygonPoints = [corners[0], corners[1], getEdgePos(1), getEdgePos(3)];
                break;
            case 13: // 1101 - missing bottom-right
                polygonPoints = [corners[0], corners[1], getEdgePos(1), getEdgePos(2), corners[3]];
                break;
            case 14: // 1110 - missing bottom-left
                polygonPoints = [corners[0], corners[1], corners[2], getEdgePos(2), getEdgePos(3)];
                break;
            case 15: // 1111 - full cell
                polygonPoints = [corners[0], corners[1], corners[2], corners[3]];
                break;
        }

        // Add polygon if we have valid points
        if (polygonPoints.length >= 3) {
            // Filter out null positions
            const validPoints = polygonPoints.filter(p => p && p.x !== undefined && p.y !== undefined);
            if (validPoints.length >= 3) {
                cell.polygons.push({ points: validPoints });
            }
        }
    }

    // Get interpolated position on edge
    getEdgePosition(edge, cell, threshold) {
        const cellSize = this.gridSize;
        let x1, y1, x2, y2, val1, val2;

        switch (edge) {
            case 0: // Top edge (TL to TR)
                x1 = cell.x; y1 = cell.y; val1 = cell.values[0];
                x2 = cell.x + cellSize; y2 = cell.y; val2 = cell.values[1];
                break;
            case 1: // Right edge (TR to BR)
                x1 = cell.x + cellSize; y1 = cell.y; val1 = cell.values[1];
                x2 = cell.x + cellSize; y2 = cell.y + cellSize; val2 = cell.values[2];
                break;
            case 2: // Bottom edge (BR to BL)
                x1 = cell.x + cellSize; y1 = cell.y + cellSize; val1 = cell.values[2];
                x2 = cell.x; y2 = cell.y + cellSize; val2 = cell.values[3];
                break;
            case 3: // Left edge (BL to TL)
                x1 = cell.x; y1 = cell.y + cellSize; val1 = cell.values[3];
                x2 = cell.x; y2 = cell.y; val2 = cell.values[0];
                break;
            default:
                return null;
        }

        // Linear interpolation for smooth contours
        let t = 0.5; // Default to middle if no interpolation
        if (this.smoothTerrain && Math.abs(val2 - val1) > 0.001) {
            t = (threshold - val1) / (val2 - val1);
            t = Math.max(0, Math.min(1, t));
        }

        return {
            x: x1 + t * (x2 - x1),
            y: y1 + t * (y2 - y1)
        };
    }

    // Get viewport bounds
    /*getViewportBounds() {
        const viewport = window.engine.viewport;
        const viewportX = viewport.x || 0;
        const viewportY = viewport.y || 0;
        const viewportWidth = viewport.width || 800;
        const viewportHeight = viewport.height || 600;

        const halfWidth = viewportWidth / 2;
        const halfHeight = viewportHeight / 2;

        return {
            left: viewportX - halfWidth - this.viewportMargin,
            right: viewportX + halfWidth + this.viewportMargin,
            top: viewportY - halfHeight - this.viewportMargin,
            bottom: viewportY + halfHeight + this.viewportMargin,
            centerX: viewportX,
            centerY: viewportY,
            width: viewportWidth,
            height: viewportHeight
        };
    }*/

    getViewportBounds() {
        const viewport = window.engine.viewport;
        const viewportX = viewport.x || 0;
        const viewportY = viewport.y || 0;
        const viewportWidth = viewport.width || 800;
        const viewportHeight = viewport.height || 600;

        const halfWidth = viewportWidth / 2;
        const halfHeight = viewportHeight / 2;

        // Calculate proper viewport bounds with half viewport offset for grid centering
        const left = viewportX - halfWidth - this.viewportMargin;
        const right = viewportX + halfWidth + this.viewportMargin;
        const top = viewportY - halfHeight - this.viewportMargin;
        const bottom = viewportY + halfHeight + this.viewportMargin;

        return {
            left: left,
            right: right,
            top: top,
            bottom: bottom,
            centerX: viewportX,
            centerY: viewportY,
            width: viewportWidth,
            height: viewportHeight,
            halfWidth: halfWidth,
            halfHeight: halfHeight
        };
    }

    // Get visible grids for current viewport
    getVisibleGrids(viewportBounds) {
        const gridWorldSize = this.gridSize * this.gridResolution;

        // Apply half viewport offset to center grid generation on viewport center
        const offsetX = viewportBounds.halfWidth;
        const offsetY = viewportBounds.halfHeight;

        const minGridX = Math.floor((viewportBounds.left + offsetX) / gridWorldSize);
        const maxGridX = Math.floor((viewportBounds.right + offsetX) / gridWorldSize);
        const minGridY = Math.floor((viewportBounds.top + offsetY) / gridWorldSize);
        const maxGridY = Math.floor((viewportBounds.bottom + offsetY) / gridWorldSize);

        const visibleGrids = [];
        for (let x = minGridX; x <= maxGridX; x++) {
            for (let y = minGridY; y <= maxGridY; y++) {
                visibleGrids.push({ x, y });
            }
        }
        return visibleGrids;
    }

    loop(deltaTime) {
        const viewportBounds = this.getViewportBounds();

        // Update game object position for infinite scrolling
        this.gameObject.position.x = viewportBounds.centerX;
        this.gameObject.position.y = viewportBounds.centerY;

        // Clear and update active grids
        this.activeGrids.clear();

        const visibleGrids = this.getVisibleGrids(viewportBounds);

        // Generate visible grids
        visibleGrids.forEach(grid => {
            const gridKey = this.getGridKey(grid.x, grid.y);
            this.generateGrid(grid.x, grid.y);
            this.activeGrids.add(gridKey);
        });

        // Clean up distant cached grids to prevent memory leaks
        if (this.gridCache.size > 50) {
            const toDelete = [];
            for (const [key, value] of this.gridCache.entries()) {
                if (!this.activeGrids.has(key)) {
                    toDelete.push(key);
                }
            }
            // Keep only half of the inactive grids
            toDelete.slice(toDelete.length / 2).forEach(key => {
                this.gridCache.delete(key);
            });
        }

        if (this.showDebug) {
            window.physicsManager.debugDraw = true;
        } else {
            window.physicsManager.debugDraw = false;
        }

        //if (this.enableRigidbodies && window.physicsManager) {
        // This would be called by other objects that want to activate rigidbodies
        // For example, from a player controller or other moving objects
        // this.activateRigidBodiesRegion(playerX, playerY, this.rigidbodyRadius);
        //}
    }

    draw(ctx) {
        const viewportBounds = this.getViewportBounds();
        const offsetX = viewportBounds.width / 2 - (viewportBounds.centerX) - viewportBounds.width / 2;
        const offsetY = viewportBounds.height / 2 - (viewportBounds.centerY) - viewportBounds.height / 2;

        ctx.save();

        // Group cells by biome for efficient rendering
        const biomeGroups = {};
        let grassCells = []; // Separate grass cells to draw last

        Object.keys(this.biomes).forEach(biome => {
            biomeGroups[biome] = [];
        });

        // Collect all visible cells grouped by biome
        this.activeGrids.forEach(gridKey => {
            const cells = this.gridCache.get(gridKey);
            if (cells) {
                cells.forEach(cell => {
                    if (cell.polygons && cell.polygons.length > 0) {
                        if (cell.biome === 'grass') {
                            grassCells.push(cell);
                        } else {
                            biomeGroups[cell.biome].push(cell);
                        }
                    }
                });
            }
        });

        // Draw all non-grass biome groups first
        Object.entries(biomeGroups).forEach(([biomeKey, cells]) => {
            if (cells.length === 0 || biomeKey === 'grass') return;

            const biome = this.biomes[biomeKey];
            this.drawBiomeGroup(ctx, cells, biome, offsetX, offsetY);
        });

        // Draw grass biome last so its lines appear on top
        if (grassCells.length > 0) {
            const grassBiome = this.biomes.grass;
            this.drawBiomeGroup(ctx, grassCells, grassBiome, offsetX, offsetY);
        }

        this.drawGridOverlay(ctx, offsetX, offsetY);

        ctx.restore();
    }

    drawGridOverlay(ctx, offsetX, offsetY) {
        if (!this.showDebug) return;

        const viewportBounds = this.getViewportBounds();
        const gridWorldSize = this.gridSize * this.gridResolution;

        // Draw the existing yellow debug grid
        ctx.strokeStyle = "rgba(255, 255, 0, 0.5)";
        ctx.lineWidth = 1;
        ctx.setLineDash([1, 1]);

        // Draw individual cell grids within each visible grid
        this.activeGrids.forEach(gridKey => {
            const [gridX, gridY] = gridKey.split(',').map(Number);
            const gridWorldX = gridX * gridWorldSize;
            const gridWorldY = gridY * gridWorldSize;

            // Draw grid cells
            for (let cellY = 0; cellY < this.gridResolution; cellY++) {
                for (let cellX = 0; cellX < this.gridResolution; cellX++) {
                    const cellWorldX = gridWorldX + cellX * this.gridSize;
                    const cellWorldY = gridWorldY + cellY * this.gridSize;

                    const screenX = cellWorldX + offsetX;
                    const screenY = cellWorldY + offsetY;

                    // Only draw if cell is visible on screen
                    if (screenX > -this.gridSize && screenX < viewportBounds.width + this.gridSize &&
                        screenY > -this.gridSize && screenY < viewportBounds.height + this.gridSize) {

                        ctx.strokeRect(screenX, screenY, this.gridSize, this.gridSize);
                    }
                }
            }
        });

        ctx.setLineDash([]);

        // NEW: Draw green lines that match the cube lines
        ctx.strokeStyle = "rgba(0, 255, 0, 0.8)"; // Green color
        ctx.lineWidth = this.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([]); // Solid lines

        // Draw the actual terrain contour lines in green
        this.activeGrids.forEach(gridKey => {
            const cells = this.gridCache.get(gridKey);
            if (cells) {
                cells.forEach(cell => {
                    // Draw contour lines for this cell
                    if (cell.contours && cell.contours.length > 0) {
                        ctx.beginPath();
                        cell.contours.forEach(contour => {
                            const startX = contour.startX + offsetX;
                            const startY = contour.startY + offsetY;
                            const endX = contour.endX + offsetX;
                            const endY = contour.endY + offsetY;

                            ctx.moveTo(startX, startY);
                            ctx.lineTo(endX, endY);
                        });
                        ctx.stroke();
                    }
                });
            }
        });
    }

    drawBiomeGroup(ctx, cells, biome, offsetX, offsetY) {
        // Set drawing styles for this biome
        ctx.fillStyle = biome.fillColor;
        ctx.strokeStyle = biome.color;
        ctx.lineWidth = this.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw filled terrain areas with texture and color variation
        cells.forEach(cell => {
            cell.polygons.forEach(polygon => {
                if (polygon.points.length >= 3) {
                    // Generate varied fill color for this cell
                    const baseFillColor = this.generateBiomeColor(biome.fillColor, biome.colorVariation);
                    const adjustedFillColor = this.adjustColorBrightness(
                        baseFillColor, biome.darkenAmount, biome.lightenAmount
                    );
                    
                    // Apply texture as overlay pattern
                    const textureIntensity = cell.texturePattern;
                    const finalFillColor = this.applyTextureOverlay(
                        baseFillColor, textureIntensity, biome.textureContrast
                    );
                    
                    ctx.fillStyle = finalFillColor;
                    
                    // Draw the filled polygon
                    ctx.beginPath();
                    const firstPoint = polygon.points[0];
                    ctx.moveTo(firstPoint.x + offsetX, firstPoint.y + offsetY);

                    for (let i = 1; i < polygon.points.length; i++) {
                        const point = polygon.points[i];
                        ctx.lineTo(point.x + offsetX, point.y + offsetY);
                    }

                    ctx.closePath();
                    ctx.fill();
                }
            });
        });

        // Draw decorative squares
        if (biome.enableSquares) {
            cells.forEach(cell => {
                cell.decorativeSquares.forEach(square => {
                    // Use the stored color information for each square
                    const squareColor = this.adjustColorBrightness(
                        biome.fillColor, 
                        square.darkenAmount, 
                        square.lightenAmount
                    );
                    
                    ctx.fillStyle = squareColor;
                    ctx.globalAlpha = square.opacity;
                    ctx.fillRect(
                        square.x + offsetX - square.size / 2,
                        square.y + offsetY - square.size / 2,
                        square.size,
                        square.size
                    );
                });
            });
            
            ctx.globalAlpha = 1.0; // Reset alpha
        }

        // Draw contour lines for terrain edges (unchanged)
        if (this.lineWidth > 0) {
            ctx.strokeStyle = biome.color;
            ctx.beginPath();
            cells.forEach(cell => {
                cell.contours.forEach(contour => {
                    const startX = contour.startX + offsetX;
                    const startY = contour.startY + offsetY;
                    const endX = contour.endX + offsetX;
                    const endY = contour.endY + offsetY;

                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                });
            });
            ctx.stroke();
        }
    }

    // New utility method for color blending
    blendColors(color1, color2, ratio) {
        const hex1 = color1.replace('#', '');
        const hex2 = color2.replace('#', '');
        
        const r1 = parseInt(hex1.substr(0, 2), 16);
        const g1 = parseInt(hex1.substr(2, 2), 16);
        const b1 = parseInt(hex1.substr(4, 2), 16);
        
        const r2 = parseInt(hex2.substr(0, 2), 16);
        const g2 = parseInt(hex2.substr(2, 2), 16);
        const b2 = parseInt(hex2.substr(4, 2), 16);
        
        const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
        const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
        const b = Math.round(b1 * (1 - ratio) + b2 * ratio);
        
        return this.rgbaToHex(r, g, b);
    }

    expandPolygon(points, expansion = 1) {
        if (points.length < 3) return points;

        // Calculate polygon center
        let centerX = 0, centerY = 0;
        points.forEach(point => {
            centerX += point.x;
            centerY += point.y;
        });
        centerX /= points.length;
        centerY /= points.length;

        // Expand each point away from center
        return points.map(point => {
            const dx = point.x - centerX;
            const dy = point.y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance === 0) return point; // Avoid division by zero

            // Calculate unit vector away from center
            const unitX = dx / distance;
            const unitY = dy / distance;

            // Move point outward by expansion amount
            return {
                x: point.x + unitX * expansion,
                y: point.y + unitY * expansion
            };
        });
    }

    drawGizmos(ctx) {
        if (!this.showDebug) return;

        const viewportBounds = this.getViewportBounds();

        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(5, 5, 250, 160);

        ctx.fillStyle = "lime";
        ctx.font = "12px monospace";

        let y = 20;
        const lineHeight = 15;

        ctx.fillText(`Active Grids: ${this.activeGrids.size}`, 10, y); y += lineHeight;
        ctx.fillText(`Cache Size: ${this.gridCache.size}`, 10, y); y += lineHeight;
        ctx.fillText(`Grid Size: ${this.gridSize}px`, 10, y); y += lineHeight;
        ctx.fillText(`Resolution: ${this.gridResolution}x${this.gridResolution}`, 10, y); y += lineHeight;
        ctx.fillText(`Viewport: ${Math.round(viewportBounds.centerX)}, ${Math.round(viewportBounds.centerY)}`, 10, y); y += lineHeight;
        ctx.fillText(`Noise Scale: ${this.noiseScale.toFixed(3)}`, 10, y); y += lineHeight;
        ctx.fillText(`Threshold: ${this.threshold.toFixed(3)}`, 10, y); y += lineHeight;

        // Biome legend
        y += 5;
        ctx.fillText("Biomes:", 10, y); y += lineHeight;
        Object.entries(this.biomes).forEach(([key, biome]) => {
            ctx.fillStyle = biome.color;
            ctx.fillRect(15, y - 10, 10, 10);
            ctx.fillStyle = "lime";
            ctx.fillText(`${biome.name}`, 30, y);
            y += lineHeight;
        });

        // Draw grid boundaries
        const gridWorldSize = this.gridSize * this.gridResolution;
        const offsetX = viewportBounds.width / 2 - viewportBounds.centerX;
        const offsetY = viewportBounds.height / 2 - viewportBounds.centerY;

        ctx.strokeStyle = "rgba(255, 0, 0, 0.3)";
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);

        // Draw visible grid boundaries
        this.activeGrids.forEach(gridKey => {
            const [x, y] = gridKey.split(',').map(Number);
            const worldX = x * gridWorldSize;
            const worldY = y * gridWorldSize;

            const screenX = worldX + offsetX;
            const screenY = worldY + offsetY;

            ctx.strokeRect(screenX, screenY, gridWorldSize, gridWorldSize);
        });

        ctx.setLineDash([]);
    }

    getBiomeWithTransitions(x, y, height) {
        const centerBiome = this.getBiome(x, y, height);

        // Check neighboring biomes for smooth transitions
        const neighbors = [
            this.getBiome(x + this.gridSize, y, height),
            this.getBiome(x - this.gridSize, y, height),
            this.getBiome(x, y + this.gridSize, height),
            this.getBiome(x, y - this.gridSize, height)
        ];

        // If center is different from neighbors, create transition
        const differentNeighbors = neighbors.filter(biome => biome !== centerBiome);
        if (differentNeighbors.length > 0) {
            const transitionNoise = this.octaveNoise(x * this.biomeScale * 2, y * this.biomeScale * 2);
            if (transitionNoise > 0.7) {
                return differentNeighbors[0]; // Transition to neighbor biome
            }
        }

        return centerBiome;
    }

    // Public API methods
    getCellAtWorldPosition(worldX, worldY) {
        const gridCoords = this.getGridCoords(worldX, worldY);
        const gridKey = this.getGridKey(gridCoords.x, gridCoords.y);

        // Generate the grid if it doesn't exist
        const cells = this.generateGrid(gridCoords.x, gridCoords.y);

        // Find the specific cell within the grid
        const gridWorldSize = this.gridSize * this.gridResolution;
        const gridWorldX = gridCoords.x * gridWorldSize;
        const gridWorldY = gridCoords.y * gridWorldSize;

        const cellX = Math.floor((worldX - gridWorldX) / this.gridSize);
        const cellY = Math.floor((worldY - gridWorldY) / this.gridSize);

        // Ensure cell coordinates are within bounds
        if (cellX < 0 || cellX >= this.gridResolution || cellY < 0 || cellY >= this.gridResolution) {
            return null;
        }

        const cellIndex = cellY * this.gridResolution + cellX;
        return cells[cellIndex] || null;
    }

    // Get all cells at a world position (for edge cases)
    getCellsAtWorldPosition(worldX, worldY) {
        const cells = [];
        const gridCoords = this.getGridCoords(worldX, worldY);
        const gridKey = this.getGridKey(gridCoords.x, gridCoords.y);

        // Generate the grid if it doesn't exist
        const gridCells = this.generateGrid(gridCoords.x, gridCoords.y);

        // Check if the position might be on the edge and need neighboring cells
        const gridWorldSize = this.gridSize * this.gridResolution;
        const gridWorldX = gridCoords.x * gridWorldSize;
        const gridWorldY = gridCoords.y * gridWorldSize;

        const cellX = Math.floor((worldX - gridWorldX) / this.gridSize);
        const cellY = Math.floor((worldY - gridWorldY) / this.gridSize);

        // Get the main cell
        if (cellX >= 0 && cellX < this.gridResolution && cellY >= 0 && cellY < this.gridResolution) {
            const cellIndex = cellY * this.gridResolution + cellX;
            cells.push(gridCells[cellIndex]);
        }

        return cells;
    }

    // Check collision with terrain at world position
    checkCollision(cellWorldX, cellWorldY, smooth = true) {
        const cell = this.getCellAtWorldPosition(cellWorldX, cellWorldY);
        if (!cell) {
            return { collision: false, biome: null, height: 0 };
        }

        // Check if point is inside any terrain polygons
        if (cell.polygons && cell.polygons.length > 0) {
            for (const polygon of cell.polygons) {
                if (this.isPointInPolygon(cellWorldX, cellWorldY, polygon.points)) {
                    return {
                        collision: true,
                        biome: cell.biome,
                        height: cell.avgHeight,
                        polygon: polygon
                    };
                }
            }
        }

        // If smooth is true, also check contour line intersections
        if (smooth && cell.contours && cell.contours.length > 0) {
            for (const contour of cell.contours) {
                if (this.isPointOnLine(cellWorldX, cellWorldY, contour, 2)) { // 2px tolerance
                    return {
                        collision: true,
                        biome: cell.biome,
                        height: cell.avgHeight,
                        contour: contour
                    };
                }
            }
        }

        return { collision: false, biome: cell.biome, height: cell.avgHeight };
    }

    // Helper method to check if point is inside polygon
    isPointInPolygon(x, y, points) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].x, yi = points[i].y;
            const xj = points[j].x, yj = points[j].y;

            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }

    // Helper method to check if point is on a line segment
    isPointOnLine(x, y, contour, tolerance = 1) {
        const startX = contour.startX;
        const startY = contour.startY;
        const endX = contour.endX;
        const endY = contour.endY;

        // Calculate distance from point to line segment
        const A = x - startX;
        const B = y - startY;
        const C = endX - startX;
        const D = endY - startY;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;

        if (lenSq === 0) {
            // Line segment is a point
            return Math.sqrt(A * A + B * B) <= tolerance;
        }

        const param = dot / lenSq;

        let xx, yy;
        if (param < 0) {
            xx = startX;
            yy = startY;
        } else if (param > 1) {
            xx = endX;
            yy = endY;
        } else {
            xx = startX + param * C;
            yy = startY + param * D;
        }

        const dx = x - xx;
        const dy = y - yy;
        return Math.sqrt(dx * dx + dy * dy) <= tolerance;
    }

    // Advanced collision detection with multiple cells
    checkCollisionAdvanced(worldX, worldY, radius = 0) {
        const results = [];

        // Check current cell
        const cellResult = this.checkCollision(worldX, worldY, true);
        if (cellResult.collision) {
            results.push(cellResult);
        }

        // If radius is specified, check neighboring cells
        if (radius > 0) {
            const cells = this.getCellsAtWorldPosition(worldX, worldY);

            // Check cells within radius
            const checkRadius = Math.ceil(radius / this.gridSize);
            for (let dy = -checkRadius; dy <= checkRadius; dy++) {
                for (let dx = -checkRadius; dx <= checkRadius; dx++) {
                    const checkX = worldX + dx * this.gridSize;
                    const checkY = worldY + dy * this.gridSize;

                    const neighborResult = this.checkCollision(checkX, checkY, true);
                    if (neighborResult.collision) {
                        results.push(neighborResult);
                    }
                }
            }
        }

        return results;
    }

    // Rigidbody API
    /**
     * NEW: Public API function to activate rigidbodies in a region
     * @param {number} id - Unique identifier for the activation point
     * @param {number} worldX - World X position
     * @param {number} worldY - World Y position  
     * @param {number} radius - Radius to activate rigidbodies within
     */
    activateRigidBodiesRegion(id, worldX, worldY, radius = this.rigidbodyRadius) {
        if (!this.enableRigidbodies || !window.physicsManager) {
            return;
        }

        const activationRadius = radius || this.rigidbodyRadius;

        // NEW: Track this activation point instead of just using it once
        this.addActivationPoint(id, worldX, worldY, activationRadius);

        // Get grid bounds for the activation region
        const minX = worldX - activationRadius;
        const maxX = worldX + activationRadius;
        const minY = worldY - activationRadius;
        const maxY = worldY + activationRadius;

        // Convert world coordinates to rigidbody grid coordinates
        const minGridX = Math.floor(minX / this.rigidbodyGridSize);
        const maxGridX = Math.floor(maxX / this.rigidbodyGridSize);
        const minGridY = Math.floor(minY / this.rigidbodyGridSize);
        const maxGridY = Math.floor(maxY / this.rigidbodyGridSize);

        // Track which rigidbodies should be active
        const shouldBeActive = new Set();

        // Generate rigidbodies for grids within the activation radius
        for (let gridY = minGridY; gridY <= maxGridY; gridY++) {
            for (let gridX = minGridX; gridX <= maxGridX; gridX++) {
                const gridKey = this.getRigidbodyGridKey(gridX, gridY);
                shouldBeActive.add(gridKey);

                // Check if we need to create this rigidbody
                if (!this.activeRigidbodies.has(gridKey)) {
                    this.createRigidbodyForGrid(gridX, gridY);
                }
            }
        }

        // NEW: Use the tracked activation points for cleanup instead of just current point
        this.cleanupDistantRigidbodiesMultiPoint(shouldBeActive);
    }

    // NEW: Methods for tracking multiple activation points
    addActivationPoint(id, worldX, worldY, radius) {
        const pointId = id || ++this.activationPointId;
        const activationPoint = {
            id: pointId,
            x: worldX,
            y: worldY,
            radius: radius,
            timestamp: Date.now()
        };

        this.activeActivationPoints.set(pointId, activationPoint);

        // Clean up old activation points (older than 30 seconds)
        const thirtySecondsAgo = Date.now() - 30000;
        for (const [id, point] of this.activeActivationPoints.entries()) {
            if (point.timestamp < thirtySecondsAgo) {
                this.activeActivationPoints.delete(id);
            }
        }

        return pointId;
    }

    // NEW: Method to update existing activation point or create new one
    updateActivationPoint(id, worldX, worldY, radius) {
        // Check if activation point already exists
        let existingPoint = null;
        for (const [pointId, point] of this.activeActivationPoints.entries()) {
            if (point.customId === id) {
                existingPoint = point;
                break;
            }
        }

        if (existingPoint) {
            // Update existing activation point
            existingPoint.x = worldX;
            existingPoint.y = worldY;
            existingPoint.radius = radius;
            existingPoint.timestamp = Date.now();
        } else {
            // Create new activation point with custom ID
            const pointId = ++this.activationPointId;
            const activationPoint = {
                id: pointId,
                customId: id, // Store the gameObject id for reference
                x: worldX,
                y: worldY,
                radius: radius,
                timestamp: Date.now()
            };

            this.activeActivationPoints.set(pointId, activationPoint);
        }

        // Clean up old activation points (older than 30 seconds)
        const thirtySecondsAgo = Date.now() - 30000;
        for (const [pointId, point] of this.activeActivationPoints.entries()) {
            if (point.timestamp < thirtySecondsAgo) {
                this.activeActivationPoints.delete(pointId);
            }
        }

        return existingPoint ? existingPoint.id : this.activationPointId;
    }

    /**
     * NEW: Clean up rigidbodies that are too far from ALL activation points
     * @param {Set} shouldBeActive - Set of grid keys that should remain active
     */
    cleanupDistantRigidbodiesMultiPoint(shouldBeActive) {
        const toRemove = [];

        this.activeRigidbodies.forEach((rigidbodyData, gridKey) => {
            // Skip if this rigidbody should remain active
            if (shouldBeActive.has(gridKey)) {
                rigidbodyData.lastActive = Date.now();
                return;
            }

            // Check if this rigidbody is within range of ANY activation point
            let isWithinAnyActivationPoint = false;

            for (const activationPoint of this.activeActivationPoints.values()) {
                const distance = Math.sqrt(
                    Math.pow(rigidbodyData.worldX - activationPoint.x, 2) +
                    Math.pow(rigidbodyData.worldY - activationPoint.y, 2)
                );

                if (distance <= activationPoint.radius + this.rigidbodyCleanupThreshold) {
                    isWithinAnyActivationPoint = true;
                    break;
                }
            }

            // Remove if too far from ALL activation points
            if (!isWithinAnyActivationPoint) {
                toRemove.push(gridKey);
            }
        });

        // Remove distant rigidbodies
        toRemove.forEach(gridKey => {
            this.removeRigidbody(gridKey);
        });

        if (toRemove.length > 0) {
            console.log(`Cleaned up ${toRemove.length} distant rigidbodies (multi-point cleanup)`);
        }

        //this.activeActivationPoints.clear(); // Clear after cleanup
    }

    /**
     * NEW: Get rigidbody grid key for a grid position
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridY - Grid Y coordinate
     * @returns {string} Grid key
     */
    getRigidbodyGridKey(gridX, gridY) {
        return `rb_${gridX},${gridY}`;
    }

    /**
     * NEW: Create a rigidbody for a specific rigidbody grid
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridY - Grid Y coordinate
     */
    createRigidbodyForGrid(gridX, gridY) {
        if (!window.physicsManager) return;

        const gridKey = this.getRigidbodyGridKey(gridX, gridY);

        // Calculate world bounds for this rigidbody grid
        const worldX = gridX * this.rigidbodyGridSize;
        const worldY = gridY * this.rigidbodyGridSize;
        const worldSize = this.rigidbodyGridSize;

        // FIXED: Get terrain cells using the SAME grid system as rendering
        const overlappingCells = this.getTerrainCellsInBoundsFixed(
            worldX, worldY, worldSize, worldSize
        );

        if (overlappingCells.length === 0) {
            return;
        }

        const bodies = [];

        overlappingCells.forEach(cell => {
            if (cell.polygons && cell.polygons.length > 0) {
                cell.polygons.forEach(polygon => {
                    if (polygon.points && polygon.points.length >= 3) {
                        // FIXED: Create rigidbody for ALL polygons that intersect the bounds
                        // instead of just checking center
                        if (this.polygonIntersectsBounds(polygon.points, worldX, worldY, worldSize)) {
                            const rigidbodyData = this.createPolygonRigidbodyFixed(
                                polygon.points,
                                cell.biome
                            );

                            if (rigidbodyData && rigidbodyData.body) {
                                window.physicsManager.registerBody(rigidbodyData.body, rigidbodyData.gameObject);
                                bodies.push(rigidbodyData.body);
                            }
                        }
                    }
                });
            }
        });

        if (bodies.length > 0) {
            this.activeRigidbodies.set(gridKey, {
                bodies: bodies,
                gridX: gridX,
                gridY: gridY,
                worldX: worldX,
                worldY: worldY,
                lastActive: Date.now()
            });
        }
    }

    /**
     * NEW: Create a rigidbody for a single polygon with viewport offset
     * @param {Array} points - Polygon points
     * @param {string} biome - Biome type
     * @param {number} offsetX - X offset
     * @param {number} offsetY - Y offset
     * @returns {Object|null} Rigidbody data or null
     */
    createPolygonRigidbody(points, biome, offsetX, offsetY) {
        if (!window.physicsManager || !points || points.length < 3) {
            return null;
        }

        try {
            // Calculate the actual center of the polygon
            let centerX = 0, centerY = 0;
            points.forEach(point => {
                centerX += point.x;
                centerY += point.y;
            });
            centerX /= points.length;
            centerY /= points.length;

            // Apply viewport offset to match visual terrain position
            const viewportBounds = this.getViewportBounds();
            const viewportOffsetX = viewportBounds.width / 2 - viewportBounds.centerX;
            const viewportOffsetY = viewportBounds.height / 2 - viewportBounds.centerY;

            const physicsCenterX = centerX + viewportOffsetX;
            const physicsCenterY = centerY + viewportOffsetY;

            // Convert points to be relative to center (Matter.js requirement)
            const relativePoints = points.map(point => ({
                x: point.x - centerX,
                y: point.y - centerY
            }));

            // Create polygon body at the actual polygon center WITH viewport offset
            const body = Matter.Bodies.fromVertices(physicsCenterX, physicsCenterY, [relativePoints], {
                isStatic: true,
                friction: this.getBiomeFriction(biome),
                restitution: 0.1,
                collisionFilter: {
                    category: 0x0001,
                    mask: 0xFFFFFFFF,
                    group: 0
                },
                render: {
                    fillStyle: this.biomes[biome]?.fillColor || '#666666',
                    strokeStyle: this.biomes[biome]?.color || '#333333',
                    lineWidth: 1
                }
            });

            Matter.Body.setStatic(body, true);

            // Create game object at the actual polygon position WITH viewport offset
            const gameObject = this.createRigidbodyGameObject(physicsCenterX, physicsCenterY);
            gameObject.isTerrainRigidbody = true;
            gameObject.terrainBiome = biome;

            return {
                body: body,
                gameObject: gameObject
            };
        } catch (error) {
            console.error("Error creating polygon rigidbody:", error);
            return null;
        }
    }

    /**
     * NEW: Create a game object for rigidbody management
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {GameObject} Game object
     */
    createRigidbodyGameObject(x, y) {
        // Create a minimal game object for physics management
        const gameObject = {
            position: new Vector2(x, y),
            angle: 0,
            name: `TerrainRigidbody_${x}_${y}`,
            isTerrainRigidbody: true,
            getWorldPosition: function () { return this.position; },
            setWorldPosition: function (x, y) { this.position.set(x, y); }
        };
        return gameObject;
    }

    /**
     * NEW: Get terrain cells within specified bounds
     * @param {number} worldX - World X position
     * @param {number} worldY - World Y position
     * @param {number} width - Width of bounds
     * @param {number} height - Height of bounds
     * @returns {Array} Array of terrain cells
     */
    getTerrainCellsInBoundsFixed(worldX, worldY, width, height) {
        const cells = [];
        const minX = worldX;
        const maxX = worldX + width;
        const minY = worldY;
        const maxY = worldY + height;

        // FIXED: Use the SAME grid system as the terrain rendering
        const terrainGridSize = this.gridSize * this.gridResolution;
        const minTerrainGridX = Math.floor(minX / terrainGridSize);
        const maxTerrainGridX = Math.floor(maxX / terrainGridSize);
        const minTerrainGridY = Math.floor(minY / terrainGridSize);
        const maxTerrainGridY = Math.floor(maxY / terrainGridSize);

        for (let gridY = minTerrainGridY; gridY <= maxTerrainGridY; gridY++) {
            for (let gridX = minTerrainGridX; gridX <= maxTerrainGridX; gridX++) {
                const terrainCells = this.generateGrid(gridX, gridY);
                if (terrainCells) {
                    // FIXED: Filter cells to only include those that actually intersect our bounds
                    terrainCells.forEach(cell => {
                        if (this.cellIntersectsBounds(cell, minX, minY, maxX - minX, maxY - minY)) {
                            cells.push(cell);
                        }
                    });
                }
            }
        }

        return cells;
    }

    polygonIntersectsBounds(points, boundsX, boundsY, boundsSize) {
        // Check if any polygon point is within bounds
        for (const point of points) {
            if (point.x >= boundsX && point.x <= boundsX + boundsSize &&
                point.y >= boundsY && point.y <= boundsY + boundsSize) {
                return true;
            }
        }

        // Check if any bound corner is within polygon
        const boundCorners = [
            { x: boundsX, y: boundsY },
            { x: boundsX + boundsSize, y: boundsY },
            { x: boundsX + boundsSize, y: boundsY + boundsSize },
            { x: boundsX, y: boundsY + boundsSize }
        ];

        for (const corner of boundCorners) {
            if (this.isPointInPolygon(corner.x, corner.y, points)) {
                return true;
            }
        }

        return false;
    }

    /**
     * FIXED: Check if a terrain cell intersects with bounds
     */
    cellIntersectsBounds(cell, boundsX, boundsY, boundsWidth, boundsHeight) {
        const cellRight = cell.x + this.gridSize;
        const cellBottom = cell.y + this.gridSize;
        const boundsRight = boundsX + boundsWidth;
        const boundsBottom = boundsY + boundsHeight;

        return !(cell.x >= boundsRight || cellRight <= boundsX ||
            cell.y >= boundsBottom || cellBottom <= boundsY);
    }

    /**
     * FIXED: Create rigidbody with exact polygon coordinates and viewport offset
     */
    createPolygonRigidbodyFixed(points, biome) {
        if (!window.physicsManager || !points || points.length < 3) {
            return null;
        }

        try {
            // FIXED: Validate points before creating rigidbody
            const validPoints = points.filter(p =>
                p && typeof p.x === 'number' && typeof p.y === 'number' &&
                !isNaN(p.x) && !isNaN(p.y) && isFinite(p.x) && isFinite(p.y)
            );

            if (validPoints.length < 3) {
                console.warn("Not enough valid points for rigidbody creation");
                return null;
            }

            // FIXED: Calculate the actual center of the polygon (world position)
            let centerX = 0, centerY = 0, area = 0;
            for (let i = 0; i < validPoints.length; i++) {
                const j = (i + 1) % validPoints.length;
                const cross = validPoints[i].x * validPoints[j].y - validPoints[j].x * validPoints[i].y;
                area += cross;
                centerX += (validPoints[i].x + validPoints[j].x) * cross;
                centerY += (validPoints[i].y + validPoints[j].y) * cross;
            }
            area /= 2;
            centerX /= (6 * area);
            centerY /= (6 * area);

            // FIXED: Apply viewport offset to match visual terrain position
            const viewportBounds = this.getViewportBounds();
            const viewportOffsetX = 0;//viewportBounds.width / 2 - viewportBounds.centerX;
            const viewportOffsetY = 0;//viewportBounds.height / 2 - viewportBounds.centerY;

            const physicsCenterX = centerX + viewportOffsetX;
            const physicsCenterY = centerY + viewportOffsetY;

            // FIXED: Convert points to be relative to center (Matter.js requirement)
            const relativePoints = validPoints.map(point => ({
                x: point.x - centerX,
                y: point.y - centerY
            }));

            // FIXED: Create body at WORLD position WITH viewport offset to match visual terrain
            const body = Matter.Bodies.fromVertices(physicsCenterX, physicsCenterY, [relativePoints], {
                isStatic: true,
                friction: this.getBiomeFriction(biome),
                restitution: 0.1,
                collisionFilter: {
                    category: 0x0001,
                    mask: 0xFFFFFFFF,
                    group: 0
                },
                render: {
                    fillStyle: this.biomes[biome]?.fillColor || '#666666',
                    strokeStyle: this.biomes[biome]?.color || '#333333',
                    lineWidth: 1
                }
            });


            Matter.Body.setStatic(body, true);

            // FIXED: Verify the body was created successfully
            if (!body || !body.vertices) {
                console.warn("Failed to create Matter.js body");
                return null;
            }

            // FIXED: Create game object at WORLD position WITH viewport offset to match visual terrain
            const gameObject = this.createRigidbodyGameObject(physicsCenterX, physicsCenterY);
            gameObject.isTerrainRigidbody = true;
            gameObject.terrainBiome = biome;

            return {
                body: body,
                gameObject: gameObject
            };
        } catch (error) {
            console.error("Error creating polygon rigidbody:", error, points);
            return null;
        }
    }

    /**
     * NEW: Get friction value for biome
     * @param {string} biome - Biome type
     * @returns {number} Friction value
     */
    getBiomeFriction(biome) {
        const frictionMap = {
            grass: 0.7//,
            //dirt: 0.8
        };
        return frictionMap[biome] || 0.7;
    }

    /**
     * NEW: Clean up rigidbodies that are too far from activation point
     * @param {number} worldX - World X position
     * @param {number} worldY - World Y position
     * @param {number} activationRadius - Activation radius
     * @param {Set} shouldBeActive - Set of grid keys that should remain active
     */
    cleanupDistantRigidbodies(worldX, worldY, activationRadius, shouldBeActive) {
        const toRemove = [];

        this.activeRigidbodies.forEach((rigidbodyData, gridKey) => {
            // Skip if this rigidbody should remain active
            if (shouldBeActive.has(gridKey)) {
                rigidbodyData.lastActive = Date.now();
                return;
            }

            // Calculate distance from activation point
            const distance = Math.sqrt(
                Math.pow(rigidbodyData.worldX - worldX, 2) +
                Math.pow(rigidbodyData.worldY - worldY, 2)
            );

            // Remove if too far away
            if (distance > activationRadius + this.rigidbodyCleanupThreshold) {
                toRemove.push(gridKey);
            }
        });

        // Remove distant rigidbodies
        toRemove.forEach(gridKey => {
            this.removeRigidbody(gridKey);
        });

        if (toRemove.length > 0) {
            console.log(`Cleaned up ${toRemove.length} distant rigidbodies`);
        }
    }

    /**
     * NEW: Remove a rigidbody by grid key
     * @param {string} gridKey - Grid key of rigidbody to remove
     */
    removeRigidbody(gridKey) {
        const rigidbodyData = this.activeRigidbodies.get(gridKey);
        if (rigidbodyData && window.physicsManager) {
            // Handle both single body (old format) and array of bodies (new format)
            if (rigidbodyData.body) {
                window.physicsManager.removeBody(rigidbodyData.body);
            } else if (rigidbodyData.bodies) {
                rigidbodyData.bodies.forEach(body => {
                    window.physicsManager.removeBody(body);
                });
            }
            this.activeRigidbodies.delete(gridKey);
        }
    }

    /**
     * NEW: Clear all rigidbodies
     */
    clearAllRigidbodies() {
        this.activeRigidbodies.forEach((rigidbodyData, gridKey) => {
            this.removeRigidbody(gridKey);
        });
        this.activeRigidbodies.clear();
        console.log("Cleared all terrain rigidbodies");
    }

    /**
     * NEW: Get rigidbody statistics for debugging
     * @returns {Object} Statistics object
     */
    getRigidbodyStats() {
        return {
            activeCount: this.activeRigidbodies.size,
            enabled: this.enableRigidbodies,
            radius: this.rigidbodyRadius,
            gridSize: this.rigidbodyGridSize,
            enableRigidbodies: this.enableRigidbodies,
            rigidbodyRadius: this.rigidbodyRadius,
            rigidbodyGridSize: this.rigidbodyGridSize
        };
    }

    toJSON() {
        return {
            ...super.toJSON(),
            gridSize: this.gridSize,
            gridResolution: this.gridResolution,
            threshold: this.threshold,
            noiseScale: this.noiseScale,
            noiseOctaves: this.noiseOctaves,
            noisePersistence: this.noisePersistence,
            noiseLacunarity: this.noiseLacunarity,
            terrainHeight: this.terrainHeight,
            lineWidth: this.lineWidth,
            smoothTerrain: this.smoothTerrain,
            seed: this.seed,
            viewportMargin: this.viewportMargin,
            biomeScale: this.biomeScale,
            showDebug: this.showDebug,
            biomes: this.biomes,
            enableRigidbodies: this.enableRigidbodies,
            rigidbodyRadius: this.rigidbodyRadius,
            rigidbodyGridSize: this.rigidbodyGridSize,
            // New generation type properties
            generationType: this.generationType,
            mazeComplexity: this.mazeComplexity,
            minHeight: this.minHeight,
            voronoiSites: this.voronoiSites,
            voronoiRelaxation: this.voronoiRelaxation
        };
    }

    fromJSON(data) {
        super.fromJSON(data);

        if (!data) return;

        this.gridSize = data.gridSize || 20;
        this.gridResolution = data.gridResolution || 16;
        this.threshold = data.threshold || 0.5;
        this.noiseScale = data.noiseScale || 0.015;
        this.noiseOctaves = data.noiseOctaves || 4;
        this.noisePersistence = data.noisePersistence || 0.5;
        this.noiseLacunarity = data.noiseLacunarity || 2.0;
        this.terrainHeight = data.terrainHeight || 100;
        this.lineWidth = data.lineWidth || 1.5;
        this.smoothTerrain = data.smoothTerrain !== undefined ? data.smoothTerrain : true;
        this.seed = data.seed || 12345;
        this.viewportMargin = data.viewportMargin || 200;
        this.biomeScale = data.biomeScale || 0.005;
        this.showDebug = data.showDebug || false;

        if (data.biomes) {
            this.biomes = { ...this.biomes, ...data.biomes };
        }

        this.enableRigidbodies = data.enableRigidbodies || false;
        this.rigidbodyRadius = data.rigidbodyRadius || 100;
        this.rigidbodyGridSize = data.rigidbodyGridSize || 50;

        // Restore new generation type properties
        this.generationType = data.generationType || "Random";
        this.mazeComplexity = data.mazeComplexity !== undefined ? data.mazeComplexity : 0.7;
        this.minHeight = data.minHeight !== undefined ? data.minHeight : 500;
        this.voronoiSites = data.voronoiSites !== undefined ? data.voronoiSites : 50;
        this.voronoiRelaxation = data.voronoiRelaxation !== undefined ? data.voronoiRelaxation : 1;

        // Restore rigidbodies if they were active
        if (this.enableRigidbodies) {
            // Note: Rigidbodies will be recreated as needed when activateRigidBodiesRegion is called
            console.log("Rigidbody system enabled - rigidbodies will be recreated on demand");
        }

        this.clearCache();
    }
}

window.MarchingCubesTerrain = MarchingCubesTerrain;
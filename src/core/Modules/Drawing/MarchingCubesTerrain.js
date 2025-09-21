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
        this.lineWidth = 1.5;
        this.smoothTerrain = true;
        this.seed = 12345;
        this.viewportMargin = 200;
        this.biomeScale = 0.005;
        this.showDebug = false;

        //  Rigidbody management properties
        this.enableRigidbodies = false; // Enable/disable rigidbody generation
        this.rigidbodyRadius = 100; // Default radius for rigidbody activation
        this.activeRigidbodies = new Map(); // Track active rigidbodies by grid key
        this.rigidbodyGridSize = 64; // Size of rigidbody grid cells (larger than terrain grid)
        this.rigidbodyCleanupThreshold = 200; // Distance threshold for cleanup

        // Biome configurations
        this.biomes = {
            water: {
                name: "Water",
                color: "#1e90ff",
                fillColor: "rgba(30, 144, 255, 0.8)",
                heightRange: [0.0, 0.35],
                temperature: "cold",
                humidity: "wet"
            },
            sand: {
                name: "Sand",
                color: "#f4a460",
                fillColor: "rgba(244, 164, 96, 0.8)",
                heightRange: [0.25, 0.5],
                temperature: "warm",
                humidity: "dry"
            },
            grass: {
                name: "Grass",
                color: "#4a7c59",
                fillColor: "rgba(74, 124, 89, 0.8)",
                heightRange: [0.35, 0.75],
                temperature: "temperate",
                humidity: "moderate"
            },
            dirt: {
                name: "Dirt",
                color: "#8b4513",
                fillColor: "rgba(139, 69, 19, 0.8)",
                heightRange: [0.35, 0.75],
                temperature: "warm",
                humidity: "dry"
            },
            stone: {
                name: "Stone",
                color: "#696969",
                fillColor: "rgba(105, 105, 105, 0.8)",
                heightRange: [0.75, 1.0],
                temperature: "cold",
                humidity: "dry"
            }
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
        let n = Math.sin(x * 12.9898 + y * 78.233 + this.seed * 37.719) * 43758.5453;
        return (n - Math.floor(n));
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

    // Determine biome based on noise values and height
    getBiome(x, y, height) {
        const biomeNoise = this.octaveNoise(x * this.biomeScale, y * this.biomeScale);
        const temperatureNoise = this.octaveNoise(x * this.biomeScale * 1.3, y * this.biomeScale * 0.7);
        const humidityNoise = this.octaveNoise(x * this.biomeScale * 0.8, y * this.biomeScale * 1.5);

        // Priority-based biome determination (no overlaps)
        if (height < 0.25) {
            return 'water';
        }

        if (height < 0.35) {
            // Coastal areas - mix of sand and water
            return biomeNoise < 0.3 ? 'sand' : 'water';
        }

        if (height < 0.5) {
            // Lowland areas
            if (temperatureNoise > 0.7) {
                return 'dirt';
            }
            return biomeNoise < 0.5 ? 'sand' : 'grass';
        }

        if (height < 0.75) {
            // Mid-range areas
            if (temperatureNoise > 0.6 && humidityNoise > 0.4) {
                return 'dirt';
            }
            return 'grass';
        }

        // High altitude areas
        return 'stone';
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
                const tl = this.octaveNoise(worldX, worldY);
                const tr = this.octaveNoise(worldX + this.gridSize, worldY);
                const br = this.octaveNoise(worldX + this.gridSize, worldY + this.gridSize);
                const bl = this.octaveNoise(worldX, worldY + this.gridSize);

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
                    polygons: []
                };

                // Generate marching squares contours and polygons
                this.generateContours(cell);

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
        Object.keys(this.biomes).forEach(biome => {
            biomeGroups[biome] = [];
        });

        // Collect all visible cells grouped by biome
        this.activeGrids.forEach(gridKey => {
            const cells = this.gridCache.get(gridKey);
            if (cells) {
                cells.forEach(cell => {
                    if (cell.polygons && cell.polygons.length > 0) {
                        biomeGroups[cell.biome].push(cell);
                    }
                });
            }
        });

        // Draw each biome group
        Object.entries(biomeGroups).forEach(([biomeKey, cells]) => {
            if (cells.length === 0) return;

            const biome = this.biomes[biomeKey];
            this.drawBiomeGroup(ctx, cells, biome, offsetX, offsetY);
        });

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

        // Draw filled terrain areas
        cells.forEach(cell => {
            cell.polygons.forEach(polygon => {
                if (polygon.points.length >= 3) {
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

        // Draw contour lines for terrain edges
        if (this.lineWidth > 0) {
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
     * @param {number} worldX - World X position
     * @param {number} worldY - World Y position  
     * @param {number} radius - Radius to activate rigidbodies within
     */
    activateRigidBodiesRegion(worldX, worldY, radius = this.rigidbodyRadius) {
        if (!this.enableRigidbodies || !window.physicsManager) {
            return;
        }

        const activationRadius = radius || this.rigidbodyRadius;

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

        // Remove rigidbodies that are too far from the activation point
        this.cleanupDistantRigidbodies(worldX, worldY, activationRadius, shouldBeActive);
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
            let centerX = 0, centerY = 0;
            validPoints.forEach(point => {
                centerX += point.x;
                centerY += point.y;
            });
            centerX /= validPoints.length;
            centerY /= validPoints.length;

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
            water: 0.1,
            sand: 0.6,
            grass: 0.7,
            dirt: 0.8,
            stone: 0.9
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
            rigidbodyGridSize: this.rigidbodyGridSize
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

        // Restore rigidbodies if they were active
        if (this.enableRigidbodies) {
            // Note: Rigidbodies will be recreated as needed when activateRigidBodiesRegion is called
            console.log("Rigidbody system enabled - rigidbodies will be recreated on demand");
        }

        this.clearCache();
    }
}

window.MarchingCubesTerrain = MarchingCubesTerrain;
class DrawInfiniteStarFieldParallax extends Module {
    static namespace = "Effects";
    static description = "Infinite scrolling star field with parallax layers for top-down view";
    static allowMultiple = false;

    constructor() {
        super("DrawInfiniteStarFieldParallax");

        // Configuration properties
        this.layerCount = 4;
        this.starsPerGrid = 80;
        this.gridSize = 800; // Fixed grid size
        this.starColor = "#ffffff";
        this.minSize = 0.5;
        this.maxSize = 2.5;
        this.flickerRate = 0.03;
        this.parallaxStrength = 0.6;
        this.seed = 12345;
        this.baseDepth = 0.2;
        this.brightness = 1.0;

        // Internal state
        this.layers = [];
        this.gridCache = new Map();
        this.activeGrids = new Set();

        // Expose properties for inspector
        this.exposeProperty("layerCount", "number", 4, {
            description: "Number of parallax layers",
            onChange: (val) => {
                this.layerCount = Math.max(1, Math.floor(val));
                this.initializeLayers();
            }
        });

        this.exposeProperty("starsPerGrid", "number", 80, {
            description: "Stars per grid cell",
            onChange: (val) => {
                this.starsPerGrid = Math.max(5, Math.floor(val));
                this.clearCache();
            }
        });

        this.exposeProperty("gridSize", "number", 800, {
            description: "Size of each grid cell",
            onChange: (val) => {
                this.gridSize = Math.max(200, val);
                this.clearCache();
            }
        });

        this.exposeProperty("seed", "number", 12345, {
            description: "Seed for deterministic star generation",
            onChange: (val) => {
                this.seed = val;
                this.clearCache();
            }
        });

        this.exposeProperty("starColor", "color", "#ffffff", {
            description: "Base color of stars",
            onChange: (val) => {
                this.starColor = val;
            }
        });

        this.exposeProperty("minSize", "number", 0.5, {
            description: "Minimum star size",
            onChange: (val) => {
                this.minSize = Math.max(0.1, val);
            }
        });

        this.exposeProperty("maxSize", "number", 2.5, {
            description: "Maximum star size",
            onChange: (val) => {
                this.maxSize = Math.max(this.minSize, val);
            }
        });

        this.exposeProperty("flickerRate", "number", 0.03, {
            description: "Star flicker intensity (0-1)",
            onChange: (val) => {
                this.flickerRate = Math.max(0, Math.min(1, val));
            }
        });

        this.exposeProperty("parallaxStrength", "number", 0.6, {
            description: "Parallax effect strength",
            onChange: (val) => {
                this.parallaxStrength = Math.max(0, Math.min(1, val));
            }
        });

        this.exposeProperty("baseDepth", "number", 0.2, {
            description: "Base opacity for distant stars",
            onChange: (val) => {
                this.baseDepth = Math.max(0.1, Math.min(1, val));
            }
        });

        this.exposeProperty("brightness", "number", 1.0, {
            description: "Overall brightness multiplier",
            onChange: (val) => {
                this.brightness = Math.max(0.1, Math.min(3, val));
            }
        });
    }

    start() {
        this.initializeLayers();

        // Position at viewport origin for top-down infinite scrolling
        this.gameObject.position.x = 0;
        this.gameObject.position.y = 0;
    }

    initializeLayers() {
        this.layers = [];

        for (let i = 0; i < this.layerCount; i++) {
            const layer = {
                depth: this.baseDepth + ((i + 1) / this.layerCount) * (1 - this.baseDepth),
                parallaxFactor: 1 - (i / this.layerCount) * this.parallaxStrength,
                starSizeMultiplier: 0.3 + (i / this.layerCount) * 0.7,
                grids: new Map()
            };
            this.layers.push(layer);
        }

        this.clearCache();
    }

    clearCache() {
        this.gridCache.clear();
        this.activeGrids.clear();
        this.layers.forEach(layer => {
            if (layer.grids) layer.grids.clear();
        });
    }

    // Seeded random number generator
    seededRandom(seed) {
        let x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    // Get grid coordinates for world position
    getGridCoords(worldX, worldY) {
        return {
            x: Math.floor(worldX / this.gridSize),
            y: Math.floor(worldY / this.gridSize)
        };
    }

    // Generate grid key
    getGridKey(gridX, gridY, layerIndex) {
        return `${gridX},${gridY},${layerIndex}`;
    }

    // Generate stars for a specific grid cell
    generateGrid(gridX, gridY, layerIndex) {
        const layer = this.layers[layerIndex];
        const gridKey = this.getGridKey(gridX, gridY, layerIndex);

        if (this.gridCache.has(gridKey)) {
            return this.gridCache.get(gridKey);
        }

        const stars = [];
        const gridWorldX = gridX * this.gridSize;
        const gridWorldY = gridY * this.gridSize;

        // Create deterministic seed for this grid
        const gridSeed = this.seed + gridX * 1000 + gridY * 100000 + layerIndex * 10000000;
        let seedCounter = 0;

        for (let i = 0; i < this.starsPerGrid; i++) {
            const baseSize = this.minSize + this.seededRandom(gridSeed + seedCounter++) * (this.maxSize - this.minSize);

            const star = {
                x: gridWorldX + this.seededRandom(gridSeed + seedCounter++) * this.gridSize,
                y: gridWorldY + this.seededRandom(gridSeed + seedCounter++) * this.gridSize,
                size: baseSize * layer.starSizeMultiplier,
                brightness: 0.4 + this.seededRandom(gridSeed + seedCounter++) * 0.6,
                flickerPhase: this.seededRandom(gridSeed + seedCounter++) * Math.PI * 2,
                flickerSpeed: 0.3 + this.seededRandom(gridSeed + seedCounter++) * 1.5,
                depth: layer.depth,
                starType: this.seededRandom(gridSeed + seedCounter++) < 0.1 ? 'bright' : 'normal'
            };
            stars.push(star);
        }

        this.gridCache.set(gridKey, stars);
        return stars;
    }

    // Get viewport bounds like in DrawPlatformerHills
    getViewportBounds() {
        const viewportX = window.engine.viewport.x || 0;
        const viewportY = window.engine.viewport.y || 0;
        const viewportWidth = window.engine.viewport.width || 800;
        const viewportHeight = window.engine.viewport.height || 600;

        // viewport.x and viewport.y represent the world coordinates at the CENTER of the screen
        const halfWidth = viewportWidth / 2;
        const halfHeight = viewportHeight / 2;

        return {
            left: viewportX - halfWidth,
            right: viewportX + halfWidth,
            top: viewportY - halfHeight,
            bottom: viewportY + halfHeight
        };
    }

    // Get visible grids for current viewport (like DrawPlatformerHills)
    getVisibleGrids(viewportBounds, parallaxFactor) {
        const viewportX = window.engine.viewport.x || 0;
        const viewportY = window.engine.viewport.y || 0;

        // Camera center for this layer
        const layerCameraX = viewportX * parallaxFactor;
        const layerCameraY = viewportY * parallaxFactor;

        const vpWidth = (viewportBounds.right - viewportBounds.left);
        const vpHeight = (viewportBounds.bottom - viewportBounds.top);
        const halfWidth = vpWidth / 2;
        const halfHeight = vpHeight / 2;

        // Add margin so we pre-load offscreen grids to avoid popping
        const margin = this.gridSize;

        const startGridX = Math.floor((layerCameraX - halfWidth - margin) / this.gridSize);
        const endGridX   = Math.floor((layerCameraX + halfWidth + margin) / this.gridSize);
        const startGridY = Math.floor((layerCameraY - halfHeight - margin) / this.gridSize);
        const endGridY   = Math.floor((layerCameraY + halfHeight + margin) / this.gridSize);

        const visibleGrids = [];
        for (let x = startGridX; x <= endGridX; x++) {
            for (let y = startGridY; y <= endGridY; y++) {
                visibleGrids.push({ x, y });
            }
        }
        return visibleGrids;
    }

    loop(deltaTime) {
        const viewportBounds = this.getViewportBounds();

        // Keep game object at origin for infinite scrolling effect
        this.gameObject.position.x = window.engine.viewport.x || 0;
        this.gameObject.position.y = window.engine.viewport.y || 0;

        // Clear active grids set
        this.activeGrids.clear();

        // Update active grids for each layer
        this.layers.forEach((layer, layerIndex) => {
            const visibleGrids = this.getVisibleGrids(viewportBounds, layer.parallaxFactor);

            // Clear old grids from layer
            layer.grids.clear();

            // Load visible grids
            visibleGrids.forEach(grid => {
                const gridKey = this.getGridKey(grid.x, grid.y, layerIndex);
                const stars = this.generateGrid(grid.x, grid.y, layerIndex);
                layer.grids.set(gridKey, {
                    stars: stars,
                    gridX: grid.x,
                    gridY: grid.y
                });
                this.activeGrids.add(gridKey);
            });
        });

        // Update star flicker phases
        this.layers.forEach(layer => {
            layer.grids.forEach(grid => {
                grid.stars.forEach(star => {
                    star.flickerPhase += star.flickerSpeed * deltaTime;
                });
            });
        });
    }

    draw(ctx) {
        const viewportBounds = this.getViewportBounds();

        // Draw each layer from back to front (distant to close)
        this.layers.forEach(layer => {
            this.drawLayer(ctx, layer, viewportBounds);
        });
    }

    drawLayer(ctx, layer, viewportBounds) {
        ctx.save();

        const viewportX = window.engine.viewport.x || 0;
        const viewportY = window.engine.viewport.y || 0;

        // Camera center for this layer (parallax)
        const layerCameraX = viewportX * layer.parallaxFactor;
        const layerCameraY = viewportY * layer.parallaxFactor;

        const vpWidth = (viewportBounds.right - viewportBounds.left);
        const vpHeight = (viewportBounds.bottom - viewportBounds.top);
        const halfWidth = vpWidth / 2;
        const halfHeight = vpHeight / 2;

        layer.grids.forEach(grid => {
            grid.stars.forEach(star => {
                // Screen position relative to this layer's camera
                const screenX = (star.x - layerCameraX) + halfWidth;
                const screenY = (star.y - layerCameraY) + halfHeight;

                const margin = star.size * 2;

                if (screenX >= -margin && screenX <= vpWidth + margin &&
                    screenY >= -margin && screenY <= vpHeight + margin) {

                    // Flicker
                    const flicker = this.flickerRate > 0 ? Math.sin(star.flickerPhase) * this.flickerRate : 0;
                    let alpha = Math.max(0.1, star.brightness + flicker);

                    // Depth and global brightness
                    alpha *= star.depth * this.brightness;

                    if (star.starType === 'bright') alpha *= 1.5;

                    // Soft glow
                    ctx.globalAlpha = alpha * 0.3;
                    ctx.fillStyle = this.starColor;
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, star.size * 2, 0, Math.PI * 2);
                    ctx.fill();

                    // Core
                    ctx.globalAlpha = alpha;
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, star.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        });

        ctx.restore();
    }

    drawGizmos(ctx) {
        if (window.engine.debug) {
            const viewportBounds = this.getViewportBounds();

            ctx.fillStyle = "yellow";
            ctx.font = "12px Arial";
            ctx.fillText(`Star Layers: ${this.layers.length}`, 10, 20);
            ctx.fillText(`Grid Size: ${this.gridSize}`, 10, 35);
            ctx.fillText(`Cache Size: ${this.gridCache.size}`, 10, 50);
            ctx.fillText(`Active Grids: ${this.activeGrids.size}`, 10, 65);

            const viewport = window.engine.viewport;
            ctx.fillText(`Viewport: ${Math.round(viewport.x)}, ${Math.round(viewport.y)}`, 10, 80);

            // Draw grid boundaries for debugging (first layer as reference)
            if (this.layers.length > 0) {
                const layer = this.layers[0];
                const viewportX = viewport.x || 0;
                const viewportY = viewport.y || 0;

                const layerCameraX = viewportX * layer.parallaxFactor;
                const layerCameraY = viewportY * layer.parallaxFactor;

                const vpWidth = viewportBounds.right - viewportBounds.left;
                const vpHeight = viewportBounds.bottom - viewportBounds.top;
                const halfWidth = vpWidth / 2;
                const halfHeight = vpHeight / 2;

                // Current grid in layer space
                const currentGridX = Math.floor(layerCameraX / this.gridSize);
                const currentGridY = Math.floor(layerCameraY / this.gridSize);
                const gridWorldX = currentGridX * this.gridSize;
                const gridWorldY = currentGridY * this.gridSize;

                ctx.strokeStyle = "rgba(255, 255, 0, 0.3)";
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);

                // Vertical lines
                for (let i = -1; i <= 2; i++) {
                    const worldX = gridWorldX + (i * this.gridSize);
                    const screenX = (worldX - layerCameraX) + halfWidth;
                    ctx.beginPath();
                    ctx.moveTo(screenX, 0);
                    ctx.lineTo(screenX, vpHeight);
                    ctx.stroke();
                }

                // Horizontal lines
                for (let i = -1; i <= 2; i++) {
                    const worldY = gridWorldY + (i * this.gridSize);
                    const screenY = (worldY - layerCameraY) + halfHeight;
                    ctx.beginPath();
                    ctx.moveTo(0, screenY);
                    ctx.lineTo(vpWidth, screenY);
                    ctx.stroke();
                }

                ctx.setLineDash([]);
            }
        }
    }

    toJSON() {
        return {
            layerCount: this.layerCount,
            starsPerGrid: this.starsPerGrid,
            gridSize: this.gridSize,
            seed: this.seed,
            starColor: this.starColor,
            minSize: this.minSize,
            maxSize: this.maxSize,
            flickerRate: this.flickerRate,
            parallaxStrength: this.parallaxStrength,
            baseDepth: this.baseDepth,
            brightness: this.brightness
        };
    }

    fromJSON(data) {
        this.layerCount = data.layerCount || 4;
        this.starsPerGrid = data.starsPerGrid || 80;
        this.gridSize = data.gridSize || 800;
        this.seed = data.seed || 12345;
        this.starColor = data.starColor || "#ffffff";
        this.minSize = data.minSize || 0.5;
        this.maxSize = data.maxSize || 2.5;
        this.flickerRate = data.flickerRate || 0.03;
        this.parallaxStrength = data.parallaxStrength || 0.6;
        this.baseDepth = data.baseDepth || 0.2;
        this.brightness = data.brightness || 1.0;

        this.initializeLayers();
    }
}

window.DrawInfiniteStarFieldParallax = DrawInfiniteStarFieldParallax;
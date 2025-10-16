class InfiniteParallaxBackground extends Module {
    static namespace = "Visual";
    static description = "Infinite scrolling parallax mountain/hill background";
    static allowMultiple = false;
    static iconClass = "fas fa-mountain";
    static color = "#6B8E23";

    constructor() {
        super("InfiniteParallaxBackground");

        //this.ignoreGameObjectTransform = true;

        // Layer configuration
        this.layerCount = 5;
        this.hillsPerLayer = 8;
        this.seed = 12345;

        // Visual properties
        this.skyColor = "#87CEEB";
        this.horizonColor = "#E0F6FF";
        this.nearColor = "#2D5016";
        this.farColor = "#A0B0C0";

        // Parallax and terrain
        this.parallaxStrength = 0.7;
        this.baseHeight = 200;
        this.heightVariation = 150;
        this.smoothness = 0.6;
        this.verticalOffset = 100;

        // Advanced settings
        this.noiseScale = 0.003;
        this.hillPointCount = 50;

        // Internal state
        this.layers = [];
        this.initialized = false;

        // Expose properties
        this.exposeProperty("layerCount", "number", this.layerCount, {
            description: "Number of parallax layers",
            min: 2,
            max: 10,
            step: 1,
            style: { label: "Layer Count", slider: true },
            onChange: (val) => {
                this.layerCount = val;
                this.initialized = false;
            }
        });
        this.exposeProperty("hillsPerLayer", "number", this.hillsPerLayer, {
            description: "Hills per layer",
            min: 1,
            max: 20,
            step: 1,
            style: { label: "Hills Per Layer", slider: true },
            onChange: (val) => {
                this.hillsPerLayer = val;
                this.initialized = false;
            }
        });
        this.exposeProperty("seed", "number", this.seed, {
            description: "Random seed",
            min: 0,
            max: 100000,
            step: 1,
            style: { label: "Seed" },
            onChange: (val) => {
                this.seed = val;
                this.initialized = false;
            }
        });
        this.exposeProperty("skyColor", "color", this.skyColor, {
            description: "Sky color",
            style: { label: "Sky Color" },
            onChange: (val) => {
                this.skyColor = val;
                this.initialized = false;
            }
        });
        this.exposeProperty("horizonColor", "color", this.horizonColor, {
            description: "Horizon color",
            style: { label: "Horizon Color" },
            onChange: (val) => {
                this.horizonColor = val;
                this.initialized = false;
            }
        });
        this.exposeProperty("nearColor", "color", this.nearColor, {
            description: "Near color",
            style: { label: "Near Color" },
            onChange: (val) => {
                this.nearColor = val;
                this.initialized = false;
            }
        });
        this.exposeProperty("farColor", "color", this.farColor, {
            description: "Far color",
            style: { label: "Far Color" },
            onChange: (val) => {
                this.farColor = val;
                this.initialized = false;
            }
        });
        this.exposeProperty("parallaxStrength", "number", this.parallaxStrength, {
            description: "Parallax strength",
            min: 0,
            max: 1,
            step: 0.05,
            style: { label: "Parallax Strength", slider: true },
            onChange: (val) => {
                this.parallaxStrength = val;
                this.initialized = false;
            }   
        });
        this.exposeProperty("baseHeight", "number", this.baseHeight, {
            description: "Base height of the terrain",
            min: 0,
            max: 1000,
            step: 1,
            style: { label: "Base Height", slider: true },
            onChange: (val) => {
                this.baseHeight = val;
                this.initialized = false;
            }
        });
        this.exposeProperty("heightVariation", "number", this.heightVariation, {
            description: "Variation in height",
            min: 0,
            max: 500,
            step: 1,
            style: { label: "Height Variation", slider: true },
            onChange: (val) => {
                this.heightVariation = val;
                this.initialized = false;
            }
        });
        this.exposeProperty("smoothness", "number", this.smoothness, {
            description: "Terrain smoothness",
            min: 0,
            max: 1,
            step: 0.01,
            style: { label: "Smoothness", slider: true },
            onChange: (val) => {
                this.smoothness = val;
                this.initialized = false;
            }
        });
        this.exposeProperty("verticalOffset", "number", this.verticalOffset, {
            description: "Vertical offset",
            min: -500,
            max: 500,
            step: 1,
            style: { label: "Vertical Offset", slider: true },
            onChange: (val) => {
                this.verticalOffset = val;
                this.initialized = false;
            }
        });
    }

    style(style) {
        style.startGroup("Terrain Settings", false);

        style.exposeProperty("layerCount", "number", this.layerCount, {
            description: "Number of parallax layers",
            min: 2,
            max: 10,
            step: 1,
            style: { label: "Layer Count", slider: true },
            onChange: (val) => {
                this.layerCount = val;
                this.initialized = false;
            }
        });

        style.exposeProperty("hillsPerLayer", "number", this.hillsPerLayer, {
            description: "Hills per viewport width",
            min: 2,
            max: 20,
            step: 1,
            style: { label: "Hills Per Layer", slider: true },
            onChange: (val) => {
                this.hillsPerLayer = val;
                this.initialized = false;
            }
        });

        style.exposeProperty("seed", "number", this.seed, {
            description: "Terrain generation seed",
            min: 1,
            max: 99999,
            step: 1,
            style: { label: "Seed" },
            onChange: (val) => {
                this.seed = val;
                this.initialized = false;
            }
        });

        style.endGroup();

        style.addDivider();

        style.startGroup("Colors", false);

        style.exposeProperty("skyColor", "color", this.skyColor, {
            description: "Sky gradient top",
            style: { label: "Sky Color" },
            onChange: (val) => { this.skyColor = val; }
        });

        style.exposeProperty("horizonColor", "color", this.horizonColor, {
            description: "Sky gradient bottom",
            style: { label: "Horizon Color" },
            onChange: (val) => { this.horizonColor = val; }
        });

        style.exposeProperty("nearColor", "color", this.nearColor, {
            description: "Nearest layer color",
            style: { label: "Near Hills Color" },
            onChange: (val) => { this.nearColor = val; }
        });

        style.exposeProperty("farColor", "color", this.farColor, {
            description: "Farthest layer color",
            style: { label: "Far Mountains Color" },
            onChange: (val) => { this.farColor = val; }
        });

        style.endGroup();

        style.addDivider();

        style.startGroup("Parallax & Shape", false);

        style.exposeProperty("parallaxStrength", "number", this.parallaxStrength, {
            description: "Parallax effect intensity",
            min: 0,
            max: 1,
            step: 0.05,
            style: { label: "Parallax Strength", slider: true },
            onChange: (val) => { this.parallaxStrength = val; }
        });

        style.exposeProperty("baseHeight", "number", this.baseHeight, {
            description: "Base terrain height",
            min: 50,
            max: 500,
            step: 10,
            style: { label: "Base Height", slider: true },
            onChange: (val) => {
                this.baseHeight = val;
                this.initialized = false;
            }
        });

        style.exposeProperty("heightVariation", "number", this.heightVariation, {
            description: "Height randomness",
            min: 0,
            max: 300,
            step: 10,
            style: { label: "Height Variation", slider: true },
            onChange: (val) => {
                this.heightVariation = val;
                this.initialized = false;
            }
        });

        style.exposeProperty("smoothness", "number", this.smoothness, {
            description: "Terrain smoothness (higher = smoother)",
            min: 0.1,
            max: 1,
            step: 0.05,
            style: { label: "Smoothness", slider: true },
            onChange: (val) => {
                this.smoothness = val;
                this.initialized = false;
            }
        });

        style.exposeProperty("verticalOffset", "number", this.verticalOffset, {
            description: "Vertical position offset",
            min: -300,
            max: 300,
            step: 10,
            style: { label: "Vertical Offset", slider: true },
            onChange: (val) => { this.verticalOffset = val; }
        });

        style.endGroup();

        style.addDivider();
        style.addHelpText("Infinite parallax background with seeded generation. Change seed for different terrain.");
    }

    // Seeded random number generator
    seededRandom(seed) {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    // Perlin-like noise function
    noise(x, seed) {
        const X = Math.floor(x);
        const frac = x - X;

        const v1 = this.seededRandom(X + seed);
        const v2 = this.seededRandom(X + 1 + seed);

        // Smooth interpolation
        const t = frac * frac * (3 - 2 * frac);
        return v1 * (1 - t) + v2 * t;
    }

    // Generate height at position for a layer
    getHeight(x, layerIndex, layerSeed) {
        let height = 0;
        let amplitude = this.heightVariation;
        let frequency = this.noiseScale * (1 + layerIndex * 0.5);

        // Multiple octaves for natural terrain
        for (let i = 0; i < 3; i++) {
            height += this.noise(x * frequency, layerSeed + i * 1000) * amplitude;
            amplitude *= this.smoothness;
            frequency *= 2;
        }

        return height;
    }

    // Initialize layers
    initializeLayers() {
        this.layers = [];

        for (let i = 0; i < this.layerCount; i++) {
            const layerDepth = i / (this.layerCount - 1);
            const parallaxFactor = 1 - (layerDepth * this.parallaxStrength);

            this.layers.push({
                depth: layerDepth,
                parallaxFactor: parallaxFactor,
                seed: this.seed + i * 1234,
                baseHeight: this.baseHeight * (1 + layerDepth * 0.3),
                color: this.interpolateColor(this.nearColor, this.farColor, layerDepth)
            });
        }

        this.initialized = true;
    }

    // Interpolate between two hex colors
    interpolateColor(color1, color2, factor) {
        const c1 = this.hexToRgb(color1);
        const c2 = this.hexToRgb(color2);

        const r = Math.round(c1.r + (c2.r - c1.r) * factor);
        const g = Math.round(c1.g + (c2.g - c1.g) * factor);
        const b = Math.round(c1.b + (c2.b - c1.b) * factor);

        return `rgb(${r},${g},${b})`;
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    start() {
        this.initializeLayers();
    }

    loop(deltaTime) {
        this.gameObject.position.x = window.engine.viewport.x || 0;
        this.gameObject.position.y = window.engine.viewport.y || 0;
    }

    draw(ctx) {
        if (!this.initialized) {
            this.initializeLayers();
        }

        const viewport = window.engine.viewport;
        const viewWidth = viewport.width;
        const viewHeight = viewport.height;
        const cameraX = viewport.x;
        const cameraY = viewport.y;

        // Draw sky gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, viewHeight);
        gradient.addColorStop(0, this.skyColor);
        gradient.addColorStop(1, this.horizonColor);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, viewWidth, viewHeight);

        // Draw each layer from back to front
        for (let i = this.layerCount - 1; i >= 0; i--) {
            const layer = this.layers[i];
            this.drawLayer(ctx, layer, cameraX, cameraY, viewWidth, viewHeight);
        }
    }

    drawLayer(ctx, layer, cameraX, cameraY, viewWidth, viewHeight) {
        ctx.fillStyle = layer.color;
        ctx.strokeStyle = layer.color;
        ctx.lineWidth = 2;

        // Calculate parallax offset
        const parallaxX = cameraX * layer.parallaxFactor;

        // Calculate visible range with padding
        const hillWidth = viewWidth / this.hillsPerLayer;
        const startX = Math.floor((parallaxX - viewWidth) / hillWidth) * hillWidth;
        const endX = parallaxX + viewWidth * 2;

        // Horizon line - reversed vertical parallax by subtracting cameraY offset
        const horizonY = viewHeight - layer.baseHeight - this.verticalOffset - (cameraY * layer.parallaxFactor * 0.3);

        ctx.beginPath();

        let firstPoint = true;

        // Generate terrain points
        for (let x = startX; x < endX; x += hillWidth / this.hillPointCount) {
            const height = this.getHeight(x, layer.depth, layer.seed);
            const screenX = x - parallaxX;
            const screenY = horizonY - height;

            if (firstPoint) {
                ctx.moveTo(screenX, screenY);
                firstPoint = false;
            } else {
                ctx.lineTo(screenX, screenY);
            }
        }

        // Close the shape to fill
        ctx.lineTo(endX - parallaxX, viewHeight);
        ctx.lineTo(startX - parallaxX, viewHeight);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            layerCount: this.layerCount,
            hillsPerLayer: this.hillsPerLayer,
            seed: this.seed,
            skyColor: this.skyColor,
            horizonColor: this.horizonColor,
            nearColor: this.nearColor,
            farColor: this.farColor,
            parallaxStrength: this.parallaxStrength,
            baseHeight: this.baseHeight,
            heightVariation: this.heightVariation,
            smoothness: this.smoothness,
            verticalOffset: this.verticalOffset
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        if (!data) return;

        this.layerCount = data.layerCount || 5;
        this.hillsPerLayer = data.hillsPerLayer || 8;
        this.seed = data.seed || 12345;
        this.skyColor = data.skyColor || "#87CEEB";
        this.horizonColor = data.horizonColor || "#E0F6FF";
        this.nearColor = data.nearColor || "#2D5016";
        this.farColor = data.farColor || "#A0B0C0";
        this.parallaxStrength = data.parallaxStrength || 0.7;
        this.baseHeight = data.baseHeight || 200;
        this.heightVariation = data.heightVariation || 150;
        this.smoothness = data.smoothness || 0.6;
        this.verticalOffset = data.verticalOffset || 100;

        this.initialized = false;
    }
}

window.InfiniteParallaxBackground = InfiniteParallaxBackground;
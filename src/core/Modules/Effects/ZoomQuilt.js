/**
 * ZoomQuilt - Procedural infinitely zooming pattern generator
 * 
 * Creates an infinitely zooming fractal-like pattern that maintains
 * visual continuity throughout the zoom process.
 */
class ZoomQuilt extends Module {
    static namespace = "Effects";
    static description = "Generates an infinitely zooming procedural pattern";
    static allowMultiple = false;
    static iconClass = "fas fa-infinity";

    constructor() {
        super("ZoomQuilt");

        // Core zoom properties
        this.zoomSpeed = 1.0;
        this.zoomDirection = 1; // 1 for zoom in, -1 for zoom out
        this.centerX = 0.5;
        this.centerY = 0.5;

        // Pattern properties
        this.patternType = "mandala";
        this.complexity = 8;
        this.colorScheme = "rainbow";
        this.patternScale = 100;
        this.rotationSpeed = 0;

        // Visual properties
        this.brightness = 1.0;
        this.contrast = 1.0;
        this.saturation = 1.0;
        this.strokeWidth = 2;

        // Animation properties
        this.pulseSpeed = 0;
        this.waveAmplitude = 0;
        this.waveFrequency = 1;

        // Performance properties
        this.renderDistance = 3;
        this.levelOfDetail = true;
        this.maxIterations = 1000;
        this.cacheEnabled = true;

        // Internal state
        this.currentZoom = 1.0;
        this.currentRotation = 0;
        this.time = 0;
        this.patternCache = new Map();
        this.frameBuffer = null;

        this.setupProperties();
    }

    /**
     * Set up properties with styling
     */
    setupProperties() {
        // Zoom Control Group
        this.exposeProperty("zoomSpeed", "number", this.zoomSpeed, {
            description: "Speed of zoom animation",
            min: 0.1,
            max: 5.0,
            step: 0.1,
            style: {
                header: "Zoom Controls",
                label: "Zoom Speed",
                slider: true
            },
            onChange: (val) => { this.zoomSpeed = val; }
        });

        this.exposeProperty("zoomDirection", "enum", this.zoomDirection, {
            description: "Direction of zoom",
            options: [
                { value: 1, label: "Zoom In" },
                { value: -1, label: "Zoom Out" },
                { value: 0, label: "Static" }
            ],
            style: {
                label: "Zoom Direction"
            },
            onChange: (val) => { this.zoomDirection = parseInt(val); }
        });

        this.exposeProperty("centerX", "number", this.centerX, {
            description: "Horizontal center point (0-1)",
            min: 0,
            max: 1,
            step: 0.01,
            style: {
                label: "Center X",
                slider: true
            },
            onChange: (val) => { this.centerX = val; }
        });

        this.exposeProperty("centerY", "number", this.centerY, {
            description: "Vertical center point (0-1)",
            min: 0,
            max: 1,
            step: 0.01,
            style: {
                label: "Center Y",
                slider: true
            },
            onChange: (val) => { this.centerY = val; }
        });

        // Pattern Properties Group
        this.exposeProperty("patternType", "enum", this.patternType, {
            description: "Type of pattern to generate",
            options: ["mandala", "spiral", "geometric", "organic", "fractal"],
            style: {
                header: "Pattern Settings",
                label: "Pattern Type"
            },
            onChange: (val) => {
                this.patternType = val;
                this.clearCache();
            }
        });

        this.exposeProperty("complexity", "number", this.complexity, {
            description: "Pattern complexity/detail level",
            min: 2,
            max: 32,
            step: 1,
            style: {
                label: "Complexity",
                slider: true
            },
            onChange: (val) => {
                this.complexity = val;
                this.clearCache();
            }
        });

        this.exposeProperty("patternScale", "number", this.patternScale, {
            description: "Base scale of pattern elements",
            min: 10,
            max: 500,
            step: 10,
            style: {
                label: "Pattern Scale",
                slider: true
            },
            onChange: (val) => { this.patternScale = val; }
        });

        this.exposeProperty("rotationSpeed", "number", this.rotationSpeed, {
            description: "Speed of pattern rotation",
            min: -2,
            max: 2,
            step: 0.1,
            style: {
                label: "Rotation Speed",
                slider: true
            },
            onChange: (val) => { this.rotationSpeed = val; }
        });

        // Visual Properties Group
        this.exposeProperty("colorScheme", "enum", this.colorScheme, {
            description: "Color scheme for the pattern",
            options: ["rainbow", "monochrome", "warm", "cool", "neon", "pastel"],
            style: {
                header: "Visual Settings",
                label: "Color Scheme"
            },
            onChange: (val) => {
                this.colorScheme = val;
                this.clearCache();
            }
        });

        this.exposeProperty("brightness", "number", this.brightness, {
            description: "Overall brightness",
            min: 0.1,
            max: 2.0,
            step: 0.1,
            style: {
                label: "Brightness",
                slider: true
            },
            onChange: (val) => { this.brightness = val; }
        });

        this.exposeProperty("contrast", "number", this.contrast, {
            description: "Pattern contrast",
            min: 0.1,
            max: 3.0,
            step: 0.1,
            style: {
                label: "Contrast",
                slider: true
            },
            onChange: (val) => { this.contrast = val; }
        });

        this.exposeProperty("saturation", "number", this.saturation, {
            description: "Color saturation",
            min: 0,
            max: 2.0,
            step: 0.1,
            style: {
                label: "Saturation",
                slider: true
            },
            onChange: (val) => { this.saturation = val; }
        });

        this.exposeProperty("strokeWidth", "number", this.strokeWidth, {
            description: "Line thickness",
            min: 0.5,
            max: 10,
            step: 0.5,
            style: {
                label: "Stroke Width",
                slider: true
            },
            onChange: (val) => { this.strokeWidth = val; }
        });

        // Animation Properties Group
        this.exposeProperty("pulseSpeed", "number", this.pulseSpeed, {
            description: "Speed of pulsing animation",
            min: 0,
            max: 5,
            step: 0.1,
            style: {
                header: "Animation",
                label: "Pulse Speed",
                slider: true
            },
            onChange: (val) => { this.pulseSpeed = val; }
        });

        this.exposeProperty("waveAmplitude", "number", this.waveAmplitude, {
            description: "Amplitude of wave distortion",
            min: 0,
            max: 50,
            step: 1,
            style: {
                label: "Wave Amplitude",
                slider: true
            },
            onChange: (val) => { this.waveAmplitude = val; }
        });

        this.exposeProperty("waveFrequency", "number", this.waveFrequency, {
            description: "Frequency of wave distortion",
            min: 0.1,
            max: 5,
            step: 0.1,
            style: {
                label: "Wave Frequency",
                slider: true
            },
            onChange: (val) => { this.waveFrequency = val; }
        });

        // Performance Properties Group
        this.exposeProperty("renderDistance", "number", this.renderDistance, {
            description: "Number of zoom levels to render",
            min: 1,
            max: 10,
            step: 1,
            style: {
                header: "Performance",
                label: "Render Distance",
                slider: true
            },
            onChange: (val) => { this.renderDistance = val; }
        });

        this.exposeProperty("levelOfDetail", "boolean", this.levelOfDetail, {
            description: "Use level of detail optimization",
            style: {
                label: "Level of Detail"
            },
            onChange: (val) => { this.levelOfDetail = val; }
        });

        this.exposeProperty("maxIterations", "number", this.maxIterations, {
            description: "Maximum iterations for complex patterns",
            min: 100,
            max: 5000,
            step: 100,
            style: {
                label: "Max Iterations",
                slider: true
            },
            onChange: (val) => { this.maxIterations = val; }
        });

        this.exposeProperty("cacheEnabled", "boolean", this.cacheEnabled, {
            description: "Enable pattern caching for performance",
            style: {
                label: "Enable Caching"
            },
            onChange: (val) => {
                this.cacheEnabled = val;
                if (!val) this.clearCache();
            }
        });
    }

    /**
     * Enhanced inspector styling using Style helper
     */
    style(style) {
        /// Zoom Controls Group
        style.startGroup("Zoom Controls", false, {
            backgroundColor: 'rgba(64, 128, 255, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("zoomSpeed", "number", this.zoomSpeed, {
            description: "Speed of zoom animation",
            min: 0.1,
            max: 5.0,
            step: 0.1,
            style: { label: "Zoom Speed", slider: true },
            onChange: (val) => { this.zoomSpeed = val; }
        });

        style.exposeProperty("zoomDirection", "enum", this.zoomDirection, {
            description: "Direction of zoom",
            options: [
                { value: 1, label: "Zoom In" },
                { value: -1, label: "Zoom Out" },
                { value: 0, label: "Static" }
            ],
            style: { label: "Zoom Direction" },
            onChange: (val) => { this.zoomDirection = parseInt(val); }
        });

        style.exposeProperty("centerX", "number", this.centerX, {
            min: 0, max: 1, step: 0.01,
            style: { label: "Center X", slider: true },
            onChange: (val) => { this.centerX = val; }
        });
        style.exposeProperty("centerY", "number", this.centerY, {
            min: 0, max: 1, step: 0.01,
            style: { label: "Center Y", slider: true },
            onChange: (val) => { this.centerY = val; }
        });

        style.endGroup();

        // Pattern Settings Group
        style.startGroup("Pattern Settings", false, {
            backgroundColor: 'rgba(255, 128, 64, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("patternType", "enum", this.patternType, {
            options: ["mandala", "spiral", "geometric", "organic", "fractal"],
            style: { label: "Pattern Type" },
            onChange: (val) => {
                this.patternType = val;
                this.clearCache();
            }
        });

        style.exposeProperty("complexity", "number", this.complexity, {
            min: 2, max: 32, step: 1,
            style: { label: "Complexity", slider: true },
            onChange: (val) => {
                this.complexity = val;
                this.clearCache();
            }
        });
        style.exposeProperty("patternScale", "number", this.patternScale, {
            min: 10, max: 500, step: 10,
            style: { label: "Scale", slider: true },
            onChange: (val) => { this.patternScale = val; }
        });

        style.exposeProperty("rotationSpeed", "number", this.rotationSpeed, {
            min: -2, max: 2, step: 0.1,
            style: { label: "Rotation Speed", slider: true },
            onChange: (val) => { this.rotationSpeed = val; }
        });

        style.endGroup();

        // Visual Settings Group
        style.startGroup("Visual Settings", false, {
            backgroundColor: 'rgba(128, 255, 128, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("colorScheme", "enum", this.colorScheme, {
            options: ["rainbow", "monochrome", "warm", "cool", "neon", "pastel"],
            style: { label: "Color Scheme" },
            onChange: (val) => {
                this.colorScheme = val;
                this.clearCache();
            }
        });

        style.exposeProperty("brightness", "number", this.brightness, {
            min: 0.1, max: 2.0, step: 0.1,
            style: { label: "Brightness", slider: true },
            onChange: (val) => { this.brightness = val; }
        });
        style.exposeProperty("contrast", "number", this.contrast, {
            min: 0.1, max: 3.0, step: 0.1,
            style: { label: "Contrast", slider: true },
            onChange: (val) => { this.contrast = val; }
        });

        style.exposeProperty("saturation", "number", this.saturation, {
            min: 0, max: 2.0, step: 0.1,
            style: { label: "Saturation", slider: true },
            onChange: (val) => { this.saturation = val; }
        });
        style.exposeProperty("strokeWidth", "number", this.strokeWidth, {
            min: 0.5, max: 10, step: 0.5,
            style: { label: "Stroke Width", slider: true },
            onChange: (val) => { this.strokeWidth = val; }
        });

        style.endGroup();

        // Animation Group
        style.startGroup("Animation", true, {
            backgroundColor: 'rgba(255, 128, 255, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("pulseSpeed", "number", this.pulseSpeed, {
            min: 0, max: 5, step: 0.1,
            style: { label: "Pulse Speed", slider: true },
            onChange: (val) => { this.pulseSpeed = val; }
        });

        style.exposeProperty("waveAmplitude", "number", this.waveAmplitude, {
            min: 0, max: 50, step: 1,
            style: { label: "Wave Amplitude", slider: true },
            onChange: (val) => { this.waveAmplitude = val; }
        });
        style.exposeProperty("waveFrequency", "number", this.waveFrequency, {
            min: 0.1, max: 5, step: 0.1,
            style: { label: "Wave Frequency", slider: true },
            onChange: (val) => { this.waveFrequency = val; }
        });

        style.endGroup();

        // Performance Group
        style.startGroup("Performance", true, {
            backgroundColor: 'rgba(255, 255, 128, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.addHelpText("Adjust these settings to optimize performance");

        style.exposeProperty("renderDistance", "number", this.renderDistance, {
            min: 1, max: 10, step: 1,
            style: { label: "Render Distance", slider: true },
            onChange: (val) => { this.renderDistance = val; }
        });
        style.exposeProperty("maxIterations", "number", this.maxIterations, {
            min: 100, max: 5000, step: 100,
            style: { label: "Max Iterations", slider: true },
            onChange: (val) => { this.maxIterations = val; }
        });

        style.exposeProperty("levelOfDetail", "boolean", this.levelOfDetail, {
            style: { label: "Level of Detail" },
            onChange: (val) => { this.levelOfDetail = val; }
        });
        style.exposeProperty("cacheEnabled", "boolean", this.cacheEnabled, {
            style: { label: "Enable Caching" },
            onChange: (val) => {
                this.cacheEnabled = val;
                if (!val) this.clearCache();
            }
        });

        style.endGroup();

        style.addSpace(10);

        style.addButton("Clear Cache", () => this.clearCache(), {
            secondary: true,
            tooltip: "Clear pattern cache to force regeneration"
        });

        style.addButton("Reset to Defaults", () => this.resetToDefaults(), {
            primary: true,
            fullWidth: true,
            tooltip: "Reset all properties to default values"
        });
    }

    /**
     * Initialize the module
     */
    start() {
        this.initializeFrameBuffer();
    }

    /**
     * Main update loop
     */
    loop(deltaTime) {
        this.time += deltaTime;

        // Update zoom level
        if (this.zoomDirection !== 0) {
            this.currentZoom *= Math.pow(2, this.zoomSpeed * this.zoomDirection * deltaTime);

            // Wrap zoom to maintain infinite effect
            if (this.currentZoom > 4) {
                this.currentZoom /= 4;
            } else if (this.currentZoom < 0.25) {
                this.currentZoom *= 4;
            }
        }

        // Update rotation
        this.currentRotation += this.rotationSpeed * deltaTime * 180 / Math.PI;
    }

    /**
     * Render the zoom quilt
     */
    draw(ctx) {
        const viewport = window.engine?.viewport;
        if (!viewport) return;

        // Get rendering area
        const width = this.gameObject.size.x || viewport.width;
        const height = this.gameObject.size.y || viewport.height;
        const x = this.gameObject.position.x - width * this.gameObject.origin.x;
        const y = this.gameObject.position.y - height * this.gameObject.origin.y;

        // Save context state
        ctx.save();

        // Set clipping region
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.clip();

        // Apply visual filters
        this.applyVisualFilters(ctx);

        // Render multiple zoom levels for seamless transition
        for (let level = 0; level < this.renderDistance; level++) {
            const levelZoom = this.currentZoom * Math.pow(4, level);
            const alpha = this.calculateLevelAlpha(level);

            if (alpha > 0.01) {
                ctx.globalAlpha = alpha;
                this.renderPatternLevel(ctx, x, y, width, height, levelZoom, level);
            }
        }

        ctx.restore();
    }

    /**
     * Render a single zoom level of the pattern
     */
    renderPatternLevel(ctx, x, y, width, height, zoom, level) {
        const centerX = x + width * this.centerX;
        const centerY = y + height * this.centerY;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(this.currentRotation * Math.PI / 180);
        ctx.scale(zoom, zoom);

        // Add wave distortion if enabled
        if (this.waveAmplitude > 0) {
            const waveOffset = Math.sin(this.time * this.waveFrequency) * this.waveAmplitude;
            ctx.translate(waveOffset, 0);
        }

        // Add pulse effect if enabled
        let pulseScale = 1;
        if (this.pulseSpeed > 0) {
            pulseScale = 1 + 0.1 * Math.sin(this.time * this.pulseSpeed);
            ctx.scale(pulseScale, pulseScale);
        }

        // Render the pattern based on type
        switch (this.patternType) {
            case "mandala":
                this.renderMandala(ctx, level);
                break;
            case "spiral":
                this.renderSpiral(ctx, level);
                break;
            case "geometric":
                this.renderGeometric(ctx, level);
                break;
            case "organic":
                this.renderOrganic(ctx, level);
                break;
            case "fractal":
                this.renderFractal(ctx, level);
                break;
        }

        ctx.restore();
    }

    /**
     * Render mandala pattern
     */
    renderMandala(ctx, level) {
        const iterations = this.levelOfDetail ? Math.max(this.complexity / (level + 1), 4) : this.complexity;
        const scale = this.patternScale;

        for (let i = 0; i < iterations; i++) {
            const angle = (i / iterations) * Math.PI * 2;
            const radius = scale * (0.5 + 0.5 * Math.sin(i * 0.5 + this.time));

            ctx.save();
            ctx.rotate(angle);

            // Draw radial elements
            for (let r = scale * 0.2; r < scale * 2; r += scale * 0.3) {
                const color = this.getColor(i / iterations, r / scale, level);
                ctx.strokeStyle = color;
                ctx.lineWidth = this.strokeWidth;

                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.stroke();

                // Add decorative elements
                const petals = Math.floor(iterations / 2);
                for (let p = 0; p < petals; p++) {
                    const petalAngle = (p / petals) * Math.PI * 2;
                    const px = Math.cos(petalAngle) * r;
                    const py = Math.sin(petalAngle) * r;

                    ctx.beginPath();
                    ctx.arc(px, py, scale * 0.1, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }

            ctx.restore();
        }
    }

    /**
     * Render spiral pattern
     */
    renderSpiral(ctx, level) {
        const iterations = this.levelOfDetail ? Math.max(this.maxIterations / (level + 1), 100) : this.maxIterations;
        const scale = this.patternScale;

        ctx.lineWidth = this.strokeWidth;
        ctx.beginPath();

        for (let i = 0; i < iterations; i++) {
            const t = i / iterations;
            const angle = t * Math.PI * 2 * this.complexity;
            const radius = scale * t * 2;

            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            // Change color along the spiral
            if (i % 50 === 0) {
                ctx.strokeStyle = this.getColor(t, radius / scale, level);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x, y);
            }
        }

        ctx.stroke();
    }

    /**
     * Render geometric pattern
     */
    renderGeometric(ctx, level) {
        const iterations = this.levelOfDetail ? Math.max(this.complexity / (level + 1), 3) : this.complexity;
        const scale = this.patternScale;

        for (let i = 0; i < iterations; i++) {
            const size = scale * (0.5 + i * 0.2);
            const sides = 3 + i % 6;
            const rotation = (i * 360 / iterations) * Math.PI / 180;

            ctx.save();
            ctx.rotate(rotation);
            ctx.strokeStyle = this.getColor(i / iterations, size / scale, level);
            ctx.lineWidth = this.strokeWidth;

            // Draw polygon
            ctx.beginPath();
            for (let s = 0; s < sides; s++) {
                const angle = (s / sides) * Math.PI * 2;
                const x = Math.cos(angle) * size;
                const y = Math.sin(angle) * size;

                if (s === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.stroke();

            ctx.restore();
        }
    }

    /**
     * Render organic pattern
     */
    renderOrganic(ctx, level) {
        const iterations = this.levelOfDetail ? Math.max(this.complexity / (level + 1), 4) : this.complexity;
        const scale = this.patternScale;

        for (let i = 0; i < iterations; i++) {
            const baseRadius = scale * (0.3 + i * 0.1);
            const segments = 20;

            ctx.strokeStyle = this.getColor(i / iterations, baseRadius / scale, level);
            ctx.lineWidth = this.strokeWidth;
            ctx.beginPath();

            for (let s = 0; s <= segments; s++) {
                const angle = (s / segments) * Math.PI * 2;
                const noise1 = Math.sin(angle * 3 + this.time + i) * 0.3;
                const noise2 = Math.sin(angle * 7 + this.time * 0.5 + i * 2) * 0.2;
                const radius = baseRadius * (1 + noise1 + noise2);

                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                if (s === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            ctx.closePath();
            ctx.stroke();
        }
    }

    /**
     * Render fractal pattern
     */
    renderFractal(ctx, level) {
        const maxDepth = this.levelOfDetail ? Math.max(6 - level, 3) : 6;
        const scale = this.patternScale;

        this.drawFractalBranch(ctx, 0, 0, scale, 0, maxDepth, level);
    }

    /**
     * Draw recursive fractal branch
     */
    drawFractalBranch(ctx, x, y, length, angle, depth, level) {
        if (depth <= 0 || length < 2) return;

        const endX = x + Math.cos(angle) * length;
        const endY = y + Math.sin(angle) * length;

        ctx.strokeStyle = this.getColor(depth / 6, length / this.patternScale, level);
        ctx.lineWidth = this.strokeWidth * (depth / 6);

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Recursive branches
        const branchAngle = Math.PI / 4;
        const lengthRatio = 0.7;

        this.drawFractalBranch(ctx, endX, endY, length * lengthRatio, angle - branchAngle, depth - 1, level);
        this.drawFractalBranch(ctx, endX, endY, length * lengthRatio, angle + branchAngle, depth - 1, level);
    }

    /**
     * Get color based on pattern parameters
     */
    getColor(t, intensity, level) {
        let hue, saturation, lightness;

        switch (this.colorScheme) {
            case "rainbow":
                hue = (t * 360 + this.time * 30) % 360;
                saturation = 70 * this.saturation;
                lightness = (30 + intensity * 40) * this.brightness;
                break;

            case "monochrome":
                hue = 0;
                saturation = 0;
                lightness = (intensity * 60 + 20) * this.brightness;
                break;

            case "warm":
                hue = (t * 60 + 320) % 360;
                saturation = 80 * this.saturation;
                lightness = (30 + intensity * 40) * this.brightness;
                break;

            case "cool":
                hue = (t * 120 + 180) % 360;
                saturation = 70 * this.saturation;
                lightness = (30 + intensity * 40) * this.brightness;
                break;

            case "neon":
                hue = (t * 360 + this.time * 60) % 360;
                saturation = 100 * this.saturation;
                lightness = (60 + intensity * 30) * this.brightness;
                break;

            case "pastel":
                hue = (t * 360 + this.time * 20) % 360;
                saturation = 40 * this.saturation;
                lightness = (70 + intensity * 20) * this.brightness;
                break;

            default:
                hue = t * 360;
                saturation = 70 * this.saturation;
                lightness = intensity * 50 * this.brightness;
        }

        // Apply contrast
        lightness = Math.pow(lightness / 100, this.contrast) * 100;

        // Fade distant levels
        const alpha = this.calculateLevelAlpha(level);

        return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
    }

    /**
     * Calculate alpha for zoom level
     */
    calculateLevelAlpha(level) {
        const fadeStart = this.renderDistance - 2;
        if (level < fadeStart) {
            return 1.0;
        } else {
            return Math.max(0, 1 - (level - fadeStart) / 2);
        }
    }

    /**
     * Apply visual filters to context
     */
    applyVisualFilters(ctx) {
        // Apply brightness, contrast, and saturation via filter if supported
        if (ctx.filter !== undefined) {
            ctx.filter = `brightness(${this.brightness}) contrast(${this.contrast}) saturate(${this.saturation})`;
        }
    }

    /**
     * Initialize frame buffer for caching
     */
    initializeFrameBuffer() {
        if (!this.cacheEnabled) return;

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        this.frameBuffer = canvas.getContext('2d');
    }

    /**
     * Clear pattern cache
     */
    clearCache() {
        this.patternCache.clear();
    }

    /**
     * Reset all properties to defaults
     */
    resetToDefaults() {
        this.zoomSpeed = 1.0;
        this.zoomDirection = 1;
        this.centerX = 0.5;
        this.centerY = 0.5;
        this.patternType = "mandala";
        this.complexity = 8;
        this.colorScheme = "rainbow";
        this.patternScale = 100;
        this.rotationSpeed = 0;
        this.brightness = 1.0;
        this.contrast = 1.0;
        this.saturation = 1.0;
        this.strokeWidth = 2;
        this.pulseSpeed = 0;
        this.waveAmplitude = 0;
        this.waveFrequency = 1;
        this.renderDistance = 3;
        this.levelOfDetail = true;
        this.maxIterations = 1000;
        this.cacheEnabled = true;

        this.clearCache();

        // Refresh inspector if available
        if (window.editor && window.editor.inspector) {
            window.editor.inspector.refreshModuleUI(this);
        }
    }

    /**
     * Serialize module state
     */
    toJSON() {
        return {
            zoomSpeed: this.zoomSpeed,
            zoomDirection: this.zoomDirection,
            centerX: this.centerX,
            centerY: this.centerY,
            patternType: this.patternType,
            complexity: this.complexity,
            colorScheme: this.colorScheme,
            patternScale: this.patternScale,
            rotationSpeed: this.rotationSpeed,
            brightness: this.brightness,
            contrast: this.contrast,
            saturation: this.saturation,
            strokeWidth: this.strokeWidth,
            pulseSpeed: this.pulseSpeed,
            waveAmplitude: this.waveAmplitude,
            waveFrequency: this.waveFrequency,
            renderDistance: this.renderDistance,
            levelOfDetail: this.levelOfDetail,
            maxIterations: this.maxIterations,
            cacheEnabled: this.cacheEnabled
        };
    }

    /**
     * Deserialize module state
     */
    fromJSON(data) {
        this.zoomSpeed = data.zoomSpeed || 1.0;
        this.zoomDirection = data.zoomDirection || 1;
        this.centerX = data.centerX || 0.5;
        this.centerY = data.centerY || 0.5;
        this.patternType = data.patternType || "mandala";
        this.complexity = data.complexity || 8;
        this.colorScheme = data.colorScheme || "rainbow";
        this.patternScale = data.patternScale || 100;
        this.rotationSpeed = data.rotationSpeed || 0;
        this.brightness = data.brightness || 1.0;
        this.contrast = data.contrast || 1.0;
        this.saturation = data.saturation || 1.0;
        this.strokeWidth = data.strokeWidth || 2;
        this.pulseSpeed = data.pulseSpeed || 0;
        this.waveAmplitude = data.waveAmplitude || 0;
        this.waveFrequency = data.waveFrequency || 1;
        this.renderDistance = data.renderDistance || 3;
        this.levelOfDetail = data.levelOfDetail !== undefined ? data.levelOfDetail : true;
        this.maxIterations = data.maxIterations || 1000;
        this.cacheEnabled = data.cacheEnabled !== undefined ? data.cacheEnabled : true;
    }
}

// Register module globally
window.ZoomQuilt = ZoomQuilt;
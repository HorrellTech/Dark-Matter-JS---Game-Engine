class DrawPlatformerHills extends Module {
    static namespace = "Drawing";
    static description = "Generates layered procedural hills with spline curves, parallax effect, and infinite horizontal generation";
    static allowMultiple = false;

    constructor() {
        super("DrawPlatformerHills");

        this.backgroundColor = "#87CEEB"; // Sky blue
        this.hillColor = "#228B22"; // Base hill color (will be dark)
        this.hillLayers = 3; // Number of hill layers
        this.pointCount = 8; // Number of control points per hill segment
        this.hillStyle = "rounded"; // Curve style: "rounded" or "pointy"
        this.minHeight = 0.3; // Minimum hill height (0-1)
        this.maxHeight = 0.7; // Maximum hill height (0-1)
        this.seed = 42; // Random seed for generation
        this.imageHeight = 600; // Height of generated image
        this.parallaxStrength = 0.5; // Parallax effect strength (0-1)
        this.segmentWidth = 800; // Width of each hill segment for generation

        this.exposeProperty("imageHeight", "number", this.imageHeight, {
            description: "Height of the generated hill image",
            min: 100, max: 2000,
            step: 1,
            onChange: (val) => {
                this.imageHeight = val;
                this.clearCache();
            }
        });

        // Background and hill colors
        this.exposeProperty("backgroundColor", "color", "#87CEEB", {
            description: "Sky background color",
            onChange: (val) => {
                this.backgroundColor = val;
                this.clearCache();
            }
        });

        this.exposeProperty("hillColor", "color", "#228B22", {
            description: "Base hill color (layers get darker automatically)",
            onChange: (val) => {
                this.hillColor = val;
                this.clearCache();
            }
        });

        // Hill generation settings
        this.exposeProperty("hillLayers", "number", 3, {
            description: "Number of hill layers",
            min: 1, max: 8,
            onChange: (val) => {
                this.hillLayers = val;
                this.clearCache();
            }
        });

        this.exposeProperty("pointCount", "number", 8, {
            description: "Number of control points per hill segment",
            min: 4, max: 20,
            onChange: (val) => {
                this.pointCount = val;
                this.clearCache();
            }
        });

        this.exposeProperty("hillStyle", "enum", "rounded", {
            description: "Hill curve style",
            options: ["rounded", "pointy"],
            onChange: (val) => {
                this.hillStyle = val;
                this.clearCache();
            }
        });

        this.exposeProperty("minHeight", "number", 0.3, {
            description: "Minimum hill height (0-1)",
            min: 0.1, max: 0.8,
            onChange: (val) => {
                this.minHeight = val;
                this.clearCache();
            }
        });

        this.exposeProperty("maxHeight", "number", 0.7, {
            description: "Maximum hill height (0-1)",
            min: 0.2, max: 1.0,
            onChange: (val) => {
                this.maxHeight = val;
                this.clearCache();
            }
        });

        this.exposeProperty("parallaxStrength", "number", 0.5, {
            description: "Parallax effect strength (0 = no parallax, 1 = full parallax)",
            min: 0, max: 1,
            step: 0.1,
            onChange: (val) => {
                this.parallaxStrength = val;
            }
        });

        this.exposeProperty("segmentWidth", "number", 800, {
            description: "Width of each hill segment",
            min: 200, max: 2000,
            step: 50,
            onChange: (val) => {
                this.segmentWidth = val;
                this.clearCache();
            }
        });

        this.exposeProperty("seed", "number", 42, {
            description: "Random seed for generation",
            min: 1, max: 10000,
            onChange: (val) => {
                this.seed = val;
                this.clearCache();
            }
        });

        // Cache for generated hill segments
        this.hillCache = new Map();
        this.lastViewportBounds = null;
    }

    // Simple seeded random number generator
    seededRandom(seed) {
        let x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    // Generate random number between min and max using seed
    randomRange(min, max, seed) {
        return min + (max - min) * this.seededRandom(seed);
    }

    // Convert hex color to RGB values
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    // Darken color by percentage
    darkenColor(hex, percent) {
        const rgb = this.hexToRgb(hex);
        const factor = 1 - percent;
        return `rgb(${Math.floor(rgb.r * factor)}, ${Math.floor(rgb.g * factor)}, ${Math.floor(rgb.b * factor)})`;
    }

    // Clear the hill cache when properties change
    clearCache() {
        this.hillCache.clear();
    }

    // Generate control points for a hill segment
    generateHillPoints(segmentIndex, layer) {
        const points = [];
        const heightVariance = (this.maxHeight - this.minHeight) * this.imageHeight;
        const baseHeight = this.minHeight * this.imageHeight;

        // Generate points across the segment width
        for (let i = 0; i <= this.pointCount; i++) {
            const x = (i / this.pointCount) * this.segmentWidth;
            const seedValue = this.seed + segmentIndex * 10000 + i * 100 + layer * 1000;
            const y = this.imageHeight - (baseHeight + this.randomRange(0, heightVariance, seedValue));
            points.push({ x, y });
        }

        return points;
    }

    // Get or generate hill segment for a specific layer and segment index
    getHillSegment(segmentIndex, layer) {
        const cacheKey = `${segmentIndex}_${layer}`;
        
        if (!this.hillCache.has(cacheKey)) {
            const points = this.generateHillPoints(segmentIndex, layer);
            this.hillCache.set(cacheKey, points);
        }
        
        return this.hillCache.get(cacheKey);
    }

    // Draw spline curve through points
    drawSpline(ctx, points, style, offsetX, offsetY) {
        if (points.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(points[0].x + offsetX, points[0].y + offsetY);

        if (style === "rounded") {
            // Use midpoints for smooth quadratic curves
            for (let i = 1; i < points.length - 1; i++) {
                const prev = points[i - 1];
                const curr = points[i];
                const next = points[i + 1];
                const mx = (curr.x + next.x) / 2;
                const my = (curr.y + next.y) / 2;
                ctx.quadraticCurveTo(curr.x + offsetX, curr.y + offsetY, mx + offsetX, my + offsetY);
            }
            // Last segment: curve to the last point
            const last = points[points.length - 1];
            ctx.quadraticCurveTo(last.x + offsetX, last.y + offsetY, last.x + offsetX, last.y + offsetY);
        } else {
            // Pointy/angular hills
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x + offsetX, points[i].y + offsetY);
            }
        }

        // Close the shape to bottom of viewport
        const lastPoint = points[points.length - 1];
        const viewportBottom = (ctx.viewportY || 0) + ctx.canvas.height;
        ctx.lineTo(lastPoint.x + offsetX, viewportBottom);
        ctx.lineTo(offsetX, viewportBottom);
        ctx.closePath();
        ctx.fill();
    }

    // Calculate viewport bounds for optimization
    getViewportBounds(ctx) {
        const viewportX = ctx.viewportX || 0;
        const viewportY = ctx.viewportY || 0;
        const viewportWidth = ctx.canvas.width;
        const viewportHeight = ctx.canvas.height;

        return {
            left: viewportX,
            right: viewportX + viewportWidth,
            top: viewportY,
            bottom: viewportY + viewportHeight
        };
    }

    start() {
        // Initialize cache
        this.hillCache.clear();
    }

    draw(ctx) {
        const viewportBounds = this.getViewportBounds(ctx);
        const viewportX = ctx.viewportX || 0;
        const viewportY = ctx.viewportY || 0;

        // Draw background
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(viewportBounds.left, viewportBounds.top, ctx.canvas.width, ctx.canvas.height);

        // Generate hill layers from back to front
        for (let layer = this.hillLayers - 1; layer >= 0; layer--) {
            const darkenPercent = (layer / (this.hillLayers - 1)) * 0.4;
            const layerColor = this.darkenColor(this.hillColor, darkenPercent);
            ctx.fillStyle = layerColor;

            // Calculate parallax offset for this layer
            const parallaxFactor = 1 - (layer / (this.hillLayers - 1)) * this.parallaxStrength;
            const parallaxOffsetX = viewportX * (1 - parallaxFactor);

            // Calculate which segments are visible for this layer
            const effectiveViewportLeft = viewportBounds.left - parallaxOffsetX;
            const effectiveViewportRight = viewportBounds.right - parallaxOffsetX;

            const startSegment = Math.floor(effectiveViewportLeft / this.segmentWidth);
            const endSegment = Math.ceil(effectiveViewportRight / this.segmentWidth);

            // Draw visible segments
            for (let segmentIndex = startSegment; segmentIndex <= endSegment; segmentIndex++) {
                const points = this.getHillSegment(segmentIndex, layer);
                const segmentOffsetX = segmentIndex * this.segmentWidth + parallaxOffsetX;
                const layerOffsetY = layer * 20; // Vertical offset between layers

                this.drawSpline(ctx, points, this.hillStyle, segmentOffsetX, layerOffsetY);
            }
        }
    }

    drawGizmos(ctx) {
        const viewportBounds = this.getViewportBounds(ctx);
        
        // Draw viewport bounds for debugging
        ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
        ctx.strokeRect(viewportBounds.left, viewportBounds.top, ctx.canvas.width, ctx.canvas.height);
        
        // Draw segment boundaries
        ctx.strokeStyle = "rgba(0, 255, 0, 0.3)";
        const startSegment = Math.floor(viewportBounds.left / this.segmentWidth);
        const endSegment = Math.ceil(viewportBounds.right / this.segmentWidth);
        
        for (let i = startSegment; i <= endSegment + 1; i++) {
            const x = i * this.segmentWidth;
            ctx.beginPath();
            ctx.moveTo(x, viewportBounds.top);
            ctx.lineTo(x, viewportBounds.bottom);
            ctx.stroke();
        }
    }

    // Regenerate hills when properties change
    onPropertyChanged(propertyName) {
        this.clearCache();
    }
}

window.DrawPlatformerHills = DrawPlatformerHills;
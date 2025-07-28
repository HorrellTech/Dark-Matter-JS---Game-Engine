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
        this.seed = Math.random() * 1000; // Random seed for generation
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

    style(styleHelper) {
        styleHelper
            .addHeader("Platformer Hills Settings", "hills-header")
            .startGroup("Image", false, { color: "#0078D7" })
            .exposeProperty("imageHeight", "number", this.imageHeight, { label: "Image Height" })
            .endGroup()
            .startGroup("Colors", false)
            .exposeProperty("backgroundColor", "color", this.backgroundColor, { label: "Background Color" })
            .exposeProperty("hillColor", "color", this.hillColor, { label: "Hill Color" })
            .endGroup()
            .startGroup("Hill Generation", false)
            .exposeProperty("hillLayers", "number", this.hillLayers, { label: "Hill Layers" })
            .exposeProperty("pointCount", "number", this.pointCount, { label: "Points Per Hill" })
            .exposeProperty("hillStyle", "enum", this.hillStyle, { label: "Hill Style", options: ["rounded", "pointy"] })
            .exposeProperty("minHeight", "number", this.minHeight, { label: "Min Hill Height" })
            .exposeProperty("maxHeight", "number", this.maxHeight, { label: "Max Hill Height" })
            .exposeProperty("segmentWidth", "number", this.segmentWidth, { label: "Segment Width" })
            .exposeProperty("seed", "number", this.seed, { label: "Random Seed" })
            .endGroup()
            .startGroup("Parallax", false)
            .exposeProperty("parallaxStrength", "number", this.parallaxStrength, { label: "Parallax Strength" })
            .endGroup();
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

    // Generate height at a specific global x position for seamless tiling
    getHeightAtPosition(globalX, layer) {
        const heightVariance = (this.maxHeight - this.minHeight) * this.imageHeight;
        const baseHeight = this.minHeight * this.imageHeight;
        
        // Use a continuous noise-like function based on global position
        const frequency = 0.005; // Controls hill frequency
        const seedValue = this.seed + layer * 1000;
        const noiseInput = globalX * frequency + seedValue;
        
        // Create smooth transitions using sine waves with different frequencies
        const noise1 = Math.sin(noiseInput) * 0.5;
        const noise2 = Math.sin(noiseInput * 2.3 + seedValue) * 0.3;
        const noise3 = Math.sin(noiseInput * 0.7 + seedValue * 2) * 0.2;
        const combinedNoise = (noise1 + noise2 + noise3) * 0.5 + 0.5; // Normalize to 0-1
        
        return this.imageHeight - (baseHeight + combinedNoise * heightVariance);
    }

    // Generate control points for a hill segment with seamless connections
    generateHillPoints(segmentIndex, layer) {
        const points = [];
        const segmentStartX = segmentIndex * this.segmentWidth;

        // Generate points across the segment width
        for (let i = 0; i <= this.pointCount; i++) {
            const localX = (i / this.pointCount) * this.segmentWidth;
            const globalX = segmentStartX + localX;
            const y = this.getHeightAtPosition(globalX, layer);
            points.push({ x: localX, y: y });
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

    // Draw spline curve through points with seamless segment connections
    drawConnectedSegments(ctx, segments, style, offsetX, offsetY, viewportBounds) {
        if (segments.length === 0) return;

        ctx.beginPath();
        
        let allPoints = [];
        
        // Combine all segment points into one continuous path
        for (let segIdx = 0; segIdx < segments.length; segIdx++) {
            const segment = segments[segIdx];
            const segmentOffsetX = segment.segmentIndex * this.segmentWidth;
            
            for (let i = 0; i < segment.points.length; i++) {
                // Skip the first point of subsequent segments to avoid duplicates
                if (segIdx > 0 && i === 0) continue;
                
                const point = segment.points[i];
                allPoints.push({
                    x: point.x + segmentOffsetX + offsetX,
                    y: point.y + offsetY
                });
            }
        }

        if (allPoints.length < 2) return;

        // Start the path
        ctx.moveTo(allPoints[0].x, allPoints[0].y);

        if (style === "rounded") {
            // Use quadratic curves for smooth hills
            for (let i = 1; i < allPoints.length - 1; i++) {
                const curr = allPoints[i];
                const next = allPoints[i + 1];
                const mx = (curr.x + next.x) / 2;
                const my = (curr.y + next.y) / 2;
                ctx.quadraticCurveTo(curr.x, curr.y, mx, my);
            }
            // Last segment
            const last = allPoints[allPoints.length - 1];
            ctx.quadraticCurveTo(last.x, last.y, last.x, last.y);
        } else {
            // Pointy/angular hills
            for (let i = 1; i < allPoints.length; i++) {
                ctx.lineTo(allPoints[i].x, allPoints[i].y);
            }
        }

        // Close the shape to bottom of viewport
        const lastPoint = allPoints[allPoints.length - 1];
        const firstPoint = allPoints[0];
        const viewportBottom = viewportBounds.bottom;
        
        ctx.lineTo(lastPoint.x, viewportBottom);
        ctx.lineTo(firstPoint.x, viewportBottom);
        ctx.closePath();
        ctx.fill();
    }

    // Calculate viewport bounds using scene viewport
    getViewportBounds() {
        const viewportX = this.gameObject?.scene?.settings?.viewportX || 0;
        const viewportY = this.gameObject?.scene?.settings?.viewportY || 0;
        const viewportWidth = this.gameObject?.scene?.settings?.width || 800;
        const viewportHeight = this.gameObject?.scene?.settings?.height || 600;

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
        const viewportBounds = this.getViewportBounds();
        const viewportX = this.gameObject?.scene?.settings?.viewportX || 0;
        const viewportY = this.gameObject?.scene?.settings?.viewportY || 0;

        // Draw background
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(viewportBounds.left, viewportBounds.top, 
                    viewportBounds.right - viewportBounds.left, 
                    viewportBounds.bottom - viewportBounds.top);

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

            // Collect all visible segments for this layer
            const segments = [];
            for (let segmentIndex = startSegment; segmentIndex <= endSegment; segmentIndex++) {
                const points = this.getHillSegment(segmentIndex, layer);
                segments.push({
                    segmentIndex: segmentIndex,
                    points: points
                });
            }

            // Draw all segments as one connected path
            const layerOffsetY = layer * 20; // Vertical offset between layers
            this.drawConnectedSegments(ctx, segments, this.hillStyle, parallaxOffsetX, layerOffsetY, viewportBounds);
        }
    }

    drawGizmos(ctx) {
        const viewportBounds = this.getViewportBounds();
        
        // Draw viewport bounds for debugging
        ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
        ctx.strokeRect(viewportBounds.left, viewportBounds.top, 
                      viewportBounds.right - viewportBounds.left, 
                      viewportBounds.bottom - viewportBounds.top);
        
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
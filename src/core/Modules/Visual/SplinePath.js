/**
 * Spline Path Module
 * Creates curved paths with edge generation, color, and perlin texture generation
 */
class SplinePath extends Module {
    static namespace = "Visual";
    static description = "Creates curved paths with edge generation, color, and perlin texture generation";
    static allowMultiple = true;
    static iconClass = "fas fa-route";
    static color = "#FF9800";

    constructor() {
        super("SplinePath");

        // Path properties
        this.points = [
            new Vector2(0, 0),
            new Vector2(100, 50),
            new Vector2(200, -25),
            new Vector2(300, 75)
        ];

        // Path appearance
        this.pathWidth = 20;
        this.pathColor = "#8B4513";
        this.pathOpacity = 1.0;

        // Edge properties
        this.showEdges = true;
        this.edgeColor = "#654321";
        this.edgeWidth = 2;

        // Texture properties
        this.useTexture = false;
        this.textureScale = 1.0;
        this.textureOffset = new Vector2(0, 0);

        // Perlin noise properties
        this.usePerlinTexture = false;
        this.perlinScale = 0.1;
        this.perlinStrength = 10;
        this.perlinSeed = Math.random() * 1000;

        // Advanced path properties
        this.pathType = "cubic"; // "linear", "quadratic", "cubic", "catmull-rom"
        this.tension = 0.5; // For catmull-rom spline
        this.segments = 50; // Number of segments to draw

        // Animation properties
        this.animatePath = false;
        this.animationSpeed = 1.0;
        this.animationOffset = 0;

        this.viewportCulling = true;
        this.cullingPadding = 100;
        this.textureResolution = 64;
        this._lastViewport = null;
        this._visibleSegmentCache = null;

        // Gizmo properties for editor
        this.showGizmos = true;
        this.gizmoRadius = 8;
        this.selectedPointIndex = -1;
        this.draggingPointIndex = -1;
        this.isDragging = false;
        this.dragOffset = new Vector2(0, 0);

        // Arrow button properties
        this.arrowSize = 15;
        this.hoveredArrow = null; // 'start' or 'end'
        this.hoveredPoint = -1;

        this._noiseCache = null;
        this._lastNoiseFrame = -1;
        this._noiseAnimationOffset = 0;

        // Add these for canvas reuse:
        this._offscreenCanvas = null;
        this._offscreenCtx = null;

        // Performance optimizations
        this._pathCache = new Map(); // Cache for path calculations
        this._textureCache = new Map(); // Cache for texture canvases
        this._shimmerCache = new Map(); // Cache for shimmer effects
        this._lastFrameTime = 0;
        this._frameCount = 0;

        this._shimmerChunks = null;
        this._shimmerChunksDirty = true;

        this.usePerlinEdges = true;

        this.setupProperties();
    }

    setupProperties() {
        // Path properties
        this.exposeProperty("pathWidth", "number", this.pathWidth, {
            description: "Width of the path",
            min: 1, max: 100,
            onChange: (value) => {
                this.pathWidth = value;
                this.clearCaches(); // Clear caches when path properties change
            }
        });

        this.exposeProperty("pathColor", "color", this.pathColor, {
            description: "Main color of the path",
            onChange: (value) => { this.pathColor = value; }
        });

        this.exposeProperty("pathOpacity", "number", this.pathOpacity, {
            description: "Opacity of the path",
            min: 0, max: 1, step: 0.1,
            onChange: (value) => { this.pathOpacity = value; }
        });

        // Edge properties
        this.exposeProperty("showEdges", "boolean", this.showEdges, {
            description: "Show path edges",
            onChange: (value) => { this.showEdges = value; }
        });

        this.exposeProperty("edgeColor", "color", this.edgeColor, {
            description: "Color of the path edges",
            onChange: (value) => { this.edgeColor = value; }
        });

        this.exposeProperty("edgeWidth", "number", this.edgeWidth, {
            description: "Width of the path edges",
            min: 0, max: 10,
            onChange: (value) => { this.edgeWidth = value; }
        });

        // Texture properties
        /*this.exposeProperty("useTexture", "boolean", this.useTexture, {
            description: "Apply texture to the path",
            onChange: (value) => { this.useTexture = value; }
        });

        this.exposeProperty("textureScale", "number", this.textureScale, {
            description: "Scale of the texture",
            min: 0.1, max: 5, step: 0.1,
            onChange: (value) => { this.textureScale = value; }
        });

        this.exposeProperty("textureOffset", "vector2", this.textureOffset, {
            description: "Texture offset",
            onChange: (value) => { this.textureOffset = value; }
        });*/

        // Perlin texture properties
        this.exposeProperty("usePerlinTexture", "boolean", this.usePerlinTexture, {
            description: "Use perlin noise texture",
            onChange: (value) => { this.usePerlinTexture = value; }
        });

        this.exposeProperty("textureResolution", "enum", this.textureResolution, {
            description: "Texture quality (lower = faster)",
            options: [16, 32, 64, 128],
            onChange: (value) => {
                this.textureResolution = value;
                this.clearCaches();
            }
        });

        this.exposeProperty("perlinScale", "number", this.perlinScale, {
            description: "Scale of the perlin noise",
            min: 0.01, max: 1, step: 0.01,
            onChange: (value) => { this.perlinScale = value; }
        });

        this.exposeProperty("perlinStrength", "number", this.perlinStrength, {
            description: "Strength of the perlin noise effect",
            min: 0, max: 50,
            onChange: (value) => { this.perlinStrength = value; }
        });

        this.exposeProperty("textureDetail", "number", this.textureDetail || 0.3, {
            description: "Detail level of the dirt texture",
            min: 0.1, max: 2, step: 0.1,
            onChange: (value) => { this.textureDetail = value; }
        });

        this.exposeProperty("textureDarkness", "number", this.textureDarkness || 0.4, {
            description: "Darkness of the texture spots",
            min: 0, max: 1, step: 0.1,
            onChange: (value) => { this.textureDarkness = value; }
        });

        this.exposeProperty("textureDensity", "number", this.textureDensity || 0.5, {
            description: "Density of texture spots",
            min: 0, max: 1, step: 0.1,
            onChange: (value) => { this.textureDensity = value; }
        });

        // Path type
        this.exposeProperty("pathType", "enum", this.pathType, {
            description: "Type of spline interpolation",
            options: ["linear", "quadratic", "cubic", "catmull-rom"],
            onChange: (value) => { this.pathType = value; }
        });

        this.exposeProperty("tension", "number", this.tension, {
            description: "Tension for catmull-rom spline",
            min: 0, max: 1, step: 0.1,
            onChange: (value) => { this.tension = value; }
        });

        this.exposeProperty("segments", "number", this.segments, {
            description: "Number of segments for smooth curves",
            min: 10, max: 200,
            onChange: (value) => { this.segments = value; }
        });

        // Animation
        this.exposeProperty("animatePath", "boolean", this.animatePath, {
            description: "Animate the path",
            onChange: (value) => { this.animatePath = value; }
        });

        this.exposeProperty("animationSpeed", "number", this.animationSpeed, {
            description: "Animation speed",
            min: 0.1, max: 5, step: 0.1,
            onChange: (value) => {
                this.animationSpeed = value;
                this.clearCaches(); // Clear caches when animation properties change
            }
        });

        // Width variation properties
        this.exposeProperty("widthVariation", "number", this.widthVariation || 0.3, {
            description: "Strength of natural width variation along the path",
            min: 0, max: 1, step: 0.05,
            onChange: (value) => {
                this.widthVariation = value;
                this.clearCaches();
            }
        });

        this.exposeProperty("flowStrength", "number", this.flowStrength || 1.0, {
            description: "Strength of the water flow effect",
            min: 0, max: 3, step: 0.1,
            onChange: (value) => {
                this.flowStrength = value;
                this.clearCaches();
            }
        });

        // Enhanced animation properties
        this.exposeProperty("flowDirection", "vector2", this.flowDirection || new Vector2(1, 0), {
            description: "Base flow direction (can be overridden by path geometry)",
            onChange: (value) => {
                this.flowDirection = value;
                this.clearCaches();
            }
        });

        this.exposeProperty("usePerlinEdges", "boolean", this.usePerlinEdges, {
            description: "Use perlin noise for edge color",
            onChange: (value) => { this.usePerlinEdges = value; }
        });
    }

    start() {
        // Initialize animation
        this.animationOffset = 0;
    }

    loop(deltaTime) {
        if (this.animatePath) {
            const clampedDeltaTime = Math.min(deltaTime, 1 / 20);
            this.animationOffset += this.animationSpeed * clampedDeltaTime * 60;

            // Reset at a much larger value to prevent precision issues
            if (this.animationOffset > 100000) {
                this.animationOffset = 0;
            }

            // Only clear texture cache every 120 frames (~2 seconds) instead of 60 for better performance
            this._frameCount++;
            if (this._frameCount % 120 === 0) {
                // Only clear texture cache, keep path cache
                this._textureCache.clear();
                this._shimmerCache.clear();
            }
        }
    }

    /**
     * Clear all caches to free memory and ensure consistency
     */
    clearCaches() {
        this._pathCache.clear();
        this._textureCache.clear();
        this._shimmerCache.clear();
        this._lastViewport = null;
        this._visibleSegmentCache = null;
        this._shimmerChunksDirty = true;
    }

    /**
     * Add a point to the path
     * @param {Vector2} point - The point to add
     * @param {number} index - Index to insert at (optional)
     */
    addPoint(point, index = null) {
        if (index === null || index >= this.points.length) {
            this.points.push(point.clone());
        } else {
            this.points.splice(index, 0, point.clone());
        }
        this._shimmerChunksDirty = true;
    }

    removePoint(index) {
        if (index >= 0 && index < this.points.length) {
            this.points.splice(index, 1);
        }
        this._shimmerChunksDirty = true;
    }

    updatePoint(index, point) {
        if (index >= 0 && index < this.points.length) {
            this.points[index] = point.clone();
        }
        this._shimmerChunksDirty = true;
    }

    /**
     * Get a point on the spline at parameter t (0-1)
     * @param {number} t - Parameter along the path (0-1)
     * @returns {Vector2} Point on the spline
     */
    getPointAt(t) {
        if (this.points.length < 2) {
            return new Vector2(0, 0);
        }

        // Clamp t to [0, 1]
        t = Math.max(0, Math.min(1, t));

        // Use caching for better performance
        const cacheKey = `point_${this.pathType}_${t.toFixed(4)}`;
        if (this._pathCache.has(cacheKey)) {
            return this._pathCache.get(cacheKey);
        }

        let point;
        switch (this.pathType) {
            case "linear":
                point = this.getLinearPoint(t);
                break;
            case "quadratic":
                point = this.getQuadraticPoint(t);
                break;
            case "cubic":
                point = this.getCubicPoint(t);
                break;
            case "catmull-rom":
            default:
                point = this.getCatmullRomPoint(t);
                break;
        }

        // Cache the result (limit cache size)
        if (this._pathCache.size > 100) {
            const firstKey = this._pathCache.keys().next().value;
            this._pathCache.delete(firstKey);
        }
        this._pathCache.set(cacheKey, point.clone());
        return point;
    }

    /**
     * Linear interpolation between points
     */
    getLinearPoint(t) {
        const segmentCount = this.points.length - 1;
        const segmentT = t * segmentCount;
        const index = Math.floor(segmentT);
        const localT = segmentT - index;

        if (index >= segmentCount) {
            return this.points[this.points.length - 1].clone();
        }

        const p1 = this.points[index];
        const p2 = this.points[index + 1];

        return new Vector2(
            p1.x + (p2.x - p1.x) * localT,
            p1.y + (p2.y - p1.y) * localT
        );
    }

    /**
     * Quadratic bezier interpolation
     */
    getQuadraticPoint(t) {
        if (this.points.length < 3) {
            return this.getLinearPoint(t);
        }

        const segmentCount = Math.floor((this.points.length - 1) / 2);
        const segmentT = t * segmentCount;
        const index = Math.floor(segmentT) * 2;
        const localT = segmentT - Math.floor(segmentT);

        if (index + 2 >= this.points.length) {
            return this.points[this.points.length - 1].clone();
        }

        const p1 = this.points[index];
        const p2 = this.points[index + 1];
        const p3 = this.points[index + 2];

        // Quadratic bezier formula
        const u = 1 - localT;
        return new Vector2(
            u * u * p1.x + 2 * u * localT * p2.x + localT * localT * p3.x,
            u * u * p1.y + 2 * u * localT * p2.y + localT * localT * p3.y
        );
    }

    /**
     * Cubic bezier interpolation
     */
    getCubicPoint(t) {
        if (this.points.length < 4) {
            return this.getLinearPoint(t);
        }

        const segmentCount = Math.floor((this.points.length - 1) / 3);
        const segmentT = t * segmentCount;
        const index = Math.floor(segmentT) * 3;
        const localT = segmentT - Math.floor(segmentT);

        if (index + 3 >= this.points.length) {
            return this.points[this.points.length - 1].clone();
        }

        const p1 = this.points[index];
        const p2 = this.points[index + 1];
        const p3 = this.points[index + 2];
        const p4 = this.points[index + 3];

        // Cubic bezier formula
        const u = 1 - localT;
        const u2 = u * u;
        const u3 = u2 * u;
        const t2 = localT * localT;
        const t3 = t2 * localT;

        return new Vector2(
            u3 * p1.x + 3 * u2 * localT * p2.x + 3 * u * t2 * p3.x + t3 * p4.x,
            u3 * p1.y + 3 * u2 * localT * p2.y + 3 * u * t2 * p3.y + t3 * p4.y
        );
    }

    /**
     * Catmull-Rom spline interpolation
     */
    getCatmullRomPoint(t) {
        if (this.points.length < 2) {
            return this.points[0] ? this.points[0].clone() : new Vector2(0, 0);
        }

        // Extend points for catmull-rom
        const extendedPoints = this.extendPointsForCatmullRom();

        const segmentCount = extendedPoints.length - 3;
        const segmentT = t * segmentCount;
        const index = Math.floor(segmentT);
        const localT = segmentT - index;

        if (index >= segmentCount) {
            return extendedPoints[extendedPoints.length - 2].clone();
        }

        const p0 = extendedPoints[index];
        const p1 = extendedPoints[index + 1];
        const p2 = extendedPoints[index + 2];
        const p3 = extendedPoints[index + 3];

        // Catmull-Rom formula
        const tt = localT * localT;
        const ttt = tt * localT;

        const q1 = -this.tension * ttt + 2 * this.tension * tt - this.tension * localT;
        const q2 = (2 - this.tension) * ttt + (this.tension - 3) * tt + 1;
        const q3 = (this.tension - 2) * ttt + (3 - 2 * this.tension) * tt + this.tension * localT;
        const q4 = -this.tension * ttt + this.tension * tt;

        return new Vector2(
            0.5 * (p1.x * q2 + p2.x * q3 + p0.x * q1 + p3.x * q4),
            0.5 * (p1.y * q2 + p2.y * q3 + p0.y * q1 + p3.y * q4)
        );
    }

    /**
     * Extend points array for Catmull-Rom spline
     */
    extendPointsForCatmullRom() {
        if (this.points.length < 2) return [...this.points];

        const extended = [];

        // Add first point twice for clamping
        extended.push(this.points[0].clone());
        extended.push(...this.points.map(p => p.clone()));

        // Add last point twice for clamping
        if (this.points.length > 1) {
            extended.push(this.points[this.points.length - 1].clone());
        }

        return extended;
    }

    /**
     * Get the tangent (direction) at point t
     * @param {number} t - Parameter along the path (0-1)
     * @returns {Vector2} Tangent vector
     */
    getTangentAt(t) {
        const epsilon = 0.001;
        const cacheKey = `tangent_${t.toFixed(4)}`;

        // Check cache first
        if (this._pathCache.has(cacheKey)) {
            return this._pathCache.get(cacheKey);
        }

        const p1 = this.getPointAt(Math.max(0, t - epsilon));
        const p2 = this.getPointAt(Math.min(1, t + epsilon));
        const tangent = new Vector2(p2.x - p1.x, p2.y - p1.y).normalize();

        // Cache the result
        this._pathCache.set(cacheKey, tangent.clone());
        return tangent;
    }

    /**
     * Get average flow direction of the entire path
     * @returns {Vector2} Average flow direction vector
     */
    getAverageFlowDirection() {
        if (this.points.length < 2) {
            // Use user-defined flow direction as fallback
            return this.flowDirection ? this.flowDirection.clone().normalize() : new Vector2(1, 0);
        }

        const cacheKey = 'flow_direction';
        if (this._pathCache.has(cacheKey)) {
            return this._pathCache.get(cacheKey);
        }

        let totalDirection = new Vector2(0, 0);
        const numSamples = Math.min(this.points.length * 2, 20); // Sample along the path

        for (let i = 0; i < numSamples; i++) {
            const t = i / (numSamples - 1);
            const tangent = this.getTangentAt(t);
            totalDirection.add(tangent);
        }

        const averageDirection = totalDirection.divide(numSamples).normalize();

        // Blend with user-defined direction if provided
        if (this.flowDirection && this.flowDirection.magnitude() > 0) {
            const userDirection = this.flowDirection.clone().normalize();
            averageDirection.x = averageDirection.x * 0.7 + userDirection.x * 0.3;
            averageDirection.y = averageDirection.y * 0.7 + userDirection.y * 0.3;
            averageDirection.normalize();
        }

        // Cache the result
        this._pathCache.set(cacheKey, averageDirection.clone());
        return averageDirection;
    }

    /**
     * Generate perlin noise value at position (optimized)
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {number} Noise value (-1 to 1)
     */
    perlinNoise(x, y, time = 0) {
        // Ultra-fast noise using simple math
        const nx = x * this.perlinScale + this.perlinSeed + time;
        const ny = y * this.perlinScale + this.perlinSeed + time;

        // Simplified hash - much faster
        const n = nx + ny * 57;
        const hash = (Math.sin(n) * 43758.5453);
        return (hash - Math.floor(hash)) * 2 - 1;
    }

    /**
     * Convert hex color to RGB object
     * @param {string} hex - Hex color string
     * @returns {Object} {r, g, b}
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    }

    getVisibleSegmentRange(viewport) {
        if (!viewport || !this.viewportCulling) {
            return { startSegment: 0, endSegment: this.segments, isVisible: true };
        }

        // Check cache
        const viewportKey = `${viewport.x}_${viewport.y}_${viewport.width}_${viewport.height}`;
        if (this._lastViewport === viewportKey && this._visibleSegmentCache) {
            return this._visibleSegmentCache;
        }

        const padding = this.cullingPadding;
        const minX = viewport.x - viewport.width / 2 - padding;
        const maxX = viewport.x + viewport.width / 2 + padding;
        const minY = viewport.y - viewport.height / 2 - padding;
        const maxY = viewport.y + viewport.height / 2 + padding;

        let firstVisible = -1;
        let lastVisible = -1;

        for (let i = 0; i <= this.segments; i++) {
            const t = i / this.segments;
            const point = this.getPointAt(t);

            if (point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY) {
                if (firstVisible === -1) firstVisible = i;
                lastVisible = i;
            }
        }

        if (firstVisible === -1) {
            return { startSegment: 0, endSegment: 0, isVisible: false };
        }

        // Expand range by 1 segment on each side for smooth transitions
        const result = {
            startSegment: Math.max(0, firstVisible - 1),
            endSegment: Math.min(this.segments, lastVisible + 1),
            isVisible: true
        };

        // Cache the result
        this._lastViewport = viewportKey;
        this._visibleSegmentCache = result;

        return result;
    }

    draw(ctx) {
        if (this.points.length < 2) return;

        const viewport = this.viewport;

        const visibleRange = this.getVisibleSegmentRange(viewport);
        if (!visibleRange.isVisible) return;

        ctx.save();
        this.drawPath(ctx, visibleRange);
        if (this.showEdges) {
            this.drawEdges(ctx, visibleRange);
        }
        ctx.restore();
    }

    drawPath(ctx, visibleRange) {
        ctx.save();

        if (this.usePerlinTexture) {
            this.drawTexturedPath(ctx, visibleRange);
        } else if (this.useTexture) {
            ctx.fillStyle = this.pathColor;
            ctx.globalAlpha = this.pathOpacity;
            this.drawSolidPath(ctx, visibleRange);
        } else {
            ctx.fillStyle = this.pathColor;
            ctx.globalAlpha = this.pathOpacity;
            this.drawSolidPath(ctx, visibleRange);
        }

        ctx.restore();
    }

    // Modify drawSolidPath to use range:
    drawSolidPath(ctx, visibleRange) {
        const { startSegment, endSegment } = visibleRange;

        ctx.beginPath();

        for (let i = startSegment; i <= endSegment; i++) {
            const t = i / this.segments;
            const point = this.getPointAt(t);
            const tangent = this.getTangentAt(t);
            const normal = new Vector2(-tangent.y, tangent.x);
            const offset = normal.multiply(this.pathWidth / 2);

            if (i === startSegment) {
                ctx.moveTo(point.x + offset.x, point.y + offset.y);
            } else {
                ctx.lineTo(point.x + offset.x, point.y + offset.y);
            }
        }

        for (let i = endSegment; i >= startSegment; i--) {
            const t = i / this.segments;
            const point = this.getPointAt(t);
            const tangent = this.getTangentAt(t);
            const normal = new Vector2(-tangent.y, tangent.x);
            const offset = normal.multiply(-this.pathWidth / 2);
            ctx.lineTo(point.x + offset.x, point.y + offset.y);
        }

        ctx.closePath();
        ctx.fill();
    }

    /**
     * Multi-octave perlin noise for better texture detail
     */
    perlinNoiseOctaves(x, y, octaves = 3, time = 0) {
        let value = 0, amplitude = 1, frequency = 1, maxValue = 0;
        for (let i = 0; i < octaves; i++) {
            value += this.perlinNoise(x * frequency, y * frequency, time) * amplitude;
            maxValue += amplitude;
            amplitude *= 0.5;
            frequency *= 2;
        }
        return value / maxValue;
    }

    /**
     * Generate dirt-like texture pattern
     */
    getDirtTexture(x, y, time = 0) {
        const textureDetail = this.textureDetail || 0.3;
        const textureDarkness = this.textureDarkness || 0.4;
        const textureDensity = this.textureDensity || 0.5;
        const coarseNoise = this.perlinNoiseOctaves(x * textureDetail * 0.5, y * textureDetail * 0.5, 2, time);
        const fineNoise = this.perlinNoiseOctaves(x * textureDetail * 2, y * textureDetail * 2, 3, time);
        const spots = this.perlinNoise(x * textureDetail * 4, y * textureDetail * 4, time);
        const combined = (coarseNoise * 0.5 + fineNoise * 0.3 + spots * 0.2);
        const darkSpot = combined < (textureDensity - 0.5) ? textureDarkness : 0;
        const textureValue = combined * 0.3 + darkSpot;
        return textureValue;
    }


    drawTexturedPath(ctx, visibleRange) {
        const { startSegment, endSegment } = visibleRange;

        const bounds = this.getPathBounds();
        const padding = this.pathWidth * 2;

        const width = bounds.width + padding * 2;
        const height = bounds.height + padding * 2;

        // Reuse offscreen canvas if size matches
        if (!this._offscreenCanvas ||
            this._offscreenCanvas.width !== width ||
            this._offscreenCanvas.height !== height) {
            this._offscreenCanvas = document.createElement('canvas');
            this._offscreenCanvas.width = width;
            this._offscreenCanvas.height = height;
            this._offscreenCtx = this._offscreenCanvas.getContext('2d');
        }

        const offCtx = this._offscreenCtx;

        // Clear the canvas
        offCtx.clearRect(0, 0, width, height);

        offCtx.save();
        offCtx.translate(-bounds.minX + padding, -bounds.minY + padding);

        const textureCanvas = this.generateNoiseTexture(width, height);

        offCtx.beginPath();

        for (let i = startSegment; i <= endSegment; i++) {
            const t = i / this.segments;
            const point = this.getPointAt(t);
            const tangent = this.getTangentAt(t);
            const normal = new Vector2(-tangent.y, tangent.x);
            const widthVariation = this.getWidthVariation(t, point);
            const currentWidth = this.pathWidth * widthVariation;
            const offset = normal.multiply(currentWidth / 2);

            if (i === startSegment) {
                offCtx.moveTo(point.x + offset.x, point.y + offset.y);
            } else {
                offCtx.lineTo(point.x + offset.x, point.y + offset.y);
            }
        }

        for (let i = endSegment; i >= startSegment; i--) {
            const t = i / this.segments;
            const point = this.getPointAt(t);
            const tangent = this.getTangentAt(t);
            const normal = new Vector2(-tangent.y, tangent.x);
            const widthVariation = this.getWidthVariation(t, point);
            const currentWidth = this.pathWidth * widthVariation;
            const offset = normal.multiply(-currentWidth / 2);
            offCtx.lineTo(point.x + offset.x, point.y + offset.y);
        }

        offCtx.closePath();
        offCtx.fillStyle = this.pathColor;
        offCtx.fill();

        if (textureCanvas) {
            this.applyAnimatedTexture(offCtx, bounds, padding, textureCanvas);
        }

        offCtx.restore();

        ctx.globalAlpha = this.pathOpacity;
        ctx.drawImage(this._offscreenCanvas, bounds.minX - padding, bounds.minY - padding);
    }

    /**
     * Generate a cached noise texture for better performance
     */
    generateNoiseTexture(width, height) {
        const textureSize = this.textureResolution;
        const currentTime = this.animatePath ? this.animationOffset * 0.02 : 0;

        // Skip regeneration if animation hasn't changed much (optimization)
        const timeKey = Math.floor(currentTime * 10) / 10; // Round to 0.1 precision
        const cacheKey = `${this.perlinScale}_${this.perlinStrength}_${this.textureDetail || 0.3}_${timeKey}_${textureSize}`;

        if (this._textureCache.has(cacheKey)) {
            return this._textureCache.get(cacheKey);
        }

        const textureCanvas = document.createElement('canvas');
        textureCanvas.width = textureSize;
        textureCanvas.height = textureSize;
        const textureCtx = textureCanvas.getContext('2d');

        const imageData = textureCtx.createImageData(textureSize, textureSize);
        const data = imageData.data;

        // Scale factor to maintain appearance regardless of resolution
        const scaleFactor = 128 / textureSize;

        for (let y = 0; y < textureSize; y++) {
            for (let x = 0; x < textureSize; x++) {
                const idx = (y * textureSize + x) * 4;

                // Apply scale factor so lower resolutions cover same visual area
                const worldX = x * 0.1 * scaleFactor;
                const worldY = y * 0.1 * scaleFactor;
                const textureValue = this.getOptimizedDirtTexture(worldX, worldY, currentTime);

                const intensity = Math.max(0, Math.min(1, 0.5 + textureValue * 0.5));
                const color = Math.floor(intensity * 255);

                data[idx] = color;
                data[idx + 1] = color;
                data[idx + 2] = color;
                data[idx + 3] = 255;
            }
        }

        textureCtx.putImageData(imageData, 0, 0);

        if (textureCanvas.width > 0 && textureCanvas.height > 0) {
            if (this._textureCache.size > 10) {
                const firstKey = this._textureCache.keys().next().value;
                this._textureCache.delete(firstKey);
            }
            this._textureCache.set(cacheKey, textureCanvas);
        }

        return textureCanvas;
    }

    /**
     * Optimized dirt texture generation - much faster than the original
     */
    getOptimizedDirtTexture(x, y, time = 0) {
        const detail = this.textureDetail || 0.3;
        const darkness = this.textureDarkness || 0.4;
        const density = this.textureDensity || 0.5;

        // Use only 2 octaves instead of 3+ for massive speed boost
        const coarseNoise = this.perlinNoise(x * detail * 0.5, y * detail * 0.5, time);
        const fineNoise = this.perlinNoise(x * detail * 2, y * detail * 2, time);

        // Simplified combination
        const combined = coarseNoise * 0.6 + fineNoise * 0.4;
        const darkSpot = combined < (density - 0.5) ? darkness : 0;

        return Math.max(0, Math.min(1, combined * 0.3 + darkSpot));
    }

    /**
 * Get natural width variation along the path
 * @param {number} t - Parameter along the path (0-1)
 * @param {Vector2} point - Point on the path
 * @returns {number} Width multiplier
 */
    getWidthVariation(t, point) {
        const variationStrength = this.widthVariation || 0.3;

        // Use ONLY position-based noise (no time) for consistent shape
        const noise1 = this.perlinNoise(point.x * 0.01, point.y * 0.01, 0);
        const noise2 = this.perlinNoise(point.x * 0.02, point.y * 0.02, 0);

        return 1 + (noise1 * 0.2 + noise2 * 0.1) * variationStrength;
    }

    /**
     * Apply animated texture using efficient canvas operations
     */
    applyAnimatedTexture(ctx, bounds, padding, textureCanvas) {
        if (!textureCanvas) return;
        const time = this.animatePath ? this.animationOffset * 0.02 : 0;

        // Get flow direction for realistic water movement
        const flowDirection = this.getAverageFlowDirection();

        // Create a flowing water effect that follows the path direction
        const flowStrength = this.flowStrength || 1.0;
        const flowX = time * flowDirection.x * 60 * flowStrength;
        const flowY = time * flowDirection.y * 60 * flowStrength;

        // Use pattern for repeating texture
        try {
            const pattern = ctx.createPattern(textureCanvas, 'repeat');
            if (pattern) {
                ctx.globalCompositeOperation = 'multiply';
                ctx.fillStyle = pattern;
            } else {
                // Fallback to solid color if pattern creation fails
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = this.pathColor;
            }
        } catch (error) {
            // Fallback to solid color if pattern creation fails
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = this.pathColor;
        }

        // Apply flowing offset that follows the river direction
        if (flowDirection.x !== 0 || flowDirection.y !== 0) {
            ctx.translate(flowX, flowY);
            ctx.fill();
            ctx.translate(-flowX, -flowY);
        } else {
            ctx.fill();
        }

        // Reset composite operation
        ctx.globalCompositeOperation = 'source-over';

        // Add animated water shimmer effect
        if (this.animatePath) {
            this.addWaterShimmer(ctx, bounds, padding, time);
        }
    }

    /**
     * Add animated water shimmer effect for flowing water
     */
    addWaterShimmer(ctx, bounds, padding, time) {
        if (!this.animatePath) return;

        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.15;

        const shimmerSize = 32;
        const flowSpeed = 40 * (this.shimmerSpeed || 1.0);

        // Generate shimmer texture once and reuse (static pattern)
        const cacheKey = 'shimmer_static';

        if (!this._shimmerCache.has(cacheKey)) {
            const shimmerCanvas = document.createElement('canvas');
            shimmerCanvas.width = shimmerSize;
            shimmerCanvas.height = shimmerSize;
            const shimmerCtx = shimmerCanvas.getContext('2d');

            const imageData = shimmerCtx.createImageData(shimmerSize, shimmerSize);
            const data = imageData.data;

            for (let y = 0; y < shimmerSize; y++) {
                for (let x = 0; x < shimmerSize; x++) {
                    const idx = (y * shimmerSize + x) * 4;

                    // Create seamless tiling pattern - static, animation comes from translation
                    const wave1 = Math.sin((x / shimmerSize) * Math.PI * 2) * 0.5 + 0.5;
                    const wave2 = Math.sin((y / shimmerSize) * Math.PI * 2) * 0.3 + 0.5;
                    const combined = (wave1 * 0.7 + wave2 * 0.3);
                    const intensity = combined * 0.4;

                    data[idx] = 255;
                    data[idx + 1] = 255;
                    data[idx + 2] = 255;
                    data[idx + 3] = Math.floor(intensity * 255);
                }
            }

            shimmerCtx.putImageData(imageData, 0, 0);
            this._shimmerCache.set(cacheKey, shimmerCanvas);
        }

        const shimmerCanvas = this._shimmerCache.get(cacheKey);
        const chunks = this.getShimmerChunks();

        for (const chunk of chunks) {
            const angle = Math.atan2(chunk.tangent.y, chunk.tangent.x);

            // Continuous flow offset using modulo only for the visual offset, not the cache
            // This keeps the pattern seamlessly repeating
            const flowOffset = (time * flowSpeed) % shimmerSize;

            ctx.save();
            ctx.beginPath();

            for (let j = chunk.startIndex; j <= chunk.endIndex; j++) {
                const t = j / this.segments;
                const point = this.getPointAt(t);
                const localTangent = this.getTangentAt(t);
                const normal = new Vector2(-localTangent.y, localTangent.x);
                const widthVariation = this.getWidthVariation(t, point);
                const currentWidth = this.pathWidth * widthVariation;
                const offset = normal.multiply(currentWidth / 2);

                if (j === chunk.startIndex) {
                    ctx.moveTo(point.x + offset.x, point.y + offset.y);
                } else {
                    ctx.lineTo(point.x + offset.x, point.y + offset.y);
                }
            }

            for (let j = chunk.endIndex; j >= chunk.startIndex; j--) {
                const t = j / this.segments;
                const point = this.getPointAt(t);
                const localTangent = this.getTangentAt(t);
                const normal = new Vector2(-localTangent.y, localTangent.x);
                const widthVariation = this.getWidthVariation(t, point);
                const currentWidth = this.pathWidth * widthVariation;
                const offset = normal.multiply(-currentWidth / 2);
                ctx.lineTo(point.x + offset.x, point.y + offset.y);
            }

            ctx.closePath();
            ctx.clip();

            ctx.translate(chunk.centerPoint.x, chunk.centerPoint.y);
            ctx.rotate(angle);

            // Use modulo for seamless looping translation
            ctx.translate(flowOffset, 0);

            const pattern = ctx.createPattern(shimmerCanvas, 'repeat');
            ctx.fillStyle = pattern;

            // Draw large enough to cover the clipped area with repeating pattern
            ctx.fillRect(-shimmerSize * 8, -this.pathWidth * 2, shimmerSize * 16, this.pathWidth * 4);

            ctx.restore();
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
    }

    getShimmerChunks() {
        if (this._shimmerChunks && !this._shimmerChunksDirty) {
            return this._shimmerChunks;
        }

        const chunkSize = Math.max(2, Math.floor(this.segments / 20));
        const chunks = [];

        for (let i = 0; i < this.segments; i += chunkSize) {
            const startT = i / this.segments;
            const endT = Math.min((i + chunkSize) / this.segments, 1);
            const midT = (startT + endT) / 2;

            chunks.push({
                startIndex: i,
                endIndex: Math.min(i + chunkSize, this.segments),
                startT,
                endT,
                midT,
                tangent: this.getTangentAt(midT),
                centerPoint: this.getPointAt(midT)
            });
        }

        this._shimmerChunks = chunks;
        this._shimmerChunksDirty = false;
        return chunks;
    }

    drawEdges(ctx, visibleRange) {
        if (this.edgeWidth <= 0) return;

        const { startSegment, endSegment } = visibleRange;

        ctx.lineWidth = this.edgeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw left edge segments
        for (let i = startSegment; i < endSegment; i++) {
            const t = i / this.segments;
            const point1 = this.getPointAt(t);
            const point2 = this.getPointAt((i + 1) / this.segments);
            const tangent = this.getTangentAt(t);
            const normal = new Vector2(-tangent.y, tangent.x);
            const offset1 = normal.multiply(this.pathWidth / 2);
            const offset2 = normal.multiply(this.pathWidth / 2); // Approximate

            ctx.beginPath();
            ctx.moveTo(point1.x + offset1.x, point1.y + offset1.y);
            ctx.lineTo(point2.x + offset2.x, point2.y + offset2.y);

            if (this.usePerlinEdges) {
                // Changed: Use world position instead of t for consistent perlin based on location
                const noise1 = this.perlinNoise((point1.x + offset1.x) * 0.1, (point1.y + offset1.y) * 0.1, 0);
                const noise2 = this.perlinNoise((point2.x + offset2.x) * 0.1, (point2.y + offset2.y) * 0.1, 0);
                const avgNoise = (noise1 + noise2) * 0.5; // Average for smoother transition
                const base = this.hexToRgb(this.edgeColor);
                const intensity = 0.7 + avgNoise * 0.3;
                ctx.strokeStyle = `rgb(${Math.floor(base.r * intensity)}, ${Math.floor(base.g * intensity)}, ${Math.floor(base.b * intensity)})`;
            } else {
                ctx.strokeStyle = this.edgeColor;
            }

            ctx.stroke();
        }

        // Draw right edge segments
        for (let i = startSegment; i < endSegment; i++) {
            const t = i / this.segments;
            const point1 = this.getPointAt(t);
            const point2 = this.getPointAt((i + 1) / this.segments);
            const tangent = this.getTangentAt(t);
            const normal = new Vector2(-tangent.y, tangent.x);
            const offset1 = normal.multiply(-this.pathWidth / 2);
            const offset2 = normal.multiply(-this.pathWidth / 2);

            ctx.beginPath();
            ctx.moveTo(point1.x + offset1.x, point1.y + offset1.y);
            ctx.lineTo(point2.x + offset2.x, point2.y + offset2.y);

            if (this.usePerlinEdges) {
                // Changed: Use world position instead of t for consistent perlin based on location
                const noise1 = this.perlinNoise((point1.x + offset1.x) * 0.1, (point1.y + offset1.y) * 0.1, 0);
                const noise2 = this.perlinNoise((point2.x + offset2.x) * 0.1, (point2.y + offset2.y) * 0.1, 0);
                const avgNoise = (noise1 + noise2) * 0.5; // Average for smoother transition
                const base = this.hexToRgb(this.edgeColor);
                const intensity = 0.7 + avgNoise * 0.3;
                ctx.strokeStyle = `rgb(${Math.floor(base.r * intensity)}, ${Math.floor(base.g * intensity)}, ${Math.floor(base.b * intensity)})`;
            } else {
                ctx.strokeStyle = this.edgeColor;
            }

            ctx.stroke();
        }
    }

    drawGizmos(ctx) {
        if (!this.showGizmos || this.points.length === 0) return;

        ctx.save();

        // Apply GameObject transform
        const worldPos = this.gameObject.getWorldPosition();
        const worldAngle = this.gameObject.angle;

        ctx.translate(worldPos.x, worldPos.y);
        ctx.rotate(worldAngle * Math.PI / 180);

        // Draw spline curve preview
        ctx.strokeStyle = "#FFA500";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        ctx.beginPath();
        for (let i = 0; i <= this.segments; i++) {
            const t = i / this.segments;
            const point = this.getPointAt(t);
            if (i === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw connecting lines between control points
        ctx.strokeStyle = "rgba(255, 165, 0, 0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (this.points.length > 0) {
            ctx.moveTo(this.points[0].x, this.points[0].y);
            for (let i = 1; i < this.points.length; i++) {
                ctx.lineTo(this.points[i].x, this.points[i].y);
            }
        }
        ctx.stroke();

        // Draw arrow buttons at start and end
        if (this.points.length >= 1) {
            this.drawArrowButton(ctx, 'start');
            this.drawArrowButton(ctx, 'end');
        }

        // Draw control points
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            const isSelected = i === this.selectedPointIndex;
            const isHovered = i === this.hoveredPoint;
            const isDragging = i === this.draggingPointIndex;

            // Draw outer glow for hovered/selected
            if (isHovered || isSelected || isDragging) {
                ctx.beginPath();
                ctx.arc(point.x, point.y, this.gizmoRadius * 2, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(255, 165, 0, 0.2)";
                ctx.fill();
            }

            // Draw point circle
            ctx.beginPath();
            ctx.arc(point.x, point.y,
                isDragging ? this.gizmoRadius * 1.7 :
                    (isSelected ? this.gizmoRadius * 1.5 : this.gizmoRadius),
                0, Math.PI * 2);

            ctx.fillStyle = isDragging ? "#FF4444" :
                (isSelected ? "#FF0000" :
                    (isHovered ? "#FFAA00" : "#FFA500"));
            ctx.fill();

            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw point index
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "bold 12px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(i.toString(), point.x, point.y);

            // Draw delete hint on right-click hover
            if (isHovered && this.points.length > 2) {
                ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
                ctx.font = "10px Arial";
                ctx.textAlign = "center";
                ctx.fillText("Right-click to delete", point.x, point.y - this.gizmoRadius * 2 - 5);
            }
        }

        ctx.restore();
    }

    /**
     * Handle gizmo interaction from the editor
     * @param {Vector2} worldPos - Mouse position in world coordinates
     * @param {boolean} isClick - Whether this is a click event
     * @returns {Object|null} Interaction result
     */
    handleGizmoInteraction(worldPos, isClick) {
        if (!this.showGizmos) return null;

        if (isClick) {
            // Check for any interactive element at this position
            return this.onMouseDown(worldPos, 0);
        } else {
            // Check for hover
            return this.onMouseMove(worldPos);
        }
    }

    /**
     * Draw arrow button at start or end of spline
     */
    drawArrowButton(ctx, position) {
        const point = position === 'start' ? this.points[0] : this.points[this.points.length - 1];
        const t = position === 'start' ? 0 : 1;
        const tangent = this.getTangentAt(t);

        // Direction: point outward from spline
        const direction = position === 'start' ?
            new Vector2(-tangent.x, -tangent.y) :
            new Vector2(tangent.x, tangent.y);

        // Arrow position: offset from the point
        const arrowOffset = 30;
        const arrowPos = new Vector2(
            point.x + direction.x * arrowOffset,
            point.y + direction.y * arrowOffset
        );

        const isHovered = this.hoveredArrow === position;

        // Draw arrow circle background
        ctx.beginPath();
        ctx.arc(arrowPos.x, arrowPos.y, this.arrowSize, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? "rgba(0, 200, 0, 0.8)" : "rgba(0, 150, 0, 0.6)";
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw arrow shape
        const arrowLength = this.arrowSize * 0.6;
        const arrowWidth = this.arrowSize * 0.4;

        ctx.save();
        ctx.translate(arrowPos.x, arrowPos.y);
        ctx.rotate(Math.atan2(direction.y, direction.x));

        ctx.beginPath();
        ctx.moveTo(arrowLength, 0);
        ctx.lineTo(-arrowLength / 2, -arrowWidth);
        ctx.lineTo(-arrowLength / 2, arrowWidth);
        ctx.closePath();

        ctx.fillStyle = "#FFFFFF";
        ctx.fill();

        ctx.restore();

        // Draw tooltip on hover
        if (isHovered) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
            ctx.fillRect(arrowPos.x - 40, arrowPos.y - this.arrowSize - 20, 80, 18);

            ctx.fillStyle = "#FFFFFF";
            ctx.font = "10px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("Add Point", arrowPos.x, arrowPos.y - this.arrowSize - 11);
        }
    }

    /**
     * Get bounding box of the path for texture rendering
     * @returns {Object} {minX, minY, maxX, maxY, width, height}
     */
    getPathBounds() {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (let i = 0; i <= this.segments; i++) {
            const t = i / this.segments;
            const point = this.getPointAt(t);
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }

        return {
            minX: minX - this.pathWidth,
            minY: minY - this.pathWidth,
            maxX: maxX + this.pathWidth,
            maxY: maxY + this.pathWidth,
            width: maxX - minX + this.pathWidth * 2,
            height: maxY - minY + this.pathWidth * 2
        };
    }

    /**
     * Convert world position to local position (accounting for GameObject transform)
     */
    worldToLocal(worldPos) {
        if (!this.gameObject) return worldPos.clone();

        const goWorldPos = this.gameObject.getWorldPosition();
        const goAngle = this.gameObject.angle;

        // Translate to origin
        let local = worldPos.subtract(goWorldPos);

        // Rotate by negative angle
        const angleRad = -goAngle * Math.PI / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);

        return new Vector2(
            local.x * cos - local.y * sin,
            local.x * sin + local.y * cos
        );
    }

    /**
     * Convert local position to world position (accounting for GameObject transform)
     */
    localToWorld(localPos) {
        if (!this.gameObject) return localPos.clone();

        const goWorldPos = this.gameObject.getWorldPosition();
        const goAngle = this.gameObject.angle;

        // Rotate by angle
        const angleRad = goAngle * Math.PI / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);

        const rotated = new Vector2(
            localPos.x * cos - localPos.y * sin,
            localPos.x * sin + localPos.y * cos
        );

        // Translate to world position
        return rotated.add(goWorldPos);
    }

    /**
     * Handle mouse down event for gizmo interaction
     */
    onMouseDown(worldPos, button) {
        if (!this.showGizmos) return false;

        // Convert world position to local space
        const localPos = this.worldToLocal(worldPos);

        // Right click - delete point
        if (button === 2) {
            for (let i = 0; i < this.points.length; i++) {
                if (this.points.length <= 2) break; // Keep at least 2 points

                const point = this.points[i];
                const distance = Math.sqrt(
                    Math.pow(localPos.x - point.x, 2) +
                    Math.pow(localPos.y - point.y, 2)
                );

                if (distance <= this.gizmoRadius * 2) {
                    this.removePoint(i);
                    this.selectedPointIndex = -1;
                    return true;
                }
            }
            return false;
        }

        // Left click - select/drag or add points
        // Check arrow buttons first
        for (const position of ['start', 'end']) {
            const pointIndex = position === 'start' ? 0 : this.points.length - 1;
            const point = this.points[pointIndex];

            // Get tangent at the actual endpoint
            const t = position === 'start' ? 0 : 1;
            const tangent = this.getTangentAt(t);
            const direction = position === 'start' ?
                new Vector2(-tangent.x, -tangent.y) :
                new Vector2(tangent.x, tangent.y);

            const arrowOffset = 30;
            const arrowPos = new Vector2(
                point.x + direction.x * arrowOffset,
                point.y + direction.y * arrowOffset
            );

            const distance = Math.sqrt(
                Math.pow(localPos.x - arrowPos.x, 2) +
                Math.pow(localPos.y - arrowPos.y, 2)
            );

            if (distance <= this.arrowSize) {
                // Add new point smoothly along the tangent
                const newPointOffset = 80;

                // For Catmull-Rom, calculate better default position
                let newPoint;
                if (this.pathType === 'catmull-rom' && this.points.length >= 2) {
                    // Use the tangent direction and maintain curve smoothness
                    const prevPoint = position === 'start' ?
                        this.points[1] :
                        this.points[this.points.length - 2];

                    // Calculate direction vector from previous to current point
                    const prevDir = new Vector2(
                        point.x - prevPoint.x,
                        point.y - prevPoint.y
                    ).normalize();

                    // Extend along the tangent direction for smooth continuation
                    newPoint = new Vector2(
                        point.x + prevDir.x * newPointOffset,
                        point.y + prevDir.y * newPointOffset
                    );
                } else {
                    // Fallback for other spline types
                    newPoint = new Vector2(
                        point.x + direction.x * newPointOffset,
                        point.y + direction.y * newPointOffset
                    );
                }

                if (position === 'start') {
                    this.points.unshift(newPoint);
                    this.selectedPointIndex = 0;
                } else {
                    this.points.push(newPoint);
                    this.selectedPointIndex = this.points.length - 1;
                }

                // Force recalculation of the path
                this.segments = Math.max(10, Math.min(200, this.points.length * 20));

                return true;
            }
        }

        // Check control points
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            const distance = Math.sqrt(
                Math.pow(localPos.x - point.x, 2) +
                Math.pow(localPos.y - point.y, 2)
            );

            if (distance <= this.gizmoRadius * 2) {
                this.selectedPointIndex = i;
                this.draggingPointIndex = i;
                this.isDragging = true;
                this.dragOffset.x = localPos.x - point.x;
                this.dragOffset.y = localPos.y - point.y;
                return true;
            }
        }

        return false;
    }

    /**
 * Handle mouse move event for gizmo interaction
 */
    onMouseMove(worldPos) {
        if (!this.showGizmos) return false;

        // Convert world position to local space
        const localPos = this.worldToLocal(worldPos);

        // Update dragging
        if (this.isDragging && this.draggingPointIndex >= 0) {
            this.points[this.draggingPointIndex].x = localPos.x - this.dragOffset.x;
            this.points[this.draggingPointIndex].y = localPos.y - this.dragOffset.y;
            this.clearCaches(); // Clear caches to ensure path updates in real-time
            return true;
        }

        // Update hover states
        this.hoveredPoint = -1;
        this.hoveredArrow = null;

        // Check arrow buttons
        for (const position of ['start', 'end']) {
            const point = position === 'start' ? this.points[0] : this.points[this.points.length - 1];
            const t = position === 'start' ? 0 : 1;
            const tangent = this.getTangentAt(t);
            const direction = position === 'start' ?
                new Vector2(-tangent.x, -tangent.y) :
                new Vector2(tangent.x, tangent.y);

            const arrowOffset = 30;
            const arrowPos = new Vector2(
                point.x + direction.x * arrowOffset,
                point.y + direction.y * arrowOffset
            );

            const distance = Math.sqrt(
                Math.pow(localPos.x - arrowPos.x, 2) +
                Math.pow(localPos.y - arrowPos.y, 2)
            );

            if (distance <= this.arrowSize) {
                this.hoveredArrow = position;
                return true;
            }
        }

        // Check control points
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            const distance = Math.sqrt(
                Math.pow(localPos.x - point.x, 2) +
                Math.pow(localPos.y - point.y, 2)
            );

            if (distance <= this.gizmoRadius * 2) {
                this.hoveredPoint = i;
                return true;
            }
        }

        return false;
    }

    /**
     * Handle mouse up event
     */
    onMouseUp(worldPos, button) {
        if (this.isDragging) {
            this.isDragging = false;
            this.draggingPointIndex = -1;
            return true;
        }
        return false;
    }

    toJSON() {
        const json = super.toJSON();
        json.points = this.points.map(p => ({ x: p.x, y: p.y }));
        json.pathWidth = this.pathWidth;
        json.pathColor = this.pathColor;
        json.pathOpacity = this.pathOpacity;
        json.showEdges = this.showEdges;
        json.edgeColor = this.edgeColor;
        json.edgeWidth = this.edgeWidth;
        json.useTexture = this.useTexture;
        json.textureScale = this.textureScale;
        json.textureOffset = { x: this.textureOffset.x, y: this.textureOffset.y };
        json.usePerlinTexture = this.usePerlinTexture;
        json.perlinScale = this.perlinScale;
        json.perlinStrength = this.perlinStrength;
        json.perlinSeed = this.perlinSeed;
        json.pathType = this.pathType;
        json.tension = this.tension;
        json.segments = this.segments;
        json.animatePath = this.animatePath;
        json.animationSpeed = this.animationSpeed;
        json.animationOffset = this.animationOffset;
        json.textureDetail = this.textureDetail;
        json.textureDarkness = this.textureDarkness;
        json.textureDensity = this.textureDensity;
        json.widthVariation = this.widthVariation;
        json.flowStrength = this.flowStrength;
        json.flowDirection = this.flowDirection ? { x: this.flowDirection.x, y: this.flowDirection.y } : null;
        json.textureResolution = this.textureResolution;

        json.usePerlinEdges = this.usePerlinEdges;

        return json;
    }

    fromJSON(json) {
        super.fromJSON(json);
        if (json.points && Array.isArray(json.points)) {
            this.points = json.points.map(p => new Vector2(p.x, p.y));
        }
        if (json.pathWidth !== undefined) this.pathWidth = json.pathWidth;
        if (json.pathColor !== undefined) this.pathColor = json.pathColor;
        if (json.pathOpacity !== undefined) this.pathOpacity = json.pathOpacity;
        if (json.showEdges !== undefined) this.showEdges = json.showEdges;
        if (json.edgeColor !== undefined) this.edgeColor = json.edgeColor;
        if (json.edgeWidth !== undefined) this.edgeWidth = json.edgeWidth;
        if (json.useTexture !== undefined) this.useTexture = json.useTexture;
        if (json.textureScale !== undefined) this.textureScale = json.textureScale;
        if (json.textureOffset) this.textureOffset = new Vector2(json.textureOffset.x, json.textureOffset.y);
        if (json.usePerlinTexture !== undefined) this.usePerlinTexture = json.usePerlinTexture;
        if (json.perlinScale !== undefined) this.perlinScale = json.perlinScale;
        if (json.perlinStrength !== undefined) this.perlinStrength = json.perlinStrength;
        if (json.perlinSeed !== undefined) this.perlinSeed = json.perlinSeed;
        if (json.pathType !== undefined) this.pathType = json.pathType;
        if (json.tension !== undefined) this.tension = json.tension;
        if (json.segments !== undefined) this.segments = json.segments;
        if (json.animatePath !== undefined) this.animatePath = json.animatePath;
        if (json.animationSpeed !== undefined) this.animationSpeed = json.animationSpeed;
        if (json.animationOffset !== undefined) this.animationOffset = json.animationOffset;
        if (json.textureDetail !== undefined) this.textureDetail = json.textureDetail;
        if (json.textureDarkness !== undefined) this.textureDarkness = json.textureDarkness;
        if (json.textureDensity !== undefined) this.textureDensity = json.textureDensity;
        if (json.widthVariation !== undefined) this.widthVariation = json.widthVariation;
        if (json.flowStrength !== undefined) this.flowStrength = json.flowStrength;
        if (json.flowDirection) this.flowDirection = new Vector2(json.flowDirection.x, json.flowDirection.y);
        if (json.textureResolution !== undefined) this.textureResolution = json.textureResolution;

        if (json.usePerlinEdges !== undefined) this.usePerlinEdges = json.usePerlinEdges;
    }
}

window.SplinePath = SplinePath;
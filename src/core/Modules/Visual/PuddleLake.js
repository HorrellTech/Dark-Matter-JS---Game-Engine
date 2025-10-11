/**
 * Puddle/Lake Module
 * Creates smooth water effects with customizable control points
 */
class PuddleLake extends Module {
    static namespace = "Visual";
    static description = "Creates smooth water effects with customizable control points and wave animation";
    static allowMultiple = true;
    static iconClass = "fas fa-water";
    static color = "#2196F3";

    constructor() {
        super("PuddleLake");

        // Control points for spline interpolation
        this.points = [
            new Vector2(-50, -30),
            new Vector2(50, -20),
            new Vector2(60, 40),
            new Vector2(-40, 35)
        ];

        // Number of control points
        this.pointCount = 4;

        // Water appearance
        this.waterColor = "#4FC3F7";
        this.waterOpacity = 0.7;
        this.waterDepth = 10;

        // Smoothness - higher = smoother curves
        this.smoothness = 20;

        // Reflection properties
        this.enableReflections = true;
        this.reflectionOpacity = 0.3;

        // Cloud reflection properties
        this.enableCloudReflections = true;
        this.cloudReflectionOpacity = 0.2;
        this.cloudReflectionSpeed = 0.5;

        // Animation properties
        this.animateWaves = true;
        this.waveSpeed = 1.0;
        this.waveAmplitude = 3;
        this.waveFrequency = 0.1;

        // Ripple effects
        this.enableRipples = true;
        this.rippleSpeed = 2.0;
        this.rippleAmplitude = 2;
        this.rippleFrequency = 0.3;

        // Edge properties
        this.showEdges = true;
        this.edgeColor = "#1976D2";
        this.edgeWidth = 2;

        // Foam/bubble effects
        this.enableFoam = false;
        this.foamDensity = 0.1;
        this.foamSize = 3;

        // Gizmo properties for editor
        this.showGizmos = true;
        this.gizmoRadius = 8;
        this.selectedPointIndex = -1;
        this.draggingPointIndex = -1;
        this.isDragging = false;
        this.dragOffset = new Vector2(0, 0);
        this.hoveredPoint = -1;

        // Animation state
        this.animationTime = 0;

        // Performance optimization
        this._pathCache = new Map();
        this._lastViewport = null;
        this._visibleSegmentCache = null;
        this.viewportCulling = true;
        this.cullingPadding = 100;

        this.setupProperties();
    }

    setupProperties() {
        // Point count control
        this.exposeProperty("pointCount", "number", this.pointCount, {
            description: "Number of control points for the puddle shape",
            min: 3, max: 20,
            onChange: (value) => {
                this.regeneratePuddle(value);
            }
        });

        // Smoothness control
        this.exposeProperty("smoothness", "number", this.smoothness, {
            description: "Smoothness of the puddle outline (segments per edge)",
            min: 5, max: 50,
            onChange: (value) => {
                this.smoothness = value;
                this.clearCaches();
            }
        });

        // Water appearance
        this.exposeProperty("waterColor", "color", this.waterColor, {
            description: "Color of the water",
            onChange: (value) => { this.waterColor = value; }
        });

        this.exposeProperty("waterOpacity", "number", this.waterOpacity, {
            description: "Opacity of the water",
            min: 0, max: 1, step: 0.1,
            onChange: (value) => { this.waterOpacity = value; }
        });

        this.exposeProperty("waterDepth", "number", this.waterDepth, {
            description: "Depth of the water (affects reflection strength)",
            min: 1, max: 50,
            onChange: (value) => { this.waterDepth = value; }
        });

        // Reflection properties
        this.exposeProperty("enableReflections", "boolean", this.enableReflections, {
            description: "Enable water reflections",
            onChange: (value) => { this.enableReflections = value; }
        });

        this.exposeProperty("reflectionOpacity", "number", this.reflectionOpacity, {
            description: "Opacity of reflections",
            min: 0, max: 1, step: 0.1,
            onChange: (value) => { this.reflectionOpacity = value; }
        });

        // Cloud reflection properties
        this.exposeProperty("enableCloudReflections", "boolean", this.enableCloudReflections, {
            description: "Enable cloud reflections",
            onChange: (value) => { this.enableCloudReflections = value; }
        });

        this.exposeProperty("cloudReflectionOpacity", "number", this.cloudReflectionOpacity, {
            description: "Opacity of cloud reflections",
            min: 0, max: 1, step: 0.1,
            onChange: (value) => { this.cloudReflectionOpacity = value; }
        });

        this.exposeProperty("cloudReflectionSpeed", "number", this.cloudReflectionSpeed, {
            description: "Speed of cloud movement",
            min: 0, max: 5, step: 0.1,
            onChange: (value) => { this.cloudReflectionSpeed = value; }
        });

        // Animation properties
        this.exposeProperty("animateWaves", "boolean", this.animateWaves, {
            description: "Animate water waves",
            onChange: (value) => { this.animateWaves = value; }
        });

        this.exposeProperty("waveSpeed", "number", this.waveSpeed, {
            description: "Speed of wave animation",
            min: 0, max: 10, step: 0.1,
            onChange: (value) => { this.waveSpeed = value; }
        });

        this.exposeProperty("waveAmplitude", "number", this.waveAmplitude, {
            description: "Amplitude of waves",
            min: 0, max: 20,
            onChange: (value) => { this.waveAmplitude = value; }
        });

        this.exposeProperty("waveFrequency", "number", this.waveFrequency, {
            description: "Frequency of waves",
            min: 0.01, max: 1, step: 0.01,
            onChange: (value) => { this.waveFrequency = value; }
        });

        // Ripple properties
        this.exposeProperty("enableRipples", "boolean", this.enableRipples, {
            description: "Enable ripple effects",
            onChange: (value) => { this.enableRipples = value; }
        });

        this.exposeProperty("rippleSpeed", "number", this.rippleSpeed, {
            description: "Speed of ripples",
            min: 0, max: 5, step: 0.1,
            onChange: (value) => { this.rippleSpeed = value; }
        });

        // Edge properties
        this.exposeProperty("showEdges", "boolean", this.showEdges, {
            description: "Show water edges",
            onChange: (value) => { this.showEdges = value; }
        });

        this.exposeProperty("edgeColor", "color", this.edgeColor, {
            description: "Color of water edges",
            onChange: (value) => { this.edgeColor = value; }
        });

        this.exposeProperty("edgeWidth", "number", this.edgeWidth, {
            description: "Width of water edges",
            min: 0, max: 10,
            onChange: (value) => { this.edgeWidth = value; }
        });

        // Foam properties
        this.exposeProperty("enableFoam", "boolean", this.enableFoam, {
            description: "Enable foam effects",
            onChange: (value) => { this.enableFoam = value; }
        });

        this.exposeProperty("foamDensity", "number", this.foamDensity, {
            description: "Density of foam bubbles",
            min: 0, max: 1, step: 0.1,
            onChange: (value) => { this.foamDensity = value; }
        });
    }

    /**
     * Regenerate puddle with specified number of points in a circular arrangement
     */
    regeneratePuddle(count) {
        this.pointCount = Math.max(3, Math.min(20, count));
        this.points = [];

        // Generate points in a roughly circular arrangement with some randomness
        for (let i = 0; i < this.pointCount; i++) {
            const angle = (i / this.pointCount) * Math.PI * 2;
            const radius = 50 + Math.sin(angle * 2.5) * 15;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            this.points.push(new Vector2(x, y));
        }

        this.clearCaches();
    }

    start() {
        this.animationTime = 0;
    }

    loop(deltaTime) {
        this.animationTime += deltaTime;
        this._pointTestCache = new Map(); // Reset point test cache each frame
    }

    /**
     * Clear all caches
     */
    clearCaches() {
        this._pathCache.clear();
        this._lastViewport = null;
        this._visibleSegmentCache = null;
    }

    /**
     * Get smooth interpolated points along the puddle boundary
     */
    getInterpolatedPoints() {
        if (this.points.length < 3) return this.points;

        // Include animation state in cache key to catch wave changes
        const cacheKey = `interpolated_${this.smoothness}_${Math.floor(this.animationTime / 0.1)}`;
        if (this._pathCache.has(cacheKey)) {
            return this._pathCache.get(cacheKey);
        }

        const interpolated = [];

        // Use Catmull-Rom spline for smooth closed curves
        for (let i = 0; i < this.points.length; i++) {
            const p0 = this.points[(i - 1 + this.points.length) % this.points.length];
            const p1 = this.points[i];
            const p2 = this.points[(i + 1) % this.points.length];
            const p3 = this.points[(i + 2) % this.points.length];

            // Generate segments between p1 and p2
            for (let j = 0; j < this.smoothness; j++) {
                const t = j / this.smoothness;
                const point = this.catmullRomPoint(p0, p1, p2, p3, t);
                interpolated.push(point);
            }
        }

        // Cache the result
        if (this._pathCache.size > 10) {
            this._pathCache.clear(); // Prevent unbounded cache growth
        }
        this._pathCache.set(cacheKey, interpolated);
        return interpolated;
    }

    /**
     * Catmull-Rom spline interpolation
     */
    catmullRomPoint(p0, p1, p2, p3, t) {
        const tt = t * t;
        const ttt = tt * t;

        const tension = 0.5;
        const q1 = -tension * ttt + 2 * tension * tt - tension * t;
        const q2 = (2 - tension) * ttt + (tension - 3) * tt + 1;
        const q3 = (tension - 2) * ttt + (3 - 2 * tension) * tt + tension * t;
        const q4 = -tension * ttt + tension * tt;

        return new Vector2(
            0.5 * (p1.x * q2 + p2.x * q3 + p0.x * q1 + p3.x * q4),
            0.5 * (p1.y * q2 + p2.y * q3 + p0.y * q1 + p3.y * q4)
        );
    }

    /**
     * Check if a point is inside the water shape using ray casting
     */
    containsPoint(point) {
        const cacheKey = `${point.x}_${point.y}`;
        if (this._pointTestCache && this._pointTestCache.has(cacheKey)) {
            return this._pointTestCache.get(cacheKey);
        }

        const interpolated = this.getInterpolatedPoints();
        if (interpolated.length < 3) return false;

        let inside = false;
        for (let i = 0, j = interpolated.length - 1; i < interpolated.length; j = i++) {
            const pi = interpolated[i];
            const pj = interpolated[j];
            if (((pi.y > point.y) !== (pj.y > point.y)) &&
                (point.x < (pj.x - pi.x) * (point.y - pi.y) / (pj.y - pi.y) + pi.x)) {
                inside = !inside;
            }
        }

        return inside;
    }

    /**
     * Get wave offset at a given position and time
     */
    getWaveOffset(x, y, time) {
        if (!this.animateWaves) return 0;

        const wave1 = Math.sin(x * this.waveFrequency + time * this.waveSpeed) * this.waveAmplitude;
        const wave2 = Math.sin(y * this.waveFrequency * 0.7 + time * this.waveSpeed * 1.3) * this.waveAmplitude * 0.5;
        const ripple = this.enableRipples ?
            Math.sin((x + y) * this.rippleFrequency + time * this.rippleSpeed) * this.rippleAmplitude :
            0;

        return wave1 + wave2 + ripple;
    }

    /**
     * Generate cloud pattern for reflections
     */
    getCloudDensity(x, y, time) {
        if (!this.enableCloudReflections) return 0;

        const cloud1 = Math.sin(x * 0.01 + time * this.cloudReflectionSpeed) *
            Math.cos(y * 0.015 + time * this.cloudReflectionSpeed * 0.7);
        const cloud2 = Math.sin(x * 0.008 + y * 0.012 + time * this.cloudReflectionSpeed * 0.5) * 0.5;

        return Math.max(0, (cloud1 + cloud2) * 0.5 + 0.5);
    }

    /**
     * Get bounding box of the puddle
     */
    getBounds() {
        if (this.points.length === 0) {
            return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
        }

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const point of this.points) {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }

        return {
            minX, minY, maxX, maxY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    draw(ctx) {
        if (this.points.length < 3) return;

        const viewport = this.viewport;
        const bounds = this.getBounds();

        // Simple viewport culling
        if (viewport) {
            const padding = this.cullingPadding;
            const minX = viewport.x - viewport.width / 2 - padding;
            const maxX = viewport.x + viewport.width / 2 + padding;
            const minY = viewport.y - viewport.height / 2 - padding;
            const maxY = viewport.y + viewport.height / 2 + padding;

            if (bounds.maxX < minX || bounds.minX > maxX ||
                bounds.maxY < minY || bounds.minY > maxY) {
                return;
            }
        }

        ctx.save();

        // Draw water body
        this.drawWaterBody(ctx);

        // Draw reflections if enabled
        if (this.enableReflections) {
            this.drawReflections(ctx);
        }

        // Draw edges if enabled
        if (this.showEdges) {
            this.drawEdges(ctx);
        }

        // Draw foam if enabled
        if (this.enableFoam) {
            this.drawFoam(ctx);
        }

        ctx.restore();
    }

    drawWaterBody(ctx) {
        const interpolated = this.getInterpolatedPoints();
        if (interpolated.length < 3) return;

        ctx.beginPath();
        const startPoint = interpolated[0];
        ctx.moveTo(startPoint.x, startPoint.y);

        // Draw smooth polygon
        for (let i = 1; i < interpolated.length; i++) {
            const point = interpolated[i];
            const waveOffset = this.getWaveOffset(point.x, point.y, this.animationTime);
            ctx.lineTo(point.x, point.y + waveOffset);
        }

        ctx.closePath();

        // Fill with water color
        ctx.fillStyle = this.waterColor;
        ctx.globalAlpha = this.waterOpacity;
        ctx.fill();

        // Wave overlay
        if (this.animateWaves) {
            this.drawWaveOverlay(ctx, interpolated);
        }
    }

    drawWaveOverlay(ctx, interpolated) {
        ctx.beginPath();
        const startPoint = interpolated[0];
        ctx.moveTo(startPoint.x, startPoint.y);

        for (let i = 1; i < interpolated.length; i++) {
            const point = interpolated[i];
            const waveOffset = this.getWaveOffset(point.x, point.y, this.animationTime);
            ctx.lineTo(point.x, point.y + waveOffset);
        }

        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, -50, 0, 50);
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.1)");
        gradient.addColorStop(0.5, "rgba(255, 255, 255, 0)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.1)");

        ctx.fillStyle = gradient;
        ctx.globalAlpha = 0.3;
        ctx.fill();
    }

    drawReflections(ctx) {
        const interpolated = this.getInterpolatedPoints();
        if (interpolated.length < 3) return;

        ctx.save();

        // Create clipping region using the water body boundary
        ctx.beginPath();
        ctx.moveTo(interpolated[0].x, interpolated[0].y);
        for (let i = 1; i < interpolated.length; i++) {
            const point = interpolated[i];
            const waveOffset = this.getWaveOffset(point.x, point.y, this.animationTime);
            ctx.lineTo(point.x, point.y + waveOffset);
        }
        ctx.closePath();
        ctx.clip();

        // Now draw depth gradient within the clipped region
        ctx.globalAlpha = this.reflectionOpacity;

        // Get bounds for gradient direction
        const bounds = this.getBounds();

        // Draw gradient from top (surface) to bottom (depth) - all within water body
        const gradient = ctx.createLinearGradient(0, bounds.minY, 0, bounds.maxY);
        gradient.addColorStop(0, "rgba(173, 216, 230, 0.2)");      // Light blue at surface (top)
        gradient.addColorStop(0.5, "rgba(70, 130, 180, 0.4)");     // Medium blue in middle
        gradient.addColorStop(1, "rgba(25, 25, 112, 0.7)");        // Dark blue at bottom (depth)

        ctx.fillStyle = gradient;

        // Fill the entire bounds area (clipping will constrain it to water shape)
        ctx.beginPath();
        ctx.moveTo(interpolated[0].x, interpolated[0].y);
        for (let i = 1; i < interpolated.length; i++) {
            const point = interpolated[i];
            const waveOffset = this.getWaveOffset(point.x, point.y, this.animationTime);
            ctx.lineTo(point.x, point.y + waveOffset);
        }
        ctx.closePath();
        ctx.fill();

        // Draw cloud reflections if enabled
        if (this.enableCloudReflections) {
            this.drawCloudReflections(ctx, interpolated);
        }

        ctx.restore();
    }

    drawCloudReflections(ctx, interpolated) {
        ctx.beginPath();
        const sampleRate = Math.max(1, Math.floor(interpolated.length / 6)); // Reduced from 8

        for (let i = 0; i < interpolated.length; i += sampleRate) {
            const point = interpolated[i];
            const cloudDensity = this.getCloudDensity(point.x, point.y, this.animationTime);

            if (cloudDensity > 0.1) {
                const cloudSize = 20 + cloudDensity * 30;
                ctx.moveTo(point.x + cloudSize, point.y);
                ctx.arc(point.x - cloudSize * 0.3, point.y, cloudSize * 0.6, 0, Math.PI * 2);
                ctx.arc(point.x + cloudSize * 0.3, point.y, cloudSize * 0.8, 0, Math.PI * 2);
            }
        }

        const alpha = this.cloudReflectionOpacity;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
    }

    drawEdges(ctx) {
        if (this.edgeWidth <= 0) return;

        const interpolated = this.getInterpolatedPoints();
        if (interpolated.length < 3) return;

        ctx.strokeStyle = this.edgeColor;
        ctx.lineWidth = this.edgeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(interpolated[0].x, interpolated[0].y);

        for (let i = 1; i < interpolated.length; i++) {
            const point = interpolated[i];
            const waveOffset = this.getWaveOffset(point.x, point.y, this.animationTime);
            ctx.lineTo(point.x, point.y + waveOffset);
        }

        ctx.closePath();
        ctx.stroke();
    }

    drawFoam(ctx) {
        if (this.foamDensity <= 0) return;

        const interpolated = this.getInterpolatedPoints();
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";

        const step = Math.max(1, Math.floor(interpolated.length / 20));
        const bubbleCount = Math.floor(this.foamDensity * 5);

        for (let i = 0; i < interpolated.length; i += step) {
            const point = interpolated[i];

            // Use deterministic "random" based on index + time
            for (let b = 0; b < bubbleCount; b++) {
                const seed = i * 73 + b * 37 + Math.floor(this.animationTime * 10) % 100;
                const bubbleAngle = (seed * 12.9898) % (Math.PI * 2);
                const bubbleDistance = ((seed * 78.233) % 100) / 100 * 15;
                const bubbleX = point.x + Math.cos(bubbleAngle) * bubbleDistance;
                const bubbleY = point.y + Math.sin(bubbleAngle) * bubbleDistance;

                if (this.containsPoint(new Vector2(bubbleX, bubbleY))) {
                    const bubbleSize = this.foamSize * (0.5 + ((seed * 45.164) % 100) / 200);
                    ctx.beginPath();
                    ctx.arc(bubbleX, bubbleY, bubbleSize, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }

    drawGizmos(ctx) {
        if (!this.showGizmos || this.points.length === 0) return;

        ctx.save();

        const worldPos = this.gameObject.getWorldPosition();
        const worldAngle = this.gameObject.angle;

        ctx.translate(worldPos.x, worldPos.y);
        ctx.rotate(worldAngle * Math.PI / 180);

        // Draw puddle outline
        const interpolated = this.getInterpolatedPoints();
        ctx.strokeStyle = "#2196F3";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        ctx.beginPath();
        if (interpolated.length > 0) {
            ctx.moveTo(interpolated[0].x, interpolated[0].y);
            for (let i = 1; i < interpolated.length; i++) {
                ctx.lineTo(interpolated[i].x, interpolated[i].y);
            }
            ctx.closePath();
        }
        ctx.stroke();

        ctx.setLineDash([]);

        if (!this.gameObject.isEditorSelected) {
            // Draw simple icon when not selected
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(33, 150, 243, 0.6)";
            ctx.fill();
            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI);
            ctx.stroke();

            ctx.restore();
            return;
        }

        // Draw control points
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            const isSelected = i === this.selectedPointIndex;
            const isHovered = i === this.hoveredPoint;
            const isDragging = i === this.draggingPointIndex;

            if (isHovered || isSelected || isDragging) {
                ctx.beginPath();
                ctx.arc(point.x, point.y, this.gizmoRadius * 2, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(33, 150, 243, 0.2)";
                ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(point.x, point.y,
                isDragging ? this.gizmoRadius * 1.7 :
                    (isSelected ? this.gizmoRadius * 1.5 : this.gizmoRadius),
                0, Math.PI * 2);

            ctx.fillStyle = isDragging ? "#FF4444" :
                (isSelected ? "#FF0000" :
                    (isHovered ? "#00A8FF" : "#2196F3"));
            ctx.fill();

            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = "#FFFFFF";
            ctx.font = "bold 12px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(i.toString(), point.x, point.y);
        }

        // Icon at center
        const bounds = this.getBounds();
        const centerX = bounds.minX + bounds.width / 2;
        const centerY = bounds.minY + bounds.height / 2;

        ctx.beginPath();
        ctx.arc(centerX, centerY, 12, 0, Math.PI * 2);
        ctx.fillStyle = this.gameObject.isEditorSelected ? "#2196F3" : "rgba(33, 150, 243, 0.6)";
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 6, 0, Math.PI);
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Handle gizmo interaction from the editor
     */
    handleGizmoInteraction(worldPos, isClick = false) {
        if (!this.showGizmos) return null;

        if (isClick) {
            return this.onMouseDown(worldPos, 0);
        } else {
            return this.onMouseMove(worldPos);
        }
    }

    /**
     * Convert world position to local space
     */
    worldToLocal(worldPos) {
        if (!this.gameObject) return worldPos.clone();

        const goWorldPos = this.gameObject.getWorldPosition();
        const goAngle = this.gameObject.angle;

        let local = worldPos.subtract(goWorldPos);

        const angleRad = -goAngle * Math.PI / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);

        return new Vector2(
            local.x * cos - local.y * sin,
            local.x * sin + local.y * cos
        );
    }

    /**
     * Convert local position to world space
     */
    localToWorld(localPos) {
        if (!this.gameObject) return localPos.clone();

        const goWorldPos = this.gameObject.getWorldPosition();
        const goAngle = this.gameObject.angle;

        const angleRad = goAngle * Math.PI / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);

        const rotated = new Vector2(
            localPos.x * cos - localPos.y * sin,
            localPos.x * sin + localPos.y * cos
        );

        return rotated.add(goWorldPos);
    }

    /**
     * Handle mouse down for gizmo interaction
     */
    onMouseDown(worldPos, button) {
        if (!this.showGizmos) return false;

        const localPos = this.worldToLocal(worldPos);

        // Check for point selection/dragging
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
     * Handle mouse move for gizmo interaction
     */
    onMouseMove(worldPos) {
        if (!this.showGizmos) return false;

        const localPos = this.worldToLocal(worldPos);

        // Update dragging
        if (this.isDragging && this.draggingPointIndex >= 0) {
            this.points[this.draggingPointIndex].x = localPos.x - this.dragOffset.x;
            this.points[this.draggingPointIndex].y = localPos.y - this.dragOffset.y;
            this.clearCaches();
            return true;
        }

        // Update hover states
        this.hoveredPoint = -1;

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

    /**
     * Get public API method to check if point is in water
     */
    containsPointWorld(worldPos) {
        const localPos = this.worldToLocal(worldPos);
        return this.containsPoint(localPos);
    }

    /**
     * Get closest point on the puddle boundary
     */
    getClosestPointOnBoundary(worldPos) {
        const localPos = this.worldToLocal(worldPos);
        const interpolated = this.getInterpolatedPoints();

        if (interpolated.length < 2) return null;

        let closestPoint = null;
        let closestDistance = Infinity;

        for (let i = 0; i < interpolated.length; i++) {
            const point = interpolated[i];
            const distance = Math.sqrt(
                Math.pow(localPos.x - point.x, 2) +
                Math.pow(localPos.y - point.y, 2)
            );

            if (distance < closestDistance) {
                closestDistance = distance;
                closestPoint = point;
            }
        }

        return {
            point: closestPoint ? this.localToWorld(closestPoint) : null,
            distance: closestDistance
        };
    }

    /**
 * Check if a world position is inside the water
 */
    isPointInWater(worldPos) {
        const localPos = this.worldToLocal(worldPos);
        return this.containsPoint(localPos);
    }

    /**
     * Get all control points in world space
     */
    getControlPointsWorld() {
        return this.points.map(p => this.localToWorld(p));
    }

    /**
     * Get all interpolated boundary points in world space
     */
    getBoundaryPointsWorld() {
        return this.getInterpolatedPoints().map(p => this.localToWorld(p));
    }

    /**
     * Get the center of the puddle in world space
     */
    getCenterWorld() {
        const bounds = this.getBounds();
        const centerLocal = new Vector2(
            bounds.minX + bounds.width / 2,
            bounds.minY + bounds.height / 2
        );
        return this.localToWorld(centerLocal);
    }

    /**
     * Get bounding box in world space
     */
    getBoundsWorld() {
        const bounds = this.getBounds();
        const topLeft = this.localToWorld(new Vector2(bounds.minX, bounds.minY));
        const bottomRight = this.localToWorld(new Vector2(bounds.maxX, bounds.maxY));
        return {
            minX: topLeft.x,
            minY: topLeft.y,
            maxX: bottomRight.x,
            maxY: bottomRight.y,
            width: Math.abs(bottomRight.x - topLeft.x),
            height: Math.abs(bottomRight.y - topLeft.y)
        };
    }

    /**
     * Get puddle area (approximate)
     */
    getArea() {
        const bounds = this.getBounds();
        return bounds.width * bounds.height * Math.PI / 4; // Approximate as ellipse
    }

    /**
     * Get distance from world position to puddle boundary
     */
    getDistanceToBoundary(worldPos) {
        const result = this.getClosestPointOnBoundary(worldPos);
        return result ? result.distance : Infinity;
    }

    /**
     * Add a new control point at world position
     */
    addControlPoint(worldPos) {
        const localPos = this.worldToLocal(worldPos);
        this.points.push(localPos);
        this.pointCount = this.points.length;
        this.clearCaches();
        return this.points.length - 1;
    }

    /**
     * Remove control point by index
     */
    removeControlPoint(index) {
        if (index >= 0 && index < this.points.length && this.points.length > 3) {
            this.points.splice(index, 1);
            this.pointCount = this.points.length;
            this.clearCaches();
            return true;
        }
        return false;
    }

    /**
     * Set control point position in world space
     */
    setControlPointWorld(index, worldPos) {
        if (index >= 0 && index < this.points.length) {
            this.points[index] = this.worldToLocal(worldPos);
            this.clearCaches();
            return true;
        }
        return false;
    }

    /**
     * Get control point in world space
     */
    getControlPointWorld(index) {
        if (index >= 0 && index < this.points.length) {
            return this.localToWorld(this.points[index]);
        }
        return null;
    }

    /**
     * Check if world position is near the boundary (within distance)
     */
    isNearBoundary(worldPos, distance = 20) {
        return this.getDistanceToBoundary(worldPos) <= distance;
    }

    /**
     * Get the closest point on boundary in world space
     */
    getClosestBoundaryPointWorld(worldPos) {
        const result = this.getClosestPointOnBoundary(worldPos);
        return result ? result.point : null;
    }

    /**
     * Cast a ray from world position in direction and check intersection with boundary
     * Returns intersection point and distance, or null if no hit
     */
    raycastBoundary(worldPos, directionNormalized, maxDistance = Infinity) {
        const localPos = this.worldToLocal(worldPos);
        const interpolated = this.getInterpolatedPoints();

        let closestHit = null;
        let closestDist = maxDistance;

        for (let i = 0; i < interpolated.length; i++) {
            const p1 = interpolated[i];
            const p2 = interpolated[(i + 1) % interpolated.length];
            const hit = this.rayLineSegmentIntersection(localPos, directionNormalized, p1, p2);

            if (hit && hit.distance < closestDist && hit.distance > 0) {
                closestDist = hit.distance;
                closestHit = {
                    point: this.localToWorld(hit.point),
                    distance: hit.distance
                };
            }
        }

        return closestHit;
    }

    /**
     * Helper for raycast - ray to line segment intersection
     */
    rayLineSegmentIntersection(rayOrigin, rayDir, p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const det = rayDir.x * dy - rayDir.y * dx;

        if (Math.abs(det) < 1e-10) return null;

        const t = ((p1.x - rayOrigin.x) * dy - (p1.y - rayOrigin.y) * dx) / det;
        const u = ((p1.x - rayOrigin.x) * rayDir.y - (p1.y - rayOrigin.y) * rayDir.x) / det;

        if (t > 0 && u >= 0 && u <= 1) {
            return {
                point: new Vector2(rayOrigin.x + rayDir.x * t, rayOrigin.y + rayDir.y * t),
                distance: t
            };
        }

        return null;
    }

    toJSON() {
        const json = super.toJSON();
        json.points = this.points.map(p => ({ x: p.x, y: p.y }));
        json.pointCount = this.pointCount;
        json.smoothness = this.smoothness;
        json.waterColor = this.waterColor;
        json.waterOpacity = this.waterOpacity;
        json.waterDepth = this.waterDepth;
        json.enableReflections = this.enableReflections;
        json.reflectionOpacity = this.reflectionOpacity;
        json.enableCloudReflections = this.enableCloudReflections;
        json.cloudReflectionOpacity = this.cloudReflectionOpacity;
        json.cloudReflectionSpeed = this.cloudReflectionSpeed;
        json.animateWaves = this.animateWaves;
        json.waveSpeed = this.waveSpeed;
        json.waveAmplitude = this.waveAmplitude;
        json.waveFrequency = this.waveFrequency;
        json.enableRipples = this.enableRipples;
        json.rippleSpeed = this.rippleSpeed;
        json.rippleAmplitude = this.rippleAmplitude;
        json.rippleFrequency = this.rippleFrequency;
        json.showEdges = this.showEdges;
        json.edgeColor = this.edgeColor;
        json.edgeWidth = this.edgeWidth;
        json.enableFoam = this.enableFoam;
        json.foamDensity = this.foamDensity;
        json.foamSize = this.foamSize;
        json.animationTime = this.animationTime;
        return json;
    }

    fromJSON(json) {
        super.fromJSON(json);
        if (json.points && Array.isArray(json.points)) {
            this.points = json.points.map(p => new Vector2(p.x, p.y));
        }
        if (json.pointCount !== undefined) this.pointCount = json.pointCount;
        if (json.smoothness !== undefined) this.smoothness = json.smoothness;
        if (json.waterColor !== undefined) this.waterColor = json.waterColor;
        if (json.waterOpacity !== undefined) this.waterOpacity = json.waterOpacity;
        if (json.waterDepth !== undefined) this.waterDepth = json.waterDepth;
        if (json.enableReflections !== undefined) this.enableReflections = json.enableReflections;
        if (json.reflectionOpacity !== undefined) this.reflectionOpacity = json.reflectionOpacity;
        if (json.enableCloudReflections !== undefined) this.enableCloudReflections = json.enableCloudReflections;
        if (json.cloudReflectionOpacity !== undefined) this.cloudReflectionOpacity = json.cloudReflectionOpacity;
        if (json.cloudReflectionSpeed !== undefined) this.cloudReflectionSpeed = json.cloudReflectionSpeed;
        if (json.animateWaves !== undefined) this.animateWaves = json.animateWaves;
        if (json.waveSpeed !== undefined) this.waveSpeed = json.waveSpeed;
        if (json.waveAmplitude !== undefined) this.waveAmplitude = json.waveAmplitude;
        if (json.waveFrequency !== undefined) this.waveFrequency = json.waveFrequency;
        if (json.enableRipples !== undefined) this.enableRipples = json.enableRipples;
        if (json.rippleSpeed !== undefined) this.rippleSpeed = json.rippleSpeed;
        if (json.rippleAmplitude !== undefined) this.rippleAmplitude = json.rippleAmplitude;
        if (json.rippleFrequency !== undefined) this.rippleFrequency = json.rippleFrequency;
        if (json.showEdges !== undefined) this.showEdges = json.showEdges;
        if (json.edgeColor !== undefined) this.edgeColor = json.edgeColor;
        if (json.edgeWidth !== undefined) this.edgeWidth = json.edgeWidth;
        if (json.enableFoam !== undefined) this.enableFoam = json.enableFoam;
        if (json.foamDensity !== undefined) this.foamDensity = json.foamDensity;
        if (json.foamSize !== undefined) this.foamSize = json.foamSize;
        if (json.animationTime !== undefined) this.animationTime = json.animationTime;
    }
}

window.PuddleLake = PuddleLake;
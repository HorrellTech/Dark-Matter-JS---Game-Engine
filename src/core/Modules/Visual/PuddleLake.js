/**
 * Puddle/Lake Module
 * Creates water effects with customizable points, cloud reflection generation, and water animation
 */
class PuddleLake extends Module {
    static namespace = "Visual";
    static description = "Creates water effects with customizable points, cloud reflection generation, and water animation";
    static allowMultiple = true;
    static iconClass = "fas fa-water";
    static color = "#2196F3";

    constructor() {
        super("PuddleLake");

        // Shape properties
        this.points = [
            new Vector2(-50, -30),
            new Vector2(50, -20),
            new Vector2(60, 40),
            new Vector2(-40, 35)
        ];

        // Water appearance
        this.waterColor = "#4FC3F7";
        this.waterOpacity = 0.7;
        this.waterDepth = 10;

        // Reflection properties
        this.enableReflections = true;
        this.reflectionOpacity = 0.3;
        this.reflectionScale = 1.0;
        this.reflectionOffset = new Vector2(0, 0);

        // Cloud reflection properties
        this.enableCloudReflections = true;
        this.cloudReflectionOpacity = 0.2;
        this.cloudReflectionSpeed = 0.5;
        this.cloudReflectionScale = 1.2;

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

        // Animation state
        this.animationTime = 0;

        this.setupProperties();
    }

    setupProperties() {
        // Shape properties
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

        this.exposeProperty("reflectionScale", "number", this.reflectionScale, {
            description: "Scale of reflections",
            min: 0.1, max: 2, step: 0.1,
            onChange: (value) => { this.reflectionScale = value; }
        });

        this.exposeProperty("reflectionOffset", "vector2", this.reflectionOffset, {
            description: "Offset for reflections",
            onChange: (value) => { this.reflectionOffset = value; }
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
    }

    start() {
        this.animationTime = 0;
    }

    loop(deltaTime) {
        this.animationTime += deltaTime;
    }

    /**
     * Add a point to the water shape
     * @param {Vector2} point - The point to add
     * @param {number} index - Index to insert at (optional)
     */
    addPoint(point, index = null) {
        if (index === null || index >= this.points.length) {
            this.points.push(point.clone());
        } else {
            this.points.splice(index, 0, point.clone());
        }
    }

    /**
     * Remove a point from the water shape
     * @param {number} index - Index of the point to remove
     */
    removePoint(index) {
        if (index >= 0 && index < this.points.length) {
            this.points.splice(index, 1);
        }
    }

    /**
     * Update a point in the water shape
     * @param {number} index - Index of the point to update
     * @param {Vector2} point - New position
     */
    updatePoint(index, point) {
        if (index >= 0 && index < this.points.length) {
            this.points[index] = point.clone();
        }
    }

    /**
     * Check if a point is inside the water shape
     * @param {Vector2} point - Point to test
     * @returns {boolean} True if point is inside water
     */
    containsPoint(point) {
        if (this.points.length < 3) return false;

        // Use ray casting algorithm for point-in-polygon test
        let inside = false;
        for (let i = 0, j = this.points.length - 1; i < this.points.length; j = i++) {
            const pi = this.points[i];
            const pj = this.points[j];

            if (((pi.y > point.y) !== (pj.y > point.y)) &&
                (point.x < (pj.x - pi.x) * (point.y - pi.y) / (pj.y - pi.y) + pi.x)) {
                inside = !inside;
            }
        }

        return inside;
    }

    /**
     * Generate wave offset at a given position and time
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} time - Current time
     * @returns {number} Wave offset
     */
    getWaveOffset(x, y, time) {
        if (!this.animateWaves) return 0;

        const wave1 = Math.sin(x * this.waveFrequency + time * this.waveSpeed) * this.waveAmplitude;
        const wave2 = Math.sin(y * this.waveFrequency * 0.7 + time * this.waveSpeed * 1.3) * this.waveAmplitude * 0.5;
        const ripple = Math.sin((x + y) * this.rippleFrequency + time * this.rippleSpeed) * this.rippleAmplitude;

        return wave1 + wave2 + ripple;
    }

    /**
     * Generate cloud pattern for reflections
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} time - Current time
     * @returns {number} Cloud density (0-1)
     */
    getCloudDensity(x, y, time) {
        if (!this.enableCloudReflections) return 0;

        // Create moving cloud patterns
        const cloud1 = Math.sin(x * 0.01 + time * this.cloudReflectionSpeed) *
                      Math.cos(y * 0.015 + time * this.cloudReflectionSpeed * 0.7);

        const cloud2 = Math.sin(x * 0.008 + y * 0.012 + time * this.cloudReflectionSpeed * 0.5) * 0.5;

        return Math.max(0, (cloud1 + cloud2) * 0.5 + 0.5);
    }

    draw(ctx) {
        if (this.points.length < 3) return;

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
        ctx.beginPath();

        // Move to first point
        const startPoint = this.points[0];
        ctx.moveTo(startPoint.x, startPoint.y);

        // Draw path with wave animation
        for (let i = 1; i < this.points.length; i++) {
            const point = this.points[i];
            const waveOffset = this.getWaveOffset(point.x, point.y, this.animationTime);

            // Add some curve to make it look more natural
            if (i > 1) {
                const prevPoint = this.points[i - 1];
                const midX = (prevPoint.x + point.x) / 2;
                const midY = (prevPoint.y + point.y) / 2 + waveOffset;
                ctx.quadraticCurveTo(prevPoint.x, prevPoint.y + waveOffset, midX, midY);
            } else {
                ctx.lineTo(point.x, point.y + waveOffset);
            }
        }

        // Close the path
        ctx.closePath();

        // Fill with water color and opacity
        ctx.fillStyle = this.waterColor;
        ctx.globalAlpha = this.waterOpacity;
        ctx.fill();

        // Add wave overlay for animation
        if (this.animateWaves) {
            this.drawWaveOverlay(ctx);
        }
    }

    drawWaveOverlay(ctx) {
        ctx.beginPath();

        // Create a slightly smaller path for wave overlay
        const startPoint = this.points[0];
        ctx.moveTo(startPoint.x, startPoint.y);

        for (let i = 1; i < this.points.length; i++) {
            const point = this.points[i];
            const waveOffset = this.getWaveOffset(point.x, point.y, this.animationTime);

            if (i > 1) {
                const prevPoint = this.points[i - 1];
                const midX = (prevPoint.x + point.x) / 2;
                const midY = (prevPoint.y + point.y) / 2 + waveOffset;
                ctx.quadraticCurveTo(prevPoint.x, prevPoint.y + waveOffset, midX, midY);
            } else {
                ctx.lineTo(point.x, point.y + waveOffset);
            }
        }

        ctx.closePath();

        // Create wave gradient
        const gradient = ctx.createLinearGradient(0, -50, 0, 50);
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.1)");
        gradient.addColorStop(0.5, "rgba(255, 255, 255, 0)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.1)");

        ctx.fillStyle = gradient;
        ctx.globalAlpha = 0.3;
        ctx.fill();
    }

    drawReflections(ctx) {
        if (this.points.length < 3) return;

        ctx.save();
        ctx.globalAlpha = this.reflectionOpacity;

        // Scale and translate for reflection
        ctx.scale(this.reflectionScale, -this.reflectionScale);
        ctx.translate(this.reflectionOffset.x, this.reflectionOffset.y);

        // Draw reflected objects (simplified - in a real implementation,
        // this would reflect actual game objects above the water)
        this.drawReflectedObjects(ctx);

        // Draw cloud reflections
        if (this.enableCloudReflections) {
            this.drawCloudReflections(ctx);
        }

        ctx.restore();
    }

    drawReflectedObjects(ctx) {
        // This is a simplified version - in a full implementation,
        // this would reflect actual game objects above the water surface

        ctx.beginPath();

        // Create some simple reflected shapes
        const reflectionPoints = this.points.map(p => ({
            x: p.x,
            y: -p.y - this.waterDepth // Reflect below water surface
        }));

        ctx.moveTo(reflectionPoints[0].x, reflectionPoints[0].y);

        for (let i = 1; i < reflectionPoints.length; i++) {
            const point = reflectionPoints[i];
            const waveOffset = this.getWaveOffset(point.x, -point.y, this.animationTime) * 0.5;

            if (i > 1) {
                const prevPoint = reflectionPoints[i - 1];
                const midX = (prevPoint.x + point.x) / 2;
                const midY = (prevPoint.y + point.y) / 2 + waveOffset;
                ctx.quadraticCurveTo(prevPoint.x, prevPoint.y + waveOffset, midX, midY);
            } else {
                ctx.lineTo(point.x, point.y + waveOffset);
            }
        }

        ctx.closePath();

        // Create reflection gradient
        const gradient = ctx.createLinearGradient(0, -this.waterDepth, 0, 0);
        gradient.addColorStop(0, "rgba(100, 100, 100, 0.1)");
        gradient.addColorStop(1, "rgba(50, 50, 50, 0.3)");

        ctx.fillStyle = gradient;
        ctx.fill();
    }

    drawCloudReflections(ctx) {
        // Draw cloud-like reflections on the water surface
        ctx.beginPath();

        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            const cloudDensity = this.getCloudDensity(point.x, point.y, this.animationTime);

            if (cloudDensity > 0.1) {
                const cloudSize = 20 + cloudDensity * 30;
                ctx.moveTo(point.x + cloudSize, point.y);

                // Draw cloud shape
                ctx.arc(point.x - cloudSize * 0.3, point.y, cloudSize * 0.6, 0, Math.PI * 2);
                ctx.arc(point.x + cloudSize * 0.3, point.y, cloudSize * 0.8, 0, Math.PI * 2);
                ctx.arc(point.x, point.y - cloudSize * 0.2, cloudSize * 0.5, 0, Math.PI * 2);
            }
        }

        const alpha = this.cloudReflectionOpacity;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
    }

    drawEdges(ctx) {
        if (this.edgeWidth <= 0 || this.points.length < 3) return;

        ctx.strokeStyle = this.edgeColor;
        ctx.lineWidth = this.edgeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();

        // Draw path outline with wave animation
        const startPoint = this.points[0];
        ctx.moveTo(startPoint.x, startPoint.y + this.getWaveOffset(startPoint.x, startPoint.y, this.animationTime));

        for (let i = 1; i < this.points.length; i++) {
            const point = this.points[i];
            const waveOffset = this.getWaveOffset(point.x, point.y, this.animationTime);

            if (i > 1) {
                const prevPoint = this.points[i - 1];
                const midX = (prevPoint.x + point.x) / 2;
                const midY = (prevPoint.y + point.y) / 2 + waveOffset;
                ctx.quadraticCurveTo(
                    prevPoint.x,
                    prevPoint.y + this.getWaveOffset(prevPoint.x, prevPoint.y, this.animationTime),
                    midX,
                    midY
                );
            } else {
                ctx.lineTo(point.x, point.y + waveOffset);
            }
        }

        ctx.closePath();
        ctx.stroke();
    }

    drawFoam(ctx) {
        if (this.foamDensity <= 0 || this.points.length < 3) return;

        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";

        // Generate foam bubbles around the edges
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];

            // Generate random foam bubbles near edges
            const bubbleCount = Math.floor(this.foamDensity * 10);

            for (let b = 0; b < bubbleCount; b++) {
                const bubbleAngle = Math.random() * Math.PI * 2;
                const bubbleDistance = Math.random() * 15;
                const bubbleX = point.x + Math.cos(bubbleAngle) * bubbleDistance;
                const bubbleY = point.y + Math.sin(bubbleAngle) * bubbleDistance;

                // Check if bubble is inside water
                if (this.containsPoint(new Vector2(bubbleX, bubbleY))) {
                    const bubbleSize = this.foamSize * (0.5 + Math.random() * 0.5);
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

        // Draw water shape outline
        ctx.strokeStyle = "#2196F3";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        ctx.beginPath();
        if (this.points.length > 0) {
            ctx.moveTo(this.points[0].x, this.points[0].y);
            for (let i = 1; i < this.points.length; i++) {
                ctx.lineTo(this.points[i].x, this.points[i].y);
            }
            ctx.closePath();
        }
        ctx.stroke();

        ctx.setLineDash([]);

        // Draw control points
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            const isSelected = i === this.selectedPointIndex;

            // Draw point circle
            ctx.beginPath();
            ctx.arc(point.x, point.y, isSelected ? this.gizmoRadius * 1.5 : this.gizmoRadius, 0, Math.PI * 2);
            ctx.fillStyle = isSelected ? "#FF0000" : "#2196F3";
            ctx.fill();
            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw point index
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "12px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(i.toString(), point.x, point.y);
        }

        ctx.restore();
    }

    /**
     * Handle gizmo interaction for point editing
     * @param {Vector2} worldPos - Mouse position in world coordinates
     * @param {boolean} isClick - Whether this is a click event
     */
    handleGizmoInteraction(worldPos, isClick = false) {
        if (!this.showGizmos) return null;

        const threshold = this.gizmoRadius * 2;

        // Check if clicking on a point
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            const distance = Math.sqrt(
                Math.pow(worldPos.x - point.x, 2) +
                Math.pow(worldPos.y - point.y, 2)
            );

            if (distance <= threshold) {
                if (isClick) {
                    this.selectedPointIndex = i;
                    return { type: 'select', index: i };
                }
                return { type: 'hover', index: i };
            }
        }

        // Check if clicking inside water to add new point
        if (isClick && this.points.length >= 3 && this.containsPoint(worldPos)) {
            // Add point near the edge
            const nearestEdgeIndex = this.getNearestEdgeIndex(worldPos);
            if (nearestEdgeIndex !== -1) {
                this.addPoint(worldPos, nearestEdgeIndex + 1);
                this.selectedPointIndex = nearestEdgeIndex + 1;
                return { type: 'add', index: this.selectedPointIndex };
            }
        }

        return null;
    }

    /**
     * Get the index of the nearest edge to a point
     * @param {Vector2} point - Point to test
     * @returns {number} Index of nearest edge, or -1 if not found
     */
    getNearestEdgeIndex(point) {
        if (this.points.length < 2) return -1;

        let nearestIndex = -1;
        let nearestDistance = Infinity;

        for (let i = 0; i < this.points.length; i++) {
            const p1 = this.points[i];
            const p2 = this.points[(i + 1) % this.points.length];

            // Calculate distance from point to line segment
            const distance = this.pointToLineDistance(point, p1, p2);

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = i;
            }
        }

        // Only return if close enough to an edge
        return nearestDistance <= 20 ? nearestIndex : -1;
    }

    /**
     * Calculate distance from a point to a line segment
     * @param {Vector2} point - Point to test
     * @param {Vector2} lineStart - Start of line segment
     * @param {Vector2} lineEnd - End of line segment
     * @returns {number} Distance to line segment
     */
    pointToLineDistance(point, lineStart, lineEnd) {
        const A = point.x - lineStart.x;
        const B = point.y - lineStart.y;
        const C = lineEnd.x - lineStart.x;
        const D = lineEnd.y - lineStart.y;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;

        if (lenSq === 0) {
            // Line segment is a point
            return Math.sqrt(A * A + B * B);
        }

        let param = dot / lenSq;

        let xx, yy;
        if (param < 0) {
            xx = lineStart.x;
            yy = lineStart.y;
        } else if (param > 1) {
            xx = lineEnd.x;
            yy = lineEnd.y;
        } else {
            xx = lineStart.x + param * C;
            yy = lineStart.y + param * D;
        }

        const dx = point.x - xx;
        const dy = point.y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    toJSON() {
        const json = super.toJSON();
        json.points = this.points.map(p => ({ x: p.x, y: p.y }));
        json.waterColor = this.waterColor;
        json.waterOpacity = this.waterOpacity;
        json.waterDepth = this.waterDepth;
        json.enableReflections = this.enableReflections;
        json.reflectionOpacity = this.reflectionOpacity;
        json.reflectionScale = this.reflectionScale;
        json.reflectionOffset = { x: this.reflectionOffset.x, y: this.reflectionOffset.y };
        json.enableCloudReflections = this.enableCloudReflections;
        json.cloudReflectionOpacity = this.cloudReflectionOpacity;
        json.cloudReflectionSpeed = this.cloudReflectionSpeed;
        json.cloudReflectionScale = this.cloudReflectionScale;
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
        if (json.waterColor !== undefined) this.waterColor = json.waterColor;
        if (json.waterOpacity !== undefined) this.waterOpacity = json.waterOpacity;
        if (json.waterDepth !== undefined) this.waterDepth = json.waterDepth;
        if (json.enableReflections !== undefined) this.enableReflections = json.enableReflections;
        if (json.reflectionOpacity !== undefined) this.reflectionOpacity = json.reflectionOpacity;
        if (json.reflectionScale !== undefined) this.reflectionScale = json.reflectionScale;
        if (json.reflectionOffset) this.reflectionOffset = new Vector2(json.reflectionOffset.x, json.reflectionOffset.y);
        if (json.enableCloudReflections !== undefined) this.enableCloudReflections = json.enableCloudReflections;
        if (json.cloudReflectionOpacity !== undefined) this.cloudReflectionOpacity = json.cloudReflectionOpacity;
        if (json.cloudReflectionSpeed !== undefined) this.cloudReflectionSpeed = json.cloudReflectionSpeed;
        if (json.cloudReflectionScale !== undefined) this.cloudReflectionScale = json.cloudReflectionScale;
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
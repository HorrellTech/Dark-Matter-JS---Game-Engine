/**
 * GravityFieldMatter - A physics module that creates gravitational fields for Matter.js
 * Can attract or repel dynamic RigidBody objects within a specified range
 */
class GravityFieldMatter extends Module {
    static allowMultiple = false; // Only one GravityFieldMatter per GameObject
    static namespace = "Matter.js";
    static description = "Creates gravitational fields that can attract or repel dynamic RigidBody objects";

    constructor() {
        super("GravityFieldMatter");

        // Core gravity field properties
        this.fieldType = "pull";        // "pull" (attract) or "push" (repel)
        this.strength = 100;            // Gravitational strength
        this.range = 200;               // Maximum range of effect
        this.falloffType = "linear";    // "linear", "quadratic", "none"
        this.minRange = 0;              // Minimum range (dead zone)

        // Performance and behavior settings
        this.affectSelf = false;        // Should it affect its own RigidBody?
        this.onlyAffectTagged = false;  // Only affect objects with specific tags
        this.requiredTags = [];         // Tags that objects must have to be affected
        this.excludedTags = [];         // Tags that prevent objects from being affected

        // Visual and debugging
        this.showGizmo = true;          // Show visual representation in editor
        this.gizmoColor = "#00ff00";    // Color for the gizmo
        this.gizmoAlpha = 0.3;          // Transparency of the gizmo

        // Internal state
        this.affectedBodies = new Set(); // Track currently affected bodies
        this.updateInterval = 16;       // Update every 16ms (~60fps)
        this.lastUpdateTime = 0;

        this.showPulse = false; // Enable pulse visualization
        this.pulseSpeed = 1.5;  // Speed of pulse animation
        this.pulseAlpha = 0.5;  // Max alpha for pulse

        // Expose properties to the inspector
        this.exposeProperty("fieldType", "enum", this.fieldType, {
            options: ["pull", "push"],
            onChange: (val) => { this.fieldType = val; }
        });

        this.exposeProperty("strength", "number", this.strength, {
            min: 0,
            max: 1000,
            step: 1,
            onChange: (val) => { this.strength = val; }
        });

        this.exposeProperty("range", "number", this.range, {
            min: 1,
            max: 2000,
            step: 1,
            onChange: (val) => { this.range = val; }
        });

        this.exposeProperty("minRange", "number", this.minRange, {
            min: 0,
            max: 500,
            step: 1,
            onChange: (val) => {
                this.minRange = Math.min(val, this.range - 1);
            }
        });

        this.exposeProperty("falloffType", "enum", this.falloffType, {
            options: ["none", "linear", "quadratic"],
            onChange: (val) => { this.falloffType = val; }
        });

        this.exposeProperty("affectSelf", "boolean", this.affectSelf, {
            onChange: (val) => { this.affectSelf = val; }
        });

        this.exposeProperty("onlyAffectTagged", "boolean", this.onlyAffectTagged, {
            onChange: (val) => { this.onlyAffectTagged = val; }
        });

        this.exposeProperty("showPulse", "boolean", this.showPulse, {
            onChange: (val) => { this.showPulse = val; }
        });
        this.exposeProperty("pulseSpeed", "number", this.pulseSpeed, {
            min: 0.1,
            max: 10,
            step: 0.1,
            onChange: (val) => { this.pulseSpeed = val; }
        });
        this.exposeProperty("pulseAlpha", "number", this.pulseAlpha, {
            min: 0,
            max: 1,
            step: 0.05,
            onChange: (val) => { this.pulseAlpha = val; }
        });

        this.exposeProperty("showGizmo", "boolean", this.showGizmo, {
            onChange: (val) => { this.showGizmo = val; }
        });

        this.exposeProperty("gizmoColor", "color", this.gizmoColor, {
            onChange: (val) => { this.gizmoColor = val; }
        });

        this.exposeProperty("gizmoAlpha", "number", this.gizmoAlpha, {
            min: 0,
            max: 1,
            step: 0.1,
            onChange: (val) => { this.gizmoAlpha = val; }
        });
    }

    /**
     * Initialize the gravity field when the component starts
     */
    start() {
        if (!window.physicsManager) {
            console.error("Physics manager not found. GravityFieldMatter requires a physics manager.");
            return;
        }

        this.lastUpdateTime = performance.now();
    }

    /**
     * Update the gravity field effects
     */
    loop(deltaTime) {
        if (!window.physicsManager || !this.gameObject) return;

        const currentTime = performance.now();
        if (currentTime - this.lastUpdateTime < this.updateInterval) {
            return;
        }
        this.lastUpdateTime = currentTime;

        const fieldPosition = this.gameObject.getWorldPosition();
        const allGameObjects = window.engine?.gameObjects || [];

        // Clear previously affected bodies
        this.affectedBodies.clear();

        // Find and affect all valid RigidBody objects
        for (const gameObject of allGameObjects) {
            if (!this.isValidTarget(gameObject, fieldPosition)) {
                continue;
            }

            const rigidBody = gameObject.getModule("RigidBody");
            if (!rigidBody || !rigidBody.body) {
                continue;
            }

            // Skip non-dynamic bodies
            if (rigidBody.bodyType !== "dynamic") {
                continue;
            }

            const targetPosition = gameObject.getWorldPosition();
            const distance = this.calculateDistance(fieldPosition, targetPosition);

            // Apply gravitational force
            this.applyGravitationalForce(rigidBody, fieldPosition, targetPosition, distance);
            this.affectedBodies.add(rigidBody.body);
        }
    }

    /**
 * Draws the pulse effect on the canvas context
 */
    draw(ctx) {
        if (!this.showPulse || !this.gameObject) return;

        const position = this.gameObject.getWorldPosition();
        const now = performance.now() / 1000;
        this._pulseTime = now * this.pulseSpeed;

        // Pulse parameters
        const pulseCount = 3;
        const maxRadius = this.range;
        const minRadius = this.minRange;
        const pulseInterval = maxRadius / pulseCount;

        for (let i = 0; i < pulseCount; i++) {
            // Calculate pulse progress (0 to 1)
            let progress = ((this._pulseTime + i * 0.5) % 1);
            let radius;
            if (this.fieldType === "push") {
                // Outward pulse
                radius = minRadius + progress * (maxRadius - minRadius);
            } else {
                // Inward pulse
                radius = maxRadius - progress * (maxRadius - minRadius);
            }

            // Fade alpha as pulse grows/shrinks
            const alpha = this.pulseAlpha * (1 - progress);

            ctx.save();
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.strokeStyle = this.gizmoColor;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.restore();
        }
    }

    /**
     * Check if a GameObject is a valid target for the gravity field
     */
    isValidTarget(gameObject, fieldPosition) {
        if (!gameObject || gameObject === this.gameObject) {
            return false;
        }

        // Check if we should affect ourselves
        if (gameObject === this.gameObject && !this.affectSelf) {
            return false;
        }

        const targetPosition = gameObject.getWorldPosition();
        const distance = this.calculateDistance(fieldPosition, targetPosition);

        // Check range
        if (distance > this.range || distance < this.minRange) {
            return false;
        }

        // Check tags if filtering is enabled
        if (this.onlyAffectTagged && this.requiredTags.length > 0) {
            const hasRequiredTag = this.requiredTags.some(tag => gameObject.tags?.includes(tag));
            if (!hasRequiredTag) {
                return false;
            }
        }

        // Check excluded tags
        if (this.excludedTags.length > 0) {
            const hasExcludedTag = this.excludedTags.some(tag => gameObject.tags?.includes(tag));
            if (hasExcludedTag) {
                return false;
            }
        }

        return true;
    }

    /**
     * Calculate distance between two points
     */
    calculateDistance(pos1, pos2) {
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Apply gravitational force to a RigidBody
     */
    applyGravitationalForce(rigidBody, fieldPosition, targetPosition, distance) {
        if (distance === 0) return;

        // Calculate direction vector
        let directionX = fieldPosition.x - targetPosition.x;
        let directionY = fieldPosition.y - targetPosition.y;

        // Normalize direction
        const magnitude = Math.sqrt(directionX * directionX + directionY * directionY);
        if (magnitude === 0) return;

        directionX /= magnitude;
        directionY /= magnitude;

        // For push fields, reverse the direction
        if (this.fieldType === "push") {
            directionX = -directionX;
            directionY = -directionY;
        }

        // Calculate force magnitude based on falloff type
        let forceMagnitude = this.strength;

        switch (this.falloffType) {
            case "linear":
                forceMagnitude *= (1 - (distance / this.range));
                break;
            case "quadratic":
                const normalizedDistance = distance / this.range;
                forceMagnitude *= (1 - normalizedDistance * normalizedDistance);
                break;
            case "none":
                // No falloff, use full strength
                break;
        }

        // Scale by mass for more realistic physics
        const mass = rigidBody.body.mass;
        forceMagnitude *= mass * 0.001; // Scale factor to make forces reasonable

        // Apply the force
        const force = {
            x: directionX * forceMagnitude,
            y: directionY * forceMagnitude
        };

        rigidBody.applyForce(force);
    }

    /**
     * Add a required tag for filtering
     */
    addRequiredTag(tag) {
        if (!this.requiredTags.includes(tag)) {
            this.requiredTags.push(tag);
        }
    }

    /**
     * Remove a required tag
     */
    removeRequiredTag(tag) {
        const index = this.requiredTags.indexOf(tag);
        if (index > -1) {
            this.requiredTags.splice(index, 1);
        }
    }

    /**
     * Add an excluded tag for filtering
     */
    addExcludedTag(tag) {
        if (!this.excludedTags.includes(tag)) {
            this.excludedTags.push(tag);
        }
    }

    /**
     * Remove an excluded tag
     */
    removeExcludedTag(tag) {
        const index = this.excludedTags.indexOf(tag);
        if (index > -1) {
            this.excludedTags.splice(index, 1);
        }
    }

    /**
     * Get all currently affected bodies
     */
    getAffectedBodies() {
        return Array.from(this.affectedBodies);
    }

    /**
     * Check if a specific body is being affected
     */
    isAffectingBody(body) {
        return this.affectedBodies.has(body);
    }

    /**
     * Render debug gizmo (if supported by the engine)
     */
    drawGizmos() {
        if (!this.showGizmo || !this.gameObject) return;

        const position = this.gameObject.getWorldPosition();

        // This would need to be implemented based on your rendering system
        // Example pseudo-code for drawing the gravity field visualization
        if (window.gizmoRenderer) {
            // Draw outer range circle
            window.gizmoRenderer.drawCircle(
                position.x,
                position.y,
                this.range,
                this.gizmoColor,
                this.gizmoAlpha
            );

            // Draw inner dead zone circle if minRange > 0
            if (this.minRange > 0) {
                window.gizmoRenderer.drawCircle(
                    position.x,
                    position.y,
                    this.minRange,
                    "#ff0000",
                    this.gizmoAlpha * 0.5
                );
            }

            // Draw center point
            window.gizmoRenderer.drawCircle(
                position.x,
                position.y,
                5,
                this.fieldType === "pull" ? "#00ff00" : "#ff0000",
                1.0
            );

            // Draw direction indicators
            const arrowLength = 20;
            const arrowCount = 8;
            for (let i = 0; i < arrowCount; i++) {
                const angle = (i / arrowCount) * Math.PI * 2;
                const startX = position.x + Math.cos(angle) * (this.minRange + 10);
                const startY = position.y + Math.sin(angle) * (this.minRange + 10);

                let endX, endY;
                if (this.fieldType === "pull") {
                    endX = position.x + Math.cos(angle) * (this.minRange + arrowLength);
                    endY = position.y + Math.sin(angle) * (this.minRange + arrowLength);
                } else {
                    endX = position.x + Math.cos(angle) * (this.minRange - arrowLength);
                    endY = position.y + Math.sin(angle) * (this.minRange - arrowLength);
                }

                window.gizmoRenderer?.drawArrow(startX, startY, endX, endY, "#ffffff", 0.8);
            }
        }
    }

    /**
     * Serialize the module
     */
    toJSON() {
        return {
            ...super.toJSON(),
            fieldType: this.fieldType,
            strength: this.strength,
            range: this.range,
            minRange: this.minRange,
            falloffType: this.falloffType,
            affectSelf: this.affectSelf,
            onlyAffectTagged: this.onlyAffectTagged,
            requiredTags: [...this.requiredTags],
            excludedTags: [...this.excludedTags],
            showGizmo: this.showGizmo,
            gizmoColor: this.gizmoColor,
            gizmoAlpha: this.gizmoAlpha,
            updateInterval: this.updateInterval
        };
    }

    /**
     * Deserialize the module
     */
    fromJSON(data) {
        super.fromJSON(data);
        this.fieldType = data.fieldType ?? this.fieldType;
        this.strength = data.strength ?? this.strength;
        this.range = data.range ?? this.range;
        this.minRange = data.minRange ?? this.minRange;
        this.falloffType = data.falloffType ?? this.falloffType;
        this.affectSelf = data.affectSelf ?? this.affectSelf;
        this.onlyAffectTagged = data.onlyAffectTagged ?? this.onlyAffectTagged;
        this.requiredTags = data.requiredTags ?? [];
        this.excludedTags = data.excludedTags ?? [];
        this.showGizmo = data.showGizmo ?? this.showGizmo;
        this.gizmoColor = data.gizmoColor ?? this.gizmoColor;
        this.gizmoAlpha = data.gizmoAlpha ?? this.gizmoAlpha;
        this.updateInterval = data.updateInterval ?? this.updateInterval;
    }
}

// Register the module
window.GravityFieldMatter = GravityFieldMatter;
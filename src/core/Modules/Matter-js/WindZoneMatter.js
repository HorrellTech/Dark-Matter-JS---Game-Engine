/**
 * WindZoneMatter - A physics module that creates wind zones for Matter.js
 * Applies wind forces to dynamic RigidBody objects within a rectangular area
 */
class WindZoneMatter extends Module {
    static allowMultiple = false; // Only one WindZoneMatter per GameObject
    static namespace = "Matter.js";
    static description = "Creates wind zones that apply forces to dynamic RigidBody objects for Matter.js";

    constructor() {
        super("WindZoneMatter");

        // Wind zone properties
        this.width = 200;               // Width of the wind zone
        this.height = 200;              // Height of the wind zone
        this.windDirection = 0;         // Wind direction in degrees (0 = right, 90 = down)
        this.windStrength = 50;         // Wind force strength
        this.turbulence = 0;            // Amount of random turbulence (0-1)
        this.falloffType = "none";      // "none", "linear", "quadratic"
        this.affectSelf = false;        // Should it affect its own RigidBody?

        // Filtering options
        this.onlyAffectTagged = false;  // Only affect objects with specific tags
        this.requiredTags = [];         // Tags that objects must have to be affected
        this.excludedTags = [];         // Tags that prevent objects from being affected

        // Visual and debugging
        this.showGizmo = true;          // Show visual representation
        this.gizmoColor = "#00aaff";    // Color for the gizmo
        this.gizmoAlpha = 0.3;          // Transparency of the gizmo
        this.showArrows = true;         // Show wind direction arrows
        this.arrowCount = 5;            // Number of arrows to show

        // Performance settings
        this.updateInterval = 16;       // Update every 16ms (~60fps)
        this.lastUpdateTime = 0;

        // Internal state
        this.affectedBodies = new Set(); // Track currently affected bodies

        // Expose properties to the inspector
        this.exposeProperty("width", "number", this.width, {
            min: 10,
            max: 2000,
            step: 10,
            onChange: (val) => { this.width = val; }
        });

        this.exposeProperty("height", "number", this.height, {
            min: 10,
            max: 2000,
            step: 10,
            onChange: (val) => { this.height = val; }
        });

        this.exposeProperty("windDirection", "number", this.windDirection, {
            min: 0,
            max: 360,
            step: 1,
            onChange: (val) => { this.windDirection = val % 360; }
        });

        this.exposeProperty("windStrength", "number", this.windStrength, {
            min: 0,
            max: 500,
            step: 1,
            onChange: (val) => { this.windStrength = val; }
        });

        this.exposeProperty("turbulence", "number", this.turbulence, {
            min: 0,
            max: 1,
            step: 0.05,
            onChange: (val) => { this.turbulence = val; }
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

        this.exposeProperty("showArrows", "boolean", this.showArrows, {
            onChange: (val) => { this.showArrows = val; }
        });

        this.exposeProperty("arrowCount", "number", this.arrowCount, {
            min: 1,
            max: 20,
            step: 1,
            onChange: (val) => { this.arrowCount = val; }
        });
    }

    /**
     * Initialize the wind zone when the component starts
     */
    start() {
        if (!window.physicsManager) {
            console.error("Physics manager not found. WindZoneMatter requires a physics manager.");
            return;
        }

        this.lastUpdateTime = performance.now();
    }

    /**
     * Update the wind zone effects
     */
    loop(deltaTime) {
        if (!window.physicsManager || !this.gameObject) return;

        const currentTime = performance.now();
        if (currentTime - this.lastUpdateTime < this.updateInterval) {
            return;
        }
        this.lastUpdateTime = currentTime;

        const windZonePosition = this.gameObject.getWorldPosition();
        const windZoneAngle = this.gameObject.angle * (Math.PI / 180);
        const allGameObjects = window.engine?.gameObjects || [];

        // Clear previously affected bodies
        this.affectedBodies.clear();

        // Find and affect all valid RigidBody objects
        for (const gameObject of allGameObjects) {
            if (!this.isValidTarget(gameObject)) {
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

            // Check if the target is within the wind zone rectangle
            if (this.isPointInWindZone(targetPosition, windZonePosition, windZoneAngle)) {
                // Apply wind force
                this.applyWindForce(rigidBody, targetPosition, windZonePosition, windZoneAngle);
                this.affectedBodies.add(rigidBody.body);
            }
        }
    }

    /**
     * Check if a GameObject is a valid target for the wind zone
     */
    isValidTarget(gameObject) {
        if (!gameObject || gameObject === this.gameObject) {
            return false;
        }

        // Check if we should affect ourselves
        if (gameObject === this.gameObject && !this.affectSelf) {
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
     * Check if a point is within the wind zone rectangle
     */
    isPointInWindZone(targetPosition, windZonePosition, windZoneAngle) {
        // Translate point to wind zone local space
        const dx = targetPosition.x - windZonePosition.x;
        const dy = targetPosition.y - windZonePosition.y;

        // Rotate point to align with wind zone orientation
        const cos = Math.cos(-windZoneAngle);
        const sin = Math.sin(-windZoneAngle);
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        // Check if point is within rectangle bounds
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;

        return localX >= -halfWidth && localX <= halfWidth &&
               localY >= -halfHeight && localY <= halfHeight;
    }

    /**
     * Apply wind force to a RigidBody
     */
    applyWindForce(rigidBody, targetPosition, windZonePosition, windZoneAngle) {
        // Calculate wind direction vector
        const windAngle = (this.windDirection + this.gameObject.angle) * (Math.PI / 180);
        let windX = Math.cos(windAngle);
        let windY = Math.sin(windAngle);

        // Add turbulence if enabled
        if (this.turbulence > 0) {
            const turbulenceX = (Math.random() - 0.5) * 2 * this.turbulence;
            const turbulenceY = (Math.random() - 0.5) * 2 * this.turbulence;
            windX += turbulenceX;
            windY += turbulenceY;

            // Renormalize
            const magnitude = Math.sqrt(windX * windX + windY * windY);
            if (magnitude > 0) {
                windX /= magnitude;
                windY /= magnitude;
            }
        }

        // Calculate force magnitude based on falloff type
        let forceMagnitude = this.windStrength;

        if (this.falloffType !== "none") {
            // Calculate distance from center of wind zone for falloff
            const dx = targetPosition.x - windZonePosition.x;
            const dy = targetPosition.y - windZonePosition.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = Math.sqrt(this.width * this.width + this.height * this.height) / 2;

            if (maxDistance > 0) {
                const normalizedDistance = Math.min(distance / maxDistance, 1);

                switch (this.falloffType) {
                    case "linear":
                        forceMagnitude *= (1 - normalizedDistance);
                        break;
                    case "quadratic":
                        forceMagnitude *= (1 - normalizedDistance * normalizedDistance);
                        break;
                }
            }
        }

        // Scale by mass for more realistic physics
        const mass = rigidBody.body.mass;
        forceMagnitude *= mass * 0.001; // Scale factor to make forces reasonable

        // Apply the force
        const force = {
            x: windX * forceMagnitude,
            y: windY * forceMagnitude
        };

        rigidBody.applyForce(force);
    }

    /**
     * Draw wind direction arrows
     */
    drawWindArrows(position, zoneAngle) {

        const windAngle = (this.windDirection + this.gameObject.angle) * (Math.PI / 180);
        const arrowLength = Math.min(this.width, this.height) * 0.3;
        const arrowSpacing = Math.max(this.width, this.height) / (this.arrowCount + 1);

        // Calculate arrow positions across the wind zone
        for (let i = 1; i <= this.arrowCount; i++) {
            // Position arrows along the perpendicular axis to wind direction
            const perpAngle = windAngle + Math.PI / 2;
            const offset = (i - (this.arrowCount + 1) / 2) * arrowSpacing;
            
            const arrowX = position.x + Math.cos(perpAngle) * offset * 0.5;
            const arrowY = position.y + Math.sin(perpAngle) * offset * 0.5;

            const startX = arrowX - Math.cos(windAngle) * arrowLength * 0.5;
            const startY = arrowY - Math.sin(windAngle) * arrowLength * 0.5;
            const endX = arrowX + Math.cos(windAngle) * arrowLength * 0.5;
            const endY = arrowY + Math.sin(windAngle) * arrowLength * 0.5;

            window.gizmoRenderer.drawArrow(startX, startY, endX, endY, "#ffffff", 0.8);
        }
    }

    /**
     * Draw the wind zone and arrows on canvas context
     */
    draw(ctx) {
        if (!this.showGizmo || !this.gameObject) return;

        const position = {x: 0, y: 0};
        const angle = this.gameObject.angle * (Math.PI / 180);

        ctx.save();
        //ctx.translate(position.x, position.y);
        //ctx.rotate(angle);

        // Draw wind zone rectangle
        ctx.strokeStyle = this.gizmoColor;
        ctx.globalAlpha = this.gizmoAlpha;
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // Fill rectangle with low alpha
        ctx.fillStyle = this.gizmoColor;
        ctx.globalAlpha = this.gizmoAlpha * 0.2;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // Draw wind direction arrows if enabled
        if (this.showArrows) {
            ctx.globalAlpha = 0.8;
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;

            const windAngle = this.windDirection * (Math.PI / 180);
            const arrowLength = Math.min(this.width, this.height) * 0.2;
            const arrowSpacing = Math.max(this.width, this.height) / (this.arrowCount + 1);

            for (let i = 1; i <= this.arrowCount; i++) {
                const perpAngle = windAngle + Math.PI / 2;
                const offset = (i - (this.arrowCount + 1) / 2) * arrowSpacing * 0.5;
                
                const arrowX = Math.cos(perpAngle) * offset;
                const arrowY = Math.sin(perpAngle) * offset;

                const startX = arrowX - Math.cos(windAngle) * arrowLength * 0.5;
                const startY = arrowY - Math.sin(windAngle) * arrowLength * 0.5;
                const endX = arrowX + Math.cos(windAngle) * arrowLength * 0.5;
                const endY = arrowY + Math.sin(windAngle) * arrowLength * 0.5;

                // Draw arrow line
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                // Draw arrowhead
                const headLength = arrowLength * 0.3;
                const headAngle = Math.PI / 6;

                ctx.beginPath();
                ctx.moveTo(endX, endY);
                ctx.lineTo(
                    endX - headLength * Math.cos(windAngle - headAngle),
                    endY - headLength * Math.sin(windAngle - headAngle)
                );
                ctx.moveTo(endX, endY);
                ctx.lineTo(
                    endX - headLength * Math.cos(windAngle + headAngle),
                    endY - headLength * Math.sin(windAngle + headAngle)
                );
                ctx.stroke();
            }
        }

        ctx.restore();
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
     * Serialize the module
     */
    toJSON() {
        return {
            ...super.toJSON(),
            width: this.width,
            height: this.height,
            windDirection: this.windDirection,
            windStrength: this.windStrength,
            turbulence: this.turbulence,
            falloffType: this.falloffType,
            affectSelf: this.affectSelf,
            onlyAffectTagged: this.onlyAffectTagged,
            requiredTags: [...this.requiredTags],
            excludedTags: [...this.excludedTags],
            showGizmo: this.showGizmo,
            gizmoColor: this.gizmoColor,
            gizmoAlpha: this.gizmoAlpha,
            showArrows: this.showArrows,
            arrowCount: this.arrowCount,
            updateInterval: this.updateInterval
        };
    }

    /**
     * Deserialize the module
     */
    fromJSON(data) {
        super.fromJSON(data);
        this.width = data.width ?? this.width;
        this.height = data.height ?? this.height;
        this.windDirection = data.windDirection ?? this.windDirection;
        this.windStrength = data.windStrength ?? this.windStrength;
        this.turbulence = data.turbulence ?? this.turbulence;
        this.falloffType = data.falloffType ?? this.falloffType;
        this.affectSelf = data.affectSelf ?? this.affectSelf;
        this.onlyAffectTagged = data.onlyAffectTagged ?? this.onlyAffectTagged;
        this.requiredTags = data.requiredTags ?? [];
        this.excludedTags = data.excludedTags ?? [];
        this.showGizmo = data.showGizmo ?? this.showGizmo;
        this.gizmoColor = data.gizmoColor ?? this.gizmoColor;
        this.gizmoAlpha = data.gizmoAlpha ?? this.gizmoAlpha;
        this.showArrows = data.showArrows ?? this.showArrows;
        this.arrowCount = data.arrowCount ?? this.arrowCount;
        this.updateInterval = data.updateInterval ?? this.updateInterval;
    }
}

// Register the module
window.WindZoneMatter = WindZoneMatter;
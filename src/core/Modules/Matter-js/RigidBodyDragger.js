/**
 * RigidBodyDragger - Module that allows dragging RigidBody objects with mouse/touch
 */
class RigidBodyDragger extends Module {
    static allowMultiple = false; // Only one Draggable per GameObject
    static namespace = "Physics";
    static description = "Allows dragging RigidBody objects with mouse and touch input";

    constructor() {
        super("RigidBodyDragger");

        // Dragging state
        this.isDragging = false;
        this.dragOffset = new Vector2(0, 0);
        this.lastMousePos = new Vector2(0, 0);
        this.dragStartPos = new Vector2(0, 0);
        this.originalBodyType = null;
        this.touchId = null; // For touch input

        // Dragging options
        this.enabled = true;
        this.dragButton = "left"; // Which mouse button to use
        this.maintainVelocity = false; // Whether to maintain velocity when releasing
        this.damping = 0.95; // How much to damp the dragging force
        this.force = 0.1; // Force multiplier for dragging
        this.maxDistance = null; // Maximum distance from original position (null = unlimited)
        this.constrainToArea = null; // Constrain dragging to a specific area {x, y, width, height}

        // Visual feedback
        this.showDragIndicator = true;
        this.dragIndicatorColor = "#00ff00";
        this.dragIndicatorAlpha = 0.5;

        // Internal references
        this.rigidBody = null;
        this.originalPosition = null;

        // Expose properties to inspector
        this.exposeProperty("enabled", "boolean", this.enabled);
        this.exposeProperty("dragButton", "enum", this.dragButton, {
            options: ["left", "middle", "right"],
            onChange: (val) => { this.dragButton = val; }
        });
        this.exposeProperty("maintainVelocity", "boolean", this.maintainVelocity);
        this.exposeProperty("damping", "number", this.damping, {
            min: 0.01,
            max: 1.0,
            step: 0.01
        });
        this.exposeProperty("force", "number", this.force, {
            min: 0.001,
            max: 1.0,
            step: 0.001
        });
        this.exposeProperty("showDragIndicator", "boolean", this.showDragIndicator);
    }

    /**
     * Initialize the draggable component
     */
    start() {
        // Get the RigidBody component
        this.rigidBody = this.gameObject.getModule("RigidBody");
        
        if (!this.rigidBody) {
            console.warn(`Draggable module on ${this.gameObject.name} requires a RigidBody component`);
            return;
        }

        // Store original position for distance constraints
        if (this.gameObject) {
            const pos = this.gameObject.getWorldPosition();
            this.originalPosition = new Vector2(pos.x, pos.y);
        }
    }

    /**
     * Update dragging logic each frame
     */
    loop() {
        if(!this.rigidBody) {
            this.rigidBody = this.gameObject.getModule("RigidBody");
        }

        this.handleMouseInput();
        this.handleTouchInput();
        this.updateDragging();
    }

    /**
     * Handle mouse input for dragging
     */
    handleMouseInput() {
        if (!window.input) {
            console.warn("RigidBodyDragger: InputManager not found");
            return;
        }

        const mousePos = window.input.getMousePosition(true); // Get world coordinates
        
        // Start dragging
        if (!this.isDragging && window.input.mousePressed(0)) {
            if (this.isPointOverObject(mousePos)) {
                this.startDragging(mousePos);
            }
        }

        // Stop dragging
        if (this.isDragging && window.input.mouseReleased(this.dragButton)) {
            this.stopDragging();
        }

        // Update mouse position for dragging
        if (this.isDragging && this.touchId === null) {
            this.lastMousePos = mousePos;
        }
    }

    /**
     * Handle touch input for dragging
     */
    handleTouchInput() {
        if (!window.input) return;

        const touches = window.input.getTouches();
        const touchesStarted = window.input.touchesStarted;
        const touchesEnded = window.input.touchesEnded;

        // Start dragging with touch
        if (!this.isDragging) {
            for (const id in touchesStarted) {
                const touch = touchesStarted[id];
                if (this.isPointOverObject(touch.position)) {
                    this.touchId = id;
                    this.startDragging(touch.position);
                    break;
                }
            }
        }

        // Update touch position for dragging
        if (this.isDragging && this.touchId !== null && touches[this.touchId]) {
            this.lastMousePos = touches[this.touchId].position;
        }

        // Stop dragging when touch ends
        if (this.isDragging && this.touchId !== null && touchesEnded[this.touchId]) {
            this.stopDragging();
        }
    }

    /**
     * Check if a point is over this object
     * @param {Vector2} point - The point to check
     * @returns {boolean} True if point is over the object
     */
    isPointOverObject(point) {
        if (!this.rigidBody) {
            console.warn("RigidBodyDragger: No RigidBody component found");
            return false;
        }

        // Use Matter.js collision detection
        const bodies = Matter.Query.point([this.rigidBody.body], point);
        console.log('Bodies under point:', bodies);
        return bodies.length > 0;
    }

    /**
     * Start dragging the object
     * @param {Vector2} startPos - The starting position
     */
    startDragging(startPos) {
        if (!this.rigidBody || !this.rigidBody.body) return;

        this.isDragging = true;
        this.dragStartPos = startPos.clone();
        this.lastMousePos = startPos.clone();

        // Calculate drag offset from object center
        const bodyPos = this.rigidBody.body.position;
        this.dragOffset = new Vector2(
            startPos.x - bodyPos.x,
            startPos.y - bodyPos.y
        );

        // Store original body type and make it kinematic for smooth dragging
        this.originalBodyType = this.rigidBody.bodyType;
        if (this.originalBodyType === "dynamic") {
            // Instead of setPosition, apply velocity towards target
            const velocity = {
                x: (targetPos.x - currentPos.x) * this.force,
                y: (targetPos.y - currentPos.y) * this.force
            };
            Matter.Body.setVelocity(this.rigidBody.body, velocity);
        } else {
            Matter.Body.setPosition(this.rigidBody.body, targetPos);
        }

        // Call drag start event if it exists
        if (this.gameObject.onDragStart) {
            this.gameObject.onDragStart();
        }
    }

    /**
     * Stop dragging the object
     */
    stopDragging() {
        if (!this.isDragging) return;

        this.isDragging = false;
        this.touchId = null;

        // Restore original body type
        if (this.rigidBody && this.rigidBody.body && this.originalBodyType) {
            if (this.originalBodyType === "dynamic") {
                // Restore dynamic properties
                this.rigidBody.body.isStatic = false;
                
                // Recalculate inertia based on shape
                if (this.rigidBody.shape === "circle") {
                    const mass = this.rigidBody.body.mass;
                    const radius = this.rigidBody.radius;
                    this.rigidBody.body.inertia = mass * radius * radius;
                } else {
                    // Use Matter.js built-in calculation for other shapes
                    const vertices = this.rigidBody.body.vertices;
                    const centre = this.rigidBody.body.position;
                    let inertia = 0;
                    
                    for (let i = 0; i < vertices.length; i++) {
                        const vertex = vertices[i];
                        const dx = vertex.x - centre.x;
                        const dy = vertex.y - centre.y;
                        const distSq = dx * dx + dy * dy;
                        inertia += distSq;
                    }
                    
                    this.rigidBody.body.inertia = this.rigidBody.body.mass * (inertia / vertices.length);
                }
                
                this.rigidBody.body.inverseInertia = 1 / this.rigidBody.body.inertia;

                // Apply momentum if maintaining velocity
                if (this.maintainVelocity && this.lastMousePos && this.dragStartPos) {
                    const velocity = new Vector2(
                        (this.lastMousePos.x - this.dragStartPos.x) * 0.1,
                        (this.lastMousePos.y - this.dragStartPos.y) * 0.1
                    );
                    Matter.Body.setVelocity(this.rigidBody.body, velocity);
                }
            }
        }

        // Call drag end event if it exists
        if (this.gameObject.onDragEnd) {
            this.gameObject.onDragEnd();
        }
    }

    /**
     * Update dragging physics
     */
    updateDragging() {
        if (!this.isDragging || !this.rigidBody || !this.rigidBody.body) return;

        // Calculate target position
        const targetPos = new Vector2(
            this.lastMousePos.x - this.dragOffset.x,
            this.lastMousePos.y - this.dragOffset.y
        );

        // Apply distance constraint
        if (this.maxDistance && this.originalPosition) {
            const distance = targetPos.distanceTo(this.originalPosition);
            if (distance > this.maxDistance) {
                const direction = targetPos.subtract(this.originalPosition).normalize();
                targetPos.x = this.originalPosition.x + direction.x * this.maxDistance;
                targetPos.y = this.originalPosition.y + direction.y * this.maxDistance;
            }
        }

        // Apply area constraint
        if (this.constrainToArea) {
            const area = this.constrainToArea;
            targetPos.x = Math.max(area.x, Math.min(area.x + area.width, targetPos.x));
            targetPos.y = Math.max(area.y, Math.min(area.y + area.height, targetPos.y));
        }

        // Move the body towards target position
        const currentPos = this.rigidBody.body.position;
        const force = new Vector2(
            (targetPos.x - currentPos.x) * this.force,
            (targetPos.y - currentPos.y) * this.force
        );

        // Apply damping
        force.x *= this.damping;
        force.y *= this.damping;

        // For kinematic bodies, set position directly for smoother movement
        if (this.originalBodyType === "dynamic") {
            Matter.Body.setPosition(this.rigidBody.body, {
                x: currentPos.x + force.x,
                y: currentPos.y + force.y
            });
        } else {
            // For static bodies, just set position
            Matter.Body.setPosition(this.rigidBody.body, targetPos);
        }

        // Call drag update event if it exists
        if (this.gameObject.onDragUpdate) {
            this.gameObject.onDragUpdate(targetPos);
        }
    }

    /**
     * Render drag indicator if enabled
     */
    render(ctx) {
        if (!this.showDragIndicator || !this.isDragging || !this.rigidBody) return;

        ctx.save();
        ctx.globalAlpha = this.dragIndicatorAlpha;
        ctx.strokeStyle = this.dragIndicatorColor;
        ctx.lineWidth = 2;

        // Draw line from drag start to current position
        if (this.dragStartPos && this.lastMousePos) {
            ctx.beginPath();
            ctx.moveTo(this.dragStartPos.x, this.dragStartPos.y);
            ctx.lineTo(this.lastMousePos.x, this.lastMousePos.y);
            ctx.stroke();
        }

        // Draw circle around dragged object
        if (this.rigidBody.body) {
            const pos = this.rigidBody.body.position;
            const radius = Math.max(this.rigidBody.width || 50, this.rigidBody.height || 50) / 2 + 10;
            
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Set maximum drag distance from original position
     * @param {number} distance - Maximum distance (null for unlimited)
     */
    setMaxDistance(distance) {
        this.maxDistance = distance;
    }

    /**
     * Set area constraint for dragging
     * @param {Object} area - Area bounds {x, y, width, height} (null for no constraint)
     */
    setConstraintArea(area) {
        this.constrainToArea = area;
    }

    /**
     * Check if object is currently being dragged
     * @returns {boolean} True if being dragged
     */
    getIsDragging() {
        return this.isDragging;
    }

    /**
     * Get the current drag position
     * @returns {Vector2|null} Current drag position or null if not dragging
     */
    getDragPosition() {
        return this.isDragging ? this.lastMousePos.clone() : null;
    }

    /**
     * Force stop dragging
     */
    forceStopDragging() {
        if (this.isDragging) {
            this.stopDragging();
        }
    }

    /**
     * Enable/disable dragging
     * @param {boolean} enabled - Whether dragging is enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled && this.isDragging) {
            this.forceStopDragging();
        }
    }

    /**
     * Cleanup when module is destroyed
     */
    onDestroy() {
        if (this.isDragging) {
            this.stopDragging();
        }
    }

    /**
     * Serialize the module
     */
    toJSON() {
        return {
            ...super.toJSON(),
            enabled: this.enabled,
            dragButton: this.dragButton,
            maintainVelocity: this.maintainVelocity,
            damping: this.damping,
            force: this.force,
            maxDistance: this.maxDistance,
            constrainToArea: this.constrainToArea,
            showDragIndicator: this.showDragIndicator,
            dragIndicatorColor: this.dragIndicatorColor,
            dragIndicatorAlpha: this.dragIndicatorAlpha
        };
    }

    /**
     * Deserialize the module
     */
    fromJSON(data) {
        super.fromJSON(data);
        this.enabled = data.enabled ?? this.enabled;
        this.dragButton = data.dragButton ?? this.dragButton;
        this.maintainVelocity = data.maintainVelocity ?? this.maintainVelocity;
        this.damping = data.damping ?? this.damping;
        this.force = data.force ?? this.force;
        this.maxDistance = data.maxDistance ?? this.maxDistance;
        this.constrainToArea = data.constrainToArea ?? this.constrainToArea;
        this.showDragIndicator = data.showDragIndicator ?? this.showDragIndicator;
        this.dragIndicatorColor = data.dragIndicatorColor ?? this.dragIndicatorColor;
        this.dragIndicatorAlpha = data.dragIndicatorAlpha ?? this.dragIndicatorAlpha;
    }
}

// Register the module
window.RigidBodyDragger = RigidBodyDragger;
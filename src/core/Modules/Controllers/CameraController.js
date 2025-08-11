/**
 * CameraController - Controls the game's camera view
 * 
 * This module provides smooth camera movement and zoom capabilities.
 * When attached to a GameObject, the camera automatically follows that object.
 */
class CameraController extends Module {
    static allowMultiple = false;
    static namespace = "Camera";
    static description = "Control the viewport camera for the game scene. ";
    static iconClass = "fas fa-video";

    constructor() {
        super("CameraController");

        // Camera position (in world coordinates)
        this.position = new Vector2(0, 0);

        // Camera settings
        this.followSpeed = 5.0;
        this.zoomSpeed = 2.0;
        this.zoom = 1.0;
        this.targetZoom = 1.0;
        this.bounds = null; // Optional camera bounds {x, y, width, height}

        // Offset from attached object (useful for looking ahead)
        this.offset = new Vector2(0, 0);

        // Damping (smoothness) values
        this.positionDamping = 0.85;
        this.zoomDamping = 0.85;

        // Shake effect properties
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTimer = 0;
        this.shakeDecay = 1;

        // Auto-follow settings
        this.followOwner = true;
        this.followOwnerAngle = false; // Angle to follow the owner at
        this.followAngleOffset = 0; // Angle offset when following owner
        this.currentAngle = 0; // Current camera angle for smooth lerping
        this.targetAngle = 0; // Target angle for smooth lerping

        // Expose properties
        this.exposeProperty("followOwner", "boolean", true, {
            description: "Whether camera follows this GameObject",
            onChange: (val) => { this.followOwner = val; }
        });

        /*this.exposeProperty("followOwnerAngle", "boolean", false, {
            description: "Whether camera follows the owner's angle",
            onChange: (val) => { this.followOwnerAngle = val; }
        });*/

        this.exposeProperty("followAngleOffset", "number", 0, {
            description: "Angle offset when following owner",
            min: -Math.PI,
            max: Math.PI,
            step: 0.01,
            onChange: (val) => { this.followAngleOffset = val; }
        });

        this.exposeProperty("followSpeed", "number", 5.0, {
            description: "How quickly the camera follows its target",
            min: 0.1,
            max: 20,
            step: 0.1,
            onChange: (val) => { this.followSpeed = val; }
        });

        this.exposeProperty("zoom", "number", 1.0, {
            description: "Camera zoom level (1.0 = 100%)",
            min: 0.1,
            max: 10,
            step: 0.1,
            onChange: (val) => { this.zoom = val; }
        });

        this.exposeProperty("positionDamping", "number", 0.85, {
            description: "Smoothness of camera movement (0-1)",
            min: 0,
            max: 0.99,
            step: 0.01,
            onChange: (val) => { this.positionDamping = val; }
        });

        this.exposeProperty("zoomDamping", "number", 0.85, {
            description: "Smoothness of camera zoom (0-1)",
            min: 0,
            max: 0.99,
            step: 0.01,
            onChange: (val) => { this.zoomDamping = val; }
        });

        this.exposeProperty("shakeIntensity", "number", 0, {
            description: "Intensity of camera shake effect",
            min: 0,
            max: 100,
            step: 1,
            onChange: (val) => { this.shakeIntensity = val; }
        });

        this.exposeProperty("shakeTimer", "number", 0, {
            description: "Internal timer for shake effect",
            readOnly: true,
            onChange: (val) => { this.shakeTimer = val; }
        });

        this.exposeProperty("offset", "vector2", this.offset, {
            description: "Camera offset from this GameObject",
            onChange: (val) => {
                this.offset = new Vector2(val.x, val.y);
                //this.updateSceneViewport(); // Update immediately
            }
        });
    }

    /**
     * Called when the module is first attached
     */
    onAttach(gameObject) {
        // Initialize camera position to the GameObject's position
        const pos = gameObject.getWorldPosition();
        this.position = new Vector2(pos.x, pos.y);

        // Initialize the scene viewport immediately to prevent black screen
        this.updateSceneViewport();
    }

    /**
     * Get the target position (including offset)
     */
    getTargetPosition() {
        if (!this.gameObject || !this.followOwner) return this.position.clone();

        const targetPos = this.gameObject.getWorldPosition();
        return new Vector2(
            targetPos.x + this.offset.x,
            targetPos.y + this.offset.y
        );
    }

    /**
     * Immediately move the camera to the target without smoothing
     */
    jumpToTarget() {
        this.position = this.getTargetPosition();
        //this.applyBounds();
        this.updateSceneViewport();
    }

    /**
     * Move camera to specific world position with optional smoothing
     * @param {Vector2} position - World position to move to
     * @param {boolean} immediate - If true, jump immediately without smoothing
     */
    moveTo(position, immediate = false) {
        // Temporarily disable following while moving to a specific point
        const wasFollowing = this.followOwner;
        this.followOwner = false;

        if (immediate) {
            this.position = position.clone();
            //this.applyBounds();
            this.updateSceneViewport();
        } else {
            this._targetPosition = position.clone();
        }

        // After 1 second, restore original following state
        if (wasFollowing) {
            setTimeout(() => {
                this.followOwner = wasFollowing;
            }, 1000);
        }
    }

    /**
     * Set camera zoom level
     * @param {number} zoomLevel - New zoom level
     * @param {boolean} immediate - If true, apply immediately without smoothing
     */
    setZoom(zoomLevel, immediate = false) {
        this.targetZoom = Math.max(0.1, zoomLevel);

        if (immediate) {
            this.zoom = this.targetZoom;
            this.updateSceneViewport();
        }
    }

    /**
     * Apply a camera shake effect
     * @param {number} intensity - Shake intensity
     * @param {number} duration - Shake duration in seconds
     */
    shake(intensity = 10, duration = 0.5) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
        this.shakeTimer = duration;
    }

    /**
     * Constrain camera to bounds if set
     */
    applyBounds() {
        if (!this.bounds) return;

        // Get half-viewport dimensions
        const engine = window.engine;
        if (!engine || !engine.scene) return;

        const settings = engine.scene.settings || {};
        const viewportWidth = settings.viewportWidth || 800;
        const viewportHeight = settings.viewportHeight || 600;
        const halfWidth = (viewportWidth / 2) / this.zoom;
        const halfHeight = (viewportHeight / 2) / this.zoom;

        // Constrain to bounds with viewport consideration
        if (this.bounds) {
            this.position.x = Math.max(
                this.bounds.x + halfWidth,
                Math.min(this.bounds.x + this.bounds.width - halfWidth, this.position.x)
            );
            this.position.y = Math.max(
                this.bounds.y + halfHeight,
                Math.min(this.bounds.y + this.bounds.height - halfHeight, this.position.y)
            );
        }
    }

    /**
     * Update the scene's viewport settings based on camera position/zoom
     */
    updateSceneViewport() {
        const engine = window.engine;
        if (!engine) {
            console.warn("CameraController: Engine not available, cannot update viewport.");
            return;
        }

        const viewportWidth = engine.viewport.width ? engine.viewport.width : 800;
        const viewportHeight = engine.viewport.height ? engine.viewport.height : 600;

        let centerX = this.position.x;
        let centerY = this.position.y;

        // Apply shake effect if active
        let shakeOffsetX = 0;
        let shakeOffsetY = 0;

        let halfWidth = viewportWidth / 2 / this.zoom;
        let halfHeight = viewportHeight / 2 / this.zoom;

        // Use the smoothly lerped angle
        engine.viewport.angle = this.currentAngle;

        if (this.shakeTimer > 0) {
            shakeOffsetX = (Math.random() * 2 - 1) * this.shakeIntensity;
            shakeOffsetY = (Math.random() * 2 - 1) * this.shakeIntensity;
        }

        // Always use the camera's interpolated position, regardless of angle following
        engine.viewport.x = (centerX - halfWidth + shakeOffsetX);
        engine.viewport.y = (centerY - halfHeight + shakeOffsetY);

        engine.viewport.width = viewportWidth;
        engine.viewport.height = viewportHeight;
        engine.viewport.zoom = this.zoom;

        if (engine.resizeCanvas) {
            engine.resizeCanvas();
        }
    }

    /**
     * Main update loop
     * @param {number} deltaTime - Time since last frame in seconds
     */
    loop(deltaTime) {
        // Handle following with smooth lerp
        const targetPos = this.followOwner ? this.getTargetPosition() : (this._targetPosition || this.position);

        // Update target angle if following owner angle
        if (this.followOwnerAngle && this.gameObject) {
            // Get the owner's angle directly - it should already be in the correct format
            this.targetAngle = this.gameObject.angle + this.followAngleOffset;
        } else {
            this.targetAngle = 0;
        }

        // Smoothly move towards target position
        if (!this.position.equals(targetPos)) {
            // Calculate how far to move this frame using follow speed
            const lerpFactor = 1.0 - Math.pow(this.positionDamping, deltaTime * this.followSpeed);

            this.position.x = this.position.x + (targetPos.x - this.position.x) * lerpFactor;
            this.position.y = this.position.y + (targetPos.y - this.position.y) * lerpFactor;
        }

        // Smooth angle changes when following owner angle
        if (this.followOwnerAngle && this.gameObject) {
            // Use the same lerp factor as position for consistent feel
            const angleLerpFactor = 1.0 - Math.pow(this.positionDamping, deltaTime * this.followSpeed);

            // Handle angle wrapping for shortest rotation path
            let angleDiff = this.targetAngle - this.currentAngle;

            // Normalize angle difference to [-π, π] for shortest rotation
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

            this.currentAngle += angleDiff * angleLerpFactor;
        } else if (!this.followOwnerAngle) {
            // Reset to 0 when not following angle
            if (Math.abs(this.currentAngle) > 0.001) {
                const angleLerpFactor = 1.0 - Math.pow(this.positionDamping, deltaTime * this.followSpeed);
                
                let angleDiff = -this.currentAngle;
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                
                this.currentAngle += angleDiff * angleLerpFactor;
                
                if (Math.abs(this.currentAngle) < 0.001) {
                    this.currentAngle = 0;
                }
            }
        }

        // Smooth zoom changes
        if (this.zoom !== this.targetZoom) {
            const zoomLerpFactor = 1.0 - Math.pow(this.zoomDamping, deltaTime * this.zoomSpeed);
            this.zoom += (this.targetZoom - this.zoom) * zoomLerpFactor;

            // Snap to target when close enough
            if (Math.abs(this.zoom - this.targetZoom) < 0.001) {
                this.zoom = this.targetZoom;
            }
        }

        // Update shake effect
        if (this.shakeTimer > 0) {
            this.shakeTimer -= deltaTime;
            if (this.shakeTimer <= 0) {
                this.shakeTimer = 0;
                this.shakeIntensity = 0;
            } else {
                // Gradually reduce intensity over time
                this.shakeIntensity *= this.shakeDecay;
            }
        }

        // Ensure camera stays within bounds
        //this.applyBounds();

        // Update the actual viewport in the scene
        this.updateSceneViewport();
    }

    /**
     * Set camera bounds
     * @param {number} x - Left boundary
     * @param {number} y - Top boundary
     * @param {number} width - Boundary width
     * @param {number} height - Boundary height
     */
    setBounds(x, y, width, height) {
        this.bounds = { x, y, width, height };
        //this.applyBounds(); // Apply immediately
    }

    /**
     * Clear camera bounds
     */
    clearBounds() {
        this.bounds = null;
    }

    /**
     * Pan the camera by a given amount (in world units)
     * @param {number} dx - Amount to move in X
     * @param {number} dy - Amount to move in Y
     * @param {boolean} immediate - If true, move instantly
     */
    pan(dx, dy, immediate = false) {
        this.followOwner = false; // Disable auto-follow when panning manually
        const newPos = new Vector2(this.position.x + dx, this.position.y + dy);
        this.moveTo(newPos, immediate);
    }

    /**
     * Center camera on a specific world position
     * @param {number} x
     * @param {number} y
     * @param {boolean} immediate
     */
    centerOn(x, y, immediate = false) {
        this.followOwner = false;
        this.moveTo(new Vector2(x, y), immediate);
    }

    /**
     * Called when the module is enabled 
     */
    onEnable() {
        // Make sure viewport is updated when module is enabled
        if (this.gameObject) {
            const pos = this.gameObject.getWorldPosition();
            this.position = new Vector2(pos.x, pos.y);
            this.updateSceneViewport();
        }
    }

    /**
     * Called when the module is first attached
     */
    onAttach(gameObject) {
        // Initialize camera position to the GameObject's position
        const pos = gameObject.getWorldPosition();
        this.position = new Vector2(pos.x, pos.y);

        // Initialize the scene viewport immediately to prevent black screen
        setTimeout(() => {
            // Using setTimeout ensures the engine is fully initialized
            this.jumpToTarget();
        }, 0);
    }

    /**
     * Override to handle serialization
     */
    toJSON() {
        const json = super.toJSON() || {};

        // Store camera properties
        json.position = { x: this.position.x, y: this.position.y };
        json.zoom = this.zoom;
        json.targetZoom = this.targetZoom;
        json.followOwner = this.followOwner;
        json.followSpeed = this.followSpeed;
        json.zoomSpeed = this.zoomSpeed;
        json.positionDamping = this.positionDamping;
        json.zoomDamping = this.zoomDamping;
        json.offset = { x: this.offset.x, y: this.offset.y };
        json.followOwnerAngle = this.followOwnerAngle;
        json.followAngleOffset = this.followAngleOffset;
        json.currentAngle = this.currentAngle;
        json.targetAngle = this.targetAngle;

        // Store bounds if set
        if (this.bounds) {
            json.bounds = { ...this.bounds };
        }

        return json;
    }

    /**
     * Override to handle deserialization
     */
    fromJSON(json) {
        super.fromJSON(json);

        if (!json) return;

        // Restore camera properties
        if (json.position) {
            this.position = new Vector2(json.position.x, json.position.y);
        }

        if (json.zoom !== undefined) this.zoom = json.zoom;
        if (json.targetZoom !== undefined) this.targetZoom = json.targetZoom;
        if (json.followOwner !== undefined) this.followOwner = json.followOwner;
        if (json.followSpeed !== undefined) this.followSpeed = json.followSpeed;
        if (json.zoomSpeed !== undefined) this.zoomSpeed = json.zoomSpeed;
        if (json.positionDamping !== undefined) this.positionDamping = json.positionDamping;
        if (json.zoomDamping !== undefined) this.zoomDamping = json.zoomDamping;
        if (json.followOwnerAngle !== undefined) this.followOwnerAngle = json.followOwnerAngle;
        if (json.followAngleOffset !== undefined) this.followAngleOffset = json.followAngleOffset;
        if (json.currentAngle !== undefined) this.currentAngle = json.currentAngle;
        if (json.targetAngle !== undefined) this.targetAngle = json.targetAngle;

        if (json.offset) {
            this.offset = new Vector2(json.offset.x, json.offset.y);
        }

        // Restore bounds if set
        if (json.bounds) {
            this.bounds = { ...json.bounds };
        }

        // Initialize viewport right away to prevent black screen
        this.updateSceneViewport();
    }
}

// Register module globally
window.CameraController = CameraController;
/**
  * TopDownCamera - Module for top-down camera movement (Z-up coordinate system)
  *
  * This module provides top-down camera controls that lock the camera
  * at a top-down angle while allowing movement in the X/Y plane.
  * Coordinate system: Z = up/down, Y = left/right, X = forward/back
  * It needs to be attached to a GameObject with a Camera3D module.
  */
class TopDownCamera extends Module {
    static namespace = "3D";
    static description = "Top-down camera controller with Z-up coordinate system (Z=up/down, Y=left/right, X=forward/back)";
    static iconClass = "fas fa-camera";

    /**
     * Create a new TopDownCamera
     */
    constructor() {
        super("TopDownCamera");

        // Setup requirements
        this.requires("Camera3DRasterizer");

        // Camera settings
        this._cameraDistance = 500; // Distance from target (Z-axis)
        this._moveSpeed = 200; // Units per second
        this._sprintMultiplier = 2.5;
        this._smoothing = 0.2; // Lower = more responsive, higher = smoother
        this._currentVelocity = new Vector3(0, 0, 0);

        // Top-down angle settings (in degrees) - Z-up coordinate system
        this._topDownAngleX = 90; // Pitch around Y axis (90 degrees = looking straight down)
        this._topDownAngleY = 0;  // Yaw around Z axis (0 = no rotation)
        this._topDownAngleZ = 0;  // Roll around X axis (0 = no roll)

        // Key mapping (can be customized)
        this._keyMapping = {
            forward: "w",
            backward: "s",
            left: "a",
            right: "d",
            up: "e",        // Move up in Z (increase distance)
            down: "q",      // Move down in Z (decrease distance)
            sprint: "shift"
        };

        // Camera reference (will be set in start())
        this.camera = null;

        // Expose properties to the inspector
        this.exposeProperty("cameraDistance", "number", 500, {
            min: 10,
            max: 2000,
            step: 10,
            description: "Distance from camera to target",
            onChange: (val) => this._cameraDistance = val
        });

        this.exposeProperty("moveSpeed", "number", 200, {
            min: 1,
            max: 1000,
            description: "Movement speed in units per second",
            onChange: (val) => this._moveSpeed = val
        });

        this.exposeProperty("sprintMultiplier", "number", 2.5, {
            min: 1,
            max: 10,
            description: "Speed multiplier when sprinting",
            onChange: (val) => this._sprintMultiplier = val
        });

        this.exposeProperty("smoothing", "number", 0.2, {
            min: 0,
            max: 0.99,
            step: 0.01,
            description: "Movement smoothing (0 = instant, 1 = very smooth)",
            onChange: (val) => this._smoothing = val
        });

        this.exposeProperty("topDownAngleX", "number", 90, {
            min: 45,
            max: 90,
            step: 1,
            description: "Camera pitch angle around Y axis (90 = straight down)",
            onChange: (val) => this._topDownAngleX = val
        });

        this.exposeProperty("topDownAngleY", "number", 0, {
            min: -180,
            max: 180,
            step: 1,
            description: "Camera yaw angle around Z axis (rotation around vertical axis)",
            onChange: (val) => this._topDownAngleY = val
        });

        this.exposeProperty("topDownAngleZ", "number", 0, {
            min: -180,
            max: 180,
            step: 1,
            description: "Camera roll angle around X axis (tilt)",
            onChange: (val) => this._topDownAngleZ = val
        });

        this.exposeProperty("keyMapping", "object", this._keyMapping, {
            description: "Key mapping for camera controls",
            onChange: (val) => this._keyMapping = val
        });
    }

    /**
     * Called when the module starts
     */
    start() {
        // Get camera reference
        this.camera = this.gameObject.getModule("Camera3DRasterizer");

        if (!this.camera) {
            console.error("TopDownCamera requires a Camera3D module on the same GameObject");
        }

        // Make sure input manager is available
        if (!window.input) {
            console.error("TopDownCamera requires InputManager to be initialized");
        }

        // Lock camera to top-down angle immediately
        this.lockCameraAngle();
    }

    /**
      * Lock the camera to the top-down angle
      */
     lockCameraAngle() {
         if (!this.camera) return;
 
         // Set camera rotation to top-down angles (Z-up coordinate system)
         // rotation.x = roll (around X axis) = 0 for no roll
         // rotation.y = pitch (around Y axis) = 90 degrees for straight down
         // rotation.z = yaw (around Z axis) = rotation angle
         if (this.camera.rotation) {
             this.camera.rotation.x = this._topDownAngleZ; // Roll (around X axis)
             this.camera.rotation.y = this._topDownAngleX; // Pitch (around Y axis) - 90 degrees = straight down
             this.camera.rotation.z = this._topDownAngleY; // Yaw (around Z axis)
         }
 
         // Also set the gameObject's rotation to match
         if (this.gameObject) {
             this.gameObject.angle = this._topDownAngleY; // Use yaw angle directly
         }
     }

    /**
     * Handle camera movement each frame
     * @param {number} deltaTime - Time since last frame in seconds
     */
    loop(deltaTime) {
        if (!this.camera) {
            this.camera = this.gameObject.getModule("Camera3DRasterizer");
            return;
        }

        // Lock camera angle every frame to prevent changes
        this.lockCameraAngle();

        // Calculate target velocity based on key presses
        const targetVelocity = this.calculateTargetVelocity();

        // Apply smoothing
        this._currentVelocity.x += (targetVelocity.x - this._currentVelocity.x) * (1 - this._smoothing);
        this._currentVelocity.y += (targetVelocity.y - this._currentVelocity.y) * (1 - this._smoothing);
        this._currentVelocity.z += (targetVelocity.z - this._currentVelocity.z) * (1 - this._smoothing);

        // Move the camera
        if (this._currentVelocity.magnitude() > 0.01) {
            this.moveCamera(deltaTime);
        }
    }

    /**
     * Calculate target velocity based on key presses
     * @returns {Vector3} Target velocity
     */
    calculateTargetVelocity() {
        // Start with zero velocity
        const targetVelocity = new Vector3(0, 0, 0);

        // Check if input manager is available
        if (!window.input) return targetVelocity;

        // Check sprint key
        const sprinting = window.input.keyDown(this.keyMapping.sprint);
        const speedMultiplier = sprinting ? this.sprintMultiplier : 1;

        // Calculate movement direction in world space
        // For top-down camera, we move in X/Y plane and Z (distance)
        if (window.input.keyDown(this.keyMapping.forward)) {
            targetVelocity.x += this.moveSpeed * speedMultiplier;   // Forward (X axis)
        }
        if (window.input.keyDown(this.keyMapping.backward)) {
            targetVelocity.x -= this.moveSpeed * speedMultiplier;   // Backward (-X axis)
        }
        if (window.input.keyDown(this.keyMapping.left)) {
            targetVelocity.y -= this.moveSpeed * speedMultiplier;   // Left (-Y axis)
        }
        if (window.input.keyDown(this.keyMapping.right)) {
            targetVelocity.y += this.moveSpeed * speedMultiplier;   // Right (Y axis)
        }
        if (window.input.keyDown(this.keyMapping.up)) {
            targetVelocity.z += this.moveSpeed * speedMultiplier;   // Up (+Z, increase distance)
        }
        if (window.input.keyDown(this.keyMapping.down)) {
            targetVelocity.z -= this.moveSpeed * speedMultiplier;   // Down (-Z, decrease distance)
        }

        return targetVelocity;
    }

    /**
     * Move the camera based on current velocity
     * @param {number} deltaTime - Time since last frame in seconds
     */
    moveCamera(deltaTime) {
        // Ensure gameObject.position exists and has numeric x/y
        if (!this.gameObject.position || typeof this.gameObject.position.x !== 'number' || typeof this.gameObject.position.y !== 'number') {
            this.gameObject.position = { x: 0, y: 0 };
        }

        // Apply horizontal movement (X/Y plane)
        const dx = Number.isFinite(this._currentVelocity.x) ? this._currentVelocity.x * deltaTime : 0;
        const dy = Number.isFinite(this._currentVelocity.y) ? this._currentVelocity.y * deltaTime : 0;

        this.gameObject.position.x += dx;
        this.gameObject.position.y += dy;

        // Apply vertical movement (Z distance)
        const dz = Number.isFinite(this._currentVelocity.z) ? this._currentVelocity.z * deltaTime : 0;

        if (this.camera && this.camera.position) {
            // Update camera's Z position for distance
            if (!this.camera.position.z || typeof this.camera.position.z !== 'number') {
                this.camera.position.z = this._cameraDistance;
            } else {
                this.camera.position.z += dz;
                // Clamp camera distance to reasonable bounds
                this.camera.position.z = Math.max(50, Math.min(2000, this.camera.position.z));
                // Update our distance property to match
                this._cameraDistance = this.camera.position.z;
            }
        }
    }

    /**
     * Set the camera distance immediately
     * @param {number} distance - New camera distance
     */
    setCameraDistance(distance) {
        this._cameraDistance = Math.max(50, Math.min(2000, distance));

        if (this.camera && this.camera.position) {
            this.camera.position.z = this._cameraDistance;
        }
    }

    /**
     * Get the current camera distance
     * @returns {number} Current camera distance
     */
    getCameraDistance() {
        if (this.camera && this.camera.position && typeof this.camera.position.z === 'number') {
            return this.camera.position.z;
        }
        return this._cameraDistance;
    }

    /**
      * Set the top-down angles (Z-up coordinate system)
      * @param {number} pitch - Pitch angle around Y axis (90 = straight down)
      * @param {number} yaw - Yaw angle around Z axis (rotation)
      * @param {number} roll - Roll angle around X axis (tilt)
      */
     setTopDownAngles(pitch = 90, yaw = 0, roll = 0) {
         this._topDownAngleX = Math.max(45, Math.min(90, pitch)); // Pitch (Y axis)
         this._topDownAngleY = yaw; // Yaw (Z axis)
         this._topDownAngleZ = roll; // Roll (X axis)

         // Apply immediately
         this.lockCameraAngle();
     }

    /**
     * Serialize the top-down camera to JSON
     * @returns {Object} JSON representation of the top-down camera
     */
    toJSON() {
        return {
            ...super.toJSON(),
            _type: "TopDownCamera",
            _cameraDistance: this._cameraDistance,
            _moveSpeed: this._moveSpeed,
            _sprintMultiplier: this._sprintMultiplier,
            _smoothing: this._smoothing,
            _topDownAngleX: this._topDownAngleX,
            _topDownAngleY: this._topDownAngleY,
            _topDownAngleZ: this._topDownAngleZ,
            _keyMapping: { ...this._keyMapping }
        };
    }

    /**
     * Deserialize the top-down camera from JSON
     * @param {Object} json - JSON representation of the top-down camera
     */
    fromJSON(json) {
        super.fromJSON(json);
        if (json._cameraDistance !== undefined) this._cameraDistance = json._cameraDistance;
        if (json._moveSpeed !== undefined) this._moveSpeed = json._moveSpeed;
        if (json._sprintMultiplier !== undefined) this._sprintMultiplier = json._sprintMultiplier;
        if (json._smoothing !== undefined) this._smoothing = json._smoothing;
        if (json._topDownAngleX !== undefined) this._topDownAngleX = json._topDownAngleX;
        if (json._topDownAngleY !== undefined) this._topDownAngleY = json._topDownAngleY;
        if (json._topDownAngleZ !== undefined) this._topDownAngleZ = json._topDownAngleZ;
        if (json._keyMapping) this._keyMapping = { ...json._keyMapping };

        // Apply the loaded settings
        this.lockCameraAngle();
    }

    // Getters and setters for properties
    get cameraDistance() { return this._cameraDistance; }
    set cameraDistance(value) { this._cameraDistance = value; this.setCameraDistance(value); }

    get moveSpeed() { return this._moveSpeed; }
    set moveSpeed(value) { this._moveSpeed = value; }

    get sprintMultiplier() { return this._sprintMultiplier; }
    set sprintMultiplier(value) { this._sprintMultiplier = value; }

    get smoothing() { return this._smoothing; }
    set smoothing(value) { this._smoothing = Math.max(0, Math.min(0.99, value)); }

    get topDownAngleX() { return this._topDownAngleX; }
    set topDownAngleX(value) { this._topDownAngleX = value; this.lockCameraAngle(); }

    get topDownAngleY() { return this._topDownAngleY; }
    set topDownAngleY(value) { this._topDownAngleY = value; this.lockCameraAngle(); }

    get topDownAngleZ() { return this._topDownAngleZ; }
    set topDownAngleZ(value) { this._topDownAngleZ = value; this.lockCameraAngle(); }

    get keyMapping() { return this._keyMapping; }
    set keyMapping(value) { this._keyMapping = value; }
}

// Register the TopDownCamera module
window.TopDownCamera = TopDownCamera;
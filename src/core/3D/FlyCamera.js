/**
 * FlyCamera - Module for camera movement with WASD controls
 * 
 * This module allows for flying camera controls using WASD keys and QE for up/down.
 * It needs to be attached to a GameObject with a Camera3D module.
 */
class FlyCamera extends Module {
    /**
     * Create a new FlyCamera
     */
    constructor() {
        super("FlyCamera");
        
        // Setup requirements
        this.requires("Camera3D");
        
        // Movement settings
        this._moveSpeed = 200; // Units per second
        this._sprintMultiplier = 2.5;
        this._verticalSpeed = 150; // Units per second for up/down movement
        
        // Smoothing settings
        this._smoothing = 0.2; // Lower = more responsive, higher = smoother
        this._currentVelocity = new Vector3(0, 0, 0);
        
        // Key mapping (can be customized)
        this._keyMapping = {
            forward: "KeyW",
            backward: "KeyS",
            left: "KeyA",
            right: "KeyD",
            up: "KeyE",
            down: "KeyQ",
            sprint: "ShiftLeft"
        };
        
        // Camera reference (will be set in start())
        this.camera = null;
        
        // Expose properties to the inspector
        this.exposeProperty("moveSpeed", "number", 200, {
            min: 1,
            max: 1000
        });
        
        this.exposeProperty("sprintMultiplier", "number", 2.5, {
            min: 1,
            max: 10
        });
        
        this.exposeProperty("verticalSpeed", "number", 150, {
            min: 1,
            max: 500
        });
        
        this.exposeProperty("smoothing", "number", 0.2, {
            min: 0,
            max: 0.99,
            step: 0.01
        });
        
        this.exposeProperty("keyMapping", "object", this._keyMapping);
    }
    
    /**
     * Called when the module starts
     */
    start() {
        // Get camera reference
        this.camera = this.gameObject.getModule("Camera3D");
        
        if (!this.camera) {
            console.error("FlyCamera requires a Camera3D module on the same GameObject");
        }
        
        // Make sure input manager is available
        if (!window.input) {
            console.error("FlyCamera requires InputManager to be initialized");
        }
    }
    
    /**
     * Handle camera movement each frame
     * @param {number} deltaTime - Time since last frame in seconds
     */
    loop(deltaTime) {
        if (!this.camera || !window.input) return;
        
        // Calculate target velocity based on key presses
        const targetVelocity = this.calculateTargetVelocity();
        
        // Apply smoothing
        this._currentVelocity.x += (targetVelocity.x - this._currentVelocity.x) * (1 - this.smoothing);
        this._currentVelocity.y += (targetVelocity.y - this._currentVelocity.y) * (1 - this.smoothing);
        this._currentVelocity.z += (targetVelocity.z - this._currentVelocity.z) * (1 - this.smoothing);
        
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
        
        // Calculate movement direction in camera space
        if (window.input.keyDown(this.keyMapping.forward)) {
            targetVelocity.z += this.moveSpeed * speedMultiplier;
        }
        if (window.input.keyDown(this.keyMapping.backward)) {
            targetVelocity.z -= this.moveSpeed * speedMultiplier;
        }
        if (window.input.keyDown(this.keyMapping.left)) {
            targetVelocity.x -= this.moveSpeed * speedMultiplier;
        }
        if (window.input.keyDown(this.keyMapping.right)) {
            targetVelocity.x += this.moveSpeed * speedMultiplier;
        }
        if (window.input.keyDown(this.keyMapping.up)) {
            targetVelocity.y += this.verticalSpeed * speedMultiplier;
        }
        if (window.input.keyDown(this.keyMapping.down)) {
            targetVelocity.y -= this.verticalSpeed * speedMultiplier;
        }
        
        return targetVelocity;
    }
    
    /**
     * Move the camera based on current velocity
     * @param {number} deltaTime - Time since last frame in seconds
     */
    moveCamera(deltaTime) {
        // Transform velocity from camera space to world space
        const cameraRotRad = {
            x: this.camera.rotation.x * (Math.PI / 180),
            y: this.camera.rotation.y * (Math.PI / 180),
            z: this.camera.rotation.z * (Math.PI / 180)
        };
        
        // Calculate forward, right, and up vectors in world space
        const cosY = Math.cos(cameraRotRad.y);
        const sinY = Math.sin(cameraRotRad.y);
        const cosX = Math.cos(cameraRotRad.x);
        const sinX = Math.sin(cameraRotRad.x);
        
        // Forward vector (taking into account rotation around Y and X axes)
        const forwardX = sinY * cosX;
        const forwardY = sinX;
        const forwardZ = cosY * cosX;
        
        // Right vector (perpendicular to forward in XZ plane)
        const rightX = cosY;
        const rightY = 0;
        const rightZ = -sinY;
        
        // Up vector (perpendicular to forward and right)
        const upX = -sinY * sinX;
        const upY = cosX;
        const upZ = -cosY * sinX;
        
        // Calculate movement in world space
        const moveX = forwardX * this._currentVelocity.z + rightX * this._currentVelocity.x + upX * this._currentVelocity.y;
        const moveY = forwardY * this._currentVelocity.z + rightY * this._currentVelocity.x + upY * this._currentVelocity.y;
        const moveZ = forwardZ * this._currentVelocity.z + rightZ * this._currentVelocity.x + upZ * this._currentVelocity.y;
        
        // Apply movement
        this.camera.position.x += moveX * deltaTime;
        this.camera.position.y += moveY * deltaTime;
        this.camera.position.z += moveZ * deltaTime;
    }
    
    // Getters and setters for properties
    get moveSpeed() { return this._moveSpeed; }
    set moveSpeed(value) { this._moveSpeed = value; }
    
    get sprintMultiplier() { return this._sprintMultiplier; }
    set sprintMultiplier(value) { this._sprintMultiplier = value; }
    
    get verticalSpeed() { return this._verticalSpeed; }
    set verticalSpeed(value) { this._verticalSpeed = value; }
    
    get smoothing() { return this._smoothing; }
    set smoothing(value) { this._smoothing = Math.max(0, Math.min(0.99, value)); }
    
    get keyMapping() { return this._keyMapping; }
    set keyMapping(value) { this._keyMapping = value; }
}

// Register the FlyCamera module
window.FlyCamera = FlyCamera;
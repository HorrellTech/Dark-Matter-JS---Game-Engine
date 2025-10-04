/**
 * FlyCamera - Module for camera movement with WASD controls
 * 
 * This module allows for flying camera controls using WASD keys and QE for up/down.
 * It needs to be attached to a GameObject with a Camera3D module.
 * 
 * COORDINATE SYSTEM:
 * - X axis: forward/back (W/S)
 * - Y axis: left/right (A/D)
 * - Z axis: up/down (E/Q)
 * 
 * MOVEMENT:    
 * - W: Move forward
 * - S: Move backward
 * - A: Strafe left
 * - D: Strafe right
 * - E: Move up
 * - Q: Move down
 * - Shift: Sprint (increases movement speed)
 */
class FlyCamera extends Module {
    static namespace = "3D";
    
    /**
     * Create a new FlyCamera
     */
    constructor() {
        super("FlyCamera");
        
        // Setup requirements
        this.requires("Camera3DRasterizer"); // Requires a Camera3D module on the same GameObject
        
        // Movement settings
        this._moveSpeed = 200; // Units per second
        this._sprintMultiplier = 2.5;
        this._verticalSpeed = 150; // Units per second for up/down movement
        
        // Smoothing settings
        this._smoothing = 0.2; // Lower = more responsive, higher = smoother
        this._currentVelocity = new Vector3(0, 0, 0);

        // Z Axis Movement
        this._useZAxis = true; // Enable vertical movement by default
        this._lockZAxisPosition = false; // Lock camera at current Z position
        
        // Key mapping (can be customized)
        this._keyMapping = {
            forward: "w",
            backward: "s",
            left: "a",
            right: "d",
            up: "e",
            down: "q",
            sprint: "shift"
        };
        
        // Camera reference (will be set in start())
        this.camera = null;
        
        // Expose properties to the inspector
        this.exposeProperty("moveSpeed", "number", 200, {
            min: 1,
            max: 1000,
            onChange: (val) => this._moveSpeed = val
        });

        this.exposeProperty("sprintMultiplier", "number", 2.5, {
            min: 1,
            max: 10,
            onChange: (val) => this._sprintMultiplier = val
        });

        this.exposeProperty("verticalSpeed", "number", 150, {
            min: 1,
            max: 500,
            onChange: (val) => this._verticalSpeed = val
        });

        this.exposeProperty("smoothing", "number", 0.2, {
            min: 0,
            max: 0.99,
            step: 0.01,
            onChange: (val) => this._smoothing = val
        });

        this.exposeProperty("keyMapping", "object", this._keyMapping, {
            onChange: (val) => this._keyMapping = val
        });

        this.exposeProperty("useZAxis", "boolean", true, {
            onChange: (val) => this._useZAxis = val
        });

        this.exposeProperty("lockZAxisPosition", "boolean", false, {
            onChange: (val) => this._lockZAxisPosition = val
        });

        // Collision detection settings
        this._collisionRadius = 50; // Radius to search for collidable objects
        this._collisionEnabled = true; // Enable collision detection
        this._slideAlongWalls = true; // Enable wall sliding instead of just stopping

        this.exposeProperty("collisionRadius", "number", 50, {
            min: 1,
            max: 1000,
            onChange: (val) => this._collisionRadius = val
        });

        this.exposeProperty("collisionEnabled", "boolean", true, {
            onChange: (val) => this._collisionEnabled = val
        });

        this.exposeProperty("slideAlongWalls", "boolean", true, {
            onChange: (val) => this._slideAlongWalls = val
        });
    }
    
    /**
     * Called when the module starts
     */
    start() {
        // Get camera reference
        this.camera = this.getModule("Camera3DRasterizer");// || this.getModule("Camera3D");
        
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
        // NOTE: X = forward/back, Y = left/right, Z = up/down
        if (window.input.keyDown(this.keyMapping.forward)) {
            targetVelocity.x += this.moveSpeed * speedMultiplier;   // forward -> +X
        }
        if (window.input.keyDown(this.keyMapping.backward)) {
            targetVelocity.x -= this.moveSpeed * speedMultiplier;   // backward -> -X
        }
        if (window.input.keyDown(this.keyMapping.left)) {
            targetVelocity.y -= this.moveSpeed * speedMultiplier;   // left -> -Y
        }
        if (window.input.keyDown(this.keyMapping.right)) {
            targetVelocity.y += this.moveSpeed * speedMultiplier;   // right -> +Y
        }
        if (this._useZAxis) {
            if (window.input.keyDown(this.keyMapping.up)) {
                targetVelocity.z += this.verticalSpeed * speedMultiplier; // up -> +Z
            }
            if (window.input.keyDown(this.keyMapping.down)) {
                targetVelocity.z -= this.verticalSpeed * speedMultiplier; // down -> -Z
            }
        }
        
        return targetVelocity;
    }
    
    /**
     * Find collidable game objects within a radius of the camera
     * @param {number} radius - Search radius
     * @returns {Array} Array of game objects with colliders
     */
    findCollidableObjects(radius) {
        if (!window.engine || !window.engine.gameObjects) return [];

        const collidableObjects = [];
        const cameraPos = this.getCameraWorldPosition();

        for (const gameObj of window.engine.gameObjects) {
            if (!gameObj.active || gameObj === this.gameObject) continue;

            // Check if object has collision capabilities
            const hasCollider = gameObj.getModule && (
                gameObj.getModule('Collider') ||
                gameObj.getModule('RigidBody') ||
                gameObj.getModule('BoundingBoxCollider')
            );

            if (hasCollider) {
                const objPos = gameObj.getWorldPosition();
                const distance = Math.sqrt(
                    Math.pow(cameraPos.x - objPos.x, 2) +
                    Math.pow(cameraPos.y - objPos.y, 2)
                );

                if (distance <= radius) {
                    collidableObjects.push(gameObj);
                }
            }
        }

        return collidableObjects;
    }

    /**
     * Get the camera's world position as a Vector2
     * @returns {Object} Position object with x, y properties
     */
    getCameraWorldPosition() {
        if (this.gameObject && this.gameObject.position) {
            return {
                x: this.gameObject.position.x || 0,
                y: this.gameObject.position.y || 0
            };
        }
        return { x: 0, y: 0 };
    }

    /**
     * Check for collision along a movement vector
     * @param {Vector3} movement - Movement vector
     * @param {Array} collidableObjects - Objects to check collision against
     * @returns {Object} Collision information or null
     */
    checkMovementCollision(movement, collidableObjects) {
        if (!movement || movement.magnitude() < 0.01) return null;

        const startPos = this.getCameraWorldPosition();

        for (const obj of collidableObjects) {
            const boundingBox = obj.getBoundingBox();
            if (!boundingBox) continue;

            // Create ray from current position in movement direction
            const ray = {
                origin: new Vector2(startPos.x, startPos.y),
                direction: new Vector2(movement.x, movement.y).normalize()
            };

            const hit = window.collisionSystem.raycast(ray, boundingBox);
            if (hit && hit.distance <= movement.magnitude()) {
                return {
                    object: obj,
                    hit: hit,
                    distance: hit.distance
                };
            }
        }

        return null;
    }

    /**
     * Apply collision response to movement
     * @param {Vector3} originalMovement - Original movement vector
     * @param {Object} collision - Collision information
     * @returns {Vector3} Modified movement vector
     */
    applyCollisionResponse(originalMovement, collision) {
        if (!this._slideAlongWalls) {
            // Just stop movement in collision direction
            return new Vector3(0, 0, originalMovement.z);
        }

        // Calculate slide direction
        const hitNormal = collision.hit.normal;
        const movementDir = new Vector2(originalMovement.x, originalMovement.y);

        // Project movement onto the wall normal to get the component to remove
        const dotProduct = movementDir.dot(hitNormal);
        if (dotProduct >= 0) return originalMovement; // Moving away from wall

        // Remove the component that's penetrating the wall
        const slideMovement = movementDir.subtract(hitNormal.multiply(dotProduct));

        return new Vector3(slideMovement.x, slideMovement.y, originalMovement.z);
    }

    /**
     * Move the camera based on current velocity
     * @param {number} deltaTime - Time since last frame in seconds
     */
    moveCamera(deltaTime) {
        // Use parent's world rotation if available, fallback to local rotation or 0
        const parentRotDeg = (this.gameObject && typeof this.gameObject.getWorldRotation === 'function')
            ? this.gameObject.getWorldRotation()
            : (typeof this.gameObject.rotation === 'number' ? this.gameObject.rotation : 0);

        // Camera Euler (degrees)
        const cameraYawDeg = (this.camera && this.camera.rotation && typeof this.camera.rotation.z === 'number') ? (this.camera.rotation.z || 0) : 0;
        const cameraPitchDeg = (this.camera && this.camera.rotation && typeof this.camera.rotation.y === 'number') ? (this.camera.rotation.y || 0) : 0;
        const cameraRollDeg = (this.camera && this.camera.rotation && typeof this.camera.rotation.x === 'number') ? (this.camera.rotation.x || 0) : 0;

        // Combined yaw = parent yaw + camera local yaw
        const combinedYawDeg = parentRotDeg + cameraYawDeg;

        // Ensure gameObject.position exists and has numeric x/y (engine uses Vector2 by default)
        if (!this.gameObject.position || typeof this.gameObject.position.x !== 'number' || typeof this.gameObject.position.y !== 'number') {
            this.gameObject.position = { x: 0, y: 0 };
        }

        // Build forward and right vectors in world space using Vector3 helpers.
        // Forward ignores pitch for forward/back movement (moves along x/y plane).
        const forwardVec = Vector3.rotateByEulerDeg(Vector3.forward(), combinedYawDeg, 0, 0).normalize();
        // Right vector only uses yaw for horizontal strafing (ignores pitch/roll)
        const rightVec = Vector3.rotateByEulerDeg(Vector3.right(), combinedYawDeg, 0, 0).normalize();

        // Compose horizontal movement vector in world space (velocity components are in camera local axes)
        const horizontalMove = forwardVec.multiply(this._currentVelocity.x)
            .add(rightVec.multiply(this._currentVelocity.y));

        // Guard against invalid numbers and apply deltaTime
        const dx = Number.isFinite(horizontalMove.x) ? horizontalMove.x * deltaTime : 0;
        const dy = Number.isFinite(horizontalMove.y) ? horizontalMove.y * deltaTime : 0;
        // Up/down movement is purely along world Z axis, ignoring rotation
        const dz = Number.isFinite(this._currentVelocity.z) ? this._currentVelocity.z * deltaTime : 0;

        // Apply collision detection if enabled
        let finalDx = dx;
        let finalDy = dy;
        let finalDz = dz;

        if (this._collisionEnabled && (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01)) {
            // Find collidable objects within radius
            const collidableObjects = this.findCollidableObjects(this._collisionRadius);

            if (collidableObjects.length > 0) {
                // Create movement vector for collision checking
                const movementVector = new Vector3(dx, dy, 0);

                // Check for collisions
                const collision = this.checkMovementCollision(movementVector, collidableObjects);

                if (collision) {
                    // Apply collision response
                    const collisionMovement = this.applyCollisionResponse(movementVector, collision);

                    // Check if we still collide after applying slide
                    if (collisionMovement.magnitude() > 0.01) {
                        const slideCollision = this.checkMovementCollision(collisionMovement, collidableObjects);
                        if (slideCollision) {
                            // If still colliding after slide, stop movement
                            finalDx = 0;
                            finalDy = 0;
                        } else {
                            finalDx = collisionMovement.x;
                            finalDy = collisionMovement.y;
                        }
                    } else {
                        finalDx = 0;
                        finalDy = 0;
                    }
                }
            }
        }

        // Apply movement to GameObject's 2D position
        this.gameObject.position.x += finalDx;
        this.gameObject.position.y += finalDy;

        // Apply vertical movement to the Camera3D's position.z (avoid adding z to parent Vector2)
        if (this.camera && !this._lockZAxisPosition) {
            if (!this.camera.position || typeof this.camera.position.z !== 'number') {
                // ensure camera.position is a Vector3-like object
                this.camera.position = new Vector3(
                    (this.camera.position && this.camera.position.x) || 0,
                    (this.camera.position && this.camera.position.y) || 0,
                    (this.camera.position && this.camera.position.z) || 0
                );
            }

            // Prefer updating gameObject.depth so Z maps to GameObject depth (negative=up, positive=down).
            if (this.gameObject) {
                if (typeof this.gameObject.depth === 'number') {
                    this.gameObject.depth = (this.gameObject.depth || 0) + dz;
                } else if (this.gameObject.position && typeof this.gameObject.position.z === 'number') {
                    this.gameObject.position.z += dz;
                } else {
                    // Fallback: update camera local Z
                    this.camera.position.z = (this.camera.position.z || 0) + dz;
                }
            } else {
                // Fallback: update camera local Z
                this.camera.position.z = (this.camera.position.z || 0) + dz;
            }
        } else {
            // Fallback: only modify gameObject.position.z if it already exists as a number
            if (this.gameObject && !this._lockZAxisPosition) {
                if (typeof this.gameObject.depth === 'number') {
                    this.gameObject.depth = (this.gameObject.depth || 0) + dz;
                } else if (typeof this.gameObject.position.z === 'number') {
                    this.gameObject.position.z += dz;
                }
            }
        }
    }
    
    /**
     * Serialize the fly camera to JSON
     * @returns {Object} JSON representation of the fly camera
     */
    toJSON() {
        return {
            ...super.toJSON(),
            _type: "FlyCamera",
            _moveSpeed: this._moveSpeed,
            _sprintMultiplier: this._sprintMultiplier,
            _verticalSpeed: this._verticalSpeed,
            _smoothing: this._smoothing,
            _keyMapping: { ...this._keyMapping },
            _useZAxis: this._useZAxis,
            _lockZAxisPosition: this._lockZAxisPosition,
            _collisionRadius: this._collisionRadius,
            _collisionEnabled: this._collisionEnabled,
            _slideAlongWalls: this._slideAlongWalls
        };
    }

    /**
     * Deserialize the fly camera from JSON
     * @param {Object} json - JSON representation of the fly camera
     */
    fromJSON(json) {
        super.fromJSON(json);
        if (json._moveSpeed !== undefined) this._moveSpeed = json._moveSpeed;
        if (json._sprintMultiplier !== undefined) this._sprintMultiplier = json._sprintMultiplier;
        if (json._verticalSpeed !== undefined) this._verticalSpeed = json._verticalSpeed;
        if (json._smoothing !== undefined) this._smoothing = json._smoothing;
        if (json._keyMapping) this._keyMapping = { ...json._keyMapping };
        if (json._useZAxis !== undefined) this._useZAxis = json._useZAxis;
        if (json._lockZAxisPosition !== undefined) this._lockZAxisPosition = json._lockZAxisPosition;
        if (json._collisionRadius !== undefined) this._collisionRadius = json._collisionRadius;
        if (json._collisionEnabled !== undefined) this._collisionEnabled = json._collisionEnabled;
        if (json._slideAlongWalls !== undefined) this._slideAlongWalls = json._slideAlongWalls;
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

    get useZAxis() { return this._useZAxis; }
    set useZAxis(value) { this._useZAxis = value; }

    get lockZAxisPosition() { return this._lockZAxisPosition; }
    set lockZAxisPosition(value) { this._lockZAxisPosition = value; }

    get collisionRadius() { return this._collisionRadius; }
    set collisionRadius(value) { this._collisionRadius = Math.max(1, value); }

    get collisionEnabled() { return this._collisionEnabled; }
    set collisionEnabled(value) { this._collisionEnabled = value; }

    get slideAlongWalls() { return this._slideAlongWalls; }
    set slideAlongWalls(value) { this._slideAlongWalls = value; }
}

// Register the FlyCamera module
window.FlyCamera = FlyCamera;
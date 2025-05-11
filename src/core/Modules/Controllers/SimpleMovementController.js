/**
 * SimpleMovement - Basic character movement controller for 2D games
 */
class SimpleMovementController extends Module {
    static namespace = "Controllers/SimpleMovementController";
    static description = "Basic character movement controller for 2D games";

    constructor() {
        super("SimpleMovementController");
        
        /** @type {number} Movement speed in pixels per second */
        this.speed = 200;
        
        /** @type {boolean} Whether to use physics-based movement (requires RigidBody) */
        this.usePhysics = false;
        
        /** @type {boolean} Enable diagonal movement */
        this.allowDiagonal = true;
        
        /** @type {number} Acceleration factor (1 = instant) */
        this.acceleration = 0.2;
        
        /** @type {number} Deceleration factor when no input (1 = instant stop) */
        this.deceleration = 0.1;
        
        /** @type {Vector2} Current velocity */
        this.velocity = new Vector2(0, 0);
        
        /** @type {string} Control scheme: 'arrows', 'wasd', or 'both' */
        this.controlScheme = "both";
        
        // Expose properties to editor
        this.exposeProperty("speed", "number", 200, {
            min: 0,
            max: 1000,
            step: 10,
            description: "Movement speed in pixels per second"
        });
        
        this.exposeProperty("usePhysics", "boolean", false, {
            description: "Use physics-based movement (requires RigidBody)"
        });
        
        this.exposeProperty("allowDiagonal", "boolean", true, {
            description: "Enable diagonal movement"
        });
        
        this.exposeProperty("acceleration", "number", 0.2, {
            min: 0.01,
            max: 1,
            step: 0.01,
            description: "Acceleration factor (1 = instant)"
        });
        
        this.exposeProperty("deceleration", "number", 0.1, {
            min: 0.01,
            max: 1,
            step: 0.01,
            description: "Deceleration factor when no input (1 = instant stop)"
        });
        
        this.exposeProperty("controlScheme", "enum", "both", {
            options: ["arrows", "wasd", "both"],
            description: "Input control scheme to use"
        });
    }
    
    /**
     * Get required modules
     * @returns {Array} List of required module names
     */
    getRequirements() {
        return this.usePhysics ? ["RigidBody"] : [];
    }
    
    /**
     * Main update loop
     * @param {number} deltaTime - Time since last frame in seconds
     */
    loop(deltaTime) {
        if (!window.input) return;
        
        // Get input direction
        let inputX = 0;
        let inputY = 0;
        
        // Process input based on control scheme
        if (this.controlScheme === "arrows" || this.controlScheme === "both") {
            if (window.input.keyDown("ArrowRight")) inputX += 1;
            if (window.input.keyDown("ArrowLeft")) inputX -= 1;
            if (window.input.keyDown("ArrowDown")) inputY += 1;
            if (window.input.keyDown("ArrowUp")) inputY -= 1;
        }
        
        if (this.controlScheme === "wasd" || this.controlScheme === "both") {
            if (window.input.keyDown("KeyD")) inputX += 1;
            if (window.input.keyDown("KeyA")) inputX -= 1;
            if (window.input.keyDown("KeyS")) inputY += 1;
            if (window.input.keyDown("KeyW")) inputY -= 1;
        }
        
        // Clamp input values to prevent faster diagonal movement
        if (!this.allowDiagonal && inputX !== 0 && inputY !== 0) {
            // Prioritize horizontal movement
            inputY = 0;
        } else if (inputX !== 0 && inputY !== 0) {
            // Normalize diagonal movement
            const length = Math.sqrt(inputX * inputX + inputY * inputY);
            inputX /= length;
            inputY /= length;
        }
        
        // Target velocity based on input and speed
        const targetVelocityX = inputX * this.speed;
        const targetVelocityY = inputY * this.speed;
        
        // Smoothly interpolate current velocity toward target
        if (inputX !== 0) {
            this.velocity.x += (targetVelocityX - this.velocity.x) * this.acceleration;
        } else {
            // Apply deceleration when no input
            this.velocity.x *= (1 - this.deceleration);
            if (Math.abs(this.velocity.x) < 0.1) this.velocity.x = 0;
        }
        
        if (inputY !== 0) {
            this.velocity.y += (targetVelocityY - this.velocity.y) * this.acceleration;
        } else {
            // Apply deceleration when no input
            this.velocity.y *= (1 - this.deceleration);
            if (Math.abs(this.velocity.y) < 0.1) this.velocity.y = 0;
        }
        
        // Apply movement
        if (this.usePhysics) {
            // Use physics movement if available
            const rigidBody = this.gameObject.getModule("RigidBody");
            if (rigidBody) {
                rigidBody.setVelocity(this.velocity);
            } else {
                // Fall back to direct movement if physics not available
                this.gameObject.position.x += this.velocity.x * deltaTime;
                this.gameObject.position.y += this.velocity.y * deltaTime;
            }
        } else {
            // Direct movement
            this.gameObject.position.x += this.velocity.x * deltaTime;
            this.gameObject.position.y += this.velocity.y * deltaTime;
        }
    }
    
    /**
     * Override to handle serialization
     * @returns {Object} Serialized data
     */
    toJSON() {
        const json = super.toJSON();
        
        json.speed = this.speed;
        json.usePhysics = this.usePhysics;
        json.allowDiagonal = this.allowDiagonal;
        json.acceleration = this.acceleration;
        json.deceleration = this.deceleration;
        json.controlScheme = this.controlScheme;
        
        return json;
    }
}

// Register the module
window.SimpleMovementController = SimpleMovementController;
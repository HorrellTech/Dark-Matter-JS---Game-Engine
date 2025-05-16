/**
 * KeyboardController - Keyboard-based movement and input
 * 
 * Provides customizable keyboard controls for moving a GameObject.
 * Supports different input mappings and movement styles.
 */
class KeyboardController extends Module {
    static allowMultiple = false;
    static namespace = "Controllers";
    static description = "Controls GameObject position using keyboard input";
    static iconClass = "fas fa-keyboard";

    constructor() {
        super("KeyboardController");
        
        // Movement properties
        this.speed = 200;
        this.useAcceleration = true;
        this.acceleration = 0.15;
        this.deceleration = 0.1;
        this.rotationSpeed = 180;
        
        // Movement behavior
        this.moveMode = "direct"; // "direct", "rotate-and-move"
        this.allowDiagonalMovement = true;
        
        // Input mapping
        this.upKey = "arrowup";
        this.downKey = "arrowdown";
        this.leftKey = "arrowleft";
        this.rightKey = "arrowright";
        this.actionKey = "space";
        this.rotateLeftKey = "q";
        this.rotateRightKey = "e";
        
        // Current velocity
        this.velocity = new Vector2(0, 0);
        
        // Expose properties to editor
        this.exposeProperty("speed", "number", this.speed, {
            description: "Movement speed in pixels per second",
            min: 0,
            max: 1000,
            step: 10
        });
        
        this.exposeProperty("useAcceleration", "boolean", this.useAcceleration, {
            description: "Enable smooth acceleration/deceleration"
        });
        
        this.exposeProperty("acceleration", "number", this.acceleration, {
            description: "Acceleration rate (0-1, higher is faster)",
            min: 0.01,
            max: 1,
            step: 0.01
        });
        
        this.exposeProperty("deceleration", "number", this.deceleration, {
            description: "Deceleration rate when no input (0-1)",
            min: 0.01,
            max: 1,
            step: 0.01
        });
        
        this.exposeProperty("rotationSpeed", "number", this.rotationSpeed, {
            description: "Rotation speed in degrees per second",
            min: 0,
            max: 360,
            step: 5
        });
        
        this.exposeProperty("moveMode", "enum", this.moveMode, {
            description: "Movement style",
            options: ["direct", "rotate-and-move"]
        });
        
        this.exposeProperty("allowDiagonalMovement", "boolean", this.allowDiagonalMovement, {
            description: "Allow movement in diagonal directions"
        });
        
        this.exposeProperty("upKey", "string", this.upKey, {
            description: "Key for upward movement"
        });
        
        this.exposeProperty("downKey", "string", this.downKey, {
            description: "Key for downward movement"
        });
        
        this.exposeProperty("leftKey", "string", this.leftKey, {
            description: "Key for leftward movement"
        });
        
        this.exposeProperty("rightKey", "string", this.rightKey, {
            description: "Key for rightward movement"
        });
        
        this.exposeProperty("actionKey", "string", this.actionKey, {
            description: "Key for primary action"
        });
        
        this.exposeProperty("rotateLeftKey", "string", this.rotateLeftKey, {
            description: "Key for rotating counter-clockwise"
        });
        
        this.exposeProperty("rotateRightKey", "string", this.rotateRightKey, {
            description: "Key for rotating clockwise"
        });
    }

    /**
     * Main update loop
     * @param {number} deltaTime - Time since last frame in seconds
     */
    loop(deltaTime) {
        if (!window.input) return;

        // Handle rotation input (if using rotation mode or explicitly rotating)
        if (window.input.keyDown(this.rotateLeftKey)) {
            this.gameObject.angle -= this.rotationSpeed * deltaTime;
        }
        
        if (window.input.keyDown(this.rotateRightKey)) {
            this.gameObject.angle += this.rotationSpeed * deltaTime;
        }

        // Get input direction
        let inputX = 0;
        let inputY = 0;
        
        if (window.input.keyDown(this.rightKey)) inputX += 1;
        if (window.input.keyDown(this.leftKey)) inputX -= 1;
        if (window.input.keyDown(this.downKey)) inputY += 1;
        if (window.input.keyDown(this.upKey)) inputY -= 1;

        // Handle non-diagonal movement if needed
        if (!this.allowDiagonalMovement && inputX !== 0 && inputY !== 0) {
            // Prioritize horizontal movement
            inputY = 0;
        }
        
        // Handle rotate-and-move mode
        if (this.moveMode === "rotate-and-move") {
            // Only move forward/backward
            let moveAmount = 0;
            if (window.input.keyDown(this.upKey)) moveAmount = -1;
            if (window.input.keyDown(this.downKey)) moveAmount = 1;
            
            // Convert angle to direction vector
            const angle = this.gameObject.angle * Math.PI / 180;
            inputX = Math.sin(angle) * moveAmount;
            inputY = -Math.cos(angle) * moveAmount;
            
            // Handle strafing
            if (window.input.keyDown(this.leftKey)) {
                inputX -= Math.cos(angle);
                inputY -= Math.sin(angle);
            }
            if (window.input.keyDown(this.rightKey)) {
                inputX += Math.cos(angle);
                inputY += Math.sin(angle);
            }
        }
        
        // Normalize vector if it's not zero
        if (inputX !== 0 || inputY !== 0) {
            const length = Math.sqrt(inputX * inputX + inputY * inputY);
            inputX /= length;
            inputY /= length;
        }
        
        // Calculate target velocity
        const targetVelocityX = inputX * this.speed;
        const targetVelocityY = inputY * this.speed;
        
        // Apply movement
        if (this.useAcceleration) {
            // Smoothly accelerate/decelerate
            if (inputX !== 0) {
                this.velocity.x += (targetVelocityX - this.velocity.x) * this.acceleration;
            } else {
                this.velocity.x *= (1 - this.deceleration);
                if (Math.abs(this.velocity.x) < 0.1) this.velocity.x = 0;
            }
            
            if (inputY !== 0) {
                this.velocity.y += (targetVelocityY - this.velocity.y) * this.acceleration;
            } else {
                this.velocity.y *= (1 - this.deceleration);
                if (Math.abs(this.velocity.y) < 0.1) this.velocity.y = 0;
            }
        } else {
            // Instant movement
            this.velocity.x = targetVelocityX;
            this.velocity.y = targetVelocityY;
        }
        
        // Apply movement to position
        const rigidBody = this.gameObject.getModule("RigidBody");
        if (rigidBody && rigidBody.enabled) {
            // Use physics if available
            rigidBody.setVelocity(this.velocity);
        } else {
            // Direct position update
            this.gameObject.position.x += this.velocity.x * deltaTime;
            this.gameObject.position.y += this.velocity.y * deltaTime;
        }
    }
}

// Register module globally
window.KeyboardController = KeyboardController;
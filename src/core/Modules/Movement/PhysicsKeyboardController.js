/**
 * KeyboardController - Keyboard-based movement and input
 * 
 * Provides customizable keyboard controls for moving a GameObject.
 * Supports different input mappings and movement styles.
 */
class PhysicsKeyboardController extends Module {
    static allowMultiple = false;
    static namespace = "Movement";
    static description = "Controls GameObject position using keyboard input";
    static iconClass = "fas fa-keyboard";

    constructor() {
        super("PhysicsKeyboardController");

        this.customDrawingModule = ""; // No custom drawing module by default

        // Movement properties
        this.speed = 200;
        this.useAcceleration = true;
        this.acceleration = 0.15;
        this.deceleration = 0.1;
        this.rotationSpeed = 180;

        // Movement behavior
        this.moveMode = "direct"; // "direct", "rotate-and-move"
        this.allowDiagonalMovement = true;

        this.platformerMode = false;
        this.jumpKey = "space";
        this.jumpForce = 400;
        this.isJumping = false;
        this.grounded = false;

        this.animIdle = "idle";
        this.animWalk = "walk";

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

        // Configure inspector styling
        this.setupProperties();
    }

    /**
     * Set up properties and inspector styling
     */
    setupProperties() {
        this.exposeProperty("customDrawingModule", "string", this.customDrawingModule, {
            description: "Custom drawing module for animations",
            style: {
                header: "Custom Drawing Module",
                label: "Drawing Module"
            },
            onChange: (val) => { this.customDrawingModule = val; }
        });

        this.exposeProperty("animIdle", "string", this.animIdle, {
            description: "Animation state for idle",
            style: {
                label: "Idle Animation"
            },
            onChange: (val) => { this.animIdle = val; }
        });

        this.exposeProperty("animWalk", "string", this.animWalk, {
            description: "Animation state for walking",
            style: {
                label: "Walk Animation"
            },
            onChange: (val) => { this.animWalk = val; }
        });

        // Movement Properties with styling
        this.exposeProperty("speed", "number", this.speed, {
            description: "Movement speed in pixels per second",
            min: 0,
            max: 1000,
            step: 10,
            style: {
                header: "Movement Settings",
                label: "Movement Speed",
                slider: true
            },
            onChange: (val) => { this.speed = val; }
        });

        this.exposeProperty("moveMode", "enum", this.moveMode, {
            description: "Movement style",
            options: ["direct", "rotate-and-move"],
            style: {
                label: "Movement Style"
            },
            onChange: (val) => { this.moveMode = val; }
        });

        this.exposeProperty("allowDiagonalMovement", "boolean", this.allowDiagonalMovement, {
            description: "Allow movement in diagonal directions",
            style: {
                label: "Allow Diagonals"
            },
            onChange: (val) => { this.allowDiagonalMovement = val; }
        });

        this.exposeProperty("platformerMode", "boolean", this.platformerMode, {
            description: "Enable platformer physics (gravity, jump, horizontal movement)",
            style: { header: "Platformer Settings", label: "Platformer Mode" },
            onChange: (val) => { this.platformerMode = val; }
        });
        this.exposeProperty("jumpKey", "string", this.jumpKey, {
            description: "Key for jumping (platformer mode)",
            style: { label: "Jump Key" },
            onChange: (val) => { this.jumpKey = val; }
        });
        this.exposeProperty("jumpForce", "number", this.jumpForce, {
            description: "Jump force (platformer mode)",
            min: 50, max: 2000, step: 10,
            style: { label: "Jump Force", slider: true },
            onChange: (val) => { this.jumpForce = val; }
        });

        // Acceleration settings
        this.exposeProperty("useAcceleration", "boolean", this.useAcceleration, {
            description: "Enable smooth acceleration/deceleration",
            style: {
                label: "Use Acceleration"
            },
            onChange: (val) => { this.useAcceleration = val; }
        });

        this.exposeProperty("acceleration", "number", this.acceleration, {
            description: "Acceleration rate (0-1, higher is faster)",
            min: 0.01,
            max: 1,
            step: 0.01,
            style: {
                label: "Acceleration Rate",
                slider: true
            },
            onChange: (val) => { this.acceleration = val; }
        });

        this.exposeProperty("deceleration", "number", this.deceleration, {
            description: "Deceleration rate when no input (0-1)",
            min: 0.01,
            max: 1,
            step: 0.01,
            style: {
                label: "Deceleration Rate",
                slider: true
            },
            onChange: (val) => { this.deceleration = val; }
        });

        this.exposeProperty("rotationSpeed", "number", this.rotationSpeed, {
            description: "Rotation speed in degrees per second",
            min: 0,
            max: 360,
            step: 5,
            style: {
                label: "Rotation Speed",
                slider: true
            },
            onChange: (val) => { this.rotationSpeed = val; }
        });

        // Control bindings with styling
        this.exposeProperty("upKey", "string", this.upKey, {
            description: "Key for upward movement",
            style: {
                header: "Control Bindings",
                label: "Up Key"
            },
            onChange: (val) => { this.upKey = val; }
        });

        this.exposeProperty("downKey", "string", this.downKey, {
            description: "Key for downward movement",
            style: {
                label: "Down Key"
            },
            onChange: (val) => { this.downKey = val; }
        });

        this.exposeProperty("leftKey", "string", this.leftKey, {
            description: "Key for leftward movement",
            style: {
                label: "Left Key"
            },
            onChange: (val) => { this.leftKey = val; }
        });

        this.exposeProperty("rightKey", "string", this.rightKey, {
            description: "Key for rightward movement",
            style: {
                label: "Right Key"
            },
            onChange: (val) => { this.rightKey = val; }
        });

        this.exposeProperty("actionKey", "string", this.actionKey, {
            description: "Key for primary action",
            style: {
                label: "Action Key"
            },
            onChange: (val) => { this.actionKey = val; }
        });

        this.exposeProperty("rotateLeftKey", "string", this.rotateLeftKey, {
            description: "Key for rotating counter-clockwise",
            style: {
                label: "Rotate Left"
            },
            onChange: (val) => { this.rotateLeftKey = val; }
        });

        this.exposeProperty("rotateRightKey", "string", this.rotateRightKey, {
            description: "Key for rotating clockwise",
            style: {
                label: "Rotate Right"
            },
            onChange: (val) => { this.rotateRightKey = val; }
        });
    }

    /**
     * Optional method for enhanced inspector UI using the Style helper
     * This will be called by the Inspector if it exists
     * @param {Style} style - Styling helper
     */
    style(style) {
        style.startGroup("Animation Settings", false, {
            backgroundColor: 'rgba(100,150,255,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("customDrawingModule", "string", this.customDrawingModule, {
            description: "Custom drawing module for animations",
            style: {
                header: "Custom Drawing Module",
                label: "Drawing Module"
            }
        });

        style.exposeProperty("animIdle", "string", this.animIdle, {
            description: "Animation state for idle",
            style: {
                label: "Idle Animation"
            }
        });

        style.exposeProperty("animWalk", "string", this.animWalk, {
            description: "Animation state for walking",
            style: {
                label: "Walk Animation"
            }
        });

        style.endGroup();

        style.startGroup("Movement Settings", false, {
            backgroundColor: 'rgba(100,150,255,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("speed", "number", this.speed, {
            description: "Movement speed in pixels per second",
            min: 0,
            max: 1000,
            step: 10,
            style: {
                label: "Movement Speed",
                slider: true
            }
        });

        style.exposeProperty("moveMode", "enum", this.moveMode, {
            description: "Movement style",
            options: ["direct", "rotate-and-move"],
            style: {
                label: "Movement Style"
            }
        });

        style.exposeProperty("platformerMode", "boolean", this.platformerMode, {
            description: "Enable platformer physics (gravity, jump, horizontal movement)",
            style: {
                header: "Platformer Settings",
                label: "Platformer Mode"
            }
        });

        style.exposeProperty("jumpForce", "number", this.jumpForce, {
            description: "Jump force (platformer mode)",
            min: 50,
            max: 2000,
            step: 10,
            style: {
                label: "Jump Force",
                slider: true
            }
        });

        style.exposeProperty("allowDiagonalMovement", "boolean", this.allowDiagonalMovement, {
            description: "Allow movement in diagonal directions",
            style: {
                label: "Allow Diagonals"
            }
        });

        style.exposeProperty("useAcceleration", "boolean", this.useAcceleration, {
            description: "Enable smooth acceleration/deceleration",
            style: {
                label: "Use Acceleration"
            }
        });

        style.exposeProperty("acceleration", "number", this.acceleration, {
            description: "Acceleration rate (0-1, higher is faster)",
            min: 0.01,
            max: 1,
            step: 0.01,
            style: {
                label: "Acceleration Rate",
                slider: true
            }
        });

        style.exposeProperty("deceleration", "number", this.deceleration, {
            description: "Deceleration rate when no input (0-1)",
            min: 0.01,
            max: 1,
            step: 0.01,
            style: {
                label: "Deceleration Rate",
                slider: true
            }
        });

        style.exposeProperty("rotationSpeed", "number", this.rotationSpeed, {
            description: "Rotation speed in degrees per second",
            min: 0,
            max: 360,
            step: 5,
            style: {
                label: "Rotation Speed",
                slider: true
            }
        });

        style.endGroup();

        style.addDivider();

        style.startGroup("Control Bindings", true, {
            backgroundColor: 'rgba(100,255,150,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.addHelpText("Type key names like 'a', 'space', 'arrowup', etc.");

        style.exposeProperty("jumpKey", "string", this.jumpKey, {
            description: "Key for jumping (platformer mode)",
            style: {
                label: "Jump Key"
            }
        });

        style.exposeProperty("upKey", "string", this.upKey, {
            description: "Key for upward movement",
            style: {
                label: "Up Key"
            }
        });

        style.exposeProperty("downKey", "string", this.downKey, {
            description: "Key for downward movement",
            style: {
                label: "Down Key"
            }
        });

        style.exposeProperty("leftKey", "string", this.leftKey, {
            description: "Key for leftward movement",
            style: {
                label: "Left Key"
            }
        });

        style.exposeProperty("rightKey", "string", this.rightKey, {
            description: "Key for rightward movement",
            style: {
                label: "Right Key"
            }
        });

        style.addSpace(10);

        style.exposeProperty("actionKey", "string", this.actionKey, {
            description: "Key for primary action",
            style: {
                label: "Action Key"
            }
        });

        style.exposeProperty("rotateLeftKey", "string", this.rotateLeftKey, {
            description: "Key for rotating counter-clockwise",
            style: {
                label: "Rotate Left"
            }
        });

        style.exposeProperty("rotateRightKey", "string", this.rotateRightKey, {
            description: "Key for rotating clockwise",
            style: {
                label: "Rotate Right"
            }
        });

        style.endGroup();

        style.addButton("Reset Controls", () => this.resetControls(), {
            primary: true,
            fullWidth: true,
            tooltip: "Reset all controls to default values"
        });
    }

    /**
     * Reset controls to default values
     */
    resetControls() {
        this.upKey = "arrowup";
        this.downKey = "arrowdown";
        this.leftKey = "arrowleft";
        this.rightKey = "arrowright";
        this.actionKey = "space";
        this.rotateLeftKey = "q";
        this.rotateRightKey = "e";

        // Refresh the inspector to show updated values
        if (window.editor && window.editor.inspector) {
            window.editor.inspector.refreshModuleUI(this);
        }
    }

    /**
     * Main update loop
     * @param {number} deltaTime - Time since last frame in seconds
     */
    loop(deltaTime) {
        if (!window.input) return;

        const rigidBody = this.gameObject.getModule("BasicPhysics");

        if (this.platformerMode && rigidBody) {
            // Platformer: horizontal movement, gravity, jump
            let inputX = 0;
            if (window.input.keyDown(this.rightKey)) inputX += 1;
            if (window.input.keyDown(this.leftKey)) inputX -= 1;

            // Only horizontal velocity is controlled
            const targetVelocityX = inputX * this.speed;

            // Check if grounded (simple: velocity.y near zero and position.y >= ground level)
            // You may want to improve this with collision checks
            this.grounded = Math.abs(rigidBody.velocity.y) < 0.1;

            // Jump
            if (window.input.keyPressed(this.jumpKey) && this.grounded) {
                rigidBody.velocity.y = -this.jumpForce;
                this.isJumping = true;
            }

            // Apply horizontal movement
            if (this.useAcceleration) {
                rigidBody.velocity.x += (targetVelocityX - rigidBody.velocity.x) * this.acceleration;
            } else {
                rigidBody.velocity.x = targetVelocityX;
            }

            return; // Exit early for platformer mode
        }

        // Reference the custom drawing module
        const drawingModule = this.gameObject.getModule(this.customDrawingModule);
        if (drawingModule) {
            // Flip horizontally when moving left/right
            if (window.input.keyDown(this.leftKey)) {
                drawingModule.flipped = true;
                drawingModule.setAnimation(this.animWalk);
                drawingModule.isPlaying = true;
            } else if (window.input.keyDown(this.rightKey)) {
                drawingModule.flipped = false;
                drawingModule.setAnimation(this.animWalk);
                drawingModule.isPlaying = true;
            } else if (window.input.keyDown(this.upKey)) {
                drawingModule.setAnimation(this.animWalk);
                drawingModule.isPlaying = true;
            } else if (window.input.keyDown(this.downKey)) {
                drawingModule.setAnimation(this.animWalk);
                drawingModule.isPlaying = true;
            } else {
                drawingModule.isPlaying = false;
                drawingModule.setAnimation(this.animIdle);
            }
        }

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
                inputX += Math.cos(angle);
                inputY += Math.sin(angle);
            }
            if (window.input.keyDown(this.rightKey)) {
                inputX -= Math.cos(angle);
                inputY -= Math.sin(angle);
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
        if (rigidBody && rigidBody.enabled) {
            // Use physics if available
            rigidBody.setVelocity(this.velocity.x, this.velocity.y);
        } else {
            // Direct position update
            this.gameObject.position.x += this.velocity.x * deltaTime;
            this.gameObject.position.y += this.velocity.y * deltaTime;
        }
    }
}

// Register module globally
window.PhysicsKeyboardController = PhysicsKeyboardController;
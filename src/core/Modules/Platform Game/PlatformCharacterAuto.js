/*
    We want to smoothen out the snapping to ground, remove the margin, add circle collider etc
*/

class PlatformCharacterAuto extends Module {
    static namespace = "Platform Game";
    static description = "Advanced platform character with realistic physics that auto-detects DrawPlatformerHills for ground collision";
    static allowMultiple = false;
    static icon = "fa-running";
    static color = "#4CAF50";

    constructor() {
        super("PlatformCharacterAuto");

        // Object name to check for DrawPlatformerHills module
        this.hillsObjectName = "Hills"; // Name of GameObject with DrawPlatformerHills module

        // Movement properties
        this.moveSpeed = 200; // Horizontal movement speed
        this.acceleration = 800; // How fast we reach max speed
        this.deceleration = 1200; // How fast we slow down when not moving
        this.airControl = 0.3; // Air control factor (0-1)

        // Jump properties
        this.jumpForce = 400; // Initial jump velocity
        this.jumpBufferTime = 0.1; // Time window for jump input buffering
        this.coyoteTime = 0.1; // Time after leaving ground where jump is still allowed
        this.variableJumpHeight = true; // Allow variable jump height
        this.minJumpTime = 0.1; // Minimum time jump must be held
        this.maxJumpTime = 0.3; // Maximum time jump can be held

        // Physics properties
        this.gravity = 980; // Gravity acceleration (pixels/s²)
        this.maxFallSpeed = 600; // Terminal velocity
        this.groundFriction = 0.8; // Ground friction (0-1)
        this.airResistance = 0.98; // Air resistance factor

        // Collision properties
        this.characterWidth = 16; // Character width for collision
        this.characterHeight = 32; // Character height for collision
        this.groundCheckDistance = 5; // How far to check for ground
        this.slopeLimit = 45; // Maximum slope angle in degrees

        // Visual properties
        this.characterColor = "#FF6B6B"; // Character color
        this.showDebugInfo = true; // Show debug information
        this.showHitbox = true; // Show character hitbox

        // Internal state
        this.velocity = new Vector2(0, 0);
        this.isGrounded = false;
        this.wasGrounded = false;
        this.jumpBufferTimer = 0;
        this.coyoteTimer = 0;
        this.jumpHoldTimer = 0;
        this.isJumping = false;
        this.groundNormal = new Vector2(0, -1);
        this.lastGroundY = 0;

        // Hills module reference
        this.hillsModule = null;
        this.hillsObject = null;

        // Input state
        this.inputLeft = false;
        this.inputRight = false;
        this.inputJump = false;
        this.inputJumpPressed = false;
        this.inputJumpReleased = false;
    }

    setupProperties() {
        // Object reference
        this.exposeProperty("hillsObjectName", "string", this.hillsObjectName, {
            description: "Name of GameObject containing DrawPlatformerHills module"
        });

        // Movement
        this.exposeProperty("moveSpeed", "number", this.moveSpeed, {
            description: "Horizontal movement speed",
            min: 50, max: 500
        });

        this.exposeProperty("acceleration", "number", this.acceleration, {
            description: "Acceleration to reach max speed",
            min: 100, max: 2000
        });

        this.exposeProperty("deceleration", "number", this.deceleration, {
            description: "Deceleration when stopping",
            min: 100, max: 3000
        });

        this.exposeProperty("airControl", "number", this.airControl, {
            description: "Air control factor (0=no control, 1=full control)",
            min: 0, max: 1, step: 0.1
        });

        // Jump
        this.exposeProperty("jumpForce", "number", this.jumpForce, {
            description: "Jump force",
            min: 100, max: 800
        });

        this.exposeProperty("jumpBufferTime", "number", this.jumpBufferTime, {
            description: "Jump input buffer time (seconds)",
            min: 0, max: 0.5, step: 0.05
        });

        this.exposeProperty("coyoteTime", "number", this.coyoteTime, {
            description: "Coyote time after leaving ground (seconds)",
            min: 0, max: 0.5, step: 0.05
        });

        this.exposeProperty("variableJumpHeight", "boolean", this.variableJumpHeight, {
            description: "Allow variable jump height based on hold time"
        });

        // Physics
        this.exposeProperty("gravity", "number", this.gravity, {
            description: "Gravity force",
            min: 200, max: 2000
        });

        this.exposeProperty("maxFallSpeed", "number", this.maxFallSpeed, {
            description: "Maximum falling speed",
            min: 200, max: 1000
        });

        this.exposeProperty("groundFriction", "number", this.groundFriction, {
            description: "Ground friction (0-1)",
            min: 0, max: 1, step: 0.1
        });

        // Collision
        this.exposeProperty("characterWidth", "number", this.characterWidth, {
            description: "Character width for collision",
            min: 8, max: 64
        });

        this.exposeProperty("characterHeight", "number", this.characterHeight, {
            description: "Character height for collision",
            min: 16, max: 128
        });

        // Visual
        this.exposeProperty("characterColor", "color", this.characterColor, {
            description: "Character color"
        });

        this.exposeProperty("showDebugInfo", "boolean", this.showDebugInfo, {
            description: "Show debug information"
        });

        this.exposeProperty("showHitbox", "boolean", this.showHitbox, {
            description: "Show character hitbox"
        });
    }

    style(styleHelper) {
        styleHelper
            .addHeader("Platform Character (Auto)", "character-header")
            .startGroup("Object Reference", false, { color: "#2196F3" })
            .exposeProperty("hillsObjectName", "string", this.hillsObjectName, { label: "Hills Object Name" })
            .endGroup()
            .startGroup("Movement", false, { color: "#4CAF50" })
            .exposeProperty("moveSpeed", "number", this.moveSpeed, { label: "Move Speed" })
            .exposeProperty("acceleration", "number", this.acceleration, { label: "Acceleration" })
            .exposeProperty("deceleration", "number", this.deceleration, { label: "Deceleration" })
            .exposeProperty("airControl", "number", this.airControl, { label: "Air Control" })
            .endGroup()
            .startGroup("Jump", false, { color: "#FF9800" })
            .exposeProperty("jumpForce", "number", this.jumpForce, { label: "Jump Force" })
            .exposeProperty("jumpBufferTime", "number", this.jumpBufferTime, { label: "Jump Buffer Time" })
            .exposeProperty("coyoteTime", "number", this.coyoteTime, { label: "Coyote Time" })
            .exposeProperty("variableJumpHeight", "boolean", this.variableJumpHeight, { label: "Variable Jump Height" })
            .endGroup()
            .startGroup("Physics", false, { color: "#9C27B0" })
            .exposeProperty("gravity", "number", this.gravity, { label: "Gravity" })
            .exposeProperty("maxFallSpeed", "number", this.maxFallSpeed, { label: "Max Fall Speed" })
            .exposeProperty("groundFriction", "number", this.groundFriction, { label: "Ground Friction" })
            .endGroup()
            .startGroup("Collision", false, { color: "#F44336" })
            .exposeProperty("characterWidth", "number", this.characterWidth, { label: "Width" })
            .exposeProperty("characterHeight", "number", this.characterHeight, { label: "Height" })
            .endGroup()
            .startGroup("Visual", false, { color: "#607D8B" })
            .exposeProperty("characterColor", "color", this.characterColor, { label: "Character Color" })
            .exposeProperty("showDebugInfo", "boolean", this.showDebugInfo, { label: "Show Debug Info" })
            .exposeProperty("showHitbox", "boolean", this.showHitbox, { label: "Show Hitbox" })
            .endGroup();
    }

    start() {
        this.findHillsModule();
    }

    loop(deltaTime) {
        this.updateInput();
        this.updateTimers(deltaTime);
        this.updatePhysics(deltaTime);
        this.checkGroundCollision();
        this.handleJump();
        this.updatePosition(deltaTime);
        this.findHillsModule(); // Keep checking in case hills object changes
    }

    updateInput() {
        if (!window.input) return;

        // Store previous input state
        const prevJump = this.inputJump;

        // Update input state
        this.inputLeft = window.input.keyDown('ArrowLeft') || window.input.keyDown('a');
        this.inputRight = window.input.keyDown('ArrowRight') || window.input.keyDown('d');
        this.inputJump = window.input.keyDown('Space') || window.input.keyDown('ArrowUp') || window.input.keyDown('w');

        // Detect jump press/release
        this.inputJumpPressed = this.inputJump && !prevJump;
        this.inputJumpReleased = !this.inputJump && prevJump;
    }

    updateTimers(deltaTime) {
        // Update jump buffer timer
        if (this.inputJumpPressed) {
            this.jumpBufferTimer = this.jumpBufferTime;
        } else if (this.jumpBufferTimer > 0) {
            this.jumpBufferTimer -= deltaTime;
        }

        // Update coyote timer
        if (this.wasGrounded && !this.isGrounded) {
            this.coyoteTimer = this.coyoteTime;
        } else if (this.coyoteTimer > 0 && !this.isGrounded) {
            this.coyoteTimer -= deltaTime;
        } else if (this.isGrounded) {
            this.coyoteTimer = 0;
        }

        // Update jump hold timer
        if (this.isJumping && this.inputJump) {
            this.jumpHoldTimer += deltaTime;
        }
    }

    updatePhysics(deltaTime) {
        const pos = this.gameObject.position;

        // Horizontal movement
        let targetVelX = 0;
        let currentAccel = this.acceleration;
        let controlFactor = this.isGrounded ? 1 : this.airControl;

        if (this.inputLeft) {
            targetVelX = -this.moveSpeed;
        } else if (this.inputRight) {
            targetVelX = this.moveSpeed;
        }

        // Apply acceleration or deceleration
        if (targetVelX !== 0) {
            // Accelerating towards target
            const accel = currentAccel * controlFactor;
            if (Math.abs(this.velocity.x) < Math.abs(targetVelX)) {
                this.velocity.x = this.moveTowards(this.velocity.x, targetVelX, accel * deltaTime);
            } else {
                this.velocity.x = targetVelX;
            }
        } else {
            // Decelerating to stop
            let decel = this.deceleration * controlFactor; // Changed from const to let
            if (this.isGrounded) {
                // Apply ground friction
                decel *= this.groundFriction; // This line was causing the error
            }
            this.velocity.x = this.moveTowards(this.velocity.x, 0, decel * deltaTime);
        }

        // Apply air resistance
        if (!this.isGrounded) {
            this.velocity.x *= Math.pow(this.airResistance, deltaTime);
        }

        // Gravity
        if (!this.isGrounded || this.velocity.y > 0) {
            this.velocity.y += this.gravity * deltaTime;

            // Cap fall speed
            if (this.velocity.y > this.maxFallSpeed) {
                this.velocity.y = this.maxFallSpeed;
            }
        }

        // Variable jump height
        if (this.variableJumpHeight && this.isJumping && this.inputJumpReleased && this.velocity.y < 0) {
            if (this.jumpHoldTimer < this.minJumpTime) {
                // Jump was released too early, reduce upward velocity
                this.velocity.y *= 0.5;
            }
            this.isJumping = false;
        }

        // End jump if max time reached
        if (this.isJumping && this.jumpHoldTimer >= this.maxJumpTime) {
            this.isJumping = false;
        }
    }

    checkGroundCollision() {
        this.wasGrounded = this.isGrounded;
        this.isGrounded = false;

        if (!this.hillsModule) return;

        const pos = this.gameObject.position;
        const characterBottom = pos.y + this.characterHeight / 2;
        const characterLeft = pos.x - this.characterWidth / 2;
        const characterRight = pos.x + this.characterWidth / 2;

        // Check ground collision at multiple points along character width
        const checkPoints = 3;
        let lowestGroundY = Infinity;
        let hasGroundContact = false;

        for (let i = 0; i < checkPoints; i++) {
            const checkX = characterLeft + (characterRight - characterLeft) * (i / (checkPoints - 1));
            const groundY = this.hillsModule.getGroundY(checkX);

            if (groundY < lowestGroundY) {
                lowestGroundY = groundY;
            }

            // Check if character is touching or penetrating ground
            if (characterBottom >= groundY - this.groundCheckDistance) {
                hasGroundContact = true;
            }
        }

        if (hasGroundContact && lowestGroundY !== Infinity) {
            this.isGrounded = true;
            this.lastGroundY = lowestGroundY;

            // Position character on ground if falling or penetrating
            if (this.velocity.y >= 0 && characterBottom > lowestGroundY) {
                this.gameObject.position.y = lowestGroundY - this.characterHeight / 2;
                this.velocity.y = 0;
                this.isJumping = false;
                this.jumpHoldTimer = 0;
            }

            // Calculate ground normal for slopes (simplified)
            this.calculateGroundNormal(pos.x);
        }
    }

    calculateGroundNormal(centerX) {
        if (!this.hillsModule) return;

        const sampleDistance = 5;
        const leftGroundY = this.hillsModule.getGroundY(centerX - sampleDistance);
        const rightGroundY = this.hillsModule.getGroundY(centerX + sampleDistance);

        const deltaY = rightGroundY - leftGroundY;
        const deltaX = sampleDistance * 2;

        // Calculate slope angle
        const slopeAngle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;

        // Update ground normal
        this.groundNormal.x = -deltaY / Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        this.groundNormal.y = -deltaX / Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    }

    handleJump() {
        // Check if we can jump (grounded or coyote time)
        const canJump = this.isGrounded || this.coyoteTimer > 0;

        if (this.jumpBufferTimer > 0 && canJump && !this.isJumping) {
            // Perform jump
            this.velocity.y = -this.jumpForce;
            this.isJumping = true;
            this.jumpHoldTimer = 0;
            this.jumpBufferTimer = 0;
            this.coyoteTimer = 0;
            this.isGrounded = false;
        }
    }

    updatePosition(deltaTime) {
        // Apply velocity to position
        this.gameObject.position.x += this.velocity.x * deltaTime;
        this.gameObject.position.y += this.velocity.y * deltaTime;
    }

    findHillsModule() {
        if (this.hillsModule && this.hillsObject) return; // Already found

        // Try using the scene's method instead of engine's
        const hillsObject = window.engine?.scene?.findGameObjectByName(this.hillsObjectName) ||
            window.engine?.findGameObjectByName(this.hillsObjectName);

        if (hillsObject) {
            // Look for DrawPlatformerHills module
            const hillsModule = hillsObject.getModuleByType("DrawPlatformerHills");

            if (hillsModule) {
                this.hillsModule = hillsModule;
                this.hillsObject = hillsObject;
                console.log(`Platform character connected to hills module on ${this.hillsObjectName}`);
            } else {
                console.warn(`GameObject '${this.hillsObjectName}' found but no DrawPlatformerHills module detected`);
            }
        } else if (this.hillsObjectName) {
            // Debug: Log available object names
            console.warn(`GameObject '${this.hillsObjectName}' not found for platform character`);
            console.log('Available objects:', window.engine?.gameObjects?.map(obj => obj.name) || []);
        }
    }

    // Utility function
    moveTowards(current, target, maxDelta) {
        if (Math.abs(target - current) <= maxDelta) {
            return target;
        }
        return current + Math.sign(target - current) * maxDelta;
    }

    // Public API
    isCharacterGrounded() {
        return this.isGrounded;
    }

    getCharacterVelocity() {
        return this.velocity.clone();
    }

    setCharacterPosition(x, y) {
        this.gameObject.position.x = x;
        this.gameObject.position.y = y;
    }

    addForce(forceX, forceY) {
        this.velocity.x += forceX;
        this.velocity.y += forceY;
    }

    draw(ctx) {
        const pos = this.gameObject.position;

        ctx.save();

        // Draw character
        ctx.fillStyle = this.characterColor;
        ctx.fillRect(
            -this.characterWidth / 2,
            -this.characterHeight / 2,
            this.characterWidth,
            this.characterHeight
        );

        // Draw hitbox outline
        if (this.showHitbox) {
            ctx.strokeStyle = this.isGrounded ? "#00FF00" : "#FF0000";
            ctx.lineWidth = 2;
            ctx.strokeRect(
                -this.characterWidth / 2,
                -this.characterHeight / 2,
                this.characterWidth,
                this.characterHeight
            );
        }

        // Draw direction indicator
        const eyeSize = 3;
        const eyeOffsetX = this.velocity.x > 0 ? 3 : this.velocity.x < 0 ? -3 : 0;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(eyeOffsetX - eyeSize / 2, -eyeSize, eyeSize, eyeSize);

        ctx.restore();

        // Draw debug info
        if (this.showDebugInfo) {
            this.drawDebugInfo(ctx);
        }
    }

    drawDebugInfo(ctx) {
        const guiCtx = window.engine?.getGuiCanvas();
        if (!guiCtx) return;

        guiCtx.save();
        guiCtx.fillStyle = "#FFFFFF";
        guiCtx.font = "12px Arial";
        guiCtx.textAlign = "left";

        let y = 120;
        const lineHeight = 15;

        guiCtx.fillText(`=== Platform Character Debug ===`, 10, y);
        y += lineHeight;
        guiCtx.fillText(`Hills Module: ${this.hillsModule ? 'Connected' : 'Not Found'}`, 10, y);
        y += lineHeight;
        guiCtx.fillText(`Hills Object: ${this.hillsObjectName}`, 10, y);
        y += lineHeight;
        guiCtx.fillText(`Position: ${this.gameObject.position.x.toFixed(1)}, ${this.gameObject.position.y.toFixed(1)}`, 10, y);
        y += lineHeight;
        guiCtx.fillText(`Velocity: ${this.velocity.x.toFixed(1)}, ${this.velocity.y.toFixed(1)}`, 10, y);
        y += lineHeight;
        guiCtx.fillText(`Grounded: ${this.isGrounded}`, 10, y);
        y += lineHeight;
        guiCtx.fillText(`Can Jump: ${this.isGrounded || this.coyoteTimer > 0}`, 10, y);
        y += lineHeight;
        guiCtx.fillText(`Jump Buffer: ${this.jumpBufferTimer.toFixed(2)}s`, 10, y);
        y += lineHeight;
        guiCtx.fillText(`Coyote Time: ${this.coyoteTimer.toFixed(2)}s`, 10, y);
        y += lineHeight;

        if (this.hillsModule) {
            const groundY = this.hillsModule.getGroundY(this.gameObject.position.x);
            guiCtx.fillText(`Ground Y: ${groundY.toFixed(1)}`, 10, y);
            y += lineHeight;
        }

        guiCtx.fillText(`Input: L:${this.inputLeft} R:${this.inputRight} J:${this.inputJump}`, 10, y);

        guiCtx.restore();
    }

    toJSON() {
        const json = super.toJSON();
        json.hillsObjectName = this.hillsObjectName;
        json.moveSpeed = this.moveSpeed;
        json.acceleration = this.acceleration;
        json.deceleration = this.deceleration;
        json.airControl = this.airControl;
        json.jumpForce = this.jumpForce;
        json.jumpBufferTime = this.jumpBufferTime;
        json.coyoteTime = this.coyoteTime;
        json.variableJumpHeight = this.variableJumpHeight;
        json.minJumpTime = this.minJumpTime;
        json.maxJumpTime = this.maxJumpTime;
        json.gravity = this.gravity;
        json.maxFallSpeed = this.maxFallSpeed;
        json.groundFriction = this.groundFriction;
        json.airResistance = this.airResistance;
        json.characterWidth = this.characterWidth;
        json.characterHeight = this.characterHeight;
        json.characterColor = this.characterColor;
        json.showDebugInfo = this.showDebugInfo;
        json.showHitbox = this.showHitbox;
        return json;
    }

    fromJSON(json) {
        super.fromJSON(json);
        if (json.hillsObjectName !== undefined) this.hillsObjectName = json.hillsObjectName;
        if (json.moveSpeed !== undefined) this.moveSpeed = json.moveSpeed;
        if (json.acceleration !== undefined) this.acceleration = json.acceleration;
        if (json.deceleration !== undefined) this.deceleration = json.deceleration;
        if (json.airControl !== undefined) this.airControl = json.airControl;
        if (json.jumpForce !== undefined) this.jumpForce = json.jumpForce;
        if (json.jumpBufferTime !== undefined) this.jumpBufferTime = json.jumpBufferTime;
        if (json.coyoteTime !== undefined) this.coyoteTime = json.coyoteTime;
        if (json.variableJumpHeight !== undefined) this.variableJumpHeight = json.variableJumpHeight;
        if (json.minJumpTime !== undefined) this.minJumpTime = json.minJumpTime;
        if (json.maxJumpTime !== undefined) this.maxJumpTime = json.maxJumpTime;
        if (json.gravity !== undefined) this.gravity = json.gravity;
        if (json.maxFallSpeed !== undefined) this.maxFallSpeed = json.maxFallSpeed;
        if (json.groundFriction !== undefined) this.groundFriction = json.groundFriction;
        if (json.airResistance !== undefined) this.airResistance = json.airResistance;
        if (json.characterWidth !== undefined) this.characterWidth = json.characterWidth;
        if (json.characterHeight !== undefined) this.characterHeight = json.characterHeight;
        if (json.characterColor !== undefined) this.characterColor = json.characterColor;
        if (json.showDebugInfo !== undefined) this.showDebugInfo = json.showDebugInfo;
        if (json.showHitbox !== undefined) this.showHitbox = json.showHitbox;
    }
}

window.PlatformCharacterAuto = PlatformCharacterAuto;
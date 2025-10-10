/**
 * Metroidvania Player Module
 * Advanced 2D player character with metroidvania-style movement, abilities, and progression
 */
class MetroidvaniaPlayer extends Module {
    static namespace = "Metroidvania";
    static description = "Advanced 2D player character with metroidvania-style movement and abilities";
    static allowMultiple = false;
    static iconClass = "fas fa-user";
    static color = "#4CAF50";

    constructor() {
        super("MetroidvaniaPlayer");

        // Movement properties
        this.moveSpeed = 200;
        this.acceleration = 800;
        this.deceleration = 1200;
        this.airControl = 0.3;

        // Jump properties
        this.jumpForce = 400;
        this.jumpBufferTime = 0.1;
        this.coyoteTime = 0.1;
        this.variableJumpHeight = true;
        this.minJumpTime = 0.1;
        this.maxJumpTime = 0.3;
        this.doubleJumpEnabled = false;
        this.doubleJumpForce = 300;
        this.wallJumpEnabled = false;
        this.wallJumpForce = 350;
        this.wallSlideSpeed = 100;

        // Physics properties
        this.gravity = 980;
        this.maxFallSpeed = 600;
        this.groundFriction = 0.8;
        this.airResistance = 0.98;

        // Collision properties
        this.colliderShape = "rectangle";
        this.characterWidth = 24;
        this.characterHeight = 32;
        this.groundSnapDistance = 10;
        this.maxGroundAngle = 45;

        // Wall interaction
        this.wallSlideEnabled = false;
        this.wallStickTime = 0.1;
        this.wallStickTimer = 0;

        // Dash properties
        this.dashEnabled = false;
        this.dashSpeed = 600;
        this.dashDuration = 0.15;
        this.dashCooldown = 1.0;
        this.dashTimer = 0;
        this.dashCooldownTimer = 0;
        this.isDashing = false;

        // Visual properties
        this.characterColor = "#4CAF50";
        this.showDebugInfo = true;
        this.showHitbox = true;

        // Internal state
        this.velocity = new Vector2(0, 0);
        this.isGrounded = false;
        this.wasGrounded = false;
        this.jumpBufferTimer = 0;
        this.coyoteTimer = 0;
        this.jumpHoldTimer = 0;
        this.isJumping = false;
        this.isFalling = false;
        this.groundNormal = new Vector2(0, -1);
        this.lastGroundContact = null;

        // Double jump state
        this.hasDoubleJump = false;
        this.doubleJumpUsed = false;

        // Wall jump state
        this.isWallSliding = false;
        this.wallNormal = new Vector2(0, 0);
        this.wallJumpTimer = 0;

        // Input state
        this.inputLeft = false;
        this.inputRight = false;
        this.inputJump = false;
        this.inputJumpPressed = false;
        this.inputJumpReleased = false;
        this.inputDash = false;
        this.inputDashPressed = false;

        // Facing direction
        this.facingRight = true;

        this.setupProperties();
    }

    setupProperties() {
        // Movement
        this.exposeProperty("moveSpeed", "number", this.moveSpeed, {
            description: "Horizontal movement speed",
            min: 50, max: 500,
            onChange: (value) => { this.moveSpeed = value; }
        });

        this.exposeProperty("acceleration", "number", this.acceleration, {
            description: "Acceleration to reach max speed",
            min: 100, max: 2000,
            onChange: (value) => { this.acceleration = value; }
        });

        this.exposeProperty("airControl", "number", this.airControl, {
            description: "Air control factor (0=no control, 1=full control)",
            min: 0, max: 1, step: 0.1,
            onChange: (value) => { this.airControl = value; }
        });

        // Jump
        this.exposeProperty("jumpForce", "number", this.jumpForce, {
            description: "Jump force",
            min: 100, max: 800,
            onChange: (value) => { this.jumpForce = value; }
        });

        this.exposeProperty("doubleJumpEnabled", "boolean", this.doubleJumpEnabled, {
            description: "Enable double jump ability",
            onChange: (value) => { this.doubleJumpEnabled = value; }
        });

        this.exposeProperty("wallJumpEnabled", "boolean", this.wallJumpEnabled, {
            description: "Enable wall jump ability",
            onChange: (value) => { this.wallJumpEnabled = value; }
        });

        // Dash
        this.exposeProperty("dashEnabled", "boolean", this.dashEnabled, {
            description: "Enable dash ability",
            onChange: (value) => { this.dashEnabled = value; }
        });

        this.exposeProperty("dashSpeed", "number", this.dashSpeed, {
            description: "Dash speed",
            min: 200, max: 1000,
            onChange: (value) => { this.dashSpeed = value; }
        });

        // Physics
        this.exposeProperty("gravity", "number", this.gravity, {
            description: "Gravity force",
            min: 200, max: 2000,
            onChange: (value) => { this.gravity = value; }
        });

        this.exposeProperty("maxFallSpeed", "number", this.maxFallSpeed, {
            description: "Maximum falling speed",
            min: 200, max: 1000,
            onChange: (value) => { this.maxFallSpeed = value; }
        });

        // Collision
        this.exposeProperty("colliderShape", "enum", this.colliderShape, {
            description: "Collider shape",
            options: ["rectangle", "circle"],
            onChange: (value) => { this.colliderShape = value; }
        });

        this.exposeProperty("characterWidth", "number", this.characterWidth, {
            description: "Character width",
            min: 8, max: 64,
            onChange: (value) => { this.characterWidth = value; }
        });

        this.exposeProperty("characterHeight", "number", this.characterHeight, {
            description: "Character height",
            min: 16, max: 128,
            onChange: (value) => { this.characterHeight = value; }
        });

        // Visual
        this.exposeProperty("characterColor", "color", this.characterColor, {
            description: "Character color",
            onChange: (value) => { this.characterColor = value; }
        });

        this.exposeProperty("showDebugInfo", "boolean", this.showDebugInfo, {
            description: "Show debug information",
            onChange: (value) => { this.showDebugInfo = value; }
        });
    }

    start() {
        // Initialize state
        this.facingRight = true;
    }

    loop(deltaTime) {
        this.updateInput();
        this.updateTimers(deltaTime);
        this.updatePhysics(deltaTime);
        this.checkCollisions();
        this.handleJump();
        this.handleDash();
        this.handleWallSlide();
        this.updatePosition(deltaTime);
    }

    updateInput() {
        if (!window.input) return;

        const prevJump = this.inputJump;
        const prevDash = this.inputDash;

        this.inputLeft = window.input.keyDown('ArrowLeft') || window.input.keyDown('a');
        this.inputRight = window.input.keyDown('ArrowRight') || window.input.keyDown('d');
        this.inputJump = window.input.keyDown('Space') || window.input.keyDown('ArrowUp') || window.input.keyDown('w');
        this.inputDash = window.input.keyDown('Shift') || window.input.keyDown('x');

        this.inputJumpPressed = this.inputJump && !prevJump;
        this.inputJumpReleased = !this.inputJump && prevJump;
        this.inputDashPressed = this.inputDash && !prevDash;

        // Update facing direction
        if (this.inputLeft && !this.inputRight) {
            this.facingRight = false;
        } else if (this.inputRight && !this.inputLeft) {
            this.facingRight = true;
        }
    }

    updateTimers(deltaTime) {
        // Jump buffer timer
        if (this.inputJumpPressed) {
            this.jumpBufferTimer = this.jumpBufferTime;
        } else if (this.jumpBufferTimer > 0) {
            this.jumpBufferTimer -= deltaTime;
        }

        // Coyote timer
        if (this.wasGrounded && !this.isGrounded) {
            this.coyoteTimer = this.coyoteTime;
        } else if (this.coyoteTimer > 0 && !this.isGrounded) {
            this.coyoteTimer -= deltaTime;
        } else if (this.isGrounded) {
            this.coyoteTimer = 0;
        }

        // Jump hold timer
        if (this.isJumping && this.inputJump) {
            this.jumpHoldTimer += deltaTime;
        }

        // Dash timers
        if (this.dashTimer > 0) {
            this.dashTimer -= deltaTime;
            if (this.dashTimer <= 0) {
                this.isDashing = false;
            }
        }

        if (this.dashCooldownTimer > 0) {
            this.dashCooldownTimer -= deltaTime;
        }

        // Wall stick timer
        if (this.isWallSliding) {
            this.wallStickTimer = this.wallStickTime;
        } else if (this.wallStickTimer > 0) {
            this.wallStickTimer -= deltaTime;
        }
    }

    updatePhysics(deltaTime) {
        // Don't apply normal physics while dashing
        if (this.isDashing) {
            return;
        }

        // Horizontal movement
        let targetVelX = 0;
        let controlFactor = this.isGrounded ? 1 : this.airControl;

        if (this.inputLeft) {
            targetVelX = -this.moveSpeed;
        } else if (this.inputRight) {
            targetVelX = this.moveSpeed;
        }

        // Apply acceleration or deceleration
        if (targetVelX !== 0) {
            const accel = this.acceleration * controlFactor;
            if (Math.abs(this.velocity.x) < Math.abs(targetVelX)) {
                this.velocity.x = this.moveTowards(this.velocity.x, targetVelX, accel * deltaTime);
            } else {
                this.velocity.x = targetVelX;
            }
        } else {
            let decel = this.deceleration * controlFactor;
            if (this.isGrounded) {
                decel *= this.groundFriction;
            }
            this.velocity.x = this.moveTowards(this.velocity.x, 0, decel * deltaTime);
        }

        // Apply air resistance
        if (!this.isGrounded) {
            this.velocity.x *= Math.pow(this.airResistance, deltaTime);
        }

        // Vertical movement
        if (!this.isGrounded) {
            // Apply gravity when in air
            this.velocity.y += this.gravity * deltaTime;

            // Cap fall speed
            if (this.velocity.y > this.maxFallSpeed) {
                this.velocity.y = this.maxFallSpeed;
            }
        } else {
            // Reset double jump when grounded
            this.doubleJumpUsed = false;
            this.velocity.y = 0;
        }

        // Variable jump height
        if (this.variableJumpHeight && this.isJumping && this.inputJumpReleased && this.velocity.y < 0) {
            if (this.jumpHoldTimer < this.minJumpTime) {
                this.velocity.y *= 0.5;
            }
            this.isJumping = false;
        }

        // End jump if max time reached
        if (this.isJumping && this.jumpHoldTimer >= this.maxJumpTime) {
            this.isJumping = false;
        }

        this.isFalling = this.velocity.y > 50 && !this.isGrounded;
    }

    checkCollisions() {
        this.wasGrounded = this.isGrounded;
        this.isGrounded = false;
        this.lastGroundContact = null;
        this.isWallSliding = false;
        this.wallNormal = new Vector2(0, 0);

        // Check collisions with tilemap
        const tilemapModule = this.getTilemapModule();
        if (tilemapModule) {
            this.checkTilemapCollisions(tilemapModule);
        }
    }

    checkTilemapCollisions(tilemapModule) {
        const pos = this.gameObject.position;
        const halfWidth = this.characterWidth / 2;
        const halfHeight = this.characterHeight / 2;

        // Check ground collision (bottom)
        const bottomY = pos.y + halfHeight;
        const leftX = pos.x - halfWidth;
        const rightX = pos.x + halfWidth;

        // Check multiple points across the bottom
        const checkPoints = 3;
        for (let i = 0; i < checkPoints; i++) {
            const t = i / (checkPoints - 1);
            const checkX = leftX + (rightX - leftX) * t;
            const checkY = bottomY;

            if (tilemapModule.isSolidAt(checkX, checkY)) {
                const tileY = Math.floor(checkY / tilemapModule.tileSize) * tilemapModule.tileSize;
                const targetY = tileY - halfHeight;

                if (pos.y > targetY - 5) {
                    this.isGrounded = true;
                    this.lastGroundContact = {
                        contactPoint: { x: checkX, y: tileY },
                        targetY: targetY,
                        normal: { x: 0, y: -1 }
                    };
                    this.groundNormal = { x: 0, y: -1 };
                    pos.y = targetY;
                    this.velocity.y = Math.max(0, this.velocity.y);
                    break;
                }
            }
        }

        // Check wall collisions (sides)
        if (this.wallJumpEnabled || this.wallSlideEnabled) {
            const topY = pos.y - halfHeight;
            const bottomY = pos.y + halfHeight;
            const checkX = this.facingRight ? pos.x + halfWidth : pos.x - halfWidth;

            // Check multiple points vertically
            const verticalPoints = 5;
            for (let i = 0; i < verticalPoints; i++) {
                const t = i / (verticalPoints - 1);
                const checkY = topY + (bottomY - topY) * t;

                if (tilemapModule.isSolidAt(checkX, checkY)) {
                    const tileX = Math.floor(checkX / tilemapModule.tileSize) * tilemapModule.tileSize;
                    const normalX = this.facingRight ? -1 : 1;

                    this.isWallSliding = true;
                    this.wallNormal = { x: normalX, y: 0 };

                    // Snap to wall
                    if (this.facingRight) {
                        pos.x = tileX - halfWidth;
                    } else {
                        pos.x = tileX + tilemapModule.tileSize + halfWidth;
                    }

                    // Apply wall sliding
                    if (this.wallSlideEnabled && this.velocity.y > this.wallSlideSpeed) {
                        this.velocity.y = this.wallSlideSpeed;
                    }

                    break;
                }
            }
        }
    }

    getTilemapModule() {
        // Find tilemap module in scene
        const scene = window.engine?.scene;
        if (!scene) return null;

        for (const gameObject of scene.gameObjects) {
            const tilemapModule = gameObject.getModuleByType("MetroidvaniaTilemap");
            if (tilemapModule) {
                return tilemapModule;
            }
        }

        return null;
    }

    handleJump() {
        const canJump = this.isGrounded || this.coyoteTimer > 0;
        const canDoubleJump = this.doubleJumpEnabled && this.hasDoubleJump && !this.doubleJumpUsed;
        const canWallJump = this.wallJumpEnabled && this.isWallSliding && this.wallStickTimer > 0;

        if (this.jumpBufferTimer > 0 && (canJump || canDoubleJump || canWallJump)) {
            let jumpForce = this.jumpForce;

            if (canWallJump) {
                // Wall jump
                this.velocity.y = -this.wallJumpForce;
                this.velocity.x = -this.wallNormal.x * this.wallJumpForce * 0.5;
                this.wallJumpTimer = 0.2;
            } else if (canDoubleJump) {
                // Double jump
                this.velocity.y = -this.doubleJumpForce;
                this.doubleJumpUsed = true;
                this.hasDoubleJump = false;
            } else {
                // Normal jump
                this.velocity.y = -jumpForce;
            }

            this.isJumping = true;
            this.isFalling = false;
            this.jumpHoldTimer = 0;
            this.jumpBufferTimer = 0;
            this.coyoteTimer = 0;
            this.isGrounded = false;
        }
    }

    handleDash() {
        if (!this.dashEnabled) return;

        if (this.inputDashPressed && this.dashCooldownTimer <= 0 && !this.isDashing) {
            this.startDash();
        }
    }

    startDash() {
        this.isDashing = true;
        this.dashTimer = this.dashDuration;
        this.dashCooldownTimer = this.dashCooldown;

        // Dash in facing direction
        const dashDirection = this.facingRight ? 1 : -1;
        this.velocity.x = dashDirection * this.dashSpeed;
        this.velocity.y = 0;
    }

    handleWallSlide() {
        if (!this.wallSlideEnabled || !this.isWallSliding) return;

        // Only slide if moving downward and holding toward wall
        const holdingTowardWall = (this.facingRight && this.inputRight) || (!this.facingRight && this.inputLeft);

        if (this.velocity.y > 0 && holdingTowardWall) {
            this.velocity.y = Math.min(this.velocity.y, this.wallSlideSpeed);
        }
    }

    updatePosition(deltaTime) {
        this.gameObject.position.x += this.velocity.x * deltaTime;
        this.gameObject.position.y += this.velocity.y * deltaTime;
    }

    moveTowards(current, target, maxDelta) {
        if (Math.abs(target - current) <= maxDelta) {
            return target;
        }
        return current + Math.sign(target - current) * maxDelta;
    }

    draw(ctx) {
        ctx.save();

        // Draw character
        ctx.fillStyle = this.characterColor;

        if (this.colliderShape === "circle") {
            const radius = Math.min(this.characterWidth, this.characterHeight) / 2;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();

            if (this.showHitbox) {
                ctx.strokeStyle = this.isGrounded ? "#00FF00" : "#FF0000";
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        } else {
            // Rectangle shape
            ctx.fillRect(
                -this.characterWidth / 2,
                -this.characterHeight / 2,
                this.characterWidth,
                this.characterHeight
            );

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
        }

        // Draw facing indicator
        const eyeSize = 3;
        const eyeOffsetX = this.facingRight ? 3 : -3;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(eyeOffsetX - eyeSize / 2, -eyeSize, eyeSize, eyeSize);

        // Draw dash effect
        if (this.isDashing) {
            ctx.strokeStyle = "#FFFF00";
            ctx.lineWidth = 3;
            ctx.strokeRect(
                -this.characterWidth / 2 - 5,
                -this.characterHeight / 2 - 5,
                this.characterWidth + 10,
                this.characterHeight + 10
            );
        }

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

        guiCtx.fillText(`=== Metroidvania Player Debug ===`, 10, y);
        y += lineHeight;
        guiCtx.fillText(`Position: ${this.gameObject.position.x.toFixed(1)}, ${this.gameObject.position.y.toFixed(1)}`, 10, y);
        y += lineHeight;
        guiCtx.fillText(`Velocity: ${this.velocity.x.toFixed(1)}, ${this.velocity.y.toFixed(1)}`, 10, y);
        y += lineHeight;
        guiCtx.fillText(`Grounded: ${this.isGrounded} | Dashing: ${this.isDashing}`, 10, y);
        y += lineHeight;
        guiCtx.fillText(`Wall Sliding: ${this.isWallSliding} | Double Jump: ${this.hasDoubleJump}`, 10, y);
        y += lineHeight;
        guiCtx.fillText(`Facing: ${this.facingRight ? 'Right' : 'Left'}`, 10, y);

        guiCtx.restore();
    }

    // Public API methods
    addAbility(ability) {
        switch (ability) {
            case 'doubleJump':
                this.doubleJumpEnabled = true;
                this.hasDoubleJump = true;
                break;
            case 'wallJump':
                this.wallJumpEnabled = true;
                break;
            case 'dash':
                this.dashEnabled = true;
                break;
        }
    }

    removeAbility(ability) {
        switch (ability) {
            case 'doubleJump':
                this.doubleJumpEnabled = false;
                break;
            case 'wallJump':
                this.wallJumpEnabled = false;
                break;
            case 'dash':
                this.dashEnabled = false;
                break;
        }
    }

    toJSON() {
        const json = super.toJSON();
        json.moveSpeed = this.moveSpeed;
        json.acceleration = this.acceleration;
        json.deceleration = this.deceleration;
        json.airControl = this.airControl;
        json.jumpForce = this.jumpForce;
        json.doubleJumpEnabled = this.doubleJumpEnabled;
        json.doubleJumpForce = this.doubleJumpForce;
        json.wallJumpEnabled = this.wallJumpEnabled;
        json.wallJumpForce = this.wallJumpForce;
        json.wallSlideEnabled = this.wallSlideEnabled;
        json.wallSlideSpeed = this.wallSlideSpeed;
        json.dashEnabled = this.dashEnabled;
        json.dashSpeed = this.dashSpeed;
        json.dashDuration = this.dashDuration;
        json.dashCooldown = this.dashCooldown;
        json.gravity = this.gravity;
        json.maxFallSpeed = this.maxFallSpeed;
        json.colliderShape = this.colliderShape;
        json.characterWidth = this.characterWidth;
        json.characterHeight = this.characterHeight;
        json.characterColor = this.characterColor;
        json.showDebugInfo = this.showDebugInfo;
        json.showHitbox = this.showHitbox;
        return json;
    }

    fromJSON(json) {
        super.fromJSON(json);
        if (json.moveSpeed !== undefined) this.moveSpeed = json.moveSpeed;
        if (json.acceleration !== undefined) this.acceleration = json.acceleration;
        if (json.deceleration !== undefined) this.deceleration = json.deceleration;
        if (json.airControl !== undefined) this.airControl = json.airControl;
        if (json.jumpForce !== undefined) this.jumpForce = json.jumpForce;
        if (json.doubleJumpEnabled !== undefined) this.doubleJumpEnabled = json.doubleJumpEnabled;
        if (json.doubleJumpForce !== undefined) this.doubleJumpForce = json.doubleJumpForce;
        if (json.wallJumpEnabled !== undefined) this.wallJumpEnabled = json.wallJumpEnabled;
        if (json.wallJumpForce !== undefined) this.wallJumpForce = json.wallJumpForce;
        if (json.wallSlideEnabled !== undefined) this.wallSlideEnabled = json.wallSlideEnabled;
        if (json.wallSlideSpeed !== undefined) this.wallSlideSpeed = json.wallSlideSpeed;
        if (json.dashEnabled !== undefined) this.dashEnabled = json.dashEnabled;
        if (json.dashSpeed !== undefined) this.dashSpeed = json.dashSpeed;
        if (json.dashDuration !== undefined) this.dashDuration = json.dashDuration;
        if (json.dashCooldown !== undefined) this.dashCooldown = json.dashCooldown;
        if (json.gravity !== undefined) this.gravity = json.gravity;
        if (json.maxFallSpeed !== undefined) this.maxFallSpeed = json.maxFallSpeed;
        if (json.colliderShape !== undefined) this.colliderShape = json.colliderShape;
        if (json.characterWidth !== undefined) this.characterWidth = json.characterWidth;
        if (json.characterHeight !== undefined) this.characterHeight = json.characterHeight;
        if (json.characterColor !== undefined) this.characterColor = json.characterColor;
        if (json.showDebugInfo !== undefined) this.showDebugInfo = json.showDebugInfo;
        if (json.showHitbox !== undefined) this.showHitbox = json.showHitbox;
    }
}

window.MetroidvaniaPlayer = MetroidvaniaPlayer;
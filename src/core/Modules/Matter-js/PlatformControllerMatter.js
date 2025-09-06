/**
 * PlatformCharacter - A controllable 2D platformer character module using RigidBody
 * Requires RigidBody module on the same GameObject
 */
class PlatformControllerMatter extends Module {
    static allowMultiple = false;
    static namespace = "Matter.js";
    static description = "Controllable 2D platform character with jumping and movement for Matter.js";
    static iconClass = "fas fa-user";

    constructor() {
        super("PlatformControllerMatter");

        // Control settings
        this.playerControlled = true;           // Can be controlled with arrow keys
        this.leftKey = "arrowleft";             // Move left key
        this.rightKey = "arrowright";           // Move right key
        this.jumpKey = "arrowup";               // Jump key

        // Movement properties
        this.moveSpeed = 200;                   // Horizontal movement speed in pixels/second
        this.jumpForce = 400;                   // Jump force
        this.airControl = 0.7;                  // Air control multiplier (0-1)
        this.groundFriction = 0.8;              // Friction when on ground
        this.airFriction = 0.02;                // Friction when in air

        // Jump settings
        this.maxJumpTime = 0.3;                 // Max time jump button can be held
        this.coyoteTime = 0.15;                 // Time to jump after leaving ground
        this.jumpBufferTime = 0.15;             // Time jump input is buffered

        // Slope settings
        this.maxWalkableAngle = 45;             // Maximum angle in degrees for walking
        this.slideAngle = 60;                   // Angle where sliding starts
        this.slideForce = 150;                  // Force applied when sliding
        this.slopeSnapForce = 300;              // Force to snap to ground on slopes

        // Ground detection
        this.groundDetectionDistance = 10;      // Increased raycast distance
        this.groundDetectionWidth = 0.8;        // Width multiplier for ground detection

        // Internal state
        this.isGrounded = false;                // Whether character is on ground
        this.isJumping = false;                 // Whether currently jumping
        this.jumpTime = 0;                      // Time jump has been held
        this.coyoteTimer = 0;                   // Coyote time counter
        this.jumpBufferTimer = 0;               // Jump buffer counter
        this.facingDirection = 1;               // 1 for right, -1 for left
        this.groundNormal = { x: 0, y: -1 };    // Normal of ground surface
        this.groundAngle = 0;                   // Angle of ground in degrees
        this.isOnSlope = false;                 // Whether on a slope
        this.canWalkOnSlope = true;             // Whether can walk on current slope
        this.shouldSlide = false;               // Whether should slide on slope

        this.rigidBody = null;                  // Reference to RigidBody component
        this.moveInput = 0;                     // Current movement input

        // Debug options
        this.showDebugInfo = false;             // Show debug info

        this.require("RigidBody");

        // ...existing property exposures...
        this.exposeProperty("playerControlled", "boolean", this.playerControlled, {
            description: "Can be controlled with arrow keys",
            onChange: (val) => { this.playerControlled = val; }
        });

        this.exposeProperty("moveSpeed", "number", this.moveSpeed, {
            description: "Horizontal movement speed",
            min: 50,
            max: 1000,
            step: 10,
            onChange: (val) => { this.moveSpeed = val; }
        });

        this.exposeProperty("jumpForce", "number", this.jumpForce, {
            description: "Jump force",
            min: 100,
            max: 1000,
            step: 10,
            onChange: (val) => { this.jumpForce = val; }
        });

        this.exposeProperty("airControl", "number", this.airControl, {
            description: "Air control multiplier",
            min: 0,
            max: 1,
            step: 0.1,
            onChange: (val) => { this.airControl = val; }
        });

        this.exposeProperty("maxWalkableAngle", "number", this.maxWalkableAngle, {
            description: "Maximum walkable slope angle (degrees)",
            min: 0,
            max: 90,
            step: 5,
            onChange: (val) => { this.maxWalkableAngle = val; }
        });

        this.exposeProperty("slideAngle", "number", this.slideAngle, {
            description: "Angle where sliding starts (degrees)",
            min: 0,
            max: 90,
            step: 5,
            onChange: (val) => { this.slideAngle = val; }
        });

        this.exposeProperty("slopeSnapForce", "number", this.slopeSnapForce, {
            description: "Force to snap character to ground on slopes",
            min: 0,
            max: 1000,
            step: 50,
            onChange: (val) => { this.slopeSnapForce = val; }
        });

        this.exposeProperty("showDebugInfo", "boolean", this.showDebugInfo, {
            description: "Show debug information",
            onChange: (val) => { this.showDebugInfo = val; }
        });
    }

    start() {
        // Get the RigidBody component
        this.rigidBody = this.gameObject.getModule("RigidBody");

        if (!this.rigidBody) {
            console.error("PlatformCharacter requires a RigidBody component on the same GameObject!");
            return;
        }

        // Configure RigidBody for character physics
        this.rigidBody.useGravity = true;       // Enable gravity
        this.rigidBody.bodyType = "dynamic";    // Must be dynamic
        this.rigidBody.friction = this.groundFriction; // Set initial friction
        this.rigidBody.frictionAir = this.airFriction; // Air resistance
        this.rigidBody.density = 1.0;           // Moderate density
        this.rigidBody.fixedRotation = true;    // Prevent rotation

        // Initialize timers to prevent immediate jumping
        this.jumpBufferTimer = 0;
        this.coyoteTimer = 0;

        console.log(this.playerControlled ? "Player-controlled character initialized." : "AI-controlled character initialized.");
    }

    loop(deltaTime) {
        if (!this.rigidBody || !this.rigidBody.body) return;

        // Update timers
        this.coyoteTimer = Math.max(0, this.coyoteTimer - deltaTime);
        this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - deltaTime);

        // Check if grounded with proper detection
        this.checkGrounded();

        // Handle input
        this.handleInput(deltaTime);

        // Apply slope effects BEFORE movement
        this.applySlopeEffects(deltaTime);

        // Apply movement
        this.applyMovement(deltaTime);

        // Apply jumping
        this.applyJumping(deltaTime);

        // Apply slope snapping for better ground following
        this.applySlopeSnapping(deltaTime);
    }

    checkGrounded() {
        if (!this.rigidBody || !this.rigidBody.body) return;

        const pos = this.gameObject.position;
        const bodyWidth = this.rigidBody.width || 32;
        const bodyHeight = this.rigidBody.height || 32;

        // Start rays just above the feet to avoid self-intersection, cast downward
        const footY = pos.y + bodyHeight * 0.5 - 1;
        const span = (bodyWidth * this.groundDetectionWidth) * 0.5;
        const origins = [
            new Vector2(pos.x, footY),              // center
            new Vector2(pos.x - span, footY),      // left
            new Vector2(pos.x + span, footY)       // right
        ];
        const dir = new Vector2(0, 1);
        const rayLength = this.groundDetectionDistance;

        const gameObjects = this._getRaycastObjects();
        const hits = [];

        for (const o of origins) {
            const hit = window.Raycast.castAll(o, dir, rayLength, gameObjects, 0xFFFF, this.gameObject);
            if (hit) hits.push(hit);
        }

        const velocity = this.rigidBody.getVelocity();
        const wasGrounded = this.isGrounded;

        if (hits.length > 0) {
            // Closest hit distance
            hits.sort((a, b) => a.distance - b.distance);
            const closestDist = hits[0].distance;

            // Average normal
            let nx = 0, ny = 0;
            for (const h of hits) { nx += h.normal.x; ny += h.normal.y; }
            const nlen = Math.hypot(nx, ny) || 1;
            const normal = { x: nx / nlen, y: ny / nlen };

            this.groundNormal = normal;
            this.groundAngle = Math.acos(Math.abs(normal.y)) * (180 / Math.PI);
            this.isOnSlope = this.groundAngle > 2;
            this.canWalkOnSlope = this.groundAngle <= this.maxWalkableAngle;
            this.shouldSlide = this.groundAngle > this.slideAngle;

            // Grounded if close enough and not moving up fast
            const tolerance = 1.0;
            this.isGrounded = (closestDist <= (this.groundDetectionDistance + tolerance)) && velocity.y >= -100;
        } else {
            this.isGrounded = false;
            this.isOnSlope = false;
            this.canWalkOnSlope = true;
            this.shouldSlide = false;
            this.groundNormal = { x: 0, y: -1 };
            this.groundAngle = 0;
        }

        // Update physics properties with slope-aware friction
        if (this.rigidBody && this.rigidBody.body) {
            if (this.isGrounded) {
                if (this.groundAngle < 15) {
                    this.rigidBody.body.friction = 0.1;
                } else if (this.groundAngle < this.maxWalkableAngle) {
                    const frictionMultiplier = (this.groundAngle - 15) / (this.maxWalkableAngle - 15);
                    this.rigidBody.body.friction = 0.1 + (this.groundFriction - 0.1) * frictionMultiplier;
                } else {
                    this.rigidBody.body.friction = this.groundFriction;
                }
            } else {
                this.rigidBody.body.friction = this.airFriction;
            }
        }

        // Update coyote time
        if (this.isGrounded) {
            this.coyoteTimer = this.coyoteTime;
            if (this.isJumping && velocity.y >= -50) {
                this.isJumping = false;
                this.jumpTime = 0;
            }
        }
    }

    // Helper to get scene objects for Raycast
    _getRaycastObjects() {
        return (window.engine && window.engine.gameObjects)
            ? window.engine.gameObjects
            : (window.scene && window.scene.gameObjects) ? window.scene.gameObjects : [];
    }

    raycastGround(startPoint, distance) {
        // Simple raycast implementation - you might want to use Matter.js Query.ray if available
        const endPoint = { x: startPoint.x, y: startPoint.y + distance };

        // Get all bodies in the scene
        const bodies = Matter.Composite.allBodies(this.rigidBody.engine.world);

        for (const body of bodies) {
            if (body === this.rigidBody.body) continue; // Skip self

            // Simple AABB check first
            if (startPoint.x >= body.bounds.min.x && startPoint.x <= body.bounds.max.x &&
                endPoint.y >= body.bounds.min.y && startPoint.y <= body.bounds.max.y) {

                // More detailed collision detection would go here
                // For now, assume we hit and calculate normal based on body
                const centerX = (body.bounds.min.x + body.bounds.max.x) * 0.5;
                const centerY = (body.bounds.min.y + body.bounds.max.y) * 0.5;

                // Simple normal calculation
                const dx = startPoint.x - centerX;
                const dy = startPoint.y - centerY;
                const length = Math.sqrt(dx * dx + dy * dy);

                return {
                    hit: true,
                    normal: length > 0 ? { x: dx / length, y: dy / length } : { x: 0, y: -1 }
                };
            }
        }

        return { hit: false, normal: { x: 0, y: -1 } };
    }

    handleInput(deltaTime) {
        if (!this.playerControlled) return;

        // Reset input
        this.moveInput = 0;

        // Horizontal movement
        if (window.input && window.input.keyDown) {
            if (window.input.keyDown(this.leftKey)) {
                this.moveInput = -1;
                this.facingDirection = -1;
            }
            if (window.input.keyDown(this.rightKey)) {
                this.moveInput = 1;
                this.facingDirection = 1;
            }

            // Jump input - check for key press
            if (window.input.keyPressed && window.input.keyPressed(this.jumpKey)) {
                this.jumpBufferTimer = this.jumpBufferTime;
            }
        }
    }

    applySlopeEffects(deltaTime) {
        if (!this.isGrounded) return;

        const velocity = this.rigidBody.getVelocity();

        // Only apply sliding effects on slopes steeper than slideAngle
        if (this.shouldSlide) {
            // Prevent movement up steep slopes
            if (Math.abs(this.moveInput) > 0) {
                const movingUpSlope = (this.moveInput > 0 && this.groundNormal.x < 0) ||
                    (this.moveInput < 0 && this.groundNormal.x > 0);

                if (movingUpSlope) {
                    this.moveInput *= 0.1; // Severely limit uphill movement
                }
            }

            // Apply sliding force when not actively moving or when moving downhill
            if (Math.abs(this.moveInput) < 0.1 || !this.canWalkOnSlope) {
                const slideDirection = this.groundNormal.x > 0 ? -1 : 1;
                const slideFactor = (this.groundAngle - this.slideAngle) / 30;
                const slideForceAmount = this.slideForce * Math.min(1, slideFactor);

                this.rigidBody.applyForce({
                    x: slideDirection * slideForceAmount * deltaTime,
                    y: 0
                });
            }
        }
    }

    applyMovement(deltaTime) {
        const velocity = this.rigidBody.getVelocity();
        let targetSpeed = this.moveInput * this.moveSpeed;

        // Special handling for slopes
        if (this.isGrounded && this.isOnSlope && this.canWalkOnSlope) {
            // On small slopes (< 15 degrees), maintain normal speed
            if (this.groundAngle < 15) {
                // No speed reduction on small slopes
                targetSpeed = this.moveInput * this.moveSpeed;
            } else {
                // Project movement along slope for steeper slopes
                const slopeRight = new Vector2(-this.groundNormal.y, this.groundNormal.x);
                const movementDirection = slopeRight.multiply(this.moveInput);
                targetSpeed = movementDirection.magnitude() * this.moveSpeed * Math.sign(this.moveInput);

                // Reduce speed on steeper slopes
                const slopeFactor = 1 - (this.groundAngle / this.maxWalkableAngle) * 0.3;
                targetSpeed *= Math.max(0.7, slopeFactor); // Less aggressive speed reduction
            }
        }

        // Don't allow movement on non-walkable slopes when moving uphill
        if (this.isGrounded && !this.canWalkOnSlope) {
            const movingUpSlope = (this.moveInput > 0 && this.groundNormal.x < 0) ||
                (this.moveInput < 0 && this.groundNormal.x > 0);
            if (movingUpSlope) {
                targetSpeed *= 0.1;
            }
        }

        // Air control
        if (!this.isGrounded) {
            targetSpeed *= this.airControl;
        }

        // Apply movement force
        const speedDiff = targetSpeed - velocity.x;
        const acceleration = this.isGrounded ? 2000 : 800;
        let force = speedDiff * acceleration * deltaTime;

        // Limit force application
        const maxForce = this.moveSpeed * (this.isGrounded ? 5 : 3);
        force = Math.max(-maxForce, Math.min(maxForce, force));

        if (Math.abs(force) > 1) {
            this.rigidBody.applyForce({ x: force, y: 0 });
        }
    }

    applyJumping(deltaTime) {
        // Check if we should start jumping
        if (this.jumpBufferTimer > 0 && (this.isGrounded || this.coyoteTimer > 0) && !this.isJumping) {
            this.startJump();
        }

        // Continue jump if holding button
        if (this.isJumping && this.jumpTime < this.maxJumpTime) {
            if (window.input && window.input.keyDown && window.input.keyDown(this.jumpKey)) {
                this.jumpTime += deltaTime;
                const jumpPower = this.jumpForce * 0.3 * deltaTime; // Continued jump force
                this.rigidBody.applyForce({ x: 0, y: -jumpPower });
            } else {
                // Stop jumping if button released
                this.isJumping = false;
            }
        }

        // Stop jumping if max time reached
        if (this.jumpTime >= this.maxJumpTime) {
            this.isJumping = false;
        }
    }

    applySlopeSnapping(deltaTime) {
        // Only apply snapping when grounded, on a slope, moving, and not jumping
        if (!this.isGrounded || !this.isOnSlope || Math.abs(this.moveInput) < 0.1 || this.isJumping) {
            return;
        }

        const velocity = this.rigidBody.getVelocity();

        // Only snap when moving downhill and starting to leave ground
        const movingDownSlope = (this.moveInput > 0 && this.groundNormal.x > 0) ||
            (this.moveInput < 0 && this.groundNormal.x < 0);

        if (movingDownSlope && velocity.y > 0) {
            // Apply downward force to keep character on ground
            const snapForce = this.slopeSnapForce * deltaTime * (this.groundAngle / 45);
            this.rigidBody.applyForce({ x: 0, y: snapForce });
        }
    }

    /*startJump() {
        this.isJumping = true;
        this.jumpTime = 0;
        this.jumpBufferTimer = 0;
        this.coyoteTimer = 0;

        // Apply initial jump force - simplified to just go up
        this.rigidBody.setVelocity({ x: this.rigidBody.getVelocity().x, y: -this.jumpForce });
        
        console.log("Jump started!"); // Debug log
    }*/

    startJump() {
        this.isJumping = true;
        this.jumpTime = 0;
        this.jumpBufferTimer = 0;
        this.coyoteTimer = 0;

        // Apply initial jump force - always jump perpendicular to ground surface
        const jumpDirection = { x: this.groundNormal.x, y: this.groundNormal.y };
        this.rigidBody.applyImpulse({
            x: jumpDirection.x * this.jumpForce * 0.05,
            y: jumpDirection.y * this.jumpForce * 0.8
        });
    }

    draw(ctx) {
        if (!this.showDebugInfo && !this.rigidBody) return;

        const pos = { x: 0, y: 0 };//transform.position;

        ctx.save();
        ctx.fillStyle = "white";
        ctx.strokeStyle = "yellow";
        ctx.font = "10px Arial";
        ctx.textAlign = "left";

        const velocity = this.rigidBody.getVelocity();
        const speed = Math.round(Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y));

        let yOffset = -80;
        ctx.fillText(`Speed: ${speed}px/s`, pos.x + 20, pos.y + yOffset);
        yOffset += 12;
        ctx.fillText(`Grounded: ${this.isGrounded}`, pos.x + 20, pos.y + yOffset);
        yOffset += 12;
        ctx.fillText(`Jumping: ${this.isJumping}`, pos.x + 20, pos.y + yOffset);
        yOffset += 12;
        ctx.fillText(`Slope: ${this.groundAngle.toFixed(1)}°`, pos.x + 20, pos.y + yOffset);
        yOffset += 12;
        ctx.fillText(`Can Walk: ${this.canWalkOnSlope}`, pos.x + 20, pos.y + yOffset);
        yOffset += 12;
        ctx.fillText(`Should Slide: ${this.shouldSlide}`, pos.x + 20, pos.y + yOffset);
        yOffset += 12;
        ctx.fillText(`Coyote: ${this.coyoteTimer.toFixed(2)}`, pos.x + 20, pos.y + yOffset);
        yOffset += 12;
        ctx.fillText(`Buffer: ${this.jumpBufferTimer.toFixed(2)}`, pos.x + 20, pos.y + yOffset);

        // Draw ground normal
        if (this.isGrounded) {
            ctx.strokeStyle = this.canWalkOnSlope ? "green" : "red";
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(pos.x + this.groundNormal.x * 40, pos.y + this.groundNormal.y * 40);
            ctx.stroke();
        }

        // Draw ground detection visualization
        ctx.strokeStyle = this.isGrounded ? "lime" : "red";
        ctx.lineWidth = 2;
        const bodyWidth = this.rigidBody.width || 32;
        const bodyHeight = this.rigidBody.height || 32;

        // Draw detection area
        ctx.strokeRect(
            pos.x - bodyWidth * 0.4,
            pos.y + bodyHeight * 0.3,
            bodyWidth * 0.8,
            this.groundDetectionDistance
        );

        ctx.restore();
    }

    calculateContactNormal(contact, otherBody) {
        // Try to get a better normal from the contact
        if (contact.normal) {
            return contact.normal;
        }

        // Fallback: calculate normal based on bodies
        const transform = this.gameObject.getModule("Transform");
        if (!transform) return { x: 0, y: -1 };

        const pos = transform.position;
        const otherPos = { x: otherBody.position.x, y: otherBody.position.y };

        const dx = pos.x - otherPos.x;
        const dy = pos.y - otherPos.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length > 0) {
            return { x: dx / length, y: dy / length };
        }

        return { x: 0, y: -1 };
    }

    // Public methods for external control
    moveLeft() {
        this.moveInput = -1;
        this.facingDirection = -1;
    }

    moveRight() {
        this.moveInput = 1;
        this.facingDirection = 1;
    }

    stopMoving() {
        this.moveInput = 0;
    }

    jump() {
        this.jumpBufferTimer = this.jumpBufferTime;
    }

    getIsGrounded() {
        return this.isGrounded;
    }

    getFacingDirection() {
        return this.facingDirection;
    }

    getGroundAngle() {
        return this.groundAngle;
    }

    canWalkOnCurrentSlope() {
        return this.canWalkOnSlope;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            playerControlled: this.playerControlled,
            moveSpeed: this.moveSpeed,
            jumpForce: this.jumpForce,
            airControl: this.airControl,
            groundFriction: this.groundFriction,
            airFriction: this.airFriction,
            maxJumpTime: this.maxJumpTime,
            coyoteTime: this.coyoteTime,
            jumpBufferTime: this.jumpBufferTime,
            maxWalkableAngle: this.maxWalkableAngle,
            slideAngle: this.slideAngle,
            slideForce: this.slideForce,
            groundDetectionDistance: this.groundDetectionDistance,
            groundDetectionWidth: this.groundDetectionWidth,
            showDebugInfo: this.showDebugInfo,
            leftKey: this.leftKey,
            rightKey: this.rightKey,
            jumpKey: this.jumpKey
        };
    }

    fromJSON(data) {
        super.fromJSON(data);

        if (!data) return;

        this.playerControlled = data.playerControlled !== undefined ? data.playerControlled : true;
        this.moveSpeed = data.moveSpeed || 200;
        this.jumpForce = data.jumpForce || 400;
        this.airControl = data.airControl || 0.7;
        this.groundFriction = data.groundFriction || 0.8;
        this.airFriction = data.airFriction || 0.02;
        this.maxJumpTime = data.maxJumpTime || 0.3;
        this.coyoteTime = data.coyoteTime || 0.15;
        this.jumpBufferTime = data.jumpBufferTime || 0.15;
        this.maxWalkableAngle = data.maxWalkableAngle || 45;
        this.slideAngle = data.slideAngle || 60;
        this.slideForce = data.slideForce || 150;
        this.groundDetectionDistance = data.groundDetectionDistance || 5;
        this.groundDetectionWidth = data.groundDetectionWidth || 0.8;
        this.showDebugInfo = data.showDebugInfo || false;
        this.leftKey = data.leftKey || "arrowleft";
        this.rightKey = data.rightKey || "arrowright";
        this.jumpKey = data.jumpKey || "arrowup"; // Fixed: changed from " " to "arrowup"
    }
}

// Register the module
window.PlatformControllerMatter = PlatformControllerMatter;
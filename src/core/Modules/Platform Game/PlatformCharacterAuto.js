/*
    Advanced platform character with accurate ground following using line segment collision
*/

class PlatformCharacterAuto extends Module {
    static namespace = "Platform Game";
    static description = "Advanced platform character with realistic physics that accurately follows ground contours";
    static allowMultiple = false;
    static icon = "fa-running";
    static color = "#4CAF50";

    constructor() {
        super("PlatformCharacterAuto");

        // Object reference
        this.hillsObjectName = "Hills";

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

        // Physics properties
        this.gravity = 980;
        this.maxFallSpeed = 600;
        this.groundFriction = 0.8;
        this.airResistance = 0.98;

        // Collision properties
        this.colliderShape = "circle";
        this.characterRadius = 16;
        this.characterWidth = 32;
        this.characterHeight = 32;
        this.groundSnapDistance = 20;
        this.maxGroundAngle = 45; // Maximum walkable slope in degrees

        // Visual properties
        this.characterColor = "#FF6B6B";
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

        // Hills module reference
        this.hillsModule = null;
        this.hillsObject = null;

        // Input state
        this.inputLeft = false;
        this.inputRight = false;
        this.inputJump = false;
        this.inputJumpPressed = false;
        this.inputJumpReleased = false;

        this.setupProperties();
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
        this.exposeProperty("colliderShape", "enum", this.colliderShape, {
            description: "Collider shape",
            options: ["rectangle", "circle"]
        });

        this.exposeProperty("characterRadius", "number", this.characterRadius, {
            description: "Circle collider radius",
            min: 4, max: 64
        });

        this.exposeProperty("characterWidth", "number", this.characterWidth, {
            description: "Rectangle collider width",
            min: 8, max: 64
        });

        this.exposeProperty("characterHeight", "number", this.characterHeight, {
            description: "Rectangle collider height",
            min: 16, max: 128
        });

        this.exposeProperty("groundSnapDistance", "number", this.groundSnapDistance, {
            description: "Maximum distance to snap to ground when walking",
            min: 1, max: 50
        });

        this.exposeProperty("maxGroundAngle", "number", this.maxGroundAngle, {
            description: "Maximum walkable slope angle in degrees",
            min: 0, max: 90
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
            .exposeProperty("colliderShape", "enum", this.colliderShape, { label: "Collider Shape", options: ["rectangle", "circle"] })
            .exposeProperty("characterRadius", "number", this.characterRadius, { label: "Radius (Circle)" })
            .exposeProperty("characterWidth", "number", this.characterWidth, { label: "Width (Rectangle)" })
            .exposeProperty("characterHeight", "number", this.characterHeight, { label: "Height (Rectangle)" })
            .exposeProperty("groundSnapDistance", "number", this.groundSnapDistance, { label: "Ground Snap Distance" })
            .exposeProperty("maxGroundAngle", "number", this.maxGroundAngle, { label: "Max Ground Angle" })
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
        this.findHillsModule();
    }

    updateInput() {
        if (!window.input) return;

        const prevJump = this.inputJump;

        this.inputLeft = window.input.keyDown('ArrowLeft') || window.input.keyDown('a');
        this.inputRight = window.input.keyDown('ArrowRight') || window.input.keyDown('d');
        this.inputJump = window.input.keyDown('Space') || window.input.keyDown('ArrowUp') || window.input.keyDown('w');

        this.inputJumpPressed = this.inputJump && !prevJump;
        this.inputJumpReleased = !this.inputJump && prevJump;
    }

    updateTimers(deltaTime) {
        if (this.inputJumpPressed) {
            this.jumpBufferTimer = this.jumpBufferTime;
        } else if (this.jumpBufferTimer > 0) {
            this.jumpBufferTimer -= deltaTime;
        }

        if (this.wasGrounded && !this.isGrounded) {
            this.coyoteTimer = this.coyoteTime;
        } else if (this.coyoteTimer > 0 && !this.isGrounded) {
            this.coyoteTimer -= deltaTime;
        } else if (this.isGrounded) {
            this.coyoteTimer = 0;
        }

        if (this.isJumping && this.inputJump) {
            this.jumpHoldTimer += deltaTime;
        }
    }

    updatePhysics(deltaTime) {
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
            // When grounded, align with ground contour
            if (Math.abs(this.velocity.x) > 10 && this.lastGroundContact) {
                this.followGroundContour(deltaTime);
            } else {
                this.velocity.y = 0;
            }
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

    followGroundContour(deltaTime) {
        if (!this.hillsModule || !this.lastGroundContact) return;

        const moveDirection = Math.sign(this.velocity.x);
        if (moveDirection === 0) {
            this.velocity.y = 0;
            return;
        }

        // Calculate desired Y velocity based on ground slope
        const slopeAngle = Math.atan2(this.groundNormal.x, this.groundNormal.y);
        const slopeAngleDegrees = Math.abs(slopeAngle * (180 / Math.PI));

        // Only follow contour if slope is walkable
        if (slopeAngleDegrees <= this.maxGroundAngle) {
            const slopeVelocity = -this.groundNormal.x * Math.abs(this.velocity.x);
            this.velocity.y = this.moveTowards(this.velocity.y, slopeVelocity, 500 * deltaTime);
        } else {
            // Too steep, character should fall
            this.isGrounded = false;
            this.velocity.y = 0;
        }
    }

    checkGroundCollision() {
        this.wasGrounded = this.isGrounded;
        this.isGrounded = false;
        this.lastGroundContact = null;

        if (!this.hillsModule) return;

        const pos = this.gameObject.position;
        let groundContact = null;

        if (this.colliderShape === "circle") {
            groundContact = this.checkCircleGroundCollision(pos);
        } else {
            groundContact = this.checkRectangleGroundCollision(pos);
        }

        if (groundContact) {
            this.isGrounded = true;
            this.lastGroundContact = groundContact;
            this.groundNormal = groundContact.normal;

            // Position correction
            if (this.colliderShape === "circle") {
                const targetY = groundContact.contactPoint.y - this.characterRadius;
                if (this.gameObject.position.y > targetY) {
                    this.gameObject.position.y = targetY;
                }
            } else {
                const targetY = groundContact.contactPoint.y - this.characterHeight / 2;
                if (this.gameObject.position.y > targetY) {
                    this.gameObject.position.y = targetY;
                }
            }

            // Stop downward movement when landing
            if (this.velocity.y > 0) {
                this.velocity.y = 0;
                this.isJumping = false;
                this.jumpHoldTimer = 0;
            }
        }
    }

    checkCircleGroundCollision(pos) {
        const checkRadius = this.characterRadius + this.groundSnapDistance;
        const bottomY = pos.y + this.characterRadius;
        
        let closestContact = null;
        let minDistance = Infinity;

        // Check multiple points around the bottom of the circle
        const checkPoints = 9;
        for (let i = 0; i < checkPoints; i++) {
            const angle = Math.PI + (Math.PI * 0.6 * (i - checkPoints/2)) / checkPoints; // Bottom arc
            const checkX = pos.x + Math.cos(angle) * this.characterRadius;
            const checkY = pos.y + Math.sin(angle) * this.characterRadius;

            const contact = this.getGroundContactAtPoint(checkX, checkY, checkRadius);
            if (contact && contact.distance < minDistance) {
                minDistance = contact.distance;
                closestContact = contact;
            }
        }

        // Also check center bottom point
        const centerContact = this.getGroundContactAtPoint(pos.x, bottomY, checkRadius);
        if (centerContact && centerContact.distance < minDistance) {
            closestContact = centerContact;
        }

        return closestContact;
    }

    checkRectangleGroundCollision(pos) {
        const characterBottom = pos.y + this.characterHeight / 2;
        const characterLeft = pos.x - this.characterWidth / 2;
        const characterRight = pos.x + this.characterWidth / 2;
        const checkDistance = this.groundSnapDistance;

        let closestContact = null;
        let minDistance = Infinity;

        // Check multiple points across the bottom of the rectangle
        const checkPoints = 5;
        for (let i = 0; i < checkPoints; i++) {
            const t = i / (checkPoints - 1);
            const checkX = characterLeft + (characterRight - characterLeft) * t;
            
            const contact = this.getGroundContactAtPoint(checkX, characterBottom, checkDistance);
            if (contact && contact.distance < minDistance) {
                minDistance = contact.distance;
                closestContact = contact;
            }
        }

        return closestContact;
    }

    getGroundContactAtPoint(x, y, maxDistance) {
        if (!this.hillsModule) return null;

        // Get ground segments that might contain this X position
        const segments = this.getGroundSegmentsAtX(x);
        
        let closestContact = null;
        let minDistance = Infinity;

        for (const segment of segments) {
            const contact = this.getContactWithGroundSegment(x, y, segment, maxDistance);
            if (contact && contact.distance < minDistance) {
                minDistance = contact.distance;
                closestContact = contact;
            }
        }

        return closestContact;
    }

    getGroundSegmentsAtX(x) {
        const segments = [];
        
        // Check both ground and hills for collision
        if (this.hillsModule.enableGround) {
            // Get ground segment
            const groundSegmentIndex = Math.floor(x / this.hillsModule.groundSegmentWidth);
            const groundPoints = this.hillsModule.getGroundSegment(groundSegmentIndex);
            if (groundPoints && groundPoints.length > 1) {
                segments.push({
                    type: 'ground',
                    points: groundPoints,
                    offsetX: groundSegmentIndex * this.hillsModule.groundSegmentWidth,
                    offsetY: 0
                });
            }
        }

        // Get hill segments (front layer for collision)
        const hillSegmentIndex = Math.floor(x / this.hillsModule.segmentWidth);
        const hillPoints = this.hillsModule.getHillSegment(hillSegmentIndex, 0);
        if (hillPoints && hillPoints.length > 1) {
            segments.push({
                type: 'hill',
                points: hillPoints,
                offsetX: hillSegmentIndex * this.hillsModule.segmentWidth,
                offsetY: 0
            });
        }

        return segments;
    }

    getContactWithGroundSegment(x, y, segment, maxDistance) {
        const points = segment.points;
        const offsetX = segment.offsetX;
        const offsetY = segment.offsetY;

        let closestContact = null;
        let minDistance = Infinity;

        // Check each line segment in the ground
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = {
                x: points[i].x + offsetX,
                y: points[i].y + offsetY
            };
            const p2 = {
                x: points[i + 1].x + offsetX,
                y: points[i + 1].y + offsetY
            };

            // Check if X is within this segment's horizontal range
            if (x >= Math.min(p1.x, p2.x) && x <= Math.max(p1.x, p2.x)) {
                const contact = this.getContactWithLineSegment(x, y, p1, p2, maxDistance);
                if (contact && contact.distance < minDistance) {
                    minDistance = contact.distance;
                    closestContact = contact;
                }
            }
        }

        return closestContact;
    }

    getContactWithLineSegment(x, y, p1, p2, maxDistance) {
        // Calculate the point on the line segment closest to (x, y)
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        
        if (dx === 0 && dy === 0) {
            // Degenerate line segment
            const distance = Math.sqrt((x - p1.x) * (x - p1.x) + (y - p1.y) * (y - p1.y));
            if (distance <= maxDistance && y >= p1.y) {
                return {
                    contactPoint: { x: p1.x, y: p1.y },
                    distance: distance,
                    normal: { x: 0, y: -1 }
                };
            }
            return null;
        }

        // Find the parameter t for the closest point on the line
        const t = Math.max(0, Math.min(1, ((x - p1.x) * dx + (y - p1.y) * dy) / (dx * dx + dy * dy)));
        
        // Calculate the closest point on the line segment
        const contactPoint = {
            x: p1.x + t * dx,
            y: p1.y + t * dy
        };

        // Calculate distance
        const distance = y - contactPoint.y;

        // Only consider contact if character is above or close to the ground
        if (distance >= -1 && distance <= maxDistance) {
            // Calculate surface normal
            const lineLength = Math.sqrt(dx * dx + dy * dy);
            const normal = {
                x: -dy / lineLength,
                y: dx / lineLength
            };

            // Make sure normal points upward
            if (normal.y > 0) {
                normal.x = -normal.x;
                normal.y = -normal.y;
            }

            return {
                contactPoint: contactPoint,
                distance: distance,
                normal: normal
            };
        }

        return null;
    }

    handleJump() {
        const canJump = this.isGrounded || this.coyoteTimer > 0;

        if (this.jumpBufferTimer > 0 && canJump && !this.isJumping) {
            this.velocity.y = -this.jumpForce;
            this.isJumping = true;
            this.isFalling = false;
            this.jumpHoldTimer = 0;
            this.jumpBufferTimer = 0;
            this.coyoteTimer = 0;
            this.isGrounded = false;
        }
    }

    updatePosition(deltaTime) {
        this.gameObject.position.x += this.velocity.x * deltaTime;
        this.gameObject.position.y += this.velocity.y * deltaTime;
    }

    findHillsModule() {
        if (this.hillsModule && this.hillsObject) return;

        const hillsObject = window.engine?.scene?.findGameObjectByName(this.hillsObjectName) ||
            window.engine?.findGameObjectByName(this.hillsObjectName);

        if (hillsObject) {
            const hillsModule = hillsObject.getModuleByType("DrawPlatformerHills");

            if (hillsModule) {
                this.hillsModule = hillsModule;
                this.hillsObject = hillsObject;
                console.log(`Platform character connected to hills module on ${this.hillsObjectName}`);
            } else {
                console.warn(`GameObject '${this.hillsObjectName}' found but no DrawPlatformerHills module detected`);
            }
        } else if (this.hillsObjectName) {
            console.warn(`GameObject '${this.hillsObjectName}' not found for platform character`);
        }
    }

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
        ctx.save();

        // Draw character based on collider shape
        ctx.fillStyle = this.characterColor;

        if (this.colliderShape === "circle") {
            ctx.beginPath();
            ctx.arc(0, 0, this.characterRadius, 0, Math.PI * 2);
            ctx.fill();

            // Draw hitbox outline
            if (this.showHitbox) {
                ctx.strokeStyle = this.isGrounded ? "#00FF00" : "#FF0000";
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Draw direction indicator
            const eyeSize = 3;
            const eyeOffsetX = this.velocity.x > 0 ? this.characterRadius * 0.3 : 
                             this.velocity.x < 0 ? -this.characterRadius * 0.3 : 0;
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(eyeOffsetX - eyeSize / 2, -eyeSize, eyeSize, eyeSize);

        } else {
            // Rectangle shape
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
        }

        // Draw ground normal for debugging
        if (this.showDebugInfo && this.lastGroundContact) {
            ctx.strokeStyle = "#FFFF00";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(this.groundNormal.x * 30, this.groundNormal.y * 30);
            ctx.stroke();
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

        guiCtx.fillText(`=== Platform Character Debug ===`, 10, y);
        y += lineHeight;
        guiCtx.fillText(`Hills Module: ${this.hillsModule ? 'Connected' : 'Not Found'}`, 10, y);
        y += lineHeight;
        guiCtx.fillText(`Collider: ${this.colliderShape} ${this.colliderShape === 'circle' ? `(r:${this.characterRadius})` : `(${this.characterWidth}x${this.characterHeight})`}`, 10, y);
        y += lineHeight;
        guiCtx.fillText(`Position: ${this.gameObject.position.x.toFixed(1)}, ${this.gameObject.position.y.toFixed(1)}`, 10, y);
        y += lineHeight;
        guiCtx.fillText(`Velocity: ${this.velocity.x.toFixed(1)}, ${this.velocity.y.toFixed(1)}`, 10, y);
        y += lineHeight;
        guiCtx.fillText(`Grounded: ${this.isGrounded} | Falling: ${this.isFalling}`, 10, y);
        y += lineHeight;
        guiCtx.fillText(`Can Jump: ${this.isGrounded || this.coyoteTimer > 0}`, 10, y);
        y += lineHeight;

        if (this.lastGroundContact) {
            guiCtx.fillText(`Ground Contact: ${this.lastGroundContact.contactPoint.x.toFixed(1)}, ${this.lastGroundContact.contactPoint.y.toFixed(1)}`, 10, y);
            y += lineHeight;
            guiCtx.fillText(`Ground Normal: ${this.groundNormal.x.toFixed(2)}, ${this.groundNormal.y.toFixed(2)}`, 10, y);
            y += lineHeight;
            guiCtx.fillText(`Ground Distance: ${this.lastGroundContact.distance.toFixed(2)}`, 10, y);
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
        json.colliderShape = this.colliderShape;
        json.characterRadius = this.characterRadius;
        json.characterWidth = this.characterWidth;
        json.characterHeight = this.characterHeight;
        json.groundSnapDistance = this.groundSnapDistance;
        json.maxGroundAngle = this.maxGroundAngle;
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
        if (json.colliderShape !== undefined) this.colliderShape = json.colliderShape;
        if (json.characterRadius !== undefined) this.characterRadius = json.characterRadius;
        if (json.characterWidth !== undefined) this.characterWidth = json.characterWidth;
        if (json.characterHeight !== undefined) this.characterHeight = json.characterHeight;
        if (json.groundSnapDistance !== undefined) this.groundSnapDistance = json.groundSnapDistance;
        if (json.maxGroundAngle !== undefined) this.maxGroundAngle = json.maxGroundAngle;
        if (json.characterColor !== undefined) this.characterColor = json.characterColor;
        if (json.showDebugInfo !== undefined) this.showDebugInfo = json.showDebugInfo;
        if (json.showHitbox !== undefined) this.showHitbox = json.showHitbox;
    }
}

window.PlatformCharacterAuto = PlatformCharacterAuto;
class EnemyShip extends Module {
    static namespace = "Asteroids";
    static description = "AI-controlled enemy spaceship that flies randomly and pursues targets";
    static allowMultiple = true;

    constructor() {
        super("EnemyShip");

        // Physics properties
        this.thrustPower = 250;
        this.rotationSpeed = 120; // degrees per second
        this.maxSpeed = 350;
        this.friction = 0.98;
        this.angularFriction = 0.95;

        // AI Behavior properties
        this.targetName = "Player"; // Name of GameObject to pursue
        this.pursuitRange = 200; // Range to start pursuing target
        this.maxPursuitRange = 400; // Range beyond which to give up pursuit
        this.randomMovementRadius = 150; // How far to move during random behavior
        this.behaviorChangeInterval = 2.0; // Seconds between behavior changes
        this.rotationTolerance = 15; // Degrees of acceptable rotation error

        // Behavior chances (should add up to 100)
        this.idleChance = 30; // Percentage chance to stay idle
        this.movingChance = 50; // Percentage chance to thrust/move
        this.rotatingChance = 20; // Percentage chance to just rotate

        // Weapon properties
        this.bulletPrefabName = "EnemyBullet";
        this.fireRate = 3; // bullets per second
        this.bulletSpeed = 500;
        this.bulletLifetime = 4.0;
        this.bulletOffset = 15;
        this.fireRange = 180; // Range to start firing at target
        this.aimTolerance = 30; // Degrees of acceptable aim error

        // Visual/Shape properties
        this.shipColor = "#ff4444";
        this.thrustColor = "#ff8800";
        this.shipSize = 10;
        this.showThrust = true;
        this.shapePoints = 6; // Number of points for the ship shape
        this.shapeRandomness = 0.2; // How much randomness in the shape (0-1)
        this.shapeSymmetry = true; // Whether the shape should be symmetrical
        this.shapeType = "polygon"; // "polygon", "diamond", "triangle"

        // Internal state
        this.velocity = { x: 0, y: 0 };
        this.angularVelocity = 0;
        this.isThrusting = false;
        this.lastFireTime = 0;
        this.lastBehaviorChange = 0;
        this.currentTarget = null;
        this.targetPosition = { x: 0, y: 0 };
        
        // AI State
        this.aiState = "random"; // "random", "pursuing", "rotating", "thrusting", "idle"
        this.desiredAngle = 0;
        this.thrustDuration = 0;
        this.thrustTimer = 0;

        // Cached shape points for consistent drawing
        this.shapeVertices = [];
        this.generateShapeVertices();

        // Expose properties for inspector
        this.exposeProperty("thrustPower", "number", 250, {
            description: "Thrust force applied when accelerating",
            min: 0, max: 1000,
            onChange: (val) => { this.thrustPower = Math.max(0, val); }
        });

        this.exposeProperty("rotationSpeed", "number", 120, {
            description: "Rotation speed in degrees per second",
            min: 0, max: 500,
            onChange: (val) => { this.rotationSpeed = Math.max(0, val); }
        });

        this.exposeProperty("maxSpeed", "number", 350, {
            description: "Maximum velocity magnitude",
            min: 1, max: 1000,
            onChange: (val) => { this.maxSpeed = Math.max(1, val); }
        });

        this.exposeProperty("friction", "number", 0.98, {
            description: "Linear friction (0-1, closer to 1 = less friction)",
            min: 0, max: 1, step: 0.01,
            onChange: (val) => { this.friction = Math.max(0, Math.min(1, val)); }
        });

        this.exposeProperty("angularFriction", "number", 0.95, {
            description: "Angular friction (0-1, closer to 1 = less friction)",
            min: 0, max: 1, step: 0.01,
            onChange: (val) => { this.angularFriction = Math.max(0, Math.min(1, val)); }
        });

        this.exposeProperty("targetName", "string", "Player", {
            description: "Name of GameObject to pursue",
            onChange: (val) => { this.targetName = val; }
        });

        this.exposeProperty("pursuitRange", "number", 200, {
            description: "Range to start pursuing target",
            min: 0, max: 1000,
            onChange: (val) => { this.pursuitRange = Math.max(0, val); }
        });

        this.exposeProperty("maxPursuitRange", "number", 400, {
            description: "Range beyond which to give up pursuit",
            min: 0, max: 1000,
            onChange: (val) => { this.maxPursuitRange = Math.max(0, val); }
        });

        this.exposeProperty("behaviorChangeInterval", "number", 2.0, {
            description: "Seconds between behavior changes",
            min: 0.1, max: 10, step: 0.1,
            onChange: (val) => { this.behaviorChangeInterval = Math.max(0.1, Math.min(10, val)); }
        });

        this.exposeProperty("idleChance", "number", 30, {
            description: "Percentage chance to stay idle during random behavior",
            min: 0, max: 100,
            onChange: (val) => { this.idleChance = Math.max(0, Math.min(100, val)); }
        });

        this.exposeProperty("movingChance", "number", 50, {
            description: "Percentage chance to thrust/move during random behavior",
            min: 0, max: 100,
            onChange: (val) => { this.movingChance = Math.max(0, Math.min(100, val)); }
        });

        this.exposeProperty("rotatingChance", "number", 20, {
            description: "Percentage chance to just rotate during random behavior",
            min: 0, max: 100,
            onChange: (val) => { this.rotatingChance = Math.max(0, Math.min(100, val)); }
        });

        this.exposeProperty("fireRange", "number", 180, {
            description: "Range to start firing at target",
            min: 0, max: 500,
            onChange: (val) => { this.fireRange = Math.max(0, val); }
        });

        this.exposeProperty("fireRate", "number", 3, {
            description: "Bullets fired per second",
            min: 0.1, max: 20, step: 0.1,
            onChange: (val) => { this.fireRate = Math.max(0.1, Math.min(20, val)); }
        });

        this.exposeProperty("bulletSpeed", "number", 500, {
            description: "Speed of fired bullets",
            min: 1, max: 2000,
            onChange: (val) => { this.bulletSpeed = Math.max(1, Math.min(2000, val)); }
        });

        this.exposeProperty("shipColor", "color", "#ff4444", {
            description: "Color of the enemy ship",
            onChange: (val) => { this.shipColor = val; }
        });

        this.exposeProperty("shipSize", "number", 10, {
            description: "Size of the ship",
            min: 2, max: 50,
            onChange: (val) => { 
                this.shipSize = Math.max(2, val);
                this.generateShapeVertices();
            }
        });

        this.exposeProperty("shapeType", "select", "polygon", {
            description: "Type of ship shape",
            options: ["polygon", "diamond", "triangle", "star"],
            onChange: (val) => { 
                this.shapeType = val;
                this.generateShapeVertices();
            }
        });

        this.exposeProperty("shapePoints", "number", 6, {
            description: "Number of points for polygon/star shapes",
            min: 3, max: 12,
            onChange: (val) => { 
                this.shapePoints = Math.max(3, Math.min(12, val));
                this.generateShapeVertices();
            }
        });

        this.exposeProperty("shapeRandomness", "number", 0.2, {
            description: "How much randomness in the shape (0-1)",
            min: 0, max: 1, step: 0.01,
            onChange: (val) => { 
                this.shapeRandomness = Math.max(0, Math.min(1, val));
                this.generateShapeVertices();
            }
        });

        this.exposeProperty("shapeSymmetry", "boolean", true, {
            description: "Whether the shape should be symmetrical",
            onChange: (val) => { 
                this.shapeSymmetry = val;
                this.generateShapeVertices();
            }
        });
    }

    start() {
        this.velocity = { x: 0, y: 0 };
        this.angularVelocity = 0;
        this.isThrusting = false;
        this.lastFireTime = 0;
        this.lastBehaviorChange = 0;
        this.currentTarget = null;
        this.aiState = "random";
        this.generateShapeVertices();
        this.generateRandomTarget();
    }

    generateShapeVertices() {
        this.shapeVertices = [];
        
        switch (this.shapeType) {
            case "triangle":
                this.generateTriangleShape();
                break;
            case "diamond":
                this.generateDiamondShape();
                break;
            case "star":
                this.generateStarShape();
                break;
            case "polygon":
            default:
                this.generatePolygonShape();
                break;
        }
    }

    generateTriangleShape() {
        const basePoints = [
            { x: 0, y: -this.shipSize },
            { x: this.shipSize * 0.7, y: this.shipSize * 0.7 },
            { x: -this.shipSize * 0.7, y: this.shipSize * 0.7 }
        ];
        
        this.shapeVertices = this.applyShapeRandomness(basePoints);
    }

    generateDiamondShape() {
        const basePoints = [
            { x: 0, y: -this.shipSize },
            { x: this.shipSize * 0.7, y: 0 },
            { x: 0, y: this.shipSize },
            { x: -this.shipSize * 0.7, y: 0 }
        ];
        
        this.shapeVertices = this.applyShapeRandomness(basePoints);
    }

    generatePolygonShape() {
        const basePoints = [];
        const angleStep = (Math.PI * 2) / this.shapePoints;
        
        for (let i = 0; i < this.shapePoints; i++) {
            const angle = i * angleStep - Math.PI / 2; // Start from top
            const radius = this.shipSize;
            basePoints.push({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius
            });
        }
        
        this.shapeVertices = this.applyShapeRandomness(basePoints);
    }

    generateStarShape() {
        const basePoints = [];
        const angleStep = (Math.PI * 2) / this.shapePoints;
        const outerRadius = this.shipSize;
        const innerRadius = this.shipSize * 0.5;
        
        for (let i = 0; i < this.shapePoints * 2; i++) {
            const angle = i * (angleStep / 2) - Math.PI / 2;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            basePoints.push({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius
            });
        }
        
        this.shapeVertices = this.applyShapeRandomness(basePoints);
    }

    applyShapeRandomness(basePoints) {
        if (this.shapeRandomness === 0) return basePoints;
        
        const randomizedPoints = [];
        
        for (let i = 0; i < basePoints.length; i++) {
            const point = basePoints[i];
            let randomX = 0, randomY = 0;
            
            if (this.shapeSymmetry) {
                // For symmetrical shapes, apply the same randomness to mirrored points
                const seed = i < basePoints.length / 2 ? i : basePoints.length - 1 - i;
                const random1 = this.seededRandom(seed * 2) * 2 - 1;
                const random2 = this.seededRandom(seed * 2 + 1) * 2 - 1;
                
                randomX = random1 * this.shapeRandomness * this.shipSize * 0.3;
                randomY = random2 * this.shapeRandomness * this.shipSize * 0.3;
                
                // Mirror for the second half
                if (i >= basePoints.length / 2) {
                    randomX = -randomX;
                }
            } else {
                randomX = (this.seededRandom(i * 2) * 2 - 1) * this.shapeRandomness * this.shipSize * 0.3;
                randomY = (this.seededRandom(i * 2 + 1) * 2 - 1) * this.shapeRandomness * this.shipSize * 0.3;
            }
            
            randomizedPoints.push({
                x: point.x + randomX,
                y: point.y + randomY
            });
        }
        
        return randomizedPoints;
    }

    seededRandom(seed) {
        // Simple seeded random for consistent shape generation
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    loop(deltaTime) {
        this.updateAI(deltaTime);
        this.updatePhysics(deltaTime);
        this.handleFiring(deltaTime);
    }

    updateAI(deltaTime) {
        // Find target if we don't have one
        if (!this.currentTarget) {
            this.findTarget();
        }

        // Check if target is still valid and in range
        const targetDistance = this.getDistanceToTarget();
        const targetInPursuitRange = targetDistance <= this.pursuitRange;
        const targetInMaxRange = targetDistance <= this.maxPursuitRange;

        // State transitions
        if (this.currentTarget && targetInPursuitRange) {
            if (this.aiState !== "pursuing") {
                this.aiState = "pursuing";
                this.lastBehaviorChange = Date.now() / 1000;
            }
        } else if (this.aiState === "pursuing" && (!this.currentTarget || !targetInMaxRange)) {
            this.aiState = "random";
            this.generateRandomTarget();
            this.lastBehaviorChange = Date.now() / 1000;
        }

        // Execute current behavior
        if (this.aiState === "pursuing") {
            this.pursueBehavior(deltaTime);
        } else {
            this.randomBehavior(deltaTime);
        }
    }

    pursueBehavior(deltaTime) {
        if (!this.currentTarget) return;

        // Update target position
        this.targetPosition.x = this.currentTarget.position.x;
        this.targetPosition.y = this.currentTarget.position.y;

        // Calculate angle to target
        const dx = this.targetPosition.x - this.gameObject.position.x;
        const dy = this.targetPosition.y - this.gameObject.position.y;
        const targetAngle = (Math.atan2(dy, dx) * 180 / Math.PI) + 90;

        // Rotate towards target
        this.rotateTowards(targetAngle, deltaTime);

        // Thrust towards target if facing roughly the right direction
        const angleDiff = this.getAngleDifference(this.gameObject.angle, targetAngle);
        if (Math.abs(angleDiff) < this.rotationTolerance * 2) {
            this.isThrusting = true;
            this.applyThrust(deltaTime);
        } else {
            this.isThrusting = false;
        }
    }

    randomBehavior(deltaTime) {
        const currentTime = Date.now() / 1000;
        
        // Change behavior periodically
        if (currentTime - this.lastBehaviorChange > this.behaviorChangeInterval) {
            this.generateRandomBehavior();
            this.lastBehaviorChange = currentTime;
        }

        // Execute current random behavior
        if (this.aiState === "rotating") {
            this.rotateTowards(this.desiredAngle, deltaTime);
            
            // Switch to thrusting when close to desired angle
            const angleDiff = this.getAngleDifference(this.gameObject.angle, this.desiredAngle);
            if (Math.abs(angleDiff) < this.rotationTolerance) {
                this.aiState = "thrusting";
                this.thrustTimer = 0;
                this.thrustDuration = 0.5 + Math.random() * 1.5; // 0.5-2 seconds
            }
        } else if (this.aiState === "thrusting") {
            this.thrustTimer += deltaTime;
            this.isThrusting = true;
            this.applyThrust(deltaTime);
            
            // Add some rotation while thrusting for organic movement
            if (Math.random() < 0.3) { // 30% chance per frame to adjust rotation
                const rotationAdjustment = (Math.random() - 0.5) * this.rotationSpeed * 0.2 * deltaTime;
                this.angularVelocity += rotationAdjustment;
            }
            
            // Stop thrusting after duration
            if (this.thrustTimer >= this.thrustDuration) {
                this.aiState = "random";
                this.isThrusting = false;
            }
        } else if (this.aiState === "idle") {
            this.isThrusting = false;
            
            // Add gentle rotation while idle for organic feel
            if (Math.random() < 0.1) { // 10% chance per frame to start rotating
                const idleRotationSpeed = this.rotationSpeed * 0.3 * (Math.random() - 0.5);
                this.angularVelocity += idleRotationSpeed * deltaTime;
            }
        } else {
            this.isThrusting = false;
            
            // Add small random rotations in default state
            if (Math.random() < 0.05) { // 5% chance per frame
                const randomRotation = (Math.random() - 0.5) * this.rotationSpeed * 0.1 * deltaTime;
                this.angularVelocity += randomRotation;
            }
        }
    }

    generateRandomBehavior() {
        // Normalize chances to ensure they add up to 100
        const totalChance = this.idleChance + this.movingChance + this.rotatingChance;
        const normalizedIdle = (this.idleChance / totalChance) * 100;
        const normalizedMoving = (this.movingChance / totalChance) * 100;
        const normalizedRotating = (this.rotatingChance / totalChance) * 100;
        
        const random = Math.random() * 100;
        
        if (random < normalizedIdle) {
            this.aiState = "idle";
        } else if (random < normalizedIdle + normalizedMoving) {
            this.aiState = "thrusting";
            this.thrustTimer = 0;
            this.thrustDuration = 0.3 + Math.random() * 1.0;
        } else {
            this.aiState = "rotating";
            this.generateRandomTarget();
        }
    }

    generateRandomTarget() {
        // Generate a random point within movement radius
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * this.randomMovementRadius;
        
        this.targetPosition.x = this.gameObject.position.x + Math.cos(angle) * distance;
        this.targetPosition.y = this.gameObject.position.y + Math.sin(angle) * distance;
        
        // Calculate desired angle to reach this point
        const dx = this.targetPosition.x - this.gameObject.position.x;
        const dy = this.targetPosition.y - this.gameObject.position.y;
        this.desiredAngle = (Math.atan2(dy, dx) * 180 / Math.PI) + 90;
    }

    findTarget() {
        if (!window.engine || !window.engine.gameObjects) return;

        // Find GameObject with the target name
        this.currentTarget = window.engine.gameObjects.find(obj => 
            obj.name === this.targetName || obj.constructor.name === this.targetName
        );
    }

    getDistanceToTarget() {
        if (!this.currentTarget) return Infinity;
        
        const dx = this.currentTarget.position.x - this.gameObject.position.x;
        const dy = this.currentTarget.position.y - this.gameObject.position.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    rotateTowards(targetAngle, deltaTime) {
        const angleDiff = this.getAngleDifference(this.gameObject.angle, targetAngle);
        
        if (Math.abs(angleDiff) > this.rotationTolerance) {
            const rotationDirection = angleDiff > 0 ? 1 : -1;
            this.angularVelocity = rotationDirection * this.rotationSpeed * deltaTime;
        } else {
            this.angularVelocity *= this.angularFriction;
        }
    }

    getAngleDifference(current, target) {
        let diff = target - current;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        return diff;
    }

    applyThrust(deltaTime) {
        const angleRad = (this.gameObject.angle * Math.PI) / 180;
        const thrustX = Math.cos(angleRad - Math.PI / 2) * this.thrustPower * deltaTime;
        const thrustY = Math.sin(angleRad - Math.PI / 2) * this.thrustPower * deltaTime;

        this.velocity.x += thrustX;
        this.velocity.y += thrustY;
    }

    handleFiring(deltaTime) {
        if (!this.currentTarget) return;

        const distance = this.getDistanceToTarget();
        if (distance > this.fireRange) return;

        // Check if we're aiming at the target
        const dx = this.currentTarget.position.x - this.gameObject.position.x;
        const dy = this.currentTarget.position.y - this.gameObject.position.y;
        const targetAngle = (Math.atan2(dy, dx) * 180 / Math.PI) + 90;
        const angleDiff = this.getAngleDifference(this.gameObject.angle, targetAngle);

        if (Math.abs(angleDiff) < this.aimTolerance) {
            const currentTime = Date.now() / 1000;
            const timeBetweenShots = 1 / this.fireRate;

            if (currentTime - this.lastFireTime >= timeBetweenShots) {
                this.fireBullet();
                this.lastFireTime = currentTime;
            }
        }
    }

    fireBullet() {
        if (!window.engine) return;

        // Try to use prefab first, then create manually
        let bullet = null;
        
        if (window.engine.hasPrefab && window.engine.hasPrefab(this.bulletPrefabName)) {
            const angleRad = (this.gameObject.angle * Math.PI) / 180;
            const spawnX = this.gameObject.position.x + Math.cos(angleRad - Math.PI / 2) * this.bulletOffset;
            const spawnY = this.gameObject.position.y + Math.sin(angleRad - Math.PI / 2) * this.bulletOffset;
            bullet = window.engine.instantiatePrefab(this.bulletPrefabName, spawnX, spawnY);
        } else {
            bullet = this.createBulletManually();
        }

        if (bullet) {
            const angleRad = (this.gameObject.angle * Math.PI) / 180;
            const spawnX = this.gameObject.position.x + Math.cos(angleRad - Math.PI / 2) * this.bulletOffset;
            const spawnY = this.gameObject.position.y + Math.sin(angleRad - Math.PI / 2) * this.bulletOffset;

            bullet.position.x = spawnX;
            bullet.position.y = spawnY;

            const bulletModule = bullet.getModule("AsteroidsBullet");
            if (bulletModule) {
                bulletModule.speed = this.bulletSpeed;
                bulletModule.lifetime = this.bulletLifetime;
                bulletModule.setDirectionFromAngle(this.gameObject.angle);
                
                // Add ship momentum
                const momentumFactor = 0.3;
                bulletModule.velocity.x += this.velocity.x * momentumFactor;
                bulletModule.velocity.y += this.velocity.y * momentumFactor;
            }

            if (window.engine.gameObjects) {
                window.engine.gameObjects.push(bullet);
            }
        }
    }

    createBulletManually() {
        if (!window.AsteroidsBullet) return null;
        
        const bullet = new GameObject("EnemyBullet");
        const bulletModule = new window.AsteroidsBullet();
        bullet.addModule(bulletModule);
        return bullet;
    }

    updatePhysics(deltaTime) {
        // Apply friction
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;
        this.angularVelocity *= this.angularFriction;

        // Limit max speed
        const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        if (speed > this.maxSpeed) {
            const ratio = this.maxSpeed / speed;
            this.velocity.x *= ratio;
            this.velocity.y *= ratio;
        }

        // Update position and rotation
        this.gameObject.position.x += this.velocity.x * deltaTime;
        this.gameObject.position.y += this.velocity.y * deltaTime;
        this.gameObject.angle += this.angularVelocity * deltaTime;

        // Keep angle in 0-360 range
        while (this.gameObject.angle >= 360) this.gameObject.angle -= 360;
        while (this.gameObject.angle < 0) this.gameObject.angle += 360;
    }

    draw(ctx) {
        ctx.save();

        // Draw thrust flame first (behind ship)
        if (this.showThrust && this.isThrusting) {
            this.drawThrust(ctx);
        }

        // Draw ship
        this.drawShip(ctx);

        ctx.restore();
    }

    drawShip(ctx) {
        ctx.strokeStyle = this.shipColor;
        ctx.fillStyle = this.shipColor;
        ctx.lineWidth = 2;

        // Draw custom shape using cached vertices
        if (this.shapeVertices.length > 0) {
            ctx.beginPath();
            ctx.moveTo(this.shapeVertices[0].x, this.shapeVertices[0].y);
            
            for (let i = 1; i < this.shapeVertices.length; i++) {
                ctx.lineTo(this.shapeVertices[i].x, this.shapeVertices[i].y);
            }
            
            ctx.closePath();
            ctx.stroke();
        }
    }

    drawThrust(ctx) {
        ctx.fillStyle = this.thrustColor;
        ctx.globalAlpha = 0.8;

        const time = Date.now() * 0.01;
        const flameLength = this.shipSize * (1.0 + Math.sin(time) * 0.2);
        const flameWidth = this.shipSize * 0.3;

        ctx.beginPath();
        ctx.moveTo(-flameWidth * 0.5, this.shipSize * 0.8);
        ctx.lineTo(0, this.shipSize + flameLength);
        ctx.lineTo(flameWidth * 0.5, this.shipSize * 0.8);
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = 1;
    }

    drawGizmos(ctx) {
        if (window.engine && window.engine.debug) {
            // Draw AI state and target info
            ctx.fillStyle = "cyan";
            ctx.font = "10px Arial";
            ctx.fillText(`AI: ${this.aiState}`, this.gameObject.position.x + 15, this.gameObject.position.y - 15);
            
            if (this.currentTarget) {
                const distance = Math.round(this.getDistanceToTarget());
                ctx.fillText(`Target: ${distance}px`, this.gameObject.position.x + 15, this.gameObject.position.y - 5);
                
                // Draw line to target
                ctx.strokeStyle = "cyan";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(this.gameObject.position.x, this.gameObject.position.y);
                ctx.lineTo(this.currentTarget.position.x, this.currentTarget.position.y);
                ctx.stroke();
            }

            // Draw behavior chances
            ctx.fillText(`I:${this.idleChance}% M:${this.movingChance}% R:${this.rotatingChance}%`, 
                        this.gameObject.position.x + 15, this.gameObject.position.y + 5);

            // Draw pursuit range
            ctx.strokeStyle = "orange";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.gameObject.position.x, this.gameObject.position.y, this.pursuitRange, 0, Math.PI * 2);
            ctx.stroke();

            // Draw fire range
            ctx.strokeStyle = "red";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.gameObject.position.x, this.gameObject.position.y, this.fireRange, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    toJSON() {
        return {
            thrustPower: this.thrustPower,
            rotationSpeed: this.rotationSpeed,
            maxSpeed: this.maxSpeed,
            friction: this.friction,
            angularFriction: this.angularFriction,
            targetName: this.targetName,
            pursuitRange: this.pursuitRange,
            maxPursuitRange: this.maxPursuitRange,
            fireRange: this.fireRange,
            fireRate: this.fireRate,
            bulletSpeed: this.bulletSpeed,
            bulletLifetime: this.bulletLifetime,
            shipColor: this.shipColor,
            shipSize: this.shipSize,
            idleChance: this.idleChance,
            movingChance: this.movingChance,
            rotatingChance: this.rotatingChance,
            shapeType: this.shapeType,
            shapePoints: this.shapePoints,
            shapeRandomness: this.shapeRandomness,
            shapeSymmetry: this.shapeSymmetry,
            velocity: this.velocity,
            angularVelocity: this.angularVelocity
        };
    }

    fromJSON(data) {
        Object.assign(this, data);
        if (data.velocity) {
            this.velocity = { x: data.velocity.x || 0, y: data.velocity.y || 0 };
        }
        this.generateShapeVertices();
    }
}

window.EnemyShip = EnemyShip;
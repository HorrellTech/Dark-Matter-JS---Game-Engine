class Asteroid extends Module {
    static namespace = "Asteroids";
    static description = "Rotating asteroid that can split when hit by bullets";
    static allowMultiple = false;

    constructor() {
        super("Asteroid");

        // Movement properties
        this.speed = 50;
        this.minSpeed = 20;
        this.maxSpeed = 100;
        this.direction = { x: 1, y: 0 };
        this.velocity = { x: 0, y: 0 };

        // Rotation properties
        this.rotationSpeed = 45; // degrees per second
        this.minRotationSpeed = 10;
        this.maxRotationSpeed = 90;

        // Shape properties
        this.size = 40;
        this.minSize = 15;
        this.maxSize = 80;
        this.pointCount = 8;
        this.minPoints = 6;
        this.maxPoints = 12;
        this.shapeVariation = 0.3; // How much points can vary from circle

        // Visual properties
        this.filled = false;
        this.color = "#888888";
        this.strokeWidth = 2;

        // Collision properties
        this.health = 1;
        this.splitCount = 3; // How many chunks to create when split
        this.minSplitSize = 15; // Minimum size before asteroid is destroyed instead of split

        // Internal state
        this.shape = [];
        this.isInitialized = false;
        this.bulletCollisionRadius = 0;

        // Expose properties for inspector
        this.exposeProperty("size", "number", 40, {
            description: "Size/radius of the asteroid",
            min: 5,
            max: 200,
            onChange: (val) => {
                this.size = Math.max(5, val);
                this.generateShape();
                this.updateCollisionRadius();
            }
        });

        this.exposeProperty("pointCount", "number", 8, {
            description: "Number of points in asteroid shape",
            min: 3,
            max: 20,
            onChange: (val) => {
                this.pointCount = Math.max(3, Math.floor(val));
                this.generateShape();
            }
        });

        this.exposeProperty("shapeVariation", "number", 0.3, {
            description: "Shape irregularity (0 = circle, 1 = very irregular)",
            min: 0,
            max: 1,
            onChange: (val) => {
                this.shapeVariation = Math.max(0, Math.min(1, val));
                this.generateShape();
            }
        });

        this.exposeProperty("speed", "number", 50, {
            description: "Movement speed",
            min: 0,
            max: 500,
            onChange: (val) => {
                this.speed = Math.max(0, val);
                this.updateVelocity();
            }
        });

        this.exposeProperty("rotationSpeed", "number", 45, {
            description: "Rotation speed in degrees per second",
            min: -360,
            max: 360,
            onChange: (val) => {
                this.rotationSpeed = val;
            }
        });

        this.exposeProperty("filled", "boolean", false, {
            description: "Whether the asteroid is filled or outlined",
            onChange: (val) => {
                this.filled = val;
            }
        });

        this.exposeProperty("color", "color", "#888888", {
            description: "Color of the asteroid",
            onChange: (val) => {
                this.color = val;
            }
        });

        this.exposeProperty("strokeWidth", "number", 2, {
            description: "Line width for outline",
            min: 1,
            max: 10,
            onChange: (val) => {
                this.strokeWidth = Math.max(1, val);
            }
        });

        this.exposeProperty("health", "number", 1, {
            description: "How many hits before splitting",
            min: 1,
            max: 10,
            onChange: (val) => {
                this.health = Math.max(1, Math.floor(val));
            }
        });

        this.exposeProperty("splitCount", "number", 3, {
            description: "Number of chunks created when split",
            min: 2,
            max: 8,
            onChange: (val) => {
                this.splitCount = Math.max(2, Math.floor(val));
            }
        });

        this.exposeProperty("minSplitSize", "number", 15, {
            description: "Minimum size before destruction instead of splitting",
            min: 5,
            max: 50,
            onChange: (val) => {
                this.minSplitSize = Math.max(5, val);
            }
        });
    }

    start() {
        if (!this.isInitialized) {
            this.randomizeProperties();
            this.generateShape();
            this.randomizeMovement();
            this.updateCollisionRadius();
            this.isInitialized = true;
        }
    }

    randomizeProperties() {
        // Randomize size within bounds
        const sizeRange = this.maxSize - this.minSize;
        this.size = this.minSize + Math.random() * sizeRange;

        // Randomize point count
        const pointRange = this.maxPoints - this.minPoints;
        this.pointCount = this.minPoints + Math.floor(Math.random() * (pointRange + 1));

        // Randomize rotation speed
        const rotRange = this.maxRotationSpeed - this.minRotationSpeed;
        this.rotationSpeed = (this.minRotationSpeed + Math.random() * rotRange) * (Math.random() < 0.5 ? -1 : 1);
    }

    randomizeMovement() {
        // Check if we should bias toward center (this would need to be set by the manager)
        if (this.shouldMoveTowardCenter) {
            // Bias direction toward center instead of completely random
            const centerX = window.engine ? window.engine.viewport.x : 0;
            const centerY = window.engine ? window.engine.viewport.y : 0;
            const pos = this.gameObject.position;

            const dx = centerX - pos.x;
            const dy = centerY - pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
                // Calculate direction directly toward center with minimal randomness
                const baseAngle = Math.atan2(dy, dx);
                // Reduce randomness to ±15 degrees instead of ±45
                const randomAngle = baseAngle + (Math.random() - 0.5) * Math.PI * 0.3;
                this.direction = { x: Math.cos(randomAngle), y: Math.sin(randomAngle) };
            }
        } else {
            // Original random direction
            const angle = Math.random() * Math.PI * 2;
            this.direction = { x: Math.cos(angle), y: Math.sin(angle) };
        }

        // Random speed within range
        const speedRange = this.maxSpeed - this.minSpeed;
        this.speed = this.minSpeed + Math.random() * speedRange;

        this.updateVelocity();
    }

    updateVelocity() {
        this.velocity.x = this.direction.x * this.speed;
        this.velocity.y = this.direction.y * this.speed;
    }

    generateShape() {
        this.shape = [];
        const angleStep = (Math.PI * 2) / this.pointCount;

        for (let i = 0; i < this.pointCount; i++) {
            const angle = i * angleStep;

            // Add random variation to radius
            const variation = 1 + (Math.random() - 0.5) * this.shapeVariation;
            const radius = this.size * variation;

            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            this.shape.push({ x, y });
        }
    }

    updateCollisionRadius() {
        // Calculate the maximum distance from center for collision detection
        this.bulletCollisionRadius = this.size * (1 + this.shapeVariation * 0.5);
    }

    loop(deltaTime) {
        // Update position
        this.gameObject.position.x += this.velocity.x * deltaTime;
        this.gameObject.position.y += this.velocity.y * deltaTime;

        // Update rotation
        this.gameObject.angle += this.rotationSpeed * deltaTime;

        // Keep angle in bounds
        while (this.gameObject.angle >= 360) this.gameObject.angle -= 360;
        while (this.gameObject.angle < 0) this.gameObject.angle += 360;

        // Check for bullet collisions
        this.checkBulletCollisions();

        // Remove if too far from viewport
        this.checkBounds();
    }

    checkBulletCollisions() {
        if (!window.engine || !window.engine.gameObjects) return;

        const pos = this.gameObject.position;

        // Check collision with all bullets
        for (let i = window.engine.gameObjects.length - 1; i >= 0; i--) {
            const obj = window.engine.gameObjects[i];

            // Look for bullet modules (check common bullet module names)
            const bulletModule = obj.getModule("AsteroidsBullet") ||
                obj.getModule("Bullet") ||
                obj.getModule("PlayerBullet");

            if (bulletModule && obj !== this.gameObject) {
                const bulletPos = obj.position;
                const distance = Math.sqrt(
                    Math.pow(pos.x - bulletPos.x, 2) +
                    Math.pow(pos.y - bulletPos.y, 2)
                );

                if (distance < this.bulletCollisionRadius) {
                    this.onHit(bulletModule);

                    // Destroy the bullet
                    window.engine.gameObjects.splice(i, 1);
                    break;
                }
            }
        }
    }

    onHit(bulletModule) {
        this.health--;

        if (this.health <= 0) {
            if (this.size > this.minSplitSize) {
                this.split();
            }
            this.destroy();
        }
    }

    split() {
        const parentPos = this.gameObject.position;
        const newSize = this.size * 0.6; // Chunks are 60% of original size

        for (let i = 0; i < this.splitCount; i++) {
            // Create new asteroid GameObject
            const chunk = new GameObject(`Asteroid_Chunk_${Date.now()}_${i}`);

            // Add asteroid module
            const asteroidModule = new Asteroid();
            chunk.addModule(asteroidModule);

            // Position chunks around the original
            const angle = (Math.PI * 2 / this.splitCount) * i + Math.random() * 0.5;
            const distance = this.size * 0.5;
            chunk.position.x = parentPos.x + Math.cos(angle) * distance;
            chunk.position.y = parentPos.y + Math.sin(angle) * distance;

            // Configure chunk properties
            asteroidModule.size = newSize + (Math.random() - 0.5) * newSize * 0.3;
            asteroidModule.pointCount = Math.max(4, this.pointCount + Math.floor((Math.random() - 0.5) * 4));
            asteroidModule.shapeVariation = this.shapeVariation + (Math.random() - 0.5) * 0.2;
            asteroidModule.filled = this.filled;
            asteroidModule.color = this.color;
            asteroidModule.strokeWidth = this.strokeWidth;

            // Give chunks random velocities
            const chunkAngle = angle + (Math.random() - 0.5) * 1;
            const chunkSpeed = this.speed * (0.8 + Math.random() * 0.6);
            asteroidModule.direction = { x: Math.cos(chunkAngle), y: Math.sin(chunkAngle) };
            asteroidModule.speed = chunkSpeed;
            asteroidModule.rotationSpeed = (Math.random() - 0.5) * 180;

            // Initialize the chunk
            asteroidModule.generateShape();
            asteroidModule.updateVelocity();
            asteroidModule.updateCollisionRadius();
            asteroidModule.isInitialized = true;

            // Add to scene
            if (window.engine.gameObjects) {
                window.engine.gameObjects.push(chunk);
            }
        }
    }

    destroy() {
        // Remove this asteroid from the scene
        if (window.engine && window.engine.gameObjects) {
            const index = window.engine.gameObjects.indexOf(this.gameObject);
            if (index !== -1) {
                window.engine.gameObjects.splice(index, 1);
            }
        }
    }

    checkBounds() {
        if (!window.engine || !window.engine.viewport) return;

        const viewport = window.engine.viewport;
        const pos = this.gameObject.position;
        const margin = this.size + 100; // Extra margin before removal

        const left = viewport.x - viewport.width / 2 - margin;
        const right = viewport.x + viewport.width / 2 + margin;
        const top = viewport.y - viewport.height / 2 - margin;
        const bottom = viewport.y + viewport.height / 2 + margin;

        if (pos.x < left || pos.x > right || pos.y < top || pos.y > bottom) {
            this.destroy();
        }
    }

    draw(ctx) {
        if (!this.shape || this.shape.length === 0) return;

        ctx.save();

        if (this.filled) {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(this.shape[0].x, this.shape[0].y);
            for (let i = 1; i < this.shape.length; i++) {
                ctx.lineTo(this.shape[i].x, this.shape[i].y);
            }
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.strokeWidth;
            ctx.beginPath();
            ctx.moveTo(this.shape[0].x, this.shape[0].y);
            for (let i = 1; i < this.shape.length; i++) {
                ctx.lineTo(this.shape[i].x, this.shape[i].y);
            }
            ctx.closePath();
            ctx.stroke();
        }

        ctx.restore();
    }

    drawGizmos(ctx) {
        if (window.engine && window.engine.debug) {
            // Draw collision radius
            ctx.strokeStyle = "red";
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.arc(0, 0, this.bulletCollisionRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw velocity vector
            ctx.strokeStyle = "yellow";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(this.velocity.x * 0.1, this.velocity.y * 0.1);
            ctx.stroke();

            // Draw info
            ctx.fillStyle = "white";
            ctx.font = "10px Arial";
            ctx.fillText(`Size: ${Math.round(this.size)}`, 10, -30);
            ctx.fillText(`Speed: ${Math.round(this.speed)}`, 10, -20);
            ctx.fillText(`Health: ${this.health}`, 10, -10);
        }
    }

    // Utility method to set specific size (used by manager)
    setSize(size) {
        this.size = size;
        this.generateShape();
        this.updateCollisionRadius();
    }

    // New method to apply gentle attraction toward center while preserving randomness
    applyCenterAttraction(targetX, targetY, speedMultiplier = 1) {
        const pos = this.gameObject.position;
        const dx = targetX - pos.x;
        const dy = targetY - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            // Create attraction force that's stronger to effectively pull toward center
            const attractionStrength = 2.0; // Increased from 0.3 to 2.0 for stronger pull
            const attractionX = (dx / distance) * attractionStrength;
            const attractionY = (dy / distance) * attractionStrength;

            // Apply attraction to existing velocity
            this.velocity.x += attractionX;
            this.velocity.y += attractionY;

            // Update direction to match new velocity
            const velocityLength = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
            if (velocityLength > 0) {
                this.direction = { x: this.velocity.x / velocityLength, y: this.velocity.y / velocityLength };
            }

            // Apply speed multiplier
            this.speed *= speedMultiplier;
            this.updateVelocity();
        }
    }

    // Utility method to set random movement towards a target direction
    setMovementTowards(targetX, targetY, speedMultiplier = 1) {
        const pos = this.gameObject.position;
        const dx = targetX - pos.x;
        const dy = targetY - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            // Instead of completely replacing direction, blend with existing random direction
            const targetDirection = { x: dx / distance, y: dy / distance };

            // Blend the target direction with the existing random direction
            // This preserves the randomization from start() while still moving toward the target
            const blendFactor = 0.7; // 70% toward target, 30% keep original randomness
            const blendedX = this.direction.x * (1 - blendFactor) + targetDirection.x * blendFactor;
            const blendedY = this.direction.y * (1 - blendFactor) + targetDirection.y * blendFactor;

            // Normalize the blended direction
            const length = Math.sqrt(blendedX * blendedX + blendedY * blendedY);
            if (length > 0) {
                this.direction = { x: blendedX / length, y: blendedY / length };
            }

            // Apply speed multiplier but don't completely override speed
            this.speed = this.speed * speedMultiplier;
            this.updateVelocity();
        }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            size: this.size,
            minSize: this.minSize,
            maxSize: this.maxSize,
            pointCount: this.pointCount,
            minPoints: this.minPoints,
            maxPoints: this.maxPoints,
            shapeVariation: this.shapeVariation,
            speed: this.speed,
            minSpeed: this.minSpeed,
            maxSpeed: this.maxSpeed,
            rotationSpeed: this.rotationSpeed,
            minRotationSpeed: this.minRotationSpeed,
            maxRotationSpeed: this.maxRotationSpeed,
            filled: this.filled,
            color: this.color,
            strokeWidth: this.strokeWidth,
            health: this.health,
            splitCount: this.splitCount,
            minSplitSize: this.minSplitSize,
            direction: this.direction,
            velocity: this.velocity,
            shape: this.shape,
            isInitialized: this.isInitialized
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        this.size = data.size || 40;
        this.minSize = data.minSize || 15;
        this.maxSize = data.maxSize || 80;
        this.pointCount = data.pointCount || 8;
        this.minPoints = data.minPoints || 6;
        this.maxPoints = data.maxPoints || 12;
        this.shapeVariation = data.shapeVariation || 0.3;
        this.speed = data.speed || 50;
        this.minSpeed = data.minSpeed || 20;
        this.maxSpeed = data.maxSpeed || 100;
        this.rotationSpeed = data.rotationSpeed || 45;
        this.minRotationSpeed = data.minRotationSpeed || 10;
        this.maxRotationSpeed = data.maxRotationSpeed || 90;
        this.filled = data.filled || false;
        this.color = data.color || "#888888";
        this.strokeWidth = data.strokeWidth || 2;
        this.health = data.health || 1;
        this.splitCount = data.splitCount || 3;
        this.minSplitSize = data.minSplitSize || 15;
        this.direction = data.direction || { x: 1, y: 0 };
        this.velocity = data.velocity || { x: 0, y: 0 };
        this.shape = data.shape || [];
        this.isInitialized = data.isInitialized || false;

        if (this.isInitialized) {
            this.updateCollisionRadius();
        }
    }
}

window.Asteroid = Asteroid;
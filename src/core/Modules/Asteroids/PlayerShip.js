class PlayerShip extends Module {
    static namespace = "Asteroids";
    static description = "Player-controlled spaceship with thrust, rotation, and physics";
    static allowMultiple = false;
    static iconClass = "fas fa-space-shuttle";

    constructor() {
        super("PlayerShip");

        // Physics properties
        this.thrustPower = 300;
        this.rotationSpeed = 180; // degrees per second
        this.maxSpeed = 400;
        this.friction = 0.98;
        this.angularFriction = 0.95;
        this.mass = 1.0;

        // Controls
        this.thrustKey = "arrowup";
        this.leftKey = "arrowleft";
        this.rightKey = "arrowright";
        this.fireKey = " ";

        // Weapon properties
        this.bulletPrefabName = "PlayerBullet";
        this.fireRate = 5; // bullets per second
        this.bulletSpeed = 600;
        this.bulletLifetime = 3.0;
        this.bulletOffset = 15; // distance from ship center to spawn bullet

        // Internal state
        this.velocity = { x: 0, y: 0 };
        this.angularVelocity = 0;
        this.isThrusting = false;
        this.lastFireTime = 0;

        // Visual properties
        this.shipColor = "#00ff00";
        this.thrustColor = "#ff4400";
        this.shipSize = 12;
        this.showThrust = true;

        // Marching Cubes terrain reference
        this.marchingCubesTerrain = null;
        this.marchingCubesTerrainName = "MarchingCubesTerrain";

        // Expose properties for inspector
        this.exposeProperty("thrustPower", "number", 300, {
            description: "Thrust force applied when accelerating",
            onChange: (val) => {
                this.thrustPower = Math.max(0, val);
            }
        });

        this.exposeProperty("rotationSpeed", "number", 180, {
            description: "Rotation speed in degrees per second",
            onChange: (val) => {
                this.rotationSpeed = Math.max(0, val);
            }
        });

        this.exposeProperty("maxSpeed", "number", 400, {
            description: "Maximum velocity magnitude",
            onChange: (val) => {
                this.maxSpeed = Math.max(1, val);
            }
        });

        this.exposeProperty("friction", "number", 0.98, {
            description: "Linear friction (0-1, closer to 1 = less friction)",
            onChange: (val) => {
                this.friction = Math.max(0, Math.min(1, val));
            }
        });

        this.exposeProperty("angularFriction", "number", 0.95, {
            description: "Angular friction (0-1, closer to 1 = less friction)",
            onChange: (val) => {
                this.angularFriction = Math.max(0, Math.min(1, val));
            }
        });

        this.exposeProperty("mass", "number", 1.0, {
            description: "Mass of the ship (affects gravity and collisions)",
            min: 0.1, max: 10, step: 0.1,
            onChange: (val) => {
                this.mass = Math.max(0.1, val);
            }
        });

        this.exposeProperty("thrustKey", "string", "arrowup", {
            description: "Key for thrust/acceleration",
            onChange: (val) => {
                this.thrustKey = val;
            }
        });

        this.exposeProperty("leftKey", "string", "arrowleft", {
            description: "Key for rotating left",
            onChange: (val) => {
                this.leftKey = val;
            }
        });

        this.exposeProperty("rightKey", "string", "arrowright", {
            description: "Key for rotating right",
            onChange: (val) => {
                this.rightKey = val;
            }
        });

        this.exposeProperty("fireKey", "string", " ", {
            description: "Key for firing weapons",
            onChange: (val) => {
                this.fireKey = val;
            }
        });

        this.exposeProperty("bulletPrefabName", "string", "PlayerBullet", {
            description: "Name of the prefab to use for bullets",
            onChange: (val) => {
                this.bulletPrefabName = val;
            }
        });

        this.exposeProperty("fireRate", "number", 5, {
            description: "Bullets fired per second",
            onChange: (val) => {
                this.fireRate = Math.max(0.1, val);
            }
        });

        this.exposeProperty("bulletSpeed", "number", 600, {
            description: "Speed of fired bullets",
            onChange: (val) => {
                this.bulletSpeed = Math.max(1, val);
            }
        });

        this.exposeProperty("bulletLifetime", "number", 3.0, {
            description: "How long bullets last in seconds",
            onChange: (val) => {
                this.bulletLifetime = Math.max(0.1, val);
            }
        });

        this.exposeProperty("bulletOffset", "number", 15, {
            description: "Distance from ship center to spawn bullets",
            onChange: (val) => {
                this.bulletOffset = Math.max(0, val);
            }
        });

        this.exposeProperty("shipColor", "color", "#00ff00", {
            description: "Color of the ship",
            onChange: (val) => {
                this.shipColor = val;
            }
        });

        this.exposeProperty("thrustColor", "color", "#ff4400", {
            description: "Color of thrust flame",
            onChange: (val) => {
                this.thrustColor = val;
            }
        });

        this.exposeProperty("shipSize", "number", 12, {
            description: "Size of the ship",
            onChange: (val) => {
                this.shipSize = Math.max(4, val);
            }
        });

        this.exposeProperty("showThrust", "boolean", true, {
            description: "Show thrust flame when accelerating",
            onChange: (val) => {
                this.showThrust = val;
            }
        });

        /*this.exposeProperty("marchingCubesTerrainName", "string", "MarchingCubesTerrain", {
            description: "Name of the Marching Cubes terrain object",
            onChange: (val) => {
                this.marchingCubesTerrainName = val;
                this.findMarchingCubesTerrain();
            }
        });*/
    }

    /**
     * Find and reference the Marching Cubes terrain object
     */
    findMarchingCubesTerrain() {
        if (!window.engine || !window.engine.gameObjects) {
            console.warn("Cannot find Marching Cubes terrain: No engine reference available");
            return false;
        }

        // Try to find the terrain object by name
        const terrainObject = this.getGameObjectByName(this.marchingCubesTerrainName);
        if (terrainObject) {
            this.marchingCubesTerrain = terrainObject.getModule("MarchingCubesTerrain");
            if (this.marchingCubesTerrain) {
                console.log(`Found Marching Cubes terrain: ${this.marchingCubesTerrainName}`);
                return true;
            } else {
                //console.warn(`Object "${this.marchingCubesTerrainName}" found but has no MarchingCubesTerrain module`);
                return false;
            }
        } else {
            //console.warn(`Marching Cubes terrain object not found: ${this.marchingCubesTerrainName}`);
            return false;
        }
    }

    start() {
        // Initialize velocity
        this.velocity = { x: 0, y: 0 };
        this.angularVelocity = 0;
        this.isThrusting = false;
        this.lastFireTime = 0;
    }

    loop(deltaTime) {
        //if(!this.marchingCubesTerrain) {
            //this.findMarchingCubesTerrain();
        //}

        this.handleInput(deltaTime);
        this.updatePhysics(deltaTime);
        this.checkShipCollisions(deltaTime);
        //this.checkTerrainCollisions(deltaTime);
        //this.applyScreenWrapping();
    }

    handleInput(deltaTime) {
        this.isThrusting = false;

        // Rotation input
        if (window.input.keyDown(this.leftKey)) {
            this.angularVelocity -= this.rotationSpeed * deltaTime;
        }
        if (window.input.keyDown(this.rightKey)) {
            this.angularVelocity += this.rotationSpeed * deltaTime;
        }

        // Thrust input
        if (window.input.keyDown(this.thrustKey)) {
            this.isThrusting = true;

            // Convert angle to radians and apply thrust in facing direction
            const angleRad = (this.gameObject.angle * Math.PI) / 180;
            const thrustX = Math.cos(angleRad - Math.PI / 2) * this.thrustPower * deltaTime;
            const thrustY = Math.sin(angleRad - Math.PI / 2) * this.thrustPower * deltaTime;

            this.velocity.x += thrustX;
            this.velocity.y += thrustY;
        }

        // Fire input - handle both single shot and continuous fire
        if (window.input.keyDown(this.fireKey)) {
            this.handleFiring(deltaTime);
        }
    }

    handleFiring(deltaTime) {
        const currentTime = Date.now() / 1000; // Convert to seconds
        const timeBetweenShots = 1 / this.fireRate;

        if (currentTime - this.lastFireTime >= timeBetweenShots) {
            this.fireBullet();
            this.lastFireTime = currentTime;
        }
    }

    fireBullet() {
        // Debug logging
        console.log("fireBullet() called");
        console.log("bulletPrefabName:", this.bulletPrefabName);

        // Check if we have an engine reference
        if (!window.engine) {
            console.warn("Cannot fire bullet: No engine reference available");
            return;
        }

        // Try multiple prefab name variations
        const prefabVariations = [
            this.bulletPrefabName,
            `Prefabs/${this.bulletPrefabName}`,
            `${this.bulletPrefabName}.prefab`,
            `Prefabs/${this.bulletPrefabName}.prefab`,
            this.bulletPrefabName.toLowerCase(),
            this.bulletPrefabName.toUpperCase()
        ];

        let bullet = null;
        let usedPrefabName = null;

        // Method 1: Try using the engine's prefab system with different name variations
        for (const prefabName of prefabVariations) {
            try {
                console.log(`Trying prefab name: "${prefabName}"`);
                if (window.engine.hasPrefab && window.engine.hasPrefab(prefabName)) {
                    console.log(`Found prefab with name: "${prefabName}"`);
                    // Calculate bullet spawn position with offset
                    const angleRad = (this.gameObject.angle * Math.PI) / 180;
                    const spawnX = this.gameObject.position.x + Math.cos(angleRad - Math.PI / 2) * this.bulletOffset;
                    const spawnY = this.gameObject.position.y + Math.sin(angleRad - Math.PI / 2) * this.bulletOffset;
                    bullet = window.engine.instantiatePrefab(prefabName, spawnX, spawnY);
                    usedPrefabName = prefabName;
                    break;
                }
            } catch (error) {
                console.warn(`Failed to use prefab "${prefabName}":`, error);
            }
        }

        // Method 2: Create bullet manually if prefab system isn't available
        if (!bullet) {
            console.log("Creating bullet manually");
            bullet = this.createBulletManually();
        }

        if (bullet) {
            // Calculate bullet spawn position with offset (if not already done)
            const angleRad = (this.gameObject.angle * Math.PI) / 180;
            const spawnX = this.gameObject.position.x + Math.cos(angleRad - Math.PI / 2) * this.bulletOffset;
            const spawnY = this.gameObject.position.y + Math.sin(angleRad - Math.PI / 2) * this.bulletOffset;

            // Position the bullet
            bullet.position.x = spawnX;
            bullet.position.y = spawnY;

            // Configure the bullet
            const bulletModule = bullet.getModule("AsteroidsBullet");
            if (bulletModule) {
                // Set bullet properties BEFORE setting direction
                bulletModule.speed = this.bulletSpeed;
                bulletModule.lifetime = this.bulletLifetime;

                // Set direction from angle
                bulletModule.setDirectionFromAngle(this.gameObject.angle);

                // Add ship's velocity to bullet (inherit momentum)
                // This needs to be done AFTER updateVelocity() is called by setDirectionFromAngle
                const momentumFactor = 0.5; // Increased from 0.3 for better momentum inheritance
                bulletModule.velocity.x += this.velocity.x * momentumFactor;
                bulletModule.velocity.y += this.velocity.y * momentumFactor;

                console.log(`Bullet configured: speed=${bulletModule.speed}, lifetime=${bulletModule.lifetime}, direction=${bulletModule.direction.x.toFixed(2)},${bulletModule.direction.y.toFixed(2)}`);
                console.log(`Ship velocity: ${this.velocity.x.toFixed(2)}, ${this.velocity.y.toFixed(2)}`);
                console.log(`Final bullet velocity: ${bulletModule.velocity.x.toFixed(2)}, ${bulletModule.velocity.y.toFixed(2)}`);
            } else {
                console.warn(`Bullet does not have an AsteroidsBullet module`);
            }

            // Add bullet to scene
            if (window.engine.gameObjects) {
                window.engine.gameObjects.push(bullet);
                console.log(`Bullet added to scene. Total objects: ${window.engine.gameObjects.length}`);
            } else {
                console.warn("Could not add bullet to scene: no gameObjects array");
            }
        } else {
            console.error("Failed to create bullet");
        }
    }

    createBulletManually() {
        console.log("Creating bullet GameObject manually");

        // Create a new GameObject for the bullet
        const bullet = new GameObject("PlayerBullet");

        // Add the AsteroidsBullet module
        if (window.AsteroidsBullet) {
            const bulletModule = new window.AsteroidsBullet();
            bullet.addModule(bulletModule);
            console.log("Added AsteroidsBullet module to bullet");
            return bullet;
        } else {
            console.error("AsteroidsBullet class not found. Make sure the module is loaded.");
            return null;
        }
    }

    updatePhysics(deltaTime) {
        // Apply friction to linear velocity
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;

        // Apply friction to angular velocity
        this.angularVelocity *= this.angularFriction;

        // Limit max speed
        const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        if (speed > this.maxSpeed) {
            const ratio = this.maxSpeed / speed;
            this.velocity.x *= ratio;
            this.velocity.y *= ratio;
        }

        // Update position
        this.gameObject.position.x += this.velocity.x * deltaTime;
        this.gameObject.position.y += this.velocity.y * deltaTime;

        // Update rotation
        this.gameObject.angle += this.angularVelocity * deltaTime;

        // Keep angle in 0-360 range
        while (this.gameObject.angle >= 360) this.gameObject.angle -= 360;
        while (this.gameObject.angle < 0) this.gameObject.angle += 360;
    }

    applyScreenWrapping() {
        const viewport = window.engine.viewport;
        const halfWidth = viewport.width / 2;
        const halfHeight = viewport.height / 2;
        const margin = this.shipSize;

        const left = viewport.x - halfWidth - margin;
        const right = viewport.x + halfWidth + margin;
        const top = viewport.y - halfHeight - margin;
        const bottom = viewport.y + halfHeight + margin;

        // Wrap horizontally
        if (this.gameObject.position.x < left) {
            this.gameObject.position.x = right;
        } else if (this.gameObject.position.x > right) {
            this.gameObject.position.x = left;
        }

        // Wrap vertically
        if (this.gameObject.position.y < top) {
            this.gameObject.position.y = bottom;
        } else if (this.gameObject.position.y > bottom) {
            this.gameObject.position.y = top;
        }
    }

    onFire() {
        // Legacy method - now handled by fireBullet()
        this.fireBullet();
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

        // Classic triangular ship shape
        ctx.beginPath();
        ctx.moveTo(0, -this.shipSize); // Top point
        ctx.lineTo(-this.shipSize * 0.6, this.shipSize * 0.8); // Bottom left
        ctx.lineTo(0, this.shipSize * 0.4); // Bottom center (creates notch)
        ctx.lineTo(this.shipSize * 0.6, this.shipSize * 0.8); // Bottom right
        ctx.closePath();
        ctx.stroke();
    }

    drawThrust(ctx) {
        ctx.fillStyle = this.thrustColor;
        ctx.globalAlpha = 0.8;

        // Animated thrust flame
        const time = Date.now() * 0.01;
        const flameLength = this.shipSize * (1.2 + Math.sin(time) * 0.3);
        const flameWidth = this.shipSize * 0.4;

        ctx.beginPath();
        ctx.moveTo(-flameWidth * 0.5, this.shipSize * 0.6);
        ctx.lineTo(0, this.shipSize + flameLength);
        ctx.lineTo(flameWidth * 0.5, this.shipSize * 0.6);
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = 1;
    }

    drawGizmos(ctx) {
        if (window.engine && window.engine.debug) {
            // Draw velocity vector
            ctx.strokeStyle = "yellow";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.gameObject.position.x, this.gameObject.position.y);
            ctx.lineTo(
                this.gameObject.position.x + this.velocity.x * 0.1,
                this.gameObject.position.y + this.velocity.y * 0.1
            );
            ctx.stroke();

            // Draw ship info
            ctx.fillStyle = "white";
            ctx.font = "12px Arial";
            const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
            ctx.fillText(`Speed: ${Math.round(speed)}`, this.gameObject.position.x + 20, this.gameObject.position.y - 20);
            ctx.fillText(`Angle: ${Math.round(this.gameObject.angle)}°`, this.gameObject.position.x + 20, this.gameObject.position.y - 5);
            ctx.fillText(`Angular Vel: ${Math.round(this.angularVelocity)}°/s`, this.gameObject.position.x + 20, this.gameObject.position.y + 10);

            // Draw bullet prefab info
            ctx.fillText(`Bullet Prefab: ${this.bulletPrefabName}`, this.gameObject.position.x + 20, this.gameObject.position.y + 25);
            const prefabExists = window.engine.hasPrefab(this.bulletPrefabName);
            ctx.fillStyle = prefabExists ? "green" : "red";
            ctx.fillText(`Prefab ${prefabExists ? "Found" : "Missing"}`, this.gameObject.position.x + 20, this.gameObject.position.y + 40);
        }
    }

    // Public methods for external control
    getVelocity() {
        return { x: this.velocity.x, y: this.velocity.y };
    }

    setVelocity(x, y) {
        this.velocity.x = x;
        this.velocity.y = y;
    }

    addVelocity(x, y) {
        this.velocity.x += x;
        this.velocity.y += y;
    }

    getSpeed() {
        return Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
    }

    getFacingDirection() {
        const angleRad = (this.gameObject.angle * Math.PI) / 180;
        return {
            x: Math.cos(angleRad - Math.PI / 2),
            y: Math.sin(angleRad - Math.PI / 2)
        };
    }

    setBulletPrefab(prefabName) {
        this.bulletPrefabName = prefabName;
    }

    /**
     * Check for collisions with Marching Cubes terrain
     */
    checkTerrainCollisions(deltaTime) {
        if (!this.marchingCubesTerrain) {
            // Try to find terrain if not already referenced
            if (!this.findMarchingCubesTerrain()) {
                return; // No terrain found, skip collision check
            }
        }

        // Check collision at ship center with radius consideration
        const shipRadius = this.shipSize * 0.5; // Use half ship size as radius
        const collisionResult = this.marchingCubesTerrain.checkCollision(
            this.gameObject.position.x, 
            this.gameObject.position.y, 
            true // Enable smooth collision detection
        );

        // Check if ship is colliding considering radius
        if (collisionResult.collision && (this.gameObject.position.y - collisionResult.height) < shipRadius) {
            this.handleTerrainCollision(collisionResult, deltaTime, shipRadius);
        }
    }

    /**
     * Handle collision with terrain
     */
    handleTerrainCollision(collisionResult, deltaTime, shipRadius) {
        // Assume terrain normal is upward (0, 1) for simplicity
        const normal = { x: 0, y: 1 };
        
        // Calculate overlap (how much the ship is penetrating the terrain)
        const overlap = shipRadius - (this.gameObject.position.y - collisionResult.height);
        
        // Push ship outside the terrain
        this.gameObject.position.y += overlap + 1; // Add small buffer
        
        // Calculate bounce
        const restitution = 0.5; // Bounciness factor
        const dotProduct = this.velocity.x * normal.x + this.velocity.y * normal.y;
        
        // Reflect velocity over the normal
        this.velocity.x -= 2 * dotProduct * normal.x * restitution;
        this.velocity.y -= 2 * dotProduct * normal.y * restitution;
        
        // If velocity is very low after bounce, stop it to prevent jitter
        const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        if (speed < 10) {
            this.velocity.x = 0;
            this.velocity.y = 0;
        }
        
        // Optional: Add some damage from terrain collision
        //if (this.takeDamage) {
        //    const damage = 2; // Small amount of damage from terrain collision
        //    this.takeDamage(damage);
        //}
        
        console.log(`Ship collided with ${collisionResult.biome} terrain at height ${collisionResult.height}, bounced with overlap ${overlap}`);
    }

    /**
     * Check for collisions with other ships
     */
    checkShipCollisions(deltaTime) {
        if (!window.engine || !window.engine.gameObjects) return;

        for (const obj of window.engine.gameObjects) {
            if (obj === this.gameObject) continue;

            const otherShipModule = obj.getModule("PlayerShip") || obj.getModule("EnemyShip");
            if (!otherShipModule) continue;

            const dx = obj.position.x - this.gameObject.position.x;
            const dy = obj.position.y - this.gameObject.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const thisRadius = this.shipSize;
            const otherRadius = otherShipModule.shipSize || 10;
            const collisionDistance = thisRadius + otherRadius;

            if (distance > 0 && distance < collisionDistance) {
                this.handleShipCollision(obj, otherShipModule, dx, dy, distance);
            }
        }
    }

    /**
     * Handle collision between this ship and another ship
     */
    handleShipCollision(otherShip, otherShipModule, dx, dy, distance) {
        // Calculate collision normal
        const normalX = dx / distance;
        const normalY = dy / distance;

        // Calculate relative velocity
        const relativeVelX = otherShipModule.velocity.x - this.velocity.x;
        const relativeVelY = otherShipModule.velocity.y - this.velocity.y;

        // Calculate relative velocity along normal
        const relativeVelNormal = relativeVelX * normalX + relativeVelY * normalY;

        // Don't resolve if velocities are separating
        if (relativeVelNormal > 0) return;

        // Calculate restitution (bounciness)
        const restitution = 0.7;

        // Calculate impulse scalar
        const impulseScalar = -(1 + restitution) * relativeVelNormal / (1 / this.mass + 1 / otherShipModule.mass);

        // Apply impulse
        const impulseX = impulseScalar * normalX;
        const impulseY = impulseScalar * normalY;

        this.velocity.x -= (impulseX / this.mass);
        this.velocity.y -= (impulseY / this.mass);
        otherShipModule.velocity.x += (impulseX / otherShipModule.mass);
        otherShipModule.velocity.y += (impulseY / otherShipModule.mass);

        // Separate overlapping ships
        const overlap = (this.shipSize + otherShipModule.shipSize) - distance;
        const separationX = normalX * (overlap * 0.5 + 1);
        const separationY = normalY * (overlap * 0.5 + 1);

        this.gameObject.position.x -= separationX;
        this.gameObject.position.y -= separationY;
        otherShip.position.x += separationX;
        otherShip.position.y += separationY;

        // Optional: Add some damage from collision
        const collisionForce = Math.sqrt(impulseX * impulseX + impulseY * impulseY);
        if (this.takeDamage && collisionForce > 10) {
            const damage = Math.min(5, collisionForce * 0.1);
            this.takeDamage(damage);
        }
        if (otherShipModule.takeDamage && collisionForce > 10) {
            const damage = Math.min(5, collisionForce * 0.1);
            otherShipModule.takeDamage(damage);
        }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            thrustPower: this.thrustPower,
            rotationSpeed: this.rotationSpeed,
            maxSpeed: this.maxSpeed,
            friction: this.friction,
            angularFriction: this.angularFriction,
            mass: this.mass,
            thrustKey: this.thrustKey,
            leftKey: this.leftKey,
            rightKey: this.rightKey,
            fireKey: this.fireKey,
            bulletPrefabName: this.bulletPrefabName,
            fireRate: this.fireRate,
            bulletSpeed: this.bulletSpeed,
            bulletLifetime: this.bulletLifetime,
            bulletOffset: this.bulletOffset,
            shipColor: this.shipColor,
            thrustColor: this.thrustColor,
            shipSize: this.shipSize,
            showThrust: this.showThrust,
            velocity: this.velocity,
            angularVelocity: this.angularVelocity,
            lastFireTime: this.lastFireTime
        };
    }

    fromJSON(data) {
        super.fromJSON(data);

        if (!data) return;

        this.thrustPower = data.thrustPower || 300;
        this.rotationSpeed = data.rotationSpeed || 180;
        this.maxSpeed = data.maxSpeed || 400;
        this.friction = data.friction || 0.98;
        this.angularFriction = data.angularFriction || 0.95;
        this.mass = data.mass || 1.0;
        this.thrustKey = data.thrustKey || "arrowup";
        this.leftKey = data.leftKey || "arrowleft";
        this.rightKey = data.rightKey || "arrowright";
        this.fireKey = data.fireKey || " ";
        this.bulletPrefabName = data.bulletPrefabName || "PlayerBullet";
        this.fireRate = data.fireRate || 5;
        this.bulletSpeed = data.bulletSpeed || 600;
        this.bulletLifetime = data.bulletLifetime || 3.0;
        this.bulletOffset = data.bulletOffset || 15;
        this.shipColor = data.shipColor || "#00ff00";
        this.thrustColor = data.thrustColor || "#ff4400";
        this.shipSize = data.shipSize || 12;
        this.showThrust = data.showThrift !== undefined ? data.showThrust : true;

        if (data.velocity) {
            this.velocity = { x: data.velocity.x || 0, y: data.velocity.y || 0 };
        }
        this.angularVelocity = data.angularVelocity || 0;
        this.lastFireTime = data.lastFireTime || 0;
    }
}

window.PlayerShip = PlayerShip;
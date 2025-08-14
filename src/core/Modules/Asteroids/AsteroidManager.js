class AsteroidManager extends Module {
    static namespace = "Asteroids";
    static description = "Manages infinite asteroid field generation around viewport";
    static allowMultiple = false;

    constructor() {
        super("AsteroidManager");

        // Prefab settings
        this.asteroidPrefabName = "Asteroid";

        // Spawning properties
        this.maxAsteroids = 15;
        this.spawnDistance = 200; // Distance outside viewport to spawn
        this.despawnDistance = 400; // Distance outside viewport to despawn (increased)
        this.spawnRate = 2.0; // Asteroids per second
        this.checkInterval = 1.0; // How often to check for spawning (seconds)

        // Size variety
        this.minStartSize = 30;
        this.maxStartSize = 70;
        this.sizeVariety = 0.3; // How much size can vary

        // Movement properties  
        this.moveTowardsCenter = true;
        this.speedMultiplier = 1.0;
        this.randomnessAmount = 0.4; // How random the movement direction is

        // Asteroid distribution
        this.spawnZones = ["top", "bottom", "left", "right"]; // Which sides to spawn from
        this.preferredSpawnZone = "all"; // "all", "top", "bottom", "left", "right"

        // Internal state
        this.lastSpawnTime = 0;
        this.lastCheckTime = 0;
        this.managedAsteroids = [];
        this.totalSpawned = 0;
        this.totalCount = 0; // Track total including split asteroids

        // Expose properties for inspector
        this.exposeProperty("asteroidPrefabName", "string", "Asteroid", {
            description: "Name of asteroid prefab to spawn",
            onChange: (val) => {
                this.asteroidPrefabName = val;
            }
        });

        this.exposeProperty("maxAsteroids", "number", 15, {
            description: "Maximum number of asteroids in field",
            min: 1,
            max: 100,
            onChange: (val) => {
                this.maxAsteroids = Math.max(1, Math.floor(val));
            }
        });

        this.exposeProperty("spawnDistance", "number", 200, {
            description: "Distance outside viewport to spawn asteroids",
            min: 50,
            max: 1000,
            onChange: (val) => {
                this.spawnDistance = Math.max(50, val);
                // Ensure despawn distance is always larger than spawn distance
                if (this.despawnDistance <= this.spawnDistance) {
                    this.despawnDistance = this.spawnDistance + 100;
                }
            }
        });

        this.exposeProperty("despawnDistance", "number", 400, {
            description: "Distance outside viewport to despawn asteroids",
            min: 100,
            max: 1500,
            onChange: (val) => {
                this.despawnDistance = Math.max(this.spawnDistance + 50, val);
            }
        });

        this.exposeProperty("spawnRate", "number", 2.0, {
            description: "Asteroids spawned per second",
            min: 0.1,
            max: 10,
            onChange: (val) => {
                this.spawnRate = Math.max(0.1, val);
            }
        });

        this.exposeProperty("minStartSize", "number", 30, {
            description: "Minimum starting size for asteroids",
            min: 10,
            max: 200,
            onChange: (val) => {
                this.minStartSize = Math.max(10, val);
            }
        });

        this.exposeProperty("maxStartSize", "number", 70, {
            description: "Maximum starting size for asteroids",
            min: 10,
            max: 200,
            onChange: (val) => {
                this.maxStartSize = Math.max(this.minStartSize, val);
            }
        });

        this.exposeProperty("sizeVariety", "number", 0.3, {
            description: "Size variation amount (0-1)",
            min: 0,
            max: 1,
            onChange: (val) => {
                this.sizeVariety = Math.max(0, Math.min(1, val));
            }
        });

        this.exposeProperty("moveTowardsCenter", "boolean", true, {
            description: "Whether asteroids move towards viewport center",
            onChange: (val) => {
                this.moveTowardsCenter = val;
            }
        });

        this.exposeProperty("speedMultiplier", "number", 1.0, {
            description: "Speed multiplier for asteroid movement",
            min: 0.1,
            max: 5,
            onChange: (val) => {
                this.speedMultiplier = Math.max(0.1, val);
            }
        });

        this.exposeProperty("randomnessAmount", "number", 0.4, {
            description: "How random asteroid movement is (0-1)",
            min: 0,
            max: 1,
            onChange: (val) => {
                this.randomnessAmount = Math.max(0, Math.min(1, val));
            }
        });

        this.exposeProperty("preferredSpawnZone", "enum", "all", {
            description: "Which sides to spawn asteroids from",
            options: ["all", "top", "bottom", "left", "right", "horizontal", "vertical"],
            onChange: (val) => {
                this.preferredSpawnZone = val;
                this.updateSpawnZones();
            }
        });
    }

    start() {
        this.lastSpawnTime = Date.now() / 1000;
        this.lastCheckTime = Date.now() / 1000;
        this.managedAsteroids = [];
        this.totalSpawned = 0;
        this.totalCount = 0;
        this.updateSpawnZones();

        console.log(`AsteroidManager started - Max asteroids: ${this.maxAsteroids}`);
    }

    updateSpawnZones() {
        switch (this.preferredSpawnZone) {
            case "all":
                this.spawnZones = ["top", "bottom", "left", "right"];
                break;
            case "horizontal":
                this.spawnZones = ["left", "right"];
                break;
            case "vertical":
                this.spawnZones = ["top", "bottom"];
                break;
            case "top":
                this.spawnZones = ["top"];
                break;
            case "bottom":
                this.spawnZones = ["bottom"];
                break;
            case "left":
                this.spawnZones = ["left"];
                break;
            case "right":
                this.spawnZones = ["right"];
                break;
            default:
                this.spawnZones = ["top", "bottom", "left", "right"];
        }
    }

    loop(deltaTime) {
        const currentTime = Date.now() / 1000;

        // Clean up destroyed asteroids from our tracking list
        this.cleanupManagedAsteroids();

        // Update total count (including split asteroids not managed by us)
        this.updateTotalCount();

        // Check if we need to spawn more asteroids
        if (currentTime - this.lastCheckTime >= this.checkInterval) {
            this.checkAndSpawnAsteroids();
            this.lastCheckTime = currentTime;
        }

        // Despawn asteroids that are too far away (but only our managed ones)
        this.despawnDistantAsteroids();
    }

    cleanupManagedAsteroids() {
        this.managedAsteroids = this.managedAsteroids.filter(asteroid => {
            // Check if the GameObject still exists in the scene
            return window.engine &&
                window.engine.gameObjects &&
                window.engine.gameObjects.includes(asteroid);
        });
    }

    updateTotalCount() {
        // Count all asteroids in the scene (including split chunks)
        if (window.engine && window.engine.gameObjects) {
            this.totalCount = window.engine.gameObjects.filter(obj =>
                obj.getModule("Asteroid")
            ).length;
        }
    }

    checkAndSpawnAsteroids() {
        // Only count our managed asteroids for spawning limit, not split chunks
        const currentCount = this.managedAsteroids.length;

        if (currentCount < this.maxAsteroids) {
            const currentTime = Date.now() / 1000;
            const timeSinceLastSpawn = currentTime - this.lastSpawnTime;
            const timePerSpawn = 1 / this.spawnRate;

            if (timeSinceLastSpawn >= timePerSpawn) {
                this.spawnAsteroid();
                this.lastSpawnTime = currentTime;
            }
        }
    }

    spawnAsteroid() {
        if (!window.engine || !window.engine.viewport) return;

        const spawnPos = this.getRandomSpawnPosition();

        // Try to instantiate from prefab first
        let asteroid = this.tryInstantiatePrefab(spawnPos.x, spawnPos.y);

        // If prefab instantiation failed, create manually
        if (!asteroid) {
            asteroid = this.createAsteroidManually(spawnPos.x, spawnPos.y);
        }

        if (asteroid) {
            // Configure the asteroid
            this.configureAsteroid(asteroid, spawnPos);

            // Add to our tracking list
            this.managedAsteroids.push(asteroid);
            this.totalSpawned++;

            //console.log(`Spawned asteroid ${this.totalSpawned} at (${Math.round(spawnPos.x)}, ${Math.round(spawnPos.y)}) - Managed: ${this.managedAsteroids.length}/${this.maxAsteroids}`);
        }
    }

    tryInstantiatePrefab(x, y) {
        if (!this.asteroidPrefabName) return null;

        // Debug: Check what prefabs are available
        if (window.engine && typeof window.engine.getAvailablePrefabs === 'function') {
            const available = window.engine.getAvailablePrefabs();
            console.log('Available prefabs:', available);
        }

        // Try different prefab name variations
        const prefabVariations = [
            this.asteroidPrefabName,
            `Prefabs/${this.asteroidPrefabName}`,
            `${this.asteroidPrefabName}.prefab`,
            `Prefabs/${this.asteroidPrefabName}.prefab`
        ];

        for (const prefabName of prefabVariations) {
            try {
                console.log(`Checking prefab: ${prefabName}`);
                if (window.engine && window.engine.hasPrefab && window.engine.hasPrefab(prefabName)) {
                    console.log(`Found prefab: ${prefabName}, attempting to instantiate...`);
                    const asteroid = window.engine.instantiatePrefab(prefabName, x, y);
                    if (asteroid) {
                        console.log(`Successfully instantiated prefab: ${prefabName}`);
                        return asteroid;
                    } else {
                        console.warn(`Prefab instantiation returned null for: ${prefabName}`);
                    }
                } else {
                    console.log(`Prefab not found: ${prefabName}`);
                }
            } catch (error) {
                console.warn(`Failed to instantiate prefab "${prefabName}":`, error);
            }
        }

        console.log(`No prefab found for "${this.asteroidPrefabName}", creating manually`);
        return null;
    }

    createAsteroidManually(x, y) {
        // Create new GameObject
        const asteroid = new GameObject(`Asteroid_${this.totalSpawned}`);
        asteroid.position.x = x;
        asteroid.position.y = y;

        // Add Asteroid module
        if (window.Asteroid) {
            const asteroidModule = new window.Asteroid();
            asteroid.addModule(asteroidModule);

            // Add to scene
            if (window.engine.gameObjects) {
                window.engine.gameObjects.push(asteroid);
            }

            return asteroid;
        } else {
            console.error("Asteroid class not found. Make sure the Asteroid module is loaded.");
            return null;
        }
    }

    configureAsteroid(asteroid, spawnPos) {
        const asteroidModule = asteroid.getModule("Asteroid");
        if (!asteroidModule) return;

        // Set random size
        const sizeRange = this.maxStartSize - this.minStartSize;
        const baseSize = this.minStartSize + Math.random() * sizeRange;
        const sizeVariation = 1 + (Math.random() - 0.5) * this.sizeVariety;
        const finalSize = baseSize * sizeVariation;

        asteroidModule.setSize(finalSize);

        // Configure movement
        if (this.moveTowardsCenter) {
            const viewport = window.engine.viewport;
            let targetX = viewport.x;
            let targetY = viewport.y;

            // Add some randomness to the target
            if (this.randomnessAmount > 0) {
                const randomRange = Math.min(viewport.width, viewport.height) * this.randomnessAmount;
                targetX += (Math.random() - 0.5) * randomRange;
                targetY += (Math.random() - 0.5) * randomRange;
            }

            asteroidModule.setMovementTowards(targetX, targetY, this.speedMultiplier);
        } else {
            // Random movement
            asteroidModule.randomizeMovement();
            asteroidModule.speed *= this.speedMultiplier;
            asteroidModule.updateVelocity();
        }

        // Add some visual variety
        asteroidModule.shapeVariation = 0.2 + Math.random() * 0.4;
        asteroidModule.generateShape();

        // Override the asteroid's own bounds checking to prevent immediate despawn
        asteroidModule.checkBounds = () => {
            // Disable the asteroid's own bounds checking since we handle it in the manager
        };
    }

    getRandomSpawnPosition() {
        if (!window.engine || !window.engine.viewport) {
            return { x: 0, y: 0 };
        }

        const viewport = window.engine.viewport;

        // If viewport x,y is top-left corner
        const viewportLeft = viewport.x;
        const viewportRight = viewport.x + viewport.width;
        const viewportTop = viewport.y;
        const viewportBottom = viewport.y + viewport.height;

        // Choose random spawn zone
        const zone = this.spawnZones[Math.floor(Math.random() * this.spawnZones.length)];

        let x, y;

        switch (zone) {
            case "top":
                // Spawn above the viewport
                x = viewportLeft - this.spawnDistance + Math.random() * (viewport.width + this.spawnDistance * 2);
                y = viewportTop - this.spawnDistance - Math.random() * 100; // Ensure it's outside
                break;

            case "bottom":
                // Spawn below the viewport
                x = viewportLeft - this.spawnDistance + Math.random() * (viewport.width + this.spawnDistance * 2);
                y = viewportBottom + this.spawnDistance + Math.random() * 100; // Ensure it's outside
                break;

            case "left":
                // Spawn to the left of viewport
                x = viewportLeft - this.spawnDistance - Math.random() * 100; // Ensure it's outside
                y = viewportTop - this.spawnDistance + Math.random() * (viewport.height + this.spawnDistance * 2);
                break;

            case "right":
                // Spawn to the right of viewport
                x = viewportRight + this.spawnDistance + Math.random() * 100; // Ensure it's outside
                y = viewportTop - this.spawnDistance + Math.random() * (viewport.height + this.spawnDistance * 2);
                break;

            default:
                // Fallback to right side
                x = viewportRight + this.spawnDistance + Math.random() * 100;
                y = viewportTop + Math.random() * viewport.height;
        }

        console.log(`Spawn position: (${Math.round(x)}, ${Math.round(y)}) in zone: ${zone}`);
        console.log(`Viewport bounds: Left=${Math.round(viewportLeft)}, Right=${Math.round(viewportRight)}, Top=${Math.round(viewportTop)}, Bottom=${Math.round(viewportBottom)}`);
        return { x, y };
    }

    despawnDistantAsteroids() {
        if (!window.engine || !window.engine.viewport) return;

        const viewport = window.engine.viewport;

        // If viewport x,y is top-left corner
        const despawnLeft = viewport.x - this.despawnDistance;
        const despawnRight = viewport.x + viewport.width + this.despawnDistance;
        const despawnTop = viewport.y - this.despawnDistance;
        const despawnBottom = viewport.y + viewport.height + this.despawnDistance;

        // Only despawn our managed asteroids, let split chunks handle themselves
        for (let i = this.managedAsteroids.length - 1; i >= 0; i--) {
            const asteroid = this.managedAsteroids[i];
            const pos = asteroid.position;

            // Check if asteroid is outside despawn boundaries
            if (pos.x < despawnLeft || pos.x > despawnRight || pos.y < despawnTop || pos.y > despawnBottom) {
                // Remove from scene
                if (window.engine.gameObjects) {
                    const index = window.engine.gameObjects.indexOf(asteroid);
                    if (index !== -1) {
                        window.engine.gameObjects.splice(index, 1);
                    }
                }

                // Remove from our tracking
                this.managedAsteroids.splice(i, 1);
                console.log(`Despawned distant asteroid at (${Math.round(pos.x)}, ${Math.round(pos.y)}). Managed remaining: ${this.managedAsteroids.length}, Total in scene: ${this.totalCount}`);
            }
        }
    }

    // Utility methods
    getAsteroidCount() {
        return this.managedAsteroids.length;
    }

    getTotalAsteroidCount() {
        return this.totalCount;
    }

    clearAllAsteroids() {
        // Clear all asteroids in the scene, not just managed ones
        if (window.engine && window.engine.gameObjects) {
            for (let i = window.engine.gameObjects.length - 1; i >= 0; i--) {
                const obj = window.engine.gameObjects[i];
                if (obj.getModule("Asteroid")) {
                    window.engine.gameObjects.splice(i, 1);
                }
            }
        }
        this.managedAsteroids = [];
        this.totalCount = 0;
        console.log("Cleared all asteroids from scene");
    }

    spawnBurst(count = 5) {
        for (let i = 0; i < count; i++) {
            if (this.managedAsteroids.length < this.maxAsteroids) {
                this.spawnAsteroid();
            }
        }
    }

    draw(ctx) {
        // Manager doesn't draw anything itself
    }

    drawGizmos(ctx) {
        if (window.engine && window.engine.debug) {
            const viewport = window.engine.viewport;

            // Draw spawn boundaries
            ctx.strokeStyle = "rgba(255, 255, 0, 0.3)";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);

            // If viewport x,y is top-left corner
            const viewportLeft = viewport.x;
            const viewportRight = viewport.x + viewport.width;
            const viewportTop = viewport.y;
            const viewportBottom = viewport.y + viewport.height;

            // Viewport boundary (white)
            ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
            ctx.strokeRect(viewportLeft, viewportTop, viewport.width, viewport.height);

            // Spawn boundary (yellow)
            ctx.strokeStyle = "rgba(255, 255, 0, 0.3)";
            ctx.strokeRect(
                viewportLeft - this.spawnDistance,
                viewportTop - this.spawnDistance,
                viewport.width + this.spawnDistance * 2,
                viewport.height + this.spawnDistance * 2
            );

            // Despawn boundary (red)
            ctx.strokeStyle = "rgba(255, 0, 0, 0.3)";
            ctx.strokeRect(
                viewportLeft - this.despawnDistance,
                viewportTop - this.despawnDistance,
                viewport.width + this.despawnDistance * 2,
                viewport.height + this.despawnDistance * 2
            );

            ctx.setLineDash([]);

            // Draw info
            ctx.fillStyle = "white";
            ctx.font = "12px Arial";
            ctx.fillText(`Managed: ${this.managedAsteroids.length}/${this.maxAsteroids}`, 10, 120);
            ctx.fillText(`Total in Scene: ${this.totalCount}`, 10, 135);
            ctx.fillText(`Total Spawned: ${this.totalSpawned}`, 10, 150);
            ctx.fillText(`Prefab: ${this.asteroidPrefabName}`, 10, 165);

            // Check if prefab exists
            const prefabExists = window.engine.hasPrefab && window.engine.hasPrefab(this.asteroidPrefabName);
            ctx.fillStyle = prefabExists ? "green" : "orange";
            ctx.fillText(`Prefab Status: ${prefabExists ? "Found" : "Manual Creation"}`, 10, 180);

            // Draw spawn zones
            ctx.fillStyle = "cyan";
            ctx.fillText(`Spawn Zones: ${this.spawnZones.join(", ")}`, 10, 195);

            // Show viewport coordinates for debugging
            ctx.fillStyle = "yellow";
            ctx.fillText(`Viewport: (${Math.round(viewport.x)}, ${Math.round(viewport.y)}) ${viewport.width}x${viewport.height}`, 10, 210);
        }
    }

    toJSON() {
        return {
            asteroidPrefabName: this.asteroidPrefabName,
            maxAsteroids: this.maxAsteroids,
            spawnDistance: this.spawnDistance,
            despawnDistance: this.despawnDistance,
            spawnRate: this.spawnRate,
            checkInterval: this.checkInterval,
            minStartSize: this.minStartSize,
            maxStartSize: this.maxStartSize,
            sizeVariety: this.sizeVariety,
            moveTowardsCenter: this.moveTowardsCenter,
            speedMultiplier: this.speedMultiplier,
            randomnessAmount: this.randomnessAmount,
            preferredSpawnZone: this.preferredSpawnZone,
            totalSpawned: this.totalSpawned
        };
    }

    fromJSON(data) {
        this.asteroidPrefabName = data.asteroidPrefabName || "Asteroid";
        this.maxAsteroids = data.maxAsteroids || 15;
        this.spawnDistance = data.spawnDistance || 200;
        this.despawnDistance = data.despawnDistance || 400;
        this.spawnRate = data.spawnRate || 2.0;
        this.checkInterval = data.checkInterval || 1.0;
        this.minStartSize = data.minStartSize || 30;
        this.maxStartSize = data.maxStartSize || 70;
        this.sizeVariety = data.sizeVariety || 0.3;
        this.moveTowardsCenter = data.moveTowardsCenter !== undefined ? data.moveTowardsCenter : true;
        this.speedMultiplier = data.speedMultiplier || 1.0;
        this.randomnessAmount = data.randomnessAmount || 0.4;
        this.preferredSpawnZone = data.preferredSpawnZone || "all";
        this.totalSpawned = data.totalSpawned || 0;

        this.updateSpawnZones();
    }
}

window.AsteroidManager = AsteroidManager;
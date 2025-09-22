/**
 * Spawner - Spawns game objects at intervals or on events
 */
class Spawner extends Module {
    static allowMultiple = true;
    static namespace = "Utility";
    static description = "Spawns game objects or prefabs at intervals or on trigger";
    static iconClass = "fas fa-plus-circle";

    constructor() {
        super("Spawner");

        // Spawn properties
        this.spawnMode = "interval"; // interval, manual, trigger
        this.spawnInterval = 2.0; // seconds
        this.spawnCount = 1; // objects to spawn per trigger
        this.maxSpawns = -1; // -1 for unlimited
        this.autoStart = true;

        // Spawn object properties
        this.spawnObjectName = "SpawnedObject";
        this.spawnType = "prefab"; // prefab, template, basic
        this.inheritPosition = true;
        this.inheritRotation = false;
        this.inheritScale = false;

        // Position properties
        this.spawnArea = "point"; // point, circle, rectangle, line
        this.spawnRadius = 50;
        this.spawnWidth = 100;
        this.spawnHeight = 100;
        this.spawnOffset = new Vector2(0, 0);
        this.randomRotation = false;
        this.randomScale = false;
        this.minScale = 0.8;
        this.maxScale = 1.2;

        // Velocity properties
        this.giveVelocity = false;
        this.velocityDirection = new Vector2(0, -1);
        this.velocityMagnitude = 100;
        this.velocityVariation = 20;
        this.randomDirection = false;
        this.velocityConeAngle = 0; // NEW: Cone angle for velocity spread (degrees)
        this.velocityDirection = new Vector2(0, -1); // Direction for cone emission

        // Lifetime properties
        this.setLifetime = false;
        this.lifetime = 5.0;
        this.lifetimeVariation = 1.0;

        // Internal state
        this.isActive = false;
        this.timer = 0;
        this.spawnedCount = 0;
        this.spawnedObjects = [];

        // Expose properties - FIXED to use this.property instead of bare property
        this.exposeProperty("spawnMode", "enum", this.spawnMode, {
            options: ["interval", "manual", "trigger"],
            description: "When to spawn objects",
            onChange: (value) => {
                this.spawnMode = value;
            }
        });

        this.exposeProperty("spawnInterval", "number", this.spawnInterval, {
            min: 0.1,
            max: 60,
            step: 0.1,
            description: "Time between spawns (for interval mode)",
            onChange: (value) => {
                this.spawnInterval = value;
            }
        });

        this.exposeProperty("spawnCount", "number", this.spawnCount, {
            min: 1,
            max: 20,
            step: 1,
            description: "Number of objects to spawn per trigger",
            onChange: (value) => {
                this.spawnCount = value;
            }
        });

        this.exposeProperty("maxSpawns", "number", this.maxSpawns, {
            min: -1,
            max: 1000,
            step: 1,
            description: "Maximum total spawns (-1 for unlimited)",
            onChange: (value) => {
                this.maxSpawns = value;
            }
        });

        this.exposeProperty("autoStart", "boolean", this.autoStart, {
            description: "Start spawning automatically",
            onChange: (value) => {
                this.autoStart = value;
            }
        });

        this.exposeProperty("spawnObjectName", "string", this.spawnObjectName, {
            description: "Name of prefab or object to spawn",
            onChange: (value) => {
                this.spawnObjectName = value;
            }
        });

        this.exposeProperty("spawnType", "enum", this.spawnType, {
            options: ["prefab", "template", "basic"],
            description: "Type of object to spawn",
            onChange: (value) => {
                this.spawnType = value;
            }
        });

        this.exposeProperty("spawnArea", "enum", this.spawnArea, {
            options: ["point", "circle", "rectangle", "line"],
            description: "Area shape for spawning",
            onChange: (value) => {
                this.spawnArea = value;
            }
        });

        this.exposeProperty("spawnRadius", "number", this.spawnRadius, {
            min: 0,
            max: 500,
            step: 1,
            description: "Radius for circle spawn area",
            onChange: (value) => {
                this.spawnRadius = value;
            }
        });

        this.exposeProperty("spawnWidth", "number", this.spawnWidth, {
            min: 1,
            max: 1000,
            step: 1,
            description: "Width for rectangle spawn area",
            onChange: (value) => {
                this.spawnWidth = value;
            }
        });

        this.exposeProperty("spawnHeight", "number", this.spawnHeight, {
            min: 1,
            max: 1000,
            step: 1,
            description: "Height for rectangle spawn area",
            onChange: (value) => {
                this.spawnHeight = value;
            }
        });

        this.exposeProperty("spawnOffset", "vector2", this.spawnOffset, {
            description: "Offset from spawner position",
            onChange: (value) => {
                this.spawnOffset = value;
            }
        });

        this.exposeProperty("randomRotation", "boolean", this.randomRotation, {
            description: "Give spawned objects random rotation",
            onChange: (value) => {
                this.randomRotation = value;
            }
        });

        this.exposeProperty("velocityConeAngle", "number", this.velocityConeAngle, {
            min: 0,
            max: 180,
            step: 1,
            description: "Cone angle spread for velocity (degrees)",
            onChange: (value) => {
                this.velocityConeAngle = value;
            }
        });

        this.exposeProperty("velocityDirection", "vector2", this.velocityDirection, {
            description: "Base direction for velocity cone",
            onChange: (value) => {
                this.velocityDirection = value;
            }
        });

        this.exposeProperty("randomScale", "boolean", this.randomScale, {
            description: "Give spawned objects random scale",
            onChange: (value) => {
                this.randomScale = value;
            }
        });

        this.exposeProperty("minScale", "number", this.minScale, {
            min: 0.1,
            max: 2,
            step: 0.1,
            description: "Minimum random scale",
            onChange: (value) => {
                this.minScale = value;
            }
        });

        this.exposeProperty("maxScale", "number", this.maxScale, {
            min: 0.1,
            max: 5,
            step: 0.1,
            description: "Maximum random scale",
            onChange: (value) => {
                this.maxScale = value;
            }
        });

        this.exposeProperty("giveVelocity", "boolean", this.giveVelocity, {
            description: "Give spawned objects initial velocity",
            onChange: (value) => {
                this.giveVelocity = value;
            }
        });

        this.exposeProperty("velocityDirection", "vector2", this.velocityDirection, {
            description: "Direction for initial velocity",
            onChange: (value) => {
                this.velocityDirection = value;
            }
        });

        this.exposeProperty("velocityMagnitude", "number", this.velocityMagnitude, {
            min: 0,
            max: 1000,
            step: 10,
            description: "Initial velocity magnitude",
            onChange: (value) => {
                this.velocityMagnitude = value;
            }
        });

        this.exposeProperty("velocityVariation", "number", this.velocityVariation, {
            min: 0,
            max: 100,
            step: 1,
            description: "Velocity magnitude variation",
            onChange: (value) => {
                this.velocityVariation = value;
            }
        });

        this.exposeProperty("randomDirection", "boolean", this.randomDirection, {
            description: "Random velocity direction",
            onChange: (value) => {
                this.randomDirection = value;
            }
        });

        this.exposeProperty("setLifetime", "boolean", this.setLifetime, {
            description: "Automatically destroy spawned objects after time",
            onChange: (value) => {
                this.setLifetime = value;
            }
        });

        this.exposeProperty("lifetime", "number", this.lifetime, {
            min: 0.1,
            max: 60,
            step: 0.1,
            description: "Lifetime of spawned objects",
            onChange: (value) => {
                this.lifetime = value;
            }
        });

        this.exposeProperty("lifetimeVariation", "number", this.lifetimeVariation, {
            min: 0,
            max: 10,
            step: 0.1,
            description: "Lifetime variation",
            onChange: (value) => {
                this.lifetimeVariation = value;
            }
        });
    }

    start() {
        if (this.autoStart && this.spawnMode === "interval") {
            this.startSpawning();
            // Reset timer to prevent immediate spawn on first frame
            this.timer = 0;
        }
    }

    startSpawning() {
        this.isActive = true;
        this.timer = 0;
    }

    stopSpawning() {
        this.isActive = false;
    }

    /**
     * Manually trigger a spawn
     */
    spawn() {
        if (this.maxSpawns !== -1 && this.spawnedCount >= this.maxSpawns) {
            return;
        }

        for (let i = 0; i < this.spawnCount; i++) {
            this.spawnSingleObject();
        }
    }

    loop(deltaTime) {
        if (this.spawnMode === "interval" && this.isActive) {
            this.timer += deltaTime;

            if (this.timer >= this.spawnInterval) {
                this.spawn();
                this.timer = 0; // Reset timer after spawning
            }
        }

        // Clean up destroyed objects from our tracking list
        this.spawnedObjects = this.spawnedObjects.filter(obj => obj && !obj.destroyed);
    }

    /**
     * FIXED: Main spawn method that respects spawn type preference
     */
    spawnSingleObject() {
        let spawnedObject = null;

        console.log(`Spawner: Attempting to spawn "${this.spawnObjectName}" using spawnType: ${this.spawnType}`);

        // Try based on spawnType setting first
        if (this.spawnType === "prefab") {
            spawnedObject = this.trySpawnPrefab();
        } else if (this.spawnType === "template") {
            spawnedObject = this.trySpawnTemplate();
        } else if (this.spawnType === "basic") {
            spawnedObject = this.createBasicObject();
        }

        // IMPORTANT: Return immediately if we successfully spawned an object
        if (spawnedObject) {
            console.log(`Spawner: Successfully spawned object using preferred method: ${this.spawnType}`);
            return spawnedObject;
        }

        // Only try fallbacks if the preferred method completely failed
        console.log(`Spawner: Preferred method "${this.spawnType}" failed, trying fallbacks...`);

        if (this.spawnType !== "prefab") {
            spawnedObject = this.trySpawnPrefab();
            if (spawnedObject) {
                console.log(`Spawner: Fallback prefab spawn succeeded`);
                return spawnedObject;
            }
        }

        if (this.spawnType !== "template") {
            spawnedObject = this.trySpawnTemplate();
            if (spawnedObject) {
                console.log(`Spawner: Fallback template spawn succeeded`);
                return spawnedObject;
            }
        }

        if (this.spawnType !== "basic") {
            spawnedObject = this.createBasicObject();
            if (spawnedObject) {
                console.log(`Spawner: Fallback basic spawn succeeded`);
                return spawnedObject;
            }
        }

        console.log(`Spawner: All spawn methods failed for "${this.spawnObjectName}"`);
        return null;
    }

    /**
     * Try to spawn a prefab
     */
    trySpawnPrefab() {
        if (window.engine && typeof window.engine.instantiatePrefab === 'function') {
            try {
                const spawnPos = this.getSpawnPosition();

                // Capture state before instantiation
                const beforeCount = window.engine.gameObjects ? window.engine.gameObjects.length : 0;
                const beforeDynamicCount = window.engine.dynamicObjects ? window.engine.dynamicObjects.size : 0;

                const result = window.engine.instantiatePrefab(this.spawnObjectName, spawnPos.x, spawnPos.y);

                // Check if new objects were added (either to gameObjects or dynamicObjects)
                const afterCount = window.engine.gameObjects ? window.engine.gameObjects.length : 0;
                const afterDynamicCount = window.engine.dynamicObjects ? window.engine.dynamicObjects.size : 0;

                const objectsAdded = afterCount > beforeCount || afterDynamicCount > beforeDynamicCount;

                let spawnedObject = null;

                // Method 1: Direct return from instantiatePrefab
                if (result && typeof result === 'object' && result.position) {
                    spawnedObject = result;
                    console.log(`Spawner: Got prefab instance directly from instantiatePrefab: ${this.spawnObjectName}`);
                }
                // Method 2: Check if objects were added to the scene
                else if (objectsAdded) {
                    // Try to find the most recently added object
                    if (window.engine.gameObjects && afterCount > beforeCount) {
                        spawnedObject = window.engine.gameObjects[window.engine.gameObjects.length - 1];
                    } else if (window.engine.dynamicObjects && afterDynamicCount > beforeDynamicCount) {
                        // Get the last added dynamic object
                        const dynamicArray = Array.from(window.engine.dynamicObjects);
                        spawnedObject = dynamicArray[dynamicArray.length - 1];
                    }
                    console.log(`Spawner: Detected successful prefab instantiation by object count change: ${this.spawnObjectName}`);
                }

                if (spawnedObject) {
                    console.log(`Spawner: Successfully instantiated prefab "${this.spawnObjectName}" at (${spawnPos.x}, ${spawnPos.y})`);

                    // Apply additional transformations AFTER instantiation
                    this.applySpawnTransforms(spawnedObject, spawnPos);

                    // Track spawned object
                    this.spawnedObjects.push(spawnedObject);
                    this.spawnedCount++;

                    return spawnedObject;
                } else {
                    console.log(`Spawner: Prefab instantiation failed or no objects detected for "${this.spawnObjectName}"`);
                }
            } catch (error) {
                console.log(`Spawner: Failed to instantiate prefab "${this.spawnObjectName}":`, error);
            }
        }
        return null;
    }

    /**
     * Try to spawn by cloning an existing template object
     */
    trySpawnTemplate() {
        if (window.engine) {
            const templateObject = window.engine.findGameObjectByName(this.spawnObjectName);
            if (templateObject) {
                try {
                    const spawnedObject = templateObject.clone(false); // Don't add "Copy" suffix
                    const spawnPos = this.getSpawnPosition();
                    spawnedObject.position = new Vector2(spawnPos.x, spawnPos.y);

                    console.log(`Spawner: Cloned existing object "${this.spawnObjectName}" at (${spawnPos.x}, ${spawnPos.y})`);

                    // Apply additional transformations
                    this.applySpawnTransforms(spawnedObject, spawnPos);

                    // Add to scene
                    if (window.engine.gameObjects) {
                        window.engine.gameObjects.push(spawnedObject);
                        spawnedObject.engine = window.engine;

                        // Mark as dynamic for cleanup
                        if (window.engine.dynamicObjects) {
                            window.engine.dynamicObjects.add(spawnedObject);
                            spawnedObject._isDynamic = true;
                        }

                        // Initialize the object
                        if (spawnedObject.start) {
                            spawnedObject.start();
                        }
                    }

                    // Track spawned object
                    this.spawnedObjects.push(spawnedObject);
                    this.spawnedCount++;

                    return spawnedObject;
                } catch (error) {
                    console.error(`Spawner: Failed to clone object "${this.spawnObjectName}":`, error);
                }
            }
        }
        return null;
    }

    /**
     * Apply spawn transformations to any spawned object (prefab or cloned)
     */
    applySpawnTransforms(spawnedObject, spawnPos) {
        // Set rotation
        if (this.inheritRotation) {
            spawnedObject.angle = this.gameObject.angle || 0;
        } else if (this.randomRotation) {
            spawnedObject.angle = Math.random() * 360;
        }

        // Set scale
        if (this.inheritScale && this.gameObject.scale) {
            spawnedObject.scale = new Vector2(this.gameObject.scale.x, this.gameObject.scale.y);
        } else if (this.randomScale) {
            const scale = this.minScale + Math.random() * (this.maxScale - this.minScale);
            spawnedObject.scale = new Vector2(scale, scale);
        }

        // Give velocity if enabled
        if (this.giveVelocity) {
            this.applyVelocityToObject(spawnedObject);
        }

        // Set lifetime if enabled
        if (this.setLifetime) {
            this.applyLifetimeToObject(spawnedObject);
        }
    }

    /**
     * Apply velocity to a spawned object
     */
    applyVelocityToObject(spawnedObject) {
        try {
            // Check if object already has BasicPhysics
            let basicPhysics = spawnedObject.getModule('BasicPhysics');

            if (!basicPhysics) {
                basicPhysics = new BasicPhysics();
                spawnedObject.addModule(basicPhysics);

                // If the GO is already started, ensure the module initializes
                if (typeof basicPhysics.start === 'function' && (spawnedObject._started || spawnedObject.started || spawnedObject._hasStarted)) {
                    try { basicPhysics.start(); } catch { }
                }
            }

            // Calculate base direction
            let direction = new Vector2(this.velocityDirection.x, this.velocityDirection.y);
            direction = direction.normalize();
            
            // Apply cone randomness if specified
            if (this.velocityConeAngle > 0) {
                const halfAngle = (this.velocityConeAngle * Math.PI / 180) / 2;
                const randomAngle = (Math.random() - 0.5) * halfAngle * 2;
                
                // Rotate the direction by the random angle
                const cos = Math.cos(randomAngle);
                const sin = Math.sin(randomAngle);
                direction = new Vector2(
                    direction.x * cos - direction.y * sin,
                    direction.x * sin + direction.y * cos
                );
            } else if (this.randomDirection) {
                // Original random direction behavior
                const angle = Math.random() * Math.PI * 2;
                direction = new Vector2(Math.cos(angle), Math.sin(angle));
            }

            // Add velocity variation
            const variation = (Math.random() - 0.5) * this.velocityVariation;
            const magnitude = this.velocityMagnitude + variation;

            const velocity = new Vector2(
                direction.x * magnitude,
                direction.y * magnitude
            );

            // Apply velocity immediately
            basicPhysics.setVelocity(velocity.x, velocity.y);
            
        } catch (error) {
            console.error('Error applying velocity to spawned object:', error);
        }
    }

    /**
     * Apply lifetime to a spawned object
     */
    applyLifetimeToObject(spawnedObject) {
        // Check if object already has a Timer module for lifetime
        let timer = spawnedObject.getModule('Timer');

        if (!timer) {
            // Import Timer module if not available globally
            if (typeof Timer === 'undefined' && window.Timer) {
                Timer = window.Timer;
            }

            if (typeof Timer === 'undefined') {
                console.warn('Timer module not available for lifetime management');
                return;
            }

            timer = new Timer();
            timer.duration = this.lifetime + (Math.random() - 0.5) * this.lifetimeVariation;
            timer.actionType = "destroy";
            timer.autoStart = true;
            timer.repeat = false;

            // Set the gameObject reference for the timer
            timer.gameObject = spawnedObject;

            spawnedObject.addModule(timer);

            // Ensure the Timer module starts immediately for spawned objects
            if (typeof timer.start === 'function') {
                try {
                    timer.start();
                    console.log(`Started Timer module for ${spawnedObject.name || 'spawned object'} with ${timer.duration}s lifetime`);
                } catch (error) {
                    console.error('Error starting Timer module:', error);
                }
            }
        } else {
            console.log(`Object ${spawnedObject.name || 'spawned object'} already has Timer module`);
        }
    }

    /**
     * Create a basic object when no prefab or template is found
     */
    createBasicObject() {
        // Create new game object
        const spawnedObject = new GameObject(this.spawnObjectName);

        // Set position
        const spawnPos = this.getSpawnPosition();
        spawnedObject.position = new Vector2(spawnPos.x, spawnPos.y);

        // Apply transformations
        this.applySpawnTransforms(spawnedObject, spawnPos);

        // Add basic visual component (DrawCircle) so spawned objects are visible
        const visual = new DrawCircle();
        visual.radius = 10;
        visual.color = "#" + Math.floor(Math.random() * 16777215).toString(16); // Random color
        spawnedObject.addModule(visual);

        // Add to scene
        if (this.gameObject.scene) {
            this.gameObject.scene.gameObjects.push(spawnedObject);
            spawnedObject.scene = this.gameObject.scene;

            // Initialize the object
            spawnedObject.start();
        } else if (window.engine && window.engine.gameObjects) {
            window.engine.gameObjects.push(spawnedObject);
            spawnedObject.engine = window.engine;

            // Mark as dynamic for cleanup
            if (window.engine.dynamicObjects) {
                window.engine.dynamicObjects.add(spawnedObject);
                spawnedObject._isDynamic = true;
            }

            // Initialize the object
            if (spawnedObject.start) {
                spawnedObject.start();
            }
        }

        // Track spawned object
        this.spawnedObjects.push(spawnedObject);
        this.spawnedCount++;

        console.log(`Spawner: Created basic ${this.spawnObjectName} at (${spawnPos.x}, ${spawnPos.y})`);

        return spawnedObject;
    }

    getSpawnPosition() {
        const basePos = new Vector2(
            this.gameObject.position.x + this.spawnOffset.x,
            this.gameObject.position.y + this.spawnOffset.y
        );

        switch (this.spawnArea) {
            case "circle":
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * this.spawnRadius;
                return new Vector2(
                    basePos.x + Math.cos(angle) * radius,
                    basePos.y + Math.sin(angle) * radius
                );

            case "rectangle":
                return new Vector2(
                    basePos.x + (Math.random() - 0.5) * this.spawnWidth,
                    basePos.y + (Math.random() - 0.5) * this.spawnHeight
                );

            case "line":
                const t = Math.random();
                return new Vector2(
                    basePos.x + (t - 0.5) * this.spawnWidth,
                    basePos.y
                );

            case "point":
            default:
                return basePos;
        }
    }

    /**
     * Destroy all spawned objects
     */
    destroyAllSpawned() {
        for (const obj of this.spawnedObjects) {
            if (obj && !obj.destroyed) {
                obj.destroy();
            }
        }
        this.spawnedObjects = [];
    }

    /**
     * Get count of currently active spawned objects
     */
    getActiveSpawnCount() {
        return this.spawnedObjects.filter(obj => obj && !obj.destroyed).length;
    }

    toJSON() {
        const json = super.toJSON();
        json.spawnMode = this.spawnMode;
        json.spawnInterval = this.spawnInterval;
        json.spawnCount = this.spawnCount;
        json.maxSpawns = this.maxSpawns;
        json.autoStart = this.autoStart;
        json.spawnObjectName = this.spawnObjectName;
        json.spawnType = this.spawnType;
        json.inheritPosition = this.inheritPosition;
        json.inheritRotation = this.inheritRotation;
        json.inheritScale = this.inheritScale;
        json.spawnArea = this.spawnArea;
        json.spawnRadius = this.spawnRadius;
        json.spawnWidth = this.spawnWidth;
        json.spawnHeight = this.spawnHeight;
        json.spawnOffset = { x: this.spawnOffset.x, y: this.spawnOffset.y };
        json.randomRotation = this.randomRotation;
        json.randomScale = this.randomScale;
        json.minScale = this.minScale;
        json.maxScale = this.maxScale;
        json.giveVelocity = this.giveVelocity;
        json.velocityDirection = { x: this.velocityDirection.x, y: this.velocityDirection.y };
        json.velocityMagnitude = this.velocityMagnitude;
        json.velocityVariation = this.velocityVariation;
        json.randomDirection = this.randomDirection;
        json.setLifetime = this.setLifetime;
        json.lifetime = this.lifetime;
        json.lifetimeVariation = this.lifetimeVariation;
        json.velocityConeAngle = this.velocityConeAngle;
        json.velocityDirection = { x: this.velocityDirection.x, y: this.velocityDirection.y };
        return json;
    }

    fromJSON(json) {
        super.fromJSON(json);
        if (json.spawnMode !== undefined) this.spawnMode = json.spawnMode;
        if (json.spawnInterval !== undefined) this.spawnInterval = json.spawnInterval;
        if (json.spawnCount !== undefined) this.spawnCount = json.spawnCount;
        if (json.maxSpawns !== undefined) this.maxSpawns = json.maxSpawns;
        if (json.autoStart !== undefined) this.autoStart = json.autoStart;
        if (json.spawnObjectName !== undefined) this.spawnObjectName = json.spawnObjectName;
        if (json.spawnType !== undefined) this.spawnType = json.spawnType;
        if (json.inheritPosition !== undefined) this.inheritPosition = json.inheritPosition;
        if (json.inheritRotation !== undefined) this.inheritRotation = json.inheritRotation;
        if (json.inheritScale !== undefined) this.inheritScale = json.inheritScale;
        if (json.spawnArea !== undefined) this.spawnArea = json.spawnArea;
        if (json.spawnRadius !== undefined) this.spawnRadius = json.spawnRadius;
        if (json.spawnWidth !== undefined) this.spawnWidth = json.spawnWidth;
        if (json.spawnHeight !== undefined) this.spawnHeight = json.spawnHeight;
        if (json.spawnOffset !== undefined) {
            this.spawnOffset = new Vector2(json.spawnOffset.x, json.spawnOffset.y);
        }
        if (json.randomRotation !== undefined) this.randomRotation = json.randomRotation;
        if (json.randomScale !== undefined) this.randomScale = json.randomScale;
        if (json.minScale !== undefined) this.minScale = json.minScale;
        if (json.maxScale !== undefined) this.maxScale = json.maxScale;
        if (json.giveVelocity !== undefined) this.giveVelocity = json.giveVelocity;
        if (json.velocityDirection !== undefined) {
            this.velocityDirection = new Vector2(json.velocityDirection.x, json.velocityDirection.y);
        }
        if (json.velocityMagnitude !== undefined) this.velocityMagnitude = json.velocityMagnitude;
        if (json.velocityVariation !== undefined) this.velocityVariation = json.velocityVariation;
        if (json.randomDirection !== undefined) this.randomDirection = json.randomDirection;
        if (json.setLifetime !== undefined) this.setLifetime = json.setLifetime;
        if (json.lifetime !== undefined) this.lifetime = json.lifetime;
        if (json.lifetimeVariation !== undefined) this.lifetimeVariation = json.lifetimeVariation;
        if (json.velocityConeAngle !== undefined) this.velocityConeAngle = json.velocityConeAngle;
        if (json.velocityDirection !== undefined) {
            this.velocityDirection = new Vector2(json.velocityDirection.x, json.velocityDirection.y);
        }
    }
}

window.Spawner = Spawner;
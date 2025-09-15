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
        
        // Try different spawn methods based on spawnType preference
        switch (this.spawnType) {
            case "prefab":
                spawnedObject = this.trySpawnPrefab();
                if (!spawnedObject) spawnedObject = this.trySpawnTemplate();
                if (!spawnedObject) spawnedObject = this.createBasicObject();
                break;
                
            case "template":
                spawnedObject = this.trySpawnTemplate();
                if (!spawnedObject) spawnedObject = this.trySpawnPrefab();
                if (!spawnedObject) spawnedObject = this.createBasicObject();
                break;
                
            case "basic":
            default:
                spawnedObject = this.createBasicObject();
                break;
        }
        
        return spawnedObject;
    }

    /**
     * Try to spawn a prefab
     */
    trySpawnPrefab() {
        if (window.engine && typeof window.engine.instantiatePrefab === 'function') {
            try {
                const spawnPos = this.getSpawnPosition();
                const spawnedObject = window.engine.instantiatePrefab(this.spawnObjectName, spawnPos.x, spawnPos.y);
                
                if (spawnedObject) {
                    console.log(`Spawner: Instantiated prefab "${this.spawnObjectName}" at (${spawnPos.x}, ${spawnPos.y})`);
                    
                    // Apply additional transformations to the prefab instance
                    this.applySpawnTransforms(spawnedObject, spawnPos);
                    
                    // Track spawned object
                    this.spawnedObjects.push(spawnedObject);
                    this.spawnedCount++;
                    
                    return spawnedObject;
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
        // Check if object already has a RigidBody
        let rigidBody = spawnedObject.getModule('RigidBody');

        if (!rigidBody) {
            rigidBody = new RigidBody();
            spawnedObject.addModule(rigidBody);
        }

        let direction = new Vector2(this.velocityDirection.x, this.velocityDirection.y);
        if (this.randomDirection) {
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

        // Set initial velocity after a short delay to ensure physics is initialized
        setTimeout(() => {
            if (rigidBody.body) {
                rigidBody.setVelocity(velocity);
            }
        }, 50);
    }

    /**
     * Apply lifetime to a spawned object
     */
    applyLifetimeToObject(spawnedObject) {
        // Check if object already has a Timer module for lifetime
        let timer = spawnedObject.getModule('Timer');

        if (!timer) {
            timer = new Timer();
            timer.duration = this.lifetime + (Math.random() - 0.5) * this.lifetimeVariation;
            timer.actionType = "destroy";
            timer.autoStart = true;
            timer.repeat = false;
            spawnedObject.addModule(timer);
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
    }
}

window.Spawner = Spawner;
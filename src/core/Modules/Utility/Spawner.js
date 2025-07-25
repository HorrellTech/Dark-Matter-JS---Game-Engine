/**
 * Spawner - Spawns game objects at intervals or on events
 */
class Spawner extends Module {
    static allowMultiple = true;
    static namespace = "Utility";
    static description = "Spawns game objects at intervals or on trigger";
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
        
        // Expose properties
        this.exposeProperty("spawnMode", "enum", this.spawnMode, {
            options: ["interval", "manual", "trigger"],
            description: "When to spawn objects"
        });
        
        this.exposeProperty("spawnInterval", "number", this.spawnInterval, {
            min: 0.1,
            max: 60,
            step: 0.1,
            description: "Time between spawns (for interval mode)"
        });
        
        this.exposeProperty("spawnCount", "number", this.spawnCount, {
            min: 1,
            max: 20,
            step: 1,
            description: "Number of objects to spawn per trigger"
        });
        
        this.exposeProperty("maxSpawns", "number", this.maxSpawns, {
            min: -1,
            max: 1000,
            step: 1,
            description: "Maximum total spawns (-1 for unlimited)"
        });
        
        this.exposeProperty("autoStart", "boolean", this.autoStart, {
            description: "Start spawning automatically"
        });
        
        this.exposeProperty("spawnObjectName", "string", this.spawnObjectName, {
            description: "Name for spawned objects"
        });
        
        this.exposeProperty("spawnArea", "enum", this.spawnArea, {
            options: ["point", "circle", "rectangle", "line"],
            description: "Area shape for spawning"
        });
        
        this.exposeProperty("spawnRadius", "number", this.spawnRadius, {
            min: 0,
            max: 500,
            step: 1,
            description: "Radius for circle spawn area"
        });
        
        this.exposeProperty("spawnWidth", "number", this.spawnWidth, {
            min: 1,
            max: 1000,
            step: 1,
            description: "Width for rectangle spawn area"
        });
        
        this.exposeProperty("spawnHeight", "number", this.spawnHeight, {
            min: 1,
            max: 1000,
            step: 1,
            description: "Height for rectangle spawn area"
        });
        
        this.exposeProperty("spawnOffset", "vector2", this.spawnOffset, {
            description: "Offset from spawner position"
        });
        
        this.exposeProperty("randomRotation", "boolean", this.randomRotation, {
            description: "Give spawned objects random rotation"
        });
        
        this.exposeProperty("randomScale", "boolean", this.randomScale, {
            description: "Give spawned objects random scale"
        });
        
        this.exposeProperty("minScale", "number", this.minScale, {
            min: 0.1,
            max: 2,
            step: 0.1,
            description: "Minimum random scale"
        });
        
        this.exposeProperty("maxScale", "number", this.maxScale, {
            min: 0.1,
            max: 5,
            step: 0.1,
            description: "Maximum random scale"
        });
        
        this.exposeProperty("giveVelocity", "boolean", this.giveVelocity, {
            description: "Give spawned objects initial velocity"
        });
        
        this.exposeProperty("velocityMagnitude", "number", this.velocityMagnitude, {
            min: 0,
            max: 1000,
            step: 10,
            description: "Initial velocity magnitude"
        });
        
        this.exposeProperty("randomDirection", "boolean", this.randomDirection, {
            description: "Random velocity direction"
        });
        
        this.exposeProperty("setLifetime", "boolean", this.setLifetime, {
            description: "Automatically destroy spawned objects after time"
        });
        
        this.exposeProperty("lifetime", "number", this.lifetime, {
            min: 0.1,
            max: 60,
            step: 0.1,
            description: "Lifetime of spawned objects"
        });
    }
    
    start() {
        if (this.autoStart && this.spawnMode === "interval") {
            this.startSpawning();
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
                this.timer = 0;
            }
        }
        
        // Clean up destroyed objects from our tracking list
        this.spawnedObjects = this.spawnedObjects.filter(obj => obj && !obj.destroyed);
    }
    
    spawnSingleObject() {
        // Create new game object
        const spawnedObject = new GameObject(this.spawnObjectName);
        
        // Set position
        const spawnPos = this.getSpawnPosition();
        spawnedObject.position = new Vector2(spawnPos.x, spawnPos.y);
        
        // Set rotation
        if (this.inheritRotation) {
            spawnedObject.rotation = this.gameObject.rotation;
        } else if (this.randomRotation) {
            spawnedObject.rotation = Math.random() * Math.PI * 2;
        }
        
        // Set scale
        if (this.inheritScale) {
            spawnedObject.scale = new Vector2(this.gameObject.scale.x, this.gameObject.scale.y);
        } else if (this.randomScale) {
            const scale = this.minScale + Math.random() * (this.maxScale - this.minScale);
            spawnedObject.scale = new Vector2(scale, scale);
        }
        
        // Add basic visual component (DrawCircle) so spawned objects are visible
        const visual = new DrawCircle();
        visual.radius = 10;
        visual.color = "#" + Math.floor(Math.random()*16777215).toString(16); // Random color
        spawnedObject.addModule(visual);
        
        // Give velocity if enabled
        if (this.giveVelocity) {
            const rigidBody = new RigidBody();
            spawnedObject.addModule(rigidBody);
            
            let direction = this.velocityDirection;
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
        
        // Set lifetime if enabled
        if (this.setLifetime) {
            const timer = new Timer();
            timer.duration = this.lifetime + (Math.random() - 0.5) * this.lifetimeVariation;
            timer.actionType = "destroy";
            timer.autoStart = true;
            timer.repeat = false;
            spawnedObject.addModule(timer);
        }
        
        // Add to scene
        if (this.gameObject.scene) {
            this.gameObject.scene.gameObjects.push(spawnedObject);
            spawnedObject.scene = this.gameObject.scene;
            
            // Initialize the object
            spawnedObject.start();
        }
        
        // Track spawned object
        this.spawnedObjects.push(spawnedObject);
        this.spawnedCount++;
        
        console.log(`Spawner: Created ${this.spawnObjectName} at (${spawnPos.x}, ${spawnPos.y})`);
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
        json.velocityMagnitude = this.velocityMagnitude;
        json.randomDirection = this.randomDirection;
        json.setLifetime = this.setLifetime;
        json.lifetime = this.lifetime;
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
        if (json.velocityMagnitude !== undefined) this.velocityMagnitude = json.velocityMagnitude;
        if (json.randomDirection !== undefined) this.randomDirection = json.randomDirection;
        if (json.setLifetime !== undefined) this.setLifetime = json.setLifetime;
        if (json.lifetime !== undefined) this.lifetime = json.lifetime;
    }
}

window.Spawner = Spawner;
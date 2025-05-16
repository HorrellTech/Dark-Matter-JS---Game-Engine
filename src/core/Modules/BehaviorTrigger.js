/**
 * BehaviorTrigger - Trigger actions based on simple conditions
 * 
 * This module allows for configuring simple behaviors and reactions
 * without custom coding, like triggering actions on collisions, key presses,
 * or mouse interactions.
 */
class BehaviorTrigger extends Module {
    static namespace = "Logic";
    static description = "Triggers actions based on events like collisions and key presses";
    static iconClass = "fas fa-bolt";
    
    constructor() {
        super("BehaviorTrigger");
        
        // Behavior settings
        this.triggerType = "collision"; // collision, key, mouse, timer
        this.triggerKey = "space";      // For key triggers
        this.mouseButton = "left";      // For mouse triggers
        this.triggerTag = "";           // For collision triggers (filter by tag)
        
        // Timer settings (for timer trigger)
        this.timerInterval = 1.0;       // Seconds
        this.timerRepeat = true;        // Repeat or one-shot
        this._timerCount = 0;
        
        // Action to take when triggered
        this.actionType = "destroy";    // destroy, spawn, animate, toggle, message
        this.actionTarget = "self";     // self, other, byName
        this.targetName = "";           // For byName target
        
        // Properties for different actions
        this.toggleProperty = "active"; // Property to toggle
        this.animationState = "";       // Animation state to play
        this.messageType = "damage";    // Type of message to send (e.g., "damage", "heal")
        this.messageValue = 10;         // Value to send with message
        
        // Prefab to spawn (if action is spawn)
        this.spawnPrefab = null;
        this.spawnOffset = new Vector2(0, 0);
        this.spawnInheritVelocity = false;
        
        // Cooldown between triggers
        this.cooldown = 0.0;
        this._cooldownTimer = 0;
        this._canTrigger = true;
        
        // Exposed properties
        this.exposeProperty("triggerType", "enum", "collision", {
            description: "What causes the trigger to activate",
            options: ["collision", "key", "mouse", "timer"]
        });
        
        this.exposeProperty("triggerKey", "string", "space", {
            description: "Key that activates the trigger",
            showIf: {property: "triggerType", value: "key"}
        });
        
        this.exposeProperty("mouseButton", "enum", "left", {
            description: "Mouse button that activates the trigger",
            options: ["left", "middle", "right"],
            showIf: {property: "triggerType", value: "mouse"}
        });
        
        this.exposeProperty("triggerTag", "string", "", {
            description: "Only trigger for objects with this tag (empty = any)",
            showIf: {property: "triggerType", value: "collision"}
        });
        
        this.exposeProperty("timerInterval", "number", 1.0, {
            description: "Time between trigger activations (seconds)",
            min: 0.1,
            max: 60,
            step: 0.1,
            showIf: {property: "triggerType", value: "timer"}
        });
        
        this.exposeProperty("timerRepeat", "boolean", true, {
            description: "Whether the timer repeats or fires once",
            showIf: {property: "triggerType", value: "timer"}
        });
        
        this.exposeProperty("actionType", "enum", "destroy", {
            description: "Action to take when triggered",
            options: ["destroy", "spawn", "animate", "toggle", "message", "teleport"]
        });
        
        this.exposeProperty("actionTarget", "enum", "self", {
            description: "What object the action affects",
            options: ["self", "other", "byName"]
        });
        
        this.exposeProperty("targetName", "string", "", {
            description: "Name of target object",
            showIf: {property: "actionTarget", value: "byName"}
        });
        
        this.exposeProperty("toggleProperty", "enum", "active", {
            description: "Property to toggle",
            options: ["active", "visible", "collisionEnabled"],
            showIf: {property: "actionType", value: "toggle"}
        });
        
        this.exposeProperty("animationState", "string", "", {
            description: "Animation state to play",
            showIf: {property: "actionType", value: "animate"}
        });
        
        this.exposeProperty("messageType", "enum", "damage", {
            description: "Type of message to send",
            options: ["damage", "heal", "custom"],
            showIf: {property: "actionType", value: "message"}
        });
        
        this.exposeProperty("messageValue", "number", 10, {
            description: "Value to send with message",
            showIf: {property: "actionType", value: "message"}
        });
        
        this.exposeProperty("spawnOffset", "vector2", this.spawnOffset, {
            description: "Offset from current position to spawn at",
            showIf: {property: "actionType", value: "spawn"}
        });
        
        this.exposeProperty("spawnInheritVelocity", "boolean", false, {
            description: "Whether spawned object inherits velocity",
            showIf: {property: "actionType", value: "spawn"}
        });
        
        this.exposeProperty("cooldown", "number", 0.0, {
            description: "Cooldown between triggers (seconds)",
            min: 0,
            max: 60,
            step: 0.1
        });
    }
    
    /**
     * Start method - called when module is first enabled
     */
    start() {
        this._canTrigger = true;
        this._cooldownTimer = 0;
        this._timerCount = 0;
    }
    
    /**
     * Handle collision enter events
     * @param {GameObject} other - The other GameObject in the collision
     */
    onCollisionEnter(other) {
        if (this.triggerType !== "collision") return;
        
        // Check if we should filter by tag
        if (this.triggerTag && !other.hasTag(this.triggerTag)) {
            return;
        }
        
        this.tryTriggerAction(other);
    }
    
    /**
     * Handle trigger enter events (for colliders marked as triggers)
     * @param {GameObject} other - The other GameObject in the collision
     */
    onTriggerEnter(other) {
        if (this.triggerType !== "collision") return;
        
        // Check if we should filter by tag
        if (this.triggerTag && !other.hasTag(this.triggerTag)) {
            return;
        }
        
        this.tryTriggerAction(other);
    }
    
    /**
     * Try to trigger the configured action if cooldown allows
     * @param {GameObject} other - The other GameObject (if from collision)
     */
    tryTriggerAction(other = null) {
        if (!this._canTrigger) return;
        
        // Execute the action
        this.executeAction(other);
        
        // Start cooldown if needed
        if (this.cooldown > 0) {
            this._canTrigger = false;
            this._cooldownTimer = this.cooldown;
        }
    }
    
    /**
     * Execute the configured action
     * @param {GameObject} other - The other GameObject (if from collision)
     */
    executeAction(other = null) {
        // Find the target object based on settings
        let targetObject = null;
        
        switch (this.actionTarget) {
            case "self":
                targetObject = this.gameObject;
                break;
            case "other":
                targetObject = other;
                break;
            case "byName":
                // Try to find in scene
                if (window.engine && window.engine.scene) {
                    targetObject = window.engine.getAllObjects(window.engine.gameObjects)
                        .find(obj => obj.name === this.targetName);
                }
                break;
        }
        
        // Skip if no target found
        if (!targetObject) {
            console.warn(`BehaviorTrigger: No target object found for action ${this.actionType}`);
            return;
        }
        
        // Execute the appropriate action
        switch (this.actionType) {
            case "destroy":
                // Look for removeFromScene method (engine specific)
                if (window.editor && typeof window.editor.removeGameObject === 'function') {
                    window.editor.removeGameObject(targetObject);
                } else {
                    // Just disable if we can't remove
                    targetObject.active = false;
                }
                break;
                
            case "spawn":
                // Need engine or editor to spawn objects
                if (this.spawnPrefab) {
                    const spawnPos = this.gameObject.getWorldPosition().add(this.spawnOffset);
                    // Try to spawn via editor if available
                    if (window.editor && typeof window.editor.createGameObjectFromPrefab === 'function') {
                        const newObj = window.editor.createGameObjectFromPrefab(this.spawnPrefab);
                        if (newObj) {
                            newObj.position = spawnPos;
                            
                            // If inheriting velocity, check for rigidbody
                            if (this.spawnInheritVelocity) {
                                const sourceRb = this.gameObject.getModule("RigidBody");
                                const targetRb = newObj.getModule("RigidBody");
                                
                                if (sourceRb && targetRb) {
                                    targetRb.setVelocity(sourceRb.getVelocity());
                                }
                            }
                        }
                    }
                }
                break;
                
            case "animate":
                // Find animator module and play animation
                if (this.animationState) {
                    const animator = targetObject.getModule("Animator");
                    if (animator) {
                        animator.play(this.animationState);
                    }
                }
                break;
                
            case "toggle":
                // Toggle the specified property
                switch (this.toggleProperty) {
                    case "active":
                        targetObject.active = !targetObject.active;
                        break;
                    case "visible":
                        targetObject.visible = !targetObject.visible;
                        break;
                    case "collisionEnabled":
                        targetObject.collisionEnabled = !targetObject.collisionEnabled;
                        break;
                }
                break;
                
            case "message":
                // Send a message to the target object based on message type
                switch (this.messageType) {
                    case "damage":
                        const health = targetObject.getModule("SimpleHealth");
                        if (health) {
                            health.applyDamage(this.messageValue, this.gameObject);
                        }
                        break;
                    case "heal":
                        const healthModule = targetObject.getModule("SimpleHealth");
                        if (healthModule) {
                            healthModule.heal(this.messageValue);
                        }
                        break;
                    case "custom":
                        // Dispatch a custom event
                        if (targetObject.onCustomEvent) {
                            targetObject.onCustomEvent(this.messageType, this.messageValue, this.gameObject);
                        }
                        break;
                }
                break;
                
            case "teleport":
                // Teleport to this object's position
                const teleportPos = this.gameObject.getWorldPosition();
                targetObject.position = teleportPos;
                break;
        }
    }
    
    /**
     * Main update loop
     * @param {number} deltaTime - Time since last frame in seconds
     */
    loop(deltaTime) {
        // Update cooldown timer
        if (!this._canTrigger && this._cooldownTimer > 0) {
            this._cooldownTimer -= deltaTime;
            
            if (this._cooldownTimer <= 0) {
                this._canTrigger = true;
                this._cooldownTimer = 0;
            }
        }
        
        // Handle key trigger
        if (this.triggerType === "key" && this._canTrigger) {
            if (window.input && window.input.keyPressed(this.triggerKey.toLowerCase())) {
                this.tryTriggerAction();
            }
        }
        
        // Handle mouse trigger
        if (this.triggerType === "mouse" && this._canTrigger) {
            if (window.input && window.input.mousePressed(this.mouseButton)) {
                this.tryTriggerAction();
            }
        }
        
        // Handle timer trigger
        if (this.triggerType === "timer" && this._canTrigger) {
            this._timerCount += deltaTime;
            
            if (this._timerCount >= this.timerInterval) {
                this._timerCount = 0;
                this.tryTriggerAction();
                
                // If not repeating, disable this module
                if (!this.timerRepeat) {
                    this.enabled = false;
                }
            }
        }
    }
    
    /**
     * Override to handle serialization
     * @returns {Object} Serialized data
     */
    toJSON() {
        const json = super.toJSON();
        
        // Basic properties
        json.triggerType = this.triggerType;
        json.triggerKey = this.triggerKey;
        json.mouseButton = this.mouseButton;
        json.triggerTag = this.triggerTag;
        json.timerInterval = this.timerInterval;
        json.timerRepeat = this.timerRepeat;
        
        // Action properties
        json.actionType = this.actionType;
        json.actionTarget = this.actionTarget;
        json.targetName = this.targetName;
        json.toggleProperty = this.toggleProperty;
        json.animationState = this.animationState;
        json.messageType = this.messageType;
        json.messageValue = this.messageValue;
        
        // Spawn properties
        if (this.spawnPrefab) {
            json.spawnPrefabId = this.spawnPrefab.id;
        }
        json.spawnOffset = { x: this.spawnOffset.x, y: this.spawnOffset.y };
        json.spawnInheritVelocity = this.spawnInheritVelocity;
        
        json.cooldown = this.cooldown;
        
        return json;
    }
    
    /**
     * Restore from serialized data
     * @param {Object} json - Serialized data
     */
    fromJSON(json) {
        super.fromJSON(json);
        
        // Basic properties
        if (json.triggerType) this.triggerType = json.triggerType;
        if (json.triggerKey) this.triggerKey = json.triggerKey;
        if (json.mouseButton) this.mouseButton = json.mouseButton;
        if (json.triggerTag !== undefined) this.triggerTag = json.triggerTag;
        if (json.timerInterval) this.timerInterval = json.timerInterval;
        if (json.timerRepeat !== undefined) this.timerRepeat = json.timerRepeat;
        
        // Action properties
        if (json.actionType) this.actionType = json.actionType;
        if (json.actionTarget) this.actionTarget = json.actionTarget;
        if (json.targetName) this.targetName = json.targetName;
        if (json.toggleProperty) this.toggleProperty = json.toggleProperty;
        if (json.animationState) this.animationState = json.animationState;
        if (json.messageType) this.messageType = json.messageType;
        if (json.messageValue !== undefined) this.messageValue = json.messageValue;
        
        // Spawn properties - prefab needs to be handled by the editor later
        if (json.spawnOffset) {
            this.spawnOffset = new Vector2(json.spawnOffset.x, json.spawnOffset.y);
        }
        if (json.spawnInheritVelocity !== undefined) {
            this.spawnInheritVelocity = json.spawnInheritVelocity;
        }
        if (json.spawnPrefabId) {
            // Store ID to be resolved later by editor
            this._pendingSpawnPrefabId = json.spawnPrefabId;
        }
        
        if (json.cooldown) this.cooldown = json.cooldown;
    }
}

// Register module globally
window.BehaviorTrigger = BehaviorTrigger;
/**
 * Collider - A sensor-only collider for detecting overlaps without physics response
 */
class Collider extends Module {
    static namespace = "Matter.js";
    static description = "A sensor-only collider for detecting overlaps without physics response";

    constructor() {
        super("Collider");
        
        // Collider properties
        this.shape = "rectangle";   // "rectangle", "circle", "polygon"
        this.width = 100;           // Used for rectangle
        this.height = 100;          // Used for rectangle
        this.radius = 50;           // Used for circle
        this.vertices = [];         // Used for polygon
        this.offset = new Vector2(0, 0); // Offset from the game object's position
        
        // Physics body (sensor)
        this.body = null;
        
        // Collision tracking
        this.inCollision = new Set();  // Set of bodies currently in contact
        
        // Expose properties to the inspector
        this.exposeProperty("shape", "enum", "rectangle", {
            options: ["rectangle", "circle", "polygon"],
            onChange: () => this.rebuildCollider()
        });
        
        this.exposeProperty("width", "number", 100, {
            min: 1,
            onChange: () => this.rebuildCollider()
        });
        
        this.exposeProperty("height", "number", 100, {
            min: 1,
            onChange: () => this.rebuildCollider()
        });
        
        this.exposeProperty("radius", "number", 50, {
            min: 1,
            onChange: () => this.rebuildCollider()
        });
        
        this.exposeProperty("offset", "vector2", new Vector2(0, 0), {
            onChange: () => this.rebuildCollider()
        });
        
        this.boundOnCollisionStart = this.onCollisionStart.bind(this);
        this.boundOnCollisionEnd = this.onCollisionEnd.bind(this);
    }
    
    /**
     * Create the collider when the component starts
     */
    start() {
        if (!window.physicsManager) {
            console.error("Physics manager not found. Make sure it's initialized before using Collider.");
            return;
        }
        
        this.createCollider();
        
        // Set up collision handlers
        Matter.Events.on(window.physicsManager.engine, 'collisionStart', this.boundOnCollisionStart);
        Matter.Events.on(window.physicsManager.engine, 'collisionEnd', this.boundOnCollisionEnd);
    }
    
    /**
     * Create the physics body based on current settings
     */
    createCollider() {
        if (!this.gameObject) return;
    
        let rigidBody;
        try {
            // Try to find a RigidBody module on this GameObject
            rigidBody = this.gameObject.getModule('RigidBody');
        } catch (error) {
            console.error("Error getting RigidBody module:", error);
            rigidBody = null;
        }
        
        // Check if rigidBody exists
        if (!rigidBody) {
            console.warn(`No RigidBody found on ${this.gameObject.name}, adding one automatically`);
            // Create and add a RigidBody module
            if (window.RigidBody) {
                rigidBody = new window.RigidBody();
                this.gameObject.addModule(rigidBody);
            } else {
                console.error("RigidBody class not found, cannot create collider");
                return;
            }
        }
        
        // Clean up existing body if any
        this.removeCollider();
        
        // Create the shape based on selected type
        let body;
        const pos = this.gameObject.getWorldPosition();
        const offsetPos = {
            x: pos.x + this.offset.x,
            y: pos.y + this.offset.y
        };
        const angle = this.gameObject.angle * (Math.PI / 180);
        
        const options = {
            isSensor: true,      // Always a sensor
            isStatic: true,      // Make it static to avoid physics influence
            angle: angle,
            label: `${this.gameObject.name}-collider`,
            collisionFilter: {
                category: 0x0002, // Different category than RigidBody by default
                mask: 0xFFFFFFFF,
                group: 0
            },
            plugin: {
                isCollider: true  // Custom flag to identify this as a collider
            }
        };
        
        try {
            switch (this.shape) {
                case "circle":
                    // Ensure radius is valid
                    const safeRadius = Math.max(1, this.radius);
                    body = Matter.Bodies.circle(offsetPos.x, offsetPos.y, safeRadius, options);
                    break;
                
                case "rectangle":
                    // Ensure width and height are valid
                    const safeWidth = Math.max(1, this.width);
                    const safeHeight = Math.max(1, this.height);
                    body = Matter.Bodies.rectangle(offsetPos.x, offsetPos.y, safeWidth, safeHeight, options);
                    break;
                    
                case "polygon":
                    if (this.vertices && this.vertices.length >= 3) {
                        // Format vertices properly for Matter.js
                        const formattedVertices = this.vertices.map(v => ({
                            x: v.x || 0,
                            y: v.y || 0
                        }));
                        
                        // Use fromVertices with decomp flag set to ensure proper decomposition
                        body = Matter.Bodies.fromVertices(
                            offsetPos.x, 
                            offsetPos.y, 
                            [formattedVertices], 
                            {
                                ...options,
                                flagInternal: false
                            }
                        );
                        
                        // If body creation failed, fall back to rectangle
                        if (!body) {
                            console.warn("Failed to create polygon collider, using rectangle as fallback");
                            body = Matter.Bodies.rectangle(offsetPos.x, offsetPos.y, this.width, this.height, options);
                        }
                    } else {
                        // Fallback to rectangle if no valid vertices
                        console.warn("Not enough vertices for polygon, using rectangle as fallback");
                        body = Matter.Bodies.rectangle(offsetPos.x, offsetPos.y, this.width, this.height, options);
                    }
                    break;
                
                default:
                    body = Matter.Bodies.rectangle(offsetPos.x, offsetPos.y, this.width, this.height, options);
            }
        } catch (error) {
            console.error("Error creating collider:", error);
            // Fallback to a simple circle as last resort
            body = Matter.Bodies.circle(offsetPos.x, offsetPos.y, 10, options);
        }
        
        if (!body) {
            console.error("Failed to create collider body");
            return null;
        }
        
        // Make it a sensor and set special physics properties
        body.isSensor = true;
        body.isStatic = true;  // Changed from false to true
        
        // Store the body
        this.body = body;
        
        // Create constraint to parent if the gameObject has a rigidbody
        if (rigidBody && rigidBody.body) {
            this.constraint = Matter.Constraint.create({
                bodyA: rigidBody.body,
                bodyB: body,
                stiffness: 1,
                length: 0,
                pointA: { x: this.offset.x, y: this.offset.y },
                pointB: { x: 0, y: 0 }
            });
            
            Matter.Composite.add(window.physicsManager.world, this.constraint);
        }
        
        // Register with physics manager
        window.physicsManager.registerBody(body, this.gameObject);
        
        // Store reference to this module in the body
        this.body.module = this;
        
        return body;
    }
    
    /**
     * Remove the collider from the physics world
     */
    removeCollider() {
        if (this.constraint && window.physicsManager) {
            Matter.Composite.remove(window.physicsManager.world, this.constraint);
            this.constraint = null;
        }
        
        if (this.body && window.physicsManager) {
            window.physicsManager.removeBody(this.body);
            this.body = null;
        }
    }
    
    /**
     * Rebuild the collider when properties change
     */
    rebuildCollider() {
        if (this.gameObject && window.physicsManager) {
            this.createCollider();
        }
    }
    
    /**
     * Update collider position if not constrained to a rigidbody
     */
    beginLoop() {
        if (!this.constraint && this.body && this.gameObject) {
            const pos = this.gameObject.getWorldPosition();
            const offsetPos = {
                x: pos.x + this.offset.x,
                y: pos.y + this.offset.y
            };
            const angle = this.gameObject.angle * (Math.PI / 180);
            
            Matter.Body.setPosition(this.body, offsetPos);
            Matter.Body.setAngle(this.body, angle);
        }
    }
    
    /**
     * Handle collision start events
     */
    onCollisionStart(event) {
        const pairs = event.pairs;
        
        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i];
            
            if (pair.bodyA === this.body) {
                // Add the colliding body to our contacts
                this.inCollision.add(pair.bodyB);
                
                // Find the other game object
                const otherObject = window.physicsManager.bodies.get(pair.bodyB);
                if (otherObject) {
                    // Call the onTriggerEnter method if it exists
                    if (this.gameObject && this.gameObject.onTriggerEnter) {
                        this.gameObject.onTriggerEnter(otherObject);
                    }
                }
            } 
            else if (pair.bodyB === this.body) {
                // Add the colliding body to our contacts
                this.inCollision.add(pair.bodyA);
                
                // Find the other game object
                const otherObject = window.physicsManager.bodies.get(pair.bodyA);
                if (otherObject) {
                    // Call the onTriggerEnter method if it exists
                    if (this.gameObject && this.gameObject.onTriggerEnter) {
                        this.gameObject.onTriggerEnter(otherObject);
                    }
                }
            }
        }
    }
    
    /**
     * Handle collision end events
     */
    onCollisionEnd(event) {
        const pairs = event.pairs;
        
        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i];
            
            if (pair.bodyA === this.body) {
                // Remove the body from our contacts
                this.inCollision.delete(pair.bodyB);
                
                // Find the other game object
                const otherObject = window.physicsManager.bodies.get(pair.bodyB);
                if (otherObject) {
                    // Call the onTriggerExit method if it exists
                    if (this.gameObject && this.gameObject.onTriggerExit) {
                        this.gameObject.onTriggerExit(otherObject);
                    }
                }
            } 
            else if (pair.bodyB === this.body) {
                // Remove the body from our contacts
                this.inCollision.delete(pair.bodyA);
                
                // Find the other game object
                const otherObject = window.physicsManager.bodies.get(pair.bodyA);
                if (otherObject) {
                    // Call the onTriggerExit method if it exists
                    if (this.gameObject && this.gameObject.onTriggerExit) {
                        this.gameObject.onTriggerExit(otherObject);
                    }
                }
            }
        }
    }
    
    /**
     * Called when the module is destroyed
     */
    onDestroy() {
        // Remove event listeners
        if (window.physicsManager && window.physicsManager.engine) {
            Matter.Events.off(window.physicsManager.engine, 'collisionStart', this.boundOnCollisionStart);
            Matter.Events.off(window.physicsManager.engine, 'collisionEnd', this.boundOnCollisionEnd);
        }
        
        // Remove collider from physics world
        this.removeCollider();
    }
}

// Register the module
window.Collider = Collider;
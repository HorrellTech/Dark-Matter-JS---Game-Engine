/**
 * RigidBody - Physics component that adds a physical body to a GameObject
 */
class RigidBody extends Module {
    static allowMultiple = false; // Only one RigidBody per GameObject
    static namespace = "Matter.js";
    static description = "Physics component that adds a physical body to a GameObject";

    constructor() {
        super("RigidBody");
        
        // Physics body reference
        this.body = null;
        
        // Body properties
        this.bodyType = "dynamic";  // "dynamic", "static", "kinematic"
        this.density = 1;           // Density (mass = density * area)
        this.friction = 0.1;        // Friction coefficient
        this.restitution = 0.1;     // Bounciness (0 to 1)
        this.linearDamping = 0.01;  // Air resistance to linear movement
        this.angularDamping = 0.01; // Air resistance to rotation
        this.isSensor = false;      // Is this a trigger/sensor?
        this.collisionFilter = {    // Collision filtering
            category: 0x0001,       // What category this body belongs to
            mask: 0xFFFFFFFF,       // What categories this body collides with
            group: 0                // Collision groups
        };
        
        // Shape options
        this.shape = "rectangle";   // "rectangle", "circle", "polygon"
        this.width = 100;           // Used for rectangle
        this.height = 100;          // Used for rectangle
        this.radius = 50;           // Used for circle
        this.vertices = [];         // Used for polygon
        
        // Constraint options
        this.fixedRotation = false; // Prevent rotation
        
        // Collision tracking
        this.inCollision = new Set();  // Set of bodies currently in contact
        this.bodyNeedsUpdate = false;  // Flag to update static bodies when moved
        
        // Expose properties to the inspector
        this.exposeProperty("bodyType", "enum", "dynamic", {
            options: ["dynamic", "static", "kinematic"],
            onChange: () => this.rebuildBody()
        });
        
        this.exposeProperty("shape", "enum", "rectangle", {
            options: ["rectangle", "circle", "polygon"],
            onChange: () => this.rebuildBody()
        });
        
        this.exposeProperty("width", "number", 100, {
            min: 1,
            onChange: () => this.rebuildBody()
        });
        
        this.exposeProperty("height", "number", 100, {
            min: 1,
            onChange: () => this.rebuildBody()
        });
        
        this.exposeProperty("radius", "number", 50, {
            min: 1,
            onChange: () => this.rebuildBody()
        });
        
        this.exposeProperty("density", "number", 1, {
            min: 0.001,
            max: 100,
            onChange: (value) => {
                if (this.body) Matter.Body.setDensity(this.body, value);
            }
        });
        
        this.exposeProperty("friction", "number", 0.1, {
            min: 0,
            max: 1,
            onChange: (value) => {
                if (this.body) this.body.friction = value;
            }
        });
        
        this.exposeProperty("restitution", "number", 0.1, {
            min: 0,
            max: 1,
            onChange: (value) => {
                if (this.body) this.body.restitution = value;
            }
        });
        
        this.exposeProperty("fixedRotation", "boolean", false, {
            onChange: (value) => {
                if (this.body) {
                    this.body.inertia = value ? Infinity : Matter.Body.inertia(this.body);
                }
            }
        });
        
        this.exposeProperty("isSensor", "boolean", false, {
            onChange: (value) => {
                if (this.body) this.body.isSensor = value;
            }
        });
        
        this.boundOnCollisionStart = this.onCollisionStart.bind(this);
        this.boundOnCollisionEnd = this.onCollisionEnd.bind(this);
    }
    
    /**
     * Create the physics body when the component starts
     */
    start() {
        if (!window.physicsManager) {
            console.error("Physics manager not found. Make sure it's initialized before using RigidBody.");
            return;
        }
        
        this.createBody();
        
        // Set up collision handlers
        Matter.Events.on(window.physicsManager.engine, 'collisionStart', this.boundOnCollisionStart);
        Matter.Events.on(window.physicsManager.engine, 'collisionEnd', this.boundOnCollisionEnd);
    }
    
    /**
     * Create the physics body based on current settings
     */
    createBody() {
        if (!this.gameObject) return;
        
        // Clean up existing body if any
        this.removeBody();
        
        // Create the shape based on selected type
        let body;
        const pos = this.gameObject.getWorldPosition();
        const angle = this.gameObject.angle * (Math.PI / 180);
        
        const options = {
            friction: this.friction,
            restitution: this.restitution,
            density: this.density,
            isSensor: this.isSensor,
            isStatic: this.bodyType === "static",
            angle: angle,
            label: this.gameObject.name,
            collisionFilter: this.collisionFilter
        };
        
        switch (this.shape) {
            case "circle":
                body = Matter.Bodies.circle(pos.x, pos.y, this.radius, options);
                break;
            
            case "rectangle":
                body = Matter.Bodies.rectangle(pos.x, pos.y, this.width, this.height, options);
                break;
                
            case "polygon":
                if (this.vertices.length >= 3) {
                    body = Matter.Bodies.fromVertices(pos.x, pos.y, this.vertices, options);
                } else {
                    // Fallback to rectangle if no valid vertices
                    body = Matter.Bodies.rectangle(pos.x, pos.y, this.width, this.height, options);
                }
                break;
            
            default:
                body = Matter.Bodies.rectangle(pos.x, pos.y, this.width, this.height, options);
        }
        
        // Apply kinematics settings
        if (this.bodyType === "kinematic") {
            body.isStatic = false;
            body.inertia = Infinity;
            body.inverseInertia = 0;
            body.inverseMass = 0;
        }
        else if (this.bodyType === "static") {
            body.isStatic = true;
            body.inertia = Infinity;
            body.inverseInertia = 0;
            body.inverseMass = 0;
        }
        else {
            body.isStatic = false;
            body.inverseInertia = 1 / body.inertia;
            body.inverseMass = 1 / body.mass;
        }
        
        // Apply fixed rotation constraint
        if (this.fixedRotation) {
            body.inertia = Infinity;
            body.inverseInertia = 0;
        }
        
        // Store the body
        this.body = body;
        
        // Register with physics manager
        window.physicsManager.registerBody(body, this.gameObject);
        
        // Store reference to this module in the body
        this.body.module = this;
        
        return body;
    }
    
    /**
     * Remove the body from the physics world
     */
    removeBody() {
        if (this.body && window.physicsManager) {
            window.physicsManager.removeBody(this.body);
            this.body = null;
        }
    }
    
    /**
     * Rebuild the body when properties change
     */
    rebuildBody() {
        if (this.gameObject && window.physicsManager) {
            this.createBody();
        }
    }
    
    /**
     * Apply a force to the center of the body
     * @param {Vector2} force - The force to apply
     */
    applyForce(force) {
        if (this.body) {
            Matter.Body.applyForce(this.body, this.body.position, { x: force.x, y: force.y });
        }
    }
    
    /**
     * Apply an impulse to the center of the body
     * @param {Vector2} impulse - The impulse to apply
     */
    applyImpulse(impulse) {
        if (this.body) {
            const position = this.body.position;
            Matter.Body.applyForce(this.body, position, {
                x: impulse.x / this.body.mass,
                y: impulse.y / this.body.mass
            });
        }
    }
    
    /**
     * Apply a torque (rotational force) to the body
     * @param {number} torque - The torque to apply
     */
    applyTorque(torque) {
        if (this.body) {
            Matter.Body.setAngularVelocity(this.body, this.body.angularVelocity + torque);
        }
    }
    
    /**
     * Set the linear velocity of the body
     * @param {Vector2} velocity - The velocity to set
     */
    setVelocity(velocity) {
        if (this.body) {
            Matter.Body.setVelocity(this.body, { x: velocity.x, y: velocity.y });
        }
    }
    
    /**
     * Get the current linear velocity of the body
     * @returns {Vector2} The current velocity
     */
    getVelocity() {
        if (this.body) {
            return new Vector2(this.body.velocity.x, this.body.velocity.y);
        }
        return new Vector2(0, 0);
    }
    
    /**
     * Set the angular velocity of the body
     * @param {number} angularVelocity - The angular velocity in degrees/second
     */
    setAngularVelocity(angularVelocity) {
        if (this.body) {
            // Convert from degrees/sec to radians/sec
            const radians = angularVelocity * (Math.PI / 180);
            Matter.Body.setAngularVelocity(this.body, radians);
        }
    }
    
    /**
     * Get the current angular velocity of the body
     * @returns {number} The angular velocity in degrees/second
     */
    getAngularVelocity() {
        if (this.body) {
            // Convert from radians/sec to degrees/sec
            return this.body.angularVelocity * (180 / Math.PI);
        }
        return 0;
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
                    // Call the onCollisionEnter method if it exists
                    if (this.gameObject && this.gameObject.onCollisionEnter) {
                        this.gameObject.onCollisionEnter(otherObject);
                    }
                }
            } 
            else if (pair.bodyB === this.body) {
                // Add the colliding body to our contacts
                this.inCollision.add(pair.bodyA);
                
                // Find the other game object
                const otherObject = window.physicsManager.bodies.get(pair.bodyA);
                if (otherObject) {
                    // Call the onCollisionEnter method if it exists
                    if (this.gameObject && this.gameObject.onCollisionEnter) {
                        this.gameObject.onCollisionEnter(otherObject);
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
                    // Call the onCollisionExit method if it exists
                    if (this.gameObject && this.gameObject.onCollisionExit) {
                        this.gameObject.onCollisionExit(otherObject);
                    }
                }
            } 
            else if (pair.bodyB === this.body) {
                // Remove the body from our contacts
                this.inCollision.delete(pair.bodyA);
                
                // Find the other game object
                const otherObject = window.physicsManager.bodies.get(pair.bodyA);
                if (otherObject) {
                    // Call the onCollisionExit method if it exists
                    if (this.gameObject && this.gameObject.onCollisionExit) {
                        this.gameObject.onCollisionExit(otherObject);
                    }
                }
            }
        }
    }
    
    /**
     * Called before rendering to update static bodies if needed
     */
    beginLoop() {
        // If the game object has moved, we need to update static bodies
        if (this.body && this.body.isStatic && this.gameObject) {
            const pos = this.gameObject.getWorldPosition();
            const currentPos = this.body.position;
            const angle = this.gameObject.angle * (Math.PI / 180);
            
            // Check if position or rotation changed
            if (Math.abs(pos.x - currentPos.x) > 0.01 || 
                Math.abs(pos.y - currentPos.y) > 0.01 ||
                Math.abs(angle - this.body.angle) > 0.01) {
                    
                Matter.Body.setPosition(this.body, { x: pos.x, y: pos.y });
                Matter.Body.setAngle(this.body, angle);
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
        
        // Remove body from physics world
        this.removeBody();
    }
}

// Register the module
window.RigidBody = RigidBody;
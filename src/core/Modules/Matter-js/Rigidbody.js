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
        this.friction = 0.8;        // Friction coefficient
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
        this.width = 50;           // Used for rectangle
        this.height = 50;          // Used for rectangle
        this.radius = 25;           // Used for circle
        this.vertices = [];         // Used for polygon

        // Constraint options
        this.fixedRotation = false; // Prevent rotation

        // Collision tracking
        this.inCollision = new Set();  // Set of bodies currently in contact
        this.bodyNeedsUpdate = false;  // Flag to update static bodies when moved

        this._skipRebuild = true; // Internal flag to skip rebuilds during bulk updates

        // Expose properties to the inspector
        this.exposeProperty("bodyType", "enum", this.bodyType, {
            options: ["dynamic", "static", "kinematic"],
            onChange: (val) => { this.bodyType = val; if (!this._skipRebuild) this.rebuildBody(); }
        });

        this.exposeProperty("shape", "enum", this.shape, {
            options: ["rectangle", "circle", "polygon"],
            onChange: (val) => { this.shape = val; if (!this._skipRebuild) this.rebuildBody(); }
        });

        this.exposeProperty("width", "number", this.width, {
            min: 1,
            onChange: (val) => { this.width = val; if (!this._skipRebuild) this.rebuildBody(); }
        });

        this.exposeProperty("height", "number", this.height, {
            min: 1,
            onChange: (val) => { this.height = val; if (!this._skipRebuild) this.rebuildBody(); }
        });

        this.exposeProperty("radius", "number", this.radius, {
            min: 1,
            onChange: (val) => { this.radius = val; if (!this._skipRebuild) this.rebuildBody(); }
        });

        this.exposeProperty("density", "number", this.density, {
            min: 0.001,
            max: 100,
            onChange: (val) => { this.density = val; if (this.body) Matter.Body.setDensity(this.body, val); }
        });

        this.exposeProperty("friction", "number", this.friction, {
            min: 0,
            max: 1,
            onChange: (val) => { this.friction = val; if (this.body) this.body.friction = val; }
        });

        this.exposeProperty("restitution", "number", this.restitution, {
            min: 0,
            max: 1,
            onChange: (val) => { this.restitution = val; if (this.body) this.body.restitution = val; }
        });

        this.exposeProperty("fixedRotation", "boolean", false, {
            onChange: (value) => {
                this.fixedRotation = value;
                if (this.body) {
                    // Fix: Use correct method to set inertia for fixed rotation
                    if (value) {
                        this.body.inertia = Infinity;
                        this.body.inverseInertia = 0;
                    } else {
                        // Calculate proper inertia based on the body shape
                        if (this.shape === "circle") {
                            // For circle: I = m * r^2
                            const mass = this.body.mass;
                            const radius = this.radius;
                            this.body.inertia = mass * radius * radius;
                        } else {
                            // For rectangles and other shapes, use Matter.js built-in calculation
                            // We need to recalculate based on vertices
                            const mass = this.body.mass;
                            let inertia = 0;
                            const vertices = this.body.vertices;

                            // Simple approximation for non-circular shapes
                            // Based on Matter.js internal calculations
                            const centre = this.body.position;
                            for (let i = 0; i < vertices.length; i++) {
                                const vertex = vertices[i];
                                const dx = vertex.x - centre.x;
                                const dy = vertex.y - centre.y;
                                const distSq = dx * dx + dy * dy;
                                inertia += distSq;
                            }

                            this.body.inertia = mass * (inertia / vertices.length);
                        }

                        // Make sure to update inverseInertia as well
                        this.body.inverseInertia = 1 / this.body.inertia;
                    }
                }
            }
        });

        this.exposeProperty("isSensor", "boolean", this.isSensor, {
            onChange: (val) => { this.isSensor = val; if (this.body) this.body.isSensor = val; }
        });

        this.boundOnCollisionStart = this.onCollisionStart.bind(this);
        this.boundOnCollisionEnd = this.onCollisionEnd.bind(this);

        // Store initial position for reset
        if (this.gameObject) {
            const pos = this.gameObject.getWorldPosition();
            this.initialPosition = { x: pos.x, y: pos.y };
            this.initialAngle = this.gameObject.angle;
        } else {
            this.initialPosition = null;
            this.initialAngle = null;
        }
    }

    /**
     * Create the physics body when the component starts
     */
    start() {
        if (!window.physicsManager) {
            console.error("Physics manager not found. Make sure it's initialized before using RigidBody.");
            return;
        }

        // Store initial position and angle
        if (this.gameObject) {
            const pos = this.gameObject.getWorldPosition();
            this.initialPosition = { x: pos.x, y: pos.y };
            this.initialAngle = this.gameObject.angle;
        }

        this.onStart();

        // Set up collision handlers
        Matter.Events.on(window.physicsManager.engine, 'collisionStart', this.boundOnCollisionStart);
        Matter.Events.on(window.physicsManager.engine, 'collisionEnd', this.boundOnCollisionEnd);
    }

    /**
     * Create the physics body based on current settings
     */
    createBody() {
        if (!this.gameObject) return;

        this.removeBody();

        if (!window.physicsManager) {
            console.error("PhysicsManager not found or not initialized");
            return null;
        }

        // Use collider data from GameObject
        let body;

        let pos = this.gameObject.getWorldPosition();

        // If position is (0,0) and we have an initialPosition, use that instead
        /*if ((pos.x === 0 && pos.y === 0) && this.initialPosition && (this.initialPosition.x !== 0 || this.initialPosition.y !== 0)) {
            pos = { ...this.initialPosition };
        }*/

        const angle = this.gameObject.angle * (Math.PI / 180);

        // Use collider size from GameObject
        const colliderWidth = this.gameObject.size?.x * this.gameObject.scale.x || this.width;
        const colliderHeight = this.gameObject.size?.y * this.gameObject.scale.y || this.height;
        const colliderRadius = (this.gameObject.size?.x * this.gameObject.scale.x || this.radius) / 2;

        const options = {
            friction: this.friction,
            restitution: this.restitution,
            density: this.density,
            isSensor: this.isSensor,
            isStatic: this.bodyType === "static",
            angle: angle,
            label: this.gameObject.name || "Body",
            collisionFilter: this.collisionFilter
        };

        try {
            switch (this.shape) {
                case "rectangle":
                    body = Matter.Bodies.rectangle(pos.x, pos.y, colliderWidth, colliderHeight, options);
                    break;
                case "circle":
                    body = Matter.Bodies.circle(pos.x, pos.y, colliderRadius, options);
                    break;
                case "polygon":
                    // Use polygon points from GameObject if available
                    let vertices = this.gameObject.polygonPoints?.length ? this.gameObject.polygonPoints.map(pt => ({ x: pt.x, y: pt.y })) : this.vertices;
                    if (vertices && vertices.length >= 3) {
                        body = Matter.Bodies.fromVertices(pos.x, pos.y, vertices, options);
                    } else {
                        // Fallback to triangle
                        body = Matter.Bodies.polygon(pos.x, pos.y, 3, colliderRadius, options);
                    }
                    break;
                default:
                    body = Matter.Bodies.rectangle(pos.x, pos.y, colliderWidth, colliderHeight, options);
            }
        } catch (error) {
            console.error("Error creating physics body:", error);
            return null;
        }

        // Now that we have a valid body, continue with the rest of the method

        // Ensure static bodies are really static
        if (this.bodyType === "static") {
            body.isStatic = true;
            body.inertia = Infinity;
            body.inverseInertia = 0;
            body.inverseMass = 0;
            body.mass = Infinity;
            body.velocity.x = 0;
            body.velocity.y = 0;
            body.angularVelocity = 0;

            Matter.Body.setStatic(body, true);
        }
        else if (this.bodyType === "kinematic") {
            body.isStatic = false;
            body.inertia = Infinity;
            body.inverseInertia = 0;
            body.mass = Infinity;
            body.inverseMass = 0;
        }
        else {
            body.isStatic = false;
        }

        // Apply fixed rotation constraint
        if (this.fixedRotation) {
            body.inertia = Infinity;
            body.inverseInertia = 0;
        }

        // Register with physics manager - ensure this properly adds to the world
        try {
            // Register with physics manager
            if (window.physicsManager && body) {
                window.physicsManager.registerBody(body, this.gameObject);

                const isInWorld = window.physicsManager.engine.world.bodies.includes(body);
                if (!isInWorld) {
                    console.warn(`Body for ${options.label} was not properly added to the physics world`);
                    Matter.World.add(window.physicsManager.engine.world, body);
                }
            }
        } catch (error) {
            console.error("Error registering physics body:", error);
        }

        // Store reference to this module in the body
        if (body) {
            this.body = body;
            this.body.module = this;
        }

        return body;
    }

    /**
     * Called when body should be created during game startup
     */
    onStart() {
        if (this.pendingBodyCreation && !this.body) {
            console.log("Creating pending RigidBody for:", this.gameObject?.name);
            this.createBody();
            this.pendingBodyCreation = false;
        }
    }

    /**
     * Reset the physics body and GameObject to their initial position and angle
     */
    resetPosition() {
        if (this.initialPosition && this.gameObject) {
            this.gameObject.setWorldPosition(this.initialPosition.x, this.initialPosition.y);
            this.gameObject.angle = this.initialAngle || 0;
            if (this.body) {
                Matter.Body.setPosition(this.body, { x: this.initialPosition.x, y: this.initialPosition.y });
                Matter.Body.setAngle(this.body, (this.initialAngle || 0) * (Math.PI / 180));
            }
        }
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
            // Update initial position and angle before rebuilding
            const pos = this.gameObject.getWorldPosition();
            this.initialPosition = { x: pos.x, y: pos.y };
            this.initialAngle = this.gameObject.angle;
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
            const angle = this.gameObject.angle * (Math.PI / 180);
            Matter.Body.setPosition(this.body, { x: pos.x, y: pos.y });
            Matter.Body.setAngle(this.body, angle);
        }
    }

    /**
     * Override onEnable to handle pending body creation
     */
    onEnable() {
        if (this.pendingBodyCreation && !this.body && window.physicsManager) {
            this.createBody();
            this.pendingBodyCreation = false;
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

    toJSON() {
        return {
            ...super.toJSON(),
            bodyType: this.bodyType,
            shape: this.shape,
            width: this.width,
            height: this.height,
            radius: this.radius,
            density: this.density,
            friction: this.friction,
            restitution: this.restitution,
            fixedRotation: this.fixedRotation,
            isSensor: this.isSensor,
            collisionFilter: { ...this.collisionFilter },
            vertices: this.vertices
        };
    }

    /**
     * Override from Module to handle deserialization
     * @param {Object} data - The serialized data
     */
    fromJSON(data) {
        super.fromJSON(data);
        this.bodyType = data.bodyType ?? this.bodyType;
        this.shape = data.shape ?? this.shape;
        this.width = data.width ?? this.width;
        this.height = data.height ?? this.height;
        this.radius = data.radius ?? this.radius;
        this.density = data.density ?? this.density;
        this.friction = data.friction ?? this.friction;
        this.restitution = data.restitution ?? this.restitution;
        this.fixedRotation = data.fixedRotation ?? false;
        this.isSensor = data.isSensor ?? false;
        this.collisionFilter = { ...this.collisionFilter, ...data.collisionFilter };
        this.vertices = data.vertices ?? [];

        // Update initial position and angle after deserialization
        if (this.gameObject) {
            const pos = this.gameObject.getWorldPosition();
            this.initialPosition = { x: pos.x, y: pos.y };
            this.initialAngle = this.gameObject.angle;
            //this.createBody();
        }

        this.pendingBodyCreation = true; // Delay body creation until onEnable or start
    }
}

// Register the module
window.RigidBody = RigidBody;
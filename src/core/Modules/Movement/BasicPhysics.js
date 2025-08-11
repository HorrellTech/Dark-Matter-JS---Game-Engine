/**
 * BasicPhysics - Advanced physics simulation module
 * Implements comprehensive physics including forces, collisions, constraints, and wormholes
 */
class BasicPhysics extends Module {
    static namespace = "Movement";
    static description = "Advanced physics simulation with forces, mass, friction, wormholes, and constraints";
    static allowMultiple = false;
    static iconClass = "fas fa-atom";

    constructor() {
        super("BasicPhysics");

        this.materialType = "default"; // default, bouncy, ice, rubber, metal
        this.materialProperties = {
            default: { friction: 0.4, restitution: 0.6 },
            bouncy: { friction: 0.2, restitution: 1.2 },
            ice: { friction: 0.05, restitution: 0.1 },
            rubber: { friction: 0.8, restitution: 0.9 },
            metal: { friction: 0.6, restitution: 0.3 }
        };

        // Basic physics properties
        this.mass = 1.0;
        this.friction = 0.98;
        this.bounciness = 0.6;
        this.gravityScale = 1.0;
        this.drag = 0.99;
        this.angularDrag = 0.98;

        // Collision properties
        this.isStatic = false;
        this.isTrigger = false;
        this.collisionShape = "circle"; // circle, rectangle, polygon
        this.collisionRadius = 25;
        this.collisionWidth = 50;
        this.collisionHeight = 50;

        // Material properties
        this.density = 1.0;
        this.elasticity = 0.8;
        this.staticFriction = 0.6;
        this.dynamicFriction = 0.4;

        // Force and velocity
        this.velocity = new Vector2(0, 0);
        this.angularVelocity = 0;
        this.forces = [];
        this.impulses = [];

        // Constraints and joints
        this.constraints = [];
        this.enableConstraints = true;

        // Chain properties
        this.isChainLink = false;
        this.chainLength = 100;
        this.chainStiffness = 0.8;
        this.chainDamping = 0.95;
        this.chainSegments = 10;
        this.chainThickness = 4;
        this.chainColor = "#8B4513";
        this.connectedObject = null;
        this.connectionPoint = new Vector2(0, 0);

        // Wormhole properties
        this.isWormhole = false;
        this.wormholeRadius = 100;
        this.wormholePull = 500;
        this.wormholeDestination = null; // GameObject name or Vector2
        this.wormholeActivationRadius = 20;
        this.wormholeVisualRadius = 80;
        this.wormholeRotationSpeed = 90; // degrees per second
        this.wormholeParticles = [];

        // World physics settings
        this.worldGravity = new Vector2(0, 300);
        this.enableGravity = true;
        this.enableCollisions = true;
        this.enableWarmStarting = true;

        // Performance settings
        this.maxVelocity = 1000;
        this.maxAngularVelocity = 360; // degrees per second
        this.sleepThreshold = 0.1;
        this.isSleeping = false;

        // Visual debug properties
        this.showDebugInfo = false;
        this.showVelocityVector = false;
        this.showForceVectors = false;
        this.showCollisionBounds = false;
        this.debugColor = "#FF0000";

        // Internal state
        this.lastPosition = new Vector2(0, 0);
        this.acceleration = new Vector2(0, 0);
        this.totalForce = new Vector2(0, 0);
        this.chainPoints = [];
        this.wormholeAngle = 0;

        this.setupProperties();
    }

    setupProperties() {
        // Basic Physics
        this.exposeProperty("mass", "number", this.mass, {
            min: 0.1, max: 100, step: 0.1,
            description: "Object mass (affects force response)",
            onChange: (val) => { this.mass = val; }
        });

        this.exposeProperty("friction", "number", this.friction, {
            min: 0, max: 1, step: 0.01,
            description: "Velocity friction (0-1)",
            onChange: (val) => { this.friction = val; }
        });

        this.exposeProperty("bounciness", "number", this.bounciness, {
            min: 0, max: 2, step: 0.1,
            description: "Collision bounciness",
            onChange: (val) => { this.bounciness = val; }
        });

        this.exposeProperty("materialType", "enum", this.materialType, {
            options: ["default", "bouncy", "ice", "rubber", "metal"],
            description: "Material type affecting friction and bounce",
            onChange: (val) => {
                this.materialType = val;
                this.updateMaterialProperties();
            }
        });

        this.exposeProperty("gravityScale", "number", this.gravityScale, {
            min: 0, max: 5, step: 0.1,
            description: "Gravity scale multiplier",
            onChange: (val) => { this.gravityScale = val; }
        });

        // Collision Properties
        this.exposeProperty("isStatic", "boolean", this.isStatic, {
            description: "Static objects don't move",
            onChange: (val) => {
                this.isStatic = val;
                if (val) {
                    this.velocity.x = 0;
                    this.velocity.y = 0;
                    this.angularVelocity = 0;
                }
            }
        });

        this.exposeProperty("collisionShape", "enum", this.collisionShape, {
            options: ["circle", "rectangle"],
            description: "Collision detection shape",
            onChange: (val) => { this.collisionShape = val; }
        });

        this.exposeProperty("collisionRadius", "number", this.collisionRadius, {
            min: 5, max: 200, step: 1,
            description: "Collision radius for circles",
            onChange: (val) => { this.collisionRadius = val; }
        });

        // Chain Properties
        this.exposeProperty("isChainLink", "boolean", this.isChainLink, {
            description: "Enable chain physics",
            onChange: (val) => {
                this.isChainLink = val;
                if (val) {
                    this.initializeChain();
                }
            }
        });

        this.exposeProperty("chainLength", "number", this.chainLength, {
            min: 50, max: 500, step: 10,
            description: "Chain length in pixels",
            onChange: (val) => {
                this.chainLength = val;
                if (this.isChainLink) this.initializeChain();
            }
        });

        this.exposeProperty("chainSegments", "number", this.chainSegments, {
            min: 3, max: 50, step: 1,
            description: "Number of chain segments",
            onChange: (val) => {
                this.chainSegments = val;
                if (this.isChainLink) this.initializeChain();
            }
        });

        this.exposeProperty("chainStiffness", "number", this.chainStiffness, {
            min: 0.1, max: 1, step: 0.1,
            description: "Chain constraint stiffness",
            onChange: (val) => { this.chainStiffness = val; }
        });

        this.exposeProperty("chainColor", "color", this.chainColor, {
            description: "Chain visual color",
            onChange: (val) => { this.chainColor = val; }
        });

        // Wormhole Properties
        this.exposeProperty("isWormhole", "boolean", this.isWormhole, {
            description: "Enable wormhole physics",
            onChange: (val) => {
                this.isWormhole = val;
                if (val) {
                    this.initializeWormhole();
                }
            }
        });

        this.exposeProperty("wormholeRadius", "number", this.wormholeRadius, {
            min: 50, max: 300, step: 10,
            description: "Wormhole influence radius",
            onChange: (val) => { this.wormholeRadius = val; }
        });

        this.exposeProperty("wormholePull", "number", this.wormholePull, {
            min: 100, max: 2000, step: 50,
            description: "Wormhole gravitational pull strength",
            onChange: (val) => { this.wormholePull = val; }
        });

        this.exposeProperty("wormholeActivationRadius", "number", this.wormholeActivationRadius, {
            min: 10, max: 100, step: 5,
            description: "Radius for wormhole teleportation",
            onChange: (val) => { this.wormholeActivationRadius = val; }
        });

        // World Physics
        this.exposeProperty("enableGravity", "boolean", this.enableGravity, {
            description: "Apply world gravity",
            onChange: (val) => { this.enableGravity = val; }
        });

        this.exposeProperty("enableCollisions", "boolean", this.enableCollisions, {
            description: "Enable collision detection",
            onChange: (val) => { this.enableCollisions = val; }
        });

        // Debug Properties
        this.exposeProperty("showDebugInfo", "boolean", this.showDebugInfo, {
            description: "Show debug information",
            onChange: (val) => { this.showDebugInfo = val; }
        });

        this.exposeProperty("showVelocityVector", "boolean", this.showVelocityVector, {
            description: "Show velocity vector",
            onChange: (val) => { this.showVelocityVector = val; }
        });

        this.exposeProperty("showCollisionBounds", "boolean", this.showCollisionBounds, {
            description: "Show collision boundaries",
            onChange: (val) => { this.showCollisionBounds = val; }
        });
    }

    start() {
        this.lastPosition.x = this.gameObject.position.x;
        this.lastPosition.y = this.gameObject.position.y;

        if (this.isChainLink) {
            this.initializeChain();
        }

        if (this.isWormhole) {
            this.initializeWormhole();
        }
    }

    loop(deltaTime) {
        if (this.isStatic) return;

        // Update physics
        this.updateForces(deltaTime);
        this.updateWormholeEffects(deltaTime);
        this.updateVelocity(deltaTime);
        this.updatePosition(deltaTime);
        this.updateConstraints(deltaTime);
        this.updateChain(deltaTime);
        this.checkCollisions(deltaTime);
        this.updateSleep();

        // Update wormhole visuals
        if (this.isWormhole) {
            this.wormholeAngle += this.wormholeRotationSpeed * deltaTime;
            this.updateWormholeParticles(deltaTime);
        }
    }

    updateForces(deltaTime) {
        this.totalForce.x = 0;
        this.totalForce.y = 0;

        // Apply gravity
        if (this.enableGravity) {
            this.totalForce.x += this.worldGravity.x * this.mass * this.gravityScale;
            this.totalForce.y += this.worldGravity.y * this.mass * this.gravityScale;
        }

        // Apply accumulated forces
        for (let force of this.forces) {
            this.totalForce.x += force.x;
            this.totalForce.y += force.y;
        }

        // Calculate acceleration (F = ma, so a = F/m)
        this.acceleration.x = this.totalForce.x / this.mass;
        this.acceleration.y = this.totalForce.y / this.mass;

        // Clear forces for next frame
        this.forces = [];
    }

    updateWormholeEffects(deltaTime) {
        if (!this.isWormhole) return;

        // Find all physics objects within range
        const allObjects = window.engine?.scene?.gameObjects || [];

        for (let obj of allObjects) {
            if (obj === this.gameObject) continue;

            const physicsModule = obj.getModule("BasicPhysics");
            if (!physicsModule || physicsModule.isStatic) continue;

            const distance = this.getDistance(this.gameObject.position, obj.position);

            if (distance < this.wormholeRadius && distance > 0) {
                // Calculate gravitational pull
                const pullStrength = this.wormholePull / (distance * distance) * physicsModule.mass;
                const direction = this.getDirection(obj.position, this.gameObject.position);

                physicsModule.addForce(
                    direction.x * pullStrength,
                    direction.y * pullStrength
                );

                // Check for teleportation
                if (distance < this.wormholeActivationRadius && this.wormholeDestination) {
                    this.teleportObject(physicsModule);
                }
            }
        }
    }

    updateVelocity(deltaTime) {
        // Apply impulses
        for (let impulse of this.impulses) {
            this.velocity.x += impulse.x / this.mass;
            this.velocity.y += impulse.y / this.mass;
        }
        this.impulses = [];

        // Apply acceleration
        this.velocity.x += this.acceleration.x * deltaTime;
        this.velocity.y += this.acceleration.y * deltaTime;

        // Apply drag
        this.velocity.x *= this.drag;
        this.velocity.y *= this.drag;

        // Apply angular drag
        this.angularVelocity *= this.angularDrag;

        // Limit velocities
        const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        if (speed > this.maxVelocity) {
            this.velocity.x = (this.velocity.x / speed) * this.maxVelocity;
            this.velocity.y = (this.velocity.y / speed) * this.maxVelocity;
        }

        if (Math.abs(this.angularVelocity) > this.maxAngularVelocity) {
            this.angularVelocity = Math.sign(this.angularVelocity) * this.maxAngularVelocity;
        }
    }

    updatePosition(deltaTime) {
        // Store last position
        this.lastPosition.x = this.gameObject.position.x;
        this.lastPosition.y = this.gameObject.position.y;

        // Update position using more stable integration
        const newX = this.gameObject.position.x + this.velocity.x * deltaTime;
        const newY = this.gameObject.position.y + this.velocity.y * deltaTime;

        this.gameObject.position.x = newX;
        this.gameObject.position.y = newY;

        // Update rotation
        this.gameObject.angle += this.angularVelocity * deltaTime;
    }

    updateConstraints(deltaTime) {
        if (!this.enableConstraints) return;

        for (let constraint of this.constraints) {
            this.solveConstraint(constraint, deltaTime);
        }
    }

    updateChain(deltaTime) {
        if (!this.isChainLink || this.chainPoints.length === 0) return;

        // Update chain physics using Verlet integration
        for (let i = 1; i < this.chainPoints.length - 1; i++) {
            const point = this.chainPoints[i];

            // Calculate velocity
            const velX = (point.x - point.oldX) * this.chainDamping;
            const velY = (point.y - point.oldY) * this.chainDamping;

            // Store old position
            point.oldX = point.x;
            point.oldY = point.y;

            // Apply gravity
            const gravityForce = this.worldGravity.y * deltaTime * deltaTime;

            // Update position
            point.x += velX + 0;
            point.y += velY + gravityForce;
        }

        // Constraint solving for chain links
        for (let iteration = 0; iteration < 3; iteration++) {
            for (let i = 0; i < this.chainPoints.length - 1; i++) {
                this.solveChainConstraint(i, i + 1);
            }
        }

        // Update first point to follow this object
        if (this.chainPoints.length > 0) {
            this.chainPoints[0].x = this.gameObject.position.x;
            this.chainPoints[0].y = this.gameObject.position.y;
        }

        // Update connected object if exists
        if (this.connectedObject && this.chainPoints.length > 0) {
            const lastPoint = this.chainPoints[this.chainPoints.length - 1];
            this.connectedObject.position.x = lastPoint.x;
            this.connectedObject.position.y = lastPoint.y;
        }
    }

    updateMaterialProperties() {
        const props = this.materialProperties[this.materialType];
        if (props) {
            this.dynamicFriction = props.friction;
            this.staticFriction = props.friction * 1.5;
            this.bounciness = props.restitution;
            this.elasticity = props.restitution;
        }
    }

    checkCollisions(deltaTime) {
        if (!this.enableCollisions) return;

        const allObjects = window.engine?.scene?.gameObjects || [];

        // Run collision detection multiple times for stability
        for (let iteration = 0; iteration < 3; iteration++) {
            for (let obj of allObjects) {
                if (obj === this.gameObject) continue;

                const otherPhysics = obj.getModule("BasicPhysics");
                if (!otherPhysics || !otherPhysics.enableCollisions) continue;

                const collision = this.getCollisionInfo(obj, otherPhysics);
                if (collision.isColliding) {
                    this.resolveCollision(obj, otherPhysics, collision, deltaTime);
                }
            }
        }
    }

    getCollisionInfo(otherObject, otherPhysics) {
        if (this.collisionShape === "circle" && otherPhysics.collisionShape === "circle") {
            return this.getCircleCircleCollision(otherObject, otherPhysics);
        } else if (this.collisionShape === "rectangle" && otherPhysics.collisionShape === "rectangle") {
            return this.getRectangleRectangleCollision(otherObject, otherPhysics);
        } else {
            // Mixed shapes - use circle approximation
            return this.getCircleCircleCollision(otherObject, otherPhysics);
        }
    }

    isColliding(otherObject) {
        const otherPhysics = otherObject.getModule("BasicPhysics");
        if (!otherPhysics) return false;

        if (this.collisionShape === "circle" && otherPhysics.collisionShape === "circle") {
            return this.circleCircleCollision(otherObject, otherPhysics);
        } else if (this.collisionShape === "rectangle" && otherPhysics.collisionShape === "rectangle") {
            return this.rectangleRectangleCollision(otherObject, otherPhysics);
        } else {
            // Mixed shapes - use bounding circles as approximation
            return this.circleCircleCollision(otherObject, otherPhysics);
        }
    }

    circleCircleCollision(otherObject, otherPhysics) {
        const distance = this.getDistance(this.gameObject.position, otherObject.position);
        const combinedRadius = this.collisionRadius + otherPhysics.collisionRadius;
        return distance < combinedRadius;
    }

    rectangleRectangleCollision(otherObject, otherPhysics) {
        const bounds1 = this.getCollisionBounds();
        const bounds2 = otherPhysics.getCollisionBounds();

        return bounds1.left < bounds2.right &&
            bounds1.right > bounds2.left &&
            bounds1.top < bounds2.bottom &&
            bounds1.bottom > bounds2.top;
    }

    getCircleCircleCollision(otherObject, otherPhysics) {
        const dx = otherObject.position.x - this.gameObject.position.x;
        const dy = otherObject.position.y - this.gameObject.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const combinedRadius = this.collisionRadius + otherPhysics.collisionRadius;

        const isColliding = distance < combinedRadius && distance > 0;

        if (!isColliding) {
            return { isColliding: false };
        }

        // Calculate collision normal (from this object to other)
        const normal = {
            x: dx / distance,
            y: dy / distance
        };

        // Calculate penetration depth
        const penetration = combinedRadius - distance;

        // Calculate contact point
        const contactPoint = {
            x: this.gameObject.position.x + normal.x * this.collisionRadius,
            y: this.gameObject.position.y + normal.y * this.collisionRadius
        };

        return {
            isColliding: true,
            normal: normal,
            penetration: penetration,
            contactPoint: contactPoint,
            distance: distance
        };
    }

    getRectangleRectangleCollision(otherObject, otherPhysics) {
        const bounds1 = this.getCollisionBounds();
        const bounds2 = otherPhysics.getCollisionBounds();

        const isColliding = bounds1.left < bounds2.right &&
            bounds1.right > bounds2.left &&
            bounds1.top < bounds2.bottom &&
            bounds1.bottom > bounds2.top;

        if (!isColliding) {
            return { isColliding: false };
        }

        // Calculate overlaps
        const overlapX = Math.min(bounds1.right - bounds2.left, bounds2.right - bounds1.left);
        const overlapY = Math.min(bounds1.bottom - bounds2.top, bounds2.bottom - bounds1.top);

        // Determine collision normal based on smallest overlap
        let normal, penetration;
        if (overlapX < overlapY) {
            // Horizontal collision
            normal = {
                x: this.gameObject.position.x < otherObject.position.x ? -1 : 1,
                y: 0
            };
            penetration = overlapX;
        } else {
            // Vertical collision
            normal = {
                x: 0,
                y: this.gameObject.position.y < otherObject.position.y ? -1 : 1
            };
            penetration = overlapY;
        }

        const contactPoint = {
            x: this.gameObject.position.x + normal.x * (this.collisionWidth / 2),
            y: this.gameObject.position.y + normal.y * (this.collisionHeight / 2)
        };

        return {
            isColliding: true,
            normal: normal,
            penetration: penetration,
            contactPoint: contactPoint
        };
    }

    resolveCollision(otherObject, otherPhysics, collision, deltaTime) {
        if (this.isTrigger || otherPhysics.isTrigger) {
            this.onTriggerEnter(otherObject);
            return;
        }

        const { normal, penetration } = collision;

        // Step 1: Immediate position correction (more aggressive)
        this.correctPositions(otherObject, otherPhysics, normal, penetration);

        // Step 2: Velocity resolution
        this.resolveVelocities(otherObject, otherPhysics, normal, deltaTime);

        // Step 3: Prevent interpenetration by adjusting positions again
        this.separateObjects(otherObject, otherPhysics, normal, penetration);
    }

    separateObjects(otherObject, otherPhysics, normal, penetration) {
        if (penetration <= 0) return;

        const totalInverseMass = (this.isStatic ? 0 : 1 / this.mass) +
            (otherPhysics.isStatic ? 0 : 1 / otherPhysics.mass);

        if (totalInverseMass === 0) return;

        // Separate objects completely
        if (!this.isStatic) {
            const separation1 = penetration * (1 / this.mass) / totalInverseMass;
            this.gameObject.position.x -= normal.x * separation1;
            this.gameObject.position.y -= normal.y * separation1;
        }

        if (!otherPhysics.isStatic) {
            const separation2 = penetration * (1 / otherPhysics.mass) / totalInverseMass;
            otherObject.position.x += normal.x * separation2;
            otherObject.position.y += normal.y * separation2;
        }
    }

    correctPositions(otherObject, otherPhysics, normal, penetration) {
        const totalInverseMass = (this.isStatic ? 0 : 1 / this.mass) +
            (otherPhysics.isStatic ? 0 : 1 / otherPhysics.mass);

        if (totalInverseMass === 0) return;

        // More aggressive position correction
        const correctionPercent = 1.0; // Full correction
        const slop = 0.01; // Minimal penetration allowance

        const correctionMagnitude = Math.max(penetration - slop, 0) / totalInverseMass * correctionPercent;

        if (!this.isStatic) {
            const correction1 = correctionMagnitude / this.mass;
            this.gameObject.position.x -= normal.x * correction1;
            this.gameObject.position.y -= normal.y * correction1;
        }

        if (!otherPhysics.isStatic) {
            const correction2 = correctionMagnitude / otherPhysics.mass;
            otherObject.position.x += normal.x * correction2;
            otherObject.position.y += normal.y * correction2;
        }
    }

    resolveVelocities(otherObject, otherPhysics, normal, deltaTime) {
        const relativeVelocity = {
            x: this.velocity.x - otherPhysics.velocity.x,
            y: this.velocity.y - otherPhysics.velocity.y
        };

        const velocityAlongNormal = relativeVelocity.x * normal.x + relativeVelocity.y * normal.y;

        if (velocityAlongNormal > 0) return;

        // Calculate combined material properties
        const combinedRestitution = Math.sqrt(this.bounciness * otherPhysics.bounciness);

        const totalInverseMass = (this.isStatic ? 0 : 1 / this.mass) +
            (otherPhysics.isStatic ? 0 : 1 / otherPhysics.mass);

        if (totalInverseMass === 0) return;

        const impulseScalar = -(1 + combinedRestitution) * velocityAlongNormal / totalInverseMass;

        const impulse = {
            x: impulseScalar * normal.x,
            y: impulseScalar * normal.y
        };

        if (!this.isStatic) {
            this.velocity.x += impulse.x / this.mass;
            this.velocity.y += impulse.y / this.mass;
        }

        if (!otherPhysics.isStatic) {
            otherPhysics.velocity.x -= impulse.x / otherPhysics.mass;
            otherPhysics.velocity.y -= impulse.y / otherPhysics.mass;
        }

        // Apply friction with combined materials
        this.applyFrictionForce(otherPhysics, normal, relativeVelocity, Math.abs(impulseScalar));
    }

    applyFrictionForce(otherPhysics, normal, relativeVelocity, normalImpulse) {
        // Calculate tangent vector (perpendicular to normal)
        const tangent = {
            x: relativeVelocity.x - (relativeVelocity.x * normal.x + relativeVelocity.y * normal.y) * normal.x,
            y: relativeVelocity.y - (relativeVelocity.x * normal.x + relativeVelocity.y * normal.y) * normal.y
        };

        const tangentLength = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y);
        if (tangentLength < 0.001) return; // No tangential velocity

        // Normalize tangent
        tangent.x /= tangentLength;
        tangent.y /= tangentLength;

        // Calculate tangential impulse
        const totalInverseMass = (this.isStatic ? 0 : 1 / this.mass) +
            (otherPhysics.isStatic ? 0 : 1 / otherPhysics.mass);

        const tangentialVelocity = relativeVelocity.x * tangent.x + relativeVelocity.y * tangent.y;
        let tangentImpulse = -tangentialVelocity / totalInverseMass;

        // Apply Coulomb friction
        const staticFriction = Math.sqrt(this.staticFriction * otherPhysics.staticFriction);
        const dynamicFriction = Math.sqrt(this.dynamicFriction * otherPhysics.dynamicFriction);

        if (Math.abs(tangentImpulse) < Math.abs(normalImpulse) * staticFriction) {
            // Static friction
            // Keep the tangent impulse as calculated
        } else {
            // Kinetic friction
            tangentImpulse = -Math.sign(tangentImpulse) * Math.abs(normalImpulse) * dynamicFriction;
        }

        // Apply friction impulse
        const frictionImpulse = {
            x: tangentImpulse * tangent.x,
            y: tangentImpulse * tangent.y
        };

        if (!this.isStatic) {
            this.velocity.x += frictionImpulse.x / this.mass;
            this.velocity.y += frictionImpulse.y / this.mass;
        }

        if (!otherPhysics.isStatic) {
            otherPhysics.velocity.x -= frictionImpulse.x / otherPhysics.mass;
            otherPhysics.velocity.y -= frictionImpulse.y / otherPhysics.mass;
        }
    }

    applyFriction(otherPhysics, normal, relativeVelocity) {
        // Calculate tangent vector
        const tangent = {
            x: relativeVelocity.x - (relativeVelocity.x * normal.x + relativeVelocity.y * normal.y) * normal.x,
            y: relativeVelocity.y - (relativeVelocity.x * normal.x + relativeVelocity.y * normal.y) * normal.y
        };

        const tangentLength = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y);
        if (tangentLength < 0.001) return;

        tangent.x /= tangentLength;
        tangent.y /= tangentLength;

        // Calculate friction impulse
        const frictionCoeff = Math.sqrt(this.dynamicFriction * otherPhysics.dynamicFriction);
        const frictionImpulse = -(relativeVelocity.x * tangent.x + relativeVelocity.y * tangent.y) / (this.mass + otherPhysics.mass);
        const maxFriction = Math.abs(frictionImpulse) * frictionCoeff;

        // Apply friction
        const frictionX = Math.sign(frictionImpulse) * Math.min(Math.abs(frictionImpulse), maxFriction) * tangent.x;
        const frictionY = Math.sign(frictionImpulse) * Math.min(Math.abs(frictionImpulse), maxFriction) * tangent.y;

        if (!this.isStatic) {
            this.velocity.x += frictionX * otherPhysics.mass;
            this.velocity.y += frictionY * otherPhysics.mass;
        }

        if (!otherPhysics.isStatic) {
            otherPhysics.velocity.x -= frictionX * this.mass;
            otherPhysics.velocity.y -= frictionY * this.mass;
        }
    }

    updateSleep() {
        const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);

        if (speed < this.sleepThreshold && Math.abs(this.angularVelocity) < this.sleepThreshold) {
            this.isSleeping = true;
            this.velocity.x = 0;
            this.velocity.y = 0;
            this.angularVelocity = 0;
        } else {
            this.isSleeping = false;
        }
    }

    // Chain methods
    initializeChain() {
        this.chainPoints = [];
        const segmentLength = this.chainLength / this.chainSegments;

        for (let i = 0; i < this.chainSegments + 1; i++) {
            this.chainPoints.push({
                x: this.gameObject.position.x,
                y: this.gameObject.position.y + i * segmentLength,
                oldX: this.gameObject.position.x,
                oldY: this.gameObject.position.y + i * segmentLength
            });
        }
    }

    solveChainConstraint(index1, index2) {
        const point1 = this.chainPoints[index1];
        const point2 = this.chainPoints[index2];
        const segmentLength = this.chainLength / this.chainSegments;

        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return;

        const difference = segmentLength - distance;
        const percent = difference / distance / 2;
        const offsetX = dx * percent * this.chainStiffness;
        const offsetY = dy * percent * this.chainStiffness;

        // Don't move the first point (it's attached to this object)
        if (index1 !== 0) {
            point1.x -= offsetX;
            point1.y -= offsetY;
        }

        // Don't move the last point if it's connected to another object
        if (index2 !== this.chainPoints.length - 1 || !this.connectedObject) {
            point2.x += offsetX;
            point2.y += offsetY;
        }
    }

    // Wormhole methods
    initializeWormhole() {
        this.wormholeParticles = [];

        // Create swirling particles
        for (let i = 0; i < 20; i++) {
            this.wormholeParticles.push({
                angle: (i / 20) * Math.PI * 2,
                radius: Math.random() * this.wormholeVisualRadius,
                speed: 0.5 + Math.random() * 2,
                life: Math.random()
            });
        }
    }

    updateWormholeParticles(deltaTime) {
        for (let particle of this.wormholeParticles) {
            particle.angle += particle.speed * deltaTime;
            particle.radius -= 20 * deltaTime;

            if (particle.radius <= 0) {
                particle.radius = this.wormholeVisualRadius;
                particle.angle = Math.random() * Math.PI * 2;
            }
        }
    }

    teleportObject(physicsModule) {
        if (!this.wormholeDestination) return;

        let destX, destY;

        if (typeof this.wormholeDestination === 'string') {
            // Find destination object by name
            const destObj = window.engine?.scene?.gameObjects?.find(obj => obj.name === this.wormholeDestination);
            if (!destObj) return;

            destX = destObj.position.x;
            destY = destObj.position.y;
        } else if (this.wormholeDestination.x !== undefined) {
            // Direct position
            destX = this.wormholeDestination.x;
            destY = this.wormholeDestination.y;
        } else {
            return;
        }

        // Teleport the object
        physicsModule.gameObject.position.x = destX;
        physicsModule.gameObject.position.y = destY;

        // Reduce velocity after teleportation
        physicsModule.velocity.x *= 0.5;
        physicsModule.velocity.y *= 0.5;
    }

    // Utility methods
    getDistance(pos1, pos2) {
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getDirection(from, to) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length === 0) return { x: 0, y: 0 };

        return { x: dx / length, y: dy / length };
    }

    getCollisionBounds() {
        // Account for rotation if needed - for now, axis-aligned bounds
        const halfWidth = this.collisionWidth / 2;
        const halfHeight = this.collisionHeight / 2;

        return {
            left: this.gameObject.position.x - halfWidth,
            right: this.gameObject.position.x + halfWidth,
            top: this.gameObject.position.y - halfHeight,
            bottom: this.gameObject.position.y + halfHeight
        };
    }

    getCollisionNormal(otherObject, otherPhysics) {
        const dx = otherObject.position.x - this.gameObject.position.x;
        const dy = otherObject.position.y - this.gameObject.position.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length === 0) return { x: 1, y: 0 };

        return { x: dx / length, y: dy / length };
    }

    getCollisionPenetration(otherObject, otherPhysics) {
        if (this.collisionShape === "circle" && otherPhysics.collisionShape === "circle") {
            const distance = this.getDistance(this.gameObject.position, otherObject.position);
            const combinedRadius = this.collisionRadius + otherPhysics.collisionRadius;
            return Math.max(0, combinedRadius - distance);
        }
        return 10; // Default penetration for other shapes
    }

    // Public API methods
    addForce(x, y) {
        this.forces.push({ x, y });
        this.isSleeping = false;
    }

    addImpulse(x, y) {
        this.impulses.push({ x, y });
        this.isSleeping = false;
    }

    setVelocity(x, y) {
        this.velocity.x = x;
        this.velocity.y = y;
        this.isSleeping = false;
    }

    getVelocity() {
        return { x: this.velocity.x, y: this.velocity.y };
    }

    addConstraint(type, targetObject, options = {}) {
        this.constraints.push({
            type,
            targetObject,
            ...options
        });
    }

    solveConstraint(constraint, deltaTime) {
        switch (constraint.type) {
            case "distance":
                this.solveDistanceConstraint(constraint);
                break;
            case "spring":
                this.solveSpringConstraint(constraint, deltaTime);
                break;
        }
    }

    solveDistanceConstraint(constraint) {
        const target = constraint.targetObject;
        const distance = constraint.distance || 100;

        const dx = target.position.x - this.gameObject.position.x;
        const dy = target.position.y - this.gameObject.position.y;
        const currentDistance = Math.sqrt(dx * dx + dy * dy);

        if (currentDistance === 0) return;

        const difference = distance - currentDistance;
        const percent = difference / currentDistance / 2;
        const offsetX = dx * percent;
        const offsetY = dy * percent;

        this.gameObject.position.x -= offsetX;
        this.gameObject.position.y -= offsetY;
        target.position.x += offsetX;
        target.position.y += offsetY;
    }

    solveSpringConstraint(constraint, deltaTime) {
        const target = constraint.targetObject;
        const restLength = constraint.restLength || 100;
        const stiffness = constraint.stiffness || 0.1;
        const damping = constraint.damping || 0.9;

        const dx = target.position.x - this.gameObject.position.x;
        const dy = target.position.y - this.gameObject.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return;

        const force = (distance - restLength) * stiffness;
        const forceX = (dx / distance) * force;
        const forceY = (dy / distance) * force;

        this.addForce(forceX, forceY);

        const targetPhysics = target.getModule("BasicPhysics");
        if (targetPhysics) {
            targetPhysics.addForce(-forceX, -forceY);
        }
    }

    onTriggerEnter(otherObject) {
        // Override this method to handle trigger events
        console.log(`Trigger entered: ${this.gameObject.name} - ${otherObject.name}`);
    }

    connectChainTo(targetObject) {
        this.connectedObject = targetObject;
    }

    draw(ctx) {
        // Draw chain
        if (this.isChainLink && this.chainPoints.length > 1) {
            this.drawChain(ctx);
        }

        // Draw wormhole
        if (this.isWormhole) {
            this.drawWormhole(ctx);
        }

        // Draw debug info
        if (this.showDebugInfo) {
            this.drawDebugInfo(ctx);
        }
    }

    drawChain(ctx) {
        ctx.save();
        ctx.strokeStyle = this.chainColor;
        ctx.lineWidth = this.chainThickness;
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.moveTo(this.chainPoints[0].x, this.chainPoints[0].y);

        for (let i = 1; i < this.chainPoints.length; i++) {
            ctx.lineTo(this.chainPoints[i].x, this.chainPoints[i].y);
        }

        ctx.stroke();

        // Draw chain links
        ctx.fillStyle = this.chainColor;
        for (let point of this.chainPoints) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, this.chainThickness / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    drawWormhole(ctx) {
        ctx.save();
        ctx.translate(this.gameObject.position.x, this.gameObject.position.y);

        // Draw swirling effect
        ctx.rotate(this.wormholeAngle * Math.PI / 180);

        // Draw influence radius
        ctx.strokeStyle = "rgba(138, 43, 226, 0.3)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.wormholeRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw event horizon
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.beginPath();
        ctx.arc(0, 0, this.wormholeActivationRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw particles
        ctx.fillStyle = "rgba(138, 43, 226, 0.8)";
        for (let particle of this.wormholeParticles) {
            const x = Math.cos(particle.angle) * particle.radius;
            const y = Math.sin(particle.angle) * particle.radius;

            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    drawDebugInfo(ctx) {
        ctx.save();

        // Draw collision bounds
        if (this.showCollisionBounds) {
            ctx.strokeStyle = this.debugColor;
            ctx.lineWidth = 1;

            if (this.collisionShape === "circle") {
                ctx.beginPath();
                ctx.arc(this.gameObject.position.x, this.gameObject.position.y, this.collisionRadius, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                const bounds = this.getCollisionBounds();
                ctx.strokeRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
            }
        }

        // Draw velocity vector
        if (this.showVelocityVector) {
            ctx.strokeStyle = "#00FF00";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.gameObject.position.x, this.gameObject.position.y);
            ctx.lineTo(
                this.gameObject.position.x + this.velocity.x * 0.1,
                this.gameObject.position.y + this.velocity.y * 0.1
            );
            ctx.stroke();
        }

        // Draw force vectors
        if (this.showForceVectors) {
            ctx.strokeStyle = "#FF0000";
            ctx.lineWidth = 2;
            for (let force of this.forces) {
                ctx.beginPath();
                ctx.moveTo(this.gameObject.position.x, this.gameObject.position.y);
                ctx.lineTo(
                    this.gameObject.position.x + force.x * 0.01,
                    this.gameObject.position.y + force.y * 0.01
                );
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    toJSON() {
        const json = super.toJSON();

        // Basic physics
        json.mass = this.mass;
        json.friction = this.friction;
        json.bounciness = this.bounciness;
        json.gravityScale = this.gravityScale;
        json.drag = this.drag;
        json.angularDrag = this.angularDrag;

        // Collision
        json.isStatic = this.isStatic;
        json.isTrigger = this.isTrigger;
        json.collisionShape = this.collisionShape;
        json.collisionRadius = this.collisionRadius;
        json.collisionWidth = this.collisionWidth;
        json.collisionHeight = this.collisionHeight;

        // Chain
        json.isChainLink = this.isChainLink;
        json.chainLength = this.chainLength;
        json.chainSegments = this.chainSegments;
        json.chainStiffness = this.chainStiffness;
        json.chainColor = this.chainColor;

        // Wormhole
        json.isWormhole = this.isWormhole;
        json.wormholeRadius = this.wormholeRadius;
        json.wormholePull = this.wormholePull;
        json.wormholeActivationRadius = this.wormholeActivationRadius;

        // Settings
        json.enableGravity = this.enableGravity;
        json.enableCollisions = this.enableCollisions;
        json.showDebugInfo = this.showDebugInfo;

        return json;
    }

    fromJSON(json) {
        super.fromJSON(json);

        // Basic physics
        if (json.mass !== undefined) this.mass = json.mass;
        if (json.friction !== undefined) this.friction = json.friction;
        if (json.bounciness !== undefined) this.bounciness = json.bounciness;
        if (json.gravityScale !== undefined) this.gravityScale = json.gravityScale;
        if (json.drag !== undefined) this.drag = json.drag;
        if (json.angularDrag !== undefined) this.angularDrag = json.angularDrag;

        // Collision
        if (json.isStatic !== undefined) this.isStatic = json.isStatic;
        if (json.isTrigger !== undefined) this.isTrigger = json.isTrigger;
        if (json.collisionShape !== undefined) this.collisionShape = json.collisionShape;
        if (json.collisionRadius !== undefined) this.collisionRadius = json.collisionRadius;
        if (json.collisionWidth !== undefined) this.collisionWidth = json.collisionWidth;
        if (json.collisionHeight !== undefined) this.collisionHeight = json.collisionHeight;

        // Chain
        if (json.isChainLink !== undefined) this.isChainLink = json.isChainLink;
        if (json.chainLength !== undefined) this.chainLength = json.chainLength;
        if (json.chainSegments !== undefined) this.chainSegments = json.chainSegments;
        if (json.chainStiffness !== undefined) this.chainStiffness = json.chainStiffness;
        if (json.chainColor !== undefined) this.chainColor = json.chainColor;

        // Wormhole
        if (json.isWormhole !== undefined) this.isWormhole = json.isWormhole;
        if (json.wormholeRadius !== undefined) this.wormholeRadius = json.wormholeRadius;
        if (json.wormholePull !== undefined) this.wormholePull = json.wormholePull;
        if (json.wormholeActivationRadius !== undefined) this.wormholeActivationRadius = json.wormholeActivationRadius;

        // Settings
        if (json.enableGravity !== undefined) this.enableGravity = json.enableGravity;
        if (json.enableCollisions !== undefined) this.enableCollisions = json.enableCollisions;
        if (json.showDebugInfo !== undefined) this.showDebugInfo = json.showDebugInfo;

        // Reinitialize systems if needed
        if (this.isChainLink) {
            setTimeout(() => this.initializeChain(), 100);
        }
        if (this.isWormhole) {
            setTimeout(() => this.initializeWormhole(), 100);
        }
    }
}

window.BasicPhysics = BasicPhysics;
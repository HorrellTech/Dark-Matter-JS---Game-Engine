/**
 * Joint - Physics component that creates constraints/joints between GameObjects
 */
class Joint extends Module {
    static allowMultiple = true; // Allow multiple joints per GameObject
    static namespace = "Matter.js";
    static description = "Physics component that creates constraints/joints between GameObjects";

    constructor() {
        super("Joint");

        this.ignoreGameObjectTransform = true; // Joints are defined in local space

        // Constraint reference
        this.constraint = null;

        // Joint properties
        this.jointType = "distance";        // "distance", "spring", "revolute", "prismatic", "weld", "mouse"
        this.targetObjectName = "";         // Name of the GameObject to connect to
        this.targetObject = null;           // Reference to the target GameObject

        // Connection points (relative to each object's center)
        this.pointA = { x: 0, y: 0 };      // Connection point on this object
        this.pointB = { x: 0, y: 0 };      // Connection point on target object

        // Joint parameters
        this.length = 100;                  // Rest length for distance/spring joints
        this.stiffness = 0.8;              // Spring stiffness (0-1)
        this.damping = 0.1;                // Spring damping (0-1)
        this.strength = 1.0;               // Overall constraint strength

        // Limits and constraints
        this.enableLimits = false;         // Enable angle/distance limits
        this.minLength = 50;               // Minimum distance/angle
        this.maxLength = 200;              // Maximum distance/angle

        // Revolute joint specific
        this.enableMotor = false;          // Enable motor for revolute joints
        this.motorSpeed = 0;               // Motor speed (degrees/second)
        this.maxMotorTorque = 1000;        // Maximum motor torque

        // Prismatic joint specific
        this.axis = { x: 1, y: 0 };        // Movement axis for prismatic joints

        // Visual debug options
        this.showDebug = false;
        this.debugColor = "#ff0000";
        this.lineAlpha = 1.0;         // New: Line transparency (0-1)
        this.lineThickness = 2;       // New: Line thickness
        this.springCoils = 8;

        // Connection state
        this.isConnected = false;
        this.autoConnect = true;           // Automatically find and connect to target

        this._skipRebuild = true;          // Internal flag to skip rebuilds during bulk updates

        // Expose properties to the inspector
        this.exposeProperty("jointType", "enum", this.jointType, {
            options: ["distance", "spring", "revolute", "prismatic", "weld", "mouse"],
            onChange: (val) => {
                this.jointType = val;
                if (!this._skipRebuild) this.rebuildConstraint();
            }
        });

        this.exposeProperty("targetObjectName", "string", this.targetObjectName, {
            onChange: (val) => {
                this.targetObjectName = val;
                if (!this._skipRebuild) this.findAndConnectTarget();
            }
        });

        this.exposeProperty("pointA", "vector2", this.pointA, {
            onChange: (val) => {
                this.pointA = val;
                if (!this._skipRebuild) this.updateConstraintPoints();
            }
        });

        this.exposeProperty("pointB", "vector2", this.pointB, {
            onChange: (val) => {
                this.pointB = val;
                if (!this._skipRebuild) this.updateConstraintPoints();
            }
        });

        this.exposeProperty("length", "number", this.length, {
            min: 0,
            onChange: (val) => {
                this.length = val;
                if (this.constraint) this.constraint.length = val;
            }
        });

        this.exposeProperty("stiffness", "number", this.stiffness, {
            min: 0,
            max: 1,
            step: 0.01,
            onChange: (val) => {
                this.stiffness = val;
                if (this.constraint) this.constraint.stiffness = val;
            }
        });

        this.exposeProperty("damping", "number", this.damping, {
            min: 0,
            max: 1,
            step: 0.01,
            onChange: (val) => {
                this.damping = val;
                if (this.constraint) this.constraint.damping = val;
            }
        });

        this.exposeProperty("strength", "number", this.strength, {
            min: 0,
            max: 1,
            step: 0.01,
            onChange: (val) => {
                this.strength = val;
                if (this.constraint) {
                    this.constraint.stiffness = val;
                }
            }
        });

        this.exposeProperty("enableLimits", "boolean", this.enableLimits, {
            onChange: (val) => {
                this.enableLimits = val;
                if (!this._skipRebuild) this.rebuildConstraint();
            }
        });

        this.exposeProperty("minLength", "number", this.minLength, {
            min: 0,
            onChange: (val) => { this.minLength = val; }
        });

        this.exposeProperty("maxLength", "number", this.maxLength, {
            min: 0,
            onChange: (val) => { this.maxLength = val; }
        });

        this.exposeProperty("enableMotor", "boolean", this.enableMotor, {
            onChange: (val) => {
                this.enableMotor = val;
                if (!this._skipRebuild) this.rebuildConstraint();
            }
        });

        this.exposeProperty("motorSpeed", "number", this.motorSpeed, {
            min: -360,
            max: 360,
            onChange: (val) => { this.motorSpeed = val; }
        });

        this.exposeProperty("showDebug", "boolean", this.showDebug, {
            onChange: (val) => { this.showDebug = val; }
        });
        this.exposeProperty("debugColor", "string", this.debugColor, {
            onChange: (val) => { this.debugColor = val; }
        });
        this.exposeProperty("lineAlpha", "number", this.lineAlpha, {
            min: 0,
            max: 1,
            step: 0.01,
            onChange: (val) => { this.lineAlpha = val; }
        });
        this.exposeProperty("lineThickness", "number", this.lineThickness, {
            min: 1,
            max: 10,
            step: 1,
            onChange: (val) => { this.lineThickness = val; }
        });
        this.exposeProperty("springCoils", "number", this.springCoils, {
            min: 2,
            max: 32,
            step: 1,
            onChange: (val) => { this.springCoils = val; }
        });
        this.exposeProperty("autoConnect", "boolean", this.autoConnect);
    }

    /**
     * Initialize the joint when the component starts
     */
    start() {
        if (!window.physicsManager) {
            console.error("Physics manager not found. Make sure it's initialized before using Joint.");
            return;
        }

        if (this.autoConnect) {
            this.findAndConnectTarget();
        }
    }

    loop() {
        this.update();

        if (!this.constraint) {
            this.createConstraint();
        }

        //if (this.autoConnect) {
            this.findAndConnectTarget();
        //}
    }

    /**
     * Find the target object by name and create the constraint
     */
    findAndConnectTarget() {
        if (!this.targetObjectName || !this.gameObject) return;
        if(this.targetObject && this.targetObject.name === this.targetObjectName) return;

        // Find target object in the scene
        this.targetObject = this.findGameObjectByName(this.targetObjectName);

        if (this.targetObject) {
            this.createConstraint();
        } else {
            console.warn(`Joint: Target object "${this.targetObjectName}" not found`);
        }
    }

    /**
     * Find a GameObject by name in the scene
     */
    findGameObjectByName(name) {
        if (window.engine) {
            return window.engine.gameObjects.find(obj => obj.name === name);
        }
        return null;
    }

    /**
     * Create the physics constraint based on current settings
     */
    createConstraint() {
        if (!this.gameObject || !this.targetObject) return;

        this.removeConstraint();

        if (!window.physicsManager) {
            console.error("PhysicsManager not found or not initialized");
            return;
        }

        // Get RigidBody components
        const bodyA = this.gameObject.getModule("RigidBody");
        const bodyB = this.targetObject.getModule("RigidBody");

        if (!bodyA || !bodyA.body) {
            console.error("Joint: Source object must have a RigidBody component");
            return;
        }

        if (!bodyB || !bodyB.body) {
            console.error("Joint: Target object must have a RigidBody component");
            return;
        }

        const options = {
            bodyA: bodyA.body,
            bodyB: bodyB.body,
            pointA: { x: this.pointA.x, y: this.pointA.y },
            pointB: { x: this.pointB.x, y: this.pointB.y },
            length: this.length,
            stiffness: this.stiffness,
            damping: this.damping,
            label: `${this.gameObject.name}_to_${this.targetObject.name}`
        };

        try {
            switch (this.jointType) {
                case "distance":
                    this.constraint = Matter.Constraint.create({
                        ...options,
                        stiffness: this.strength
                    });
                    break;

                case "spring":
                    this.constraint = Matter.Constraint.create({
                        ...options,
                        stiffness: 0.01, // Lower stiffness for Matter.js constraint
                        damping: 0.01    // Lower damping for Matter.js constraint
                    });
                    break;

                case "revolute":
                    // Revolute joint - pin joint allowing rotation
                    this.constraint = Matter.Constraint.create({
                        ...options,
                        length: 0,
                        stiffness: 1
                    });

                    // Add motor if enabled
                    if (this.enableMotor) {
                        this.constraint.angularStiffness = 0.1;
                        this.constraint.targetAngle = 0;
                    }
                    break;

                case "prismatic":
                    // Prismatic joint - sliding joint along an axis
                    this.constraint = Matter.Constraint.create({
                        ...options,
                        stiffness: this.strength,
                        // Note: True prismatic joints are complex in Matter.js
                        // This creates a constraint that allows movement along the specified axis
                    });
                    break;

                case "weld":
                    // Weld joint - rigid connection
                    this.constraint = Matter.Constraint.create({
                        ...options,
                        length: 0,
                        stiffness: 1,
                        damping: 0
                    });
                    break;

                case "mouse":
                    // Mouse constraint - for dragging
                    this.constraint = Matter.Constraint.create({
                        ...options,
                        stiffness: 0.2,
                        damping: 0
                    });
                    break;

                default:
                    this.constraint = Matter.Constraint.create(options);
            }

            if (this.constraint) {
                // Add to physics world
                Matter.World.add(window.physicsManager.engine.world, this.constraint);
                this.isConnected = true;

                // Store reference
                this.constraint.module = this;

                console.log(`Joint created: ${this.jointType} between ${this.gameObject.name} and ${this.targetObject.name}`);
            }

        } catch (error) {
            console.error("Error creating joint constraint:", error);
        }
    }

    /**
     * Remove the constraint from the physics world
     */
    removeConstraint() {
        if (this.constraint && window.physicsManager) {
            Matter.World.remove(window.physicsManager.engine.world, this.constraint);
            this.constraint = null;
            this.isConnected = false;
        }
    }

    /**
     * Rebuild the constraint when properties change
     */
    rebuildConstraint() {
        if (this.isConnected) {
            this.createConstraint();
        }
    }

    /**
     * Update constraint attachment points
     */
    updateConstraintPoints() {
        if (this.constraint) {
            this.constraint.pointA = { x: this.pointA.x, y: this.pointA.y };
            this.constraint.pointB = { x: this.pointB.x, y: this.pointB.y };
        }
    }

    /**
     * Connect to a specific GameObject
     */
    connectTo(targetGameObject, pointA = null, pointB = null) {
        this.targetObject = targetGameObject;
        this.targetObjectName = targetGameObject.name;

        if (pointA) this.pointA = pointA;
        if (pointB) this.pointB = pointB;

        this.createConstraint();
    }

    /**
     * Disconnect the joint
     */
    disconnect() {
        this.removeConstraint();
        this.targetObject = null;
    }

    /**
     * Set motor speed for revolute joints
     */
    setMotorSpeed(speed) {
        this.motorSpeed = speed;
        if (this.constraint && this.jointType === "revolute" && this.enableMotor) {
            // Apply motor torque based on speed
            const targetAngularVelocity = speed * (Math.PI / 180); // Convert to radians
            const currentAngularVelocity = this.constraint.bodyA.angularVelocity - this.constraint.bodyB.angularVelocity;
            const torque = (targetAngularVelocity - currentAngularVelocity) * this.maxMotorTorque;

            // Apply torque to bodies
            Matter.Body.setAngularVelocity(this.constraint.bodyA,
                this.constraint.bodyA.angularVelocity + torque / this.constraint.bodyA.inertia);
            Matter.Body.setAngularVelocity(this.constraint.bodyB,
                this.constraint.bodyB.angularVelocity - torque / this.constraint.bodyB.inertia);
        }
    }

    /**
     * Get the current distance between connected bodies
     */
    getCurrentDistance() {
        if (this.constraint && this.constraint.bodyA && this.constraint.bodyB) {
            const posA = this.constraint.bodyA.position;
            const posB = this.constraint.bodyB.position;
            const dx = posB.x - posA.x;
            const dy = posB.y - posA.y;
            return Math.sqrt(dx * dx + dy * dy);
        }
        return 0;
    }

    /**
     * Get the current angle between connected bodies (for revolute joints)
     */
    getCurrentAngle() {
        if (this.constraint && this.constraint.bodyA && this.constraint.bodyB) {
            return (this.constraint.bodyB.angle - this.constraint.bodyA.angle) * (180 / Math.PI);
        }
        return 0;
    }

    /**
     * Update motor for revolute joints
     */
    update() {
        if (this.constraint && this.jointType === "revolute" && this.enableMotor && this.motorSpeed !== 0) {
            this.setMotorSpeed(this.motorSpeed);
        }

        // Add spring force for "spring" joint
        if (this.constraint && this.jointType === "spring") {
            const bodyA = this.constraint.bodyA;
            const bodyB = this.constraint.bodyB;
            if (bodyA && bodyB) {
                // Get world positions of attachment points
                const pointA = Matter.Vector.add(bodyA.position,
                    Matter.Vector.rotate(this.constraint.pointA, bodyA.angle));
                const pointB = Matter.Vector.add(bodyB.position,
                    Matter.Vector.rotate(this.constraint.pointB, bodyB.angle));

                const delta = Matter.Vector.sub(pointB, pointA);
                const dist = Matter.Vector.magnitude(delta);

                if (dist > 0) {
                    const dir = Matter.Vector.normalise(delta);

                    // Spring force: F = -k * (x - x0) - d * v
                    const stretch = dist - this.length;
                    const relVel = Matter.Vector.sub(bodyB.velocity, bodyA.velocity);
                    const relVelAlongDir = Matter.Vector.dot(relVel, dir);

                    const springForce = -this.stiffness * stretch * 0.001; // Scale down
                    const dampingForce = -this.damping * relVelAlongDir * 0.01; // Scale down
                    const totalForce = springForce + dampingForce;

                    const force = Matter.Vector.mult(dir, totalForce);

                    Matter.Body.applyForce(bodyA, pointA, force);
                    Matter.Body.applyForce(bodyB, pointB, Matter.Vector.neg(force));
                }
            }
        }
    }

    /**
     * Render debug visualization
     */
    draw(ctx) {
    if (!this.showDebug || !this.constraint) return;

    // Get world positions for both ends of the joint
    const worldPosA = this.gameObject?.getWorldPosition() ?? { x: 0, y: 0 };
    const worldPosB = this.targetObject?.getWorldPosition() ?? { x: 0, y: 0 };

    // Add local offsets
    const pointA = {
        x: worldPosA.x + this.pointA.x,
        y: worldPosA.y + this.pointA.y
    };
    const pointB = {
        x: worldPosB.x + this.pointB.x,
        y: worldPosB.y + this.pointB.y
    };

    ctx.save();
    ctx.strokeStyle = this.debugColor;
    ctx.globalAlpha = this.lineAlpha;
    ctx.lineWidth = this.lineThickness;

    if (this.jointType === "spring") {
        // Draw a spring
        const coils = this.springCoils;
        const dx = pointB.x - pointA.x;
        const dy = pointB.y - pointA.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // Spring parameters
        const coilSpacing = length / coils;
        const amplitude = Math.min(10, coilSpacing / 2);

        ctx.beginPath();
        for (let i = 0; i <= coils; i++) {
            const t = i / coils;
            const x = pointA.x + t * dx;
            const y = pointA.y + t * dy;
            // Offset perpendicular to the spring direction
            const offset = (i % 2 === 0 ? 1 : -1) * amplitude;
            const perpAngle = angle + Math.PI / 2;
            const ox = Math.cos(perpAngle) * offset;
            const oy = Math.sin(perpAngle) * offset;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x + ox, y + oy);
            }
        }
        ctx.lineTo(pointB.x, pointB.y);
        ctx.stroke();
    } else {
        // Draw a straight line for normal joints
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(pointA.x, pointA.y);
        ctx.lineTo(pointB.x, pointB.y);
        ctx.stroke();
    }

    // Draw connection points
    ctx.setLineDash([]);
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = this.debugColor;
    ctx.beginPath();
    ctx.arc(pointA.x, pointA.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pointB.x, pointB.y, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

    /**
     * Called when the module is destroyed
     */
    onDestroy() {
        this.removeConstraint();
    }

    /**
     * Serialize the joint data
     */
    toJSON() {
        return {
            ...super.toJSON(),
            jointType: this.jointType,
            targetObjectName: this.targetObjectName,
            pointA: { ...this.pointA },
            pointB: { ...this.pointB },
            length: this.length,
            stiffness: this.stiffness,
            damping: this.damping,
            strength: this.strength,
            enableLimits: this.enableLimits,
            minLength: this.minLength,
            maxLength: this.maxLength,
            enableMotor: this.enableMotor,
            motorSpeed: this.motorSpeed,
            maxMotorTorque: this.maxMotorTorque,
            axis: { ...this.axis },
            showDebug: this.showDebug,
            debugColor: this.debugColor,
            debugColor: this.debugColor,
            lineAlpha: this.lineAlpha,
            lineThickness: this.lineThickness,
            springCoils: this.springCoils,
            autoConnect: this.autoConnect
        };
    }

    /**
     * Deserialize the joint data
     */
    fromJSON(data) {
        super.fromJSON(data);

        this.jointType = data.jointType ?? this.jointType;
        this.targetObjectName = data.targetObjectName ?? this.targetObjectName;
        this.pointA = { ...this.pointA, ...data.pointA };
        this.pointB = { ...this.pointB, ...data.pointB };
        this.length = data.length ?? this.length;
        this.stiffness = data.stiffness !== undefined ? data.stiffness : this.stiffness;
        this.damping = data.damping !== undefined ? data.damping : this.damping;
        this.strength = data.strength !== undefined ? data.strength : this.strength;
        this.enableLimits = data.enableLimits ?? false;
        this.minLength = data.minLength ?? this.minLength;
        this.maxLength = data.maxLength ?? this.maxLength;
        this.enableMotor = data.enableMotor ?? false;
        this.motorSpeed = data.motorSpeed ?? this.motorSpeed;
        this.maxMotorTorque = data.maxMotorTorque ?? this.maxMotorTorque;
        this.axis = { ...this.axis, ...data.axis };
        this.showDebug = data.showDebug ?? false;
        this.debugColor = data.debugColor ?? this.debugColor;
        this.autoConnect = data.autoConnect !== undefined ? data.autoConnect : this.autoConnect;
        this.debugColor = data.debugColor ?? this.debugColor;
        this.lineAlpha = data.lineAlpha ?? this.lineAlpha;
        this.lineThickness = data.lineThickness ?? this.lineThickness;
        this.springCoils = data.springCoils ?? this.springCoils;
    }
}

// Register the module
window.Joint = Joint;
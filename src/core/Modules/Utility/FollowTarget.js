/**
 * FollowTarget - Makes an object follow another object or position
 */
class FollowTarget extends Module {
    static allowMultiple = false;
    static namespace = "Utility";
    static description = "Makes object follow a target with various follow modes";
    static iconClass = "fas fa-crosshairs";

    constructor() {
        super("FollowTarget");
        
        // Target properties
        this.targetName = "";
        this.targetPosition = new Vector2(0, 0);
        this.followMode = "smooth"; // smooth, instant, physics
        
        // Follow behavior
        this.followSpeed = 5.0;
        this.smoothing = 0.1; // for smooth following (0.1 = slow, 1.0 = instant)
        this.minDistance = 0; // minimum distance to maintain
        this.maxDistance = 0; // maximum distance before following (0 = no limit)
        this.stopDistance = 5; // distance at which to stop following
        
        // Offset and constraints
        this.offset = new Vector2(0, 0);
        this.constrainToX = false;
        this.constrainToY = false;
        this.lookAtTarget = false;
        
        // Physics properties (for physics mode)
        this.force = 500;
        this.maxVelocity = 200;
        
        // Internal state
        this.targetObject = null;
        this.lastTargetPosition = new Vector2(0, 0);
        
        // Expose properties
        this.exposeProperty("targetName", "string", this.targetName, {
            description: "Name of the target object to follow (leave empty to use targetPosition)"
        });
        
        this.exposeProperty("targetPosition", "vector2", this.targetPosition, {
            description: "Fixed position to follow (used when targetName is empty)"
        });
        
        this.exposeProperty("followMode", "enum", this.followMode, {
            options: ["smooth", "instant", "physics"],
            description: "How the object follows the target"
        });
        
        this.exposeProperty("followSpeed", "number", this.followSpeed, {
            min: 0.1,
            max: 20,
            step: 0.1,
            description: "Speed of following (for smooth mode)"
        });
        
        this.exposeProperty("smoothing", "number", this.smoothing, {
            min: 0.01,
            max: 1,
            step: 0.01,
            description: "Smoothing factor (0.01 = very smooth, 1.0 = instant)"
        });
        
        this.exposeProperty("minDistance", "number", this.minDistance, {
            min: 0,
            max: 500,
            step: 1,
            description: "Minimum distance to maintain from target"
        });
        
        this.exposeProperty("maxDistance", "number", this.maxDistance, {
            min: 0,
            max: 1000,
            step: 1,
            description: "Maximum distance before starting to follow (0 = no limit)"
        });
        
        this.exposeProperty("stopDistance", "number", this.stopDistance, {
            min: 0,
            max: 100,
            step: 1,
            description: "Distance at which to stop following"
        });
        
        this.exposeProperty("offset", "vector2", this.offset, {
            description: "Offset from target position"
        });
        
        this.exposeProperty("constrainToX", "boolean", this.constrainToX, {
            description: "Only follow on X axis"
        });
        
        this.exposeProperty("constrainToY", "boolean", this.constrainToY, {
            description: "Only follow on Y axis"
        });
        
        this.exposeProperty("lookAtTarget", "boolean", this.lookAtTarget, {
            description: "Rotate to face the target"
        });
        
        this.exposeProperty("force", "number", this.force, {
            min: 10,
            max: 2000,
            step: 10,
            description: "Force applied for physics mode"
        });
        
        this.exposeProperty("maxVelocity", "number", this.maxVelocity, {
            min: 10,
            max: 1000,
            step: 10,
            description: "Maximum velocity for physics mode"
        });
    }
    
    start() {
        this.findTarget();
    }
    
    findTarget() {
        if (this.targetName && this.targetName.trim() !== "") {
            if (this.gameObject.scene) {
                this.targetObject = this.gameObject.scene.findGameObjectByName(this.targetName);
                if (!this.targetObject) {
                    console.warn(`FollowTarget: Target object "${this.targetName}" not found`);
                }
            }
        } else {
            this.targetObject = null;
        }
    }
    
    getTargetPosition() {
        if (this.targetObject) {
            return new Vector2(
                this.targetObject.position.x + this.offset.x,
                this.targetObject.position.y + this.offset.y
            );
        } else {
            return new Vector2(
                this.targetPosition.x + this.offset.x,
                this.targetPosition.y + this.offset.y
            );
        }
    }
    
    loop(deltaTime) {
        // Try to find target if we don't have one
        if (this.targetName && !this.targetObject) {
            this.findTarget();
        }
        
        const targetPos = this.getTargetPosition();
        const currentPos = this.gameObject.position;
        
        // Calculate distance to target
        const distance = Math.sqrt(
            Math.pow(targetPos.x - currentPos.x, 2) + 
            Math.pow(targetPos.y - currentPos.y, 2)
        );
        
        // Check if we should follow
        const shouldFollow = (this.maxDistance === 0 || distance > this.maxDistance) && 
                           distance > this.stopDistance;
        
        if (!shouldFollow) return;
        
        // Calculate direction to target
        let directionX = targetPos.x - currentPos.x;
        let directionY = targetPos.y - currentPos.y;
        
        // Normalize direction
        if (distance > 0) {
            directionX /= distance;
            directionY /= distance;
        }
        
        // Apply constraints
        if (this.constrainToX) directionY = 0;
        if (this.constrainToY) directionX = 0;
        
        // Apply minimum distance constraint
        if (this.minDistance > 0 && distance < this.minDistance) {
            directionX *= -1;
            directionY *= -1;
        }
        
        // Apply movement based on follow mode
        switch (this.followMode) {
            case "instant":
                this.applyInstantFollow(targetPos, directionX, directionY, distance);
                break;
                
            case "smooth":
                this.applySmoothFollow(targetPos, directionX, directionY, distance, deltaTime);
                break;
                
            case "physics":
                this.applyPhysicsFollow(directionX, directionY, distance, deltaTime);
                break;
        }
        
        // Look at target if enabled
        if (this.lookAtTarget && distance > 0) {
            this.gameObject.rotation = Math.atan2(directionY, directionX);
        }
        
        this.lastTargetPosition = targetPos;
    }
    
    applyInstantFollow(targetPos, directionX, directionY, distance) {
        if (this.minDistance > 0 && distance <= this.minDistance) {
            // Move away to maintain minimum distance
            const moveDistance = this.minDistance - distance;
            this.gameObject.position.x -= directionX * moveDistance;
            this.gameObject.position.y -= directionY * moveDistance;
        } else {
            // Move to target (minus stop distance)
            const moveDistance = Math.max(0, distance - this.stopDistance);
            this.gameObject.position.x += directionX * moveDistance;
            this.gameObject.position.y += directionY * moveDistance;
        }
    }
    
    applySmoothFollow(targetPos, directionX, directionY, distance, deltaTime) {
        // Calculate desired position
        let desiredX = targetPos.x;
        let desiredY = targetPos.y;
        
        // Apply stop distance
        if (this.stopDistance > 0) {
            desiredX -= directionX * this.stopDistance;
            desiredY -= directionY * this.stopDistance;
        }
        
        // Apply minimum distance
        if (this.minDistance > 0 && distance < this.minDistance) {
            const pushDistance = this.minDistance - distance;
            desiredX = this.gameObject.position.x - directionX * pushDistance;
            desiredY = this.gameObject.position.y - directionY * pushDistance;
        }
        
        // Smooth interpolation
        const lerpFactor = Math.min(1, this.smoothing * this.followSpeed * deltaTime);
        this.gameObject.position.x += (desiredX - this.gameObject.position.x) * lerpFactor;
        this.gameObject.position.y += (desiredY - this.gameObject.position.y) * lerpFactor;
    }
    
    applyPhysicsFollow(directionX, directionY, distance, deltaTime) {
        // Get rigidbody component
        const rigidbody = this.gameObject.getModule("RigidBody");
        if (!rigidbody) {
            console.warn("FollowTarget: Physics mode requires RigidBody component");
            return;
        }
        
        // Calculate force to apply
        let forceX = directionX * this.force;
        let forceY = directionY * this.force;
        
        // Apply minimum distance repulsion
        if (this.minDistance > 0 && distance < this.minDistance) {
            forceX *= -2; // Push away with double force
            forceY *= -2;
        }
        
        // Apply force
        rigidbody.applyForce(new Vector2(forceX * deltaTime, forceY * deltaTime));
        
        // Limit velocity
        const velocity = rigidbody.getVelocity();
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        
        if (speed > this.maxVelocity) {
            const scale = this.maxVelocity / speed;
            rigidbody.setVelocity(new Vector2(velocity.x * scale, velocity.y * scale));
        }
    }
    
    /**
     * Set a new target by name
     */
    setTarget(targetName) {
        this.targetName = targetName;
        this.findTarget();
    }
    
    /**
     * Set a fixed position to follow
     */
    setTargetPosition(x, y) {
        this.targetPosition.x = x;
        this.targetPosition.y = y;
        this.targetObject = null;
        this.targetName = "";
    }
    
    toJSON() {
        const json = super.toJSON();
        json.targetName = this.targetName;
        json.targetPosition = { x: this.targetPosition.x, y: this.targetPosition.y };
        json.followMode = this.followMode;
        json.followSpeed = this.followSpeed;
        json.smoothing = this.smoothing;
        json.minDistance = this.minDistance;
        json.maxDistance = this.maxDistance;
        json.stopDistance = this.stopDistance;
        json.offset = { x: this.offset.x, y: this.offset.y };
        json.constrainToX = this.constrainToX;
        json.constrainToY = this.constrainToY;
        json.lookAtTarget = this.lookAtTarget;
        json.force = this.force;
        json.maxVelocity = this.maxVelocity;
        return json;
    }
    
    fromJSON(json) {
        super.fromJSON(json);
        if (json.targetName !== undefined) this.targetName = json.targetName;
        if (json.targetPosition !== undefined) {
            this.targetPosition = new Vector2(json.targetPosition.x, json.targetPosition.y);
        }
        if (json.followMode !== undefined) this.followMode = json.followMode;
        if (json.followSpeed !== undefined) this.followSpeed = json.followSpeed;
        if (json.smoothing !== undefined) this.smoothing = json.smoothing;
        if (json.minDistance !== undefined) this.minDistance = json.minDistance;
        if (json.maxDistance !== undefined) this.maxDistance = json.maxDistance;
        if (json.stopDistance !== undefined) this.stopDistance = json.stopDistance;
        if (json.offset !== undefined) {
            this.offset = new Vector2(json.offset.x, json.offset.y);
        }
        if (json.constrainToX !== undefined) this.constrainToX = json.constrainToX;
        if (json.constrainToY !== undefined) this.constrainToY = json.constrainToY;
        if (json.lookAtTarget !== undefined) this.lookAtTarget = json.lookAtTarget;
        if (json.force !== undefined) this.force = json.force;
        if (json.maxVelocity !== undefined) this.maxVelocity = json.maxVelocity;
    }
}

window.FollowTarget = FollowTarget;
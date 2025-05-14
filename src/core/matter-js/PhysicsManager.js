/**
 * PhysicsManager - Manages the physics world and integrates with the game engine
 */
class PhysicsManager {
    constructor() {
        // Create Matter.js engine and world
        this.engine = Matter.Engine.create({
            enableSleeping: true
        });
        
        this.world = this.engine.world;
        
        // Configure world properties
        this.world.gravity.y = 1; // Default gravity
        
        // Track all physics bodies and their associated game objects
        this.bodies = new Map(); // Maps Matter.js bodies to game objects
        
        // Debug drawing options
        this.debugDraw = false;
        this.wireframes = true;
        
        // Performance settings
        this.fixedTimeStep = 1000 / 60; // 60 updates per second
        this.timeAccumulator = 0;
        
        console.log("Physics manager initialized");
    }
    
    /**
     * Set the gravity for the physics world
     * @param {number} x - X component of gravity
     * @param {number} y - Y component of gravity
     */
    setGravity(x, y) {
        this.world.gravity.x = x;
        this.world.gravity.y = y;
    }
    
    /**
     * Update physics world - called every frame
     * @param {number} deltaTime - Time in seconds since last frame
     */
    update(deltaTime) {
        // Use fixed timestep for more stable physics
        this.timeAccumulator += deltaTime * 1000; // Convert to ms
        
        while (this.timeAccumulator >= this.fixedTimeStep) {
            Matter.Engine.update(this.engine, this.fixedTimeStep);
            this.timeAccumulator -= this.fixedTimeStep;
        }
        
        // Update game object positions based on physics bodies
        this.syncPhysicsBodies();
    }
    
    /**
     * Synchronize game object transforms with physics body positions
     */
    syncPhysicsBodies() {
        if (!this.bodies || this.bodies.size === 0) return;
        
        this.bodies.forEach((gameObject, body) => {
            if (!gameObject || !body) return;
            
            // Skip colliders that are managed by their own module
            if (body.plugin && body.plugin.isCollider) return;
            
            // Only update if the body is dynamic or kinematic
            if (!body.isStatic) {
                // Update position from physics body
                gameObject.position.x = body.position.x;
                gameObject.position.y = body.position.y;
                
                // Update rotation (Matter.js uses radians)
                gameObject.angle = body.angle * (180 / Math.PI);
            } else if (gameObject.rigidbody && gameObject.rigidbody.bodyNeedsUpdate) {
                // Update static body position if game object moved
                Matter.Body.setPosition(body, gameObject.position);
                Matter.Body.setAngle(body, gameObject.angle * (Math.PI / 180));
                gameObject.rigidbody.bodyNeedsUpdate = false;
            }
        });
    }
    
    /**
     * Register a physics body and associate it with a game object
     * @param {Matter.Body} body - The physics body
     * @param {GameObject} gameObject - The game object to associate with the body
     */
    registerBody(body, gameObject) {
        // Add body to the physics world
        Matter.Composite.add(this.world, body);
        
        // Associate the body with the game object
        this.bodies.set(body, gameObject);
        
        return body;
    }
    
    /**
     * Remove a physics body from the world
     * @param {Matter.Body} body - The physics body to remove
     */
    removeBody(body) {
        if (body) {
            Matter.Composite.remove(this.world, body);
            this.bodies.delete(body);
        }
    }
    
    /**
     * Draw debug visualization of the physics world
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
     */
    drawDebug(ctx) {
        if (!this.debugDraw) return;
        
        // Save context state
        ctx.save();
        
        // Render all bodies
        const bodies = Matter.Composite.allBodies(this.world);
        
        ctx.beginPath();
        
        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];
            const vertices = body.vertices;
            
            ctx.moveTo(vertices[0].x, vertices[0].y);
            
            for (let j = 1; j < vertices.length; j++) {
                ctx.lineTo(vertices[j].x, vertices[j].y);
            }
            
            ctx.lineTo(vertices[0].x, vertices[0].y);
        }
        
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#22ff22';
        ctx.stroke();
        
        // Render constraints
        const constraints = Matter.Composite.allConstraints(this.world);
        
        ctx.beginPath();
        
        for (let i = 0; i < constraints.length; i++) {
            const constraint = constraints[i];
            if (!constraint.render.visible) continue;
            
            const bodyA = constraint.bodyA;
            const bodyB = constraint.bodyB;
            const pointA = constraint.pointA;
            const pointB = constraint.pointB;
            
            // Point coordinates
            let pAx, pAy, pBx, pBy;
            
            // Calculate points
            if (bodyA) {
                pAx = bodyA.position.x + pointA.x;
                pAy = bodyA.position.y + pointA.y;
            } else {
                pAx = pointA.x;
                pAy = pointA.y;
            }
            
            if (bodyB) {
                pBx = bodyB.position.x + pointB.x;
                pBy = bodyB.position.y + pointB.y;
            } else {
                pBx = pointB.x;
                pBy = pointB.y;
            }
            
            ctx.moveTo(pAx, pAy);
            ctx.lineTo(pBx, pBy);
        }
        
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#ff8822';
        ctx.stroke();
        
        // Restore context state
        ctx.restore();
    }
    
    /**
     * Reset the physics world
     */
    reset() {
        // Clear all bodies and constraints
        Matter.Composite.clear(this.world);
        this.bodies.clear();
    }
}
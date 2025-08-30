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
        this.world.gravity.y = 0; // Default gravity (Off, we will process gravity per RigidBody)
        this.gravity = { x: 0, y: 1 }; // Custom gravity vector
        
        // Track all physics bodies and their associated game objects
        this.bodies = new Map(); // Maps Matter.js bodies to game objects
        this.gameObjectBodies = new Map(); // Maps game objects to physics bodies
        
        // Debug drawing options
        this.debugDraw = false;
        this.wireframes = true;
        
        // Performance settings
        this.fixedTimeStep = 1000 / 60; // 60 updates per second
        this.timeAccumulator = 0;

        // Wake up bodies without gravity on collision
        Matter.Events.on(this.engine, 'collisionStart', event => {
            event.pairs.forEach(pair => {
                [pair.bodyA, pair.bodyB].forEach(body => {
                    if (body.ignoreGravity && body.isSleeping) {
                        Matter.Sleeping.set(body, false);
                    }
                });
            });
        });
        
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

            // Custom gravity application per body
            const gravity = this.gravity;
            this.bodies.forEach((gameObject, body) => {
                // Only apply gravity if body is dynamic, not static, and not ignoring gravity
                if (!body.isStatic && !body.ignoreGravity) {
                    // Apply gravity force: F = m * g
                    const force = {
                        x: body.mass * gravity.x * 0.001,
                        y: body.mass * gravity.y * 0.001
                    };
                    Matter.Body.applyForce(body, body.position, force);
                }
            });
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
     * Register a body with the physics world and associate it with a game object
     * @param {Matter.Body} body - Physics body to register
     * @param {GameObject} gameObject - GameObject that owns this body
     */
    registerBody(body, gameObject) {
        if (!body || !gameObject) {
            console.warn("PhysicsManager.registerBody: Missing body or gameObject");
            return;
        }
        
        // Ensure maps are initialized
        if (!this.bodies) this.bodies = new Map();
        if (!this.gameObjectBodies) this.gameObjectBodies = new Map();
        
        try {
            // Store the mapping between body and game object
            this.bodies.set(body, gameObject);
            this.gameObjectBodies.set(gameObject, body);
            
            // Add body to the physics world if not already added
            if (this.engine && this.engine.world && !this.engine.world.bodies.includes(body)) {
                Matter.Composite.add(this.engine.world, body);
            }
            
            // Ensure static bodies are really static
            if (body.isStatic) {
                Matter.Body.setStatic(body, true);
            }
        } catch (error) {
            console.error("Error in PhysicsManager.registerBody:", error);
        }
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
        // Get all game objects linked to physics bodies before clearing
        const objectsToReset = new Map();
        this.bodies.forEach((gameObject, body) => {
            // Store the original position and rotation if they need to be reset
            objectsToReset.set(gameObject.id, {
                gameObject,
                originalPosition: gameObject.getOriginalPosition ? gameObject.getOriginalPosition() : gameObject.position.clone(),
                originalRotation: gameObject.originalRotation || 0
            });
        });
        
        // Clear all bodies and constraints
        Matter.Composite.clear(this.world);
        this.bodies.clear();
        
        // Reset positions of affected game objects
        objectsToReset.forEach(data => {
            // Reset to original position and rotation if available
            data.gameObject.position = data.originalPosition;
            data.gameObject.angle = data.originalRotation;
        });
    }
}
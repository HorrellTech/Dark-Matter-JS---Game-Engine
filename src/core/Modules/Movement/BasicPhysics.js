class BasicPhysics extends Module {
    static namespace = "Movement";
    static description = "General physics module with collision, forces, layers, gravity, and collider support";
    static allowMultiple = false;

    constructor() {
        super("BasicPhysics");

        // Physics properties
        this.mass = 1.0;
        this.velocity = { x: 0, y: 0 };
        this.gravity = { x: 0, y: 0 };
        this.angularVelocity = 0;
        this.friction = 0.98;
        this.angularFriction = 0.95;
        this.bounciness = 0.7;
        this.contactFriction = 0.8;
        this.fixedPosition = false; // If true, object does not move
        this.fixedRotation = false; // If true, object does not rotate
        this.physicsLayer = 0; // Only interacts with objects on same layer
        this.useCollision = true; // Enable/disable collision detection
        this.colliderType = "rectangle"; // "circle" or "rectangle"
        this.polygonVertices = []; // Array of {x, y} points for custom polygon
        this.polygon = null; // Will hold the Polygon instance
        this.colliderRadius = 10; // For circle collider
        this.colliderWidth = 20;  // For rectangle collider
        this.colliderHeight = 20; // For rectangle collider
        this.gravityEnabled = false;
        this.gravityMassAffectsOthers = false;
        this.gravityPullRadius = 0; // 0 disables gravity pull

        this.drawColliderGizmo = true; // Show collider in editor
        this.drawColliderInGame = false; // Show collider shape in game

        // Internal state
        this.lastCollision = null;
        this.forces = { x: 0, y: 0 }; // Accumulated forces for this frame

        // Expose properties for inspector
        this.exposeProperty("mass", "number", 1.0, {
            min: 0.1, max: 100, step: 0.1,
            description: "Mass of the object",
            onChange: (val) => { this.mass = Math.max(0.1, val); }
        });
        this.exposeProperty("gravity", "vector2", this.gravity, {
            description: "Gravity force applied every frame (Vector2)",
            onChange: (val) => {
                this.gravity = val;
            }
        });
        this.exposeProperty("fixedPosition", "boolean", false, {
            description: "If true, object does not move or rotate",
            onChange: (val) => { this.fixedPosition = val; }
        });
        this.exposeProperty("fixedRotation", "boolean", false, {
            description: "If true, object does not rotate",
            onChange: (val) => { this.fixedRotation = val; }
        });

        this.exposeProperty("useCollision", "boolean", true, {
            description: "Enable/disable collision detection",
            onChange: (val) => { this.useCollision = val; }
        });
        this.exposeProperty("physicsLayer", "number", 0, {
            min: 0, max: 10, step: 1,
            description: "Physics layer for collision filtering",
            onChange: (val) => { this.physicsLayer = Math.max(0, val); }
        });
        this.exposeProperty("colliderType", "select", "circle", {
            options: ["circle", "rectangle"],
            description: "Collider shape type",
            onChange: (val) => { this.colliderType = val; }
        });

        this.exposeProperty("colliderRadius", "number", 10, {
            min: 1, max: 1000, step: 1,
            description: "Collider radius (for circle)",
            onChange: (val) => { this.colliderRadius = Math.max(1, val); }
        });
        this.exposeProperty("colliderWidth", "number", 20, {
            min: 1, max: 1000, step: 1,
            description: "Collider width (for rectangle)",
            onChange: (val) => { this.colliderWidth = Math.max(1, val); }
        });
        this.exposeProperty("colliderHeight", "number", 20, {
            min: 1, max: 1000, step: 1,
            description: "Collider height (for rectangle)",
            onChange: (val) => { this.colliderHeight = Math.max(1, val); }
        });
        this.exposeProperty("bounciness", "number", 0.7, {
            min: 0, max: 1, step: 0.01,
            description: "Bounciness (restitution) on collision",
            onChange: (val) => { this.bounciness = Math.max(0, Math.min(1, val)); }
        });
        this.exposeProperty("contactFriction", "number", 0.8, {
            min: 0, max: 1, step: 0.01,
            description: "Friction applied on contact",
            onChange: (val) => { this.contactFriction = Math.max(0, Math.min(1, val)); }
        });
        this.exposeProperty("gravityEnabled", "boolean", false, {
            description: "Enable gravity for this object",
            onChange: (val) => { this.gravityEnabled = val; }
        });
        this.exposeProperty("gravityMassAffectsOthers", "boolean", false, {
            description: "If true, object's mass affects gravity pull on others",
            onChange: (val) => { this.gravityMassAffectsOthers = val; }
        });
        this.exposeProperty("gravityPullRadius", "number", 0, {
            min: 0, max: 1000, step: 1,
            description: "Radius within which this object pulls others gravitationally",
            onChange: (val) => { this.gravityPullRadius = Math.max(0, val); }
        });

        this.exposeProperty("drawColliderGizmo", "boolean", true, {
            description: "Draw collider gizmo in editor",
            onChange: (val) => { this.drawColliderGizmo = val; }
        });
        this.exposeProperty("drawColliderInGame", "boolean", false, {
            description: "Draw collider shape in game",
            onChange: (val) => { this.drawColliderInGame = val; }
        });
    }

    style(style) {
        style.startGroup("Physics Properties", false, {
            backgroundColor: 'rgba(100,150,255,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("mass", "number", this.mass, {
            min: 0.1, max: 100, step: 0.1,
            description: "Mass of the object",
            label: "Mass"
        });

        style.exposeProperty("gravityEnabled", "boolean", this.gravityEnabled, {
            description: "Enable gravity for this object",
            label: "Gravity Enabled"
        });

        if(this.gravityEnabled) {
            style.exposeProperty("gravity", "vector2", this.gravity, {
                description: "Gravity force applied every frame (Vector2)",
                label: "Gravity Vector"
            });
        }

        style.exposeProperty("fixedPosition", "boolean", this.fixedPosition, {
            description: "If true, object does not move or rotate",
            label: "Fixed Position"
        });

        style.exposeProperty("fixedRotation", "boolean", this.fixedRotation, {
            description: "If true, object does not rotate",
            label: "Fixed Rotation"
        });

        style.exposeProperty("friction", "number", this.friction, {
            min: 0, max: 1, step: 0.01,
            description: "Linear friction applied to velocity",
            label: "Friction"
        });

        style.exposeProperty("angularFriction", "number", this.angularFriction, {
            min: 0, max: 1, step: 0.01,
            description: "Angular friction applied to rotation",
            label: "Angular Friction"
        });

        style.endGroup();

        style.addDivider();

        style.startGroup("Collision Properties", false, {
            backgroundColor: 'rgba(255,200,100,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("useCollision", "boolean", this.useCollision, {
            description: "Enable/disable collision detection",
            label: "Use Collision"
        });

        if (this.useCollision) {
            style.exposeProperty("physicsLayer", "number", this.physicsLayer, {
                min: 0, max: 10, step: 1,
                description: "Physics layer for collision filtering",
                label: "Physics Layer"
            });

            style.exposeProperty("colliderType", "select", this.colliderType, {
                options: ["circle", "rectangle"],
                description: "Collider shape type",
                label: "Collider Type"
            });

            if (this.colliderType === "circle") {
                style.exposeProperty("colliderRadius", "number", this.colliderRadius, {
                    min: 1, max: 1000, step: 1,
                    description: "Collider radius (for circle)",
                    label: "Collider Radius"
                });
            } else if (this.colliderType === "rectangle") {
                style.exposeProperty("colliderWidth", "number", this.colliderWidth, {
                    min: 1, max: 1000, step: 1,
                    description: "Collider width (for rectangle)",
                    label: "Collider Width"
                });
                style.exposeProperty("colliderHeight", "number", this.colliderHeight, {
                    min: 1, max: 1000, step: 1,
                    description: "Collider height (for rectangle)",
                    label: "Collider Height"
                });
            }

            style.exposeProperty("bounciness", "number", this.bounciness, {
                min: 0, max: 1, step: 0.01,
                description: "Bounciness (restitution) on collision",
                label: "Bounciness"
            });

            style.exposeProperty("contactFriction", "number", this.contactFriction, {
                min: 0, max: 1, step: 0.01,
                description: "Friction applied on contact",
                label: "Contact Friction"
            });

            style.exposeProperty("drawColliderGizmo", "boolean", this.drawColliderGizmo, {
                description: "Draw collider gizmo in editor",
                label: "Draw Collider Gizmo"
            });

            style.exposeProperty("drawColliderInGame", "boolean", this.drawColliderInGame, {
                description: "Draw collider shape in game",
                label: "Draw Collider In Game"
            });
        }

        style.endGroup();

        style.addDivider();

        style.startGroup("Gravity Pull Properties", false, {
            backgroundColor: 'rgba(100,255,150,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("gravityMassAffectsOthers", "boolean", this.gravityMassAffectsOthers, {
            description: "If true, object's mass affects gravity pull on others",
            label: "Gravity Mass Affects Others"
        });

        style.exposeProperty("gravityPullRadius", "number", this.gravityPullRadius, {
            min: 0, max: 1000, step: 1,
            description: "Radius within which this object pulls others gravitationally",
            label: "Gravity Pull Radius"
        });

        style.endGroup();
    }

    // Public API
    addForce(x, y) {
        if (this.fixedPosition) return;
        this.forces.x += x;
        this.forces.y += y;
    }

    setVelocity(x, y) {
        if (this.fixedPosition) return;
        this.velocity.x = x;
        this.velocity.y = y;
    }

    setAngularVelocity(angVel) {
        if (this.fixedPosition || this.fixedRotation) return;
        this.angularVelocity = angVel;
    }

    getSpeed() {
        return Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
    }

    loop(deltaTime) {

        // Gravity accumulation (velocity += gravity * dt)
        if (this.gravityEnabled && this.gravity && !this.fixedPosition) {
            this.velocity.x += this.gravity.x * deltaTime;
            this.velocity.y += this.gravity.y * deltaTime;
        }

        // Gravity pull (Newtonian, accumulates force)
        if (this.gravityPullRadius > 0 && window.engine && window.engine.gameObjects) {
            for (const obj of window.engine.gameObjects) {
                if (obj === this.gameObject) continue;
                const otherPhysics = obj.getModule("BasicPhysics");
                if (!otherPhysics || !otherPhysics.gravityEnabled) continue;
                if (otherPhysics.physicsLayer !== this.physicsLayer) continue;

                const dx = obj.position.x - this.gameObject.position.x;
                const dy = obj.position.y - this.gameObject.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0 && dist < this.gravityPullRadius) {
                    const G = 0.1;
                    const force = G * this.mass * otherPhysics.mass / (dist * dist);
                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;
                    this.velocity.x += fx / this.mass * deltaTime;
                    this.velocity.y += fy / this.mass * deltaTime;
                    if (otherPhysics.gravityMassAffectsOthers) {
                        otherPhysics.velocity.x -= fx / otherPhysics.mass * deltaTime;
                        otherPhysics.velocity.y -= fy / otherPhysics.mass * deltaTime;
                    }
                }
            }
        }

        // Apply friction
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;
        this.angularVelocity *= this.angularFriction;

        if (!this.fixedPosition) {
            // Update position and rotation
            this.gameObject.position.x += this.velocity.x * deltaTime;
            this.gameObject.position.y += this.velocity.y * deltaTime;
        }

        if (!this.fixedRotation) {
            this.gameObject.angle += this.angularVelocity * deltaTime;
        }

        // Keep angle in 0-360 range
        while (this.gameObject.angle >= 360) this.gameObject.angle -= 360;
        while (this.gameObject.angle < 0) this.gameObject.angle += 360;

        if(this.useCollision) {
            // Collision detection and resolution
            this.handleCollisions(deltaTime);
        }
    }

    drawGizmos(ctx) {
        if (!this.drawColliderGizmo) return;
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = "#40df31ff";
        ctx.lineWidth = 2;
        if (this.colliderType === "circle") {
            ctx.beginPath();
            ctx.arc(
                this.gameObject.position.x,
                this.gameObject.position.y,
                this.colliderRadius,
                0, Math.PI * 2
            );
            ctx.stroke();
        } else if (this.colliderType === "rectangle") {
            const corners = this.getRectangleCorners(
                this.gameObject.position,
                { width: this.colliderWidth, height: this.colliderHeight },
                this.gameObject.angle
            );
            ctx.beginPath();
            ctx.moveTo(corners[0].x, corners[0].y);
            for (let i = 1; i < corners.length; i++) {
                ctx.lineTo(corners[i].x, corners[i].y);
            }
            ctx.closePath();
            ctx.stroke();
        }
        ctx.restore();
    }

    draw(ctx) {
        if (this.drawColliderInGame) {
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = "#ff8800";
            ctx.lineWidth = 2;
            if (this.colliderType === "circle") {
                ctx.beginPath();
                ctx.arc(
                    this.gameObject.position.x,
                    this.gameObject.position.y,
                    this.colliderRadius,
                    0, Math.PI * 2
                );
                ctx.stroke();
            } else if (this.colliderType === "rectangle") {
                const corners = this.getRectangleCorners(
                    this.gameObject.position,
                    { width: this.colliderWidth, height: this.colliderHeight },
                    this.gameObject.angle
                );
                ctx.beginPath();
                ctx.moveTo(corners[0].x, corners[0].y);
                for (let i = 1; i < corners.length; i++) {
                    ctx.lineTo(corners[i].x, corners[i].y);
                }
                ctx.closePath();
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    handleCollisions(deltaTime) {
        if (!window.engine || !window.engine.gameObjects) return;

        for (const obj of window.engine.gameObjects) {
            if (obj === this.gameObject) continue;
            const otherPhysics = obj.getModule("BasicPhysics");
            if (!otherPhysics || !otherPhysics.useCollision) continue;
            if (otherPhysics.physicsLayer !== this.physicsLayer) continue;

            if (this.colliderType === "circle" && otherPhysics.colliderType === "circle") {
                this.handleCircleCollision(obj, otherPhysics, deltaTime);
            } else if (this.colliderType === "rectangle" && otherPhysics.colliderType === "rectangle") {
                this.handleRectangleCollision(obj, otherPhysics, deltaTime);
            } else {
                this.handleCircleRectangleCollision(obj, otherPhysics, deltaTime);
            }
        }
    }

    handleCircleRectangleCollision(otherObj, otherPhysics, deltaTime) {
        // Determine which is circle and which is rectangle
        let circle, circlePhysics, rect, rectPhysics, circleObj, rectObj;
        if (this.colliderType === "circle") {
            circle = this.gameObject.position;
            circlePhysics = this;
            circleObj = this.gameObject;
            rect = otherObj.position;
            rectPhysics = otherPhysics;
            rectObj = otherObj;
            var rectWidth = otherPhysics.colliderWidth;
            var rectHeight = otherPhysics.colliderHeight;
            var rectAngle = otherObj.angle;
            var circleRadius = this.colliderRadius;
        } else {
            circle = otherObj.position;
            circlePhysics = otherPhysics;
            circleObj = otherObj;
            rect = this.gameObject.position;
            rectPhysics = this;
            rectObj = this.gameObject;
            var rectWidth = this.colliderWidth;
            var rectHeight = this.colliderHeight;
            var rectAngle = this.gameObject.angle;
            var circleRadius = otherPhysics.colliderRadius;
        }

        // Get rectangle corners
        const rectCorners = this.getRectangleCorners(rect, { width: rectWidth, height: rectHeight }, rectAngle);

        // Check if circle center is inside rectangle
        const isInside = this.pointInPolygon(circle, rectCorners);

        let closestPoint = { x: 0, y: 0 };
        let minDist = Infinity;

        if (isInside) {
            // Circle is inside - find closest edge
            for (let i = 0; i < rectCorners.length; i++) {
                const p1 = rectCorners[i];
                const p2 = rectCorners[(i + 1) % rectCorners.length];
                const closest = this.closestPointOnLineSegment(circle, p1, p2);
                const dist = Math.sqrt((circle.x - closest.x) ** 2 + (circle.y - closest.y) ** 2);
                if (dist < minDist) {
                    minDist = dist;
                    closestPoint = closest;
                }
            }
        } else {
            // Circle is outside - find closest point on rectangle perimeter
            for (let i = 0; i < rectCorners.length; i++) {
                const p1 = rectCorners[i];
                const p2 = rectCorners[(i + 1) % rectCorners.length];
                const closest = this.closestPointOnLineSegment(circle, p1, p2);
                const dist = Math.sqrt((circle.x - closest.x) ** 2 + (circle.y - closest.y) ** 2);
                if (dist < minDist) {
                    minDist = dist;
                    closestPoint = closest;
                }
            }
        }

        const distance = Math.sqrt((circle.x - closestPoint.x) ** 2 + (circle.y - closestPoint.y) ** 2);

        if ((isInside && distance < circleRadius) || (!isInside && distance <= circleRadius)) {
            let normalX, normalY;
            if (distance === 0) {
                // Fallback normal
                normalX = 1;
                normalY = 0;
            } else {
                if (isInside) {
                    // Normal points outward from rectangle (from edge to circle center)
                    normalX = (circle.x - closestPoint.x) / distance;
                    normalY = (circle.y - closestPoint.y) / distance;
                } else {
                    // Normal points from rectangle to circle
                    normalX = (circle.x - closestPoint.x) / distance;
                    normalY = (circle.y - closestPoint.y) / distance;
                }
            }

            const penetration = isInside ? circleRadius - distance : circleRadius - distance;

            this.resolveCollision(
                circlePhysics, rectPhysics, circleObj, rectObj,
                normalX, normalY, closestPoint.x, closestPoint.y,
                Math.abs(penetration)
            );
        }
    }

    handleCircleCollision(otherObj, otherPhysics, deltaTime) {
        const dx = otherObj.position.x - this.gameObject.position.x;
        const dy = otherObj.position.y - this.gameObject.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const r1 = this.colliderRadius;
        const r2 = otherPhysics.colliderRadius;
        const collisionDist = r1 + r2;

        if (dist > 0 && dist < collisionDist) {
            // Calculate collision normal
            const normalX = dx / dist;
            const normalY = dy / dist;

            // Contact point is on the line between centers
            const contactX = this.gameObject.position.x + normalX * r1;
            const contactY = this.gameObject.position.y + normalY * r1;

            // Calculate penetration depth
            const penetration = collisionDist - dist;

            // Apply collision response
            this.resolveCollision(
                this, otherPhysics, this.gameObject, otherObj,
                normalX, normalY, contactX, contactY, penetration
            );
        }
    }

    handleRectangleCollision(otherObj, otherPhysics, deltaTime) {
        const rectA = this.getRectangleCorners(
            this.gameObject.position,
            { width: this.colliderWidth, height: this.colliderHeight },
            this.gameObject.angle
        );
        const rectB = this.getRectangleCorners(
            otherObj.position,
            { width: otherPhysics.colliderWidth, height: otherPhysics.colliderHeight },
            otherObj.angle
        );

        // SAT collision detection with penetration info
        const collision = this.getRectangleCollisionInfo(rectA, rectB);
        if (collision.intersecting) {
            // Apply collision response
            this.resolveCollision(
                this, otherPhysics, this.gameObject, otherObj,
                collision.normal.x, collision.normal.y,
                collision.contactPoint.x, collision.contactPoint.y,
                collision.penetration
            );
        }
    }

    closestPointOnLineSegment(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        const length = dx * dx + dy * dy;

        if (length === 0) return { x: lineStart.x, y: lineStart.y };

        const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / length));

        return {
            x: lineStart.x + t * dx,
            y: lineStart.y + t * dy
        };
    }

    resolveCollision(physicsA, physicsB, objA, objB, normalX, normalY, contactX, contactY, penetration) {
        // Check for static object
        const aStatic = physicsA.fixedPosition;
        const bStatic = physicsB.fixedPosition;

        // If one is static, only move the dynamic object and zero its velocity along the normal
        if (aStatic && !bStatic) {
            objB.position.x += normalX * penetration;
            objB.position.y += normalY * penetration;
            // Remove velocity along normal (no bounce)
            const velDot = physicsB.velocity.x * normalX + physicsB.velocity.y * normalY;
            physicsB.velocity.x -= velDot * normalX;
            physicsB.velocity.y -= velDot * normalY;
            return;
        }
        if (!aStatic && bStatic) {
            objA.position.x -= normalX * penetration;
            objA.position.y -= normalY * penetration;
            // Remove velocity along normal (no bounce)
            const velDot = physicsA.velocity.x * normalX + physicsA.velocity.y * normalY;
            physicsA.velocity.x -= velDot * normalX;
            physicsA.velocity.y -= velDot * normalY;
            return;
        }

        // Relative velocity at contact (including angular velocity and gravity)
        const rAx = contactX - objA.position.x;
        const rAy = contactY - objA.position.y;
        const rBx = contactX - objB.position.x;
        const rBy = contactY - objB.position.y;

        // Velocity at contact point for A
        const velA = {
            x: physicsA.velocity.x - physicsA.angularVelocity * rAy,
            y: physicsA.velocity.y + physicsA.angularVelocity * rAx
        };
        // Velocity at contact point for B
        const velB = {
            x: physicsB.velocity.x - physicsB.angularVelocity * rBy,
            y: physicsB.velocity.y + physicsB.angularVelocity * rBx
        };

        // Add gravity effect
        velA.x += physicsA.gravity.x;
        velA.y += physicsA.gravity.y;
        velB.x += physicsB.gravity.x;
        velB.y += physicsB.gravity.y;

        // Relative velocity at contact
        const relVelX = velB.x - velA.x;
        const relVelY = velB.y - velA.y;
        const relVelNormal = relVelX * normalX + relVelY * normalY;

        // Only resolve if objects are moving toward each other
        if (relVelNormal > 0) return;

        // Restitution (bounciness) - set to 0 for no bounce
        const restitution = 0;

        // Friction
        const friction = Math.min(physicsA.contactFriction, physicsB.contactFriction);

        // Impulse scalar (add gravity magnitude for more realistic bounce)
        const gravityMag = Math.sqrt(physicsA.gravity.x ** 2 + physicsA.gravity.y ** 2);
        const impulseScalar = -(1 + restitution) * relVelNormal / (1 / physicsA.mass + 1 / physicsB.mass) + gravityMag * restitution;

        // Impulse vector
        const impulseX = impulseScalar * normalX;
        const impulseY = impulseScalar * normalY;

        // Apply impulse
        if (!physicsA.fixedPosition) {
            physicsA.velocity.x -= impulseX / physicsA.mass;
            physicsA.velocity.y -= impulseY / physicsA.mass;
            physicsA.velocity.x *= friction;
            physicsA.velocity.y *= friction;
        }
        if (!physicsB.fixedPosition) {
            physicsB.velocity.x += impulseX / physicsB.mass;
            physicsB.velocity.y += impulseY / physicsB.mass;
            physicsB.velocity.x *= friction;
            physicsB.velocity.y *= friction;
        }

        // Angular impulse (torque) for both objects, stronger with gravity and bounce
        if (!physicsA.fixedPosition) {
            const IA = this.getMomentOfInertia(physicsA);
            const torqueA = rAx * (-impulseY) - rAy * (-impulseX);
            physicsA.angularVelocity += (torqueA / IA) * (1 + restitution + gravityMag * 0.1);
        }
        if (!physicsB.fixedPosition) {
            const IB = this.getMomentOfInertia(physicsB);
            const torqueB = rBx * impulseY - rBy * impulseX;
            physicsB.angularVelocity += (torqueB / IB) * (1 + restitution + gravityMag * 0.1);
        }

        // Separate objects to prevent overlap - improved for dynamic-to-dynamic
        const totalMass = physicsA.mass + physicsB.mass;
        const separationA = physicsB.mass / totalMass;
        const separationB = physicsA.mass / totalMass;

        if (!physicsA.fixedPosition && !physicsB.fixedPosition) {
            // Both dynamic - separate based on mass ratio
            objA.position.x -= normalX * penetration * separationA;
            objA.position.y -= normalY * penetration * separationA;
            objB.position.x += normalX * penetration * separationB;
            objB.position.y += normalY * penetration * separationB;
        } else if (!physicsA.fixedPosition) {
            objA.position.x -= normalX * penetration;
            objA.position.y -= normalY * penetration;
        } else if (!physicsB.fixedPosition) {
            objB.position.x += normalX * penetration;
            objB.position.y += normalY * penetration;
        }
    }

    getMomentOfInertia(physics) {
        // Simplified moment of inertia calculation
        if (physics.colliderType === "circle") {
            return 0.5 * physics.mass * physics.colliderRadius * physics.colliderRadius;
        } else {
            const w = physics.colliderWidth;
            const h = physics.colliderHeight;
            return (physics.mass * (w * w + h * h)) / 12;
        }
    }

    getRectangleCollisionInfo(rectA, rectB) {
        // SAT with penetration depth and contact point calculation
        const axes = [
            this.getEdgeAxis(rectA, 0),
            this.getEdgeAxis(rectA, 1),
            this.getEdgeAxis(rectB, 0),
            this.getEdgeAxis(rectB, 1)
        ];

        let minPenetration = Infinity;
        let collisionAxis = null;

        for (const axis of axes) {
            const [minA, maxA] = this.projectPolygon(rectA, axis);
            const [minB, maxB] = this.projectPolygon(rectB, axis);

            if (maxA < minB || maxB < minA) {
                return { intersecting: false };
            }

            const penetration = Math.min(maxA - minB, maxB - minA);
            if (penetration < minPenetration) {
                minPenetration = penetration;
                collisionAxis = axis;
            }
        }

        // Calculate contact point (average of overlapping corners)
        const contactPoint = this.getContactPoint(rectA, rectB);

        return {
            intersecting: true,
            penetration: minPenetration,
            normal: collisionAxis,
            contactPoint: contactPoint
        };
    }

    getRectangleCorners(pos, size, angle) {
        // Returns array of 4 corners [{x, y}, ...] for rectangle at pos, rotated by angle
        const hw = (size.width || 20) / 2;
        const hh = (size.height || 20) / 2;
        const rad = (angle || 0) * Math.PI / 180;
        const corners = [
            { x: -hw, y: -hh },
            { x: hw, y: -hh },
            { x: hw, y: hh },
            { x: -hw, y: hh }
        ];
        return corners.map(pt => ({
            x: pos.x + pt.x * Math.cos(rad) - pt.y * Math.sin(rad),
            y: pos.y + pt.x * Math.sin(rad) + pt.y * Math.cos(rad)
        }));
    }

    getEdgeAxis(rect, i) {
        // Returns normalized axis vector for edge i
        const p1 = rect[i];
        const p2 = rect[(i + 1) % rect.length];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        return { x: -dy / len, y: dx / len }; // Perpendicular
    }

    projectPolygon(points, axis) {
        let min = points[0].x * axis.x + points[0].y * axis.y;
        let max = min;
        for (let i = 1; i < points.length; i++) {
            const proj = points[i].x * axis.x + points[i].y * axis.y;
            if (proj < min) min = proj;
            if (proj > max) max = proj;
        }
        return [min, max];
    }

    getContactPoint(rectA, rectB) {
        // Find overlapping corners and calculate average
        const overlap = [];
        for (const pt of rectA) {
            if (this.pointInPolygon(pt, rectB)) overlap.push(pt);
        }
        for (const pt of rectB) {
            if (this.pointInPolygon(pt, rectA)) overlap.push(pt);
        }

        if (overlap.length === 0) {
            // Fallback: midpoint between centers
            return {
                x: (this.getCentroid(rectA).x + this.getCentroid(rectB).x) / 2,
                y: (this.getCentroid(rectA).y + this.getCentroid(rectB).y) / 2
            };
        }

        const sum = overlap.reduce((acc, pt) => ({ x: acc.x + pt.x, y: acc.y + pt.y }), { x: 0, y: 0 });
        return { x: sum.x / overlap.length, y: sum.y / overlap.length };
    }

    getCentroid(rect) {
        const sum = rect.reduce((acc, pt) => ({ x: acc.x + pt.x, y: acc.y + pt.y }), { x: 0, y: 0 });
        return { x: sum.x / rect.length, y: sum.y / rect.length };
    }

    pointInPolygon(pt, poly) {
        // Ray-casting algorithm
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const xi = poly[i].x, yi = poly[i].y;
            const xj = poly[j].x, yj = poly[j].y;
            if ((yi > pt.y) !== (yj > pt.y) &&
                pt.x < (xj - xi) * (pt.y - yi) / (yj - yi + 0.00001) + xi) {
                inside = !inside;
            }
        }
        return inside;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            mass: this.mass,
            velocity: this.velocity,
            angularVelocity: this.angularVelocity,
            friction: this.friction,
            angularFriction: this.angularFriction,
            bounciness: this.bounciness,
            contactFriction: this.contactFriction,
            fixedPosition: this.fixedPosition,
            physicsLayer: this.physicsLayer,
            colliderType: this.colliderType,
            colliderRadius: this.colliderRadius,
            colliderWidth: this.colliderWidth,
            colliderHeight: this.colliderHeight,
            gravityEnabled: this.gravityEnabled,
            gravityMassAffectsOthers: this.gravityMassAffectsOthers,
            gravityPullRadius: this.gravityPullRadius,
            gravity: this.gravity
        };
    }

    fromJSON(data) {
        super.fromJSON(data);

        if (!data) return;

        this.mass = data.mass ?? 1.0;
        this.velocity = data.velocity
            ? { x: data.velocity.x ?? 0, y: data.velocity.y ?? 0 }
            : { x: 0, y: 0 };
        this.gravity = data.gravity
            ? { x: data.gravity.x ?? 0, y: data.gravity.y ?? 0 }
            : { x: 0, y: 0 };
        this.angularVelocity = data.angularVelocity ?? 0;
        this.friction = data.friction ?? 0.98;
        this.angularFriction = data.angularFriction ?? 0.95;
        this.bounciness = data.bounciness ?? 0.7;
        this.contactFriction = data.contactFriction ?? 0.8;
        this.fixedPosition = data.fixedPosition ?? false;
        this.physicsLayer = data.physicsLayer ?? 0;
        this.colliderType = data.colliderType ?? "circle";
        this.colliderRadius = data.colliderRadius ?? 10;
        this.colliderWidth = data.colliderWidth ?? 20;
        this.colliderHeight = data.colliderHeight ?? 20;
        this.gravityEnabled = data.gravityEnabled ?? false;
        this.gravityMassAffectsOthers = data.gravityMassAffectsOthers ?? false;
        this.gravityPullRadius = data.gravityPullRadius ?? 0;
        this.drawColliderGizmo = data.drawColliderGizmo !== undefined ? data.drawColliderGizmo : true;
        this.drawColliderInGame = data.drawColliderInGame !== undefined ? data.drawColliderInGame : false;

        // Internal state
        this.lastCollision = null;
        this.forces = { x: 0, y: 0 };
    }
}

window.BasicPhysics = BasicPhysics;
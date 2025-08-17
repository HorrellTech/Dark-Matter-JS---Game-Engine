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
        this.fixedPosition = false; // If true, object does not move or rotate
        this.physicsLayer = 0; // Only interacts with objects on same layer
        this.colliderType = "circle"; // "circle" or "rectangle"
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
        if (this.fixedPosition) return;
        this.angularVelocity = angVel;
    }

    getSpeed() {
        return Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
    }

    loop(deltaTime) {
        if (this.fixedPosition) return;

        // Gravity accumulation (velocity += gravity * dt)
        if (this.gravityEnabled && this.gravity) {
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

        // Update position and rotation
        this.gameObject.position.x += this.velocity.x * deltaTime;
        this.gameObject.position.y += this.velocity.y * deltaTime;
        this.gameObject.angle += this.angularVelocity * deltaTime;

        // Keep angle in 0-360 range
        while (this.gameObject.angle >= 360) this.gameObject.angle -= 360;
        while (this.gameObject.angle < 0) this.gameObject.angle += 360;

        // Collision detection and resolution
        this.handleCollisions(deltaTime);
    }

    drawGizmos(ctx) {
        if (!this.drawColliderGizmo) return;
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = "#00aaff";
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
            if (!otherPhysics) continue;
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

        // Transform circle position into rectangle's local space
        const rad = (rectAngle || 0) * Math.PI / 180;
        const cos = Math.cos(-rad);
        const sin = Math.sin(-rad);
        const relX = cos * (circle.x - rect.x) - sin * (circle.y - rect.y);
        const relY = sin * (circle.x - rect.x) + cos * (circle.y - rect.y);

        // Clamp to rectangle bounds to find closest point
        const hw = rectWidth / 2;
        const hh = rectHeight / 2;
        const closestX = Math.max(-hw, Math.min(relX, hw));
        const closestY = Math.max(-hh, Math.min(relY, hh));

        // Find distance from circle center to closest point
        const distX = relX - closestX;
        const distY = relY - closestY;
        const dist = Math.sqrt(distX * distX + distY * distY);

        if (dist < circleRadius) {
            // Calculate collision normal in local space
            let normalX = distX;
            let normalY = distY;
            if (dist === 0) {
                // Circle center is inside rectangle
                // Use direction from rectangle center to circle center
                normalX = relX;
                normalY = relY;
                const len = Math.sqrt(normalX * normalX + normalY * normalY) || 1;
                normalX /= len;
                normalY /= len;
            } else {
                normalX /= dist;
                normalY /= dist;
            }

            // Transform normal back to world space
            const worldNormalX = cos * normalX - sin * normalY;
            const worldNormalY = sin * normalX + cos * normalY;

            // Calculate contact point in world space
            const contactLocalX = closestX;
            const contactLocalY = closestY;
            const contactX = rect.x + cos * contactLocalX - sin * contactLocalY;
            const contactY = rect.y + sin * contactLocalX + cos * contactLocalY;

            // Apply collision response (now both objects get angular impulse)
            this.resolveCollision(
                circlePhysics, rectPhysics, circleObj, rectObj,
                worldNormalX, worldNormalY, contactX, contactY,
                circleRadius - dist
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

    resolveCollision(physicsA, physicsB, objA, objB, normalX, normalY, contactX, contactY, penetration) {
        // Relative velocity at contact
        const relVelX = physicsB.velocity.x - physicsA.velocity.x;
        const relVelY = physicsB.velocity.y - physicsA.velocity.y;
        const relVelNormal = relVelX * normalX + relVelY * normalY;

        // Only resolve if objects are moving toward each other
        if (relVelNormal > 0) return;

        // Restitution (bounciness)
        const restitution = Math.min(physicsA.bounciness, physicsB.bounciness);

        // Friction
        const friction = Math.min(physicsA.contactFriction, physicsB.contactFriction);

        // Impulse scalar
        const impulseScalar = -(1 + restitution) * relVelNormal / (1 / physicsA.mass + 1 / physicsB.mass);

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

        // Angular impulse (torque) for both objects
        if (!physicsA.fixedPosition) {
            const rAx = contactX - objA.position.x;
            const rAy = contactY - objA.position.y;
            const torqueA = rAx * (-impulseY) - rAy * (-impulseX);
            const IA = this.getMomentOfInertia(physicsA);
            physicsA.angularVelocity += torqueA / IA;
        }
        if (!physicsB.fixedPosition) {
            const rBx = contactX - objB.position.x;
            const rBy = contactY - objB.position.y;
            const torqueB = rBx * impulseY - rBy * impulseX;
            const IB = this.getMomentOfInertia(physicsB);
            physicsB.angularVelocity += torqueB / IB;
        }

        // Separate objects to prevent overlap
        const separationAmount = Math.max(penetration * 0.5, 0.1);
        if (!physicsA.fixedPosition) {
            objA.position.x -= normalX * separationAmount;
            objA.position.y -= normalY * separationAmount;
        }
        if (!physicsB.fixedPosition) {
            objB.position.x += normalX * separationAmount;
            objB.position.y += normalY * separationAmount;
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
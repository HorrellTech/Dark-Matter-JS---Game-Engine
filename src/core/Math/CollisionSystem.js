/**
 * CollisionSystem - Handles collision detection between GameObjects
 */
class CollisionSystem {
    constructor() {
        // Store collisions from last frame for collision events
        this.lastFrameCollisions = new Set();
        this.currentFrameCollisions = new Set();
    }
    
    /**
     * Check if two bounding boxes are colliding
     * @param {Object} box1 - First bounding box {x, y, width, height, rotation}
     * @param {Object} box2 - Second bounding box {x, y, width, height, rotation}
     * @returns {boolean} True if the boxes are colliding
     */
    checkCollision(box1, box2) {
        // Handle axis-aligned bounding boxes (no rotation)
        if ((box1.rotation === 0 || box1.rotation === undefined) && 
            (box2.rotation === 0 || box2.rotation === undefined)) {
            return this.checkAABBCollision(box1, box2);
        }
        
        // Handle oriented bounding boxes (with rotation)
        return this.checkOBBCollision(box1, box2);
    }
    
    /**
     * Check collision between two axis-aligned bounding boxes
     * @param {Object} box1 - First AABB {x, y, width, height}
     * @param {Object} box2 - Second AABB {x, y, width, height}
     * @returns {boolean} True if colliding
     */
    checkAABBCollision(box1, box2) {
        // Calculate bounds for box1 (centered bounding box)
        const box1Left = box1.x - box1.width / 2;
        const box1Right = box1.x + box1.width / 2;
        const box1Top = box1.y - box1.height / 2;
        const box1Bottom = box1.y + box1.height / 2;
        
        // Calculate bounds for box2 (centered bounding box)
        const box2Left = box2.x - box2.width / 2;
        const box2Right = box2.x + box2.width / 2;
        const box2Top = box2.y - box2.height / 2;
        const box2Bottom = box2.y + box2.height / 2;
        
        // Check for overlap
        if (box1Right < box2Left || box1Left > box2Right ||
            box1Bottom < box2Top || box1Top > box2Bottom) {
            return false; // No overlap
        }
        
        return true; // Overlap exists
    }
    
    /**
     * Check collision between two oriented bounding boxes
     * @param {Object} box1 - First OBB {x, y, width, height, rotation}
     * @param {Object} box2 - Second OBB {x, y, width, height, rotation}
     * @returns {boolean} True if colliding
     */
    checkOBBCollision(box1, box2) {
        // Convert to polygon representation
        const polygon1 = this.boxToPolygon(box1);
        const polygon2 = this.boxToPolygon(box2);
        
        // Use Separating Axis Theorem (SAT) to check collision
        return this.checkSATCollision(polygon1, polygon2);
    }
    
    /**
     * Convert a bounding box to a polygon (array of vertices)
     * @param {Object} box - Bounding box {x, y, width, height, rotation}
     * @returns {Array} Array of vertices as Vector2 objects
     */
    boxToPolygon(box) {
        const halfWidth = box.width / 2;
        const halfHeight = box.height / 2;
        
        // Define corners relative to center
        const corners = [
            new Vector2(-halfWidth, -halfHeight),
            new Vector2(halfWidth, -halfHeight),
            new Vector2(halfWidth, halfHeight),
            new Vector2(-halfWidth, halfHeight)
        ];
        
        // Apply rotation and translation
        const rotationRad = (box.rotation || 0) * Math.PI / 180;
        return corners.map(corner => {
            return corner.rotate(rotationRad).add(new Vector2(box.x, box.y));
        });
    }
    
    /**
     * Check collision using Separating Axis Theorem
     * @param {Array} polygon1 - Array of Vector2 vertices
     * @param {Array} polygon2 - Array of Vector2 vertices
     * @returns {boolean} True if colliding
     */
    checkSATCollision(polygon1, polygon2) {
        // Get all axes to check
        const axes = this.getAxes(polygon1).concat(this.getAxes(polygon2));
        
        // Check projection overlap on each axis
        for (const axis of axes) {
            const projection1 = this.projectPolygon(polygon1, axis);
            const projection2 = this.projectPolygon(polygon2, axis);
            
            // If we found a separating axis, objects don't collide
            if (projection1.max < projection2.min || projection2.max < projection1.min) {
                return false;
            }
        }
        
        // No separating axis found, objects collide
        return true;
    }
    
    /**
     * Get all axes for Separating Axis Theorem check
     * @param {Array} polygon - Array of Vector2 vertices
     * @returns {Array} Array of Vector2 axes (normalized)
     */
    getAxes(polygon) {
        const axes = [];
        const vertexCount = polygon.length;
        
        for (let i = 0; i < vertexCount; i++) {
            // Get edge vector
            const p1 = polygon[i];
            const p2 = polygon[(i + 1) % vertexCount];
            const edge = p2.subtract(p1);
            
            // Get perpendicular axis (normal)
            const normal = new Vector2(-edge.y, edge.x).normalize();
            axes.push(normal);
        }
        
        return axes;
    }
    
    /**
     * Project a polygon onto an axis
     * @param {Array} polygon - Array of Vector2 vertices
     * @param {Vector2} axis - Axis to project onto
     * @returns {Object} Object with min and max projection values
     */
    projectPolygon(polygon, axis) {
        // Initialize with first vertex
        let min = polygon[0].dot(axis);
        let max = min;
        
        // Find min and max projections
        for (let i = 1; i < polygon.length; i++) {
            const projection = polygon[i].dot(axis);
            min = Math.min(min, projection);
            max = Math.max(max, projection);
        }
        
        return { min, max };
    }
    
    /**
     * Test collision between a ray and an object's bounding box
     * @param {Object} ray - Ray {origin: Vector2, direction: Vector2}
     * @param {Object} box - Bounding box {x, y, width, height, rotation}
     * @returns {Object|null} Hit information or null if no hit
     */
    raycast(ray, box) {
        if (box.rotation && box.rotation !== 0) {
            // Handle OBB (oriented bounding box)
            return this.raycastOBB(ray, box);
        } else {
            // Handle AABB (axis-aligned bounding box)
            return this.raycastAABB(ray, box);
        }
    }
    
    /**
     * Test collision between a ray and an axis-aligned bounding box
     * @param {Object} ray - Ray {origin: Vector2, direction: Vector2}
     * @param {Object} box - Box {x, y, width, height}
     * @returns {Object|null} Hit information or null if no hit
     */
    raycastAABB(ray, box) {
        // Calculate box bounds
        const minX = box.x - box.width / 2;
        const maxX = box.x + box.width / 2;
        const minY = box.y - box.height / 2;
        const maxY = box.y + box.height / 2;
        
        // Calculate ray parameters
        const rayOrigin = ray.origin;
        const rayDirection = ray.direction.normalize();
        
        // Calculate inverse direction to avoid division
        const invDirX = 1.0 / (rayDirection.x === 0 ? 0.00001 : rayDirection.x);
        const invDirY = 1.0 / (rayDirection.y === 0 ? 0.00001 : rayDirection.y);
        
        // Calculate intersection distances
        const t1 = (minX - rayOrigin.x) * invDirX;
        const t2 = (maxX - rayOrigin.x) * invDirX;
        const t3 = (minY - rayOrigin.y) * invDirY;
        const t4 = (maxY - rayOrigin.y) * invDirY;
        
        // Get min and max intersection distances
        const tMin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
        const tMax = Math.min(Math.max(t1, t2), Math.max(t3, t4));
        
        // If tMax < 0, ray is intersecting box, but entire box is behind ray origin
        if (tMax < 0) {
            return null;
        }
        
        // If tMin > tMax, ray doesn't intersect box
        if (tMin > tMax) {
            return null;
        }
        
        // If tMin < 0, ray origin is inside the box
        const t = tMin < 0 ? tMax : tMin;
        
        // Calculate hit position and normal
        const hitPosition = rayOrigin.add(rayDirection.multiply(t));
        
        // Calculate hit normal based on which face was hit
        let normal;
        const epsilon = 0.001; // Small value for floating-point comparison
        
        if (Math.abs(hitPosition.x - minX) < epsilon) {
            normal = new Vector2(-1, 0); // Left face
        } else if (Math.abs(hitPosition.x - maxX) < epsilon) {
            normal = new Vector2(1, 0); // Right face
        } else if (Math.abs(hitPosition.y - minY) < epsilon) {
            normal = new Vector2(0, -1); // Top face
        } else {
            normal = new Vector2(0, 1); // Bottom face
        }
        
        return {
            distance: t,
            position: hitPosition,
            normal: normal
        };
    }
    
    /**
     * Test collision between a ray and an oriented bounding box
     * @param {Object} ray - Ray {origin: Vector2, direction: Vector2}
     * @param {Object} box - Box {x, y, width, height, rotation}
     * @returns {Object|null} Hit information or null if no hit
     */
    raycastOBB(ray, box) {
        // Convert to local space where OBB becomes AABB
        const rotationRad = -(box.rotation * Math.PI / 180);
        const boxCenter = new Vector2(box.x, box.y);
        
        // Transform ray to local space
        const localOrigin = ray.origin.subtract(boxCenter).rotate(rotationRad);
        const localDirection = ray.direction.rotate(rotationRad);
        
        // Create local space ray
        const localRay = {
            origin: localOrigin,
            direction: localDirection
        };
        
        // Create local space AABB
        const localBox = {
            x: 0,
            y: 0,
            width: box.width,
            height: box.height,
            rotation: 0
        };
        
        // Test against local space AABB
        const hit = this.raycastAABB(localRay, localBox);
        
        if (!hit) return null;
        
        // Transform hit back to world space
        const worldHitPos = hit.position.rotate(-rotationRad).add(boxCenter);
        const worldHitNormal = hit.normal.rotate(-rotationRad);
        
        return {
            distance: hit.distance,
            position: worldHitPos,
            normal: worldHitNormal
        };
    }
    
    /**
     * Update the collision system for the current frame
     * @param {Array} gameObjects - All active game objects
     */
    update(gameObjects) {
        // Store last frame's collisions
        this.lastFrameCollisions = new Set(this.currentFrameCollisions);
        this.currentFrameCollisions.clear();
        
        // Check collisions between all pairs of objects
        const objCount = gameObjects.length;
        
        for (let i = 0; i < objCount; i++) {
            const objA = gameObjects[i];
            
            if (!objA.active || !objA.collisionEnabled) continue;
            
            for (let j = i + 1; j < objCount; j++) {
                const objB = gameObjects[j];
                
                if (!objB.active || !objB.collisionEnabled) continue;
                
                // Skip collision check if they're on non-colliding layers
                if ((objA.collisionLayer & objB.collisionMask) === 0 && 
                    (objB.collisionLayer & objA.collisionMask) === 0) {
                    continue;
                }
                
                // Get bounding boxes
                const boxA = objA.getBoundingBox();
                const boxB = objB.getBoundingBox();
                
                // Check collision
                if (this.checkCollision(boxA, boxB)) {
                    // Create a unique identifier for this collision pair
                    const collisionId = `${objA.id}_${objB.id}`;
                    
                    // Store in current frame collisions
                    this.currentFrameCollisions.add(collisionId);
                    
                    // Check if this is a new collision (enter)
                    const isNewCollision = !this.lastFrameCollisions.has(collisionId);
                    
                    // Trigger collision events
                    if (isNewCollision) {
                        this.triggerCollisionEnter(objA, objB);
                    } else {
                        this.triggerCollisionStay(objA, objB);
                    }
                }
            }
        }
        
        // Check for collision exit events
        for (const collisionId of this.lastFrameCollisions) {
            if (!this.currentFrameCollisions.has(collisionId)) {
                // This collision was present last frame but not this frame
                const [idA, idB] = collisionId.split('_');
                
                // Find the objects by ID
                const objA = gameObjects.find(obj => obj.id === idA);
                const objB = gameObjects.find(obj => obj.id === idB);
                
                // Trigger exit event if objects still exist
                if (objA && objB) {
                    this.triggerCollisionExit(objA, objB);
                }
            }
        }
    }
    
    /**
     * Trigger collision enter event
     * @param {GameObject} objA - First object
     * @param {GameObject} objB - Second object
     */
    triggerCollisionEnter(objA, objB) {
        // Call event methods on both objects if they exist
        if (objA.onCollisionEnter) objA.onCollisionEnter(objB);
        if (objB.onCollisionEnter) objB.onCollisionEnter(objA);
        
        // Also trigger events on modules
        this.triggerModuleCollisionEvents(objA, objB, 'onCollisionEnter');
        this.triggerModuleCollisionEvents(objB, objA, 'onCollisionEnter');
    }
    
    /**
     * Trigger collision stay event
     * @param {GameObject} objA - First object
     * @param {GameObject} objB - Second object 
     */
    triggerCollisionStay(objA, objB) {
        if (objA.onCollisionStay) objA.onCollisionStay(objB);
        if (objB.onCollisionStay) objB.onCollisionStay(objA);
        
        this.triggerModuleCollisionEvents(objA, objB, 'onCollisionStay');
        this.triggerModuleCollisionEvents(objB, objA, 'onCollisionStay');
    }
    
    /**
     * Trigger collision exit event
     * @param {GameObject} objA - First object
     * @param {GameObject} objB - Second object
     */
    triggerCollisionExit(objA, objB) {
        if (objA.onCollisionExit) objA.onCollisionExit(objB);
        if (objB.onCollisionExit) objB.onCollisionExit(objA);
        
        this.triggerModuleCollisionEvents(objA, objB, 'onCollisionExit');
        this.triggerModuleCollisionEvents(objB, objA, 'onCollisionExit');
    }
    
    /**
     * Trigger collision events on modules
     * @param {GameObject} obj - Object with modules
     * @param {GameObject} other - Other colliding object
     * @param {string} eventName - Name of event to trigger
     */
    triggerModuleCollisionEvents(obj, other, eventName) {
        if (!obj.modules) return;
        
        obj.modules.forEach(module => {
            if (module.enabled && typeof module[eventName] === 'function') {
                try {
                    module[eventName](other);
                } catch (error) {
                    console.error(`Error in ${eventName} event for module ${module.type || module.constructor.name}:`, error);
                }
            }
        });
    }
}

// Create a global instance
window.collisionSystem = new CollisionSystem;
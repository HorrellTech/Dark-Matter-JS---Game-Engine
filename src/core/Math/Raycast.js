/**
 * Raycast - Utility for raycasting in 2D space
 */
class Raycast {
    /**
     * Cast a ray against all objects in the scene
     * @param {Vector2} origin - Starting point of the ray
     * @param {Vector2} direction - Direction of the ray
     * @param {number} [maxDistance=Infinity] - Maximum distance to check
     * @param {Array} [gameObjects=[]] - GameObjects to check against
     * @param {number} [layerMask=0xFFFF] - Layer mask for filtering objects
     * @param {GameObject} [ignoreObject=null] - Object to ignore during raycast (usually the caller)
     * @returns {Object|null} Hit information or null if no hit
     */
    static cast(origin, direction, maxDistance = Infinity, gameObjects = window.engine.gameObjects ? window.engine.gameObjects : [], 
        layerMask = 0xFFFF, ignoreObject = null) {
        // Normalize the direction
        const normalizedDirection = direction.normalize();
        
        // Create the ray
        const ray = {
            origin: origin,
            direction: normalizedDirection
        };
        
        // Variables to track the closest hit
        let closestHit = null;
        let closestDistance = maxDistance;
        let hitObject = null;
        
        // Check all active game objects
        for (const obj of gameObjects) {
            if (!obj.active || !obj.collisionEnabled) {
                continue;
            }
            
            // Skip the ignored object (usually the caller)
            if (ignoreObject && obj === ignoreObject) {
                continue;
            }
            
            // Apply layer mask filtering
            if ((obj.collisionLayer & layerMask) === 0) {
                continue;
            }
            
            let hit = null;
            
            // Priority 1: Check Matter.js RigidBody collision if available
            const rigidbodyModule = obj.getModule('RigidBody');
            if (rigidbodyModule && rigidbodyModule.body && window.physicsManager) {
                // Additional check: if ignoreObject has a rigidbody, skip bodies that match
                if (ignoreObject) {
                    const ignoreRigidbody = ignoreObject.getModule('RigidBody');
                    if (ignoreRigidbody && ignoreRigidbody.body === rigidbodyModule.body) {
                        continue;
                    }
                }
                hit = this.raycastMatterBody(ray, rigidbodyModule.body, maxDistance);
            }
            
            // Priority 2: Check polygon collision if enabled and no Matter.js hit
            if (!hit && obj.usePolygonCollision && obj.polygon) {
                hit = this.raycastPolygon(ray, obj.polygon, maxDistance);
            }
            
            // Priority 3: Check rectangle collision if enabled and no previous hit
            if (!hit && obj.useCollisions) {
                const box = obj.getBoundingBox();
                hit = this.raycastRectangle(ray, box, maxDistance);
            }
            
            // If we hit something and it's closer than previous hits
            if (hit && hit.distance < closestDistance) {
                closestHit = hit;
                closestDistance = hit.distance;
                hitObject = obj;
            }
        }
        
        // Return null if no hit found
        if (!closestHit) {
            return null;
        }
        
        // Add the hit object to the result
        closestHit.object = hitObject;
        
        return closestHit;
    }
    
    /**
     * Cast a ray and return all objects that are hit
     * @param {Vector2} origin - Starting point of the ray
     * @param {Vector2} direction - Direction of the ray
     * @param {number} [maxDistance=Infinity] - Maximum distance to check
     * @param {Array} [gameObjects=[]] - GameObjects to check against
     * @param {number} [layerMask=0xFFFF] - Layer mask for filtering objects
     * @param {GameObject} [ignoreObject=null] - Object to ignore during raycast (usually the caller)
     * @returns {Array} Array of hit information
     */
    static castAll(origin, direction, maxDistance = Infinity, gameObjects = [], layerMask = 0xFFFF, ignoreObject = null) {
        // Normalize the direction
        const normalizedDirection = direction.normalize();
        
        // Create the ray
        const ray = {
            origin: origin,
            direction: normalizedDirection
        };
        
        // Array to store all hits
        const hits = [];
        
        // Check all active game objects
        for (const obj of gameObjects) {
            if (!obj.active || (!obj.useCollisions && !obj.usePolygonCollision) || obj !=== this.gameObject) {
                continue;
            }
            
            // Skip the ignored object (usually the caller)
            if (ignoreObject && obj === ignoreObject) {
                continue;
            }
            
            // Apply layer mask filtering
            if ((obj.collisionLayer & layerMask) === 0) {
                continue;
            }
            
            let hit = null;
            
            // Priority 1: Check Matter.js RigidBody collision if available
            const rigidbodyModule = obj.getModule('RigidBody');
            if (rigidbodyModule && rigidbodyModule.body && window.physicsManager) {
                // Additional check: if ignoreObject has a rigidbody, skip bodies that match
                if (ignoreObject) {
                    const ignoreRigidbody = ignoreObject.getModule('RigidBody');
                    if (ignoreRigidbody && ignoreRigidbody.body === rigidbodyModule.body) {
                        continue;
                    }
                }
                hit = this.raycastMatterBody(ray, rigidbodyModule.body, maxDistance);
            }
            
            // Priority 2: Check polygon collision if enabled and no Matter.js hit
            if (!hit && obj.usePolygonCollision && obj.polygon) {
                hit = this.raycastPolygon(ray, obj.polygon, maxDistance);
            }
            
            // Priority 3: Check rectangle collision if enabled and no previous hit
            if (!hit && obj.useCollisions) {
                const box = obj.getBoundingBox();
                hit = this.raycastRectangle(ray, box, maxDistance);
            }
            
            // If we hit something within the max distance
            if (hit && hit.distance <= maxDistance) {
                // Add the hit object to the result
                hit.object = obj;
                hits.push(hit);
            }
        }
        
        // Sort hits by distance
        hits.sort((a, b) => a.distance - b.distance);
        
        return hits;
    }
    
    /**
     * Perform raycast against a Matter.js physics body
     * @param {Object} ray - Ray with origin and direction
     * @param {Matter.Body} body - Matter.js body to test against
     * @param {number} maxDistance - Maximum distance to check
     * @returns {Object|null} Hit information or null
     */
    static raycastMatterBody(ray, body, maxDistance) {
        // Create a very long line segment from the ray
        const endPoint = {
            x: ray.origin.x + ray.direction.x * maxDistance,
            y: ray.origin.y + ray.direction.y * maxDistance
        };
        
        // Test ray against body vertices
        const vertices = body.vertices;
        let closestHit = null;
        let closestDistance = maxDistance;
        
        // Check each edge of the body
        for (let i = 0; i < vertices.length; i++) {
            const v1 = vertices[i];
            const v2 = vertices[(i + 1) % vertices.length];
            
            const intersection = this.lineLineIntersection(
                ray.origin, endPoint,
                v1, v2
            );
            
            if (intersection) {
                const distance = Math.sqrt(
                    Math.pow(intersection.x - ray.origin.x, 2) +
                    Math.pow(intersection.y - ray.origin.y, 2)
                );
                
                if (distance < closestDistance && distance > 0.001) { // Small epsilon to avoid self-intersection
                    closestDistance = distance;
                    
                    // Calculate normal for this edge
                    const edgeVector = { x: v2.x - v1.x, y: v2.y - v1.y };
                    const normal = {
                        x: -edgeVector.y,
                        y: edgeVector.x
                    };
                    const normalLength = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
                    normal.x /= normalLength;
                    normal.y /= normalLength;
                    
                    // Ensure normal points outward
                    const centerToHit = {
                        x: intersection.x - body.position.x,
                        y: intersection.y - body.position.y
                    };
                    if (normal.x * centerToHit.x + normal.y * centerToHit.y < 0) {
                        normal.x = -normal.x;
                        normal.y = -normal.y;
                    }
                    
                    closestHit = {
                        position: new Vector2(intersection.x, intersection.y),
                        normal: new Vector2(normal.x, normal.y),
                        distance: distance
                    };
                }
            }
        }
        
        return closestHit;
    }
    
    /**
     * Perform raycast against a polygon
     * @param {Object} ray - Ray with origin and direction
     * @param {Polygon} polygon - Polygon to test against
     * @param {number} maxDistance - Maximum distance to check
     * @returns {Object|null} Hit information or null
     */
    static raycastPolygon(ray, polygon, maxDistance) {
        if (!polygon || !polygon.points) return null;
        
        const endPoint = {
            x: ray.origin.x + ray.direction.x * maxDistance,
            y: ray.origin.y + ray.direction.y * maxDistance
        };
        
        let closestHit = null;
        let closestDistance = maxDistance;
        
        // Check each edge of the polygon
        for (let i = 0; i < polygon.points.length; i++) {
            const p1 = polygon.points[i];
            const p2 = polygon.points[(i + 1) % polygon.points.length];
            
            const intersection = this.lineLineIntersection(
                ray.origin, endPoint,
                p1, p2
            );
            
            if (intersection) {
                const distance = Math.sqrt(
                    Math.pow(intersection.x - ray.origin.x, 2) +
                    Math.pow(intersection.y - ray.origin.y, 2)
                );
                
                if (distance < closestDistance && distance > 0.001) {
                    closestDistance = distance;
                    
                    // Calculate normal for this edge
                    const edgeVector = { x: p2.x - p1.x, y: p2.y - p1.y };
                    const normal = {
                        x: -edgeVector.y,
                        y: edgeVector.x
                    };
                    const normalLength = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
                    normal.x /= normalLength;
                    normal.y /= normalLength;
                    
                    // Ensure normal points outward (toward ray origin)
                    const centerToHit = {
                        x: intersection.x - polygon.position.x,
                        y: intersection.y - polygon.position.y
                    };
                    if (normal.x * centerToHit.x + normal.y * centerToHit.y < 0) {
                        normal.x = -normal.x;
                        normal.y = -normal.y;
                    }
                    
                    closestHit = {
                        position: new Vector2(intersection.x, intersection.y),
                        normal: new Vector2(normal.x, normal.y),
                        distance: distance
                    };
                }
            }
        }
        
        return closestHit;
    }
    
    /**
     * Perform raycast against a rectangle bounding box
     * @param {Object} ray - Ray with origin and direction
     * @param {Object} box - Bounding box with x, y, width, height, rotation
     * @param {number} maxDistance - Maximum distance to check
     * @returns {Object|null} Hit information or null
     */
    static raycastRectangle(ray, box, maxDistance) {
        // Create rectangle corners
        const halfWidth = box.width / 2;
        const halfHeight = box.height / 2;
        const centerX = box.x + halfWidth;
        const centerY = box.y + halfHeight;
        
        let corners = [
            { x: -halfWidth, y: -halfHeight },
            { x: halfWidth, y: -halfHeight },
            { x: halfWidth, y: halfHeight },
            { x: -halfWidth, y: halfHeight }
        ];
        
        // Apply rotation if present
        if (box.rotation && box.rotation !== 0) {
            const cos = Math.cos(box.rotation * Math.PI / 180);
            const sin = Math.sin(box.rotation * Math.PI / 180);
            
            corners = corners.map(corner => ({
                x: centerX + (corner.x * cos - corner.y * sin),
                y: centerY + (corner.x * sin + corner.y * cos)
            }));
        } else {
            corners = corners.map(corner => ({
                x: centerX + corner.x,
                y: centerY + corner.y
            }));
        }
        
        const endPoint = {
            x: ray.origin.x + ray.direction.x * maxDistance,
            y: ray.origin.y + ray.direction.y * maxDistance
        };
        
        let closestHit = null;
        let closestDistance = maxDistance;
        
        // Check each edge of the rectangle
        for (let i = 0; i < corners.length; i++) {
            const p1 = corners[i];
            const p2 = corners[(i + 1) % corners.length];
            
            const intersection = this.lineLineIntersection(
                ray.origin, endPoint,
                p1, p2
            );
            
            if (intersection) {
                const distance = Math.sqrt(
                    Math.pow(intersection.x - ray.origin.x, 2) +
                    Math.pow(intersection.y - ray.origin.y, 2)
                );
                
                if (distance < closestDistance && distance > 0.001) {
                    closestDistance = distance;
                    
                    // Calculate normal for this edge
                    const edgeVector = { x: p2.x - p1.x, y: p2.y - p1.y };
                    const normal = {
                        x: -edgeVector.y,
                        y: edgeVector.x
                    };
                    const normalLength = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
                    normal.x /= normalLength;
                    normal.y /= normalLength;
                    
                    // Ensure normal points outward
                    const centerToHit = {
                        x: intersection.x - centerX,
                        y: intersection.y - centerY
                    };
                    if (normal.x * centerToHit.x + normal.y * centerToHit.y < 0) {
                        normal.x = -normal.x;
                        normal.y = -normal.y;
                    }
                    
                    closestHit = {
                        position: new Vector2(intersection.x, intersection.y),
                        normal: new Vector2(normal.x, normal.y),
                        distance: distance
                    };
                }
            }
        }
        
        return closestHit;
    }
    
    /**
     * Find intersection point between two line segments
     * @param {Object} line1Start - Start point of first line
     * @param {Object} line1End - End point of first line
     * @param {Object} line2Start - Start point of second line
     * @param {Object} line2End - End point of second line
     * @returns {Object|null} Intersection point or null
     */
    static lineLineIntersection(line1Start, line1End, line2Start, line2End) {
        const x1 = line1Start.x, y1 = line1Start.y;
        const x2 = line1End.x, y2 = line1End.y;
        const x3 = line2Start.x, y3 = line2Start.y;
        const x4 = line2End.x, y4 = line2End.y;
        
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 1e-10) return null; // Lines are parallel
        
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
        
        // Check if intersection occurs within both line segments
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: x1 + t * (x2 - x1),
                y: y1 + t * (y2 - y1)
            };
        }
        
        return null;
    }
    
    /**
     * Draw a ray in the scene for debugging
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {Vector2} origin - Starting point of the ray
     * @param {Vector2} direction - Direction of the ray
     * @param {number} [length=100] - Length of the ray to draw
     * @param {string} [color='#ff0000'] - Color of the ray
     * @param {boolean} [showHit=true] - Whether to show hit information
     * @param {Array} [gameObjects=[]] - GameObjects to check against
     * @param {GameObject} [ignoreObject=null] - Object to ignore during raycast
     */
    static drawRay(ctx, origin, direction, length = 100, color = '#ff0000', showHit = true, gameObjects = [], ignoreObject = null) {
        // Draw the ray line
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        
        // If we want to show hit information and have objects to check against
        if (showHit && gameObjects.length > 0) {
            const hit = Raycast.cast(origin, direction, length, gameObjects, 0xFFFF, ignoreObject);
            
            if (hit) {
                // Draw line to hit point
                ctx.lineTo(hit.position.x, hit.position.y);
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.stroke();
                
                // Draw hit point
                ctx.beginPath();
                ctx.arc(hit.position.x, hit.position.y, 3, 0, Math.PI * 2);
                ctx.fillStyle = '#ffcc00';
                ctx.fill();
                
                // Draw normal vector
                ctx.beginPath();
                ctx.moveTo(hit.position.x, hit.position.y);
                ctx.lineTo(
                    hit.position.x + hit.normal.x * 10,
                    hit.position.y + hit.normal.y * 10
                );
                ctx.strokeStyle = '#00ccff';
                ctx.lineWidth = 1;
                ctx.stroke();
                
                return;
            }
        }
        
        // If no hit, or not showing hit, draw the full ray
        const endPoint = origin.add(direction.normalize().multiply(length));
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

// Make Raycast available globally
window.Raycast = Raycast;
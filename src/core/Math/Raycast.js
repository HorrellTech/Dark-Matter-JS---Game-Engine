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
     * @returns {Object|null} Hit information or null if no hit
     */
    static cast(origin, direction, maxDistance = Infinity, gameObjects = [], layerMask = 0xFFFF) {
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
            
            // Apply layer mask filtering
            if ((obj.collisionLayer & layerMask) === 0) {
                continue;
            }
            
            // Get the object's bounding box
            const box = obj.getBoundingBox();
            
            // Test ray against the box
            const hit = window.collisionSystem.raycast(ray, box);
            
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
     * @returns {Array} Array of hit information
     */
    static castAll(origin, direction, maxDistance = Infinity, gameObjects = [], layerMask = 0xFFFF) {
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
            if (!obj.active || !obj.collisionEnabled) {
                continue;
            }
            
            // Apply layer mask filtering
            if ((obj.collisionLayer & layerMask) === 0) {
                continue;
            }
            
            // Get the object's bounding box
            const box = obj.getBoundingBox();
            
            // Test ray against the box
            const hit = window.collisionSystem.raycast(ray, box);
            
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
     * Draw a ray in the scene for debugging
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {Vector2} origin - Starting point of the ray
     * @param {Vector2} direction - Direction of the ray
     * @param {number} [length=100] - Length of the ray to draw
     * @param {string} [color='#ff0000'] - Color of the ray
     * @param {boolean} [showHit=true] - Whether to show hit information
     * @param {Array} [gameObjects=[]] - GameObjects to check against
     */
    static drawRay(ctx, origin, direction, length = 100, color = '#ff0000', showHit = true, gameObjects = []) {
        // Draw the ray line
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        
        // If we want to show hit information and have objects to check against
        if (showHit && gameObjects.length > 0) {
            const hit = Raycast.cast(origin, direction, length, gameObjects);
            
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
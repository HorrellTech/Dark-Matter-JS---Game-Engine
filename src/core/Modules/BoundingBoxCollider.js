/**
 * BoundingBoxCollider - A module for specifying custom bounding box collision
 */
class BoundingBoxCollider extends Module {
    static namespace = "Colliders/BoundingBoxCollider";
    static description = "A module for specifying custom bounding box collision";

    constructor() {
        super("BoundingBoxCollider");
        
        /** @type {number} Width of the collider */
        this.width = 50;
        
        /** @type {number} Height of the collider */
        this.height = 50;
        
        /** @type {Vector2} Offset from the GameObject center */
        this.offset = new Vector2(0, 0);
        
        /** @type {boolean} Whether to show the collider in the editor */
        this.showCollider = true;
        
        /** @type {boolean} Whether the collider is a trigger (doesn't cause physics responses) */
        this.isTrigger = false;
        
        // Exposed properties
        this.exposeProperty("width", "number", 50, {
            min: 1,
            max: 1000,
            step: 1,
            description: "Width of the collider"
        });
        
        this.exposeProperty("height", "number", 50, {
            min: 1,
            max: 1000,
            step: 1,
            description: "Height of the collider"
        });
        
        this.exposeProperty("offset", "vector2", new Vector2(0, 0), {
            description: "Offset from the GameObject center"
        });
        
        this.exposeProperty("showCollider", "boolean", true, {
            description: "Whether to show the collider in the editor"
        });
        
        this.exposeProperty("isTrigger", "boolean", false, {
            description: "Trigger colliders don't cause physics responses"
        });
    }
    
    /**
     * Get required modules
     * @returns {Array} Array of required module names
     */
    getRequirements() {
        return [];
    }
    
    /**
     * Called when module starts
     */
    start() {
        // Override the GameObject's getBoundingBox method to use this collider's dimensions
        const originalGetBoundingBox = this.gameObject.getBoundingBox;
        const collider = this;
        
        this.gameObject.getBoundingBox = function() {
            if (!collider.enabled) {
                return originalGetBoundingBox.call(this);
            }
            
            const worldPos = this.getWorldPosition();
            const worldScale = this.getWorldScale();
            const worldAngle = this.getWorldRotation();
            
            // Apply offset - need to account for rotation
            const offsetX = collider.offset.x * worldScale.x;
            const offsetY = collider.offset.y * worldScale.y;
            
            // Create rotation matrix
            const rad = worldAngle * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            
            // Rotate the offset
            const rotatedOffsetX = offsetX * cos - offsetY * sin;
            const rotatedOffsetY = offsetX * sin + offsetY * cos;
            
            // Calculate effective width and height
            const effectiveWidth = collider.width * worldScale.x;
            const effectiveHeight = collider.height * worldScale.y;
            
            // Calculate center with offset applied
            const centerX = worldPos.x + rotatedOffsetX;
            const centerY = worldPos.y + rotatedOffsetY;
            
            return {
                x: centerX,
                y: centerY,
                width: effectiveWidth,
                height: effectiveHeight,
                rotation: worldAngle,
                isTrigger: collider.isTrigger
            };
        };
    }
    
    /**
     * Called when the module is disabled
     */
    onDisable() {
        // Restore original getBoundingBox method if possible
        if (this.gameObject && this.gameObject._originalGetBoundingBox) {
            this.gameObject.getBoundingBox = this.gameObject._originalGetBoundingBox;
        }
    }
    
    /**
     * Draw the collider in the editor
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    draw(ctx) {
        if (!this.enabled || !this.showCollider) return;
        
        // Draw the collider outline
        const w = this.width;
        const h = this.height;
        const ox = this.offset.x;
        const oy = this.offset.y;
        
        ctx.save();
        
        // Move to offset
        ctx.translate(ox, oy);
        
        // Draw bounding box
        ctx.beginPath();
        ctx.rect(-w/2, -h/2, w, h);
        
        // Use different styles for triggers vs solid colliders
        if (this.isTrigger) {
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = '#00ffff80';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.setLineDash([]);
        } else {
            ctx.strokeStyle = '#00ff0080';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Add slight fill for solid colliders
            ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    /**
     * Override to handle serialization
     * @returns {Object} Serialized data
     */
    toJSON() {
        const json = super.toJSON();
        
        json.width = this.width;
        json.height = this.height;
        json.offset = { x: this.offset.x, y: this.offset.y };
        json.showCollider = this.showCollider;
        json.isTrigger = this.isTrigger;
        
        return json;
    }
    
    /**
     * Clone this module
     * @returns {BoundingBoxCollider} A new instance of this module
     */
    clone() {
        const cloned = new BoundingBoxCollider();
        cloned.width = this.width;
        cloned.height = this.height;
        cloned.offset = new Vector2(this.offset.x, this.offset.y);
        cloned.showCollider = this.showCollider;
        cloned.isTrigger = this.isTrigger;
        return cloned;
    }
}

// Register the module
window.BoundingBoxCollider = BoundingBoxCollider;
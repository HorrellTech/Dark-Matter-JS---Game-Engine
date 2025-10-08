/**
 * Wolf3DObject - Object module for Wolf3D-style games
 *
 * Renders objects as sprites in 3D space with proper depth sorting.
 * Designed for classic FPS-style gameplay similar to Wolfenstein 3D.
 */
class Wolf3DObject extends Module {
    static namespace = "Wolf3D";
    static iconClass = "fas fa-cube";

    constructor() {
        super("Wolf3DObject");

        // Object properties
        this.sprite = null; // Sprite texture image
        this.width = 32; // Object width in world units
        this.height = 32; // Object height in world units
        this.isSolid = false; // Whether the object blocks movement
        this.collisionRadius = 8; // Radius for collision detection

        // Visual properties
        this.scale = 1.0; // Scale multiplier for sprite
        this.brightness = 1.0; // Brightness multiplier
        this.opacity = 1.0; // Transparency (0-1)

        // Animation properties
        this.animate = false;
        this.animationSpeed = 1.0;
        this.frameCount = 1; // Number of animation frames
        this.currentFrame = 0;
        this.animationOffset = 0;

        // Billboard behavior (sprite always faces camera)
        this.billboard = true; // Whether sprite rotates to face camera
        this.billboardAxis = 'y'; // 'y' for vertical billboard, 'all' for full billboard

        // Depth sorting
        this.depthOffset = 0; // Offset for depth sorting

        // Lighting properties
        this.ambientOcclusion = 0.3; // How much ambient light affects this object
        this.receiveShadows = true; // Whether this object can be shadowed

        // Interaction properties
        this.interactive = false; // Whether player can interact with this object
        this.interactionDistance = 32; // Distance at which interaction is possible

        // Expose properties for editor
        this.exposeProperty("sprite", "asset", null, {
            onChange: (val) => this.sprite = val
        });
        this.exposeProperty("width", "number", 32, {
            min: 1, max: 200, onChange: (val) => this.width = val
        });
        this.exposeProperty("height", "number", 32, {
            min: 1, max: 200, onChange: (val) => this.height = val
        });
        this.exposeProperty("isSolid", "boolean", false, {
            onChange: (val) => this.isSolid = val
        });
        this.exposeProperty("collisionRadius", "number", 8, {
            min: 1, max: 50, onChange: (val) => this.collisionRadius = val
        });
        this.exposeProperty("scale", "number", 1.0, {
            min: 0.1, max: 5, step: 0.1, onChange: (val) => this.scale = val
        });
        this.exposeProperty("brightness", "number", 1.0, {
            min: 0.1, max: 3, step: 0.1, onChange: (val) => this.brightness = val
        });
        this.exposeProperty("opacity", "number", 1.0, {
            min: 0, max: 1, step: 0.1, onChange: (val) => this.opacity = val
        });
        this.exposeProperty("billboard", "boolean", true, {
            onChange: (val) => this.billboard = val
        });
        this.exposeProperty("billboardAxis", "dropdown", "y", {
            options: ["y", "all"], onChange: (val) => this.billboardAxis = val
        });
        this.exposeProperty("animate", "boolean", false, {
            onChange: (val) => this.animate = val
        });
        this.exposeProperty("animationSpeed", "number", 1.0, {
            min: 0.1, max: 5, step: 0.1, onChange: (val) => this.animationSpeed = val
        });
        this.exposeProperty("frameCount", "number", 1, {
            min: 1, max: 16, onChange: (val) => this.frameCount = val
        });
        this.exposeProperty("interactive", "boolean", false, {
            onChange: (val) => this.interactive = val
        });
        this.exposeProperty("interactionDistance", "number", 32, {
            min: 1, max: 100, onChange: (val) => this.interactionDistance = val
        });
    }

    start() {
        // Initialize object properties
        if (this.gameObject) {
            // Set collision size based on object dimensions
            this.gameObject.size.x = this.width;
            this.gameObject.size.y = this.height;
        }
    }

    loop(deltaTime) {
        // Update animation if enabled
        if (this.animate && this.frameCount > 1) {
            this.animationOffset += deltaTime * this.animationSpeed;
            this.currentFrame = Math.floor(this.animationOffset) % this.frameCount;
        }

        // Update billboard rotation if enabled
        if (this.billboard) {
            this.updateBillboard();
        }
    }

    /**
     * Update billboard rotation to face camera
     */
    updateBillboard() {
        if (!this.gameObject) return;

        // Find the active Wolf3D camera
        const camera = this.getActiveCamera();
        if (!camera) return;

        // Calculate direction from object to camera
        const dx = camera.position.x - this.gameObject.position.x;
        const dy = camera.position.y - this.gameObject.position.y;

        if (this.billboardAxis === 'all') {
            // Full billboard - rotate in all directions
            this.gameObject.angle = Math.atan2(dy, dx) * 180 / Math.PI;
        } else if (this.billboardAxis === 'y') {
            // Vertical billboard - only rotate around Y axis
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            this.gameObject.angle = angle;
        }
    }

    /**
     * Get the active Wolf3D camera
     */
    getActiveCamera() {
        const allObjects = this.getAllGameObjects();
        for (const obj of allObjects) {
            const camera = obj.getModule("Wolf3DCamera");
            if (camera && camera.isActive) {
                return camera;
            }
        }
        return null;
    }

    /**
     * Render this object as a sprite in the Wolf3D view
     * @param {CanvasRenderingContext2D} ctx - The rendering context
     * @param {number} screenX - X position on screen
     * @param {number} screenY - Y position on screen
     * @param {number} distance - Distance from camera
     * @param {number} scale - Scale factor based on distance
     */
    drawSprite(ctx, screenX, screenY, distance, scale) {
        if (!this.sprite || !this.sprite.width || !this.sprite.height) return;

        // Calculate sprite dimensions on screen
        const spriteWidth = this.width * scale * this.scale;
        const spriteHeight = this.height * scale * this.scale;

        // Calculate screen position
        const drawX = screenX - spriteWidth / 2;
        const drawY = screenY - spriteHeight / 2;

        // Check if sprite is visible on screen
        if (drawX + spriteWidth < 0 || drawX >= ctx.canvas.width ||
            drawY + spriteHeight < 0 || drawY >= ctx.canvas.height) {
            return;
        }

        ctx.save();

        // Apply distance-based shading (fog)
        const shadeFactor = Math.max(0.1, 1.0 - distance / 1000);
        const brightness = this.brightness * shadeFactor;

        if (brightness < 1.0) {
            // Apply brightness adjustment
            ctx.filter = `brightness(${brightness})`;
        }

        // Apply opacity
        ctx.globalAlpha = this.opacity;

        // Calculate which frame to draw for animation
        let frameX = 0;
        if (this.frameCount > 1) {
            const frameWidth = this.sprite.width / this.frameCount;
            frameX = Math.floor(this.currentFrame) * frameWidth;
        }

        // Draw the sprite
        ctx.drawImage(
            this.sprite,
            frameX, 0, // Source rectangle
            this.sprite.width / this.frameCount, this.sprite.height,
            drawX, drawY, // Destination position
            spriteWidth, spriteHeight // Destination size
        );

        ctx.restore();
    }

    /**
     * Get the object's bounding box for collision detection
     */
    getBoundingBox() {
        if (!this.gameObject) return { x: 0, y: 0, width: 0, height: 0 };

        return {
            x: this.gameObject.position.x - this.collisionRadius,
            y: this.gameObject.position.y - this.collisionRadius,
            width: this.collisionRadius * 2,
            height: this.collisionRadius * 2
        };
    }

    /**
     * Check if a point is inside this object
     */
    containsPoint(x, y) {
        if (!this.gameObject) return false;

        const dx = x - this.gameObject.position.x;
        const dy = y - this.gameObject.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance <= this.collisionRadius;
    }

    /**
     * Check if this object can be interacted with from a given position
     */
    canInteractFrom(x, y) {
        if (!this.interactive || !this.gameObject) return false;

        const dx = x - this.gameObject.position.x;
        const dy = y - this.gameObject.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance <= this.interactionDistance;
    }

    /**
     * Interact with this object (can be overridden by subclasses)
     */
    interact() {
        if (!this.interactive) return;

        console.log(`Interacting with ${this.gameObject.name}`);

        // Default interaction behavior - can be overridden
        // Could trigger events, open doors, pick up items, etc.
    }

    draw(ctx) {
        // Object rendering is handled by the Wolf3DRenderer
        // This method can be used for debug drawing if needed
    }

    drawGizmos(ctx) {
        if (!this.gameObject) return;

        ctx.save();
        ctx.translate(this.gameObject.position.x, this.gameObject.position.y);
        ctx.rotate(this.gameObject.angle * Math.PI / 180);

        // Draw object as a rectangle
        ctx.strokeStyle = this.isSolid ? '#ff0000' : '#00ffff';
        ctx.lineWidth = 2;
        ctx.setLineDash(this.isSolid ? [] : [5, 5]);
        ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.setLineDash([]);

        // Draw collision radius
        if (this.isSolid || this.collisionRadius > 0) {
            ctx.strokeStyle = this.isSolid ? '#ff0000' : '#ffff00';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(0, 0, this.collisionRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw interaction radius if interactive
        if (this.interactive) {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.arc(0, 0, this.interactionDistance, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();

        // Draw sprite preview if available
        if (this.sprite && this.sprite.width > 0) {
            const previewSize = Math.min(32, Math.max(this.width, this.height));
            ctx.save();
            ctx.globalAlpha = 0.7;
            ctx.translate(this.gameObject.position.x, this.gameObject.position.y - this.height / 2 - previewSize - 5);
            ctx.drawImage(this.sprite, -previewSize / 2, -previewSize / 2, previewSize, previewSize);
            ctx.restore();
        }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            width: this.width,
            height: this.height,
            isSolid: this.isSolid,
            collisionRadius: this.collisionRadius,
            scale: this.scale,
            brightness: this.brightness,
            opacity: this.opacity,
            billboard: this.billboard,
            billboardAxis: this.billboardAxis,
            animate: this.animate,
            animationSpeed: this.animationSpeed,
            frameCount: this.frameCount,
            interactive: this.interactive,
            interactionDistance: this.interactionDistance,
            depthOffset: this.depthOffset
        };
    }

    fromJSON(json) {
        super.fromJSON(json);
        if (json.width !== undefined) this.width = json.width;
        if (json.height !== undefined) this.height = json.height;
        if (json.isSolid !== undefined) this.isSolid = json.isSolid;
        if (json.collisionRadius !== undefined) this.collisionRadius = json.collisionRadius;
        if (json.scale !== undefined) this.scale = json.scale;
        if (json.brightness !== undefined) this.brightness = json.brightness;
        if (json.opacity !== undefined) this.opacity = json.opacity;
        if (json.billboard !== undefined) this.billboard = json.billboard;
        if (json.billboardAxis !== undefined) this.billboardAxis = json.billboardAxis;
        if (json.animate !== undefined) this.animate = json.animate;
        if (json.animationSpeed !== undefined) this.animationSpeed = json.animationSpeed;
        if (json.frameCount !== undefined) this.frameCount = json.frameCount;
        if (json.interactive !== undefined) this.interactive = json.interactive;
        if (json.interactionDistance !== undefined) this.interactionDistance = json.interactionDistance;
        if (json.depthOffset !== undefined) this.depthOffset = json.depthOffset;
    }
}

window.Wolf3DObject = Wolf3DObject;
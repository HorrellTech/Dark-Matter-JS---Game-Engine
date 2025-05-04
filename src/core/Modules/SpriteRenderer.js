/**
 * SpriteRenderer - Module for rendering sprites
 * 
 * This module handles loading and rendering sprite images on a GameObject.
 */
class SpriteRenderer extends Module {
    /**
     * Create a new SpriteRenderer
     * @param {string} imageSrc - Path to the sprite image
     */
    constructor(imageSrc = null) {
        super("SpriteRenderer");
        
        /** @type {string} Path to the sprite image */
        this.imageSrc = imageSrc;
        
        /** @type {HTMLImageElement} The loaded image */
        this.image = null;
        
        /** @type {boolean} Whether the image has been loaded */
        this.loaded = false;
        
        /** @type {number} Width of the sprite */
        this.width = 0;
        
        /** @type {number} Height of the sprite */
        this.height = 0;
        
        /** @type {Vector2} Origin point (0,0 = top-left, 0.5,0.5 = center) */
        this.origin = new Vector2(0.5, 0.5);
        
        /** @type {Vector2} Scale of the sprite */
        this.scale = new Vector2(1, 1);
        
        /** @type {string} Fill color if no image is available */
        this.color = "white";
        
        this.setProperty("imageSrc", imageSrc);
        this.setProperty("color", this.color);
        this.setProperty("originX", 0.5);
        this.setProperty("originY", 0.5);
        this.setProperty("scaleX", 1);
        this.setProperty("scaleY", 1);
    }

    /**
     * Load the sprite image
     */
    async preload() {
        if (this.imageSrc) {
            await this.loadImage(this.imageSrc);
        }
    }

    /**
     * Load an image from the given source
     * @param {string} src - Path to the image
     * @returns {Promise<void>} Promise that resolves when the image is loaded
     */
    loadImage(src) {
        return new Promise((resolve, reject) => {
            this.image = new Image();
            this.image.onload = () => {
                this.width = this.image.width;
                this.height = this.image.height;
                this.loaded = true;
                resolve();
            };
            this.image.onerror = () => {
                console.error(`Failed to load image: ${src}`);
                reject(new Error(`Failed to load image: ${src}`));
            };
            this.image.src = src;
        });
    }

    /**
     * Set a new sprite image
     * @param {string} src - Path to the image
     */
    setSprite(src) {
        this.imageSrc = src;
        this.setProperty("imageSrc", src);
        this.loaded = false;
        this.loadImage(src);
    }

    /**
     * Draw the sprite
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
     */
    draw(ctx) {
        if (!this.enabled) return;
        
        // Calculate position based on origin point
        const originX = this.width * this.origin.x;
        const originY = this.height * this.origin.y;
        
        if (this.loaded && this.image) {
            // Draw the loaded image
            ctx.drawImage(
                this.image,
                -originX * this.scale.x,
                -originY * this.scale.y,
                this.width * this.scale.x,
                this.height * this.scale.y
            );
        } else {
            // Draw a colored rectangle as a placeholder
            ctx.fillStyle = this.color;
            ctx.fillRect(
                -originX * this.scale.x,
                -originY * this.scale.y,
                (this.width || 64) * this.scale.x,
                (this.height || 64) * this.scale.y
            );
        }
    }

    /**
     * Clean up resources when destroyed
     */
    onDestroy() {
        // Clean up any resources if needed
        this.image = null;
    }
    
    /**
     * Set the origin point of the sprite
     * @param {number} x - X coordinate (0 to 1)
     * @param {number} y - Y coordinate (0 to 1) 
     */
    setOrigin(x, y) {
        this.origin.x = x;
        this.origin.y = y;
        this.setProperty("originX", x);
        this.setProperty("originY", y);
    }
    
    /**
     * Set the scale of the sprite
     * @param {number} x - X scale
     * @param {number} y - Y scale
     */
    setScale(x, y) {
        this.scale.x = x;
        this.scale.y = y;
        this.setProperty("scaleX", x);
        this.setProperty("scaleY", y);
    }
    
    /**
     * Override to handle serialization
     */
    fromJSON(json) {
        super.fromJSON(json);
        
        // Restore properties from serialized data
        this.imageSrc = this.getProperty("imageSrc");
        this.color = this.getProperty("color", "white");
        this.origin.x = this.getProperty("originX", 0.5);
        this.origin.y = this.getProperty("originY", 0.5);
        this.scale.x = this.getProperty("scaleX", 1);
        this.scale.y = this.getProperty("scaleY", 1);
        
        // Reload the image if needed
        if (this.imageSrc) {
            this.loadImage(this.imageSrc);
        }
    }
}

// Make the SpriteRenderer class available globally
window.SpriteRenderer = SpriteRenderer;
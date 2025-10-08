/**
 * Wolf3DWall - Wall module for Wolf3D-style games
 *
 * Renders walls as vertical columns using raycasting techniques.
 * Designed for classic FPS-style gameplay similar to Wolfenstein 3D.
 */
class Wolf3DWall extends Module {
    static namespace = "Wolf3D";
    static iconClass = "fas fa-square";

    constructor() {
        super("Wolf3DWall");

        // Wall properties
        this.height = 64; // Wall height in world units
        this.width = 64; // Wall width in world units
        this.isSolid = true; // Whether the wall blocks movement
        this.collisionRadius = 8; // Radius for collision detection

        // Visual properties
        this.color = "#888888"; // Wall color
        this.texture = null; // Wall texture image
        this.textureScale = 1.0; // How much to scale the texture
        this.brightness = 1.0; // Brightness multiplier

        // Wall sides (for different textures/colors per side)
        this.northTexture = null;
        this.southTexture = null;
        this.eastTexture = null;
        this.westTexture = null;

        this.northColor = "#888888";
        this.southColor = "#888888";
        this.eastColor = "#888888";
        this.westColor = "#888888";

        // Lighting properties
        this.ambientOcclusion = 0.3; // How much ambient light affects this wall
        this.lightBleed = 0.1; // How much light bleeds from adjacent walls

        // Animation properties
        this.animate = false;
        this.animationSpeed = 1.0;
        this.animationOffset = 0;

        // Expose properties for editor
        this.exposeProperty("height", "number", 64, {
            min: 1, max: 500, onChange: (val) => this.height = val
        });
        this.exposeProperty("width", "number", 64, {
            min: 1, max: 500, onChange: (val) => this.width = val
        });
        this.exposeProperty("isSolid", "boolean", true, {
            onChange: (val) => this.isSolid = val
        });
        this.exposeProperty("collisionRadius", "number", 8, {
            min: 1, max: 50, onChange: (val) => this.collisionRadius = val
        });
        this.exposeProperty("color", "color", "#888888", {
            onChange: (val) => this.color = val
        });
        this.exposeProperty("textureScale", "number", 1.0, {
            min: 0.1, max: 10, step: 0.1, onChange: (val) => this.textureScale = val
        });
        this.exposeProperty("brightness", "number", 1.0, {
            min: 0.1, max: 3, step: 0.1, onChange: (val) => this.brightness = val
        });
        this.exposeProperty("animate", "boolean", false, {
            onChange: (val) => this.animate = val
        });
        this.exposeProperty("animationSpeed", "number", 1.0, {
            min: 0.1, max: 5, step: 0.1, onChange: (val) => this.animationSpeed = val
        });
    }

    start() {
        // Initialize wall properties
        if (this.gameObject) {
            // Set collision size based on wall dimensions
            this.gameObject.size.x = this.width;
            this.gameObject.size.y = this.width; // Square collision for simplicity
        }
    }

    loop(deltaTime) {
        // Update animation offset if animation is enabled
        if (this.animate) {
            this.animationOffset += deltaTime * this.animationSpeed;
            this.animationOffset %= 1.0; // Keep in 0-1 range
        }
    }

    /**
     * Get the texture for a specific side of the wall
     * @param {string} side - 'north', 'south', 'east', or 'west'
     * @returns {Image|null} - The texture image or null
     */
    getTextureForSide(side) {
        switch (side) {
            case 'north': return this.northTexture;
            case 'south': return this.southTexture;
            case 'east': return this.eastTexture;
            case 'west': return this.westTexture;
            default: return this.texture;
        }
    }

    /**
     * Get the color for a specific side of the wall
     * @param {string} side - 'north', 'south', 'east', or 'west'
     * @returns {string} - The color hex string
     */
    getColorForSide(side) {
        switch (side) {
            case 'north': return this.northColor;
            case 'south': return this.southColor;
            case 'east': return this.eastColor;
            case 'west': return this.westColor;
            default: return this.color;
        }
    }

    /**
     * Render this wall as a column in the Wolf3D view
     * @param {CanvasRenderingContext2D} ctx - The rendering context
     * @param {number} screenX - X position on screen
     * @param {number} distance - Distance from camera
     * @param {number} wallHeight - Height of wall column to draw
     * @param {string} side - Which side of the wall is visible
     * @param {number} wallX - X coordinate where ray hit the wall
     */
    drawWallColumn(ctx, screenX, distance, wallHeight, side, wallX) {
        if (wallHeight <= 0) return;

        // Calculate screen coordinates
        const screenHeight = ctx.canvas.height;
        const halfHeight = screenHeight / 2;

        // Calculate wall top and bottom on screen
        const wallTop = halfHeight - wallHeight / 2;
        const wallBottom = halfHeight + wallHeight / 2;

        // Clamp to screen bounds
        const drawTop = Math.max(0, Math.floor(wallTop));
        const drawBottom = Math.min(screenHeight - 1, Math.ceil(wallBottom));

        if (drawTop >= drawBottom) return;

        // Get texture and color for this side
        const texture = this.getTextureForSide(side);
        const baseColor = this.hexToRgb(this.getColorForSide(side));

        // Apply distance-based shading (fog)
        const shadeFactor = Math.max(0.1, 1.0 - distance / 1000);
        const shadedColor = {
            r: Math.round(baseColor.r * shadeFactor * this.brightness),
            g: Math.round(baseColor.g * shadeFactor * this.brightness),
            b: Math.round(baseColor.b * shadeFactor * this.brightness)
        };

        // Draw the wall column
        if (texture && texture.width > 0 && texture.height > 0) {
            this.drawTexturedWallColumn(ctx, screenX, drawTop, drawBottom, texture, wallX, shadedColor);
        } else {
            this.drawSolidWallColumn(ctx, screenX, drawTop, drawBottom, shadedColor);
        }
    }

    /**
     * Draw a solid color wall column
     */
    drawSolidWallColumn(ctx, screenX, top, bottom, color) {
        ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        ctx.fillRect(screenX, top, 1, bottom - top + 1);
    }

    /**
     * Draw a textured wall column
     */
    drawTexturedWallColumn(ctx, screenX, top, bottom, texture, wallX, tintColor) {
        const columnHeight = bottom - top + 1;
        if (columnHeight <= 0) return;

        // Calculate texture coordinates
        const textureX = ((wallX % this.width) / this.width) * texture.width;
        const textureXInt = Math.floor(textureX) % texture.width;

        // Sample the texture column
        const imageData = this.getTextureColumn(texture, textureXInt);

        // Create a temporary canvas for this column
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 1;
        tempCanvas.height = columnHeight;
        const tempCtx = tempCanvas.getContext('2d');

        // Draw the texture column with tinting
        const columnData = tempCtx.createImageData(1, columnHeight);
        for (let y = 0; y < columnHeight; y++) {
            const textureY = Math.floor((y / columnHeight) * texture.height) % texture.height;
            const srcIdx = textureY * texture.width * 4 + textureXInt * 4;
            const destIdx = y * 4;

            if (srcIdx >= 0 && srcIdx < imageData.length - 3) {
                // Apply tinting
                columnData.data[destIdx] = Math.min(255, imageData[srcIdx] * tintColor.r / 255);
                columnData.data[destIdx + 1] = Math.min(255, imageData[srcIdx + 1] * tintColor.g / 255);
                columnData.data[destIdx + 2] = Math.min(255, imageData[srcIdx + 2] * tintColor.b / 255);
                columnData.data[destIdx + 3] = imageData[srcIdx + 3]; // Alpha
            }
        }

        tempCtx.putImageData(columnData, 0, 0);

        // Draw to main context
        ctx.drawImage(tempCanvas, screenX, top);
    }

    /**
     * Extract a column of pixels from a texture
     */
    getTextureColumn(texture, x) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = texture.width;
        canvas.height = texture.height;

        ctx.drawImage(texture, 0, 0);
        return ctx.getImageData(0, 0, texture.width, texture.height).data;
    }

    /**
     * Get the wall's bounding box for collision detection
     */
    getBoundingBox() {
        if (!this.gameObject) return { x: 0, y: 0, width: 0, height: 0 };

        return {
            x: this.gameObject.position.x - this.width / 2,
            y: this.gameObject.position.y - this.width / 2,
            width: this.width,
            height: this.width
        };
    }

    /**
     * Check if a point is inside this wall
     */
    containsPoint(x, y) {
        const bbox = this.getBoundingBox();
        return x >= bbox.x && x <= bbox.x + bbox.width &&
               y >= bbox.y && y <= bbox.y + bbox.height;
    }

    /**
     * Get the side of the wall that a point is closest to
     */
    getClosestSide(x, y) {
        if (!this.gameObject) return 'north';

        const dx = x - this.gameObject.position.x;
        const dy = y - this.gameObject.position.y;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        const normalizedAngle = ((angle - this.gameObject.angle) % 360 + 360) % 360;

        if (normalizedAngle < 90) return 'east';
        if (normalizedAngle < 180) return 'south';
        if (normalizedAngle < 270) return 'west';
        return 'north';
    }

    draw(ctx) {
        // Wall rendering is handled by the Wolf3DRenderer
        // This method can be used for debug drawing if needed
    }

    drawGizmos(ctx) {
        if (!this.gameObject) return;

        ctx.save();
        ctx.translate(this.gameObject.position.x, this.gameObject.position.y);
        ctx.rotate(this.gameObject.angle * Math.PI / 180);

        // Draw wall as a rectangle
        ctx.strokeStyle = this.isSolid ? '#00ff00' : '#ffff00';
        ctx.lineWidth = 2;
        ctx.setLineDash(this.isSolid ? [] : [5, 5]);
        ctx.strokeRect(-this.width / 2, -this.width / 2, this.width, this.width);
        ctx.setLineDash([]);

        // Draw height indicator
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-this.width / 2, -this.width / 2);
        ctx.lineTo(-this.width / 2, -this.width / 2 - this.height);
        ctx.stroke();

        ctx.restore();

        // Draw collision radius
        if (this.isSolid) {
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(this.gameObject.position.x, this.gameObject.position.y, this.collisionRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 136, g: 136, b: 136 }; // Default gray
    }

    toJSON() {
        return {
            ...super.toJSON(),
            height: this.height,
            width: this.width,
            isSolid: this.isSolid,
            collisionRadius: this.collisionRadius,
            color: this.color,
            textureScale: this.textureScale,
            brightness: this.brightness,
            northColor: this.northColor,
            southColor: this.southColor,
            eastColor: this.eastColor,
            westColor: this.westColor,
            animate: this.animate,
            animationSpeed: this.animationSpeed
        };
    }

    fromJSON(json) {
        super.fromJSON(json);
        if (json.height !== undefined) this.height = json.height;
        if (json.width !== undefined) this.width = json.width;
        if (json.isSolid !== undefined) this.isSolid = json.isSolid;
        if (json.collisionRadius !== undefined) this.collisionRadius = json.collisionRadius;
        if (json.color !== undefined) this.color = json.color;
        if (json.textureScale !== undefined) this.textureScale = json.textureScale;
        if (json.brightness !== undefined) this.brightness = json.brightness;
        if (json.northColor !== undefined) this.northColor = json.northColor;
        if (json.southColor !== undefined) this.southColor = json.southColor;
        if (json.eastColor !== undefined) this.eastColor = json.eastColor;
        if (json.westColor !== undefined) this.westColor = json.westColor;
        if (json.animate !== undefined) this.animate = json.animate;
        if (json.animationSpeed !== undefined) this.animationSpeed = json.animationSpeed;
    }
}

window.Wolf3DWall = Wolf3DWall;
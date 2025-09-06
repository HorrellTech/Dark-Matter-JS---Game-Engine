class DrawCapsule extends Module {
    static namespace = "Drawing";
    static description = "Draws a filled capsule at the GameObject's position";
    static iconColor = "#a200ffff";

    constructor() {
        super("DrawCapsule");

        /** @type {number} Width of the capsule */
        this.width = 30;
        /** @type {number} Height of the capsule */
        this.height = 60;
        /** @type {Vector2} Offset from the GameObject's center */
        this.offset = new Vector2(0, 0);
        /** @type {string} Fill color */
        this.color = "#ffffff";
        /** @type {boolean} Whether to fill the capsule */
        this.fill = true;
        /** @type {boolean} Whether to draw an outline */
        this.outline = false;
        /** @type {string} Outline color */
        this.outlineColor = "#000000";
        /** @type {number} Outline width */
        this.outlineWidth = 2;
        /** @type {string} Orientation of the capsule */
        this.orientation = "vertical"; // "vertical" or "horizontal"

        // Expose all properties with onChange handlers
        this.exposeProperty("width", "number", this.width, { 
            min: 1, 
            description: "Capsule width",
            onChange: (val) => this.width = val
        });

        this.exposeProperty("height", "number", this.height, { 
            min: 1, 
            description: "Capsule height",
            onChange: (val) => this.height = val
        });
        
        this.exposeProperty("offset", "vector2", this.offset, { 
            description: "Offset from center",
            onChange: (val) => this.offset = val
        });
        
        this.exposeProperty("color", "color", this.color, { 
            description: "Fill color",
            onChange: (val) => this.color = val
        });
        
        this.exposeProperty("fill", "boolean", this.fill, { 
            description: "Fill capsule",
            onChange: (val) => this.fill = val
        });
        
        this.exposeProperty("outline", "boolean", this.outline, { 
            description: "Show outline",
            onChange: (val) => this.outline = val
        });
        
        this.exposeProperty("outlineColor", "color", this.outlineColor, { 
            description: "Outline color",
            onChange: (val) => this.outlineColor = val
        });
        
        this.exposeProperty("outlineWidth", "number", this.outlineWidth, { 
            description: "Outline thickness",
            min: 0,
            max: 20,
            step: 0.5,
            onChange: (val) => this.outlineWidth = val
        });

        this.exposeProperty("orientation", "enum", this.orientation, {
            options: ["vertical", "horizontal"],
            description: "Capsule orientation",
            onChange: (val) => this.orientation = val
        });
    }

    getBoundingBox() {
        // Calculate bounding box based on dimensions and offset
        const x = this.offset.x - this.width / 2;
        const y = this.offset.y - this.height / 2;
        return {
            x: x,
            y: y,
            width: this.width,
            height: this.height
        };
    }

    /**
     * Draw the capsule centered at the GameObject,
     * then translated by offset.
     */
    draw(ctx, pixiDisplayObject) {
        if (!this.enabled) return;

        // Use the actual width and height directly
        const radius = Math.min(this.width, this.height) / 2;
        const isVertical = this.orientation === "vertical";
        
        let rectWidth, rectHeight, straightLength;
        
        if (isVertical) {
            // Vertical: height is the main dimension, width determines the radius
            rectWidth = this.width;
            rectHeight = Math.max(0, this.height - this.width); // Subtract both end caps
            straightLength = rectHeight;
        } else {
            // Horizontal: width is the main dimension, height determines the radius  
            rectWidth = Math.max(0, this.width - this.height); // Subtract both end caps
            rectHeight = this.height;
            straightLength = rectWidth;
        }

        // PIXI path
        if (window.engine && window.engine.usePixi && ctx instanceof window.PixiRenderer) {
            const graphics = pixiDisplayObject || ctx.graphics;
            graphics.clear();

            // Helper to convert color string to hex
            function toHex(color) {
                if (window.PIXI && window.PIXI.utils && window.PIXI.utils.string2hex) {
                    return window.PIXI.utils.string2hex(color);
                }
                if (typeof color === "string" && color.startsWith("#")) {
                    return parseInt(color.slice(1), 16);
                }
                return 0xffffff;
            }

            // Fill
            if (this.fill) {
                graphics.beginFill(toHex(this.color));
            }
            // Outline
            if (this.outline) {
                graphics.lineStyle(this.outlineWidth, toHex(this.outlineColor));
            }

            if (isVertical) {
                // Vertical capsule
                if (straightLength > 0) {
                    graphics.drawRect(this.offset.x - rectWidth/2, this.offset.y - straightLength/2, rectWidth, straightLength);
                }
                // Top semicircle
                graphics.drawCircle(this.offset.x, this.offset.y - straightLength/2, radius);
                // Bottom semicircle
                graphics.drawCircle(this.offset.x, this.offset.y + straightLength/2, radius);
            } else {
                // Horizontal capsule
                if (straightLength > 0) {
                    graphics.drawRect(this.offset.x - straightLength/2, this.offset.y - rectHeight/2, straightLength, rectHeight);
                }
                // Left semicircle
                graphics.drawCircle(this.offset.x - straightLength/2, this.offset.y, radius);
                // Right semicircle
                graphics.drawCircle(this.offset.x + straightLength/2, this.offset.y, radius);
            }

            graphics.endFill();
            ctx.render();
            return;
        }

        // Canvas 2D rendering
        ctx.save();
        ctx.translate(this.offset.x, this.offset.y);

        // Begin the capsule path
        ctx.beginPath();

        if (isVertical) {
            // Vertical capsule
            const halfLength = straightLength / 2;
            
            if (straightLength > 0) {
                // Rectangle portion exists
                ctx.moveTo(-radius, -halfLength);
                ctx.lineTo(radius, -halfLength);
                ctx.arc(0, -halfLength, radius, 0, Math.PI, true);
                ctx.lineTo(-radius, halfLength);
                ctx.arc(0, halfLength, radius, Math.PI, 0, true);
            } else {
                // Just a circle when height <= width
                ctx.arc(0, 0, radius, 0, Math.PI * 2);
            }
        } else {
            // Horizontal capsule
            const halfLength = straightLength / 2;
            
            if (straightLength > 0) {
                // Rectangle portion exists
                ctx.moveTo(-halfLength, -radius);
                ctx.arc(-halfLength, 0, radius, -Math.PI/2, Math.PI/2, true);
                ctx.lineTo(halfLength, radius);
                ctx.arc(halfLength, 0, radius, Math.PI/2, -Math.PI/2, true);
            } else {
                // Just a circle when width <= height
                ctx.arc(0, 0, radius, 0, Math.PI * 2);
            }
        }

        ctx.closePath();
        
        // Fill if enabled
        if (this.fill) {
            ctx.fillStyle = this.color;
            ctx.fill();
        }
        
        // Draw outline if enabled
        if (this.outline) {
            ctx.strokeStyle = this.outlineColor;
            ctx.lineWidth = this.outlineWidth;
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Alternative drawing method using separate shapes (useful for debugging)
     */
    drawSeparate(ctx) {
        if (!this.enabled) return;

        ctx.save();
        ctx.translate(this.offset.x, this.offset.y);

        // Determine capsule properties
        let capsuleWidth, capsuleHeight, isVertical;
        
        if (this.orientation === "vertical") {
            capsuleWidth = Math.min(this.width, this.height);
            capsuleHeight = Math.max(this.width, this.height);
            isVertical = true;
        } else {
            capsuleWidth = Math.max(this.width, this.height);
            capsuleHeight = Math.min(this.width, this.height);
            isVertical = false;
        }

        const radius = Math.min(capsuleWidth, capsuleHeight) / 2;
        const straightLength = Math.max(capsuleWidth, capsuleHeight) - (radius * 2);

        if (isVertical) {
            const halfLength = straightLength / 2;
            
            // Draw rectangle body
            ctx.beginPath();
            ctx.rect(-capsuleWidth/2, -halfLength, capsuleWidth, straightLength);
            if (this.fill) {
                ctx.fillStyle = this.color;
                ctx.fill();
            }
            if (this.outline) {
                ctx.strokeStyle = this.outlineColor;
                ctx.lineWidth = this.outlineWidth;
                ctx.stroke();
            }

            // Draw top semicircle
            ctx.beginPath();
            ctx.arc(0, -halfLength, radius, Math.PI, 0, false);
            if (this.fill) {
                ctx.fillStyle = this.color;
                ctx.fill();
            }
            if (this.outline) {
                ctx.strokeStyle = this.outlineColor;
                ctx.lineWidth = this.outlineWidth;
                ctx.stroke();
            }

            // Draw bottom semicircle
            ctx.beginPath();
            ctx.arc(0, halfLength, radius, 0, Math.PI, false);
            if (this.fill) {
                ctx.fillStyle = this.color;
                ctx.fill();
            }
            if (this.outline) {
                ctx.strokeStyle = this.outlineColor;
                ctx.lineWidth = this.outlineWidth;
                ctx.stroke();
            }
        } else {
            const halfLength = straightLength / 2;
            
            // Draw rectangle body
            ctx.beginPath();
            ctx.rect(-halfLength, -capsuleHeight/2, straightLength, capsuleHeight);
            if (this.fill) {
                ctx.fillStyle = this.color;
                ctx.fill();
            }
            if (this.outline) {
                ctx.strokeStyle = this.outlineColor;
                ctx.lineWidth = this.outlineWidth;
                ctx.stroke();
            }

            // Draw left semicircle
            ctx.beginPath();
            ctx.arc(-halfLength, 0, radius, Math.PI/2, -Math.PI/2, false);
            if (this.fill) {
                ctx.fillStyle = this.color;
                ctx.fill();
            }
            if (this.outline) {
                ctx.strokeStyle = this.outlineColor;
                ctx.lineWidth = this.outlineWidth;
                ctx.stroke();
            }

            // Draw right semicircle
            ctx.beginPath();
            ctx.arc(halfLength, 0, radius, -Math.PI/2, Math.PI/2, false);
            if (this.fill) {
                ctx.fillStyle = this.color;
                ctx.fill();
            }
            if (this.outline) {
                ctx.strokeStyle = this.outlineColor;
                ctx.lineWidth = this.outlineWidth;
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            width: this.width,
            height: this.height,
            offset: this.offset.toJSON(),
            color: this.color,
            fill: this.fill,
            outline: this.outline,
            outlineColor: this.outlineColor,
            outlineWidth: this.outlineWidth,
            orientation: this.orientation
        };
    }

    /**
     * Override to handle deserialization
     * @param {Object} data Serialized data
     */
    fromJSON(data) {
        super.fromJSON(data);
        this.width = data.width || this.width;
        this.height = data.height || this.height;
        this.offset = Vector2.fromJSON(data.offset) || this.offset;
        this.color = data.color || this.color;
        this.fill = data.fill !== undefined ? data.fill : this.fill;
        this.outline = data.outline !== undefined ? data.outline : this.outline;
        this.outlineColor = data.outlineColor || this.outlineColor;
        this.outlineWidth = data.outlineWidth || this.outlineWidth;
        this.orientation = data.orientation || this.orientation;
    }
}

window.DrawCapsule = DrawCapsule;
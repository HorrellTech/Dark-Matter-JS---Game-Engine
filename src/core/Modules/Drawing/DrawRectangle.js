class DrawRectangle extends Module {
    static namespace   = "Drawing";
    static description = "Draws a filled rectangle at the GameObject's position";
    static iconColor = "#a200ffff";

    constructor() {
        super("DrawRectangle");

        /** @type {number} Full width of the rectangle */
        this.width = 50;
        /** @type {number} Full height of the rectangle */
        this.height = 50;
        /** @type {Vector2} Offset from the GameObject's center */
        this.offset = new Vector2(0, 0);
        /** @type {string} Fill color */
        this.color = "#ffffff";
        /** @type {boolean} Whether to fill the rectangle */
        this.fill = true;
        /** @type {boolean} Whether to draw an outline */
        this.outline = false;
        /** @type {string} Outline color */
        this.outlineColor = "#000000";
        /** @type {number} Outline width */
        this.outlineWidth = 2;

        this.exposeProperty("width", "number", this.width, { 
            min: 0, 
            description: "Rectangle width",
            onChange: (val) => this.width = val
        });
        
        this.exposeProperty("height", "number", this.height, { 
            min: 0, 
            description: "Rectangle height",
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
            description: "Fill rectangle",
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
    }

    getBoundingBox() {
        if (!this.gameObject) return null;
        // Calculate bounding box based on width, height and offset
        const x = this.gameObject.position.x + this.offset.x - this.width / 2;
        const y = this.gameObject.position.y + this.offset.y - this.height / 2;
        return {
            x: x,
            y: y,
            width: this.width,
            height: this.height
        };
    }

    /**
     * Draw the rectangle centered at the GameObject,
     * then translated by offset.
     */
    draw(ctx) {
        if (!this.enabled) return;

        ctx.save();
        // apply offset relative to object center
        ctx.translate(this.offset.x, this.offset.y);

        // Draw the rectangle path
        ctx.beginPath();
        ctx.rect(-this.width/2, -this.height/2, this.width, this.height);
        
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

    toJSON() {
        return {
            width: this.width,
            height: this.height,
            offset:  { x: this.offset.x, y: this.offset.y },
            color: this.color,
            fill: this.fill,
            outline: this.outline,
            outlineColor: this.outlineColor,
            outlineWidth: this.outlineWidth
        };
    }

    /**
     * Override to handle serialization
     * @returns {Object} Serialized data
     */
    fromJSON(data) {
        if (data.width !== undefined) this.width = data.width;
        if (data.height !== undefined) this.height = data.height;
        if (data.offset) this.offset = data.offset;
        if (data.color !== undefined) this.color = data.color;
        if (data.fill !== undefined) this.fill = data.fill;
        if (data.outline !== undefined) this.outline = data.outline;
        if (data.outlineColor !== undefined) this.outlineColor = data.outlineColor;
        if (data.outlineWidth !== undefined) this.outlineWidth = data.outlineWidth;
    }
}

// make it available to the engine
window.DrawRectangle = DrawRectangle;
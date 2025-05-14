class DrawRectangle extends Module {
    static namespace   = "Drawing";
    static description = "Draws a filled rectangle at the GameObject's position";

    constructor() {
        super("DrawRectangle");

        /** @type {number} Full width of the rectangle */
        this.width = 100;
        /** @type {number} Full height of the rectangle */
        this.height = 100;
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
}

// make it available to the engine
window.DrawRectangle = DrawRectangle;
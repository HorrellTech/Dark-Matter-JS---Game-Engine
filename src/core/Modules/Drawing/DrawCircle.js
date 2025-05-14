class DrawCircle extends Module {
    static namespace   = "Drawing";
    static description = "Draws a filled circle at the GameObject's position";

    constructor() {
        super("DrawCircle");

        /** @type {number} Radius of the circle */
        this.radius = 50;
        /** @type {Vector2} Offset from the GameObject's center */
        this.offset = new Vector2(0, 0);
        /** @type {string} Fill color */
        this.color = "#ffffff";
        /** @type {boolean} Whether to fill the circle */
        this.fill = true;
        /** @type {boolean} Whether to draw an outline */
        this.outline = false;
        /** @type {string} Outline color */
        this.outlineColor = "#000000";
        /** @type {number} Outline width */
        this.outlineWidth = 2;

        // Expose all properties with onChange handlers
        this.exposeProperty("radius", "number", this.radius, { 
            min: 0, 
            description: "Circle radius",
            onChange: (val) => this.radius = val
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
            description: "Fill circle",
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
     * Draw the circle centered at the GameObject,
     * then translated by offset.
     */
    draw(ctx) {
        if (!this.enabled) return;

        ctx.save();
        ctx.translate(this.offset.x, this.offset.y);

        // Draw the circle path
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        
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

window.DrawCircle = DrawCircle;
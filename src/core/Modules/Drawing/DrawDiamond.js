class DrawDiamond extends Module {
    static namespace = "Drawing";
    static description = "Sparkling diamond for gems and valuables";
    static allowMultiple = false;
    static iconClass = "fas fa-gem";

    constructor() {
        super("DrawDiamond");

        this.fillColor = "#88ddff";
        this.outlineColor = "#2288cc";
        this.outlineWidth = 2;
        this.filled = true;
        this.outlined = true;
        this.sparkle = true;
        this.facets = true;
        
        this.exposeProperty("fillColor", "color", this.fillColor, {
            description: "Diamond fill color",
            onChange: (val) => { this.fillColor = val; }
        });
        
        this.exposeProperty("outlineColor", "color", this.outlineColor, {
            description: "Diamond outline color",
            onChange: (val) => { this.outlineColor = val; }
        });
        
        this.exposeProperty("outlineWidth", "number", this.outlineWidth, {
            description: "Outline thickness",
            onChange: (val) => { this.outlineWidth = val; }
        });
        
        this.exposeProperty("filled", "boolean", this.filled, {
            description: "Fill the diamond",
            onChange: (val) => { this.filled = val; }
        });
        
        this.exposeProperty("outlined", "boolean", this.outlined, {
            description: "Draw outline",
            onChange: (val) => { this.outlined = val; }
        });
        
        this.exposeProperty("sparkle", "boolean", this.sparkle, {
            description: "Add sparkle effect",
            onChange: (val) => { this.sparkle = val; }
        });
        
        this.exposeProperty("facets", "boolean", this.facets, {
            description: "Show facet lines",
            onChange: (val) => { this.facets = val; }
        });
    }

    style(style) {
        style.startGroup("Diamond Appearance", false, { 
            backgroundColor: 'rgba(136,221,255,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        
        style.exposeProperty("fillColor", "color", this.fillColor, {
            style: { label: "Fill Color" }
        });
        
        style.exposeProperty("outlineColor", "color", this.outlineColor, {
            style: { label: "Outline Color" }
        });
        
        style.exposeProperty("outlineWidth", "number", this.outlineWidth, {
            min: 0,
            max: 20,
            step: 1,
            style: { label: "Outline Width", slider: true }
        });
        
        style.exposeProperty("filled", "boolean", this.filled, {
            style: { label: "Filled" }
        });
        
        style.exposeProperty("outlined", "boolean", this.outlined, {
            style: { label: "Outlined" }
        });
        
        style.exposeProperty("sparkle", "boolean", this.sparkle, {
            style: { label: "Sparkle Effect" }
        });
        
        style.exposeProperty("facets", "boolean", this.facets, {
            style: { label: "Show Facets" }
        });
        
        style.endGroup();
        style.addHelpText("Ideal for gems, currency, and precious items");
    }

    draw(ctx) {
        const pos = this.gameObject.getWorldPosition();
        const scale = this.gameObject.scale;
        
        ctx.save();
        
        // Diamond path
        ctx.beginPath();
        ctx.moveTo(0, -25);     // Top point
        ctx.lineTo(-15, -10);   // Top left
        ctx.lineTo(-20, 10);    // Bottom left
        ctx.lineTo(0, 25);      // Bottom point
        ctx.lineTo(20, 10);     // Bottom right
        ctx.lineTo(15, -10);    // Top right
        ctx.closePath();
        
        if (this.filled) {
            // Create gradient for gem effect
            const gradient = ctx.createLinearGradient(-20, -25, 20, 25);
            gradient.addColorStop(0, this.fillColor);
            gradient.addColorStop(0.5, 'rgba(255,255,255,0.3)');
            gradient.addColorStop(1, this.fillColor);
            ctx.fillStyle = gradient;
            ctx.fill();
        }
        
        if (this.outlined && this.outlineWidth > 0) {
            ctx.strokeStyle = this.outlineColor;
            ctx.lineWidth = this.outlineWidth;
            ctx.stroke();
        }
        
        if (this.facets) {
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -25);
            ctx.lineTo(0, 25);
            ctx.moveTo(-15, -10);
            ctx.lineTo(15, -10);
            ctx.stroke();
        }
        
        if (this.sparkle) {
            ctx.fillStyle = 'white';
            ctx.fillRect(-2, -15, 4, 2);
            ctx.fillRect(-1, -17, 2, 6);
            ctx.fillRect(8, -5, 3, 1);
            ctx.fillRect(9, -7, 1, 4);
        }
        
        ctx.restore();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            fillColor: this.fillColor,
            outlineColor: this.outlineColor,
            outlineWidth: this.outlineWidth,
            filled: this.filled,
            outlined: this.outlined,
            sparkle: this.sparkle,
            facets: this.facets
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        if (!data) return;
        
        this.fillColor = data.fillColor || "#88ddff";
        this.outlineColor = data.outlineColor || "#2288cc";
        this.outlineWidth = data.outlineWidth || 2;
        this.filled = data.filled !== undefined ? data.filled : true;
        this.outlined = data.outlined !== undefined ? data.outlined : true;
        this.sparkle = data.sparkle !== undefined ? data.sparkle : true;
        this.facets = data.facets !== undefined ? data.facets : true;
    }
}

window.DrawDiamond = DrawDiamond;
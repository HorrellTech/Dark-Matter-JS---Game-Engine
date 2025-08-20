class DrawShield extends Module {
    static namespace = "Drawing";
    static description = "Classic shield shape for defense/protection icons";
    static allowMultiple = false;
    static iconClass = "fas fa-shield-alt";
    static iconColor = "#a200ffff";

    constructor() {
        super("DrawShield");

        this.fillColor = "#4488ff";
        this.outlineColor = "#2266cc";
        this.outlineWidth = 3;
        this.filled = true;
        this.outlined = true;
        this.gloss = true;
        this.topPoints = 3; // Number of curved points at the top
        
        this.exposeProperty("fillColor", "color", this.fillColor, {
            description: "Shield fill color",
            onChange: (val) => { this.fillColor = val; }
        });
        
        this.exposeProperty("outlineColor", "color", this.outlineColor, {
            description: "Shield outline color",
            onChange: (val) => { this.outlineColor = val; }
        });
        
        this.exposeProperty("outlineWidth", "number", this.outlineWidth, {
            description: "Outline thickness",
            onChange: (val) => { this.outlineWidth = val; }
        });
        
        this.exposeProperty("filled", "boolean", this.filled, {
            description: "Fill the shield",
            onChange: (val) => { this.filled = val; }
        });
        
        this.exposeProperty("outlined", "boolean", this.outlined, {
            description: "Draw outline",
            onChange: (val) => { this.outlined = val; }
        });
        
        this.exposeProperty("gloss", "boolean", this.gloss, {
            description: "Add glossy effect",
            onChange: (val) => { this.gloss = val; }
        });
        
        this.exposeProperty("topPoints", "number", this.topPoints, {
            description: "Number of curved points at the top",
            onChange: (val) => { this.topPoints = Math.max(1, Math.min(7, Math.round(val))); }
        });
    }

    style(style) {
        style.startGroup("Shield Appearance", false, { 
            backgroundColor: 'rgba(68,136,255,0.1)',
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
        
        style.exposeProperty("gloss", "boolean", this.gloss, {
            style: { label: "Glossy Effect" }
        });
        
        style.exposeProperty("topPoints", "number", this.topPoints, {
            min: 1,
            max: 7,
            step: 1,
            style: { label: "Top Points", slider: true }
        });
        
        style.endGroup();
        style.addHelpText("Perfect for armor, defense, and protection indicators. Adjust top points for different shield styles.");
    }

    draw(ctx) {
        ctx.save();
        
        // Calculate shield dimensions
        const width = 50;
        const height = 70;
        const topY = -35;
        const bottomY = 35;
        
        // Shield path with curved points at top
        ctx.beginPath();
        
        // Create the top edge with curved points
        const pointWidth = width / this.topPoints;
        const pointHeight = 8; // Height of each curved point
        
        // Start from the left edge
        ctx.moveTo(-width/2, topY);
        
        // Draw curved points across the top
        for (let i = 0; i < this.topPoints; i++) {
            const startX = -width/2 + (i * pointWidth);
            const endX = -width/2 + ((i + 1) * pointWidth);
            const midX = (startX + endX) / 2;
            
            // Create a curved point using quadratic curve
            ctx.quadraticCurveTo(midX, topY + pointHeight, endX, topY);
        }
        
        // Right side of shield
        ctx.bezierCurveTo(width/2, topY, width/2, -10, width/2, 10);
        ctx.bezierCurveTo(width/2, 25, width/2 - 10, bottomY - 5, 0, bottomY);
        
        // Left side of shield (mirrored)
        ctx.bezierCurveTo(-width/2 + 10, bottomY - 5, -width/2, 25, -width/2, 10);
        ctx.bezierCurveTo(-width/2, -10, -width/2, topY, -width/2, topY);
        
        ctx.closePath();
        
        if (this.filled) {
            ctx.fillStyle = this.fillColor;
            ctx.fill();
            
            if (this.gloss) {
                // Add glossy highlight
                const gradient = ctx.createLinearGradient(-20, -30, 20, 10);
                gradient.addColorStop(0, 'rgba(255,255,255,0.4)');
                gradient.addColorStop(0.5, 'rgba(255,255,255,0.1)');
                gradient.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = gradient;
                ctx.fill();
            }
        }
        
        if (this.outlined && this.outlineWidth > 0) {
            ctx.strokeStyle = this.outlineColor;
            ctx.lineWidth = this.outlineWidth;
            ctx.stroke();
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
            gloss: this.gloss,
            topPoints: this.topPoints
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        if (!data) return;
        
        this.fillColor = data.fillColor || "#4488ff";
        this.outlineColor = data.outlineColor || "#2266cc";
        this.outlineWidth = data.outlineWidth || 3;
        this.filled = data.filled !== undefined ? data.filled : true;
        this.outlined = data.outlined !== undefined ? data.outlined : true;
        this.gloss = data.gloss !== undefined ? data.gloss : true;
        this.topPoints = data.topPoints || 3;
    }
}

window.DrawShield = DrawShield;
class DrawArrow extends Module {
    static namespace = "Drawing";
    static description = "Directional arrow for UI and gameplay";
    static allowMultiple = false;
    static iconClass = "fas fa-arrow-right";

    constructor() {
        super("DrawArrow");

        this.fillColor = "#44ff44";
        this.outlineColor = "#228822";
        this.outlineWidth = 2;
        this.filled = true;
        this.outlined = true;
        this.arrowType = "standard";
        
        this.exposeProperty("fillColor", "color", this.fillColor, {
            description: "Arrow fill color",
            onChange: (val) => { this.fillColor = val; }
        });
        
        this.exposeProperty("outlineColor", "color", this.outlineColor, {
            description: "Arrow outline color",
            onChange: (val) => { this.outlineColor = val; }
        });
        
        this.exposeProperty("outlineWidth", "number", this.outlineWidth, {
            description: "Outline thickness",
            onChange: (val) => { this.outlineWidth = val; }
        });
        
        this.exposeProperty("filled", "boolean", this.filled, {
            description: "Fill the arrow",
            onChange: (val) => { this.filled = val; }
        });
        
        this.exposeProperty("outlined", "boolean", this.outlined, {
            description: "Draw outline",
            onChange: (val) => { this.outlined = val; }
        });
        
        this.exposeProperty("arrowType", "enum", this.arrowType, {
            description: "Arrow style",
            options: ["standard", "thick", "pointed"],
            onChange: (val) => { this.arrowType = val; }
        });
    }

    style(style) {
        style.startGroup("Arrow Style", false, { 
            backgroundColor: 'rgba(68,255,68,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        
        style.exposeProperty("arrowType", "enum", this.arrowType, {
            description: "Style of the arrow",
            options: ["standard", "thick", "pointed"],
            style: { label: "Arrow Type" }
        });
        
        style.endGroup();
        
        style.startGroup("Arrow Appearance", false, { 
            backgroundColor: 'rgba(68,255,68,0.1)',
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
        
        style.endGroup();
        style.addHelpText("Great for directions, UI navigation, and gameplay indicators");
    }

    draw(ctx) {
        const pos = this.gameObject.getWorldPosition();
        const scale = this.gameObject.scale;
        
        ctx.save();
        
        ctx.beginPath();
        
        if (this.arrowType === "standard") {
            ctx.moveTo(-25, -8);
            ctx.lineTo(15, -8);
            ctx.lineTo(15, -15);
            ctx.lineTo(30, 0);
            ctx.lineTo(15, 15);
            ctx.lineTo(15, 8);
            ctx.lineTo(-25, 8);
        } else if (this.arrowType === "thick") {
            ctx.moveTo(-25, -12);
            ctx.lineTo(10, -12);
            ctx.lineTo(10, -18);
            ctx.lineTo(30, 0);
            ctx.lineTo(10, 18);
            ctx.lineTo(10, 12);
            ctx.lineTo(-25, 12);
        } else if (this.arrowType === "pointed") {
            ctx.moveTo(-30, -5);
            ctx.lineTo(15, -5);
            ctx.lineTo(15, -15);
            ctx.lineTo(35, 0);
            ctx.lineTo(15, 15);
            ctx.lineTo(15, 5);
            ctx.lineTo(-30, 5);
        }
        
        ctx.closePath();
        
        if (this.filled) {
            ctx.fillStyle = this.fillColor;
            ctx.fill();
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
            arrowType: this.arrowType
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        if (!data) return;
        
        this.fillColor = data.fillColor || "#44ff44";
        this.outlineColor = data.outlineColor || "#228822";
        this.outlineWidth = data.outlineWidth || 2;
        this.filled = data.filled !== undefined ? data.filled : true;
        this.outlined = data.outlined !== undefined ? data.outlined : true;
        this.arrowType = data.arrowType || "standard";
    }
}

window.DrawArrow = DrawArrow;
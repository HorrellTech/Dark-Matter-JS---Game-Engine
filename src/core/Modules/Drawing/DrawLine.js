class DrawLine extends Module {
    static namespace = "Drawing";
    static description = "Draws a customizable line with color, thickness, and glow";
    static allowMultiple = true;
    static iconClass = "fas fa-minus";
    static iconColor = "#a200ffff";

    constructor() {
        super("DrawLine");

        this.x1 = 0;
        this.y1 = 0;
        this.x2 = 100;
        this.y2 = 0;
        this.color = "#ffffff";
        this.thickness = 2;

        // Glow properties
        this.glow = false;
        this.glowColor = "#00ffff";
        this.glowBlur = 10;

        this.exposeProperty("x1", "number", this.x1, {
            description: "Start X position",
            onChange: val => { this.x1 = val; }
        });
        this.exposeProperty("y1", "number", this.y1, {
            description: "Start Y position",
            onChange: val => { this.y1 = val; }
        });
        this.exposeProperty("x2", "number", this.x2, {
            description: "End X position",
            onChange: val => { this.x2 = val; }
        });
        this.exposeProperty("y2", "number", this.y2, {
            description: "End Y position",
            onChange: val => { this.y2 = val; }
        });
        this.exposeProperty("color", "color", this.color, {
            description: "Line color",
            onChange: val => { this.color = val; }
        });
        this.exposeProperty("thickness", "number", this.thickness, {
            description: "Line thickness",
            onChange: val => { this.thickness = val; }
        });
        this.exposeProperty("glow", "boolean", this.glow, {
            description: "Enable glow effect",
            onChange: val => { this.glow = val; }
        });
        this.exposeProperty("glowColor", "color", this.glowColor, {
            description: "Glow color",
            onChange: val => { this.glowColor = val; }
        });
        this.exposeProperty("glowBlur", "number", this.glowBlur, {
            description: "Glow blur amount",
            onChange: val => { this.glowBlur = val; }
        });
    }

    style(style) {
        style.startGroup("Line", false, {
            backgroundColor: 'rgba(100,255,255,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("x1", "number", this.x1, { min: -1000, max: 1000 });
        style.exposeProperty("y1", "number", this.y1, { min: -1000, max: 1000 });
        style.exposeProperty("x2", "number", this.x2, { min: -1000, max: 1000 });
        style.exposeProperty("y2", "number", this.y2, { min: -1000, max: 1000 });
        style.exposeProperty("color", "color", this.color);
        style.exposeProperty("thickness", "number", this.thickness, { min: 1, max: 50 });
        style.endGroup();

        style.startGroup("Glow", false, {
            backgroundColor: 'rgba(0,255,255,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("glow", "boolean", this.glow);
        style.exposeProperty("glowColor", "color", this.glowColor);
        style.exposeProperty("glowBlur", "number", this.glowBlur, { min: 0, max: 50 });
        style.endGroup();
    }

    draw(ctx) {
        ctx.save();

        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.thickness;

        if (this.glow) {
            ctx.shadowColor = this.glowColor;
            ctx.shadowBlur = this.glowBlur;
        }

        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1);
        ctx.lineTo(this.x2, this.y2);
        ctx.stroke();

        ctx.restore();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            x1: this.x1,
            y1: this.y1,
            x2: this.x2,
            y2: this.y2,
            color: this.color,
            thickness: this.thickness,
            glow: this.glow,
            glowColor: this.glowColor,
            glowBlur: this.glowBlur
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        if (!data) return;
        this.x1 = data.x1 || 0;
        this.y1 = data.y1 || 0;
        this.x2 = data.x2 || 100;
        this.y2 = data.y2 || 0;
        this.color = data.color || "#ffffff";
        this.thickness = data.thickness || 2;
        this.glow = data.glow || false;
        this.glowColor = data.glowColor || "#00ffff";
        this.glowBlur = data.glowBlur || 10;
    }
}

window.DrawLine = DrawLine;
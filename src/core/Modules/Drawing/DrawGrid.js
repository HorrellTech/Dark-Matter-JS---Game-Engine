class DrawGrid extends Module {
    static namespace = "Drawing";
    static description = "Draws a customizable grid, optimized for viewport";
    static allowMultiple = true;
    static iconClass = "fas fa-th";

    constructor() {
        super("DrawGrid");

        this.x = 0;
        this.y = 0;
        this.width = 800;
        this.height = 600;
        this.cellWidth = 50;
        this.cellHeight = 50;
        this.lineColor = "#cccccc";
        this.lineThickness = 1;
        this.showVertical = true;
        this.showHorizontal = true;
        this.glow = false;
        this.glowColor = "#00ffff";
        this.glowBlur = 8;

        this.exposeProperty("x", "number", this.x, {
            description: "Grid X position",
            onChange: val => { this.x = val; }
        });
        this.exposeProperty("y", "number", this.y, {
            description: "Grid Y position",
            onChange: val => { this.y = val; }
        });
        this.exposeProperty("width", "number", this.width, {
            description: "Grid width",
            onChange: val => { this.width = val; }
        });
        this.exposeProperty("height", "number", this.height, {
            description: "Grid height",
            onChange: val => { this.height = val; }
        });
        this.exposeProperty("cellWidth", "number", this.cellWidth, {
            description: "Cell width",
            onChange: val => { this.cellWidth = Math.max(1, val); }
        });
        this.exposeProperty("cellHeight", "number", this.cellHeight, {
            description: "Cell height",
            onChange: val => { this.cellHeight = Math.max(1, val); }
        });
        this.exposeProperty("lineColor", "color", this.lineColor, {
            description: "Grid line color",
            onChange: val => { this.lineColor = val; }
        });
        this.exposeProperty("lineThickness", "number", this.lineThickness, {
            description: "Line thickness",
            onChange: val => { this.lineThickness = Math.max(1, val); }
        });
        this.exposeProperty("showVertical", "boolean", this.showVertical, {
            description: "Show vertical lines",
            onChange: val => { this.showVertical = val; }
        });
        this.exposeProperty("showHorizontal", "boolean", this.showHorizontal, {
            description: "Show horizontal lines",
            onChange: val => { this.showHorizontal = val; }
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
        style.startGroup("Grid Area", false, {
            backgroundColor: 'rgba(200,200,255,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("x", "number", this.x, { min: -2000, max: 2000 });
        style.exposeProperty("y", "number", this.y, { min: -2000, max: 2000 });
        style.exposeProperty("width", "number", this.width, { min: 1, max: 4000 });
        style.exposeProperty("height", "number", this.height, { min: 1, max: 4000 });
        style.endGroup();

        style.startGroup("Cells", false, {
            backgroundColor: 'rgba(150,255,200,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("cellWidth", "number", this.cellWidth, { min: 1, max: 500 });
        style.exposeProperty("cellHeight", "number", this.cellHeight, { min: 1, max: 500 });
        style.endGroup();

        style.startGroup("Lines", false, {
            backgroundColor: 'rgba(200,255,200,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("lineColor", "color", this.lineColor);
        style.exposeProperty("lineThickness", "number", this.lineThickness, { min: 1, max: 20 });
        style.exposeProperty("showVertical", "boolean", this.showVertical);
        style.exposeProperty("showHorizontal", "boolean", this.showHorizontal);
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
        // Get viewport for optimization
        const vp = window.engine.viewport
            ? window.engine.viewport
            : { x: 0, y: 0, width: ctx.canvas.width, height: ctx.canvas.height };

        ctx.save();
        ctx.strokeStyle = this.lineColor;
        ctx.lineWidth = this.lineThickness;
        if (this.glow) {
            ctx.shadowColor = this.glowColor;
            ctx.shadowBlur = this.glowBlur;
        }

        // Vertical lines
        if (this.showVertical) {
            let startX = Math.max(this.x, vp.x);
            let endX = Math.min(this.x + this.width, vp.x + vp.width);
            for (
                let gx = this.x;
                gx <= this.x + this.width;
                gx += this.cellWidth
            ) {
                if (gx < startX || gx > endX) continue;
                ctx.beginPath();
                ctx.moveTo(gx, Math.max(this.y, vp.y));
                ctx.lineTo(gx, Math.min(this.y + this.height, vp.y + vp.height));
                ctx.stroke();
            }
        }

        // Horizontal lines
        if (this.showHorizontal) {
            let startY = Math.max(this.y, vp.y);
            let endY = Math.min(this.y + this.height, vp.y + vp.height);
            for (
                let gy = this.y;
                gy <= this.y + this.height;
                gy += this.cellHeight
            ) {
                if (gy < startY || gy > endY) continue;
                ctx.beginPath();
                ctx.moveTo(Math.max(this.x, vp.x), gy);
                ctx.lineTo(Math.min(this.x + this.width, vp.x + vp.width), gy);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            cellWidth: this.cellWidth,
            cellHeight: this.cellHeight,
            lineColor: this.lineColor,
            lineThickness: this.lineThickness,
            showVertical: this.showVertical,
            showHorizontal: this.showHorizontal,
            glow: this.glow,
            glowColor: this.glowColor,
            glowBlur: this.glowBlur
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        if (!data) return;
        this.x = data.x || 0;
        this.y = data.y || 0;
        this.width = data.width || 800;
        this.height = data.height || 600;
        this.cellWidth = data.cellWidth || 50;
        this.cellHeight = data.cellHeight || 50;
        this.lineColor = data.lineColor || "#cccccc";
        this.lineThickness = data.lineThickness || 1;
        this.showVertical = data.showVertical !== undefined ? data.showVertical : true;
        this.showHorizontal = data.showHorizontal !== undefined ? data.showHorizontal : true;
        this.glow = data.glow || false;
        this.glowColor = data.glowColor || "#00ffff";
        this.glowBlur = data.glowBlur || 8;
    }
}

window.DrawGrid = DrawGrid;
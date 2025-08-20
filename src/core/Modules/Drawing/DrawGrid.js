class DrawGrid extends Module {
    static namespace = "Drawing";
    static description = "Draws an infinite, scalable grid optimized for viewport rendering";
    static allowMultiple = true;
    static iconClass = "fas fa-th";
    static iconColor = "#a200ffff";

    constructor() {
        super("DrawGrid");

        this.x = 0;
        this.y = 0;
        this.cellWidth = 50;
        this.cellHeight = 50;
        this.lineColor = "#cccccc";
        this.lineThickness = 1;
        this.showVertical = true;
        this.showHorizontal = true;
        this.glow = false;
        this.glowColor = "#00ffff";
        this.glowBlur = 8;
        this.infinite = true;
        this.width = 800;  // Used when infinite is false
        this.height = 600; // Used when infinite is false

        this.exposeProperty("x", "number", this.x, {
            description: "Grid X offset position",
            onChange: val => { this.x = val; }
        });
        this.exposeProperty("y", "number", this.y, {
            description: "Grid Y offset position",
            onChange: val => { this.y = val; }
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
            onChange: val => { this.lineThickness = Math.max(0.1, val); }
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
        this.exposeProperty("infinite", "boolean", this.infinite, {
            description: "Enable infinite grid generation",
            onChange: val => { this.infinite = val; }
        });
        this.exposeProperty("width", "number", this.width, {
            description: "Grid width (when not infinite)",
            onChange: val => { this.width = val; }
        });
        this.exposeProperty("height", "number", this.height, {
            description: "Grid height (when not infinite)",
            onChange: val => { this.height = val; }
        });
    }

    style(style) {
        style.startGroup("Grid Position", false, {
            backgroundColor: 'rgba(200,200,255,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("x", "number", this.x, { min: -10000, max: 10000 });
        style.exposeProperty("y", "number", this.y, { min: -10000, max: 10000 });
        style.exposeProperty("infinite", "boolean", this.infinite);
        if (!this.infinite) {
            style.exposeProperty("width", "number", this.width, { min: 1, max: 10000 });
            style.exposeProperty("height", "number", this.height, { min: 1, max: 10000 });
        }
        style.endGroup();

        style.startGroup("Cells", false, {
            backgroundColor: 'rgba(150,255,200,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("cellWidth", "number", this.cellWidth, { min: 1, max: 1000 });
        style.exposeProperty("cellHeight", "number", this.cellHeight, { min: 1, max: 1000 });
        style.endGroup();

        style.startGroup("Lines", false, {
            backgroundColor: 'rgba(200,255,200,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("lineColor", "color", this.lineColor);
        style.exposeProperty("lineThickness", "number", this.lineThickness, { min: 0.1, max: 20 });
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
        // Get viewport with fallback
        const vp = window.engine?.viewport || { 
            x: 0, 
            y: 0, 
            width: ctx.canvas.width, 
            height: ctx.canvas.height 
        };

        this.gameObject.position.x = 0;
        this.gameObject.position.y = 0;

        // Early exit if no lines to show
        if (!this.showVertical && !this.showHorizontal) return;

        ctx.save();
        ctx.strokeStyle = this.lineColor;
        ctx.lineWidth = this.lineThickness;
        
        // Apply glow effect
        if (this.glow) {
            ctx.shadowColor = this.glowColor;
            ctx.shadowBlur = this.glowBlur;
        }

        // Determine grid bounds
        let minX, maxX, minY, maxY;
        
        if (this.infinite) {
            // For infinite grid, use viewport bounds with some padding
            const padding = Math.max(this.cellWidth, this.cellHeight);
            minX = vp.x - padding;
            maxX = vp.x + vp.width + padding;
            minY = vp.y - padding;
            maxY = vp.y + vp.height + padding;
        } else {
            // For bounded grid, use grid bounds intersected with viewport
            minX = Math.max(this.x, vp.x);
            maxX = Math.min(this.x + this.width, vp.x + vp.width);
            minY = Math.max(this.y, vp.y);
            maxY = Math.min(this.y + this.height, vp.y + vp.height);
            
            // Early exit if grid is completely outside viewport
            if (minX >= maxX || minY >= maxY) {
                ctx.restore();
                return;
            }
        }

        // Draw vertical lines
        if (this.showVertical && this.cellWidth > 0) {
            // Calculate first vertical line position
            const firstVertical = this.infinite 
                ? Math.floor((minX - this.x) / this.cellWidth) * this.cellWidth + this.x
                : this.x;
            
            const verticalEnd = this.infinite ? maxX : Math.min(this.x + this.width, maxX);
            const verticalTop = this.infinite ? minY : Math.max(this.y, minY);
            const verticalBottom = this.infinite ? maxY : Math.min(this.y + this.height, maxY);
            
            for (let gx = firstVertical; gx <= verticalEnd; gx += this.cellWidth) {
                if (gx < minX) continue;
                if (!this.infinite && (gx < this.x || gx > this.x + this.width)) continue;
                
                ctx.beginPath();
                ctx.moveTo(gx, verticalTop);
                ctx.lineTo(gx, verticalBottom);
                ctx.stroke();
            }
        }

        // Draw horizontal lines  
        if (this.showHorizontal && this.cellHeight > 0) {
            // Calculate first horizontal line position
            const firstHorizontal = this.infinite
                ? Math.floor((minY - this.y) / this.cellHeight) * this.cellHeight + this.y
                : this.y;
                
            const horizontalEnd = this.infinite ? maxY : Math.min(this.y + this.height, maxY);
            const horizontalLeft = this.infinite ? minX : Math.max(this.x, minX);
            const horizontalRight = this.infinite ? maxX : Math.min(this.x + this.width, maxX);
            
            for (let gy = firstHorizontal; gy <= horizontalEnd; gy += this.cellHeight) {
                if (gy < minY) continue;
                if (!this.infinite && (gy < this.y || gy > this.y + this.height)) continue;
                
                ctx.beginPath();
                ctx.moveTo(horizontalLeft, gy);
                ctx.lineTo(horizontalRight, gy);
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
            glowBlur: this.glowBlur,
            infinite: this.infinite
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
        this.infinite = data.infinite !== undefined ? data.infinite : true;
    }
}

window.DrawGrid = DrawGrid;
class DrawStar extends Module {
    static namespace = "Drawing";
    static description = "Scalable star shape for ratings and pickups";
    static allowMultiple = false;
    static iconClass = "fas fa-star";

    constructor() {
        super("DrawStar");

        this.fillColor = "#ffdd00";
        this.outlineColor = "#cc8800";
        this.outlineWidth = 2;
        this.filled = true;
        this.outlined = true;
        this.points = 5;
        this.innerRadius = 0.4;
        
        this.exposeProperty("fillColor", "color", this.fillColor, {
            description: "Star fill color",
            onChange: (val) => { this.fillColor = val; }
        });
        
        this.exposeProperty("outlineColor", "color", this.outlineColor, {
            description: "Star outline color",
            onChange: (val) => { this.outlineColor = val; }
        });
        
        this.exposeProperty("outlineWidth", "number", this.outlineWidth, {
            description: "Outline thickness",
            onChange: (val) => { this.outlineWidth = val; }
        });
        
        this.exposeProperty("filled", "boolean", this.filled, {
            description: "Fill the star",
            onChange: (val) => { this.filled = val; }
        });
        
        this.exposeProperty("outlined", "boolean", this.outlined, {
            description: "Draw outline",
            onChange: (val) => { this.outlined = val; }
        });
        
        this.exposeProperty("points", "number", this.points, {
            description: "Number of points",
            onChange: (val) => { this.points = Math.max(3, Math.floor(val)); }
        });
        
        this.exposeProperty("innerRadius", "number", this.innerRadius, {
            description: "Inner radius ratio",
            onChange: (val) => { this.innerRadius = Math.max(0.1, Math.min(0.9, val)); }
        });
    }

    style(style) {
        style.startGroup("Star Shape", false, { 
            backgroundColor: 'rgba(255,221,0,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        
        style.exposeProperty("points", "number", this.points, {
            description: "Number of star points",
            min: 3,
            max: 12,
            step: 1,
            style: { label: "Points", slider: true }
        });
        
        style.exposeProperty("innerRadius", "number", this.innerRadius, {
            description: "Inner radius as ratio of outer radius",
            min: 0.1,
            max: 0.9,
            step: 0.05,
            style: { label: "Inner Radius", slider: true }
        });
        
        style.endGroup();
        
        style.startGroup("Star Appearance", false, { 
            backgroundColor: 'rgba(255,221,0,0.1)',
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
        style.addHelpText("Great for collectibles, ratings, and decorative elements");
    }

    draw(ctx) {
        const pos = this.gameObject.getWorldPosition();
        const scale = this.gameObject.scale;
        
        ctx.save();
        
        const outerRadius = 30;
        const innerRadius = outerRadius * this.innerRadius;
        const angleStep = (Math.PI * 2) / this.points;
        
        ctx.beginPath();
        for (let i = 0; i < this.points * 2; i++) {
            const angle = i * (angleStep / 2) - Math.PI / 2;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
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
            points: this.points,
            innerRadius: this.innerRadius
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        if (!data) return;
        
        this.fillColor = data.fillColor || "#ffdd00";
        this.outlineColor = data.outlineColor || "#cc8800";
        this.outlineWidth = data.outlineWidth || 2;
        this.filled = data.filled !== undefined ? data.filled : true;
        this.outlined = data.outlined !== undefined ? data.outlined : true;
        this.points = data.points || 5;
        this.innerRadius = data.innerRadius || 0.4;
    }
}

window.DrawStar = DrawStar;
class DrawHeart extends Module {
    static namespace = "Drawing";
    static description = "Scalable heart shape for health/love indicators";
    static allowMultiple = false;
    static iconClass = "fas fa-heart";

    constructor() {
        super("DrawHeart");

        this.fillColor = "#ff4444";
        this.outlineColor = "#aa0000";
        this.outlineWidth = 2;
        this.filled = true;
        this.outlined = true;
        
        // Gradient properties
        this.useGradient = false;
        this.gradientColor1 = "#ff6b6b";
        this.gradientColor2 = "#c44569";
        this.gradientType = "radial"; // "linear" or "radial"
        this.gradientAngle = 0; // for linear gradients
        
        // Independent scaling properties
        this.horizontalScale = 1.0;
        this.verticalScale = 1.0;
        
        this.exposeProperty("fillColor", "color", this.fillColor, {
            description: "Heart fill color (used when gradient is off)",
            onChange: (val) => { this.fillColor = val; }
        });
        
        this.exposeProperty("outlineColor", "color", this.outlineColor, {
            description: "Heart outline color",
            onChange: (val) => { this.outlineColor = val; }
        });
        
        this.exposeProperty("outlineWidth", "number", this.outlineWidth, {
            description: "Outline thickness",
            onChange: (val) => { this.outlineWidth = val; }
        });
        
        this.exposeProperty("filled", "boolean", this.filled, {
            description: "Fill the heart",
            onChange: (val) => { this.filled = val; }
        });
        
        this.exposeProperty("outlined", "boolean", this.outlined, {
            description: "Draw outline",
            onChange: (val) => { this.outlined = val; }
        });
        
        this.exposeProperty("useGradient", "boolean", this.useGradient, {
            description: "Use gradient fill instead of solid color",
            onChange: (val) => { this.useGradient = val; }
        });
        
        this.exposeProperty("gradientColor1", "color", this.gradientColor1, {
            description: "First gradient color",
            onChange: (val) => { this.gradientColor1 = val; }
        });
        
        this.exposeProperty("gradientColor2", "color", this.gradientColor2, {
            description: "Second gradient color",
            onChange: (val) => { this.gradientColor2 = val; }
        });
        
        this.exposeProperty("gradientType", "string", this.gradientType, {
            description: "Gradient type (linear or radial)",
            onChange: (val) => { this.gradientType = val; }
        });
        
        this.exposeProperty("gradientAngle", "number", this.gradientAngle, {
            description: "Gradient angle in degrees (for linear gradients)",
            onChange: (val) => { this.gradientAngle = val; }
        });
        
        this.exposeProperty("horizontalScale", "number", this.horizontalScale, {
            description: "Independent horizontal scaling",
            onChange: (val) => { this.horizontalScale = val; }
        });
        
        this.exposeProperty("verticalScale", "number", this.verticalScale, {
            description: "Independent vertical scaling",
            onChange: (val) => { this.verticalScale = val; }
        });
    }

    style(style) {
        style.startGroup("Heart Appearance", false, { 
            backgroundColor: 'rgba(255,68,68,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        
        style.exposeProperty("fillColor", "color", this.fillColor, {
            description: "Color of the heart fill (when gradient is off)",
            style: { label: "Fill Color" }
        });
        
        style.exposeProperty("outlineColor", "color", this.outlineColor, {
            description: "Color of the heart outline",
            style: { label: "Outline Color" }
        });
        
        style.exposeProperty("outlineWidth", "number", this.outlineWidth, {
            description: "Thickness of the outline",
            min: 0,
            max: 20,
            step: 1,
            style: { label: "Outline Width", slider: true }
        });
        
        style.exposeProperty("filled", "boolean", this.filled, {
            description: "Whether to fill the heart with color",
            style: { label: "Filled" }
        });
        
        style.exposeProperty("outlined", "boolean", this.outlined, {
            description: "Whether to draw an outline",
            style: { label: "Outlined" }
        });
        
        style.endGroup();
        
        style.startGroup("Gradient Options", false, { 
            backgroundColor: 'rgba(196,69,105,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        
        style.exposeProperty("useGradient", "boolean", this.useGradient, {
            description: "Use gradient fill instead of solid color",
            style: { label: "Use Gradient" }
        });
        
        style.exposeProperty("gradientColor1", "color", this.gradientColor1, {
            description: "First gradient color",
            style: { label: "Gradient Color 1" }
        });
        
        style.exposeProperty("gradientColor2", "color", this.gradientColor2, {
            description: "Second gradient color",
            style: { label: "Gradient Color 2" }
        });
        
        style.exposeProperty("gradientType", "select", this.gradientType, {
            description: "Type of gradient to apply",
            options: ["linear", "radial"],
            style: { label: "Gradient Type" }
        });
        
        style.exposeProperty("gradientAngle", "number", this.gradientAngle, {
            description: "Angle in degrees for linear gradients",
            min: 0,
            max: 360,
            step: 15,
            style: { label: "Gradient Angle", slider: true }
        });
        
        style.endGroup();
        
        style.startGroup("Scaling", false, { 
            backgroundColor: 'rgba(107,107,255,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        
        style.exposeProperty("horizontalScale", "number", this.horizontalScale, {
            description: "Independent horizontal scaling factor",
            min: 0.1,
            max: 3.0,
            step: 0.1,
            style: { label: "Horizontal Scale", slider: true }
        });
        
        style.exposeProperty("verticalScale", "number", this.verticalScale, {
            description: "Independent vertical scaling factor",
            min: 0.1,
            max: 3.0,
            step: 0.1,
            style: { label: "Vertical Scale", slider: true }
        });
        
        style.endGroup();
        
        style.addHelpText("Perfect for health indicators and UI elements. Use gradient for more visual appeal!");
    }

    createGradient(ctx, bounds) {
        let gradient;
        
        if (this.gradientType === "radial") {
            const centerX = bounds.centerX;
            const centerY = bounds.centerY;
            const radius = Math.max(bounds.width, bounds.height) / 2;
            gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        } else {
            // Linear gradient
            const angleRad = (this.gradientAngle * Math.PI) / 180;
            const cos = Math.cos(angleRad);
            const sin = Math.sin(angleRad);
            
            const x1 = bounds.centerX - (cos * bounds.width) / 2;
            const y1 = bounds.centerY - (sin * bounds.height) / 2;
            const x2 = bounds.centerX + (cos * bounds.width) / 2;
            const y2 = bounds.centerY + (sin * bounds.height) / 2;
            
            gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        }
        
        gradient.addColorStop(0, this.gradientColor1);
        gradient.addColorStop(1, this.gradientColor2);
        
        return gradient;
    }

    draw(ctx) {
        ctx.save();
        
        // Apply position and combined scaling
        ctx.scale(this.horizontalScale, this.verticalScale);
        
        // Create proper heart shape using mathematical heart curve
        const size = 20; // Base size multiplier
        
        ctx.beginPath();
        
        // Use parametric heart equations for a perfect heart shape
        // Heart equation: x = 16sin³(t), y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
        const steps = 100;
        let firstPoint = true;
        
        for (let i = 0; i <= steps; i++) {
            const t = (i / steps) * 2 * Math.PI;
            
            // Heart curve equations (scaled and adjusted)
            const x = size * Math.pow(Math.sin(t), 3);
            const y = -size * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16;
            
            if (firstPoint) {
                ctx.moveTo(x, y);
                firstPoint = false;
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.closePath();
        
        if (this.filled) {
            if (this.useGradient) {
                // Calculate bounds for gradient
                const bounds = {
                    centerX: 0,
                    centerY: -size * 0.5,
                    width: size * 2.5,
                    height: size * 2
                };
                
                ctx.fillStyle = this.createGradient(ctx, bounds);
            } else {
                ctx.fillStyle = this.fillColor;
            }
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
            useGradient: this.useGradient,
            gradientColor1: this.gradientColor1,
            gradientColor2: this.gradientColor2,
            gradientType: this.gradientType,
            gradientAngle: this.gradientAngle,
            horizontalScale: this.horizontalScale,
            verticalScale: this.verticalScale
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        if (!data) return;
        
        this.fillColor = data.fillColor || "#ff4444";
        this.outlineColor = data.outlineColor || "#aa0000";
        this.outlineWidth = data.outlineWidth || 2;
        this.filled = data.filled !== undefined ? data.filled : true;
        this.outlined = data.outlined !== undefined ? data.outlined : true;
        
        this.useGradient = data.useGradient !== undefined ? data.useGradient : false;
        this.gradientColor1 = data.gradientColor1 || "#ff6b6b";
        this.gradientColor2 = data.gradientColor2 || "#c44569";
        this.gradientType = data.gradientType || "radial";
        this.gradientAngle = data.gradientAngle !== undefined ? data.gradientAngle : 0;
        
        this.horizontalScale = data.horizontalScale !== undefined ? data.horizontalScale : 1.0;
        this.verticalScale = data.verticalScale !== undefined ? data.verticalScale : 1.0;
    }
}

window.DrawHeart = DrawHeart;
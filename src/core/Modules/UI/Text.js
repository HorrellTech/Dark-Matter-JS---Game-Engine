/**
 * Text - Displays text with various formatting options
 */
class Text extends Module {
    static allowMultiple = false;
    static namespace = "UI";
    static description = "Displays formatted text";
    static iconClass = "fas fa-font";

    constructor() {
        super("Text");
        
        // Text properties
        this.text = "Hello World";
        this.fontSize = 16;
        this.fontFamily = "Arial, sans-serif";
        this.fontWeight = "normal";
        this.fontStyle = "normal";
        this.color = "#ffffff";
        this.textAlign = "center";
        this.textBaseline = "middle";
        this.maxWidth = 0; // 0 = no limit
        this.lineHeight = 1.2;
        this.wordWrap = false;
        
        // Background properties
        this.showBackground = false;
        this.backgroundColor = "#000000";
        this.backgroundPadding = 5;
        this.backgroundRadius = 0;
        
        // Outline properties
        this.showOutline = false;
        this.outlineColor = "#000000";
        this.outlineWidth = 2;
        
        // Shadow properties
        this.showShadow = false;
        this.shadowColor = "#000000";
        this.shadowOffsetX = 2;
        this.shadowOffsetY = 2;
        this.shadowBlur = 0;
        
        // Expose properties
        this.exposeProperty("text", "string", this.text, {
            description: "Text to display",
            onchange: (val) => {
                this.setText(val);
            }
        });
        
        this.exposeProperty("fontSize", "number", this.fontSize, {
            min: 8,
            max: 128,
            step: 1,
            description: "Font size in pixels",
            onchange: (val) => {
                this.fontSize = val;
            }
        });
        
        this.exposeProperty("fontFamily", "string", this.fontFamily, {
            description: "Font family (e.g., Arial, Times New Roman)",
            onchange: (val) => {
                this.fontFamily = val;
            }
        });
        
        this.exposeProperty("fontWeight", "enum", this.fontWeight, {
            options: ["normal", "bold", "lighter", "bolder"],
            description: "Font weight",
            onchange: (val) => {
                this.fontWeight = val;
            }
        });
        
        this.exposeProperty("fontStyle", "enum", this.fontStyle, {
            options: ["normal", "italic", "oblique"],
            description: "Font style",
            onchange: (val) => {
                this.fontStyle = val;
            }
        });
        
        this.exposeProperty("color", "color", this.color, {
            description: "Text color",
            onchange: (val) => {
                this.color = val;
            }
        });
        
        this.exposeProperty("textAlign", "enum", this.textAlign, {
            options: ["left", "center", "right", "start", "end"],
            description: "Text alignment",
            onchange: (val) => {
                this.textAlign = val;
            }
        });
        
        this.exposeProperty("textBaseline", "enum", this.textBaseline, {
            options: ["top", "hanging", "middle", "alphabetic", "ideographic", "bottom"],
            description: "Text baseline",
            onchange: (val) => {
                this.textBaseline = val;
            }
        });
        
        this.exposeProperty("maxWidth", "number", this.maxWidth, {
            min: 0,
            max: 1000,
            step: 1,
            description: "Maximum width (0 = no limit)",
            onchange: (val) => {
                this.maxWidth = val;
            }
        });
        
        this.exposeProperty("lineHeight", "number", this.lineHeight, {
            min: 0.5,
            max: 3,
            step: 0.1,
            description: "Line height multiplier",
            onchange: (val) => {
                this.lineHeight = val;
            }
        });
        
        this.exposeProperty("wordWrap", "boolean", this.wordWrap, {
            description: "Enable word wrapping",
            onchange: (val) => {
                this.wordWrap = val;
            }
        });
        
        this.exposeProperty("showBackground", "boolean", this.showBackground, {
            description: "Show background behind text",
            onchange: (val) => {
                this.showBackground = val;
            }
        });
        
        this.exposeProperty("backgroundColor", "color", this.backgroundColor, {
            description: "Background color",
            onchange: (val) => {
                this.backgroundColor = val;
            }
        });
        
        this.exposeProperty("backgroundPadding", "number", this.backgroundPadding, {
            min: 0,
            max: 50,
            step: 1,
            description: "Background padding in pixels",
            onchange: (val) => {
                this.backgroundPadding = val;
            }
        });
        
        this.exposeProperty("backgroundRadius", "number", this.backgroundRadius, {
            min: 0,
            max: 50,
            step: 1,
            description: "Background border radius",
            onchange: (val) => {
                this.backgroundRadius = val;
            }
        });
        
        this.exposeProperty("showOutline", "boolean", this.showOutline, {
            description: "Show text outline",
            onchange: (val) => {
                this.showOutline = val;
            }
        });
        
        this.exposeProperty("outlineColor", "color", this.outlineColor, {
            description: "Outline color",
            onchange: (val) => {
                this.outlineColor = val;
            }
        });
        
        this.exposeProperty("outlineWidth", "number", this.outlineWidth, {
            min: 1,
            max: 10,
            step: 1,
            description: "Outline width in pixels",
            onchange: (val) => {
                this.outlineWidth = val;
            }
        });
        
        this.exposeProperty("showShadow", "boolean", this.showShadow, {
            description: "Show text shadow",
            onchange: (val) => {
                this.showShadow = val;
            }
        });
        
        this.exposeProperty("shadowColor", "color", this.shadowColor, {
            description: "Shadow color",
            onchange: (val) => {
                this.shadowColor = val;
            }
        });
        
        this.exposeProperty("shadowOffsetX", "number", this.shadowOffsetX, {
            min: -20,
            max: 20,
            step: 1,
            description: "Shadow X offset",
            onchange: (val) => {
                this.shadowOffsetX = val;
            }
        });
        
        this.exposeProperty("shadowOffsetY", "number", this.shadowOffsetY, {
            min: -20,
            max: 20,
            step: 1,
            description: "Shadow Y offset",
            onchange: (val) => {
                this.shadowOffsetY = val;
            }
        });
        
        this.exposeProperty("shadowBlur", "number", this.shadowBlur, {
            min: 0,
            max: 20,
            step: 1,
            description: "Shadow blur amount",
            onchange: (val) => {
                this.shadowBlur = val;
            }
        });
    }
    
    /**
     * Set the text content
     */
    setText(newText) {
        this.text = newText;
    }
    
    /**
     * Get the text content
     */
    getText() {
        return this.text;
    }
    
    draw(ctx) {
        if (!this.enabled || !this.text) return;
        
        ctx.save();
        
        // Set up font
        const fontString = `${this.fontStyle} ${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`;
        ctx.font = fontString;
        ctx.textAlign = this.textAlign;
        ctx.textBaseline = this.textBaseline;
        
        // Prepare text lines
        const lines = this.prepareTextLines(ctx);
        const lineHeightPx = this.fontSize * this.lineHeight;
        
        // Calculate text bounds for background
        if (this.showBackground) {
            this.drawBackground(ctx, lines, lineHeightPx);
        }
        
        // Set up shadow
        if (this.showShadow) {
            ctx.shadowColor = this.shadowColor;
            ctx.shadowOffsetX = this.shadowOffsetX;
            ctx.shadowOffsetY = this.shadowOffsetY;
            ctx.shadowBlur = this.shadowBlur;
        }
        
        // Draw text outline
        if (this.showOutline) {
            ctx.strokeStyle = this.outlineColor;
            ctx.lineWidth = this.outlineWidth;
            ctx.lineJoin = "round";
            
            this.drawTextLines(ctx, lines, lineHeightPx, true);
        }
        
        // Draw text fill
        ctx.fillStyle = this.color;
        this.drawTextLines(ctx, lines, lineHeightPx, false);
        
        ctx.restore();
    }
    
    prepareTextLines(ctx) {
        if (!this.wordWrap || this.maxWidth <= 0) {
            return this.text.split('\n');
        }
        
        const words = this.text.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > this.maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }
    
    drawTextLines(ctx, lines, lineHeight, isStroke = false) {
        const startY = -(lines.length - 1) * lineHeight / 2;
        
        for (let i = 0; i < lines.length; i++) {
            const y = startY + i * lineHeight;
            
            if (isStroke) {
                ctx.strokeText(lines[i], 0, y);
            } else {
                ctx.fillText(lines[i], 0, y);
            }
        }
    }
    
    drawBackground(ctx, lines, lineHeight) {
        // Calculate background bounds
        let maxWidth = 0;
        for (const line of lines) {
            const metrics = ctx.measureText(line);
            maxWidth = Math.max(maxWidth, metrics.width);
        }
        
        const bgWidth = maxWidth + this.backgroundPadding * 2;
        const bgHeight = lines.length * lineHeight + this.backgroundPadding * 2;
        
        ctx.fillStyle = this.backgroundColor;
        
        if (this.backgroundRadius > 0) {
            this.drawRoundedRect(ctx, -bgWidth/2, -bgHeight/2, bgWidth, bgHeight, this.backgroundRadius);
            ctx.fill();
        } else {
            ctx.fillRect(-bgWidth/2, -bgHeight/2, bgWidth, bgHeight);
        }
    }
    
    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
    
    toJSON() {
        const json = super.toJSON();
        json.text = this.text;
        json.fontSize = this.fontSize;
        json.fontFamily = this.fontFamily;
        json.fontWeight = this.fontWeight;
        json.fontStyle = this.fontStyle;
        json.color = this.color;
        json.textAlign = this.textAlign;
        json.textBaseline = this.textBaseline;
        json.maxWidth = this.maxWidth;
        json.lineHeight = this.lineHeight;
        json.wordWrap = this.wordWrap;
        json.showBackground = this.showBackground;
        json.backgroundColor = this.backgroundColor;
        json.backgroundPadding = this.backgroundPadding;
        json.backgroundRadius = this.backgroundRadius;
        json.showOutline = this.showOutline;
        json.outlineColor = this.outlineColor;
        json.outlineWidth = this.outlineWidth;
        json.showShadow = this.showShadow;
        json.shadowColor = this.shadowColor;
        json.shadowOffsetX = this.shadowOffsetX;
        json.shadowOffsetY = this.shadowOffsetY;
        json.shadowBlur = this.shadowBlur;
        return json;
    }
    
    fromJSON(json) {
        super.fromJSON(json);
        if (json.text !== undefined) this.text = json.text;
        if (json.fontSize !== undefined) this.fontSize = json.fontSize;
        if (json.fontFamily !== undefined) this.fontFamily = json.fontFamily;
        if (json.fontWeight !== undefined) this.fontWeight = json.fontWeight;
        if (json.fontStyle !== undefined) this.fontStyle = json.fontStyle;
        if (json.color !== undefined) this.color = json.color;
        if (json.textAlign !== undefined) this.textAlign = json.textAlign;
        if (json.textBaseline !== undefined) this.textBaseline = json.textBaseline;
        if (json.maxWidth !== undefined) this.maxWidth = json.maxWidth;
        if (json.lineHeight !== undefined) this.lineHeight = json.lineHeight;
        if (json.wordWrap !== undefined) this.wordWrap = json.wordWrap;
        if (json.showBackground !== undefined) this.showBackground = json.showBackground;
        if (json.backgroundColor !== undefined) this.backgroundColor = json.backgroundColor;
        if (json.backgroundPadding !== undefined) this.backgroundPadding = json.backgroundPadding;
        if (json.backgroundRadius !== undefined) this.backgroundRadius = json.backgroundRadius;
        if (json.showOutline !== undefined) this.showOutline = json.showOutline;
        if (json.outlineColor !== undefined) this.outlineColor = json.outlineColor;
        if (json.outlineWidth !== undefined) this.outlineWidth = json.outlineWidth;
        if (json.showShadow !== undefined) this.showShadow = json.showShadow;
        if (json.shadowColor !== undefined) this.shadowColor = json.shadowColor;
        if (json.shadowOffsetX !== undefined) this.shadowOffsetX = json.shadowOffsetX;
        if (json.shadowOffsetY !== undefined) this.shadowOffsetY = json.shadowOffsetY;
        if (json.shadowBlur !== undefined) this.shadowBlur = json.shadowBlur;
    }
}

window.Text = Text;
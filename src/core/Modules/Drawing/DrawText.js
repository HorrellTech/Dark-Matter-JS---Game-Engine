class DrawText extends Module {
    static namespace = "Drawing";
    static description = "Draws customizable text with shadows, outlines, gradients and effects";
    static allowMultiple = true;
    static iconClass = "fas fa-font";

    constructor() {
        super("DrawText");

        // Text content and basic properties
        this.text = "Hello World";
        this.fontSize = 32;
        this.fontFamily = "Arial";
        this.fontWeight = "normal";
        this.fontStyle = "normal";
        
        // Colors and fill
        this.fillColor = "#ffffff";
        this.useGradient = false;
        this.gradientStartColor = "#ff0000";
        this.gradientEndColor = "#0000ff";
        this.gradientAngle = 0;
        
        // Outline
        this.hasOutline = false;
        this.outlineColor = "#000000";
        this.outlineWidth = 2;
        
        // Shadow
        this.hasShadow = false;
        this.shadowColor = "#000000";
        this.shadowOffsetX = 2;
        this.shadowOffsetY = 2;
        this.shadowBlur = 4;
        
        // Text alignment and positioning
        this.textAlign = "center";
        this.textBaseline = "middle";
        this.lineHeight = 1.2;
        this.letterSpacing = 0;
        this.wordSpacing = 0;
        
        // Effects
        this.opacity = 1.0;
        this.rotation = 0;
        this.skewX = 0;
        this.skewY = 0;
        this.scaleX = 1.0;
        this.scaleY = 1.0;
        
        // Animation effects
        this.wave = false;
        this.waveAmplitude = 5;
        this.waveFrequency = 2;
        this.waveSpeed = 2;
        this.rainbow = false;
        this.rainbowSpeed = 1;
        
        // Text wrapping
        this.maxWidth = 0; // 0 = no wrapping
        this.wordWrap = true;
        
        // Background
        this.hasBackground = false;
        this.backgroundColor = "#000000";
        this.backgroundPadding = 10;
        this.backgroundRadius = 0;
        
        this.time = 0; // For animations

        this.exposeAllProperties();
    }

    exposeAllProperties() {
        // Text Content
        this.exposeProperty("text", "string", this.text, {
            description: "Text content to display",
            onChange: (val) => { this.text = val; }
        });

        // Font Properties
        this.exposeProperty("fontSize", "number", this.fontSize, {
            description: "Font size in pixels",
            onChange: (val) => { this.fontSize = val; }
        });

        this.exposeProperty("fontFamily", "select", this.fontFamily, {
            description: "Font family",
            options: ["Arial", "Helvetica", "Times New Roman", "Courier New", "Georgia", "Verdana", "Comic Sans MS", "Impact", "Trebuchet MS"],
            onChange: (val) => { this.fontFamily = val; }
        });

        this.exposeProperty("fontWeight", "enum", this.fontWeight, {
            description: "Font weight",
            options: ["normal", "bold", "lighter", "bolder", "100", "200", "300", "400", "500", "600", "700", "800", "900"],
            onChange: (val) => { this.fontWeight = val; }
        });

        this.exposeProperty("fontStyle", "enum", this.fontStyle, {
            description: "Font style",
            options: ["normal", "italic", "oblique"],
            onChange: (val) => { this.fontStyle = val; }
        });

        // Colors
        this.exposeProperty("fillColor", "color", this.fillColor, {
            description: "Text fill color",
            onChange: (val) => { this.fillColor = val; }
        });

        this.exposeProperty("useGradient", "boolean", this.useGradient, {
            description: "Use gradient fill instead of solid color",
            onChange: (val) => { this.useGradient = val; }
        });

        this.exposeProperty("gradientStartColor", "color", this.gradientStartColor, {
            description: "Gradient start color",
            onChange: (val) => { this.gradientStartColor = val; }
        });

        this.exposeProperty("gradientEndColor", "color", this.gradientEndColor, {
            description: "Gradient end color",
            onChange: (val) => { this.gradientEndColor = val; }
        });

        this.exposeProperty("gradientAngle", "number", this.gradientAngle, {
            description: "Gradient angle in degrees",
            onChange: (val) => { this.gradientAngle = val; }
        });

        // Outline
        this.exposeProperty("hasOutline", "boolean", this.hasOutline, {
            description: "Enable text outline",
            onChange: (val) => { this.hasOutline = val; }
        });

        this.exposeProperty("outlineColor", "color", this.outlineColor, {
            description: "Outline color",
            onChange: (val) => { this.outlineColor = val; }
        });

        this.exposeProperty("outlineWidth", "number", this.outlineWidth, {
            description: "Outline width in pixels",
            onChange: (val) => { this.outlineWidth = val; }
        });

        // Shadow
        this.exposeProperty("hasShadow", "boolean", this.hasShadow, {
            description: "Enable text shadow",
            onChange: (val) => { this.hasShadow = val; }
        });

        this.exposeProperty("shadowColor", "color", this.shadowColor, {
            description: "Shadow color",
            onChange: (val) => { this.shadowColor = val; }
        });

        this.exposeProperty("shadowOffsetX", "number", this.shadowOffsetX, {
            description: "Shadow horizontal offset",
            onChange: (val) => { this.shadowOffsetX = val; }
        });

        this.exposeProperty("shadowOffsetY", "number", this.shadowOffsetY, {
            description: "Shadow vertical offset",
            onChange: (val) => { this.shadowOffsetY = val; }
        });

        this.exposeProperty("shadowBlur", "number", this.shadowBlur, {
            description: "Shadow blur radius",
            onChange: (val) => { this.shadowBlur = val; }
        });

        // Alignment
        this.exposeProperty("textAlign", "enum", this.textAlign, {
            description: "Text horizontal alignment",
            options: ["left", "center", "right", "start", "end"],
            onChange: (val) => { this.textAlign = val; }
        });

        this.exposeProperty("textBaseline", "enum", this.textBaseline, {
            description: "Text vertical alignment",
            options: ["top", "hanging", "middle", "alphabetic", "ideographic", "bottom"],
            onChange: (val) => { this.textBaseline = val; }
        });

        this.exposeProperty("lineHeight", "number", this.lineHeight, {
            description: "Line height multiplier for multi-line text",
            onChange: (val) => { this.lineHeight = val; }
        });

        this.exposeProperty("letterSpacing", "number", this.letterSpacing, {
            description: "Letter spacing in pixels",
            onChange: (val) => { this.letterSpacing = val; }
        });

        // Effects
        this.exposeProperty("opacity", "number", this.opacity, {
            description: "Text opacity (0-1)",
            onChange: (val) => { this.opacity = val; }
        });

        this.exposeProperty("rotation", "number", this.rotation, {
            description: "Text rotation in degrees",
            onChange: (val) => { this.rotation = val; }
        });

        this.exposeProperty("skewX", "number", this.skewX, {
            description: "Horizontal skew in degrees",
            onChange: (val) => { this.skewX = val; }
        });

        this.exposeProperty("skewY", "number", this.skewY, {
            description: "Vertical skew in degrees",
            onChange: (val) => { this.skewY = val; }
        });

        this.exposeProperty("scaleX", "number", this.scaleX, {
            description: "Horizontal scale multiplier",
            onChange: (val) => { this.scaleX = val; }
        });

        this.exposeProperty("scaleY", "number", this.scaleY, {
            description: "Vertical scale multiplier",
            onChange: (val) => { this.scaleY = val; }
        });

        // Animation Effects
        this.exposeProperty("wave", "boolean", this.wave, {
            description: "Enable wave animation effect",
            onChange: (val) => { this.wave = val; }
        });

        this.exposeProperty("waveAmplitude", "number", this.waveAmplitude, {
            description: "Wave effect amplitude",
            onChange: (val) => { this.waveAmplitude = val; }
        });

        this.exposeProperty("waveFrequency", "number", this.waveFrequency, {
            description: "Wave effect frequency",
            onChange: (val) => { this.waveFrequency = val; }
        });

        this.exposeProperty("waveSpeed", "number", this.waveSpeed, {
            description: "Wave animation speed",
            onChange: (val) => { this.waveSpeed = val; }
        });

        this.exposeProperty("rainbow", "boolean", this.rainbow, {
            description: "Enable rainbow color animation",
            onChange: (val) => { this.rainbow = val; }
        });

        this.exposeProperty("rainbowSpeed", "number", this.rainbowSpeed, {
            description: "Rainbow animation speed",
            onChange: (val) => { this.rainbowSpeed = val; }
        });

        // Text Wrapping
        this.exposeProperty("maxWidth", "number", this.maxWidth, {
            description: "Maximum width for text wrapping (0 = no wrapping)",
            onChange: (val) => { this.maxWidth = val; }
        });

        this.exposeProperty("wordWrap", "boolean", this.wordWrap, {
            description: "Enable word wrapping",
            onChange: (val) => { this.wordWrap = val; }
        });

        // Background
        this.exposeProperty("hasBackground", "boolean", this.hasBackground, {
            description: "Enable text background",
            onChange: (val) => { this.hasBackground = val; }
        });

        this.exposeProperty("backgroundColor", "color", this.backgroundColor, {
            description: "Background color",
            onChange: (val) => { this.backgroundColor = val; }
        });

        this.exposeProperty("backgroundPadding", "number", this.backgroundPadding, {
            description: "Background padding in pixels",
            onChange: (val) => { this.backgroundPadding = val; }
        });

        this.exposeProperty("backgroundRadius", "number", this.backgroundRadius, {
            description: "Background border radius",
            onChange: (val) => { this.backgroundRadius = val; }
        });
    }

    style(style) {
        style.startGroup("Text Content", false, {
            backgroundColor: 'rgba(100,150,255,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("text", "string", this.text);
        style.endGroup();

        style.startGroup("Font Properties", false, {
            backgroundColor: 'rgba(150,100,255,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("fontSize", "number", this.fontSize, { min: 1, max: 200 });
        style.exposeProperty("fontFamily", "enum", this.fontFamily, {
            options: ["Arial", "Helvetica", "Times New Roman", "Courier New", "Georgia", "Verdana", "Comic Sans MS", "Impact", "Trebuchet MS"]
        });
        style.exposeProperty("fontWeight", "enum", this.fontWeight, {
            options: ["normal", "bold", "lighter", "bolder", "100", "200", "300", "400", "500", "600", "700", "800", "900"]
        });
        style.exposeProperty("fontStyle", "enum", this.fontStyle, {
            options: ["normal", "italic", "oblique"]
        });
        style.endGroup();

        style.startGroup("Colors & Fill", false, {
            backgroundColor: 'rgba(255,150,100,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("fillColor", "color", this.fillColor);
        style.exposeProperty("useGradient", "boolean", this.useGradient);
        style.exposeProperty("gradientStartColor", "color", this.gradientStartColor);
        style.exposeProperty("gradientEndColor", "color", this.gradientEndColor);
        style.exposeProperty("gradientAngle", "number", this.gradientAngle, { min: 0, max: 360 });
        style.exposeProperty("rainbow", "boolean", this.rainbow);
        style.exposeProperty("rainbowSpeed", "number", this.rainbowSpeed, { min: 0.1, max: 5 });
        style.endGroup();

        style.startGroup("Outline", false, {
            backgroundColor: 'rgba(255,100,150,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("hasOutline", "boolean", this.hasOutline);
        style.exposeProperty("outlineColor", "color", this.outlineColor);
        style.exposeProperty("outlineWidth", "number", this.outlineWidth, { min: 0, max: 20 });
        style.endGroup();

        style.startGroup("Shadow", false, {
            backgroundColor: 'rgba(100,255,150,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("hasShadow", "boolean", this.hasShadow);
        style.exposeProperty("shadowColor", "color", this.shadowColor);
        style.exposeProperty("shadowOffsetX", "number", this.shadowOffsetX, { min: -50, max: 50 });
        style.exposeProperty("shadowOffsetY", "number", this.shadowOffsetY, { min: -50, max: 50 });
        style.exposeProperty("shadowBlur", "number", this.shadowBlur, { min: 0, max: 50 });
        style.endGroup();

        style.startGroup("Alignment & Spacing", false, {
            backgroundColor: 'rgba(150,255,100,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("textAlign", "enum", this.textAlign, {
            options: ["left", "center", "right", "start", "end"]
        });
        style.exposeProperty("textBaseline", "enum", this.textBaseline, {
            options: ["top", "hanging", "middle", "alphabetic", "ideographic", "bottom"]
        });
        style.exposeProperty("lineHeight", "number", this.lineHeight, { min: 0.5, max: 3, step: 0.1 });
        style.exposeProperty("letterSpacing", "number", this.letterSpacing, { min: -10, max: 20 });
        style.endGroup();

        style.startGroup("Transform Effects", false, {
            backgroundColor: 'rgba(255,255,100,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("opacity", "number", this.opacity, { min: 0, max: 1, step: 0.01 });
        style.exposeProperty("rotation", "number", this.rotation, { min: -180, max: 180 });
        style.exposeProperty("skewX", "number", this.skewX, { min: -45, max: 45 });
        style.exposeProperty("skewY", "number", this.skewY, { min: -45, max: 45 });
        style.exposeProperty("scaleX", "number", this.scaleX, { min: 0.1, max: 3, step: 0.1 });
        style.exposeProperty("scaleY", "number", this.scaleY, { min: 0.1, max: 3, step: 0.1 });
        style.endGroup();

        style.startGroup("Animation Effects", false, {
            backgroundColor: 'rgba(100,255,255,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("wave", "boolean", this.wave);
        style.exposeProperty("waveAmplitude", "number", this.waveAmplitude, { min: 0, max: 50 });
        style.exposeProperty("waveFrequency", "number", this.waveFrequency, { min: 0.1, max: 10 });
        style.exposeProperty("waveSpeed", "number", this.waveSpeed, { min: 0.1, max: 10 });
        style.endGroup();

        style.startGroup("Text Wrapping", false, {
            backgroundColor: 'rgba(255,100,255,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("maxWidth", "number", this.maxWidth, { min: 0, max: 2000 });
        style.exposeProperty("wordWrap", "boolean", this.wordWrap);
        style.endGroup();

        style.startGroup("Background", false, {
            backgroundColor: 'rgba(200,200,200,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("hasBackground", "boolean", this.hasBackground);
        style.exposeProperty("backgroundColor", "color", this.backgroundColor);
        style.exposeProperty("backgroundPadding", "number", this.backgroundPadding, { min: 0, max: 50 });
        style.exposeProperty("backgroundRadius", "number", this.backgroundRadius, { min: 0, max: 50 });
        style.endGroup();
    }

    loop(deltaTime) {
        this.time += deltaTime;
    }

    draw(ctx) {
        ctx.save();

        // Apply opacity
        ctx.globalAlpha = this.opacity;

        // Apply transform effects
        if (this.rotation !== 0 || this.skewX !== 0 || this.skewY !== 0 || this.scaleX !== 1 || this.scaleY !== 1) {
            const rad = this.rotation * Math.PI / 180;
            const skewXRad = this.skewX * Math.PI / 180;
            const skewYRad = this.skewY * Math.PI / 180;
            
            ctx.transform(
                this.scaleX * Math.cos(rad),
                this.scaleX * Math.sin(rad) + Math.tan(skewYRad),
                -this.scaleY * Math.sin(rad) + Math.tan(skewXRad),
                this.scaleY * Math.cos(rad),
                0,
                0
            );
        }

        // Set font
        ctx.font = `${this.fontStyle} ${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`;
        ctx.textAlign = this.textAlign;
        ctx.textBaseline = this.textBaseline;

        // Handle text wrapping
        const lines = this.getWrappedText(ctx, this.text);

        // Calculate text metrics for background
        let textWidth = 0;
        let textHeight = lines.length * this.fontSize * this.lineHeight;
        
        if (this.maxWidth > 0) {
            textWidth = this.maxWidth;
        } else {
            for (let line of lines) {
                const lineWidth = ctx.measureText(line).width;
                if (lineWidth > textWidth) textWidth = lineWidth;
            }
        }

        // Draw background if enabled
        if (this.hasBackground) {
            ctx.save();
            ctx.fillStyle = this.backgroundColor;
            
            let bgX = -textWidth / 2 - this.backgroundPadding;
            let bgY = -textHeight / 2 - this.backgroundPadding;
            let bgWidth = textWidth + this.backgroundPadding * 2;
            let bgHeight = textHeight + this.backgroundPadding * 2;
            
            if (this.textAlign === "left") bgX = -this.backgroundPadding;
            if (this.textAlign === "right") bgX = -textWidth - this.backgroundPadding;
            
            if (this.backgroundRadius > 0) {
                this.roundRect(ctx, bgX, bgY, bgWidth, bgHeight, this.backgroundRadius);
                ctx.fill();
            } else {
                ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
            }
            ctx.restore();
        }

        // Set shadow if enabled
        if (this.hasShadow) {
            ctx.shadowColor = this.shadowColor;
            ctx.shadowOffsetX = this.shadowOffsetX;
            ctx.shadowOffsetY = this.shadowOffsetY;
            ctx.shadowBlur = this.shadowBlur;
        }

        // Draw each line
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const y = (i - (lines.length - 1) / 2) * this.fontSize * this.lineHeight;

            if (this.wave) {
                this.drawWaveText(ctx, line, 0, y);
            } else {
                this.drawStyledText(ctx, line, 0, y);
            }
        }

        ctx.restore();
    }

    getWrappedText(ctx, text) {
        if (this.maxWidth <= 0 || !this.wordWrap) {
            return text.split('\n');
        }

        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        for (let word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const testWidth = ctx.measureText(testLine).width;

            if (testWidth > this.maxWidth && currentLine !== '') {
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

    drawWaveText(ctx, text, x, y) {
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const waveOffset = Math.sin((this.time * this.waveSpeed) + (i * this.waveFrequency)) * this.waveAmplitude;
            const charWidth = ctx.measureText(char).width;
            
            ctx.save();
            ctx.translate(x, y + waveOffset);
            this.drawStyledText(ctx, char, 0, 0);
            ctx.restore();
            
            x += charWidth + this.letterSpacing;
        }
    }

    drawStyledText(ctx, text, x, y) {
        // Set fill style
        if (this.rainbow) {
            const hue = (this.time * this.rainbowSpeed * 360) % 360;
            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        } else if (this.useGradient) {
            const gradient = this.createTextGradient(ctx, text, x, y);
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = this.fillColor;
        }

        // Draw outline first if enabled
        if (this.hasOutline) {
            ctx.strokeStyle = this.outlineColor;
            ctx.lineWidth = this.outlineWidth;
            ctx.strokeText(text, x, y);
        }

        // Draw filled text
        ctx.fillText(text, x, y);
    }

    createTextGradient(ctx, text, x, y) {
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width;
        const textHeight = this.fontSize;

        const angle = this.gradientAngle * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const length = Math.abs(textWidth * cos) + Math.abs(textHeight * sin);
        const startX = x - (length * cos) / 2;
        const startY = y - (length * sin) / 2;
        const endX = x + (length * cos) / 2;
        const endY = y + (length * sin) / 2;

        const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
        gradient.addColorStop(0, this.gradientStartColor);
        gradient.addColorStop(1, this.gradientEndColor);

        return gradient;
    }

    roundRect(ctx, x, y, width, height, radius) {
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
        return {
            ...super.toJSON(),
            text: this.text,
            fontSize: this.fontSize,
            fontFamily: this.fontFamily,
            fontWeight: this.fontWeight,
            fontStyle: this.fontStyle,
            fillColor: this.fillColor,
            useGradient: this.useGradient,
            gradientStartColor: this.gradientStartColor,
            gradientEndColor: this.gradientEndColor,
            gradientAngle: this.gradientAngle,
            hasOutline: this.hasOutline,
            outlineColor: this.outlineColor,
            outlineWidth: this.outlineWidth,
            hasShadow: this.hasShadow,
            shadowColor: this.shadowColor,
            shadowOffsetX: this.shadowOffsetX,
            shadowOffsetY: this.shadowOffsetY,
            shadowBlur: this.shadowBlur,
            textAlign: this.textAlign,
            textBaseline: this.textBaseline,
            lineHeight: this.lineHeight,
            letterSpacing: this.letterSpacing,
            wordSpacing: this.wordSpacing,
            opacity: this.opacity,
            rotation: this.rotation,
            skewX: this.skewX,
            skewY: this.skewY,
            scaleX: this.scaleX,
            scaleY: this.scaleY,
            wave: this.wave,
            waveAmplitude: this.waveAmplitude,
            waveFrequency: this.waveFrequency,
            waveSpeed: this.waveSpeed,
            rainbow: this.rainbow,
            rainbowSpeed: this.rainbowSpeed,
            maxWidth: this.maxWidth,
            wordWrap: this.wordWrap,
            hasBackground: this.hasBackground,
            backgroundColor: this.backgroundColor,
            backgroundPadding: this.backgroundPadding,
            backgroundRadius: this.backgroundRadius
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        if (!data) return;

        this.text = data.text || "Hello World";
        this.fontSize = data.fontSize || 32;
        this.fontFamily = data.fontFamily || "Arial";
        this.fontWeight = data.fontWeight || "normal";
        this.fontStyle = data.fontStyle || "normal";
        this.fillColor = data.fillColor || "#ffffff";
        this.useGradient = data.useGradient || false;
        this.gradientStartColor = data.gradientStartColor || "#ff0000";
        this.gradientEndColor = data.gradientEndColor || "#0000ff";
        this.gradientAngle = data.gradientAngle || 0;
        this.hasOutline = data.hasOutline || false;
        this.outlineColor = data.outlineColor || "#000000";
        this.outlineWidth = data.outlineWidth || 2;
        this.hasShadow = data.hasShadow || false;
        this.shadowColor = data.shadowColor || "#000000";
        this.shadowOffsetX = data.shadowOffsetX || 2;
        this.shadowOffsetY = data.shadowOffsetY || 2;
        this.shadowBlur = data.shadowBlur || 4;
        this.textAlign = data.textAlign || "center";
        this.textBaseline = data.textBaseline || "middle";
        this.lineHeight = data.lineHeight || 1.2;
        this.letterSpacing = data.letterSpacing || 0;
        this.wordSpacing = data.wordSpacing || 0;
        this.opacity = data.opacity || 1.0;
        this.rotation = data.rotation || 0;
        this.skewX = data.skewX || 0;
        this.skewY = data.skewY || 0;
        this.scaleX = data.scaleX || 1.0;
        this.scaleY = data.scaleY || 1.0;
        this.wave = data.wave || false;
        this.waveAmplitude = data.waveAmplitude || 5;
        this.waveFrequency = data.waveFrequency || 2;
        this.waveSpeed = data.waveSpeed || 2;
        this.rainbow = data.rainbow || false;
        this.rainbowSpeed = data.rainbowSpeed || 1;
        this.maxWidth = data.maxWidth || 0;
        this.wordWrap = data.wordWrap !== undefined ? data.wordWrap : true;
        this.hasBackground = data.hasBackground || false;
        this.backgroundColor = data.backgroundColor || "#000000";
        this.backgroundPadding = data.backgroundPadding || 10;
        this.backgroundRadius = data.backgroundRadius || 0;
    }
}

window.DrawText = DrawText;
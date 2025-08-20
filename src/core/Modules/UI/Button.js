class Button extends Module {
    static namespace = "UI";
    static description = "Fully customizable button with click actions";
    static allowMultiple = true;
    static iconClass = "fas fa-hand-pointer";

    constructor() {
        super("Button");

        // Button properties
        this.width = 120;
        this.height = 40;
        this.text = "Click Me";
        this.fontSize = 16;
        this.fontFamily = "Arial";
        this.textColor = "#ffffff";
        this.backgroundColor = "#4CAF50";
        this.borderColor = "#45a049";
        this.borderWidth = 2;
        this.borderRadius = 8;
        this.hoverColor = "#45a049";
        this.pressedColor = "#3d8b40";
        this.shadowBlur = 4;
        this.shadowColor = "rgba(0,0,0,0.3)";
        this.shadowOffsetX = 2;
        this.shadowOffsetY = 2;
        
        // Positioning properties
        this.useViewportPositioning = false;
        this.viewportX = 50; // Percentage of viewport width (0-100)
        this.viewportY = 50; // Percentage of viewport height (0-100)
        
        // Action properties
        this.onClickAction = "console.log('Button clicked!');";
        this.enableHover = true;
        this.enableShadow = true;
        
        // Internal state
        this.isHovered = false;
        this.isPressed = false;
        this.lastMousePos = { x: 0, y: 0 };

        // Expose all properties
        this.exposeProperty("width", "number", this.width, {
            description: "Button width in pixels",
            onChange: (val) => { this.width = val; }
        });
        
        this.exposeProperty("height", "number", this.height, {
            description: "Button height in pixels",
            onChange: (val) => { this.height = val; }
        });
        
        this.exposeProperty("text", "string", this.text, {
            description: "Button text",
            onChange: (val) => { this.text = val; }
        });
        
        this.exposeProperty("fontSize", "number", this.fontSize, {
            description: "Font size in pixels",
            onChange: (val) => { this.fontSize = val; }
        });
        
        this.exposeProperty("fontFamily", "string", this.fontFamily, {
            description: "Font family name",
            onChange: (val) => { this.fontFamily = val; }
        });
        
        this.exposeProperty("textColor", "color", this.textColor, {
            description: "Text color",
            onChange: (val) => { this.textColor = val; }
        });
        
        this.exposeProperty("backgroundColor", "color", this.backgroundColor, {
            description: "Background color",
            onChange: (val) => { this.backgroundColor = val; }
        });
        
        this.exposeProperty("borderColor", "color", this.borderColor, {
            description: "Border color",
            onChange: (val) => { this.borderColor = val; }
        });
        
        this.exposeProperty("borderWidth", "number", this.borderWidth, {
            description: "Border width in pixels",
            onChange: (val) => { this.borderWidth = val; }
        });
        
        this.exposeProperty("borderRadius", "number", this.borderRadius, {
            description: "Border radius for rounded corners",
            onChange: (val) => { this.borderRadius = val; }
        });
        
        this.exposeProperty("hoverColor", "color", this.hoverColor, {
            description: "Background color when hovered",
            onChange: (val) => { this.hoverColor = val; }
        });
        
        this.exposeProperty("pressedColor", "color", this.pressedColor, {
            description: "Background color when pressed",
            onChange: (val) => { this.pressedColor = val; }
        });
        
        this.exposeProperty("shadowBlur", "number", this.shadowBlur, {
            description: "Shadow blur radius",
            onChange: (val) => { this.shadowBlur = val; }
        });
        
        this.exposeProperty("shadowColor", "color", this.shadowColor, {
            description: "Shadow color",
            onChange: (val) => { this.shadowColor = val; }
        });
        
        this.exposeProperty("shadowOffsetX", "number", this.shadowOffsetX, {
            description: "Shadow X offset",
            onChange: (val) => { this.shadowOffsetX = val; }
        });
        
        this.exposeProperty("shadowOffsetY", "number", this.shadowOffsetY, {
            description: "Shadow Y offset",
            onChange: (val) => { this.shadowOffsetY = val; }
        });
        
        this.exposeProperty("useViewportPositioning", "boolean", this.useViewportPositioning, {
            description: "Position relative to viewport instead of world",
            onChange: (val) => { this.useViewportPositioning = val; }
        });
        
        this.exposeProperty("viewportX", "number", this.viewportX, {
            description: "Viewport X position as percentage (0-100)",
            onChange: (val) => { this.viewportX = val; }
        });
        
        this.exposeProperty("viewportY", "number", this.viewportY, {
            description: "Viewport Y position as percentage (0-100)",
            onChange: (val) => { this.viewportY = val; }
        });
        
        this.exposeProperty("onClickAction", "string", this.onClickAction, {
            description: "JavaScript code to execute when clicked",
            onChange: (val) => { this.onClickAction = val; }
        });
        
        this.exposeProperty("enableHover", "boolean", this.enableHover, {
            description: "Enable hover effects",
            onChange: (val) => { this.enableHover = val; }
        });
        
        this.exposeProperty("enableShadow", "boolean", this.enableShadow, {
            description: "Enable drop shadow",
            onChange: (val) => { this.enableShadow = val; }
        });
    }

    style(style) {
        // Positioning settings
        style.startGroup("Positioning", false, {
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        
        style.exposeProperty("useViewportPositioning", "boolean", this.useViewportPositioning, {
            description: "Position relative to viewport instead of world space",
            style: { label: "Use Viewport Positioning" }
        });
        
        style.exposeProperty("viewportX", "number", this.viewportX, {
            description: "Horizontal position as percentage of viewport width",
            min: 0,
            max: 100,
            step: 1,
            style: { label: "Viewport X (%)", slider: true }
        });
        
        style.exposeProperty("viewportY", "number", this.viewportY, {
            description: "Vertical position as percentage of viewport height",
            min: 0,
            max: 100,
            step: 1,
            style: { label: "Viewport Y (%)", slider: true }
        });
        
        style.endGroup();

        // Appearance settings
        style.startGroup("Button Appearance", false, {
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        
        style.exposeProperty("width", "number", this.width, {
            description: "Button width in pixels",
            min: 20,
            max: 500,
            step: 5,
            style: { label: "Width", slider: true }
        });
        
        style.exposeProperty("height", "number", this.height, {
            description: "Button height in pixels",
            min: 10,
            max: 200,
            step: 5,
            style: { label: "Height", slider: true }
        });
        
        style.exposeProperty("text", "string", this.text, {
            description: "Button display text",
            style: { label: "Button Text" }
        });
        
        style.exposeProperty("fontSize", "number", this.fontSize, {
            description: "Font size in pixels",
            min: 8,
            max: 72,
            step: 1,
            style: { label: "Font Size", slider: true }
        });
        
        style.exposeProperty("fontFamily", "string", this.fontFamily, {
            description: "Font family name",
            style: { label: "Font Family" }
        });
        
        style.endGroup();

        // Color settings
        style.startGroup("Colors", false, {
            backgroundColor: 'rgba(255, 193, 7, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        
        style.exposeProperty("textColor", "color", this.textColor, {
            description: "Text color",
            style: { label: "Text Color" }
        });
        
        style.exposeProperty("backgroundColor", "color", this.backgroundColor, {
            description: "Normal background color",
            style: { label: "Background" }
        });
        
        style.exposeProperty("hoverColor", "color", this.hoverColor, {
            description: "Hover background color",
            style: { label: "Hover Color" }
        });
        
        style.exposeProperty("pressedColor", "color", this.pressedColor, {
            description: "Pressed background color",
            style: { label: "Pressed Color" }
        });
        
        style.exposeProperty("borderColor", "color", this.borderColor, {
            description: "Border color",
            style: { label: "Border Color" }
        });
        
        style.endGroup();

        // Border & Shadow settings
        style.startGroup("Border & Shadow", false, {
            backgroundColor: 'rgba(156, 39, 176, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        
        style.exposeProperty("borderWidth", "number", this.borderWidth, {
            description: "Border width in pixels",
            min: 0,
            max: 20,
            step: 1,
            style: { label: "Border Width", slider: true }
        });
        
        style.exposeProperty("borderRadius", "number", this.borderRadius, {
            description: "Corner radius",
            min: 0,
            max: 50,
            step: 1,
            style: { label: "Border Radius", slider: true }
        });
        
        style.exposeProperty("enableShadow", "boolean", this.enableShadow, {
            description: "Enable drop shadow",
            style: { label: "Enable Shadow" }
        });
        
        style.exposeProperty("shadowBlur", "number", this.shadowBlur, {
            description: "Shadow blur radius",
            min: 0,
            max: 20,
            step: 1,
            style: { label: "Shadow Blur", slider: true }
        });
        
        style.exposeProperty("shadowColor", "color", this.shadowColor, {
            description: "Shadow color",
            style: { label: "Shadow Color" }
        });
        
        style.exposeProperty("shadowOffsetX", "number", this.shadowOffsetX, {
            description: "Shadow X offset",
            min: -20,
            max: 20,
            step: 1,
            style: { label: "Shadow X", slider: true }
        });
        
        style.exposeProperty("shadowOffsetY", "number", this.shadowOffsetY, {
            description: "Shadow Y offset",
            min: -20,
            max: 20,
            step: 1,
            style: { label: "Shadow Y", slider: true }
        });
        
        style.endGroup();

        // Behavior settings
        style.startGroup("Behavior", false, {
            backgroundColor: 'rgba(255, 87, 34, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        
        style.exposeProperty("enableHover", "boolean", this.enableHover, {
            description: "Enable hover effects",
            style: { label: "Enable Hover Effects" }
        });
        
        style.exposeProperty("onClickAction", "string", this.onClickAction, {
            description: "JavaScript code to execute when clicked",
            style: { 
                label: "On Click Action",
                multiline: true,
                rows: 3
            }
        });
        
        style.endGroup();

        style.addDivider();
        style.addHelpText("Use 'this' to reference the button module, 'window.engine' for engine access, and any global variables/functions in the onClick action.");
        style.addHelpText("Viewport positioning: Button position will be relative to the screen viewport instead of world coordinates. X and Y are percentages (0-100) of viewport dimensions.");
    }

    start() {
        // Initialize button state
        this.isHovered = false;
        this.isPressed = false;
    }

    getButtonBounds() {
        let buttonX, buttonY;
        
        if (this.useViewportPositioning) {
            // Calculate position relative to viewport
            const viewport = window.engine.viewport;
            buttonX = viewport.x;
            buttonY = viewport.y;
        } else {
            // Use world position
            //const worldPos = this.gameObject.getWorldPosition();
            buttonX = this.gameObject.position.x;
            buttonY = this.gameObject.position.y;
        }
        
        return {
            left: buttonX - this.width / 2,
            right: buttonX + this.width / 2,
            top: buttonY - this.height / 2,
            bottom: buttonY + this.height / 2,
            centerX: buttonX,
            centerY: buttonY
        };
    }

    loop(deltaTime) {
        // Get mouse position - use screen space for viewport positioning, world space otherwise
        const mousePos = window.input.getMousePosition(!this.useViewportPositioning);
        
        // Get button bounds
        const bounds = this.getButtonBounds();
        
        const wasHovered = this.isHovered;
        this.isHovered = this.enableHover && 
                        mousePos.x >= bounds.left && mousePos.x <= bounds.right && 
                        mousePos.y >= bounds.top && mousePos.y <= bounds.bottom;

        // Handle mouse interactions
        if (this.isHovered) {
            // Check for mouse press
            if (window.input.mouseDown("left")) {
                this.isPressed = true;
            } else if (this.isPressed && !window.input.mouseDown("left")) {
                // Mouse released while over button - trigger click
                this.isPressed = false;
                this.executeClickAction();
            }
        } else {
            this.isPressed = false;
        }
        
        // Reset pressed state if mouse is no longer down
        if (!window.input.mouseDown("left")) {
            this.isPressed = false;
        }
    }

    executeClickAction() {
        if (this.onClickAction && this.onClickAction.trim()) {
            try {
                // Create a function with 'this' context referring to the button module
                const actionFunction = new Function('return function() { ' + this.onClickAction + ' }').call(this);
                actionFunction.call(this);
            } catch (error) {
                console.error("Button click action error:", error);
                console.error("Action code:", this.onClickAction);
            }
        }
    }

    draw(ctx) {
        // Save context
        ctx.save();

        // Handle positioning
        if (this.useViewportPositioning) {
            // Calculate viewport position
            const viewport = window.engine.viewport;
            const buttonX = viewport.x;
            const buttonY = viewport.y;
            
            // Transform to viewport position (overriding gameObject transform)
            ctx.setTransform(1, 0, 0, 1, buttonX, buttonY);
        }
        // If not using viewport positioning, the context is already transformed by gameObject

        // Determine current color based on state
        let currentBgColor = this.backgroundColor;
        if (this.isPressed) {
            currentBgColor = this.pressedColor;
        } else if (this.isHovered && this.enableHover) {
            currentBgColor = this.hoverColor;
        }

        // Apply shadow if enabled
        if (this.enableShadow) {
            ctx.shadowBlur = this.shadowBlur;
            ctx.shadowColor = this.shadowColor;
            ctx.shadowOffsetX = this.shadowOffsetX;
            ctx.shadowOffsetY = this.shadowOffsetY;
        }

        // Draw button background
        ctx.fillStyle = currentBgColor;
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = this.borderWidth;

        if (this.borderRadius > 0) {
            this.drawRoundedRect(ctx, -this.width/2, -this.height/2, this.width, this.height, this.borderRadius);
            ctx.fill();
            if (this.borderWidth > 0) {
                ctx.stroke();
            }
        } else {
            ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
            if (this.borderWidth > 0) {
                ctx.strokeRect(-this.width/2, -this.height/2, this.width, this.height);
            }
        }

        // Reset shadow for text
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Draw button text
        ctx.fillStyle = this.textColor;
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        // Add slight press effect
        const textOffsetY = this.isPressed ? 1 : 0;
        ctx.fillText(this.text, 0, textOffsetY);

        // Restore context
        ctx.restore();
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

    drawGizmos(ctx) {
        // Save context
        ctx.save();
        
        // Handle positioning for gizmos too
        if (this.useViewportPositioning) {
            const viewport = window.engine.viewport;
            const buttonX = viewport.x + (viewport.width * this.viewportX / 100);
            const buttonY = viewport.y + (viewport.height * this.viewportY / 100);
            ctx.setTransform(1, 0, 0, 1, buttonX, buttonY);
        }
        
        // Draw button bounds in debug mode
        ctx.strokeStyle = this.isHovered ? "#ff0000" : "#00ff00";
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(-this.width/2, -this.height/2, this.width, this.height);
        
        ctx.restore();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            width: this.width,
            height: this.height,
            text: this.text,
            fontSize: this.fontSize,
            fontFamily: this.fontFamily,
            textColor: this.textColor,
            backgroundColor: this.backgroundColor,
            borderColor: this.borderColor,
            borderWidth: this.borderWidth,
            borderRadius: this.borderRadius,
            hoverColor: this.hoverColor,
            pressedColor: this.pressedColor,
            shadowBlur: this.shadowBlur,
            shadowColor: this.shadowColor,
            shadowOffsetX: this.shadowOffsetX,
            shadowOffsetY: this.shadowOffsetY,
            useViewportPositioning: this.useViewportPositioning,
            viewportX: this.viewportX,
            viewportY: this.viewportY,
            onClickAction: this.onClickAction,
            enableHover: this.enableHover,
            enableShadow: this.enableShadow
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        
        if (!data) return;
        
        this.width = data.width || 120;
        this.height = data.height || 40;
        this.text = data.text || "Click Me";
        this.fontSize = data.fontSize || 16;
        this.fontFamily = data.fontFamily || "Arial";
        this.textColor = data.textColor || "#ffffff";
        this.backgroundColor = data.backgroundColor || "#4CAF50";
        this.borderColor = data.borderColor || "#45a049";
        this.borderWidth = data.borderWidth || 2;
        this.borderRadius = data.borderRadius || 8;
        this.hoverColor = data.hoverColor || "#45a049";
        this.pressedColor = data.pressedColor || "#3d8b40";
        this.shadowBlur = data.shadowBlur || 4;
        this.shadowColor = data.shadowColor || "rgba(0,0,0,0.3)";
        this.shadowOffsetX = data.shadowOffsetX || 2;
        this.shadowOffsetY = data.shadowOffsetY || 2;
        this.useViewportPositioning = data.useViewportPositioning !== undefined ? data.useViewportPositioning : false;
        this.viewportX = data.viewportX !== undefined ? data.viewportX : 50;
        this.viewportY = data.viewportY !== undefined ? data.viewportY : 50;
        this.onClickAction = data.onClickAction || "console.log('Button clicked!');";
        this.enableHover = data.enableHover !== undefined ? data.enableHover : true;
        this.enableShadow = data.enableShadow !== undefined ? data.enableShadow : true;
    }
}

window.Button = Button;
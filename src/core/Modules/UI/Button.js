/**
 * Button - Interactive UI button component
 */
class Button extends Module {
    static allowMultiple = false;
    static namespace = "UI";
    static description = "Interactive button with click events";
    static iconClass = "fas fa-hand-pointer";

    constructor() {
        super("Button");
        
        // Button properties
        this.width = 120;
        this.height = 40;
        this.text = "Button";
        this.fontSize = 16;
        this.fontFamily = "Arial, sans-serif";
        this.textColor = "#ffffff";
        this.backgroundColor = "#4CAF50";
        this.hoverColor = "#45a049";
        this.pressedColor = "#3d8b40";
        this.borderRadius = 4;
        this.borderWidth = 0;
        this.borderColor = "#000000";
        
        // Action properties
        this.actionType = "log";
        this.actionMessage = "Button clicked!";
        this.targetObjectName = "";
        
        // Internal state
        this.isHovered = false;
        this.isPressed = false;
        this.bounds = { x: 0, y: 0, width: 0, height: 0 };
        
        // Expose properties
        this.exposeProperty("width", "number", this.width, {
            min: 20,
            max: 500,
            step: 1,
            description: "Button width in pixels"
        });
        
        this.exposeProperty("height", "number", this.height, {
            min: 20,
            max: 200,
            step: 1,
            description: "Button height in pixels"
        });
        
        this.exposeProperty("text", "string", this.text, {
            description: "Button text"
        });
        
        this.exposeProperty("fontSize", "number", this.fontSize, {
            min: 8,
            max: 48,
            step: 1,
            description: "Font size in pixels"
        });
        
        this.exposeProperty("textColor", "color", this.textColor, {
            description: "Text color"
        });
        
        this.exposeProperty("backgroundColor", "color", this.backgroundColor, {
            description: "Background color"
        });
        
        this.exposeProperty("hoverColor", "color", this.hoverColor, {
            description: "Color when hovered"
        });
        
        this.exposeProperty("pressedColor", "color", this.pressedColor, {
            description: "Color when pressed"
        });
        
        this.exposeProperty("borderRadius", "number", this.borderRadius, {
            min: 0,
            max: 50,
            step: 1,
            description: "Border radius in pixels"
        });
        
        this.exposeProperty("borderWidth", "number", this.borderWidth, {
            min: 0,
            max: 10,
            step: 1,
            description: "Border width in pixels"
        });
        
        this.exposeProperty("borderColor", "color", this.borderColor, {
            description: "Border color"
        });
        
        this.exposeProperty("actionType", "enum", this.actionType, {
            options: ["log", "destroy", "disable", "enable", "toggle", "custom"],
            description: "Action to perform when clicked"
        });
        
        this.exposeProperty("actionMessage", "string", this.actionMessage, {
            description: "Message to log or custom action data"
        });
        
        this.exposeProperty("targetObjectName", "string", this.targetObjectName, {
            description: "Name of target object for actions (leave empty for self)"
        });
    }
    
    start() {
        // Set up input listeners
        this.setupInputListeners();
    }
    
    setupInputListeners() {
        if (!window.input) return;
        
        // We'll check mouse position in the loop method
        // and handle clicks there since we need to check bounds
    }
    
    loop(deltaTime) {
        if (!window.input) return;
        
        // Update button bounds based on current position
        this.updateBounds();
        
        // Check mouse position
        const mousePos = window.input.getMousePosition();
        const wasHovered = this.isHovered;
        this.isHovered = this.isPointInBounds(mousePos.x, mousePos.y);
        
        // Check for mouse press/release
        const wasPressed = this.isPressed;
        if (this.isHovered && window.input.mouseDown(0)) {
            this.isPressed = true;
        } else if (this.isPressed && !window.input.mouseDown(0)) {
            // Mouse released
            if (this.isHovered) {
                // Click completed
                this.onClick();
            }
            this.isPressed = false;
        }
    }
    
    updateBounds() {
        const pos = this.gameObject.position;
        this.bounds = {
            x: pos.x - this.width / 2,
            y: pos.y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }
    
    isPointInBounds(x, y) {
        return x >= this.bounds.x && 
               x <= this.bounds.x + this.bounds.width &&
               y >= this.bounds.y && 
               y <= this.bounds.y + this.bounds.height;
    }
    
    onClick() {
        console.log(`Button "${this.text}" clicked!`);
        
        // Get target object
        let target = this.gameObject;
        if (this.targetObjectName && this.targetObjectName.trim() !== "") {
            // Find target by name in the scene
            if (this.gameObject.scene) {
                target = this.gameObject.scene.findGameObjectByName(this.targetObjectName);
                if (!target) {
                    console.warn(`Button: Target object "${this.targetObjectName}" not found`);
                    return;
                }
            }
        }
        
        // Execute action
        switch (this.actionType) {
            case "log":
                console.log(this.actionMessage);
                break;
                
            case "destroy":
                if (target && target.destroy) {
                    target.destroy();
                }
                break;
                
            case "disable":
                if (target) {
                    target.active = false;
                }
                break;
                
            case "enable":
                if (target) {
                    target.active = true;
                }
                break;
                
            case "toggle":
                if (target) {
                    target.active = !target.active;
                }
                break;
                
            case "custom":
                // Emit custom event
                if (this.gameObject && this.gameObject.emit) {
                    this.gameObject.emit('buttonClick', {
                        button: this,
                        message: this.actionMessage,
                        target: target
                    });
                }
                break;
        }
    }
    
    draw(ctx) {
        if (!this.enabled) return;
        
        ctx.save();
        
        // Determine current color based on state
        let currentColor = this.backgroundColor;
        if (this.isPressed) {
            currentColor = this.pressedColor;
        } else if (this.isHovered) {
            currentColor = this.hoverColor;
        }
        
        // Draw button background
        ctx.fillStyle = currentColor;
        
        if (this.borderRadius > 0) {
            // Draw rounded rectangle
            this.drawRoundedRect(ctx, -this.width/2, -this.height/2, this.width, this.height, this.borderRadius);
            ctx.fill();
        } else {
            // Draw regular rectangle
            ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        }
        
        // Draw border if enabled
        if (this.borderWidth > 0) {
            ctx.strokeStyle = this.borderColor;
            ctx.lineWidth = this.borderWidth;
            
            if (this.borderRadius > 0) {
                this.drawRoundedRect(ctx, -this.width/2, -this.height/2, this.width, this.height, this.borderRadius);
                ctx.stroke();
            } else {
                ctx.strokeRect(-this.width/2, -this.height/2, this.width, this.height);
            }
        }
        
        // Draw text
        ctx.fillStyle = this.textColor;
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.text, 0, 0);
        
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
    
    toJSON() {
        const json = super.toJSON();
        json.width = this.width;
        json.height = this.height;
        json.text = this.text;
        json.fontSize = this.fontSize;
        json.fontFamily = this.fontFamily;
        json.textColor = this.textColor;
        json.backgroundColor = this.backgroundColor;
        json.hoverColor = this.hoverColor;
        json.pressedColor = this.pressedColor;
        json.borderRadius = this.borderRadius;
        json.borderWidth = this.borderWidth;
        json.borderColor = this.borderColor;
        json.actionType = this.actionType;
        json.actionMessage = this.actionMessage;
        json.targetObjectName = this.targetObjectName;
        return json;
    }
    
    fromJSON(json) {
        super.fromJSON(json);
        if (json.width !== undefined) this.width = json.width;
        if (json.height !== undefined) this.height = json.height;
        if (json.text !== undefined) this.text = json.text;
        if (json.fontSize !== undefined) this.fontSize = json.fontSize;
        if (json.fontFamily !== undefined) this.fontFamily = json.fontFamily;
        if (json.textColor !== undefined) this.textColor = json.textColor;
        if (json.backgroundColor !== undefined) this.backgroundColor = json.backgroundColor;
        if (json.hoverColor !== undefined) this.hoverColor = json.hoverColor;
        if (json.pressedColor !== undefined) this.pressedColor = json.pressedColor;
        if (json.borderRadius !== undefined) this.borderRadius = json.borderRadius;
        if (json.borderWidth !== undefined) this.borderWidth = json.borderWidth;
        if (json.borderColor !== undefined) this.borderColor = json.borderColor;
        if (json.actionType !== undefined) this.actionType = json.actionType;
        if (json.actionMessage !== undefined) this.actionMessage = json.actionMessage;
        if (json.targetObjectName !== undefined) this.targetObjectName = json.targetObjectName;
    }
}

window.Button = Button;
// Light Blocker Module - Creates shadows by blocking light
class LightBlockerModule extends Module {
    static namespace = "Lighting";
    static description = "Blocks light to create shadows";
    static allowMultiple = true;
    static iconClass = "fas fa-square";

    constructor() {
        super("LightBlockerModule");

        // Blocker properties
        this.width = 100;
        this.height = 100;
        this.darknessTargetName = "";
        this.blockingOpacity = 1.0; // How much light is blocked (1 = full block, 0 = no block)
        this.edgeSoftness = 0; // Pixels of soft edge (0 = hard shadows)
        
        // Performance
        this.cullingEnabled = true;
        this.cullingMargin = 50;
        
        // Internal state
        this._registeredDarkness = null;
        this._isVisible = true;
        this._lastPosition = { x: 0, y: 0 };
        this._lastRotation = 0;
        this._lastScale = { x: 1, y: 1 };
        this._transformChanged = true;

        this._setupProperties();
    }

    _setupProperties() {
        this.exposeProperty("width", "number", this.width, {
            description: "Blocker width in pixels",
            onChange: (val) => {
                this.width = Math.max(1, val);
                this._markDirty();
            }
        });

        this.exposeProperty("height", "number", this.height, {
            description: "Blocker height in pixels",
            onChange: (val) => {
                this.height = Math.max(1, val);
                this._markDirty();
            }
        });

        this.exposeProperty("darknessTargetName", "string", this.darknessTargetName, {
            description: "Name of GameObject with DarknessModule",
            onChange: (val) => {
                this.darknessTargetName = val;
                this._updateDarknessRegistration();
            }
        });

        this.exposeProperty("blockingOpacity", "number", this.blockingOpacity, {
            description: "How much light is blocked (0-1)",
            onChange: (val) => {
                this.blockingOpacity = Math.max(0, Math.min(1, val));
                this._markDirty();
            }
        });

        this.exposeProperty("edgeSoftness", "number", this.edgeSoftness, {
            description: "Soft edge width in pixels",
            onChange: (val) => {
                this.edgeSoftness = Math.max(0, val);
                this._markDirty();
            }
        });

        this.exposeProperty("cullingEnabled", "boolean", this.cullingEnabled, {
            description: "Enable viewport culling",
            onChange: (val) => {
                this.cullingEnabled = val;
            }
        });

        this.exposeProperty("cullingMargin", "number", this.cullingMargin, {
            description: "Extra pixels for culling",
            onChange: (val) => {
                this.cullingMargin = val;
            }
        });
    }

    style(style) {
        style.startGroup("Blocker Dimensions", false, {
            backgroundColor: 'rgba(100, 100, 100, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("width", "number", this.width, {
            min: 1, max: 500, step: 5,
            style: { label: "Width", slider: true }
        });

        style.exposeProperty("height", "number", this.height, {
            min: 1, max: 500, step: 5,
            style: { label: "Height", slider: true }
        });

        style.endGroup();

        style.startGroup("Shadow Properties", false, {
            backgroundColor: 'rgba(50, 50, 50, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("blockingOpacity", "number", this.blockingOpacity, {
            min: 0, max: 1, step: 0.01,
            style: { label: "Blocking Strength", slider: true }
        });

        style.exposeProperty("edgeSoftness", "number", this.edgeSoftness, {
            min: 0, max: 20, step: 1,
            style: { label: "Edge Softness (px)", slider: true }
        });

        style.endGroup();

        style.startGroup("Targeting", false, {
            backgroundColor: 'rgba(100, 255, 150, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("darknessTargetName", "string", this.darknessTargetName, {
            style: {
                label: "Darkness GameObject Name",
                placeholder: "Enter GameObject name with DarknessModule"
            }
        });

        style.endGroup();

        style.startGroup("Performance", false, {
            backgroundColor: 'rgba(200, 200, 200, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("cullingEnabled", "boolean", this.cullingEnabled, {
            style: { label: "Enable Culling" }
        });

        style.exposeProperty("cullingMargin", "number", this.cullingMargin, {
            min: 0, max: 200, step: 10,
            style: { label: "Culling Margin (px)", slider: true }
        });

        style.endGroup();

        style.addDivider();
        style.addHelpText(`Status: ${this._isVisible ? 'Visible' : 'Culled'}`);
        style.addHelpText("Blocks light from passing through, creating shadows");
    }

    loop(deltaTime) {
        const worldPos = this.gameObject.getWorldPosition();
        const rotation = this.gameObject.rotation;
        const scale = this.gameObject.scale;

        // Check if transform changed
        this._transformChanged = (
            worldPos.x !== this._lastPosition.x ||
            worldPos.y !== this._lastPosition.y ||
            rotation !== this._lastRotation ||
            scale.x !== this._lastScale.x ||
            scale.y !== this._lastScale.y
        );

        if (this._transformChanged) {
            this._markDirty();
        }

        // Update visibility
        this._updateVisibility();

        // Update darkness registration
        this._updateDarknessRegistration();
    }

    loopEnd() {
        const worldPos = this.gameObject.getWorldPosition();
        this._lastPosition.x = worldPos.x;
        this._lastPosition.y = worldPos.y;
        this._lastRotation = this.gameObject.rotation;
        this._lastScale.x = this.gameObject.scale.x;
        this._lastScale.y = this.gameObject.scale.y;
    }

    _updateVisibility() {
        if (!this.cullingEnabled) {
            this._isVisible = true;
            return;
        }

        const vp = window.engine.viewport;
        const worldPos = this.gameObject.getWorldPosition();
        const scale = this.gameObject.scale;
        const margin = this.cullingMargin;

        // Calculate rotated bounding box
        const halfWidth = (this.width * Math.abs(scale.x)) / 2;
        const halfHeight = (this.height * Math.abs(scale.y)) / 2;
        const diagonal = Math.sqrt(halfWidth * halfWidth + halfHeight * halfHeight);

        const bounds = {
            left: worldPos.x - diagonal - margin,
            right: worldPos.x + diagonal + margin,
            top: worldPos.y - diagonal - margin,
            bottom: worldPos.y + diagonal + margin
        };

        const viewportBounds = {
            left: vp.x,
            right: vp.x + vp.width,
            top: vp.y,
            bottom: vp.y + vp.height
        };

        this._isVisible = !(
            bounds.right < viewportBounds.left ||
            bounds.left > viewportBounds.right ||
            bounds.bottom < viewportBounds.top ||
            bounds.top > viewportBounds.bottom
        );
    }

    _updateDarknessRegistration() {
        let darknessModule = null;

        if (this.darknessTargetName) {
            const targetObject = window.engine.gameObjects.find(obj => obj.name === this.darknessTargetName);
            if (targetObject) {
                darknessModule = targetObject.getModule("DarknessModule");
            }
        } else {
            // Find first darkness module
            for (const gameObject of window.engine.gameObjects) {
                const darkness = gameObject.getModule("DarknessModule");
                if (darkness) {
                    darknessModule = darkness;
                    break;
                }
            }
        }

        if (darknessModule && darknessModule !== this._registeredDarkness) {
            if (this._registeredDarkness) {
                this._registeredDarkness.unregisterBlocker(this);
            }
            darknessModule.registerBlocker(this);
            this._registeredDarkness = darknessModule;
        }
    }

    _markDirty() {
        if (this._registeredDarkness) {
            this._registeredDarkness._blockersDirty = true;
        }
    }

    drawBlocker(ctx, mul = 1) {
        if (!this._isVisible && this.cullingEnabled) return;

        const worldPos = this.gameObject.getWorldPosition();
        const x = worldPos.x / mul;
        const y = worldPos.y / mul;
        const width = (this.width * this.gameObject.scale.x) / mul;
        const height = (this.height * this.gameObject.scale.y) / mul;
        const rotation = this.gameObject.rotation;

        ctx.save();
        
        // Apply transform
        ctx.translate(x, y);
        ctx.rotate(rotation);
        
        // Draw blocker with potential soft edges
        if (this.edgeSoftness > 0 && this.blockingOpacity < 1) {
            // Create gradient for soft edges
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(width, height) / 2 + this.edgeSoftness / mul);
            gradient.addColorStop(0, `rgba(0,0,0,${this.blockingOpacity})`);
            gradient.addColorStop(1 - (this.edgeSoftness / mul) / (Math.max(width, height) / 2), `rgba(0,0,0,${this.blockingOpacity})`);
            gradient.addColorStop(1, `rgba(0,0,0,0)`);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(-width/2 - this.edgeSoftness/mul, -height/2 - this.edgeSoftness/mul, 
                        width + 2*this.edgeSoftness/mul, height + 2*this.edgeSoftness/mul);
        } else {
            // Hard edges
            ctx.fillStyle = `rgba(0,0,0,${this.blockingOpacity})`;
            ctx.fillRect(-width/2, -height/2, width, height);
        }
        
        ctx.restore();
    }

    drawGizmos(ctx) {
        const worldPos = this.gameObject.getWorldPosition();
        const width = this.width * this.gameObject.scale.x;
        const height = this.height * this.gameObject.scale.y;
        const rotation = this.gameObject.rotation;

        ctx.save();
        
        // Apply transform
        ctx.translate(worldPos.x, worldPos.y);
        ctx.rotate(rotation);
        
        // Draw blocker outline
        ctx.strokeStyle = this._isVisible ? "#ff00ff" : "#ff0000";
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        ctx.strokeRect(-width/2, -height/2, width, height);
        
        // Draw center cross
        ctx.strokeStyle = "#ff00ff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(10, 0);
        ctx.moveTo(0, -10);
        ctx.lineTo(0, 10);
        ctx.stroke();
        
        // Draw soft edge indicator if enabled
        if (this.edgeSoftness > 0) {
            ctx.strokeStyle = "#ffff00";
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.3;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(-width/2 - this.edgeSoftness, -height/2 - this.edgeSoftness, 
                          width + 2*this.edgeSoftness, height + 2*this.edgeSoftness);
            ctx.setLineDash([]);
        }
        
        // Label
        ctx.restore();
        ctx.fillStyle = "#ff00ff";
        ctx.globalAlpha = 0.8;
        ctx.font = "12px monospace";
        ctx.fillText("Blocker", worldPos.x + width/2 + 5, worldPos.y - height/2);
        
        ctx.restore();
    }

    onDestroy() {
        if (this._registeredDarkness) {
            this._registeredDarkness.unregisterBlocker(this);
            this._registeredDarkness = null;
        }
        super.onDestroy();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            width: this.width,
            height: this.height,
            darknessTargetName: this.darknessTargetName,
            blockingOpacity: this.blockingOpacity,
            edgeSoftness: this.edgeSoftness,
            cullingEnabled: this.cullingEnabled,
            cullingMargin: this.cullingMargin
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        if (!data) return;

        this.width = data.width ?? 100;
        this.height = data.height ?? 100;
        this.darknessTargetName = data.darknessTargetName || "";
        this.blockingOpacity = data.blockingOpacity ?? 1.0;
        this.edgeSoftness = data.edgeSoftness ?? 0;
        this.cullingEnabled = data.cullingEnabled ?? true;
        this.cullingMargin = data.cullingMargin ?? 50;
    }
}

window.LightBlockerModule = LightBlockerModule;
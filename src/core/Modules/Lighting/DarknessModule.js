// Darkness Module - Creates darkness overlay
class DarknessModule extends Module {
    static namespace = "Lighting";
    static description = "Creates darkness overlay that can be cut through by point lights";
    static allowMultiple = false;
    static iconClass = "fas fa-moon";

    constructor() {
        super("DarknessModule");

        this.opacity = 0.8;
        this.color = "#000000";
        this.blendMode = "multiply";
        this.lights = []; // List of point lights that can cut through darkness

        this._maskCanvas = null;
        this._maskCtx = null;
        this._lastVpWidth = 0;
        this._lastVpHeight = 0;

        // Expose properties for inspector
        this.exposeProperty("opacity", "number", this.opacity, {
            description: "Darkness opacity (0-1)",
            onChange: (val) => {
                this.opacity = val;
            }
        });

        this.exposeProperty("color", "color", this.color, {
            description: "Darkness color",
            onChange: (val) => {
                this.color = val;
            }
        });

        this.exposeProperty("blendMode", "enum", this.blendMode, {
            description: "Canvas blend mode for darkness",
            options: ["multiply", "overlay", "darken", "color-burn", "normal"],
            onChange: (val) => {
                this.blendMode = val;
            }
        });
    }

    style(style) {
        style.startGroup("Darkness Settings", false, {
            backgroundColor: 'rgba(50, 50, 100, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("opacity", "number", this.opacity, {
            description: "How dark the overlay is",
            min: 0,
            max: 1,
            step: 0.01,
            style: {
                label: "Darkness Opacity",
                slider: true
            }
        });

        style.exposeProperty("color", "color", this.color, {
            style: {
                label: "Darkness Color"
            }
        });

        style.exposeProperty("blendMode", "enum", this.blendMode, {
            options: ["multiply", "overlay", "darken", "color-burn", "normal"],
            style: {
                label: "Blend Mode"
            }
        });

        style.endGroup();

        style.addDivider();
        style.addHelpText("Point lights will cut through this darkness. Use multiply blend mode for realistic lighting.");
    }

    loop(delta) {
        this.gameObject.position.x = 0;
        this.gameObject.position.y = 0;
    }

    draw(ctx) {
        // Draw darkness overlay
        ctx.save();
        ctx.globalCompositeOperation = this.blendMode;
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.fillRect(
            window.engine.viewport.x,
            window.engine.viewport.y,
            window.engine.viewport.width,
            window.engine.viewport.height
        );
        ctx.restore();

        // --- Mask lights using offscreen canvas ---
        if (this.lights.length > 0) {
            const vp = window.engine.viewport;

            // Only create or resize canvas if needed
            if (!this._maskCanvas || this._lastVpWidth !== vp.width || this._lastVpHeight !== vp.height) {
                this._maskCanvas = document.createElement('canvas');
                this._maskCanvas.width = vp.width;
                this._maskCanvas.height = vp.height;
                this._maskCtx = this._maskCanvas.getContext('2d');
                this._lastVpWidth = vp.width;
                this._lastVpHeight = vp.height;
            } else {
                // Clear previous mask
                this._maskCtx.clearRect(0, 0, vp.width, vp.height);
            }

            // Draw all light masks
            for (const light of this.lights) {
                light.drawMask(this._maskCtx, vp.x, vp.y);
            }

            // Use mask to cut darkness
            ctx.save();
            ctx.globalCompositeOperation = "destination-in";
            ctx.drawImage(this._maskCanvas, vp.x, vp.y);
            ctx.restore();
        }
    }

    registerLight(light) {
        if (!this.lights.includes(light)) {
            this.lights.push(light);
        }
    }

    unregisterLight(light) {
        this.lights = this.lights.filter(l => l !== light);
    }

    toJSON() {
        return {
            ...super.toJSON(),
            opacity: this.opacity,
            color: this.color,
            blendMode: this.blendMode
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        if (!data) return;

        this.opacity = data.opacity ?? 0.8;
        this.color = data.color || "#000000";
        this.blendMode = data.blendMode || "multiply";
    }
}

// Register modules globally
window.DarknessModule = DarknessModule;
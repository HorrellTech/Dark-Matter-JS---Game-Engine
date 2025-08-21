// Point Light Module - Optimized version that cuts through darkness with gradient circles
class PointLightModule extends Module {
    static namespace = "Lighting";
    static description = "Optimized point light that cuts through darkness with colored gradient";
    static allowMultiple = true;
    static iconClass = "fas fa-lightbulb";

    constructor() {
        super("PointLightModule");

        this.radius = 150;
        this.intensity = 1.0;
        this.color = "#ffffff";
        this.darknessTargetName = "";
        this.falloffType = "smooth";
        this.flickerEnabled = false;
        this.flickerSpeed = 5.0;
        this.flickerAmount = 0.1;

        // Performance optimization
        this.cullingEnabled = true;
        this.cullingMargin = 50; // Extra pixels around viewport for culling

        // Internal state
        this.flickerTime = 0;
        this.currentIntensity = this.intensity;
        this._registeredDarkness = null;
        this._lastPosition = { x: 0, y: 0 };
        this._positionChanged = true;
        this._isVisible = true;

        // Pre-calculated gradient (for performance)
        this._gradientCache = null;
        this._gradientCacheDirty = true;
        this._lastRadius = this.radius;
        this._lastColor = this.color;

        this.worldPos = { x: 0, y: 0 };

        this._setupProperties();
    }

    _setupProperties() {
        this.exposeProperty("radius", "number", this.radius, {
            description: "Light radius in pixels",
            onChange: (val) => {
                this.radius = val;
                //this._gradientCacheDirty = true;
            }
        });

        this.exposeProperty("intensity", "number", this.intensity, {
            description: "Light intensity (0-1)",
            onChange: (val) => {
                this.intensity = val;
                //this._gradientCacheDirty = true;
            }
        });

        this.exposeProperty("color", "color", this.color, {
            description: "Light color",
            onChange: (val) => {
                this.color = val;
                //this._gradientCacheDirty = true;
            }
        });

        this.exposeProperty("darknessTargetName", "string", this.darknessTargetName, {
            description: "Name of GameObject with DarknessModule",
            onChange: (val) => {
                this.darknessTargetName = val;
            }
        });

        this.exposeProperty("falloffType", "enum", this.falloffType, {
            description: "How light fades with distance",
            options: ["linear", "smooth", "sharp", "inverse-square"],
            onChange: (val) => {
                this.falloffType = val;
                //this._gradientCacheDirty = true;
            }
        });

        this.exposeProperty("flickerEnabled", "boolean", this.flickerEnabled, {
            description: "Enable light flickering",
            onChange: (val) => {
                this.flickerEnabled = val;
            }
        });

        this.exposeProperty("flickerSpeed", "number", this.flickerSpeed, {
            description: "Flicker speed multiplier",
            onChange: (val) => {
                this.flickerSpeed = val;
            }
        });

        this.exposeProperty("flickerAmount", "number", this.flickerAmount, {
            description: "How much the light flickers (0-1)",
            onChange: (val) => {
                this.flickerAmount = val;
            }
        });

        this.exposeProperty("cullingEnabled", "boolean", this.cullingEnabled, {
            description: "Enable viewport culling for performance",
            onChange: (val) => {
                this.cullingEnabled = val;
            }
        });

        this.exposeProperty("cullingMargin", "number", this.cullingMargin, {
            description: "Extra pixels around viewport for culling",
            onChange: (val) => {
                this.cullingMargin = val;
            }
        });
    }

    style(style) {
        style.startGroup("Light Properties", false, {
            backgroundColor: 'rgba(255, 200, 100, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("radius", "number", this.radius, {
            description: "How far the light reaches",
            min: 10, max: 500, step: 5,
            style: { label: "Light Radius", slider: true }
        });

        style.exposeProperty("intensity", "number", this.intensity, {
            description: "Light brightness",
            min: 0, max: 2, step: 0.01,
            style: { label: "Intensity", slider: true }
        });

        style.exposeProperty("color", "color", this.color, {
            style: { label: "Light Color" }
        });

        style.exposeProperty("falloffType", "enum", this.falloffType, {
            options: ["linear", "smooth", "sharp", "inverse-square"],
            style: { label: "Falloff Type" }
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

        style.startGroup("Flicker Effect", false, {
            backgroundColor: 'rgba(255, 150, 200, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("flickerEnabled", "boolean", this.flickerEnabled, {
            style: { label: "Enable Flickering" }
        });

        style.exposeProperty("flickerSpeed", "number", this.flickerSpeed, {
            min: 0.1, max: 20, step: 0.1,
            style: { label: "Flicker Speed", slider: true }
        });

        style.exposeProperty("flickerAmount", "number", this.flickerAmount, {
            min: 0, max: 1, step: 0.01,
            style: { label: "Flicker Amount", slider: true }
        });

        style.endGroup();

        style.startGroup("Performance", false, {
            backgroundColor: 'rgba(200, 200, 200, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("cullingEnabled", "boolean", this.cullingEnabled, {
            style: { label: "Enable Viewport Culling" }
        });

        style.exposeProperty("cullingMargin", "number", this.cullingMargin, {
            min: 0, max: 200, step: 10,
            style: { label: "Culling Margin (px)", slider: true }
        });

        style.endGroup();

        style.addDivider();
        style.addHelpText(`Light Status: ${this._isVisible ? 'Visible' : 'Culled'}`);
        style.addHelpText("Light will cut through darkness on the targeted GameObject. Culling improves performance by skipping lights outside the viewport.");
    }

    loop(deltaTime) {
        this.worldPos = this.gameObject.getWorldPosition();

        // Track position changes for optimization
        this._positionChanged = (this.worldPos.x !== this._lastPosition.x || this.worldPos.y !== this._lastPosition.y);

        // Mark mask as dirty if position changed
        if (this._positionChanged && this._registeredDarkness) {
            this._registeredDarkness._lightsDirty = true;
        }

        // Add after position tracking:
        /*if (this._positionChanged && this._registeredDarkness) {
            this._registeredDarkness._lightsDirty = true;
            // Force canvas recreation for immediate update
            this._registeredDarkness._lastVpWidth = 0;
            this._registeredDarkness._lastVpHeight = 0;
        }*/

        // Handle flickering
        if (this.flickerEnabled) {
            this.flickerTime += deltaTime * this.flickerSpeed;
            const flicker = Math.sin(this.flickerTime) * Math.sin(this.flickerTime * 2.3) * this.flickerAmount;
            this.currentIntensity = this.intensity * (1 + flicker);
        } else {
            this.currentIntensity = this.intensity;
        }

        // Viewport culling for performance
        this._updateVisibility();

        // Register with darkness (only if visible or target changed)
        //if (this._isVisible || this._positionChanged) {
        this._updateDarknessRegistration();
        // Mark mask as dirty if registered
        if (this._registeredDarkness && this._positionChanged) {
            this._registeredDarkness._lightsDirty = true;
        }
        //}

        // Mark gradients as dirty if properties changed
        if (this._lastRadius !== this.radius || this._lastColor !== this.color) {
            this._gradientCacheDirty = true;
            this._lastRadius = this.radius;
            this._lastColor = this.color;
        }
    }

    loopEnd() {
        this._lastPosition.x = this.worldPos.x;
        this._lastPosition.y = this.worldPos.y;
    }

    _updateVisibility() {
        if (!this.cullingEnabled) {
            this._isVisible = true;
            return;
        }

        const vp = window.engine.viewport;
        const worldPos = this.gameObject.getWorldPosition();
        const margin = this.cullingMargin;

        // Check if light is within viewport bounds (with margin and radius)
        const lightBounds = {
            left: worldPos.x - this.radius - margin,
            right: worldPos.x + this.radius + margin,
            top: worldPos.y - this.radius - margin,
            bottom: worldPos.y + this.radius + margin
        };

        const viewportBounds = {
            left: vp.x,
            right: vp.x + vp.width,
            top: vp.y,
            bottom: vp.y + vp.height
        };

        this._isVisible = !(
            lightBounds.right < viewportBounds.left ||
            lightBounds.left > viewportBounds.right ||
            lightBounds.bottom < viewportBounds.top ||
            lightBounds.top > viewportBounds.bottom
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
                this._registeredDarkness.unregisterLight(this);
            }
            darknessModule.registerLight(this);
            this._registeredDarkness = darknessModule;
        }
    }

    _createGradient(ctx, x, y) {
        //if (!this._gradientCacheDirty && this._gradientCache) {
        //    return this._gradientCache;
        //}

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, this.radius);

        switch (this.falloffType) {
            case "linear":
                gradient.addColorStop(0, "rgba(255,255,255,1)");
                gradient.addColorStop(1, "rgba(255,255,255,0)");
                break;
            case "smooth":
                gradient.addColorStop(0, "rgba(255,255,255,1)");
                gradient.addColorStop(0.7, "rgba(255,255,255,0.8)");
                gradient.addColorStop(1, "rgba(255,255,255,0)");
                break;
            case "sharp":
                gradient.addColorStop(0, "rgba(255,255,255,1)");
                gradient.addColorStop(0.3, "rgba(255,255,255,0.9)");
                gradient.addColorStop(0.6, "rgba(255,255,255,0.3)");
                gradient.addColorStop(1, "rgba(255,255,255,0)");
                break;
            case "inverse-square":
                // Simulate inverse square falloff
                for (let i = 0; i <= 10; i++) {
                    const t = i / 10;
                    const intensity = Math.max(0, 1 / (1 + t * t * 4));
                    gradient.addColorStop(t, `rgba(255,255,255,${intensity})`);
                }
                break;
            default:
                gradient.addColorStop(0, "rgba(255,255,255,1)");
                gradient.addColorStop(1, "rgba(255,255,255,0)");
        }

        //this._gradientCache = gradient;
        //this._gradientCacheDirty = false;
        return gradient;
    }

    drawMask(ctx) {  // Remove offsetX and offsetY parameters
        if (!this._isVisible && this.cullingEnabled) return;

        const worldPos = this.gameObject.getWorldPosition();
        const x = worldPos.x;
        const y = worldPos.y;

        const gradient = this._createGradient(ctx, x, y);

        ctx.save();
        ctx.globalAlpha = this.currentIntensity;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawColor(ctx) {
        if (!this._isVisible && this.cullingEnabled) return;

        const worldPos = this.gameObject.getWorldPosition();

        // Create colored gradient
        const gradient = ctx.createRadialGradient(
            worldPos.x, worldPos.y, 0,
            worldPos.x, worldPos.y, this.radius
        );

        // Make color more prevalent by boosting alpha
        const boostedAlpha = Math.min(1, this.currentIntensity * 1.5); // Increase multiplier for stronger color
        const colorWithAlpha = this._addAlphaToColor(this.color, boostedAlpha);

        switch (this.falloffType) {
            case "linear":
                gradient.addColorStop(0, colorWithAlpha);
                gradient.addColorStop(1, "rgba(0,0,0,0)");
                break;
            case "smooth":
                gradient.addColorStop(0, colorWithAlpha);
                gradient.addColorStop(0.7, this._addAlphaToColor(this.color, boostedAlpha * 0.8));
                gradient.addColorStop(1, "rgba(0,0,0,0)");
                break;
            case "sharp":
                gradient.addColorStop(0, colorWithAlpha);
                gradient.addColorStop(0.3, this._addAlphaToColor(this.color, boostedAlpha * 0.9));
                gradient.addColorStop(0.6, this._addAlphaToColor(this.color, boostedAlpha * 0.3));
                gradient.addColorStop(1, "rgba(0,0,0,0)");
                break;
            case "inverse-square":
                for (let i = 0; i <= 10; i++) {
                    const t = i / 10;
                    const intensity = Math.max(0, boostedAlpha / (1 + t * t * 4));
                    gradient.addColorStop(t, this._addAlphaToColor(this.color, intensity));
                }
                break;
            default:
                gradient.addColorStop(0, colorWithAlpha);
                gradient.addColorStop(1, "rgba(0,0,0,0)");
        }

        ctx.save();
        ctx.globalCompositeOperation = "screen"; // Use 'screen' for more visible color, or keep 'lighter'
        ctx.globalAlpha = 1;//this.intensity;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(worldPos.x, worldPos.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _addAlphaToColor(color, alpha) {
        // Convert color to rgba with alpha
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `rgba(${r},${g},${b},${alpha})`;
        } else if (color.startsWith('rgb(')) {
            return color.replace('rgb(', 'rgba(').replace(')', `,${alpha})`);
        } else if (color.startsWith('rgba(')) {
            return color.replace(/,\s*[\d.]+\)$/, `,${alpha})`);
        }
        return `rgba(255,255,255,${alpha})`;
    }

    drawGizmos(ctx) {
        const worldPos = this.gameObject.getWorldPosition();

        // Draw light radius outline
        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(worldPos.x, worldPos.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw center point
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(worldPos.x, worldPos.y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Draw culling info if enabled
        if (this.cullingEnabled && !this._isVisible) {
            ctx.strokeStyle = "red";
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(worldPos.x, worldPos.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();

            // Draw X to indicate culled
            ctx.strokeStyle = "red";
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.moveTo(worldPos.x - 10, worldPos.y - 10);
            ctx.lineTo(worldPos.x + 10, worldPos.y + 10);
            ctx.moveTo(worldPos.x + 10, worldPos.y - 10);
            ctx.lineTo(worldPos.x - 10, worldPos.y + 10);
            ctx.stroke();
        }

        ctx.restore();
    }

    // Public API methods
    isVisible() {
        return this._isVisible;
    }

    setVisibilityOverride(visible) {
        this._isVisible = visible;
    }

    getEffectiveIntensity() {
        return this.currentIntensity;
    }

    // Cleanup when destroyed
    destroy() {
        if (this._registeredDarkness) {
            this._registeredDarkness.unregisterLight(this);
            this._registeredDarkness = null;
        }
        super.destroy();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            radius: this.radius,
            intensity: this.intensity,
            color: this.color,
            darknessTargetName: this.darknessTargetName,
            falloffType: this.falloffType,
            flickerEnabled: this.flickerEnabled,
            flickerSpeed: this.flickerSpeed,
            flickerAmount: this.flickerAmount,
            cullingEnabled: this.cullingEnabled,
            cullingMargin: this.cullingMargin
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        if (!data) return;

        this.radius = data.radius ?? 150;
        this.intensity = data.intensity ?? 1.0;
        this.color = data.color || "#ffffff";
        this.darknessTargetName = data.darknessTargetName || "";
        this.falloffType = data.falloffType || "smooth";
        this.flickerEnabled = data.flickerEnabled ?? false;
        this.flickerSpeed = data.flickerSpeed ?? 5.0;
        this.flickerAmount = data.flickerAmount ?? 0.1;
        this.cullingEnabled = data.cullingEnabled ?? true;
        this.cullingMargin = data.cullingMargin ?? 50;

        // Mark gradient as dirty after loading
        this._gradientCacheDirty = true;
    }
}

window.PointLightModule = PointLightModule;
// Point Light Module - Cuts through darkness with gradient circles
class PointLightModule extends Module {
    static namespace = "Lighting";
    static description = "Point light that cuts through darkness with colored gradient";
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

        this.flickerTime = 0;
        this.currentIntensity = this.intensity;

        this._registeredDarkness = null;

        // Expose properties for inspector
        this.exposeProperty("radius", "number", this.radius, {
            description: "Light radius in pixels",
            onChange: (val) => {
                this.radius = val;
            }
        });

        this.exposeProperty("intensity", "number", this.intensity, {
            description: "Light intensity (0-1)",
            onChange: (val) => {
                this.intensity = val;
            }
        });

        this.exposeProperty("color", "color", this.color, {
            description: "Light color",
            onChange: (val) => {
                this.color = val;
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
            options: ["linear", "smooth", "sharp"],
            onChange: (val) => {
                this.falloffType = val;
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
    }

    style(style) {
        style.startGroup("Light Properties", false, {
            backgroundColor: 'rgba(255, 200, 100, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("radius", "number", this.radius, {
            description: "How far the light reaches",
            min: 10,
            max: 500,
            step: 5,
            style: {
                label: "Light Radius",
                slider: true
            }
        });

        style.exposeProperty("intensity", "number", this.intensity, {
            description: "Light brightness",
            min: 0,
            max: 2,
            step: 0.01,
            style: {
                label: "Intensity",
                slider: true
            }
        });

        style.exposeProperty("color", "color", this.color, {
            style: {
                label: "Light Color"
            }
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

        style.exposeProperty("falloffType", "enum", this.falloffType, {
            options: ["linear", "smooth", "sharp"],
            style: {
                label: "Falloff Type"
            }
        });

        style.endGroup();

        style.startGroup("Flicker Effect", false, {
            backgroundColor: 'rgba(255, 150, 200, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("flickerEnabled", "boolean", this.flickerEnabled, {
            style: {
                label: "Enable Flickering"
            }
        });

        style.exposeProperty("flickerSpeed", "number", this.flickerSpeed, {
            min: 0.1,
            max: 20,
            step: 0.1,
            style: {
                label: "Flicker Speed",
                slider: true
            }
        });

        style.exposeProperty("flickerAmount", "number", this.flickerAmount, {
            min: 0,
            max: 1,
            step: 0.01,
            style: {
                label: "Flicker Amount",
                slider: true
            }
        });

        style.endGroup();

        style.addDivider();
        style.addHelpText("Light will cut through darkness on the targeted GameObject. Leave target name empty to affect all darkness.");
    }

    loop(deltaTime) {
        // Handle flickering
        if (this.flickerEnabled) {
            this.flickerTime += deltaTime * this.flickerSpeed;
            const flicker = Math.sin(this.flickerTime) * Math.sin(this.flickerTime * 2.3) * this.flickerAmount;
            this.currentIntensity = this.intensity * (1 + flicker);
        } else {
            this.currentIntensity = this.intensity;
        }

        // Register with darkness
        let darknessModule = null;
        if (this.darknessTargetName) {
            const targetObject = window.engine.gameObjects.find(obj => obj.name === this.darknessTargetName);
            if (targetObject) {
                darknessModule = targetObject.getModule("DarknessModule");
            }
        } else {
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

    drawMask(ctx) {
        const worldPos = this.gameObject.getWorldPosition();
        const gradient = ctx.createRadialGradient(
            worldPos.x, worldPos.y, 0,
            worldPos.x, worldPos.y, this.radius
        );
        switch (this.falloffType) {
            case "linear":
                gradient.addColorStop(0, "rgba(255,255,255,1)");
                gradient.addColorStop(1, "rgba(255,255,255,0)");
                break;
            case "smooth":
                gradient.addColorStop(0, "rgba(255,255,255,1)");
                gradient.addColorStop(0.3, "rgba(255,255,255,1)");
                gradient.addColorStop(0.7, "rgba(255,255,255,0.5)");
                gradient.addColorStop(1, "rgba(255,255,255,0)");
                break;
            case "sharp":
                gradient.addColorStop(0, "rgba(255,255,255,1)");
                gradient.addColorStop(0.8, "rgba(255,255,255,1)");
                gradient.addColorStop(1, "rgba(255,255,255,0)");
                break;
        }
        ctx.globalAlpha = this.currentIntensity;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(worldPos.x, worldPos.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
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

        ctx.restore();
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
            flickerAmount: this.flickerAmount
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
    }
}

window.PointLightModule = PointLightModule;
class InfiniteParallaxBackgroundLight extends Module {
    static namespace = "Visual";
    static description = "Dynamic lighting that cuts through darkness overlay for Infinite Parallax Background module";
    static allowMultiple = true;
    static iconClass = "fas fa-lightbulb";
    static color = "#FFD700";

    constructor() {
        super("InfiniteParallaxBackgroundLight");

        // Light properties
        this.lightColor = "#FFD700";
        this.lightIntensity = 1.0;
        this.lightRadius = 200;
        this.lightFalloff = 0.8; // how quickly light fades
        
        // Background reference
        this.backgroundObjectName = "";
        this.backgroundModule = null;
        
        // Position (relative or absolute)
        this.followGameObject = true; // if true, uses gameObject position
        this.offsetX = 0;
        this.offsetY = 0;

        // Optimization
        this.lastDarknessLevel = -1;
        
        this.setupProperties();
    }

    setupProperties() {
        this.exposeProperty("lightColor", "color", this.lightColor, {
            description: "Color of the light",
            onChange: (val) => { this.lightColor = val; }
        });

        this.exposeProperty("lightIntensity", "number", this.lightIntensity, {
            description: "Light intensity (0-2)",
            min: 0,
            max: 2,
            step: 0.1,
            onChange: (val) => { this.lightIntensity = val; }
        });

        this.exposeProperty("lightRadius", "number", this.lightRadius, {
            description: "Radius of light effect",
            min: 50,
            max: 1000,
            step: 10,
            onChange: (val) => { this.lightRadius = val; }
        });

        this.exposeProperty("lightFalloff", "number", this.lightFalloff, {
            description: "Light falloff (0-1)",
            min: 0,
            max: 1,
            step: 0.05,
            onChange: (val) => { this.lightFalloff = val; }
        });

        this.exposeProperty("backgroundObjectName", "string", this.backgroundObjectName, {
            description: "Name of GameObject with background module",
            onChange: (val) => {
                this.backgroundObjectName = val;
                this.backgroundModule = null; // reset cache
            }
        });

        this.exposeProperty("followGameObject", "boolean", this.followGameObject, {
            description: "Follow parent GameObject position",
            onChange: (val) => { this.followGameObject = val; }
        });

        this.exposeProperty("offsetX", "number", this.offsetX, {
            description: "Horizontal offset from position",
            min: -500,
            max: 500,
            step: 10,
            onChange: (val) => { this.offsetX = val; }
        });

        this.exposeProperty("offsetY", "number", this.offsetY, {
            description: "Vertical offset from position",
            min: -500,
            max: 500,
            step: 10,
            onChange: (val) => { this.offsetY = val; }
        });
    }

    style(style) {
        style.startGroup("Light Settings", false);

        style.exposeProperty("lightColor", "color", this.lightColor, {
            description: "The color of the light",
            style: { label: "Light Color" },
            onChange: (val) => { this.lightColor = val; }
        });

        style.exposeProperty("lightIntensity", "number", this.lightIntensity, {
            description: "Brightness of the light",
            min: 0,
            max: 2,
            step: 0.1,
            style: { label: "Intensity", slider: true },
            onChange: (val) => { this.lightIntensity = val; }
        });

        style.exposeProperty("lightRadius", "number", this.lightRadius, {
            description: "Radius of the light effect",
            min: 50,
            max: 1000,
            step: 10,
            style: { label: "Radius", slider: true },
            onChange: (val) => { this.lightRadius = val; }
        });

        style.exposeProperty("lightFalloff", "number", this.lightFalloff, {
            description: "How quickly light fades",
            min: 0,
            max: 1,
            step: 0.05,
            style: { label: "Falloff", slider: true },
            onChange: (val) => { this.lightFalloff = val; }
        });

        style.endGroup();

        style.addDivider();

        style.startGroup("Position", false);

        style.exposeProperty("followGameObject", "boolean", this.followGameObject, {
            description: "Follow parent object position",
            style: { label: "Follow GameObject" },
            onChange: (val) => { this.followGameObject = val; }
        });

        style.exposeProperty("offsetX", "number", this.offsetX, {
            description: "X position offset",
            min: -500,
            max: 500,
            step: 10,
            style: { label: "X Offset", slider: true },
            onChange: (val) => { this.offsetX = val; }
        });

        style.exposeProperty("offsetY", "number", this.offsetY, {
            description: "Y position offset",
            min: -500,
            max: 500,
            step: 10,
            style: { label: "Y Offset", slider: true },
            onChange: (val) => { this.offsetY = val; }
        });

        style.endGroup();

        style.addDivider();

        style.startGroup("Background Reference", false);

        style.exposeProperty("backgroundObjectName", "string", this.backgroundObjectName, {
            description: "Name of GameObject with background module",
            style: { label: "Background Object Name" },
            onChange: (val) => {
                this.backgroundObjectName = val;
                this.backgroundModule = null;
            }
        });

        style.endGroup();

        style.addDivider();
        style.addHelpText("Dynamic light that cuts through darkness overlay. Reference a background module by GameObject name.");
    }

    // Get the background module reference
    getBackgroundModule() {
        if (this.backgroundModule) return this.backgroundModule;

        if (!this.backgroundObjectName) return null;

        const bgObject = this.getGameObjectByName(this.backgroundObjectName);
        if (!bgObject) return null;

        // Find the background module
        const bgModule = this.getModule("InfiniteParallaxBackgroundDayNight");

        if (bgModule) {
            this.backgroundModule = bgModule;
        }

        return this.backgroundModule;
    }

    draw(ctx) {
        const bgModule = this.getBackgroundModule();
        if (!bgModule) return;

        // Only draw light if there's darkness and darkness overlay is enabled
        if (!bgModule.enableDarknessOverlay) return;

        const darknessLevel = bgModule.getDarknessLevel();
        
        // Optimization: skip if no darkness
        if (darknessLevel <= 0) return;

        // Get GUI canvas for overlay
        const guiCtx = this.getGuiCanvas();
        if (!guiCtx) return;

        const viewport = window.engine.viewport;

        // Calculate light position
        let lightX, lightY;
        if (this.followGameObject) {
            lightX = (this.gameObject.position.x - viewport.x) + this.offsetX;
            lightY = (this.gameObject.position.y - viewport.y) + this.offsetY;
        } else {
            lightX = this.offsetX;
            lightY = this.offsetY;
        }

        // Use destination-out to cut through darkness
        guiCtx.globalCompositeOperation = 'destination-out';

        // Create radial gradient for light
        const gradient = guiCtx.createRadialGradient(
            lightX, lightY, 0,
            lightX, lightY, this.lightRadius
        );

        // Calculate alpha based on intensity and darkness level
        const maxAlpha = Math.min(1, this.lightIntensity) * darknessLevel;
        const falloffStart = 1 - this.lightFalloff;

        gradient.addColorStop(0, `rgba(255, 255, 255, ${maxAlpha})`);
        gradient.addColorStop(falloffStart, `rgba(255, 255, 255, ${maxAlpha * 0.5})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        guiCtx.fillStyle = gradient;
        guiCtx.beginPath();
        guiCtx.arc(lightX, lightY, this.lightRadius, 0, Math.PI * 2);
        guiCtx.fill();

        // Optional: Add colored light glow on top
        guiCtx.globalCompositeOperation = 'source-over';
        
        // Parse light color for colored glow
        const rgb = this.hexToRgb(this.lightColor);
        const colorGradient = guiCtx.createRadialGradient(
            lightX, lightY, 0,
            lightX, lightY, this.lightRadius * 0.5
        );

        const glowAlpha = this.lightIntensity * 0.15;
        colorGradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${glowAlpha})`);
        colorGradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

        guiCtx.fillStyle = colorGradient;
        guiCtx.beginPath();
        guiCtx.arc(lightX, lightY, this.lightRadius * 0.5, 0, Math.PI * 2);
        guiCtx.fill();

        // Reset composite operation
        guiCtx.globalCompositeOperation = 'source-over';
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    }

    toJSON() {
        return {
            ...super.toJSON(),
            lightColor: this.lightColor,
            lightIntensity: this.lightIntensity,
            lightRadius: this.lightRadius,
            lightFalloff: this.lightFalloff,
            backgroundObjectName: this.backgroundObjectName,
            followGameObject: this.followGameObject,
            offsetX: this.offsetX,
            offsetY: this.offsetY
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        if (!data) return;

        this.lightColor = data.lightColor || "#FFD700";
        this.lightIntensity = data.lightIntensity !== undefined ? data.lightIntensity : 1.0;
        this.lightRadius = data.lightRadius || 200;
        this.lightFalloff = data.lightFalloff !== undefined ? data.lightFalloff : 0.8;
        this.backgroundObjectName = data.backgroundObjectName || "";
        this.followGameObject = data.followGameObject !== undefined ? data.followGameObject : true;
        this.offsetX = data.offsetX || 0;
        this.offsetY = data.offsetY || 0;
        
        this.backgroundModule = null; // reset cache on load
    }
}

window.InfiniteParallaxBackgroundLight = InfiniteParallaxBackgroundLight;
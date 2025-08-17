class PostScreenEffects extends Module {
    static namespace = "Visual";
    static description = "Advanced post-processing effects including bloom, vignette, lighting overlays, color grading, and screen distortions";
    static allowMultiple = false;
    static icon = "fa-magic";
    static color = "#9B59B6ff"; // Purple color for effects
    static drawInEditor = false; // This module processes the final screen

    constructor() {
        super("PostScreenEffects");

        // --- Bloom Settings ---
        this.enableBloom = true;
        this.bloomThreshold = 0.8; // Brightness threshold for bloom
        this.bloomIntensity = 1.2; // Bloom effect strength
        this.bloomRadius = 2.0; // Bloom blur radius
        this.bloomPasses = 3; // Number of bloom blur passes
        this.bloomQuality = 1.0; // Quality multiplier (0.5 = half res, 1.0 = full res)

        // --- Vignette Settings ---
        this.enableVignette = true;
        this.vignetteIntensity = 0.5; // Vignette darkness strength
        this.vignetteSize = 0.8; // Vignette size (0 = covers everything, 1 = no vignette)
        this.vignetteSmoothness = 0.3; // Vignette edge smoothness
        this.vignetteColor = "#000000"; // Vignette color

        // --- Color Grading ---
        this.enableColorGrading = true;
        this.brightness = 0.0; // -1 to 1
        this.contrast = 0.0; // -1 to 1
        this.saturation = 0.0; // -1 to 1
        this.gamma = 1.0; // 0.1 to 3.0
        this.colorTint = "#FFFFFF"; // Color tint overlay
        this.tintIntensity = 0.0; // Tint strength

        // --- Film Effects ---
        this.enableFilmGrain = false;
        this.filmGrainIntensity = 0.1;
        this.filmGrainSize = 1.0;
        this.enableScanlines = false;
        this.scanlineIntensity = 0.1;
        this.scanlineCount = 200;

        // --- Screen Distortion ---
        this.enableChromaticAberration = false;
        this.chromaticAberrationIntensity = 2.0;
        this.enableBarrelDistortion = false;
        this.barrelDistortionIntensity = 0.1;

        // --- Lighting Overlay ---
        this.enableLightingOverlay = true;
        this.lightingBlendMode = "multiply"; // multiply, overlay, soft-light
        this.lightingIntensity = 0.8;
        this.ambientLightColor = "#404060";
        this.ambientLightIntensity = 0.3;

        // --- Performance Settings ---
        this.effectQuality = 1.0; // Overall quality multiplier
        this.skipFrames = 0; // Skip processing every N frames for performance
        this.useHalfResolution = false; // Process at half resolution for performance

        // --- Internal State ---
        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        this.bloomCanvas = null;
        this.bloomCtx = null;
        this.frameCounter = 0;
        this.cachedScreenData = null;
        this.lastViewportSize = { width: 0, height: 0 };

        this.setupProperties();
        this.initializeCanvases();
    }

    setupProperties() {
        // Bloom properties
        this.exposeProperty("enableBloom", "boolean", this.enableBloom, {
            description: "Enable bloom post-processing effect",
            onChange: (val) => { this.enableBloom = val; }
        });

        this.exposeProperty("bloomThreshold", "number", this.bloomThreshold, {
            description: "Brightness threshold for bloom effect",
            min: 0.0, max: 1.0, step: 0.05,
            onChange: (val) => { this.bloomThreshold = val; }
        });

        this.exposeProperty("bloomIntensity", "number", this.bloomIntensity, {
            description: "Bloom effect intensity",
            min: 0.0, max: 3.0, step: 0.1,
            onChange: (val) => { this.bloomIntensity = val; }
        });

        this.exposeProperty("bloomRadius", "number", this.bloomRadius, {
            description: "Bloom blur radius",
            min: 0.5, max: 5.0, step: 0.1,
            onChange: (val) => { this.bloomRadius = val; }
        });

        this.exposeProperty("bloomPasses", "number", this.bloomPasses, {
            description: "Number of bloom blur passes",
            min: 1, max: 5, step: 1,
            onChange: (val) => { this.bloomPasses = val; }
        });

        this.exposeProperty("bloomQuality", "number", this.bloomQuality, {
            description: "Bloom processing quality (lower = faster)",
            min: 0.25, max: 1.0, step: 0.25,
            onChange: (val) => {
                this.bloomQuality = val;
                this.initializeCanvases();
            }
        });

        // Vignette properties
        this.exposeProperty("enableVignette", "boolean", this.enableVignette, {
            description: "Enable vignette effect",
            onChange: (val) => { this.enableVignette = val; }
        });

        this.exposeProperty("vignetteIntensity", "number", this.vignetteIntensity, {
            description: "Vignette darkness intensity",
            min: 0.0, max: 1.0, step: 0.05,
            onChange: (val) => { this.vignetteIntensity = val; }
        });

        this.exposeProperty("vignetteSize", "number", this.vignetteSize, {
            description: "Vignette size (smaller = more coverage)",
            min: 0.1, max: 1.0, step: 0.05,
            onChange: (val) => { this.vignetteSize = val; }
        });

        this.exposeProperty("vignetteSmoothness", "number", this.vignetteSmoothness, {
            description: "Vignette edge smoothness",
            min: 0.1, max: 1.0, step: 0.05,
            onChange: (val) => { this.vignetteSmoothness = val; }
        });

        this.exposeProperty("vignetteColor", "color", this.vignetteColor, {
            description: "Vignette color",
            onChange: (val) => { this.vignetteColor = val; }
        });

        // Color grading properties
        this.exposeProperty("enableColorGrading", "boolean", this.enableColorGrading, {
            description: "Enable color grading effects",
            onChange: (val) => { this.enableColorGrading = val; }
        });

        this.exposeProperty("brightness", "number", this.brightness, {
            description: "Brightness adjustment",
            min: -1.0, max: 1.0, step: 0.05,
            onChange: (val) => { this.brightness = val; }
        });

        this.exposeProperty("contrast", "number", this.contrast, {
            description: "Contrast adjustment",
            min: -1.0, max: 1.0, step: 0.05,
            onChange: (val) => { this.contrast = val; }
        });

        this.exposeProperty("saturation", "number", this.saturation, {
            description: "Saturation adjustment",
            min: -1.0, max: 1.0, step: 0.05,
            onChange: (val) => { this.saturation = val; }
        });

        this.exposeProperty("gamma", "number", this.gamma, {
            description: "Gamma correction",
            min: 0.1, max: 3.0, step: 0.1,
            onChange: (val) => { this.gamma = val; }
        });

        this.exposeProperty("colorTint", "color", this.colorTint, {
            description: "Color tint overlay",
            onChange: (val) => { this.colorTint = val; }
        });

        this.exposeProperty("tintIntensity", "number", this.tintIntensity, {
            description: "Color tint intensity",
            min: 0.0, max: 1.0, step: 0.05,
            onChange: (val) => { this.tintIntensity = val; }
        });

        // Film effects
        this.exposeProperty("enableFilmGrain", "boolean", this.enableFilmGrain, {
            description: "Enable film grain effect",
            onChange: (val) => { this.enableFilmGrain = val; }
        });

        this.exposeProperty("filmGrainIntensity", "number", this.filmGrainIntensity, {
            description: "Film grain intensity",
            min: 0.0, max: 1.0, step: 0.05,
            onChange: (val) => { this.filmGrainIntensity = val; }
        });

        this.exposeProperty("enableScanlines", "boolean", this.enableScanlines, {
            description: "Enable CRT scanline effect",
            onChange: (val) => { this.enableScanlines = val; }
        });

        this.exposeProperty("scanlineIntensity", "number", this.scanlineIntensity, {
            description: "Scanline intensity",
            min: 0.0, max: 1.0, step: 0.05,
            onChange: (val) => { this.scanlineIntensity = val; }
        });

        // Screen distortion
        this.exposeProperty("enableChromaticAberration", "boolean", this.enableChromaticAberration, {
            description: "Enable chromatic aberration effect",
            onChange: (val) => { this.enableChromaticAberration = val; }
        });

        this.exposeProperty("chromaticAberrationIntensity", "number", this.chromaticAberrationIntensity, {
            description: "Chromatic aberration intensity",
            min: 0.0, max: 10.0, step: 0.5,
            onChange: (val) => { this.chromaticAberrationIntensity = val; }
        });

        this.exposeProperty("enableBarrelDistortion", "boolean", this.enableBarrelDistortion, {
            description: "Enable barrel distortion effect",
            onChange: (val) => { this.enableBarrelDistortion = val; }
        });

        this.exposeProperty("barrelDistortionIntensity", "number", this.barrelDistortionIntensity, {
            description: "Barrel distortion intensity",
            min: -0.5, max: 0.5, step: 0.05,
            onChange: (val) => { this.barrelDistortionIntensity = val; }
        });

        // Lighting overlay
        this.exposeProperty("enableLightingOverlay", "boolean", this.enableLightingOverlay, {
            description: "Enable lighting overlay effects",
            onChange: (val) => { this.enableLightingOverlay = val; }
        });

        this.exposeProperty("lightingBlendMode", "enum", this.lightingBlendMode, {
            description: "Lighting blend mode",
            options: ["multiply", "overlay", "soft-light", "hard-light", "color-burn"],
            onChange: (val) => { this.lightingBlendMode = val; }
        });

        this.exposeProperty("lightingIntensity", "number", this.lightingIntensity, {
            description: "Lighting overlay intensity",
            min: 0.0, max: 2.0, step: 0.1,
            onChange: (val) => { this.lightingIntensity = val; }
        });

        this.exposeProperty("ambientLightColor", "color", this.ambientLightColor, {
            description: "Ambient light color",
            onChange: (val) => { this.ambientLightColor = val; }
        });

        this.exposeProperty("ambientLightIntensity", "number", this.ambientLightIntensity, {
            description: "Ambient light intensity",
            min: 0.0, max: 1.0, step: 0.05,
            onChange: (val) => { this.ambientLightIntensity = val; }
        });

        // Performance settings
        this.exposeProperty("effectQuality", "number", this.effectQuality, {
            description: "Overall effect quality (lower = better performance)",
            min: 0.25, max: 1.0, step: 0.25,
            onChange: (val) => {
                this.effectQuality = val;
                this.initializeCanvases();
            }
        });

        this.exposeProperty("useHalfResolution", "boolean", this.useHalfResolution, {
            description: "Process effects at half resolution for performance",
            onChange: (val) => {
                this.useHalfResolution = val;
                this.initializeCanvases();
            }
        });
    }

    style(styleHelper) {
        styleHelper
            .addHeader("Post-Screen Effects", "post-effects-header")
            .startGroup("Bloom", false, { color: "#FFD700" })
            .exposeProperty("enableBloom", "boolean", this.enableBloom, { label: "Enable Bloom" })
            .exposeProperty("bloomThreshold", "number", this.bloomThreshold, { label: "Threshold" })
            .exposeProperty("bloomIntensity", "number", this.bloomIntensity, { label: "Intensity" })
            .exposeProperty("bloomRadius", "number", this.bloomRadius, { label: "Radius" })
            .exposeProperty("bloomPasses", "number", this.bloomPasses, { label: "Passes" })
            .exposeProperty("bloomQuality", "number", this.bloomQuality, { label: "Quality" })
            .endGroup()
            .startGroup("Vignette", false, { color: "#2C3E50" })
            .exposeProperty("enableVignette", "boolean", this.enableVignette, { label: "Enable Vignette" })
            .exposeProperty("vignetteIntensity", "number", this.vignetteIntensity, { label: "Intensity" })
            .exposeProperty("vignetteSize", "number", this.vignetteSize, { label: "Size" })
            .exposeProperty("vignetteSmoothness", "number", this.vignetteSmoothness, { label: "Smoothness" })
            .exposeProperty("vignetteColor", "color", this.vignetteColor, { label: "Color" })
            .endGroup()
            .startGroup("Color Grading", false, { color: "#E74C3C" })
            .exposeProperty("enableColorGrading", "boolean", this.enableColorGrading, { label: "Enable Color Grading" })
            .exposeProperty("brightness", "number", this.brightness, { label: "Brightness" })
            .exposeProperty("contrast", "number", this.contrast, { label: "Contrast" })
            .exposeProperty("saturation", "number", this.saturation, { label: "Saturation" })
            .exposeProperty("gamma", "number", this.gamma, { label: "Gamma" })
            .exposeProperty("colorTint", "color", this.colorTint, { label: "Color Tint" })
            .exposeProperty("tintIntensity", "number", this.tintIntensity, { label: "Tint Intensity" })
            .endGroup()
            .startGroup("Film Effects", false, { color: "#8E44AD" })
            .exposeProperty("enableFilmGrain", "boolean", this.enableFilmGrain, { label: "Film Grain" })
            .exposeProperty("filmGrainIntensity", "number", this.filmGrainIntensity, { label: "Grain Intensity" })
            .exposeProperty("enableScanlines", "boolean", this.enableScanlines, { label: "Scanlines" })
            .exposeProperty("scanlineIntensity", "number", this.scanlineIntensity, { label: "Scanline Intensity" })
            .endGroup()
            .startGroup("Screen Distortion", false, { color: "#16A085" })
            .exposeProperty("enableChromaticAberration", "boolean", this.enableChromaticAberration, { label: "Chromatic Aberration" })
            .exposeProperty("chromaticAberrationIntensity", "number", this.chromaticAberrationIntensity, { label: "Aberration Intensity" })
            .exposeProperty("enableBarrelDistortion", "boolean", this.enableBarrelDistortion, { label: "Barrel Distortion" })
            .exposeProperty("barrelDistortionIntensity", "number", this.barrelDistortionIntensity, { label: "Distortion Intensity" })
            .endGroup()
            .startGroup("Lighting", false, { color: "#F39C12" })
            .exposeProperty("enableLightingOverlay", "boolean", this.enableLightingOverlay, { label: "Enable Lighting" })
            .exposeProperty("lightingBlendMode", "enum", this.lightingBlendMode, { label: "Blend Mode", options: ["multiply", "overlay", "soft-light", "hard-light", "color-burn"] })
            .exposeProperty("lightingIntensity", "number", this.lightingIntensity, { label: "Intensity" })
            .exposeProperty("ambientLightColor", "color", this.ambientLightColor, { label: "Ambient Color" })
            .exposeProperty("ambientLightIntensity", "number", this.ambientLightIntensity, { label: "Ambient Intensity" })
            .endGroup()
            .startGroup("Performance", false, { color: "#34495E" })
            .exposeProperty("effectQuality", "number", this.effectQuality, { label: "Effect Quality" })
            .exposeProperty("useHalfResolution", "boolean", this.useHalfResolution, { label: "Half Resolution" })
            .endGroup();
    }

    start() {
        this.initializeCanvases();
    }

    loop(deltaTime) {
        this.frameCounter++;

        // Check if GUI canvas size changed
        const guiCtx = window.engine?.getGuiCanvas();
        if (!guiCtx) return;

        const canvasWidth = guiCtx.canvas.width;
        const canvasHeight = guiCtx.canvas.height;

        if (canvasWidth !== this.lastViewportSize.width ||
            canvasHeight !== this.lastViewportSize.height) {
            this.lastViewportSize = { width: canvasWidth, height: canvasHeight };
            this.initializeCanvases();
        }
    }

    draw(ctx) {
        // This module processes the screen AFTER all other rendering
        // Apply effects to the GUI layer like the hills module does for night overlay
        //this.processPostEffects();
        this.applyEffectsAsOverlay();
    }

    // postDraw method that gets called after all normal rendering
    postDraw() {
        this.processPostEffects();
    }

    initializeCanvases() {
        const guiCtx = window.engine?.getGuiCanvas();
        if (!guiCtx) return;

        const canvasWidth = guiCtx.canvas.width;
        const canvasHeight = guiCtx.canvas.height;

        if (!canvasWidth || !canvasHeight) return;

        // Calculate processing resolution
        const resolutionMultiplier = this.useHalfResolution ? 0.5 : 1.0;
        const effectiveQuality = this.effectQuality * resolutionMultiplier;

        const processWidth = Math.floor(canvasWidth * effectiveQuality);
        const processHeight = Math.floor(canvasHeight * effectiveQuality);

        // Main offscreen canvas for processing
        if (!this.offscreenCanvas) {
            this.offscreenCanvas = document.createElement('canvas');
            this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        }

        this.offscreenCanvas.width = processWidth;
        this.offscreenCanvas.height = processHeight;

        // Bloom processing canvas
        if (!this.bloomCanvas) {
            this.bloomCanvas = document.createElement('canvas');
            this.bloomCtx = this.bloomCanvas.getContext('2d');
        }

        const bloomWidth = Math.floor(processWidth * this.bloomQuality);
        const bloomHeight = Math.floor(processHeight * this.bloomQuality);

        this.bloomCanvas.width = bloomWidth;
        this.bloomCanvas.height = bloomHeight;
    }

    applyEffectsAsOverlay() {
        const guiCtx = window.engine?.getGuiCanvas();
        if (!guiCtx) return;

        // Apply effects as overlays directly to GUI canvas
        if (this.enableVignette) {
            this.drawVignetteOverlay(guiCtx);
        }

        // Add color grading overlay
        if (this.enableColorGrading && (this.brightness !== 0 || this.contrast !== 0 || this.tintIntensity > 0)) {
            this.drawColorGradingOverlay(guiCtx);
        }

        // Add film grain overlay
        if (this.enableFilmGrain) {
            this.drawFilmGrainOverlay(guiCtx);
        }

        // Add scanlines overlay
        if (this.enableScanlines) {
            this.drawScanlinesOverlay(guiCtx);
        }

        // Add lighting overlay
        if (this.enableLightingOverlay) {
            this.drawLightingOverlay(guiCtx);
        }
    }

    drawLightingOverlay(ctx) {
        if (!this.enableLightingOverlay) return;

        const width = ctx.canvas.width;
        const height = ctx.canvas.height;

        ctx.save();
        ctx.globalCompositeOperation = this.lightingBlendMode;
        ctx.globalAlpha = this.lightingIntensity;

        // Apply ambient lighting
        const ambientRgb = this.hexToRgb(this.ambientLightColor);
        ctx.fillStyle = `rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${this.ambientLightIntensity})`;
        ctx.fillRect(0, 0, width, height);

        ctx.restore();
    }

    drawVignetteOverlay(ctx) {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.max(width, height) * 0.7;

        ctx.save();

        // Create vignette gradient
        const gradient = ctx.createRadialGradient(
            centerX, centerY, maxRadius * this.vignetteSize,
            centerX, centerY, maxRadius * (this.vignetteSize + this.vignetteSmoothness)
        );

        const vignetteRgb = this.hexToRgb(this.vignetteColor);
        gradient.addColorStop(0, `rgba(${vignetteRgb.r}, ${vignetteRgb.g}, ${vignetteRgb.b}, 0)`);
        gradient.addColorStop(1, `rgba(${vignetteRgb.r}, ${vignetteRgb.g}, ${vignetteRgb.b}, ${this.vignetteIntensity})`);

        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        ctx.restore();
    }

    drawColorGradingOverlay(ctx) {
        if (this.tintIntensity > 0) {
            const tintRgb = this.hexToRgb(this.colorTint);
            ctx.save();
            ctx.globalCompositeOperation = 'multiply';
            ctx.globalAlpha = this.tintIntensity;
            ctx.fillStyle = `rgb(${tintRgb.r}, ${tintRgb.g}, ${tintRgb.b})`;
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.restore();
        }
    }

    drawFilmGrainOverlay(ctx) {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * this.filmGrainIntensity * 255;
            data[i] = Math.abs(noise);     // R
            data[i + 1] = Math.abs(noise); // G
            data[i + 2] = Math.abs(noise); // B
            data[i + 3] = Math.abs(noise); // A
        }

        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = this.filmGrainIntensity;
        ctx.putImageData(imageData, 0, 0);
        ctx.restore();
    }

    drawScanlinesOverlay(ctx) {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const lineHeight = height / this.scanlineCount;

        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `rgba(0, 0, 0, ${this.scanlineIntensity})`;

        for (let y = 0; y < height; y += lineHeight * 2) {
            ctx.fillRect(0, y, width, lineHeight);
        }

        ctx.restore();
    }

    // Main processing method called after all rendering is complete
    processPostEffects() {
        const guiCtx = window.engine?.getGuiCanvas();
        if (!guiCtx) return;

        // Skip processing if performance setting is enabled
        if (this.skipFrames > 0 && this.frameCounter % (this.skipFrames + 1) !== 0) {
            return;
        }

        const canvasWidth = guiCtx.canvas.width;
        const canvasHeight = guiCtx.canvas.height;

        // Initialize canvases if needed
        if (!this.offscreenCanvas || !this.offscreenCtx) {
            this.initializeCanvases();
            if (!this.offscreenCanvas) return;
        }

        // Copy current GUI canvas content to offscreen canvas for processing
        this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
        this.offscreenCtx.drawImage(guiCtx.canvas, 0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);

        // Apply effects in order
        if (this.enableChromaticAberration) {
            this.applyChromaticAberration();
        }

        if (this.enableBarrelDistortion) {
            this.applyBarrelDistortion();
        }

        if (this.enableColorGrading) {
            this.applyColorGrading();
        }

        if (this.enableBloom) {
            this.applyBloom();
        }

        if (this.enableLightingOverlay) {
            this.applyLightingOverlay();
        }

        if (this.enableFilmGrain) {
            this.applyFilmGrain();
        }

        if (this.enableScanlines) {
            this.applyScanlines();
        }

        if (this.enableVignette) {
            this.applyVignette();
        }

        // Copy processed result back to GUI canvas
        guiCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        guiCtx.drawImage(this.offscreenCanvas, 0, 0, canvasWidth, canvasHeight);
    }

    applyBloom() {
        if (!this.bloomCanvas || !this.bloomCtx) return;

        // Extract bright areas
        this.bloomCtx.clearRect(0, 0, this.bloomCanvas.width, this.bloomCanvas.height);
        this.bloomCtx.drawImage(this.offscreenCanvas, 0, 0, this.bloomCanvas.width, this.bloomCanvas.height);

        // Apply threshold filter to extract bright areas
        const imageData = this.bloomCtx.getImageData(0, 0, this.bloomCanvas.width, this.bloomCanvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i] / 255;
            const g = data[i + 1] / 255;
            const b = data[i + 2] / 255;

            // Calculate luminance
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

            if (luminance < this.bloomThreshold) {
                data[i] = 0;     // R
                data[i + 1] = 0; // G
                data[i + 2] = 0; // B
            } else {
                // Enhance bright areas
                const factor = (luminance - this.bloomThreshold) / (1 - this.bloomThreshold);
                data[i] *= factor;
                data[i + 1] *= factor;
                data[i + 2] *= factor;
            }
        }

        this.bloomCtx.putImageData(imageData, 0, 0);

        // Apply blur passes
        for (let pass = 0; pass < this.bloomPasses; pass++) {
            this.bloomCtx.filter = `blur(${this.bloomRadius}px)`;
            this.bloomCtx.drawImage(this.bloomCanvas, 0, 0);
            this.bloomCtx.filter = 'none';
        }

        // Blend bloom with original
        this.offscreenCtx.save();
        this.offscreenCtx.globalCompositeOperation = 'screen';
        this.offscreenCtx.globalAlpha = this.bloomIntensity;
        this.offscreenCtx.drawImage(this.bloomCanvas, 0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
        this.offscreenCtx.restore();
    }

    applyVignette() {
        const width = this.offscreenCanvas.width;
        const height = this.offscreenCanvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.max(width, height) * 0.7;

        this.offscreenCtx.save();

        // Create vignette gradient
        const gradient = this.offscreenCtx.createRadialGradient(
            centerX, centerY, maxRadius * this.vignetteSize,
            centerX, centerY, maxRadius * (this.vignetteSize + this.vignetteSmoothness)
        );

        const vignetteRgb = this.hexToRgb(this.vignetteColor);
        gradient.addColorStop(0, `rgba(${vignetteRgb.r}, ${vignetteRgb.g}, ${vignetteRgb.b}, 0)`);
        gradient.addColorStop(1, `rgba(${vignetteRgb.r}, ${vignetteRgb.g}, ${vignetteRgb.b}, ${this.vignetteIntensity})`);

        this.offscreenCtx.globalCompositeOperation = 'multiply';
        this.offscreenCtx.fillStyle = gradient;
        this.offscreenCtx.fillRect(0, 0, width, height);

        this.offscreenCtx.restore();
    }

    applyColorGrading() {
        const imageData = this.offscreenCtx.getImageData(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
        const data = imageData.data;
        const tintRgb = this.hexToRgb(this.colorTint);

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i] / 255;
            let g = data[i + 1] / 255;
            let b = data[i + 2] / 255;

            // Apply gamma correction
            r = Math.pow(r, 1 / this.gamma);
            g = Math.pow(g, 1 / this.gamma);
            b = Math.pow(b, 1 / this.gamma);

            // Apply brightness
            r += this.brightness;
            g += this.brightness;
            b += this.brightness;

            // Apply contrast
            const contrastFactor = (1 + this.contrast);
            r = (r - 0.5) * contrastFactor + 0.5;
            g = (g - 0.5) * contrastFactor + 0.5;
            b = (b - 0.5) * contrastFactor + 0.5;

            // Apply saturation
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            const satFactor = 1 + this.saturation;
            r = gray + (r - gray) * satFactor;
            g = gray + (g - gray) * satFactor;
            b = gray + (b - gray) * satFactor;

            // Apply color tint
            if (this.tintIntensity > 0) {
                r = r * (1 - this.tintIntensity) + (tintRgb.r / 255) * this.tintIntensity;
                g = g * (1 - this.tintIntensity) + (tintRgb.g / 255) * this.tintIntensity;
                b = b * (1 - this.tintIntensity) + (tintRgb.b / 255) * this.tintIntensity;
            }

            // Clamp values
            data[i] = Math.max(0, Math.min(255, r * 255));
            data[i + 1] = Math.max(0, Math.min(255, g * 255));
            data[i + 2] = Math.max(0, Math.min(255, b * 255));
        }

        this.offscreenCtx.putImageData(imageData, 0, 0);
    }

    applyFilmGrain() {
        const imageData = this.offscreenCtx.getImageData(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * this.filmGrainIntensity * 255;
            data[i] += noise;     // R
            data[i + 1] += noise; // G
            data[i + 2] += noise; // B
        }

        this.offscreenCtx.putImageData(imageData, 0, 0);
    }

    applyScanlines() {
        const width = this.offscreenCanvas.width;
        const height = this.offscreenCanvas.height;
        const lineHeight = height / this.scanlineCount;

        this.offscreenCtx.save();
        this.offscreenCtx.globalCompositeOperation = 'multiply';
        this.offscreenCtx.fillStyle = `rgba(0, 0, 0, ${this.scanlineIntensity})`;

        for (let y = 0; y < height; y += lineHeight * 2) {
            this.offscreenCtx.fillRect(0, y, width, lineHeight);
        }

        this.offscreenCtx.restore();
    }

    applyChromaticAberration() {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.offscreenCanvas.width;
        tempCanvas.height = this.offscreenCanvas.height;

        // Copy original
        tempCtx.drawImage(this.offscreenCanvas, 0, 0);

        // Clear original
        this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);

        const offset = this.chromaticAberrationIntensity;

        // Draw red channel shifted left
        this.offscreenCtx.save();
        this.offscreenCtx.globalCompositeOperation = 'screen';
        this.offscreenCtx.filter = 'sepia(1) saturate(2) hue-rotate(0deg)';
        this.offscreenCtx.drawImage(tempCanvas, -offset, 0);
        this.offscreenCtx.restore();

        // Draw green channel normal
        this.offscreenCtx.save();
        this.offscreenCtx.globalCompositeOperation = 'multiply';
        this.offscreenCtx.filter = 'sepia(1) saturate(2) hue-rotate(90deg)';
        this.offscreenCtx.drawImage(tempCanvas, 0, 0);
        this.offscreenCtx.restore();

        // Draw blue channel shifted right
        this.offscreenCtx.save();
        this.offscreenCtx.globalCompositeOperation = 'screen';
        this.offscreenCtx.filter = 'sepia(1) saturate(2) hue-rotate(240deg)';
        this.offscreenCtx.drawImage(tempCanvas, offset, 0);
        this.offscreenCtx.restore();
    }

    applyBarrelDistortion() {
        const width = this.offscreenCanvas.width;
        const height = this.offscreenCanvas.height;
        const imageData = this.offscreenCtx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const newData = new Uint8ClampedArray(data.length);

        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(centerX, centerY);
        const k = this.barrelDistortionIntensity;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = (x - centerX) / maxRadius;
                const dy = (y - centerY) / maxRadius;
                const distance = Math.sqrt(dx * dx + dy * dy);

                const distortion = 1 + k * distance * distance;
                const sourceX = centerX + dx * distortion * maxRadius;
                const sourceY = centerY + dy * distortion * maxRadius;

                if (sourceX >= 0 && sourceX < width && sourceY >= 0 && sourceY < height) {
                    const sourceIndex = (Math.floor(sourceY) * width + Math.floor(sourceX)) * 4;
                    const targetIndex = (y * width + x) * 4;

                    newData[targetIndex] = data[sourceIndex];         // R
                    newData[targetIndex + 1] = data[sourceIndex + 1]; // G
                    newData[targetIndex + 2] = data[sourceIndex + 2]; // B
                    newData[targetIndex + 3] = data[sourceIndex + 3]; // A
                }
            }
        }

        const newImageData = new ImageData(newData, width, height);
        this.offscreenCtx.putImageData(newImageData, 0, 0);
    }

    applyLightingOverlay() {
        const width = this.offscreenCanvas.width;
        const height = this.offscreenCanvas.height;

        this.offscreenCtx.save();
        this.offscreenCtx.globalCompositeOperation = this.lightingBlendMode;
        this.offscreenCtx.globalAlpha = this.lightingIntensity;

        // Apply ambient lighting
        const ambientRgb = this.hexToRgb(this.ambientLightColor);
        this.offscreenCtx.fillStyle = `rgba(${ambientRgb.r}, ${ambientRgb.g}, ${ambientRgb.b}, ${this.ambientLightIntensity})`;
        this.offscreenCtx.fillRect(0, 0, width, height);

        this.offscreenCtx.restore();
    }

    // Helper method to convert hex to RGB
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    onDestroy() {
        // Clean up canvases
        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        this.bloomCanvas = null;
        this.bloomCtx = null;
        this.cachedScreenData = null;
    }

    // Serialization
    toJSON() {
        const json = super.toJSON();

        // Bloom settings
        json.enableBloom = this.enableBloom;
        json.bloomThreshold = this.bloomThreshold;
        json.bloomIntensity = this.bloomIntensity;
        json.bloomRadius = this.bloomRadius;
        json.bloomPasses = this.bloomPasses;
        json.bloomQuality = this.bloomQuality;

        // Vignette settings
        json.enableVignette = this.enableVignette;
        json.vignetteIntensity = this.vignetteIntensity;
        json.vignetteSize = this.vignetteSize;
        json.vignetteSmoothness = this.vignetteSmoothness;
        json.vignetteColor = this.vignetteColor;

        // Color grading
        json.enableColorGrading = this.enableColorGrading;
        json.brightness = this.brightness;
        json.contrast = this.contrast;
        json.saturation = this.saturation;
        json.gamma = this.gamma;
        json.colorTint = this.colorTint;
        json.tintIntensity = this.tintIntensity;

        // Film effects
        json.enableFilmGrain = this.enableFilmGrain;
        json.filmGrainIntensity = this.filmGrainIntensity;
        json.enableScanlines = this.enableScanlines;
        json.scanlineIntensity = this.scanlineIntensity;
        json.scanlineCount = this.scanlineCount;

        // Screen distortion
        json.enableChromaticAberration = this.enableChromaticAberration;
        json.chromaticAberrationIntensity = this.chromaticAberrationIntensity;
        json.enableBarrelDistortion = this.enableBarrelDistortion;
        json.barrelDistortionIntensity = this.barrelDistortionIntensity;

        // Lighting overlay
        json.enableLightingOverlay = this.enableLightingOverlay;
        json.lightingBlendMode = this.lightingBlendMode;
        json.lightingIntensity = this.lightingIntensity;
        json.ambientLightColor = this.ambientLightColor;
        json.ambientLightIntensity = this.ambientLightIntensity;

        // Performance
        json.effectQuality = this.effectQuality;
        json.useHalfResolution = this.useHalfResolution;

        return json;
    }

    fromJSON(json) {
        super.fromJSON(json);

        // Bloom settings
        if (json.enableBloom !== undefined) this.enableBloom = json.enableBloom;
        if (json.bloomThreshold !== undefined) this.bloomThreshold = json.bloomThreshold;
        if (json.bloomIntensity !== undefined) this.bloomIntensity = json.bloomIntensity;
        if (json.bloomRadius !== undefined) this.bloomRadius = json.bloomRadius;
        if (json.bloomPasses !== undefined) this.bloomPasses = json.bloomPasses;
        if (json.bloomQuality !== undefined) this.bloomQuality = json.bloomQuality;

        // Vignette settings
        if (json.enableVignette !== undefined) this.enableVignette = json.enableVignette;
        if (json.vignetteIntensity !== undefined) this.vignetteIntensity = json.vignetteIntensity;
        if (json.vignetteSize !== undefined) this.vignetteSize = json.vignetteSize;
        if (json.vignetteSmoothness !== undefined) this.vignetteSmoothness = json.vignetteSmoothness;
        if (json.vignetteColor !== undefined) this.vignetteColor = json.vignetteColor;

        // Color grading
        if (json.enableColorGrading !== undefined) this.enableColorGrading = json.enableColorGrading;
        if (json.brightness !== undefined) this.brightness = json.brightness;
        if (json.contrast !== undefined) this.contrast = json.contrast;
        if (json.saturation !== undefined) this.saturation = json.saturation;
        if (json.gamma !== undefined) this.gamma = json.gamma;
        if (json.colorTint !== undefined) this.colorTint = json.colorTint;
        if (json.tintIntensity !== undefined) this.tintIntensity = json.tintIntensity;

        // Film effects
        if (json.enableFilmGrain !== undefined) this.enableFilmGrain = json.enableFilmGrain;
        if (json.filmGrainIntensity !== undefined) this.filmGrainIntensity = json.filmGrainIntensity;
        if (json.enableScanlines !== undefined) this.enableScanlines = json.enableScanlines;
        if (json.scanlineIntensity !== undefined) this.scanlineIntensity = json.scanlineIntensity;
        if (json.scanlineCount !== undefined) this.scanlineCount = json.scanlineCount;

        // Screen distortion
        if (json.enableChromaticAberration !== undefined) this.enableChromaticAberration = json.enableChromaticAberration;
        if (json.chromaticAberrationIntensity !== undefined) this.chromaticAberrationIntensity = json.chromaticAberrationIntensity;
        if (json.enableBarrelDistortion !== undefined) this.enableBarrelDistortion = json.enableBarrelDistortion;
        if (json.barrelDistortionIntensity !== undefined) this.barrelDistortionIntensity = json.barrelDistortionIntensity;

        // Lighting overlay
        if (json.enableLightingOverlay !== undefined) this.enableLightingOverlay = json.enableLightingOverlay;
        if (json.lightingBlendMode !== undefined) this.lightingBlendMode = json.lightingBlendMode;
        if (json.lightingIntensity !== undefined) this.lightingIntensity = json.lightingIntensity;
        if (json.ambientLightColor !== undefined) this.ambientLightColor = json.ambientLightColor;
        if (json.ambientLightIntensity !== undefined) this.ambientLightIntensity = json.ambientLightIntensity;

        // Performance
        if (json.effectQuality !== undefined) this.effectQuality = json.effectQuality;
        if (json.useHalfResolution !== undefined) this.useHalfResolution = json.useHalfResolution;

        // Reinitialize canvases with new settings
        this.initializeCanvases();
    }
}

// Make the class available globally
window.PostScreenEffects = PostScreenEffects;
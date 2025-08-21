// Darkness Module - Creates darkness overlay with day/night system
class DarknessModule extends Module {
    static namespace = "Lighting";
    static description = "Creates darkness overlay with day/night cycle that can be cut through by point lights";
    static allowMultiple = false;
    static iconClass = "fas fa-moon";

    constructor() {
        super("DarknessModule");

        // Basic darkness properties
        this.baseOpacity = 0.8;
        this.color = "#000000";
        this.blendMode = "multiply";
        this.lights = [];
        this.resolutionMultiplier = 1; // 1 = full res, 2 = half res, etc.

        // Day/Night System Properties
        this.enableDayNight = true;
        this.currentTime = 12.0; // 24-hour format (0-24)
        this.dawnStart = 6.0;    // 6:00 AM
        this.duskStart = 18.0;   // 6:00 PM
        this.timeScale = 60.0;   // 1 second = 1 minute in game

        // Color tints for different times of day
        this.dayTint = "#ffffff";     // Pure white for day
        this.nightTint = "#1a1a2e";   // Dark blue for night
        this.dawnTint = "#ff9a56";    // Orange for dawn
        this.duskTint = "#ff6b6b";    // Red for dusk

        // Opacity multipliers for different times
        this.dayOpacity = 0.1;     // Very light during day
        this.nightOpacity = 0.9;   // Very dark at night
        this.dawnOpacity = 0.4;    // Medium darkness at dawn
        this.duskOpacity = 0.5;    // Medium darkness at dusk

        // Transition durations (in hours)
        this.dawnDuration = 2.0;   // 2 hours for dawn transition
        this.duskDuration = 2.0;   // 2 hours for dusk transition

        // Performance optimization properties
        this._maskCanvas = null;
        this._maskCtx = null;
        this._colorCanvas = null;
        this._colorCtx = null;
        this._finalCanvas = null;  // NEW: Final composite canvas
        this._finalCtx = null;     // NEW: Final composite context
        this._lastVpWidth = 0;
        this._lastVpHeight = 0;
        this._lightsDirty = true;
        this._lastLightCount = 0;

        // Calculated values (updated each frame)
        this._currentOpacity = this.baseOpacity;
        this._currentTint = this.color;
        this._timeOfDay = "day"; // "day", "night", "dawn", "dusk"

        this.updateInterval = 0.05; // seconds, default 20 FPS
        this._updateTimer = 0;

        this._setupProperties();
    }

    _setupProperties() {
        // Basic Properties
        this.exposeProperty("updateInterval", "number", this.updateInterval, {
            description: "How often to update lighting (seconds)",
            onChange: (val) => { this.updateInterval = Math.max(0.01, val); }
        });

        this.exposeProperty("baseOpacity", "number", this.baseOpacity, {
            description: "Base darkness opacity (0-1)",
            onChange: (val) => { this.baseOpacity = val; }
        });

        this.exposeProperty("color", "color", this.color, {
            description: "Base darkness color",
            onChange: (val) => { this.color = val; }
        });

        this.exposeProperty("blendMode", "enum", this.blendMode, {
            description: "Canvas blend mode for darkness",
            options: ["multiply", "overlay", "darken", "color-burn", "normal"],
            onChange: (val) => { this.blendMode = val; }
        });

        this.exposeProperty("resolutionMultiplier", "number", this.resolutionMultiplier, {
            description: "Lighting resolution multiplier (1 = full, 2 = half, etc.)",
            onChange: (val) => { this.resolutionMultiplier = Math.max(1, Math.round(val)); }
        });

        // Day/Night System Properties
        this.exposeProperty("enableDayNight", "boolean", this.enableDayNight, {
            description: "Enable day/night cycle",
            onChange: (val) => { this.enableDayNight = val; }
        });

        this.exposeProperty("currentTime", "number", this.currentTime, {
            description: "Current time in 24-hour format (0-24)",
            onChange: (val) => { this.currentTime = Math.max(0, Math.min(24, val)); }
        });

        this.exposeProperty("timeScale", "number", this.timeScale, {
            description: "Time speed multiplier (1 = real time, 60 = 1 real second = 1 game minute)",
            onChange: (val) => { this.timeScale = Math.max(0.1, val); }
        });

        this.exposeProperty("dawnStart", "number", this.dawnStart, {
            description: "Dawn start time (0-24)",
            onChange: (val) => { this.dawnStart = Math.max(0, Math.min(24, val)); }
        });

        this.exposeProperty("duskStart", "number", this.duskStart, {
            description: "Dusk start time (0-24)",
            onChange: (val) => { this.duskStart = Math.max(0, Math.min(24, val)); }
        });

        this.exposeProperty("dawnDuration", "number", this.dawnDuration, {
            description: "Dawn transition duration (hours)",
            onChange: (val) => { this.dawnDuration = Math.max(0.1, val); }
        });

        this.exposeProperty("duskDuration", "number", this.duskDuration, {
            description: "Dusk transition duration (hours)",
            onChange: (val) => { this.duskDuration = Math.max(0.1, val); }
        });

        // Color tints
        this.exposeProperty("dayTint", "color", this.dayTint, {
            description: "Color tint during day",
            onChange: (val) => { this.dayTint = val; }
        });

        this.exposeProperty("nightTint", "color", this.nightTint, {
            description: "Color tint during night",
            onChange: (val) => { this.nightTint = val; }
        });

        this.exposeProperty("dawnTint", "color", this.dawnTint, {
            description: "Color tint during dawn",
            onChange: (val) => { this.dawnTint = val; }
        });

        this.exposeProperty("duskTint", "color", this.duskTint, {
            description: "Color tint during dusk",
            onChange: (val) => { this.duskTint = val; }
        });

        // Opacity multipliers
        this.exposeProperty("dayOpacity", "number", this.dayOpacity, {
            description: "Opacity multiplier during day",
            onChange: (val) => { this.dayOpacity = Math.max(0, Math.min(1, val)); }
        });

        this.exposeProperty("nightOpacity", "number", this.nightOpacity, {
            description: "Opacity multiplier during night",
            onChange: (val) => { this.nightOpacity = Math.max(0, Math.min(1, val)); }
        });

        this.exposeProperty("dawnOpacity", "number", this.dawnOpacity, {
            description: "Opacity multiplier during dawn",
            onChange: (val) => { this.dawnOpacity = Math.max(0, Math.min(1, val)); }
        });

        this.exposeProperty("duskOpacity", "number", this.duskOpacity, {
            description: "Opacity multiplier during dusk",
            onChange: (val) => { this.duskOpacity = Math.max(0, Math.min(1, val)); }
        });
    }

    style(style) {
        style.exposeProperty("updateInterval", "number", this.updateInterval, {
            description: "How often to update lighting (seconds)",
            min: 0.01, max: 1, step: 0.01,
            style: { label: "Update Interval", slider: true }
        });

        style.startGroup("Basic Darkness Settings", false, {
            backgroundColor: 'rgba(50, 50, 100, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("baseOpacity", "number", this.baseOpacity, {
            description: "Base darkness opacity",
            min: 0, max: 1, step: 0.01,
            style: { label: "Base Opacity", slider: true }
        });

        style.exposeProperty("color", "color", this.color, {
            style: { label: "Base Color" }
        });

        style.exposeProperty("blendMode", "enum", this.blendMode, {
            options: ["multiply", "overlay", "darken", "color-burn", "normal"],
            style: { label: "Blend Mode" }
        });

        style.exposeProperty("resolutionMultiplier", "number", this.resolutionMultiplier, {
            min: 1, max: 8, step: 1,
            style: { label: "Resolution Multiplier", slider: true }
        });

        style.endGroup();

        // Day/Night System
        style.startGroup("Day/Night System", false, {
            backgroundColor: 'rgba(100, 150, 255, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("enableDayNight", "boolean", this.enableDayNight, {
            style: { label: "Enable Day/Night Cycle" }
        });

        style.exposeProperty("currentTime", "number", this.currentTime, {
            min: 0, max: 24, step: 0.1,
            style: { label: "Current Time (24h)", slider: true }
        });

        style.exposeProperty("timeScale", "number", this.timeScale, {
            min: 0.1, max: 3600, step: 1,
            style: { label: "Time Scale Multiplier" }
        });

        style.endGroup();

        // Time Periods
        style.startGroup("Time Periods", false, {
            backgroundColor: 'rgba(255, 200, 100, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("dawnStart", "number", this.dawnStart, {
            min: 0, max: 24, step: 0.1,
            style: { label: "Dawn Start (24h)", slider: true }
        });

        style.exposeProperty("dawnDuration", "number", this.dawnDuration, {
            min: 0.1, max: 6, step: 0.1,
            style: { label: "Dawn Duration (hours)", slider: true }
        });

        style.exposeProperty("duskStart", "number", this.duskStart, {
            min: 0, max: 24, step: 0.1,
            style: { label: "Dusk Start (24h)", slider: true }
        });

        style.exposeProperty("duskDuration", "number", this.duskDuration, {
            min: 0.1, max: 6, step: 0.1,
            style: { label: "Dusk Duration (hours)", slider: true }
        });

        style.endGroup();

        // Color Tints
        style.startGroup("Color Tints", false, {
            backgroundColor: 'rgba(200, 255, 200, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("dayTint", "color", this.dayTint, {
            style: { label: "Day Tint" }
        });

        style.exposeProperty("dawnTint", "color", this.dawnTint, {
            style: { label: "Dawn Tint" }
        });

        style.exposeProperty("duskTint", "color", this.duskTint, {
            style: { label: "Dusk Tint" }
        });

        style.exposeProperty("nightTint", "color", this.nightTint, {
            style: { label: "Night Tint" }
        });

        style.endGroup();

        // Opacity Settings
        style.startGroup("Time-based Opacity", false, {
            backgroundColor: 'rgba(255, 150, 255, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("dayOpacity", "number", this.dayOpacity, {
            min: 0, max: 1, step: 0.01,
            style: { label: "Day Opacity", slider: true }
        });

        style.exposeProperty("dawnOpacity", "number", this.dawnOpacity, {
            min: 0, max: 1, step: 0.01,
            style: { label: "Dawn Opacity", slider: true }
        });

        style.exposeProperty("duskOpacity", "number", this.duskOpacity, {
            min: 0, max: 1, step: 0.01,
            style: { label: "Dusk Opacity", slider: true }
        });

        style.exposeProperty("nightOpacity", "number", this.nightOpacity, {
            min: 0, max: 1, step: 0.01,
            style: { label: "Night Opacity", slider: true }
        });

        style.endGroup();

        style.addDivider();
        style.addHelpText(`Current Time: ${this.getTimeString()}`);
        style.addHelpText(`Time of Day: ${this._timeOfDay}`);
        style.addHelpText("Point lights will cut through this darkness. Day/night cycle automatically adjusts darkness and color.");
    }

    loop(delta) {
        // Keep the game object at 0,0 to keep it at the viewport
        this.gameObject.position.x = 0;
        this.gameObject.position.y = 0;

        // Update time
        if (this.enableDayNight) {
            this.currentTime += (delta * this.timeScale) / 3600;
            if (this.currentTime >= 24) {
                this.currentTime -= 24;
            }
        }

        this._updateTimer += delta;
        if (this._updateTimer >= this.updateInterval) {
            this._lightsDirty = true;  // This ensures regular updates
            this._updateTimer = 0;
        }

        // Calculate current darkness properties based on time
        this._updateTimeOfDay();

        // SIMPLIFY the light count check:
        if (this.lights.length !== this._lastLightCount) {
            this._lightsDirty = true;
            this._lastLightCount = this.lights.length;
        }
    }

    _updateTimeOfDay() {
        if (!this.enableDayNight) {
            this._currentOpacity = this.baseOpacity;
            this._currentTint = this.color;
            this._timeOfDay = "manual";
            return;
        }

        const time = this.currentTime;
        const dawnEnd = (this.dawnStart + this.dawnDuration) % 24;
        const duskEnd = (this.duskStart + this.duskDuration) % 24;

        let timeOfDay, opacity, tint;

        // Determine time of day and interpolation
        if (this._isTimeBetween(time, this.dawnStart, dawnEnd)) {
            // Dawn transition
            timeOfDay = "dawn";
            const progress = this._getTransitionProgress(time, this.dawnStart, this.dawnDuration);
            opacity = this._lerp(this.nightOpacity, this.dayOpacity, progress);
            tint = this._lerpColor(this.nightTint, this.dawnTint, progress * 0.5) ||
                this._lerpColor(this.dawnTint, this.dayTint, progress * 0.5 + 0.5);
        } else if (this._isTimeBetween(time, dawnEnd, this.duskStart)) {
            // Day
            timeOfDay = "day";
            opacity = this.dayOpacity;
            tint = this.dayTint;
        } else if (this._isTimeBetween(time, this.duskStart, duskEnd)) {
            // Dusk transition
            timeOfDay = "dusk";
            const progress = this._getTransitionProgress(time, this.duskStart, this.duskDuration);
            opacity = this._lerp(this.dayOpacity, this.nightOpacity, progress);
            tint = this._lerpColor(this.dayTint, this.duskTint, progress * 0.5) ||
                this._lerpColor(this.duskTint, this.nightTint, progress * 0.5 + 0.5);
        } else {
            // Night
            timeOfDay = "night";
            opacity = this.nightOpacity;
            tint = this.nightTint;
        }

        this._timeOfDay = timeOfDay;
        this._currentOpacity = this.baseOpacity * opacity;
        this._currentTint = tint;
    }

    _isTimeBetween(time, start, end) {
        if (start <= end) {
            return time >= start && time <= end;
        } else {
            return time >= start || time <= end;
        }
    }

    _getTransitionProgress(time, start, duration) {
        let elapsed = time - start;
        if (elapsed < 0) elapsed += 24;
        return Math.min(1, Math.max(0, elapsed / duration));
    }

    _lerp(a, b, t) {
        return a + (b - a) * t;
    }

    _lerpColor(color1, color2, t) {
        // Simple color interpolation - could be enhanced with proper color space conversion
        try {
            const c1 = this._hexToRgb(color1);
            const c2 = this._hexToRgb(color2);
            if (!c1 || !c2) return color1;

            const r = Math.round(this._lerp(c1.r, c2.r, t));
            const g = Math.round(this._lerp(c1.g, c2.g, t));
            const b = Math.round(this._lerp(c1.b, c2.b, t));

            return `rgb(${r},${g},${b})`;
        } catch (e) {
            return color1;
        }
    }

    _hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    draw(ctx) {
        const vp = window.engine.viewport;

        // Only recreate canvases if viewport changed
        if (!this._finalCanvas || this._lastVpWidth !== vp.width || this._lastVpHeight !== vp.height) {
            this._createCanvases(vp);
            this._lightsDirty = true;
        }

        // Render everything to final canvas first
        this._renderToFinalCanvas(vp);

        // Draw the final result with proper opacity
        ctx.save();
        ctx.globalCompositeOperation = this.blendMode;
        ctx.globalAlpha = this._currentOpacity;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
            this._finalCanvas,
            0, 0, this._finalCanvas.width, this._finalCanvas.height,
            vp.x, vp.y, vp.width, vp.height
        );
        ctx.restore();
    }

    _createCanvases(vp) {
        const mul = this.resolutionMultiplier;

        // Light mask canvas
        this._maskCanvas = document.createElement('canvas');
        this._maskCanvas.width = Math.ceil(vp.width / mul);
        this._maskCanvas.height = Math.ceil(vp.height / mul);
        this._maskCtx = this._maskCanvas.getContext('2d');

        // Color canvas (if needed for future features)
        this._colorCanvas = document.createElement('canvas');
        this._colorCanvas.width = Math.ceil(vp.width / mul);
        this._colorCanvas.height = Math.ceil(vp.height / mul);
        this._colorCtx = this._colorCanvas.getContext('2d');

        // Final composite canvas
        this._finalCanvas = document.createElement('canvas');
        this._finalCanvas.width = Math.ceil(vp.width / mul);
        this._finalCanvas.height = Math.ceil(vp.height / mul);
        this._finalCtx = this._finalCanvas.getContext('2d');

        this._lastVpWidth = vp.width;
        this._lastVpHeight = vp.height;
    }

    _renderToFinalCanvas(vp) {
        const mul = this.resolutionMultiplier;

        // Clear final canvas
        this._finalCtx.clearRect(0, 0, this._finalCanvas.width, this._finalCanvas.height);

        // Draw base darkness at full opacity
        this._finalCtx.save();
        this._finalCtx.fillStyle = this._currentTint;
        this._finalCtx.fillRect(0, 0, this._finalCanvas.width, this._finalCanvas.height);
        this._finalCtx.restore();

        // --- NEW: Draw colored lights ---
        if (this.lights.length > 0) {
            this._colorCtx.clearRect(0, 0, this._colorCanvas.width, this._colorCanvas.height);
            this._colorCtx.save();
            this._colorCtx.scale(1 / mul, 1 / mul);
            this._colorCtx.translate(-vp.x / mul, -vp.y / mul);
            for (const light of this.lights) {
                if (light.drawColor) {
                    light.drawColor(this._colorCtx, mul); // Pass multiplier
                }
            }
            this._colorCtx.restore();

            // Composite colored lights using 'lighter' (additive)
            this._finalCtx.save();
            this._finalCtx.globalCompositeOperation = "screen";
            this._finalCtx.drawImage(this._colorCanvas, 0, 0);
            this._finalCtx.restore();
        }
        // --- END NEW ---

        // Apply light masks - ALWAYS redraw, don't check _lightsDirty here
        if (this.lights.length > 0) {
            this._renderLightMasks(vp, mul);  // Always render masks

            this._finalCtx.save();
            this._finalCtx.globalCompositeOperation = "destination-out";
            this._finalCtx.drawImage(this._maskCanvas, 0, 0);
            this._finalCtx.restore();
        }
    }

    _renderLightMasks(vp, mul = this.resolutionMultiplier) {
        this._maskCtx.clearRect(0, 0, this._maskCanvas.width, this._maskCanvas.height);
        this._maskCtx.save();
        this._maskCtx.scale(1 / mul, 1 / mul);
        this._maskCtx.translate(-vp.x / mul, -vp.y / mul);
        for (const light of this.lights) {
            if (light.drawMask) {
                light.drawMask(this._maskCtx, mul); // Pass multiplier
            }
        }
        this._maskCtx.restore();
    }

    // Public API Methods
    getTimeOfDay() {
        return this._timeOfDay;
    }

    getCurrentTime() {
        return this.currentTime;
    }

    getTimeString() {
        const hours = Math.floor(this.currentTime);
        const minutes = Math.floor((this.currentTime - hours) * 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    setTime(time) {
        this.currentTime = Math.max(0, Math.min(24, time));
    }

    addTime(hours) {
        this.currentTime = (this.currentTime + hours) % 24;
        if (this.currentTime < 0) this.currentTime += 24;
    }

    isDaytime() {
        return this._timeOfDay === "day" || this._timeOfDay === "dawn";
    }

    isNighttime() {
        return this._timeOfDay === "night" || this._timeOfDay === "dusk";
    }

    getCurrentOpacity() {
        return this._currentOpacity;
    }

    getCurrentTint() {
        return this._currentTint;
    }

    // Light registration (optimized)
    registerLight(light) {
        if (!this.lights.includes(light)) {
            this.lights.push(light);
            this._lightsDirty = true;
        }
    }

    unregisterLight(light) {
        const index = this.lights.indexOf(light);
        if (index !== -1) {
            this.lights.splice(index, 1);
            this._lightsDirty = true;
        }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            baseOpacity: this.baseOpacity,
            color: this.color,
            blendMode: this.blendMode,
            enableDayNight: this.enableDayNight,
            currentTime: this.currentTime,
            dawnStart: this.dawnStart,
            duskStart: this.duskStart,
            timeScale: this.timeScale,
            dayTint: this.dayTint,
            nightTint: this.nightTint,
            dawnTint: this.dawnTint,
            duskTint: this.duskTint,
            dayOpacity: this.dayOpacity,
            nightOpacity: this.nightOpacity,
            dawnOpacity: this.dawnOpacity,
            duskOpacity: this.duskOpacity,
            dawnDuration: this.dawnDuration,
            duskDuration: this.duskDuration
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        if (!data) return;

        this.baseOpacity = data.baseOpacity ?? 0.8;
        this.color = data.color || "#000000";
        this.blendMode = data.blendMode || "multiply";
        this.enableDayNight = data.enableDayNight ?? true;
        this.currentTime = data.currentTime ?? 12.0;
        this.dawnStart = data.dawnStart ?? 6.0;
        this.duskStart = data.duskStart ?? 18.0;
        this.timeScale = data.timeScale ?? 60.0;
        this.dayTint = data.dayTint || "#ffffff";
        this.nightTint = data.nightTint || "#1a1a2e";
        this.dawnTint = data.dawnTint || "#ff9a56";
        this.duskTint = data.duskTint || "#ff6b6b";
        this.dayOpacity = data.dayOpacity ?? 0.1;
        this.nightOpacity = data.nightOpacity ?? 0.9;
        this.dawnOpacity = data.dawnOpacity ?? 0.4;
        this.duskOpacity = data.duskOpacity ?? 0.5;
        this.dawnDuration = data.dawnDuration ?? 2.0;
        this.duskDuration = data.duskDuration ?? 2.0;
    }
}

// Register module globally
window.DarknessModule = DarknessModule;
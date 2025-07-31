class DrawPlatformerHills extends Module {
    static namespace = "Drawing";
    static description = "Generates layered procedural hills with spline curves, parallax effect, infinite horizontal generation, and day/night cycle";
    static allowMultiple = false;
    static icon = "fa-mountain";
    static color = "#445844ff"; // Green color for hills
    static drawInEditor = false; // This module does not need to be drawn in the editor

    constructor() {
        super("DrawPlatformerHills");

        // Original properties
        this.backgroundColor = "#87CEEB"; // Sky blue (day color)
        this.hillColor = "#228B22"; // Base hill color (will be dark)
        this.hillLayers = 3; // Number of hill layers
        this.pointCount = 8; // Number of control points per hill segment
        this.hillStyle = "rounded"; // Curve style: "rounded" or "pointy"
        this.minHeight = 0.3; // Minimum hill height (0-1)
        this.maxHeight = 0.7; // Maximum hill height (0-1)
        this.seed = Math.random() * 1000; // Random seed for generation
        this.imageHeight = 600; // Height of generated image
        this.parallaxStrength = 0.5; // Parallax effect strength (0-1)
        this.segmentWidth = 800; // Width of each hill segment for generation

        // Water properties
        this.waterHeight = 80; // Height of water from bottom
        this.waterColor = "#1E90FF";
        this.waterAlpha = 0.5;
        this.waveIntensity = 16; // Max vertical wave amplitude
        this.waveSpeed = 0.5; // Speed of wave movement
        this.waveLayers = 2; // Number of wave layers

        // --- Day/Night Cycle Properties ---
        this.timeScale = 1.0; // Speed multiplier for time progression
        this.currentTime = 0.5; // Current time (0 = midnight, 0.5 = noon, 1 = midnight again)
        this.currentHour = 12; // Current hour (0-23)
        this.dayColor = "#87CEEB"; // Peak day sky color
        this.nightColor = "#0B1426"; // Peak night sky color
        this.enableDayNightCycle = true; // Toggle day/night cycle

        // Sun properties
        this.sunSize = 60; // Sun radius
        this.sunColor = "#FFD700"; // Sun color
        this.sunGlowSize = 120; // Sun glow radius
        this.sunGlowColor = "#FFEB94"; // Sun glow color

        // Moon properties
        this.moonSize = 45; // Moon radius
        this.moonColor = "#F5F5DC"; // Moon color
        this.moonPhase = 0.5; // Moon phase (0 = new moon, 0.5 = full moon, 1 = new moon)
        this.moonPhaseSpeed = 0.1; // Speed of moon phase changes
        this.eclipseDarkness = 0; // Darkness during eclipse (0-1)

        // Star properties
        this.starCount = 100; // Number of stars
        this.starSeed = 42; // Seed for star positions
        this.starTwinkleSpeed = 2.0; // Speed of star twinkling
        this.maxStarSize = 3; // Maximum star size

        // --- Cloud properties ---
        this.maxClouds = 6;
        this.cloudSpeed = 40; // px/sec
        this.windDirection = 1; // -1 = left, 1 = right
        this.cloudSeed = 1234;
        this.clouds = [];
        this.cloudTypes = [
            { w: 120, h: 48, alpha: 0.5 },
            { w: 80, h: 32, alpha: 0.6 },
            { w: 160, h: 56, alpha: 0.4 }
        ];

        // Celestial body positioning
        this.celestialArcHeight = 0.6; // How high the sun/moon arc (0-1)
        this.celestialParallax = 0.2; // Parallax factor for celestial bodies

        // Cache for generated hill segments and stars
        this.hillCache = new Map();
        this.starPositions = [];
        this.lastViewportBounds = null;

        this.lastDay = this.getDay(); // Track last day for moon phase updates

        this.moonWasVisible = false;

        this.setupProperties();
        this.generateStars();
        this.resetClouds();
    }

    setupProperties() {
        // Image properties
        this.exposeProperty("imageHeight", "number", this.imageHeight, {
            description: "Height of the generated hill image",
            min: 100, max: 2000,
            step: 1,
            onChange: (val) => {
                this.imageHeight = val;
                this.clearCache();
            }
        });

        // Day/Night Cycle properties
        this.exposeProperty("enableDayNightCycle", "boolean", this.enableDayNightCycle, {
            description: "Enable automatic day/night cycle",
            onChange: (val) => { this.enableDayNightCycle = val; }
        });

        this.exposeProperty("timeScale", "number", this.timeScale, {
            description: "Time progression speed multiplier",
            min: 0.1, max: 10.0, step: 0.1,
            onChange: (val) => { this.timeScale = val; }
        });

        /*this.exposeProperty("currentTime", "number", this.currentTime, {
            description: "Current time (0=midnight, 0.5=noon, 1=midnight)",
            min: 0, max: 1, step: 0.01,
            onChange: (val) => { this.currentTime = val; }
        });*/

        this.exposeProperty("currentHour", "number", this.currentHour, {
            description: "Current hour (0-24, syncs with currentTime)",
            min: 0, max: 24, step: 0.1,
            onChange: (val) => {
                this.currentHour = val;
                this.currentTime = (val % 24) / 24;
            }
        });

        // Sky colors
        this.exposeProperty("dayColor", "color", this.dayColor, {
            description: "Peak day sky color",
            onChange: (val) => { this.dayColor = val; }
        });

        this.exposeProperty("nightColor", "color", this.nightColor, {
            description: "Peak night sky color",
            onChange: (val) => { this.nightColor = val; }
        });

        this.exposeProperty("hillColor", "color", "#228B22", {
            description: "Base hill color (layers get darker automatically)",
            onChange: (val) => {
                this.hillColor = val;
                this.clearCache();
            }
        });

        // Sun properties
        this.exposeProperty("sunSize", "number", this.sunSize, {
            description: "Sun radius",
            min: 20, max: 150,
            onChange: (val) => { this.sunSize = val; }
        });

        this.exposeProperty("sunColor", "color", this.sunColor, {
            description: "Sun color",
            onChange: (val) => { this.sunColor = val; }
        });

        this.exposeProperty("sunGlowColor", "color", this.sunGlowColor, {
            description: "Sun glow color",
            onChange: (val) => { this.sunGlowColor = val; }
        });

        // Moon properties
        this.exposeProperty("moonSize", "number", this.moonSize, {
            description: "Moon radius",
            min: 20, max: 150,
            onChange: (val) => { this.moonSize = val; }
        });

        this.exposeProperty("moonColor", "color", this.moonColor, {
            description: "Moon color",
            onChange: (val) => { this.moonColor = val; }
        });

        this.exposeProperty("moonPhaseSpeed", "number", this.moonPhaseSpeed, {
            description: "Speed of moon phase changes",
            min: 0.01, max: 1.0, step: 0.01,
            onChange: (val) => { this.moonPhaseSpeed = val; }
        });

        // Star properties
        this.exposeProperty("starCount", "number", this.starCount, {
            description: "Number of stars",
            min: 10, max: 500,
            onChange: (val) => {
                this.starCount = val;
                this.generateStars();
            }
        });

        this.exposeProperty("starSeed", "number", this.starSeed, {
            description: "Seed for star positions",
            min: 1, max: 10000,
            onChange: (val) => {
                this.starSeed = val;
                this.generateStars();
            }
        });

        this.exposeProperty("starTwinkleSpeed", "number", this.starTwinkleSpeed, {
            description: "Speed of star twinkling",
            min: 0.1, max: 5.0, step: 0.1,
            onChange: (val) => { this.starTwinkleSpeed = val; }
        });

        // Hill generation settings
        this.exposeProperty("hillLayers", "number", 3, {
            description: "Number of hill layers",
            min: 1, max: 8,
            onChange: (val) => {
                this.hillLayers = val;
                this.clearCache();
            }
        });

        this.exposeProperty("pointCount", "number", 8, {
            description: "Number of control points per hill segment",
            min: 4, max: 20,
            onChange: (val) => {
                this.pointCount = val;
                this.clearCache();
            }
        });

        this.exposeProperty("hillStyle", "enum", "rounded", {
            description: "Hill curve style",
            options: ["rounded", "pointy"],
            onChange: (val) => {
                this.hillStyle = val;
                this.clearCache();
            }
        });

        this.exposeProperty("minHeight", "number", 0.3, {
            description: "Minimum hill height (0-1)",
            min: 0.1, max: 0.8,
            onChange: (val) => {
                this.minHeight = val;
                this.clearCache();
            }
        });

        this.exposeProperty("maxHeight", "number", 0.7, {
            description: "Maximum hill height (0-1)",
            min: 0.2, max: 1.0,
            onChange: (val) => {
                this.maxHeight = val;
                this.clearCache();
            }
        });

        this.exposeProperty("parallaxStrength", "number", 0.5, {
            description: "Parallax effect strength (0 = no parallax, 1 = full parallax)",
            min: 0, max: 1,
            step: 0.1,
            onChange: (val) => {
                this.parallaxStrength = val;
            }
        });

        this.exposeProperty("segmentWidth", "number", 800, {
            description: "Width of each hill segment",
            min: 200, max: 2000,
            step: 50,
            onChange: (val) => {
                this.segmentWidth = val;
                this.clearCache();
            }
        });

        this.exposeProperty("seed", "number", 42, {
            description: "Random seed for generation",
            min: 1, max: 10000,
            onChange: (val) => {
                this.seed = val;
                this.clearCache();
            }
        });

        // Water properties
        this.exposeProperty("waterHeight", "number", this.waterHeight, {
            description: "Height of water from bottom",
            min: 10, max: 400,
            onChange: (val) => { this.waterHeight = val; }
        });
        this.exposeProperty("waterColor", "color", this.waterColor, {
            description: "Water color",
            onChange: (val) => { this.waterColor = val; }
        });
        this.exposeProperty("waterAlpha", "number", this.waterAlpha, {
            description: "Water transparency (0-1)",
            min: 0, max: 1, step: 0.05,
            onChange: (val) => { this.waterAlpha = val; }
        });
        this.exposeProperty("waveIntensity", "number", this.waveIntensity, {
            description: "Wave intensity (amplitude)",
            min: 0, max: 64,
            onChange: (val) => { this.waveIntensity = val; }
        });
        this.exposeProperty("waveSpeed", "number", this.waveSpeed, {
            description: "Wave speed (animation)",
            min: 0.01, max: 3, step: 0.01,
            onChange: (val) => { this.waveSpeed = val; }
        });
        this.exposeProperty("waveLayers", "number", this.waveLayers, {
            description: "Number of wave layers",
            min: 1, max: 5,
            onChange: (val) => { this.waveLayers = val; }
        });

        /*this.exposeProperty("maxClouds", "number", this.maxClouds, {
            description: "Maximum clouds on screen",
            min: 1, max: 20,
            onChange: (val) => {
                this.maxClouds = val;
                this.resetClouds();
            }
        });
        this.exposeProperty("cloudSpeed", "number", this.cloudSpeed, {
            description: "Cloud speed (px/sec)",
            min: 5, max: 200,
            onChange: (val) => { this.cloudSpeed = val; }
        });
        this.exposeProperty("windDirection", "number", this.windDirection, {
            description: "Wind direction (-1 = left, 1 = right)",
            min: -1, max: 1, step: 0.1,
            onChange: (val) => { this.windDirection = val; }
        });
        this.exposeProperty("cloudSeed", "number", this.cloudSeed, {
            description: "Cloud random seed",
            min: 1, max: 10000,
            onChange: (val) => {
                this.cloudSeed = val;
                this.resetClouds();
            }
        });*/
    }

    style(styleHelper) {
        styleHelper
            .addHeader("Platformer Hills with Day/Night Cycle", "hills-header")
            .startGroup("Day/Night Cycle", false, { color: "#4A90E2" })
            .exposeProperty("enableDayNightCycle", "boolean", this.enableDayNightCycle, { label: "Enable Day/Night Cycle" })
            .exposeProperty("timeScale", "number", this.timeScale, { label: "Time Scale" })
            //.exposeProperty("currentTime", "number", this.currentTime, { label: "Current Time" })
            .exposeProperty("currentHour", "number", this.currentHour, { label: "Current Hour" })
            .exposeProperty("dayColor", "color", this.dayColor, { label: "Day Sky Color" })
            .exposeProperty("nightColor", "color", this.nightColor, { label: "Night Sky Color" })
            .endGroup()
            .startGroup("Sun", false, { color: "#FFD700" })
            .exposeProperty("sunSize", "number", this.sunSize, { label: "Sun Size" })
            .exposeProperty("sunColor", "color", this.sunColor, { label: "Sun Color" })
            .exposeProperty("sunGlowColor", "color", this.sunGlowColor, { label: "Sun Glow Color" })
            .endGroup()
            .startGroup("Moon", false, { color: "#C0C0C0" })
            .exposeProperty("moonSize", "number", this.moonSize, { label: "Moon Size" })
            .exposeProperty("moonColor", "color", this.moonColor, { label: "Moon Color" })
            .exposeProperty("moonPhaseSpeed", "number", this.moonPhaseSpeed, { label: "Moon Phase Speed" })
            .endGroup()
            .startGroup("Stars", false, { color: "#FFFFFF" })
            .exposeProperty("starCount", "number", this.starCount, { label: "Star Count" })
            .exposeProperty("starSeed", "number", this.starSeed, { label: "Star Seed" })
            .exposeProperty("starTwinkleSpeed", "number", this.starTwinkleSpeed, { label: "Twinkle Speed" })
            .endGroup()
            .startGroup("Image", false, { color: "#0078D7" })
            .exposeProperty("imageHeight", "number", this.imageHeight, { label: "Image Height" })
            .endGroup()
            .startGroup("Hill Generation", false)
            .exposeProperty("hillColor", "color", this.hillColor, { label: "Hill Color" })
            .exposeProperty("hillLayers", "number", this.hillLayers, { label: "Hill Layers" })
            .exposeProperty("pointCount", "number", this.pointCount, { label: "Points Per Hill" })
            .exposeProperty("hillStyle", "enum", this.hillStyle, { label: "Hill Style", options: ["rounded", "pointy"] })
            .exposeProperty("minHeight", "number", this.minHeight, { label: "Min Hill Height" })
            .exposeProperty("maxHeight", "number", this.maxHeight, { label: "Max Hill Height" })
            .exposeProperty("segmentWidth", "number", this.segmentWidth, { label: "Segment Width" })
            .exposeProperty("seed", "number", this.seed, { label: "Random Seed" })
            .endGroup()
            .startGroup("Parallax", false)
            .exposeProperty("parallaxStrength", "number", this.parallaxStrength, { label: "Parallax Strength" })
            .endGroup()
            .startGroup("Water", false)
            .exposeProperty("waterHeight", "number", this.waterHeight, { label: "Water Height" })
            .exposeProperty("waterColor", "color", this.waterColor, { label: "Water Color" })
            .exposeProperty("waterAlpha", "number", this.waterAlpha, { label: "Water Alpha" })
            .exposeProperty("waveIntensity", "number", this.waveIntensity, { label: "Wave Intensity" })
            .exposeProperty("waveSpeed", "number", this.waveSpeed, { label: "Wave Speed" })
            .exposeProperty("waveLayers", "number", this.waveLayers, { label: "Wave Layers" })
            .endGroup()
            .startGroup("Clouds", false)
            .exposeProperty("maxClouds", "number", this.maxClouds, { label: "Max Clouds" })
            .exposeProperty("cloudSpeed", "number", this.cloudSpeed, { label: "Cloud Speed" })
            .exposeProperty("windDirection", "number", this.windDirection, { label: "Wind Direction" })
            .exposeProperty("cloudSeed", "number", this.cloudSeed, { label: "Cloud Seed" })
            .endGroup();
    }

    // Simple seeded random number generator
    seededRandom(seed) {
        let x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    // Generate random number between min and max using seed
    randomRange(min, max, seed) {
        return min + (max - min) * this.seededRandom(seed);
    }

    // Convert hex color to RGB values
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    // Darken color by percentage
    darkenColor(hex, percent) {
        const rgb = this.hexToRgb(hex);
        const factor = 1 - percent;
        return `rgb(${Math.floor(rgb.r * factor)}, ${Math.floor(rgb.g * factor)}, ${Math.floor(rgb.b * factor)})`;
    }

    // Interpolate between two colors
    interpolateColor(color1, color2, t) {
        const rgb1 = this.hexToRgb(color1);
        const rgb2 = this.hexToRgb(color2);

        const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * t);
        const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * t);
        const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * t);

        return `rgb(${r}, ${g}, ${b})`;
    }

    // Generate star positions
    generateStars() {
        this.starPositions = [];
        for (let i = 0; i < this.starCount; i++) {
            const seed = this.starSeed + i * 1000;
            this.starPositions.push({
                x: this.randomRange(-2000, 2000, seed),
                y: this.randomRange(0, this.imageHeight * 0.8, seed + 1),
                size: this.randomRange(1, this.maxStarSize, seed + 2),
                twinklePhase: this.randomRange(0, Math.PI * 2, seed + 3)
            });
        }
    }

    start() {
        // Initialize time and celestial bodies
        this.currentTime = this.currentHour / 24;
        this.lastDay = this.getDay();
        this.hillCache.clear();
        this.generateStars();
        this.resetClouds();
    }

    loop(deltaTime) {
        this.updateTime(deltaTime);
        this.updateClouds(deltaTime);
    }

    // Update time progression
    updateTime(deltaTime) {
        if (this.enableDayNightCycle) {
            this.currentTime += (deltaTime / 1000) * (this.timeScale / 24);
            if (this.currentTime > 1) this.currentTime -= 1;
            if (this.currentTime < 0) this.currentTime += 1;
            this.currentHour = this.currentTime * 24;
        }

        // --- Advance moon phase only when moon disappears ---
        const moonVisible = this.isMoonVisible();
        if (this.moonWasVisible && !moonVisible) {
            // Moon just disappeared, advance phase
            this.moonPhase += 1 / 30;
            if (this.moonPhase > 1) this.moonPhase -= 1;
        }
        this.moonWasVisible = moonVisible;
    }

    // Get current sky color based on time
    getCurrentSkyColor() {
        // Create smooth transitions for day/night
        let dayStrength;
        if (this.currentTime < 0.25) {
            // Night to dawn
            dayStrength = 0;
        } else if (this.currentTime < 0.35) {
            // Dawn transition
            dayStrength = (this.currentTime - 0.25) / 0.1;
        } else if (this.currentTime < 0.65) {
            // Day
            dayStrength = 1;
        } else if (this.currentTime < 0.75) {
            // Dusk transition
            dayStrength = 1 - (this.currentTime - 0.65) / 0.1;
        } else {
            // Night
            dayStrength = 0;
        }

        return this.interpolateColor(this.nightColor, this.dayColor, dayStrength);
    }

    // Get celestial body position (sun/moon)
    getCelestialPosition(time, viewportBounds, isMoon = false) {
        // Sun: visible from 5:00 (0.208) to 19:00 (0.792)
        // Moon: visible from 19:00 to 5:00
        const viewportWidth = viewportBounds.right - viewportBounds.left;
        const viewportHeight = viewportBounds.bottom - viewportBounds.top;

        // Arc settings: arc above the viewport, with extra width for off-screen entry/exit
        const arcRadius = viewportWidth * 0.6; // wider arc for off-screen
        const arcHeight = viewportHeight * 0.45; // higher arc
        const centerX = viewportBounds.left + viewportWidth / 2;
        const centerY = viewportBounds.top + arcHeight + 30; // 30px below the top

        // Sun time window (start before left edge, end after right edge)
        const sunRise = -0.08; // before 0 (off-screen left)
        const sunSet = 1.08;   // after 1 (off-screen right)

        // Moon time window (opposite)
        const moonRise = 0.5 - 0.08;
        const moonSet = 1.5 + 0.08;

        let angle;
        if (!isMoon) {
            // t: 0 = left off-screen, 1 = right off-screen
            let t = (time - sunRise) / (sunSet - sunRise);
            t = Math.max(0, Math.min(1, t));
            // Arc from left (sunrise, off-screen) to right (sunset, off-screen), top at t=0.5
            angle = Math.PI - Math.PI * t; // 180deg (left) to 0deg (right), arc upward
        } else {
            // Moon follows opposite arc, lags behind sun
            let moonTime = time;
            if (moonTime < moonRise) moonTime += 1; // wrap
            let t = (moonTime - moonRise) / (moonSet - moonRise);
            t = Math.max(0, Math.min(1, t));
            angle = Math.PI - Math.PI * t;
        }

        return {
            x: centerX + Math.cos(angle) * arcRadius,
            y: centerY - Math.sin(angle) * arcHeight // arc upward
        };
    }

    // Eclipse detection and sky blending
    getEclipseDarkness(sunPos, moonPos) {
        // If moon center is within sun radius, eclipse occurs
        const dx = sunPos.x - moonPos.x;
        const dy = sunPos.y - moonPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const overlap = Math.max(0, this.sunSize - dist);
        if (overlap > 0) {
            // Full overlap = 1, partial = 0..1
            return Math.min(1, overlap / this.sunSize);
        }
        return 0;
    }

    // Draw sun
    drawSun(ctx, position, opacity) {
        if (opacity <= 0) return;

        ctx.save();
        ctx.globalAlpha = opacity;

        // Sun glow
        const glowGradient = ctx.createRadialGradient(
            position.x, position.y, 0,
            position.x, position.y, this.sunGlowSize
        );
        glowGradient.addColorStop(0, this.sunGlowColor + "80");
        glowGradient.addColorStop(0.5, this.sunGlowColor + "40");
        glowGradient.addColorStop(1, this.sunGlowColor + "00");

        ctx.fillStyle = glowGradient;
        ctx.fillRect(
            position.x - this.sunGlowSize,
            position.y - this.sunGlowSize,
            this.sunGlowSize * 2,
            this.sunGlowSize * 2
        );

        // Sun body
        ctx.fillStyle = this.sunColor;
        ctx.beginPath();
        ctx.arc(position.x, position.y, this.sunSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // Draw moon with phases
    drawMoon(ctx, position, opacity) {
        if (opacity <= 0) return;

        // --- Offscreen canvas for masking ---
        const size = this.moonSize * 2 + 4;
        const offCanvas = document.createElement("canvas");
        offCanvas.width = size;
        offCanvas.height = size;
        const offCtx = offCanvas.getContext("2d");

        // Draw full moon
        offCtx.save();
        offCtx.globalAlpha = opacity;
        offCtx.fillStyle = this.moonColor;
        offCtx.beginPath();
        offCtx.arc(size / 2, size / 2, this.moonSize, 0, Math.PI * 2);
        offCtx.fill();

        // Draw craters
        const craterColor = "#e0dcc0";
        const craters = [
            { dx: -this.moonSize * 0.35, dy: -this.moonSize * 0.2, r: this.moonSize * 0.18 },
            { dx: this.moonSize * 0.2, dy: this.moonSize * 0.1, r: this.moonSize * 0.12 },
            { dx: -this.moonSize * 0.1, dy: this.moonSize * 0.3, r: this.moonSize * 0.09 },
            { dx: this.moonSize * 0.28, dy: -this.moonSize * 0.22, r: this.moonSize * 0.07 }
        ];
        offCtx.save();
        offCtx.globalAlpha = 0.25 * opacity;
        offCtx.fillStyle = craterColor;
        for (const c of craters) {
            offCtx.beginPath();
            offCtx.arc(size / 2 + c.dx, size / 2 + c.dy, c.r, 0, Math.PI * 2);
            offCtx.fill();
        }
        offCtx.restore();

        // --- Moon phase effect ---
        if (this.moonPhase !== 0.5) {
            offCtx.save();
            offCtx.globalCompositeOperation = "source-atop";
            offCtx.beginPath();
            const phase = this.moonPhase;
            const p = Math.max(0, Math.min(1, phase));
            const shadowOffset = (p - 0.5) * this.moonSize * 2.1;
            offCtx.arc(size / 2 - shadowOffset, size / 2, this.moonSize, 0, Math.PI * 2);
            offCtx.fillStyle = this.getCurrentSkyColor();
            offCtx.fill();
            offCtx.restore();

            // Optional: soften the edge
            offCtx.save();
            offCtx.globalCompositeOperation = "lighter";
            offCtx.globalAlpha = 0.10 * opacity;
            offCtx.fillStyle = this.getCurrentSkyColor();
            offCtx.beginPath();
            offCtx.arc(size / 2 - shadowOffset, size / 2, this.moonSize * 0.98, 0, Math.PI * 2);
            offCtx.fill();
            offCtx.restore();
        }
        offCtx.restore();

        // --- Mask to moon circle ---
        const maskedCanvas = document.createElement("canvas");
        maskedCanvas.width = size;
        maskedCanvas.height = size;
        const maskedCtx = maskedCanvas.getContext("2d");
        maskedCtx.save();
        maskedCtx.beginPath();
        maskedCtx.arc(size / 2, size / 2, this.moonSize, 0, Math.PI * 2);
        maskedCtx.closePath();
        maskedCtx.clip();
        maskedCtx.drawImage(offCanvas, 0, 0);
        maskedCtx.restore();

        // --- Draw to main context ---
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.drawImage(maskedCanvas, position.x - size / 2, position.y - size / 2);
        ctx.restore();
    }

    // Draw stars
    drawStars(ctx, viewportBounds, time, opacity) {
        if (opacity <= 0 || this.starPositions.length === 0) return;

        ctx.save();
        const viewportX = window.engine.viewport.x || 0;
        const viewportY = window.engine.viewport.y || 0;

        // Stars have minimal parallax
        const starParallax = 0.1;
        const parallaxOffsetX = viewportX * (1 - starParallax);
        const parallaxOffsetY = viewportY * (1 - starParallax);

        for (const star of this.starPositions) {
            const starX = star.x + parallaxOffsetX;
            const starY = star.y + parallaxOffsetY;

            // Only draw stars visible in viewport
            if (starX < viewportBounds.left - 50 || starX > viewportBounds.right + 50 ||
                starY < viewportBounds.top - 50 || starY > viewportBounds.bottom + 50) {
                continue;
            }

            // Twinkling effect
            const twinkle = Math.sin(time * this.starTwinkleSpeed + star.twinklePhase) * 0.3 + 0.7;
            const starOpacity = opacity * twinkle;

            ctx.globalAlpha = starOpacity;
            ctx.fillStyle = "#FFFFFF";
            ctx.beginPath();
            ctx.arc(starX, starY, star.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    // Clear the hill cache when properties change
    clearCache() {
        this.hillCache.clear();
    }

    // Generate height at a specific global x position for seamless tiling
    getHeightAtPosition(globalX, layer) {
        const heightVariance = (this.maxHeight - this.minHeight) * this.imageHeight;
        const baseHeight = this.minHeight * this.imageHeight;

        // Use a continuous noise-like function based on global position
        const frequency = 0.005; // Controls hill frequency
        const seedValue = this.seed + layer * 1000;
        const noiseInput = globalX * frequency + seedValue;

        // Create smooth transitions using sine waves with different frequencies
        const noise1 = Math.sin(noiseInput) * 0.5;
        const noise2 = Math.sin(noiseInput * 2.3 + seedValue) * 0.3;
        const noise3 = Math.sin(noiseInput * 0.7 + seedValue * 2) * 0.2;
        const combinedNoise = (noise1 + noise2 + noise3) * 0.5 + 0.5; // Normalize to 0-1

        return this.imageHeight - (baseHeight + combinedNoise * heightVariance);
    }

    // Generate control points for a hill segment with seamless connections
    generateHillPoints(segmentIndex, layer) {
        const points = [];
        const segmentStartX = segmentIndex * this.segmentWidth;

        // Generate points across the segment width
        for (let i = 0; i <= this.pointCount; i++) {
            const localX = (i / this.pointCount) * this.segmentWidth;
            const globalX = segmentStartX + localX;
            const y = this.getHeightAtPosition(globalX, layer);
            points.push({ x: localX, y: y });
        }

        return points;
    }

    // Get or generate hill segment for a specific layer and segment index
    getHillSegment(segmentIndex, layer) {
        const cacheKey = `${segmentIndex}_${layer}`;

        if (!this.hillCache.has(cacheKey)) {
            const points = this.generateHillPoints(segmentIndex, layer);
            this.hillCache.set(cacheKey, points);
        }

        return this.hillCache.get(cacheKey);
    }

    // Draw spline curve through points with seamless segment connections
    drawConnectedSegments(ctx, segments, style, offsetX, offsetY, viewportBounds) {
        if (segments.length === 0) return;

        ctx.beginPath();

        let allPoints = [];

        // Combine all segment points into one continuous path
        for (let segIdx = 0; segIdx < segments.length; segIdx++) {
            const segment = segments[segIdx];
            const segmentOffsetX = segment.segmentIndex * this.segmentWidth;

            for (let i = 0; i < segment.points.length; i++) {
                // Skip the first point of subsequent segments to avoid duplicates
                if (segIdx > 0 && i === 0) continue;

                const point = segment.points[i];
                allPoints.push({
                    x: point.x + segmentOffsetX + offsetX,
                    y: point.y + offsetY
                });
            }
        }

        if (allPoints.length < 2) return;

        // Start the path
        ctx.moveTo(allPoints[0].x, allPoints[0].y);

        if (style === "rounded") {
            // Use quadratic curves for smooth hills
            for (let i = 1; i < allPoints.length - 1; i++) {
                const curr = allPoints[i];
                const next = allPoints[i + 1];
                const mx = (curr.x + next.x) / 2;
                const my = (curr.y + next.y) / 2;
                ctx.quadraticCurveTo(curr.x, curr.y, mx, my);
            }
            // Last segment
            const last = allPoints[allPoints.length - 1];
            ctx.quadraticCurveTo(last.x, last.y, last.x, last.y);
        } else {
            // Pointy/angular hills
            for (let i = 1; i < allPoints.length; i++) {
                ctx.lineTo(allPoints[i].x, allPoints[i].y);
            }
        }

        // Close the shape to bottom of viewport
        const lastPoint = allPoints[allPoints.length - 1];
        const firstPoint = allPoints[0];
        const viewportBottom = viewportBounds.bottom;

        ctx.lineTo(lastPoint.x, viewportBottom);
        ctx.lineTo(firstPoint.x, viewportBottom);
        ctx.closePath();
        ctx.fill();
    }

    // Calculate viewport bounds using scene viewport
    getViewportBounds() {
        const viewportX = window.engine.viewport.x || 0;
        const viewportY = window.engine.viewport.y || 0;
        const viewportWidth = window.engine.viewport.width || 800;
        const viewportHeight = window.engine.viewport.height || 600;

        return {
            left: viewportX,
            right: viewportX + viewportWidth,
            top: viewportY,
            bottom: viewportY + viewportHeight
        };
    }

    draw(ctx) {
        const viewportBounds = this.getViewportBounds();
        const viewportX = window.engine.viewport.x || 0;
        const viewportY = window.engine.viewport.y || 0;

        // --- Draw background sky with day/night color ---
        ctx.fillStyle = this.getCurrentSkyColor();
        ctx.fillRect(viewportBounds.left - 64, viewportBounds.top - 64,
            viewportBounds.right - viewportBounds.left + 256,
            viewportBounds.bottom - viewportBounds.top + 64);

        // --- Sun & Moon positions ---
        const sunPos = this.getCelestialPosition(this.currentTime, viewportBounds, false);
        const moonPos = this.getCelestialPosition(this.currentTime, viewportBounds, true);

        // --- Eclipse logic ---
        const eclipseDarkness = this.getEclipseDarkness(sunPos, moonPos);
        this.eclipseDarkness = eclipseDarkness;

        // --- Sky color blending ---
        let skyColor = this.getCurrentSkyColor();
        if (eclipseDarkness > 0) {
            // Blend to night color during eclipse
            skyColor = this.interpolateColor(skyColor, this.nightColor, eclipseDarkness);
        }

        // --- Draw background sky ---
        ctx.fillStyle = skyColor;
        ctx.fillRect(viewportBounds.left - 64, viewportBounds.top - 64,
            viewportBounds.right - viewportBounds.left + 256,
            viewportBounds.bottom - viewportBounds.top + 64);

        // --- Draw stars (fade in/out at night or during eclipse) ---
        let nightStrength = 1;
        if (this.currentTime < 0.25) nightStrength = 1;
        else if (this.currentTime < 0.35) nightStrength = 1 - (this.currentTime - 0.25) / 0.1;
        else if (this.currentTime < 0.65) nightStrength = 0;
        else if (this.currentTime < 0.75) nightStrength = (this.currentTime - 0.65) / 0.1;
        else nightStrength = 1;
        // During eclipse, stars fade in
        nightStrength = Math.max(nightStrength, eclipseDarkness);
        this.drawStars(ctx, viewportBounds, (window.engine?.time || performance.now()) * 0.001, nightStrength);

        // --- Draw sun and moon (moon after sun, so it's in front) ---
        // Sun opacity: 1 at day, 0 at night, fade during eclipse
        let sunOpacity = 1 - nightStrength;
        if (eclipseDarkness > 0) sunOpacity *= (1 - eclipseDarkness * 0.9); // fade sun during eclipse

        // Moon opacity: 1 at night, 0 at day, always visible during eclipse
        let moonOpacity = nightStrength;
        if (eclipseDarkness > 0) moonOpacity = Math.max(moonOpacity, eclipseDarkness);

        this.drawSun(ctx, sunPos, sunOpacity);
        this.drawMoon(ctx, moonPos, moonOpacity);

        // --- Draw clouds ---
        this.drawClouds(ctx, viewportBounds);

        // Generate hill layers from back to front
        for (let layer = this.hillLayers - 1; layer >= 0; layer--) {
            const darkenPercent = (layer / (this.hillLayers - 1)) * 0.4;
            const layerColor = this.darkenColor(this.hillColor, darkenPercent);
            ctx.fillStyle = layerColor;

            // Calculate parallax offset for this layer (X and Y)
            let layerRatio = 1;
            if (this.hillLayers > 1) {
                layerRatio = layer / (this.hillLayers - 1);
            }
            const parallaxAmount = this.parallaxStrength * layerRatio;
            const parallaxOffsetX = viewportX * parallaxAmount;
            const parallaxOffsetY = viewportY * parallaxAmount;

            // Calculate which segments are visible for this layer
            const effectiveViewportLeft = viewportBounds.left - parallaxOffsetX;
            const effectiveViewportRight = viewportBounds.right - parallaxOffsetX;

            const startSegment = Math.floor(effectiveViewportLeft / this.segmentWidth);
            const endSegment = Math.ceil(effectiveViewportRight / this.segmentWidth);

            // Collect all visible segments for this layer
            const segments = [];
            for (let segmentIndex = startSegment; segmentIndex <= endSegment; segmentIndex++) {
                const points = this.getHillSegment(segmentIndex, layer);
                segments.push({
                    segmentIndex: segmentIndex,
                    points: points
                });
            }

            // Draw all segments as one connected path
            // Remove the old layerOffsetY, use parallaxOffsetY instead
            this.drawConnectedSegments(
                ctx,
                segments,
                this.hillStyle,
                parallaxOffsetX,
                parallaxOffsetY,
                viewportBounds
            );
        }

        // Draw water after hills
        const time = (window.engine?.time || performance.now()) * 0.001;
        this.drawWater(ctx, viewportBounds, time);

        // --- Draw GUI overlays ---
        const guiCtx = window.engine?.getGuiCanvas();
        if (guiCtx) {
            // Optionally clear the GUI canvas (if you want to fully control it)
            // guiCtx.clearRect(0, 0, window.engine.guiCanvas.width, window.engine.guiCanvas.height);

            guiCtx.save();
            guiCtx.fillStyle = "#FFFFFF";
            guiCtx.font = "16px Arial";
            guiCtx.fillText(`Time: ${this.currentHour.toFixed(2)}h`, 10, 20);
            guiCtx.fillText(`Eclipse: ${this.eclipseDarkness.toFixed(2)}`, 10, 40);
            guiCtx.restore();
        }
    }

    // Draw waving water at the bottom of the viewport
    drawWater(ctx, viewportBounds, time) {
        const { left, right, bottom } = viewportBounds;
        const width = right - left;
        const parallaxFactor = 0.7;
        const viewportX = window.engine.viewport.x || 0;
        const viewportY = window.engine.viewport.y || 0;

        // Water surface at fixed world Y position (relative to world, not viewport)
        const worldHeight = window.engine.worldHeight || 1000;
        const worldWaterY = worldHeight - this.waterHeight;
        const baseY = worldWaterY - viewportY;

        ctx.save();

        // Each wave layer as a separate filled path
        for (let l = 0; l < this.waveLayers; l++) {
            ctx.beginPath();
            ctx.moveTo(left, bottom + 1000); // Start far below the screen for infinite depth

            // Wave parameters per layer
            const freq = 1.5 + l * 0.7;
            const amp = this.waveIntensity * (1 - l / (this.waveLayers + 1));
            const speed = this.waveSpeed * (1 + l * 0.3);
            const phase = time * speed + l * Math.PI / 2;
            const pulseSpeed = 0.7 + l * 0.5;
            const pulsePhase = l * Math.PI / 3;
            const pulse = Math.sin(time * pulseSpeed + pulsePhase) * (this.waveIntensity * 0.25);

            const points = 64;
            for (let i = 0; i <= points; i++) {
                const t = i / points;
                // x always sticks to viewport edge
                const x = left + t * width;
                // Only the wave shape gets parallax
                const parallaxOffsetX = viewportX * (1 - parallaxFactor);
                const waveX = x + parallaxOffsetX;
                const y = baseY + pulse + Math.sin(t * freq * Math.PI * 2 + phase) * amp;
                ctx.lineTo(x, y);
            }

            ctx.lineTo(right, bottom + 1000); // End far below the screen for infinite depth
            ctx.closePath();

            ctx.globalAlpha = this.waterAlpha / this.waveLayers;
            ctx.fillStyle = this.waterColor;
            ctx.fill();
        }

        ctx.restore();
    }

    drawGizmos(ctx) {
        const viewportBounds = this.getViewportBounds();

        // Draw viewport bounds for debugging
        ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
        ctx.strokeRect(viewportBounds.left, viewportBounds.top,
            viewportBounds.right - viewportBounds.left,
            viewportBounds.bottom - viewportBounds.top);

        // Draw segment boundaries
        ctx.strokeStyle = "rgba(0, 255, 0, 0.3)";
        const startSegment = Math.floor(viewportBounds.left / this.segmentWidth);
        const endSegment = Math.ceil(viewportBounds.right / this.segmentWidth);

        for (let i = startSegment; i <= endSegment + 1; i++) {
            const x = i * this.segmentWidth;
            ctx.beginPath();
            ctx.moveTo(x, viewportBounds.top);
            ctx.lineTo(x, viewportBounds.bottom);
            ctx.stroke();
        }
    }

    resetClouds() {
        this.clouds = [];
        for (let i = 0; i < this.maxClouds; i++) {
            this.clouds.push(this.spawnCloud(i));
        }
    }

    spawnCloud(idx = 0) {
        const viewport = this.getViewportBounds();
        const rngSeed = this.cloudSeed + idx * 1000;
        const type = this.cloudTypes[Math.floor(this.seededRandom(rngSeed) * this.cloudTypes.length)];
        // Y: anywhere in the top half of the viewport
        const y = viewport.top + this.seededRandom(rngSeed + 1) * ((viewport.bottom - viewport.top) / 2);
        // X: spawn just off the left or right, depending on wind
        if (this.windDirection >= 0) {
            // Wind right: spawn off left
            const x = viewport.left - type.w - this.seededRandom(rngSeed + 2) * 200;
            return {
                x, y,
                w: type.w,
                h: type.h,
                alpha: type.alpha,
                speed: this.cloudSpeed * (0.7 + this.seededRandom(rngSeed + 3) * 0.6),
                typeIdx: this.cloudTypes.indexOf(type)
            };
        } else {
            // Wind left: spawn off right
            const x = viewport.right + type.w + this.seededRandom(rngSeed + 2) * 200;
            return {
                x, y,
                w: type.w,
                h: type.h,
                alpha: type.alpha,
                speed: this.cloudSpeed * (0.7 + this.seededRandom(rngSeed + 3) * 0.6),
                typeIdx: this.cloudTypes.indexOf(type)
            };
        }
    }

    updateClouds(deltaTime) {
        const viewport = this.getViewportBounds();
        for (let i = 0; i < this.clouds.length; i++) {
            const c = this.clouds[i];
            c.x += this.windDirection * c.speed * (deltaTime / 1000);
            // Remove if out of screen, then respawn on opposite side
            if ((this.windDirection > 0 && c.x > viewport.right + c.w) ||
                (this.windDirection < 0 && c.x < viewport.left - c.w)) {
                this.clouds[i] = this.spawnCloud(i);
            }
        }
    }

    drawClouds(ctx, viewport) {
        for (const c of this.clouds) {
            ctx.save();
            ctx.globalAlpha = c.alpha;
            ctx.fillStyle = "#fff";
            // Simple cloud shape: 3 ellipses
            ctx.beginPath();
            ctx.ellipse(c.x, c.y, c.w * 0.5, c.h * 0.5, 0, 0, Math.PI * 2);
            ctx.ellipse(c.x + c.w * 0.25, c.y + c.h * 0.1, c.w * 0.3, c.h * 0.3, 0, 0, Math.PI * 2);
            ctx.ellipse(c.x - c.w * 0.2, c.y + c.h * 0.15, c.w * 0.25, c.h * 0.25, 0, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    // --- Time and Day API ---
    getTime() {
        return this.currentTime;
    }
    setTime(t) {
        this.currentTime = Math.max(0, Math.min(1, t));
        this.currentHour = this.currentTime * 24;
    }
    getHour() {
        return this.currentHour;
    }
    setHour(h) {
        this.currentHour = Math.max(0, Math.min(24, h));
        this.currentTime = (this.currentHour % 24) / 24;
    }
    // Returns the current day (1-based)
    getDay() {
        // 1 day = 1/30 of a month
        const totalDays = Math.floor(this.currentTime * 360); // 12 months * 30 days
        return (totalDays % 30) + 1;
    }
    // Returns the current month (1-based)
    getMonth() {
        const totalDays = Math.floor(this.currentTime * 360);
        return (Math.floor(totalDays / 30) % 12) + 1;
    }
    // Returns the current year (1-based, starts at 1)
    getYear() {
        const totalDays = Math.floor(this.currentTime * 360);
        return Math.floor(totalDays / 360) + 1;
    }
    // Returns a tidy string like "Year 1, Month 2, Day 15"
    getDateString() {
        return `Year ${this.getYear()}, Month ${this.getMonth()}, Day ${this.getDay()}`;
    }
    getMoonPhase() {
        return this.moonPhase;
    }
    setMoonPhase(phase) {
        this.moonPhase = Math.max(0, Math.min(1, phase));
    }

    // Returns true if the moon is visible at the current time
    isMoonVisible() {
        // Moon: visible from 19:00 (0.792) to 5:00 (0.208)
        // But time wraps around, so visible if time > 0.792 or time < 0.208
        return (this.currentTime > 0.792 || this.currentTime < 0.208);
    }

    // Regenerate hills when properties change
    onPropertyChanged(propertyName) {
        this.clearCache();
    }

    toJSON() {
        const json = super.toJSON();
        json.backgroundColor = this.backgroundColor;
        json.hillColor = this.hillColor;
        json.hillLayers = this.hillLayers;
        json.pointCount = this.pointCount;
        json.hillStyle = this.hillStyle;
        json.minHeight = this.minHeight;
        json.maxHeight = this.maxHeight;
        json.seed = this.seed;
        json.imageHeight = this.imageHeight;
        json.parallaxStrength = this.parallaxStrength;
        json.segmentWidth = this.segmentWidth;
        json.waterHeight = this.waterHeight;
        json.waterColor = this.waterColor;
        json.waterAlpha = this.waterAlpha;
        json.waveIntensity = this.waveIntensity;
        json.waveSpeed = this.waveSpeed;
        json.waveLayers = this.waveLayers;
        return json;
    }

    fromJSON(json) {
        super.fromJSON(json);
        if (json.backgroundColor !== undefined) this.backgroundColor = json.backgroundColor;
        if (json.hillColor !== undefined) this.hillColor = json.hillColor;
        if (json.hillLayers !== undefined) this.hillLayers = json.hillLayers;
        if (json.pointCount !== undefined) this.pointCount = json.pointCount;
        if (json.hillStyle !== undefined) this.hillStyle = json.hillStyle;
        if (json.minHeight !== undefined) this.minHeight = json.minHeight;
        if (json.maxHeight !== undefined) this.maxHeight = json.maxHeight;
        if (json.seed !== undefined) this.seed = json.seed;
        if (json.imageHeight !== undefined) this.imageHeight = json.imageHeight;
        if (json.parallaxStrength !== undefined) this.parallaxStrength = json.parallaxStrength;
        if (json.segmentWidth !== undefined) this.segmentWidth = json.segmentWidth;
        if (json.waterHeight !== undefined) this.waterHeight = json.waterHeight;
        if (json.waterColor !== undefined) this.waterColor = json.waterColor;
        if (json.waterAlpha !== undefined) this.waterAlpha = json.waterAlpha;
        if (json.waveIntensity !== undefined) this.waveIntensity = json.waveIntensity;
        if (json.waveSpeed !== undefined) this.waveSpeed = json.waveSpeed;
        if (json.waveLayers !== undefined) this.waveLayers = json.waveLayers;
        this.clearCache();
    }
}

window.DrawPlatformerHills = DrawPlatformerHills;
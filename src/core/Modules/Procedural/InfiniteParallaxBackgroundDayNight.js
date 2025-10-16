class InfiniteParallaxBackgroundDayNight extends Module {
    static namespace = "Visual";
    static description = "Infinite scrolling parallax mountain/hill background with day-night cycle.";
    static allowMultiple = false;
    static iconClass = "fas fa-mountain";
    static color = "#6B8E23";

    constructor() {
        super("InfiniteParallaxBackgroundDayNight");

        // Layer configuration
        this.layerCount = 5;
        this.hillsPerLayer = 8;
        this.seed = 12345;

        // Day colors
        this.daySkyColor = "#87CEEB";
        this.dayHorizonColor = "#E0F6FF";
        this.dayNearColor = "#2D5016";
        this.dayFarColor = "#A0B0C0";

        // Night colors
        this.nightSkyColor = "#0a1628";
        this.nightHorizonColor = "#1a2744";
        this.nightNearColor = "#0d1f0b";
        this.nightFarColor = "#2a3a4a";

        // Sunset/Sunrise colors
        this.sunsetSkyColor = "#FF6B35";
        this.sunsetHorizonColor = "#FFA07A";

        // Current interpolated colors
        this.skyColor = this.daySkyColor;
        this.horizonColor = this.dayHorizonColor;
        this.nearColor = this.dayNearColor;
        this.farColor = this.dayFarColor;

        // Parallax and terrain
        this.parallaxStrength = 0.7;
        this.baseHeight = 200;
        this.heightVariation = 150;
        this.smoothness = 0.6;
        this.verticalOffset = 100;

        // Day/Night Cycle
        this.enableDayNightCycle = true;
        this.cycleDuration = 120; // seconds for full day/night cycle
        this.currentTime = 0; // 0-1, where 0=midnight, 0.25=sunrise, 0.5=noon, 0.75=sunset
        this.timeSpeed = 1.0; // multiplier for time progression
        this.startAtTime = 0.3; // start at morning

        // Sun/Moon
        this.sunRadius = 40;
        this.moonRadius = 35;
        this.sunColor = "#FDB813";
        this.sunGlowColor = "#FFE4B5";
        this.moonColor = "#E0E0E0";
        this.moonCraterColor = "#BEBEBE";
        this.celestialArcHeight = 0.9; // how high the arc goes (0-1)
        this.celestialYOffset = 0; // vertical offset for sun/moon path

        // Moon Phases (add after moon properties)
        this.enableMoonPhases = true;
        this.moonPhase = 0; // 0 = new moon, 0.5 = full moon, 1 = new moon again
        this.moonPhaseSpeed = 0.1; // phase progression multiplier
        this.moonShadowColor = "#000000";
        this.moonShadowOpacity = 0.85;

        // Darkness overlay
        this.enableDarknessOverlay = true;
        this.peakDarknessAlpha = 0.7; // maximum darkness at midnight
        this.moonCutthrough = true; // moon cuts through darkness

        // Stars
        this.enableStars = true;
        this.starCount = 100;
        this.starMinBrightness = 0.4;
        this.starMaxBrightness = 1.0;
        this.starTwinkleSpeed = 2.0; // twinkling speed multiplier
        this.starSeed = this.seed + 9999; // separate seed for stars
        this.starsGenerated = false;

        // Advanced settings
        this.noiseScale = 0.003;
        this.hillPointCount = 50;

        // Internal state
        this.layers = [];
        this.stars = [];
        this.initialized = false;

        // Initialize time
        this.currentTime = this.startAtTime;

        this.setupProperties();
    }

    setupProperties() {
        // Terrain Settings
        this.exposeProperty("layerCount", "number", this.layerCount, {
            description: "Number of parallax layers",
            min: 2,
            max: 10,
            step: 1,
            onChange: (val) => {
                this.layerCount = val;
                this.initialized = false;
            }
        });

        this.exposeProperty("hillsPerLayer", "number", this.hillsPerLayer, {
            description: "Hills per layer",
            min: 1,
            max: 20,
            step: 1,
            onChange: (val) => {
                this.hillsPerLayer = val;
                this.initialized = false;
            }
        });

        this.exposeProperty("seed", "number", this.seed, {
            description: "Random seed",
            min: 0,
            max: 100000,
            step: 1,
            onChange: (val) => {
                this.seed = val;
                this.initialized = false;
            }
        });

        // Day/Night Cycle
        this.exposeProperty("enableDayNightCycle", "boolean", this.enableDayNightCycle, {
            description: "Enable day/night cycle",
            onChange: (val) => { this.enableDayNightCycle = val; }
        });

        this.exposeProperty("cycleDuration", "number", this.cycleDuration, {
            description: "Full cycle duration in seconds",
            min: 10,
            max: 600,
            step: 5,
            onChange: (val) => { this.cycleDuration = val; }
        });

        this.exposeProperty("timeSpeed", "number", this.timeSpeed, {
            description: "Time progression speed multiplier",
            min: 0,
            max: 10,
            step: 0.1,
            onChange: (val) => { this.timeSpeed = val; }
        });

        this.exposeProperty("currentTime", "number", this.currentTime, {
            description: "Current time of day (0-1)",
            min: 0,
            max: 1,
            step: 0.01,
            onChange: (val) => { this.currentTime = val; }
        });

        // Stars
        this.exposeProperty("enableStars", "boolean", this.enableStars, {
            description: "Enable stars in the night sky",
            onChange: (val) => { this.enableStars = val; }
        });

        this.exposeProperty("starCount", "number", this.starCount, {
            description: "Number of stars",
            min: 0,
            max: 500,
            step: 10,
            onChange: (val) => {
                this.starCount = val;
                this.initialized = false;
            }
        });

        this.exposeProperty("starMinBrightness", "number", this.starMinBrightness, {
            description: "Minimum star brightness (0-1)",
            min: 0,
            max: 1,
            step: 0.1,
            onChange: (val) => { this.starMinBrightness = val; }
        });

        this.exposeProperty("starMaxBrightness", "number", this.starMaxBrightness, {
            description: "Maximum star brightness (0-1)",
            min: 0,
            max: 1,
            step: 0.1,
            onChange: (val) => { this.starMaxBrightness = val; }
        });

        this.exposeProperty("starTwinkleSpeed", "number", this.starTwinkleSpeed, {
            description: "Twinkling speed multiplier",
            min: 0,
            max: 10,
            step: 0.5,
            onChange: (val) => { this.starTwinkleSpeed = val; }
        });

        // Day Colors
        this.exposeProperty("daySkyColor", "color", this.daySkyColor, {
            description: "Day sky color",
            onChange: (val) => { this.daySkyColor = val; }
        });

        this.exposeProperty("dayHorizonColor", "color", this.dayHorizonColor, {
            description: "Day horizon color",
            onChange: (val) => { this.dayHorizonColor = val; }
        });

        this.exposeProperty("dayNearColor", "color", this.dayNearColor, {
            description: "Day near hills color",
            onChange: (val) => { this.dayNearColor = val; }
        });

        this.exposeProperty("dayFarColor", "color", this.dayFarColor, {
            description: "Day far mountains color",
            onChange: (val) => { this.dayFarColor = val; }
        });

        // Night Colors
        this.exposeProperty("nightSkyColor", "color", this.nightSkyColor, {
            description: "Night sky color",
            onChange: (val) => { this.nightSkyColor = val; }
        });

        this.exposeProperty("nightHorizonColor", "color", this.nightHorizonColor, {
            description: "Night horizon color",
            onChange: (val) => { this.nightHorizonColor = val; }
        });

        this.exposeProperty("nightNearColor", "color", this.nightNearColor, {
            description: "Night near hills color",
            onChange: (val) => { this.nightNearColor = val; }
        });

        this.exposeProperty("nightFarColor", "color", this.nightFarColor, {
            description: "Night far mountains color",
            onChange: (val) => { this.nightFarColor = val; }
        });

        // Sunset Colors
        this.exposeProperty("sunsetSkyColor", "color", this.sunsetSkyColor, {
            description: "Sunset/sunrise sky color",
            onChange: (val) => { this.sunsetSkyColor = val; }
        });

        this.exposeProperty("sunsetHorizonColor", "color", this.sunsetHorizonColor, {
            description: "Sunset/sunrise horizon color",
            onChange: (val) => { this.sunsetHorizonColor = val; }
        });

        // Sun/Moon
        this.exposeProperty("sunRadius", "number", this.sunRadius, {
            description: "Sun radius",
            min: 10,
            max: 100,
            step: 5,
            onChange: (val) => { this.sunRadius = val; }
        });

        this.exposeProperty("moonRadius", "number", this.moonRadius, {
            description: "Moon radius",
            min: 10,
            max: 100,
            step: 5,
            onChange: (val) => { this.moonRadius = val; }
        });

        this.exposeProperty("sunColor", "color", this.sunColor, {
            description: "Sun color",
            onChange: (val) => { this.sunColor = val; }
        });

        this.exposeProperty("moonColor", "color", this.moonColor, {
            description: "Moon color",
            onChange: (val) => { this.moonColor = val; }
        });

        this.exposeProperty("celestialArcHeight", "number", this.celestialArcHeight, {
            description: "Height of sun/moon arc (0-1)",
            min: 0,
            max: 1,
            step: 0.05,
            onChange: (val) => { this.celestialArcHeight = val; }
        });

        this.exposeProperty("celestialYOffset", "number", this.celestialYOffset, {
            description: "Vertical offset for celestial bodies",
            min: -500,
            max: 500,
            step: 10,
            onChange: (val) => { this.celestialYOffset = val; }
        });

        this.exposeProperty("enableMoonPhases", "boolean", this.enableMoonPhases, {
            description: "Enable moon phase transitions",
            onChange: (val) => { this.enableMoonPhases = val; }
        });

        this.exposeProperty("moonPhaseSpeed", "number", this.moonPhaseSpeed, {
            description: "Moon phase progression speed",
            min: 0,
            max: 2,
            step: 0.05,
            onChange: (val) => { this.moonPhaseSpeed = val; }
        });

        this.exposeProperty("moonPhase", "number", this.moonPhase, {
            description: "Current moon phase (0=new, 0.5=full)",
            min: 0,
            max: 1,
            step: 0.01,
            onChange: (val) => { this.moonPhase = val; }
        });

        // Darkness Overlay
        this.exposeProperty("enableDarknessOverlay", "boolean", this.enableDarknessOverlay, {
            description: "Enable darkness overlay at night",
            onChange: (val) => { this.enableDarknessOverlay = val; }
        });

        this.exposeProperty("peakDarknessAlpha", "number", this.peakDarknessAlpha, {
            description: "Maximum darkness opacity (0-1)",
            min: 0,
            max: 1,
            step: 0.05,
            onChange: (val) => { this.peakDarknessAlpha = val; }
        });

        this.exposeProperty("moonCutthrough", "boolean", this.moonCutthrough, {
            description: "Moon cuts through darkness",
            onChange: (val) => { this.moonCutthrough = val; }
        });

        // Terrain properties
        this.exposeProperty("parallaxStrength", "number", this.parallaxStrength, {
            description: "Parallax strength",
            min: 0,
            max: 1,
            step: 0.05,
            onChange: (val) => { this.parallaxStrength = val; }
        });

        this.exposeProperty("baseHeight", "number", this.baseHeight, {
            description: "Base height of terrain",
            min: 0,
            max: 1000,
            step: 1,
            onChange: (val) => {
                this.baseHeight = val;
                this.initialized = false;
            }
        });

        this.exposeProperty("heightVariation", "number", this.heightVariation, {
            description: "Height variation",
            min: 0,
            max: 500,
            step: 1,
            onChange: (val) => {
                this.heightVariation = val;
                this.initialized = false;
            }
        });

        this.exposeProperty("smoothness", "number", this.smoothness, {
            description: "Terrain smoothness",
            min: 0,
            max: 1,
            step: 0.01,
            onChange: (val) => {
                this.smoothness = val;
                this.initialized = false;
            }
        });

        this.exposeProperty("verticalOffset", "number", this.verticalOffset, {
            description: "Vertical offset",
            min: -500,
            max: 500,
            step: 1,
            onChange: (val) => { this.verticalOffset = val; }
        });
    }

    style(style) {
        style.startGroup("Day/Night Cycle", false);

        style.exposeProperty("enableDayNightCycle", "boolean", this.enableDayNightCycle, {
            description: "Enable automatic day/night progression",
            style: { label: "Enable Day/Night Cycle" },
            onChange: (val) => { this.enableDayNightCycle = val; }
        });

        style.exposeProperty("cycleDuration", "number", this.cycleDuration, {
            description: "Duration of full cycle in seconds",
            min: 10,
            max: 600,
            step: 5,
            style: { label: "Cycle Duration (s)", slider: true },
            onChange: (val) => { this.cycleDuration = val; }
        });

        style.exposeProperty("timeSpeed", "number", this.timeSpeed, {
            description: "Speed multiplier for time",
            min: 0,
            max: 10,
            step: 0.1,
            style: { label: "Time Speed", slider: true },
            onChange: (val) => { this.timeSpeed = val; }
        });

        style.exposeProperty("currentTime", "number", this.currentTime, {
            description: "Manual time control (0=midnight, 0.5=noon)",
            min: 0,
            max: 1,
            step: 0.01,
            style: { label: "Current Time", slider: true },
            onChange: (val) => { this.currentTime = val; }
        });

        style.endGroup();

        style.addDivider();

        style.startGroup("Day Colors", false);

        style.exposeProperty("daySkyColor", "color", this.daySkyColor, {
            description: "Sky color during day",
            style: { label: "Day Sky" },
            onChange: (val) => { this.daySkyColor = val; }
        });

        style.exposeProperty("dayHorizonColor", "color", this.dayHorizonColor, {
            description: "Horizon color during day",
            style: { label: "Day Horizon" },
            onChange: (val) => { this.dayHorizonColor = val; }
        });

        style.exposeProperty("dayNearColor", "color", this.dayNearColor, {
            description: "Near hills color during day",
            style: { label: "Day Near Hills" },
            onChange: (val) => { this.dayNearColor = val; }
        });

        style.exposeProperty("dayFarColor", "color", this.dayFarColor, {
            description: "Far mountains color during day",
            style: { label: "Day Far Mountains" },
            onChange: (val) => { this.dayFarColor = val; }
        });

        style.endGroup();

        style.addDivider();

        style.startGroup("Night Colors", false);

        style.exposeProperty("nightSkyColor", "color", this.nightSkyColor, {
            description: "Sky color during night",
            style: { label: "Night Sky" },
            onChange: (val) => { this.nightSkyColor = val; }
        });

        style.exposeProperty("nightHorizonColor", "color", this.nightHorizonColor, {
            description: "Horizon color during night",
            style: { label: "Night Horizon" },
            onChange: (val) => { this.nightHorizonColor = val; }
        });

        style.exposeProperty("nightNearColor", "color", this.nightNearColor, {
            description: "Near hills color during night",
            style: { label: "Night Near Hills" },
            onChange: (val) => { this.nightNearColor = val; }
        });

        style.exposeProperty("nightFarColor", "color", this.nightFarColor, {
            description: "Far mountains color during night",
            style: { label: "Night Far Mountains" },
            onChange: (val) => { this.nightFarColor = val; }
        });

        style.endGroup();

        style.addDivider();

        style.startGroup("Sunset/Sunrise Colors", false);

        style.exposeProperty("sunsetSkyColor", "color", this.sunsetSkyColor, {
            description: "Sky color during sunset/sunrise",
            style: { label: "Sunset Sky" },
            onChange: (val) => { this.sunsetSkyColor = val; }
        });

        style.exposeProperty("sunsetHorizonColor", "color", this.sunsetHorizonColor, {
            description: "Horizon color during sunset/sunrise",
            style: { label: "Sunset Horizon" },
            onChange: (val) => { this.sunsetHorizonColor = val; }
        });

        style.endGroup();

        style.addDivider();

        style.startGroup("Celestial Bodies", false);

        style.exposeProperty("sunRadius", "number", this.sunRadius, {
            description: "Radius of the sun",
            min: 10,
            max: 100,
            step: 5,
            style: { label: "Sun Radius", slider: true },
            onChange: (val) => { this.sunRadius = val; }
        });

        style.exposeProperty("moonRadius", "number", this.moonRadius, {
            description: "Radius of the moon",
            min: 10,
            max: 100,
            step: 5,
            style: { label: "Moon Radius", slider: true },
            onChange: (val) => { this.moonRadius = val; }
        });

        style.exposeProperty("sunColor", "color", this.sunColor, {
            description: "Color of the sun",
            style: { label: "Sun Color" },
            onChange: (val) => { this.sunColor = val; }
        });

        style.exposeProperty("moonColor", "color", this.moonColor, {
            description: "Color of the moon",
            style: { label: "Moon Color" },
            onChange: (val) => { this.moonColor = val; }
        });

        style.exposeProperty("celestialArcHeight", "number", this.celestialArcHeight, {
            description: "Height of sun/moon arc across sky",
            min: 0,
            max: 1,
            step: 0.05,
            style: { label: "Arc Height", slider: true },
            onChange: (val) => { this.celestialArcHeight = val; }
        });

        style.exposeProperty("celestialYOffset", "number", this.celestialYOffset, {
            description: "Vertical position offset",
            min: -500,
            max: 500,
            step: 10,
            style: { label: "Vertical Offset", slider: true },
            onChange: (val) => { this.celestialYOffset = val; }
        });

        style.exposeProperty("enableMoonPhases", "boolean", this.enableMoonPhases, {
            description: "Enable moon phase cycle",
            style: { label: "Enable Moon Phases" },
            onChange: (val) => { this.enableMoonPhases = val; }
        });

        style.exposeProperty("moonPhaseSpeed", "number", this.moonPhaseSpeed, {
            description: "Speed of moon phase transitions",
            min: 0,
            max: 2,
            step: 0.05,
            style: { label: "Phase Speed", slider: true },
            onChange: (val) => { this.moonPhaseSpeed = val; }
        });

        style.exposeProperty("moonPhase", "number", this.moonPhase, {
            description: "Manual moon phase control",
            min: 0,
            max: 1,
            step: 0.01,
            style: { label: "Moon Phase", slider: true },
            onChange: (val) => { this.moonPhase = val; }
        });

        style.endGroup();

        style.addDivider();

        style.startGroup("Stars", false);

        style.exposeProperty("enableStars", "boolean", this.enableStars, {
            description: "Enable stars in the night sky",
            style: { label: "Enable Stars" },
            onChange: (val) => { this.enableStars = val; }
        });

        style.exposeProperty("starCount", "number", this.starCount, {
            description: "Number of stars to display",
            min: 0,
            max: 500,
            step: 10,
            style: { label: "Star Count", slider: true },
            onChange: (val) => {
                this.starCount = val;
                this.initialized = false;
            }
        });

        style.exposeProperty("starMinBrightness", "number", this.starMinBrightness, {
            description: "Minimum brightness of stars",
            min: 0,
            max: 1,
            step: 0.1,
            style: { label: "Min Brightness", slider: true },
            onChange: (val) => { this.starMinBrightness = val; }
        });

        style.exposeProperty("starMaxBrightness", "number", this.starMaxBrightness, {
            description: "Maximum brightness of stars",
            min: 0,
            max: 1,
            step: 0.1,
            style: { label: "Max Brightness", slider: true },
            onChange: (val) => { this.starMaxBrightness = val; }
        });

        style.exposeProperty("starTwinkleSpeed", "number", this.starTwinkleSpeed, {
            description: "Speed of star twinkling",
            min: 0,
            max: 10,
            step: 0.5,
            style: { label: "Twinkle Speed", slider: true },
            onChange: (val) => { this.starTwinkleSpeed = val; }
        });

        style.endGroup();

        style.addDivider();

        style.startGroup("Darkness Overlay", false);

        style.exposeProperty("enableDarknessOverlay", "boolean", this.enableDarknessOverlay, {
            description: "Enable darkness overlay during night",
            style: { label: "Enable Darkness" },
            onChange: (val) => { this.enableDarknessOverlay = val; }
        });

        style.exposeProperty("peakDarknessAlpha", "number", this.peakDarknessAlpha, {
            description: "Maximum darkness opacity at midnight",
            min: 0,
            max: 1,
            step: 0.05,
            style: { label: "Peak Darkness", slider: true },
            onChange: (val) => { this.peakDarknessAlpha = val; }
        });

        style.exposeProperty("moonCutthrough", "boolean", this.moonCutthrough, {
            description: "Moon light cuts through darkness",
            style: { label: "Moon Cutthrough" },
            onChange: (val) => { this.moonCutthrough = val; }
        });

        style.endGroup();

        style.addDivider();

        style.startGroup("Terrain Settings", false);

        style.exposeProperty("layerCount", "number", this.layerCount, {
            description: "Number of parallax layers",
            min: 2,
            max: 10,
            step: 1,
            style: { label: "Layer Count", slider: true },
            onChange: (val) => {
                this.layerCount = val;
                this.initialized = false;
            }
        });

        style.exposeProperty("hillsPerLayer", "number", this.hillsPerLayer, {
            description: "Hills per viewport width",
            min: 2,
            max: 20,
            step: 1,
            style: { label: "Hills Per Layer", slider: true },
            onChange: (val) => {
                this.hillsPerLayer = val;
                this.initialized = false;
            }
        });

        style.exposeProperty("seed", "number", this.seed, {
            description: "Terrain generation seed",
            min: 1,
            max: 99999,
            step: 1,
            style: { label: "Seed" },
            onChange: (val) => {
                this.seed = val;
                this.initialized = false;
            }
        });

        style.exposeProperty("parallaxStrength", "number", this.parallaxStrength, {
            description: "Parallax effect intensity",
            min: 0,
            max: 1,
            step: 0.05,
            style: { label: "Parallax Strength", slider: true },
            onChange: (val) => { this.parallaxStrength = val; }
        });

        style.exposeProperty("baseHeight", "number", this.baseHeight, {
            description: "Base terrain height",
            min: 50,
            max: 500,
            step: 10,
            style: { label: "Base Height", slider: true },
            onChange: (val) => {
                this.baseHeight = val;
                this.initialized = false;
            }
        });

        style.exposeProperty("heightVariation", "number", this.heightVariation, {
            description: "Height randomness",
            min: 0,
            max: 300,
            step: 10,
            style: { label: "Height Variation", slider: true },
            onChange: (val) => {
                this.heightVariation = val;
                this.initialized = false;
            }
        });

        style.exposeProperty("smoothness", "number", this.smoothness, {
            description: "Terrain smoothness",
            min: 0.1,
            max: 1,
            step: 0.05,
            style: { label: "Smoothness", slider: true },
            onChange: (val) => {
                this.smoothness = val;
                this.initialized = false;
            }
        });

        style.exposeProperty("verticalOffset", "number", this.verticalOffset, {
            description: "Vertical position offset",
            min: -300,
            max: 300,
            step: 10,
            style: { label: "Vertical Offset", slider: true },
            onChange: (val) => { this.verticalOffset = val; }
        });

        style.endGroup();

        style.addDivider();
        style.addHelpText("Infinite parallax background with day/night cycle. Use public API methods to sync with other modules.");
    }

    // PUBLIC API METHODS

    /**
     * Get the current moon phase (0-1)
     * 0 = new moon, 0.25 = first quarter, 0.5 = full moon, 0.75 = last quarter
     */
    getMoonPhase() {
        return this.moonPhase;
    }

    /**
     * Set the moon phase (0-1)
     */
    setMoonPhase(phase) {
        this.moonPhase = phase % 1;
    }

    /**
     * Get moon illumination percentage (0-1)
     * 0 = completely dark, 1 = fully illuminated
     */
    getMoonIllumination() {
        // Convert phase to illumination (0.5 = full moon = 1.0 illumination)
        return 1 - Math.abs(this.moonPhase - 0.5) * 2;
    }

    /**
     * Get the current time of day (0-1)
     * 0 = midnight, 0.25 = dawn, 0.5 = noon, 0.75 = dusk, 1 = midnight
     */
    getTime() {
        return this.currentTime;
    }

    /**
     * Get the current time in hours (0-24)
     */
    getTimeInHours() {
        return this.currentTime * 24;
    }

    /**
     * Set the time of day (0-1)
     */
    setTime(time) {
        this.currentTime = time % 1;
    }

    /**
     * Check if it's currently daytime
     */
    isDaytime() {
        return this.currentTime > 0.25 && this.currentTime < 0.75;
    }

    /**
     * Check if it's currently nighttime
     */
    isNighttime() {
        return !this.isDaytime();
    }

    /**
     * Get day/night factor (0 = full night, 1 = full day)
     */
    getDayNightFactor() {
        if (this.currentTime < 0.25) {
            // Night to dawn
            return this.currentTime / 0.25 * 0.5;
        } else if (this.currentTime < 0.5) {
            // Dawn to noon
            return 0.5 + (this.currentTime - 0.25) / 0.25 * 0.5;
        } else if (this.currentTime < 0.75) {
            // Noon to dusk
            return 1 - (this.currentTime - 0.5) / 0.25 * 0.5;
        } else {
            // Dusk to night
            return 0.5 - (this.currentTime - 0.75) / 0.25 * 0.5;
        }
    }

    /**
     * Get the current darkness level (0 = no darkness, 1 = peak darkness)
     */
    getDarknessLevel() {
        const factor = this.getDayNightFactor();
        return (1 - factor) * this.peakDarknessAlpha;
    }

    /**
     * Get time until next sunrise in seconds
     */
    getTimeUntilSunrise() {
        let timeToSunrise;
        if (this.currentTime <= 0.25) {
            timeToSunrise = 0.25 - this.currentTime;
        } else {
            timeToSunrise = 1.25 - this.currentTime;
        }
        return timeToSunrise * this.cycleDuration / this.timeSpeed;
    }

    /**
     * Get time until next sunset in seconds
     */
    getTimeUntilSunset() {
        let timeToSunset;
        if (this.currentTime <= 0.75) {
            timeToSunset = 0.75 - this.currentTime;
        } else {
            timeToSunset = 1.75 - this.currentTime;
        }
        return timeToSunset * this.cycleDuration / this.timeSpeed;
    }

    // Seeded random number generator
    seededRandom(seed) {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    // Perlin-like noise function
    noise(x, seed) {
        const X = Math.floor(x);
        const frac = x - X;

        const v1 = this.seededRandom(X + seed);
        const v2 = this.seededRandom(X + 1 + seed);

        const t = frac * frac * (3 - 2 * frac);
        return v1 * (1 - t) + v2 * t;
    }

    // Generate height at position for a layer
    getHeight(x, layerIndex, layerSeed) {
        let height = 0;
        let amplitude = this.heightVariation;
        let frequency = this.noiseScale * (1 + layerIndex * 0.5);

        for (let i = 0; i < 3; i++) {
            height += this.noise(x * frequency, layerSeed + i * 1000) * amplitude;
            amplitude *= this.smoothness;
            frequency *= 2;
        }

        return height;
    }

    // Generate stars based on seed
    generateStars(viewWidth, viewHeight) {
        this.stars = [];
        for (let i = 0; i < this.starCount; i++) {
            const x = this.seededRandom(this.starSeed + i * 2) * viewWidth;
            const y = this.seededRandom(this.starSeed + i * 2 + 1) * (viewHeight * 0.7); // stars in upper 70% of sky
            const baseBrightness = this.starMinBrightness + this.seededRandom(this.starSeed + i * 3) * (this.starMaxBrightness - this.starMinBrightness);
            this.stars.push({ x, y, baseBrightness, phase: this.seededRandom(this.starSeed + i * 4) * Math.PI * 2 });
        }
    }

    // Initialize layers
    initializeLayers() {
        this.layers = [];

        for (let i = 0; i < this.layerCount; i++) {
            const layerDepth = i / (this.layerCount - 1);
            const parallaxFactor = 1 - (layerDepth * this.parallaxStrength);

            this.layers.push({
                depth: layerDepth,
                parallaxFactor: parallaxFactor,
                seed: this.seed + i * 1234,
                baseHeight: this.baseHeight * (1 + layerDepth * 0.3),
                color: this.nearColor
            });
        }

        this.initialized = true;
    }

    // Update colors based on time of day
    updateColors() {
        const time = this.currentTime;
        let skyStart, skyEnd, horizonStart, horizonEnd, nearStart, nearEnd, farStart, farEnd;

        if (time < 0.2) {
            // Night
            const factor = time / 0.2;
            skyStart = this.nightSkyColor;
            skyEnd = this.nightSkyColor;
            horizonStart = this.nightHorizonColor;
            horizonEnd = this.nightHorizonColor;
            nearStart = this.nightNearColor;
            nearEnd = this.nightNearColor;
            farStart = this.nightFarColor;
            farEnd = this.nightFarColor;
        } else if (time < 0.3) {
            // Dawn
            const factor = (time - 0.2) / 0.1;
            skyStart = this.nightSkyColor;
            skyEnd = this.sunsetSkyColor;
            horizonStart = this.nightHorizonColor;
            horizonEnd = this.sunsetHorizonColor;
            nearStart = this.nightNearColor;
            nearEnd = this.dayNearColor;
            farStart = this.nightFarColor;
            farEnd = this.dayFarColor;
        } else if (time < 0.4) {
            // Sunrise to day
            const factor = (time - 0.3) / 0.1;
            skyStart = this.sunsetSkyColor;
            skyEnd = this.daySkyColor;
            horizonStart = this.sunsetHorizonColor;
            horizonEnd = this.dayHorizonColor;
            nearStart = this.dayNearColor;
            nearEnd = this.dayNearColor;
            farStart = this.dayFarColor;
            farEnd = this.dayFarColor;
        } else if (time < 0.6) {
            // Day
            const factor = (time - 0.4) / 0.2;
            skyStart = this.daySkyColor;
            skyEnd = this.daySkyColor;
            horizonStart = this.dayHorizonColor;
            horizonEnd = this.dayHorizonColor;
            nearStart = this.dayNearColor;
            nearEnd = this.dayNearColor;
            farStart = this.dayFarColor;
            farEnd = this.dayFarColor;
        } else if (time < 0.7) {
            // Day to sunset
            const factor = (time - 0.6) / 0.1;
            skyStart = this.daySkyColor;
            skyEnd = this.sunsetSkyColor;
            horizonStart = this.dayHorizonColor;
            horizonEnd = this.sunsetHorizonColor;
            nearStart = this.dayNearColor;
            nearEnd = this.dayNearColor;
            farStart = this.dayFarColor;
            farEnd = this.dayFarColor;
        } else if (time < 0.8) {
            // Sunset to dusk
            const factor = (time - 0.7) / 0.1;
            skyStart = this.sunsetSkyColor;
            skyEnd = this.nightSkyColor;
            horizonStart = this.sunsetHorizonColor;
            horizonEnd = this.nightHorizonColor;
            nearStart = this.dayNearColor;
            nearEnd = this.nightNearColor;
            farStart = this.dayFarColor;
            farEnd = this.nightFarColor;
        } else {
            // Night
            const factor = (time - 0.8) / 0.2;
            skyStart = this.nightSkyColor;
            skyEnd = this.nightSkyColor;
            horizonStart = this.nightHorizonColor;
            horizonEnd = this.nightHorizonColor;
            nearStart = this.nightNearColor;
            nearEnd = this.nightNearColor;
            farStart = this.nightFarColor;
            farEnd = this.nightFarColor;
        }

        // Calculate blend factor for smooth transitions
        let blendFactor = 0;
        if (time < 0.2) {
            blendFactor = 0;
        } else if (time < 0.3) {
            blendFactor = (time - 0.2) / 0.1;
        } else if (time < 0.4) {
            blendFactor = (time - 0.3) / 0.1;
        } else if (time < 0.6) {
            blendFactor = 1;
        } else if (time < 0.7) {
            blendFactor = (time - 0.6) / 0.1;
        } else if (time < 0.8) {
            blendFactor = (time - 0.7) / 0.1;
        } else {
            blendFactor = 1;
        }

        this.skyColor = this.interpolateColor(skyStart, skyEnd, blendFactor);
        this.horizonColor = this.interpolateColor(horizonStart, horizonEnd, blendFactor);
        this.nearColor = this.interpolateColor(nearStart, nearEnd, blendFactor);
        this.farColor = this.interpolateColor(farStart, farEnd, blendFactor);

        // Update layer colors
        for (let i = 0; i < this.layers.length; i++) {
            const layerDepth = i / (this.layerCount - 1);
            this.layers[i].color = this.interpolateColor(this.nearColor, this.farColor, layerDepth);
        }
    }

    // Interpolate between two hex colors
    interpolateColor(color1, color2, factor) {
        const c1 = this.hexToRgb(color1);
        const c2 = this.hexToRgb(color2);

        const r = Math.round(c1.r + (c2.r - c1.r) * factor);
        const g = Math.round(c1.g + (c2.g - c1.g) * factor);
        const b = Math.round(c1.b + (c2.b - c1.b) * factor);

        // Return as hex string instead of RGB
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    // Calculate celestial body position based on time
    getCelestialPosition(viewWidth, viewHeight) {
        // Time progress for celestial arc (0-1 for sun, 0.5-1.5 for moon shifted by half cycle)
        const sunTime = this.currentTime;
        const moonTime = (this.currentTime + 0.5) % 1;

        // Calculate positions along arc
        const sunX = viewWidth * sunTime;
        const moonX = viewWidth * moonTime;

        // Parabolic arc for height
        const arcHeight = viewHeight * this.celestialArcHeight;
        const sunY = viewHeight - arcHeight * Math.sin(sunTime * Math.PI) + this.celestialYOffset;
        const moonY = viewHeight - arcHeight * Math.sin(moonTime * Math.PI) + this.celestialYOffset;

        return {
            sun: { x: sunX, y: sunY },
            moon: { x: moonX, y: moonY }
        };
    }

    // Draw the sun with glow effect
    drawSun(ctx, x, y) {
        // Glow
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, this.sunRadius * 2);
        gradient.addColorStop(0, this.sunGlowColor);
        gradient.addColorStop(0.3, this.sunColor);
        gradient.addColorStop(0.6, this.sunColor + '80');
        gradient.addColorStop(1, this.sunColor + '00');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, this.sunRadius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Sun body
        ctx.fillStyle = this.sunColor;
        ctx.beginPath();
        ctx.arc(x, y, this.sunRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw procedurally generated moon with craters
    drawMoon(ctx, x, y) {
        // Save context state
        ctx.save();

        // Create clipping region for the moon
        ctx.beginPath();
        ctx.arc(x, y, this.moonRadius, 0, Math.PI * 2);
        ctx.clip();

        // Moon body
        ctx.fillStyle = this.moonColor;
        ctx.beginPath();
        ctx.arc(x, y, this.moonRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw craters procedurally
        ctx.fillStyle = this.moonCraterColor;
        const craterCount = 8;
        for (let i = 0; i < craterCount; i++) {
            const angle = this.seededRandom(i * 100) * Math.PI * 2;
            const distance = this.seededRandom(i * 200) * this.moonRadius * 0.6;
            const craterX = x + Math.cos(angle) * distance;
            const craterY = y + Math.sin(angle) * distance;
            const craterRadius = this.moonRadius * (0.1 + this.seededRandom(i * 300) * 0.15);

            ctx.beginPath();
            ctx.arc(craterX, craterY, craterRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw moon phase shadow if enabled
        if (this.enableMoonPhases) {
            // Calculate shadow position based on phase
            // phase 0 = new moon (fully dark), 0.5 = full moon (no shadow), 1 = new moon
            const shadowOffset = (this.moonPhase - 0.5) * this.moonRadius * 2;

            ctx.fillStyle = `rgba(0, 0, 0, ${this.moonShadowOpacity})`;

            if (this.moonPhase < 0.5) {
                // Waxing: shadow on the left
                ctx.beginPath();
                ctx.arc(x + shadowOffset, y, this.moonRadius, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Waning: shadow on the right
                ctx.beginPath();
                ctx.arc(x + shadowOffset, y, this.moonRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Restore context state (removes clipping)
        ctx.restore();

        // Add subtle glow to moon
        if (this.moonCutthrough && this.isNighttime()) {
            const moonGlow = ctx.createRadialGradient(x, y, this.moonRadius, x, y, this.moonRadius * 3);
            const glowIntensity = this.enableMoonPhases ? this.getMoonIllumination() * 0.1 : 0.1;
            moonGlow.addColorStop(0, `rgba(224, 224, 224, ${glowIntensity})`);
            moonGlow.addColorStop(1, 'rgba(224, 224, 224, 0)');

            ctx.fillStyle = moonGlow;
            ctx.beginPath();
            ctx.arc(x, y, this.moonRadius * 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    start() {
        this.initializeLayers();
    }

    loop(deltaTime) {
        // Update time if cycle is enabled
        if (this.enableDayNightCycle) {
            this.currentTime += (deltaTime / this.cycleDuration) * this.timeSpeed;
            this.currentTime = this.currentTime % 1;
        }

        if (this.enableMoonPhases && this.enableDayNightCycle) {
            const positions = this.getCelestialPosition(
                window.engine.viewport.width,
                window.engine.viewport.height
            );

            // Check if moon just left the screen (wrapped around)
            if (!this.lastMoonX) this.lastMoonX = positions.moon.x;

            const viewWidth = window.engine.viewport.width;
            const moonX = positions.moon.x;

            // Detect moon screen exit (when it wraps from right to left)
            if (this.lastMoonX > viewWidth * 0.9 && moonX < viewWidth * 0.1) {
                this.moonPhase = (this.moonPhase + this.moonPhaseSpeed) % 1;
            }

            this.lastMoonX = moonX;
        }

        // Update colors based on current time
        this.updateColors();

        // Position follows camera
        this.gameObject.position.x = window.engine.viewport.x || 0;
        this.gameObject.position.y = window.engine.viewport.y || 0;
    }

    draw(ctx) {
        if (!this.initialized) {
            this.initializeLayers();
            //const viewport = window.engine.viewport;
            //this.generateStars(viewport.width, viewport.height);
        }

        const viewport = window.engine.viewport;
        const viewWidth = viewport.width;
        const viewHeight = viewport.height;
        const cameraX = viewport.x;
        const cameraY = viewport.y;

        // Generate stars once on first draw
        if (!this.starsGenerated) {
            this.generateStars(viewWidth, viewHeight);
            this.starsGenerated = true;
        }

        // Draw sky gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, viewHeight);
        gradient.addColorStop(0, this.skyColor);
        gradient.addColorStop(1, this.horizonColor);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, viewWidth, viewHeight);

        // Draw stars if enabled and nighttime
        if ((this.enableStars) && this.isNighttime()) {
            this.drawStars(ctx, viewWidth, viewHeight);
        }

        // Draw celestial bodies (behind hills, in front of sky)
        const positions = this.getCelestialPosition(viewWidth, viewHeight);

        // Draw sun during day
        if (this.currentTime > 0.15 && this.currentTime < 0.85) {
            this.drawSun(ctx, positions.sun.x, positions.sun.y);
        }

        // Draw moon during night
        if (this.currentTime < 0.35 || this.currentTime > 0.65) {
            this.drawMoon(ctx, positions.moon.x, positions.moon.y);
        }

        // Draw each layer from back to front
        for (let i = this.layerCount - 1; i >= 0; i--) {
            const layer = this.layers[i];
            this.drawLayer(ctx, layer, cameraX, cameraY, viewWidth, viewHeight);
        }

        // Draw darkness overlay to GUI context
        if (this.enableDarknessOverlay) {
            this.drawDarknessOverlay(positions.moon);
        }
    }

    drawStars(ctx, viewWidth, viewHeight) {
        ctx.fillStyle = 'white';
        const time = Date.now() * 0.001 * this.starTwinkleSpeed; // use real time for twinkling

        for (const star of this.stars) {
            const twinkle = 0.5 + 0.5 * Math.sin(time + star.phase);
            const brightness = star.baseBrightness * twinkle;
            ctx.globalAlpha = brightness;
            ctx.beginPath();
            ctx.arc(star.x, star.y, 2, 0, Math.PI * 2); // Increased radius from 1 to 2
            ctx.fill();
        }
        ctx.globalAlpha = 1; // reset alpha
    }

    drawLayer(ctx, layer, cameraX, cameraY, viewWidth, viewHeight) {
        ctx.fillStyle = layer.color;
        ctx.strokeStyle = layer.color;
        ctx.lineWidth = 2;

        const parallaxX = cameraX * layer.parallaxFactor;
        const hillWidth = viewWidth / this.hillsPerLayer;
        const startX = Math.floor((parallaxX - viewWidth) / hillWidth) * hillWidth;
        const endX = parallaxX + viewWidth * 2;
        const horizonY = viewHeight - layer.baseHeight - this.verticalOffset - (cameraY * layer.parallaxFactor * 0.3);

        ctx.beginPath();

        let firstPoint = true;

        for (let x = startX; x < endX; x += hillWidth / this.hillPointCount) {
            const height = this.getHeight(x, layer.depth, layer.seed);
            const screenX = x - parallaxX;
            const screenY = horizonY - height;

            if (firstPoint) {
                ctx.moveTo(screenX, screenY);
                firstPoint = false;
            } else {
                ctx.lineTo(screenX, screenY);
            }
        }

        ctx.lineTo(endX - parallaxX, viewHeight);
        ctx.lineTo(startX - parallaxX, viewHeight);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();
    }

    drawDarknessOverlay(moonPosition) {
        const guiCtx = this.getGuiCanvas();
        if (!guiCtx) return;

        const viewport = window.engine.viewport;
        const viewWidth = viewport.width;
        const viewHeight = viewport.height;

        // Calculate darkness alpha based on time
        const darknessAlpha = this.getDarknessLevel();

        if (darknessAlpha > 0) {
            // If moon cutthrough is enabled, create a radial gradient around the moon
            if (this.moonCutthrough && (this.currentTime < 0.35 || this.currentTime > 0.65)) {
                // Create darkness with moon cutthrough
                guiCtx.fillStyle = `rgba(0, 10, 30, ${darknessAlpha})`;
                guiCtx.fillRect(0, 0, viewWidth, viewHeight);

                // Cut through darkness with moon glow
                guiCtx.globalCompositeOperation = 'destination-out';
                const moonGlowRadius = this.moonRadius * 8;
                const moonGlow = guiCtx.createRadialGradient(
                    moonPosition.x, moonPosition.y, this.moonRadius * 2,
                    moonPosition.x, moonPosition.y, moonGlowRadius
                );
                moonGlow.addColorStop(0, `rgba(255, 255, 255, ${darknessAlpha})`);
                moonGlow.addColorStop(0.5, `rgba(255, 255, 255, ${darknessAlpha * 0.5})`);
                moonGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');

                guiCtx.fillStyle = moonGlow;
                guiCtx.beginPath();
                guiCtx.arc(moonPosition.x, moonPosition.y, moonGlowRadius, 0, Math.PI * 2);
                guiCtx.fill();

                guiCtx.globalCompositeOperation = 'source-over';
            } else {
                // Simple darkness overlay without cutthrough
                guiCtx.fillStyle = `rgba(0, 10, 30, ${darknessAlpha})`;
                guiCtx.fillRect(0, 0, viewWidth, viewHeight);
            }
        }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            layerCount: this.layerCount,
            hillsPerLayer: this.hillsPerLayer,
            seed: this.seed,
            daySkyColor: this.daySkyColor,
            dayHorizonColor: this.dayHorizonColor,
            dayNearColor: this.dayNearColor,
            dayFarColor: this.dayFarColor,
            nightSkyColor: this.nightSkyColor,
            nightHorizonColor: this.nightHorizonColor,
            nightNearColor: this.nightNearColor,
            nightFarColor: this.nightFarColor,
            sunsetSkyColor: this.sunsetSkyColor,
            sunsetHorizonColor: this.sunsetHorizonColor,
            parallaxStrength: this.parallaxStrength,
            baseHeight: this.baseHeight,
            heightVariation: this.heightVariation,
            smoothness: this.smoothness,
            verticalOffset: this.verticalOffset,
            enableDayNightCycle: this.enableDayNightCycle,
            cycleDuration: this.cycleDuration,
            timeSpeed: this.timeSpeed,
            currentTime: this.currentTime,
            startAtTime: this.startAtTime,
            sunRadius: this.sunRadius,
            moonRadius: this.moonRadius,
            sunColor: this.sunColor,
            sunGlowColor: this.sunGlowColor,
            moonColor: this.moonColor,
            moonCraterColor: this.moonCraterColor,
            celestialArcHeight: this.celestialArcHeight,
            celestialYOffset: this.celestialYOffset,
            enableDarknessOverlay: this.enableDarknessOverlay,
            peakDarknessAlpha: this.peakDarknessAlpha,
            moonCutthrough: this.moonCutthrough,
            enableStars: this.enableStars,
            starCount: this.starCount,
            starMinBrightness: this.starMinBrightness,
            starMaxBrightness: this.starMaxBrightness,
            starTwinkleSpeed: this.starTwinkleSpeed,
            enableMoonPhases: this.enableMoonPhases,
            moonPhase: this.moonPhase,
            moonPhaseSpeed: this.moonPhaseSpeed,
            moonShadowColor: this.moonShadowColor,
            moonShadowOpacity: this.moonShadowOpacity
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        if (!data) return;

        this.layerCount = data.layerCount || 5;
        this.hillsPerLayer = data.hillsPerLayer || 8;
        this.seed = data.seed || 12345;
        this.daySkyColor = data.daySkyColor || "#87CEEB";
        this.dayHorizonColor = data.dayHorizonColor || "#E0F6FF";
        this.dayNearColor = data.dayNearColor || "#2D5016";
        this.dayFarColor = data.dayFarColor || "#A0B0C0";
        this.nightSkyColor = data.nightSkyColor || "#0a1628";
        this.nightHorizonColor = data.nightHorizonColor || "#1a2744";
        this.nightNearColor = data.nightNearColor || "#0d1f0b";
        this.nightFarColor = data.nightFarColor || "#2a3a4a";
        this.sunsetSkyColor = data.sunsetSkyColor || "#FF6B35";
        this.sunsetHorizonColor = data.sunsetHorizonColor || "#FFA07A";
        this.parallaxStrength = data.parallaxStrength || 0.7;
        this.baseHeight = data.baseHeight || 200;
        this.heightVariation = data.heightVariation || 150;
        this.smoothness = data.smoothness || 0.6;
        this.verticalOffset = data.verticalOffset || 100;
        this.enableDayNightCycle = data.enableDayNightCycle !== undefined ? data.enableDayNightCycle : true;
        this.cycleDuration = data.cycleDuration || 120;
        this.timeSpeed = data.timeSpeed || 1.0;
        this.currentTime = data.currentTime || data.startAtTime || 0.3;
        this.startAtTime = data.startAtTime || 0.3;
        this.sunRadius = data.sunRadius || 40;
        this.moonRadius = data.moonRadius || 35;
        this.sunColor = data.sunColor || "#FDB813";
        this.sunGlowColor = data.sunGlowColor || "#FFE4B5";
        this.moonColor = data.moonColor || "#E0E0E0";
        this.moonCraterColor = data.moonCraterColor || "#BEBEBE";
        this.celestialArcHeight = data.celestialArcHeight || 0.6;
        this.celestialYOffset = data.celestialYOffset || 0;
        this.enableDarknessOverlay = data.enableDarknessOverlay !== undefined ? data.enableDarknessOverlay : true;
        this.peakDarknessAlpha = data.peakDarknessAlpha || 0.7;
        this.moonCutthrough = data.moonCutthrough !== undefined ? data.moonCutthrough : true;
        this.enableStars = data.enableStars !== undefined ? data.enableStars : true;
        this.starCount = data.starCount || 100;
        this.starMinBrightness = data.starMinBrightness || 0.3;
        this.starMaxBrightness = data.starMaxBrightness || 1.0;
        this.starTwinkleSpeed = data.starTwinkleSpeed || 2.0;
        this.enableMoonPhases = data.enableMoonPhases !== undefined ? data.enableMoonPhases : true;
        this.moonPhase = data.moonPhase || 0;
        this.moonPhaseSpeed = data.moonPhaseSpeed || 0.1;
        this.moonShadowColor = data.moonShadowColor || "#000000";
        this.moonShadowOpacity = data.moonShadowOpacity || 0.85;

        this.initialized = false;
    }
}

window.InfiniteParallaxBackgroundDayNight = InfiniteParallaxBackgroundDayNight;
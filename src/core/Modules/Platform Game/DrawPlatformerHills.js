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

        // Moon light source
        this.moonLightId = null;
        this.enableMoonLight = true;
        this.moonLightIntensity = 0.3;
        this.moonLightSize = 300;
        this.moonLightColor = "#88AAFF";

        // Star properties - ENHANCED
        this.starCount = 100; // Number of stars per star segment
        this.starSeed = 42; // Seed for star positions
        this.starTwinkleSpeed = 2.0; // Speed of star twinkling
        this.maxStarSize = 3; // Maximum star size
        this.starSegmentWidth = 1600; // Width of each star segment for infinite generation
        this.enableInfiniteStars = true; // Toggle between fixed and infinite stars
        this.starCache = new Map(); // Cache for star segments

        // Cloud properties - SIMPLIFIED
        this.enableClouds = true;
        this.cloudDensity = 3; // Clouds per segment
        this.cloudSpeed = 40; // px/sec for animation
        this.windDirection = 1; // -1 = left, 1 = right
        this.cloudSeed = 1234;
        this.cloudParallax = 0.3; // Parallax factor
        this.cloudSegmentWidth = 1200; // Width of each cloud segment
        this.cloudCache = new Map(); // Cache for cloud segments
        this.cloudTypes = [
            { w: 120, h: 48, alpha: 0.6 },
            { w: 80, h: 32, alpha: 0.7 },
            { w: 160, h: 56, alpha: 0.5 }
        ];

        // --- Building properties ---
        this.enableBuildings = true;
        this.buildingDensity = 0.3; // Probability of building per segment (0-1)
        this.buildingSeed = 5678;
        this.minBuildingHeight = 80;
        this.maxBuildingHeight = 200;
        this.minBuildingWidth = 40;
        this.maxBuildingWidth = 80;
        this.buildingColor = "#2C3E50";
        this.buildingParallax = 0.85; // Buildings move slower than front hills but faster than back hills
        this.buildingCache = new Map();

        // Celestial body positioning
        this.celestialArcHeight = 0.6; // How high the sun/moon arc (0-1)
        this.celestialParallax = 0.2; // Parallax factor for celestial bodies

        // Cache for generated hill segments and stars
        this.hillCache = new Map();
        this.starPositions = [];
        this.lastViewportBounds = null;

        this.lastDay = this.getDay(); // Track last day for moon phase updates
        this.moonWasVisible = false;
        this.moonPhaseAdvanced = false;

        this.moonWasVisible = false;

        // --- Light Source System ---
        this.lightSources = [];
        this.lightIdCounter = 0;
        this.maxLightSources = 50;

        this.setupProperties();
        this.generateStars();
        //this.resetClouds();
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

        // Moon light properties
        this.exposeProperty("enableMoonLight", "boolean", this.enableMoonLight, {
            description: "Enable automatic moon light source",
            onChange: (val) => {
                this.enableMoonLight = val;
                if (!val && this.moonLightId !== null) {
                    this.removeLightSource(this.moonLightId);
                    this.moonLightId = null;
                }
            }
        });

        this.exposeProperty("moonLightIntensity", "number", this.moonLightIntensity, {
            description: "Moon light intensity",
            min: 0.1, max: 1.0, step: 0.05,
            onChange: (val) => {
                this.moonLightIntensity = val;
                if (this.moonLightId !== null) {
                    this.updateLightSource(this.moonLightId, { intensity: val });
                }
            }
        });

        this.exposeProperty("moonLightSize", "number", this.moonLightSize, {
            description: "Moon light radius",
            min: 100, max: 800, step: 25,
            onChange: (val) => {
                this.moonLightSize = val;
                if (this.moonLightId !== null) {
                    this.updateLightSource(this.moonLightId, { size: val });
                }
            }
        });

        this.exposeProperty("moonLightColor", "color", this.moonLightColor, {
            description: "Moon light color",
            onChange: (val) => {
                this.moonLightColor = val;
                if (this.moonLightId !== null) {
                    this.updateLightSource(this.moonLightId, { color: val });
                }
            }
        });

        // Star properties
        this.exposeProperty("enableInfiniteStars", "boolean", this.enableInfiniteStars, {
            description: "Enable infinite star generation (vs fixed stars)",
            onChange: (val) => {
                this.enableInfiniteStars = val;
                if (!val) {
                    this.generateStars(); // Regenerate fixed stars
                } else {
                    this.starCache.clear(); // Clear infinite star cache
                }
            }
        });

        this.exposeProperty("starCount", "number", this.starCount, {
            description: this.enableInfiniteStars ? "Stars per segment" : "Total number of stars",
            min: 10, max: 500,
            onChange: (val) => {
                this.starCount = val;
                if (this.enableInfiniteStars) {
                    this.starCache.clear();
                } else {
                    this.generateStars();
                }
            }
        });

        this.exposeProperty("starSeed", "number", this.starSeed, {
            description: "Seed for star positions",
            min: 1, max: 10000,
            onChange: (val) => {
                this.starSeed = val;
                if (this.enableInfiniteStars) {
                    this.starCache.clear();
                } else {
                    this.generateStars();
                }
            }
        });

        this.exposeProperty("starSegmentWidth", "number", this.starSegmentWidth, {
            description: "Width of each star segment (infinite mode)",
            min: 800, max: 3200, step: 100,
            onChange: (val) => {
                this.starSegmentWidth = val;
                this.starCache.clear();
            }
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

        // Cloud properties
        this.exposeProperty("enableClouds", "boolean", this.enableClouds, {
            description: "Enable cloud generation",
            onChange: (val) => {
                this.enableClouds = val;
                this.cloudCache.clear();
            }
        });

        this.exposeProperty("cloudDensity", "number", this.cloudDensity, {
            description: "Average clouds per segment",
            min: 1, max: 8,
            onChange: (val) => {
                this.cloudDensity = val;
                this.cloudCache.clear();
            }
        });

        this.exposeProperty("cloudSpeed", "number", this.cloudSpeed, {
            description: "Cloud animation speed (px/sec)",
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
                this.cloudCache.clear();
            }
        });

        this.exposeProperty("cloudParallax", "number", this.cloudParallax, {
            description: "Cloud parallax factor",
            min: 0.1, max: 0.8, step: 0.05,
            onChange: (val) => { this.cloudParallax = val; }
        });

        this.exposeProperty("cloudSegmentWidth", "number", this.cloudSegmentWidth, {
            description: "Width of each cloud segment",
            min: 400, max: 2000, step: 100,
            onChange: (val) => {
                this.cloudSegmentWidth = val;
                this.cloudCache.clear();
            }
        });

        // Building properties
        this.exposeProperty("enableBuildings", "boolean", this.enableBuildings, {
            description: "Enable randomly generated buildings",
            onChange: (val) => {
                this.enableBuildings = val;
                this.clearBuildingCache();
            }
        });
        this.exposeProperty("buildingDensity", "number", this.buildingDensity, {
            description: "Building density (0-1, probability per segment)",
            min: 0, max: 1, step: 0.05,
            onChange: (val) => {
                this.buildingDensity = val;
                this.clearBuildingCache();
            }
        });
        this.exposeProperty("buildingSeed", "number", this.buildingSeed, {
            description: "Building random seed",
            min: 1, max: 10000,
            onChange: (val) => {
                this.buildingSeed = val;
                this.clearBuildingCache();
            }
        });
        this.exposeProperty("minBuildingHeight", "number", this.minBuildingHeight, {
            description: "Minimum building height",
            min: 20, max: 300,
            onChange: (val) => {
                this.minBuildingHeight = val;
                this.clearBuildingCache();
            }
        });
        this.exposeProperty("maxBuildingHeight", "number", this.maxBuildingHeight, {
            description: "Maximum building height",
            min: 50, max: 500,
            onChange: (val) => {
                this.maxBuildingHeight = val;
                this.clearBuildingCache();
            }
        });
        this.exposeProperty("buildingColor", "color", this.buildingColor, {
            description: "Building color",
            onChange: (val) => {
                this.buildingColor = val;
                this.clearBuildingCache();
            }
        });
        this.exposeProperty("buildingParallax", "number", this.buildingParallax, {
            description: "Building parallax factor",
            min: 0.1, max: 0.95, step: 0.05,
            onChange: (val) => { this.buildingParallax = val; }
        });
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
            .exposeProperty("enableMoonLight", "boolean", this.enableMoonLight, { label: "Enable Moon Light" })
            .exposeProperty("moonLightIntensity", "number", this.moonLightIntensity, { label: "Moon Light Intensity" })
            .exposeProperty("moonLightSize", "number", this.moonLightSize, { label: "Moon Light Size" })
            .exposeProperty("moonLightColor", "color", this.moonLightColor, { label: "Moon Light Color" })
            .endGroup()
            .startGroup("Stars", false, { color: "#FFFFFF" })
            .exposeProperty("enableInfiniteStars", "boolean", this.enableInfiniteStars, { label: "Infinite Stars" })
            .exposeProperty("starCount", "number", this.starCount, { label: "Star Count/Density" })
            .exposeProperty("starSeed", "number", this.starSeed, { label: "Star Seed" })
            .exposeProperty("starTwinkleSpeed", "number", this.starTwinkleSpeed, { label: "Twinkle Speed" })
            .exposeProperty("starSegmentWidth", "number", this.starSegmentWidth, { label: "Star Segment Width" })
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
            .exposeProperty("enableClouds", "boolean", this.enableClouds, { label: "Enable Clouds" })
            .exposeProperty("cloudDensity", "number", this.cloudDensity, { label: "Cloud Density" })
            .exposeProperty("cloudSpeed", "number", this.cloudSpeed, { label: "Cloud Speed" })
            .exposeProperty("windDirection", "number", this.windDirection, { label: "Wind Direction" })
            .exposeProperty("cloudSeed", "number", this.cloudSeed, { label: "Cloud Seed" })
            .exposeProperty("cloudParallax", "number", this.cloudParallax, { label: "Cloud Parallax" })
            .exposeProperty("cloudSegmentWidth", "number", this.cloudSegmentWidth, { label: "Cloud Segment Width" })
            .endGroup()
            .startGroup("Buildings", false)
            .exposeProperty("enableBuildings", "boolean", this.enableBuildings, { label: "Enable Buildings" })
            .exposeProperty("buildingDensity", "number", this.buildingDensity, { label: "Building Density" })
            .exposeProperty("buildingSeed", "number", this.buildingSeed, { label: "Building Seed" })
            .exposeProperty("minBuildingHeight", "number", this.minBuildingHeight, { label: "Min Height" })
            .exposeProperty("maxBuildingHeight", "number", this.maxBuildingHeight, { label: "Max Height" })
            .exposeProperty("buildingColor", "color", this.buildingColor, { label: "Building Color" })
            .exposeProperty("buildingParallax", "number", this.buildingParallax, { label: "Building Parallax" })
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

    // Generate star positions (for fixed mode)
    generateStars() {
        if (this.enableInfiniteStars) return; // Don't generate fixed stars in infinite mode

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

    // Generate stars for a segment (infinite mode)
    generateStarSegment(segmentIndex) {
        const stars = [];
        const segmentStartX = segmentIndex * this.starSegmentWidth;
        const segmentSeed = this.starSeed + segmentIndex * 9999;

        for (let i = 0; i < this.starCount; i++) {
            const starSeed = segmentSeed + i * 777;
            const x = this.randomRange(0, this.starSegmentWidth, starSeed);
            const y = this.randomRange(0, this.imageHeight * 0.8, starSeed + 1);

            stars.push({
                x: segmentStartX + x,
                y: y,
                size: this.randomRange(1, this.maxStarSize, starSeed + 2),
                twinklePhase: this.randomRange(0, Math.PI * 2, starSeed + 3)
            });
        }

        return stars;
    }

    // Get or generate star segment
    getStarSegment(segmentIndex) {
        if (!this.enableInfiniteStars) return [];

        const cacheKey = segmentIndex.toString();
        if (!this.starCache.has(cacheKey)) {
            const stars = this.generateStarSegment(segmentIndex);
            this.starCache.set(cacheKey, stars);
        }
        return this.starCache.get(cacheKey);
    }

    start() {
        // Initialize time and celestial bodies
        this.currentTime = this.currentHour / 24;
        this.lastDay = this.getDay();
        this.hillCache.clear();
        this.generateStars();
        // Reset clouds after engine is ready
        //setTimeout(() => this.resetClouds(), 100);
    }

    loop(deltaTime) {
        this.updateTime(deltaTime);
        this.updateMoonLight();
        //this.updateClouds(deltaTime);
    }

    // Update time progression
    updateTime(deltaTime) {
        if (this.enableDayNightCycle) {
            this.currentTime += (deltaTime / 1000) * (this.timeScale / 24);
            if (this.currentTime > 1) this.currentTime -= 1;
            if (this.currentTime < 0) this.currentTime += 1;
            this.currentHour = this.currentTime * 24;
        }

        const moonCurrentlyVisible = this.isMoonVisible();

        // --- Advance moon phase only when moon goes from not visible to visible ---
        // This happens when moon starts rising (enters visibility period)
        if (moonCurrentlyVisible && !this.moonWasVisible && !this.moonPhaseAdvanced) {
            // Moon just became visible (started rising), advance phase
            this.moonPhase += 1 / 30; // Advance by 1/30th (30-day cycle)
            if (this.moonPhase > 1) this.moonPhase -= 1;
            this.moonPhaseAdvanced = true;
        }

        // Reset the phase advanced flag when moon becomes not visible
        if (!moonCurrentlyVisible && this.moonWasVisible) {
            this.moonPhaseAdvanced = false;
        }

        this.moonWasVisible = moonCurrentlyVisible;
    }

    updateMoonLight() {
        if (!this.enableMoonLight) return;

        const viewportBounds = this.getViewportBounds();
        const moonPos = this.getCelestialPosition(this.currentTime, viewportBounds, true);
        const moonVisible = this.isMoonVisible();

        if (moonVisible) {
            // Calculate moon light intensity based on moon phase
            // Full moon = full intensity, new moon = minimal intensity
            const phaseIntensity = 0.2 + (Math.cos((this.moonPhase - 0.5) * Math.PI * 2) * 0.5 + 0.5) * 0.8;
            const finalIntensity = this.moonLightIntensity * phaseIntensity;

            if (this.moonLightId === null) {
                // Create moon light source
                this.moonLightId = this.addLightSource({
                    x: moonPos.x,
                    y: moonPos.y,
                    color: this.moonLightColor,
                    size: this.moonLightSize,
                    intensity: finalIntensity,
                    smoothness: 0.9,
                    flicker: false,
                    enabled: true
                });
            } else {
                // Update existing moon light position and intensity
                this.updateLightSource(this.moonLightId, {
                    x: moonPos.x,
                    y: moonPos.y,
                    intensity: finalIntensity,
                    color: this.moonLightColor,
                    size: this.moonLightSize
                });
            }
        } else {
            // Moon not visible, remove light source
            if (this.moonLightId !== null) {
                this.removeLightSource(this.moonLightId);
                this.moonLightId = null;
            }
        }
    }

    // Get current sky color based on time
    getCurrentSkyColor() {
        // Create smooth transitions for day/night with smoother curves
        let dayStrength;

        // Extended night duration with smoother transitions
        if (this.currentTime < 0.15) {
            // Deep night
            dayStrength = 0;
        } else if (this.currentTime < 0.35) {
            // Dawn transition (longer, smoother)
            const t = (this.currentTime - 0.15) / 0.2;
            // Use smooth curve for gradual transition
            dayStrength = Math.sin(t * Math.PI / 2);
        } else if (this.currentTime < 0.65) {
            // Day
            dayStrength = 1;
        } else if (this.currentTime < 0.85) {
            // Dusk transition (longer, smoother)
            const t = (this.currentTime - 0.65) / 0.2;
            // Use smooth curve for gradual transition
            dayStrength = Math.cos(t * Math.PI / 2);
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

        // Moon time window - adjusted to match visibility period
        const moonRise = 0.65 - 0.08; // Start appearing at dusk
        const moonSet = 0.35 + 0.08;  // Finish disappearing at dawn

        let angle;
        if (!isMoon) {
            // t: 0 = left off-screen, 1 = right off-screen
            let t = (time - sunRise) / (sunSet - sunRise);
            t = Math.max(0, Math.min(1, t));
            // Arc from left (sunrise, off-screen) to right (sunset, off-screen), top at t=0.5
            angle = Math.PI - Math.PI * t; // 180deg (left) to 0deg (right), arc upward
        } else {
            // Moon follows opposite arc
            let moonTime = time;

            // Handle the wrap-around for moon visibility (night spans midnight)
            if (moonTime < moonSet) {
                // Moon is in the early morning part of its cycle (0.0 to ~0.43)
                moonTime += 1; // Treat as continuation from previous night
            }

            let t = (moonTime - moonRise) / ((1 + moonSet) - moonRise);
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
        if (opacity <= 0) return;

        ctx.save();
        const viewportX = window.engine.viewport.x || 0;
        const viewportY = window.engine.viewport.y || 0;

        // Stars have minimal parallax
        const starParallax = 0.1;
        const parallaxOffsetX = viewportX * (1 - starParallax);
        const parallaxOffsetY = viewportY * (1 - starParallax);

        if (this.enableInfiniteStars) {
            // Infinite star generation
            const effectiveViewportLeft = viewportBounds.left - parallaxOffsetX;
            const effectiveViewportRight = viewportBounds.right - parallaxOffsetX;

            const startSegment = Math.floor(effectiveViewportLeft / this.starSegmentWidth) - 1;
            const endSegment = Math.ceil(effectiveViewportRight / this.starSegmentWidth) + 1;

            for (let segmentIndex = startSegment; segmentIndex <= endSegment; segmentIndex++) {
                const stars = this.getStarSegment(segmentIndex);

                for (const star of stars) {
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
            }
        } else {
            // Fixed stars mode
            if (this.starPositions.length === 0) return;

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
        }

        ctx.restore();
    }

    // Clear the hill cache when properties change
    clearCache() {
        this.hillCache.clear();
        this.buildingCache.clear();
        this.cloudCache.clear();
        this.starCache.clear();
    }

    clearCloudCache() {
        this.cloudCache.clear();
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
        let skyColor = this.getCurrentSkyColor();
        const sunPos = this.getCelestialPosition(this.currentTime, viewportBounds, false);
        const moonPos = this.getCelestialPosition(this.currentTime, viewportBounds, true);
        const eclipseDarkness = this.getEclipseDarkness(sunPos, moonPos);
        this.eclipseDarkness = eclipseDarkness;

        if (eclipseDarkness > 0) {
            skyColor = this.interpolateColor(skyColor, this.nightColor, eclipseDarkness);
        }

        ctx.fillStyle = skyColor;
        ctx.fillRect(viewportBounds.left - 64, viewportBounds.top - 64,
            viewportBounds.right - viewportBounds.left + 256,
            viewportBounds.bottom - viewportBounds.top + 64);

        // --- Calculate night strength for consistent darkness with smooth transitions ---
        let nightStrength = 1;
        if (this.currentTime < 0.15) {
            nightStrength = 1; // Deep night
        } else if (this.currentTime < 0.35) {
            // Dawn fade with smooth curve
            const t = (this.currentTime - 0.15) / 0.2;
            nightStrength = 1 - Math.sin(t * Math.PI / 2);
        } else if (this.currentTime < 0.65) {
            nightStrength = 0; // Day
        } else if (this.currentTime < 0.85) {
            // Dusk fade with smooth curve
            const t = (this.currentTime - 0.65) / 0.2;
            nightStrength = Math.sin(t * Math.PI / 2);
        } else {
            nightStrength = 1; // Night
        }

        // Eclipse adds to darkness
        nightStrength = Math.max(nightStrength, eclipseDarkness);

        // --- Draw stars ---
        this.drawStars(ctx, viewportBounds, (window.engine?.time || performance.now()) * 0.001, nightStrength);

        // --- Draw sun and moon ---
        let sunOpacity = 1 - nightStrength;
        if (eclipseDarkness > 0) sunOpacity *= (1 - eclipseDarkness * 0.9);
        let moonOpacity = nightStrength;
        if (eclipseDarkness > 0) moonOpacity = Math.max(moonOpacity, eclipseDarkness);

        this.drawSun(ctx, sunPos, sunOpacity);
        this.drawMoon(ctx, moonPos, moonOpacity);

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
            this.drawConnectedSegments(
                ctx,
                segments,
                this.hillStyle,
                parallaxOffsetX,
                parallaxOffsetY,
                viewportBounds
            );

            // --- Draw buildings AFTER the back hill layer ---
            if (layer === this.hillLayers - 1) {
                this.drawBuildings(ctx, viewportBounds, viewportX, viewportY);

                // --- Draw clouds AFTER buildings but BEFORE the next hill layer ---
                this.drawClouds(ctx, viewportBounds, viewportX, viewportY);
            }
        }

        // Draw water after hills
        const time = (window.engine?.time || performance.now()) * 0.001;
        this.drawWater(ctx, viewportBounds, time);

        // --- Draw night overlay using GUI canvas (ALWAYS draw if there's any darkness) ---
        if (nightStrength > 0) {
            this.drawNightOverlay(nightStrength, viewportBounds);
        }

        // --- Draw GUI overlays ---
        const guiCtx = window.engine?.getGuiCanvas();
        if (guiCtx) {
            guiCtx.save();
            guiCtx.fillStyle = "#FFFFFF";
            guiCtx.font = "16px Arial";
            guiCtx.fillText(`Time: ${this.currentHour.toFixed(2)}h`, 10, 20);
            guiCtx.fillText(`Night Strength: ${nightStrength.toFixed(2)}`, 10, 40);
            guiCtx.fillText(`Light Sources: ${this.lightSources.length}`, 10, 60);
            guiCtx.restore();
        }
    }

    // Draw night overlay to simulate darkness
    drawNightOverlay(nightStrength, viewportBounds) {
        if (nightStrength <= 0) return;

        const guiCtx = window.engine?.getGuiCanvas();
        if (!guiCtx) return;

        guiCtx.save();

        // Create a dark overlay that gets more opaque at night
        const baseOpacity = nightStrength * 0.8;

        // If no light sources, draw simple overlay
        if (this.lightSources.length === 0) {
            guiCtx.globalAlpha = baseOpacity;
            guiCtx.fillStyle = "#000018"; // Slightly blue tint for night
            guiCtx.fillRect(0, 0, guiCtx.canvas.width, guiCtx.canvas.height);
            guiCtx.restore();
            return;
        }

        // Get viewport offset for light positioning
        const viewportX = window.engine?.viewport?.x || 0;
        const viewportY = window.engine?.viewport?.y || 0;
        const time = (window.engine?.time || performance.now()) * 0.001;

        // Create an offscreen canvas for the darkness with light holes
        const offCanvas = document.createElement('canvas');
        offCanvas.width = guiCtx.canvas.width;
        offCanvas.height = guiCtx.canvas.height;
        const offCtx = offCanvas.getContext('2d');

        // Draw the base darkness
        offCtx.globalAlpha = baseOpacity;
        offCtx.fillStyle = "#000018";
        offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);

        // Cut holes in the darkness for each light source
        offCtx.globalCompositeOperation = 'destination-out';

        for (const light of this.lightSources) {
            if (!light.enabled) continue;

            // Convert world coordinates to screen coordinates
            const screenX = light.x - viewportX;
            const screenY = light.y - viewportY;

            // Skip lights that are way off screen
            if (screenX < -light.size * 2 || screenX > offCanvas.width + light.size * 2 ||
                screenY < -light.size * 2 || screenY > offCanvas.height + light.size * 2) {
                continue;
            }

            // Calculate flicker effect if enabled
            let currentIntensity = light.intensity;
            if (light.flicker) {
                const flickerValue = Math.sin(time * light.flickerSpeed + light.flickerPhase) * light.flickerAmount;
                currentIntensity = Math.max(0, light.intensity + flickerValue);
            }

            // Boost light effectiveness at night
            const nightBoost = 1 + (nightStrength * 0.8);
            currentIntensity *= nightBoost;

            // Create mask gradient to cut hole in darkness
            const maskGradient = offCtx.createRadialGradient(
                screenX, screenY, 0,
                screenX, screenY, light.size
            );

            // Inner core - full transparency (complete hole)
            const coreAlpha = Math.min(1.0, currentIntensity * 0.8);
            maskGradient.addColorStop(0, `rgba(255, 255, 255, ${coreAlpha})`);

            // Smooth falloff based on light smoothness
            const falloffStart = Math.max(0.1, light.smoothness * 0.5);
            const midAlpha = Math.min(0.8, currentIntensity * 0.6);
            maskGradient.addColorStop(falloffStart, `rgba(255, 255, 255, ${midAlpha})`);

            // Outer edge with soft transition
            const edgeStart = Math.max(0.3, light.smoothness * 0.8);
            const edgeAlpha = Math.min(0.6, currentIntensity * 0.4);
            maskGradient.addColorStop(edgeStart, `rgba(255, 255, 255, ${edgeAlpha})`);

            // Very soft outer edge
            const outerEdge = Math.min(0.95, light.smoothness);
            const outerAlpha = Math.min(0.3, currentIntensity * 0.2);
            maskGradient.addColorStop(outerEdge, `rgba(255, 255, 255, ${outerAlpha})`);
            maskGradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

            offCtx.fillStyle = maskGradient;
            offCtx.beginPath();
            offCtx.arc(screenX, screenY, light.size, 0, Math.PI * 2);
            offCtx.fill();
        }

        // Draw the darkness with holes cut out
        guiCtx.drawImage(offCanvas, 0, 0);

        // Now add colored light effects using additive blending
        guiCtx.globalCompositeOperation = 'lighter';

        for (const light of this.lightSources) {
            if (!light.enabled) continue;

            // Convert world coordinates to screen coordinates
            const screenX = light.x - viewportX;
            const screenY = light.y - viewportY;

            // Skip lights that are way off screen
            if (screenX < -light.size * 2 || screenX > guiCtx.canvas.width + light.size * 2 ||
                screenY < -light.size * 2 || screenY > guiCtx.canvas.height + light.size * 2) {
                continue;
            }

            // Calculate flicker effect if enabled
            let currentIntensity = light.intensity;
            if (light.flicker) {
                const flickerValue = Math.sin(time * light.flickerSpeed + light.flickerPhase) * light.flickerAmount;
                currentIntensity = Math.max(0, light.intensity + flickerValue);
            }

            // Reduced intensity for colored overlay (just for tinting)
            const colorIntensity = currentIntensity * 0.3;

            // Convert light color to RGB for gradient
            const lightRgb = this.hexToRgb(light.color);

            // Create colored radial gradient for tinting
            const colorGradient = guiCtx.createRadialGradient(
                screenX, screenY, 0,
                screenX, screenY, light.size * 0.8  // Slightly smaller than the hole
            );

            // Inner core with color tint
            const coreAlpha = Math.min(0.4, colorIntensity * 0.5);
            colorGradient.addColorStop(0, `rgba(${lightRgb.r}, ${lightRgb.g}, ${lightRgb.b}, ${coreAlpha})`);

            // Smooth falloff
            const falloffStart = Math.max(0.2, light.smoothness * 0.6);
            const midAlpha = Math.min(0.3, colorIntensity * 0.4);
            colorGradient.addColorStop(falloffStart, `rgba(${lightRgb.r}, ${lightRgb.g}, ${lightRgb.b}, ${midAlpha})`);

            // Outer edge
            const edgeStart = Math.max(0.5, light.smoothness * 0.9);
            const edgeAlpha = Math.min(0.2, colorIntensity * 0.2);
            colorGradient.addColorStop(edgeStart, `rgba(${lightRgb.r}, ${lightRgb.g}, ${lightRgb.b}, ${edgeAlpha})`);
            colorGradient.addColorStop(1, `rgba(${lightRgb.r}, ${lightRgb.g}, ${lightRgb.b}, 0)`);

            guiCtx.fillStyle = colorGradient;
            guiCtx.beginPath();
            guiCtx.arc(screenX, screenY, light.size * 0.8, 0, Math.PI * 2);
            guiCtx.fill();
        }

        guiCtx.restore();
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
        // Only reset if we have a valid viewport
        if (window.engine && window.engine.viewport) {
            for (let i = 0; i < this.maxClouds; i++) {
                this.clouds.push(this.spawnCloud(i));
            }
        }
    }

    // Clear building cache
    clearBuildingCache() {
        this.buildingCache.clear();
    }

    // Clear both caches when properties change
    clearCache() {
        this.hillCache.clear();
        this.buildingCache.clear();
    }

    // Generate buildings for a segment
    generateBuildings(segmentIndex) {
        const buildings = [];
        const segmentStartX = segmentIndex * this.segmentWidth;

        // Use seed to determine if this segment has buildings
        const segmentSeed = this.buildingSeed + segmentIndex * 12345;

        // Increase building count and density
        const buildingCount = Math.floor(this.seededRandom(segmentSeed) * 5) + 2; // 2-6 buildings per segment

        for (let i = 0; i < buildingCount; i++) {
            const buildingSeed = segmentSeed + i * 1000;
            const width = this.randomRange(this.minBuildingWidth, this.maxBuildingWidth, buildingSeed);
            const height = this.randomRange(this.minBuildingHeight, this.maxBuildingHeight, buildingSeed + 1);

            // Better distribution across segment
            const x = (i / buildingCount) * this.segmentWidth + this.randomRange(-width / 2, width / 2, buildingSeed + 2);

            // Ensure buildings don't overlap segment boundaries too much
            const clampedX = Math.max(0, Math.min(this.segmentWidth - width, x));

            // Get ground height at building position
            const globalX = segmentStartX + clampedX + width / 2;
            const groundY = this.getHeightAtPosition(globalX, this.hillLayers - 1); // Use back layer ground

            buildings.push({
                x: clampedX,
                groundY: groundY, // Store ground position
                width: width,
                height: height,
                seed: buildingSeed
            });
        }

        return buildings;
    }

    // Get or generate buildings for a segment
    getBuildingSegment(segmentIndex) {
        if (!this.enableBuildings) return [];

        const cacheKey = segmentIndex.toString();

        if (!this.buildingCache.has(cacheKey)) {
            const buildings = this.generateBuildings(segmentIndex);
            this.buildingCache.set(cacheKey, buildings);
        }

        return this.buildingCache.get(cacheKey);
    }

    // Draw buildings
    drawBuildings(ctx, viewportBounds, viewportX, viewportY) {
        if (!this.enableBuildings) return;

        // Calculate parallax offset for buildings
        const parallaxOffsetX = viewportX * this.buildingParallax;
        const parallaxOffsetY = viewportY * this.buildingParallax;

        // Calculate which segments are visible with extra margin for infinite generation
        const effectiveViewportLeft = viewportBounds.left - parallaxOffsetX;
        const effectiveViewportRight = viewportBounds.right - parallaxOffsetX;

        const startSegment = Math.floor(effectiveViewportLeft / this.segmentWidth) - 1;
        const endSegment = Math.ceil(effectiveViewportRight / this.segmentWidth) + 1;

        ctx.save();
        ctx.fillStyle = this.buildingColor;

        for (let segmentIndex = startSegment; segmentIndex <= endSegment; segmentIndex++) {
            const buildings = this.getBuildingSegment(segmentIndex);
            const segmentOffsetX = segmentIndex * this.segmentWidth;

            for (const building of buildings) {
                const buildingX = building.x + segmentOffsetX + parallaxOffsetX;
                const buildingGroundY = building.groundY + parallaxOffsetY;

                // Calculate building height to extend to bottom of viewport
                const buildingTopY = buildingGroundY - building.height;
                const buildingBottomY = viewportBounds.bottom + 50; // Extend below viewport
                const actualHeight = buildingBottomY - buildingTopY;

                // Only draw if visible with margin
                if (buildingX + building.width < viewportBounds.left - 200 ||
                    buildingX > viewportBounds.right + 200) {
                    continue;
                }

                // Draw building body extending to bottom
                ctx.fillRect(buildingX, buildingTopY, building.width, actualHeight);

                // Draw windows (simple grid pattern) only in the upper part
                ctx.save();
                ctx.fillStyle = "#FFD700"; // Yellow windows
                const windowSize = 4;
                const windowSpacing = 12;
                const windowOffsetX = 6;
                const windowOffsetY = 8;

                // Only draw windows in the original building height area
                for (let wx = windowOffsetX; wx < building.width - windowSize; wx += windowSpacing) {
                    for (let wy = windowOffsetY; wy < building.height - windowSize; wy += windowSpacing) {
                        // Randomly light some windows
                        const windowSeed = building.seed + wx * 100 + wy;
                        if (this.seededRandom(windowSeed) > 0.3) {
                            ctx.fillRect(buildingX + wx, buildingTopY + wy, windowSize, windowSize);
                        }
                    }
                }
                ctx.restore();
            }
        }

        ctx.restore();
    }

    // Update cloud positioning for background parallax
    spawnCloud(idx = 0) {
        // Get viewport bounds, with fallback values
        let viewport;
        try {
            viewport = this.getViewportBounds();
        } catch (e) {
            // Fallback viewport if engine isn't ready
            viewport = {
                left: 0,
                right: 1600,
                top: 0,
                bottom: 900
            };
        }

        const rngSeed = this.cloudSeed + idx * 1000;
        const type = this.cloudTypes[Math.floor(this.seededRandom(rngSeed) * this.cloudTypes.length)];

        // Y: anywhere in the top 60% of the viewport (higher in sky)
        const y = viewport.top + this.seededRandom(rngSeed + 1) * ((viewport.bottom - viewport.top) * 0.6);

        // X: spawn across a wider range for better distribution
        const viewportWidth = viewport.right - viewport.left;
        let x;
        if (this.windDirection >= 0) {
            // Wind right: spawn off left with some randomness
            x = viewport.left - type.w - this.seededRandom(rngSeed + 2) * viewportWidth * 0.5;
        } else {
            // Wind left: spawn off right with some randomness
            x = viewport.right + type.w + this.seededRandom(rngSeed + 2) * viewportWidth * 0.5;
        }

        return {
            x, y,
            w: type.w,
            h: type.h,
            alpha: type.alpha,
            speed: this.cloudSpeed * (0.7 + this.seededRandom(rngSeed + 3) * 0.6),
            typeIdx: this.cloudTypes.indexOf(type),
            worldX: x // Track world position separate from display position
        };
    }

    updateClouds(deltaTime) {
        // Don't update if clouds aren't initialized
        if (!this.clouds || this.clouds.length === 0) {
            this.resetClouds();
            return;
        }

        let viewport;
        try {
            viewport = this.getViewportBounds();
        } catch (e) {
            return; // Skip update if viewport isn't available
        }

        for (let i = 0; i < this.clouds.length; i++) {
            const c = this.clouds[i];
            // Update world position
            c.worldX += this.windDirection * c.speed * (deltaTime / 1000);
            c.x = c.worldX; // Update display position

            // Check if cloud is far off screen and needs respawning
            const margin = 500; // Larger margin for respawning
            if ((this.windDirection > 0 && c.worldX > viewport.right + margin) ||
                (this.windDirection < 0 && c.worldX < viewport.left - margin)) {
                this.clouds[i] = this.spawnCloud(i);
            }
        }
    }

    // Generate clouds for a segment using infinite generation technique
    generateCloudSegment(segmentIndex) {
        const clouds = [];
        const segmentStartX = segmentIndex * this.cloudSegmentWidth;
        const segmentSeed = this.cloudSeed + segmentIndex * 7777;

        // Determine number of clouds in this segment
        const cloudCount = Math.floor(this.seededRandom(segmentSeed) * this.cloudDensity) + 1;

        for (let i = 0; i < cloudCount; i++) {
            const cloudSeed = segmentSeed + i * 500;
            const typeIndex = Math.floor(this.seededRandom(cloudSeed) * this.cloudTypes.length);
            const type = this.cloudTypes[typeIndex];

            // Position within segment
            const x = this.randomRange(0, this.cloudSegmentWidth - type.w, cloudSeed + 1);
            const y = this.randomRange(50, 300, cloudSeed + 2);

            clouds.push({
                x: segmentStartX + x,
                y: y,
                w: type.w,
                h: type.h,
                alpha: type.alpha,
                speed: this.cloudSpeed * this.randomRange(0.7, 1.3, cloudSeed + 3),
                typeIdx: typeIndex,
                animationOffset: this.randomRange(0, 1000, cloudSeed + 4)
            });
        }

        return clouds;
    }

    // Get or generate cloud segment
    getCloudSegment(segmentIndex) {
        if (!this.enableClouds) return [];

        const cacheKey = segmentIndex.toString();
        if (!this.cloudCache.has(cacheKey)) {
            const clouds = this.generateCloudSegment(segmentIndex);
            this.cloudCache.set(cacheKey, clouds);
        }
        return this.cloudCache.get(cacheKey);
    }

    drawClouds(ctx, viewportBounds, viewportX, viewportY) {
        if (!this.enableClouds) return;

        ctx.save();

        // Apply parallax to clouds
        const parallaxOffsetX = viewportX * (1 - this.cloudParallax);
        const parallaxOffsetY = viewportY * (1 - this.cloudParallax);

        // Calculate which cloud segments are visible
        const effectiveViewportLeft = viewportBounds.left - parallaxOffsetX;
        const effectiveViewportRight = viewportBounds.right - parallaxOffsetX;

        const startSegment = Math.floor(effectiveViewportLeft / this.cloudSegmentWidth) - 1;
        const endSegment = Math.ceil(effectiveViewportRight / this.cloudSegmentWidth) + 1;

        // Get current time for animation
        const time = (window.engine?.time || performance.now()) * 0.001;

        for (let segmentIndex = startSegment; segmentIndex <= endSegment; segmentIndex++) {
            const clouds = this.getCloudSegment(segmentIndex);

            for (const cloud of clouds) {
                // Apply wind movement over time
                const windOffset = this.windDirection * cloud.speed * time + cloud.animationOffset;
                const cloudX = cloud.x + parallaxOffsetX + windOffset;
                const cloudY = cloud.y + parallaxOffsetY;

                // Only draw clouds that are visible with margin
                if (cloudX + cloud.w < viewportBounds.left - 300 ||
                    cloudX - cloud.w > viewportBounds.right + 300) {
                    continue;
                }

                ctx.globalAlpha = cloud.alpha;
                ctx.fillStyle = "#ffffff";

                // Draw cloud shape
                this.drawCloudShape(ctx, cloudX, cloudY, cloud.w, cloud.h);
            }
        }

        ctx.restore();
    }

    // Draw individual cloud shape
    drawCloudShape(ctx, x, y, w, h) {
        ctx.beginPath();

        // Main cloud body (center)
        ctx.ellipse(x, y, w * 0.3, h * 0.3, 0, 0, Math.PI * 2);

        // Left puff
        ctx.ellipse(x - w * 0.2, y + h * 0.1, w * 0.2, h * 0.2, 0, 0, Math.PI * 2);

        // Right puff
        ctx.ellipse(x + w * 0.15, y + h * 0.15, w * 0.15, h * 0.15, 0, 0, Math.PI * 2);

        // Top puff
        ctx.ellipse(x + w * 0.05, y - h * 0.15, w * 0.12, h * 0.12, 0, 0, Math.PI * 2);

        // Additional small puffs for more realistic shape
        ctx.ellipse(x - w * 0.1, y - h * 0.1, w * 0.08, h * 0.08, 0, 0, Math.PI * 2);
        ctx.ellipse(x + w * 0.25, y, w * 0.1, h * 0.1, 0, 0, Math.PI * 2);

        ctx.fill();
    }

    // --- Light Source Management ---
    addLightSource(options = {}) {
        if (this.lightSources.length >= this.maxLightSources) {
            console.warn(`Maximum light sources (${this.maxLightSources}) reached`);
            return null;
        }

        const lightSource = {
            id: this.lightIdCounter++,
            x: options.x || 0,
            y: options.y || 0,
            color: options.color || "#FFFF88", // Warm white
            size: options.size || 100, // Radius of light
            intensity: options.intensity || 1.0, // 0-1 brightness
            smoothness: options.smoothness || 0.8, // 0-1, higher = softer edges
            enabled: options.enabled !== undefined ? options.enabled : true,
            // Optional animation properties
            flicker: options.flicker || false,
            flickerSpeed: options.flickerSpeed || 2.0,
            flickerAmount: options.flickerAmount || 0.2,
            flickerPhase: Math.random() * Math.PI * 2
        };

        this.lightSources.push(lightSource);
        return lightSource.id;
    }

    removeLightSource(id) {
        const index = this.lightSources.findIndex(light => light.id === id);
        if (index !== -1) {
            this.lightSources.splice(index, 1);
            return true;
        }
        return false;
    }

    getLightSource(id) {
        return this.lightSources.find(light => light.id === id);
    }

    updateLightSource(id, options = {}) {
        const light = this.getLightSource(id);
        if (!light) return false;

        Object.assign(light, options);
        return true;
    }

    addTorchLight(x, y, options = {}) {
        return this.addLightSource({
            x, y,
            color: options.color || "#FF6600",
            size: options.size || 80,
            intensity: options.intensity || 0.8,
            smoothness: options.smoothness || 0.7,
            flicker: true,
            flickerSpeed: options.flickerSpeed || 3.0,
            flickerAmount: options.flickerAmount || 0.3,
            ...options
        });
    }

    addLanternLight(x, y, options = {}) {
        return this.addLightSource({
            x, y,
            color: options.color || "#FFDD88",
            size: options.size || 120,
            intensity: options.intensity || 0.9,
            smoothness: options.smoothness || 0.8,
            flicker: true,
            flickerSpeed: options.flickerSpeed || 1.5,
            flickerAmount: options.flickerAmount || 0.1,
            ...options
        });
    }

    addMoonbeamLight(x, y, options = {}) {
        return this.addLightSource({
            x, y,
            color: options.color || "#88AAFF",
            size: options.size || 200,
            intensity: options.intensity || 0.4,
            smoothness: options.smoothness || 0.9,
            flicker: false,
            ...options
        });
    }

    addSpotlight(x, y, options = {}) {
        return this.addLightSource({
            x, y,
            color: options.color || "#FFFFFF",
            size: options.size || 150,
            intensity: options.intensity || 1.0,
            smoothness: options.smoothness || 0.3,
            flicker: false,
            ...options
        });
    }

    clearAllLights() {
        this.lightSources = [];
    }

    refreshMoonLight() {
        if (this.moonLightId !== null) {
            this.removeLightSource(this.moonLightId);
            this.moonLightId = null;
        }
        this.updateMoonLight();
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
        // Moon should be visible during the entire night period, including transitions
        // Night starts at dusk (0.65) and ends at dawn (0.35)
        // This ensures moon light stays on throughout the darkness
        return (this.currentTime >= 0.65 || this.currentTime <= 0.35);
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
        json.enableInfiniteStars = this.enableInfiniteStars;
        json.starSegmentWidth = this.starSegmentWidth;
        json.enableClouds = this.enableClouds;
        json.cloudDensity = this.cloudDensity;
        json.cloudSegmentWidth = this.cloudSegmentWidth;
        json.cloudSpeed = this.cloudSpeed;
        json.cloudParallax = this.cloudParallax;
        json.windDirection = this.windDirection;
        json.enableBuildings = this.enableBuildings;
        json.buildingSeed = this.buildingSeed;
        json.buildingColor = this.buildingColor;
        json.buildingParallax = this.buildingParallax;
        json.cloudSeed = this.cloudSeed;
        json.cloudTypes = this.cloudTypes.map(type => ({
            w: type.w,
            h: type.h,
            alpha: type.alpha
        }));
        json.starTwinkleSpeed = this.starTwinkleSpeed;
        json.starPositions = this.starPositions.map(pos => ({
            x: pos.x,
            y: pos.y,
            size: pos.size,
            twinklePhase: pos.twinklePhase
        }));
        json.currentTime = this.currentTime;
        json.currentHour = this.currentHour;

        json.lightSources = this.lightSources.map(light => ({
            id: light.id,
            x: light.x,
            y: light.y,
            color: light.color,
            size: light.size,
            intensity: light.intensity,
            smoothness: light.smoothness,
            enabled: light.enabled,
            flicker: light.flicker,
            flickerSpeed: light.flickerSpeed,
            flickerAmount: light.flickerAmount,
            flickerPhase: light.flickerPhase
        }));
        json.lightIdCounter = this.lightIdCounter;

        json.enableMoonLight = this.enableMoonLight;
        json.moonLightIntensity = this.moonLightIntensity;
        json.moonLightSize = this.moonLightSize;
        json.moonLightColor = this.moonLightColor;
        json.moonLightId = this.moonLightId;

        json.moonPhaseAdvanced = this.moonPhaseAdvanced;
        json.moonWasVisible = this.moonWasVisible;

        if (json.moonPhaseAdvanced !== undefined) this.moonPhaseAdvanced = json.moonPhaseAdvanced;
        if (json.moonWasVisible !== undefined) this.moonWasVisible = json.moonWasVisible;

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
        if (json.enableInfiniteStars !== undefined) this.enableInfiniteStars = json.enableInfiniteStars;
        if (json.starSegmentWidth !== undefined) this.starSegmentWidth = json.starSegmentWidth;
        if (json.enableClouds !== undefined) this.enableClouds = json.enableClouds;
        if (json.cloudDensity !== undefined) this.cloudDensity = json.cloudDensity;
        if (json.cloudSegmentWidth !== undefined) this.cloudSegmentWidth = json.cloudSegmentWidth;
        if (json.cloudSpeed !== undefined) this.cloudSpeed = json.cloudSpeed;
        if (json.cloudParallax !== undefined) this.cloudParallax = json.cloudParallax;
        if (json.windDirection !== undefined) this.windDirection = json.windDirection;
        if (json.enableBuildings !== undefined) this.enableBuildings = json.enableBuildings;
        if (json.buildingSeed !== undefined) this.buildingSeed = json.buildingSeed;
        if (json.buildingColor !== undefined) this.buildingColor = json.buildingColor;
        if (json.buildingParallax !== undefined) this.buildingParallax = json.buildingParallax;
        if (json.cloudSeed !== undefined) this.cloudSeed = json.cloudSeed;
        if (json.cloudTypes !== undefined) {
            this.cloudTypes = json.cloudTypes.map(type => ({
                w: type.w,
                h: type.h,
                alpha: type.alpha
            }));
        }
        if (json.starTwinkleSpeed !== undefined) this.starTwinkleSpeed = json.starTwinkleSpeed;
        if (json.starPositions !== undefined) {
            this.starPositions = json.starPositions.map(pos => ({
                x: pos.x,
                y: pos.y,
                size: pos.size,
                twinklePhase: pos.twinklePhase
            }));
        }
        if (json.currentTime !== undefined) this.setTime(json.currentTime);
        if (json.currentHour !== undefined) this.setHour(json.currentHour);

        if (json.lightSources !== undefined) {
            this.lightSources = json.lightSources.map(lightData => ({
                id: lightData.id,
                x: lightData.x,
                y: lightData.y,
                color: lightData.color || "#FFFF88",
                size: lightData.size || 100,
                intensity: lightData.intensity || 1.0,
                smoothness: lightData.smoothness || 0.8,
                enabled: lightData.enabled !== undefined ? lightData.enabled : true,
                flicker: lightData.flicker || false,
                flickerSpeed: lightData.flickerSpeed || 2.0,
                flickerAmount: lightData.flickerAmount || 0.2,
                flickerPhase: lightData.flickerPhase || Math.random() * Math.PI * 2
            }));
        }
        if (json.lightIdCounter !== undefined) {
            this.lightIdCounter = json.lightIdCounter;
        }

        if (json.enableMoonLight !== undefined) this.enableMoonLight = json.enableMoonLight;
        if (json.moonLightIntensity !== undefined) this.moonLightIntensity = json.moonLightIntensity;
        if (json.moonLightSize !== undefined) this.moonLightSize = json.moonLightSize;
        if (json.moonLightColor !== undefined) this.moonLightColor = json.moonLightColor;
        if (json.moonLightId !== undefined) this.moonLightId = json.moonLightId;

        this.clearCache();
    }
}

window.DrawPlatformerHills = DrawPlatformerHills;
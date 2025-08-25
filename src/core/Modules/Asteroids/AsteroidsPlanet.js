class AsteroidsPlanet extends Module {
    static namespace = "Asteroids";
    static description = "A planet with gravity, orbital mechanics, and visual features";
    static allowMultiple = true;

    constructor() {
        super("AsteroidsPlanet");

        // Planet properties
        this.mass = 1000;
        this.radius = 50;
        this.gravitationalConstant = 100;
        this.gravitationalRange = 200;

        // Orbital properties
        this.orbitTargetName = ""; // Name of GameObject to orbit around
        this.orbitSpeed = 30; // degrees per second (negative for reverse)
        this.orbitDistance = 0; // Will be calculated from initial distance
        this.orbitAngle = 0; // Current orbital angle

        // Planet interaction
        this.planetDetectionRadius = 300;
        this.planetInteractionStrength = 0.5;

        // Visual properties
        this.planetColor = "#4a90e2";
        this.waterColor = "#2171b5";
        this.landColor = "#8fbc8f";
        this.rotationSpeed = 10; // degrees per second for surface rotation
        this.surfaceRotation = 0;

        // Atmospheric glow properties
        this.atmosphericGlowSize = 0.3; // Multiplier for planet radius
        this.atmosphericGlowColor = "#87CEEB"; // Sky blue default
        this.atmosphericGlowIntensity = 0.5; // 0-1 opacity
        this.enableAtmosphericGlow = true;

        // Surface generation with seed
        this.seed = Math.floor(Math.random() * 1000000);
        this.continentCount = 3;
        this.continentSize = 0.3; // 0-1 scale
        this.continentScale = 1.0; // New: Direct scale multiplier for all land features
        this.coastlineRoughness = 0.4;
        this.concaveStrength = 0.3; // New: Controls how concave some coastline points can be (0-1)
        this.waterLevel = 0.7; // How much of planet is water (affects visual rendering)
        this.use3DRotation = true;
        this.noiseScale = 0.1;
        this.noiseStrength = 0.3;
        this.edgeFadeMargin = 0.2; // Margin from edge where features start to fade
        this.visibilityThreshold = 0.1; // Minimum z-depth for visibility

        // Health system
        this.health = 100;
        this.maxHealth = 100;
        this.isDestroying = false;
        this.destroyRotationSpeed = 360; // degrees per second when destroying
        this.shrinkSpeed = 2.0; // shrink rate per second
        this.originalRadius = this.radius;

        // Internal state
        this.orbitTarget = null;
        this.orbitCenter = { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0 };
        this.surfaceFeatures = [];
        this.affectedObjects = new Set();
        this.randomGenerator = null;

        // Initialize random generator and surface
        this.initializeRandomGenerator();
        this.generateSurfaceFeatures();

        // Setup properties with styling
        this.setupProperties();
    }

    /**
     * Initialize seeded random number generator
     */
    initializeRandomGenerator() {
        // Simple seeded random number generator
        this.randomGenerator = {
            seed: this.seed,
            next: function () {
                this.seed = (this.seed * 9301 + 49297) % 233280;
                return this.seed / 233280;
            }
        };
    }

    /**
     * Get seeded random number between 0 and 1
     */
    seededRandom() {
        return this.randomGenerator.next();
    }

    /**
     * Simple perlin-like noise function for 3D surface generation
     */
    noise(x, y, z = 0) {
        // Improved hash-based noise with better distribution
        const hash = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
        return (hash - Math.floor(hash)) * 2 - 1;
    }

    /**
 * Fractal noise for more complex patterns
 */
    fractalNoise(x, y, z = 0, octaves = 4) {
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            value += this.noise(x * frequency, y * frequency, z * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= 0.5;
            frequency *= 2;
        }

        return value / maxValue; // Normalize
    }

    /**
     * Set up properties with styling
     */
    setupProperties() {
        // Planet Properties
        this.exposeProperty("mass", "number", 1000, {
            description: "Mass of the planet (affects gravitational pull)",
            min: 1, max: 10000,
            onChange: (val) => { this.mass = Math.max(1, val); }
        });

        this.exposeProperty("radius", "number", 50, {
            description: "Visual radius of the planet",
            min: 10, max: 200,
            onChange: (val) => {
                this.radius = Math.max(10, val);
                this.originalRadius = this.radius;
                this.generateSurfaceFeatures();
            }
        });

        this.exposeProperty("gravitationalConstant", "number", 100, {
            description: "Strength of gravitational force",
            min: 0, max: 1000,
            onChange: (val) => { this.gravitationalConstant = val; }//Math.max(0, val); }
        });

        this.exposeProperty("gravitationalRange", "number", 200, {
            description: "Range of gravitational effect",
            min: 0, max: 1000,
            onChange: (val) => { this.gravitationalRange = val }
        });

        // Health Properties
        this.exposeProperty("health", "number", 100, {
            description: "Current health of the planet",
            min: 0, max: 1000,
            onChange: (val) => { this.health = Math.max(0, val); }
        });

        this.exposeProperty("maxHealth", "number", 100, {
            description: "Maximum health of the planet",
            min: 1, max: 1000,
            onChange: (val) => {
                this.maxHealth = Math.max(1, val);
                if (this.health > this.maxHealth) this.health = this.maxHealth;
            }
        });

        // Generation Properties
        this.exposeProperty("seed", "number", this.seed, {
            description: "Random seed for planet generation",
            min: 0, max: 1000000,
            onChange: (val) => {
                this.seed = val;
                this.initializeRandomGenerator();
                this.generateSurfaceFeatures();
            }
        });

        this.exposeProperty("continentCount", "number", 3, {
            description: "Number of continents/land masses",
            min: 1, max: 8,
            onChange: (val) => {
                this.continentCount = Math.max(1, Math.min(8, val));
                this.generateSurfaceFeatures();
            }
        });

        this.exposeProperty("continentScale", "number", 1.0, {
            description: "Scale multiplier for all land features (continents and islands)",
            min: 0.1, max: 3.0, step: 0.1,
            onChange: (val) => {
                this.continentScale = Math.max(0.1, val);
                this.generateSurfaceFeatures();
            }
        });

        // Add atmospheric glow properties
        this.exposeProperty("enableAtmosphericGlow", "boolean", true, {
            description: "Enable atmospheric glow effect around the planet",
            onChange: (val) => { this.enableAtmosphericGlow = val; }
        });

        this.exposeProperty("atmosphericGlowSize", "number", 0.3, {
            description: "Size of atmospheric glow relative to planet radius",
            min: 0, max: 2.0, step: 0.1,
            onChange: (val) => { this.atmosphericGlowSize = Math.max(0, val); }
        });

        this.exposeProperty("atmosphericGlowColor", "color", "#87CEEB", {
            description: "Color of the atmospheric glow",
            onChange: (val) => { this.atmosphericGlowColor = val; }
        });

        this.exposeProperty("atmosphericGlowIntensity", "number", 0.5, {
            description: "Intensity/opacity of the atmospheric glow (0-1)",
            min: 0, max: 1, step: 0.1,
            onChange: (val) => { this.atmosphericGlowIntensity = Math.max(0, Math.min(1, val)); }
        });

        // Add coastline smoothness properties
        this.exposeProperty("coastlineSmoothness", "number", 0.6, {
            description: "How smooth the coastlines are (0=jagged, 1=very smooth)",
            min: 0, max: 1, step: 0.1,
            onChange: (val) => {
                this.coastlineSmoothness = Math.max(0, Math.min(1, val));
                this.generateSurfaceFeatures();
            }
        });

        this.exposeProperty("concaveStrength", "number", 0.3, {
            description: "Strength of concave coastline features (0=none, 1=very concave)",
            min: 0, max: 1, step: 0.1,
            onChange: (val) => {
                this.concaveStrength = Math.max(0, Math.min(1, val));
                this.generateSurfaceFeatures();
            }
        });

        this.exposeProperty("waterLevel", "number", 0.7, {
            description: "How much of the planet is covered by water (0-1) - affects visual appearance",
            min: 0, max: 1, step: 0.1,
            onChange: (val) => {
                this.waterLevel = Math.max(0, Math.min(1, val));
                this.generateSurfaceFeatures();
            }
        });

        this.exposeProperty("use3DRotation", "boolean", true, {
            description: "Enable 3D rotation simulation with perlin noise",
            onChange: (val) => { this.use3DRotation = val; }
        });

        this.exposeProperty("noiseScale", "number", 0.1, {
            description: "Scale of the noise pattern for 3D effect",
            min: 0.01, max: 1, step: 0.01,
            onChange: (val) => { this.noiseScale = val; }
        });

        this.exposeProperty("noiseStrength", "number", 0.3, {
            description: "Strength of the noise effect",
            min: 0, max: 1, step: 0.1,
            onChange: (val) => { this.noiseStrength = val; }
        });

        // Add edge fade margin property
        this.exposeProperty("edgeFadeMargin", "number", 0.2, {
            description: "Margin from planet edge where features start to fade (0-1)",
            min: 0, max: 0.5, step: 0.05,
            onChange: (val) => { this.edgeFadeMargin = val; }
        });

        // Orbital Properties
        this.exposeProperty("orbitTargetName", "string", "", {
            description: "Name of GameObject to orbit (leave empty for no orbit)",
            onChange: (val) => {
                this.orbitTargetName = val;
                this.findOrbitTarget();
            }
        });

        this.exposeProperty("orbitSpeed", "number", 30, {
            description: "Orbital speed in degrees per second (negative for reverse)",
            min: -200, max: 200,
            onChange: (val) => { this.orbitSpeed = val; }
        });

        // Visual Properties
        this.exposeProperty("planetColor", "color", "#4a90e2", {
            description: "Base color of the planet",
            onChange: (val) => { this.planetColor = val; }
        });

        this.exposeProperty("waterColor", "color", "#2171b5", {
            description: "Color of water/oceans",
            onChange: (val) => { this.waterColor = val; }
        });

        this.exposeProperty("landColor", "color", "#8fbc8f", {
            description: "Color of land/continents",
            onChange: (val) => { this.landColor = val; }
        });

        this.exposeProperty("rotationSpeed", "number", 10, {
            description: "Surface rotation speed in degrees per second",
            min: -100, max: 100,
            onChange: (val) => { this.rotationSpeed = val; }
        });
    }

    /**
     * Enhanced inspector UI using the Style helper
     */
    style(style) {
        style.startGroup("Planet Properties", false, {
            backgroundColor: 'rgba(100,150,255,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("mass", "number", this.mass, {
            description: "Mass of the planet (affects gravitational pull)",
            min: 1, max: 10000,
            step: 10,
            style: {
                label: "Mass",
                slider: true
            }
        });

        style.exposeProperty("radius", "number", this.radius, {
            description: "Visual radius of the planet",
            min: 10, max: 200,
            step: 5,
            style: {
                label: "Radius",
                slider: true
            }
        });

        style.exposeProperty("gravitationalConstant", "number", this.gravitationalConstant, {
            description: "Strength of gravitational force",
            min: 0, max: 1000,
            step: 10,
            style: {
                label: "Gravity Strength",
                slider: true
            }
        });

        style.exposeProperty("gravitationalRange", "number", this.gravitationalRange, {
            description: "Range of gravitational effect",
            min: 0, max: 1000,
            step: 10,
            style: {
                label: "Gravity Range",
                slider: true
            }
        });

        style.endGroup();

        style.addDivider();

        style.startGroup("Health System", false, {
            backgroundColor: 'rgba(255,100,100,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("health", "number", this.health, {
            description: "Current health of the planet",
            min: 0, max: this.maxHealth,
            style: {
                label: "Current Health",
                slider: true
            }
        });

        style.exposeProperty("maxHealth", "number", this.maxHealth, {
            description: "Maximum health of the planet",
            min: 1, max: 1000,
            step: 10,
            style: {
                label: "Max Health",
                slider: true
            }
        });

        // Health bar visualization
        //const healthPercent = (this.health / this.maxHealth) * 100;
        /*style.addCustomElement(`
            <div style="margin: 5px 0; padding: 5px; background: rgba(0,0,0,0.2); border-radius: 3px;">
                <div style="font-size: 12px; margin-bottom: 3px;">Health: ${this.health.toFixed(0)}/${this.maxHealth}</div>
                <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.2); border-radius: 4px; overflow: hidden;">
                    <div style="width: ${healthPercent}%; height: 100%; background: ${healthPercent > 50 ? '#4CAF50' : healthPercent > 25 ? '#FF9800' : '#F44336'}; transition: all 0.3s;"></div>
                </div>
            </div>
        `);*/

        style.endGroup();

        style.addDivider();

        style.startGroup("Atmospheric Effects", false, {
            backgroundColor: 'rgba(135,206,235,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("enableAtmosphericGlow", "boolean", this.enableAtmosphericGlow, {
            description: "Enable atmospheric glow effect around the planet",
            style: {
                label: "Enable Glow"
            }
        });

        style.exposeProperty("atmosphericGlowSize", "number", this.atmosphericGlowSize, {
            description: "Size of atmospheric glow relative to planet radius",
            min: 0, max: 2.0, step: 0.1,
            style: {
                label: "Glow Size",
                slider: true
            }
        });

        style.exposeProperty("atmosphericGlowColor", "color", this.atmosphericGlowColor, {
            description: "Color of the atmospheric glow",
            style: {
                label: "Glow Color"
            }
        });

        style.exposeProperty("atmosphericGlowIntensity", "number", this.atmosphericGlowIntensity, {
            description: "Intensity/opacity of the atmospheric glow (0-1)",
            min: 0, max: 1, step: 0.1,
            style: {
                label: "Glow Intensity",
                slider: true
            }
        });

        style.endGroup();

        style.addDivider();

        // Update Surface Generation group to include smoothness properties
        style.startGroup("Surface Generation", false, {
            backgroundColor: 'rgba(100,255,150,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("seed", "number", this.seed, {
            description: "Random seed for planet generation",
            min: 0, max: 1000000,
            step: 1,
            style: {
                label: "Generation Seed"
            }
        });

        style.addButton("Random Seed", () => {
            this.seed = Math.floor(Math.random() * 1000000);
            this.initializeRandomGenerator();
            this.generateSurfaceFeatures();
            if (window.editor && window.editor.inspector) {
                window.editor.inspector.refreshModuleUI(this);
            }
        }, {
            tooltip: "Generate a new random seed"
        });

        style.exposeProperty("continentCount", "number", this.continentCount, {
            description: "Number of continents/land masses",
            min: 1, max: 8,
            style: {
                label: "Continents",
                slider: true
            }
        });

        style.exposeProperty("continentScale", "number", this.continentScale, {
            description: "Scale multiplier for all land features (continents and islands)",
            min: 0.1, max: 3.0, step: 0.1,
            style: {
                label: "Land Scale",
                slider: true
            }
        });

        style.exposeProperty("waterLevel", "number", this.waterLevel, {
            description: "How much of the planet is covered by water (0-1) - affects visual appearance",
            min: 0, max: 1, step: 0.1,
            style: {
                label: "Water Coverage",
                slider: true
            }
        });

        style.exposeProperty("use3DRotation", "boolean", this.use3DRotation, {
            description: "Enable 3D rotation simulation with perlin noise",
            style: {
                label: "3D Rotation Effect"
            }
        });

        style.exposeProperty("noiseScale", "number", this.noiseScale, {
            description: "Scale of the noise pattern for 3D effect",
            min: 0.01, max: 1, step: 0.01,
            style: {
                label: "Noise Scale",
                slider: true
            }
        });

        style.exposeProperty("noiseStrength", "number", this.noiseStrength, {
            description: "Strength of the noise effect",
            min: 0, max: 1, step: 0.1,
            style: {
                label: "Noise Strength",
                slider: true
            }
        });

        style.exposeProperty("edgeFadeMargin", "number", this.edgeFadeMargin, {
            description: "Margin from planet edge where features start to fade (0-1)",
            min: 0, max: 0.5, step: 0.05,
            style: {
                label: "Edge Fade Margin",
                slider: true
            }
        });

        style.exposeProperty("coastlineSmoothness", "number", this.coastlineSmoothness, {
            description: "How smooth the coastlines are (0=jagged, 1=very smooth)",
            min: 0, max: 1, step: 0.1,
            style: {
                label: "Coastline Smoothness",
                slider: true
            }
        });

        style.exposeProperty("concaveStrength", "number", this.concaveStrength, {
            description: "Strength of concave coastline features (0=none, 1=very concave)",
            min: 0, max: 1, step: 0.1,
            style: {
                label: "Concave Coastlines",
                slider: true
            }
        });

        style.endGroup();

        style.addDivider();

        style.startGroup("Visual Properties", true, {
            backgroundColor: 'rgba(255,150,100,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("planetColor", "color", this.planetColor, {
            description: "Base color of the planet",
            style: {
                label: "Planet Color"
            }
        });

        style.exposeProperty("waterColor", "color", this.waterColor, {
            description: "Color of water/oceans",
            style: {
                label: "Water Color"
            }
        });

        style.exposeProperty("landColor", "color", this.landColor, {
            description: "Color of land/continents",
            style: {
                label: "Land Color"
            }
        });

        style.exposeProperty("rotationSpeed", "number", this.rotationSpeed, {
            description: "Surface rotation speed in degrees per second",
            min: -100, max: 100,
            step: 5,
            style: {
                label: "Rotation Speed",
                slider: true
            }
        });

        style.endGroup();

        style.addDivider();

        style.startGroup("Orbital Properties", true, {
            backgroundColor: 'rgba(255,255,100,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("orbitTargetName", "string", this.orbitTargetName, {
            description: "Name of GameObject to orbit (leave empty for no orbit)",
            style: {
                label: "Orbit Target"
            }
        });

        style.exposeProperty("orbitSpeed", "number", this.orbitSpeed, {
            description: "Orbital speed in degrees per second (negative for reverse)",
            min: -200, max: 200,
            step: 5,
            style: {
                label: "Orbit Speed",
                slider: true
            }
        });

        style.endGroup();

        style.addButton("Regenerate Planet", () => this.generateSurfaceFeatures(), {
            primary: true,
            fullWidth: true,
            tooltip: "Regenerate the planet surface with current settings"
        });
    }

    start() {
        this.velocity = { x: 0, y: 0 };
        this.surfaceRotation = this.seededRandom() * 360;
        this.originalRadius = this.radius;
        this.generateSurfaceFeatures();
        this.findOrbitTarget();

        if (this.orbitTarget) {
            this.initializeOrbit();
        }
    }

    findOrbitTarget() {
        if (!this.orbitTargetName || !window.engine || !window.engine.gameObjects) {
            this.orbitTarget = null;
            return;
        }

        this.orbitTarget = window.engine.gameObjects.find(obj =>
            obj.name === this.orbitTargetName || obj.constructor.name === this.orbitTargetName
        );
    }

    initializeOrbit() {
        if (!this.orbitTarget) return;

        // Calculate initial distance and angle
        const dx = this.gameObject.position.x - this.orbitTarget.position.x;
        const dy = this.gameObject.position.y - this.orbitTarget.position.y;

        this.orbitDistance = Math.sqrt(dx * dx + dy * dy);
        this.orbitAngle = Math.atan2(dy, dx) * 180 / Math.PI;
        this.orbitCenter.x = this.orbitTarget.position.x;
        this.orbitCenter.y = this.orbitTarget.position.y;
    }

    generateSurfaceFeatures() {
        this.surfaceFeatures = [];

        // Apply water level to continent count and size
        const effectiveContinentCount = Math.max(1, Math.floor(this.continentCount * (1 - this.waterLevel + 0.3)));
        const waterSizeReduction = this.waterLevel * 0.5; // Water level reduces land size

        // Generate continents with longitude/latitude positioning for 3D rotation
        for (let i = 0; i < effectiveContinentCount; i++) {
            const continent = {
                longitude: (i / effectiveContinentCount) * 360 + (this.seededRandom() - 0.5) * 60,
                latitude: (this.seededRandom() - 0.5) * 120,
                size: (this.continentSize - waterSizeReduction) * this.continentScale * (0.7 + this.seededRandom() * 0.6),
                points: [],
                smoothPoints: [], // New: Smoothed bezier control points
                islandClusters: []
            };

            // Ensure minimum size
            continent.size = Math.max(0.1, continent.size);

            // Generate main continent outline points with concave variations
            const pointCount = 8 + Math.floor(this.seededRandom() * 8);
            for (let j = 0; j < pointCount; j++) {
                const pointAngle = (j / pointCount) * 360;
                const baseRadius = this.radius * continent.size * 0.4 * this.continentScale;
                const radiusVariation = baseRadius * this.coastlineRoughness * (this.seededRandom() - 0.5);

                // Add concave potential - some points can be pulled inward
                const concaveChance = this.seededRandom();
                let radius = baseRadius + radiusVariation;

                if (concaveChance < this.concaveStrength) {
                    // Make this point concave (pulled inward)
                    const concaveAmount = this.seededRandom() * 0.5 + 0.2; // 20-70% inward
                    radius = radius * (1 - concaveAmount);
                }

                radius = Math.max(baseRadius * 0.2, radius); // Ensure minimum radius

                continent.points.push({
                    angle: pointAngle,
                    radius: radius
                });
            }

            // Generate smooth bezier control points
            continent.smoothPoints = this.generateSmoothPoints(continent.points);

            // Generate smaller island clusters (reduced by water level)
            const maxIslands = Math.max(1, Math.floor((2 + Math.floor(this.seededRandom() * 4)) * (1 - this.waterLevel + 0.2)));
            for (let k = 0; k < maxIslands; k++) {
                const island = {
                    longitude: continent.longitude + (this.seededRandom() - 0.5) * 60,
                    latitude: continent.latitude + (this.seededRandom() - 0.5) * 40,
                    size: continent.size * (0.4 + this.seededRandom() * 0.5) * this.continentScale * (1 - waterSizeReduction),
                    points: [],
                    smoothPoints: [] // New: Smoothed bezier control points
                };

                // Ensure minimum island size
                island.size = Math.max(0.05, island.size);

                const islandPoints = 4 + Math.floor(this.seededRandom() * 4);
                for (let l = 0; l < islandPoints; l++) {
                    const pointAngle = (l / islandPoints) * 360;
                    const baseRadius = this.radius * island.size * 0.25 * this.continentScale;
                    const radiusVariation = baseRadius * 0.5 * (this.seededRandom() - 0.5);

                    // Add concave potential for islands too
                    const concaveChance = this.seededRandom();
                    let radius = baseRadius + radiusVariation;

                    if (concaveChance < this.concaveStrength * 0.7) { // Islands have less concave chance
                        const concaveAmount = this.seededRandom() * 0.4 + 0.1; // 10-50% inward for islands
                        radius = radius * (1 - concaveAmount);
                    }

                    radius = Math.max(baseRadius * 0.3, radius);

                    island.points.push({
                        angle: pointAngle,
                        radius: radius
                    });
                }

                // Generate smooth points for islands
                island.smoothPoints = this.generateSmoothPoints(island.points);

                continent.islandClusters.push(island);
            }

            this.surfaceFeatures.push(continent);
        }
    }

    /**
     * Generate smooth bezier control points for natural coastlines
     */
    generateSmoothPoints(points) {
        if (points.length < 3) return points;

        const smoothPoints = [];
        const smoothnessFactor = this.coastlineSmoothness;

        for (let i = 0; i < points.length; i++) {
            const prevPoint = points[(i - 1 + points.length) % points.length];
            const currentPoint = points[i];
            const nextPoint = points[(i + 1) % points.length];

            // Convert to cartesian for easier calculation
            const prevX = Math.cos(prevPoint.angle * Math.PI / 180) * prevPoint.radius;
            const prevY = Math.sin(prevPoint.angle * Math.PI / 180) * prevPoint.radius;
            const currX = Math.cos(currentPoint.angle * Math.PI / 180) * currentPoint.radius;
            const currY = Math.sin(currentPoint.angle * Math.PI / 180) * currentPoint.radius;
            const nextX = Math.cos(nextPoint.angle * Math.PI / 180) * nextPoint.radius;
            const nextY = Math.sin(nextPoint.angle * Math.PI / 180) * nextPoint.radius;

            // Calculate control points for bezier curves
            const cp1Distance = smoothnessFactor * 0.3;
            const cp2Distance = smoothnessFactor * 0.3;

            // Direction vectors
            const prevToCurr = { x: currX - prevX, y: currY - prevY };
            const currToNext = { x: nextX - currX, y: nextY - currY };

            // Normalize and scale
            const len1 = Math.sqrt(prevToCurr.x * prevToCurr.x + prevToCurr.y * prevToCurr.y);
            const len2 = Math.sqrt(currToNext.x * currToNext.x + currToNext.y * currToNext.y);

            if (len1 > 0) {
                prevToCurr.x /= len1;
                prevToCurr.y /= len1;
            }
            if (len2 > 0) {
                currToNext.x /= len2;
                currToNext.y /= len2;
            }

            // Calculate control points
            const controlPoint1 = {
                x: currX - prevToCurr.x * cp1Distance * currentPoint.radius,
                y: currY - prevToCurr.y * cp1Distance * currentPoint.radius
            };

            const controlPoint2 = {
                x: currX + currToNext.x * cp2Distance * currentPoint.radius,
                y: currY + currToNext.y * cp2Distance * currentPoint.radius
            };

            smoothPoints.push({
                point: { x: currX, y: currY },
                controlPoint1: controlPoint1,
                controlPoint2: controlPoint2,
                angle: currentPoint.angle,
                radius: currentPoint.radius
            });
        }

        return smoothPoints;
    }

    /**
     * Damage the planet
     */
    takeDamage(amount) {
        if (this.isDestroying) return;

        this.health -= amount;

        if (this.health <= 0) {
            this.health = 0;
            this.startDestruction();
        }
    }

    /**
     * Heal the planet
     */
    heal(amount) {
        if (this.isDestroying) return;

        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    /**
     * Start the destruction sequence
     */
    startDestruction() {
        this.isDestroying = true;
    }

    loop(deltaTime) {
        // Handle destruction
        if (this.isDestroying) {
            this.updateDestruction(deltaTime);
            return;
        }

        this.updateRotation(deltaTime);
        this.updateOrbit(deltaTime);
        //this.updatePlanetInteractions(deltaTime);
        this.applyGravityToObjects(deltaTime);

        if (this.affectedObjects.size > 100) this.affectedObjects.clear();
    }

    updateDestruction(deltaTime) {
        // Spin the game object
        this.gameObject.angle += this.destroyRotationSpeed * deltaTime;

        // Shrink the planet
        this.radius -= this.shrinkSpeed * deltaTime;

        // Destroy when too small
        if (this.radius <= 0) {
            if (this.gameObject && this.gameObject.destroy) {
                this.gameObject.destroy();
            }
        }
    }

    updateRotation(deltaTime) {
        this.surfaceRotation += this.rotationSpeed * deltaTime;
        while (this.surfaceRotation >= 360) this.surfaceRotation -= 360;
        while (this.surfaceRotation < 0) this.surfaceRotation += 360;
    }

    updateOrbit(deltaTime) {
        if (!this.orbitTarget || this.orbitDistance === 0) return;

        // Update orbit center to follow target
        this.orbitCenter.x = this.orbitTarget.position.x;
        this.orbitCenter.y = this.orbitTarget.position.y;

        // Update orbital position
        this.orbitAngle += this.orbitSpeed * deltaTime;
        while (this.orbitAngle >= 360) this.orbitAngle -= 360;
        while (this.orbitAngle < 0) this.orbitAngle += 360;

        // Calculate new position
        const angleRad = this.orbitAngle * Math.PI / 180;
        const targetX = this.orbitCenter.x + Math.cos(angleRad) * this.orbitDistance;
        const targetY = this.orbitCenter.y + Math.sin(angleRad) * this.orbitDistance;

        // Improved smooth movement for low orbit speeds
        const dx = targetX - this.gameObject.position.x;
        const dy = targetY - this.gameObject.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0.1) { // Reduced threshold for smoother movement
            // Adaptive move speed based on orbit speed and distance
            const baseSpeed = Math.abs(this.orbitSpeed) * 10; // Base speed proportional to orbit speed
            const distanceBasedSpeed = Math.min(distance * 5, baseSpeed * 2); // Speed based on distance
            const moveSpeed = Math.max(baseSpeed, distanceBasedSpeed); // Use the higher of the two

            const moveX = (dx / distance) * moveSpeed * deltaTime;
            const moveY = (dy / distance) * moveSpeed * deltaTime;

            // Apply smooth interpolation for very small movements
            if (distance < 2) {
                const lerpFactor = Math.min(1, deltaTime * 10); // Smooth interpolation
                this.gameObject.position.x += moveX * lerpFactor;
                this.gameObject.position.y += moveY * lerpFactor;
            } else {
                this.gameObject.position.x += moveX;
                this.gameObject.position.y += moveY;
            }
        }
    }

    updatePlanetInteractions(deltaTime) {
        if (!window.engine || !window.engine.gameObjects) return;

        // Get effective detection radius considering GameObject scale
        const gameObjectScale = this.gameObject.scale || 1;
        const effectiveDetectionRadius = this.planetDetectionRadius * gameObjectScale;

        // Find other planets within detection range
        const otherPlanets = window.engine.gameObjects.filter(obj => {
            if (obj === this.gameObject) return false;
            const planetModule = obj.getModule("AsteroidsPlanet");
            if (!planetModule) return false;

            const dx = obj.position.x - this.gameObject.position.x;
            const dy = obj.position.y - this.gameObject.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            return distance <= effectiveDetectionRadius;
        });

        // Apply gravitational forces between planets
        for (const otherPlanet of otherPlanets) {
            const otherPlanetModule = otherPlanet.getModule("AsteroidsPlanet");
            if (!otherPlanetModule) continue;

            const dx = otherPlanet.position.x - this.gameObject.position.x;
            const dy = otherPlanet.position.y - this.gameObject.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
                // Calculate gravitational force using Newton's law
                const force = (this.gravitationalConstant * this.mass * otherPlanetModule.mass) / (distance * distance);
                const forceX = (dx / distance) * force * this.planetInteractionStrength * deltaTime;
                const forceY = (dy / distance) * force * this.planetInteractionStrength * deltaTime;

                // Apply force to both planets
                this.velocity.x += forceX / this.mass;
                this.velocity.y += forceY / this.mass;

                otherPlanetModule.velocity.x -= forceX / otherPlanetModule.mass;
                otherPlanetModule.velocity.y -= forceY / otherPlanetModule.mass;
            }
        }

        // Apply velocity (only if not orbiting, or as perturbation to orbit)
        if (!this.orbitTarget) {
            this.gameObject.position.x += this.velocity.x * deltaTime;
            this.gameObject.position.y += this.velocity.y * deltaTime;

            // Apply some damping
            this.velocity.x *= 0.99;
            this.velocity.y *= 0.99;
        } else {
            // If orbiting, apply as small perturbations to orbit distance
            const perturbationStrength = 0.1;
            this.orbitDistance += (this.velocity.x + this.velocity.y) * perturbationStrength * deltaTime;
            this.orbitDistance = Math.max(50, this.orbitDistance); // Minimum orbit distance

            // Dampen velocity
            this.velocity.x *= 0.95;
            this.velocity.y *= 0.95;
        }
    }

    applyGravityToObjects(deltaTime) {
        if (!window.engine || !window.engine.gameObjects || this.gravitationalRange === 0) return;

        // Get effective radius and range considering GameObject scale
        const gameObjectScale = this.gameObject.scale || 1;
        const effectiveRadius = this.radius * gameObjectScale;
        const effectiveGravRange = this.gravitationalRange * gameObjectScale;

        for (const obj of window.engine.gameObjects) {
            if (obj === this.gameObject) continue;

            const dx = obj.position.x - this.gameObject.position.x;
            const dy = obj.position.y - this.gameObject.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > effectiveGravRange + 50) continue; // Quick skip for distant objects

            if (distance > 0 && distance <= effectiveGravRange) {
                // Check for collision with planet surface (using scaled radius)
                if (distance <= effectiveRadius + this.getObjectRadius(obj)) {
                    this.handlePlanetCollision(obj, dx, dy, distance, effectiveRadius);
                    continue;
                }

                // Calculate gravitational force (fixed formula - removed extra mass term)
                const force = (this.gravitationalConstant * this.mass) / Math.max(distance * distance, 100); // Prevent division by zero
                const forceX = -(dx / distance) * force * deltaTime;
                const forceY = -(dy / distance) * force * deltaTime;

                // Apply to objects with velocity - EXPANDED MODULE DETECTION
                let targetModule = null;
                let hasVelocity = false;

                // Check for common module types that should have physics
                const moduleTypes = [
                    "PlayerShip", "EnemyShip", "BasicPhysics", "AsteroidsBullet",
                    "Asteroid", "Ship", "Projectile", "Physics", "Movement"
                ];

                for (const moduleType of moduleTypes) {
                    const module = obj.getModule(moduleType);
                    if (module && module.velocity) {
                        targetModule = module;
                        hasVelocity = true;
                        break;
                    }
                }

                // Fallback: check if object itself has velocity
                if (!hasVelocity && obj.velocity) {
                    targetModule = obj;
                    hasVelocity = true;
                }

                // Fallback: try to find ANY module with velocity property
                if (!hasVelocity && obj.modules) {
                    for (const module of obj.modules) {
                        if (module && typeof module.velocity === 'object' && module.velocity.x !== undefined) {
                            targetModule = module;
                            hasVelocity = true;
                            break;
                        }
                    }
                }

                if (hasVelocity && targetModule) {
                    const mass = targetModule.mass || 1;

                    // Ensure velocity object exists
                    if (!targetModule.velocity) {
                        targetModule.velocity = { x: 0, y: 0 };
                    }

                    // Apply gravitational force
                    targetModule.velocity.x += forceX / mass;
                    targetModule.velocity.y += forceY / mass;

                    this.affectedObjects.add(obj);

                    // Debug logging (remove in production)
                    //if (window.engine) {
                        console.log(`Applying gravity to ${obj.name || obj.constructor.name}: force=${force.toFixed(2)}, distance=${distance.toFixed(2)}`);
                    //}
                }
            }
        }
    }

    shouldApplyGravityTo(obj) {
        // Skip if it's the planet itself
        if (obj === this.gameObject) return false;

        // Skip other planets to avoid conflicts
        if (obj.getModule("AsteroidsPlanet")) return false;

        // Check for modules that typically have physics
        const physicsModules = [
            "PlayerShip", "EnemyShip", "BasicPhysics", "AsteroidsBullet",
            "Asteroid", "Ship", "Projectile", "Physics", "Movement"
        ];

        for (const moduleType of physicsModules) {
            const module = obj.getModule(moduleType);
            if (module && (module.velocity || module.position)) {
                return true;
            }
        }

        // Check if object itself has velocity
        if (obj.velocity && typeof obj.velocity === 'object') {
            return true;
        }

        return false;
    }

    // Optional: Add this method to create a gravity field visualization for debugging
    drawGravityField(ctx) {
        if (!window.engine || !window.engine.debug) return;

        const gameObjectScale = this.gameObject.scale || 1;
        const effectiveGravRange = this.gravitationalRange * gameObjectScale;

        // Draw gravity field strength visualization
        ctx.save();
        ctx.globalAlpha = 0.1;

        const steps = 8;
        for (let i = 1; i <= steps; i++) {
            const radius = (effectiveGravRange / steps) * i;
            const strength = this.gravitationalConstant * this.mass / (radius * radius);
            const intensity = Math.min(1, strength / 100); // Normalize

            ctx.strokeStyle = `rgba(255, 255, 0, ${intensity})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.gameObject.position.x, this.gameObject.position.y, radius, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Get the collision radius of an object
     */
    getObjectRadius(obj) {
        const shipModule = obj.getModule("PlayerShip") || obj.getModule("EnemyShip");
        if (shipModule) {
            return shipModule.shipSize || 10;
        }

        const bulletModule = obj.getModule("AsteroidsBullet");
        if (bulletModule) {
            return bulletModule.size || 2;
        }

        return 5; // Default radius
    }

    /**
     * Handle collision between an object and the planet surface
     */
    handlePlanetCollision(obj, dx, dy, distance, effectiveRadius = null) {
        const shipModule = obj.getModule("PlayerShip") || obj.getModule("EnemyShip");
        const bulletModule = obj.getModule("AsteroidsBullet");

        // Use effective radius if provided, otherwise calculate it
        const gameObjectScale = this.gameObject.scale || 1;
        const planetRadius = effectiveRadius || (this.radius * gameObjectScale);
        const objectRadius = this.getObjectRadius(obj);

        if (shipModule && shipModule.velocity) {
            // Calculate bounce direction (away from planet center)
            const normalX = dx / distance;
            const normalY = dy / distance;

            // Calculate approach velocity
            const approachVelocityX = shipModule.velocity.x * normalX;
            const approachVelocityY = shipModule.velocity.y * normalY;
            const approachSpeed = Math.abs(approachVelocityX + approachVelocityY);

            // Calculate bounce strength with restitution
            const restitution = 0.6; // Bounce dampening factor
            const bounceStrength = Math.max(50, approachSpeed * restitution);

            // Apply bounce velocity
            shipModule.velocity.x = normalX * bounceStrength;
            shipModule.velocity.y = normalY * bounceStrength;

            // Push object outside planet radius
            const pushDistance = (planetRadius + objectRadius) - distance + 2;
            obj.position.x += normalX * pushDistance;
            obj.position.y += normalY * pushDistance;

            // Optional: Take damage from collision
            if (shipModule.takeDamage) {
                const collisionDamage = Math.min(15, Math.max(2, approachSpeed * 0.1));
                shipModule.takeDamage(collisionDamage);
            }

        } else if (bulletModule && bulletModule.velocity) {
            // Bullets bounce with reduced velocity
            const normalX = dx / distance;
            const normalY = dy / distance;

            const approachVelocityX = bulletModule.velocity.x * normalX;
            const approachVelocityY = bulletModule.velocity.y * normalY;
            const approachSpeed = Math.abs(approachVelocityX + approachVelocityY);

            const restitution = 0.4; // Less bouncy for bullets
            const bounceStrength = approachSpeed * restitution;

            bulletModule.velocity.x = normalX * bounceStrength;
            bulletModule.velocity.y = normalY * bounceStrength;

            // Push bullet outside planet radius
            const pushDistance = (planetRadius + objectRadius) - distance + 1;
            obj.position.x += normalX * pushDistance;
            obj.position.y += normalY * pushDistance;

            // Reduce bullet damage/lifetime on bounce
            if (bulletModule.damage) {
                bulletModule.damage -= 1;
                if (bulletModule.damage <= 0 && obj.destroy) {
                    obj.destroy();
                }
            }
        }
    }

    draw(ctx) {
        ctx.save();

        // Draw atmospheric glow first (behind planet)
        if (this.enableAtmosphericGlow && this.atmosphericGlowSize > 0) {
            this.drawAtmosphericGlow(ctx);
        }

        // Draw planet base with water level affecting the base color
        const waterAlpha = 0.3 + (this.waterLevel * 0.7); // More water = more blue
        ctx.fillStyle = this.waterColor;
        ctx.globalAlpha = waterAlpha;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Draw underlying planet color (less visible with more water)
        const planetAlpha = 1 - (this.waterLevel * 0.5);
        ctx.fillStyle = this.planetColor;
        ctx.globalAlpha = planetAlpha;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        if (this.use3DRotation) {
            this.draw3DRotatingPlanet(ctx);
        } else {
            this.drawSimplePlanet(ctx);
        }

        // Draw planet outline
        ctx.strokeStyle = this.planetColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw health indicator if damaged
        if (this.health < this.maxHealth) {
            const healthPercent = this.health / this.maxHealth;
            const barWidth = this.radius * 1.5;
            const barHeight = 4;
            const barY = -this.radius - 15;

            // Background
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);

            // Health bar
            ctx.fillStyle = healthPercent > 0.5 ? "#4CAF50" : healthPercent > 0.25 ? "#FF9800" : "#F44336";
            ctx.fillRect(-barWidth / 2, barY, barWidth * healthPercent, barHeight);

            // Border
            ctx.strokeStyle = "white";
            ctx.lineWidth = 1;
            ctx.strokeRect(-barWidth / 2, barY, barWidth, barHeight);
        }

        ctx.restore();

        this.drawGravityField(ctx); // Optional: visualize gravity field for debugging
    }

    /**
     * Draw atmospheric glow effect
     */
    drawAtmosphericGlow(ctx) {
        // Ensure we have valid values for scale and radius
        const gameObjectScale = (this.gameObject && typeof this.gameObject.scale === 'number' && isFinite(this.gameObject.scale))
            ? this.gameObject.scale
            : 1;

        const baseRadius = typeof this.radius === 'number' && isFinite(this.radius) ? this.radius : 50;
        const glowSize = typeof this.atmosphericGlowSize === 'number' && isFinite(this.atmosphericGlowSize)
            ? this.atmosphericGlowSize
            : 0.3;

        const innerRadius = baseRadius * gameObjectScale;
        const glowRadius = innerRadius * (1 + glowSize);

        // Additional safety check for finite values
        if (!isFinite(innerRadius) || !isFinite(glowRadius) || innerRadius <= 0 || glowRadius <= 0) {
            return; // Skip drawing if we have invalid values
        }

        // Create radial gradient for glow effect
        const gradient = ctx.createRadialGradient(0, 0, innerRadius, 0, 0, glowRadius);

        // Parse the glow color to add alpha
        const glowColor = this.atmosphericGlowColor;
        let r, g, b;

        if (glowColor && glowColor.startsWith('#')) {
            const hex = glowColor.slice(1);
            if (hex.length >= 6) {
                r = parseInt(hex.substr(0, 2), 16);
                g = parseInt(hex.substr(2, 2), 16);
                b = parseInt(hex.substr(4, 2), 16);
            } else {
                // Fallback for invalid hex
                r = 135; g = 206; b = 235;
            }
        } else {
            // Fallback to sky blue if color parsing fails
            r = 135; g = 206; b = 235;
        }

        // Ensure intensity is valid
        const intensity = typeof this.atmosphericGlowIntensity === 'number' && isFinite(this.atmosphericGlowIntensity)
            ? Math.max(0, Math.min(1, this.atmosphericGlowIntensity))
            : 0.5;

        // Create gradient stops
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${intensity * 0.1})`);
        gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${intensity * 0.05})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Draw 3D rotating planet with smooth perlin noise animation
     */
    draw3DRotatingPlanet(ctx) {
        const currentTime = Date.now() * 0.001;
        const rotationOffset = this.surfaceRotation; // Current rotation in degrees

        // Convert rotation to a 0-1 cycle for seamless looping
        const rotationCycle = (rotationOffset % 360) / 360;

        ctx.fillStyle = this.landColor;

        // Draw each continent and its islands
        for (const continent of this.surfaceFeatures) {
            this.drawContinentWithRotation(ctx, continent, rotationCycle, currentTime);

            // Draw island clusters
            for (const island of continent.islandClusters) {
                this.drawIslandWithRotation(ctx, island, rotationCycle, currentTime);
            }
        }

        // Add atmospheric effects with perlin noise
        this.drawAtmosphericEffects(ctx, rotationCycle, currentTime);
    }

    /**
     * Draw a continent with 3D rotation effect
     */
    drawContinentWithRotation(ctx, continent, rotationCycle, currentTime) {
        const position = this.calculate3DPosition(continent.longitude, continent.latitude, rotationCycle);

        // Improved visibility threshold for continents
        if (position.visibility <= 0.15) return;

        // Smoother visibility with wider transition range
        const smoothVisibility = this.smoothStep(0.15, 0.85, position.visibility);

        // Reduced noise for smoother movement
        const noiseTime = currentTime * 0.01; // Slower for stability
        const noiseX = this.fractalNoise(
            continent.longitude * 0.003, // Much lower frequency
            continent.latitude * 0.003,
            noiseTime
        ) * this.noiseStrength * this.radius * 0.01; // Smaller amplitude

        const noiseY = this.fractalNoise(
            continent.longitude * 0.003 + 100,
            continent.latitude * 0.003 + 100,
            noiseTime
        ) * this.noiseStrength * this.radius * 0.01;

        const finalX = position.screenX + noiseX;
        const finalY = position.screenY + noiseY;

        ctx.save();
        ctx.translate(finalX, finalY);
        ctx.scale(position.scale, position.scale);
        ctx.globalAlpha = smoothVisibility * 0.99; // Slightly reduced max opacity

        // Draw continent shape with smooth bezier curves
        if (continent.smoothPoints && continent.smoothPoints.length > 0) {
            ctx.beginPath();
            const firstPoint = continent.smoothPoints[0];
            ctx.moveTo(firstPoint.point.x, firstPoint.point.y);

            for (let i = 0; i < continent.smoothPoints.length; i++) {
                const currentPoint = continent.smoothPoints[i];
                const nextPoint = continent.smoothPoints[(i + 1) % continent.smoothPoints.length];

                // Use bezier curve to next point
                ctx.bezierCurveTo(
                    currentPoint.controlPoint2.x, currentPoint.controlPoint2.y,
                    nextPoint.controlPoint1.x, nextPoint.controlPoint1.y,
                    nextPoint.point.x, nextPoint.point.y
                );
            }

            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Draw an island with 3D rotation effect
     */
    drawIslandWithRotation(ctx, island, rotationCycle, currentTime) {
        const position = this.calculate3DPosition(island.longitude, island.latitude, rotationCycle);

        // Increased visibility threshold and improved smoothing
        if (position.visibility <= 0.25) return;

        // Much smoother visibility transition with wider range
        const smoothVisibility = this.smoothStep(0.25, 0.9, position.visibility);

        // Reduced noise frequency and amplitude to prevent jittery movement
        const noiseTime = currentTime * 0.005; // Much slower animation
        const noiseOffset = this.fractalNoise(
            island.longitude * 0.005, // Much lower frequency
            island.latitude * 0.005,
            noiseTime
        ) * this.noiseStrength * this.radius * 0.005; // Much smaller amplitude

        ctx.save();
        ctx.translate(position.screenX + noiseOffset, position.screenY);
        ctx.scale(position.scale * 0.8, position.scale * 0.8);
        ctx.globalAlpha = smoothVisibility * 0.7; // Reduced max opacity

        // Draw island shape with smooth bezier curves
        if (island.smoothPoints && island.smoothPoints.length > 0) {
            ctx.beginPath();
            const firstPoint = island.smoothPoints[0];
            ctx.moveTo(firstPoint.point.x, firstPoint.point.y);

            for (let i = 0; i < island.smoothPoints.length; i++) {
                const currentPoint = island.smoothPoints[i];
                const nextPoint = island.smoothPoints[(i + 1) % island.smoothPoints.length];

                // Use bezier curve to next point
                ctx.bezierCurveTo(
                    currentPoint.controlPoint2.x, currentPoint.controlPoint2.y,
                    nextPoint.controlPoint1.x, nextPoint.controlPoint1.y,
                    nextPoint.point.x, nextPoint.point.y
                );
            }

            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Draw atmospheric effects and cloud patterns
     */
    drawAtmosphericEffects(ctx, rotationCycle, currentTime) {
        ctx.globalAlpha = 0.15; // Reduced opacity
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";

        // Generate cloud bands that move with different speeds
        for (let i = 0; i < 3; i++) {
            const cloudSpeed = 0.3 + (i * 0.1); // Slower cloud speeds
            const cloudRotation = rotationCycle * cloudSpeed;
            const cloudLongitude = (cloudRotation * 360 + i * 120) % 360;
            const cloudLatitude = (i - 1) * 40;

            const position = this.calculate3DPosition(cloudLongitude, cloudLatitude, 0);

            // Higher visibility threshold for clouds
            if (position.visibility > 0.3) {
                const cloudNoise = this.fractalNoise(
                    cloudLongitude * 0.01, // Lower frequency
                    cloudLatitude * 0.01,
                    currentTime * 0.05 + i // Slower animation
                );

                if (cloudNoise > 0.2) { // Higher threshold
                    const cloudSize = (cloudNoise - 0.2) * this.radius * 0.1 * position.scale;
                    const cloudAlpha = position.visibility * 0.2; // Reduced opacity

                    ctx.save();
                    ctx.globalAlpha = cloudAlpha;
                    ctx.beginPath();
                    ctx.arc(position.screenX, position.screenY, cloudSize, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }
        }

        ctx.globalAlpha = 1.0;
    }

    /**
     * Simple 2D planet drawing (fallback)
     */
    drawSimplePlanet(ctx) {
        ctx.fillStyle = this.landColor;
        for (const continent of this.surfaceFeatures) {
            const continentAngle = continent.longitude + this.surfaceRotation;
            const continentX = Math.cos(continentAngle * Math.PI / 180) * this.radius * 0.7;
            const continentY = Math.sin(continentAngle * Math.PI / 180) * this.radius * 0.7;

            ctx.save();
            ctx.translate(continentX, continentY);

            ctx.beginPath();
            if (continent.points.length > 0) {
                const firstPoint = continent.points[0];
                const firstX = Math.cos(firstPoint.angle * Math.PI / 180) * firstPoint.radius * continent.size;
                const firstY = Math.sin(firstPoint.angle * Math.PI / 180) * firstPoint.radius * continent.size;
                ctx.moveTo(firstX, firstY);

                for (let i = 1; i < continent.points.length; i++) {
                    const point = continent.points[i];
                    const x = Math.cos(point.angle * Math.PI / 180) * point.radius * continent.size;
                    const y = Math.sin(point.angle * Math.PI / 180) * point.radius * continent.size;
                    ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
            }

            ctx.restore();
        }
    }

    /**
     * Smooth step function for better transitions
     */
    smoothStep(edge0, edge1, x) {
        const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        // Use smoother curve for less abrupt transitions
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    /**
     * Calculate 3D position and visibility for a given longitude/latitude
     */
    calculate3DPosition(longitude, latitude, rotationCycle) {
        // Calculate the current longitude position
        const currentLongitude = longitude + (rotationCycle * 360);
        const normalizedLongitude = ((currentLongitude % 360) + 360) % 360;

        // Convert to radians
        const longitudeRad = (normalizedLongitude * Math.PI) / 180;
        const latitudeRad = (latitude * Math.PI) / 180;

        // 3D to 2D projection (orthographic projection)
        const x3d = Math.cos(latitudeRad) * Math.sin(longitudeRad);
        const y3d = Math.sin(latitudeRad);
        const z3d = Math.cos(latitudeRad) * Math.cos(longitudeRad);

        // Calculate screen position
        const screenX = x3d * this.radius * 0.8;
        const screenY = y3d * this.radius * 0.8;

        // Calculate distance from center for edge fading
        const distanceFromCenter = Math.sqrt(screenX * screenX + screenY * screenY);
        const maxDistance = this.radius * 0.8;
        const fadeStartDistance = maxDistance * (1 - this.edgeFadeMargin);

        // Calculate visibility with improved smoothness
        let visibility = 0;

        // Reduced visibility threshold for smoother transitions
        const adjustedThreshold = this.visibilityThreshold * 0.5;

        if (z3d > adjustedThreshold) {
            // Much smoother depth visibility curve
            const depthVisibility = (z3d - adjustedThreshold) / (1 - adjustedThreshold);
            visibility = Math.pow(depthVisibility, 0.5); // Even smoother curve

            // Apply edge fading with much smoother transition
            if (distanceFromCenter > fadeStartDistance) {
                const fadeProgress = (distanceFromCenter - fadeStartDistance) / (maxDistance - fadeStartDistance);
                const smoothFade = 1 - Math.pow(fadeProgress, 2.5); // Smoother edge fade
                visibility *= Math.max(0, smoothFade);
            }
        }

        return {
            screenX,
            screenY,
            visibility,
            scale: 0.7 + (visibility * 0.3), // Less dramatic scaling
            z3d,
            distanceFromCenter
        };
    }

    drawGizmos(ctx) {
        if (window.engine && window.engine.debug) {
            const gameObjectScale = this.gameObject.scale || 1;
            const effectiveRadius = this.radius * gameObjectScale;
            const effectiveGravRange = this.gravitationalRange * gameObjectScale;
            const effectiveDetectionRadius = this.planetDetectionRadius * gameObjectScale;

            // Draw gravitational range (scaled)
            ctx.strokeStyle = "rgba(255, 255, 0, 0.3)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.gameObject.position.x, this.gameObject.position.y, effectiveGravRange, 0, Math.PI * 2);
            ctx.stroke();

            // Draw planet detection range (scaled)
            ctx.strokeStyle = "rgba(255, 0, 255, 0.3)";
            ctx.beginPath();
            ctx.arc(this.gameObject.position.x, this.gameObject.position.y, effectiveDetectionRadius, 0, Math.PI * 2);
            ctx.stroke();

            // Draw effective collision radius
            ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
            ctx.beginPath();
            ctx.arc(this.gameObject.position.x, this.gameObject.position.y, effectiveRadius, 0, Math.PI * 2);
            ctx.stroke();

            // Draw orbit information
            if (this.orbitTarget) {
                ctx.strokeStyle = "cyan";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(this.orbitCenter.x, this.orbitCenter.y, this.orbitDistance, 0, Math.PI * 2);
                ctx.stroke();

                // Draw line to orbit center
                ctx.beginPath();
                ctx.moveTo(this.gameObject.position.x, this.gameObject.position.y);
                ctx.lineTo(this.orbitCenter.x, this.orbitCenter.y);
                ctx.stroke();
            }

            // Draw planet info
            ctx.fillStyle = "white";
            ctx.font = "10px Arial";
            ctx.fillText(`Mass: ${this.mass}`, this.gameObject.position.x + effectiveRadius + 5, this.gameObject.position.y - 35);
            ctx.fillText(`Scale: ${gameObjectScale.toFixed(2)}`, this.gameObject.position.x + effectiveRadius + 5, this.gameObject.position.y - 25);
            ctx.fillText(`Health: ${this.health.toFixed(0)}/${this.maxHealth}`, this.gameObject.position.x + effectiveRadius + 5, this.gameObject.position.y - 15);
            ctx.fillText(`Seed: ${this.seed}`, this.gameObject.position.x + effectiveRadius + 5, this.gameObject.position.y - 5);
            ctx.fillText(`Affected: ${this.affectedObjects.size}`, this.gameObject.position.x + effectiveRadius + 5, this.gameObject.position.y + 5);
        }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            mass: this.mass,
            radius: this.radius,
            originalRadius: this.originalRadius,
            gravitationalConstant: this.gravitationalConstant,
            gravitationalRange: this.gravitationalRange,
            orbitTargetName: this.orbitTargetName,
            orbitSpeed: this.orbitSpeed,
            orbitDistance: this.orbitDistance,
            orbitAngle: this.orbitAngle,
            planetDetectionRadius: this.planetDetectionRadius,
            planetInteractionStrength: this.planetInteractionStrength,
            planetColor: this.planetColor,
            waterColor: this.waterColor,
            landColor: this.landColor,
            rotationSpeed: this.rotationSpeed,
            surfaceRotation: this.surfaceRotation,
            seed: this.seed,
            continentCount: this.continentCount,
            continentScale: this.continentScale,
            coastlineSmoothness: this.coastlineSmoothness,
            concaveStrength: this.concaveStrength,
            waterLevel: this.waterLevel,
            use3DRotation: this.use3DRotation,
            noiseScale: this.noiseScale,
            noiseStrength: this.noiseStrength,
            edgeFadeMargin: this.edgeFadeMargin,
            enableAtmosphericGlow: this.enableAtmosphericGlow,
            atmosphericGlowSize: this.atmosphericGlowSize,
            atmosphericGlowColor: this.atmosphericGlowColor,
            atmosphericGlowIntensity: this.atmosphericGlowIntensity,
            health: this.health,
            maxHealth: this.maxHealth,
            isDestroying: this.isDestroying,
            velocity: this.velocity
        };
    }

    fromJSON(data) {
        super.fromJSON(data);

        if (!data) return;

        // Restore all properties with fallback defaults
        this.mass = data.mass ?? 1000;
        this.radius = data.radius ?? 50;
        this.originalRadius = data.originalRadius ?? this.radius;
        this.gravitationalConstant = data.gravitationalConstant ?? 100;
        this.gravitationalRange = data.gravitationalRange ?? 200;
        this.orbitTargetName = data.orbitTargetName ?? "";
        this.orbitSpeed = data.orbitSpeed ?? 30;
        this.orbitDistance = data.orbitDistance ?? 0;
        this.orbitAngle = data.orbitAngle ?? 0;
        this.planetDetectionRadius = data.planetDetectionRadius ?? 300;
        this.planetInteractionStrength = data.planetInteractionStrength ?? 0.5;
        this.planetColor = data.planetColor ?? "#4a90e2";
        this.waterColor = data.waterColor ?? "#2171b5";
        this.landColor = data.landColor ?? "#8fbc8f";
        this.rotationSpeed = data.rotationSpeed ?? 10;
        this.surfaceRotation = data.surfaceRotation ?? 0;
        this.seed = data.seed ?? Math.floor(Math.random() * 1000000);
        this.continentCount = data.continentCount ?? 3;
        this.continentScale = data.continentScale ?? 1.0;
        this.coastlineSmoothness = data.coastlineSmoothness ?? 0.6;
        this.concaveStrength = data.concaveStrength ?? 0.3;
        this.waterLevel = data.waterLevel ?? 0.7;
        this.use3DRotation = data.use3DRotation ?? true;
        this.noiseScale = data.noiseScale ?? 0.1;
        this.noiseStrength = data.noiseStrength ?? 0.3;
        this.edgeFadeMargin = data.edgeFadeMargin ?? 0.2;
        this.visibilityThreshold = data.visibilityThreshold ?? 0.1;
        this.enableAtmosphericGlow = data.enableAtmosphericGlow ?? true;
        this.atmosphericGlowSize = data.atmosphericGlowSize ?? 0.3;
        this.atmosphericGlowColor = data.atmosphericGlowColor ?? "#87CEEB";
        this.atmosphericGlowIntensity = data.atmosphericGlowIntensity ?? 0.5;
        this.health = data.health ?? 100;
        this.maxHealth = data.maxHealth ?? 100;
        this.isDestroying = data.isDestroying ?? false;

        // Restore velocity as object
        if (data.velocity) {
            this.velocity = {
                x: data.velocity.x ?? 0,
                y: data.velocity.y ?? 0
            };
        } else {
            this.velocity = { x: 0, y: 0 };
        }

        // Internal state
        this.affectedObjects = new Set();
        this.orbitTarget = null;
        this.orbitCenter = { x: 0, y: 0 };

        // Re-initialize random generator and surface features
        this.initializeRandomGenerator();
        this.generateSurfaceFeatures();

        // Restore references after all game objects are loaded
        setTimeout(() => {
            this.findOrbitTarget();
            if (this.orbitTarget) this.initializeOrbit();
        }, 0);
    }
}

window.AsteroidsPlanet = AsteroidsPlanet;
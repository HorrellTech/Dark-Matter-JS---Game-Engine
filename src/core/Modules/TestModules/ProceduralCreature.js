class ProceduralCreature extends Module {
    static namespace = "Procedural";
    static description = "Generates procedural creatures with IK locomotion";
    static allowMultiple = false;
    static iconClass = "fas fa-spider";
    static color = "#2d1f3fff";

    constructor() {
        super("ProceduralCreature");

        this.ignoreGameObjectTransform = false;

        // Body properties
        this.bodySegments = 3;
        this.segmentLength = 20;
        this.headSize = 25;
        this.bodyWidth = 18;
        this.tailTaper = 0.6;
        this.segmentSmoothing = 0.15;

        // Leg properties
        this.legPairs = 4;
        this.legSegments = 2;
        this.legLength = 35;
        this.legThickness = 4;
        this.legSpread = 45;
        this.legForwardOffset = 0.3;
        this.legRandomness = 0.15;

        // IK locomotion
        this.stepDistance = 40;
        this.stepHeight = 8;
        this.stepSpeed = 6;
        this.alternateLegs = true;

        // Visual properties
        this.bodyColor = "#3a2f4a";
        this.legColor = "#2d2436";
        this.accentColor = "#6b5a7d";
        this.showEyes = true;
        this.eyeCount = 2;
        this.showJoints = true;

        // Isometric view
        this.isometricAngle = 0;
        this.bodyHeight = 0;

        // Movement
        this.moveSpeed = 80;
        this.targetObject = "";
        this.wanderRadius = 200;
        this.wanderWaitTime = 2;
        this.arrivalThreshold = 20;

        // Head look
        this.headLookEnabled = true;
        this.headLookRange = 150;
        this.headLookSpeed = 3;
        this.headLookObject = "interesting";

        // Internal state
        this._segments = [];
        this._legs = [];
        this._arms = [];
        this._wanderTarget = null;
        this._wanderWaitTimer = 0;
        this._isWaiting = false;
        this._velocity = new Vector2(0, 0);
        this._headAngle = 0;
        this._headTargetAngle = 0;

        // Body customization
        this.bodyShape = "ellipse"; // ellipse, circle, rectangle, triangle
        this.bodyScaleX = 1.0;
        this.bodyScaleY = 1.0;
        this.spinePattern = "none"; // none, spikes, plates, fur
        this.spineSize = 5;
        this.spineCount = 6;

        // Snake movement properties (when legSegments = 0)
        this.snakeWaveAmplitude = 20; // How wide the S-curve is
        this.snakeWaveFrequency = 2.0; // How many waves along the body
        this.snakeWaveSpeed = 3.0; // How fast the wave propagates
        this._snakeWavePhase = 0; // Internal phase for wave animation

        // Leg customization
        this.legJointStyle = "smooth"; // smooth, angular, organic
        this.legTipShape = "circle"; // circle, claw, pad
        this.legOffsetVariation = 0.2; // Vertical offset randomness

        // Head customization
        this.headShape = "ellipse"; // ellipse, triangle, rectangle, diamond
        this.antennaCount = 0;
        this.antennaLength = 15;
        this.mandibles = false;

        // Arm properties
        this.armCount = 2;
        this.armLength = 30;
        this.armThickness = 3;
        this.armSegments = 2;
        this.armReachRange = 100;
        this.armReachSpeed = 4;
        this.armColor = "#2d2436";
        this.armSpringStiffness = 8; // How strongly arms return to rest position
        this.armSpringDamping = 0.7; // How much the spring motion is dampened (0-1)
        this.armRestForwardDistance = 0.8; // How far forward arms rest (0-1 of arm length)
        this.armRestOutwardAngle = 17; // Degrees outward from forward direction

        // Arm animation states
        this.punchSpeed = 8; // Speed of punch animation
        this.punchWindupDistance = 0.3; // How far back to wind up (0-1)
        this.punchReachDistance = 1.2; // How far forward to reach (multiplier of arm length)
        this.punchArcAmount = 25; // Degrees of arc during punch
        this.grabSpeed = 5; // Speed of grab animation
        this.grabHoldTime = 0.5; // How long to hold the grab

        // Arm movement animation
        this.armSwingSpeed = 2.5; // Speed of arm swing when moving
        this.armSwingAmount = 15; // Degrees of swing per arm when moving
        this.armSwingEnabled = true; // Enable/disable arm swing animation

        // Movement patterns
        this.movementStyle = "wander"; // wander, circle, zigzag, patrol
        this.turnSpeed = 180; // degrees per second
        this.acceleration = 300;

        this.accentColor = "#6b5a7d";
        this.eyeColor = "#ffffff";
        this.antennaColor = "#6b5a7d";
        this.mandibleColor = "#6b5a7d";
        this.spineColor = "#6b5a7d";
        this.showEyes = true;

        // Shadow properties
        this.showShadow = true;
        this.shadowOpacity = 0.3;
        this.shadowBlur = 15;
        this.shadowOffsetX = 3;
        this.shadowOffsetY = 5;
        this.shadowColor = "#000000";

        this.isDead = false;
        this.decayTimer = 0;
        this.decayMaxTime = 30.0; // 30 seconds to fully decay
        this.deathPositions = null; // Store segment positions at death
        this.deathAngles = null; // Store segment angles at death
        this.originalScale = 1.0;

        this.generateRandomCreatureBoolean = false;

        this._initializeCreature();

        // Expose properties
        this.exposeProperty("bodySegments", "number", this.bodySegments, {
            onChange: (val) => {
                this.bodySegments = Math.floor(val);
                this._initializeCreature();
            }
        });
        this.exposeProperty("snakeWaveAmplitude", "number", this.snakeWaveAmplitude, {
            onChange: (val) => { this.snakeWaveAmplitude = val; }
        });
        this.exposeProperty("snakeWaveFrequency", "number", this.snakeWaveFrequency, {
            onChange: (val) => { this.snakeWaveFrequency = val; }
        });
        this.exposeProperty("snakeWaveSpeed", "number", this.snakeWaveSpeed, {
            onChange: (val) => { this.snakeWaveSpeed = val; }
        });
        this.exposeProperty("segmentLength", "number", this.segmentLength, {
            onChange: (val) => { this.segmentLength = val; }
        });
        this.exposeProperty("headSize", "number", this.headSize, {
            onChange: (val) => { this.headSize = val; }
        });
        this.exposeProperty("bodyWidth", "number", this.bodyWidth, {
            onChange: (val) => { this.bodyWidth = val; }
        });
        this.exposeProperty("tailTaper", "number", this.tailTaper, {
            onChange: (val) => { this.tailTaper = val; }
        });
        this.exposeProperty("legPairs", "number", this.legPairs, {
            onChange: (val) => {
                this.legPairs = Math.floor(val);
                this._initializeCreature();
            }
        });
        this.exposeProperty("legSegments", "number", this.legSegments, {
            onChange: (val) => {
                this.legSegments = Math.floor(val);
                this._initializeCreature();
            }
        });
        this.exposeProperty("legLength", "number", this.legLength, {
            onChange: (val) => { this.legLength = val; }
        });
        this.exposeProperty("legThickness", "number", this.legThickness, {
            onChange: (val) => { this.legThickness = val; }
        });
        this.exposeProperty("legSpread", "number", this.legSpread, {
            onChange: (val) => { this.legSpread = val; }
        });
        this.exposeProperty("legForwardOffset", "number", this.legForwardOffset, {
            onChange: (val) => { this.legForwardOffset = val; }
        });
        this.exposeProperty("legRandomness", "number", this.legRandomness, {
            onChange: (val) => {
                this.legRandomness = val;
                this._initializeCreature();
            }
        });
        this.exposeProperty("generateRandomCreatureOnStart", "boolean", this.generateRandomCreatureBoolean, {
            description: "Generate a new random creature",
            style: { label: "Generate Random Creature" },
            onChange: (val) => {
                this.generateRandomCreatureBoolean = val;
            }
        });
        this.exposeProperty("stepDistance", "number", this.stepDistance, {
            onChange: (val) => { this.stepDistance = val; }
        });
        this.exposeProperty("stepHeight", "number", this.stepHeight, {
            onChange: (val) => { this.stepHeight = val; }
        });
        this.exposeProperty("stepSpeed", "number", this.stepSpeed, {
            onChange: (val) => { this.stepSpeed = val; }
        });

        this.exposeProperty("armCount", "number", this.armCount, {
            onChange: (val) => {
                this.armCount = Math.floor(val);
                this._initializeCreature();
            }
        });
        this.exposeProperty("armLength", "number", this.armLength, {
            onChange: (val) => { this.armLength = val; }
        });
        this.exposeProperty("armThickness", "number", this.armThickness, {
            onChange: (val) => { this.armThickness = val; }
        });
        this.exposeProperty("armSegments", "number", this.armSegments, {
            onChange: (val) => {
                this.armSegments = Math.floor(val);
                this._initializeCreature();
            }
        });
        this.exposeProperty("armReachRange", "number", this.armReachRange, {
            onChange: (val) => { this.armReachRange = val; }
        });
        this.exposeProperty("armReachSpeed", "number", this.armReachSpeed, {
            onChange: (val) => { this.armReachSpeed = val; }
        });
        this.exposeProperty("armColor", "color", this.armColor, {
            onChange: (val) => { this.armColor = val; }
        });
        this.exposeProperty("armSpringStiffness", "number", this.armSpringStiffness, {
            onChange: (val) => { this.armSpringStiffness = val; }
        });
        this.exposeProperty("armSpringDamping", "number", this.armSpringDamping, {
            onChange: (val) => { this.armSpringDamping = val; }
        });
        this.exposeProperty("armRestForwardDistance", "number", this.armRestForwardDistance, {
            onChange: (val) => { this.armRestForwardDistance = val; }
        });
        this.exposeProperty("armRestOutwardAngle", "number", this.armRestOutwardAngle, {
            onChange: (val) => { this.armRestOutwardAngle = val; }
        });
        this.exposeProperty("armSwingEnabled", "boolean", this.armSwingEnabled, {
            description: "Enable arm swinging when moving",
            style: { label: "Enable Arm Swing" },
            onChange: (val) => { this.armSwingEnabled = val; }
        });

        this.exposeProperty("armSwingSpeed", "number", this.armSwingSpeed, {
            onChange: (val) => { this.armSwingSpeed = val; }
        });
        this.exposeProperty("armSwingAmount", "number", this.armSwingAmount, {
            onChange: (val) => { this.armSwingAmount = val; }
        });
        this.exposeProperty("armSwingEnabled", "boolean", this.armSwingEnabled, {
            onChange: (val) => { this.armSwingEnabled = val; }
        });
        this.exposeProperty("punchSpeed", "number", this.punchSpeed, {
            onChange: (val) => { this.punchSpeed = val; }
        });
        this.exposeProperty("punchWindupDistance", "number", this.punchWindupDistance, {
            onChange: (val) => { this.punchWindupDistance = val; }
        });
        this.exposeProperty("punchReachDistance", "number", this.punchReachDistance, {
            onChange: (val) => { this.punchReachDistance = val; }
        });
        this.exposeProperty("punchArcAmount", "number", this.punchArcAmount, {
            onChange: (val) => { this.punchArcAmount = val; }
        });
        this.exposeProperty("grabSpeed", "number", this.grabSpeed, {
            onChange: (val) => { this.grabSpeed = val; }
        });
        this.exposeProperty("grabHoldTime", "number", this.grabHoldTime, {
            onChange: (val) => { this.grabHoldTime = val; }
        });

        this.exposeProperty("bodyColor", "color", this.bodyColor, {
            onChange: (val) => { this.bodyColor = val; }
        });
        this.exposeProperty("legColor", "color", this.legColor, {
            onChange: (val) => { this.legColor = val; }
        });
        this.exposeProperty("accentColor", "color", this.accentColor, {
            onChange: (val) => { this.accentColor = val; }
        });
        this.exposeProperty("eyeColor", "color", this.eyeColor, {
            onChange: (val) => { this.eyeColor = val; }
        });
        this.exposeProperty("antennaColor", "color", this.antennaColor, {
            onChange: (val) => { this.antennaColor = val; }
        });
        this.exposeProperty("mandibleColor", "color", this.mandibleColor, {
            onChange: (val) => { this.mandibleColor = val; }
        });
        this.exposeProperty("spineColor", "color", this.spineColor, {
            onChange: (val) => { this.spineColor = val; }
        });
        this.exposeProperty("showShadow", "boolean", this.showShadow, {
            onChange: (val) => { this.showShadow = val; }
        });
        this.exposeProperty("shadowOpacity", "number", this.shadowOpacity, {
            onChange: (val) => { this.shadowOpacity = val; }
        });
        this.exposeProperty("shadowBlur", "number", this.shadowBlur, {
            onChange: (val) => { this.shadowBlur = val; }
        });
        this.exposeProperty("shadowOffsetX", "number", this.shadowOffsetX, {
            onChange: (val) => { this.shadowOffsetX = val; }
        });
        this.exposeProperty("shadowOffsetY", "number", this.shadowOffsetY, {
            onChange: (val) => { this.shadowOffsetY = val; }
        });
        this.exposeProperty("shadowColor", "color", this.shadowColor, {
            onChange: (val) => { this.shadowColor = val; }
        });
        this.exposeProperty("isometricAngle", "number", this.isometricAngle, {
            onChange: (val) => { this.isometricAngle = val; }
        });
        this.exposeProperty("bodyHeight", "number", this.bodyHeight, {
            onChange: (val) => { this.bodyHeight = val; }
        });
        this.exposeProperty("moveSpeed", "number", this.moveSpeed, {
            onChange: (val) => { this.moveSpeed = val; }
        });
        this.exposeProperty("targetObject", "string", this.targetObject, {
            onChange: (val) => { this.targetObject = val; }
        });
        this.exposeProperty("wanderRadius", "number", this.wanderRadius, {
            onChange: (val) => { this.wanderRadius = val; }
        });
        this.exposeProperty("wanderWaitTime", "number", this.wanderWaitTime, {
            onChange: (val) => { this.wanderWaitTime = val; }
        });
        this.exposeProperty("headLookEnabled", "boolean", this.headLookEnabled, {
            onChange: (val) => { this.headLookEnabled = val; }
        });
        this.exposeProperty("headLookRange", "number", this.headLookRange, {
            onChange: (val) => { this.headLookRange = val; }
        });
        this.exposeProperty("headLookObject", "string", this.headLookObject, {
            onChange: (val) => { this.headLookObject = val; }
        });
        this.exposeProperty("segmentSmoothing", "number", this.segmentSmoothing, {
            onChange: (val) => { this.segmentSmoothing = val; }
        });
        this.exposeProperty("alternateLegs", "boolean", this.alternateLegs, {
            onChange: (val) => { this.alternateLegs = val; }
        });
        this.exposeProperty("showEyes", "boolean", this.showEyes, {
            onChange: (val) => { this.showEyes = val; }
        });
        this.exposeProperty("eyeCount", "number", this.eyeCount, {
            onChange: (val) => { this.eyeCount = val; }
        });
        this.exposeProperty("showJoints", "boolean", this.showJoints, {
            onChange: (val) => { this.showJoints = val; }
        });
        this.exposeProperty("arrivalThreshold", "number", this.arrivalThreshold, {
            onChange: (val) => { this.arrivalThreshold = val; }
        });
        this.exposeProperty("headLookSpeed", "number", this.headLookSpeed, {
            onChange: (val) => { this.headLookSpeed = val; }
        });
        this.exposeProperty("bodyShape", "enum", this.bodyShape, {
            options: ["ellipse", "circle", "rectangle", "triangle"],
            onChange: (val) => { this.bodyShape = val; }
        });
        this.exposeProperty("bodyScaleX", "number", this.bodyScaleX, {
            onChange: (val) => { this.bodyScaleX = val; }
        });
        this.exposeProperty("bodyScaleY", "number", this.bodyScaleY, {
            onChange: (val) => { this.bodyScaleY = val; }
        });
        this.exposeProperty("spinePattern", "enum", this.spinePattern, {
            options: ["none", "spikes", "plates"],
            onChange: (val) => { this.spinePattern = val; }
        });
        this.exposeProperty("spineSize", "number", this.spineSize, {
            onChange: (val) => { this.spineSize = val; }
        });
        this.exposeProperty("spineCount", "number", this.spineCount, {
            onChange: (val) => { this.spineCount = val; }
        });
        this.exposeProperty("legJointStyle", "enum", this.legJointStyle, {
            options: ["smooth", "angular", "organic"],
            onChange: (val) => { this.legJointStyle = val; }
        });
        this.exposeProperty("legTipShape", "enum", this.legTipShape, {
            options: ["circle", "claw", "pad"],
            onChange: (val) => { this.legTipShape = val; }
        });
        this.exposeProperty("legOffsetVariation", "number", this.legOffsetVariation, {
            onChange: (val) => { this.legOffsetVariation = val; }
        });
        this.exposeProperty("headShape", "enum", this.headShape, {
            options: ["ellipse", "triangle", "rectangle", "diamond"],
            onChange: (val) => { this.headShape = val; }
        });
        this.exposeProperty("antennaCount", "number", this.antennaCount, {
            onChange: (val) => { this.antennaCount = val; }
        });
        this.exposeProperty("antennaLength", "number", this.antennaLength, {
            onChange: (val) => { this.antennaLength = val; }
        });
        this.exposeProperty("mandibles", "boolean", this.mandibles, {
            onChange: (val) => { this.mandibles = val; }
        });
        this.exposeProperty("movementStyle", "enum", this.movementStyle, {
            options: ["wander", "circle", "zigzag", "patrol"],
            onChange: (val) => { this.movementStyle = val; }
        });
        this.exposeProperty("turnSpeed", "number", this.turnSpeed, {
            onChange: (val) => { this.turnSpeed = val; }
        });
        this.exposeProperty("acceleration", "number", this.acceleration, {
            onChange: (val) => { this.acceleration = val; }
        });
        this.exposeProperty("decayMaxTime", "number", this.decayMaxTime, {
            onChange: (val) => { this.decayMaxTime = val; }
        });
        this.exposeProperty("isDead", "boolean", this.isDead, {
            onChange: (val) => { this.isDead = val; }
        });
    }

    style(style) {
        style.startGroup("Body Settings", false, {
            backgroundColor: 'rgba(58,47,74,0.2)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("isDead", "boolean", this.isDead, {
            description: "Toggle creature death and decay",
            style: { label: "Is Dead" }
        });

        style.exposeProperty("decayMaxTime", "number", this.decayMaxTime, {
            description: "Time in seconds for creature to fully decay after death",
            min: 5,
            max: 120,
            step: 1,
            style: { label: "Decay Max Time", slider: true }
        });

        style.exposeProperty("bodySegments", "number", this.bodySegments, {
            description: "Number of body segments (1-10)",
            min: 1,
            max: 10,
            step: 1,
            style: { label: "Body Segments", slider: true },
            onChange: (val) => {
                this.bodySegments = Math.floor(val);
                this._initializeCreature();
            }
        });

        style.exposeProperty("segmentLength", "number", this.segmentLength, {
            description: "Length of each segment",
            min: 10,
            max: 50,
            step: 1,
            style: { label: "Segment Length", slider: true },
            onChange: (val) => { this.segmentLength = val; }
        });

        style.exposeProperty("segmentSmoothing", "number", this.segmentSmoothing, {
            description: "How smoothly body segments follow each other",
            min: 0.01,
            max: 1,
            step: 0.01,
            style: { label: "Segment Smoothing", slider: true },
            onChange: (val) => { this.segmentSmoothing = val; }
        });

        style.exposeProperty("headSize", "number", this.headSize, {
            description: "Size of creature head",
            min: 10,
            max: 60,
            step: 1,
            style: { label: "Head Size", slider: true },
            onChange: (val) => { this.headSize = val; }
        });

        style.exposeProperty("bodyWidth", "number", this.bodyWidth, {
            description: "Width of body segments",
            min: 5,
            max: 40,
            step: 1,
            style: { label: "Body Width", slider: true },
            onChange: (val) => { this.bodyWidth = val; }
        });

        style.exposeProperty("tailTaper", "number", this.tailTaper, {
            description: "How much the tail tapers (0=none, 1=full)",
            min: 0,
            max: 1,
            step: 0.05,
            style: { label: "Tail Taper", slider: true },
            onChange: (val) => { this.tailTaper = val; }
        });

        style.exposeProperty("bodyShape", "enum", this.bodyShape, {
            description: "Shape of body segments",
            options: ["ellipse", "circle", "rectangle", "triangle"],
            style: { label: "Body Shape" },
            onChange: (val) => { this.bodyShape = val; }
        });

        style.exposeProperty("bodyScaleX", "number", this.bodyScaleX, {
            description: "Horizontal body scale",
            min: 0.5,
            max: 2,
            step: 0.1,
            style: { label: "Body Scale X", slider: true },
            onChange: (val) => { this.bodyScaleX = val; }
        });

        style.exposeProperty("bodyScaleY", "number", this.bodyScaleY, {
            description: "Vertical body scale",
            min: 0.5,
            max: 2,
            step: 0.1,
            style: { label: "Body Scale Y", slider: true },
            onChange: (val) => { this.bodyScaleY = val; }
        });

        style.exposeProperty("spinePattern", "enum", this.spinePattern, {
            description: "Pattern on creature's back",
            options: ["none", "spikes", "plates"],
            style: { label: "Spine Pattern" },
            onChange: (val) => { this.spinePattern = val; }
        });

        style.exposeProperty("spineSize", "number", this.spineSize, {
            description: "Size of spine decorations",
            min: 0,
            max: 20,
            step: 1,
            style: { label: "Spine Size", slider: true },
            onChange: (val) => { this.spineSize = val; }
        });

        style.exposeProperty("spineCount", "number", this.spineCount, {
            description: "Number of spine decorations per segment",
            min: 0,
            max: 12,
            step: 1,
            style: { label: "Spine Count", slider: true },
            onChange: (val) => { this.spineCount = val; }
        });

        style.endGroup();

        style.addDivider();

        style.startGroup("Snake Movement (when Leg Segments = 0)", false, {
            backgroundColor: 'rgba(107,90,125,0.2)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("snakeWaveAmplitude", "number", this.snakeWaveAmplitude, {
            description: "Width of the snake's S-curve wave",
            min: 0,
            max: 50,
            step: 1,
            style: { label: "Wave Amplitude", slider: true },
            onChange: (val) => { this.snakeWaveAmplitude = val; }
        });

        style.exposeProperty("snakeWaveFrequency", "number", this.snakeWaveFrequency, {
            description: "Number of wave cycles along the body",
            min: 0.5,
            max: 5,
            step: 0.1,
            style: { label: "Wave Frequency", slider: true },
            onChange: (val) => { this.snakeWaveFrequency = val; }
        });

        style.exposeProperty("snakeWaveSpeed", "number", this.snakeWaveSpeed, {
            description: "Speed of wave propagation",
            min: 0.5,
            max: 10,
            step: 0.5,
            style: { label: "Wave Speed", slider: true },
            onChange: (val) => { this.snakeWaveSpeed = val; }
        });

        style.endGroup();

        style.addDivider();

        style.startGroup("Leg Settings", false, {
            backgroundColor: 'rgba(45,36,54,0.2)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("legPairs", "number", this.legPairs, {
            description: "Number of leg pairs (1-8)",
            min: 1,
            max: 8,
            step: 1,
            style: { label: "Leg Pairs", slider: true },
            onChange: (val) => {
                this.legPairs = Math.floor(val);
                this._initializeCreature();
            }
        });

        style.exposeProperty("legSegments", "number", this.legSegments, {
            description: "Segments per leg (1-4)",
            min: 1,
            max: 4,
            step: 1,
            style: { label: "Leg Segments", slider: true },
            onChange: (val) => {
                this.legSegments = Math.floor(val);
                this._initializeCreature();
            }
        });

        style.exposeProperty("legLength", "number", this.legLength, {
            description: "Length of each leg",
            min: 20,
            max: 100,
            step: 1,
            style: { label: "Leg Length", slider: true },
            onChange: (val) => { this.legLength = val; }
        });

        style.exposeProperty("legThickness", "number", this.legThickness, {
            description: "Thickness of legs",
            min: 1,
            max: 10,
            step: 0.5,
            style: { label: "Leg Thickness", slider: true },
            onChange: (val) => { this.legThickness = val; }
        });

        style.exposeProperty("legSpread", "number", this.legSpread, {
            description: "Angle spread of legs",
            min: 0,
            max: 90,
            step: 1,
            style: { label: "Leg Spread", slider: true },
            onChange: (val) => { this.legSpread = val; }
        });

        style.exposeProperty("legForwardOffset", "number", this.legForwardOffset, {
            description: "How far forward/back legs attach (0=center, 1=forward)",
            min: -1,
            max: 1,
            step: 0.1,
            style: { label: "Leg Position", slider: true },
            onChange: (val) => { this.legForwardOffset = val; }
        });

        style.exposeProperty("legRandomness", "number", this.legRandomness, {
            description: "Random variation in leg length/angle (0-1)",
            min: 0,
            max: 0.5,
            step: 0.05,
            style: { label: "Leg Randomness", slider: true },
            onChange: (val) => {
                this.legRandomness = val;
                this._initializeCreature();
            }
        });

        style.exposeProperty("legJointStyle", "enum", this.legJointStyle, {
            description: "Style of leg joints",
            options: ["smooth", "angular", "organic"],
            style: { label: "Joint Style" },
            onChange: (val) => { this.legJointStyle = val; }
        });

        style.exposeProperty("legTipShape", "enum", this.legTipShape, {
            description: "Shape of leg tips",
            options: ["circle", "claw", "pad"],
            style: { label: "Leg Tip Shape" },
            onChange: (val) => { this.legTipShape = val; }
        });

        style.exposeProperty("legOffsetVariation", "number", this.legOffsetVariation, {
            description: "Vertical offset randomness for legs",
            min: 0,
            max: 1,
            step: 0.05,
            style: { label: "Offset Variation", slider: true },
            onChange: (val) => { this.legOffsetVariation = val; }
        });

        style.endGroup();

        style.addDivider();

        style.startGroup("Arm Settings", false, {
            backgroundColor: 'rgba(107,90,125,0.2)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("armCount", "number", this.armCount, {
            description: "Number of arms (0-4)",
            min: 0,
            max: 4,
            step: 1,
            style: { label: "Arm Count", slider: true },
            onChange: (val) => {
                this.armCount = Math.floor(val);
                this._initializeCreature();
            }
        });

        style.exposeProperty("armSegments", "number", this.armSegments, {
            description: "Segments per arm (1-3)",
            min: 1,
            max: 3,
            step: 1,
            style: { label: "Arm Segments", slider: true },
            onChange: (val) => {
                this.armSegments = Math.floor(val);
                this._initializeCreature();
            }
        });

        style.exposeProperty("armLength", "number", this.armLength, {
            description: "Length of each arm",
            min: 15,
            max: 80,
            step: 1,
            style: { label: "Arm Length", slider: true },
            onChange: (val) => { this.armLength = val; }
        });

        style.exposeProperty("armThickness", "number", this.armThickness, {
            description: "Thickness of arms",
            min: 1,
            max: 8,
            step: 0.5,
            style: { label: "Arm Thickness", slider: true },
            onChange: (val) => { this.armThickness = val; }
        });

        style.exposeProperty("armReachRange", "number", this.armReachRange, {
            description: "Range to reach for objects",
            min: 50,
            max: 200,
            step: 5,
            style: { label: "Reach Range", slider: true },
            onChange: (val) => { this.armReachRange = val; }
        });

        style.exposeProperty("armReachSpeed", "number", this.armReachSpeed, {
            description: "Speed of arm movement",
            min: 1,
            max: 10,
            step: 0.5,
            style: { label: "Reach Speed", slider: true },
            onChange: (val) => { this.armReachSpeed = val; }
        });

        style.exposeProperty("armSpringStiffness", "number", this.armSpringStiffness, {
            description: "How strongly arms return to rest position",
            min: 1,
            max: 20,
            step: 0.5,
            style: { label: "Spring Stiffness", slider: true },
            onChange: (val) => { this.armSpringStiffness = val; }
        });

        style.exposeProperty("armSpringDamping", "number", this.armSpringDamping, {
            description: "How much the spring motion is dampened (0-1)",
            min: 0,
            max: 1,
            step: 0.05,
            style: { label: "Spring Damping", slider: true },
            onChange: (val) => { this.armSpringDamping = val; }
        });

        style.exposeProperty("armRestForwardDistance", "number", this.armRestForwardDistance, {
            description: "How far forward arms rest (0-1 of arm length)",
            min: 0.3,
            max: 1,
            step: 0.05,
            style: { label: "Rest Distance", slider: true },
            onChange: (val) => { this.armRestForwardDistance = val; }
        });

        style.exposeProperty("armRestOutwardAngle", "number", this.armRestOutwardAngle, {
            description: "Degrees outward from forward direction",
            min: 0,
            max: 45,
            step: 1,
            style: { label: "Rest Outward Angle", slider: true },
            onChange: (val) => { this.armRestOutwardAngle = val; }
        });

        style.exposeProperty("armSwingEnabled", "boolean", this.armSwingEnabled, {
            description: "Enable arm swinging when moving",
            style: { label: "Enable Arm Swing" },
            onChange: (val) => { this.armSwingEnabled = val; }
        });

        style.exposeProperty("armSwingSpeed", "number", this.armSwingSpeed, {
            description: "Speed of arm swing animation",
            min: 0.5,
            max: 10,
            step: 0.5,
            style: { label: "Swing Speed", slider: true },
            onChange: (val) => { this.armSwingSpeed = val; }
        });

        style.exposeProperty("armSwingAmount", "number", this.armSwingAmount, {
            description: "Amount of arm swing in degrees",
            min: 0,
            max: 45,
            step: 1,
            style: { label: "Swing Amount", slider: true },
            onChange: (val) => { this.armSwingAmount = val; }
        });

        style.endGroup();

        style.startGroup("Arm Combat Settings", false, {
            backgroundColor: 'rgba(107,90,125,0.2)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("punchSpeed", "number", this.punchSpeed, {
            description: "Speed of punch animation",
            min: 1,
            max: 20,
            step: 0.5,
            style: { label: "Punch Speed", slider: true },
            onChange: (val) => { this.punchSpeed = val; }
        });

        style.exposeProperty("punchWindupDistance", "number", this.punchWindupDistance, {
            description: "How far back to wind up before punch (0-1)",
            min: 0,
            max: 1,
            step: 0.05,
            style: { label: "Punch Windup", slider: true },
            onChange: (val) => { this.punchWindupDistance = val; }
        });

        style.exposeProperty("punchReachDistance", "number", this.punchReachDistance, {
            description: "How far forward to reach during punch",
            min: 0.8,
            max: 2,
            step: 0.1,
            style: { label: "Punch Reach", slider: true },
            onChange: (val) => { this.punchReachDistance = val; }
        });

        style.exposeProperty("punchArcAmount", "number", this.punchArcAmount, {
            description: "Arc/curve amount during punch in degrees",
            min: 0,
            max: 60,
            step: 1,
            style: { label: "Punch Arc", slider: true },
            onChange: (val) => { this.punchArcAmount = val; }
        });

        style.exposeProperty("grabSpeed", "number", this.grabSpeed, {
            description: "Speed of grab animation",
            min: 1,
            max: 15,
            step: 0.5,
            style: { label: "Grab Speed", slider: true },
            onChange: (val) => { this.grabSpeed = val; }
        });

        style.exposeProperty("grabHoldTime", "number", this.grabHoldTime, {
            description: "How long to hold during grab (seconds)",
            min: 0,
            max: 3,
            step: 0.1,
            style: { label: "Grab Hold Time", slider: true },
            onChange: (val) => { this.grabHoldTime = val; }
        });

        style.endGroup();

        style.addDivider();

        style.startGroup("IK Locomotion", false, {
            backgroundColor: 'rgba(107,90,125,0.2)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("stepDistance", "number", this.stepDistance, {
            description: "Distance before leg takes a step",
            min: 20,
            max: 100,
            step: 1,
            style: { label: "Step Distance", slider: true },
            onChange: (val) => { this.stepDistance = val; }
        });

        style.exposeProperty("stepHeight", "number", this.stepHeight, {
            description: "Height of step arc",
            min: 0,
            max: 30,
            step: 1,
            style: { label: "Step Height", slider: true },
            onChange: (val) => { this.stepHeight = val; }
        });

        style.exposeProperty("stepSpeed", "number", this.stepSpeed, {
            description: "Speed of stepping animation",
            min: 1,
            max: 15,
            step: 0.5,
            style: { label: "Step Speed", slider: true },
            onChange: (val) => { this.stepSpeed = val; }
        });

        style.exposeProperty("alternateLegs", "boolean", this.alternateLegs, {
            description: "Alternate leg movement for realistic gait",
            style: { label: "Alternate Legs" },
            onChange: (val) => { this.alternateLegs = val; }
        });

        style.endGroup();

        style.addDivider();

        style.startGroup("Appearance", false, {
            backgroundColor: 'rgba(58,47,74,0.2)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("bodyColor", "color", this.bodyColor, {
            description: "Main body color",
            style: { label: "Body Color" },
            onChange: (val) => { this.bodyColor = val; }
        });

        style.exposeProperty("legColor", "color", this.legColor, {
            description: "Leg color",
            style: { label: "Leg Color" },
            onChange: (val) => { this.legColor = val; }
        });

        style.exposeProperty("armColor", "color", this.armColor, {
            description: "Arm color",
            style: { label: "Arm Color" },
            onChange: (val) => { this.armColor = val; }
        });

        style.exposeProperty("accentColor", "color", this.accentColor, {
            description: "Accent/joint color",
            style: { label: "Accent Color" },
            onChange: (val) => { this.accentColor = val; }
        });

        style.exposeProperty("eyeColor", "color", this.eyeColor, {
            description: "Eye color",
            style: { label: "Eye Color" },
            onChange: (val) => { this.eyeColor = val; }
        });

        style.exposeProperty("antennaColor", "color", this.antennaColor, {
            description: "Antenna color",
            style: { label: "Antenna Color" },
            onChange: (val) => { this.antennaColor = val; }
        });

        style.exposeProperty("mandibleColor", "color", this.mandibleColor, {
            description: "Mandible color",
            style: { label: "Mandible Color" },
            onChange: (val) => { this.mandibleColor = val; }
        });

        style.exposeProperty("spineColor", "color", this.spineColor, {
            description: "Spine decoration color",
            style: { label: "Spine Color" },
            onChange: (val) => { this.spineColor = val; }
        });

        style.addDivider();

        style.startGroup("Shadow Settings", false, {
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("showShadow", "boolean", this.showShadow, {
            description: "Enable shadow rendering",
            style: { label: "Show Shadow" },
            onChange: (val) => { this.showShadow = val; }
        });

        style.exposeProperty("shadowOpacity", "number", this.shadowOpacity, {
            description: "Shadow transparency (0-1)",
            min: 0,
            max: 1,
            step: 0.05,
            style: { label: "Shadow Opacity", slider: true },
            onChange: (val) => { this.shadowOpacity = val; }
        });

        style.exposeProperty("shadowBlur", "number", this.shadowBlur, {
            description: "Shadow blur radius",
            min: 0,
            max: 40,
            step: 1,
            style: { label: "Shadow Blur", slider: true },
            onChange: (val) => { this.shadowBlur = val; }
        });

        style.exposeProperty("shadowOffsetX", "number", this.shadowOffsetX, {
            description: "Shadow horizontal offset",
            min: -20,
            max: 20,
            step: 0.5,
            style: { label: "Shadow Offset X", slider: true },
            onChange: (val) => { this.shadowOffsetX = val; }
        });

        style.exposeProperty("shadowOffsetY", "number", this.shadowOffsetY, {
            description: "Shadow vertical offset",
            min: -20,
            max: 20,
            step: 0.5,
            style: { label: "Shadow Offset Y", slider: true },
            onChange: (val) => { this.shadowOffsetY = val; }
        });

        style.exposeProperty("shadowColor", "color", this.shadowColor, {
            description: "Shadow color",
            style: { label: "Shadow Color" },
            onChange: (val) => { this.shadowColor = val; }
        });

        style.addDivider();

        style.exposeProperty("showEyes", "boolean", this.showEyes, {
            description: "Show eyes on head",
            style: { label: "Show Eyes" },
            onChange: (val) => { this.showEyes = val; }
        });

        style.exposeProperty("eyeCount", "number", this.eyeCount, {
            description: "Number of eyes",
            min: 0,
            max: 8,
            step: 1,
            style: { label: "Eye Count", slider: true },
            onChange: (val) => { this.eyeCount = val; }
        });

        style.exposeProperty("showJoints", "boolean", this.showJoints, {
            description: "Show joint decorations on legs",
            style: { label: "Show Joints" },
            onChange: (val) => { this.showJoints = val; }
        });

        style.exposeProperty("isometricAngle", "number", this.isometricAngle, {
            description: "Isometric viewing angle (0-90 degrees)",
            min: 0,
            max: 90,
            step: 1,
            style: { label: "Isometric Angle", slider: true },
            onChange: (val) => { this.isometricAngle = val; }
        });

        style.exposeProperty("bodyHeight", "number", this.bodyHeight, {
            description: "Height offset for fake Z-axis",
            min: 0,
            max: 100,
            step: 1,
            style: { label: "Body Height", slider: true },
            onChange: (val) => { this.bodyHeight = val; }
        });

        style.endGroup();

        style.addDivider();

        style.startGroup("Head Customization", false, {
            backgroundColor: 'rgba(107,90,125,0.2)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("headShape", "enum", this.headShape, {
            description: "Shape of the head",
            options: ["ellipse", "triangle", "rectangle", "diamond"],
            style: { label: "Head Shape" },
            onChange: (val) => { this.headShape = val; }
        });

        style.exposeProperty("antennaCount", "number", this.antennaCount, {
            description: "Number of antennae",
            min: 0,
            max: 4,
            step: 1,
            style: { label: "Antenna Count", slider: true },
            onChange: (val) => { this.antennaCount = val; }
        });

        style.exposeProperty("antennaLength", "number", this.antennaLength, {
            description: "Length of antennae",
            min: 5,
            max: 40,
            step: 1,
            style: { label: "Antenna Length", slider: true },
            onChange: (val) => { this.antennaLength = val; }
        });

        style.exposeProperty("mandibles", "boolean", this.mandibles, {
            description: "Show mandibles on head",
            style: { label: "Show Mandibles" },
            onChange: (val) => { this.mandibles = val; }
        });

        style.endGroup();

        style.addDivider();

        style.startGroup("Movement", false, {
            backgroundColor: 'rgba(45,36,54,0.2)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("moveSpeed", "number", this.moveSpeed, {
            description: "Movement speed",
            min: 0,
            max: 200,
            step: 5,
            style: { label: "Move Speed", slider: true },
            onChange: (val) => { this.moveSpeed = val; }
        });

        style.exposeProperty("acceleration", "number", this.acceleration, {
            description: "Movement acceleration",
            min: 50,
            max: 500,
            step: 10,
            style: { label: "Acceleration", slider: true },
            onChange: (val) => { this.acceleration = val; }
        });

        style.exposeProperty("turnSpeed", "number", this.turnSpeed, {
            description: "Turn speed in degrees per second",
            min: 30,
            max: 360,
            step: 10,
            style: { label: "Turn Speed", slider: true },
            onChange: (val) => { this.turnSpeed = val; }
        });

        style.exposeProperty("movementStyle", "enum", this.movementStyle, {
            description: "Style of movement behavior",
            options: ["wander", "circle", "zigzag", "patrol"],
            style: { label: "Movement Style" },
            onChange: (val) => { this.movementStyle = val; }
        });

        style.exposeProperty("targetObject", "string", this.targetObject, {
            description: "Target object to follow (leave empty for wander)",
            style: { label: "Target Object" },
            onChange: (val) => { this.targetObject = val; }
        });

        style.exposeProperty("wanderRadius", "number", this.wanderRadius, {
            description: "Wander distance from start position",
            min: 50,
            max: 500,
            step: 10,
            style: { label: "Wander Radius", slider: true },
            onChange: (val) => { this.wanderRadius = val; }
        });

        style.exposeProperty("wanderWaitTime", "number", this.wanderWaitTime, {
            description: "Wait time at each wander destination",
            min: 0,
            max: 10,
            step: 0.5,
            style: { label: "Wander Wait Time", slider: true },
            onChange: (val) => { this.wanderWaitTime = val; }
        });

        style.exposeProperty("arrivalThreshold", "number", this.arrivalThreshold, {
            description: "Distance to consider arrived at target",
            min: 5,
            max: 50,
            step: 1,
            style: { label: "Arrival Threshold", slider: true },
            onChange: (val) => { this.arrivalThreshold = val; }
        });

        style.endGroup();

        style.addDivider();

        style.startGroup("Head Look", false, {
            backgroundColor: 'rgba(107,90,125,0.2)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("headLookEnabled", "boolean", this.headLookEnabled, {
            description: "Enable head to look at objects",
            style: { label: "Enable Head Look" },
            onChange: (val) => { this.headLookEnabled = val; }
        });

        style.exposeProperty("headLookRange", "number", this.headLookRange, {
            description: "Range to detect objects to look at",
            min: 50,
            max: 500,
            step: 10,
            style: { label: "Look Range", slider: true },
            onChange: (val) => { this.headLookRange = val; }
        });

        style.exposeProperty("headLookSpeed", "number", this.headLookSpeed, {
            description: "Speed of head rotation",
            min: 0.5,
            max: 10,
            step: 0.5,
            style: { label: "Look Speed", slider: true },
            onChange: (val) => { this.headLookSpeed = val; }
        });

        style.exposeProperty("headLookObject", "string", this.headLookObject, {
            description: "Object name or tag to look at",
            style: { label: "Look Target" },
            onChange: (val) => { this.headLookObject = val; }
        });

        style.endGroup();

        style.addDivider();

        style.startGroup("🎲 Random Generation", false, {
            backgroundColor: 'rgba(255,165,0,0.15)',
            borderRadius: '6px',
            padding: '8px',
            border: '2px solid rgba(255,165,0,0.3)'
        });

        style.exposeProperty("generateRandomCreatureOnStart", "boolean", this.generateRandomCreatureBoolean, {
            description: "Generate a random creature",
            style: { label: "Generate Random Creature" }
        });

        style.addHelpText("Click to generate a completely random creature with balanced colors!");

        style.endGroup();

        style.addHelpText("Create spiders, centipedes, dragons and more!");
    }

    refreshInspector() {
        if (window.editor && window.editor.inspector) {
            // Clear any cached property data
            if (window.editor.inspector.clearModuleCache) {
                window.editor.inspector.clearModuleCache(this);
            }

            // Re-generate the module UI
            window.editor.inspector.refreshModuleUI(this);

            // Refresh the canvas to show visual changes
            if (window.editor.refreshCanvas) {
                window.editor.refreshCanvas();
            }

            // Mark the scene as dirty so it gets saved
            if (this.gameObject && this.gameObject.scene) {
                this.gameObject.scene.dirty = true;
            }

            // Trigger an immediate save to persist the changes
            if (window.autoSaveManager && typeof window.autoSaveManager.saveState === 'function') {
                // Use setTimeout to ensure the UI has updated before saving
                setTimeout(() => {
                    window.autoSaveManager.saveState();
                }, 100);
            }
        }
    }

    _initializeCreature() {
        this._segments = [];
        this._legs = [];

        const worldPos = this.gameObject ? this.gameObject.getWorldPosition() : new Vector2(0, 0);

        // Initialize body segments with absolute world positions
        for (let i = 0; i < this.bodySegments; i++) {
            this._segments.push({
                worldPos: new Vector2(worldPos.x - i * this.segmentLength, worldPos.y),
                angle: 0 // This is now the absolute world angle
            });
        }

        // Initialize legs with position along body
        for (let i = 0; i < this.legPairs; i++) {
            let segmentIndex, positionAlongSegment, legAngleOffset;

            if (this.bodySegments === 1) {
                segmentIndex = 0;
                const normalizedPos = this.legPairs > 1 ? (i / (this.legPairs - 1)) : 0.5;
                positionAlongSegment = normalizedPos - 0.5;
                legAngleOffset = (normalizedPos - 0.5) * 30;
            } else {
                const totalLength = (this.bodySegments - 1);
                const legPosition = (i / (this.legPairs - 1 || 1)) * totalLength;
                segmentIndex = Math.floor(legPosition);
                positionAlongSegment = legPosition - segmentIndex;

                if (segmentIndex >= this.bodySegments) {
                    segmentIndex = this.bodySegments - 1;
                    positionAlongSegment = 1;
                }

                legAngleOffset = 0;
            }

            for (let side = 0; side < 2; side++) {
                const lengthVariation = 1 + (Math.random() - 0.5) * this.legRandomness;
                const angleVariation = (Math.random() - 0.5) * this.legRandomness * 30;
                const thicknessVariation = 1 + (Math.random() - 0.5) * this.legRandomness * 0.3;
                const verticalOffset = (Math.random() - 0.5) * this.legOffsetVariation * this.bodyWidth;
                const phaseOffset = side === 0 ? 0 : 0.5;

                this._legs.push({
                    segmentIndex: segmentIndex,
                    positionAlongSegment: positionAlongSegment,
                    side: side === 0 ? -1 : 1,
                    pairIndex: i,
                    currentPos: new Vector2(0, 0),
                    targetPos: new Vector2(0, 0),
                    restPos: new Vector2(0, 0),
                    isMoving: false,
                    moveProgress: 0,
                    startPos: new Vector2(0, 0),
                    lengthMultiplier: lengthVariation,
                    angleOffset: angleVariation + legAngleOffset,
                    thicknessMultiplier: thicknessVariation,
                    verticalOffset: verticalOffset,
                    phaseOffset: phaseOffset,
                    initialized: false // new flag to reliably initialize currentPos
                });
            }
        }


        // Initialize arms attached to head
        this._arms = [];
        for (let i = 0; i < this.armCount; i++) {
            // Determine side: first half are left, second half are right
            const isLeftSide = i < this.armCount / 2;
            const sideMultiplier = isLeftSide ? -1 : 1;

            // Stagger the phase for each arm pair
            const pairIndex = isLeftSide ? i : i - Math.floor(this.armCount / 2);
            const swingPhase = pairIndex * Math.PI * 0.3; // Offset each pair

            this._arms.push({
                index: i,
                side: sideMultiplier, // -1 for left, 1 for right
                currentHandPos: new Vector2(0, 0),
                targetHandPos: new Vector2(0, 0),
                restHandPos: new Vector2(0, 0),
                handVelocity: new Vector2(0, 0), // Spring velocity
                reachingTarget: null,
                initialized: false,
                manualControl: false,
                swingPhase: swingPhase, // Phase offset for swing animation
                swingTime: 0, // Current swing time

                // Animation state system
                state: 'idle', // idle, punching, grabbing, holding, returning
                stateTime: 0, // Time in current state
                stateStartPos: new Vector2(0, 0), // Position when state started
                stateTargetPos: new Vector2(0, 0), // Target position for state
                punchWindupPos: new Vector2(0, 0), // Windup position for punch
                punchReachPos: new Vector2(0, 0), // Maximum reach position for punch
                punchPower: 0, // Current punch speed/power
                grabTargetPos: new Vector2(0, 0), // Position to grab
                grabHoldTimer: 0 // Timer for holding grab
            });
        }
    }

    start() {
        this._initializeCreature();

        if (this.generateRandomCreatureBoolean) {
            this._randomizeAllProperties();
            //this.refreshInspector();
        }
    }

    loop(deltaTime) {
        // Handle death and decay
        if (this.isDead) {
            // Initialize death positions if they don't exist yet (when isDead is toggled via inspector)
            if (!this.deathPositions) {
                this.decayTimer = 0;
                this.originalScale = this.gameObject.scale || 1.0;

                // Store current positions and angles of all segments
                this.deathPositions = [];
                this.deathAngles = [];

                for (let i = 0; i < this._segments.length; i++) {
                    this.deathPositions.push({
                        x: this._segments[i].worldPos.x,
                        y: this._segments[i].worldPos.y
                    });
                    this.deathAngles.push(this._segments[i].angle || 0);
                }

                // Store leg positions
                this.deathLegPositions = [];
                if (this._legs) {
                    for (let leg of this._legs) {
                        this.deathLegPositions.push({
                            currentPos: leg.currentPos ? { x: leg.currentPos.x, y: leg.currentPos.y } : null,
                            baseX: leg.baseX,
                            baseY: leg.baseY
                        });
                    }
                }

                // Store arm positions
                this.deathArmPositions = [];
                if (this._arms) {
                    for (let arm of this._arms) {
                        this.deathArmPositions.push({
                            currentHandPos: arm.currentHandPos ? { x: arm.currentHandPos.x, y: arm.currentHandPos.y } : null,
                            baseWorldX: arm.baseWorldX,
                            baseWorldY: arm.baseWorldY
                        });
                    }
                }

                // Set depth to background
                if (this.gameObject) {
                    this.gameObject.depth = 1000000;
                }

                // Stop all movement
                this._wanderTarget = null;
                this._targetX = null;
                this._targetY = null;
                this._velocity.x = 0;
                this._velocity.y = 0;
            }

            this._updateDecay(deltaTime);

            // When dead, use frozen positions
            if (this.deathPositions) {
                for (let i = 0; i < this._segments.length; i++) {
                    if (this.deathPositions[i]) {
                        this._segments[i].worldPos.x = this.deathPositions[i].x;
                        this._segments[i].worldPos.y = this.deathPositions[i].y;
                        if (this.deathAngles[i] !== undefined) {
                            this._segments[i].angle = this.deathAngles[i];
                        }
                    }
                }

                // Freeze legs
                if (this.deathLegPositions && this._legs) {
                    for (let i = 0; i < this._legs.length && i < this.deathLegPositions.length; i++) {
                        const leg = this._legs[i];
                        const legData = this.deathLegPositions[i];
                        if (legData.currentPos) {
                            leg.currentPos.x = legData.currentPos.x;
                            leg.currentPos.y = legData.currentPos.y;
                        }
                        if (legData.baseX !== undefined) leg.baseX = legData.baseX;
                        if (legData.baseY !== undefined) leg.baseY = legData.baseY;
                    }
                }

                // Freeze arms
                if (this.deathArmPositions && this._arms) {
                    for (let i = 0; i < this._arms.length && i < this.deathArmPositions.length; i++) {
                        const arm = this._arms[i];
                        const armData = this.deathArmPositions[i];
                        if (armData.currentHandPos) {
                            arm.currentHandPos.x = armData.currentHandPos.x;
                            arm.currentHandPos.y = armData.currentHandPos.y;
                        }
                        if (armData.baseWorldX !== undefined) arm.baseWorldX = armData.baseWorldX;
                        if (armData.baseWorldY !== undefined) arm.baseWorldY = armData.baseWorldY;
                    }
                }
            }
            return; // Skip normal movement updates
        }

        const pos = this.gameObject.position;

        // When dead, use frozen positions
        if (this.isDead && this.deathPositions) {
            for (let i = 0; i < this._segments.length; i++) {
                if (this.deathPositions[i]) {
                    this._segments[i].x = this.deathPositions[i].x;
                    this._segments[i].y = this.deathPositions[i].y;
                    if (this.deathAngles[i] !== undefined) {
                        this._segments[i].angle = this.deathAngles[i];
                    }
                }
            }

            // Freeze limbs too
            if (this.deathLimbPositions) {
                for (let i = 0; i < this._limbs.length; i++) {
                    if (this.deathLimbPositions[i]) {
                        const limbData = this.deathLimbPositions[i];
                        for (let j = 0; j < this._limbs[i].joints.length; j++) {
                            if (limbData.joints[j]) {
                                this._limbs[i].joints[j].x = limbData.joints[j].x;
                                this._limbs[i].joints[j].y = limbData.joints[j].y;
                            }
                        }
                    }
                }
            }
            return; // Skip normal movement updates
        }

        // Determine movement direction
        let targetDir = new Vector2(0, 0);
        let hasTarget = false;

        if (this.targetObject && this.targetObject.length > 0) {
            const target = this.getGameObjectByName(this.targetObject);
            if (target) {
                targetDir.x = target.position.x - pos.x;
                targetDir.y = target.position.y - pos.y;
                const dist = Math.sqrt(targetDir.x * targetDir.x + targetDir.y * targetDir.y);
                if (dist > this.arrivalThreshold) {
                    targetDir.x /= dist;
                    targetDir.y /= dist;
                    hasTarget = true;
                } else {
                    targetDir.x = 0;
                    targetDir.y = 0;
                }
            }
        }

        if (!hasTarget) {
            // Apply movement style
            switch (this.movementStyle) {
                case "wander":
                    // Wander behavior - pick location, walk, wait, repeat
                    if (this._isWaiting) {
                        this._wanderWaitTimer += deltaTime;
                        if (this._wanderWaitTimer >= this.wanderWaitTime) {
                            this._isWaiting = false;
                            this._wanderTarget = null;
                        }
                    } else {
                        if (!this._wanderTarget) {
                            // Pick new wander target from CURRENT position
                            const angle = Math.random() * Math.PI * 2;
                            const dist = Math.random() * this.wanderRadius;

                            this._wanderTarget = new Vector2(
                                pos.x + Math.cos(angle) * dist,
                                pos.y + Math.sin(angle) * dist
                            );
                        }

                        // Move toward wander target
                        const dx = this._wanderTarget.x - pos.x;
                        const dy = this._wanderTarget.y - pos.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist < this.arrivalThreshold) {
                            // Arrived at target, start waiting
                            this._isWaiting = true;
                            this._wanderWaitTimer = 0;
                            this._wanderTarget = null;
                            targetDir.x = 0;
                            targetDir.y = 0;
                        } else {
                            targetDir.x = dx / dist;
                            targetDir.y = dy / dist;
                        }
                    }
                    break;

                case "circle":
                    // Circle movement
                    if (!this._circleCenter) {
                        this._circleCenter = new Vector2(pos.x, pos.y);
                        this._circleAngle = 0;
                    }
                    this._circleAngle += deltaTime * (this.moveSpeed / this.wanderRadius);
                    const targetX = this._circleCenter.x + Math.cos(this._circleAngle) * this.wanderRadius;
                    const targetY = this._circleCenter.y + Math.sin(this._circleAngle) * this.wanderRadius;
                    targetDir.x = targetX - pos.x;
                    targetDir.y = targetY - pos.y;
                    const dist = Math.sqrt(targetDir.x * targetDir.x + targetDir.y * targetDir.y);
                    if (dist > 0) {
                        targetDir.x /= dist;
                        targetDir.y /= dist;
                    }
                    break;

                case "zigzag":
                    // Zigzag movement
                    if (!this._zigzagTarget) {
                        this._zigzagTarget = new Vector2(pos.x + 100, pos.y);
                        this._zigzagDirection = 1;
                    }
                    const dxZig = this._zigzagTarget.x - pos.x;
                    const dyZig = this._zigzagTarget.y - pos.y;
                    const distZig = Math.sqrt(dxZig * dxZig + dyZig * dyZig);
                    if (distZig < this.arrivalThreshold) {
                        this._zigzagDirection *= -1;
                        const forward = Math.atan2(dyZig, dxZig);
                        this._zigzagTarget.x = pos.x + Math.cos(forward) * 100;
                        this._zigzagTarget.y = pos.y + Math.sin(forward) * 100 + this._zigzagDirection * 50;
                    }
                    targetDir.x = dxZig / distZig;
                    targetDir.y = dyZig / distZig;
                    break;

                case "patrol":
                    // Patrol between points
                    if (!this._patrolPoints) {
                        this._patrolPoints = [
                            new Vector2(pos.x - this.wanderRadius, pos.y),
                            new Vector2(pos.x + this.wanderRadius, pos.y)
                        ];
                        this._patrolIndex = 0;
                    }
                    const patrolTarget = this._patrolPoints[this._patrolIndex];
                    const dxPatrol = patrolTarget.x - pos.x;
                    const dyPatrol = patrolTarget.y - pos.y;
                    const distPatrol = Math.sqrt(dxPatrol * dxPatrol + dyPatrol * dyPatrol);
                    if (distPatrol < this.arrivalThreshold) {
                        this._patrolIndex = (this._patrolIndex + 1) % this._patrolPoints.length;
                    }
                    if (distPatrol > 0) {
                        targetDir.x = dxPatrol / distPatrol;
                        targetDir.y = dyPatrol / distPatrol;
                    }
                    break;
            }
        }

        // Update arm IK
        this._updateArmIK(deltaTime);

        // Apply movement with proper acceleration
        this._velocity.x += targetDir.x * deltaTime * this.acceleration;
        this._velocity.y += targetDir.y * deltaTime * this.acceleration;

        const speed = Math.sqrt(this._velocity.x * this._velocity.x + this._velocity.y * this._velocity.y);
        if (speed > this.moveSpeed) {
            this._velocity.x = (this._velocity.x / speed) * this.moveSpeed;
            this._velocity.y = (this._velocity.y / speed) * this.moveSpeed;
        }

        // Apply friction
        const friction = targetDir.x === 0 && targetDir.y === 0 ? 0.85 : 0.95;
        this._velocity.x *= friction;
        this._velocity.y *= friction;

        pos.x += this._velocity.x * deltaTime;
        pos.y += this._velocity.y * deltaTime;

        // Update body angle with proper turn speed
        if (speed > 1) {
            const targetAngle = Math.atan2(this._velocity.y, this._velocity.x) * 180 / Math.PI;
            let angleDiff = targetAngle - this.gameObject.angle;

            // Normalize angle difference
            while (angleDiff > 180) angleDiff -= 360;
            while (angleDiff < -180) angleDiff += 360;

            // Use the actual turnSpeed property
            const maxTurnSpeed = this.turnSpeed; // degrees per second
            const turnAmount = Math.max(-maxTurnSpeed * deltaTime, Math.min(maxTurnSpeed * deltaTime, angleDiff));

            this.gameObject.angle += turnAmount;
        }

        // Update head look direction
        this._updateHeadLook(deltaTime);

        // Update body segments (snake-like following)
        this._updateBodySegments(deltaTime);

        // Update leg IK
        this._updateLegIK(deltaTime);
    }

    _updateDecay(deltaTime) {
        this.decayTimer += deltaTime;

        const decayProgress = Math.min(1.0, this.decayTimer / this.decayMaxTime);

        // Darken color (fade to dark gray/black)
        const colorFade = 1.0 - (decayProgress * 0.8); // Fade to 20% brightness
        this.bodyColor = this._darkenColor(this.bodyColor, colorFade);
        this.headColor = this._darkenColor(this.headColor, colorFade);
        this.eyeColor = this._darkenColor(this.eyeColor, colorFade);

        // Shrink scale
        const targetScale = 0.01;
        this.gameObject.scale = this.originalScale * (1.0 - decayProgress * (1.0 - targetScale));

        // Destroy when fully decayed
        if (decayProgress >= 1.0) {
            if (this.gameObject && this.gameObject.destroy) {
                this.gameObject.destroy();
            }
        }
    }

    _darkenColor(color, brightness) {
        // Parse hex color
        let hex = color.replace('#', '');
        let r = parseInt(hex.substring(0, 2), 16);
        let g = parseInt(hex.substring(2, 4), 16);
        let b = parseInt(hex.substring(4, 6), 16);

        // Apply brightness
        r = Math.floor(r * brightness);
        g = Math.floor(g * brightness);
        b = Math.floor(b * brightness);

        // Convert back to hex
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    _updateArmIK(deltaTime) {
        if (this.armCount === 0 || this._arms.length === 0) return;

        const head = this._segments[0];
        const worldPos = this.gameObject.getWorldPosition();
        const bodyAngle = this.gameObject.angle * Math.PI / 180;
        const headWorldAngle = head.angle + this._headAngle;

        // Calculate height offset for isometric view
        const isometricRad = this.isometricAngle * Math.PI / 180;
        const heightOffset = -Math.sin(isometricRad) * this.bodyHeight;

        // Check if creature is moving
        const velocityX = this._velocity.x;
        const velocityY = this._velocity.y;
        const velocityMag = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
        const isMoving = velocityMag > 1;

        // Find interesting objects within reach range
        let interestingObjects = [];
        if (window.engine && window.engine.gameObjects) {
            for (let obj of window.engine.gameObjects) {
                if (obj === this.gameObject) continue;

                // Check if object has "interesting" tag
                if (obj.tag === "interesting" || obj.name === "interesting") {
                    const dx = obj.position.x - head.worldPos.x;
                    const dy = obj.position.y - head.worldPos.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist <= this.armReachRange) {
                        // Calculate which side the object is on relative to creature
                        const objAngle = Math.atan2(dy, dx);
                        let relativeAngle = objAngle - headWorldAngle;

                        // Normalize to -PI to PI
                        while (relativeAngle > Math.PI) relativeAngle -= Math.PI * 2;
                        while (relativeAngle < -Math.PI) relativeAngle += Math.PI * 2;

                        interestingObjects.push({
                            obj: obj,
                            distance: dist,
                            worldX: obj.position.x,
                            worldY: obj.position.y,
                            relativeAngle: relativeAngle,
                            isOnLeft: relativeAngle < 0
                        });
                    }
                }
            }
        }

        // Sort by distance (closest first)
        interestingObjects.sort((a, b) => a.distance - b.distance);

        for (let i = 0; i < this._arms.length; i++) {
            const arm = this._arms[i];
            const isLeftSide = arm.side === -1;

            // Update swing time when moving
            if (isMoving && this.armSwingEnabled) {
                arm.swingTime += deltaTime * this.armSwingSpeed;
            }

            // Calculate arm base position PERPENDICULAR to head direction
            const perpendicularAngle = headWorldAngle + (Math.PI / 2) * arm.side;
            const baseRadius = this.headSize * 0.4;
            const baseWorldX = head.worldPos.x + Math.cos(perpendicularAngle) * baseRadius;
            const baseWorldY = head.worldPos.y + Math.sin(perpendicularAngle) * baseRadius + heightOffset;

            // Store base position for drawing
            arm.baseWorldX = baseWorldX;
            arm.baseWorldY = baseWorldY;

            // Calculate natural rest position for this arm
            const armsPerSide = this.armCount / 2;
            let angleDistribution = 0;

            if (armsPerSide > 1) {
                const armPositionOnSide = isLeftSide ? i : i - Math.floor(this.armCount / 2);
                const normalizedPosition = armsPerSide > 1 ? armPositionOnSide / (armsPerSide - 1) : 0;
                angleDistribution = normalizedPosition * 30 * (Math.PI / 180);
            }

            const baseOutwardAngle = this.armRestOutwardAngle * Math.PI / 180;
            const outwardAngleRad = arm.side * (baseOutwardAngle + angleDistribution);

            // Add swing animation when moving (only if idle)
            let swingAngleOffset = 0;
            if (isMoving && this.armSwingEnabled && arm.state === 'idle') {
                const swingPhaseAngle = arm.swingTime + arm.swingPhase;
                swingAngleOffset = Math.sin(swingPhaseAngle) * (this.armSwingAmount * Math.PI / 180);
            }

            const naturalRestAngle = headWorldAngle + outwardAngleRad + swingAngleOffset;
            const naturalRestDistance = this.armLength * this.armRestForwardDistance;
            const naturalRestX = baseWorldX + Math.cos(naturalRestAngle) * naturalRestDistance;
            const naturalRestY = baseWorldY + Math.sin(naturalRestAngle) * naturalRestDistance;

            // Update state machine
            arm.stateTime += deltaTime;
            let targetWorldX = naturalRestX;
            let targetWorldY = naturalRestY;

            switch (arm.state) {
                case 'idle':
                    // Check for automatic reaching or manual control
                    if (!arm.manualControl) {
                        let foundTarget = false;
                        for (let obj of interestingObjects) {
                            const sideMatches = isLeftSide ? obj.isOnLeft : !obj.isOnLeft;
                            if (sideMatches) {
                                arm.reachingTarget = obj.obj;
                                targetWorldX = obj.worldX;
                                targetWorldY = obj.worldY;
                                foundTarget = true;
                                break;
                            }
                        }
                        if (!foundTarget) {
                            arm.reachingTarget = null;
                        }
                    }
                    break;

                case 'punching':
                    // Punch animation: windup -> strike -> return
                    const punchDuration = 1.0 / this.punchSpeed; // Total punch time
                    const windupTime = punchDuration * 0.3; // 30% windup
                    const strikeTime = punchDuration * 0.4; // 40% strike
                    const returnTime = punchDuration * 0.3; // 30% return

                    if (arm.stateTime < windupTime) {
                        // Windup phase - pull back
                        const t = arm.stateTime / windupTime;
                        const eased = t * t; // Ease in
                        targetWorldX = arm.stateStartPos.x + (arm.punchWindupPos.x - arm.stateStartPos.x) * eased;
                        targetWorldY = arm.stateStartPos.y + (arm.punchWindupPos.y - arm.stateStartPos.y) * eased;
                        arm.punchPower = 0;
                    } else if (arm.stateTime < windupTime + strikeTime) {
                        // Strike phase - fast forward punch with arc
                        const t = (arm.stateTime - windupTime) / strikeTime;
                        const eased = 1 - Math.pow(1 - t, 3); // Ease out cubic (fast)

                        // Calculate punch power based on velocity
                        const prevT = Math.max(0, (arm.stateTime - deltaTime - windupTime) / strikeTime);
                        const speed = (eased - prevT) / deltaTime;
                        arm.punchPower = speed * this.armLength * this.punchSpeed;

                        // Linear interpolation with arc
                        const baseX = arm.punchWindupPos.x + (arm.punchReachPos.x - arm.punchWindupPos.x) * eased;
                        const baseY = arm.punchWindupPos.y + (arm.punchReachPos.y - arm.punchWindupPos.y) * eased;

                        // Add arc (perpendicular to punch direction)
                        const punchAngle = Math.atan2(
                            arm.punchReachPos.y - arm.punchWindupPos.y,
                            arm.punchReachPos.x - arm.punchWindupPos.x
                        );
                        const arcOffset = Math.sin(t * Math.PI) * (this.punchArcAmount * arm.side);
                        const perpAngle = punchAngle + Math.PI / 2;

                        targetWorldX = baseX + Math.cos(perpAngle) * arcOffset;
                        targetWorldY = baseY + Math.sin(perpAngle) * arcOffset;
                    } else {
                        // Return phase - return to rest
                        const t = (arm.stateTime - windupTime - strikeTime) / returnTime;
                        if (t >= 1) {
                            arm.state = 'idle';
                            arm.stateTime = 0;
                            arm.punchPower = 0;
                        } else {
                            const eased = t * t; // Ease in
                            targetWorldX = arm.punchReachPos.x + (naturalRestX - arm.punchReachPos.x) * eased;
                            targetWorldY = arm.punchReachPos.y + (naturalRestY - arm.punchReachPos.y) * eased;
                            arm.punchPower = 0;
                        }
                    }
                    break;

                case 'grabbing':
                    // Move toward grab target
                    const grabReachTime = 1.0 / this.grabSpeed;

                    if (arm.stateTime < grabReachTime) {
                        const t = arm.stateTime / grabReachTime;
                        const eased = 1 - Math.pow(1 - t, 2); // Ease out
                        targetWorldX = arm.stateStartPos.x + (arm.grabTargetPos.x - arm.stateStartPos.x) * eased;
                        targetWorldY = arm.stateStartPos.y + (arm.grabTargetPos.y - arm.stateStartPos.y) * eased;
                    } else {
                        // Reached target, switch to holding
                        arm.state = 'holding';
                        arm.stateTime = 0;
                        arm.grabHoldTimer = 0;
                    }
                    break;

                case 'holding':
                    // Hold at grab position
                    targetWorldX = arm.grabTargetPos.x;
                    targetWorldY = arm.grabTargetPos.y;

                    arm.grabHoldTimer += deltaTime;
                    if (arm.grabHoldTimer >= this.grabHoldTime) {
                        // Start returning
                        arm.state = 'returning';
                        arm.stateTime = 0;
                        arm.stateStartPos.x = arm.currentHandPos.x;
                        arm.stateStartPos.y = arm.currentHandPos.y;
                    }
                    break;

                case 'returning':
                    // Return to rest position
                    const returnDuration = 1.0 / this.grabSpeed;

                    if (arm.stateTime < returnDuration) {
                        const t = arm.stateTime / returnDuration;
                        const eased = t * t; // Ease in
                        targetWorldX = arm.stateStartPos.x + (naturalRestX - arm.stateStartPos.x) * eased;
                        targetWorldY = arm.stateStartPos.y + (naturalRestY - arm.stateStartPos.y) * eased;
                    } else {
                        // Finished returning
                        arm.state = 'idle';
                        arm.stateTime = 0;
                    }
                    break;
            }

            // Store target position
            arm.targetHandPos.x = targetWorldX;
            arm.targetHandPos.y = targetWorldY;

            // Initialize hand position if needed
            if (!arm.initialized) {
                arm.currentHandPos.x = targetWorldX;
                arm.currentHandPos.y = targetWorldY;
                arm.handVelocity.x = 0;
                arm.handVelocity.y = 0;
                arm.initialized = true;
            }

            // Spring physics for smooth movement (stronger during states)
            const dx = arm.targetHandPos.x - arm.currentHandPos.x;
            const dy = arm.targetHandPos.y - arm.currentHandPos.y;

            // Increase stiffness during active states for more responsive movement
            const stiffnessMultiplier = (arm.state === 'punching' || arm.state === 'grabbing') ? 2.5 : 1.0;
            const springForceX = dx * this.armSpringStiffness * stiffnessMultiplier;
            const springForceY = dy * this.armSpringStiffness * stiffnessMultiplier;

            arm.handVelocity.x *= this.armSpringDamping;
            arm.handVelocity.y *= this.armSpringDamping;

            arm.handVelocity.x += springForceX * deltaTime;
            arm.handVelocity.y += springForceY * deltaTime;

            arm.currentHandPos.x += arm.handVelocity.x * deltaTime;
            arm.currentHandPos.y += arm.handVelocity.y * deltaTime;

            // Clamp hand position to arm reach (except during punch extend)
            const handDX = arm.currentHandPos.x - baseWorldX;
            const handDY = arm.currentHandPos.y - baseWorldY;
            const handDist = Math.sqrt(handDX * handDX + handDY * handDY);
            const maxReach = arm.state === 'punching' ? this.armLength * this.punchReachDistance : this.armLength * 0.95;

            if (handDist > maxReach) {
                arm.currentHandPos.x = baseWorldX + (handDX / handDist) * maxReach;
                arm.currentHandPos.y = baseWorldY + (handDY / handDist) * maxReach;
                const velocityInDirection = (arm.handVelocity.x * handDX + arm.handVelocity.y * handDY) / handDist;
                if (velocityInDirection > 0) {
                    arm.handVelocity.x -= (handDX / handDist) * velocityInDirection;
                    arm.handVelocity.y -= (handDY / handDist) * velocityInDirection;
                }
            }
        }
    }

    _updateBodySegments(deltaTime) {
        const worldPos = this.gameObject.getWorldPosition();
        const bodyAngle = this.gameObject.angle * Math.PI / 180;

        // Head follows the game object in world space
        this._segments[0].worldPos.x = worldPos.x;
        this._segments[0].worldPos.y = worldPos.y;
        this._segments[0].angle = bodyAngle;

        // Check if we should use snake movement (no leg segments)
        if (this.legSegments === 0) {
            // Snake-like wave movement
            this._updateSnakeMovement(deltaTime);
        } else {
            // Original following behavior for legged creatures
            // Following segments trail behind in snake-like fashion (in world space)
            for (let i = 1; i < this._segments.length; i++) {
                const prev = this._segments[i - 1];
                const curr = this._segments[i];

                // Calculate direction from current to previous segment (world space)
                const dx = prev.worldPos.x - curr.worldPos.x;
                const dy = prev.worldPos.y - curr.worldPos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0.1) {
                    // Calculate angle pointing to previous segment
                    curr.angle = Math.atan2(dy, dx);

                    // Move current segment to maintain distance from previous
                    const targetDist = this.segmentLength;
                    if (dist > targetDist) {
                        const moveAmount = (dist - targetDist) * this.segmentSmoothing * 3;
                        const moveX = (dx / dist) * moveAmount;
                        const moveY = (dy / dist) * moveAmount;

                        curr.worldPos.x += moveX;
                        curr.worldPos.y += moveY;
                    }
                }
            }
        }
    }

    _updateSnakeMovement(deltaTime) {
        const worldPos = this.gameObject.getWorldPosition();
        const bodyAngle = this.gameObject.angle * Math.PI / 180;

        // Get movement speed to adjust wave animation
        const velocityX = this._velocity.x;
        const velocityY = this._velocity.y;
        const velocityMag = Math.sqrt(velocityX * velocityX + velocityY * velocityY);

        // Update wave phase based on movement speed - this should always update when moving
        if (velocityMag > 0.1) {
            this._snakeWavePhase += this.snakeWaveSpeed * deltaTime;
        }

        // Apply sinusoidal wave to each segment
        for (let i = 1; i < this._segments.length; i++) {
            const prev = this._segments[i - 1];
            const curr = this._segments[i];

            // Calculate the wave offset for this segment
            // The wave propagates from head to tail
            const segmentRatio = i / this._segments.length; // 0 to 1 from head to tail
            const wavePhase = this._snakeWavePhase + segmentRatio * this.snakeWaveFrequency * Math.PI * 2;

            // Scale wave amplitude by movement speed (more movement = more wave)
            const speedRatio = Math.min(1, velocityMag / this.moveSpeed);
            const waveOffset = Math.sin(wavePhase) * this.snakeWaveAmplitude * speedRatio;

            // Calculate the direction from current to previous segment
            let dx = prev.worldPos.x - curr.worldPos.x;
            let dy = prev.worldPos.y - curr.worldPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0.01) {
                // Normalize direction
                dx /= dist;
                dy /= dist;

                // Calculate perpendicular direction for sideways wave (rotate 90 degrees)
                const perpX = -dy;
                const perpY = dx;

                // Add wave offset perpendicular to the direction
                const waveOffsetX = perpX * waveOffset;
                const waveOffsetY = perpY * waveOffset;

                // Position segment behind previous segment with wave offset
                const targetX = prev.worldPos.x - dx * this.segmentLength + waveOffsetX;
                const targetY = prev.worldPos.y - dy * this.segmentLength + waveOffsetY;

                // Smooth movement toward target position
                const smoothFactor = this.segmentSmoothing * 8; // Faster smoothing for snakes
                curr.worldPos.x += (targetX - curr.worldPos.x) * smoothFactor;
                curr.worldPos.y += (targetY - curr.worldPos.y) * smoothFactor;

                // Calculate angle based on direction to previous segment
                const toPrevX = prev.worldPos.x - curr.worldPos.x;
                const toPrevY = prev.worldPos.y - curr.worldPos.y;
                curr.angle = Math.atan2(toPrevY, toPrevX);
            } else {
                // If segments are too close, just use previous angle
                curr.angle = prev.angle;
            }
        }
    }

    _updateLegIK(deltaTime) {
        // Skip leg IK if there are no leg segments (snake mode)
        if (this.legSegments === 0 || this._legs.length === 0) {
            return;
        }

        const isometricRad = this.isometricAngle * Math.PI / 180;
        const worldPos = this.gameObject.getWorldPosition();

        // Get movement velocity
        const velocityX = this._velocity.x;
        const velocityY = this._velocity.y;
        const velocityMag = Math.sqrt(velocityX * velocityX + velocityY * velocityY);

        // Determine if creature is standing still
        const isStanding = velocityMag < 1;

        for (let leg of this._legs) {
            const segment = this._segments[leg.segmentIndex];
            const segmentWorldAngle = segment.angle;

            // Track segment movement for this leg
            if (!leg.lastSegmentPos) {
                leg.lastSegmentPos = { x: segment.worldPos.x, y: segment.worldPos.y };
            }
            const segmentDX = segment.worldPos.x - leg.lastSegmentPos.x;
            const segmentDY = segment.worldPos.y - leg.lastSegmentPos.y;
            const segmentMovement = Math.sqrt(segmentDX * segmentDX + segmentDY * segmentDY);
            leg.lastSegmentPos.x = segment.worldPos.x;
            leg.lastSegmentPos.y = segment.worldPos.y;

            // Calculate height offset for this segment based on bodyHeight
            const segmentHeightOffset = -Math.sin(isometricRad) * this.bodyHeight;

            // Calculate attachment point on the segment
            const segmentWorldX = segment.worldPos.x;
            const segmentWorldY = segment.worldPos.y;

            // Attach legs perpendicular to segment
            const attachX = segmentWorldX;
            const attachY = segmentWorldY;

            // Calculate base position perpendicular to segment
            const perpAngle = segmentWorldAngle + Math.PI / 2;
            const baseX = attachX + Math.cos(perpAngle) * this.bodyWidth * 0.5 * leg.side;
            const baseY = attachY + Math.sin(perpAngle) * this.bodyWidth * 0.5 * leg.side + segmentHeightOffset;

            // Store base position for drawing (always update for rendering)
            leg.baseX = baseX;
            leg.baseY = baseY;

            // Calculate natural rest position - ALWAYS update this based on current base position
            const effectiveLegLength = this.legLength * leg.lengthMultiplier;
            const effectiveLegAngle = segmentWorldAngle + (this.legSpread * Math.PI / 180) * leg.side + (leg.angleOffset * Math.PI / 180);

            let naturalRestX, naturalRestY;

            if (isStanding) {
                // When standing, feet go to neutral position (straight down from base)
                naturalRestX = baseX + Math.cos(effectiveLegAngle) * effectiveLegLength;
                naturalRestY = baseY + Math.sin(effectiveLegAngle) * effectiveLegLength;

                // When standing, smoothly update rest position to follow the base
                const restSmoothness = 0.15; // Follow the base smoothly
                leg.restPos.x += (naturalRestX - leg.restPos.x) * restSmoothness;
                leg.restPos.y += (naturalRestY - leg.restPos.y) * restSmoothness;
            } else {
                // When moving, project foot forward/back based on movement
                const segDirX = Math.cos(segmentWorldAngle);
                const segDirY = Math.sin(segmentWorldAngle);

                const velocityDirX = velocityMag > 0.01 ? velocityX / velocityMag : 0;
                const velocityDirY = velocityMag > 0.01 ? velocityY / velocityMag : 0;
                const forwardComponent = velocityDirX * segDirX + velocityDirY * segDirY;

                const legNormalizedPos = this.legPairs > 1 ? leg.pairIndex / (this.legPairs - 1) : 0.5;
                const frontBackBias = (legNormalizedPos - 0.5) * 2;

                const strideAmount = velocityMag * 0.3;
                const strideOffset = -forwardComponent * strideAmount * (1 + frontBackBias * 0.5);

                const strideX = segDirX * strideOffset;
                const strideY = segDirY * strideOffset;

                naturalRestX = baseX + Math.cos(effectiveLegAngle) * effectiveLegLength + strideX;
                naturalRestY = baseY + Math.sin(effectiveLegAngle) * effectiveLegLength + strideY;

                // Only update rest position when NOT moving (planted on ground)
                if (!leg.isMoving) {
                    leg.restPos.x = naturalRestX;
                    leg.restPos.y = naturalRestY;
                }
            }

            // Initialize leg position if needed
            if (!leg.initialized) {
                leg.currentPos.x = naturalRestX;
                leg.currentPos.y = naturalRestY;
                leg.restPos.x = naturalRestX;
                leg.restPos.y = naturalRestY;
                leg.initialized = true;
            }

            // Check if leg needs to step (only when not already moving)
            if (!leg.isMoving) {
                const dx = leg.restPos.x - leg.currentPos.x;
                const dy = leg.restPos.y - leg.currentPos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // When standing, allow feet to smoothly follow rest position without stepping
                if (isStanding) {
                    // Smoothly drag feet to rest position without "stepping"
                    const dragSpeed = 0.08;
                    leg.currentPos.x += dx * dragSpeed;
                    leg.currentPos.y += dy * dragSpeed;
                } else {
                    // When moving, check if step is needed
                    const movementThreshold = 0.5;
                    const isSegmentMoving = segmentMovement > movementThreshold;

                    const effectiveStepDistance = this.stepDistance * (0.85 + leg.phaseOffset * 0.15);

                    if (dist > effectiveStepDistance && isSegmentMoving) {
                        let shouldStep = true;

                        if (this.alternateLegs) {
                            const adjacentPairRange = 1;

                            for (let otherLeg of this._legs) {
                                if (otherLeg === leg) continue;

                                if (otherLeg.side === leg.side &&
                                    Math.abs(otherLeg.pairIndex - leg.pairIndex) <= adjacentPairRange &&
                                    otherLeg.isMoving) {
                                    shouldStep = false;
                                    break;
                                }
                            }

                            if (shouldStep) {
                                const oppositeLeg = this._legs.find(l =>
                                    l.pairIndex === leg.pairIndex && l.side !== leg.side
                                );

                                if (oppositeLeg && oppositeLeg.isMoving && oppositeLeg.moveProgress < 0.7) {
                                    shouldStep = false;
                                }
                            }
                        }

                        const emergencyDistance = this.stepDistance * 2.5;
                        if (dist > emergencyDistance) {
                            shouldStep = true;
                        }

                        if (shouldStep) {
                            leg.isMoving = true;
                            leg.moveProgress = 0;
                            leg.startPos.x = leg.currentPos.x;
                            leg.startPos.y = leg.currentPos.y;

                            const segDirX = Math.cos(segmentWorldAngle);
                            const segDirY = Math.sin(segmentWorldAngle);

                            const velocityDirX = velocityMag > 0.01 ? velocityX / velocityMag : 0;
                            const velocityDirY = velocityMag > 0.01 ? velocityY / velocityMag : 0;
                            const forwardComponent = velocityDirX * segDirX + velocityDirY * segDirY;

                            const legNormalizedPos = this.legPairs > 1 ? leg.pairIndex / (this.legPairs - 1) : 0.5;
                            const frontBackBias = (legNormalizedPos - 0.5) * 2;
                            const strideAmount = velocityMag * 0.3;

                            const predictedStrideX = segDirX * forwardComponent * strideAmount * 1.5 * (1 + frontBackBias * 0.5);
                            const predictedStrideY = segDirY * forwardComponent * strideAmount * 1.5 * (1 + frontBackBias * 0.5);

                            leg.targetPos.x = leg.restPos.x + predictedStrideX;
                            leg.targetPos.y = leg.restPos.y + predictedStrideY;

                            const stepDX = leg.targetPos.x - leg.startPos.x;
                            const stepDY = leg.targetPos.y - leg.startPos.y;
                            const stepDist = Math.sqrt(stepDX * stepDX + stepDY * stepDY);

                            if (stepDist > 0.1) {
                                leg.stepPerpX = -stepDY / stepDist;
                                leg.stepPerpY = stepDX / stepDist;
                            } else {
                                leg.stepPerpX = Math.cos(segmentWorldAngle + Math.PI / 2);
                                leg.stepPerpY = Math.sin(segmentWorldAngle + Math.PI / 2);
                            }
                        }
                    }
                }
            }

            // Animate stepping (only when moving, not standing)
            if (leg.isMoving) {
                const dx = leg.targetPos.x - leg.startPos.x;
                const dy = leg.targetPos.y - leg.startPos.y;
                const stepDist = Math.sqrt(dx * dx + dy * dy);
                const speedMultiplier = Math.min(2, Math.max(0.8, stepDist / this.stepDistance));

                leg.moveProgress += deltaTime * this.stepSpeed * speedMultiplier;

                if (leg.moveProgress >= 1) {
                    leg.moveProgress = 1;
                    leg.isMoving = false;
                    leg.currentPos.x = leg.targetPos.x;
                    leg.currentPos.y = leg.targetPos.y;
                } else {
                    const t = leg.moveProgress;
                    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

                    let arcOffsetX = 0;
                    let arcOffsetY = 0;

                    if (this.stepHeight > 0) {
                        const arcHeight = Math.sin(t * Math.PI) * this.stepHeight;

                        arcOffsetX = leg.stepPerpX * arcHeight * leg.side;
                        arcOffsetY = leg.stepPerpY * arcHeight * leg.side;
                    }

                    leg.currentPos.x = leg.startPos.x + dx * eased + arcOffsetX;
                    leg.currentPos.y = leg.startPos.y + dy * eased + arcOffsetY;
                }
            }
        }
    }

    _generateRandomColorScheme() {
        // Generate a base hue (0-360)
        const baseHue = Math.floor(Math.random() * 360);

        // Choose a color scheme type
        const schemeTypes = ['monochromatic', 'analogous', 'complementary', 'triadic'];
        const schemeType = schemeTypes[Math.floor(Math.random() * schemeTypes.length)];

        let hues = [];

        switch (schemeType) {
            case 'monochromatic':
                // Same hue, different saturations and lightness
                hues = [baseHue, baseHue, baseHue, baseHue, baseHue, baseHue, baseHue, baseHue];
                break;
            case 'analogous':
                // Hues within 30 degrees of each other
                hues = [
                    baseHue,
                    (baseHue + 20) % 360,
                    (baseHue + 40) % 360,
                    (baseHue - 20 + 360) % 360,
                    baseHue,
                    (baseHue + 30) % 360,
                    (baseHue + 15) % 360,
                    (baseHue + 10) % 360
                ];
                break;
            case 'complementary':
                // Base hue and its complement (180 degrees opposite)
                const complementHue = (baseHue + 180) % 360;
                hues = [
                    baseHue,
                    baseHue,
                    complementHue,
                    baseHue,
                    complementHue,
                    baseHue,
                    complementHue,
                    baseHue
                ];
                break;
            case 'triadic':
                // Three hues evenly spaced (120 degrees apart)
                const triadic1 = (baseHue + 120) % 360;
                const triadic2 = (baseHue + 240) % 360;
                hues = [
                    baseHue,
                    baseHue,
                    triadic1,
                    baseHue,
                    triadic2,
                    triadic1,
                    baseHue,
                    triadic2
                ];
                break;
        }

        // Convert HSL to hex for each color
        const colors = hues.map((hue, index) => {
            // Vary saturation and lightness for depth
            const saturation = 40 + Math.random() * 40; // 40-80%
            let lightness;

            // Assign roles based on index
            if (index === 0) { // body color - medium
                lightness = 30 + Math.random() * 20;
            } else if (index === 1 || index === 2) { // leg/arm colors - darker
                lightness = 20 + Math.random() * 20;
            } else if (index === 3) { // accent color - lighter or more saturated
                lightness = 40 + Math.random() * 25;
            } else if (index === 4) { // eye color - bright
                lightness = 60 + Math.random() * 30;
            } else { // other accent colors
                lightness = 35 + Math.random() * 25;
            }

            return this._hslToHex(hue, saturation, lightness);
        });

        return {
            bodyColor: colors[0],
            legColor: colors[1],
            armColor: colors[2],
            accentColor: colors[3],
            eyeColor: colors[4],
            antennaColor: colors[5],
            mandibleColor: colors[6],
            spineColor: colors[7]
        };
    }

    _hslToHex(h, s, l) {
        s /= 100;
        l /= 100;

        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;

        let r = 0, g = 0, b = 0;

        if (h >= 0 && h < 60) {
            r = c; g = x; b = 0;
        } else if (h >= 60 && h < 120) {
            r = x; g = c; b = 0;
        } else if (h >= 120 && h < 180) {
            r = 0; g = c; b = x;
        } else if (h >= 180 && h < 240) {
            r = 0; g = x; b = c;
        } else if (h >= 240 && h < 300) {
            r = x; g = 0; b = c;
        } else {
            r = c; g = 0; b = x;
        }

        const toHex = (val) => {
            const hex = Math.round((val + m) * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    _randomizeAllProperties() {
        // Body properties
        this.bodySegments = Math.floor(1 + Math.random() * 9); // 1-10
        this.segmentLength = 10 + Math.random() * 40; // 10-50
        this.headSize = 10 + Math.random() * 50; // 10-60
        this.bodyWidth = 5 + Math.random() * 35; // 5-40
        this.tailTaper = Math.random(); // 0-1
        this.segmentSmoothing = 0.01 + Math.random() * 0.99; // 0.01-1

        // Body customization
        const bodyShapes = ["ellipse", "circle", "rectangle", "triangle"];
        this.bodyShape = bodyShapes[Math.floor(Math.random() * bodyShapes.length)];
        this.bodyScaleX = 0.5 + Math.random() * 1.5; // 0.5-2
        this.bodyScaleY = 0.5 + Math.random() * 1.5; // 0.5-2

        const spinePatterns = ["none", "spikes", "plates"];
        this.spinePattern = spinePatterns[Math.floor(Math.random() * spinePatterns.length)];
        this.spineSize = Math.random() * 20; // 0-20
        this.spineCount = Math.floor(Math.random() * 13); // 0-12

        // Snake properties
        this.snakeWaveAmplitude = Math.random() * 50; // 0-50
        this.snakeWaveFrequency = 0.5 + Math.random() * 4.5; // 0.5-5
        this.snakeWaveSpeed = 0.5 + Math.random() * 9.5; // 0.5-10

        // Leg properties
        this.legPairs = Math.floor(1 + Math.random() * 7); // 1-8
        this.legSegments = Math.floor(1 + Math.random() * 3); // 1-4
        this.legLength = 20 + Math.random() * 80; // 20-100
        this.legThickness = 1 + Math.random() * 9; // 1-10
        this.legSpread = Math.random() * 90; // 0-90
        this.legForwardOffset = -1 + Math.random() * 2; // -1 to 1
        this.legRandomness = Math.random() * 0.5; // 0-0.5

        const legJointStyles = ["smooth", "angular", "organic"];
        this.legJointStyle = legJointStyles[Math.floor(Math.random() * legJointStyles.length)];

        const legTipShapes = ["circle", "claw", "pad"];
        this.legTipShape = legTipShapes[Math.floor(Math.random() * legTipShapes.length)];

        this.legOffsetVariation = Math.random(); // 0-1

        // Arm properties
        this.armCount = Math.floor(Math.random() * 5); // 0-4
        this.armSegments = Math.floor(1 + Math.random() * 2); // 1-3
        this.armLength = 15 + Math.random() * 65; // 15-80
        this.armThickness = 1 + Math.random() * 7; // 1-8
        this.armReachRange = 50 + Math.random() * 150; // 50-200
        this.armReachSpeed = 1 + Math.random() * 9; // 1-10
        this.armSpringStiffness = 1 + Math.random() * 19; // 1-20
        this.armSpringDamping = Math.random(); // 0-1
        this.armRestForwardDistance = 0.3 + Math.random() * 0.7; // 0.3-1
        this.armRestOutwardAngle = Math.random() * 45; // 0-45
        this.armSwingEnabled = Math.random() > 0.3; // 70% chance true
        this.armSwingSpeed = 0.5 + Math.random() * 9.5; // 0.5-10
        this.armSwingAmount = Math.random() * 45; // 0-45

        // Arm combat
        this.punchSpeed = 1 + Math.random() * 19; // 1-20
        this.punchWindupDistance = Math.random(); // 0-1
        this.punchReachDistance = 0.8 + Math.random() * 1.2; // 0.8-2
        this.punchArcAmount = Math.random() * 60; // 0-60
        this.grabSpeed = 1 + Math.random() * 14; // 1-15
        this.grabHoldTime = Math.random() * 3; // 0-3

        // IK locomotion
        this.stepDistance = 20 + Math.random() * 80; // 20-100
        this.stepHeight = Math.random() * 30; // 0-30
        this.stepSpeed = 1 + Math.random() * 14; // 1-15
        this.alternateLegs = Math.random() > 0.5;

        // Generate balanced color scheme
        const colors = this._generateRandomColorScheme();
        this.bodyColor = colors.bodyColor;
        this.legColor = colors.legColor;
        this.armColor = colors.armColor;
        this.accentColor = colors.accentColor;
        this.eyeColor = colors.eyeColor;
        this.antennaColor = colors.antennaColor;
        this.mandibleColor = colors.mandibleColor;
        this.spineColor = colors.spineColor;

        // Shadow properties
        this.showShadow = Math.random() > 0.3; // 70% chance
        this.shadowOpacity = 0.1 + Math.random() * 0.4; // 0.1-0.5
        this.shadowBlur = Math.random() * 40; // 0-40
        this.shadowOffsetX = -10 + Math.random() * 20; // -10 to 10
        this.shadowOffsetY = -10 + Math.random() * 20; // -10 to 10

        // Appearance
        this.showEyes = Math.random() > 0.2; // 80% chance
        this.eyeCount = Math.floor(Math.random() * 9); // 0-8
        this.showJoints = Math.random() > 0.3; // 70% chance
        this.isometricAngle = Math.random() * 90; // 0-90
        //this.bodyHeight = Math.random() * 100; // 0-100

        // Head customization
        const headShapes = ["ellipse", "triangle", "rectangle", "diamond"];
        this.headShape = headShapes[Math.floor(Math.random() * headShapes.length)];
        this.antennaCount = Math.floor(Math.random() * 5); // 0-4
        this.antennaLength = 5 + Math.random() * 35; // 5-40
        this.mandibles = Math.random() > 0.5;

        // Movement
        this.moveSpeed = Math.random() * 200; // 0-200
        this.acceleration = 50 + Math.random() * 450; // 50-500
        this.turnSpeed = 30 + Math.random() * 330; // 30-360

        const movementStyles = ["wander", "circle", "zigzag", "patrol"];
        this.movementStyle = movementStyles[Math.floor(Math.random() * movementStyles.length)];

        this.wanderRadius = 50 + Math.random() * 450; // 50-500
        this.wanderWaitTime = Math.random() * 10; // 0-10
        this.arrivalThreshold = 5 + Math.random() * 45; // 5-50

        // Head look
        this.headLookEnabled = Math.random() > 0.3; // 70% chance
        this.headLookRange = 50 + Math.random() * 450; // 50-500
        this.headLookSpeed = 0.5 + Math.random() * 9.5; // 0.5-10

        // Reinitialize creature with new properties
        this._initializeCreature();

        // Mark scene as dirty for serialization
        if (this.gameObject && this.gameObject.scene) {
            this.gameObject.scene.dirty = true;

            // Also trigger markDirty if available
            if (typeof this.gameObject.scene.markDirty === 'function') {
                this.gameObject.scene.markDirty();
            }
        }

        // Refresh canvas to show changes
        if (window.editor && window.editor.refreshCanvas) {
            window.editor.refreshCanvas();
        }

        // Refresh the inspector to show the new values
        this.refreshInspector();
    }

    _updateHeadLook(deltaTime) {
        if (!this.headLookEnabled) {
            this._headTargetAngle = 0;
            this._headAngle += (this._headTargetAngle - this._headAngle) * this.headLookSpeed * deltaTime;
            return;
        }

        const worldPos = this.gameObject.getWorldPosition();
        let closestTarget = null;
        let closestDist = this.headLookRange;

        // Try to find object by name
        const namedObject = this.getGameObjectByName(this.headLookObject);
        if (namedObject && namedObject !== this.gameObject) {
            const dx = namedObject.position.x - worldPos.x;
            const dy = namedObject.position.y - worldPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < closestDist) {
                closestTarget = namedObject;
                closestDist = dist;
            }
        }

        // If not found, check for objects with matching tag
        if (!closestTarget && window.engine && window.engine.gameObjects) {
            for (let obj of window.engine.gameObjects) {
                // Skip itself
                if (obj === this.gameObject) {
                    continue;
                }

                if (obj.tag === this.headLookObject) {
                    const dx = obj.position.x - worldPos.x;
                    const dy = obj.position.y - worldPos.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < closestDist) {
                        closestTarget = obj;
                        closestDist = dist;
                    }
                }
            }
        }

        if (closestTarget) {
            const dx = closestTarget.position.x - worldPos.x;
            const dy = closestTarget.position.y - worldPos.y;
            const targetAngle = Math.atan2(dy, dx);
            const bodyAngle = this.gameObject.angle * Math.PI / 180;

            // Calculate relative angle
            let relativeAngle = targetAngle - bodyAngle;

            // Normalize to -PI to PI
            while (relativeAngle > Math.PI) relativeAngle -= Math.PI * 2;
            while (relativeAngle < -Math.PI) relativeAngle += Math.PI * 2;

            // Limit head rotation
            const maxHeadRotation = Math.PI * 0.4; // 72 degrees
            relativeAngle = Math.max(-maxHeadRotation, Math.min(maxHeadRotation, relativeAngle));

            this._headTargetAngle = relativeAngle;
        } else {
            this._headTargetAngle = 0;
        }

        // Smooth head rotation
        this._headAngle += (this._headTargetAngle - this._headAngle) * this.headLookSpeed * deltaTime;
    }

    draw(ctx) {
        ctx.save();

        if (this.showShadow) {
            this._drawShadow(ctx);
        }

        // Draw legs (behind body)
        for (let leg of this._legs) {
            this._drawLeg(ctx, leg);
        }

        // Draw arms (in front of body, behind head)
        for (let arm of this._arms) {
            this._drawArm(ctx, arm);
        }

        // Draw body segments
        for (let i = this._segments.length - 1; i >= 0; i--) {
            this._drawSegment(ctx, i);
        }

        // Draw head
        this._drawHead(ctx);

        ctx.restore();
    }

    _drawShadow(ctx) {
        if (!this.showShadow) return;

        const worldPos = this.gameObject.getWorldPosition();
        const bodyAngle = this.gameObject.angle * Math.PI / 180;

        ctx.save();

        // Use globalAlpha for transparency
        ctx.globalAlpha = this.shadowOpacity;

        // Pre-calculate the world-space shadow offset (apply offset BEFORE rotation)
        const cos = Math.cos(-bodyAngle);
        const sin = Math.sin(-bodyAngle);

        // Rotate the shadow offset into local space so it stays consistent in world space
        const localShadowOffsetX = this.shadowOffsetX * cos - this.shadowOffsetY * sin;
        const localShadowOffsetY = this.shadowOffsetX * sin + this.shadowOffsetY * cos;

        // Draw a shadow blob for each body segment
        for (let i = 0; i < this._segments.length; i++) {
            const segment = this._segments[i];
            const taperFactor = 1 - (i / this._segments.length) * this.tailTaper;
            const width = this.bodyWidth * taperFactor;

            // Convert segment world position to local space (for drawing)
            const dx = segment.worldPos.x - worldPos.x;
            const dy = segment.worldPos.y - worldPos.y;
            const localX = dx * cos - dy * sin;
            const localY = dx * sin + dy * cos;

            // Apply the rotated shadow offset (so it appears consistent in world space)
            const shadowX = localX + localShadowOffsetX;
            const shadowY = localY + localShadowOffsetY;

            // Calculate shadow size based on segment width and length
            const shadowRadiusX = (this.segmentLength * 0.6 * this.bodyScaleX + width * 0.5) * 0.5;
            const shadowRadiusY = (width * 0.5 * this.bodyScaleY + width * 0.3) * 0.5;

            // Create radial gradient for soft shadow edge
            const gradient = ctx.createRadialGradient(
                shadowX, shadowY, 0,
                shadowX, shadowY, Math.max(shadowRadiusX, shadowRadiusY) + this.shadowBlur
            );

            // Parse shadow color and apply opacity
            const color = this.shadowColor;
            gradient.addColorStop(0, color);
            gradient.addColorStop(0.5, color);
            gradient.addColorStop(1, color + '00'); // Transparent at edge

            ctx.fillStyle = gradient;

            // Draw elliptical shadow blob - rotate to match segment for elongated shadows
            ctx.beginPath();
            ctx.ellipse(
                shadowX, shadowY,
                shadowRadiusX + this.shadowBlur,
                shadowRadiusY + this.shadowBlur * 0.6,
                segment.angle - bodyAngle, // Shadow rotates with segment for proper shape
                0, Math.PI * 2
            );
            ctx.fill();
        }

        // Optional: Draw smaller shadows for legs if they're visible
        if (this._legs.length > 0 && this.shadowBlur > 5) {
            for (let leg of this._legs) {
                const footDX = leg.currentPos.x - worldPos.x;
                const footDY = leg.currentPos.y - worldPos.y;
                const localFootX = footDX * cos - footDY * sin;
                const localFootY = footDX * sin + footDY * cos;

                // Apply the rotated shadow offset
                const shadowX = localFootX + localShadowOffsetX;
                const shadowY = localFootY + localShadowOffsetY;

                // Small shadow for foot
                const footShadowRadius = this.legThickness * 1.5;
                const gradient = ctx.createRadialGradient(
                    shadowX, shadowY, 0,
                    shadowX, shadowY, footShadowRadius + this.shadowBlur * 0.3
                );

                gradient.addColorStop(0, this.shadowColor);
                gradient.addColorStop(1, this.shadowColor + '00');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(shadowX, shadowY, footShadowRadius + this.shadowBlur * 0.3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw shadows for arms
        if (this._arms.length > 0 && this.shadowBlur > 5) {
            for (let arm of this._arms) {
                // Shadow for hand position
                const handDX = arm.currentHandPos.x - worldPos.x;
                const handDY = arm.currentHandPos.y - worldPos.y;
                const localHandX = handDX * cos - handDY * sin;
                const localHandY = handDX * sin + handDY * cos;

                // Apply the rotated shadow offset
                const shadowX = localHandX + localShadowOffsetX;
                const shadowY = localHandY + localShadowOffsetY;

                // Small shadow for hand
                const handShadowRadius = this.armThickness * 1.8;
                const gradient = ctx.createRadialGradient(
                    shadowX, shadowY, 0,
                    shadowX, shadowY, handShadowRadius + this.shadowBlur * 0.3
                );

                gradient.addColorStop(0, this.shadowColor);
                gradient.addColorStop(1, this.shadowColor + '00');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(shadowX, shadowY, handShadowRadius + this.shadowBlur * 0.3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    _drawArm(ctx, arm) {
        const worldPos = this.gameObject.getWorldPosition();
        const bodyAngle = this.gameObject.angle * Math.PI / 180;

        // Transform world coordinates to local space
        const cos = Math.cos(-bodyAngle);
        const sin = Math.sin(-bodyAngle);

        // Base position in local space
        const baseDX = arm.baseWorldX - worldPos.x;
        const baseDY = arm.baseWorldY - worldPos.y;
        const localBaseX = baseDX * cos - baseDY * sin;
        const localBaseY = baseDX * sin + baseDY * cos;

        // Hand position in local space
        const handDX = arm.currentHandPos.x - worldPos.x;
        const handDY = arm.currentHandPos.y - worldPos.y;
        const localHandX = handDX * cos - handDY * sin;
        const localHandY = handDX * sin + handDY * cos;

        // Calculate 2-point IK (shoulder to elbow to hand)
        const totalDist = Math.sqrt(
            (localHandX - localBaseX) ** 2 +
            (localHandY - localBaseY) ** 2
        );

        const segmentLength = this.armLength / this.armSegments;
        const totalArmLength = segmentLength * this.armSegments;

        // 2-point IK for elbow position
        let elbowX, elbowY;

        if (this.armSegments === 2) {
            // Classic 2-point IK (shoulder-elbow-hand)
            const upperArmLength = segmentLength;
            const lowerArmLength = segmentLength;

            if (totalDist >= totalArmLength - 0.1) {
                // Arm is fully extended - straighten it
                const dirX = (localHandX - localBaseX) / totalDist;
                const dirY = (localHandY - localBaseY) / totalDist;
                elbowX = localBaseX + dirX * upperArmLength;
                elbowY = localBaseY + dirY * upperArmLength;
            } else {
                // Calculate elbow position using law of cosines
                const a = upperArmLength;
                const b = lowerArmLength;
                const c = totalDist;

                // Angle at shoulder
                const cosAngleA = (a * a + c * c - b * b) / (2 * a * c);
                const angleA = Math.acos(Math.max(-1, Math.min(1, cosAngleA)));

                // Direction from shoulder to hand
                const baseToHandAngle = Math.atan2(localHandY - localBaseY, localHandX - localBaseX);

                // Elbow angle - bend INWARD and DOWNWARD (toward creature center and forward)
                // Positive angle bends the elbow downward/forward
                // Left arm (side = -1) gets positive bend, right arm (side = 1) gets positive bend
                const elbowBendDirection = arm.side; // Same as side makes it bend forward
                const elbowAngle = baseToHandAngle + angleA * elbowBendDirection;

                elbowX = localBaseX + Math.cos(elbowAngle) * upperArmLength;
                elbowY = localBaseY + Math.sin(elbowAngle) * upperArmLength;
            }
        } else {
            // Multiple segments - simplified chaining
            const dirX = totalDist > 0 ? (localHandX - localBaseX) / totalDist : 0;
            const dirY = totalDist > 0 ? (localHandY - localBaseY) / totalDist : 0;
            elbowX = localBaseX + dirX * segmentLength;
            elbowY = localBaseY + dirY * segmentLength;
        }

        // Draw arm
        ctx.save();
        ctx.strokeStyle = this.armColor;
        ctx.lineWidth = this.armThickness;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw upper arm (shoulder to elbow)
        ctx.beginPath();
        ctx.moveTo(localBaseX, localBaseY);
        ctx.lineTo(elbowX, elbowY);
        ctx.stroke();

        // Draw lower arm (elbow to hand)
        ctx.beginPath();
        ctx.moveTo(elbowX, elbowY);
        ctx.lineTo(localHandX, localHandY);
        ctx.stroke();

        // Draw joints
        if (this.showJoints) {
            ctx.fillStyle = this.accentColor;

            // Shoulder joint
            ctx.beginPath();
            ctx.arc(localBaseX, localBaseY, this.armThickness * 0.8, 0, Math.PI * 2);
            ctx.fill();

            // Elbow joint
            ctx.beginPath();
            ctx.arc(elbowX, elbowY, this.armThickness * 1.2, 0, Math.PI * 2);
            ctx.fill();

            // Hand
            ctx.beginPath();
            ctx.arc(localHandX, localHandY, this.armThickness * 1.5, 0, Math.PI * 2);
            ctx.fill();

            // If reaching for something, draw indicator
            /*if (arm.reachingTarget) {
                ctx.strokeStyle = this.accentColor;
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.arc(localHandX, localHandY, this.armThickness * 2.5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }*/
        }

        ctx.restore();
    }

    _drawLeg(ctx, leg) {
        const worldPos = this.gameObject.getWorldPosition();
        const bodyAngle = this.gameObject.angle * Math.PI / 180;

        // Get base and foot positions
        const baseX = leg.baseX;
        const baseY = leg.baseY;

        // Transform world coordinates to local space relative to body
        const cos = Math.cos(-bodyAngle);
        const sin = Math.sin(-bodyAngle);

        // Correct rotation transform for base position
        const baseDX = baseX - worldPos.x;
        const baseDY = baseY - worldPos.y;
        const localBaseX = baseDX * cos - baseDY * sin;
        const localBaseY = baseDX * sin + baseDY * cos;

        // Correct rotation transform for foot position
        const footDX = leg.currentPos.x - worldPos.x;
        const footDY = leg.currentPos.y - worldPos.y;
        const localFootX = footDX * cos - footDY * sin;
        const localFootY = footDX * sin + footDY * cos;

        // IK solve for leg segments - pass joint style so solver can emit appropriate joint positions
        const joints = this._solveLegIK(
            localBaseX, localBaseY,
            localFootX, localFootY,
            this.legSegments,
            this.legJointStyle,
            this.legLength * leg.lengthMultiplier
        );

        // Draw leg segments based on style
        const effectiveThickness = this.legThickness * leg.thicknessMultiplier;
        ctx.strokeStyle = this.legColor;
        ctx.lineWidth = effectiveThickness;

        if (this.legJointStyle === "angular") {
            ctx.lineCap = 'butt';
            ctx.lineJoin = 'miter';
        } else {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }

        ctx.beginPath();
        ctx.moveTo(localBaseX, localBaseY);
        for (let joint of joints) {
            ctx.lineTo(joint.x, joint.y);
        }
        ctx.lineTo(localFootX, localFootY);
        ctx.stroke();

        // Draw joints based on style
        if (this.showJoints) {
            ctx.fillStyle = this.accentColor;

            if (this.legJointStyle === "organic") {
                // Organic: larger, softer joints
                for (let joint of joints) {
                    ctx.beginPath();
                    ctx.arc(joint.x, joint.y, effectiveThickness * 1.2, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (this.legJointStyle === "angular") {
                // Angular: square joints
                for (let joint of joints) {
                    const size = effectiveThickness * 1.5;
                    ctx.fillRect(joint.x - size / 2, joint.y - size / 2, size, size);
                }
            } else {
                // Smooth: default circular joints
                for (let joint of joints) {
                    ctx.beginPath();
                    ctx.arc(joint.x, joint.y, effectiveThickness * 0.8, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Draw foot based on legTipShape
            this._drawLegTip(ctx, localFootX, localFootY, effectiveThickness, leg);
        }
    }

    _drawLegTip(ctx, x, y, thickness, leg) {
        const worldPos = this.gameObject.getWorldPosition();
        const bodyAngle = this.gameObject.angle * Math.PI / 180;

        // Calculate angle from base to foot for directional tips
        const dx = leg.currentPos.x - leg.baseX;
        const dy = leg.currentPos.y - leg.baseY;
        const footAngle = Math.atan2(dy, dx);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(footAngle - bodyAngle);

        ctx.fillStyle = this.accentColor;

        switch (this.legTipShape) {
            case "claw":
                // Three-pronged claw
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(thickness * 2, -thickness);
                ctx.lineTo(thickness * 1.5, 0);
                ctx.lineTo(thickness * 2, thickness);
                ctx.closePath();
                ctx.fill();
                break;

            case "pad":
                // Oval pad
                ctx.beginPath();
                ctx.ellipse(thickness * 0.5, 0, thickness * 1.5, thickness, 0, 0, Math.PI * 2);
                ctx.fill();
                break;

            default: // circle
                ctx.beginPath();
                ctx.arc(0, 0, thickness * 1.2, 0, Math.PI * 2);
                ctx.fill();
        }

        ctx.restore();
    }

    _solveLegIK(startX, startY, endX, endY, segmentCount, style = "smooth", nominalLength = 0) {
        const joints = [];

        if (segmentCount <= 1) {
            return joints;
        }

        // Straight-line distance
        const totalDist = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);

        // If nominalLength provided, we can use it to bias joint placement; otherwise distribute evenly
        const segmentLength = totalDist / segmentCount;

        // Helper: unit direction from A to B
        const dirX = totalDist > 0 ? (endX - startX) / totalDist : 1;
        const dirY = totalDist > 0 ? (endY - startY) / totalDist : 0;

        // Perpendicular (to introduce bends)
        const perpX = -dirY;
        const perpY = dirX;

        if (style === "angular") {
            // Create one pronounced "knee" per leg (for segmentCount===2 this is one joint)
            // For more segments, distribute knees every other segment
            const bendAmount = Math.min(Math.max(nominalLength * 0.25, 6), 40); // clamp
            let currentX = startX;
            let currentY = startY;

            for (let i = 1; i < segmentCount; i++) {
                // fraction along the line
                const t = i / segmentCount;
                const targetX = startX + dirX * totalDist * t;
                const targetY = startY + dirY * totalDist * t;

                // Put a stronger perpendicular offset near the middle (knee-like)
                const kneeFactor = Math.sin(Math.PI * t); // 0 at ends, 1 in middle
                const offset = bendAmount * kneeFactor * (i % 2 === 0 ? -1 : 1);

                const jointX = targetX + perpX * offset;
                const jointY = targetY + perpY * offset;

                // For the last iteration we don't include the final end point as a joint
                if (i < segmentCount) {
                    joints.push({ x: jointX, y: jointY });
                }

                currentX = jointX;
                currentY = jointY;
            }
        } else if (style === "organic") {
            // Produce smoothly curved joints using quadratic spacing (closer near the base and foot)
            for (let i = 1; i < segmentCount; i++) {
                const t = i / segmentCount;
                // ease-in-out spacing
                const tt = t * t * (3 - 2 * t);
                const basePointX = startX + dirX * totalDist * tt;
                const basePointY = startY + dirY * totalDist * tt;

                // smaller perpendicular offsets to give a soft curve
                const offsetAmount = Math.sin(Math.PI * tt) * Math.min(nominalLength * 0.12, 12);
                const jointX = basePointX + perpX * offsetAmount;
                const jointY = basePointY + perpY * offsetAmount;

                joints.push({ x: jointX, y: jointY });
            }
        } else {
            // "smooth" (default) - evenly spaced joints along straight line (simple but effective)
            let currentX = startX;
            let currentY = startY;

            for (let i = 0; i < segmentCount - 1; i++) {
                const dx = endX - currentX;
                const dy = endY - currentY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    const ratio = segmentLength / dist;
                    currentX += dx * ratio;
                    currentY += dy * ratio;
                    joints.push({ x: currentX, y: currentY });
                }
            }
        }

        return joints;
    }

    _drawSegment(ctx, index) {
        const segment = this._segments[index];
        const taperFactor = 1 - (index / this._segments.length) * this.tailTaper;
        const width = this.bodyWidth * taperFactor;

        // Calculate height offset for isometric view
        const isometricRad = this.isometricAngle * Math.PI / 180;
        const heightOffset = -Math.sin(isometricRad) * this.bodyHeight;

        const worldPos = this.gameObject.getWorldPosition();
        const bodyAngle = this.gameObject.angle * Math.PI / 180;

        // Convert world position to local space
        const dx = segment.worldPos.x - worldPos.x;
        const dy = segment.worldPos.y - worldPos.y;
        const cos = Math.cos(-bodyAngle);
        const sin = Math.sin(-bodyAngle);
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        ctx.save();
        // Apply height offset to move body up (negative Y)
        ctx.translate(localX, localY + heightOffset);

        // Use the segment's absolute angle minus the body angle for relative rotation
        ctx.rotate(segment.angle - bodyAngle);

        ctx.fillStyle = this.bodyColor;
        ctx.strokeStyle = this.accentColor;
        ctx.lineWidth = 2;

        // Different body shapes
        switch (this.bodyShape) {
            case "circle":
                ctx.beginPath();
                ctx.arc(0, 0, width * 0.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                break;
            case "rectangle":
                ctx.fillRect(-this.segmentLength * 0.4, -width * 0.5, this.segmentLength * 0.8, width);
                ctx.strokeRect(-this.segmentLength * 0.4, -width * 0.5, this.segmentLength * 0.8, width);
                break;
            case "triangle":
                ctx.beginPath();
                ctx.moveTo(this.segmentLength * 0.4, 0);
                ctx.lineTo(-this.segmentLength * 0.4, -width * 0.5);
                ctx.lineTo(-this.segmentLength * 0.4, width * 0.5);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
            default: // ellipse
                ctx.beginPath();
                ctx.ellipse(0, 0, this.segmentLength * 0.6 * this.bodyScaleX,
                    width * 0.5 * this.bodyScaleY, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
        }

        // Add spine pattern
        this._drawSpinePattern(ctx, width, taperFactor);

        ctx.restore();
    }

    _drawSpinePattern(ctx, width, taperFactor) {
        if (this.spinePattern === "none") return;

        const spineSize = this.spineSize * taperFactor;
        ctx.fillStyle = this.spineColor;

        switch (this.spinePattern) {
            case "spikes":
                for (let i = 0; i < this.spineCount; i++) {
                    const normalizedPos = i / this.spineCount;
                    let x, yTop, yBottom;

                    // Position spikes based on body shape
                    switch (this.bodyShape) {
                        case "circle":
                            const circleAngle = normalizedPos * Math.PI * 2;
                            const radius = width * 0.5;
                            x = Math.cos(circleAngle) * radius * 0.7;
                            yTop = -Math.sin(circleAngle) * radius;
                            yBottom = Math.sin(circleAngle) * radius;
                            break;

                        case "triangle":
                            x = (normalizedPos - 0.5) * this.segmentLength * 0.8;
                            yTop = -width * 0.5 * (1 - normalizedPos * 0.5);
                            yBottom = width * 0.5 * (1 - normalizedPos * 0.5);
                            break;

                        case "rectangle":
                            x = (normalizedPos - 0.5) * this.segmentLength * 0.8;
                            yTop = -width * 0.5;
                            yBottom = width * 0.5;
                            break;

                        default: // ellipse
                            x = (normalizedPos - 0.5) * this.segmentLength * this.bodyScaleX;
                            const ellipseY = Math.sqrt(Math.max(0, 1 - (x / (this.segmentLength * 0.6 * this.bodyScaleX)) ** 2));
                            yTop = -ellipseY * width * 0.5 * this.bodyScaleY;
                            yBottom = ellipseY * width * 0.5 * this.bodyScaleY;
                    }

                    // Top spike
                    ctx.beginPath();
                    ctx.moveTo(x, yTop);
                    ctx.lineTo(x - spineSize * 0.15, yTop - spineSize);
                    ctx.lineTo(x + spineSize * 0.15, yTop - spineSize * 0.8);
                    ctx.closePath();
                    ctx.fill();

                    // Bottom spike
                    ctx.beginPath();
                    ctx.moveTo(x, yBottom);
                    ctx.lineTo(x - spineSize * 0.15, yBottom + spineSize);
                    ctx.lineTo(x + spineSize * 0.15, yBottom + spineSize * 0.8);
                    ctx.closePath();
                    ctx.fill();
                }
                break;

            case "plates":
                for (let i = 0; i < this.spineCount; i++) {
                    const normalizedPos = i / this.spineCount;
                    let x, yTop, yBottom;

                    // Position plates based on body shape
                    switch (this.bodyShape) {
                        case "circle":
                            const circleAngle = normalizedPos * Math.PI * 2;
                            const radius = width * 0.5;
                            x = Math.cos(circleAngle) * radius * 0.7;
                            yTop = -Math.sin(circleAngle) * radius;
                            yBottom = Math.sin(circleAngle) * radius;
                            break;

                        case "triangle":
                            x = (normalizedPos - 0.5) * this.segmentLength * 0.8;
                            yTop = -width * 0.5 * (1 - normalizedPos * 0.5);
                            yBottom = width * 0.5 * (1 - normalizedPos * 0.5);
                            break;

                        case "rectangle":
                            x = (normalizedPos - 0.5) * this.segmentLength * 0.8;
                            yTop = -width * 0.5;
                            yBottom = width * 0.5;
                            break;

                        default: // ellipse
                            x = (normalizedPos - 0.5) * this.segmentLength * this.bodyScaleX;
                            const ellipseY = Math.sqrt(Math.max(0, 1 - (x / (this.segmentLength * 0.6 * this.bodyScaleX)) ** 2));
                            yTop = -ellipseY * width * 0.5 * this.bodyScaleY;
                            yBottom = ellipseY * width * 0.5 * this.bodyScaleY;
                    }

                    // Top plate
                    ctx.beginPath();
                    ctx.ellipse(x, yTop - spineSize * 0.3, spineSize * 0.5, spineSize * 0.3, 0, 0, Math.PI * 2);
                    ctx.fill();

                    // Bottom plate
                    ctx.beginPath();
                    ctx.ellipse(x, yBottom + spineSize * 0.3, spineSize * 0.5, spineSize * 0.3, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
        }
    }

    _drawHead(ctx) {
        const head = this._segments[0];

        // Calculate height offset for isometric view
        const isometricRad = this.isometricAngle * Math.PI / 180;
        const heightOffset = -Math.sin(isometricRad) * this.bodyHeight;

        const worldPos = this.gameObject.getWorldPosition();
        const bodyAngle = this.gameObject.angle * Math.PI / 180;

        // Convert world position to local space
        const dx = head.worldPos.x - worldPos.x;
        const dy = head.worldPos.y - worldPos.y;
        const cos = Math.cos(-bodyAngle);
        const sin = Math.sin(-bodyAngle);
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        ctx.save();
        // Apply height offset to move head up (negative Y)
        ctx.translate(localX, localY + heightOffset);

        // Use head's absolute angle minus body angle, plus head look
        ctx.rotate(head.angle - bodyAngle + this._headAngle);

        // Draw antennae behind head
        if (this.antennaCount > 0) {
            this._drawAntennae(ctx);
        }

        // Draw mandibles behind head
        if (this.mandibles) {
            this._drawMandibles(ctx);
        }

        // Head shape
        ctx.fillStyle = this.bodyColor;
        ctx.strokeStyle = this.accentColor;
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        switch (this.headShape) {
            case "triangle":
                ctx.moveTo(this.headSize * 0.8, 0);
                ctx.lineTo(-this.headSize * 0.4, -this.headSize * 0.5);
                ctx.lineTo(-this.headSize * 0.4, this.headSize * 0.5);
                ctx.closePath();
                break;

            case "rectangle":
                ctx.rect(-this.headSize * 0.5, -this.headSize * 0.4, this.headSize, this.headSize * 0.8);
                break;

            case "diamond":
                ctx.moveTo(this.headSize * 0.6, 0);
                ctx.lineTo(0, -this.headSize * 0.5);
                ctx.lineTo(-this.headSize * 0.6, 0);
                ctx.lineTo(0, this.headSize * 0.5);
                ctx.closePath();
                break;

            default: // ellipse
                ctx.ellipse(0, 0, this.headSize * 0.7, this.headSize * 0.5, 0, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.stroke();

        // Eyes
        if (this.showEyes && this.eyeCount > 0) {
            ctx.fillStyle = this.eyeColor;
            const eyeSize = this.headSize * 0.15;

            if (this.eyeCount === 1) {
                ctx.beginPath();
                ctx.arc(this.headSize * 0.3, 0, eyeSize, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.eyeCount === 2) {
                const eyeSpacing = this.headSize * 0.3;
                ctx.beginPath();
                ctx.arc(this.headSize * 0.3, -eyeSpacing * 0.5, eyeSize, 0, Math.PI * 2);
                ctx.arc(this.headSize * 0.3, eyeSpacing * 0.5, eyeSize, 0, Math.PI * 2);
                ctx.fill();
            } else {
                for (let i = 0; i < this.eyeCount; i++) {
                    const angle = (i / (this.eyeCount - 1) - 0.5) * Math.PI * 0.8;
                    const eyeX = this.headSize * 0.4 * Math.cos(angle);
                    const eyeY = this.headSize * 0.4 * Math.sin(angle);
                    ctx.beginPath();
                    ctx.arc(eyeX, eyeY, eyeSize * 0.8, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        ctx.restore();
    }

    _drawAntennae(ctx) {
        ctx.strokeStyle = this.antennaColor;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        for (let i = 0; i < this.antennaCount; i++) {
            // Distribute antennae symmetrically around the top-back of the head
            let angle;
            if (this.antennaCount === 1) {
                // Single antenna points straight back/up
                angle = -Math.PI / 2; // -90 degrees
            } else {
                // Multiple antennae spread symmetrically
                // Map from 0 to antennaCount-1 into a range centered at -90 degrees
                const spreadAngle = Math.PI * 0.5; // 90 degree total spread
                const normalizedPos = i / (this.antennaCount - 1); // 0 to 1
                angle = -Math.PI / 2 + (normalizedPos - 0.5) * spreadAngle;
            }

            // Base position on the head (slightly back from center)
            const baseRadius = this.headSize * 0.3;
            const baseX = Math.cos(angle + Math.PI) * baseRadius;
            const baseY = Math.sin(angle + Math.PI) * baseRadius;

            // Curved antenna extending outward
            const controlLength = this.antennaLength * 0.5;
            const controlX = baseX + Math.cos(angle) * controlLength;
            const controlY = baseY + Math.sin(angle) * controlLength;

            const endLength = this.antennaLength * 0.8;
            const endX = baseX + Math.cos(angle) * endLength;
            const endY = baseY + Math.sin(angle) * endLength;

            ctx.beginPath();
            ctx.moveTo(baseX, baseY);
            ctx.quadraticCurveTo(controlX, controlY, endX, endY);
            ctx.stroke();

            // Antenna tip
            ctx.fillStyle = this.antennaColor;
            ctx.beginPath();
            ctx.arc(endX, endY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawMandibles(ctx) {
        ctx.strokeStyle = this.mandibleColor;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';

        const mandibleLength = this.headSize * 0.6;

        // Left mandible
        ctx.beginPath();
        ctx.moveTo(this.headSize * 0.3, -this.headSize * 0.2);
        ctx.lineTo(this.headSize * 0.5 + mandibleLength * 0.3, -this.headSize * 0.4);
        ctx.lineTo(this.headSize * 0.4 + mandibleLength * 0.5, -this.headSize * 0.35);
        ctx.stroke();

        // Right mandible
        ctx.beginPath();
        ctx.moveTo(this.headSize * 0.3, this.headSize * 0.2);
        ctx.lineTo(this.headSize * 0.5 + mandibleLength * 0.3, this.headSize * 0.4);
        ctx.lineTo(this.headSize * 0.4 + mandibleLength * 0.5, this.headSize * 0.35);
        ctx.stroke();

        // Mandible tips
        ctx.fillStyle = this.mandibleColor;
        ctx.beginPath();
        ctx.arc(this.headSize * 0.4 + mandibleLength * 0.5, -this.headSize * 0.35, 3, 0, Math.PI * 2);
        ctx.arc(this.headSize * 0.4 + mandibleLength * 0.5, this.headSize * 0.35, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // PUBLIC API METHODS

    /**
     * Check if a world point is inside any body segment
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {Object|null} - {segmentIndex, localX, localY, distance} or null if not hit
     */
    isPointInBody(worldX, worldY) {
        for (let i = 0; i < this._segments.length; i++) {
            const segment = this._segments[i];
            const taperFactor = 1 - (i / this._segments.length) * this.tailTaper;
            const width = this.bodyWidth * taperFactor;

            // Transform point to segment local space
            const dx = worldX - segment.worldPos.x;
            const dy = worldY - segment.worldPos.y;
            const cos = Math.cos(-segment.angle);
            const sin = Math.sin(-segment.angle);
            const localX = dx * cos - dy * sin;
            const localY = dx * sin + dy * cos;

            let isInside = false;
            const distance = Math.sqrt(localX * localX + localY * localY);

            // Check based on body shape
            switch (this.bodyShape) {
                case "circle":
                    isInside = distance <= (width * 0.5);
                    break;
                case "rectangle":
                    isInside = Math.abs(localX) <= this.segmentLength * 0.4 &&
                        Math.abs(localY) <= width * 0.5;
                    break;
                case "triangle":
                    if (localX <= this.segmentLength * 0.4 && localX >= -this.segmentLength * 0.4) {
                        const maxY = width * 0.5;
                        isInside = Math.abs(localY) <= maxY;
                    }
                    break;
                default: // ellipse
                    const rx = this.segmentLength * 0.6 * this.bodyScaleX;
                    const ry = width * 0.5 * this.bodyScaleY;
                    isInside = ((localX * localX) / (rx * rx) + (localY * localY) / (ry * ry)) <= 1;
            }

            if (isInside) {
                return {
                    segmentIndex: i,
                    localX: localX,
                    localY: localY,
                    distance: distance,
                    worldPos: { x: segment.worldPos.x, y: segment.worldPos.y },
                    angle: segment.angle
                };
            }
        }
        return null;
    }

    /**
     * Get world position of a specific body segment
     * @param {number} segmentIndex - Index of the segment (0 = head)
     * @returns {Object|null} - {x, y, angle} or null if invalid index
     */
    getSegmentWorldPosition(segmentIndex) {
        if (segmentIndex < 0 || segmentIndex >= this._segments.length) {
            return null;
        }
        const segment = this._segments[segmentIndex];
        return {
            x: segment.worldPos.x,
            y: segment.worldPos.y,
            angle: segment.angle
        };
    }

    /**
     * Get the closest point on any body segment to a world point
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {Object} - {segmentIndex, worldX, worldY, distance}
     */
    getClosestPointOnBody(worldX, worldY) {
        let closestSegment = 0;
        let closestDist = Infinity;
        let closestPoint = { x: 0, y: 0 };

        for (let i = 0; i < this._segments.length; i++) {
            const segment = this._segments[i];
            const dx = worldX - segment.worldPos.x;
            const dy = worldY - segment.worldPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < closestDist) {
                closestDist = dist;
                closestSegment = i;
                closestPoint.x = segment.worldPos.x;
                closestPoint.y = segment.worldPos.y;
            }
        }

        return {
            segmentIndex: closestSegment,
            worldX: closestPoint.x,
            worldY: closestPoint.y,
            distance: closestDist
        };
    }

    /**
     * Get total number of body segments
     * @returns {number}
     */
    getSegmentCount() {
        return this._segments.length;
    }

    /**
     * Get array of all segment world positions
     * @returns {Array<Object>} - Array of {x, y, angle, width}
     */
    getAllSegmentPositions() {
        return this._segments.map((segment, i) => {
            const taperFactor = 1 - (i / this._segments.length) * this.tailTaper;
            const width = this.bodyWidth * taperFactor;
            return {
                x: segment.worldPos.x,
                y: segment.worldPos.y,
                angle: segment.angle,
                width: width
            };
        });
    }

    /**
     * Get world position of a specific hand
     * @param {number} armIndex - Index of the arm (0 to armCount-1)
     * @returns {Object|null} - {x, y, isReaching, target} or null if invalid index
     */
    getHandPosition(armIndex) {
        if (armIndex < 0 || armIndex >= this._arms.length) {
            return null;
        }
        const arm = this._arms[armIndex];
        return {
            x: arm.currentHandPos.x,
            y: arm.currentHandPos.y,
            isReaching: arm.reachingTarget !== null,
            target: arm.reachingTarget
        };
    }

    /**
     * Get all hand positions
     * @returns {Array<Object>} - Array of {x, y, isReaching, target}
     */
    getAllHandPositions() {
        return this._arms.map((arm, index) => ({
            index: index,
            x: arm.currentHandPos.x,
            y: arm.currentHandPos.y,
            isReaching: arm.reachingTarget !== null,
            target: arm.reachingTarget
        }));
    }

    /**
     * Set target position for a specific hand (overrides automatic reaching)
     * @param {number} armIndex - Index of the arm
     * @param {number} worldX - Target world X coordinate
     * @param {number} worldY - Target world Y coordinate
     * @param {boolean} temporary - If true, will return to automatic behavior after reaching
     */
    setHandTarget(armIndex, worldX, worldY, temporary = false) {
        if (armIndex < 0 || armIndex >= this._arms.length) {
            return false;
        }
        const arm = this._arms[armIndex];
        arm.targetHandPos.x = worldX;
        arm.targetHandPos.y = worldY;
        arm.manualControl = !temporary;
        return true;
    }

    /**
     * Release manual control of a hand, returning it to automatic behavior
     * @param {number} armIndex - Index of the arm
     */
    releaseHandControl(armIndex) {
        if (armIndex < 0 || armIndex >= this._arms.length) {
            return false;
        }
        this._arms[armIndex].manualControl = false;
        return true;
    }

    /**
     * Check if a hand is currently reaching for an object
     * @param {number} armIndex - Index of the arm
     * @returns {Object|null} - The target object or null
     */
    getHandTarget(armIndex) {
        if (armIndex < 0 || armIndex >= this._arms.length) {
            return null;
        }
        return this._arms[armIndex].reachingTarget;
    }

    /**
     * Point a specific hand toward a position relative to the creature's position
     * @param {number} armIndex - Index of the arm (0 to armCount-1)
     * @param {number} relativeX - X offset from creature position
     * @param {number} relativeY - Y offset from creature position
     * @param {boolean} temporary - If true, will return to automatic behavior after reaching
     * @returns {boolean} - Success status
     */
    pointHandAtRelative(armIndex, relativeX, relativeY, temporary = false) {
        if (armIndex < 0 || armIndex >= this._arms.length) {
            return false;
        }
        const worldPos = this.gameObject.getWorldPosition();
        const worldX = worldPos.x + relativeX;
        const worldY = worldPos.y + relativeY;
        return this.setHandTarget(armIndex, worldX, worldY, temporary);
    }

    /**
     * Point a specific hand toward an absolute world position
     * @param {number} armIndex - Index of the arm (0 to armCount-1)
     * @param {number} worldX - Target world X coordinate
     * @param {number} worldY - Target world Y coordinate
     * @param {boolean} temporary - If true, will return to automatic behavior after reaching
     * @returns {boolean} - Success status
     */
    pointHandAtWorld(armIndex, worldX, worldY, temporary = false) {
        return this.setHandTarget(armIndex, worldX, worldY, temporary);
    }

    /**
     * Point a specific hand toward the mouse position
     * @param {number} armIndex - Index of the arm (0 to armCount-1)
     * @param {boolean} temporary - If true, will return to automatic behavior after reaching
     * @returns {boolean} - Success status
     */
    pointHandAtMouse(armIndex, temporary = false) {
        if (armIndex < 0 || armIndex >= this._arms.length) {
            return false;
        }

        // Get mouse position - check for InputManager
        let mouseX, mouseY;

        if (window.engine && window.engine.inputManager) {
            // Use InputManager if available
            mouseX = window.engine.inputManager.mouseX;
            mouseY = window.engine.inputManager.mouseY;
        } else if (window.engine && window.engine.canvas) {
            // Fallback: try to get mouse position from canvas events
            const canvas = window.engine.canvas;
            const rect = canvas.getBoundingClientRect();

            // These might not be set yet, so we'll need to track them
            if (!this._mouseX || !this._mouseY) {
                // Add mouse move listener if not already added
                if (!this._mouseListenerAdded) {
                    canvas.addEventListener('mousemove', (e) => {
                        this._mouseX = e.clientX - rect.left;
                        this._mouseY = e.clientY - rect.top;
                    });
                    this._mouseListenerAdded = true;
                }
                return false; // Mouse position not available yet
            }
            mouseX = this._mouseX;
            mouseY = this._mouseY;
        } else {
            return false; // No way to get mouse position
        }

        return this.setHandTarget(armIndex, mouseX, mouseY, temporary);
    }

    /**
     * Point all hands toward a relative position
     * @param {number} relativeX - X offset from creature position
     * @param {number} relativeY - Y offset from creature position
     * @param {boolean} temporary - If true, will return to automatic behavior after reaching
     */
    pointAllHandsAtRelative(relativeX, relativeY, temporary = false) {
        const worldPos = this.gameObject.getWorldPosition();
        const worldX = worldPos.x + relativeX;
        const worldY = worldPos.y + relativeY;

        for (let i = 0; i < this._arms.length; i++) {
            this.setHandTarget(i, worldX, worldY, temporary);
        }
    }

    /**
     * Point all hands toward an absolute world position
     * @param {number} worldX - Target world X coordinate
     * @param {number} worldY - Target world Y coordinate
     * @param {boolean} temporary - If true, will return to automatic behavior after reaching
     */
    pointAllHandsAtWorld(worldX, worldY, temporary = false) {
        for (let i = 0; i < this._arms.length; i++) {
            this.setHandTarget(i, worldX, worldY, temporary);
        }
    }

    /**
     * Point all hands toward the mouse position
     * @param {boolean} temporary - If true, will return to automatic behavior after reaching
     */
    pointAllHandsAtMouse(temporary = false) {
        for (let i = 0; i < this._arms.length; i++) {
            this.pointHandAtMouse(i, temporary);
        }
    }

    /**
     * Point the right hand toward a position (uses first right-side arm)
     * @param {number} worldX - Target world X coordinate
     * @param {number} worldY - Target world Y coordinate
     * @param {boolean} temporary - If true, will return to automatic behavior after reaching
     * @returns {boolean} - Success status
     */
    pointRightHandAt(worldX, worldY, temporary = false) {
        // Find first right-side arm (side === 1)
        const rightArmIndex = this._arms.findIndex(arm => arm.side === 1);
        if (rightArmIndex === -1) return false;
        return this.setHandTarget(rightArmIndex, worldX, worldY, temporary);
    }

    /**
     * Point the left hand toward a position (uses first left-side arm)
     * @param {number} worldX - Target world X coordinate
     * @param {number} worldY - Target world Y coordinate
     * @param {boolean} temporary - If true, will return to automatic behavior after reaching
     * @returns {boolean} - Success status
     */
    pointLeftHandAt(worldX, worldY, temporary = false) {
        // Find first left-side arm (side === -1)
        const leftArmIndex = this._arms.findIndex(arm => arm.side === -1);
        if (leftArmIndex === -1) return false;
        return this.setHandTarget(leftArmIndex, worldX, worldY, temporary);
    }

    /**
     * Make an arm perform a punch animation
     * @param {number} armIndex - Index of the arm (0 to armCount-1)
     * @param {number} targetWorldX - Optional target X (defaults to forward direction)
     * @param {number} targetWorldY - Optional target Y (defaults to forward direction)
     * @returns {boolean} - Success status
     */
    punchWithArm(armIndex, targetWorldX = null, targetWorldY = null) {
        if (armIndex < 0 || armIndex >= this._arms.length) {
            return false;
        }

        const arm = this._arms[armIndex];

        // Don't interrupt an active punch
        if (arm.state === 'punching') {
            return false;
        }

        const head = this._segments[0];
        const headWorldAngle = head.angle + this._headAngle;

        // Calculate base position
        const perpendicularAngle = headWorldAngle + (Math.PI / 2) * arm.side;
        const baseRadius = this.headSize * 0.4;
        const baseWorldX = head.worldPos.x + Math.cos(perpendicularAngle) * baseRadius;
        const baseWorldY = head.worldPos.y + Math.sin(perpendicularAngle) * baseRadius;

        // Set punch direction
        let punchAngle;
        if (targetWorldX !== null && targetWorldY !== null) {
            punchAngle = Math.atan2(targetWorldY - baseWorldY, targetWorldX - baseWorldX);
        } else {
            // Default: punch forward in the direction creature is facing
            const armsPerSide = this.armCount / 2;
            let angleDistribution = 0;
            if (armsPerSide > 1) {
                const isLeftSide = arm.side === -1;
                const armPositionOnSide = isLeftSide ? armIndex : armIndex - Math.floor(this.armCount / 2);
                const normalizedPosition = armsPerSide > 1 ? armPositionOnSide / (armsPerSide - 1) : 0;
                angleDistribution = normalizedPosition * 30 * (Math.PI / 180);
            }
            const baseOutwardAngle = this.armRestOutwardAngle * Math.PI / 180;
            punchAngle = headWorldAngle + arm.side * (baseOutwardAngle + angleDistribution);
        }

        // Calculate punch positions
        const windupDist = this.armLength * this.punchWindupDistance;
        const reachDist = this.armLength * this.punchReachDistance;

        arm.state = 'punching';
        arm.stateTime = 0;
        arm.stateStartPos.x = arm.currentHandPos.x;
        arm.stateStartPos.y = arm.currentHandPos.y;

        // Windup position (pull back)
        arm.punchWindupPos.x = baseWorldX + Math.cos(punchAngle + Math.PI) * windupDist;
        arm.punchWindupPos.y = baseWorldY + Math.sin(punchAngle + Math.PI) * windupDist;

        // Reach position (extend forward)
        arm.punchReachPos.x = baseWorldX + Math.cos(punchAngle) * reachDist;
        arm.punchReachPos.y = baseWorldY + Math.sin(punchAngle) * reachDist;

        return true;
    }

    /**
     * Make the right hand punch
     * @param {number} targetWorldX - Optional target X
     * @param {number} targetWorldY - Optional target Y
     * @returns {boolean} - Success status
     */
    punchRight(targetWorldX = null, targetWorldY = null) {
        const rightArmIndex = this._arms.findIndex(arm => arm.side === 1);
        if (rightArmIndex === -1) return false;
        return this.punchWithArm(rightArmIndex, targetWorldX, targetWorldY);
    }

    /**
     * Make the left hand punch
     * @param {number} targetWorldX - Optional target X
     * @param {number} targetWorldY - Optional target Y
     * @returns {boolean} - Success status
     */
    punchLeft(targetWorldX = null, targetWorldY = null) {
        const leftArmIndex = this._arms.findIndex(arm => arm.side === -1);
        if (leftArmIndex === -1) return false;
        return this.punchWithArm(leftArmIndex, targetWorldX, targetWorldY);
    }

    /**
     * Check if an arm is currently punching
     * @param {number} armIndex - Index of the arm
     * @returns {boolean} - True if punching
     */
    isArmPunching(armIndex) {
        if (armIndex < 0 || armIndex >= this._arms.length) {
            return false;
        }
        return this._arms[armIndex].state === 'punching';
    }

    /**
     * Get the current punch power/speed of an arm
     * @param {number} armIndex - Index of the arm
     * @returns {number} - Punch power (0 if not punching)
     */
    getArmPunchPower(armIndex) {
        if (armIndex < 0 || armIndex >= this._arms.length) {
            return 0;
        }
        return this._arms[armIndex].punchPower;
    }

    /**
     * Make an arm grab at a position
     * @param {number} armIndex - Index of the arm
     * @param {number} targetWorldX - Target world X coordinate
     * @param {number} targetWorldY - Target world Y coordinate
     * @returns {boolean} - Success status
     */
    grabWithArm(armIndex, targetWorldX, targetWorldY) {
        if (armIndex < 0 || armIndex >= this._arms.length) {
            return false;
        }

        const arm = this._arms[armIndex];

        // Don't interrupt active grab or punch
        if (arm.state === 'grabbing' || arm.state === 'holding' || arm.state === 'punching') {
            return false;
        }

        arm.state = 'grabbing';
        arm.stateTime = 0;
        arm.stateStartPos.x = arm.currentHandPos.x;
        arm.stateStartPos.y = arm.currentHandPos.y;
        arm.grabTargetPos.x = targetWorldX;
        arm.grabTargetPos.y = targetWorldY;
        arm.grabHoldTimer = 0;

        return true;
    }

    /**
     * Make the right hand grab at a position
     * @param {number} targetWorldX - Target world X coordinate
     * @param {number} targetWorldY - Target world Y coordinate
     * @returns {boolean} - Success status
     */
    grabRight(targetWorldX, targetWorldY) {
        const rightArmIndex = this._arms.findIndex(arm => arm.side === 1);
        if (rightArmIndex === -1) return false;
        return this.grabWithArm(rightArmIndex, targetWorldX, targetWorldY);
    }

    /**
     * Make the left hand grab at a position
     * @param {number} targetWorldX - Target world X coordinate
     * @param {number} targetWorldY - Target world Y coordinate
     * @returns {boolean} - Success status
     */
    grabLeft(targetWorldX, targetWorldY) {
        const leftArmIndex = this._arms.findIndex(arm => arm.side === -1);
        if (leftArmIndex === -1) return false;
        return this.grabWithArm(leftArmIndex, targetWorldX, targetWorldY);
    }

    /**
     * Check if an arm is currently grabbing or holding
     * @param {number} armIndex - Index of the arm
     * @returns {boolean} - True if grabbing/holding
     */
    isArmGrabbing(armIndex) {
        if (armIndex < 0 || armIndex >= this._arms.length) {
            return false;
        }
        const state = this._arms[armIndex].state;
        return state === 'grabbing' || state === 'holding';
    }

    /**
     * Get the current state of an arm
     * @param {number} armIndex - Index of the arm
     * @returns {string} - State: 'idle', 'punching', 'grabbing', 'holding', 'returning'
     */
    getArmState(armIndex) {
        if (armIndex < 0 || armIndex >= this._arms.length) {
            return null;
        }
        return this._arms[armIndex].state;
    }

    /**
     * Force an arm to return to idle state
     * @param {number} armIndex - Index of the arm
     * @returns {boolean} - Success status
     */
    resetArmState(armIndex) {
        if (armIndex < 0 || armIndex >= this._arms.length) {
            return false;
        }
        this._arms[armIndex].state = 'idle';
        this._arms[armIndex].stateTime = 0;
        this._arms[armIndex].punchPower = 0;
        return true;
    }

    die() {
        if (this.isDead) return;

        this.isDead = true;
        this.decayTimer = 0;
        this.originalScale = this.gameObject.scale || 1.0;

        // Store current positions and angles of all segments
        this.deathPositions = [];
        this.deathAngles = [];

        for (let i = 0; i < this._segments.length; i++) {
            this.deathPositions.push({
                x: this._segments[i].worldPos.x,
                y: this._segments[i].worldPos.y
            });
            this.deathAngles.push(this._segments[i].angle || 0);
        }

        // Store leg positions
        this.deathLegPositions = [];
        if (this._legs) {
            for (let leg of this._legs) {
                this.deathLegPositions.push({
                    currentPos: leg.currentPos ? { x: leg.currentPos.x, y: leg.currentPos.y } : null,
                    baseX: leg.baseX,
                    baseY: leg.baseY
                });
            }
        }

        // Store arm positions
        this.deathArmPositions = [];
        if (this._arms) {
            for (let arm of this._arms) {
                this.deathArmPositions.push({
                    currentHandPos: arm.currentHandPos ? { x: arm.currentHandPos.x, y: arm.currentHandPos.y } : null,
                    baseWorldX: arm.baseWorldX,
                    baseWorldY: arm.baseWorldY
                });
            }
        }

        // Set depth to background
        if (this.gameObject) {
            this.gameObject.depth = 1000000;
        }

        // Stop all movement
        this._wanderTarget = null;
        this._targetX = null;
        this._targetY = null;

        console.log("Creature died and will decay over " + this.decayMaxTime + " seconds");
    }

    toJSON() {
        return {
            ...super.toJSON(),
            // Body properties
            bodySegments: this.bodySegments,
            segmentLength: this.segmentLength,
            headSize: this.headSize,
            bodyWidth: this.bodyWidth,
            tailTaper: this.tailTaper,
            segmentSmoothing: this.segmentSmoothing,

            // Body customization
            bodyShape: this.bodyShape,
            bodyScaleX: this.bodyScaleX,
            bodyScaleY: this.bodyScaleY,
            spinePattern: this.spinePattern,
            spineSize: this.spineSize,
            spineCount: this.spineCount,

            // Snake properties
            snakeWaveAmplitude: this.snakeWaveAmplitude,
            snakeWaveFrequency: this.snakeWaveFrequency,
            snakeWaveSpeed: this.snakeWaveSpeed,

            // Leg properties
            legPairs: this.legPairs,
            legSegments: this.legSegments,
            legLength: this.legLength,
            legThickness: this.legThickness,
            legSpread: this.legSpread,
            legForwardOffset: this.legForwardOffset,
            legRandomness: this.legRandomness,
            legJointStyle: this.legJointStyle,
            legTipShape: this.legTipShape,
            legOffsetVariation: this.legOffsetVariation,

            // Arm properties
            armCount: this.armCount,
            armLength: this.armLength,
            armThickness: this.armThickness,
            armSegments: this.armSegments,
            armReachRange: this.armReachRange,
            armReachSpeed: this.armReachSpeed,
            armColor: this.armColor,
            armSpringStiffness: this.armSpringStiffness,
            armSpringDamping: this.armSpringDamping,
            armRestForwardDistance: this.armRestForwardDistance,
            armRestOutwardAngle: this.armRestOutwardAngle,
            armSwingSpeed: this.armSwingSpeed,
            armSwingAmount: this.armSwingAmount,
            armSwingEnabled: this.armSwingEnabled,

            // Arm combat
            punchSpeed: this.punchSpeed,
            punchWindupDistance: this.punchWindupDistance,
            punchReachDistance: this.punchReachDistance,
            punchArcAmount: this.punchArcAmount,
            grabSpeed: this.grabSpeed,
            grabHoldTime: this.grabHoldTime,

            // IK locomotion
            stepDistance: this.stepDistance,
            stepHeight: this.stepHeight,
            stepSpeed: this.stepSpeed,
            alternateLegs: this.alternateLegs,

            // Colors
            bodyColor: this.bodyColor,
            legColor: this.legColor,
            accentColor: this.accentColor,
            eyeColor: this.eyeColor,
            antennaColor: this.antennaColor,
            mandibleColor: this.mandibleColor,
            spineColor: this.spineColor,

            // Shadow properties
            showShadow: this.showShadow,
            shadowOpacity: this.shadowOpacity,
            shadowBlur: this.shadowBlur,
            shadowOffsetX: this.shadowOffsetX,
            shadowOffsetY: this.shadowOffsetY,
            shadowColor: this.shadowColor,

            // Appearance
            showEyes: this.showEyes,
            eyeCount: this.eyeCount,
            showJoints: this.showJoints,
            isometricAngle: this.isometricAngle,
            bodyHeight: this.bodyHeight,

            // Head customization
            headShape: this.headShape,
            antennaCount: this.antennaCount,
            antennaLength: this.antennaLength,
            mandibles: this.mandibles,

            // Movement
            moveSpeed: this.moveSpeed,
            acceleration: this.acceleration,
            turnSpeed: this.turnSpeed,
            movementStyle: this.movementStyle,
            targetObject: this.targetObject,
            wanderRadius: this.wanderRadius,
            wanderWaitTime: this.wanderWaitTime,
            arrivalThreshold: this.arrivalThreshold,

            // Head look
            headLookEnabled: this.headLookEnabled,
            headLookRange: this.headLookRange,
            headLookSpeed: this.headLookSpeed,
            headLookObject: this.headLookObject,

            // Death/decay
            isDead: this.isDead,
            decayTimer: this.decayTimer,
            decayMaxTime: this.decayMaxTime,
            deathPositions: this.deathPositions,
            deathAngles: this.deathAngles,
            deathLimbPositions: this.deathLimbPositions,
            originalScale: this.originalScale
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        if (!data) return;

        // Body properties
        this.bodySegments = data.bodySegments !== undefined ? data.bodySegments : 3;
        this.segmentLength = data.segmentLength !== undefined ? data.segmentLength : 20;
        this.headSize = data.headSize !== undefined ? data.headSize : 25;
        this.bodyWidth = data.bodyWidth !== undefined ? data.bodyWidth : 18;
        this.tailTaper = data.tailTaper !== undefined ? data.tailTaper : 0.6;
        this.segmentSmoothing = data.segmentSmoothing !== undefined ? data.segmentSmoothing : 0.15;

        // Body customization
        this.bodyShape = data.bodyShape || "ellipse";
        this.bodyScaleX = data.bodyScaleX !== undefined ? data.bodyScaleX : 1.0;
        this.bodyScaleY = data.bodyScaleY !== undefined ? data.bodyScaleY : 1.0;
        this.spinePattern = data.spinePattern || "none";
        this.spineSize = data.spineSize !== undefined ? data.spineSize : 5;
        this.spineCount = data.spineCount !== undefined ? data.spineCount : 6;

        // Snake properties
        this.snakeWaveAmplitude = data.snakeWaveAmplitude !== undefined ? data.snakeWaveAmplitude : 20;
        this.snakeWaveFrequency = data.snakeWaveFrequency !== undefined ? data.snakeWaveFrequency : 2.0;
        this.snakeWaveSpeed = data.snakeWaveSpeed !== undefined ? data.snakeWaveSpeed : 3.0;

        // Leg properties
        this.legPairs = data.legPairs !== undefined ? data.legPairs : 4;
        this.legSegments = data.legSegments !== undefined ? data.legSegments : 2;
        this.legLength = data.legLength !== undefined ? data.legLength : 35;
        this.legThickness = data.legThickness !== undefined ? data.legThickness : 4;
        this.legSpread = data.legSpread !== undefined ? data.legSpread : 45;
        this.legForwardOffset = data.legForwardOffset !== undefined ? data.legForwardOffset : 0.3;
        this.legRandomness = data.legRandomness !== undefined ? data.legRandomness : 0.15;
        this.legJointStyle = data.legJointStyle || "smooth";
        this.legTipShape = data.legTipShape || "circle";
        this.legOffsetVariation = data.legOffsetVariation !== undefined ? data.legOffsetVariation : 0.2;

        // Arm properties
        this.armCount = data.armCount !== undefined ? data.armCount : 2;
        this.armLength = data.armLength !== undefined ? data.armLength : 30;
        this.armThickness = data.armThickness !== undefined ? data.armThickness : 3;
        this.armSegments = data.armSegments !== undefined ? data.armSegments : 2;
        this.armReachRange = data.armReachRange !== undefined ? data.armReachRange : 100;
        this.armReachSpeed = data.armReachSpeed !== undefined ? data.armReachSpeed : 4;
        this.armColor = data.armColor || "#2d2436";
        this.armSpringStiffness = data.armSpringStiffness !== undefined ? data.armSpringStiffness : 8;
        this.armSpringDamping = data.armSpringDamping !== undefined ? data.armSpringDamping : 0.7;
        this.armRestForwardDistance = data.armRestForwardDistance !== undefined ? data.armRestForwardDistance : 0.8;
        this.armRestOutwardAngle = data.armRestOutwardAngle !== undefined ? data.armRestOutwardAngle : 17;
        this.armSwingSpeed = data.armSwingSpeed !== undefined ? data.armSwingSpeed : 2.5;
        this.armSwingAmount = data.armSwingAmount !== undefined ? data.armSwingAmount : 15;
        this.armSwingEnabled = data.armSwingEnabled !== undefined ? data.armSwingEnabled : true;

        // Arm combat
        this.punchSpeed = data.punchSpeed !== undefined ? data.punchSpeed : 8;
        this.punchWindupDistance = data.punchWindupDistance !== undefined ? data.punchWindupDistance : 0.3;
        this.punchReachDistance = data.punchReachDistance !== undefined ? data.punchReachDistance : 1.2;
        this.punchArcAmount = data.punchArcAmount !== undefined ? data.punchArcAmount : 25;
        this.grabSpeed = data.grabSpeed !== undefined ? data.grabSpeed : 5;
        this.grabHoldTime = data.grabHoldTime !== undefined ? data.grabHoldTime : 0.5;

        // IK locomotion
        this.stepDistance = data.stepDistance !== undefined ? data.stepDistance : 40;
        this.stepHeight = data.stepHeight !== undefined ? data.stepHeight : 8;
        this.stepSpeed = data.stepSpeed !== undefined ? data.stepSpeed : 6;
        this.alternateLegs = data.alternateLegs !== undefined ? data.alternateLegs : true;

        // Colors
        this.bodyColor = data.bodyColor || "#3a2f4a";
        this.legColor = data.legColor || "#2d2436";
        this.accentColor = data.accentColor || "#6b5a7d";
        this.eyeColor = data.eyeColor || "#ffffff";
        this.antennaColor = data.antennaColor || "#6b5a7d";
        this.mandibleColor = data.mandibleColor || "#6b5a7d";
        this.spineColor = data.spineColor || "#6b5a7d";

        // Shadow properties
        this.showShadow = data.showShadow !== undefined ? data.showShadow : true;
        this.shadowOpacity = data.shadowOpacity !== undefined ? data.shadowOpacity : 0.3;
        this.shadowBlur = data.shadowBlur !== undefined ? data.shadowBlur : 15;
        this.shadowOffsetX = data.shadowOffsetX !== undefined ? data.shadowOffsetX : 3;
        this.shadowOffsetY = data.shadowOffsetY !== undefined ? data.shadowOffsetY : 5;
        this.shadowColor = data.shadowColor || "#000000";

        // Appearance
        this.showEyes = data.showEyes !== undefined ? data.showEyes : true;
        this.eyeCount = data.eyeCount !== undefined ? data.eyeCount : 2;
        this.showJoints = data.showJoints !== undefined ? data.showJoints : true;
        this.isometricAngle = data.isometricAngle !== undefined ? data.isometricAngle : 0;
        this.bodyHeight = data.bodyHeight !== undefined ? data.bodyHeight : 0;

        // Head customization
        this.headShape = data.headShape || "ellipse";
        this.antennaCount = data.antennaCount !== undefined ? data.antennaCount : 0;
        this.antennaLength = data.antennaLength !== undefined ? data.antennaLength : 15;
        this.mandibles = data.mandibles !== undefined ? data.mandibles : false;

        // Movement
        this.moveSpeed = data.moveSpeed !== undefined ? data.moveSpeed : 80;
        this.acceleration = data.acceleration !== undefined ? data.acceleration : 300;
        this.turnSpeed = data.turnSpeed !== undefined ? data.turnSpeed : 180;
        this.movementStyle = data.movementStyle || "wander";
        this.targetObject = data.targetObject || "";
        this.wanderRadius = data.wanderRadius !== undefined ? data.wanderRadius : 200;
        this.wanderWaitTime = data.wanderWaitTime !== undefined ? data.wanderWaitTime : 2;
        this.arrivalThreshold = data.arrivalThreshold !== undefined ? data.arrivalThreshold : 20;

        // Head look
        this.headLookEnabled = data.headLookEnabled !== undefined ? data.headLookEnabled : true;
        this.headLookRange = data.headLookRange !== undefined ? data.headLookRange : 150;
        this.headLookSpeed = data.headLookSpeed !== undefined ? data.headLookSpeed : 3;
        this.headLookObject = data.headLookObject || "interesting";

        // Death/decay
        this.isDead = data.isDead || false;
        this.decayTimer = data.decayTimer || 0;
        this.decayMaxTime = data.decayMaxTime !== undefined ? data.decayMaxTime : 30.0;
        this.deathPositions = data.deathPositions || null;
        this.deathAngles = data.deathAngles || null;
        this.deathLimbPositions = data.deathLimbPositions || null;
        this.originalScale = data.originalScale !== undefined ? data.originalScale : 1.0;

        this._initializeCreature();
    }
}

window.ProceduralCreature = ProceduralCreature;
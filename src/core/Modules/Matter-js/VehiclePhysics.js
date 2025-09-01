/**
 * VehiclePhysics - Realistic top-down vehicle physics module with drift system
 * Requires RigidBody module on the same GameObject
 */
class VehiclePhysics extends Module {
    static allowMultiple = false;
    static namespace = "Matter.js";
    static description = "Realistic top-down vehicle physics with steering, acceleration, and drift mechanics for Matter.js";
    static iconClass = "fas fa-car";

    constructor() {
        super("VehiclePhysics");

        // Control settings
        this.playerControlled = true;           // Can be controlled with arrow keys
        this.upKey = "arrowup";                 // Accelerate key
        this.downKey = "arrowdown";             // Brake/reverse key
        this.leftKey = "arrowleft";             // Turn left key
        this.rightKey = "arrowright";           // Turn right key
        this.handbrakeKey = " ";            // Handbrake/drift key

        // Vehicle physics properties
        this.weight = 1000;                  // Vehicle weight in kg
        this.maxSpeed = 1000;                   // Maximum speed in pixels/second
        this.acceleration = 300;               // Acceleration force
        this.brakeForce = 250;                 // Braking force
        this.decelerationRate = 0.05;          // Natural deceleration when not accelerating
        this.reverseMaxSpeed = 250;            // Max reverse speed

        // Steering system
        this.maxTurnAngle = 45;                // Maximum wheel turn angle in degrees
        this.wheelTurnSpeed = 90;             // Degrees per second wheel turn rate
        this.wheelReturnSpeed = 90;           // Speed wheels return to center when not turning        
        this.turnMultiplier = 20.0;             // Multiplies steering effect based on speed

        this.dragCoefficient = 0.95;           // Natural drag (0-1, closer to 1 = less drag)
        this.lateralGrip = 0.85;               // Base side friction for normal driving (0-1)
        this.minTurnSpeed = 50;                // Minimum speed to turn effectively

        // Advanced physics
        this.wheelBase = 60;                   // Distance between front and rear axles
        this.frontWheelDrive = false;           // Front or rear wheel drive
        this.differentialStrength = 0.6;       // How much wheels stick together (0-1)
        this.antiRoll = 0.3;                   // Prevents excessive body roll

        // NEW: Drift and traction system
        this.handbrakeForce = 6;             // How much handbrake reduces rear grip (0-1)
        this.driftThreshold = 0.8;             // Speed threshold for drift to begin (0-1 of max speed)
        this.tractionLoss = 0.4;               // How much traction is lost under hard acceleration (0-1)
        this.powerOversteerStrength = 1.2;     // Multiplier for rear-wheel drive oversteer
        this.frontGripAdvantage = 0.15;        // Extra grip for front-wheel drive in turns
        this.driftRecoveryRate = 1.2;          // How quickly traction recovers when not drifting
        this.velocityDriftFactor = 0.7;        // How much velocity direction affects drift angle

        // Traction control simulation
        this.tractionControlEnabled = true;    // Simulates modern traction control
        this.tractionControlStrength = 0.6;    // How much TC reduces power loss (0-1)
        this.absEnabled = true;                // Anti-lock braking simulation
        this.absStrength = 0.8;               // ABS effectiveness (0-1)

        // Internal state
        this.currentSpeed = 0;                 // Current speed magnitude
        this.currentWheelAngle = 0;            // Current wheel angle in degrees (-maxTurnAngle to +maxTurnAngle)
        this.throttleInput = 0;                // Current throttle/brake input (-1 to 1)
        this.targetThrottleInput = 0;          // Target throttle input from controls
        this.steeringInput = 0;                // Current steering input (-1 to 1)
        this.targetSteeringInput = 0;          // Target steering from controls

        this.isAccelerating = false;
        this.isBraking = false;
        this.isTurning = false;
        this.isHandbraking = false;            // NEW: Handbrake state
        this.isDrifting = false;               // NEW: Whether vehicle is currently drifting
        this.driftAngle = 0;                   // NEW: Current drift angle in degrees
        this.currentTraction = 1.0;            // NEW: Current traction level (0-1)
        this.wheelSpinAmount = 0;              // NEW: Amount of wheel spin/loss of traction

        this.rigidBody = null;                 // Reference to RigidBody component

        // Debug options
        this.showDebugInfo = false;            // Show speed/steering debug
        this.showWheelDirection = true;        // Show wheel direction indicators
        this.showDriftInfo = true;             // NEW: Show drift-related debug info

        this.require("RigidBody");

        // Expose properties to inspector
        this.exposeProperty("weight", "number", this.weight, {
            description: "Vehicle weight in kg",
            min: 1,
            max: 5000,
            step: 10,
            onChange: (val) => { this.weight = val; }
        });

        this.exposeProperty("playerControlled", "boolean", this.playerControlled, {
            description: "Can be controlled with arrow keys",
            onChange: (val) => { this.playerControlled = val; }
        });

        this.exposeProperty("maxSpeed", "number", this.maxSpeed, {
            description: "Maximum forward speed",
            min: 1,
            max: 500,
            onChange: (val) => { this.maxSpeed = val; }
        });

        this.exposeProperty("acceleration", "number", this.acceleration, {
            description: "Acceleration force",
            min: 0.1,
            max: 100,
            onChange: (val) => { this.acceleration = val; }
        });

        this.exposeProperty("brakeForce", "number", this.brakeForce, {
            description: "Braking force",
            min: 0.1,
            max: 1000,
            onChange: (val) => { this.brakeForce = val; }
        });

        this.exposeProperty("frontWheelDrive", "boolean", this.frontWheelDrive, {
            description: "Front wheel drive vs rear wheel drive",
            onChange: (val) => { this.frontWheelDrive = val; }
        });

        this.exposeProperty("handbrakeForce", "number", this.handbrakeForce, {
            description: "Handbrake drift strength",
            min: 0.1,
            max: 1.0,
            step: 0.1,
            onChange: (val) => { this.handbrakeForce = val; }
        });

        this.exposeProperty("tractionLoss", "number", this.tractionLoss, {
            description: "Traction loss under hard acceleration",
            min: 0.0,
            max: 1.0,
            step: 0.1,
            onChange: (val) => { this.tractionLoss = val; }
        });

        this.exposeProperty("showDebugInfo", "boolean", this.showDebugInfo, {
            description: "Show speed and steering debug info",
            onChange: (val) => { this.showDebugInfo = val; }
        });

        this.exposeProperty("showDriftInfo", "boolean", this.showDriftInfo, {
            description: "Show drift debug information",
            onChange: (val) => { this.showDriftInfo = val; }
        });
    }

    style(style) {
        style.startGroup("Vehicle Controls", false, {
            backgroundColor: 'rgba(100, 200, 100, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("playerControlled", "boolean", this.playerControlled, {
            description: "Enable arrow key controls",
            style: { label: "Player Controlled" }
        });

        style.exposeProperty("handbrakeKey", "string", this.handbrakeKey, {
            description: "Key for handbrake/drift",
            style: { label: "Handbrake Key" }
        });

        style.endGroup();

        style.startGroup("Performance", false, {
            backgroundColor: 'rgba(255, 150, 100, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("weight", "number", this.weight, {
            description: "Vehicle weight in kg",
            min: 1,
            max: 5000,
            step: 10
        });

        style.exposeProperty("maxSpeed", "number", this.maxSpeed, {
            description: "Top speed in pixels per second",
            min: 50,
            max: 1000,
            step: 25,
            style: { label: "Max Speed", slider: true }
        });

        style.exposeProperty("acceleration", "number", this.acceleration, {
            description: "How quickly the vehicle accelerates",
            min: 100,
            max: 2000,
            step: 50,
            style: { label: "Acceleration", slider: true }
        });

        style.exposeProperty("brakeForce", "number", this.brakeForce, {
            description: "Braking strength",
            min: 200,
            max: 2000,
            step: 50,
            style: { label: "Brake Force", slider: true }
        });

        style.exposeProperty("decelerationRate", "number", this.decelerationRate, {
            description: "Natural slowdown when coasting",
            min: 0.05,
            max: 0.5,
            step: 0.05,
            style: { label: "Deceleration", slider: true }
        });

        style.endGroup();

        style.startGroup("Drive Type & Traction", false, {
            backgroundColor: 'rgba(255, 200, 100, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("frontWheelDrive", "boolean", this.frontWheelDrive, {
            description: "FWD vs RWD affects handling and drift characteristics",
            style: { label: "Front Wheel Drive" }
        });

        style.exposeProperty("tractionLoss", "number", this.tractionLoss, {
            description: "Traction loss under hard acceleration",
            min: 0.0,
            max: 1.0,
            step: 0.1,
            style: { label: "Power Traction Loss", slider: true }
        });

        style.exposeProperty("powerOversteerStrength", "number", this.powerOversteerStrength, {
            description: "RWD oversteer multiplier",
            min: 0.5,
            max: 3.0,
            step: 0.1,
            style: { label: "RWD Oversteer", slider: true }
        });

        style.exposeProperty("frontGripAdvantage", "number", this.frontGripAdvantage, {
            description: "FWD cornering grip advantage",
            min: 0.0,
            max: 0.5,
            step: 0.05,
            style: { label: "FWD Grip Bonus", slider: true }
        });

        style.endGroup();

        style.startGroup("Drift System", false, {
            backgroundColor: 'rgba(200, 100, 255, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("handbrakeForce", "number", this.handbrakeForce, {
            description: "Handbrake drift strength (higher = more sliding)",
            min: 0.1,
            max: 1.0,
            step: 0.1,
            style: { label: "Handbrake Strength", slider: true }
        });

        style.exposeProperty("driftThreshold", "number", this.driftThreshold, {
            description: "Speed threshold for drift initiation",
            min: 0.3,
            max: 1.0,
            step: 0.1,
            style: { label: "Drift Speed Threshold", slider: true }
        });

        style.exposeProperty("driftRecoveryRate", "number", this.driftRecoveryRate, {
            description: "How quickly traction recovers",
            min: 1.0,
            max: 10.0,
            step: 0.5,
            style: { label: "Traction Recovery", slider: true }
        });

        style.exposeProperty("velocityDriftFactor", "number", this.velocityDriftFactor, {
            description: "How much velocity affects drift angle",
            min: 0.1,
            max: 2.0,
            step: 0.1,
            style: { label: "Velocity Drift Factor", slider: true }
        });

        style.endGroup();

        style.startGroup("Steering", false, {
            backgroundColor: 'rgba(150, 150, 255, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("turnMultiplier", "number", this.turnMultiplier, {
            description: "Steering strength multiplier",
            min: 0.1,
            max: 5,
            step: 0.1,
            style: { label: "Turn Multiplier", slider: true }
        });

        style.exposeProperty("maxTurnAngle", "number", this.maxTurnAngle, {
            description: "Maximum wheel turn angle",
            min: 15,
            max: 90,
            step: 5,
            style: { label: "Max Turn Angle", slider: true }
        });

        style.exposeProperty("lateralGrip", "number", this.lateralGrip, {
            description: "Base tire grip for cornering",
            min: 0.1,
            max: 1,
            step: 0.05,
            style: { label: "Base Tire Grip", slider: true }
        });

        style.endGroup();

        style.startGroup("Driver Assists", true, {
            backgroundColor: 'rgba(100, 255, 200, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("tractionControlEnabled", "boolean", this.tractionControlEnabled, {
            description: "Simulates traction control system",
            style: { label: "Traction Control" }
        });

        style.exposeProperty("tractionControlStrength", "number", this.tractionControlStrength, {
            description: "TC effectiveness",
            min: 0.0,
            max: 1.0,
            step: 0.1,
            style: { label: "TC Strength", slider: true }
        });

        style.exposeProperty("absEnabled", "boolean", this.absEnabled, {
            description: "Anti-lock braking system",
            style: { label: "ABS" }
        });

        style.endGroup();

        style.startGroup("Debug", true, {
            backgroundColor: 'rgba(200, 200, 200, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("showDebugInfo", "boolean", this.showDebugInfo, {
            description: "Display basic vehicle debug information",
            style: { label: "Debug Info" }
        });

        style.exposeProperty("showDriftInfo", "boolean", this.showDriftInfo, {
            description: "Display drift-specific debug information",
            style: { label: "Drift Debug" }
        });

        style.exposeProperty("showWheelDirection", "boolean", this.showWheelDirection, {
            description: "Show wheel and velocity vectors",
            style: { label: "Wheel Vectors" }
        });

        style.endGroup();

        style.addDivider();
        style.addHelpText("Enhanced physics with realistic drift mechanics. Use handbrake + steering to initiate drifts. RWD vehicles have more oversteer, FWD have better traction.");
    }

    start() {
        // Get the RigidBody component
        this.rigidBody = this.gameObject.getModule("RigidBody");

        if (!this.rigidBody) {
            console.error("VehiclePhysics requires a RigidBody component on the same GameObject!");
            return;
        }

        // Configure RigidBody for vehicle physics
        this.rigidBody.useGravity = false;      // Disable gravity for top-down
        this.rigidBody.bodyType = "dynamic";    // Must be dynamic
        this.rigidBody.friction = 0.1;          // Low friction, we'll handle it
        this.rigidBody.frictionAir = 0.02;      // Minimal air resistance
        this.rigidBody.density = 1.5;           // Moderate density for realistic mass

        // Set up collision filter if needed
        if (this.rigidBody.body) {
            this.rigidBody.body.ignoreGravity = true;
        }

        this.rigidBody.updateMass(this.weight);

        console.log(this.playerControlled ? "Player-controlled vehicle initialized." : "AI-controlled vehicle initialized.");
    }

    loop(deltaTime) {
        if (!this.rigidBody || !this.rigidBody.body) return;

        // Reset input flags
        this.isAccelerating = false;
        this.isBraking = false;
        this.isTurning = false;
        this.isHandbraking = false;

        // Get target input values
        this.targetThrottleInput = 0;
        this.targetSteeringInput = 0;

        if (this.playerControlled) {
            if (window.input.keyDown(this.upKey)) {
                this.targetThrottleInput = 1;
                this.isAccelerating = true;
            }
            if (window.input.keyDown(this.downKey)) {
                this.targetThrottleInput = -1;
                this.isBraking = true;
            }
            if (window.input.keyDown(this.leftKey)) {
                this.targetSteeringInput = -1;
                this.isTurning = true;
            }
            if (window.input.keyDown(this.rightKey)) {
                this.targetSteeringInput = 1;
                this.isTurning = true;
            }
            if (window.input.keyDown(this.handbrakeKey)) {
                this.isHandbraking = true;
            }
        }

        // Update physics systems
        this.updateInputs(deltaTime);
        this.updateWheelSteering(deltaTime);
        this.updateTractionSystem(deltaTime);
        this.updateVehiclePhysics(deltaTime);
        this.updateDriftPhysics(deltaTime);
    }

    updateInputs(deltaTime) {
        // Smooth throttle input transitions
        if (this.targetThrottleInput !== 0) {
            // Accelerating or braking - use acceleration/brake rates
            let lerpRate = this.targetThrottleInput > 0 ? this.acceleration * 0.01 : this.brakeForce * 0.01;
            this.throttleInput = this.lerp(this.throttleInput, this.targetThrottleInput, lerpRate * deltaTime);
        } else {
            // Coasting - use deceleration rate
            this.throttleInput = this.lerp(this.throttleInput, 0, this.decelerationRate * deltaTime * 60);
        }

        // Smooth steering input transitions
        if (this.targetSteeringInput !== 0) {
            this.steeringInput = this.lerp(this.steeringInput, this.targetSteeringInput, 8 * deltaTime);
        } else {
            this.steeringInput = this.lerp(this.steeringInput, 0, 6 * deltaTime);
        }
    }

    updateWheelSteering(deltaTime) {
        // Calculate target wheel angle based on steering input
        let targetWheelAngle = this.steeringInput * this.maxTurnAngle;

        // Determine wheel turn speed
        let turnSpeed = this.wheelTurnSpeed;
        if (this.targetSteeringInput === 0 && this.isMoving()) {
            // Use return speed when wheels should return to center while moving
            turnSpeed = this.wheelReturnSpeed;
        }

        // Smooth wheel angle transitions
        let angleDiff = targetWheelAngle - this.currentWheelAngle;
        let maxAngleChange = turnSpeed * deltaTime;

        if (Math.abs(angleDiff) <= maxAngleChange) {
            this.currentWheelAngle = targetWheelAngle;
        } else {
            this.currentWheelAngle += Math.sign(angleDiff) * maxAngleChange;
        }
    }

    updateTractionSystem(deltaTime) {
        const speedRatio = this.currentSpeed / this.maxSpeed;
        const throttleAmount = Math.abs(this.throttleInput);

        // Calculate wheel spin based on acceleration and drive type
        this.wheelSpinAmount = 0;

        if (this.isAccelerating && throttleAmount > 0.7) {
            // Hard acceleration causes wheel spin
            let baseSpin = throttleAmount * this.tractionLoss;

            // RWD loses more traction under power, especially when turning
            if (!this.frontWheelDrive) {
                baseSpin *= (1 + Math.abs(this.steeringInput) * this.powerOversteerStrength);
            }

            // Higher speeds make it easier to break traction
            baseSpin *= (0.5 + speedRatio * 0.5);

            this.wheelSpinAmount = baseSpin;
        }

        // Calculate current effective traction
        let targetTraction = 1.0;

        // Reduce traction based on wheel spin
        if (this.wheelSpinAmount > 0) {
            targetTraction = Math.max(0.2, 1.0 - this.wheelSpinAmount);

            // Traction control helps recover traction
            if (this.tractionControlEnabled) {
                targetTraction = this.lerp(targetTraction, 1.0, this.tractionControlStrength);
            }
        }

        // Handbrake reduces rear traction significantly
        if (this.isHandbraking) {
            // Handbrake mainly affects rear wheels
            let handbrakeEffect = this.handbrakeForce;
            if (this.frontWheelDrive) {
                // FWD can still steer somewhat with handbrake
                targetTraction = Math.max(0.3, targetTraction - handbrakeEffect * 0.7);
            } else {
                // RWD loses more control with handbrake
                targetTraction = Math.max(0.1, targetTraction - handbrakeEffect);
            }
        }

        // FWD gets grip advantage in normal conditions
        if (this.frontWheelDrive && !this.isHandbraking && this.wheelSpinAmount < 0.3) {
            targetTraction = Math.min(1.0, targetTraction + this.frontGripAdvantage);
        }

        // Smooth traction transitions
        this.currentTraction = this.lerp(this.currentTraction, targetTraction, this.driftRecoveryRate * deltaTime);
    }

    updateVehiclePhysics(deltaTime) {
        const body = this.rigidBody.body;
        const velocity = this.rigidBody.getVelocity();

        // Calculate current speed and direction
        this.currentSpeed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        const currentAngle = this.gameObject.angle * (Math.PI / 180);

        // Forward direction vector (vehicle body direction)
        const forwardX = Math.cos(currentAngle);
        const forwardY = Math.sin(currentAngle);

        // Right direction vector (for lateral forces)
        const rightX = -Math.sin(currentAngle);
        const rightY = Math.cos(currentAngle);

        // Calculate forward and lateral velocity components
        const forwardVel = velocity.x * forwardX + velocity.y * forwardY;
        const rightVel = velocity.x * rightX + velocity.y * rightY;

        // Apply throttle forces with traction consideration
        if (Math.abs(this.throttleInput) > 0.01) {
            let targetSpeed = this.throttleInput > 0 ? this.maxSpeed : -this.reverseMaxSpeed;
            let force = Math.abs(this.throttleInput > 0 ? this.acceleration : this.brakeForce);

            // ABS simulation for braking
            if (this.throttleInput < 0 && this.absEnabled) {
                force *= (0.3 + this.currentTraction * 0.7 * this.absStrength);
            }

            // Reduce force as we approach max speed
            let speedRatio = Math.abs(forwardVel) / Math.abs(targetSpeed);
            if (speedRatio > 0.8) {
                force *= Math.max(0.1, 1 - speedRatio);
            }

            // Apply traction to driving force
            let effectiveForce = force * this.throttleInput * this.currentTraction * deltaTime * 60;

            // Wheel spin causes reduced forward motion but can help initiate drifts
            if (this.wheelSpinAmount > 0.5 && Math.abs(this.steeringInput) > 0.3) {
                effectiveForce *= 0.7; // Reduce forward motion when spinning wheels while turning
            }

            this.rigidBody.applyForce({
                x: forwardX * effectiveForce,
                y: forwardY * effectiveForce
            });
        }

        // --- Add roll force in wheel direction when not accelerating ---
        if (!this.isAccelerating && this.isMoving()) {
            // Calculate wheel direction vector
            const wheelAngleRad = (this.currentWheelAngle * Math.PI / 180);
            const wheelDirection = currentAngle + wheelAngleRad;
            const wheelDirX = Math.cos(wheelDirection);
            const wheelDirY = Math.sin(wheelDirection);

            // Project velocity onto wheel direction
            const velDotWheel = velocity.x * wheelDirX + velocity.y * wheelDirY;

            // Calculate desired velocity in wheel direction
            const desiredVelX = wheelDirX * velDotWheel;
            const desiredVelY = wheelDirY * velDotWheel;

            // Blend factor increases as speed drops (stronger at low speed)
            const speedRatio = Math.min(1, this.currentSpeed / this.maxSpeed);
            // At low speed, blend is high (0.25), at high speed, blend is low (0.05)
            const rollBlend = 0.05 + (1 - speedRatio) * 0.2;

            // Further increase blend if traction is low
            const tractionBlend = rollBlend * (1 - this.currentTraction);

            // Final blend factor
            const blend = Math.max(rollBlend, tractionBlend);

            // Apply roll force
            const rollForceX = (desiredVelX - velocity.x) * blend;
            const rollForceY = (desiredVelY - velocity.y) * blend;

            this.rigidBody.applyForce({
                x: rollForceX,
                y: rollForceY
            });
        }

        // Apply wheel-based steering with traction consideration
        if (Math.abs(this.currentWheelAngle) > 1 && this.isMoving()) {
            const wheelAngleRad = (this.currentWheelAngle * Math.PI / 180);
            const wheelDirection = currentAngle + wheelAngleRad;

            const wheelForwardX = Math.cos(wheelDirection);
            const wheelForwardY = Math.sin(wheelDirection);

            // Calculate steering force with traction
            let steerForce = this.currentSpeed * Math.sin(wheelAngleRad) * this.currentTraction;

            // Apply drive type effects to steering
            if (!this.frontWheelDrive && this.wheelSpinAmount > 0.3) {
                steerForce *= (1.5 + Math.abs(this.throttleInput) * 0.5);
            }

            this.rigidBody.applyForce({
                x: wheelForwardX * steerForce * 0.5,
                y: wheelForwardY * steerForce * 0.5
            });

            // Calculate turn radius and apply angular velocity
            let wheelbase = this.wheelBase;
            let turnRadius = wheelbase / Math.tan(Math.abs(wheelAngleRad));
            let angularVel = (forwardVel / turnRadius) * (this.currentWheelAngle / Math.abs(this.currentWheelAngle)) * this.turnMultiplier;

            // Modify angular velocity based on traction
            angularVel *= this.currentTraction;

            // RWD oversteer effect
            if (!this.frontWheelDrive && this.isAccelerating && this.wheelSpinAmount > 0.3) {
                angularVel *= 1.3;
            }

            // Limit angular velocity for stability  
            angularVel = Math.max(-5, Math.min(5, angularVel));
            this.rigidBody.setAngularVelocity(angularVel);
        }

        // Apply drag forces
        if (this.currentSpeed > 0) {
            // Forward/backward drag
            const dragForce = forwardVel * forwardVel * (1 - this.dragCoefficient) * 0.01;
            this.rigidBody.applyForce({
                x: -forwardX * dragForce * Math.sign(forwardVel),
                y: -forwardY * dragForce * Math.sign(forwardVel)
            });

            // Lateral drag (tire friction) modified by current traction
            let effectiveLateralGrip = this.lateralGrip * this.currentTraction;
            const lateralDragForce = Math.abs(rightVel) * rightVel * effectiveLateralGrip * 0.5;

            this.rigidBody.applyForce({
                x: -rightX * lateralDragForce,
                y: -rightY * lateralDragForce
            });
        }

        // Apply angular damping
        if (body.angularVelocity !== 0) {
            const angularDrag = body.angularVelocity * 0.8 * this.currentTraction;
            body.angularVelocity -= angularDrag * deltaTime;
        }
    }

    updateDriftPhysics(deltaTime) {
        if (!this.rigidBody || !this.rigidBody.body) return;

        const velocity = this.rigidBody.getVelocity();
        const currentAngle = this.gameObject.angle * (Math.PI / 180);

        // Calculate velocity angle
        const velocityAngle = Math.atan2(velocity.y, velocity.x);

        // Calculate drift angle (difference between car direction and velocity direction)
        let rawDriftAngle = (velocityAngle - currentAngle) * (180 / Math.PI);

        // Normalize angle to -180 to 180
        while (rawDriftAngle > 180) rawDriftAngle -= 360;
        while (rawDriftAngle < -180) rawDriftAngle += 360;

        // Apply velocity factor to drift angle calculation
        this.driftAngle = rawDriftAngle * this.velocityDriftFactor;

        // Determine if we're drifting (symmetrical for left/right)
        const speedRatio = this.currentSpeed / this.maxSpeed;
        const driftThreshold = this.driftThreshold;

        this.isDrifting = (
            speedRatio > driftThreshold &&
            (Math.abs(this.driftAngle) > 15 || this.isHandbraking || this.currentTraction < 0.8)
        );

        // Enhanced drift effects when handbraking
        if (this.isHandbraking && speedRatio > 0.2 && Math.abs(this.steeringInput) > 0.01) {
            // Calculate sideways (perpendicular) direction to car's forward
            const rightX = -Math.sin(currentAngle);
            const rightY = Math.cos(currentAngle);

            // Drift force is perpendicular to car direction, scaled by steering direction
            // But should move opposite to current velocity for initial slide
            // So, apply force opposite to velocity, plus a sideways force for turning
            // 1. Opposite to velocity (to break traction)
            const slideForce = -1 * this.handbrakeForce * this.currentSpeed;
            this.rigidBody.applyForce({
                x: velocity.x * slideForce * deltaTime,
                y: velocity.y * slideForce * deltaTime
            });

            // 2. Sideways force (perpendicular to forward, scaled by steering)
            const driftSideForce = this.currentSpeed * this.handbrakeForce * Math.sign(this.steeringInput);
            this.rigidBody.applyForce({
                x: rightX * driftSideForce * deltaTime,
                y: rightY * driftSideForce * deltaTime
            });

            // 3. Stronger damping to prevent speed accumulation
            const dampingForce = 0.8; // Increased damping
            this.rigidBody.applyForce({
                x: -velocity.x * dampingForce * deltaTime,
                y: -velocity.y * dampingForce * deltaTime
            });
        }
    }

    // Utility function for smooth interpolation
    lerp(start, end, factor) {
        factor = Math.max(0, Math.min(1, factor));
        return start + (end - start) * factor;
    }

    draw(ctx) {
        if (!this.showDebugInfo && !this.showWheelDirection && !this.showDriftInfo) return;

        const pos = this.gameObject.getWorldPosition();
        const angle = 0;//this.gameObject.angle * (Math.PI / 180);

        ctx.save();

        if (this.showDebugInfo) {
            // Draw basic debug info
            ctx.fillStyle = "white";
            ctx.font = "12px Arial";
            ctx.textAlign = "center";

            const speed = Math.round(this.currentSpeed);
            const angle_deg = Math.round(this.gameObject.angle % 360);
            const wheelAngle = Math.round(this.currentWheelAngle);
            const throttle = Math.round(this.throttleInput * 100);

            ctx.fillText(`Speed: ${speed}px/s`, 0, -70);
            ctx.fillText(`Angle: ${angle_deg}°`, 0, -58);
            ctx.fillText(`Wheels: ${wheelAngle}°`, 0, -46);
            ctx.fillText(`Throttle: ${throttle}%`, 0, -34);

            if (this.isAccelerating) ctx.fillText("ACCEL", 0, -22);
            if (this.isBraking) ctx.fillText("BRAKE", 0, -22);
            if (this.isTurning) ctx.fillText("TURN", 0, -10);
            if (this.isHandbraking) ctx.fillText("HANDBRAKE", 0, 2);
        }

        if (this.showDriftInfo) {
            // Draw drift-specific debug info
            ctx.fillStyle = this.isDrifting ? "orange" : "lightblue";
            ctx.font = "11px Arial";
            ctx.textAlign = "center";

            const traction = Math.round(this.currentTraction * 100);
            const driftAngle = Math.round(this.driftAngle);
            const wheelSpin = Math.round(this.wheelSpinAmount * 100);

            let yOffset = this.showDebugInfo ? 14 : -58;

            ctx.fillText(`Traction: ${traction}%`, 0, yOffset);
            ctx.fillText(`Drift: ${driftAngle}°`, 0, yOffset + 12);
            ctx.fillText(`Wheel Spin: ${wheelSpin}%`, 0, yOffset + 24);

            if (this.isDrifting) {
                ctx.fillStyle = "orange";
                ctx.fillText("DRIFTING!", 0, yOffset + 36);
            }

            // Drive type indicator
            ctx.fillStyle = "yellow";
            ctx.fillText(this.frontWheelDrive ? "FWD" : "RWD", 0, yOffset + 48);

            // Traction control indicators
            if (this.tractionControlEnabled || this.absEnabled) {
                ctx.fillStyle = "lime";
                let assists = [];
                if (this.tractionControlEnabled) assists.push("TC");
                if (this.absEnabled) assists.push("ABS");
                ctx.fillText(assists.join(" "), 0, yOffset + 60);
            }
        }

        if (this.showWheelDirection) {
            // Draw velocity vector
            try {
                const velocity = this.rigidBody.getVelocity();
                if (!velocity) return;

                if (this.currentSpeed > 10) {
                    // Color code velocity vector based on drift state
                    ctx.strokeStyle = this.isDrifting ? "orange" : "lime";
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(velocity.x * 0.5, velocity.y * 0.5);
                    ctx.stroke();
                }
            } catch (e) {
                //console.warn("VehiclePhysics: Unable to draw velocity vector", e);
            }

            // Draw forward direction (red)
            ctx.strokeStyle = "red";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * 30, Math.sin(angle) * 30);
            ctx.stroke();

            // Draw wheel direction (yellow)
            if (Math.abs(this.currentWheelAngle) > 1) {
                const wheelAngleRad = (this.currentWheelAngle * Math.PI / 180);
                const wheelDirection = angle + wheelAngleRad;
                ctx.strokeStyle = "lime";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(wheelDirection) * 25, Math.sin(wheelDirection) * 25);
                ctx.stroke();
            }

            // Draw traction indicator
            const tractionRadius = 15 + (this.currentTraction * 10);
            ctx.strokeStyle = `hsl(${this.currentTraction * 120}, 100%, 50%)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, tractionRadius, 0, Math.PI * 2);
            ctx.stroke();

            // Draw wheel spin indicator
            if (this.wheelSpinAmount > 0.1) {
                ctx.strokeStyle = "red";
                ctx.lineWidth = 1;
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2;
                    const radius = 35 + Math.sin(Date.now() * 0.01 + i) * this.wheelSpinAmount * 5;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
                    ctx.stroke();
                }
            }
        }

        ctx.restore();
    }

    drawGizmos(ctx) {
        // Draw wheel positions and angles
        if (!this.showWheelDirection) return;

        const pos = this.gameObject.getWorldPosition();
        const angle = this.gameObject.angle * (Math.PI / 180);

        ctx.save();

        // Draw simplified wheel positions with current steering angle
        const wheelOffset = this.wheelBase * 0.3;
        const wheelAngleRad = (this.currentWheelAngle * Math.PI / 180);

        // Front wheels (steered) - color based on traction
        ctx.save();
        ctx.translate(0, -wheelOffset);
        ctx.rotate(wheelAngleRad);

        // Color wheels based on traction and drive type
        if (this.frontWheelDrive) {
            ctx.fillStyle = `hsla(${this.currentTraction * 120}, 100%, 50%, 0.8)`;
        } else {
            ctx.fillStyle = "rgba(255, 255, 0, 0.7)";
        }

        ctx.fillRect(-8, -4, 16, 8);

        // Show wheel spin on drive wheels
        if (this.frontWheelDrive && this.wheelSpinAmount > 0.2) {
            ctx.strokeStyle = "red";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();

        // Rear wheels (fixed)
        ctx.save();
        ctx.translate(0, wheelOffset);

        if (!this.frontWheelDrive) {
            // RWD - color based on traction
            ctx.fillStyle = `hsla(${this.currentTraction * 120}, 100%, 50%, 0.8)`;
        } else {
            ctx.fillStyle = "rgba(255, 255, 0, 0.5)";
        }

        ctx.fillRect(-8, -4, 16, 8);

        // Show wheel spin on drive wheels
        if (!this.frontWheelDrive && this.wheelSpinAmount > 0.2) {
            ctx.strokeStyle = "red";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Show handbrake effect on rear wheels
        if (this.isHandbraking) {
            ctx.strokeStyle = "orange";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();

        ctx.restore();
    }

    // Public methods for external control
    accelerate(force = 1) {
        this.targetThrottleInput = Math.max(0, Math.min(1, force));
        this.isAccelerating = true;
    }

    brake(force = 1) {
        this.targetThrottleInput = -Math.max(0, Math.min(1, force));
        this.isBraking = true;
    }

    steer(direction = 1) {
        this.targetSteeringInput = Math.max(-1, Math.min(1, direction));
        this.isTurning = true;
    }

    handbrake(enabled = true) {
        this.isHandbraking = enabled;
    }

    getCurrentSpeed() {
        return this.currentSpeed;
    }

    isMoving() {
        return this.currentSpeed !== 0;
    }

    getCurrentWheelAngle() {
        return this.currentWheelAngle;
    }

    getThrottleInput() {
        return this.throttleInput;
    }

    getDriftAngle() {
        return this.driftAngle;
    }

    getTraction() {
        return this.currentTraction;
    }

    getWheelSpinAmount() {
        return this.wheelSpinAmount;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            playerControlled: this.playerControlled,
            maxSpeed: this.maxSpeed,
            acceleration: this.acceleration,
            brakeForce: this.brakeForce,
            decelerationRate: this.decelerationRate,
            reverseMaxSpeed: this.reverseMaxSpeed,
            maxTurnAngle: this.maxTurnAngle,
            turnMultiplier: this.turnMultiplier,
            wheelTurnSpeed: this.wheelTurnSpeed,
            wheelReturnSpeed: this.wheelReturnSpeed,
            dragCoefficient: this.dragCoefficient,
            lateralGrip: this.lateralGrip,
            minTurnSpeed: this.minTurnSpeed,
            wheelBase: this.wheelBase,
            frontWheelDrive: this.frontWheelDrive,
            differentialStrength: this.differentialStrength,
            antiRoll: this.antiRoll,
            handbrakeForce: this.handbrakeForce,
            driftThreshold: this.driftThreshold,
            tractionLoss: this.tractionLoss,
            powerOversteerStrength: this.powerOversteerStrength,
            frontGripAdvantage: this.frontGripAdvantage,
            driftRecoveryRate: this.driftRecoveryRate,
            velocityDriftFactor: this.velocityDriftFactor,
            tractionControlEnabled: this.tractionControlEnabled,
            tractionControlStrength: this.tractionControlStrength,
            absEnabled: this.absEnabled,
            absStrength: this.absStrength,
            showDebugInfo: this.showDebugInfo,
            showWheelDirection: this.showWheelDirection,
            showDriftInfo: this.showDriftInfo,
            upKey: this.upKey,
            downKey: this.downKey,
            leftKey: this.leftKey,
            rightKey: this.rightKey,
            handbrakeKey: this.handbrakeKey
        };
    }

    fromJSON(data) {
        super.fromJSON(data);

        if (!data) return;

        this.playerControlled = data.playerControlled !== undefined ? data.playerControlled : true;
        this.maxSpeed = data.maxSpeed || 300;
        this.acceleration = data.acceleration || 600;
        this.brakeForce = data.brakeForce || 800;
        this.decelerationRate = data.decelerationRate || 0.15;
        this.reverseMaxSpeed = data.reverseMaxSpeed || 150;
        this.maxTurnAngle = data.maxTurnAngle || 45;
        this.turnMultiplier = data.turnMultiplier || 1.0;
        this.wheelTurnSpeed = data.wheelTurnSpeed || 180;
        this.wheelReturnSpeed = data.wheelReturnSpeed || 120;
        this.dragCoefficient = data.dragCoefficient || 0.95;
        this.lateralGrip = data.lateralGrip || 0.85;
        this.minTurnSpeed = data.minTurnSpeed || 50;
        this.wheelBase = data.wheelBase || 60;
        this.frontWheelDrive = data.frontWheelDrive !== undefined ? data.frontWheelDrive : true;
        this.differentialStrength = data.differentialStrength || 0.8;
        this.antiRoll = data.antiRoll || 0.3;
        this.handbrakeForce = data.handbrakeForce || 0.3;
        this.driftThreshold = data.driftThreshold || 0.8;
        this.tractionLoss = data.tractionLoss || 0.4;
        this.powerOversteerStrength = data.powerOversteerStrength || 1.2;
        this.frontGripAdvantage = data.frontGripAdvantage || 0.15;
        this.driftRecoveryRate = data.driftRecoveryRate || 3.0;
        this.velocityDriftFactor = data.velocityDriftFactor || 0.7;
        this.tractionControlEnabled = data.tractionControlEnabled !== undefined ? data.tractionControlEnabled : true;
        this.tractionControlStrength = data.tractionControlStrength || 0.6;
        this.absEnabled = data.absEnabled !== undefined ? data.absEnabled : true;
        this.absStrength = data.absStrength || 0.8;
        this.showDebugInfo = data.showDebugInfo || false;
        this.showWheelDirection = data.showWheelDirection !== undefined ? data.showWheelDirection : true;
        this.showDriftInfo = data.showDriftInfo !== undefined ? data.showDriftInfo : true;
        this.upKey = data.upKey || "arrowup";
        this.downKey = data.downKey || "arrowdown";
        this.leftKey = data.leftKey || "arrowleft";
        this.rightKey = data.rightKey || "arrowright";
        this.handbrakeKey = data.handbrakeKey || " ";
    }
}

// Register the module
window.VehiclePhysics = VehiclePhysics;
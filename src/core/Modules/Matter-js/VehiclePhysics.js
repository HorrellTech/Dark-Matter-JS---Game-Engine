/**
 * VehiclePhysics - Realistic top-down vehicle physics module
 * Requires RigidBody module on the same GameObject
 */
class VehiclePhysics extends Module {
    static allowMultiple = false;
    static namespace = "Matter.js";
    static description = "Realistic top-down vehicle physics with steering and acceleration";
    static iconClass = "fas fa-car";

    constructor() {
        super("VehiclePhysics");

        // Control settings
        this.playerControlled = true;           // Can be controlled with arrow keys
        this.upKey = "arrowup";                 // Accelerate key
        this.downKey = "arrowdown";             // Brake/reverse key
        this.leftKey = "arrowleft";             // Turn left key
        this.rightKey = "arrowright";           // Turn right key

        // Vehicle physics properties
        this.maxSpeed = 10;                    // Maximum speed in pixels/second
        this.acceleration = 5;                // Acceleration force
        this.brakeForce = 10;                  // Braking force
        this.decelerationRate = 0.15;          // Natural deceleration when not accelerating
        this.reverseMaxSpeed = 7;             // Max reverse speed
        
        // Steering system
        this.maxTurnAngle = 45;                // Maximum wheel turn angle in degrees
        this.wheelTurnSpeed = 180;             // Degrees per second wheel turn rate
        this.wheelReturnSpeed = 120;           // Speed wheels return to center when not turning        
        this.turnMultiplier = 1.0;              // Multiplies steering effect based on speed
        
        this.dragCoefficient = 0.95;            // Natural drag (0-1, closer to 1 = less drag)
        this.lateralGrip = 0.85;                // Side friction for drifting (0-1)
        this.minTurnSpeed = 0.1;                 // Minimum speed to turn effectively

        // Advanced physics
        this.wheelBase = 60;                    // Distance between front and rear axles
        this.frontWheelDrive = true;            // Front or rear wheel drive
        this.differentialStrength = 0.8;        // How much wheels stick together (0-1)
        this.antiRoll = 0.3;                    // Prevents excessive body roll

        // Internal state
        this.currentSpeed = 0;                  // Current speed magnitude
        this.currentWheelAngle = 0;             // Current wheel angle in degrees (-maxTurnAngle to +maxTurnAngle)
        this.throttleInput = 0;                 // Current throttle/brake input (-1 to 1)
        this.targetThrottleInput = 0;           // Target throttle input from controls
        this.steeringInput = 0;                 // Current steering input (-1 to 1)
        this.targetSteeringInput = 0;           // Target steering from controls
        
        this.isAccelerating = false;
        this.isBraking = false;
        this.isTurning = false;
        this.rigidBody = null;                  // Reference to RigidBody component

        // Debug options
        this.showDebugInfo = false;             // Show speed/steering debug
        this.showWheelDirection = true;        // Show wheel direction indicators

        this.require("RigidBody");

        // Expose properties to inspector
        this.exposeProperty("playerControlled", "boolean", this.playerControlled, {
            description: "Can be controlled with arrow keys",
            onChange: (val) => { this.playerControlled = val; }
        });

        this.exposeProperty("maxSpeed", "number", this.maxSpeed, {
            description: "Maximum forward speed",
            min: 50,
            max: 1000,
            onChange: (val) => { this.maxSpeed = val; }
        });

        this.exposeProperty("acceleration", "number", this.acceleration, {
            description: "Acceleration force",
            min: 100,
            max: 2000,
            onChange: (val) => { this.acceleration = val; }
        });

        this.exposeProperty("brakeForce", "number", this.brakeForce, {
            description: "Braking force",
            min: 200,
            max: 2000,
            onChange: (val) => { this.brakeForce = val; }
        });

        this.exposeProperty("decelerationRate", "number", this.decelerationRate, {
            description: "Natural deceleration rate when coasting",
            min: 0.05,
            max: 0.5,
            step: 0.05,
            onChange: (val) => { this.decelerationRate = val; }
        });

        this.exposeProperty("turnMultiplier", "number", this.turnMultiplier, {
            description: "Multiplier for steering strength",
            min: 0.1,
            max: 5,
            step: 0.1,
            onChange: (val) => { this.turnMultiplier = val; }
        });

        this.exposeProperty("maxTurnAngle", "number", this.maxTurnAngle, {
            description: "Maximum wheel turn angle in degrees",
            min: 15,
            max: 90,
            onChange: (val) => { this.maxTurnAngle = val; }
        });

        this.exposeProperty("wheelTurnSpeed", "number", this.wheelTurnSpeed, {
            description: "How fast wheels turn left/right",
            min: 60,
            max: 360,
            onChange: (val) => { this.wheelTurnSpeed = val; }
        });

        this.exposeProperty("wheelReturnSpeed", "number", this.wheelReturnSpeed, {
            description: "How fast wheels return to center",
            min: 60,
            max: 300,
            onChange: (val) => { this.wheelReturnSpeed = val; }
        });

        this.exposeProperty("dragCoefficient", "number", this.dragCoefficient, {
            description: "Air resistance (closer to 1 = less drag)",
            min: 0.1,
            max: 1,
            step: 0.05,
            onChange: (val) => { this.dragCoefficient = val; }
        });

        this.exposeProperty("lateralGrip", "number", this.lateralGrip, {
            description: "Sideways friction for drifting",
            min: 0.1,
            max: 1,
            step: 0.05,
            onChange: (val) => { this.lateralGrip = val; }
        });

        this.exposeProperty("frontWheelDrive", "boolean", this.frontWheelDrive, {
            description: "Front wheel drive vs rear wheel drive",
            onChange: (val) => { this.frontWheelDrive = val; }
        });

        this.exposeProperty("showDebugInfo", "boolean", this.showDebugInfo, {
            description: "Show speed and steering debug info",
            onChange: (val) => { this.showDebugInfo = val; }
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

        style.endGroup();

        style.startGroup("Performance", false, {
            backgroundColor: 'rgba(255, 150, 100, 0.1)',
            borderRadius: '6px',
            padding: '8px'
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

        style.exposeProperty("wheelTurnSpeed", "number", this.wheelTurnSpeed, {
            description: "How fast wheels turn",
            min: 60,
            max: 360,
            step: 20,
            style: { label: "Wheel Turn Speed", slider: true }
        });

        style.exposeProperty("wheelReturnSpeed", "number", this.wheelReturnSpeed, {
            description: "How fast wheels return to center",
            min: 60,
            max: 300,
            step: 20,
            style: { label: "Wheel Return Speed", slider: true }
        });

        style.exposeProperty("lateralGrip", "number", this.lateralGrip, {
            description: "Tire grip for cornering (lower = more drift)",
            min: 0.1,
            max: 1,
            step: 0.05,
            style: { label: "Tire Grip", slider: true }
        });

        style.exposeProperty("dragCoefficient", "number", this.dragCoefficient, {
            description: "Air resistance effect",
            min: 0.1,
            max: 1,
            step: 0.05,
            style: { label: "Air Drag", slider: true }
        });

        style.endGroup();

        style.startGroup("Advanced", true, {
            backgroundColor: 'rgba(200, 200, 200, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("frontWheelDrive", "boolean", this.frontWheelDrive, {
            description: "Drive type affects handling characteristics",
            style: { label: "Front Wheel Drive" }
        });

        style.exposeProperty("showDebugInfo", "boolean", this.showDebugInfo, {
            description: "Display vehicle physics debug information",
            style: { label: "Debug Info" }
        });

        style.endGroup();

        style.addDivider();
        style.addHelpText("This module requires a RigidBody component. Features realistic wheel-based steering and smooth input transitions.");
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

        console.log(this.playerControlled ? "Player-controlled vehicle initialized." : "AI-controlled vehicle initialized.");
    }

    loop(deltaTime) {
        if (!this.rigidBody || !this.rigidBody.body) return;

        // Reset input flags
        this.isAccelerating = false;
        this.isBraking = false;
        this.isTurning = false;

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
        }

        // Update input smoothing and wheel physics
        this.updateInputs(deltaTime);
        this.updateWheelSteering(deltaTime);
        this.updateVehiclePhysics(deltaTime);
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

        // Calculate forward velocity component
        const forwardVel = velocity.x * forwardX + velocity.y * forwardY;
        const rightVel = velocity.x * rightX + velocity.y * rightY;

        // Apply throttle forces
        if (Math.abs(this.throttleInput) > 0.01) {
            let targetSpeed = this.throttleInput > 0 ? this.maxSpeed : -this.reverseMaxSpeed;
            let force = Math.abs(this.throttleInput > 0 ? this.acceleration : this.brakeForce);

            // Reduce force as we approach max speed
            let speedRatio = Math.abs(forwardVel) / Math.abs(targetSpeed);
            if (speedRatio > 0.8) {
                force *= Math.max(0.1, 1 - speedRatio);
            }

            // Apply driving force in forward direction
            const driveForce = force * this.throttleInput * deltaTime * 60;
            this.rigidBody.applyForce({
                x: forwardX * driveForce,
                y: forwardY * driveForce
            });
        }

        // Apply wheel-based steering
        if (Math.abs(this.currentWheelAngle) > 1 && this.isMoving()) {
            // Calculate wheel direction based on current wheel angle and vehicle angle
            const wheelAngleRad = (this.currentWheelAngle * Math.PI / 180);
            const wheelDirection = currentAngle + wheelAngleRad;
            
            // Calculate desired direction based on wheel angle
            const wheelForwardX = Math.cos(wheelDirection);
            const wheelForwardY = Math.sin(wheelDirection);
            
            // Apply steering force proportional to speed and wheel angle
            let steerForce = Math.sin(wheelAngleRad);
            
            // Apply the steering force
            this.rigidBody.applyForce({
                x: wheelForwardX * steerForce * 0.5,
                y: wheelForwardY * steerForce * 0.5
            });

            // Calculate turn radius and apply angular velocity for realistic turning
            let wheelbase = this.wheelBase;
            let turnRadius = wheelbase / Math.tan(Math.abs(wheelAngleRad));
            let angularVel = (forwardVel / turnRadius) * Math.sign(this.currentWheelAngle) * this.turnMultiplier;
            
            // Limit angular velocity for stability
            angularVel = Math.max(-3, Math.min(3, angularVel));
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

            // Lateral drag (tire friction) for realistic handling
            const lateralDragForce = rightVel * this.lateralGrip * 10;
            this.rigidBody.applyForce({
                x: -rightX * lateralDragForce,
                y: -rightY * lateralDragForce
            });
        }

        // Apply angular damping to prevent excessive spinning
        if (body.angularVelocity !== 0) {
            const angularDrag = body.angularVelocity * 0.8;
            body.angularVelocity -= angularDrag * deltaTime;
        }
    }

    // Utility function for smooth interpolation
    lerp(start, end, factor) {
        factor = Math.max(0, Math.min(1, factor));
        return start + (end - start) * factor;
    }

    draw(ctx) {
        if (!this.showDebugInfo && !this.showWheelDirection) return;

        const pos = this.gameObject.getWorldPosition();
        const angle = 0;//this.gameObject.angle * (Math.PI / 180);

        ctx.save();

        if (this.showDebugInfo) {
            // Draw debug info
            ctx.fillStyle = "white";
            ctx.font = "12px Arial";
            ctx.textAlign = "center";

            const speed = Math.round(this.currentSpeed);
            const angle_deg = Math.round(this.gameObject.angle % 360);
            const wheelAngle = Math.round(this.currentWheelAngle);
            const throttle = Math.round(this.throttleInput * 100);

            ctx.fillText(`Speed: ${speed}px/s`, 0, -55);
            ctx.fillText(`Angle: ${angle_deg}°`, 0, -43);
            ctx.fillText(`Wheels: ${wheelAngle}°`, 0, -31);
            ctx.fillText(`Throttle: ${throttle}%`, 0, -19);

            if (this.isAccelerating) ctx.fillText("ACCEL", 0, -7);
            if (this.isBraking) ctx.fillText("BRAKE", 0, -7);
            if (this.isTurning) ctx.fillText("TURN", 0, 5);
        }

        if (this.showWheelDirection) {
            // Draw velocity vector
            try {
                const velocity = this.rigidBody.getVelocity();
                if (!velocity) return;

                if (this.currentSpeed > 10) {
                    ctx.strokeStyle = "lime";
                    ctx.lineWidth = 2;
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
                ctx.strokeStyle = "yellow";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(wheelDirection) * 25, Math.sin(wheelDirection) * 25);
                ctx.stroke();
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

        // Front wheels (steered)
        ctx.save();
        ctx.translate(0, -wheelOffset);
        ctx.rotate(wheelAngleRad);
        ctx.fillStyle = "rgba(255, 255, 0, 0.7)";
        ctx.fillRect(-8, -4, 16, 8);
        ctx.restore();

        // Rear wheels (fixed)
        ctx.fillStyle = "rgba(255, 255, 0, 0.5)";
        ctx.fillRect(-8, wheelOffset - 4, 16, 8);

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
            showDebugInfo: this.showDebugInfo,
            showWheelDirection: this.showWheelDirection,
            upKey: this.upKey,
            downKey: this.downKey,
            leftKey: this.leftKey,
            rightKey: this.rightKey
        };
    }

    fromJSON(data) {
        super.fromJSON(data);

        if (!data) return;

        this.playerControlled = data.playerControlled || true;
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
        this.frontWheelDrive = data.frontWheelDrive || true;
        this.differentialStrength = data.differentialStrength || 0.8;
        this.antiRoll = data.antiRoll || 0.3;
        this.showDebugInfo = data.showDebugInfo || false;
        this.showWheelDirection = data.showWheelDirection || false;
        this.upKey = data.upKey || "arrowup";
        this.downKey = data.downKey || "arrowdown";
        this.leftKey = data.leftKey || "arrowleft";
        this.rightKey = data.rightKey || "arrowright";
    }
}

// Register the module
window.VehiclePhysics = VehiclePhysics;
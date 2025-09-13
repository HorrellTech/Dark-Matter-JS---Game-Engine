/**
 * PlayerControllerTopDownMatter - GTA-style player controller with vehicle interaction
 * Requires RigidBody module on the same GameObject
 */
class PlayerControllerTopDownMatter extends Module {
    static allowMultiple = false;
    static namespace = "Matter.js";
    static description = "GTA-style top-down player controller with vehicle interaction for Matter.js";
    static iconClass = "fas fa-walking";

    constructor() {
        super("PlayerControllerTopDownMatter");

        // Control settings
        this.upKey = "arrowup";                 // Move forward key
        this.downKey = "arrowdown";             // Move backward key  
        this.leftKey = "arrowleft";             // Turn left key
        this.rightKey = "arrowright";           // Turn right key
        this.interactKey = "enter";             // Enter/exit vehicle key

        // Movement properties
        this.moveSpeed = 200;                   // Movement speed in pixels/second
        this.turnSpeed = 180;                   // Turn speed in degrees/second
        this.acceleration = 800;                // Acceleration force
        this.deceleration = 600;               // Deceleration when not moving
        this.maxSpeed = 300;                   // Maximum speed

        // Vehicle interaction
        this.vehicleDetectionRange = 80;        // Range to detect vehicles
        this.vehicleApproachSpeed = 150;        // Speed when approaching vehicle
        this.exitDistance = 60;                // Distance from vehicle when exiting

        // Vehicle state
        this.isInVehicle = false;
        this.currentVehicle = null;
        this.vehicleOffset = { x: 0, y: 0 };    // Offset from vehicle center
        this.approachingVehicle = null;
        this.isApproaching = false;

        // Internal state
        this.currentVelocity = { x: 0, y: 0 };
        this.targetVelocity = { x: 0, y: 0 };
        this.facingAngle = 0;                   // Current facing direction
        this.isMoving = false;
        this.isTurning = false;

        this.rigidBody = null;                  // Reference to RigidBody component

        // Debug options
        this.showDebugInfo = false;             // Show speed/direction debug
        this.showVehicleDetection = true;       // Show vehicle detection range

        this.require("RigidBody");

        // Expose properties to inspector
        this.exposeProperty("moveSpeed", "number", this.moveSpeed, {
            description: "Player movement speed",
            min: 50,
            max: 500,
            step: 10,
            onChange: (val) => { this.moveSpeed = val; }
        });

        this.exposeProperty("turnSpeed", "number", this.turnSpeed, {
            description: "Player turn speed in degrees/second",
            min: 45,
            max: 360,
            step: 15,
            onChange: (val) => { this.turnSpeed = val; }
        });

        this.exposeProperty("acceleration", "number", this.acceleration, {
            description: "Movement acceleration force",
            min: 100,
            max: 2000,
            step: 50,
            onChange: (val) => { this.acceleration = val; }
        });

        this.exposeProperty("vehicleDetectionRange", "number", this.vehicleDetectionRange, {
            description: "Range to detect nearby vehicles",
            min: 20,
            max: 200,
            step: 10,
            onChange: (val) => { this.vehicleDetectionRange = val; }
        });

        this.exposeProperty("exitDistance", "number", this.exitDistance, {
            description: "Distance from vehicle when exiting",
            min: 30,
            max: 150,
            step: 10,
            onChange: (val) => { this.exitDistance = val; }
        });

        this.exposeProperty("showDebugInfo", "boolean", this.showDebugInfo, {
            description: "Show player debug information",
            onChange: (val) => { this.showDebugInfo = val; }
        });

        this.exposeProperty("showVehicleDetection", "boolean", this.showVehicleDetection, {
            description: "Show vehicle detection range",
            onChange: (val) => { this.showVehicleDetection = val; }
        });
    }

    style(style) {
        style.startGroup("Player Controls", false, {
            backgroundColor: 'rgba(100, 150, 255, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("upKey", "string", this.upKey, {
            description: "Key to move forward",
            style: { label: "Forward Key" }
        });

        style.exposeProperty("downKey", "string", this.downKey, {
            description: "Key to move backward",
            style: { label: "Backward Key" }
        });

        style.exposeProperty("leftKey", "string", this.leftKey, {
            description: "Key to turn left",
            style: { label: "Turn Left Key" }
        });

        style.exposeProperty("rightKey", "string", this.rightKey, {
            description: "Key to turn right",
            style: { label: "Turn Right Key" }
        });

        style.exposeProperty("interactKey", "string", this.interactKey, {
            description: "Key to enter/exit vehicles",
            style: { label: "Interact Key" }
        });

        style.endGroup();

        style.startGroup("Movement", false, {
            backgroundColor: 'rgba(255, 150, 100, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("moveSpeed", "number", this.moveSpeed, {
            description: "Player movement speed",
            min: 50,
            max: 500,
            step: 10,
            style: { label: "Move Speed", slider: true }
        });

        style.exposeProperty("turnSpeed", "number", this.turnSpeed, {
            description: "Turn speed in degrees per second",
            min: 45,
            max: 360,
            step: 15,
            style: { label: "Turn Speed", slider: true }
        });

        style.exposeProperty("acceleration", "number", this.acceleration, {
            description: "Movement acceleration force",
            min: 100,
            max: 2000,
            step: 50,
            style: { label: "Acceleration", slider: true }
        });

        style.exposeProperty("deceleration", "number", this.deceleration, {
            description: "Deceleration when not moving",
            min: 100,
            max: 1500,
            step: 50,
            style: { label: "Deceleration", slider: true }
        });

        style.exposeProperty("maxSpeed", "number", this.maxSpeed, {
            description: "Maximum movement speed",
            min: 100,
            max: 600,
            step: 25,
            style: { label: "Max Speed", slider: true }
        });

        style.endGroup();

        style.startGroup("Vehicle Interaction", false, {
            backgroundColor: 'rgba(100, 255, 150, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("vehicleDetectionRange", "number", this.vehicleDetectionRange, {
            description: "Range to detect nearby vehicles",
            min: 20,
            max: 200,
            step: 10,
            style: { label: "Detection Range", slider: true }
        });

        style.exposeProperty("vehicleApproachSpeed", "number", this.vehicleApproachSpeed, {
            description: "Speed when approaching vehicles",
            min: 50,
            max: 300,
            step: 25,
            style: { label: "Approach Speed", slider: true }
        });

        style.exposeProperty("exitDistance", "number", this.exitDistance, {
            description: "Distance from vehicle when exiting",
            min: 30,
            max: 150,
            step: 10,
            style: { label: "Exit Distance", slider: true }
        });

        style.endGroup();

        style.startGroup("Debug", true, {
            backgroundColor: 'rgba(200, 200, 200, 0.1)',
            borderRadius: '6px',
            padding: '8px'
        });

        style.exposeProperty("showDebugInfo", "boolean", this.showDebugInfo, {
            description: "Display player debug information",
            style: { label: "Debug Info" }
        });

        style.exposeProperty("showVehicleDetection", "boolean", this.showVehicleDetection, {
            description: "Show vehicle detection range",
            style: { label: "Vehicle Detection" }
        });

        style.endGroup();

        style.addDivider();
        style.addHelpText("GTA-style player controller. Use arrow keys to move and turn. Press Enter near vehicles to enter/exit them.");
    }

    start() {
        // Get the RigidBody component
        this.rigidBody = this.gameObject.getModule("RigidBody");

        if (!this.rigidBody) {
            console.error("PlayerControllerTopDownMatter requires a RigidBody component on the same GameObject!");
            return;
        }

        // Configure RigidBody for player movement
        this.rigidBody.useGravity = false;      // Disable gravity for top-down
        this.rigidBody.bodyType = "dynamic";    // Must be dynamic
        this.rigidBody.friction = 0.1;          // Low friction for smooth movement
        this.rigidBody.frictionAir = 0.1;       // Some air resistance
        this.rigidBody.density = 1.0;           // Standard density
        this.rigidBody.fixedRotation = true;    // Prevent physics rotation

        // Initialize facing angle to current GameObject angle
        this.facingAngle = this.gameObject.angle;

        console.log("Player controller initialized.");
    }

    loop(deltaTime) {
        if (!this.rigidBody || !this.rigidBody.body) return;

        // Reset input flags
        this.isMoving = false;
        this.isTurning = false;

        // Handle vehicle interaction
        this.handleVehicleInteraction();

        if (this.isInVehicle) {
            // When in vehicle, follow the vehicle position
            this.updateVehiclePosition();
        } else if (this.isApproaching) {
            // Handle approaching vehicle
            this.updateVehicleApproach(deltaTime);
        } else {
            // Normal player movement
            this.handlePlayerInput(deltaTime);
            this.updatePlayerMovement(deltaTime);
        }
    }

    handlePlayerInput(deltaTime) {
        let forwardInput = 0;
        let turnInput = 0;

        // Get movement input
        if (window.input.keyDown(this.upKey)) {
            forwardInput = 1;
            this.isMoving = true;
        }
        if (window.input.keyDown(this.downKey)) {
            forwardInput = -1;
            this.isMoving = true;
        }

        // Get turning input
        if (window.input.keyDown(this.leftKey)) {
            turnInput = -1;
            this.isTurning = true;
        }
        if (window.input.keyDown(this.rightKey)) {
            turnInput = 1;
            this.isTurning = true;
        }

        // Update facing angle
        if (this.isTurning) {
            // Update the facing angle first
            this.facingAngle += turnInput * this.turnSpeed * deltaTime;

            // Normalize angle to 0-360 range
            this.facingAngle = ((this.facingAngle % 360) + 360) % 360;

            // Apply rotation to both rigid body and game object
            this.rigidBody.setAngle(this.facingAngle);
            this.gameObject.angle = this.facingAngle;
        }

        // Calculate target velocity based on facing direction and input
        const angleRad = this.facingAngle * (Math.PI / 180);
        const forwardX = Math.cos(angleRad);
        const forwardY = Math.sin(angleRad);

        if (this.isMoving) {
            this.targetVelocity.x = forwardX * forwardInput * this.moveSpeed;
            this.targetVelocity.y = forwardY * forwardInput * this.moveSpeed;
        } else {
            this.targetVelocity.x = 0;
            this.targetVelocity.y = 0;
        }
    }

    updatePlayerMovement(deltaTime) {
        const body = this.rigidBody.body;
        const currentVel = this.rigidBody.getVelocity();

        // Calculate force needed to reach target velocity
        const velDiffX = this.targetVelocity.x - currentVel.x;
        const velDiffY = this.targetVelocity.y - currentVel.y;

        // Apply acceleration or deceleration
        const force = this.isMoving ? this.acceleration : this.deceleration;
        const forceX = velDiffX * force * deltaTime;
        const forceY = velDiffY * force * deltaTime;

        // Limit maximum speed
        const currentSpeed = Math.sqrt(currentVel.x * currentVel.x + currentVel.y * currentVel.y);
        if (currentSpeed < this.maxSpeed || !this.isMoving) {
            this.rigidBody.applyForce({ x: forceX, y: forceY });
        }

        // Apply additional damping for precise control
        const dampingForce = 0.8;
        this.rigidBody.applyForce({
            x: -currentVel.x * dampingForce * deltaTime,
            y: -currentVel.y * dampingForce * deltaTime
        });
    }

    handleVehicleInteraction() {
        // Check for interact key press
        if (window.input.keyPressed(this.interactKey)) {
            if (this.isInVehicle) {
                this.exitVehicle();
            } else if (!this.isApproaching) {
                const nearestVehicle = this.findNearestVehicle();
                if (nearestVehicle) {
                    this.startApproachingVehicle(nearestVehicle);
                }
            }
        }
    }

    findNearestVehicle() {
        if (!window.engine || !window.engine.gameObjects) return null;

        const playerPos = this.gameObject.getWorldPosition();
        let nearestVehicle = null;
        let nearestDistance = this.vehicleDetectionRange;

        // Check all game objects for VehiclePhysics modules
        for (const gameObject of window.engine.gameObjects) {
            if (gameObject === this.gameObject) continue;

            const vehicleModule = gameObject.getModule("VehiclePhysics");
            if (vehicleModule && vehicleModule.gtaStyleVehicle) {
                const vehiclePos = gameObject.getWorldPosition();
                const distance = this.distance(playerPos, vehiclePos);

                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestVehicle = gameObject;
                }
            }
        }

        return nearestVehicle;
    }

    startApproachingVehicle(vehicle) {
        this.approachingVehicle = vehicle;
        this.isApproaching = true;
        console.log("Approaching vehicle:", vehicle.name);
    }

    updateVehicleApproach(deltaTime) {
        if (!this.approachingVehicle) {
            this.isApproaching = false;
            return;
        }

        const playerPos = this.gameObject.getWorldPosition();
        const vehiclePos = this.approachingVehicle.getWorldPosition();
        const distance = this.distance(playerPos, vehiclePos);

        // If close enough, enter the vehicle
        if (distance < 30) {
            this.enterVehicle(this.approachingVehicle);
            return;
        }

        // Move toward the vehicle
        const dirX = vehiclePos.x - playerPos.x;
        const dirY = vehiclePos.y - playerPos.y;
        const length = Math.sqrt(dirX * dirX + dirY * dirY);

        if (length > 0) {
            const normalizedX = dirX / length;
            const normalizedY = dirY / length;

            // Set velocity toward vehicle
            this.rigidBody.setVelocity({
                x: normalizedX * this.vehicleApproachSpeed,
                y: normalizedY * this.vehicleApproachSpeed
            });

            // Face the vehicle
            this.facingAngle = Math.atan2(dirY, dirX) * (180 / Math.PI);
            this.gameObject.angle = this.facingAngle;
        }
    }

    enterVehicle(vehicle) {
        this.isInVehicle = true;
        this.currentVehicle = vehicle;
        this.isApproaching = false;
        this.approachingVehicle = null;

        // Store offset from vehicle center
        const playerPos = this.gameObject.getWorldPosition();
        const vehiclePos = vehicle.getWorldPosition();
        this.vehicleOffset.x = playerPos.x - vehiclePos.x;
        this.vehicleOffset.y = playerPos.y - vehiclePos.y;

        // Enable vehicle player control
        const vehicleModule = vehicle.getModule("VehiclePhysics");
        if (vehicleModule) {
            vehicleModule.playerControlled = true;
        }

        // Make player invisible or hidden while in vehicle
        // You might want to set player visibility or disable rendering

        console.log("Entered vehicle:", vehicle.name);
    }

    exitVehicle() {
        if (!this.currentVehicle) return;

        // Disable vehicle player control
        const vehicleModule = this.currentVehicle.getModule("VehiclePhysics");
        if (vehicleModule) {
            vehicleModule.playerControlled = false;
        }

        // Position player outside the vehicle
        const vehiclePos = this.currentVehicle.getWorldPosition();
        const vehicleAngle = this.currentVehicle.angle * (Math.PI / 180);

        // Position player to the side of the vehicle
        const exitX = vehiclePos.x + Math.cos(vehicleAngle + Math.PI / 2) * this.exitDistance;
        const exitY = vehiclePos.y + Math.sin(vehicleAngle + Math.PI / 2) * this.exitDistance;

        this.gameObject.setWorldPosition(exitX, exitY);
        this.facingAngle = this.currentVehicle.angle;
        this.gameObject.angle = this.facingAngle;

        // Clear vehicle references
        this.isInVehicle = false;
        this.currentVehicle = null;
        this.vehicleOffset.x = 0;
        this.vehicleOffset.y = 0;

        // Stop player movement
        this.rigidBody.setVelocity({ x: 0, y: 0 });

        console.log("Exited vehicle");
    }

    updateVehiclePosition() {
        if (!this.currentVehicle) {
            this.isInVehicle = false;
            return;
        }

        // Follow the vehicle position
        const vehiclePos = this.currentVehicle.getWorldPosition();
        const newX = vehiclePos.x + this.vehicleOffset.x;
        const newY = vehiclePos.y + this.vehicleOffset.y;

        this.gameObject.setWorldPosition(newX, newY);
        this.gameObject.angle = this.currentVehicle.angle;
        this.facingAngle = this.currentVehicle.angle;

        // Match vehicle velocity to prevent physics issues
        const vehicleRigidBody = this.currentVehicle.getModule("RigidBody");
        if (vehicleRigidBody) {
            const vehicleVel = vehicleRigidBody.getVelocity();
            this.rigidBody.setVelocity(vehicleVel);
        }
    }

    // Utility function to calculate distance between two points
    distance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    draw(ctx) {
        if (!this.showDebugInfo && !this.showVehicleDetection) return;

        ctx.save();

        if (this.showDebugInfo) {
            // Draw basic debug info
            ctx.fillStyle = "white";
            ctx.font = "12px Arial";
            ctx.textAlign = "center";

            const velocity = this.rigidBody.getVelocity();
            const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
            const angle = Math.round(this.facingAngle % 360);

            ctx.fillText(`Speed: ${Math.round(speed)}px/s`, 0, -40);
            ctx.fillText(`Angle: ${angle}°`, 0, -28);

            if (this.isInVehicle) {
                ctx.fillStyle = "lime";
                ctx.fillText("IN VEHICLE", 0, -16);
                if (this.currentVehicle) {
                    ctx.fillText(this.currentVehicle.name, 0, -4);
                }
            } else if (this.isApproaching) {
                ctx.fillStyle = "yellow";
                ctx.fillText("APPROACHING", 0, -16);
            } else {
                if (this.isMoving) ctx.fillText("MOVING", 0, -16);
                if (this.isTurning) ctx.fillText("TURNING", 0, -4);
            }
        }

        if (this.showVehicleDetection && !this.isInVehicle) {
            // Draw vehicle detection range
            ctx.strokeStyle = "rgba(0, 255, 0, 0.3)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, this.vehicleDetectionRange, 0, Math.PI * 2);
            ctx.stroke();

            // Highlight nearest vehicle
            const nearestVehicle = this.findNearestVehicle();
            if (nearestVehicle) {
                const playerPos = this.gameObject.getWorldPosition();
                const vehiclePos = nearestVehicle.getWorldPosition();

                ctx.strokeStyle = "lime";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(vehiclePos.x - playerPos.x, vehiclePos.y - playerPos.y);
                ctx.stroke();

                // Draw interact prompt
                ctx.fillStyle = "lime";
                ctx.font = "10px Arial";
                ctx.fillText(`Press ${this.interactKey.toUpperCase()} to enter`, 0, 20);
            }
        }

        // Draw forward direction indicator
        if (!this.isInVehicle) {
            const angleRad = this.facingAngle * (Math.PI / 180);
            const forwardX = Math.cos(angleRad) * 25;
            const forwardY = Math.sin(angleRad) * 25;

            ctx.strokeStyle = "red";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(forwardX, forwardY);
            ctx.stroke();
        }

        ctx.restore();
    }

    // Public methods for external control
    moveForward(force = 1) {
        if (this.isInVehicle) return;
        this.isMoving = true;
        // Implementation for programmatic movement
    }

    turn(direction = 1) {
        if (this.isInVehicle) return;
        this.isTurning = true;
        // Implementation for programmatic turning
    }

    getCurrentSpeed() {
        const velocity = this.rigidBody.getVelocity();
        return Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    }

    isPlayerInVehicle() {
        return this.isInVehicle;
    }

    getCurrentVehicle() {
        return this.currentVehicle;
    }

    forceExitVehicle() {
        if (this.isInVehicle) {
            this.exitVehicle();
        }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            moveSpeed: this.moveSpeed,
            turnSpeed: this.turnSpeed,
            acceleration: this.acceleration,
            deceleration: this.deceleration,
            maxSpeed: this.maxSpeed,
            vehicleDetectionRange: this.vehicleDetectionRange,
            vehicleApproachSpeed: this.vehicleApproachSpeed,
            exitDistance: this.exitDistance,
            showDebugInfo: this.showDebugInfo,
            showVehicleDetection: this.showVehicleDetection,
            upKey: this.upKey,
            downKey: this.downKey,
            leftKey: this.leftKey,
            rightKey: this.rightKey,
            interactKey: this.interactKey
        };
    }

    fromJSON(data) {
        super.fromJSON(data);

        if (!data) return;

        this.moveSpeed = data.moveSpeed || 200;
        this.turnSpeed = data.turnSpeed || 180;
        this.acceleration = data.acceleration || 800;
        this.deceleration = data.deceleration || 600;
        this.maxSpeed = data.maxSpeed || 300;
        this.vehicleDetectionRange = data.vehicleDetectionRange || 80;
        this.vehicleApproachSpeed = data.vehicleApproachSpeed || 150;
        this.exitDistance = data.exitDistance || 60;
        this.showDebugInfo = data.showDebugInfo || false;
        this.showVehicleDetection = data.showVehicleDetection !== undefined ? data.showVehicleDetection : true;
        this.upKey = data.upKey || "arrowup";
        this.downKey = data.downKey || "arrowdown";
        this.leftKey = data.leftKey || "arrowleft";
        this.rightKey = data.rightKey || "arrowright";
        this.interactKey = data.interactKey || "enter";
    }
}

// Register the module
window.PlayerControllerTopDownMatter = PlayerControllerTopDownMatter;
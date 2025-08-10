class PlayerShip extends Module {
    static namespace = "Asteroids";
    static description = "Player-controlled spaceship with thrust, rotation, and physics";
    static allowMultiple = false;

    constructor() {
        super("PlayerShip");

        // Physics properties
        this.thrustPower = 300;
        this.rotationSpeed = 180; // degrees per second
        this.maxSpeed = 400;
        this.friction = 0.98;
        this.angularFriction = 0.95;

        // Controls
        this.thrustKey = "arrowup";
        this.leftKey = "arrowleft";
        this.rightKey = "arrowright";
        this.fireKey = "space";

        // Internal state
        this.velocity = { x: 0, y: 0 };
        this.angularVelocity = 0;
        this.isThrusting = false;

        // Visual properties
        this.shipColor = "#00ff00";
        this.thrustColor = "#ff4400";
        this.shipSize = 12;
        this.showThrust = true;

        // Expose properties for inspector
        this.exposeProperty("thrustPower", "number", 300, {
            description: "Thrust force applied when accelerating",
            onChange: (val) => {
                this.thrustPower = Math.max(0, val);
            }
        });

        this.exposeProperty("rotationSpeed", "number", 180, {
            description: "Rotation speed in degrees per second",
            onChange: (val) => {
                this.rotationSpeed = Math.max(0, val);
            }
        });

        this.exposeProperty("maxSpeed", "number", 400, {
            description: "Maximum velocity magnitude",
            onChange: (val) => {
                this.maxSpeed = Math.max(1, val);
            }
        });

        this.exposeProperty("friction", "number", 0.98, {
            description: "Linear friction (0-1, closer to 1 = less friction)",
            onChange: (val) => {
                this.friction = Math.max(0, Math.min(1, val));
            }
        });

        this.exposeProperty("angularFriction", "number", 0.95, {
            description: "Angular friction (0-1, closer to 1 = less friction)",
            onChange: (val) => {
                this.angularFriction = Math.max(0, Math.min(1, val));
            }
        });

        this.exposeProperty("thrustKey", "string", "arrowup", {
            description: "Key for thrust/acceleration",
            onChange: (val) => {
                this.thrustKey = val;
            }
        });

        this.exposeProperty("leftKey", "string", "arrowleft", {
            description: "Key for rotating left",
            onChange: (val) => {
                this.leftKey = val;
            }
        });

        this.exposeProperty("rightKey", "string", "arrowright", {
            description: "Key for rotating right",
            onChange: (val) => {
                this.rightKey = val;
            }
        });

        this.exposeProperty("fireKey", "string", "space", {
            description: "Key for firing weapons",
            onChange: (val) => {
                this.fireKey = val;
            }
        });

        this.exposeProperty("shipColor", "color", "#00ff00", {
            description: "Color of the ship",
            onChange: (val) => {
                this.shipColor = val;
            }
        });

        this.exposeProperty("thrustColor", "color", "#ff4400", {
            description: "Color of thrust flame",
            onChange: (val) => {
                this.thrustColor = val;
            }
        });

        this.exposeProperty("shipSize", "number", 12, {
            description: "Size of the ship",
            onChange: (val) => {
                this.shipSize = Math.max(4, val);
            }
        });

        this.exposeProperty("showThrust", "boolean", true, {
            description: "Show thrust flame when accelerating",
            onChange: (val) => {
                this.showThrust = val;
            }
        });
    }

    start() {
        // Initialize velocity
        this.velocity = { x: 0, y: 0 };
        this.angularVelocity = 0;
        this.isThrusting = false;
    }

    loop(deltaTime) {
        this.handleInput(deltaTime);
        this.updatePhysics(deltaTime);
        //this.applyScreenWrapping();
    }

    handleInput(deltaTime) {
        this.isThrusting = false;

        // Rotation input
        if (window.input.keyDown(this.leftKey)) {
            this.angularVelocity -= this.rotationSpeed * deltaTime;
        }
        if (window.input.keyDown(this.rightKey)) {
            this.angularVelocity += this.rotationSpeed * deltaTime;
        }

        // Thrust input
        if (window.input.keyDown(this.thrustKey)) {
            this.isThrusting = true;
            
            // Convert angle to radians and apply thrust in facing direction
            const angleRad = (this.gameObject.angle * Math.PI) / 180;
            const thrustX = Math.cos(angleRad - Math.PI / 2) * this.thrustPower * deltaTime;
            const thrustY = Math.sin(angleRad - Math.PI / 2) * this.thrustPower * deltaTime;
            
            this.velocity.x += thrustX;
            this.velocity.y += thrustY;
        }

        // Fire input (for potential weapon systems)
        if (window.input.keyPressed(this.fireKey)) {
            this.onFire();
        }
    }

    updatePhysics(deltaTime) {
        // Apply friction to linear velocity
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;

        // Apply friction to angular velocity
        this.angularVelocity *= this.angularFriction;

        // Limit max speed
        const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        if (speed > this.maxSpeed) {
            const ratio = this.maxSpeed / speed;
            this.velocity.x *= ratio;
            this.velocity.y *= ratio;
        }

        // Update position
        this.gameObject.position.x += this.velocity.x * deltaTime;
        this.gameObject.position.y += this.velocity.y * deltaTime;

        // Update rotation
        this.gameObject.angle += this.angularVelocity * deltaTime;

        // Keep angle in 0-360 range
        while (this.gameObject.angle >= 360) this.gameObject.angle -= 360;
        while (this.gameObject.angle < 0) this.gameObject.angle += 360;
    }

    applyScreenWrapping() {
        const viewport = window.engine.viewport;
        const halfWidth = viewport.width / 2;
        const halfHeight = viewport.height / 2;
        const margin = this.shipSize;

        const left = viewport.x - halfWidth - margin;
        const right = viewport.x + halfWidth + margin;
        const top = viewport.y - halfHeight - margin;
        const bottom = viewport.y + halfHeight + margin;

        // Wrap horizontally
        if (this.gameObject.position.x < left) {
            this.gameObject.position.x = right;
        } else if (this.gameObject.position.x > right) {
            this.gameObject.position.x = left;
        }

        // Wrap vertically
        if (this.gameObject.position.y < top) {
            this.gameObject.position.y = bottom;
        } else if (this.gameObject.position.y > bottom) {
            this.gameObject.position.y = top;
        }
    }

    onFire() {
        // Override this method or emit events for weapon systems
        // For now, just log for debugging
        console.log("Ship fired!");
    }

    draw(ctx) {
        ctx.save();

        // Move to ship position
        //ctx.translate(this.gameObject.position.x, this.gameObject.position.y);
        //ctx.rotate((this.gameObject.angle * Math.PI) / 180);

        // Draw thrust flame first (behind ship)
        if (this.showThrust && this.isThrusting) {
            this.drawThrust(ctx);
        }

        // Draw ship
        this.drawShip(ctx);

        ctx.restore();
    }

    drawShip(ctx) {
        ctx.strokeStyle = this.shipColor;
        ctx.fillStyle = this.shipColor;
        ctx.lineWidth = 2;

        // Classic triangular ship shape
        ctx.beginPath();
        ctx.moveTo(0, -this.shipSize); // Top point
        ctx.lineTo(-this.shipSize * 0.6, this.shipSize * 0.8); // Bottom left
        ctx.lineTo(0, this.shipSize * 0.4); // Bottom center (creates notch)
        ctx.lineTo(this.shipSize * 0.6, this.shipSize * 0.8); // Bottom right
        ctx.closePath();
        ctx.stroke();
    }

    drawThrust(ctx) {
        ctx.fillStyle = this.thrustColor;
        ctx.globalAlpha = 0.8;

        // Animated thrust flame
        const time = Date.now() * 0.01;
        const flameLength = this.shipSize * (1.2 + Math.sin(time) * 0.3);
        const flameWidth = this.shipSize * 0.4;

        ctx.beginPath();
        ctx.moveTo(-flameWidth * 0.5, this.shipSize * 0.6);
        ctx.lineTo(0, this.shipSize + flameLength);
        ctx.lineTo(flameWidth * 0.5, this.shipSize * 0.6);
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = 1;
    }

    drawGizmos(ctx) {
        if (window.engine.debug) {
            // Draw velocity vector
            ctx.strokeStyle = "yellow";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.gameObject.position.x, this.gameObject.position.y);
            ctx.lineTo(
                this.gameObject.position.x + this.velocity.x * 0.1,
                this.gameObject.position.y + this.velocity.y * 0.1
            );
            ctx.stroke();

            // Draw ship info
            ctx.fillStyle = "white";
            ctx.font = "12px Arial";
            const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
            ctx.fillText(`Speed: ${Math.round(speed)}`, this.gameObject.position.x + 20, this.gameObject.position.y - 20);
            ctx.fillText(`Angle: ${Math.round(this.gameObject.angle)}°`, this.gameObject.position.x + 20, this.gameObject.position.y - 5);
            ctx.fillText(`Angular Vel: ${Math.round(this.angularVelocity)}°/s`, this.gameObject.position.x + 20, this.gameObject.position.y + 10);
        }
    }

    // Public methods for external control
    getVelocity() {
        return { x: this.velocity.x, y: this.velocity.y };
    }

    setVelocity(x, y) {
        this.velocity.x = x;
        this.velocity.y = y;
    }

    addVelocity(x, y) {
        this.velocity.x += x;
        this.velocity.y += y;
    }

    getSpeed() {
        return Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
    }

    getFacingDirection() {
        const angleRad = (this.gameObject.angle * Math.PI) / 180;
        return {
            x: Math.cos(angleRad - Math.PI / 2),
            y: Math.sin(angleRad - Math.PI / 2)
        };
    }

    toJSON() {
        return {
            thrustPower: this.thrustPower,
            rotationSpeed: this.rotationSpeed,
            maxSpeed: this.maxSpeed,
            friction: this.friction,
            angularFriction: this.angularFriction,
            thrustKey: this.thrustKey,
            leftKey: this.leftKey,
            rightKey: this.rightKey,
            fireKey: this.fireKey,
            shipColor: this.shipColor,
            thrustColor: this.thrustColor,
            shipSize: this.shipSize,
            showThrust: this.showThrust,
            velocity: this.velocity,
            angularVelocity: this.angularVelocity
        };
    }

    fromJSON(data) {
        this.thrustPower = data.thrustPower || 300;
        this.rotationSpeed = data.rotationSpeed || 180;
        this.maxSpeed = data.maxSpeed || 400;
        this.friction = data.friction || 0.98;
        this.angularFriction = data.angularFriction || 0.95;
        this.thrustKey = data.thrustKey || "w";
        this.leftKey = data.leftKey || "a";
        this.rightKey = data.rightKey || "d";
        this.fireKey = data.fireKey || "space";
        this.shipColor = data.shipColor || "#00ff00";
        this.thrustColor = data.thrustColor || "#ff4400";
        this.shipSize = data.shipSize || 12;
        this.showThrust = data.showThrust !== undefined ? data.showThrust : true;
        
        if (data.velocity) {
            this.velocity = { x: data.velocity.x || 0, y: data.velocity.y || 0 };
        }
        this.angularVelocity = data.angularVelocity || 0;
    }
}

window.PlayerShip = PlayerShip;
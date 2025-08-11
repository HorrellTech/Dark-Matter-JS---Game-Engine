class AsteroidsBullet extends Module {
    static namespace = "Asteroids";
    static description = "Bullet that moves in a direction with lifetime management";
    static allowMultiple = false;

    constructor() {
        super("AsteroidsBullet");

        // Movement properties
        this.speed = 500;
        this.direction = { x: 0, y: -1 }; // Default upward direction
        this.lifetime = 3.0; // seconds
        this.rotateWithDirection = true;
        this.piercing = false;
        this.damage = 1;

        // Internal state
        this.velocity = { x: 0, y: 0 };
        this.timeAlive = 0;
        this.hasCollided = false;

        // Visual properties
        this.bulletColor = "#ffff00";
        this.bulletSize = 3;
        this.trailLength = 5;
        this.showTrail = false;

        // Expose properties for inspector
        this.exposeProperty("speed", "number", 500, {
            description: "Speed of the bullet in pixels per second",
            onChange: (val) => {
                this.speed = Math.max(0, val);
                this.updateVelocity();
            }
        });

        this.exposeProperty("lifetime", "number", 3.0, {
            description: "How long the bullet lasts in seconds",
            onChange: (val) => {
                this.lifetime = Math.max(0.1, val);
            }
        });

        this.exposeProperty("rotateWithDirection", "boolean", true, {
            description: "Whether bullet rotates to face movement direction",
            onChange: (val) => {
                this.rotateWithDirection = val;
            }
        });

        this.exposeProperty("piercing", "boolean", false, {
            description: "Whether bullet can pass through multiple targets",
            onChange: (val) => {
                this.piercing = val;
            }
        });

        this.exposeProperty("damage", "number", 1, {
            description: "Damage dealt by the bullet",
            onChange: (val) => {
                this.damage = Math.max(0, val);
            }
        });

        this.exposeProperty("bulletColor", "color", "#ffff00", {
            description: "Color of the bullet",
            onChange: (val) => {
                this.bulletColor = val;
            }
        });

        this.exposeProperty("bulletSize", "number", 3, {
            description: "Size of the bullet",
            onChange: (val) => {
                this.bulletSize = Math.max(1, val);
            }
        });

        this.exposeProperty("showTrail", "boolean", false, {
            description: "Show trail behind bullet",
            onChange: (val) => {
                this.showTrail = val;
            }
        });

        this.exposeProperty("trailLength", "number", 5, {
            description: "Length of the trail",
            onChange: (val) => {
                this.trailLength = Math.max(1, val);
            }
        });
    }

    start() {
        this.timeAlive = 0;
        this.hasCollided = false;
        this.updateVelocity();
        
        // Set initial rotation if enabled
        if (this.rotateWithDirection) {
            this.updateRotation();
        }
    }

    loop(deltaTime) {
        // Update lifetime
        this.timeAlive += deltaTime;
        
        // Debug lifetime
        if (this.timeAlive < 1) { // Only log for first second to avoid spam
            console.log(`Bullet lifetime: ${this.timeAlive.toFixed(2)}/${this.lifetime.toFixed(2)}, deltaTime: ${deltaTime.toFixed(4)}`);
        }
        
        // Check if bullet should be destroyed
        if (this.timeAlive >= this.lifetime) {
            console.log(`Bullet destroyed after ${this.timeAlive.toFixed(2)} seconds`);
            this.destroyBullet();
            return;
        }

        // Update position
        this.gameObject.position.x += this.velocity.x * deltaTime;
        this.gameObject.position.y += this.velocity.y * deltaTime;

        // Update rotation if enabled
        if (this.rotateWithDirection) {
            this.updateRotation();
        }

        // Check for screen bounds (optional auto-destroy)
        this.checkScreenBounds();
    }

    updateVelocity() {
        // Normalize direction and apply speed
        const magnitude = Math.sqrt(this.direction.x * this.direction.x + this.direction.y * this.direction.y);
        if (magnitude > 0) {
            this.velocity.x = (this.direction.x / magnitude) * this.speed;
            this.velocity.y = (this.direction.y / magnitude) * this.speed;
        }
    }

    updateRotation() {
        // Calculate angle from velocity direction
        const angle = Math.atan2(this.velocity.y, this.velocity.x) * 180 / Math.PI;
        this.gameObject.angle = angle + 90; // Add 90 degrees to align with typical sprite orientation
    }

    checkScreenBounds() {
        /*if (!window.engine || !window.engine.viewport) return;

        const viewport = window.engine.viewport;
        // Increased margin to accommodate faster bullets with inherited momentum
        const margin = 300; // Increased from 100 to 300
        
        const left = viewport.x - viewport.width / 2 - margin;
        const right = viewport.x + viewport.width / 2 + margin;
        const top = viewport.y - viewport.height / 2 - margin;
        const bottom = viewport.y + viewport.height / 2 + margin;

        // Destroy if far outside screen bounds
        if (this.gameObject.position.x < left || 
            this.gameObject.position.x > right ||
            this.gameObject.position.y < top || 
            this.gameObject.position.y > bottom) {
            //console.log(`Bullet destroyed by screen bounds at position: ${this.gameObject.position.x.toFixed(0)}, ${this.gameObject.position.y.toFixed(0)}`);
            this.destroyBullet();
        }*/
    }

    setDirection(x, y) {
        this.direction.x = x;
        this.direction.y = y;
        this.updateVelocity();
        
        if (this.rotateWithDirection) {
            this.updateRotation();
        }
    }

    setDirectionFromAngle(angleDegrees) {
        const angleRad = (angleDegrees * Math.PI) / 180;
        this.setDirection(
            Math.cos(angleRad - Math.PI / 2),
            Math.sin(angleRad - Math.PI / 2)
        );
    }

    onCollision(other) {
        // Handle collision logic
        if (!this.piercing && !this.hasCollided) {
            this.hasCollided = true;
            this.destroyBullet();
        }
        
        // Emit collision event for damage dealing
        this.onHit(other);
    }

    onHit(target) {
        // Override this method or emit events for damage systems
        console.log(`Bullet hit: ${target.name}, damage: ${this.damage}`);
        
        // You can add custom hit logic here
        if (target.takeDamage) {
            target.takeDamage(this.damage);
        }
    }

    destroyBullet() {
        // Remove from parent or scene
        if (this.gameObject.parent) {
            this.gameObject.parent.removeChild(this.gameObject);
        } else if (window.engine && window.engine.gameObjects) {
            const index = window.engine.gameObjects.indexOf(this.gameObject);
            if (index > -1) {
                window.engine.gameObjects.splice(index, 1);
            }
        }

        // Call any cleanup
        this.onDestroy();
    }

    draw(ctx) {
        ctx.save();

        // Draw trail if enabled
        if (this.showTrail) {
            this.drawTrail(ctx);
        }

        // Draw bullet
        this.drawBullet(ctx);

        ctx.restore();
    }

    drawBullet(ctx) {
        ctx.fillStyle = this.bulletColor;
        ctx.strokeStyle = this.bulletColor;
        ctx.lineWidth = 1;

        // Simple circular bullet
        ctx.beginPath();
        ctx.arc(0, 0, this.bulletSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Add small white center for visibility
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(0, 0, this.bulletSize * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    drawTrail(ctx) {
        ctx.strokeStyle = this.bulletColor;
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = this.bulletSize * 0.5;

        // Draw simple trail line
        const trailX = -this.velocity.x * 0.01 * this.trailLength;
        const trailY = -this.velocity.y * 0.01 * this.trailLength;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(trailX, trailY);
        ctx.stroke();

        ctx.globalAlpha = 1;
    }

    drawGizmos(ctx) {
        if (window.engine && window.engine.debug) {
            // Draw velocity vector
            ctx.strokeStyle = "cyan";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.gameObject.position.x, this.gameObject.position.y);
            ctx.lineTo(
                this.gameObject.position.x + this.velocity.x * 0.1,
                this.gameObject.position.y + this.velocity.y * 0.1
            );
            ctx.stroke();

            // Draw lifetime info
            ctx.fillStyle = "white";
            ctx.font = "10px Arial";
            const timeLeft = this.lifetime - this.timeAlive;
            ctx.fillText(`TTL: ${timeLeft.toFixed(1)}s`, this.gameObject.position.x + 10, this.gameObject.position.y - 10);
        }
    }

    // Public methods
    getRemainingLifetime() {
        return Math.max(0, this.lifetime - this.timeAlive);
    }

    getVelocity() {
        return { x: this.velocity.x, y: this.velocity.y };
    }

    extendLifetime(additionalTime) {
        this.lifetime += additionalTime;
    }

    toJSON() {
        return {
            speed: this.speed,
            direction: this.direction,
            lifetime: this.lifetime,
            rotateWithDirection: this.rotateWithDirection,
            piercing: this.piercing,
            damage: this.damage,
            bulletColor: this.bulletColor,
            bulletSize: this.bulletSize,
            showTrail: this.showTrail,
            trailLength: this.trailLength,
            timeAlive: this.timeAlive,
            velocity: this.velocity
        };
    }

    fromJSON(data) {
        this.speed = data.speed || 500;
        this.direction = data.direction || { x: 0, y: -1 };
        this.lifetime = data.lifetime || 3.0;
        this.rotateWithDirection = data.rotateWithDirection !== undefined ? data.rotateWithDirection : true;
        this.piercing = data.piercing || false;
        this.damage = data.damage || 1;
        this.bulletColor = data.bulletColor || "#ffff00";
        this.bulletSize = data.bulletSize || 3;
        this.showTrail = data.showTrail || false;
        this.trailLength = data.trailLength || 5;
        this.timeAlive = data.timeAlive || 0;
        
        if (data.velocity) {
            this.velocity = { x: data.velocity.x || 0, y: data.velocity.y || 0 };
        }
    }
}

window.AsteroidsBullet = AsteroidsBullet;
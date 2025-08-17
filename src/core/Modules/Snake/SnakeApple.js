class SnakeApple extends Module {
    static namespace = "Snake";
    static description = "Apple collectible for snake game";
    static allowMultiple = false;
    static iconClass = "fas fa-apple-alt";

    constructor() {
        super("SnakeApple");

        // Apple properties
        this.size = 10;
        this.appleColor = "#ff4444";
        this.stemColor = "#228844";
        this.leafColor = "#44aa44";
        this.shadowColor = "#aa2222";
        this.gradientStrength = 0.6;
        
        // Visual effects
        this.bobAmount = 2; // pixels to bob up and down
        this.bobSpeed = 3; // cycles per second
        this.rotateSpeed = 30; // degrees per second
        
        // Internal state
        this.bobOffset = 0;
        this.rotation = 0;
        this.timeAccumulator = 0;

        // Expose properties
        this.exposeProperty("size", "number", 10, {
            description: "Apple radius (pixels)",
            min: 5, max: 30, step: 1,
            onChange: v => this.size = v
        });
        this.exposeProperty("appleColor", "color", "#ff4444", {
            description: "Main apple color",
            onChange: v => this.appleColor = v
        });
        this.exposeProperty("stemColor", "color", "#228844", {
            description: "Stem color",
            onChange: v => this.stemColor = v
        });
        this.exposeProperty("leafColor", "color", "#44aa44", {
            description: "Leaf color",
            onChange: v => this.leafColor = v
        });
        this.exposeProperty("shadowColor", "color", "#aa2222", {
            description: "Shadow/shading color",
            onChange: v => this.shadowColor = v
        });
        this.exposeProperty("gradientStrength", "number", 0.6, {
            description: "Radial gradient strength (0-1)",
            min: 0, max: 1, step: 0.05,
            onChange: v => this.gradientStrength = v
        });
        this.exposeProperty("bobAmount", "number", 2, {
            description: "Floating bob amount (pixels)",
            min: 0, max: 10, step: 0.5,
            onChange: v => this.bobAmount = v
        });
        this.exposeProperty("bobSpeed", "number", 3, {
            description: "Floating bob speed (cycles/sec)",
            min: 0, max: 10, step: 0.5,
            onChange: v => this.bobSpeed = v
        });
        this.exposeProperty("rotateSpeed", "number", 30, {
            description: "Rotation speed (degrees/sec)",
            min: 0, max: 180, step: 5,
            onChange: v => this.rotateSpeed = v
        });
    }

    style(style) {
        style.startGroup("Appearance", false, {
            backgroundColor: 'rgba(255,100,100,0.08)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("size");
        style.exposeProperty("appleColor");
        style.exposeProperty("stemColor");
        style.exposeProperty("leafColor");
        style.exposeProperty("shadowColor");
        style.exposeProperty("gradientStrength");
        style.endGroup();

        style.startGroup("Animation", false, {
            backgroundColor: 'rgba(100,255,100,0.08)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("bobAmount");
        style.exposeProperty("bobSpeed");
        style.exposeProperty("rotateSpeed");
        style.endGroup();

        style.addHelpText("Apple that snake can eat to grow. Respawns at random location when eaten.");
    }

    start() {
        this.moveToRandomPosition();
        this.timeAccumulator = 0;
        this.rotation = 0;
        this.bobOffset = 0;
    }

    loop(deltaTime) {
        // Update animation timers
        this.timeAccumulator += deltaTime;
        this.rotation += this.rotateSpeed * deltaTime;
        this.rotation = this.rotation % 360;
        
        // Calculate floating bob offset
        this.bobOffset = Math.sin(this.timeAccumulator * this.bobSpeed * Math.PI * 2) * this.bobAmount;
    }

    draw(ctx) {
        const x = this.gameObject.position.x;
        const y = this.gameObject.position.y + this.bobOffset;
        
        ctx.save();
        ctx.translate(0, 0);
        ctx.rotate(this.rotation * Math.PI / 180);

        // Draw apple shadow
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = this.shadowColor;
        ctx.beginPath();
        ctx.ellipse(1, 2, this.size * 0.8, this.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Draw main apple body with gradient
        const grad = ctx.createRadialGradient(
            -this.size * 0.3, -this.size * 0.3, this.size * (1 - this.gradientStrength),
            0, 0, this.size
        );
        grad.addColorStop(0, this.appleColor);
        grad.addColorStop(1, this.shadowColor);

        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.shadowColor = this.shadowColor;
        ctx.shadowBlur = this.size * 0.3;
        ctx.fill();

        // Draw apple highlight
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(-this.size * 0.3, -this.size * 0.4, this.size * 0.3, this.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Draw stem
        ctx.strokeStyle = this.stemColor;
        ctx.lineWidth = this.size * 0.15;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(this.size * 0.1, -this.size * 1.3);
        ctx.stroke();

        // Draw leaf
        ctx.fillStyle = this.leafColor;
        ctx.beginPath();
        ctx.ellipse(this.size * 0.3, -this.size * 1.1, this.size * 0.25, this.size * 0.15, Math.PI * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Draw leaf vein
        ctx.strokeStyle = this.stemColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.size * 0.15, -this.size * 1.05);
        ctx.lineTo(this.size * 0.4, -this.size * 1.15);
        ctx.stroke();

        ctx.restore();
    }

    drawGizmos(ctx) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        
        // Draw collision radius
        ctx.strokeStyle = "#ff0000";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }

    moveToRandomPosition() {
        if (window.engine && window.engine.viewport) {
            const margin = this.size * 2;
            this.gameObject.position.x = Math.random() * (window.engine.viewport.width - margin * 2) + window.engine.viewport.x + margin;
            this.gameObject.position.y = Math.random() * (window.engine.viewport.height - margin * 2) + window.engine.viewport.y + margin;
        }
    }

    // Method to be called when apple is "eaten"
    onEaten() {
        this.moveToRandomPosition();
        // Reset animation state for visual feedback
        this.timeAccumulator = 0;
        this.rotation = Math.random() * 360;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            size: this.size,
            appleColor: this.appleColor,
            stemColor: this.stemColor,
            leafColor: this.leafColor,
            shadowColor: this.shadowColor,
            gradientStrength: this.gradientStrength,
            bobAmount: this.bobAmount,
            bobSpeed: this.bobSpeed,
            rotateSpeed: this.rotateSpeed
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        if (!data) return;
        this.size = data.size ?? 10;
        this.appleColor = data.appleColor ?? "#ff4444";
        this.stemColor = data.stemColor ?? "#228844";
        this.leafColor = data.leafColor ?? "#44aa44";
        this.shadowColor = data.shadowColor ?? "#aa2222";
        this.gradientStrength = data.gradientStrength ?? 0.6;
        this.bobAmount = data.bobAmount ?? 2;
        this.bobSpeed = data.bobSpeed ?? 3;
        this.rotateSpeed = data.rotateSpeed ?? 30;
    }
}

window.SnakeApple = SnakeApple;
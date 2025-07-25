/**
 * ParticleSystem - Creates and manages particle effects
 */
class ParticleSystem extends Module {
    static allowMultiple = true;
    static namespace = "Effects";
    static description = "Creates particle effects like fire, smoke, explosions";
    static iconClass = "fas fa-fire";

    constructor() {
        super("ParticleSystem");
        
        // Emission properties
        this.emissionRate = 10; // particles per second
        this.maxParticles = 100;
        this.emissionShape = "point"; // point, circle, rectangle
        this.emissionRadius = 0;
        this.emissionWidth = 50;
        this.emissionHeight = 50;
        
        // Particle properties
        this.particleLifetime = 2.0;
        this.particleLifetimeVariation = 0.5;
        this.startSize = 5;
        this.endSize = 1;
        this.sizeVariation = 2;
        this.startColor = "#ffffff";
        this.endColor = "#ffffff";
        this.startAlpha = 1.0;
        this.endAlpha = 0.0;
        
        // Movement properties
        this.startVelocityX = 0;
        this.startVelocityY = -50;
        this.velocityVariationX = 20;
        this.velocityVariationY = 20;
        this.gravity = 0;
        this.drag = 0.98;
        
        // Visual properties
        this.particleShape = "circle"; // circle, square, line
        this.blendMode = "normal"; // normal, additive, multiply
        
        // Control properties
        this.autoStart = true;
        this.loop = true;
        this.duration = 5.0; // duration for non-looping systems
        
        // Internal state
        this.particles = [];
        this.isEmitting = false;
        this.emissionTimer = 0;
        this.systemTimer = 0;
        
        // Expose properties
        this.exposeProperty("emissionRate", "number", this.emissionRate, {
            min: 0.1,
            max: 100,
            step: 0.1,
            description: "Particles emitted per second"
        });
        
        this.exposeProperty("maxParticles", "number", this.maxParticles, {
            min: 1,
            max: 1000,
            step: 1,
            description: "Maximum number of particles"
        });
        
        this.exposeProperty("emissionShape", "enum", this.emissionShape, {
            options: ["point", "circle", "rectangle"],
            description: "Shape of emission area"
        });
        
        this.exposeProperty("emissionRadius", "number", this.emissionRadius, {
            min: 0,
            max: 200,
            step: 1,
            description: "Radius for circle emission"
        });
        
        this.exposeProperty("particleLifetime", "number", this.particleLifetime, {
            min: 0.1,
            max: 10,
            step: 0.1,
            description: "How long particles live (seconds)"
        });
        
        this.exposeProperty("particleLifetimeVariation", "number", this.particleLifetimeVariation, {
            min: 0,
            max: 5,
            step: 0.1,
            description: "Random variation in lifetime"
        });
        
        this.exposeProperty("startSize", "number", this.startSize, {
            min: 1,
            max: 50,
            step: 1,
            description: "Initial particle size"
        });
        
        this.exposeProperty("endSize", "number", this.endSize, {
            min: 0,
            max: 50,
            step: 1,
            description: "Final particle size"
        });
        
        this.exposeProperty("startColor", "color", this.startColor, {
            description: "Initial particle color"
        });
        
        this.exposeProperty("endColor", "color", this.endColor, {
            description: "Final particle color"
        });
        
        this.exposeProperty("startAlpha", "number", this.startAlpha, {
            min: 0,
            max: 1,
            step: 0.1,
            description: "Initial particle opacity"
        });
        
        this.exposeProperty("endAlpha", "number", this.endAlpha, {
            min: 0,
            max: 1,
            step: 0.1,
            description: "Final particle opacity"
        });
        
        this.exposeProperty("startVelocityY", "number", this.startVelocityY, {
            min: -200,
            max: 200,
            step: 1,
            description: "Initial Y velocity"
        });
        
        this.exposeProperty("velocityVariationX", "number", this.velocityVariationX, {
            min: 0,
            max: 100,
            step: 1,
            description: "Random X velocity variation"
        });
        
        this.exposeProperty("velocityVariationY", "number", this.velocityVariationY, {
            min: 0,
            max: 100,
            step: 1,
            description: "Random Y velocity variation"
        });
        
        this.exposeProperty("gravity", "number", this.gravity, {
            min: -500,
            max: 500,
            step: 1,
            description: "Gravity force applied to particles"
        });
        
        this.exposeProperty("drag", "number", this.drag, {
            min: 0.9,
            max: 1.0,
            step: 0.01,
            description: "Air resistance (1.0 = no drag)"
        });
        
        this.exposeProperty("particleShape", "enum", this.particleShape, {
            options: ["circle", "square", "line"],
            description: "Shape of individual particles"
        });
        
        this.exposeProperty("autoStart", "boolean", this.autoStart, {
            description: "Start emitting automatically"
        });
        
        this.exposeProperty("loop", "boolean", this.loop, {
            description: "Loop the particle system"
        });
    }
    
    start() {
        if (this.autoStart) {
            this.startEmission();
        }
    }
    
    startEmission() {
        this.isEmitting = true;
        this.systemTimer = 0;
    }
    
    stopEmission() {
        this.isEmitting = false;
    }
    
    clearParticles() {
        this.particles = [];
    }
    
    loop(deltaTime) {
        this.systemTimer += deltaTime;
        
        // Handle non-looping systems
        if (!this.loop && this.systemTimer >= this.duration) {
            this.isEmitting = false;
        }
        
        // Emit new particles
        if (this.isEmitting) {
            this.emissionTimer += deltaTime;
            const emissionInterval = 1.0 / this.emissionRate;
            
            while (this.emissionTimer >= emissionInterval && this.particles.length < this.maxParticles) {
                this.emitParticle();
                this.emissionTimer -= emissionInterval;
            }
        }
        
        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            this.updateParticle(particle, deltaTime);
            
            // Remove dead particles
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    emitParticle() {
        const particle = {
            x: 0,
            y: 0,
            vx: this.startVelocityX + (Math.random() - 0.5) * this.velocityVariationX,
            vy: this.startVelocityY + (Math.random() - 0.5) * this.velocityVariationY,
            life: this.particleLifetime + (Math.random() - 0.5) * this.particleLifetimeVariation,
            maxLife: this.particleLifetime + (Math.random() - 0.5) * this.particleLifetimeVariation,
            size: this.startSize + (Math.random() - 0.5) * this.sizeVariation,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 5
        };
        
        // Set emission position based on shape
        switch (this.emissionShape) {
            case "circle":
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * this.emissionRadius;
                particle.x = Math.cos(angle) * radius;
                particle.y = Math.sin(angle) * radius;
                break;
                
            case "rectangle":
                particle.x = (Math.random() - 0.5) * this.emissionWidth;
                particle.y = (Math.random() - 0.5) * this.emissionHeight;
                break;
                
            case "point":
            default:
                particle.x = 0;
                particle.y = 0;
                break;
        }
        
        this.particles.push(particle);
    }
    
    updateParticle(particle, deltaTime) {
        // Update life
        particle.life -= deltaTime;
        
        // Apply gravity
        particle.vy += this.gravity * deltaTime;
        
        // Apply drag
        particle.vx *= this.drag;
        particle.vy *= this.drag;
        
        // Update position
        particle.x += particle.vx * deltaTime;
        particle.y += particle.vy * deltaTime;
        
        // Update rotation
        particle.rotation += particle.rotationSpeed * deltaTime;
    }
    
    draw(ctx) {
        if (!this.enabled || this.particles.length === 0) return;
        
        ctx.save();
        
        // Set blend mode
        if (this.blendMode === "additive") {
            ctx.globalCompositeOperation = "lighter";
        } else if (this.blendMode === "multiply") {
            ctx.globalCompositeOperation = "multiply";
        }
        
        // Draw each particle
        for (const particle of this.particles) {
            this.drawParticle(ctx, particle);
        }
        
        ctx.restore();
    }
    
    drawParticle(ctx, particle) {
        const lifeRatio = particle.life / particle.maxLife;
        const invLifeRatio = 1 - lifeRatio;
        
        // Interpolate size
        const currentSize = this.startSize * lifeRatio + this.endSize * invLifeRatio;
        
        // Interpolate colors
        const startRGB = this.hexToRgb(this.startColor);
        const endRGB = this.hexToRgb(this.endColor);
        const currentR = Math.round(startRGB.r * lifeRatio + endRGB.r * invLifeRatio);
        const currentG = Math.round(startRGB.g * lifeRatio + endRGB.g * invLifeRatio);
        const currentB = Math.round(startRGB.b * lifeRatio + endRGB.b * invLifeRatio);
        
        // Interpolate alpha
        const currentAlpha = this.startAlpha * lifeRatio + this.endAlpha * invLifeRatio;
        
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.globalAlpha = currentAlpha;
        
        const color = `rgb(${currentR}, ${currentG}, ${currentB})`;
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        
        // Draw based on shape
        switch (this.particleShape) {
            case "circle":
                ctx.beginPath();
                ctx.arc(0, 0, currentSize / 2, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case "square":
                ctx.fillRect(-currentSize / 2, -currentSize / 2, currentSize, currentSize);
                break;
                
            case "line":
                ctx.lineWidth = Math.max(1, currentSize / 4);
                ctx.beginPath();
                ctx.moveTo(-currentSize / 2, 0);
                ctx.lineTo(currentSize / 2, 0);
                ctx.stroke();
                break;
        }
        
        ctx.restore();
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    }
    
    toJSON() {
        const json = super.toJSON();
        json.emissionRate = this.emissionRate;
        json.maxParticles = this.maxParticles;
        json.emissionShape = this.emissionShape;
        json.emissionRadius = this.emissionRadius;
        json.particleLifetime = this.particleLifetime;
        json.particleLifetimeVariation = this.particleLifetimeVariation;
        json.startSize = this.startSize;
        json.endSize = this.endSize;
        json.startColor = this.startColor;
        json.endColor = this.endColor;
        json.startAlpha = this.startAlpha;
        json.endAlpha = this.endAlpha;
        json.startVelocityX = this.startVelocityX;
        json.startVelocityY = this.startVelocityY;
        json.velocityVariationX = this.velocityVariationX;
        json.velocityVariationY = this.velocityVariationY;
        json.gravity = this.gravity;
        json.drag = this.drag;
        json.particleShape = this.particleShape;
        json.autoStart = this.autoStart;
        json.loop = this.loop;
        return json;
    }
    
    fromJSON(json) {
        super.fromJSON(json);
        if (json.emissionRate !== undefined) this.emissionRate = json.emissionRate;
        if (json.maxParticles !== undefined) this.maxParticles = json.maxParticles;
        if (json.emissionShape !== undefined) this.emissionShape = json.emissionShape;
        if (json.emissionRadius !== undefined) this.emissionRadius = json.emissionRadius;
        if (json.particleLifetime !== undefined) this.particleLifetime = json.particleLifetime;
        if (json.particleLifetimeVariation !== undefined) this.particleLifetimeVariation = json.particleLifetimeVariation;
        if (json.startSize !== undefined) this.startSize = json.startSize;
        if (json.endSize !== undefined) this.endSize = json.endSize;
        if (json.startColor !== undefined) this.startColor = json.startColor;
        if (json.endColor !== undefined) this.endColor = json.endColor;
        if (json.startAlpha !== undefined) this.startAlpha = json.startAlpha;
        if (json.endAlpha !== undefined) this.endAlpha = json.endAlpha;
        if (json.startVelocityX !== undefined) this.startVelocityX = json.startVelocityX;
        if (json.startVelocityY !== undefined) this.startVelocityY = json.startVelocityY;
        if (json.velocityVariationX !== undefined) this.velocityVariationX = json.velocityVariationX;
        if (json.velocityVariationY !== undefined) this.velocityVariationY = json.velocityVariationY;
        if (json.gravity !== undefined) this.gravity = json.gravity;
        if (json.drag !== undefined) this.drag = json.drag;
        if (json.particleShape !== undefined) this.particleShape = json.particleShape;
        if (json.autoStart !== undefined) this.autoStart = json.autoStart;
        if (json.loop !== undefined) this.loop = json.loop;
    }
}

window.ParticleSystem = ParticleSystem;
/**
 * Tween - Animates properties over time with easing functions
 */
class Tween extends Module {
    static allowMultiple = true;
    static namespace = "Animation";
    static description = "Animates object properties over time with easing";
    static iconClass = "fas fa-play-circle";

    constructor() {
        super("Tween");
        
        // Animation properties
        this.targetProperty = "position.x";
        this.startValue = 0;
        this.endValue = 100;
        this.duration = 1.0; // seconds
        this.delay = 0.0; // seconds
        this.easing = "linear";
        this.loop = false;
        this.pingPong = false;
        this.autoStart = true;
        
        // Internal state
        this.isPlaying = false;
        this.currentTime = 0;
        this.delayTime = 0;
        this.direction = 1; // 1 for forward, -1 for reverse
        this.originalValue = null;
        
        // Expose properties
        this.exposeProperty("targetProperty", "string", this.targetProperty, {
            description: "Property to animate (e.g., 'position.x', 'scale.y', 'rotation')"
        });
        
        this.exposeProperty("startValue", "number", this.startValue, {
            description: "Starting value of the animation"
        });
        
        this.exposeProperty("endValue", "number", this.endValue, {
            description: "Ending value of the animation"
        });
        
        this.exposeProperty("duration", "number", this.duration, {
            min: 0.1,
            max: 10,
            step: 0.1,
            description: "Duration of the animation in seconds"
        });
        
        this.exposeProperty("delay", "number", this.delay, {
            min: 0,
            max: 5,
            step: 0.1,
            description: "Delay before starting animation in seconds"
        });
        
        this.exposeProperty("easing", "enum", this.easing, {
            options: ["linear", "easeInQuad", "easeOutQuad", "easeInOutQuad", 
                     "easeInCubic", "easeOutCubic", "easeInOutCubic",
                     "easeInSine", "easeOutSine", "easeInOutSine"],
            description: "Easing function for the animation"
        });
        
        this.exposeProperty("loop", "boolean", this.loop, {
            description: "Loop the animation indefinitely"
        });
        
        this.exposeProperty("pingPong", "boolean", this.pingPong, {
            description: "Reverse direction each loop cycle"
        });
        
        this.exposeProperty("autoStart", "boolean", this.autoStart, {
            description: "Start animation automatically when enabled"
        });
    }
    
    start() {
        if (this.autoStart) {
            this.play();
        }
    }
    
    /**
     * Start the animation
     */
    play() {
        this.isPlaying = true;
        this.currentTime = 0;
        this.delayTime = 0;
        this.direction = 1;
        
        // Store original value if not set
        if (this.originalValue === null) {
            this.originalValue = this.getPropertyValue();
        }
    }
    
    /**
     * Stop the animation
     */
    stop() {
        this.isPlaying = false;
        this.currentTime = 0;
        this.delayTime = 0;
    }
    
    /**
     * Pause the animation
     */
    pause() {
        this.isPlaying = false;
    }
    
    /**
     * Resume the animation
     */
    resume() {
        this.isPlaying = true;
    }
    
    /**
     * Reset to start position
     */
    reset() {
        this.stop();
        if (this.originalValue !== null) {
            this.setPropertyValue(this.originalValue);
        }
    }
    
    loop(deltaTime) {
        if (!this.isPlaying) return;
        
        // Handle delay
        if (this.delayTime < this.delay) {
            this.delayTime += deltaTime;
            return;
        }
        
        // Update animation time
        this.currentTime += deltaTime * this.direction;
        
        // Calculate progress (0 to 1)
        let progress = Math.max(0, Math.min(1, this.currentTime / this.duration));
        
        // Apply easing
        const easedProgress = this.applyEasing(progress);
        
        // Calculate current value
        const currentValue = this.startValue + (this.endValue - this.startValue) * easedProgress;
        
        // Set the property value
        this.setPropertyValue(currentValue);
        
        // Check if animation is complete
        if (this.currentTime >= this.duration) {
            if (this.loop) {
                if (this.pingPong) {
                    // Reverse direction
                    this.direction *= -1;
                    this.currentTime = this.duration;
                } else {
                    // Restart from beginning
                    this.currentTime = 0;
                }
            } else {
                // Animation complete
                this.isPlaying = false;
                this.setPropertyValue(this.endValue);
            }
        } else if (this.currentTime <= 0 && this.direction === -1) {
            if (this.pingPong) {
                // Reverse direction back to forward
                this.direction = 1;
                this.currentTime = 0;
            }
        }
    }
    
    /**
     * Apply easing function to progress
     */
    applyEasing(t) {
        switch (this.easing) {
            case "easeInQuad":
                return t * t;
            case "easeOutQuad":
                return t * (2 - t);
            case "easeInOutQuad":
                return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            case "easeInCubic":
                return t * t * t;
            case "easeOutCubic":
                return (--t) * t * t + 1;
            case "easeInOutCubic":
                return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
            case "easeInSine":
                return 1 - Math.cos(t * Math.PI / 2);
            case "easeOutSine":
                return Math.sin(t * Math.PI / 2);
            case "easeInOutSine":
                return -(Math.cos(Math.PI * t) - 1) / 2;
            case "linear":
            default:
                return t;
        }
    }
    
    /**
     * Get the current value of the target property
     */
    getPropertyValue() {
        const parts = this.targetProperty.split('.');
        let obj = this.gameObject;
        
        for (let i = 0; i < parts.length - 1; i++) {
            if (obj[parts[i]]) {
                obj = obj[parts[i]];
            } else {
                return 0;
            }
        }
        
        const finalProp = parts[parts.length - 1];
        return obj[finalProp] || 0;
    }
    
    /**
     * Set the value of the target property
     */
    setPropertyValue(value) {
        const parts = this.targetProperty.split('.');
        let obj = this.gameObject;
        
        for (let i = 0; i < parts.length - 1; i++) {
            if (obj[parts[i]]) {
                obj = obj[parts[i]];
            } else {
                return;
            }
        }
        
        const finalProp = parts[parts.length - 1];
        obj[finalProp] = value;
    }
    
    toJSON() {
        const json = super.toJSON();
        json.targetProperty = this.targetProperty;
        json.startValue = this.startValue;
        json.endValue = this.endValue;
        json.duration = this.duration;
        json.delay = this.delay;
        json.easing = this.easing;
        json.loop = this.loop;
        json.pingPong = this.pingPong;
        json.autoStart = this.autoStart;
        return json;
    }
    
    fromJSON(json) {
        super.fromJSON(json);
        if (json.targetProperty !== undefined) this.targetProperty = json.targetProperty;
        if (json.startValue !== undefined) this.startValue = json.startValue;
        if (json.endValue !== undefined) this.endValue = json.endValue;
        if (json.duration !== undefined) this.duration = json.duration;
        if (json.delay !== undefined) this.delay = json.delay;
        if (json.easing !== undefined) this.easing = json.easing;
        if (json.loop !== undefined) this.loop = json.loop;
        if (json.pingPong !== undefined) this.pingPong = json.pingPong;
        if (json.autoStart !== undefined) this.autoStart = json.autoStart;
    }
}

window.Tween = Tween;
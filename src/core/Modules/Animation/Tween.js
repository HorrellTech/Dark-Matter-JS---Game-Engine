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
        this.loopPlay = false;
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
            description: "Property to animate (e.g., 'position.x', 'scale.y', 'rotation')",
            onChange: (val) => this.targetProperty = val
        });

        this.exposeProperty("endValue", "number", this.endValue, {
            description: "Ending value of the animation",
            onChange: (val) => this.endValue = val
        });

        this.exposeProperty("duration", "number", this.duration, {
            min: 0.1,
            max: 10,
            step: 0.1,
            description: "Duration of the animation in seconds",
            onChange: (val) => this.duration = val,
            style: {
                slider: true,           // Show as slider
                range: [0.1, 10],       // Slider min/max
                help: "How long the tween lasts (seconds)", // Help text below field
                group: "Timing",        // Group in inspector
                header: "Tween Timing", // Header above group
                color: "#0078D7"        // Custom label color
            }
        });

        this.exposeProperty("delay", "number", this.delay, {
            min: 0,
            max: 5,
            step: 0.1,
            description: "Delay before starting animation in seconds",
            onChange: (val) => this.delay = val
        });

        this.exposeProperty("easing", "enum", this.easing, {
            options: ["linear", "easeInQuad", "easeOutQuad", "easeInOutQuad",
                "easeInCubic", "easeOutCubic", "easeInOutCubic",
                "easeInSine", "easeOutSine", "easeInOutSine"],
            description: "Easing function for the animation",
            onChange: (val) => this.easing = val
        });

        this.exposeProperty("loopPlay", "boolean", this.loopPlay, {
            description: "Loop the animation indefinitely",
            onChange: (val) => this.loopPlay = val
        });

        this.exposeProperty("pingPong", "boolean", this.pingPong, {
            description: "Reverse direction each loop cycle",
            onChange: (val) => this.pingPong = val
        });

        this.exposeProperty("autoStart", "boolean", this.autoStart, {
            description: "Start animation automatically when enabled",
            onChange: (val) => this.autoStart = val
        });
    }

    style(styleHelper) {
        styleHelper
            .addHeader("Tween Animation", "tween-header")
            .startGroup("Target", false, { color: "#0078D7" })
            .exposeProperty("targetProperty", "string", this.targetProperty, { label: "Target Property" })
            .addHelpText("E.g. 'position.x', 'scale.y', 'rotation'")
            .endGroup()
            .startGroup("Values", false)
            .exposeProperty("endValue", "number", this.endValue, { label: "End Value" })
            .endGroup()
            .startGroup("Timing", false)
            .addSlider("duration", this.duration, 0.1, 10, 0.1, v => this.duration = v, { label: "Duration" })
            .addSlider("delay", this.delay, 0, 5, 0.1, v => this.delay = v, { label: "Delay" })
            .endGroup()
            .startGroup("Options", false)
            .addDropdown(
                "easing",
                this.easing,
                [
                    "linear", "easeInQuad", "easeOutQuad", "easeInOutQuad",
                    "easeInCubic", "easeOutCubic", "easeInOutCubic",
                    "easeInSine", "easeOutSine", "easeInOutSine"
                ],
                v => this.easing = v,
                { label: "Easing" }
            )
            .exposeProperty("loopPlay", "boolean", this.loopPlay)
            .exposeProperty("pingPong", "boolean", this.pingPong)
            .exposeProperty("autoStart", "boolean", this.autoStart)
            .endGroup();
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

        // Clamp duration and delay to minimums
        if (this.duration < 0.01) this.duration = 0.01;
        if (this.delay < 0) this.delay = 0;

        const currentPropertyValue = this.getPropertyValue();

        if (this.originalValue === null) {
            this.originalValue = currentPropertyValue;
        }

        this.startValue = currentPropertyValue;
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
            if (this.loopPlay) {
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
            if (obj && obj[parts[i]] !== undefined) {
                obj = obj[parts[i]];
            } else {
                console.warn(`Tween: Property path "${this.targetProperty}" not found on gameObject`);
                return 0;
            }
        }
        const finalProp = parts[parts.length - 1];
        if (obj && obj[finalProp] !== undefined) {
            return obj[finalProp];
        } else {
            console.warn(`Tween: Final property "${finalProp}" not found on gameObject`);
            return 0;
        }
    }

    /**
     * Set the value of the target property
     */
    setPropertyValue(value) {
        const parts = this.targetProperty.split('.');
        let obj = this.gameObject;
        for (let i = 0; i < parts.length - 1; i++) {
            if (obj && obj[parts[i]] !== undefined) {
                obj = obj[parts[i]];
            } else {
                console.warn(`Tween: Property path "${this.targetProperty}" not found on gameObject`);
                return;
            }
        }
        const finalProp = parts[parts.length - 1];
        if (obj && obj[finalProp] !== undefined) {
            obj[finalProp] = value;
        } else {
            console.warn(`Tween: Final property "${finalProp}" not found on gameObject`);
        }
    }

    toJSON() {
        const json = super.toJSON();
        json.targetProperty = this.targetProperty;
        json.startValue = this.startValue;
        json.endValue = this.endValue;
        json.duration = this.duration;
        json.delay = this.delay;
        json.easing = this.easing;
        json.loopPlay = this.loopPlay;
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
        if (json.loopPlay !== undefined) this.loopPlay = json.loopPlay;
        if (json.pingPong !== undefined) this.pingPong = json.pingPong;
        if (json.autoStart !== undefined) this.autoStart = json.autoStart;
    }
}

window.Tween = Tween;
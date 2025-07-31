/**
 * Timer - Executes actions after specified time intervals
 */
class Timer extends Module {
    static allowMultiple = true;
    static namespace = "Animation";
    static description = "Executes actions after time intervals";
    static iconClass = "fas fa-clock";

    constructor() {
        super("Timer");
        
        // Timer properties
        this.duration = 1.0; // seconds
        this.repeat = false;
        this.repeatCount = -1; // -1 for infinite
        this.autoStart = true;
        this.actionType = "log"; // log, destroy, disable, enable, custom
        this.customMessage = "Timer finished!";
        
        // Internal state
        this.isRunning = false;
        this.currentTime = 0;
        this.completedCycles = 0;
        
        // Expose properties
        this.exposeProperty("duration", "number", this.duration, {
            min: 0.1,
            max: 60,
            step: 0.1,
            description: "Timer duration in seconds",
            onChange: (val) => this.duration = val
        });
        
        this.exposeProperty("repeat", "boolean", this.repeat, {
            description: "Repeat the timer",
            onChange: (val) => this.repeat = val
        });
        
        this.exposeProperty("repeatCount", "number", this.repeatCount, {
            min: -1,
            max: 100,
            step: 1,
            description: "Number of repeats (-1 for infinite)",
            onChange: (val) => this.repeatCount = val
        });
        
        this.exposeProperty("autoStart", "boolean", this.autoStart, {
            description: "Start timer automatically when enabled",
            onChange: (val) => this.autoStart = val
        });
        
        this.exposeProperty("actionType", "enum", this.actionType, {
            options: ["log", "destroy", "disable", "enable", "custom"],
            description: "Action to perform when timer completes",
            onChange: (val) => this.actionType = val
        });
        
        this.exposeProperty("customMessage", "string", this.customMessage, {
            description: "Message to log when timer completes",
            onChange: (val) => this.customMessage = val
        });
    }
    
    start() {
        if (this.autoStart) {
            this.startTimer();
        }
    }
    
    /**
     * Start the timer
     */
    startTimer() {
        this.isRunning = true;
        this.currentTime = 0;
        this.completedCycles = 0;
    }
    
    /**
     * Stop the timer
     */
    stopTimer() {
        this.isRunning = false;
        this.currentTime = 0;
    }
    
    /**
     * Pause the timer
     */
    pauseTimer() {
        this.isRunning = false;
    }
    
    /**
     * Resume the timer
     */
    resumeTimer() {
        this.isRunning = true;
    }
    
    /**
     * Reset the timer
     */
    resetTimer() {
        this.currentTime = 0;
        this.completedCycles = 0;
    }
    
    loop(deltaTime) {
        if (!this.isRunning) return;
        
        this.currentTime += deltaTime;
        
        if (this.currentTime >= this.duration) {
            // Timer completed
            this.executeAction();
            this.completedCycles++;
            
            if (this.repeat && (this.repeatCount === -1 || this.completedCycles < this.repeatCount)) {
                // Reset for next cycle
                this.currentTime = 0;
            } else {
                // Timer finished
                this.isRunning = false;
            }
        }
    }
    
    /**
     * Execute the configured action
     */
    executeAction() {
        switch (this.actionType) {
            case "log":
                console.log(this.customMessage);
                break;
                
            case "destroy":
                if (this.gameObject && this.gameObject.destroy) {
                    this.gameObject.destroy();
                }
                break;
                
            case "disable":
                if (this.gameObject) {
                    this.gameObject.active = false;
                }
                break;
                
            case "enable":
                if (this.gameObject) {
                    this.gameObject.active = true;
                }
                break;
                
            case "custom":
                // Emit a custom event that other modules can listen to
                if (this.gameObject && this.gameObject.emit) {
                    this.gameObject.emit('timerComplete', {
                        timer: this,
                        message: this.customMessage,
                        cycle: this.completedCycles
                    });
                }
                console.log(`Timer: ${this.customMessage}`);
                break;
        }
    }
    
    /**
     * Get remaining time
     */
    getRemainingTime() {
        return Math.max(0, this.duration - this.currentTime);
    }
    
    /**
     * Get progress (0 to 1)
     */
    getProgress() {
        return Math.min(1, this.currentTime / this.duration);
    }
    
    toJSON() {
        const json = super.toJSON();
        json.duration = this.duration;
        json.repeat = this.repeat;
        json.repeatCount = this.repeatCount;
        json.autoStart = this.autoStart;
        json.actionType = this.actionType;
        json.customMessage = this.customMessage;
        return json;
    }
    
    fromJSON(json) {
        super.fromJSON(json);
        if (json.duration !== undefined) this.duration = json.duration;
        if (json.repeat !== undefined) this.repeat = json.repeat;
        if (json.repeatCount !== undefined) this.repeatCount = json.repeatCount;
        if (json.autoStart !== undefined) this.autoStart = json.autoStart;
        if (json.actionType !== undefined) this.actionType = json.actionType;
        if (json.customMessage !== undefined) this.customMessage = json.customMessage;
    }
}

window.Timer = Timer;
/**
 * SimpleHealth - Basic health and damage system
 */
class SimpleHealth extends Module {
    namespace = "Attributes//SimpleHealth";
    description = "Basic health and damage system for GameObjects";

    constructor() {
        super("SimpleHealth");
        
        /** @type {number} Maximum health */
        this.maxHealth = 100;
        
        /** @type {number} Current health */
        this.currentHealth = 100;
        
        /** @type {boolean} Whether object is invulnerable */
        this.invulnerable = false;
        
        /** @type {number} Invulnerability time after taking damage */
        this.invulnerabilityTime = 1.0;
        
        /** @type {number} Current invulnerability timer */
        this.invulnerabilityTimer = 0;
        
        /** @type {boolean} Whether health is displayed in game */
        this.showHealthBar = true;
        
        /** @type {string} Color of health bar */
        this.healthBarColor = "#ff0000";
        
        /** @type {number} Health bar width */
        this.healthBarWidth = 50;
        
        /** @type {number} Health bar height */
        this.healthBarHeight = 5;
        
        /** @type {number} Health bar offset Y */
        this.healthBarOffsetY = -20;
        
        /** @type {boolean} Whether object is dead */
        this.isDead = false;
        
        // Expose properties
        this.exposeProperty("maxHealth", "number", 100, {
            min: 1,
            max: 10000,
            step: 1,
            onChange: (value) => {
                // Adjust current health if max health is reduced
                this.currentHealth = Math.min(this.currentHealth, value);
            }
        });
        
        this.exposeProperty("currentHealth", "number", 100, {
            min: 0,
            max: 10000,
            step: 1,
            onChange: (value) => {
                // Clamp to max health
                this.currentHealth = Math.min(value, this.maxHealth);
            }
        });
        
        this.exposeProperty("invulnerabilityTime", "number", 1.0, {
            min: 0,
            max: 10,
            step: 0.1
        });
        
        this.exposeProperty("showHealthBar", "boolean", true);
        
        this.exposeProperty("healthBarColor", "color", "#ff0000");
        
        this.exposeProperty("healthBarWidth", "number", 50, {
            min: 10,
            max: 200,
            step: 5
        });
        
        this.exposeProperty("healthBarHeight", "number", 5, {
            min: 1,
            max: 20,
            step: 1
        });
        
        this.exposeProperty("healthBarOffsetY", "number", -20, {
            min: -100,
            max: 100,
            step: 1
        });
    }
    
    /**
     * Initialize when module starts
     */
    start() {
        this.currentHealth = this.maxHealth;
    }
    
    /**
     * Update invulnerability timer
     * @param {number} deltaTime - Time since last frame in seconds
     */
    loop(deltaTime) {
        // Update invulnerability timer
        if (this.invulnerabilityTimer > 0) {
            this.invulnerabilityTimer -= deltaTime;
            if (this.invulnerabilityTimer <= 0) {
                this.invulnerable = false;
            }
        }
    }
    
    /**
     * Apply damage to this object
     * @param {number} amount - Amount of damage
     * @param {GameObject} source - Source of the damage (optional)
     * @returns {boolean} Whether damage was applied
     */
    applyDamage(amount, source = null) {
        // Check if already dead or invulnerable
        if (this.isDead || this.invulnerable) {
            return false;
        }
        
        // Apply damage
        this.currentHealth -= amount;
        
        // Clamp health to 0
        this.currentHealth = Math.max(0, this.currentHealth);
        
        // Start invulnerability period
        this.invulnerable = true;
        this.invulnerabilityTimer = this.invulnerabilityTime;
        
        // Check for death
        if (this.currentHealth <= 0) {
            this.isDead = true;
            this.die(source);
        } else {
            // Fire damage event
            if (this.gameObject && this.gameObject.onDamage) {
                this.gameObject.onDamage(amount, source);
            }
        }
        
        return true;
    }
    
    /**
     * Heal this object
     * @param {number} amount - Amount to heal
     * @returns {number} Actual amount healed
     */
    heal(amount) {
        // Check if already at max health
        if (this.currentHealth >= this.maxHealth) {
            return 0;
        }
        
        const oldHealth = this.currentHealth;
        
        // Apply healing
        this.currentHealth += amount;
        
        // Clamp to max health
        this.currentHealth = Math.min(this.currentHealth, this.maxHealth);
        
        // Calculate actual healing done
        const healedAmount = this.currentHealth - oldHealth;
        
        // Fire heal event
        if (healedAmount > 0 && this.gameObject && this.gameObject.onHeal) {
            this.gameObject.onHeal(healedAmount);
        }
        
        return healedAmount;
    }
    
    /**
     * Kill this object immediately
     * @param {GameObject} source - Source of the death (optional)
     */
    die(source = null) {
        if (this.isDead) return; // Already dead
        
        this.isDead = true;
        this.currentHealth = 0;
        
        // Fire death event
        if (this.gameObject && this.gameObject.onDeath) {
            this.gameObject.onDeath(source);
        }
        
        // Optionally deactivate the GameObject
        // this.gameObject.setActive(false);
    }
    
    /**
     * Reset health to maximum
     */
    resetHealth() {
        this.currentHealth = this.maxHealth;
        this.isDead = false;
        this.invulnerable = false;
        this.invulnerabilityTimer = 0;
    }
    
    /**
     * Draw the health bar
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    draw(ctx) {
        if (!this.showHealthBar || this.isDead) return;
        
        // Calculate health percentage
        const healthPercent = this.currentHealth / this.maxHealth;
        
        // Draw background
        const barX = -this.healthBarWidth / 2;
        const barY = this.healthBarOffsetY;
        
        // Background (dark version of health color)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, this.healthBarWidth, this.healthBarHeight);
        
        // Health fill
        ctx.fillStyle = this.healthBarColor;
        ctx.fillRect(barX, barY, this.healthBarWidth * healthPercent, this.healthBarHeight);
        
        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, this.healthBarWidth, this.healthBarHeight);
        
        // Flash effect when invulnerable
        if (this.invulnerable && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(barX, barY, this.healthBarWidth, this.healthBarHeight);
        }
    }
}

// Register the module
window.SimpleHealth = SimpleHealth;
class CreatureAI extends Module {
    static namespace = "AI";
    static description = "State-based creature AI (hungry, aggressive, family/leader, items, attacks)";
    static allowMultiple = false;
    static iconClass = "fas fa-brain";

    constructor() {
        super("CreatureAI");

        // Stats
        this.maxHealth = 100;
        this.health = 100;
        this.attackDamage = 8;
        this.attackResistance = 0.0;

        // Perception & combat
        this.perceptionRange = 220;
        this.attackRange = 36;
        this.attackCooldown = 1.0;
        this._attackTimer = 0;

        // Hunger / diet
        this.hunger = 0;
        this.hungerRate = 0.5;
        this.hungerThreshold = 30;
        this.diet = "omnivore";

        // Personality
        this.aggression = 0.5;
        this.fear = 0.2;
        this.defendOnly = false;

        // Social
        this.familyGroup = "";
        this.leaderName = "";
        this.followLeader = false;
        this.nestPosition = null;
        this.wanderRadius = 150;

        // Blood particle effect
        this.bloodParticleObjectName = "BloodParticle";

        // Memory
        this.memory = [];

        // Inventory - now tracks which hand holds what
        this.inventory = [];
        this._heldItems = new Map();

        // State machine
        this.state = "idle";
        this.stateTimer = 0;
        this.target = null;
        this._wanderTarget = null;
        this._creatureModule = null;
        this._lastPickupAttempt = 0;
        this._justAte = false;
        this._ateTimer = 0;

        // Advanced eating/storage behavior
        this.eatDuration = 1.5;
        this._eatTimer = 0;
        this._eatingItem = null;
        this._eatingHand = null;

        // Item interest system
        this.collectFoodForNest = true;
        this.nestFoodStorage = [];
        this.maxInventorySize = 4;
        this.itemInterestThreshold = 0.5;

        // Combat experience and stat growth
        this.combatExperience = 0;
        this.battlesWon = 0;
        this.statGrowthRate = 0.02; // 2% stat increase per win
        this.maxChaseTime = 8.0; // Seconds before losing interest
        this._chaseTimer = 0;

        // Knockback settings
        this.knockbackForce = 150;
        this.knockbackEnabled = true;
        this._knockbackVelocity = { x: 0, y: 0 };
        this._isBeingKnockedBack = false;

        // Flee behavior settings
        this._fleeRethinkInterval = 2.0; // Rethink every 2 seconds
        this._fleeRethinkTimer = 0;
        this._fleeChangeDirectionChance = 0.3; // 30% chance to change direction

        // Hand usage preferences
        this.preferredPickupHand = 0;

        // Movement control
        this.overrideCreatureMovement = false;

        // Player control mode
        this.playerControlled = false;
        this._playerMoveTarget = null;

        // Debug modal
        this._debugModal = null;

        // Exposed properties with onChange handlers
        this.exposeProperty("health", "number", this.health, {
            onChange: (val) => { this.health = val; }
        });
        this.exposeProperty("maxHealth", "number", this.maxHealth, {
            onChange: (val) => { this.maxHealth = val; }
        });
        this.exposeProperty("attackDamage", "number", this.attackDamage, {
            onChange: (val) => { this.attackDamage = val; }
        });
        this.exposeProperty("attackResistance", "number", this.attackResistance, {
            onChange: (val) => { this.attackResistance = val; }
        });
        this.exposeProperty("perceptionRange", "number", this.perceptionRange, {
            onChange: (val) => { this.perceptionRange = val; }
        });
        this.exposeProperty("attackRange", "number", this.attackRange, {
            onChange: (val) => { this.attackRange = val; }
        });
        this.exposeProperty("attackCooldown", "number", this.attackCooldown, {
            onChange: (val) => { this.attackCooldown = val; }
        });
        this.exposeProperty("hungerRate", "number", this.hungerRate, {
            onChange: (val) => { this.hungerRate = val; }
        });
        this.exposeProperty("hungerThreshold", "number", this.hungerThreshold, {
            onChange: (val) => { this.hungerThreshold = val; }
        });
        this.exposeProperty("diet", "enum", this.diet, {
            options: ["herbivore", "omnivore", "carnivore"],
            onChange: (val) => { this.diet = val; }
        });

        this.exposeProperty("knockbackForce", "number", this.knockbackForce, {
            onChange: (val) => { this.knockbackForce = val; }
        });
        this.exposeProperty("knockbackEnabled", "boolean", this.knockbackEnabled, {
            onChange: (val) => { this.knockbackEnabled = val; }
        });
        this.exposeProperty("maxChaseTime", "number", this.maxChaseTime, {
            onChange: (val) => { this.maxChaseTime = val; }
        });
        this.exposeProperty("statGrowthRate", "number", this.statGrowthRate, {
            onChange: (val) => { this.statGrowthRate = val; }
        });

        // Personality properties
        this.exposeProperty("aggression", "number", this.aggression, {
            onChange: (val) => { this.aggression = val; }
        });
        this.exposeProperty("fear", "number", this.fear, {
            onChange: (val) => { this.fear = val; }
        });
        this.exposeProperty("defendOnly", "boolean", this.defendOnly, {
            onChange: (val) => { this.defendOnly = val; }
        });

        // Social properties
        this.exposeProperty("familyGroup", "string", this.familyGroup, {
            onChange: (val) => { this.familyGroup = val; }
        });
        this.exposeProperty("leaderName", "string", this.leaderName, {
            onChange: (val) => { this.leaderName = val; }
        });
        this.exposeProperty("followLeader", "boolean", this.followLeader, {
            onChange: (val) => { this.followLeader = val; }
        });
        this.exposeProperty("wanderRadius", "number", this.wanderRadius, {
            onChange: (val) => {
                this.wanderRadius = val;
                if (this._creatureModule) {
                    this._creatureModule.wanderRadius = val;
                }
            }
        });

        this.exposeProperty("bloodParticleObjectName", "string", this.bloodParticleObjectName, {
            onChange: (val) => { this.bloodParticleObjectName = val; }
        });

        // Item/eating properties
        this.exposeProperty("collectFoodForNest", "boolean", this.collectFoodForNest, {
            onChange: (val) => { this.collectFoodForNest = val; }
        });
        this.exposeProperty("eatDuration", "number", this.eatDuration, {
            onChange: (val) => { this.eatDuration = val; }
        });
        this.exposeProperty("maxInventorySize", "number", this.maxInventorySize, {
            onChange: (val) => { this.maxInventorySize = val; }
        });
        this.exposeProperty("itemInterestThreshold", "number", this.itemInterestThreshold, {
            onChange: (val) => { this.itemInterestThreshold = val; }
        });
        this.exposeProperty("overrideCreatureMovement", "boolean", this.overrideCreatureMovement, {
            onChange: (val) => { this.overrideCreatureMovement = val; }
        });
        this.exposeProperty("playerControlled", "boolean", this.playerControlled, {
            onChange: (val) => { this.playerControlled = val; }
        });
    }

    start() {
        this._creatureModule = this.gameObject.getModule ? this.gameObject.getModule("ProceduralCreature") : null;

        if (this.gameObject) {
            this.gameObject.tag = this.gameObject.tag || "creature";
        }

        if (this._creatureModule) {
            this._creatureModule.wanderRadius = this.wanderRadius;
        }

        // Setup debug modal
        this._setupDebugModal();
    }

    loop(deltaTime) {
        // Check for death first, before any other processing
        if (this.health <= 0) {
            if (this.state !== "dead") {
                this._die();
            }
            return;
        }

        if (this.state === "dead") return;

        this._attackTimer = Math.max(0, this._attackTimer - deltaTime);
        this.hunger += this.hungerRate * deltaTime;

        // Update "just ate" cooldown
        if (this._justAte) {
            this._ateTimer += deltaTime;
            if (this._ateTimer > 3.0) {
                this._justAte = false;
                this._ateTimer = 0;
            }
        }

        // Update debug modal if open
        if (this._debugModal && this._debugModal.style.display !== 'none') {
            this._updateDebugModal();
        }

        // Check for click on creature (using InputManager)
        this._checkForClick();

        // Player control mode - handle mouse clicks for movement
        if (this.playerControlled) {
            this._handlePlayerControl();
        }

        // Update held item positions
        this._updateHeldItems();

        // Handle proximity-based collision with other creatures
        this._handleCreatureCollisions(deltaTime);

        if (this.health <= 0) {
            this._die();
            return;
        }

        // Handle eating animation
        if (this.state === "eat") {
            this._updateEating(deltaTime);
            return;
        }

        // Handle eating from corpse
        if (this.state === "eatCorpse") {
            this._updateEatingCorpse(deltaTime);
            return;
        }

        // Handle fleeing - may drop items
        if (this.state === "flee") {
            this._fleeBehavior(deltaTime);
            return;
        }

        // Handle returning to nest with food
        if (this.state === "returnToNest" && this.nestPosition) {
            this._returnToNestBehavior(deltaTime);
            return;
        }

        // Handle dropping off food at nest
        if (this.state === "dropAtNest" && this.nestPosition) {
            this._dropAtNestBehavior(deltaTime);
            return;
        }

        // Follow leader behavior
        if (this.followLeader && this.leaderName) {
            const leader = this.getGameObjectByName(this.leaderName);
            if (leader) {
                this._followLeaderBehavior(leader, deltaTime);
                return;
            }
        }

        // Combat behavior
        if (this.target && this._isEnemy(this.target)) {
            this._combatBehavior(deltaTime);
            return;
        }

        // High hunger: seek food (only if not just ate)
        if (this.hunger >= this.hungerThreshold && !this._justAte) {
            if (this.state !== "seekFood") {
                const food = this._findClosestFood();
                if (food) {
                    this.target = food;
                    this._setState("seekFood");
                }
            }
        }

        // Currently seeking food
        if (this.state === "seekFood" && this.target) {
            this._seekBehavior(this.target, deltaTime);
            return;
        }

        // Currently picking up item
        if (this.state === "pickup" && this.target) {
            this._approachAndPickup(this.target, deltaTime);
            return;
        }

        // Apply knockback velocity
        if (this._isBeingKnockedBack) {
            this.gameObject.position.x += this._knockbackVelocity.x * deltaTime;
            this.gameObject.position.y += this._knockbackVelocity.y * deltaTime;

            // Apply friction to knockback
            const friction = 5.0;
            this._knockbackVelocity.x *= Math.max(0, 1 - friction * deltaTime);
            this._knockbackVelocity.y *= Math.max(0, 1 - friction * deltaTime);

            // Stop knockback when velocity is very low
            if (Math.abs(this._knockbackVelocity.x) < 0.1 && Math.abs(this._knockbackVelocity.y) < 0.1) {
                this._isBeingKnockedBack = false;
                this._knockbackVelocity = { x: 0, y: 0 };
            }
        }

        // Look for interesting items (only if not busy and not just ate)
        if ((this.state === "idle" || this.state === "wander") && !this._justAte) {
            const nearbyItem = this._findClosestItem(this.perceptionRange);
            if (nearbyItem && this._shouldPickUpItem(nearbyItem)) {
                const now = Date.now();
                if (now - this._lastPickupAttempt > 2000) {
                    this.target = nearbyItem;
                    this._setState("pickup");
                    this._lastPickupAttempt = now;
                    return;
                }
            }
        }

        // Look for threats (also works in player control mode)
        if (this.state === "idle" || this.state === "wander" || (this.playerControlled && this.state === "playerMove")) {
            const threat = this._findNearestThreat();
            if (threat) {
                if (!this.defendOnly && Math.random() < this.aggression) {
                    this.target = threat;
                    this._setState("chase");
                    return;
                } else {
                    if (Math.random() < this.fear) {
                        this.target = threat;
                        this._setState("flee");
                        return;
                    }
                }
            }
        }

        // Player control movement behavior
        if (this.playerControlled) {
            this._playerMoveBehavior(deltaTime);
            return;
        }

        // Default: let ProceduralCreature handle wandering
        if (this.state !== "wander" && this.state !== "idle") {
            this._setState("wander");
        }
        if (this.overrideCreatureMovement) {
            this._wanderBehavior(deltaTime);
        }
    }

    _handlePlayerControl() {
        if (!window.input) return;

        // Check for right-click or shift+left-click to set movement target
        const isRightClick = window.input.mousePressed('right');
        const isShiftLeftClick = window.input.mousePressed('left') && window.input.keyDown('Shift');

        if (isRightClick || isShiftLeftClick) {
            const worldMouse = window.input.getMousePosition(true);
            
            // Don't move if clicking on self
            const headPos = this._getHeadPosition();
            const dist = Math.hypot(worldMouse.x - headPos.x, worldMouse.y - headPos.y);
            
            if (this._creatureModule && dist > this._creatureModule.headSize + 10) {
                this._playerMoveTarget = { x: worldMouse.x, y: worldMouse.y };
                this._setState("playerMove");
            }
        }
    }

    _playerMoveBehavior(deltaTime) {
        // If no move target, stay idle (don't wander)
        if (!this._playerMoveTarget) {
            if (this.state === "playerMove") {
                this._setState("idle");
            }
            return;
        }

        const myPos = this.gameObject.getWorldPosition ? this.gameObject.getWorldPosition() : this.gameObject.position;
        const dist = this._distance(myPos, this._playerMoveTarget);

        // Reached destination
        if (dist < 20) {
            this._playerMoveTarget = null;
            this._setState("idle");
            return;
        }

        // Move towards target
        this._setCreatureTarget(this._playerMoveTarget);
    }

    _eatFromCorpse(corpseObj) {
        this._eatingItem = corpseObj;
        this._eatTimer = 0;
        
        console.log("Starting to eat from corpse");
        
        // Point hand at mouth
        if (this._creatureModule) {
            const headPos = this._getHeadPosition();
            this._creatureModule.pointRightHandAt(headPos.x, headPos.y - 10, false);
        }
    }

    _updateEatingCorpse(deltaTime) {
        this._eatTimer += deltaTime;
        
        // Keep hand at mouth during eating
        if (this._creatureModule && this._eatTimer < this.eatDuration * 0.8) {
            const headPos = this._getHeadPosition();
            this._creatureModule.pointRightHandAt(headPos.x, headPos.y - 10, false);
        }
        
        // Finish eating this bite
        if (this._eatTimer >= this.eatDuration) {
            const nutritionGained = 15; // More nutrition from meat
            this.hunger = Math.max(0, this.hunger - nutritionGained);
            
            console.log("Finished eating from corpse, hunger now:", this.hunger);
            
            // Set "just ate" flag
            this._justAte = true;
            this._ateTimer = 0;
            
            // Release hand control
            if (this._creatureModule) {
                this._creatureModule.releaseHandControl(0);
            }
            
            // Remember this food source
            if (this._eatingItem) {
                this._remember({
                    type: "food",
                    x: this._eatingItem.position.x,
                    y: this._eatingItem.position.y,
                    sourceName: this._eatingItem.name || this._eatingItem.id
                });
            }
            
            // Reset
            this._eatingItem = null;
            this._eatTimer = 0;
            this._forgetTarget();
            this._setState("idle");
        }
    }

    // ---------- Collision Detection ----------

    _handleCreatureCollisions(deltaTime) {
        if (!window.engine || !window.engine.gameObjects) return;
        if (!this._creatureModule) return;

        const myPos = this.gameObject.getWorldPosition ? this.gameObject.getWorldPosition() : this.gameObject.position;
        const myHeadSize = this._creatureModule.headSize || 25;
        const collisionRange = 300; // Only check creatures within this range

        for (let obj of window.engine.gameObjects) {
            if (!obj || obj === this.gameObject) continue;

            // Only check objects with ProceduralCreature module
            const otherCreatureModule = obj.getModule ? obj.getModule("ProceduralCreature") : null;
            if (!otherCreatureModule) continue;

            const otherPos = obj.getWorldPosition ? obj.getWorldPosition() : obj.position;
            const dx = otherPos.x - myPos.x;
            const dy = otherPos.y - myPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Skip if too far away to collide
            if (dist > collisionRange) continue;

            const otherHeadSize = otherCreatureModule.headSize || 25;
            const combinedRadius = myHeadSize + otherHeadSize;

            // Check if heads are overlapping
            if (dist < combinedRadius && dist > 0.1) {
                // Calculate push force based on overlap
                const overlap = combinedRadius - dist;
                const pushStrength = overlap / combinedRadius; // Normalized 0-1

                // Push away from the other creature
                const pushForce = 100 * pushStrength; // Base push force
                const pushX = -(dx / dist) * pushForce * deltaTime;
                const pushY = -(dy / dist) * pushForce * deltaTime;

                // Apply the push to our position
                this.gameObject.position.x += pushX;
                this.gameObject.position.y += pushY;

                // If we have a wander target, adjust it to avoid re-collision
                if (this._creatureModule._wanderTarget) {
                    this._creatureModule._wanderTarget.x += pushX * 2;
                    this._creatureModule._wanderTarget.y += pushY * 2;
                }

                // Optional: Add slight rotation when pushed
                const pushAngle = Math.atan2(-dy, -dx) * 180 / Math.PI;
                let angleDiff = pushAngle - this.gameObject.angle;
                while (angleDiff > 180) angleDiff -= 360;
                while (angleDiff < -180) angleDiff += 360;

                // Slight rotation towards push direction
                this.gameObject.angle += angleDiff * 0.05 * pushStrength;
            }
        }
    }

    // ---------- Debug Modal ----------

    _setupDebugModal() {
        if (!this._debugModal) {
            this._debugModal = document.createElement('div');
            this._debugModal.className = 'creature-debug-modal';
            this._debugModal.style.cssText = `
                position: fixed;
                z-index: 10000;
                background: rgba(30, 30, 40, 0.95);
                border: 2px solid #6b5a7d;
                border-radius: 8px;
                padding: 15px;
                min-width: 300px;
                max-width: 400px;
                color: #fff;
                font-family: monospace;
                font-size: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                display: none;
                cursor: move;
            `;

            const title = document.createElement('div');
            title.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                padding-bottom: 8px;
                border-bottom: 1px solid #6b5a7d;
                font-weight: bold;
                font-size: 14px;
            `;
            title.innerHTML = `<span>🧠 Creature AI Debug</span>`;

            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '✕';
            closeBtn.style.cssText = `
                background: #6b5a7d;
                border: none;
                color: white;
                width: 24px;
                height: 24px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                line-height: 1;
            `;
            closeBtn.onclick = () => {
                this._debugModal.style.display = 'none';
            };
            title.appendChild(closeBtn);

            const content = document.createElement('div');
            content.className = 'debug-content';
            content.style.cssText = `line-height: 1.6;`;

            this._debugModal.appendChild(title);
            this._debugModal.appendChild(content);
            document.body.appendChild(this._debugModal);

            this._makeDraggable(this._debugModal, title);
        }
    }

    _checkForClick() {
        if (!window.input || !this._creatureModule) return;

        // Check if mouse was pressed this frame
        if (window.input.mousePressed('left')) {
            const worldMouse = window.input.getMousePosition(true);

            // Check if click is on this creature (check head segment)
            const headPos = this._getHeadPosition();
            const dist = Math.hypot(worldMouse.x - headPos.x, worldMouse.y - headPos.y);

            if (dist < this._creatureModule.headSize + 10) {
                this.toggleDebugModal();
            }
        }
    }

    toggleDebugModal() {
        if (!this._debugModal) return;

        if (this._debugModal.style.display === 'none') {
            this._debugModal.style.left = '50px';
            this._debugModal.style.top = '50px';
            this._debugModal.style.display = 'block';
            this._updateDebugModal();
        } else {
            this._debugModal.style.display = 'none';
        }
    }

    _updateDebugModal() {
        if (!this._debugModal) return;

        const content = this._debugModal.querySelector('.debug-content');
        if (!content) return;

        const targetInfo = this.target ?
            (this.target.name || this.target.id || 'Unknown') :
            'None';

        const inventoryInfo = this.inventory.length > 0 ?
            this.inventory.map(i => i.name || 'Item').join(', ') :
            'Empty';

        const nestInfo = this.nestPosition ?
            `(${Math.round(this.nestPosition.x)}, ${Math.round(this.nestPosition.y)})` :
            'None';

        content.innerHTML = `
            <div style="margin-bottom: 8px;">
                <strong>State:</strong> <span style="color: #4CAF50;">${this.state}</span>
            </div>
            <div style="margin-bottom: 8px;">
                <strong>Health:</strong> ${Math.round(this.health)}/${this.maxHealth}
                <div style="background: #333; height: 6px; border-radius: 3px; overflow: hidden; margin-top: 2px;">
                    <div style="background: #4CAF50; height: 100%; width: ${(this.health / this.maxHealth * 100)}%;"></div>
                </div>
            </div>
            <div style="margin-bottom: 8px;">
                <strong>Hunger:</strong> ${Math.round(this.hunger)}/${this.hungerThreshold}
                <div style="background: #333; height: 6px; border-radius: 3px; overflow: hidden; margin-top: 2px;">
                    <div style="background: ${this.hunger >= this.hungerThreshold ? '#ff6b6b' : '#FFA726'}; height: 100%; width: ${Math.min(this.hunger / this.hungerThreshold * 100, 100)}%;"></div>
                </div>
            </div>
            <div style="margin-bottom: 5px;">
                <strong>Target:</strong> ${targetInfo}
            </div>
            <div style="margin-bottom: 5px;">
                <strong>Inventory:</strong> ${inventoryInfo}
            </div>
            <div style="margin-bottom: 5px;">
                <strong>Hands:</strong> ${this._heldItems.size}/${this._creatureModule ? this._creatureModule.armCount : 0}
            </div>
            <div style="margin-bottom: 5px;">
                <strong>Nest:</strong> ${nestInfo}
            </div>
            <div style="margin-bottom: 5px;">
                <strong>Personality:</strong>
                <div style="margin-left: 10px; font-size: 11px;">
                    Aggression: ${(this.aggression * 100).toFixed(0)}%<br>
                    Fear: ${(this.fear * 100).toFixed(0)}%<br>
                    Defend Only: ${this.defendOnly ? 'Yes' : 'No'}
                </div>
            </div>
            <div style="margin-bottom: 5px;">
                <strong>Diet:</strong> ${this.diet}
            </div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #444; font-size: 10px; color: #aaa;">
                Memory: ${this.memory.length} entries<br>
                Just Ate: ${this._justAte ? 'Yes' : 'No'}<br>
                Family: ${this.familyGroup || 'None'}
            </div>
        `;
    }

    _makeDraggable(element, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        handle.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    // ---------- Update held items positions ----------

    _updateHeldItems() {
        if (!this._creatureModule) return;

        for (let [handIndex, item] of this._heldItems.entries()) {
            const handPos = this._creatureModule.getHandPosition(handIndex);
            if (handPos && item && item.position) {
                item.position.x = handPos.x;
                item.position.y = handPos.y;

                // Make visible if it's a tool/visible item
                const itemModule = item.getModule ? item.getModule("ItemModule") : null;
                if (itemModule && itemModule.isTool && item.renderer) {
                    item.renderer.visible = true;
                }
            }
        }
    }

    // ---------- Item interaction ----------

    _shouldPickUpItem(itemObj) {
        if (!itemObj || !this._hasAvailableHand()) return false;
        if (this.inventory.length >= this.maxInventorySize) return false;

        // Don't pick up items we're already holding
        if (this._isHoldingItem(itemObj)) return false;

        const itemModule = itemObj.getModule ? itemObj.getModule("ItemModule") : null;
        const isFood = itemModule ? !!itemModule.isFood : (itemObj.itemData && itemObj.itemData.isFood);

        // Don't pick up food if just ate
        if (isFood && this._justAte) return false;

        if (isFood && this.hunger >= this.hungerThreshold * 0.5) return true;
        if (isFood && this.nestPosition && this.collectFoodForNest && !this._justAte) return true;

        // Pick up tools
        if (itemModule && itemModule.isTool) return true;

        if (!isFood && Math.random() < this.itemInterestThreshold) return true;

        return false;
    }

    _isHoldingItem(itemObj) {
        for (let [handIndex, item] of this._heldItems.entries()) {
            if (item === itemObj) return true;
        }
        return false;
    }

    _hasAvailableHand() {
        if (!this._creatureModule || !this._creatureModule.armCount) return true;
        return this._heldItems.size < this._creatureModule.armCount;
    }

    _getAvailableHandIndex() {
        if (!this._creatureModule) return 0;

        if (!this._heldItems.has(this.preferredPickupHand)) {
            return this.preferredPickupHand;
        }

        for (let i = 0; i < this._creatureModule.armCount; i++) {
            if (!this._heldItems.has(i)) return i;
        }
        return null;
    }

    _approachAndPickup(itemObj, deltaTime) {
        if (!itemObj || !this._isObjectAlive(itemObj)) {
            this._forgetTarget();
            this._setState("idle");
            return;
        }

        const targetPos = itemObj.getWorldPosition ? itemObj.getWorldPosition() : itemObj.position;
        const myPos = this.gameObject.getWorldPosition ? this.gameObject.getWorldPosition() : this.gameObject.position;
        const dist = this._distance(myPos, targetPos);

        if (dist > Math.max(this.attackRange, 25)) {
            this._setCreatureTarget(targetPos);
        } else {
            this._pickUpItemWithHand(itemObj);
            this._forgetTarget();
            this._setState("idle");
        }
    }

    _pickUpItemWithHand(itemObj) {
        if (!itemObj) return false;

        const handIndex = this._getAvailableHandIndex();
        if (handIndex === null) return false;

        const itemModule = itemObj.getModule ? itemObj.getModule("ItemModule") : null;

        if (this._creatureModule) {
            const itemPos = itemObj.getWorldPosition ? itemObj.getWorldPosition() : itemObj.position;

            if (handIndex === 0) {
                this._creatureModule.pointRightHandAt(itemPos.x, itemPos.y, false);
                setTimeout(() => this._creatureModule.grabRight(itemPos.x, itemPos.y), 200);
            } else if (handIndex === 1) {
                this._creatureModule.pointLeftHandAt(itemPos.x, itemPos.y, false);
                setTimeout(() => this._creatureModule.grabLeft(itemPos.x, itemPos.y), 200);
            }
        }

        setTimeout(() => {
            if (itemModule && typeof itemModule.pickUp === "function") {
                const ok = itemModule.pickUp(this.gameObject);
                if (ok) {
                    this.inventory.push(itemObj);
                    this._heldItems.set(handIndex, itemObj);

                    // If it's a tool, keep it visible
                    if (itemModule.isTool && itemObj.renderer) {
                        itemObj.renderer.visible = true;
                    }

                    this._remember({
                        type: "item",
                        x: itemObj.position.x,
                        y: itemObj.position.y,
                        sourceName: itemObj.name || itemObj.id
                    });

                    this._decideItemAction(itemObj, handIndex);
                }
            }
        }, 300);

        return true;
    }

    _decideItemAction(itemObj, handIndex) {
        const itemModule = itemObj.getModule ? itemObj.getModule("ItemModule") : null;
        const isFood = itemModule ? !!itemModule.isFood : false;

        // If hungry and it's food, eat it immediately (from hand)
        if (isFood && this.hunger >= this.hungerThreshold) {
            this._setState("eat");
            this._startEatingFromHand(itemObj, handIndex);
            return;
        }

        // If have nest and it's food, store it at nest
        if (isFood && this.nestPosition && this.collectFoodForNest && !this._justAte) {
            this._setState("returnToNest");
            return;
        }

        // If it's a tool, just hold it
        this._setState("idle");
    }

    _startEatingFromHand(itemObj, handIndex) {
        this._eatingItem = itemObj;
        this._eatingHand = handIndex;
        this._eatTimer = 0;

        // Move hand to mouth
        if (this._creatureModule && this._eatingHand !== null) {
            const headPos = this._getHeadPosition();

            if (this._eatingHand === 0) {
                this._creatureModule.pointRightHandAt(headPos.x, headPos.y - 10, false);
            } else if (this._eatingHand === 1) {
                this._creatureModule.pointLeftHandAt(headPos.x, headPos.y - 10, false);
            }
        }
    }

    _updateEating(deltaTime) {
        this._eatTimer += deltaTime;

        // Keep hand at mouth during eating (first 80% of duration)
        if (this._creatureModule && this._eatingHand !== null && this._eatTimer < this.eatDuration * 0.8) {
            const headPos = this._getHeadPosition();
            if (this._eatingHand === 0) {
                this._creatureModule.pointRightHandAt(headPos.x, headPos.y - 10, false);
            } else if (this._eatingHand === 1) {
                this._creatureModule.pointLeftHandAt(headPos.x, headPos.y - 10, false);
            }
        }

        // Finish eating
        if (this._eatTimer >= this.eatDuration) {
            this._finishEating();
        }
    }

    _finishEating() {
        if (!this._eatingItem) {
            this._setState("idle");
            return;
        }

        const itemModule = this._eatingItem.getModule ? this._eatingItem.getModule("ItemModule") : null;

        if (itemModule && itemModule.isFood) {
            // Gain nutrition from the food
            const nutritionGained = itemModule.nutrition || 10;
            this.hunger = Math.max(0, this.hunger - nutritionGained);

            // Set "just ate" flag to prevent immediate re-seeking
            this._justAte = true;
            this._ateTimer = 0;

            this._remember({
                type: "food",
                x: this._eatingItem.position.x,
                y: this._eatingItem.position.y,
                sourceName: this._eatingItem.name || this._eatingItem.id
            });

            // Remove from inventory
            const idx = this.inventory.indexOf(this._eatingItem);
            if (idx >= 0) this.inventory.splice(idx, 1);

            // Remove from held items
            if (this._eatingHand !== null) {
                this._heldItems.delete(this._eatingHand);
            }

            // Destroy the item (consumed)
            if (this._eatingItem.destroy) {
                this._eatingItem.destroy();
            }

            // Release hand control so it returns to rest position
            if (this._creatureModule && this._eatingHand !== null) {
                this._creatureModule.releaseHandControl(this._eatingHand);
            }
        }

        // Reset eating state
        this._eatingItem = null;
        this._eatingHand = null;
        this._eatTimer = 0;
        this._setState("idle");
    }

    _getHeadPosition() {
        if (this._creatureModule && this._creatureModule._segments && this._creatureModule._segments.length > 0) {
            const headSeg = this._creatureModule._segments[0];
            return { x: headSeg.x, y: headSeg.y };
        }
        const pos = this.gameObject.getWorldPosition ? this.gameObject.getWorldPosition() : this.gameObject.position;
        return { x: pos.x, y: pos.y - 20 };
    }

    _returnToNestBehavior(deltaTime) {
        if (!this.nestPosition) {
            this._setState("idle");
            return;
        }

        const myPos = this.gameObject.getWorldPosition ? this.gameObject.getWorldPosition() : this.gameObject.position;
        const dist = this._distance(myPos, this.nestPosition);

        this._setCreatureTarget(this.nestPosition);

        if (dist <= 30) {
            this._setState("dropAtNest");
        }
    }

    _dropAtNestBehavior(deltaTime) {
        const itemsToDrop = [];

        for (let [handIndex, item] of this._heldItems.entries()) {
            const itemModule = item.getModule ? item.getModule("ItemModule") : null;
            const isFood = itemModule ? !!itemModule.isFood : false;

            if (isFood) {
                itemsToDrop.push({ handIndex, item, itemModule });
            }
        }

        for (let { handIndex, item, itemModule } of itemsToDrop) {
            if (itemModule && typeof itemModule.drop === "function") {
                const dropX = this.nestPosition.x + (Math.random() - 0.5) * 40;
                const dropY = this.nestPosition.y + (Math.random() - 0.5) * 40;

                itemModule.drop({ x: dropX, y: dropY });

                const idx = this.inventory.indexOf(item);
                if (idx >= 0) this.inventory.splice(idx, 1);
                this._heldItems.delete(handIndex);

                this.nestFoodStorage.push({
                    item: item,
                    position: { x: dropX, y: dropY },
                    storedAt: Date.now()
                });

                if (this._creatureModule) {
                    this._creatureModule.releaseHandControl(handIndex);
                }
            }
        }

        this._setState("idle");
    }

    // ---------- Flee behavior ----------

    _fleeBehavior(deltaTime) {
        if (!this.target) {
            this._setState("idle");
            return;
        }

        this._fleeRethinkTimer += deltaTime;

        const threatPos = this.target.getWorldPosition ? this.target.getWorldPosition() : this.target.position;
        const myPos = this.gameObject.getWorldPosition ? this.gameObject.getWorldPosition() : this.gameObject.position;

        const dx = myPos.x - threatPos.x;
        const dy = myPos.y - threatPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Drop items randomly when fleeing (2% chance per frame if holding items)
        if (this._heldItems.size > 0 && Math.random() < 0.02) {
            this._dropRandomItem();
        }

        // Periodically rethink flee behavior
        if (this._fleeRethinkTimer >= this._fleeRethinkInterval) {
            this._fleeRethinkTimer = 0;

            // Check if we should change direction
            if (Math.random() < this._fleeChangeDirectionChance) {
                // Pick a random perpendicular direction
                const perpAngle = Math.atan2(dy, dx) + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
                const fleeX = myPos.x + Math.cos(perpAngle) * 100;
                const fleeY = myPos.y + Math.sin(perpAngle) * 100;
                this._setCreatureTarget({ x: fleeX, y: fleeY });
            }

            // Consider fighting back based on combat experience and relative strength
            const targetAI = this.target.getModule ? this.target.getModule("CreatureAI") : null;
            if (targetAI) {
                const myStrength = this.attackDamage * (this.health / this.maxHealth) + this.combatExperience * 0.1;
                const theirStrength = targetAI.attackDamage * (targetAI.health / targetAI.maxHealth) + (targetAI.combatExperience || 0) * 0.1;

                // More likely to fight if we're stronger or have more experience
                const fightChance = Math.min(0.7, (myStrength / theirStrength) * 0.3 + (this.combatExperience * 0.01));

                if (Math.random() < fightChance && !this.defendOnly) {
                    this._setState("chase");
                    return;
                }
            }
        }

        if (dist > this.perceptionRange * 1.5) {
            // Safe distance reached
            this._forgetTarget();
            this._fleeRethinkTimer = 0;
            this._setState("idle");
            return;
        }

        // Keep running away
        if (dist > 0) {
            const fleeX = myPos.x + (dx / dist) * 100;
            const fleeY = myPos.y + (dy / dist) * 100;
            this._setCreatureTarget({ x: fleeX, y: fleeY });
        }
    }

    _dropRandomItem() {
        if (this._heldItems.size === 0) return;

        // Get random held item
        const handIndices = Array.from(this._heldItems.keys());
        const randomHandIndex = handIndices[Math.floor(Math.random() * handIndices.length)];
        const item = this._heldItems.get(randomHandIndex);

        if (!item) return;

        const itemModule = item.getModule ? item.getModule("ItemModule") : null;
        if (itemModule && typeof itemModule.drop === "function") {
            itemModule.drop();

            const idx = this.inventory.indexOf(item);
            if (idx >= 0) this.inventory.splice(idx, 1);
            this._heldItems.delete(randomHandIndex);

            if (this._creatureModule) {
                this._creatureModule.releaseHandControl(randomHandIndex);
            }
        }
    }

    // ---------- State helpers ----------

    _setState(s) {
        if (this.state === s) return;
        this.state = s;
        this.stateTimer = 0;
    }

    _wanderBehavior(deltaTime) {
        this.stateTimer += deltaTime;
        const pos = this.gameObject.position;

        if (!this._wanderTarget || this._distance(pos, this._wanderTarget) < 20) {
            const center = this.nestPosition || pos;
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * this.wanderRadius;
            this._wanderTarget = {
                x: center.x + Math.cos(angle) * dist,
                y: center.y + Math.sin(angle) * dist
            };
        }

        if (this._wanderTarget) {
            this._setCreatureTarget(this._wanderTarget);
        }
    }

    _followLeaderBehavior(leader, deltaTime) {
        const leaderPos = leader.getWorldPosition ? leader.getWorldPosition() : leader.position;
        const myPos = this.gameObject.getWorldPosition ? this.gameObject.getWorldPosition() : this.gameObject.position;
        const desiredDist = 50;

        const dx = leaderPos.x - myPos.x;
        const dy = leaderPos.y - myPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > desiredDist * 1.5) {
            this._setCreatureTarget(leaderPos);
        } else if (dist < desiredDist * 0.5) {
            const awayX = myPos.x - dx * 0.1;
            const awayY = myPos.y - dy * 0.1;
            this._setCreatureTarget({ x: awayX, y: awayY });
        }
    }

    _seekBehavior(targetObj, deltaTime) {
        this.stateTimer += deltaTime;
        if (!targetObj || !this._isObjectAlive(targetObj)) {
            // Check if it's a dead creature we can eat
            const targetAI = targetObj ? (targetObj.getModule ? targetObj.getModule("CreatureAI") : null) : null;
            if (targetAI && targetAI.state === "dead") {
                // It's a corpse, approach and eat from it
                const targetPos = targetObj.getWorldPosition ? targetObj.getWorldPosition() : targetObj.position;
                const myPos = this.gameObject.getWorldPosition ? this.gameObject.getWorldPosition() : this.gameObject.position;
                const dist = this._distance(myPos, targetPos);

                if (dist <= Math.max(this.attackRange, 40)) {
                    // Close enough to eat from corpse
                    this._setState("eatCorpse");
                    this._eatFromCorpse(targetObj);
                    return;
                } else {
                    this._setCreatureTarget(targetPos);
                    return;
                }
            }
            
            this._forgetTarget();
            this._setState("idle");
            return;
        }

        const targetPos = targetObj.getWorldPosition ? targetObj.getWorldPosition() : targetObj.position;
        const myPos = this.gameObject.getWorldPosition ? this.gameObject.getWorldPosition() : this.gameObject.position;
        const dist = this._distance(myPos, targetPos);

        this._setCreatureTarget(targetPos);

        if (dist <= Math.max(this.attackRange, 25)) {
            this._pickUpItemWithHand(targetObj);
            this._forgetTarget();
            this._setState("idle");
        }
    }

    _combatBehavior(deltaTime) {
        this.stateTimer += deltaTime;

        // Track chase time across both chase and attack states
        if (this.state === "chase" || this.state === "attack") {
            this._chaseTimer += deltaTime;

            // Lose interest if chasing/fighting too long
            if (this._chaseTimer >= this.maxChaseTime) {
                console.log("Lost interest in target after chasing too long");
                this._forgetTarget();
                this._chaseTimer = 0;
                this._setState("idle");
                return;
            }
        } else {
            this._chaseTimer = 0;
        }

        if (!this.target || !this._isObjectAlive(this.target)) {
            this._forgetTarget();
            this._chaseTimer = 0;
            this._setState("idle");
            return;
        }

        const targetPos = this.target.getWorldPosition ? this.target.getWorldPosition() : this.target.position;
        const myPos = this.gameObject.getWorldPosition ? this.gameObject.getWorldPosition() : this.gameObject.position;
        const dist = this._distance(myPos, targetPos);

        if (dist > this.perceptionRange * 1.2) {
            this._forgetTarget();
            this._chaseTimer = 0;
            this._setState("idle");
            return;
        }

        // Calculate angle to target and face it
        const dx = targetPos.x - myPos.x;
        const dy = targetPos.y - myPos.y;
        const angleToTarget = Math.atan2(dy, dx) * 180 / Math.PI;

        // Smoothly rotate to face target
        let angleDiff = angleToTarget - this.gameObject.angle;
        while (angleDiff > 180) angleDiff -= 360;
        while (angleDiff < -180) angleDiff += 360;

        const turnSpeed = 360; // degrees per second
        const turnAmount = Math.max(-turnSpeed * deltaTime, Math.min(turnSpeed * deltaTime, angleDiff));
        this.gameObject.angle += turnAmount;

        // Determine ideal combat distance (accounting for both creature sizes)
        const mySize = this._creatureModule ? this._creatureModule.headSize : 25;
        const targetAI = this.target.getModule ? this.target.getModule("CreatureAI") : null;
        const targetSize = targetAI && targetAI._creatureModule ? targetAI._creatureModule.headSize : 25;

        // Ideal distance is attack range plus some buffer to prevent overlap
        const idealDistance = this.attackRange + mySize * 0.5 + targetSize * 0.5;
        const minDistance = idealDistance * 0.8; // Minimum comfortable distance
        const maxDistance = idealDistance * 1.2; // Maximum attack distance

        if (dist < minDistance) {
            // Too close - back up while maintaining facing
            const backupX = myPos.x - (dx / dist) * 30;
            const backupY = myPos.y - (dy / dist) * 30;
            this._setCreatureTarget({ x: backupX, y: backupY });
            this._setState("chase"); // Keep chase state while repositioning
        } else if (dist <= maxDistance) {
            // In ideal attack range
            if (this._attackTimer <= 0) {
                this._attackTarget(this.target);
                this._attackTimer = this.attackCooldown;
            }
            this._setState("attack");

            // Stop moving, just maintain position
            if (this._creatureModule) {
                this._creatureModule._wanderTarget = null;
            }
        } else {
            // Too far - move closer
            this._setCreatureTarget(targetPos);
            this._setState("chase");
        }
    }

    _attackTarget(targetObj) {
        if (!targetObj) return false;

        if (this._creatureModule && typeof this._creatureModule.punchRight === "function") {
            if (!this._creatureModule.punchRight(null, null)) {
                this._creatureModule.punchLeft(null, null);
            }
        }

        const damage = this.attackDamage;
        const attacker = this.gameObject;

        setTimeout(() => {
            // Get positions for knockback calculation
            const targetPos = targetObj.getWorldPosition ? targetObj.getWorldPosition() : targetObj.position;
            const myPos = this.gameObject.getWorldPosition ? this.gameObject.getWorldPosition() : this.gameObject.position;

            // Create blood particle effect at hit location
            if (this.bloodParticleObjectName != "") {
                //this.instanceCreate(targetPos.x, targetPos.y, this.bloodParticleObjectName, false, false);
            }

            // Apply knockback to target
            if (this.knockbackEnabled) {
                const targetAI = targetObj.getModule ? targetObj.getModule("CreatureAI") : null;
                if (targetAI) {
                    const dx = targetPos.x - myPos.x;
                    const dy = targetPos.y - myPos.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist > 0) {
                        const knockbackScale = damage / 10; // Scale with damage
                        const forceX = (dx / dist) * this.knockbackForce * knockbackScale;
                        const forceY = (dy / dist) * this.knockbackForce * knockbackScale;

                        targetAI._applyKnockback(forceX, forceY);
                    }
                }
            }

            // Apply damage
            if (targetObj.getModule) {
                const targetAI = targetObj.getModule("CreatureAI");
                if (targetAI && typeof targetAI.takeDamage === "function") {
                    const killed = targetAI.takeDamage(damage, attacker);

                    // Gain experience and stats if we killed the target
                    if (killed) {
                        this._gainCombatExperience();
                    }
                    return;
                }
            }
            if (targetObj.getModule) {
                const healthModule = targetObj.getModule("SimpleHealth");
                if (healthModule && typeof healthModule.takeDamage === "function") {
                    healthModule.takeDamage(damage, attacker);
                    return;
                }
            }

            if (targetObj.health !== undefined) {
                targetObj.health = Math.max(0, targetObj.health - damage);
            }
        }, 100);

        return true;
    }

    _applyKnockback(forceX, forceY) {
        this._knockbackVelocity.x = forceX;
        this._knockbackVelocity.y = forceY;
        this._isBeingKnockedBack = true;
    }

    _gainCombatExperience() {
        this.combatExperience += 1;
        this.battlesWon += 1;

        // Increase stats based on combat experience
        const growthFactor = 1 + this.statGrowthRate;
        this.attackDamage *= growthFactor;
        this.maxHealth *= growthFactor;
        this.health = Math.min(this.health * growthFactor, this.maxHealth); // Heal a bit

        // Increase aggression slightly, decrease fear
        this.aggression = Math.min(1.0, this.aggression + 0.05);
        this.fear = Math.max(0.0, this.fear - 0.05);

        console.log(`Creature gained combat experience! Stats increased. Battles won: ${this.battlesWon}`);
    }

    _die() {
        if (this.state === "dead") return; // Prevent multiple death calls

        this._setState("dead");

        console.log("Creature dying, health:", this.health);

        // Drop all held items
        for (let [handIndex, item] of this._heldItems.entries()) {
            const itemModule = item.getModule ? item.getModule("ItemModule") : null;
            if (itemModule && typeof itemModule.drop === "function") {
                itemModule.drop();
            }
            if (this._creatureModule) {
                this._creatureModule.releaseHandControl(handIndex);
            }
        }

        this._heldItems.clear();
        this.inventory = [];

        // Tell ProceduralCreature to die and start decay
        if (this._creatureModule) {
            if (typeof this._creatureModule.die === "function") {
                this._creatureModule.die();
                console.log("ProceduralCreature.die() called");
            } else {
                console.warn("ProceduralCreature does not have a die() method");
            }
        } else {
            console.warn("No _creatureModule reference found");
        }

        if (this._debugModal) {
            this._debugModal.style.display = 'none';
        }
    }

    // ---------- Movement helper ----------

    _setCreatureTarget(target) {
        if (!this._creatureModule) {
            if (this.overrideCreatureMovement) {
                this._moveTowards(target, 0.016);
            }
            return;
        }

        const dest = (target.x !== undefined && target.y !== undefined) ? target :
            (target.getWorldPosition ? target.getWorldPosition() : target.position);

        this._creatureModule._wanderTarget = { x: dest.x, y: dest.y };
    }

    _moveTowards(target, deltaTime, speedMultiplier = 1.0) {
        const dest = (target.x !== undefined && target.y !== undefined) ? { x: target.x, y: target.y } :
            (target.getWorldPosition ? target.getWorldPosition() : (target.position || target));

        const pos = this.gameObject.position;
        const dx = dest.x - pos.x;
        const dy = dest.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.5) {
            const moveSpeed = this._creatureModule ?
                (this._creatureModule.moveSpeed || 60) * speedMultiplier :
                40 * speedMultiplier;
            const nx = dx / dist;
            const ny = dy / dist;
            pos.x += nx * moveSpeed * deltaTime;
            pos.y += ny * moveSpeed * deltaTime;
        }
    }

    _distance(a, b) {
        const ax = a.x, ay = a.y, bx = b.x, by = b.y;
        return Math.hypot(ax - bx, ay - by);
    }

    _forgetTarget() {
        this.target = null;
    }

    // ---------- Public API ----------

    takeDamage(amount, attackerGameObject = null) {
        if (this.state === "dead") return true;

        const effective = amount * (1 - (this.attackResistance || 0));
        this.health -= effective;

        console.log("Creature took damage:", effective, "Health now:", this.health);

        if (attackerGameObject && attackerGameObject.name) {
            this._remember({ type: "threat", x: attackerGameObject.position.x, y: attackerGameObject.position.y, sourceName: attackerGameObject.name });
            this.target = attackerGameObject;
            if (this.defendOnly) {
                this._setState("chase");
            } else {
                // Consider combat experience when deciding to fight or flee
                const myStrength = this.attackDamage + this.combatExperience * 0.1;
                const shouldFlee = Math.random() < this.fear && myStrength < 20;
                this._setState(shouldFlee ? "flee" : "chase");
            }
        }

        if (this.health <= this.maxHealth * 0.3 && Math.random() < this.fear && this.health > 0) {
            this._setState("flee");
        }

        this.exposeProperty("health", "number", this.health);

        // Check for death
        if (this.health <= 0) {
            console.log("Health <= 0, calling _die()");
            this._die();
            return true;
        }

        return false;
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        this.exposeProperty("health", "number", this.health);
    }

    modifyHunger(delta) {
        this.hunger = Math.max(0, this.hunger + delta);
    }

    setNestPosition(x, y) {
        this.nestPosition = { x, y };
    }

    setLeader(name) {
        this.leaderName = name;
    }

    setFamilyGroup(name) {
        this.familyGroup = name;
    }

    setPersonality(opts = {}) {
        if (opts.aggression !== undefined) this.aggression = opts.aggression;
        if (opts.fear !== undefined) this.fear = opts.fear;
        if (opts.defendOnly !== undefined) this.defendOnly = opts.defendOnly;
    }

    setDiet(diet) {
        if (["herbivore", "omnivore", "carnivore"].includes(diet)) {
            this.diet = diet;
        }
    }

    // ---------- Memory utilities ----------

    _remember(entry) {
        entry.lastSeen = Date.now();
        this.memory.unshift(entry);
        if (this.memory.length > 40) this.memory.length = 40;
    }

    getMemoryClosest(type) {
        let best = null;
        let bestDist = Infinity;
        const myPos = this.gameObject.getWorldPosition ? this.gameObject.getWorldPosition() : this.gameObject.position;
        for (let m of this.memory) {
            if (type && m.type !== type) continue;
            const d = Math.hypot(m.x - myPos.x, m.y - myPos.y);
            if (d < bestDist) {
                bestDist = d;
                best = m;
            }
        }
        return best;
    }

    // ---------- World scanning helpers ----------

    _findClosestItem(range = 200) {
        if (!window.engine || !window.engine.gameObjects) return null;
        const myPos = this.gameObject.getWorldPosition ? this.gameObject.getWorldPosition() : this.gameObject.position;
        let best = null;
        let bestDist = range + 1;
        for (let obj of window.engine.gameObjects) {
            if (!obj) continue;
            if (obj === this.gameObject) continue;

            // Skip items we're already holding
            if (this._isHoldingItem(obj)) continue;

            const isItem = (obj.getModule && obj.getModule("ItemModule")) || obj.tag === "item";
            if (!isItem) continue;
            const pos = obj.getWorldPosition ? obj.getWorldPosition() : obj.position;
            const d = Math.hypot(pos.x - myPos.x, pos.y - myPos.y);
            if (d < bestDist) {
                bestDist = d;
                best = obj;
            }
        }
        return best;
    }

    _findClosestFood() {
        if (!window.engine || !window.engine.gameObjects) return null;
        const myPos = this.gameObject.getWorldPosition ? this.gameObject.getWorldPosition() : this.gameObject.position;
        let best = null;
        let bestDist = Infinity;

        for (let obj of window.engine.gameObjects) {
            if (!obj || obj === this.gameObject) continue;

            // Skip food we're already holding
            if (this._isHoldingItem(obj)) continue;

            // Check for dead creatures as food (carnivores and omnivores)
            const objAI = obj.getModule ? obj.getModule("CreatureAI") : null;
            if (objAI && objAI.state === "dead" && (this.diet === "carnivore" || this.diet === "omnivore")) {
                const pos = obj.getWorldPosition ? obj.getWorldPosition() : obj.position;
                const d = Math.hypot(pos.x - myPos.x, pos.y - myPos.y);
                if (d < bestDist && d <= this.perceptionRange) {
                    bestDist = d;
                    best = obj;
                }
                continue;
            }

            // Check for food items
            const itemMod = obj.getModule ? obj.getModule("ItemModule") : null;
            const isFood = itemMod ? !!itemMod.isFood : (obj.itemData && obj.itemData.isFood);
            if (!isFood) continue;
            if (this.diet === "carnivore" && itemMod && itemMod.metadata && itemMod.metadata.plantOnly) continue;
            const pos = obj.getWorldPosition ? obj.getWorldPosition() : obj.position;
            const d = Math.hypot(pos.x - myPos.x, pos.y - myPos.y);
            if (d < bestDist && d <= this.perceptionRange) {
                bestDist = d;
                best = obj;
            }
        }

        if (!best) {
            const mem = this.getMemoryClosest("food");
            if (mem) return { virtual: true, x: mem.x, y: mem.y, sourceName: mem.sourceName };
        }
        return best;
    }

    _findNearestThreat() {
        if (!window.engine || !window.engine.gameObjects) return null;
        const myPos = this.gameObject.getWorldPosition ? this.gameObject.getWorldPosition() : this.gameObject.position;
        let best = null;
        let bestScore = 0;
        for (let obj of window.engine.gameObjects) {
            if (!obj || obj === this.gameObject) continue;
            const ai = obj.getModule ? obj.getModule("CreatureAI") : null;
            if (!ai) continue;
            if (ai.health <= 0 || ai.state === "dead") continue; // IGNORE DEAD CREATURES
            const pos = obj.getWorldPosition ? obj.getWorldPosition() : obj.position;
            const d = Math.hypot(pos.x - myPos.x, pos.y - myPos.y);
            if (d > this.perceptionRange) continue;
            const score = (ai.aggression || 0.5) / Math.max(1, d);
            if (score > bestScore) {
                bestScore = score;
                best = obj;
            }
        }
        return best;
    }

    _isEnemy(obj) {
        if (!obj) return false;
        const ai = obj.getModule ? obj.getModule("CreatureAI") : null;
        if (!ai) return false;
        if (ai.state === "dead" || ai.health <= 0) return false; // DEAD CREATURES ARE NOT ENEMIES
        if (this.familyGroup && ai.familyGroup && this.familyGroup === ai.familyGroup) return false;
        return (ai.aggression || 0) > 0.4;
    }

    _isObjectAlive(obj) {
        if (!obj) return false;
        
        // Check if it's a dead creature (which is "alive" as an object but dead as a creature)
        const ai = obj.getModule ? obj.getModule("CreatureAI") : null;
        if (ai) {
            // For food seeking, dead creatures are valid targets
            // For combat, they are not
            return ai.health > 0 && ai.state !== "dead";
        }
        
        if (obj.health !== undefined) return obj.health > 0;
        return true;
    }

    // ---------- Serialization ----------

    toJSON() {
        return {
            ...super.toJSON(),
            maxHealth: this.maxHealth,
            health: this.health,
            attackDamage: this.attackDamage,
            attackResistance: this.attackResistance,
            perceptionRange: this.perceptionRange,
            attackRange: this.attackRange,
            hunger: this.hunger,
            hungerRate: this.hungerRate,
            hungerThreshold: this.hungerThreshold,
            diet: this.diet,
            aggression: this.aggression,
            fear: this.fear,
            defendOnly: this.defendOnly,
            familyGroup: this.familyGroup,
            leaderName: this.leaderName,
            followLeader: this.followLeader,
            nestPosition: this.nestPosition,
            wanderRadius: this.wanderRadius,
            collectFoodForNest: this.collectFoodForNest,
            eatDuration: this.eatDuration,
            maxInventorySize: this.maxInventorySize,
            overrideCreatureMovement: this.overrideCreatureMovement,
            playerControlled: this.playerControlled,
            bloodParticleObjectName: this.bloodParticleObjectName,
            combatExperience: this.combatExperience,
            battlesWon: this.battlesWon,
            statGrowthRate: this.statGrowthRate,
            maxChaseTime: this.maxChaseTime,
            knockbackForce: this.knockbackForce,
            knockbackEnabled: this.knockbackEnabled
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        if (!data) return;
        this.maxHealth = data.maxHealth || this.maxHealth;
        this.health = data.health !== undefined ? data.health : this.health;
        this.attackDamage = data.attackDamage !== undefined ? data.attackDamage : this.attackDamage;
        this.attackResistance = data.attackResistance !== undefined ? data.attackResistance : this.attackResistance;
        this.perceptionRange = data.perceptionRange !== undefined ? data.perceptionRange : this.perceptionRange;
        this.attackRange = data.attackRange !== undefined ? data.attackRange : this.attackRange;
        this.hunger = data.hunger !== undefined ? data.hunger : this.hunger;
        this.hungerRate = data.hungerRate !== undefined ? data.hungerRate : this.hungerRate;
        this.hungerThreshold = data.hungerThreshold !== undefined ? data.hungerThreshold : this.hungerThreshold;
        this.diet = data.diet || this.diet;
        this.aggression = data.aggression !== undefined ? data.aggression : this.aggression;
        this.fear = data.fear !== undefined ? data.fear : this.fear;
        this.defendOnly = data.defendOnly !== undefined ? data.defendOnly : this.defendOnly;
        this.familyGroup = data.familyGroup || this.familyGroup;
        this.leaderName = data.leaderName || this.leaderName;
        this.followLeader = data.followLeader !== undefined ? data.followLeader : this.followLeader;
        this.nestPosition = data.nestPosition || this.nestPosition;
        this.wanderRadius = data.wanderRadius || this.wanderRadius;
        this.collectFoodForNest = data.collectFoodForNest !== undefined ? data.collectFoodForNest : this.collectFoodForNest;
        this.eatDuration = data.eatDuration || this.eatDuration;
        this.maxInventorySize = data.maxInventorySize || this.maxInventorySize;
        this.overrideCreatureMovement = data.overrideCreatureMovement !== undefined ? data.overrideCreatureMovement : this.overrideCreatureMovement;
        this.playerControlled = data.playerControlled !== undefined ? data.playerControlled : this.playerControlled;
        this.bloodParticleObjectName = data.bloodParticleObjectName || this.bloodParticleObjectName;
        this.combatExperience = data.combatExperience || 0;
        this.battlesWon = data.battlesWon || 0;
        this.statGrowthRate = data.statGrowthRate !== undefined ? data.statGrowthRate : this.statGrowthRate;
        this.maxChaseTime = data.maxChaseTime !== undefined ? data.maxChaseTime : this.maxChaseTime;
        this.knockbackForce = data.knockbackForce !== undefined ? data.knockbackForce : this.knockbackForce;
        this.knockbackEnabled = data.knockbackEnabled !== undefined ? data.knockbackEnabled : this.knockbackEnabled;
    }
}

window.CreatureAI = CreatureAI;
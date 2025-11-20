class ItemModule extends Module {
    static namespace = "World";
    static description = "Simple item module (food, tool, etc.)";
    static allowMultiple = false;
    static iconClass = "fas fa-box";

    constructor() {
        super("ItemModule");

        // Core attributes
        this.itemName = "Item";
        this.itemType = "generic"; // generic, food, tool, weapon, resource
        this.isTool = false;
        this.isFood = false;
        this.nutrition = 0; // amount of hunger restored if food
        this.dietTags = ["herbivore","omnivore","carnivore"]; // optional intended diets
        this.weight = 1;
        this.durability = 0; // if 0, infinite or not applicable
        this.metadata = {}; // free-form data

        // runtime state
        this.heldBy = null; // gameObject name that holds it
        this.pickedUp = false;

        // Expose for editor
        this.exposeProperty("itemName", "string", this.itemName);
        this.exposeProperty("itemType", "string", this.itemType);
        this.exposeProperty("isTool", "boolean", this.isTool);
        this.exposeProperty("isFood", "boolean", this.isFood);
        this.exposeProperty("nutrition", "number", this.nutrition);
        this.exposeProperty("weight", "number", this.weight);
        this.exposeProperty("durability", "number", this.durability);
    }

    start() {
        // Mark gameObject as an item for quick scanning
        if (this.gameObject) {
            this.gameObject.tag = this.gameObject.tag || "item";
            this.gameObject.itemData = this.gameObject.itemData || {};
            Object.assign(this.gameObject.itemData, {
                name: this.itemName,
                type: this.itemType,
                isTool: this.isTool,
                isFood: this.isFood,
                nutrition: this.nutrition,
                weight: this.weight,
                durability: this.durability,
                metadata: this.metadata
            });
        }
    }

    /**
     * Pick up the item by a gameObject (owner)
     * @param {Object} ownerGameObject
     * @returns {boolean}
     */
    pickUp(ownerGameObject) {
        if (!this.gameObject || !ownerGameObject) return false;
        if (this.pickedUp) return false;
        this.pickedUp = true;
        this.heldBy = ownerGameObject.name || ownerGameObject.id || null;

        // Hide/attach to owner: simple approach - set position to owner and mark invisible
        if (this.gameObject.renderer) {
            this.gameObject.renderer.visible = false;
        }
        // Attach info for owner
        ownerGameObject.inventory = ownerGameObject.inventory || [];
        ownerGameObject.inventory.push(this.gameObject);

        return true;
    }

    /**
     * Drop the item at a world position or next to owner
     * @param {Object} [position] - {x,y} or null to drop at holder position
     * @returns {boolean}
     */
    drop(position = null) {
        if (!this.gameObject) return false;
        if (!this.pickedUp) return false;

        const holderName = this.heldBy;
        let holder = null;
        if (holderName && window.engine && window.engine.gameObjects) {
            holder = window.engine.gameObjects.find(g => g.name === holderName);
        }

        // Remove from holder inventory
        if (holder && holder.inventory) {
            const idx = holder.inventory.indexOf(this.gameObject);
            if (idx >= 0) holder.inventory.splice(idx, 1);
        }

        // Place into world
        if (position && position.x !== undefined) {
            this.gameObject.position.x = position.x;
            this.gameObject.position.y = position.y;
        } else if (holder) {
            const wp = holder.getWorldPosition ? holder.getWorldPosition() : holder.position;
            this.gameObject.position.x = wp.x + (Math.random() - 0.5) * 8;
            this.gameObject.position.y = wp.y + (Math.random() - 0.5) * 8;
        }

        // Make visible
        if (this.gameObject.renderer) {
            this.gameObject.renderer.visible = true;
        }

        this.pickedUp = false;
        this.heldBy = null;
        return true;
    }

    /**
     * Use the item by a user GameObject
     * For food, restores hunger/nutrition. For tools, calls metadata.useAction if present.
     * @param {Object} userGameObject
     * @returns {Object} - {success:boolean, result:any}
     */
    use(userGameObject) {
        if (!this.gameObject || !userGameObject) return { success: false };

        // If food
        if (this.isFood) {
            // Apply nutrition to user if they have an AI module with hunger
            const ai = userGameObject.getModule ? userGameObject.getModule("CreatureAI") : null;
            if (ai && typeof ai.modifyHunger === "function") {
                ai.modifyHunger(-this.nutrition); // negative reduces hunger
            }
            // Optionally destroy item after use
            if (this.durability > 0) {
                this.durability -= 1;
                if (this.durability <= 0) {
                    // remove from world
                    if (this.gameObject.destroy) this.gameObject.destroy();
                }
            } else {
                // single-use food: destroy
                if (this.gameObject.destroy) this.gameObject.destroy();
            }
            return { success: true, result: { nutrition: this.nutrition } };
        }

        // Tools / generic use
        if (this.metadata && typeof this.metadata.useAction === "function") {
            try {
                const result = this.metadata.useAction(userGameObject, this.gameObject);
                return { success: true, result };
            } catch (e) {
                return { success: false, error: e.message || String(e) };
            }
        }

        // Not used
        return { success: false, result: null };
    }

    toJSON() {
        return {
            ...super.toJSON(),
            itemName: this.itemName,
            itemType: this.itemType,
            isTool: this.isTool,
            isFood: this.isFood,
            nutrition: this.nutrition,
            weight: this.weight,
            durability: this.durability,
            metadata: this.metadata
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        if (!data) return;
        this.itemName = data.itemName || this.itemName;
        this.itemType = data.itemType || this.itemType;
        this.isTool = data.isTool !== undefined ? data.isTool : this.isTool;
        this.isFood = data.isFood !== undefined ? data.isFood : this.isFood;
        this.nutrition = data.nutrition || this.nutrition;
        this.weight = data.weight || this.weight;
        this.durability = data.durability || this.durability;
        this.metadata = data.metadata || this.metadata;
    }
}

window.ItemModule = ItemModule;
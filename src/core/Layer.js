/**
 * Layer class for organizing game objects in scenes
 */
class Layer {
    constructor(name = "Layer", id = null) {
        this.name = name;
        this.id = id || crypto.randomUUID();
        this.gameObjects = [];
        this.visible = true;
        this.locked = false;
        this.color = this.generateRandomColor();
        this.depth = 0; // Base depth for all objects in this layer
        this.editorExpanded = true; // Whether layer is expanded in editor
    }

    generateRandomColor() {
        // Generate a semi-bright color for better visibility on dark backgrounds
        const hue = Math.floor(Math.random() * 360);
        const saturation = 70;
        const lightness = 60;

        // Convert HSL to hex
        const c = (1 - Math.abs(2 * lightness / 100 - 1)) * saturation / 100;
        const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
        const m = lightness / 100 - c / 2;

        let r, g, b;
        if (hue >= 0 && hue < 60) {
            r = c; g = x; b = 0;
        } else if (hue >= 60 && hue < 120) {
            r = x; g = c; b = 0;
        } else if (hue >= 120 && hue < 180) {
            r = 0; g = c; b = x;
        } else if (hue >= 180 && hue < 240) {
            r = 0; g = x; b = c;
        } else if (hue >= 240 && hue < 300) {
            r = x; g = 0; b = c;
        } else {
            r = c; g = 0; b = x;
        }

        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        b = Math.round((b + m) * 255);

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    /**
     * Add a game object to this layer
     * @param {GameObject} gameObject - The game object to add
     */
    addGameObject(gameObject) {
        if (!this.gameObjects.includes(gameObject)) {
            this.gameObjects.push(gameObject);
            gameObject.layer = this;
            gameObject.depth += this.depth; // Offset depth by layer base depth
        }
    }

    /**
     * Remove a game object from this layer
     * @param {GameObject} gameObject - The game object to remove
     */
    removeGameObject(gameObject) {
        const index = this.gameObjects.indexOf(gameObject);
        if (index !== -1) {
            this.gameObjects.splice(index, 1);
            gameObject.layer = null;
            gameObject.depth -= this.depth; // Remove layer depth offset
        }
    }

    /**
     * Get all game objects in this layer (including children)
     * @returns {Array<GameObject>} All game objects in this layer
     */
    getAllGameObjects() {
        const allObjects = [];

        const collectObjects = (objects) => {
            for (const obj of objects) {
                allObjects.push(obj);
                if (obj.children && obj.children.length > 0) {
                    collectObjects(obj.children);
                }
            }
        };

        collectObjects(this.gameObjects);
        return allObjects;
    }

    /**
     * Find a game object by name in this layer
     * @param {string} name - The name to search for
     * @returns {GameObject|null} The found game object or null
     */
    findGameObjectByName(name) {
        return this.findGameObjectByNameRecursive(this.gameObjects, name);
    }

    /**
     * Recursively search for a game object by name
     * @param {Array<GameObject>} objects - Objects to search
     * @param {string} name - Name to search for
     * @returns {GameObject|null} Found object or null
     */
    findGameObjectByNameRecursive(objects, name) {
        for (const obj of objects) {
            if (obj.name === name) {
                return obj;
            }

            if (obj.children && obj.children.length > 0) {
                const found = this.findGameObjectByNameRecursive(obj.children, name);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    }

    /**
     * Set the visibility of all game objects in this layer
     * @param {boolean} visible - Whether objects should be visible
     */
    setVisibility(visible) {
        this.visible = visible;
        for (const gameObject of this.gameObjects) {
            gameObject.visible = visible;
        }
    }

    /**
     * Set the active state of all game objects in this layer
     * @param {boolean} active - Whether objects should be active
     */
    setActive(active) {
        for (const gameObject of this.gameObjects) {
            gameObject.active = active;
        }
    }

    /**
     * Get the bounding box of all objects in this layer
     * @returns {Object} Bounding box with x, y, width, height
     */
    getBounds() {
        if (this.gameObjects.length === 0) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const gameObject of this.getAllGameObjects()) {
            const worldPos = gameObject.getWorldPosition();
            const size = gameObject.size || { x: 50, y: 50 };

            minX = Math.min(minX, worldPos.x - size.x / 2);
            minY = Math.min(minY, worldPos.y - size.y / 2);
            maxX = Math.max(maxX, worldPos.x + size.x / 2);
            maxY = Math.max(maxY, worldPos.y + size.y / 2);
        }

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    /**
     * Serialize this layer to JSON
     * @returns {Object} Serialized layer data
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            visible: this.visible,
            locked: this.locked,
            color: this.color,
            depth: this.depth,
            editorExpanded: this.editorExpanded,
            gameObjectIds: this.gameObjects.map(obj => obj.id)
        };
    }

    /**
     * Create a layer from JSON data
     * @param {Object} json - Serialized layer data
     * @returns {Layer} The created layer
     */
    static fromJSON(json) {
        const layer = new Layer(json.name, json.id);
        layer.visible = json.visible !== undefined ? json.visible : true;
        layer.locked = json.locked !== undefined ? json.locked : false;
        layer.color = json.color || layer.generateRandomColor();
        layer.depth = json.depth || 0;
        layer.editorExpanded = json.editorExpanded !== undefined ? json.editorExpanded : true;
        return layer;
    }
}

window.Layer = Layer;
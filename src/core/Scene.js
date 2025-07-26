class Scene {
    constructor(name = "New Scene") {
        this.name = name;
        this.path = null; // Store file path when saved
        this.gameObjects = [];
        this.settings = {
            viewportWidth: 1280,
            viewportHeight: 720,
            viewportX: 0,  
            viewportY: 0,
            backgroundColor: "#1e1e1e",
            gridEnabled: true,
            gridSize: 32,
            snapToGrid: false
        };
        this.dirty = false; // Track unsaved changes
    }

    markDirty() {
        this.dirty = true;
    }

    toJSON() {
        return {
            name: this.name,
            settings: {
                viewportWidth: this.settings.viewportWidth,
                viewportHeight: this.settings.viewportHeight,
                viewportX: this.settings.viewportX || 0,
                viewportY: this.settings.viewportY || 0,
                backgroundColor: this.settings.backgroundColor,
                gridEnabled: this.settings.gridEnabled,
                gridSize: this.settings.gridSize,
                snapToGrid: this.settings.snapToGrid,
                gravity: { x: 0, y: 1 },       // Physics gravity direction
                physicsEnabled: true,          // Whether physics is enabled
                physicsDebugDraw: false   
            },
            gameObjects: this.gameObjects.filter(obj => !obj.parent).map(obj => obj.toJSON())
        };
    }

    static fromJSON(json) {
        const scene = new Scene(json.name);
        scene.settings = json.settings || {};
        
        // Restore other scene properties
        scene.activeCamera = json.activeCamera;
        
        // Create gameObjects if we have GameObject reference
        if (typeof GameObject !== 'undefined' || window.GameObject) {
            // Use the appropriate GameObject reference
            const GameObjectRef = typeof GameObject !== 'undefined' ? GameObject : window.GameObject;
            
            // Create gameObjects
            scene.gameObjects = json.gameObjects.map(objJson => {
                return GameObjectRef.fromJSON(objJson);
            });
        } else {
            // If GameObject isn't available, store the JSON for later
            scene.gameObjectsJSON = json.gameObjects;
            scene.gameObjects = [];
            console.warn("GameObject class not available. Game objects will be loaded when GameObject class is available.");
        }
        
        return scene;
    }

    completeLoading() {
        if (this.gameObjectsJSON && (typeof GameObject !== 'undefined' || window.GameObject)) {
            const GameObjectRef = typeof GameObject !== 'undefined' ? GameObject : window.GameObject;
            this.gameObjects = this.gameObjectsJSON.map(objJson => {
                return GameObjectRef.fromJSON(objJson);
            });
            delete this.gameObjectsJSON;
            return true;
        }
        return false;
    }

    // Add engine integration methods
    attachToEngine(engine) {
        engine.scene = this;
        engine.gameObjects = this.gameObjects;
    }

    /**
     * Find a GameObject by name in the scene
     * @param {string} name - The name of the GameObject to find
     * @returns {GameObject|null} The found GameObject or null if not found
     */
    findGameObjectByName(name) {
        return this.findGameObjectByNameRecursive(this.gameObjects, name);
    }

    /**
     * Recursively search for a GameObject by name
     * @param {Array} objects - Array of GameObjects to search
     * @param {string} name - The name to search for
     * @returns {GameObject|null} The found GameObject or null if not found
     */
    findGameObjectByNameRecursive(objects, name) {
        for (const obj of objects) {
            if (obj.name === name) {
                return obj;
            }
            
            // Search in children if they exist
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
     * Alias for findGameObjectByName for consistency with documentation
     * @param {string} name - The name of the GameObject to find
     * @returns {GameObject|null} The found GameObject or null if not found
     */
    findGameObject(name) {
        return this.findGameObjectByName(name);
    }
}

// Expose global function for dynamic modules
window.findGameObjectByName = function(name) {
    // Assumes you have a global reference to the current scene
    if (window.activeScene && typeof window.activeScene.findGameObjectByName === "function") {
        return window.activeScene.findGameObjectByName(name);
    }
    console.warn("No active scene or findGameObjectByName not available.");
    return null;
};
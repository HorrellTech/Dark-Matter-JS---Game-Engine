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
                snapToGrid: this.settings.snapToGrid
            },
            gameObjects: this.gameObjects.filter(obj => !obj.parent).map(obj => obj.toJSON())
        };
    }

    static fromJSON(json) {
        const scene = new Scene(json.name);

        // Apply settings
        scene.settings = {
            viewportWidth: json.settings.viewportWidth || 800,
            viewportHeight: json.settings.viewportHeight || 600,
            viewportX: json.settings.viewportX || 0,
            viewportY: json.settings.viewportY || 0,
            backgroundColor: json.settings.backgroundColor || "#000000",
            gridEnabled: json.settings.gridEnabled !== undefined ? json.settings.gridEnabled : true,
            gridSize: json.settings.gridSize || 32,
            snapToGrid: json.settings.snapToGrid || false
        };
        
        scene.gameObjects = json.gameObjects.map(objData => GameObject.fromJSON(objData));
        return scene;
    }

    // Add engine integration methods
    attachToEngine(engine) {
        engine.scene = this;
        engine.gameObjects = this.gameObjects;
    }
}
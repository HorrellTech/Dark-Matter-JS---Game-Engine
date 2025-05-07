class Scene {
    constructor(name = "New Scene") {
        this.name = name;
        this.path = null; // Store file path when saved
        this.gameObjects = [];
        this.settings = {
            viewportWidth: 1280,
            viewportHeight: 720,
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
            settings: { ...this.settings },
            gameObjects: this.gameObjects.map(obj => obj.toJSON())
        };
    }

    static fromJSON(json) {
        const scene = new Scene(json.name);
        scene.settings = { ...json.settings };
        scene.gameObjects = json.gameObjects.map(objData => GameObject.fromJSON(objData));
        return scene;
    }

    // Add engine integration methods
    attachToEngine(engine) {
        engine.scene = this;
        engine.gameObjects = this.gameObjects;
    }
}
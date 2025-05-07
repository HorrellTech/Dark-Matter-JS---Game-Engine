class SceneBuffer {
    constructor() {
        this.bufferedScene = null;
        this.defaultSceneName = "Untitled Scene";
        this.nextBufferId = 1;
    }

    createNewScene() {
        const scene = new Scene(this.getNextBufferName());
        scene.dirty = true; // Mark as unsaved
        scene.isBuffered = true;
        return scene;
    }

    getNextBufferName() {
        return `${this.defaultSceneName} ${this.nextBufferId++}`;
    }
}
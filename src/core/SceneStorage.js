class SceneStorage {
    static getLocalSceneList() {
        const list = localStorage.getItem('sceneList');
        return list ? JSON.parse(list) : [];
    }

    static saveLocalScene(scene) {
        const sceneData = scene.toJSON();
        const sceneList = this.getLocalSceneList();
        
        // Update or add scene
        const existingIndex = sceneList.findIndex(s => s.name === scene.name);
        if (existingIndex >= 0) {
            sceneList[existingIndex] = { name: scene.name, data: sceneData };
        } else {
            sceneList.push({ name: scene.name, data: sceneData });
        }
        
        localStorage.setItem('sceneList', JSON.stringify(sceneList));
        localStorage.setItem(`scene_${scene.name}`, JSON.stringify(sceneData));
    }

    static loadLocalScene(name) {
        const sceneData = localStorage.getItem(`scene_${name}`);
        if (!sceneData) return null;
        
        const scene = Scene.fromJSON(JSON.parse(sceneData));
        scene.name = name;
        scene.isLocal = true;
        return scene;
    }

    static deleteLocalScene(name) {
        const sceneList = this.getLocalSceneList();
        const updatedList = sceneList.filter(s => s.name !== name);
        localStorage.setItem('sceneList', JSON.stringify(updatedList));
        localStorage.removeItem(`scene_${name}`);
    }
}
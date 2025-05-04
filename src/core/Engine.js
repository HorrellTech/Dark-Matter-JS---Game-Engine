class Engine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gameObjects = [];
        this.lastTime = 0;
        this.running = false;
        this.preloaded = false;
    }

    async preload() {
        for (const obj of this.gameObjects) {
            await obj.preload();
        }
        this.preloaded = true;
    }

    async start() {
        if (!this.preloaded) {
            await this.preload();
        }
        
        this.gameObjects.forEach(obj => obj.start());
        this.running = true;
        this.gameLoop(0);
    }

    stop() {
        this.running = false;
        this.gameObjects.forEach(obj => obj.onDestroy());
    }

    gameLoop(timestamp) {
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.beginLoop();
        this.loop(deltaTime);
        this.endLoop();
        this.draw();

        if (this.running) {
            requestAnimationFrame(this.gameLoop.bind(this));
        }
    }

    beginLoop() {
        this.gameObjects.forEach(obj => obj.beginLoop());
    }

    loop(deltaTime) {
        this.gameObjects.forEach(obj => obj.loop(deltaTime));
    }

    endLoop() {
        this.gameObjects.forEach(obj => obj.endLoop());
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // Sort game objects by depth
        const sortedObjects = [...this.gameObjects].sort((a, b) => a.depth - b.depth);
        sortedObjects.forEach(obj => obj.draw(this.ctx));
    }
}

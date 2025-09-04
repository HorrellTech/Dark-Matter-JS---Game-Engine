class ObjectTiling extends Module {
    static namespace = "Objects";
    static description = "Tiles objects in a finite or infinite grid, with removable objects";
    static allowMultiple = false;
    static iconClass = "fas fa-th-large";

    constructor() {
        super("ObjectTiling");

        this.ignoreGameObjectTransform = true; // Since we're managing positions manually

        // Exposed properties
        this.objectName = ""; // Name of the object to tile
        this.tileWidth = 64; // Width of each tile
        this.tileHeight = 64; // Height of each tile
        this.xCount = 5; // Number of tiles across (for finite mode)
        this.yCount = 5; // Number of tiles down (for finite mode)
        this.infinite = false; // Enable infinite tiling
        this.spacingX = 0; // Additional spacing between tiles horizontally
        this.spacingY = 0; // Additional spacing between tiles vertically
        this.chunkSize = 512; // Size of chunks for infinite mode (in world units)
        this.paddingChunks = 1; // Extra chunks to preload around viewport

        // Internal
        this._originalObject = null; // Reference to the original object
        this._tiledObjects = []; // Array of cloned objects for finite mode
        this._chunkCache = new Map(); // Map for infinite mode: key "cx,cy" => array of objects
        this._lastViewportKey = "";
        this._needsRebuild = false; // Flag to indicate if tiling needs to be rebuilt

        // Expose properties
        this.exposeProperty("objectName", "string", this.objectName, { onChange: (v) => { this.objectName = v; this._scheduleRebuild(); } });
        this.exposeProperty("tileWidth", "number", this.tileWidth, { min: 1, max: 1000, step: 1, onChange: (v) => { this.tileWidth = v; this._scheduleRebuild(); } });
        this.exposeProperty("tileHeight", "number", this.tileHeight, { min: 1, max: 1000, step: 1, onChange: (v) => { this.tileHeight = v; this._scheduleRebuild(); } });
        this.exposeProperty("xCount", "number", this.xCount, { min: 1, max: 100, step: 1, onChange: (v) => { this.xCount = v; this._scheduleRebuild(); } });
        this.exposeProperty("yCount", "number", this.yCount, { min: 1, max: 100, step: 1, onChange: (v) => { this.yCount = v; this._scheduleRebuild(); } });
        this.exposeProperty("infinite", "boolean", this.infinite, { onChange: (v) => { this.infinite = v; this._scheduleRebuild(); } });
        this.exposeProperty("spacingX", "number", this.spacingX, { min: 0, max: 100, step: 1, onChange: (v) => { this.spacingX = v; this._scheduleRebuild(); } });
        this.exposeProperty("spacingY", "number", this.spacingY, { min: 0, max: 100, step: 1, onChange: (v) => { this.spacingY = v; this._scheduleRebuild(); } });
        this.exposeProperty("chunkSize", "number", this.chunkSize, { min: 64, max: 2048, step: 64, onChange: (v) => { this.chunkSize = v; this._scheduleRebuild(); } });
        this.exposeProperty("paddingChunks", "number", this.paddingChunks, { min: 0, max: 4, step: 1 });
    }

    style(style) {
        style.startGroup("Object Settings", false, { backgroundColor: 'rgba(150,200,150,0.1)', padding: 8, borderRadius: 6 });
        style.exposeProperty("objectName", "string", this.objectName, { label: "Object Name" });
        style.exposeProperty("infinite", "boolean", this.infinite, { label: "Infinite Tiling" });
        style.endGroup();

        style.addDivider();

        style.startGroup("Tile Dimensions", false, { backgroundColor: 'rgba(200,200,255,0.1)', padding: 8, borderRadius: 6 });
        style.exposeProperty("tileWidth", "number", this.tileWidth, { label: "Tile Width" });
        style.exposeProperty("tileHeight", "number", this.tileHeight, { label: "Tile Height" });
        style.exposeProperty("spacingX", "number", this.spacingX, { label: "Horizontal Spacing" });
        style.exposeProperty("spacingY", "number", this.spacingY, { label: "Vertical Spacing" });
        style.endGroup();

        if (!this.infinite) {
            style.addDivider();
            style.startGroup("Finite Grid", false, { backgroundColor: 'rgba(255,200,200,0.1)', padding: 8, borderRadius: 6 });
            style.exposeProperty("xCount", "number", this.xCount, { label: "Tiles Across" });
            style.exposeProperty("yCount", "number", this.yCount, { label: "Tiles Down" });
            style.endGroup();
        } else {
            style.addDivider();
            style.startGroup("Infinite Settings", false, { backgroundColor: 'rgba(255,255,200,0.1)', padding: 8, borderRadius: 6 });
            style.exposeProperty("chunkSize", "number", this.chunkSize, { label: "Chunk Size" });
            style.exposeProperty("paddingChunks", "number", this.paddingChunks, { label: "Padding Chunks" });
            style.endGroup();
        }
    }

    preload() {
    }

    start() {
        // Find the original object and create tiling if needed
        this._findOriginalObject();
        if (this._originalObject && this.gameObject) {
            if (!this.infinite) {
                this._createFiniteGrid();
            }
        } else {
            // Schedule rebuild for next frame if gameObject isn't ready yet
            this._scheduleRebuild();
        }
    }

    loop(deltaTime) {
        // Check if we need to rebuild the tiling
        if (this._needsRebuild && this.gameObject) {
            this._needsRebuild = false;
            this._resetTiling();
        }

        if (!this.infinite || !window.engine || !window.engine.viewport || !this.gameObject) return;

        const vp = window.engine.viewport;
        const worldTop = vp.y - vp.height / 2;
        const worldLeft = vp.x - vp.width / 2;
        const worldRight = vp.x + vp.width / 2;
        const worldBottom = vp.y + vp.height / 2;

        const minCx = Math.floor((worldLeft - this.gameObject.position.x) / this.chunkSize) - this.paddingChunks;
        const maxCx = Math.floor((worldRight - this.gameObject.position.x) / this.chunkSize) + this.paddingChunks;
        const minCy = Math.floor((worldTop - this.gameObject.position.y) / this.chunkSize) - this.paddingChunks;
        const maxCy = Math.floor((worldBottom - this.gameObject.position.y) / this.chunkSize) + this.paddingChunks;

        const currentKeys = new Set();

        for (let cx = minCx; cx <= maxCx; cx++) {
            for (let cy = minCy; cy <= maxCy; cy++) {
                const key = this._chunkKey(cx, cy);
                currentKeys.add(key);
                this._ensureChunkAt(cx, cy);
            }
        }

        // Remove chunks outside view
        for (const key of this._chunkCache.keys()) {
            if (!currentKeys.has(key)) {
                const objects = this._chunkCache.get(key);
                objects.forEach(obj => {
                    if (obj.parent) obj.parent.removeChild(obj);
                    if (window.engine && window.engine.removeDynamicObject) {
                        window.engine.removeDynamicObject(obj);
                    }
                });
                this._chunkCache.delete(key);
            }
        }
    }

    draw(ctx) {
        // Objects draw themselves; no need for custom drawing
    }

    drawGizmos(ctx) {
        // Only draw gizmos if gameObject is available
        if (!this.gameObject) return;
        
        // Optional: Draw grid lines or something
        ctx.strokeStyle = "rgba(0,255,0,0.5)";
        ctx.lineWidth = 1;
        if (!this.infinite) {
            for (let x = 0; x <= this.xCount; x++) {
                ctx.beginPath();
                ctx.moveTo(x * (this.tileWidth + this.spacingX), 0);
                ctx.lineTo(x * (this.tileWidth + this.spacingX), this.yCount * (this.tileHeight + this.spacingY));
                ctx.stroke();
            }
            for (let y = 0; y <= this.yCount; y++) {
                ctx.beginPath();
                ctx.moveTo(0, y * (this.tileHeight + this.spacingY));
                ctx.lineTo(this.xCount * (this.tileWidth + this.spacingX), y * (this.tileHeight + this.spacingY));
                ctx.stroke();
            }
        }
    }

    onDestroy() {
        this._clearAllObjects();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            objectName: this.objectName,
            tileWidth: this.tileWidth,
            tileHeight: this.tileHeight,
            xCount: this.xCount,
            yCount: this.yCount,
            infinite: this.infinite,
            spacingX: this.spacingX,
            spacingY: this.spacingY,
            chunkSize: this.chunkSize,
            paddingChunks: this.paddingChunks
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        if (!data) return;
        this.objectName = data.objectName ?? this.objectName;
        this.tileWidth = data.tileWidth ?? this.tileWidth;
        this.tileHeight = data.tileHeight ?? this.tileHeight;
        this.xCount = data.xCount ?? this.xCount;
        this.yCount = data.yCount ?? this.yCount;
        this.infinite = data.infinite ?? this.infinite;
        this.spacingX = data.spacingX ?? this.spacingX;
        this.spacingY = data.spacingY ?? this.spacingY;
        this.chunkSize = data.chunkSize ?? this.chunkSize;
        this.paddingChunks = data.paddingChunks ?? this.paddingChunks;
        
        // Schedule rebuild instead of doing it immediately
        this._scheduleRebuild();
    }

    // Internal methods
    _scheduleRebuild() {
        this._needsRebuild = true;
    }

    _findOriginalObject() {
        if (this.objectName) {
            this._originalObject = window.engine?.findGameObjectByName(this.objectName);
            if (!this._originalObject) {
                console.warn(`ObjectTiling: Object with name "${this.objectName}" not found.`);
            }
        } else {
            this._originalObject = null;
        }
    }

    _resetTiling() {
        this._clearAllObjects();
        this._chunkCache.clear();
        this._findOriginalObject();
        if (this._originalObject && this.gameObject) {
            if (!this.infinite) {
                this._createFiniteGrid();
            }
        }
    }

    _clearAllObjects() {
        this._tiledObjects.forEach(obj => {
            if (obj.parent) obj.parent.removeChild(obj);
            if (window.engine && window.engine.removeDynamicObject) {
                window.engine.removeDynamicObject(obj);
            }
        });
        this._tiledObjects = [];
        
        for (const objects of this._chunkCache.values()) {
            objects.forEach(obj => {
                if (obj.parent) obj.parent.removeChild(obj);
                if (window.engine && window.engine.removeDynamicObject) {
                    window.engine.removeDynamicObject(obj);
                }
            });
        }
        this._chunkCache.clear();
    }

    _createFiniteGrid() {
        if (!this._originalObject || !this.gameObject) return;
        
        for (let x = 0; x < this.xCount; x++) {
            for (let y = 0; y < this.yCount; y++) {
                const clone = this._originalObject.clone();
                clone.position.x = this.gameObject.position.x + x * (this.tileWidth + this.spacingX);
                clone.position.y = this.gameObject.position.y + y * (this.tileHeight + this.spacingY);
                this.gameObject.addChild(clone);
                this._tiledObjects.push(clone);
                if (window.engine && window.engine.dynamicObjects) {
                    window.engine.dynamicObjects.add(clone);
                }
            }
        }
    }

    _chunkKey(cx, cy) {
        return `${cx},${cy}`;
    }

    _ensureChunkAt(cx, cy) {
        const key = this._chunkKey(cx, cy);
        if (this._chunkCache.has(key)) return;
        const objects = this._createChunkObjects(cx, cy);
        this._chunkCache.set(key, objects);
    }

    _createChunkObjects(cx, cy) {
        if (!this._originalObject || !this.gameObject) return [];
        
        const objects = [];
        const tilesPerChunkX = Math.floor(this.chunkSize / (this.tileWidth + this.spacingX));
        const tilesPerChunkY = Math.floor(this.chunkSize / (this.tileHeight + this.spacingY));
        
        for (let x = 0; x < tilesPerChunkX; x++) {
            for (let y = 0; y < tilesPerChunkY; y++) {
                const clone = this._originalObject.clone();
                clone.position.x = this.gameObject.position.x + cx * this.chunkSize + x * (this.tileWidth + this.spacingX);
                clone.position.y = this.gameObject.position.y + cy * this.chunkSize + y * (this.tileHeight + this.spacingY);
                this.gameObject.addChild(clone);
                objects.push(clone);
                if (window.engine && window.engine.dynamicObjects) {
                    window.engine.dynamicObjects.add(clone);
                }
            }
        }
        return objects;
    }

    // Public method to remove a specific object
    removeObject(obj) {
        const index = this._tiledObjects.indexOf(obj);
        if (index > -1) {
            this._tiledObjects.splice(index, 1);
        }
        for (const [key, objects] of this._chunkCache) {
            const objIndex = objects.indexOf(obj);
            if (objIndex > -1) {
                objects.splice(objIndex, 1);
                break;
            }
        }
        if (obj.parent) obj.parent.removeChild(obj);
        if (window.engine && window.engine.removeDynamicObject) {
            window.engine.removeDynamicObject(obj);
        }
    }
}

window.ObjectTiling = ObjectTiling;
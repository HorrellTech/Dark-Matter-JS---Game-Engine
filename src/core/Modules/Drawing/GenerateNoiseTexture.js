class GenerateNoiseTexture extends Module {
    static namespace = "Drawing";
    static description = "Generates an infinitely tiled noise-based texture (chunked) with per-point color variation";
    static allowMultiple = false;
    static iconClass = "fas fa-th";

    constructor() {
        super("GenerateNoiseTexture");

        // Exposed properties - increased defaults for more visible noise
        this.seed = 12345;
        this.chunkSize = 128; // pixels per chunk (square)
        this.pixelScale = 1; // how many world pixels per generated pixel (1 = 1:1)
        this.octaves = 3;
        this.persistence = 0.5;
        this.lacunarity = 2.0;
        this.frequency = 0.05; // increased for more detail
        this.colorA = "#4caf50"; // base color
        this.colorB = "#6b923fff"; // secondary color
        this.colorVariation = 0.25; // increased for more variation
        this.paddingChunks = 1; // extra chunks beyond viewport for smoothness
        this.singleChunk = true; // new property for single square mode
        this.fileName = "generated_texture"; // name for the generated file

        // Update ignoreGameObjectTransform based on singleChunk
        this.ignoreGameObjectTransform = !this.singleChunk;

        // Internal
        this._chunkCache = new Map(); // key "cx,cy" => canvas
        this._prngState = this.seed;
        this._lastViewportKey = "";
        this._hasGenerated = false; // Track if we've generated a texture

        // Expose inspector properties
        this.exposeProperty("seed", "number", this.seed, { onChange: (v) => { this.seed = Math.floor(v); this._resetCache(); } });
        this.exposeProperty("chunkSize", "number", this.chunkSize, { min: 16, max: 1024, step: 8, onChange: (v) => { this.chunkSize = Math.max(16, Math.floor(v)); this._resetCache(); } });
        this.exposeProperty("pixelScale", "number", this.pixelScale, { min: 1, max: 8, step: 1, onChange: (v) => { this.pixelScale = Math.max(1, Math.floor(v)); this._resetCache(); } });
        this.exposeProperty("frequency", "number", this.frequency, { min: 0.0001, max: 0.1, step: 0.0001, onChange: (v) => { this.frequency = v; this._resetCache(); } });
        this.exposeProperty("octaves", "number", this.octaves, { min: 1, max: 8, step: 1, onChange: (v) => { this.octaves = Math.max(1, Math.floor(v)); this._resetCache(); } });
        this.exposeProperty("persistence", "number", this.persistence, { min: 0, max: 1, step: 0.01, onChange: (v) => { this.persistence = v; this._resetCache(); } });
        this.exposeProperty("lacunarity", "number", this.lacunarity, { min: 1, max: 4, step: 0.01, onChange: (v) => { this.lacunarity = v; this._resetCache(); } });
        this.exposeProperty("colorA", "color", this.colorA, { onChange: (v) => { this.colorA = v; this._resetCache(); } });
        this.exposeProperty("colorB", "color", this.colorB, { onChange: (v) => { this.colorB = v; this._resetCache(); } });
        this.exposeProperty("colorVariation", "number", this.colorVariation, { min: 0, max: 1, step: 0.01, onChange: (v) => { this.colorVariation = Math.max(0, Math.min(1, v)); this._resetCache(); } });
        this.exposeProperty("paddingChunks", "number", this.paddingChunks, { min: 0, max: 4, step: 1, onChange: (v) => { this.paddingChunks = Math.max(0, Math.floor(v)); } });
        this.exposeProperty("singleChunk", "boolean", this.singleChunk, { label: "Single Chunk", onChange: (v) => { this.singleChunk = v; this.ignoreGameObjectTransform = !v; this._resetCache(); } });
        this.exposeProperty("fileName", "text", this.fileName, { label: "File Name", onChange: (v) => { this.fileName = v; } });
    }

    style(style) {
        style.startGroup("Noise Image Generator", false, { backgroundColor: 'rgba(180,220,180,0.07)', padding: 8, borderRadius: 6 });
        style.exposeProperty("seed", "number", this.seed, { label: "Seed" });
        //style.exposeProperty("chunkSize", "number", this.chunkSize, { label: "Chunk Size" });
        style.exposeProperty("pixelScale", "number", this.pixelScale, { label: "Pixel Scale" });
        style.exposeProperty("frequency", "number", this.frequency, { label: "Frequency" });
        style.exposeProperty("octaves", "number", this.octaves, { label: "Octaves" });
        style.exposeProperty("persistence", "number", this.persistence, { label: "Persistence" });
        style.exposeProperty("lacunarity", "number", this.lacunarity, { label: "Lacunarity" });
        //style.exposeProperty("singleChunk", "boolean", this.singleChunk, { label: "Single Chunk" });
        style.endGroup();

        style.addDivider();

        style.startGroup("Colors", false, { backgroundColor: 'rgba(220,220,255,0.04)', padding: 8, borderRadius: 6 });
        style.exposeProperty("colorA", "color", this.colorA, { label: "Color A" });
        style.exposeProperty("colorB", "color", this.colorB, { label: "Color B" });
        style.exposeProperty("colorVariation", "number", this.colorVariation, { label: "Color Variation" });
        style.endGroup();

        style.addDivider();

        style.startGroup("Generation", false, { backgroundColor: 'rgba(255,220,180,0.04)', padding: 8, borderRadius: 6 });
        style.exposeProperty("fileName", "text", this.fileName, { label: "File Name" });
        style.addButton("Generate Texture", () => this.generateAndSaveTexture(), { 
            style: "background: #4CAF50; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;",
            label: "Generate & Save to File Browser"
        });
        style.endGroup();
    }

    // Called before game starts - no longer auto-generate
    preload() {
        this._resetPRNG();
        // Don't auto-generate anymore
    }

    start() {
        // nothing
    }

    loop(deltaTime) {
        // Only show preview if we have generated content
        if (!this._hasGenerated) return;

        if (!window.engine || !window.engine.viewport) return;
        const vp = window.engine.viewport;
        if (this.singleChunk) {
            this.ignoreGameObjectTransform = false;
            this._ensureChunkAt(0, 0);
            return;
        }

        this.ignoreGameObjectTransform = true;
        // Infinite mode logic
        const worldTop = vp.y - vp.height / 2;
        const worldLeft = vp.x - vp.width / 2;
        const worldRight = vp.x + vp.width / 2;
        const worldBottom = vp.y + vp.height / 2;

        const anchor = { x: vp.x, y: vp.y };
        const originX = Math.floor(anchor.x);
        const originY = Math.floor(anchor.y);

        const absoluteOriginCx = Math.floor(originX / this.chunkSize);
        const absoluteOriginCy = Math.floor(originY / this.chunkSize);

        const chunkWorldSize = this.chunkSize * this.pixelScale;

        const minCx = Math.floor((worldLeft - originX) / chunkWorldSize) - this.paddingChunks;
        const maxCx = Math.floor((worldRight - originX) / chunkWorldSize) + this.paddingChunks;
        const minCy = Math.floor((worldTop - originY) / chunkWorldSize) - this.paddingChunks;
        const maxCy = Math.floor((worldBottom - originY) / chunkWorldSize) + this.paddingChunks;

        const currentKeys = new Set();

        for (let cx = minCx; cx <= maxCx; cx++) {
            for (let cy = minCy; cy <= maxCy; cy++) {
                const absoluteCx = absoluteOriginCx + cx;
                const absoluteCy = absoluteOriginCy + cy;
                const key = this._chunkKey(absoluteCx, absoluteCy);
                currentKeys.add(key);
                this._ensureChunkAt(absoluteCx, absoluteCy);
            }
        }

        for (const key of this._chunkCache.keys()) {
            if (!currentKeys.has(key)) {
                this._chunkCache.delete(key);
            }
        }
    }

    draw(ctx) {
        // Only draw if we have generated content
        if (!this._hasGenerated) {
            // Draw a placeholder message
            ctx.save();
            ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
            ctx.font = "14px Arial";
            ctx.textAlign = "center";
            ctx.fillText("Click 'Generate Texture' to create content", 0, 0);
            ctx.restore();
            return;
        }

        if (!window.engine || !window.engine.viewport) return;
        const vp = window.engine.viewport;
        if (this.singleChunk) {
            const key = this._chunkKey(0, 0);
            if (this._chunkCache.has(key)) {
                const canvas = this._chunkCache.get(key);
                ctx.imageSmoothingEnabled = true;
                ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height);
            }
            return;
        }

        const anchor = { x: vp.x, y: vp.y };
        const originX = Math.floor(anchor.x);
        const originY = Math.floor(anchor.y);

        const absoluteOriginCx = Math.floor(originX / this.chunkSize);
        const absoluteOriginCy = Math.floor(originY / this.chunkSize);

        const chunkWorldSize = this.chunkSize * this.pixelScale;

        for (const [key, canvas] of this._chunkCache.entries()) {
            const [absoluteCx, absoluteCy] = key.split(",").map(Number);
            const worldX = absoluteCx * this.chunkSize;
            const worldY = absoluteCy * this.chunkSize;

            const sx = Math.round(worldX - vp.x);
            const sy = Math.round(worldY - vp.y);
            const sw = canvas.width;
            const sh = canvas.height;

            ctx = window.engine.getBackgroundCanvas();

            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(canvas, sx, sy, sw, sh);
        }
    }

    /**
     * Generate texture and save it to the file browser
     */
    async generateAndSaveTexture() {
        try {
            // Generate the texture
            this._resetPRNG();
            this._resetCache();
            
            // Generate a single chunk for the texture
            const canvas = this._generateChunkCanvas(0, 0);
            
            // Convert canvas to data URL
            const dataURL = canvas.toDataURL('image/png');
            
            // Get file browser instance
            const fileBrowser = window.editor?.fileBrowser || window.fileBrowser;
            if (!fileBrowser) {
                console.error('File browser not available');
                this.showNotification?.('File browser not available', 'error');
                return;
            }
            
            // Ensure file name has .png extension
            let fileName = this.fileName || 'generated_texture';
            if (!fileName.endsWith('.png')) {
                fileName += '.png';
            }
            
            // Create file path in current directory
            const currentPath = fileBrowser.currentPath || '/';
            const filePath = currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`;
            
            // Save to file browser
            const success = await fileBrowser.createFile(filePath, dataURL, true); // Allow overwrite
            
            if (success) {
                // Mark that we've generated content
                this._hasGenerated = true;
                
                // Show success message
                if (this.showNotification) {
                    this.showNotification(`Texture saved as ${fileName}`, 'success');
                } else {
                    console.log(`Texture saved as ${fileName}`);
                }
                
                // Refresh file browser to show new file
                await fileBrowser.refreshFiles();
            } else {
                if (this.showNotification) {
                    this.showNotification('Failed to save texture', 'error');
                } else {
                    console.error('Failed to save texture');
                }
            }
            
        } catch (error) {
            console.error('Error generating and saving texture:', error);
            if (this.showNotification) {
                this.showNotification('Error generating texture', 'error');
            }
        }
    }

    /**
     * Helper method to show notifications (tries multiple notification systems)
     */
    showNotification(message, type = 'info') {
        // Try multiple notification systems
        if (window.editor?.fileBrowser?.showNotification) {
            window.editor.fileBrowser.showNotification(message, type);
        } else if (window.fileBrowser?.showNotification) {
            window.fileBrowser.showNotification(message, type);
        } else {
            // Fallback to console
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    drawGizmos(ctx) {
        // Draw bounding box of single chunk at game object's position
        if (!this.singleChunk) return;
        ctx.strokeStyle = "rgba(0,0,255,0.5)";
        ctx.lineWidth = 1;
        if(this.ignoreGameObjectTransform) {
            ctx.strokeRect(this.gameObject.position.x, this.gameObject.position.y, this.chunkSize * this.pixelScale, this.chunkSize * this.pixelScale);
        } else {
            ctx.strokeRect(0, 0, this.chunkSize * this.pixelScale, this.chunkSize * this.pixelScale);
        }
    }

    onDestroy() {
        this._chunkCache.clear();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            seed: this.seed,
            chunkSize: this.chunkSize,
            pixelScale: this.pixelScale,
            frequency: this.frequency,
            octaves: this.octaves,
            persistence: this.persistence,
            lacunarity: this.lacunarity,
            colorA: this.colorA,
            colorB: this.colorB,
            colorVariation: this.colorVariation,
            paddingChunks: this.paddingChunks,
            singleChunk: this.singleChunk,
            fileName: this.fileName
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        if (!data) return;
        this.seed = data.seed ?? this.seed;
        this.chunkSize = data.chunkSize ?? this.chunkSize;
        this.pixelScale = data.pixelScale ?? this.pixelScale;
        this.frequency = data.frequency ?? this.frequency;
        this.octaves = data.octaves ?? this.octaves;
        this.persistence = data.persistence ?? this.persistence;
        this.lacunarity = data.lacunarity ?? this.lacunarity;
        this.colorA = data.colorA ?? this.colorA;
        this.colorB = data.colorB ?? this.colorB;
        this.colorVariation = data.colorVariation ?? this.colorVariation;
        this.paddingChunks = data.paddingChunks ?? this.paddingChunks;
        this.singleChunk = data.singleChunk ?? this.singleChunk;
        this.fileName = data.fileName ?? this.fileName;
        this.ignoreGameObjectTransform = !this.singleChunk;
        this._resetCache();
    }

    // ------------------------- 
    // Internal helpers (unchanged)
    // ------------------------- 
    _resetPRNG() {
        this._prngState = (this.seed >>> 0) || 0xDEADBEEF;
    }

    _prng() {
        let x = this._prngState;
        x ^= (x << 13);
        x ^= (x >>> 17);
        x ^= (x << 5);
        this._prngState = x >>> 0;
        return (this._prngState) / 0xFFFFFFFF;
    }

    _resetCache() {
        this._chunkCache.clear();
        this._resetPRNG();
        this._hasGenerated = false; // Reset generation flag when cache is reset
    }

    _chunkKey(cx, cy) {
        return `${cx},${cy}`;
    }

    _ensureChunkAt(cx, cy) {
        const key = this._chunkKey(cx, cy);
        if (this._chunkCache.has(key)) return;
        const canvas = this._generateChunkCanvas(cx, cy);
        this._chunkCache.set(key, canvas);
    }

    _generateChunkCanvas(cx, cy) {
        const width = this.chunkSize * this.pixelScale;
        const height = this.chunkSize * this.pixelScale;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        const img = ctx.createImageData(width, height);
        const data = img.data;

        const seed = this._hashInts(this.seed, cx, cy);
        let local = seed;
        const localRand = () => {
            local = (1664525 * local + 1013904223) >>> 0;
            return local / 4294967295;
        };

        const ca = this._parseColor(this.colorA);
        const cb = this._parseColor(this.colorB);

        for (let py = 0; py < height; py++) {
            for (let px = 0; px < width; px++) {
                const worldX = cx * this.chunkSize + Math.floor(px / this.pixelScale);
                const worldY = cy * this.chunkSize + Math.floor(py / this.pixelScale);

                const n = this._fractalNoise2D(worldX, worldY, this.frequency, this.octaves, this.persistence, this.lacunarity, seed);
                const t = (n + 1) * 0.5;

                const variation = (localRand() - 0.5) * 2 * this.colorVariation;
                const tt = Math.max(0, Math.min(1, t + variation));

                const col = this._lerpColor(ca, cb, tt);

                const idx = (py * width + px) * 4;
                data[idx] = col.r;
                data[idx + 1] = col.g;
                data[idx + 2] = col.b;
                data[idx + 3] = 255;
            }
        }

        ctx.putImageData(img, 0, 0);
        return canvas;
    }

    // Simple deterministic hash combiner
    _hashInts(a, b, c) {
        let h = a >>> 0;
        h = (h * 0x9e3779b1) ^ (b >>> 0);
        h = (h * 0x9e3779b1) ^ (c >>> 0);
        return (h >>> 0);
    }

    // Fractal value-noise style with smooth interpolation
    _fractalNoise2D(x, y, baseFreq, octaves, persistence, lacunarity, seedOffset) {
        let amplitude = 1;
        let frequency = baseFreq;
        let sum = 0;
        let max = 0;
        for (let o = 0; o < octaves; o++) {
            sum += amplitude * this._valueNoise2D(x * frequency, y * frequency, seedOffset + o * 12345);
            max += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }
        return sum / max;
    }

    _valueNoise2D(x, y, seedOffset) {
        const xi = Math.floor(x);
        const yi = Math.floor(y);
        const xf = x - xi;
        const yf = y - yi;

        const v00 = this._pseudoRandom2D(xi, yi, seedOffset);
        const v10 = this._pseudoRandom2D(xi + 1, yi, seedOffset);
        const v01 = this._pseudoRandom2D(xi, yi + 1, seedOffset);
        const v11 = this._pseudoRandom2D(xi + 1, yi + 1, seedOffset);

        const u = this._smoothstep(xf);
        const v = this._smoothstep(yf);

        const ix0 = this._lerp(v00, v10, u);
        const ix1 = this._lerp(v01, v11, v);
        return this._lerp(ix0, ix1, v) * 2 - 1;
    }

    _pseudoRandom2D(x, y, seedOffset) {
        let h = x >>> 0;
        h = (h * 374761393) ^ (y * 668265263);
        h = (h + (seedOffset >>> 0)) >>> 0;
        h = (h ^ (h >>> 13)) >>> 0;
        return ((h * (h * h * 60493 + 19990303) + 1376312589) & 0xffffffff) / 0xffffffff;
    }

    _smoothstep(t) {
        return t * t * (3 - 2 * t);
    }

    _lerp(a, b, t) {
        return a + (b - a) * t;
    }

    _parseColor(col) {
        if (!col) return { r: 0, g: 0, b: 0 };
        let c = col.trim();
        if (c[0] === "#") {
            c = c.slice(1);
            if (c.length === 3) {
                const r = parseInt(c[0] + c[0], 16);
                const g = parseInt(c[1] + c[1], 16);
                const b = parseInt(c[2] + c[2], 16);
                return { r, g, b };
            } else if (c.length === 6) {
                return { r: parseInt(c.slice(0, 2), 16), g: parseInt(c.slice(2, 4), 16), b: parseInt(c.slice(4, 6), 16) };
            }
        }
        const m = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (m) return { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]) };
        return { r: 0, g: 0, b: 0 };
    }

    _lerpColor(a, b, t) {
        return {
            r: Math.round(a.r + (b.r - a.r) * t),
            g: Math.round(a.g + (b.g - a.g) * t),
            b: Math.round(a.b + (b.b - a.b) * t)
        };
    }
}

window.GenerateNoiseTexture = GenerateNoiseTexture;

class DrawInfiniteStarFieldParallax extends Module {
    static namespace = "Drawing";
    static description = "Infinite parallax star field with optimized nebula fog";
    static allowMultiple = false;

    constructor() {
        super("DrawInfiniteStarFieldParallax");

        this.engine = window.engine;

        // Configuration
        this.layers = 5;
        this.seed = 12345;
        this.chunkSize = 512;
        this.backgroundColor = "#0a0a1a";

        // Star properties
        this.starColors = ["#ffffff", "#ffeeaa", "#aaeeff", "#ffaaee", "#aaffaa"];
        this.minStarSize = 0.5;
        this.maxStarSize = 3.0;
        this.starsPerChunk = 20;

        // Parallax settings
        this.parallaxStrength = 0.8;

        // Nebula fog (optimized)
        this.enableNebula = true;
        this.nebulaColor = "#2a1a4a";
        this.nebulaAlpha = 0.15;
        this.nebulaCanvas = null;
        this.nebulaLastUpdate = 0;
        this.nebulaUpdateInterval = 100;

        // Internal state
        this.chunks = new Map();
        this.rng = new SeededRandom(this.seed);

        // Viewport tracking - will be updated from engine.viewport
        this.cameraX = 0;
        this.cameraY = 0;
        this.viewportWidth = 800;
        this.viewportHeight = 600;

        // Track previous camera position to detect changes
        this.prevCameraX = 0;
        this.prevCameraY = 0;

        this.setupProperties();
        this.initializeNebula();
    }

    setupProperties() {
        // Expose properties
        this.exposeProperty("layers", "number", 5, {
            description: "Number of parallax layers",
            min: 1, max: 10, step: 1,
            onChange: (val) => {
                this.layers = val;
                this.clearChunks();
            }
        });

        this.exposeProperty("seed", "number", 12345, {
            description: "Generation seed",
            min: 1, max: 999999, step: 1,
            onChange: (val) => {
                this.seed = val;
                this.rng = new SeededRandom(val);
                this.clearChunks();
            }
        });

        this.exposeProperty("backgroundColor", "color", "#0a0a1a", {
            description: "Background color",
            onChange: (val) => { this.backgroundColor = val; }
        });

        this.exposeProperty("parallaxStrength", "number", 0.8, {
            description: "Parallax effect strength",
            min: 0.1, max: 2.0, step: 0.1,
            onChange: (val) => { this.parallaxStrength = val; }
        });

        this.exposeProperty("starsPerChunk", "number", 50, {
            description: "Stars per chunk",
            min: 10, max: 200, step: 10,
            onChange: (val) => {
                this.starsPerChunk = val;
                this.clearChunks();
            }
        });

        this.exposeProperty("minStarSize", "number", 0.5, {
            description: "Minimum star size",
            min: 0.1, max: 5.0, step: 0.1,
            onChange: (val) => {
                this.minStarSize = val;
                this.clearChunks();
            }
        });

        this.exposeProperty("maxStarSize", "number", 3.0, {
            description: "Maximum star size",
            min: 0.5, max: 10.0, step: 0.1,
            onChange: (val) => {
                this.maxStarSize = val;
                this.clearChunks();
            }
        });

        // Star colors
        for (let i = 0; i < 5; i++) {
            this.exposeProperty(`starColor${i + 1}`, "color", this.starColors[i], {
                description: `Star color ${i + 1}`,
                onChange: (val) => {
                    this.starColors[i] = val;
                    this.clearChunks();
                }
            });
        }

        this.exposeProperty("enableNebula", "boolean", true, {
            description: "Enable nebula fog effect",
            onChange: (val) => {
                this.enableNebula = val;
                if (val) this.initializeNebula();
            }
        });

        this.exposeProperty("nebulaColor", "color", "#2a1a4a", {
            description: "Nebula fog color",
            onChange: (val) => {
                this.nebulaColor = val;
                this.initializeNebula();
            }
        });

        this.exposeProperty("nebulaAlpha", "number", 0.15, {
            description: "Nebula fog opacity",
            min: 0.0, max: 0.5, step: 0.01,
            onChange: (val) => { this.nebulaAlpha = val; }
        });
    }

    initializeNebula() {
        this.nebulaCanvas = document.createElement('canvas');
        this.nebulaCanvas.width = 1024;
        this.nebulaCanvas.height = 1024;
        this.renderNebulaToCanvas();
    }

    renderNebulaToCanvas() {
        if (!this.nebulaCanvas) return;

        const ctx = this.nebulaCanvas.getContext('2d');
        const width = this.nebulaCanvas.width;
        const height = this.nebulaCanvas.height;

        ctx.clearRect(0, 0, width, height);

        const gradients = [
            { x: width * 0.3, y: height * 0.3, r: width * 0.4 },
            { x: width * 0.7, y: height * 0.6, r: width * 0.3 },
            { x: width * 0.5, y: height * 0.8, r: width * 0.25 }
        ];

        gradients.forEach((g, i) => {
            const gradient = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r);
            const alpha = Math.round((0.6 - i * 0.1) * 255).toString(16).padStart(2, '0');

            gradient.addColorStop(0, this.nebulaColor + alpha);
            gradient.addColorStop(0.5, this.nebulaColor + '20');
            gradient.addColorStop(1, this.nebulaColor + '00');

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
        });
    }

    start() {
        console.log("InfiniteStarField started");
    }

    loop(deltaTime) {
        // Update viewport info from engine
        this.updateViewport();

        // Manage infinite chunk generation
        this.manageChunks();

        // Update nebula periodically
        const now = Date.now();
        if (now - this.nebulaLastUpdate > this.nebulaUpdateInterval) {
            if (this.enableNebula) {
                this.renderNebulaToCanvas();
            }
            this.nebulaLastUpdate = now;
        }
    }

    draw(ctx) {
        // Update viewport one more time in draw
        //this.updateViewport();

        const viewportBounds = this.getViewportBounds();
        const viewportX = window.engine.viewport.x || 0;
        const viewportY = window.engine.viewport.y || 0;

        // Draw background
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(viewportBounds.left - 256, viewportBounds.top - 64,
            viewportBounds.right - viewportBounds.left + 256,
            viewportBounds.bottom - viewportBounds.top + 64);

        // Draw nebula fog that extends infinitely
        if (this.enableNebula) {
            this.drawInfiniteNebula(ctx);
        }

        // Draw infinite star layers (back to front) with proper parallax
        for (let layer = this.layers - 1; layer >= 0; layer--) {
            this.drawInfiniteStarLayer(ctx, layer);
        }
    }

    updateViewport() {
        // Store previous camera position
        this.prevCameraX = this.cameraX;
        this.prevCameraY = this.cameraY;

        // Get viewport info from engine
        if (this.engine?.viewport) {
            this.cameraX = this.engine.viewport.x || 0;
            this.cameraY = this.engine.viewport.y || 0;
            this.viewportWidth = this.engine.viewport.width || 800;
            this.viewportHeight = this.engine.viewport.height || 600;
        } else {
            // Fallback values if engine viewport not available
            this.cameraX = 0;
            this.cameraY = 0;
            this.viewportWidth = 800;
            this.viewportHeight = 600;
        }
    }

    getViewportBounds() {
        const viewportX = window.engine.viewport.x || 0;
        const viewportY = window.engine.viewport.y || 0;
        const viewportWidth = window.engine.viewport.width || 800;
        const viewportHeight = window.engine.viewport.height || 600;

        return {
            left: viewportX,
            right: viewportX + viewportWidth,
            top: viewportY,
            bottom: viewportY + viewportHeight
        };
    }

    manageChunks() {
        const bounds = this.getViewportBounds();

        // Generate chunks infinitely around camera position for all layers
        for (let layer = 0; layer < this.layers; layer++) {
            // Each layer has different parallax factor (closer layers move more)
            const parallaxFactor = this.getParallaxFactor(layer);

            // Calculate effective camera position for this layer
            const layerCameraX = this.cameraX * parallaxFactor;
            const layerCameraY = this.cameraY * parallaxFactor;

            // Calculate infinite chunk range that covers viewport plus generous margin
            const margin = this.chunkSize * 3; // Larger margin for seamless infinite generation
            const halfViewportW = this.viewportWidth / 2;
            const halfViewportH = this.viewportHeight / 2;

            const minChunkX = Math.floor((layerCameraX - halfViewportW - margin) / this.chunkSize);
            const maxChunkX = Math.floor((layerCameraX + halfViewportW + margin) / this.chunkSize);
            const minChunkY = Math.floor((layerCameraY - halfViewportH - margin) / this.chunkSize);
            const maxChunkY = Math.floor((layerCameraY + halfViewportH + margin) / this.chunkSize);

            // Generate missing chunks infinitely
            for (let cx = minChunkX; cx <= maxChunkX; cx++) {
                for (let cy = minChunkY; cy <= maxChunkY; cy++) {
                    const key = `${layer}_${cx}_${cy}`;
                    if (!this.chunks.has(key)) {
                        this.chunks.set(key, this.generateChunk(layer, cx, cy));
                    }
                }
            }
        }

        this.cleanupDistantChunks();
    }

    cleanupDistantChunks() {
        const cleanupMargin = this.chunkSize * 4; // Larger cleanup margin for smooth infinite scrolling
        const toDelete = [];

        for (const [key, chunk] of this.chunks) {
            const [layer, cx, cy] = key.split('_').map(Number);
            const parallaxFactor = this.getParallaxFactor(layer);

            const layerCameraX = this.cameraX * parallaxFactor;
            const layerCameraY = this.cameraY * parallaxFactor;

            const chunkCenterX = cx * this.chunkSize + this.chunkSize / 2;
            const chunkCenterY = cy * this.chunkSize + this.chunkSize / 2;

            const distanceX = Math.abs(chunkCenterX - layerCameraX);
            const distanceY = Math.abs(chunkCenterY - layerCameraY);

            const maxDistance = Math.max(this.viewportWidth, this.viewportHeight) / 2 + cleanupMargin;

            if (distanceX > maxDistance || distanceY > maxDistance) {
                toDelete.push(key);
            }
        }

        toDelete.forEach(key => this.chunks.delete(key));

        if (toDelete.length > 0) {
            console.log(`Cleaned up ${toDelete.length} distant chunks, remaining: ${this.chunks.size}`);
        }
    }

    getParallaxFactor(layer) {
        // Layer 0 (front) moves at full speed, back layers move slower
        return Math.pow(0.6, layer) * this.parallaxStrength;
    }

    generateChunk(layer, chunkX, chunkY) {
        const stars = [];
        const chunkSeed = this.hashCoords(this.seed, layer, chunkX, chunkY);
        const chunkRng = new SeededRandom(chunkSeed);

        const baseX = chunkX * this.chunkSize;
        const baseY = chunkY * this.chunkSize;

        // Vary star count per layer (more distant = fewer stars)
        const layerStarCount = Math.floor(this.starsPerChunk * (1 - layer * 0.15));

        for (let i = 0; i < layerStarCount; i++) {
            const star = {
                x: baseX + chunkRng.random() * this.chunkSize,
                y: baseY + chunkRng.random() * this.chunkSize,
                size: this.minStarSize + chunkRng.random() * (this.maxStarSize - this.minStarSize),
                color: this.starColors[Math.floor(chunkRng.random() * this.starColors.length)],
                alpha: 0.4 + chunkRng.random() * 0.6,
                twinkle: chunkRng.random() * Math.PI * 2,
                twinkleSpeed: 0.3 + chunkRng.random() * 1.2
            };
            stars.push(star);
        }

        return { stars, chunkX, chunkY, layer };
    }

    drawInfiniteStarLayer(ctx, layer) {
        const parallaxFactor = this.getParallaxFactor(layer);

        // Calculate layer camera position
        const layerCameraX = this.cameraX * parallaxFactor;
        const layerCameraY = this.cameraY * parallaxFactor;

        ctx.save();

        // Calculate visible chunks for this layer with margins for infinite appearance
        const margin = this.chunkSize * 2;
        const halfViewportW = this.viewportWidth / 2;
        const halfViewportH = this.viewportHeight / 2;

        const minChunkX = Math.floor((layerCameraX - halfViewportW - margin) / this.chunkSize);
        const maxChunkX = Math.floor((layerCameraX + halfViewportW + margin) / this.chunkSize);
        const minChunkY = Math.floor((layerCameraY - halfViewportH - margin) / this.chunkSize);
        const maxChunkY = Math.floor((layerCameraY + halfViewportH + margin) / this.chunkSize);

        // Draw all visible chunks for this layer
        for (let cx = minChunkX; cx <= maxChunkX; cx++) {
            for (let cy = minChunkY; cy <= maxChunkY; cy++) {
                const key = `${layer}_${cx}_${cy}`;
                const chunk = this.chunks.get(key);
                if (chunk) {
                    this.drawChunkStars(ctx, chunk, layerCameraX, layerCameraY);
                }
            }
        }

        ctx.restore();
    }

    drawChunkStars(ctx, chunk, layerCameraX, layerCameraY) {
        const time = Date.now() * 0.001;

        // Calculate screen positions relative to viewport
        const screenCenterX = this.viewportWidth / 2;
        const screenCenterY = this.viewportHeight / 2;

        for (const star of chunk.stars) {
            // Parallax world position
            const screenX = star.x - layerCameraX;
            const screenY = star.y - layerCameraY;

            // World position of the star
            const worldX = star.x;
            const worldY = star.y;

            const left = screenCenterX - this.viewportWidth / 2;
            const right = screenCenterX + this.viewportWidth / 2;
            const top = screenCenterY - this.viewportHeight / 2;
            const bottom = screenCenterY + this.viewportHeight / 2;

            const margin = 24; // Margin for infinite appearance

            // Cull stars outside the visible world rectangle (+margin)
            if (
                worldX < left - margin ||
                worldX > right + margin ||
                worldY < top - margin ||
                worldY > bottom + margin
            ) {
                continue;
            }

            // Enhanced twinkling effect
            const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkle) * 0.3 + 0.7;
            const alpha = star.alpha * twinkle;

            // Draw star with glow
            const glowSize = star.size * 3;
            const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, glowSize);

            // Create hex color with alpha
            const hexColor = star.color;
            const r = parseInt(hexColor.slice(1, 3), 16);
            const g = parseInt(hexColor.slice(3, 5), 16);
            const b = parseInt(hexColor.slice(5, 7), 16);

            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
            gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${alpha * 0.4})`);
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(screenX, screenY, glowSize, 0, Math.PI * 2);
            ctx.fill();

            // Draw bright center
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(alpha * 1.2, 1)})`;
            ctx.beginPath();
            ctx.arc(screenX, screenY, star.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawInfiniteNebula(ctx) {
        if (!this.enableNebula || this.nebulaAlpha <= 0 || !this.nebulaCanvas) return;

        const time = Date.now() * 0.0001;

        ctx.save();
        ctx.globalAlpha = this.nebulaAlpha;

        // Animate nebula position slightly (very slow parallax)
        const nebulaParallax = 0.03; // Very slow movement for background effect
        const baseOffsetX = -this.cameraX * nebulaParallax;
        const baseOffsetY = -this.cameraY * nebulaParallax;
        const animOffsetX = Math.sin(time) * 30;
        const animOffsetY = Math.cos(time * 0.7) * 20;

        // Scale to cover viewport generously for infinite appearance
        const scale = Math.max(this.viewportWidth, this.viewportHeight) / this.nebulaCanvas.width * 2.0;
        const drawWidth = this.nebulaCanvas.width * scale;
        const drawHeight = this.nebulaCanvas.height * scale;

        // Calculate tiling positions to ensure infinite coverage
        const totalOffsetX = baseOffsetX + animOffsetX;
        const totalOffsetY = baseOffsetY + animOffsetY;

        // Calculate how many tiles we need to cover the viewport infinitely
        const tilesX = Math.ceil(this.viewportWidth / drawWidth) + 2;
        const tilesY = Math.ceil(this.viewportHeight / drawHeight) + 2;

        // Calculate starting position for seamless tiling
        const startX = (totalOffsetX % drawWidth) - drawWidth;
        const startY = (totalOffsetY % drawHeight) - drawHeight;

        // Draw tiled nebula to create infinite appearance
        for (let x = 0; x < tilesX; x++) {
            for (let y = 0; y < tilesY; y++) {
                ctx.drawImage(this.nebulaCanvas,
                    startX + x * drawWidth,
                    startY + y * drawHeight,
                    drawWidth,
                    drawHeight);
            }
        }

        ctx.restore();
    }

    clearChunks() {
        this.chunks.clear();
        console.log("Chunks cleared for infinite regeneration");
    }

    hashCoords(seed, layer, x, y) {
        // Enhanced hash for better infinite distribution
        let hash = seed;
        hash = ((hash << 5) + hash) + layer;
        hash = ((hash << 5) + hash) + x;
        hash = ((hash << 5) + hash) + y;
        // Ensure positive result for consistent seeding
        return Math.abs(hash) % 2147483647;
    }

    destroy() {
        this.clearChunks();
        if (this.nebulaCanvas) {
            this.nebulaCanvas = null;
        }
    }
}

// Seeded random number generator for consistent infinite generation
class SeededRandom {
    constructor(seed) {
        this.seed = seed % 2147483647;
        if (this.seed <= 0) this.seed += 2147483646;
    }

    random() {
        this.seed = this.seed * 16807 % 2147483647;
        return (this.seed - 1) / 2147483646;
    }
}

// Ensure global registration
if (typeof window !== 'undefined') {
    window.DrawInfiniteStarFieldParallax = DrawInfiniteStarFieldParallax;

    if (window.registerModule) {
        window.registerModule(DrawInfiniteStarFieldParallax);
    }
}
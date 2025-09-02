class DecalChunk {
    constructor(x, y, size = 256) {
        this.x = x; // World X position of chunk
        this.y = y; // World Y position of chunk
        this.size = size; // Chunk size in world units
        this.decals = []; // Array of decal objects: {x, y, image, options, lifetime, startTime}
        this.dirty = false; // Flag to redraw the chunk
    }

    addDecal(worldX, worldY, imageOrDrawFunction, options = {}) {
        const localX = worldX - this.x;
        const localY = worldY - this.y;

        // Ensure options has valid defaults to prevent undefined values
        const defaultOptions = {
            rotation: 0,
            scale: 1,
            alpha: 1,  // Default to full opacity if not provided
            width: 64,
            height: 64,
            lifetime: 0
        };
        const finalOptions = { ...defaultOptions, ...options };
        // Clamp alpha to 0-1 to ensure validity
        finalOptions.alpha = Math.max(0, Math.min(1, finalOptions.alpha));

        if (typeof imageOrDrawFunction === 'function') {
            // Store the draw function directly for dynamic rendering
            const decal = { x: localX, y: localY, drawFunction: imageOrDrawFunction, options: finalOptions, lifetime: finalOptions.lifetime, startTime: Date.now() };
            this.decals.push(decal);
            this.dirty = true;
        } else {
            // Assume it's an Image object (unchanged)
            const decal = { x: localX, y: localY, image: imageOrDrawFunction, options: finalOptions, lifetime: finalOptions.lifetime, startTime: Date.now() };
            this.decals.push(decal);
            this.dirty = true;
        }
    }

    async generateImageFromDrawFunction(drawFunction, options) {
        const canvas = document.createElement('canvas');
        canvas.width = options.width || 64; // Default size, can be overridden in options
        canvas.height = options.height || 64;
        const ctx = canvas.getContext('2d');

        // Call the user's drawing function
        drawFunction(ctx);

        // Convert to image
        const image = new Image();
        image.src = canvas.toDataURL();
        return new Promise((resolve) => {
            image.onload = () => resolve(image);
        });
    }

    clear() {
        this.decals = [];
        this.dirty = true;
    }

    update(deltaTime) {
        // Update decals for fading (unchanged, but now works better with dynamic drawing)
        this.decals = this.decals.filter(decal => {
            if (decal.lifetime > 0) {
                const elapsed = (Date.now() - decal.startTime) / 1000; // Seconds
                if (elapsed >= decal.lifetime) {
                    return false; // Remove expired decal
                }
                // Fade out opacity, ensuring alpha stays clamped and valid
                decal.options.alpha = Math.max(0, Math.min(1, decal.options.alpha - (deltaTime / decal.lifetime)));
            }
            return true;
        });
        if (this.decals.length === 0) this.dirty = false;
    }

    draw(ctx, viewport, debug = false) {
        if (!this.dirty && this.decals.length === 0 && !debug) return;  // Allow drawing empty chunks if debug is enabled
        // Draw decals relative to chunk origin
        this.decals.forEach(decal => {
            ctx.save();
            ctx.translate(decal.x, decal.y);
            // Apply any decal-specific options (e.g., rotation, scale)
            if (decal.options.rotation) ctx.rotate(decal.options.rotation);
            if (decal.options.scale) ctx.scale(decal.options.scale, decal.options.scale);
            ctx.globalAlpha = decal.options.alpha;  // Apply current alpha for fading

            if (decal.image && decal.image.complete) {
                // For image-based decals (unchanged)
                ctx.drawImage(decal.image, 0, 0);
            } else if (decal.drawFunction) {
                // For custom draw functions: Call dynamically with current alpha
                decal.drawFunction(ctx);
            }

            ctx.restore();
        });

        // Debug: Draw a rectangle around the chunk's edge if debug is enabled
        if (debug) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Semi-transparent red
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, this.size, this.size); // Rectangle from (0,0) to (size,size)
            ctx.restore();
        }

        this.dirty = false;
    }

    isVisible(viewport) {
        // Check if chunk intersects with viewport bounds
        const chunkLeft = this.x;
        const chunkRight = this.x + this.size;
        const chunkTop = this.y;
        const chunkBottom = this.y + this.size;
        const viewLeft = (viewport.x) / viewport.zoom;
        const viewRight = (viewport.x + viewport.width) / viewport.zoom;
        const viewTop = (viewport.y) / viewport.zoom;
        const viewBottom = (viewport.y + viewport.height) / viewport.zoom;
        return !(chunkRight < viewLeft || chunkLeft > viewRight || chunkBottom < viewTop || chunkTop > viewBottom);
    }
}
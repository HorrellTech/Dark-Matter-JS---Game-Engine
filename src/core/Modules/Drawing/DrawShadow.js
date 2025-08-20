class DrawShadow extends Module {
    static namespace = "WIP";
    static description = "Draws a drop shadow of all visible drawing from other modules on this GameObject.";
    static allowMultiple = false;
    static icon = "fa-shadow";
    static iconColor = "#a200ffff";
    static drawInEditor = false;

    constructor() {
        super("DrawShadow");

        // Shadow properties
        this.shadowColor = "rgba(0,0,0,0.5)";
        this.shadowBlur = 16;
        this.shadowOffsetX = 12;
        this.shadowOffsetY = 12;
        this.shadowScale = 1.0; // 1 = same size, >1 = bigger, <1 = smaller
        this.shadowAlpha = 0.5;

        this.setupProperties();
    }

    setupProperties() {
        this.exposeProperty("shadowColor", "color", this.shadowColor, {
            description: "Shadow color",
            onChange: v => this.shadowColor = v
        });
        this.exposeProperty("shadowBlur", "number", this.shadowBlur, {
            description: "Shadow blur amount",
            min: 0, max: 64, step: 1,
            onChange: v => this.shadowBlur = v
        });
        this.exposeProperty("shadowOffsetX", "number", this.shadowOffsetX, {
            description: "Shadow X offset",
            min: -100, max: 100, step: 1,
            onChange: v => this.shadowOffsetX = v
        });
        this.exposeProperty("shadowOffsetY", "number", this.shadowOffsetY, {
            description: "Shadow Y offset",
            min: -100, max: 100, step: 1,
            onChange: v => this.shadowOffsetY = v
        });
        this.exposeProperty("shadowScale", "number", this.shadowScale, {
            description: "Shadow scale (size)",
            min: 0.5, max: 2, step: 0.01,
            onChange: v => this.shadowScale = v
        });
        this.exposeProperty("shadowAlpha", "number", this.shadowAlpha, {
            description: "Shadow opacity",
            min: 0, max: 1, step: 0.01,
            onChange: v => this.shadowAlpha = v
        });
    }

    // Draw shadow of all visible drawing from other modules
    draw(ctx) {
        if (!window.engine || !this.gameObject || !this.enabled) return;

        // Find all visible drawing modules except this one
        const modulesToShadow = this.gameObject.modules.filter(m =>
            m !== this &&
            m.enabled &&
            typeof m.draw === "function" &&
            (m.constructor.drawInEditor !== false || m.constructor.drawInEditor === undefined)
        );

        if (modulesToShadow.length === 0) return;

        // --- NEW: Calculate merged bounds of all drawing modules ---
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const m of modulesToShadow) {
            let bounds = typeof m.getBoundingBox === "function"
                ? m.getBoundingBox()
                : this.gameObject.getBoundingBox();
            if (!bounds) continue;
            minX = Math.min(minX, bounds.x);
            minY = Math.min(minY, bounds.y);
            maxX = Math.max(maxX, bounds.x + bounds.width);
            maxY = Math.max(maxY, bounds.y + bounds.height);
        }
        if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return;
        const bounds = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
        // --- END NEW ---

        const pad = Math.max(this.shadowBlur, 32);
        const w = Math.ceil(bounds.width * this.shadowScale + pad * 2);
        const h = Math.ceil(bounds.height * this.shadowScale + pad * 2);

        if (w <= 0 || h <= 0) {
            return;
        }

        // Create offscreen canvas
        const offCanvas = document.createElement("canvas");
        offCanvas.width = w;
        offCanvas.height = h;
        const offCtx = offCanvas.getContext("2d");

        // Draw modules onto offscreen canvas
        offCtx.save();
        offCtx.translate(pad, pad); // Move origin to padding
        offCtx.scale(this.shadowScale, this.shadowScale);
        offCtx.translate(-bounds.x, -bounds.y); // Align top-left of bounds to (0,0)

        for (const m of modulesToShadow) {
            if (typeof m.draw === "function") {
                m.draw(offCtx);
            }
        }
        offCtx.restore();

        // Tint the shadow if needed
        if (this.shadowColor !== "rgba(0,0,0,0.5)" || this.shadowAlpha !== 0.5) {
            offCtx.globalCompositeOperation = "source-in";
            offCtx.fillStyle = this.shadowColor;
            offCtx.globalAlpha = this.shadowAlpha;
            offCtx.fillRect(0, 0, w, h);
            offCtx.globalAlpha = 1.0;
            offCtx.globalCompositeOperation = "source-over";
        }

        // Draw the shadow onto the gui canvas with blur and offset
        const gCtx = window.engine.getGuiCanvas();
        if (gCtx) {
            gCtx.save();
            gCtx.globalAlpha = 1.0;
            gCtx.filter = `blur(${this.shadowBlur}px)`;
            const worldPos = this.gameObject.getWorldPosition();
            const drawX = worldPos.x - w / 2 + this.shadowOffsetX;
            const drawY = worldPos.y - h / 2 + this.shadowOffsetY;
            gCtx.drawImage(offCanvas, drawX, drawY);
            gCtx.filter = "none";
            gCtx.restore();
        }
    }

    toJSON() {
        const json = super.toJSON();
        json.shadowColor = this.shadowColor;
        json.shadowBlur = this.shadowBlur;
        json.shadowOffsetX = this.shadowOffsetX;
        json.shadowOffsetY = this.shadowOffsetY;
        json.shadowScale = this.shadowScale;
        json.shadowAlpha = this.shadowAlpha;
        return json;
    }

    fromJSON(json) {
        super.fromJSON(json);
        if (json.shadowColor !== undefined) this.shadowColor = json.shadowColor;
        if (json.shadowBlur !== undefined) this.shadowBlur = json.shadowBlur;
        if (json.shadowOffsetX !== undefined) this.shadowOffsetX = json.shadowOffsetX;
        if (json.shadowOffsetY !== undefined) this.shadowOffsetY = json.shadowOffsetY;
        if (json.shadowScale !== undefined) this.shadowScale = json.shadowScale;
        if (json.shadowAlpha !== undefined) this.shadowAlpha = json.shadowAlpha;
    }
}

window.DrawShadow = DrawShadow;
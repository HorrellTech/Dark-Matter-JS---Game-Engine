/**
 * Viewport Canvas Module
 * Creates a canvas that can snap to viewport position and size with drawing capabilities
 */
class ViewportCanvas extends Module {
    static namespace = "UI";
    static description = "Canvas that can snap to viewport position and size with drawing capabilities";
    static allowMultiple = true;
    static iconClass = "fas fa-expand-arrows-alt";
    static color = "#FF5722";

    constructor() {
        super("ViewportCanvas");

        // Canvas properties
        this.canvasWidth = 800;
        this.canvasHeight = 600;
        this.backgroundColor = "rgba(0, 0, 0, 0)";
        this.borderColor = "#FFFFFF";
        this.borderWidth = 0;

        // Viewport snapping
        this.snapToViewport = true;
        this.snapMode = "full"; // "full", "center", "stretch", "aspect-ratio"
        this.maintainAspectRatio = true;
        this.viewportOffset = new Vector2(0, 0);

        // Positioning
        this.anchorPoint = "center"; // "top-left", "top-right", "bottom-left", "bottom-right", "center"
        this.positionMode = "absolute"; // "absolute", "relative"

        // Drawing properties
        this.drawingEnabled = true;
        this.autoClear = true;
        this.clearColor = "rgba(0, 0, 0, 0)";

        // Animation properties
        this.animateSize = false;
        this.animationSpeed = 1.0;
        this.targetWidth = 800;
        this.targetHeight = 600;

        // Internal state
        this.canvas = null;
        this.ctx = null;
        this.isDirty = true;
        this.lastViewportSize = { width: 0, height: 0 };

        this.setupProperties();
    }

    setupProperties() {
        // Canvas properties
        this.exposeProperty("canvasWidth", "number", this.canvasWidth, {
            description: "Canvas width in pixels",
            min: 100, max: 4000,
            onChange: (value) => {
                this.canvasWidth = value;
                this.updateCanvasSize();
            }
        });

        this.exposeProperty("canvasHeight", "number", this.canvasHeight, {
            description: "Canvas height in pixels",
            min: 100, max: 4000,
            onChange: (value) => {
                this.canvasHeight = value;
                this.updateCanvasSize();
            }
        });

        this.exposeProperty("backgroundColor", "color", this.backgroundColor, {
            description: "Canvas background color",
            onChange: (value) => {
                this.backgroundColor = value;
                this.markDirty();
            }
        });

        this.exposeProperty("borderColor", "color", this.borderColor, {
            description: "Canvas border color",
            onChange: (value) => {
                this.borderColor = value;
                this.markDirty();
            }
        });

        this.exposeProperty("borderWidth", "number", this.borderWidth, {
            description: "Canvas border width",
            min: 0, max: 20,
            onChange: (value) => {
                this.borderWidth = value;
                this.markDirty();
            }
        });

        // Viewport snapping
        this.exposeProperty("snapToViewport", "boolean", this.snapToViewport, {
            description: "Automatically snap to viewport dimensions",
            onChange: (value) => {
                this.snapToViewport = value;
                this.updateCanvasSize();
            }
        });

        this.exposeProperty("snapMode", "enum", this.snapMode, {
            description: "Viewport snapping mode",
            options: ["full", "center", "stretch", "aspect-ratio"],
            onChange: (value) => {
                this.snapMode = value;
                this.updateCanvasSize();
            }
        });

        this.exposeProperty("maintainAspectRatio", "boolean", this.maintainAspectRatio, {
            description: "Maintain aspect ratio when snapping",
            onChange: (value) => {
                this.maintainAspectRatio = value;
                this.updateCanvasSize();
            }
        });

        this.exposeProperty("viewportOffset", "vector2", this.viewportOffset, {
            description: "Offset from viewport edges",
            onChange: (value) => {
                this.viewportOffset = value;
                this.updateCanvasPosition();
            }
        });

        // Positioning
        this.exposeProperty("anchorPoint", "enum", this.anchorPoint, {
            description: "Canvas anchor point",
            options: ["top-left", "top-right", "bottom-left", "bottom-right", "center"],
            onChange: (value) => {
                this.anchorPoint = value;
                this.updateCanvasPosition();
            }
        });

        this.exposeProperty("positionMode", "enum", this.positionMode, {
            description: "Positioning mode",
            options: ["absolute", "relative"],
            onChange: (value) => {
                this.positionMode = value;
                this.updateCanvasPosition();
            }
        });

        // Drawing properties
        this.exposeProperty("drawingEnabled", "boolean", this.drawingEnabled, {
            description: "Enable custom drawing",
            onChange: (value) => { this.drawingEnabled = value; }
        });

        this.exposeProperty("autoClear", "boolean", this.autoClear, {
            description: "Automatically clear canvas before drawing",
            onChange: (value) => { this.autoClear = value; }
        });

        this.exposeProperty("clearColor", "color", this.clearColor, {
            description: "Clear color for auto-clear",
            onChange: (value) => { this.clearColor = value; }
        });

        // Animation
        this.exposeProperty("animateSize", "boolean", this.animateSize, {
            description: "Animate size changes",
            onChange: (value) => { this.animateSize = value; }
        });

        this.exposeProperty("animationSpeed", "number", this.animationSpeed, {
            description: "Animation speed for size changes",
            min: 0.1, max: 5, step: 0.1,
            onChange: (value) => { this.animationSpeed = value; }
        });
    }

    start() {
        this.createCanvas();
        this.updateCanvasSize();
        this.updateCanvasPosition();
    }

    loop(deltaTime) {
        // Check if viewport size has changed
        if (this.snapToViewport && this.checkViewportSizeChange()) {
            this.updateCanvasSize();
        }

        // Handle size animation
        if (this.animateSize && (this.canvasWidth !== this.targetWidth || this.canvasHeight !== this.targetHeight)) {
            this.animateToTargetSize(deltaTime);
        }

        // Draw if needed
        if (this.drawingEnabled && this.isDirty) {
            this.draw();
            this.isDirty = false;
        }
    }

    createCanvas() {
        // Create off-screen canvas for custom drawing
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');

        // Set initial size
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;

        // Configure canvas
        this.canvas.style.position = 'absolute';
        this.canvas.style.zIndex = '1000';
        this.canvas.style.pointerEvents = 'none';

        // Add to DOM if not already added
        if (!document.body.contains(this.canvas)) {
            document.body.appendChild(this.canvas);
        }
    }

    updateCanvasSize() {
        if (!this.snapToViewport) {
            // Use fixed size
            this.targetWidth = this.canvasWidth;
            this.targetHeight = this.canvasHeight;
        } else {
            // Calculate size based on viewport and snap mode
            const viewport = this.getViewportSize();

            switch (this.snapMode) {
                case "full":
                    this.targetWidth = viewport.width - this.viewportOffset.x * 2;
                    this.targetHeight = viewport.height - this.viewportOffset.y * 2;
                    break;

                case "center":
                    const aspectRatio = this.canvasWidth / this.canvasHeight;
                    const maxWidth = viewport.width - this.viewportOffset.x * 2;
                    const maxHeight = viewport.height - this.viewportOffset.y * 2;

                    if (this.maintainAspectRatio) {
                        if (maxWidth / maxHeight > aspectRatio) {
                            this.targetHeight = maxHeight;
                            this.targetWidth = maxHeight * aspectRatio;
                        } else {
                            this.targetWidth = maxWidth;
                            this.targetHeight = maxWidth / aspectRatio;
                        }
                    } else {
                        this.targetWidth = maxWidth;
                        this.targetHeight = maxHeight;
                    }
                    break;

                case "stretch":
                    this.targetWidth = viewport.width - this.viewportOffset.x * 2;
                    this.targetHeight = viewport.height - this.viewportOffset.y * 2;
                    break;

                case "aspect-ratio":
                    const containerAspect = viewport.width / viewport.height;
                    const canvasAspect = this.canvasWidth / this.canvasHeight;

                    if (containerAspect > canvasAspect) {
                        // Container is wider, fit by height
                        this.targetHeight = viewport.height - this.viewportOffset.y * 2;
                        this.targetWidth = this.targetHeight * canvasAspect;
                    } else {
                        // Container is taller, fit by width
                        this.targetWidth = viewport.width - this.viewportOffset.x * 2;
                        this.targetHeight = this.targetWidth / canvasAspect;
                    }
                    break;
            }
        }

        // Apply size immediately or animate
        if (!this.animateSize) {
            this.canvasWidth = this.targetWidth;
            this.canvasHeight = this.targetHeight;
            this.canvas.width = this.canvasWidth;
            this.canvas.height = this.canvasHeight;
            this.markDirty();
        }
    }

    animateToTargetSize(deltaTime) {
        const lerpFactor = Math.min(1, this.animationSpeed * deltaTime);

        this.canvasWidth += (this.targetWidth - this.canvasWidth) * lerpFactor;
        this.canvasHeight += (this.targetHeight - this.canvasHeight) * lerpFactor;

        // Apply to actual canvas
        this.canvas.width = Math.round(this.canvasWidth);
        this.canvas.height = Math.round(this.canvasHeight);

        this.markDirty();

        // Check if animation is complete
        const threshold = 1;
        if (Math.abs(this.canvasWidth - this.targetWidth) < threshold &&
            Math.abs(this.canvasHeight - this.targetHeight) < threshold) {
            this.canvasWidth = this.targetWidth;
            this.canvasHeight = this.targetHeight;
            this.animateSize = false;
        }
    }

    updateCanvasPosition() {
        if (!this.canvas) return;

        const viewport = this.getViewportSize();
        let x = 0, y = 0;

        if (this.positionMode === "absolute") {
            // Position relative to viewport
            switch (this.anchorPoint) {
                case "top-left":
                    x = this.viewportOffset.x;
                    y = this.viewportOffset.y;
                    break;
                case "top-right":
                    x = viewport.width - this.canvasWidth - this.viewportOffset.x;
                    y = this.viewportOffset.y;
                    break;
                case "bottom-left":
                    x = this.viewportOffset.x;
                    y = viewport.height - this.canvasHeight - this.viewportOffset.y;
                    break;
                case "bottom-right":
                    x = viewport.width - this.canvasWidth - this.viewportOffset.x;
                    y = viewport.height - this.canvasHeight - this.viewportOffset.y;
                    break;
                case "center":
                default:
                    x = (viewport.width - this.canvasWidth) / 2 + this.viewportOffset.x;
                    y = (viewport.height - this.canvasHeight) / 2 + this.viewportOffset.y;
                    break;
            }
        } else {
            // Position relative to game object
            const worldPos = this.gameObject.getWorldPosition();
            const screenPos = this.worldToScreenPosition(worldPos);

            switch (this.anchorPoint) {
                case "top-left":
                    x = screenPos.x - this.canvasWidth / 2;
                    y = screenPos.y - this.canvasHeight / 2;
                    break;
                case "top-right":
                    x = screenPos.x + this.canvasWidth / 2;
                    y = screenPos.y - this.canvasHeight / 2;
                    break;
                case "bottom-left":
                    x = screenPos.x - this.canvasWidth / 2;
                    y = screenPos.y + this.canvasHeight / 2;
                    break;
                case "bottom-right":
                    x = screenPos.x + this.canvasWidth / 2;
                    y = screenPos.y + this.canvasHeight / 2;
                    break;
                case "center":
                default:
                    x = screenPos.x;
                    y = screenPos.y;
                    break;
            }
        }

        // Apply position
        this.canvas.style.left = `${x}px`;
        this.canvas.style.top = `${y}px`;
    }

    getViewportSize() {
        if (window.engine && window.engine.viewport) {
            return {
                width: window.engine.viewport.width || window.innerWidth,
                height: window.engine.viewport.height || window.innerHeight
            };
        }

        return {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }

    worldToScreenPosition(worldPos) {
        if (!window.engine) return worldPos;

        // Convert world position to screen position
        const viewport = window.engine.viewport;
        if (!viewport) return worldPos;

        return new Vector2(
            worldPos.x - viewport.x + viewport.width / 2,
            worldPos.y - viewport.y + viewport.height / 2
        );
    }

    checkViewportSizeChange() {
        const currentSize = this.getViewportSize();
        if (currentSize.width !== this.lastViewportSize.width ||
            currentSize.height !== this.lastViewportSize.height) {
            this.lastViewportSize = currentSize;
            return true;
        }
        return false;
    }

    draw() {
        if (!this.canvas || !this.ctx) return;

        // Clear if auto-clear is enabled
        if (this.autoClear) {
            this.ctx.fillStyle = this.clearColor;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Draw background
        if (this.backgroundColor !== "rgba(0, 0, 0, 0)") {
            this.ctx.fillStyle = this.backgroundColor;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Draw border
        if (this.borderWidth > 0) {
            this.ctx.strokeStyle = this.borderColor;
            this.ctx.lineWidth = this.borderWidth;
            this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Custom drawing can be added here or through events
        this.drawCustom();
    }

    drawCustom() {
        // Override this method to add custom drawing
        // Example:
        // this.ctx.fillStyle = "#FF0000";
        // this.ctx.fillRect(10, 10, 100, 100);
    }

    markDirty() {
        this.isDirty = true;
    }

    // Public API methods
    getCanvas() {
        return this.canvas;
    }

    getContext() {
        return this.ctx;
    }

    setSize(width, height) {
        this.targetWidth = width;
        this.targetHeight = height;
        this.animateSize = true;
    }

    clear() {
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    drawRect(x, y, width, height, color = "#FF0000") {
        if (!this.ctx) return;

        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
        this.markDirty();
    }

    drawCircle(x, y, radius, color = "#FF0000") {
        if (!this.ctx) return;

        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.markDirty();
    }

    drawText(x, y, text, color = "#FFFFFF", font = "16px Arial") {
        if (!this.ctx) return;

        this.ctx.fillStyle = color;
        this.ctx.font = font;
        this.ctx.fillText(text, x, y);
        this.markDirty();
    }

    drawImage(image, x, y, width = null, height = null) {
        if (!this.ctx || !image) return;

        if (width && height) {
            this.ctx.drawImage(image, x, y, width, height);
        } else {
            this.ctx.drawImage(image, x, y);
        }
        this.markDirty();
    }

    toJSON() {
        const json = super.toJSON();
        json.canvasWidth = this.canvasWidth;
        json.canvasHeight = this.canvasHeight;
        json.backgroundColor = this.backgroundColor;
        json.borderColor = this.borderColor;
        json.borderWidth = this.borderWidth;
        json.snapToViewport = this.snapToViewport;
        json.snapMode = this.snapMode;
        json.maintainAspectRatio = this.maintainAspectRatio;
        json.viewportOffset = { x: this.viewportOffset.x, y: this.viewportOffset.y };
        json.anchorPoint = this.anchorPoint;
        json.positionMode = this.positionMode;
        json.drawingEnabled = this.drawingEnabled;
        json.autoClear = this.autoClear;
        json.clearColor = this.clearColor;
        json.animateSize = this.animateSize;
        json.animationSpeed = this.animationSpeed;
        return json;
    }

    fromJSON(json) {
        super.fromJSON(json);
        if (json.canvasWidth !== undefined) this.canvasWidth = json.canvasWidth;
        if (json.canvasHeight !== undefined) this.canvasHeight = json.canvasHeight;
        if (json.backgroundColor !== undefined) this.backgroundColor = json.backgroundColor;
        if (json.borderColor !== undefined) this.borderColor = json.borderColor;
        if (json.borderWidth !== undefined) this.borderWidth = json.borderWidth;
        if (json.snapToViewport !== undefined) this.snapToViewport = json.snapToViewport;
        if (json.snapMode !== undefined) this.snapMode = json.snapMode;
        if (json.maintainAspectRatio !== undefined) this.maintainAspectRatio = json.maintainAspectRatio;
        if (json.viewportOffset) this.viewportOffset = new Vector2(json.viewportOffset.x, json.viewportOffset.y);
        if (json.anchorPoint !== undefined) this.anchorPoint = json.anchorPoint;
        if (json.positionMode !== undefined) this.positionMode = json.positionMode;
        if (json.drawingEnabled !== undefined) this.drawingEnabled = json.drawingEnabled;
        if (json.autoClear !== undefined) this.autoClear = json.autoClear;
        if (json.clearColor !== undefined) this.clearColor = json.clearColor;
        if (json.animateSize !== undefined) this.animateSize = json.animateSize;
        if (json.animationSpeed !== undefined) this.animationSpeed = json.animationSpeed;
    }
}

window.ViewportCanvas = ViewportCanvas;
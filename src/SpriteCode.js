class SpriteCode {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.currentTool = 'select';
        this.drawing = false;
        this.startX = 0;
        this.startY = 0;

        // Animation system
        this.frames = [[]]; // Array of frame arrays, each containing shapes
        this.currentFrame = 0;
        this.totalFrames = 1;
        this.animationPanel = false;
        this.previewPlaying = false;
        this.previewFrame = 0;
        this.previewInterval = null;

        this.splinePoints = [];
        this.tempSplinePoints = [];

        this.colors = {
            fill: '#3b82f6',
            stroke: '#000000'
        };

        this.strokeWidth = 2;
        this.curveIntensity = 0.5;
        this.closedSpline = false;
        this.fillShape = true;
        this.strokeShape = true;

        // Animation settings
        this.enableTweening = false;
        this.animSpeed = 1;
        this.tweenType = 'linear';
        this.pingPong = false;

        // Gradient properties
        this.enableGradient = false;
        this.gradientStart = '#3b82f6';
        this.gradientEnd = '#ffffff';
        this.gradientType = 'linear';
        this.gradientAngle = 0;

        // Shape management
        this.selectedShapeIndex = -1;
        this.draggedShapeIndex = -1;

        // Transform properties for selected shape
        this.isRotating = false;
        this.rotationStart = 0;

        this.selectedShape = null;
        this.dragOffset = { x: 0, y: 0 };
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = null;
        this.selectedPoint = null;

        this.initializeEventListeners();
    }

    get shapes() {
        return this.frames[this.currentFrame] || [];
    }

    set shapes(value) {
        if (!this.frames[this.currentFrame]) {
            this.frames[this.currentFrame] = [];
        }
        this.frames[this.currentFrame] = value;
    }

    initializeEventListeners() {
        // Tool selection
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tool-btn-sprite')) {
                document.querySelectorAll('.tool-btn-sprite').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                this.currentTool = e.target.dataset.tool;
                this.updateToolOptions();
            }
        });

        // Color and settings
        document.getElementById('fillColor-sprite').addEventListener('change', (e) => {
            this.colors.fill = e.target.value;
        });

        document.getElementById('strokeColor-sprite').addEventListener('change', (e) => {
            this.colors.stroke = e.target.value;
        });

        // Gradient controls
        document.getElementById('enableGradient-sprite').addEventListener('change', (e) => {
            this.enableGradient = e.target.checked;
            this.toggleGradientOptions();
        });

        document.getElementById('gradientStart-sprite').addEventListener('change', (e) => {
            this.gradientStart = e.target.value;
        });

        document.getElementById('gradientEnd-sprite').addEventListener('change', (e) => {
            this.gradientEnd = e.target.value;
        });

        document.getElementById('gradientType-sprite').addEventListener('change', (e) => {
            this.gradientType = e.target.value;
        });

        document.getElementById('gradientAngle-sprite').addEventListener('input', (e) => {
            this.gradientAngle = parseInt(e.target.value);
            document.getElementById('gradientAngleValue-sprite').textContent = this.gradientAngle;
        });

        document.getElementById('strokeWidth-sprite').addEventListener('input', (e) => {
            this.strokeWidth = parseInt(e.target.value);
            document.getElementById('strokeWidthValue-sprite').textContent = this.strokeWidth;
        });

        document.getElementById('curveIntensity-sprite').addEventListener('input', (e) => {
            this.curveIntensity = parseFloat(e.target.value);
            document.getElementById('curveIntensityValue-sprite').textContent = this.curveIntensity;
        });

        // Animation settings
        document.getElementById('enableTweening-sprite')?.addEventListener('change', (e) => {
            this.enableTweening = e.target.checked;
        });

        document.getElementById('animSpeed-sprite')?.addEventListener('input', (e) => {
            this.animSpeed = parseFloat(e.target.value);
            document.getElementById('animSpeedValue-sprite').textContent = this.animSpeed;
        });

        document.getElementById('tweenType-sprite')?.addEventListener('change', (e) => {
            this.tweenType = e.target.value;
        });

        document.getElementById('pingPong-sprite')?.addEventListener('change', (e) => {
            this.pingPong = e.target.checked;
        });

        document.getElementById('closedSpline-sprite').addEventListener('change', (e) => {
            this.closedSpline = e.target.checked;
        });

        document.getElementById('fillShape-sprite').addEventListener('change', (e) => {
            this.fillShape = e.target.checked;
        });

        document.getElementById('strokeShape-sprite').addEventListener('change', (e) => {
            this.strokeShape = e.target.checked;
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.selectedShape) {
                this.deleteSelectedShape();
            }
        });

        // Shape management buttons
        document.getElementById('moveShapeUp-sprite').addEventListener('click', () => this.moveShape(-1));
        document.getElementById('moveShapeDown-sprite').addEventListener('click', () => this.moveShape(1));
        document.getElementById('deleteShape-sprite').addEventListener('click', () => this.deleteSelectedShape());
        document.getElementById('duplicateShape-sprite').addEventListener('click', () => this.duplicateShape());

        // Transform controls
        document.getElementById('shapeRotation-sprite')?.addEventListener('input', (e) => {
            this.updateShapeTransform('rotation', parseFloat(e.target.value));
            document.getElementById('rotationValue-sprite').textContent = e.target.value;
        });

        document.getElementById('shapeScaleX-sprite')?.addEventListener('input', (e) => {
            this.updateShapeTransform('scaleX', parseFloat(e.target.value));
            document.getElementById('scaleXValue-sprite').textContent = e.target.value;
        });

        document.getElementById('shapeScaleY-sprite')?.addEventListener('input', (e) => {
            this.updateShapeTransform('scaleY', parseFloat(e.target.value));
            document.getElementById('scaleYValue-sprite').textContent = e.target.value;
        });

        // Shape list event delegation
        document.getElementById('shapesList-sprite').addEventListener('click', (e) => {
            const shapeItem = e.target.closest('.shape-item-sprite');
            if (shapeItem) {
                const index = parseInt(shapeItem.dataset.index);
                if (e.target.classList.contains('shape-item-visibility')) {
                    this.toggleShapeVisibility(index);
                } else {
                    this.selectShapeByIndex(index);
                }
            }
        });

        // Drag and drop for shape reordering
        this.setupShapeListDragDrop();

        // Frame selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.frame-item')) {
                const frameItem = e.target.closest('.frame-item');
                const frameIndex = parseInt(frameItem.dataset.frame);
                this.selectFrame(frameIndex);
            }
        });
    }

    openModal() {
        document.getElementById('modalOverlay-sprite').style.display = 'flex';
        this.initializeCanvas();
        this.updateFrameDisplay();

        // Add finish spline button if not present
        let btn = document.getElementById('finishSplineBtn-sprite');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'finishSplineBtn-sprite';
            btn.innerHTML = '✔️ Finish Spline';
            btn.style.position = 'absolute';
            btn.style.top = '10px';
            btn.style.left = '10px';
            btn.style.zIndex = '1001';
            btn.style.display = 'none';
            btn.className = 'sprite-top-btn';
            this.canvas.parentElement.appendChild(btn);

            btn.addEventListener('click', () => {
                if (this.tempSplinePoints.length > 1) {
                    this.createSpline();
                }
            });
        }
    }

    closeModal() {
        if (!confirm('Are you sure you want to close SpriteCode? All unsaved changes will be lost.')) {
            return;
        }
        document.getElementById('modalOverlay-sprite').style.display = 'none';
        document.getElementById('animationPanel-sprite').style.display = 'none';
        this.clearCanvas();
        this.selectedShape = null;
        this.tempSplinePoints = [];
        this.drawing = false;
        this.isDragging = false;
        this.isResizing = false;
        this.selectedPoint = null;
        this.stopPreview();
    }

    // Animation Panel Methods
    toggleAnimationPanel() {
        const panel = document.getElementById('animationPanel-sprite');
        const isVisible = panel.style.display !== 'none';
        panel.style.display = isVisible ? 'none' : 'block';
        this.animationPanel = !isVisible;
    }

    addFrame() {
        // Copy shapes from current frame
        const prevShapes = this.frames[this.currentFrame] ? JSON.parse(JSON.stringify(this.frames[this.currentFrame])) : [];
        this.frames.push(prevShapes);
        this.totalFrames = this.frames.length;
        this.currentFrame = this.totalFrames - 1;
        this.updateFrameDisplay();
        this.redrawCanvas();
    }

    removeFrame() {
        if (this.totalFrames <= 1) return;

        this.frames.splice(this.currentFrame, 1);
        this.totalFrames = this.frames.length;

        if (this.currentFrame >= this.totalFrames) {
            this.currentFrame = this.totalFrames - 1;
        }

        this.updateFrameDisplay();
        this.redrawCanvas();
    }

    moveFrameLeft() {
        if (this.currentFrame <= 0) return;

        const temp = this.frames[this.currentFrame];
        this.frames[this.currentFrame] = this.frames[this.currentFrame - 1];
        this.frames[this.currentFrame - 1] = temp;
        this.currentFrame--;

        this.updateFrameDisplay();
    }

    moveFrameRight() {
        if (this.currentFrame >= this.totalFrames - 1) return;

        const temp = this.frames[this.currentFrame];
        this.frames[this.currentFrame] = this.frames[this.currentFrame + 1];
        this.frames[this.currentFrame + 1] = temp;
        this.currentFrame++;

        this.updateFrameDisplay();
    }

    selectFrame(frameIndex) {
        if (frameIndex < 0 || frameIndex >= this.totalFrames) return;

        this.currentFrame = frameIndex;
        this.updateFrameDisplay();
        this.redrawCanvas();
    }

    updateFrameDisplay() {
        document.getElementById('currentFrameDisplay').textContent = this.currentFrame + 1;
        document.getElementById('totalFramesDisplay').textContent = this.totalFrames;

        // Update frame thumbnails
        this.updateFrameThumbnails();

        // Update active frame styling
        document.querySelectorAll('.frame-item').forEach((item, index) => {
            item.classList.toggle('active', index === this.currentFrame);
        });
    }

    updateFrameThumbnails() {
        const container = document.querySelector('.frames-container');
        container.innerHTML = '';

        for (let i = 0; i < this.totalFrames; i++) {
            const frameItem = document.createElement('div');
            frameItem.className = 'frame-item';
            frameItem.dataset.frame = i;
            frameItem.style.cssText = `
                min-width: 120px; height: 90px; border: 2px solid ${i === this.currentFrame ? '#4CAF50' : '#666'};
                margin-right: 8px; background: #444; cursor: pointer; position: relative;
            `;

            frameItem.innerHTML = `
                <div style="text-align: center; padding: 4px; font-size: 12px; color: #ccc;">Frame ${i + 1}</div>
                <canvas width="100" height="60" style="width: 100%; height: calc(100% - 20px); image-rendering: pixelated;"></canvas>
                <label style="position: absolute; bottom: 2px; right: 2px; font-size: 10px;">
                    <input type="checkbox" checked> Visible
                </label>
            `;

            container.appendChild(frameItem);

            // Draw thumbnail
            const thumbCanvas = frameItem.querySelector('canvas');
            const thumbCtx = thumbCanvas.getContext('2d');
            this.drawFrameThumbnail(thumbCtx, this.frames[i] || []);
        }
    }

    drawFrameThumbnail(ctx, shapes) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.save();
        ctx.scale(0.125, 0.1); // Scale down for thumbnail

        shapes.forEach(shape => {
            this.drawShapeOnContext(ctx, shape);
        });

        ctx.restore();
    }

    // Animation Preview Methods
    previewAnimation() {
        document.getElementById('animationPreviewModal-sprite').style.display = 'flex';
        this.previewFrame = 0;
        this.previewDirection = 1;
        this.drawPreviewFrame();
        this.playPreview();
    }

    closeAnimationPreview() {
        document.getElementById('animationPreviewModal-sprite').style.display = 'none';
        this.stopPreview();
    }

    playPreview() {
        this.previewPlaying = true;
        this.previewFrameTimer = 0;
        let lastTime = performance.now();

        const animate = (now) => {
            if (!this.previewPlaying) return;
            const delta = (now - lastTime) / 1000;
            lastTime = now;

            // Advance frame based on animSpeed
            this.previewFrameTimer += delta * this.animSpeed;
            if (this.previewFrameTimer >= 0.1) { // 0.1s per frame at speed=1
                this.previewFrameTimer = 0;
                if (this.pingPong) {
                    this.previewFrame += this.previewDirection;
                    if (this.previewFrame >= this.totalFrames - 1) {
                        this.previewDirection = -1;
                        this.previewFrame = this.totalFrames - 1;
                    } else if (this.previewFrame <= 0) {
                        this.previewDirection = 1;
                        this.previewFrame = 0;
                    }
                } else {
                    this.previewFrame = (this.previewFrame + 1) % this.totalFrames;
                }
                this.drawPreviewFrame();
            }
            this.previewInterval = requestAnimationFrame(animate);
        };

        if (this.previewInterval) cancelAnimationFrame(this.previewInterval);
        this.previewInterval = requestAnimationFrame(animate);
    }

    pausePreview() {
        this.previewPlaying = false;
        if (this.previewInterval) {
            cancelAnimationFrame(this.previewInterval);
            this.previewInterval = null;
        }
    }

    stopPreview() {
        this.pausePreview();
        this.previewFrame = 0;
        this.previewDirection = 1; // Reset direction
        this.drawPreviewFrame();
    }

    drawPreviewFrame() {
        const canvas = document.getElementById('animationPreviewCanvas-sprite');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();

        // Center the drawing in the preview canvas
        const canvasCenterX = canvas.width / 2;
        const canvasCenterY = canvas.height / 2;
        ctx.translate(canvasCenterX, canvasCenterY);

        // Calculate shape center and offset to center around 0,0
        const shapeCenter = this.calculateShapesCenterPoint();
        ctx.translate(-shapeCenter.centerX, -shapeCenter.centerY);

        const shapes = this.frames[this.previewFrame] || [];
        shapes.forEach(shape => {
            this.drawShapeOnContext(ctx, shape);
        });

        ctx.restore();
    }

    // Enhanced Export Methods
    exportCode() {
        if (this.frames.every(frame => !frame || frame.length === 0)) {
            alert('No shapes to export!');
            return;
        }

        const bounds = this.calculateBounds();
        const moduleName = prompt('Enter module name:', 'CustomDrawing') || 'CustomDrawing';
        const namespace = prompt('Enter namespace:', 'Drawing') || 'Drawing';
        const description = prompt('Enter description:', 'Custom generated drawing module') || 'Custom generated drawing module';

        let code = this.generateModuleCode(moduleName, namespace, description, bounds);

        document.getElementById('generatedCode-sprite').textContent = code;
        document.getElementById('codeModal-sprite').style.display = 'flex';
    }

    generateModuleCode(moduleName, namespace, description, bounds) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const offsetX = bounds.centerX - centerX;
        const offsetY = bounds.centerY - centerY;

        return `class ${moduleName} extends Module {
    static namespace = "${namespace}";
    static description = "${description}";
    static allowMultiple = false;
    static iconClass = "fas fa-paint-brush";
    static iconColor = "#64B5F6";

    constructor() {
        super("${moduleName}");

        // Visual properties
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.flipped = false;
        
        // Animation properties
        this.isAnimated = ${this.totalFrames > 1};
        this.currentFrame = 0;
        this.animationSpeed = ${this.animSpeed};
        this.isPlaying = false;
        this.frameTimer = 0;
        this.pingPong = ${this.pingPong};
        this.playDirection = 1;
        this.totalFrames = ${this.totalFrames};
        this.enableTweening = ${this.enableTweening};
        this.tweenType = "${this.tweenType}";
        
        // Frame data
        this.frames = ${JSON.stringify(this.frames, null, 8)};
        
        this.exposeProperties();
    }

    exposeProperties() {
        this.exposeProperty("scale", "number", this.scale, {
            description: "Scale factor",
            onChange: (val) => { this.scale = val; }
        });
        
        this.exposeProperty("offsetX", "number", this.offsetX, {
            description: "X offset",
            onChange: (val) => { this.offsetX = val; }
        });
        
        this.exposeProperty("offsetY", "number", this.offsetY, {
            description: "Y offset", 
            onChange: (val) => { this.offsetY = val; }
        });
        
        this.exposeProperty("flipped", "boolean", this.flipped, {
            description: "Flip horizontally",
            onChange: (val) => { this.flipped = val; }
        });

        if (this.isAnimated) {
            this.exposeProperty("animationSpeed", "number", this.animationSpeed, {
                description: "Animation speed",
                onChange: (val) => { this.animationSpeed = val; }
            });
            
            this.exposeProperty("isPlaying", "boolean", this.isPlaying, {
                description: "Is playing animation",
                onChange: (val) => { val }
            });
        }
    }

    style(style) {
        style.startGroup("${moduleName} Appearance", false, { 
            backgroundColor: 'rgba(59,130,246,0.1)',
            borderRadius: '6px',
            padding: '8px'
        });
        
        style.exposeProperty("scale", "number", this.scale, {
            min: 0.1,
            max: 5,
            step: 0.1,
            style: { label: "Scale", slider: true }
        });
        
        style.exposeProperty("offsetX", "number", this.offsetX, {
            min: -200,
            max: 200,
            style: { label: "Offset X", slider: true }
        });
        
        style.exposeProperty("offsetY", "number", this.offsetY, {
            min: -200,
            max: 200,
            style: { label: "Offset Y", slider: true }
        });
        
        style.exposeProperty("flipped", "boolean", this.flipped, {
            style: { label: "Flip Horizontally" }
        });
        
        if (this.isAnimated) {
            style.startGroup("Animation Controls", true);
            
            style.exposeProperty("animationSpeed", "number", this.animationSpeed, {
                min: 0.1,
                max: 5,
                step: 0.1,
                style: { label: "Speed", slider: true }
            });
            
            style.exposeProperty("isPlaying", "boolean", this.isPlaying, {
                style: { label: "Playing" }
            });
            
            style.endGroup();
        }
        
        style.endGroup();
        style.addHelpText("Generated drawing module with animation support");
    }

    // Public API Methods
    play() {
        this.isPlaying = true;
        return this;
    }

    pause() {
        this.isPlaying = false;
        return this;
    }

    stop() {
        this.isPlaying = false;
        this.currentFrame = 0;
        this.frameTimer = 0;
        return this;
    }

    setFrame(frameIndex) {
        if (frameIndex >= 0 && frameIndex < this.totalFrames) {
            this.currentFrame = frameIndex;
        }
        return this;
    }

    setSpeed(speed) {
        this.animationSpeed = Math.max(0.1, speed);
        return this;
    }

    getCurrentFrame() {
        return this.currentFrame;
    }

    getTotalFrames() {
        return this.totalFrames;
    }

    loop(deltaTime) {
        if (this.isAnimated && this.isPlaying) {
            this.frameTimer += deltaTime * this.animationSpeed;
            
            if (this.frameTimer >= 1) {
                this.frameTimer = 0;
                
                if (this.pingPong) {
                    this.currentFrame += this.playDirection;
                    if (this.currentFrame >= this.totalFrames - 1) {
                        this.playDirection = -1;
                        this.currentFrame = this.totalFrames - 1;
                    } else if (this.currentFrame <= 0) {
                        this.playDirection = 1;
                        this.currentFrame = 0;
                    }
                } else {
                    this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
                }
            }
        }
    }

    draw(ctx) {
        ctx.save();
        
        // Apply transformations
        ctx.scale(this.scale, this.scale);
        if (this.flipped) {
            ctx.scale(-1, 1);
        }
        ctx.translate(this.offsetX, this.offsetY);

        // Calculate the center point of all shapes to use as origin
        const shapeCenter = this.calculateShapesCenterPoint();
        
        // Translate so shapes center around 0,0
        ctx.translate(-shapeCenter.centerX, -shapeCenter.centerY);

        // Get current frame shapes
        const shapes = this.frames[this.currentFrame] || [];
        shapes.forEach((shape, index) => {
            this.drawShape(ctx, shape);
        });

        ctx.restore();
    }

    calculateShapesCenterPoint() {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasShapes = false;

        this.frames.forEach(frame => {
            if (!frame) return;
            frame.forEach(shape => {
                hasShapes = true;
                if (shape.type === 'spline') {
                    shape.points.forEach(point => {
                        minX = Math.min(minX, point.x);
                        minY = Math.min(minY, point.y);
                        maxX = Math.max(maxX, point.x);
                        maxY = Math.max(maxY, point.y);
                    });
                } else if (shape.type === 'circle') {
                    const radius = Math.sqrt((shape.endX - shape.startX) ** 2 + (shape.endY - shape.startY) ** 2);
                    minX = Math.min(minX, shape.startX - radius);
                    minY = Math.min(minY, shape.startY - radius);
                    maxX = Math.max(maxX, shape.startX + radius);
                    maxY = Math.max(maxY, shape.startY + radius);
                } else {
                    minX = Math.min(minX, shape.startX, shape.endX);
                    minY = Math.min(minY, shape.startY, shape.endY);
                    maxX = Math.max(maxX, shape.startX, shape.endX);
                    maxY = Math.max(maxY, shape.startY, shape.endY);
                }
            });
        });

        if (!hasShapes) return { centerX: 0, centerY: 0 };
        
        return {
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2
        };
    }

    createGradient(shape, ctx) {
        if (!shape.gradient || !shape.gradient.enabled) return shape.fillColor;
        
        let gradient;
        const bounds = this.getShapeBounds(shape);
        
        if (shape.gradient.type === 'radial') {
            const centerX = bounds.x + bounds.width / 2;
            const centerY = bounds.y + bounds.height / 2;
            const radius = Math.max(bounds.width, bounds.height) / 2;
            gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        } else {
            // Linear gradient
            const angle = (shape.gradient.angle || 0) * Math.PI / 180;
            const x1 = bounds.x + bounds.width / 2 - Math.cos(angle) * bounds.width / 2;
            const y1 = bounds.y + bounds.height / 2 - Math.sin(angle) * bounds.height / 2;
            const x2 = bounds.x + bounds.width / 2 + Math.cos(angle) * bounds.width / 2;
            const y2 = bounds.y + bounds.height / 2 + Math.sin(angle) * bounds.height / 2;
            gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        }
        
        gradient.addColorStop(0, shape.gradient.start);
        gradient.addColorStop(1, shape.gradient.end);
        
        return gradient;
    }

    getShapeBounds(shape) {
        if (shape.type === 'spline') {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            shape.points.forEach(pt => {
                minX = Math.min(minX, pt.x);
                minY = Math.min(minY, pt.y);
                maxX = Math.max(maxX, pt.x);
                maxY = Math.max(maxY, pt.y);
            });
            return {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
            };
        } else if (shape.type === 'circle') {
            const radius = Math.sqrt((shape.endX - shape.startX) ** 2 + (shape.endY - shape.startY) ** 2);
            return {
                x: shape.startX - radius,
                y: shape.startY - radius,
                width: radius * 2,
                height: radius * 2
            };
        } else {
            const minX = Math.min(shape.startX, shape.endX);
            const minY = Math.min(shape.startY, shape.endY);
            const maxX = Math.max(shape.startX, shape.endX);
            const maxY = Math.max(shape.startY, shape.endY);
            return {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
            };
        }
    }

    drawShape(ctx, shape) {
        if (!shape.visible) return;
        
        ctx.save();
        
        // Apply transformations
        if (shape.rotation || shape.scaleX !== 1 || shape.scaleY !== 1) {
            const bounds = this.getShapeBounds(shape);
            const centerX = bounds.x + bounds.width / 2;
            const centerY = bounds.y + bounds.height / 2;
            
            ctx.translate(centerX, centerY);
            ctx.rotate((shape.rotation || 0) * Math.PI / 180);
            ctx.scale(shape.scaleX || 1, shape.scaleY || 1);
            ctx.translate(-centerX, -centerY);
        }
        
        // Set up colors/gradients
        ctx.fillStyle = shape.gradient ? this.createGradient(shape, ctx) : shape.fillColor;
        ctx.strokeStyle = shape.strokeColor;
        ctx.lineWidth = shape.strokeWidth;
        ctx.setLineDash([]);

        switch (shape.type) {
            case 'rectangle':
                this.drawRectangle(ctx, shape);
                break;
            case 'circle':
                this.drawCircle(ctx, shape);
                break;
            case 'triangle':
                this.drawTriangle(ctx, shape);
                break;
            case 'line':
                this.drawLine(ctx, shape);
                break;
            case 'spline':
                this.drawSpline(ctx, shape);
                break;
        }

        ctx.restore();
    }

    drawRectangle(ctx, shape) {
        const width = shape.endX - shape.startX;
        const height = shape.endY - shape.startY;
        if (shape.fill) ctx.fillRect(shape.startX, shape.startY, width, height);
        if (shape.stroke) ctx.strokeRect(shape.startX, shape.startY, width, height);
    }

    drawCircle(ctx, shape) {
        const radius = Math.sqrt((shape.endX - shape.startX) ** 2 + (shape.endY - shape.startY) ** 2);
        ctx.beginPath();
        ctx.arc(shape.startX, shape.startY, radius, 0, Math.PI * 2);
        if (shape.fill) ctx.fill();
        if (shape.stroke) ctx.stroke();
    }

    drawTriangle(ctx, shape) {
        const midX = (shape.startX + shape.endX) / 2;
        ctx.beginPath();
        ctx.moveTo(midX, shape.startY);
        ctx.lineTo(shape.startX, shape.endY);
        ctx.lineTo(shape.endX, shape.endY);
        ctx.closePath();
        if (shape.fill) ctx.fill();
        if (shape.stroke) ctx.stroke();
    }

    drawLine(ctx, shape) {
        ctx.beginPath();
        ctx.moveTo(shape.startX, shape.startY);
        ctx.lineTo(shape.endX, shape.endY);
        ctx.stroke();
    }

    drawSpline(ctx, shape) {
        if (shape.points.length < 2) return;
        ctx.beginPath();
        if (shape.points.length === 2) {
            ctx.moveTo(shape.points[0].x, shape.points[0].y);
            ctx.lineTo(shape.points[1].x, shape.points[1].y);
        } else {
            // Use the original points without offset
            this.drawSmoothSpline(shape.points, shape.curveIntensity, shape.closed, ctx);
        }
        if (shape.closed) ctx.closePath();
        if (shape.fill && shape.closed) ctx.fill();
        if (shape.stroke) ctx.stroke();
    }

    // Update drawSmoothSpline to accept ctx
    drawSmoothSpline(points, intensity, closed, ctx = this.ctx) {
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const next = points[(i + 1) % points.length];
            const cp1x = prev.x + (curr.x - prev.x) * intensity;
            const cp1y = prev.y + (curr.y - prev.y) * intensity;
            const cp2x = curr.x - (next.x - prev.x) * intensity * 0.2;
            const cp2y = curr.y - (next.y - prev.y) * intensity * 0.2;
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, curr.x, curr.y);
        }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            scale: this.scale,
            offsetX: this.offsetX,
            offsetY: this.offsetY,
            flipped: this.flipped,
            animationSpeed: this.animationSpeed,
            isPlaying: this.isPlaying,
            currentFrame: this.currentFrame
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        if (!data) return;

        this.scale = data.scale || 1;
        this.offsetX = data.offsetX || 0;
        this.offsetY = data.offsetY || 0;
        this.flipped = data.flipped || false;
        this.animationSpeed = data.animationSpeed || 1;
        this.isPlaying = data.isPlaying || false;
        this.currentFrame = data.currentFrame || 0;
    }
}

window.${moduleName} = ${moduleName};`;
    }

    generateDrawingCode() {
        return `        shapes.forEach((shape, index) => {
            this.drawShape(ctx, shape);
        });`;
    }

    drawShape(ctx, shape) {
        if (!shape.visible) return;

        ctx.save();

        // Apply transformations
        if (shape.rotation || shape.scaleX !== 1 || shape.scaleY !== 1) {
            const bounds = this.getShapeBounds(shape);
            const centerX = bounds.x + bounds.width / 2;
            const centerY = bounds.y + bounds.height / 2;

            ctx.translate(centerX, centerY);
            ctx.rotate((shape.rotation || 0) * Math.PI / 180);
            ctx.scale(shape.scaleX || 1, shape.scaleY || 1);
            ctx.translate(-centerX, -centerY);
        }

        // Set up colors/gradients
        ctx.fillStyle = shape.gradient ? this.createGradient(shape, ctx) : shape.fillColor;
        ctx.strokeStyle = shape.strokeColor;
        ctx.lineWidth = shape.strokeWidth;
        ctx.setLineDash([]);

        // Draw the shape
        switch (shape.type) {
            case 'rectangle':
                this.drawRectangle(ctx, shape);
                break;
            case 'circle':
                this.drawCircle(ctx, shape);
                break;
            case 'triangle':
                this.drawTriangle(ctx, shape);
                break;
            case 'line':
                this.drawLine(ctx, shape);
                break;
            case 'spline':
                this.drawSpline(ctx, shape);
                break;
        }

        ctx.restore();
    }

    drawShapeOnContext(ctx, shape) {
        this.drawShape(ctx, shape);
    }

    calculateBounds() {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasShapes = false;

        this.frames.forEach(frame => {
            if (!frame) return;
            frame.forEach(shape => {
                hasShapes = true;
                if (shape.type === 'spline') {
                    shape.points.forEach(point => {
                        minX = Math.min(minX, point.x);
                        minY = Math.min(minY, point.y);
                        maxX = Math.max(maxX, point.x);
                        maxY = Math.max(maxY, point.y);
                    });
                } else if (shape.type === 'circle') {
                    const radius = Math.sqrt((shape.endX - shape.startX) ** 2 + (shape.endY - shape.startY) ** 2);
                    minX = Math.min(minX, shape.startX - radius);
                    minY = Math.min(minY, shape.startY - radius);
                    maxX = Math.max(maxX, shape.startX + radius);
                    maxY = Math.max(maxY, shape.startY + radius);
                } else {
                    minX = Math.min(minX, shape.startX, shape.endX);
                    minY = Math.min(minY, shape.startY, shape.endY);
                    maxX = Math.max(maxX, shape.startX, shape.endX);
                    maxY = Math.max(maxY, shape.startY, shape.endY);
                }
            });
        });

        if (!hasShapes) {
            return {
                minX: 0, minY: 0, maxX: 0, maxY: 0,
                centerX: this.canvas.width / 2,
                centerY: this.canvas.height / 2
            };
        }

        return {
            minX, minY, maxX, maxY,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2
        };
    }

    calculateShapesCenterPoint() {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasShapes = false;

        this.frames.forEach(frame => {
            if (!frame) return;
            frame.forEach(shape => {
                hasShapes = true;
                if (shape.type === 'spline') {
                    shape.points.forEach(point => {
                        minX = Math.min(minX, point.x);
                        minY = Math.min(minY, point.y);
                        maxX = Math.max(maxX, point.x);
                        maxY = Math.max(maxY, point.y);
                    });
                } else if (shape.type === 'circle') {
                    const radius = Math.sqrt((shape.endX - shape.startX) ** 2 + (shape.endY - shape.startY) ** 2);
                    minX = Math.min(minX, shape.startX - radius);
                    minY = Math.min(minY, shape.startY - radius);
                    maxX = Math.max(maxX, shape.startX + radius);
                    maxY = Math.max(maxY, shape.startY + radius);
                } else {
                    minX = Math.min(minX, shape.startX, shape.endX);
                    minY = Math.min(minY, shape.startY, shape.endY);
                    maxX = Math.max(maxX, shape.startX, shape.endX);
                    maxY = Math.max(maxY, shape.startY, shape.endY);
                }
            });
        });

        if (!hasShapes) {
            return { centerX: this.canvas.width / 2, centerY: this.canvas.height / 2 };
        }

        return {
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2
        };
    }

    // Rest of the existing methods remain the same...
    initializeCanvas() {
        this.canvas = document.getElementById('drawingCanvas-sprite');
        this.ctx = this.canvas.getContext('2d');

        // Draw center dot
        this.drawCenterDot();

        // Add event listeners
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('click', this.handleClick.bind(this));
    }

    handleResizeStart(e, handleType) {
        this.isResizing = true;
        this.resizeHandle = handleType;
        this.resizeStartX = e.clientX;
        this.resizeStartY = e.clientY;

        // Store original bounds
        this.originalBounds = this.getShapeBounds(this.selectedShape);

        e.preventDefault();
    }

    handleRotationStart(e) {
        this.isRotating = true;
        const bounds = this.getShapeBounds(this.selectedShape);
        this.rotationCenterX = bounds.x + bounds.width / 2;
        this.rotationCenterY = bounds.y + bounds.height / 2;

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        this.rotationStart = Math.atan2(mouseY - this.rotationCenterY, mouseX - this.rotationCenterX) * 180 / Math.PI;
        this.originalRotation = this.selectedShape.rotation || 0;

        e.preventDefault();
    }

    drawCenterDot() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        this.ctx.save();
        this.ctx.fillStyle = '#ff0000';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }

    toggleGradientOptions() {
        const options = ['gradientOptions-sprite', 'gradientOptions2-sprite', 'gradientOptions3-sprite', 'gradientOptions4-sprite'];
        options.forEach(id => {
            document.getElementById(id).style.display = this.enableGradient ? 'flex' : 'none';
        });
    }

    createGradient(shape, ctx) {
        if (!this.enableGradient || !shape.gradient) return shape.fillColor;

        let gradient;
        const bounds = this.getShapeBounds(shape);

        if (shape.gradient.type === 'radial') {
            const centerX = bounds.x + bounds.width / 2;
            const centerY = bounds.y + bounds.height / 2;
            const radius = Math.max(bounds.width, bounds.height) / 2;
            gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        } else {
            // Linear gradient
            const angle = (shape.gradient.angle || 0) * Math.PI / 180;
            const x1 = bounds.x + bounds.width / 2 - Math.cos(angle) * bounds.width / 2;
            const y1 = bounds.y + bounds.height / 2 - Math.sin(angle) * bounds.height / 2;
            const x2 = bounds.x + bounds.width / 2 + Math.cos(angle) * bounds.width / 2;
            const y2 = bounds.y + bounds.height / 2 + Math.sin(angle) * bounds.height / 2;
            gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        }

        gradient.addColorStop(0, shape.gradient.start);
        gradient.addColorStop(1, shape.gradient.end);

        return gradient;
    }

    createShape(startX, startY, endX, endY) {
        const shape = {
            type: this.currentTool,
            startX, startY, endX, endY,
            fillColor: this.colors.fill,
            strokeColor: this.colors.stroke,
            strokeWidth: this.strokeWidth,
            fill: this.fillShape,
            stroke: this.strokeShape,
            visible: true,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            gradient: this.enableGradient ? {
                enabled: true,
                start: this.gradientStart,
                end: this.gradientEnd,
                type: this.gradientType,
                angle: this.gradientAngle
            } : null
        };

        this.shapes.push(shape);
        this.updateShapesList();
        this.redrawCanvas();
    }

    createSpline() {
        if (this.tempSplinePoints.length < 2) return;

        const shape = {
            type: 'spline',
            points: [...this.tempSplinePoints],
            fillColor: this.colors.fill,
            strokeColor: this.colors.stroke,
            strokeWidth: this.strokeWidth,
            curveIntensity: this.curveIntensity,
            closed: this.closedSpline,
            fill: this.fillShape && this.closedSpline,
            stroke: this.strokeShape,
            visible: true,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            gradient: this.enableGradient ? {
                enabled: true,
                start: this.gradientStart,
                end: this.gradientEnd,
                type: this.gradientType,
                angle: this.gradientAngle
            } : null
        };

        this.shapes.push(shape);
        this.tempSplinePoints = [];
        this.updateShapesList();
        this.redrawCanvas();
    }

    getShapeAtPoint(x, y) {
        // Check shapes in reverse order (top to bottom)
        for (let i = this.shapes.length - 1; i >= 0; i--) {
            if (this.isPointInShape(x, y, this.shapes[i])) {
                return this.shapes[i];
            }
        }
        return null;
    }

    getShapeBounds(shape) {
        if (shape.type === 'spline') {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            shape.points.forEach(pt => {
                minX = Math.min(minX, pt.x);
                minY = Math.min(minY, pt.y);
                maxX = Math.max(maxX, pt.x);
                maxY = Math.max(maxY, pt.y);
            });
            return {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
            };
        } else if (shape.type === 'circle') {
            const radius = Math.sqrt((shape.endX - shape.startX) ** 2 + (shape.endY - shape.startY) ** 2);
            return {
                x: shape.startX - radius,
                y: shape.startY - radius,
                width: radius * 2,
                height: radius * 2
            };
        } else {
            const minX = Math.min(shape.startX, shape.endX);
            const minY = Math.min(shape.startY, shape.endY);
            const maxX = Math.max(shape.startX, shape.endX);
            const maxY = Math.max(shape.startY, shape.endY);
            return {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
            };
        }
    }

    pointInPolygon(x, y, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            if (((polygon[i].y > y) !== (polygon[j].y > y)) &&
                (x < (polygon[j].x - polygon[i].x) * (y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
                inside = !inside;
            }
        }
        return inside;
    }

    isPointInShape(x, y, shape) {
        if (!shape.visible) return false;

        switch (shape.type) {
            case 'rectangle':
                return x >= Math.min(shape.startX, shape.endX) &&
                    x <= Math.max(shape.startX, shape.endX) &&
                    y >= Math.min(shape.startY, shape.endY) &&
                    y <= Math.max(shape.startY, shape.endY);
            case 'circle':
                const radius = Math.sqrt((shape.endX - shape.startX) ** 2 + (shape.endY - shape.startY) ** 2);
                const dist = Math.sqrt((x - shape.startX) ** 2 + (y - shape.startY) ** 2);
                return dist <= radius;
            case 'spline':
                if (shape.closed && shape.fill) {
                    // Use point-in-polygon test for closed filled splines
                    return this.pointInPolygon(x, y, shape.points);
                } else {
                    // Check if point is near any line segment
                    for (let i = 0; i < shape.points.length - 1; i++) {
                        if (this.distanceToLine(x, y, shape.points[i], shape.points[i + 1]) < 10) {
                            return true;
                        }
                    }
                    return false;
                }
        }
        return false;
    }

    updateToolOptions() {
        document.getElementById('splineOptions-sprite').style.display =
            this.currentTool === 'spline' ? 'block' : 'none';

        // Show/hide finish spline button
        const btn = document.getElementById('finishSplineBtn-sprite');
        if (btn) btn.style.display = this.currentTool === 'spline' ? 'inline-block' : 'none';
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.startX = e.clientX - rect.left;
        this.startY = e.clientY - rect.top;

        if (this.currentTool === 'select') {
            const shape = this.getShapeAtPoint(this.startX, this.startY);
            this.selectedShape = shape;

            if (shape) {
                if (shape.type === 'spline') {
                    // Check if clicking on a control point
                    this.selectedPoint = this.getSplinePointAt(this.startX, this.startY, shape);
                }

                this.isDragging = true;
                this.dragOffset = {
                    x: this.startX - (shape.startX || shape.points[0].x),
                    y: this.startY - (shape.startY || shape.points[0].y)
                };
            }
            this.redrawCanvas();
            return;
        }

        if (this.currentTool === 'spline') {
            // Spline tool uses click events instead
            return;
        }

        this.drawing = true;
        this.saveState();
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        if (this.isResizing && this.selectedShape) {
            this.handleResize(e);
            return;
        }

        if (this.isRotating && this.selectedShape) {
            this.handleRotation(e);
            return;
        }

        // Dragging selected shape
        if (this.isDragging && this.selectedShape && this.currentTool === 'select') {
            if (this.selectedShape.type === 'spline' && this.selectedPoint) {
                // Move selected spline point
                this.selectedPoint.x = currentX;
                this.selectedPoint.y = currentY;
            } else {
                // Move entire shape
                const dx = currentX - this.startX;
                const dy = currentY - this.startY;
                if (this.selectedShape.type === 'spline') {
                    this.selectedShape.points.forEach(pt => {
                        pt.x += dx;
                        pt.y += dy;
                    });
                } else {
                    this.selectedShape.startX += dx;
                    this.selectedShape.startY += dy;
                    this.selectedShape.endX += dx;
                    this.selectedShape.endY += dy;
                }
                this.startX = currentX;
                this.startY = currentY;
            }
            this.redrawCanvas();
            return;
        }

        if (!this.drawing || this.currentTool === 'spline') return;

        this.redrawCanvas();
        this.drawPreview(this.startX, this.startY, currentX, currentY);
    }

    handleMouseUp(e) {
        if (this.isDragging && this.currentTool === 'select') {
            this.isDragging = false;
            this.selectedPoint = null;
            return;
        }
        if (!this.drawing || this.currentTool === 'spline') return;

        const rect = this.canvas.getBoundingClientRect();
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;

        this.createShape(this.startX, this.startY, endX, endY);
        this.drawing = false;
    }

    handleClick(e) {
        if (this.currentTool !== 'spline') return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (e.detail === 2) { // Double click
            if (this.tempSplinePoints.length > 2) {
                this.createSpline();
            }
        } else {
            this.tempSplinePoints.push({ x, y });
            this.redrawCanvas();
            this.drawSplinePreview();
        }
    }

    handleResize(e) {
        const deltaX = e.clientX - this.resizeStartX;
        const deltaY = e.clientY - this.resizeStartY;

        const bounds = this.originalBounds;
        let newBounds = { ...bounds };

        switch (this.resizeHandle) {
            case 'se':
                newBounds.width = bounds.width + deltaX;
                newBounds.height = bounds.height + deltaY;
                break;
            case 'sw':
                newBounds.x = bounds.x + deltaX;
                newBounds.width = bounds.width - deltaX;
                newBounds.height = bounds.height + deltaY;
                break;
            case 'ne':
                newBounds.width = bounds.width + deltaX;
                newBounds.y = bounds.y + deltaY;
                newBounds.height = bounds.height - deltaY;
                break;
            case 'nw':
                newBounds.x = bounds.x + deltaX;
                newBounds.width = bounds.width - deltaX;
                newBounds.y = bounds.y + deltaY;
                newBounds.height = bounds.height - deltaY;
                break;
            // Add cases for edge handles (n, s, e, w)
        }

        this.applyBoundsToShape(this.selectedShape, newBounds);
        this.redrawCanvas();
    }

    handleRotation(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const currentAngle = Math.atan2(mouseY - this.rotationCenterY, mouseX - this.rotationCenterX) * 180 / Math.PI;
        const rotation = this.originalRotation + (currentAngle - this.rotationStart);

        this.selectedShape.rotation = rotation;

        // Update UI slider
        document.getElementById('shapeRotation-sprite').value = rotation;
        document.getElementById('rotationValue-sprite').textContent = Math.round(rotation);

        this.redrawCanvas();
    }

    applyBoundsToShape(shape, bounds) {
        if (shape.type === 'spline') {
            // Scale spline points proportionally
            const oldBounds = this.getShapeBounds(shape);
            const scaleX = bounds.width / oldBounds.width;
            const scaleY = bounds.height / oldBounds.height;

            shape.points.forEach(pt => {
                pt.x = bounds.x + (pt.x - oldBounds.x) * scaleX;
                pt.y = bounds.y + (pt.y - oldBounds.y) * scaleY;
            });
        } else {
            shape.startX = bounds.x;
            shape.startY = bounds.y;
            shape.endX = bounds.x + bounds.width;
            shape.endY = bounds.y + bounds.height;
        }
    }

    drawPreview(startX, startY, endX, endY) {
        this.ctx.save();
        this.ctx.strokeStyle = this.colors.stroke;
        this.ctx.fillStyle = this.colors.fill;
        this.ctx.lineWidth = this.strokeWidth;
        this.ctx.setLineDash([5, 5]);

        switch (this.currentTool) {
            case 'rectangle':
                this.drawRectanglePreview(startX, startY, endX, endY);
                break;
            case 'circle':
                this.drawCirclePreview(startX, startY, endX, endY);
                break;
            case 'triangle':
                this.drawTrianglePreview(startX, startY, endX, endY);
                break;
            case 'line':
                this.drawLinePreview(startX, startY, endX, endY);
                break;
        }

        this.ctx.restore();
    }

    drawSelectionIndicators() {
        if (!this.selectedShape) return;

        this.ctx.save();
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);

        if (this.selectedShape.type === 'spline') {
            // Draw control points for splines
            this.selectedShape.points.forEach(point => {
                this.ctx.fillStyle = '#00ff00';
                this.ctx.fillRect(point.x - 4, point.y - 4, 8, 8);
            });
        } else {
            // Draw bounding box for other shapes
            const bounds = this.getShapeBounds(this.selectedShape);
            this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

            // Draw resize handles
            this.drawResizeHandles(bounds);
        }

        this.ctx.restore();
    }

    drawRectanglePreview(startX, startY, endX, endY) {
        const width = endX - startX;
        const height = endY - startY;
        this.ctx.strokeRect(startX, startY, width, height);
    }

    drawCirclePreview(startX, startY, endX, endY) {
        const radius = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
        this.ctx.beginPath();
        this.ctx.arc(startX, startY, radius, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    drawTrianglePreview(startX, startY, endX, endY) {
        const midX = (startX + endX) / 2;
        this.ctx.beginPath();
        this.ctx.moveTo(midX, startY);
        this.ctx.lineTo(startX, endY);
        this.ctx.lineTo(endX, endY);
        this.ctx.closePath();
        this.ctx.stroke();
    }

    drawLinePreview(startX, startY, endX, endY) {
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();
    }

    drawSplinePreview() {
        if (this.tempSplinePoints.length < 2) return;

        this.ctx.save();
        this.ctx.strokeStyle = this.colors.stroke;
        this.ctx.lineWidth = this.strokeWidth;
        this.ctx.setLineDash([5, 5]);

        this.ctx.beginPath();
        if (this.tempSplinePoints.length === 2) {
            this.ctx.moveTo(this.tempSplinePoints[0].x, this.tempSplinePoints[0].y);
            this.ctx.lineTo(this.tempSplinePoints[1].x, this.tempSplinePoints[1].y);
        } else {
            this.drawSmoothSpline(this.tempSplinePoints, this.curveIntensity, this.closedSpline);
            if (this.closedSpline) this.ctx.closePath();
        }
        this.ctx.stroke();

        // Draw points
        this.tempSplinePoints.forEach(point => {
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(point.x - 2, point.y - 2, 4, 4);
        });

        this.ctx.restore();
    }

    redrawCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawCenterDot();

        this.shapes.forEach(shape => {
            this.drawShape(this.ctx, shape);
        });

        // Draw selection indicators on top
        this.drawSelectionIndicators();
        this.updateShapesList();
    }

    deleteSelectedShape() {
        if (this.selectedShape) {
            const index = this.shapes.indexOf(this.selectedShape);
            if (index > -1) {
                this.shapes.splice(index, 1);
                this.selectedShape = null;
                this.redrawCanvas();
            }
        }
    }

    updateShapesList() {
        const container = document.getElementById('shapesList-sprite');
        container.innerHTML = '';

        this.shapes.forEach((shape, index) => {
            const item = document.createElement('div');
            item.className = `shape-item-sprite ${this.selectedShapeIndex === index ? 'selected' : ''}`;
            item.dataset.index = index;
            item.draggable = true;

            const icon = this.getShapeIcon(shape.type);
            const name = `${shape.type.charAt(0).toUpperCase() + shape.type.slice(1)} ${index + 1}`;

            item.innerHTML = `
            <div class="shape-item-info">
                <span class="shape-item-icon">${icon}</span>
                <span class="shape-item-name">${name}</span>
            </div>
            <span class="shape-item-visibility ${shape.visible ? 'visible' : 'hidden'}">${shape.visible ? '👁️' : '👁️‍🗨️'}</span>
        `;

            container.appendChild(item);
        });

        document.getElementById('shapeCount-sprite').textContent = `(${this.shapes.length})`;
        this.updateShapeToolbarButtons();
    }

    getShapeIcon(type) {
        const icons = {
            rectangle: '⬜',
            circle: '⚪',
            triangle: '🔺',
            line: '📏',
            spline: '〰️'
        };
        return icons[type] || '⚪';
    }

    selectShapeByIndex(index) {
        this.selectedShapeIndex = index;
        this.selectedShape = this.shapes[index];
        this.updateShapesList();
        this.updateTransformControls();
        this.updateShapeToolbarButtons();
        this.redrawCanvas();
    }

    updateTransformControls() {
        const transformPanel = document.getElementById('transformOptions-sprite');
        if (this.selectedShape) {
            transformPanel.style.display = 'block';

            document.getElementById('shapeRotation-sprite').value = this.selectedShape.rotation || 0;
            document.getElementById('rotationValue-sprite').textContent = this.selectedShape.rotation || 0;

            document.getElementById('shapeScaleX-sprite').value = this.selectedShape.scaleX || 1;
            document.getElementById('scaleXValue-sprite').textContent = this.selectedShape.scaleX || 1;

            document.getElementById('shapeScaleY-sprite').value = this.selectedShape.scaleY || 1;
            document.getElementById('scaleYValue-sprite').textContent = this.selectedShape.scaleY || 1;
        } else {
            transformPanel.style.display = 'none';
        }
    }

    updateShapeTransform(property, value) {
        if (this.selectedShape) {
            this.selectedShape[property] = value;
            this.redrawCanvas();
        }
    }

    updateShapeToolbarButtons() {
        const hasSelection = this.selectedShapeIndex >= 0;
        const canMoveUp = hasSelection && this.selectedShapeIndex > 0;
        const canMoveDown = hasSelection && this.selectedShapeIndex < this.shapes.length - 1;

        document.getElementById('moveShapeUp-sprite').disabled = !canMoveUp;
        document.getElementById('moveShapeDown-sprite').disabled = !canMoveDown;
        document.getElementById('deleteShape-sprite').disabled = !hasSelection;
        document.getElementById('duplicateShape-sprite').disabled = !hasSelection;
    }

    moveShape(direction) {
        if (this.selectedShapeIndex < 0) return;

        const newIndex = this.selectedShapeIndex + direction;
        if (newIndex < 0 || newIndex >= this.shapes.length) return;

        // Swap shapes
        [this.shapes[this.selectedShapeIndex], this.shapes[newIndex]] =
            [this.shapes[newIndex], this.shapes[this.selectedShapeIndex]];

        this.selectedShapeIndex = newIndex;
        this.selectedShape = this.shapes[newIndex];

        this.updateShapesList();
        this.redrawCanvas();
    }

    duplicateShape() {
        if (this.selectedShape) {
            const copy = JSON.parse(JSON.stringify(this.selectedShape));

            // Offset the copy slightly
            if (copy.type === 'spline') {
                copy.points.forEach(pt => {
                    pt.x += 10;
                    pt.y += 10;
                });
            } else {
                copy.startX += 10;
                copy.startY += 10;
                copy.endX += 10;
                copy.endY += 10;
            }

            this.shapes.push(copy);
            this.selectShapeByIndex(this.shapes.length - 1);
            this.updateShapesList();
            this.redrawCanvas();
        }
    }

    toggleShapeVisibility(index) {
        if (this.shapes[index]) {
            this.shapes[index].visible = !this.shapes[index].visible;
            this.updateShapesList();
            this.redrawCanvas();
        }
    }

    setupShapeListDragDrop() {
        const container = document.getElementById('shapesList-sprite');

        container.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('shape-item-sprite')) {
                this.draggedShapeIndex = parseInt(e.target.dataset.index);
                e.target.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            const afterElement = this.getDragAfterElement(container, e.clientY);
            const draggedElement = container.querySelector('.dragging');

            if (afterElement == null) {
                container.appendChild(draggedElement);
            } else {
                container.insertBefore(draggedElement, afterElement);
            }
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            const draggedElement = container.querySelector('.dragging');
            if (draggedElement) {
                const newIndex = Array.from(container.children).indexOf(draggedElement);

                // Reorder the shapes array
                const shape = this.shapes.splice(this.draggedShapeIndex, 1)[0];
                this.shapes.splice(newIndex, 0, shape);

                this.selectedShapeIndex = newIndex;
                this.selectedShape = shape;

                draggedElement.classList.remove('dragging');
                this.updateShapesList();
                this.redrawCanvas();
            }
        });

        container.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
        });
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.shape-item-sprite:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    drawRectangle(ctx, shape) {
        const width = shape.endX - shape.startX;
        const height = shape.endY - shape.startY;

        if (shape.fill) {
            ctx.fillRect(shape.startX, shape.startY, width, height);
        }
        if (shape.stroke) {
            ctx.strokeRect(shape.startX, shape.startY, width, height);
        }
    }

    drawCircle(ctx, shape) {
        const radius = Math.sqrt((shape.endX - shape.startX) ** 2 + (shape.endY - shape.startY) ** 2);
        ctx.beginPath();
        ctx.arc(shape.startX, shape.startY, radius, 0, Math.PI * 2);

        if (shape.fill) ctx.fill();
        if (shape.stroke) ctx.stroke();
    }

    drawTriangle(ctx, shape) {
        const midX = (shape.startX + shape.endX) / 2;
        ctx.beginPath();
        ctx.moveTo(midX, shape.startY);
        ctx.lineTo(shape.startX, shape.endY);
        ctx.lineTo(shape.endX, shape.endY);
        ctx.closePath();

        if (shape.fill) ctx.fill();
        if (shape.stroke) ctx.stroke();
    }

    drawLine(ctx, shape) {
        ctx.beginPath();
        ctx.moveTo(shape.startX, shape.startY);
        ctx.lineTo(shape.endX, shape.endY);
        ctx.stroke();
    }

    drawSpline(ctx, shape) {
        if (shape.points.length < 2) return;

        ctx.beginPath();

        if (shape.points.length === 2) {
            ctx.moveTo(shape.points[0].x, shape.points[0].y);
            ctx.lineTo(shape.points[1].x, shape.points[1].y);
        } else {
            this.drawSmoothSpline(shape.points, shape.curveIntensity, shape.closed);
        }

        if (shape.closed) ctx.closePath();

        if (shape.fill && shape.closed) ctx.fill();
        if (shape.stroke) ctx.stroke();
    }

    drawSmoothSpline(points, intensity, closed) {
        this.ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const next = points[(i + 1) % points.length];

            const cp1x = prev.x + (curr.x - prev.x) * intensity;
            const cp1y = prev.y + (curr.y - prev.y) * intensity;
            const cp2x = curr.x - (next.x - prev.x) * intensity * 0.2;
            const cp2y = curr.y - (next.y - prev.y) * intensity * 0.2;

            this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, curr.x, curr.y);
        }
    }

    saveState() {
        this.history = this.history || [];
        this.history.push(JSON.stringify(this.shapes));
        if (this.history.length > 20) {
            this.history.shift();
        }
    }

    undo() {
        if (this.history && this.history.length > 0) {
            const currentShapes = JSON.parse(this.history.pop());
            this.frames[this.currentFrame] = currentShapes;
            this.redrawCanvas();
        }
    }

    clearCanvas() {
        this.frames[this.currentFrame] = [];
        this.tempSplinePoints = [];
        this.redrawCanvas();
    }

    newDrawing() {
        this.frames = [[]];
        this.currentFrame = 0;
        this.totalFrames = 1;
        this.clearCanvas();
        this.history = [];
        this.updateFrameDisplay();
    }

    saveDrawing() {
        const data = {
            frames: this.frames,
            animationSettings: {
                enableTweening: this.enableTweening,
                animSpeed: this.animSpeed,
                tweenType: this.tweenType,
                pingPong: this.pingPong
            }
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'animated-drawing.json';
        a.click();
    }

    loadDrawing() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);

                        if (data.frames) {
                            // New format with animation
                            this.frames = data.frames;
                            this.totalFrames = this.frames.length;
                            this.currentFrame = 0;

                            if (data.animationSettings) {
                                this.enableTweening = data.animationSettings.enableTweening;
                                this.animSpeed = data.animationSettings.animSpeed;
                                this.tweenType = data.animationSettings.tweenType;
                                this.pingPong = data.animationSettings.pingPong;

                                // Update UI
                                document.getElementById('enableTweening-sprite').checked = this.enableTweening;
                                document.getElementById('animSpeed-sprite').value = this.animSpeed;
                                document.getElementById('animSpeedValue-sprite').textContent = this.animSpeed;
                                document.getElementById('tweenType-sprite').value = this.tweenType;
                                document.getElementById('pingPong-sprite').checked = this.pingPong;
                            }
                        } else {
                            // Old format - single frame
                            this.frames = [data];
                            this.totalFrames = 1;
                            this.currentFrame = 0;
                        }

                        this.updateFrameDisplay();
                        this.redrawCanvas();
                    } catch (err) {
                        alert('Error loading file: ' + err.message);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    distanceToLine(px, py, p1, p2) {
        const A = px - p1.x;
        const B = py - p1.y;
        const C = p2.x - p1.x;
        const D = p2.y - p1.y;

        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;
        if (len_sq !== 0) param = dot / len_sq;

        let xx, yy;
        if (param < 0) {
            xx = p1.x;
            yy = p1.y;
        } else if (param > 1) {
            xx = p2.x;
            yy = p2.y;
        } else {
            xx = p1.x + param * C;
            yy = p1.y + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getSplinePointAt(x, y, shape) {
        if (!shape.points) return null;
        for (let pt of shape.points) {
            const dx = x - pt.x;
            const dy = y - pt.y;
            if (Math.sqrt(dx * dx + dy * dy) < 8) { // 8px threshold
                return pt;
            }
        }
        return null;
    }

    drawResizeHandles(bounds) {
        const size = 8;
        const handles = [
            { x: bounds.x, y: bounds.y },
            { x: bounds.x + bounds.width, y: bounds.y },
            { x: bounds.x, y: bounds.y + bounds.height },
            { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
        ];
        this.ctx.save();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.strokeStyle = '#00ff00';
        handles.forEach(h => {
            this.ctx.fillRect(h.x - size / 2, h.y - size / 2, size, size);
            this.ctx.strokeRect(h.x - size / 2, h.y - size / 2, size, size);
        });
        this.ctx.restore();
    }

    copyCode() {
        const codeText = document.getElementById('generatedCode-sprite').textContent;
        navigator.clipboard.writeText(codeText).then(() => {
            alert('Code copied to clipboard!');
        });
    }

    closeCodeModal() {
        document.getElementById('codeModal-sprite').style.display = 'none';
    }
}

window.spriteCode = new SpriteCode();
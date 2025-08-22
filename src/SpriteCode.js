class SpriteCode {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.currentTool = 'select';
        this.drawing = false;
        this.startX = 0;
        this.startY = 0;
        this.shapes = [];
        this.history = [];
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

        this.selectedShape = null;
        this.dragOffset = { x: 0, y: 0 };
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = null;
        this.selectedPoint = null; // For spline point editing

        this.initializeEventListeners();
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

        /**/

        // Color and settings
        document.getElementById('fillColor-sprite').addEventListener('change', (e) => {
            this.colors.fill = e.target.value;
        });

        document.getElementById('strokeColor-sprite').addEventListener('change', (e) => {
            this.colors.stroke = e.target.value;
        });

        document.getElementById('strokeWidth-sprite').addEventListener('input', (e) => {
            this.strokeWidth = parseInt(e.target.value);
            document.getElementById('strokeWidthValue-sprite').textContent = this.strokeWidth;
        });

        document.getElementById('curveIntensity-sprite').addEventListener('input', (e) => {
            this.curveIntensity = parseFloat(e.target.value);
            document.getElementById('curveIntensityValue-sprite').textContent = this.curveIntensity;
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
    }

    openModal() {
        document.getElementById('modalOverlay-sprite').style.display = 'flex';
        this.initializeCanvas();

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
        this.clearCanvas();
        this.selectedShape = null;
        this.tempSplinePoints = [];
        this.drawing = false;
        this.isDragging = false;
        this.isResizing = false;
        this.selectedPoint = null;
    }

    closeCodeModal() {
        document.getElementById('codeModal-sprite').style.display = 'none';
    }

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

    isPointInShape(x, y, shape) {
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
                // Check if point is near any line segment
                for (let i = 0; i < shape.points.length - 1; i++) {
                    if (this.distanceToLine(x, y, shape.points[i], shape.points[i + 1]) < 10) {
                        return true;
                    }
                }
                return false;
            // Add other shape types...
        }
        return false;
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

    createShape(startX, startY, endX, endY) {
        const shape = {
            type: this.currentTool,
            startX, startY, endX, endY,
            fillColor: this.colors.fill,
            strokeColor: this.colors.stroke,
            strokeWidth: this.strokeWidth,
            fill: this.fillShape,
            stroke: this.strokeShape
        };

        this.shapes.push(shape);
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
            stroke: this.strokeShape
        };

        this.shapes.push(shape);
        this.tempSplinePoints = [];
        this.redrawCanvas();
    }

    redrawCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawCenterDot();

        this.shapes.forEach(shape => {
            this.drawShape(shape);
        });

        // Draw selection indicators on top
        this.drawSelectionIndicators();
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

    drawShape(shape) {
        this.ctx.save();
        this.ctx.fillStyle = shape.fillColor;
        this.ctx.strokeStyle = shape.strokeColor;
        this.ctx.lineWidth = shape.strokeWidth;
        this.ctx.setLineDash([]);

        switch (shape.type) {
            case 'rectangle':
                this.drawRectangle(shape);
                break;
            case 'circle':
                this.drawCircle(shape);
                break;
            case 'triangle':
                this.drawTriangle(shape);
                break;
            case 'line':
                this.drawLine(shape);
                break;
            case 'spline':
                this.drawSpline(shape);
                break;
        }

        this.ctx.restore();
    }

    drawRectangle(shape) {
        const width = shape.endX - shape.startX;
        const height = shape.endY - shape.startY;

        if (shape.fill) {
            this.ctx.fillRect(shape.startX, shape.startY, width, height);
        }
        if (shape.stroke) {
            this.ctx.strokeRect(shape.startX, shape.startY, width, height);
        }
    }

    drawCircle(shape) {
        const radius = Math.sqrt((shape.endX - shape.startX) ** 2 + (shape.endY - shape.startY) ** 2);
        this.ctx.beginPath();
        this.ctx.arc(shape.startX, shape.startY, radius, 0, Math.PI * 2);

        if (shape.fill) this.ctx.fill();
        if (shape.stroke) this.ctx.stroke();
    }

    drawTriangle(shape) {
        const midX = (shape.startX + shape.endX) / 2;
        this.ctx.beginPath();
        this.ctx.moveTo(midX, shape.startY);
        this.ctx.lineTo(shape.startX, shape.endY);
        this.ctx.lineTo(shape.endX, shape.endY);
        this.ctx.closePath();

        if (shape.fill) this.ctx.fill();
        if (shape.stroke) this.ctx.stroke();
    }

    drawLine(shape) {
        this.ctx.beginPath();
        this.ctx.moveTo(shape.startX, shape.startY);
        this.ctx.lineTo(shape.endX, shape.endY);
        this.ctx.stroke();
    }

    drawSpline(shape) {
        if (shape.points.length < 2) return;

        this.ctx.beginPath();

        if (shape.points.length === 2) {
            this.ctx.moveTo(shape.points[0].x, shape.points[0].y);
            this.ctx.lineTo(shape.points[1].x, shape.points[1].y);
        } else {
            this.drawSmoothSpline(shape.points, shape.curveIntensity, shape.closed);
        }

        if (shape.closed) this.ctx.closePath();

        if (shape.fill && shape.closed) this.ctx.fill();
        if (shape.stroke) this.ctx.stroke();
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
        this.history.push(JSON.stringify(this.shapes));
        if (this.history.length > 20) {
            this.history.shift();
        }
    }

    undo() {
        if (this.history.length > 0) {
            this.shapes = JSON.parse(this.history.pop());
            this.redrawCanvas();
        }
    }

    clearCanvas() {
        this.shapes = [];
        this.tempSplinePoints = [];
        this.redrawCanvas();
    }

    newDrawing() {
        this.clearCanvas();
        this.history = [];
    }

    saveDrawing() {
        const data = JSON.stringify(this.shapes);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'drawing.json';
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
                        this.shapes = JSON.parse(e.target.result);
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

    exportCode() {
        if (this.shapes.length === 0) {
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

        this.fillColor = "#3b82f6";
        this.outlineColor = "#000000";
        this.outlineWidth = 2;
        this.filled = true;
        this.outlined = true;
        this.scale = 1;
        
        this.exposeProperty("scale", "number", this.scale, {
            description: "Scale factor",
            onChange: (val) => { this.scale = val; }
        });
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
        
        style.endGroup();
        style.addHelpText("Generated drawing module");
    }

    draw(ctx) {
        ctx.save();
        ctx.scale(this.scale, this.scale);
        
        // Auto-center the drawing
        ctx.translate(${-offsetX.toFixed(2)}, ${-offsetY.toFixed(2)});

${this.generateDrawingCode()}
        
        ctx.restore();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            scale: this.scale
        };
    }

    fromJSON(data) {
        super.fromJSON(data);
        if (!data) return;

        this.scale = data.scale || 1;
    }
}

window.${moduleName} = ${moduleName};`;
    }

    generateDrawingCode() {
        let code = '';

        this.shapes.forEach((shape, index) => {
            code += `        // Shape ${index + 1}: ${shape.type}\n`;
            code += `        ctx.save();\n`;
            code += `        ctx.fillStyle = "${shape.fillColor}";\n`;
            code += `        ctx.strokeStyle = "${shape.strokeColor}";\n`;
            code += `        ctx.lineWidth = ${shape.strokeWidth};\n`;

            switch (shape.type) {
                case 'rectangle':
                    const width = shape.endX - shape.startX;
                    const height = shape.endY - shape.startY;
                    code += `        ctx.beginPath();\n`;
                    code += `        ctx.rect(${shape.startX}, ${shape.startY}, ${width}, ${height});\n`;
                    if (shape.fill) code += `        ctx.fill();\n`;
                    if (shape.stroke) code += `        ctx.stroke();\n`;
                    break;

                case 'circle':
                    const radius = Math.sqrt((shape.endX - shape.startX) ** 2 + (shape.endY - shape.startY) ** 2);
                    code += `        ctx.beginPath();\n`;
                    code += `        ctx.arc(${shape.startX}, ${shape.startY}, ${radius.toFixed(2)}, 0, Math.PI * 2);\n`;
                    if (shape.fill) code += `        ctx.fill();\n`;
                    if (shape.stroke) code += `        ctx.stroke();\n`;
                    break;

                case 'triangle':
                    const midX = (shape.startX + shape.endX) / 2;
                    code += `        ctx.beginPath();\n`;
                    code += `        ctx.moveTo(${midX}, ${shape.startY});\n`;
                    code += `        ctx.lineTo(${shape.startX}, ${shape.endY});\n`;
                    code += `        ctx.lineTo(${shape.endX}, ${shape.endY});\n`;
                    code += `        ctx.closePath();\n`;
                    if (shape.fill) code += `        ctx.fill();\n`;
                    if (shape.stroke) code += `        ctx.stroke();\n`;
                    break;

                case 'line':
                    code += `        ctx.beginPath();\n`;
                    code += `        ctx.moveTo(${shape.startX}, ${shape.startY});\n`;
                    code += `        ctx.lineTo(${shape.endX}, ${shape.endY});\n`;
                    code += `        ctx.stroke();\n`;
                    break;

                case 'spline':
                    code += `        ctx.beginPath();\n`;
                    if (shape.points.length === 2) {
                        code += `        ctx.moveTo(${shape.points[0].x}, ${shape.points[0].y});\n`;
                        code += `        ctx.lineTo(${shape.points[1].x}, ${shape.points[1].y});\n`;
                    } else {
                        code += this.generateSplineCode(shape.points, shape.curveIntensity, shape.closed)
                            .split('\n').map(line => '        ' + line).join('\n');
                    }
                    if (shape.closed) code += `        ctx.closePath();\n`;
                    if (shape.fill && shape.closed) code += `        ctx.fill();\n`;
                    if (shape.stroke) code += `        ctx.stroke();\n`;
                    break;
            }

            code += `        ctx.restore();\n\n`;
        });

        return code;
    }

    calculateBounds() {
        if (this.shapes.length === 0) {
            return {
                minX: 0, minY: 0, maxX: 0, maxY: 0,
                centerX: this.canvas.width / 2,
                centerY: this.canvas.height / 2
            };
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        this.shapes.forEach(shape => {
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

        return {
            minX, minY, maxX, maxY,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2
        };
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
        // Example: Draw small squares at the corners
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

    generateShapeCode(shape, index) {
        let code = `// Shape ${index + 1}: ${shape.type}\n`;
        code += `ctx.save();\n`;
        code += `ctx.fillStyle = '${shape.fillColor}';\n`;
        code += `ctx.strokeStyle = '${shape.strokeColor}';\n`;
        code += `ctx.lineWidth = ${shape.strokeWidth};\n`;

        switch (shape.type) {
            case 'rectangle':
                const width = shape.endX - shape.startX;
                const height = shape.endY - shape.startY;
                code += `ctx.beginPath();\n`;
                if (shape.fill) {
                    code += `ctx.fillRect(${shape.startX}, ${shape.startY}, ${width}, ${height});\n`;
                }
                if (shape.stroke) {
                    code += `ctx.strokeRect(${shape.startX}, ${shape.startY}, ${width}, ${height});\n`;
                }
                break;

            case 'circle':
                const radius = Math.sqrt((shape.endX - shape.startX) ** 2 + (shape.endY - shape.startY) ** 2);
                code += `ctx.beginPath();\n`;
                code += `ctx.arc(${shape.startX}, ${shape.startY}, ${radius.toFixed(2)}, 0, Math.PI * 2);\n`;
                if (shape.fill) code += `ctx.fill();\n`;
                if (shape.stroke) code += `ctx.stroke();\n`;
                break;

            case 'triangle':
                const midX = (shape.startX + shape.endX) / 2;
                code += `ctx.beginPath();\n`;
                code += `ctx.moveTo(${midX}, ${shape.startY});\n`;
                code += `ctx.lineTo(${shape.startX}, ${shape.endY});\n`;
                code += `ctx.lineTo(${shape.endX}, ${shape.endY});\n`;
                code += `ctx.closePath();\n`;
                if (shape.fill) code += `ctx.fill();\n`;
                if (shape.stroke) code += `ctx.stroke();\n`;
                break;

            case 'line':
                code += `ctx.beginPath();\n`;
                code += `ctx.moveTo(${shape.startX}, ${shape.startY});\n`;
                code += `ctx.lineTo(${shape.endX}, ${shape.endY});\n`;
                code += `ctx.stroke();\n`;
                break;

            case 'spline':
                code += `ctx.beginPath();\n`;
                if (shape.points.length === 2) {
                    code += `ctx.moveTo(${shape.points[0].x}, ${shape.points[0].y});\n`;
                    code += `ctx.lineTo(${shape.points[1].x}, ${shape.points[1].y});\n`;
                } else {
                    code += this.generateSplineCode(shape.points, shape.curveIntensity, shape.closed);
                }
                if (shape.closed) code += `ctx.closePath();\n`;
                if (shape.fill && shape.closed) code += `ctx.fill();\n`;
                if (shape.stroke) code += `ctx.stroke();\n`;
                break;
        }

        code += `ctx.restore();\n\n`;
        return code;
    }

    generateSplineCode(points, intensity, closed) {
        let code = `ctx.moveTo(${points[0].x}, ${points[0].y});\n`;

        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const next = points[(i + 1) % points.length];

            const cp1x = prev.x + (curr.x - prev.x) * intensity;
            const cp1y = prev.y + (curr.y - prev.y) * intensity;
            const cp2x = curr.x - (next.x - prev.x) * intensity * 0.2;
            const cp2y = curr.y - (next.y - prev.y) * intensity * 0.2;

            code += `ctx.bezierCurveTo(${cp1x.toFixed(2)}, ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)}, ${cp2y.toFixed(2)}, ${curr.x}, ${curr.y});\n`;
        }

        return code;
    }

    copyCode() {
        const codeText = document.getElementById('generatedCode-sprite').textContent;
        navigator.clipboard.writeText(codeText).then(() => {
            alert('Code copied to clipboard!');
        });
    }
}

window.spriteCode = new SpriteCode();
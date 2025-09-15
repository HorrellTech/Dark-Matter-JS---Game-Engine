/* AnimationToolWindow - Advanced animation and sprite editor
 * 
 * Features:
 * - Drawing tools (brush, pen, pencil, shapes, fill bucket)
 * - Color picker and palette
 * - Animation timeline with onion skinning
 * - Layer management per frame
 * - Animation groups (idle, walking, etc.)
 * - Save/load to file browser
 * - Export as sprite sheet
 * - Professional layout with toolbar
 * 
 * @extends EditorWindow
 */
class AnimationToolWindow extends EditorWindow {
    static displayName = "Animation Tool";
    static description = "Advanced animation and sprite editor";
    static icon = "fa-film";
    static color = "#9afdff";

    constructor() {
        super("Animation Tool", {
            width: 1400,
            height: 900,
            resizable: true,
            className: 'animation-tool-window'
        });

        // Drawing state
        this.isDrawing = false;
        this.currentTool = 'brush';
        this.currentColor = '#ffffff';
        this.brushSize = 5;
        this.opacity = 1.0;
        this.activeLayerIndex = 0;

        // Animation groups (idle, walking, etc.)
        this.animationGroups = new Map();
        this.currentGroupId = 'default';

        // Initialize default group
        this.animationGroups.set('default', {
            id: 'default',
            name: 'Default',
            frames: [],
            currentFrameIndex: 0
        });

        this.isPlaying = false;
        this.frameRate = 12;
        this.onionSkinEnabled = true;
        this.onionSkinFrames = 3;
        this.onionSkinOpacity = 0.3;

        // Canvas properties
        this.canvasWidth = 64;
        this.canvasHeight = 64;
        this.zoom = 8.0;
        this.panX = 0;
        this.panY = 0;
        this.showGrid = true;
        this.gridSize = 1;

        // History for undo/redo
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySteps = 50;

        // File management
        this.currentFilePath = null;
        this.hasUnsavedChanges = false;
        this.projectName = 'Untitled Animation';

        this.setupUI();
        this.initializeCanvas();
        this.setupEventListeners();
        this.addDefaultFrame();

        // Ensure first frame is properly loaded
        setTimeout(() => {
            this.selectFrame(0);
        }, 100);
    }

    setupUI() {
        this.clearContent();

        const mainContainer = document.createElement('div');
        mainContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            height: 100%;
            overflow: hidden;
        `;

        this.createToolbar();

        const workspace = document.createElement('div');
        workspace.style.cssText = `
            display: flex;
            flex: 1;
            overflow: hidden;
        `;

        this.createLeftPanel();
        this.createCanvasPanel();
        this.createRightPanel();
        this.createTimelinePanel();

        workspace.appendChild(this.leftPanel);
        workspace.appendChild(this.canvasPanel);
        workspace.appendChild(this.rightPanel);

        mainContainer.appendChild(this.toolbar);
        mainContainer.appendChild(workspace);
        mainContainer.appendChild(this.timelinePanel);

        this.addContent(mainContainer);
    }

    createToolbar() {
        this.toolbar = document.createElement('div');
        this.toolbar.style.cssText = `
            display: flex;
            align-items: center;
            padding: 8px;
            background: #2a2a2a;
            border-bottom: 1px solid #444;
            gap: 8px;
            flex-wrap: wrap;
        `;

        // File operations
        this.addToolbarButton('new', '📄', 'New Animation', () => this.newAnimation());
        this.addToolbarButton('open', '📁', 'Open Animation', () => this.openAnimation());
        this.addToolbarButton('save', '💾', 'Save Animation', () => this.saveAnimation());
        this.addToolbarButton('export-sheet', '🗂️', 'Export Sprite Sheet', () => this.exportSpriteSheet());

        this.addToolbarSeparator();

        // Edit operations
        this.addToolbarButton('undo', '↶', 'Undo', () => this.undo());
        this.addToolbarButton('redo', '↷', 'Redo', () => this.redo());
        this.addToolbarButton('clear', '🗑️', 'Clear Canvas', () => this.clearCanvas());

        this.addToolbarSeparator();

        // Zoom controls
        this.addToolbarButton('zoom-out', '🔍-', 'Zoom Out', () => this.zoomOut());
        this.addToolbarButton('zoom-reset', '🔍=', 'Reset Zoom', () => this.resetZoom());
        this.addToolbarButton('zoom-in', '🔍+', 'Zoom In', () => this.zoomIn());

        this.addToolbarSeparator();

        // Animation controls
        this.addToolbarButton('play', '▶️', 'Play Animation', () => this.togglePlayback());
        this.addToolbarButton('onion-skin', '👻', 'Toggle Onion Skin', () => this.toggleOnionSkin());
    }

    createLeftPanel() {
        this.leftPanel = document.createElement('div');
        this.leftPanel.style.cssText = `
            width: 250px;
            background: #252525;
            border-right: 1px solid #444;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
        `;

        // Animation Groups section
        const groupsSection = this.createSection('Animation Groups');
        this.createAnimationGroupsPanel(groupsSection);

        // Tools section
        const toolsSection = this.createSection('Drawing Tools');
        this.createToolGrid(toolsSection);

        // Color section
        const colorSection = this.createSection('Colors');
        this.createColorPicker(colorSection);

        // Brush settings section
        const brushSection = this.createSection('Brush Settings');
        this.createBrushSettings(brushSection);

        this.leftPanel.appendChild(groupsSection);
        this.leftPanel.appendChild(toolsSection);
        this.leftPanel.appendChild(colorSection);
        this.leftPanel.appendChild(brushSection);
    }

    createAnimationGroupsPanel(container) {
        this.groupsContainer = document.createElement('div');
        this.groupsContainer.style.cssText = `
            padding: 8px;
        `;

        const addGroupBtn = document.createElement('button');
        addGroupBtn.textContent = '+ Add Animation';
        addGroupBtn.style.cssText = `
            width: 100%;
            padding: 8px;
            background: #9C27B0;
            color: white;
            border: none;
            border-radius: 4px;
            margin-bottom: 8px;
            cursor: pointer;
        `;

        addGroupBtn.addEventListener('click', () => {
            const name = prompt('Animation name:', `Animation ${this.animationGroups.size + 1}`);
            if (name) this.addAnimationGroup(name);
        });

        container.appendChild(addGroupBtn);
        container.appendChild(this.groupsContainer);
        this.updateGroupsDisplay();
    }

    createCanvasPanel() {
        this.canvasPanel = document.createElement('div');
        this.canvasPanel.style.cssText = `
            flex: 1;
            display: flex;
            flex-direction: column;
            background: #1a1a1a;
            overflow: hidden;
            position: relative;
        `;

        this.canvasContainer = document.createElement('div');
        this.canvasContainer.style.cssText = `
            flex: 1;
            overflow: auto;
            display: flex;
            align-items: flex-start;
            justify-content: flex-start;
            background: #1a1a1a;
            padding: 20px;
        `;

        this.canvasWrapper = document.createElement('div');
        this.canvasWrapper.style.cssText = `
            position: relative;
            background: #ffffff;
            box-shadow: 0 0 20px rgba(0,0,0,0.5);
            border: 2px solid #666;
        `;

        this.canvasContainer.appendChild(this.canvasWrapper);
        this.canvasPanel.appendChild(this.canvasContainer);
    }

    createRightPanel() {
        this.rightPanel = document.createElement('div');
        this.rightPanel.style.cssText = `
            width: 280px;
            background: #252525;
            border-left: 1px solid #444;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
        `;

        // Layers section
        const layersSection = this.createSection('Layers');
        this.createLayersPanel(layersSection);

        // Properties section
        const propsSection = this.createSection('Properties');
        this.createPropertiesPanel(propsSection);

        const previewSection = this.createSection('Animation Preview');
        this.createAnimationPreview(previewSection);

        this.rightPanel.appendChild(layersSection);
        this.rightPanel.appendChild(previewSection);
        this.rightPanel.appendChild(propsSection);
    }

    createTimelinePanel() {
        this.timelinePanel = document.createElement('div');
        this.timelinePanel.style.cssText = `
            height: 160px;
            background: #2a2a2a;
            border-top: 1px solid #444;
            display: flex;
            flex-direction: column;
        `;

        // Timeline header with controls
        const timelineHeader = document.createElement('div');
        timelineHeader.style.cssText = `
            padding: 8px;
            background: #333;
            border-bottom: 1px solid #444;
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        `;

        // Frame controls
        const frameControls = document.createElement('div');
        frameControls.style.cssText = `
            display: flex;
            gap: 4px;
            align-items: center;
        `;

        // Frame control buttons
        const frameButtons = [
            { id: 'add-frame', icon: '➕', title: 'Add Frame', action: () => this.addFrame() },
            { id: 'duplicate-frame', icon: '📋', title: 'Duplicate Frame', action: () => this.duplicateFrame() },
            { id: 'delete-frame', icon: '🗑️', title: 'Delete Frame', action: () => this.deleteFrame() },
            { id: 'move-left', icon: '◀️', title: 'Move Frame Left', action: () => this.moveFrameLeft() },
            { id: 'move-right', icon: '▶️', title: 'Move Frame Right', action: () => this.moveFrameRight() },
        ];

        frameButtons.forEach(btn => {
            const button = document.createElement('button');
            button.innerHTML = btn.icon;
            button.title = btn.title;
            button.style.cssText = `
                padding: 6px 8px;
                background: #3a3a3a;
                border: 1px solid #555;
                border-radius: 4px;
                color: #fff;
                cursor: pointer;
                font-size: 12px;
            `;
            button.addEventListener('click', btn.action);
            frameControls.appendChild(button);
        });

        timelineHeader.innerHTML = `
            <span style="color: #fff; font-weight: bold;">Timeline</span>
            <span style="color: #aaa;">Frame: <span id="current-frame">1</span></span>
            <span style="color: #aaa;">FPS:</span>
            <input type="number" id="fps-input" value="12" min="1" max="60" 
                   style="width: 50px; background: #444; color: #fff; border: 1px solid #666; padding: 2px;">
        `;

        timelineHeader.appendChild(frameControls);

        // Timeline frames container
        this.framesContainer = document.createElement('div');
        this.framesContainer.style.cssText = `
            flex: 1;
            display: flex;
            align-items: center;
            overflow-x: auto;
            padding: 8px;
            gap: 4px;
        `;

        this.timelinePanel.appendChild(timelineHeader);
        this.timelinePanel.appendChild(this.framesContainer);

        // FPS input handler
        setTimeout(() => {
            const fpsInput = document.getElementById('fps-input');
            if (fpsInput) {
                fpsInput.addEventListener('change', (e) => {
                    this.frameRate = parseInt(e.target.value);
                });
            }
        }, 100);
    }

    createAnimationPreview(container) {
        const previewContainer = document.createElement('div');
        previewContainer.style.cssText = `
        padding: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
    `;

        // Preview canvas
        this.previewCanvas = document.createElement('canvas');
        this.previewCanvas.width = 64;
        this.previewCanvas.height = 64;
        this.previewCanvas.style.cssText = `
        width: 128px;
        height: 128px;
        border: 2px solid #666;
        background: white;
        image-rendering: pixelated;
        margin-bottom: 8px;
    `;
        this.previewCtx = this.previewCanvas.getContext('2d');

        // Preview controls
        const previewControls = document.createElement('div');
        previewControls.style.cssText = `
        display: flex;
        gap: 4px;
    `;

        const playPreviewBtn = document.createElement('button');
        playPreviewBtn.innerHTML = '▶️';
        playPreviewBtn.style.cssText = `
        padding: 4px 8px;
        background: #3a3a3a;
        border: 1px solid #555;
        color: white;
        border-radius: 4px;
        cursor: pointer;
    `;

        playPreviewBtn.addEventListener('click', () => this.togglePreviewPlayback());

        previewControls.appendChild(playPreviewBtn);

        previewContainer.appendChild(this.previewCanvas);
        previewContainer.appendChild(previewControls);
        container.appendChild(previewContainer);

        this.isPreviewPlaying = false;
        this.updatePreview();
    }

    initializeCanvas() {
        // Create background canvas (checkered pattern for transparency)
        this.backgroundCanvas = document.createElement('canvas');
        this.backgroundCanvas.width = this.canvasWidth;
        this.backgroundCanvas.height = this.canvasHeight;
        this.backgroundCtx = this.backgroundCanvas.getContext('2d');

        // Create grid canvas (bottom layer)
        this.gridCanvas = document.createElement('canvas');
        this.gridCanvas.width = this.canvasWidth;
        this.gridCanvas.height = this.canvasHeight;
        this.gridCtx = this.gridCanvas.getContext('2d');

        // Create onion skin canvas
        this.onionCanvas = document.createElement('canvas');
        this.onionCanvas.width = this.canvasWidth;
        this.onionCanvas.height = this.canvasHeight;
        this.onionCtx = this.onionCanvas.getContext('2d');

        // Create main drawing canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;
        this.ctx = this.canvas.getContext('2d');

        // Stack canvases
        [this.backgroundCanvas, this.gridCanvas, this.onionCanvas, this.canvas].forEach((canvas, index) => {
            canvas.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                cursor: crosshair;
                z-index: ${index + 1};
                background: transparent;
                image-rendering: pixelated;
                image-rendering: -moz-crisp-edges;
                image-rendering: crisp-edges;
            `;
        });

        this.canvasWrapper.appendChild(this.backgroundCanvas);
        this.canvasWrapper.appendChild(this.gridCanvas);
        this.canvasWrapper.appendChild(this.onionCanvas);
        this.canvasWrapper.appendChild(this.canvas);

        this.updateCanvasSize();
        this.drawTransparencyBackground();
        this.drawGrid();
    }

    drawTransparencyBackground() {
        const checkerSize = Math.max(1, Math.floor(8 / this.zoom));
        this.backgroundCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

        for (let x = 0; x < this.canvasWidth; x += checkerSize) {
            for (let y = 0; y < this.canvasHeight; y += checkerSize) {
                const isLight = ((Math.floor(x / checkerSize) + Math.floor(y / checkerSize)) % 2) === 0;
                this.backgroundCtx.fillStyle = isLight ? '#ffffff' : '#cccccc';
                this.backgroundCtx.fillRect(x, y, checkerSize, checkerSize);
            }
        }
    }

    createToolGrid(container) {
        const tools = [
            { id: 'brush', icon: '🖌️', name: 'Brush' },
            { id: 'pen', icon: '✏️', name: 'Pen' },
            { id: 'pencil', icon: '✎', name: 'Pencil' },
            { id: 'eraser', icon: '🧽', name: 'Eraser' },
            { id: 'fill', icon: '🪣', name: 'Fill Bucket' },
            { id: 'line', icon: '📏', name: 'Line' },
            { id: 'rectangle', icon: '⬛', name: 'Rectangle' },
            { id: 'circle', icon: '⭕', name: 'Circle' },
            { id: 'eyedropper', icon: '💉', name: 'Eyedropper' }
        ];

        const toolGrid = document.createElement('div');
        toolGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 4px;
            padding: 8px;
        `;

        tools.forEach(tool => {
            const button = document.createElement('button');
            button.style.cssText = `
                padding: 8px;
                background: ${this.currentTool === tool.id ? '#9C27B0' : '#3a3a3a'};
                border: 1px solid #555;
                border-radius: 4px;
                color: #fff;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 2px;
            `;

            button.innerHTML = `
                <span>${tool.icon}</span>
                <span style="font-size: 9px;">${tool.name}</span>
            `;

            button.addEventListener('click', () => {
                this.selectTool(tool.id);
                this.updateToolButtons();
            });

            button.dataset.toolId = tool.id;
            toolGrid.appendChild(button);
        });

        container.appendChild(toolGrid);
    }

    createColorPicker(container) {
        // Current color display
        const currentColorDiv = document.createElement('div');
        currentColorDiv.style.cssText = `
            margin: 8px;
            padding: 16px;
            background: ${this.currentColor};
            border: 2px solid #666;
            border-radius: 4px;
            cursor: pointer;
        `;

        // Color input
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = this.currentColor;
        colorInput.style.cssText = `
            width: 100%;
            height: 40px;
            margin: 8px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;

        colorInput.addEventListener('change', (e) => {
            this.currentColor = e.target.value;
            currentColorDiv.style.background = this.currentColor;
        });

        // Color palette
        const palette = document.createElement('div');
        palette.style.cssText = `
            display: grid;
            grid-template-columns: repeat(8, 1fr);
            gap: 2px;
            margin: 8px;
        `;

        const colors = [
            '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
            '#800000', '#808080', '#800080', '#008000', '#000080', '#808000', '#008080', '#c0c0c0',
            '#ff8080', '#80ff80', '#8080ff', '#ffff80', '#ff80ff', '#80ffff', '#ffc080', '#c080ff'
        ];

        colors.forEach(color => {
            const colorSwatch = document.createElement('div');
            colorSwatch.style.cssText = `
                width: 20px;
                height: 20px;
                background: ${color};
                border: 1px solid #666;
                cursor: pointer;
            `;

            colorSwatch.addEventListener('click', () => {
                this.currentColor = color;
                currentColorDiv.style.background = color;
                colorInput.value = color;
            });

            palette.appendChild(colorSwatch);
        });

        container.appendChild(currentColorDiv);
        container.appendChild(colorInput);
        container.appendChild(palette);
    }

    createBrushSettings(container) {
        // Brush size
        const sizeLabel = document.createElement('label');
        sizeLabel.textContent = 'Brush Size:';
        sizeLabel.style.cssText = `
            display: block;
            color: #fff;
            margin: 8px;
            font-size: 12px;
        `;

        const sizeSlider = document.createElement('input');
        sizeSlider.type = 'range';
        sizeSlider.min = '1';
        sizeSlider.max = '50';
        sizeSlider.value = this.brushSize;
        sizeSlider.style.cssText = `
            width: calc(100% - 16px);
            margin: 0 8px 8px 8px;
        `;

        const sizeValue = document.createElement('span');
        sizeValue.textContent = this.brushSize + 'px';
        sizeValue.style.cssText = `
            color: #aaa;
            font-size: 12px;
            margin: 0 8px;
        `;

        sizeSlider.addEventListener('input', (e) => {
            this.brushSize = parseInt(e.target.value);
            sizeValue.textContent = this.brushSize + 'px';
        });

        // Grid toggle
        const gridLabel = document.createElement('label');
        gridLabel.textContent = 'Show Grid:';
        gridLabel.style.cssText = `
            display: block;
            color: #fff;
            margin: 8px;
            font-size: 12px;
        `;

        const gridCheckbox = document.createElement('input');
        gridCheckbox.type = 'checkbox';
        gridCheckbox.checked = this.showGrid;
        gridCheckbox.style.cssText = `
            margin: 0 8px;
        `;

        gridCheckbox.addEventListener('change', (e) => {
            this.showGrid = e.target.checked;
            this.drawGrid();
        });

        // Onion skin opacity
        const onionLabel = document.createElement('label');
        onionLabel.textContent = 'Onion Skin Opacity:';
        onionLabel.style.cssText = `
            display: block;
            color: #fff;
            margin: 8px;
            font-size: 12px;
        `;

        const onionSlider = document.createElement('input');
        onionSlider.type = 'range';
        onionSlider.min = '0.1';
        onionSlider.max = '0.8';
        onionSlider.step = '0.1';
        onionSlider.value = this.onionSkinOpacity;
        onionSlider.style.cssText = `
            width: calc(100% - 16px);
            margin: 0 8px 8px 8px;
        `;

        const onionValue = document.createElement('span');
        onionValue.textContent = Math.round(this.onionSkinOpacity * 100) + '%';
        onionValue.style.cssText = `
            color: #aaa;
            font-size: 12px;
            margin: 0 8px;
        `;

        onionSlider.addEventListener('input', (e) => {
            this.onionSkinOpacity = parseFloat(e.target.value);
            onionValue.textContent = Math.round(this.onionSkinOpacity * 100) + '%';
            this.updateOnionSkin();
        });

        container.appendChild(sizeLabel);
        container.appendChild(sizeSlider);
        container.appendChild(sizeValue);
        container.appendChild(gridLabel);
        container.appendChild(gridCheckbox);
        container.appendChild(onionLabel);
        container.appendChild(onionSlider);
        container.appendChild(onionValue);
    }

    createLayersPanel(container) {
        this.layersContainer = document.createElement('div');
        this.layersContainer.style.cssText = `
            padding: 8px;
            max-height: 300px;
            overflow-y: auto;
        `;

        const addLayerBtn = document.createElement('button');
        addLayerBtn.textContent = '+ Add Layer';
        addLayerBtn.style.cssText = `
            width: 100%;
            padding: 8px;
            background: #0078d4;
            color: white;
            border: none;
            border-radius: 4px;
            margin-bottom: 8px;
            cursor: pointer;
        `;

        addLayerBtn.addEventListener('click', () => {
            const name = prompt('Layer name:', `Layer ${this.getCurrentFrame().layers.length + 1}`);
            if (name) this.addLayer(name);
        });

        container.appendChild(addLayerBtn);
        container.appendChild(this.layersContainer);
    }

    createPropertiesPanel(container) {
        const props = document.createElement('div');
        props.style.cssText = `
            padding: 8px;
            color: #fff;
            font-size: 12px;
        `;

        props.innerHTML = `
            <div style="margin-bottom: 8px;">
                <label style="display: block; margin-bottom: 4px;">Canvas Size:</label>
                <input type="number" id="canvas-width" value="${this.canvasWidth}" min="8" max="512" 
                    style="width: 60px; background: #444; color: #fff; border: 1px solid #666; padding: 2px; margin-right: 4px;">
                ×
                <input type="number" id="canvas-height" value="${this.canvasHeight}" min="8" max="512" 
                    style="width: 60px; background: #444; color: #fff; border: 1px solid #666; padding: 2px; margin-left: 4px;">
                <button id="resize-canvas" style="display: block; width: 100%; margin-top: 4px; padding: 4px; background: #0078d4; color: white; border: none; border-radius: 2px; cursor: pointer;">Resize</button>
            </div>
            <div>Zoom: <span id="zoom-level">${Math.round(this.zoom * 100)}%</span></div>
            <div>Animation: <span id="current-animation">Default</span></div>
            <div>Frames: <span id="frame-count">1</span></div>
            <div>Layers: <span id="layer-count">1</span></div>
        `;

        container.appendChild(props);

        setTimeout(() => {
            const resizeBtn = document.getElementById('resize-canvas');
            if (resizeBtn) {
                resizeBtn.addEventListener('click', () => this.resizeCanvas());
            }
        }, 100);
    }

    resizeCanvas() {
        const widthInput = document.getElementById('canvas-width');
        const heightInput = document.getElementById('canvas-height');

        const newWidth = parseInt(widthInput.value);
        const newHeight = parseInt(heightInput.value);

        if (newWidth < 8 || newWidth > 512 || newHeight < 8 || newHeight > 512) {
            alert('Canvas size must be between 8 and 512 pixels');
            return;
        }

        if (confirm(`Resize canvas to ${newWidth}×${newHeight}? This will clear all frames.`)) {
            // Save current state
            this.saveFrameData();

            // Update canvas dimensions
            this.canvasWidth = newWidth;
            this.canvasHeight = newHeight;

            // Resize all canvases
            [this.canvas, this.onionCanvas, this.gridCanvas, this.backgroundCanvas].forEach(canvas => {
                if (canvas) {
                    canvas.width = this.canvasWidth;
                    canvas.height = this.canvasHeight;
                }
            });

            // Reset all frames with new dimensions
            this.animationGroups.forEach(group => {
                group.frames.forEach(frame => {
                    // Recreate layers with new dimensions
                    frame.layers = frame.layers.map(layer => ({
                        ...layer,
                        data: this.ctx.createImageData(this.canvasWidth, this.canvasHeight)
                    }));

                    // Clear frame image data
                    frame.imageData = this.ctx.createImageData(this.canvasWidth, this.canvasHeight);
                });
            });

            this.updateCanvasSize();
            this.drawTransparencyBackground();
            this.drawGrid();
            this.redrawCanvas();
            this.updateTimelineDisplay();
            this.updateLayersDisplay();
            this.hasUnsavedChanges = true;
        }
    }

    // Helper methods
    createSection(title) {
        const section = document.createElement('div');
        section.style.cssText = `
            border-bottom: 1px solid #444;
        `;

        const header = document.createElement('div');
        header.textContent = title;
        header.style.cssText = `
            padding: 8px;
            background: #333;
            color: #fff;
            font-weight: bold;
            font-size: 12px;
            border-bottom: 1px solid #444;
        `;

        section.appendChild(header);
        return section;
    }

    addToolbarButton(id, icon, title, onClick) {
        const button = document.createElement('button');
        button.id = id;
        button.innerHTML = icon;
        button.title = title;
        button.style.cssText = `
            padding: 8px;
            background: #3a3a3a;
            border: 1px solid #555;
            border-radius: 4px;
            color: #fff;
            cursor: pointer;
            min-width: 32px;
            height: 32px;
        `;

        button.addEventListener('click', onClick);
        this.toolbar.appendChild(button);
    }

    addToolbarSeparator() {
        const separator = document.createElement('div');
        separator.style.cssText = `
            width: 1px;
            height: 24px;
            background: #555;
            margin: 0 4px;
        `;
        this.toolbar.appendChild(separator);
    }

    setupEventListeners() {
        if (this.canvas) {
            this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
            this.canvas.addEventListener('mousemove', (e) => this.draw(e));
            document.addEventListener('mouseup', () => this.stopDrawing());
            //this.canvas.addEventListener('mouseout', () => this.stopDrawing());
        }
    }

    // Animation Groups Methods
    addAnimationGroup(name) {
        const id = Date.now().toString();
        const group = {
            id,
            name,
            frames: [],
            currentFrameIndex: 0
        };

        // Add default frame with default layer
        group.frames.push({
            id: Date.now(),
            layers: [{
                id: Date.now(),
                name: 'Background',
                visible: true,
                opacity: 1.0,
                data: this.ctx.createImageData(this.canvasWidth, this.canvasHeight)
            }]
        });

        this.animationGroups.set(id, group);
        this.currentGroupId = id;
        this.updateGroupsDisplay();
        this.updateTimelineDisplay();
        this.updateLayersDisplay();
        this.clearCanvas();
        this.hasUnsavedChanges = true;
    }

    deleteAnimationGroup(groupId) {
        if (this.animationGroups.size <= 1) {
            alert('Cannot delete the last animation group');
            return;
        }

        if (confirm('Delete this animation group?')) {
            this.animationGroups.delete(groupId);

            // Switch to first available group
            this.currentGroupId = this.animationGroups.keys().next().value;

            this.updateGroupsDisplay();
            this.selectFrame(this.getCurrentGroup().currentFrameIndex);
            this.hasUnsavedChanges = true;
        }
    }

    switchToGroup(groupId) {
        if (this.animationGroups.has(groupId)) {
            // Save current frame data before switching
            this.saveFrameData();

            // Store the current group's frame index
            const currentGroup = this.getCurrentGroup();
            if (currentGroup) {
                currentGroup.currentFrameIndex = Math.max(0, Math.min(currentGroup.currentFrameIndex, currentGroup.frames.length - 1));
            }

            this.currentGroupId = groupId;
            this.updateGroupsDisplay();

            // Load the selected frame of the new group
            const newGroup = this.getCurrentGroup();
            if (newGroup && newGroup.frames.length > 0) {
                // Ensure frame index is valid
                newGroup.currentFrameIndex = Math.max(0, Math.min(newGroup.currentFrameIndex, newGroup.frames.length - 1));
                this.loadFrameData(newGroup.currentFrameIndex);
            } else {
                // No frames in new group, clear canvas
                this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
                this.updateOnionSkin();
            }

            this.updateTimelineDisplay();
            this.updateFrameCounter();
            this.updateLayersDisplay();
        }
    }

    getCurrentGroup() {
        return this.animationGroups.get(this.currentGroupId);
    }

    getCurrentFrame() {
        const group = this.getCurrentGroup();
        return group.frames[group.currentFrameIndex] || null;
    }

    updateGroupsDisplay() {
        this.groupsContainer.innerHTML = '';

        this.animationGroups.forEach((group, groupId) => {
            const groupDiv = document.createElement('div');
            groupDiv.style.cssText = `
                padding: 8px;
                border: 1px solid ${groupId === this.currentGroupId ? '#9C27B0' : '#555'};
                margin-bottom: 4px;
                background: ${groupId === this.currentGroupId ? '#333' : '#2a2a2a'};
                color: #fff;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;

            const nameSpan = document.createElement('span');
            nameSpan.textContent = `${group.name} (${group.frames.length})`;

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.style.cssText = `
                background: none;
                border: none;
                color: #ff6b6b;
                cursor: pointer;
                padding: 2px;
            `;
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                this.deleteAnimationGroup(groupId);
            };

            groupDiv.appendChild(nameSpan);
            groupDiv.appendChild(deleteBtn);

            groupDiv.addEventListener('click', () => {
                this.switchToGroup(groupId);
            });

            this.groupsContainer.appendChild(groupDiv);
        });

        // Update properties display
        const currentAnimSpan = document.getElementById('current-animation');
        if (currentAnimSpan) {
            currentAnimSpan.textContent = this.getCurrentGroup().name;
        }
    }

    validateFrameData(frame) {
        if (!frame) return false;

        try {
            // Check if imageData is valid
            if (frame.imageData) {
                const data = frame.imageData.data;
                if (!data || data.length !== this.canvasWidth * this.canvasHeight * 4) {
                    console.warn('Invalid frame imageData detected');
                    return false;
                }
            }

            // Check layers
            if (frame.layers) {
                for (let layer of frame.layers) {
                    if (layer.data) {
                        const data = layer.data.data;
                        if (!data || data.length !== this.canvasWidth * this.canvasHeight * 4) {
                            console.warn('Invalid layer data detected');
                            return false;
                        }
                    }
                }
            }

            return true;
        } catch (error) {
            console.warn('Frame validation error:', error);
            return false;
        }
    }

    // Drawing methods
    startDrawing(e) {
        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.zoom;
        const y = (e.clientY - rect.top) / this.zoom;

        this.lastX = x;
        this.lastY = y;

        this.saveState();

        // Get the active layer for drawing
        const currentFrame = this.getCurrentFrame();
        if (!currentFrame || !currentFrame.layers[this.activeLayerIndex]) return;

        // Create a temporary drawing canvas for the active layer
        this.tempDrawingCanvas = document.createElement('canvas');
        this.tempDrawingCanvas.width = this.canvasWidth;
        this.tempDrawingCanvas.height = this.canvasHeight;
        this.tempDrawingCtx = this.tempDrawingCanvas.getContext('2d');

        // Load current layer data to temp canvas
        const activeLayer = currentFrame.layers[this.activeLayerIndex];
        if (activeLayer.data) {
            this.tempDrawingCtx.putImageData(activeLayer.data, 0, 0);
        }

        // Set drawing properties
        this.tempDrawingCtx.globalAlpha = this.opacity;
        this.tempDrawingCtx.strokeStyle = this.currentColor;
        this.tempDrawingCtx.fillStyle = this.currentColor;
        this.tempDrawingCtx.lineWidth = this.brushSize;
        this.tempDrawingCtx.lineCap = 'round';
        this.tempDrawingCtx.lineJoin = 'round';

        if (this.currentTool === 'brush' || this.currentTool === 'pen') {
            this.tempDrawingCtx.beginPath();
            this.tempDrawingCtx.moveTo(x, y);
        } else if (this.currentTool === 'pencil') {
            this.drawPixelToLayer(Math.floor(x), Math.floor(y));
        }
    }

    draw(e) {
        if (!this.isDrawing || !this.tempDrawingCtx) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.zoom;
        const y = (e.clientY - rect.top) / this.zoom;

        switch (this.currentTool) {
            case 'brush':
            case 'pen':
                this.tempDrawingCtx.lineTo(x, y);
                this.tempDrawingCtx.stroke();
                break;
            case 'pencil':
                const pixelX = Math.floor(x);
                const pixelY = Math.floor(y);
                const lastPixelX = Math.floor(this.lastX);
                const lastPixelY = Math.floor(this.lastY);

                if (pixelX !== lastPixelX || pixelY !== lastPixelY) {
                    this.drawPencilLineToLayer(this.lastX, this.lastY, x, y);
                }
                break;
            case 'eraser':
                this.tempDrawingCtx.globalCompositeOperation = 'destination-out';
                this.tempDrawingCtx.beginPath();
                this.tempDrawingCtx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
                this.tempDrawingCtx.fill();
                this.tempDrawingCtx.globalCompositeOperation = 'source-over';
                break;
        }

        this.lastX = x;
        this.lastY = y;

        // Immediately update the main canvas preview while drawing
        this.updateCanvasPreview();
        this.hasUnsavedChanges = true;
    }

    updateCanvasPreview() {
        // Update main canvas with all layers including the current drawing
        this.redrawCanvasWithTempLayer();
    }

    drawPencilLine(x1, y1, x2, y2) {
        const startX = Math.floor(x1);
        const startY = Math.floor(y1);
        const endX = Math.floor(x2);
        const endY = Math.floor(y2);

        if (startX === endX && startY === endY) {
            this.drawPixel(startX, startY);
            return;
        }

        const dx = Math.abs(endX - startX);
        const dy = Math.abs(endY - startY);
        const sx = startX < endX ? 1 : -1;
        const sy = startY < endY ? 1 : -1;
        let err = dx - dy;

        let currentX = startX;
        let currentY = startY;

        let maxIterations = Math.max(dx, dy) + 1;
        let iterations = 0;

        while (iterations < maxIterations) {
            this.drawPixel(currentX, currentY);

            if (currentX === endX && currentY === endY) break;

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                currentX += sx;
            }
            if (e2 < dx) {
                err += dx;
                currentY += sy;
            }

            iterations++;
        }
    }

    drawPixel(x, y) {
        this.ctx.fillRect(x, y, 1, 1);
    }

    drawPencilLineToLayer(x1, y1, x2, y2) {
        const startX = Math.floor(x1);
        const startY = Math.floor(y1);
        const endX = Math.floor(x2);
        const endY = Math.floor(y2);

        if (startX === endX && startY === endY) {
            this.drawPixelToLayer(startX, startY);
            return;
        }

        const dx = Math.abs(endX - startX);
        const dy = Math.abs(endY - startY);
        const sx = startX < endX ? 1 : -1;
        const sy = startY < endY ? 1 : -1;
        let err = dx - dy;

        let currentX = startX;
        let currentY = startY;

        let maxIterations = Math.max(dx, dy) + 1;
        let iterations = 0;

        while (iterations < maxIterations) {
            this.drawPixelToLayer(currentX, currentY);

            if (currentX === endX && currentY === endY) break;

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                currentX += sx;
            }
            if (e2 < dx) {
                err += dx;
                currentY += sy;
            }

            iterations++;
        }
    }

    drawPixelToLayer(x, y) {
        if (this.tempDrawingCtx) {
            this.tempDrawingCtx.fillRect(x, y, 1, 1);
        }
    }

    drawGrid() {
        if (!this.showGrid || this.zoom < 4) {
            this.gridCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
            return;
        }

        this.gridCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        this.gridCtx.strokeStyle = 'rgba(128, 128, 128, 0.3)';
        this.gridCtx.lineWidth = 1 / this.zoom;

        // Draw vertical lines
        for (let x = 0; x <= this.canvasWidth; x += this.gridSize) {
            this.gridCtx.beginPath();
            this.gridCtx.moveTo(x, 0);
            this.gridCtx.lineTo(x, this.canvasHeight);
            this.gridCtx.stroke();
        }

        // Draw horizontal lines
        for (let y = 0; y <= this.canvasHeight; y += this.gridSize) {
            this.gridCtx.beginPath();
            this.gridCtx.moveTo(0, y);
            this.gridCtx.lineTo(this.canvasWidth, y);
            this.gridCtx.stroke();
        }
    }

    stopDrawing() {
        if (!this.isDrawing) return;
        this.isDrawing = false;

        // Save the drawing to the active layer
        this.saveToActiveLayer();

        // Clean up temp canvas
        this.tempDrawingCanvas = null;
        this.tempDrawingCtx = null;

        // Redraw canvas with all layers
        this.redrawCanvas();

        // Save state for undo/redo AFTER the drawing is complete
        this.saveState();
    }

    saveToActiveLayer() {
        const currentFrame = this.getCurrentFrame();
        if (!currentFrame || !currentFrame.layers[this.activeLayerIndex] || !this.tempDrawingCtx) return;

        try {
            // Save the temp canvas data to the active layer
            const imageData = this.tempDrawingCtx.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
            currentFrame.layers[this.activeLayerIndex].data = new ImageData(
                new Uint8ClampedArray(imageData.data),
                imageData.width,
                imageData.height
            );
        } catch (error) {
            console.warn('Error saving to active layer:', error);
        }
    }

    saveFrameData() {
        const group = this.getCurrentGroup();
        if (!group || group.frames.length === 0) return;

        const currentFrame = group.frames[group.currentFrameIndex];
        if (!currentFrame) return;

        try {
            // Save the composited canvas data to the current frame
            const imageData = this.ctx.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
            currentFrame.imageData = new ImageData(
                new Uint8ClampedArray(imageData.data),
                imageData.width,
                imageData.height
            );
        } catch (error) {
            console.warn('Error saving frame data:', error);
        }
    }

    redrawCanvasWithTempLayer() {
        const currentFrame = this.getCurrentFrame();
        if (!currentFrame) return;

        // Clear main canvas
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Composite all layers
        currentFrame.layers.forEach((layer, index) => {
            if (!layer.visible) return;

            try {
                this.ctx.save();
                this.ctx.globalAlpha = layer.opacity || 1.0;
                this.ctx.globalCompositeOperation = layer.blendMode || 'source-over';

                if (index === this.activeLayerIndex && this.tempDrawingCanvas) {
                    // Use temp drawing canvas for active layer while drawing
                    this.ctx.drawImage(this.tempDrawingCanvas, 0, 0);
                } else if (layer.data) {
                    // Create a temporary canvas for this layer
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = this.canvasWidth;
                    tempCanvas.height = this.canvasHeight;
                    const tempCtx = tempCanvas.getContext('2d');

                    // Put the layer data on the temp canvas
                    tempCtx.putImageData(layer.data, 0, 0);

                    // Draw the temp canvas to the main canvas
                    this.ctx.drawImage(tempCanvas, 0, 0);
                }

                this.ctx.restore();
            } catch (error) {
                console.warn('Error rendering layer:', error);
            }
        });
    }

    // Tool methods
    selectTool(toolId) {
        this.currentTool = toolId;
        this.updateToolButtons();
    }

    updateToolButtons() {
        const buttons = this.leftPanel.querySelectorAll('button[data-tool-id]');
        buttons.forEach(button => {
            const isActive = button.dataset.toolId === this.currentTool;
            button.style.background = isActive ? '#9C27B0' : '#3a3a3a';
        });
    }

    // Animation methods
    addDefaultFrame() {
        const group = this.getCurrentGroup();
        if (group.frames.length === 0) {
            this.addFrame();
            // Initialize history with the first empty state
            setTimeout(() => {
                this.history = [];
                this.historyIndex = -1;
                this.saveState();
            }, 100);
        }
    }

    addFrame() {
        const group = this.getCurrentGroup();

        // Save current frame data before adding new frame
        this.saveFrameData();

        // Create empty image data
        const emptyImageData = this.ctx.createImageData(this.canvasWidth, this.canvasHeight);

        const newFrame = {
            id: Date.now(),
            layers: [{
                id: Date.now(),
                name: 'Background',
                visible: true,
                opacity: 1.0,
                blendMode: 'source-over',
                data: new ImageData(
                    new Uint8ClampedArray(emptyImageData.data),
                    this.canvasWidth,
                    this.canvasHeight
                )
            }],
            imageData: new ImageData(
                new Uint8ClampedArray(emptyImageData.data),
                this.canvasWidth,
                this.canvasHeight
            )
        };

        group.frames.push(newFrame);
        group.currentFrameIndex = group.frames.length - 1;
        this.activeLayerIndex = 0;

        // Clear canvas and redraw
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        this.redrawCanvas();
        this.updateTimelineDisplay();
        this.updateFrameCounter();
        this.updateLayersDisplay();

        this.hasUnsavedChanges = true;
    }

    duplicateFrame() {
        const group = this.getCurrentGroup();
        if (group.frames.length === 0) return;

        // Save current frame data before duplicating
        this.saveFrameData();

        const currentFrame = group.frames[group.currentFrameIndex];
        const duplicatedFrame = {
            id: Date.now(),
            layers: currentFrame.layers.map(layer => ({
                ...layer,
                id: Date.now() + Math.random(),
                data: new ImageData(
                    new Uint8ClampedArray(layer.data.data),
                    layer.data.width,
                    layer.data.height
                )
            })),
            imageData: new ImageData(
                new Uint8ClampedArray(currentFrame.imageData.data),
                currentFrame.imageData.width,
                currentFrame.imageData.height
            )
        };

        group.frames.splice(group.currentFrameIndex + 1, 0, duplicatedFrame);
        group.currentFrameIndex++;

        // Load the duplicated frame
        this.loadFrameData(group.currentFrameIndex);

        this.hasUnsavedChanges = true;
    }

    deleteFrame() {
        const group = this.getCurrentGroup();
        if (group.frames.length <= 1) return;

        group.frames.splice(group.currentFrameIndex, 1);
        group.currentFrameIndex = Math.min(group.currentFrameIndex, group.frames.length - 1);

        // Load the new current frame
        this.loadFrameData(group.currentFrameIndex);

        this.hasUnsavedChanges = true;
    }

    moveFrameLeft() {
        const group = this.getCurrentGroup();
        if (group.currentFrameIndex <= 0) return;

        // Save current frame data
        this.saveFrameData();

        const frame = group.frames.splice(group.currentFrameIndex, 1)[0];
        group.frames.splice(group.currentFrameIndex - 1, 0, frame);
        group.currentFrameIndex--;

        // Reload the moved frame
        this.loadFrameData(group.currentFrameIndex);

        this.hasUnsavedChanges = true;
    }

    moveFrameRight() {
        const group = this.getCurrentGroup();
        if (group.currentFrameIndex >= group.frames.length - 1) return;

        // Save current frame data
        this.saveFrameData();

        const frame = group.frames.splice(group.currentFrameIndex, 1)[0];
        group.frames.splice(group.currentFrameIndex + 1, 0, frame);
        group.currentFrameIndex++;

        // Reload the moved frame
        this.loadFrameData(group.currentFrameIndex);

        this.hasUnsavedChanges = true;
    }

    selectFrame(index) {
        const group = this.getCurrentGroup();
        if (!group || index < 0 || index >= group.frames.length) return;

        // Save current frame data before switching
        //this.saveFrameData();

        group.currentFrameIndex = index;
        this.loadFrameData(index);
    }

    selectFrameManual(index) {
        const group = this.getCurrentGroup();
        if (!group || index < 0 || index >= group.frames.length) return;

        // Only save when manually switching frames
        this.saveFrameData();

        group.currentFrameIndex = index;
        this.loadFrameData(index);
    }

    loadFrameData(frameIndex) {
        const group = this.getCurrentGroup();
        if (!group || frameIndex < 0 || frameIndex >= group.frames.length) return;

        const frame = group.frames[frameIndex];

        // Clear canvas first
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Load frame data
        if (frame && frame.imageData) {
            try {
                // Validate frame data before loading
                if (this.validateFrameData(frame)) {
                    this.ctx.putImageData(frame.imageData, 0, 0);
                } else {
                    // Try to reconstruct from layers
                    this.reconstructFrameFromLayers(frame);
                }
            } catch (error) {
                console.warn('Error loading frame data:', error);
                // Try to reconstruct from layers as fallback
                this.reconstructFrameFromLayers(frame);
            }
        }

        // Update displays
        setTimeout(() => {
            this.updateOnionSkin();
            this.updateTimelineDisplay();
            this.updateFrameCounter();
            this.updateLayersDisplay();
            this.updatePreview();
        }, 10);
    }

    reconstructFrameFromLayers(frame) {
        if (!frame.layers || frame.layers.length === 0) return;

        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Composite all visible layers
        frame.layers.forEach(layer => {
            if (layer.visible && layer.data) {
                try {
                    this.ctx.globalAlpha = layer.opacity || 1.0;
                    this.ctx.putImageData(layer.data, 0, 0);
                } catch (error) {
                    console.warn('Error rendering layer:', error);
                }
            }
        });

        this.ctx.globalAlpha = 1.0;

        // Save the composited result back to frame
        frame.imageData = this.ctx.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
    }

    togglePreviewPlayback() {
        this.isPreviewPlaying = !this.isPreviewPlaying;
        if (this.isPreviewPlaying) {
            this.playPreview();
        }
    }

    playPreview() {
        if (!this.isPreviewPlaying) return;

        const group = this.getCurrentGroup();
        if (group.frames.length <= 1) return;

        this.previewFrameIndex = (this.previewFrameIndex || 0) + 1;
        if (this.previewFrameIndex >= group.frames.length) {
            this.previewFrameIndex = 0;
        }

        this.updatePreview();

        setTimeout(() => {
            if (this.isPreviewPlaying) {
                this.playPreview();
            }
        }, 1000 / this.frameRate);
    }

    updatePreview() {
        const group = this.getCurrentGroup();
        const frameIndex = this.previewFrameIndex || group.currentFrameIndex;
        const frame = group.frames[frameIndex];

        this.previewCtx.clearRect(0, 0, 64, 64);
        if (frame && frame.imageData) {
            this.previewCtx.putImageData(frame.imageData, 0, 0);
        }
    }

    togglePlayback() {
        this.isPlaying = !this.isPlaying;

        if (this.isPlaying) {
            this.playAnimation();
        }

        const playBtn = document.getElementById('play');
        if (playBtn) {
            playBtn.innerHTML = this.isPlaying ? '⏸️' : '▶️';
        }
    }

    playAnimation() {
        if (!this.isPlaying) return;

        const group = this.getCurrentGroup();
        if (group.frames.length <= 1) {
            this.isPlaying = false;
            return;
        }

        setTimeout(() => {
            group.currentFrameIndex = (group.currentFrameIndex + 1) % group.frames.length;
            this.selectFrame(group.currentFrameIndex);

            if (this.isPlaying) {
                this.playAnimation();
            }
        }, 1000 / this.frameRate);
    }

    toggleOnionSkin() {
        this.onionSkinEnabled = !this.onionSkinEnabled;
        this.updateOnionSkin();

        const onionBtn = document.getElementById('onion-skin');
        if (onionBtn) {
            onionBtn.style.background = this.onionSkinEnabled ? '#9C27B0' : '#3a3a3a';
        }
    }

    updateOnionSkin() {
        // Clear the onion skin canvas
        this.onionCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

        if (!this.onionSkinEnabled) return;

        const group = this.getCurrentGroup();
        if (!group || group.frames.length <= 1) return;

        this.onionCtx.save();

        // Draw previous frames (red tint)
        for (let i = 1; i <= this.onionSkinFrames; i++) {
            const frameIndex = group.currentFrameIndex - i;
            if (frameIndex >= 0 && group.frames[frameIndex] && group.frames[frameIndex].imageData) {
                const opacity = this.onionSkinOpacity / i;
                this.onionCtx.globalAlpha = opacity;
                this.onionCtx.globalCompositeOperation = 'source-over';

                // Create temporary canvas for the frame
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = this.canvasWidth;
                tempCanvas.height = this.canvasHeight;
                const tempCtx = tempCanvas.getContext('2d');

                // Draw the frame
                tempCtx.putImageData(group.frames[frameIndex].imageData, 0, 0);

                // Apply red tint
                tempCtx.globalCompositeOperation = 'source-atop';
                tempCtx.fillStyle = 'rgba(255, 100, 100, 0.8)';
                tempCtx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

                // Draw to onion skin canvas
                this.onionCtx.drawImage(tempCanvas, 0, 0);
            }
        }

        // Draw next frames (blue tint)
        for (let i = 1; i <= this.onionSkinFrames; i++) {
            const frameIndex = group.currentFrameIndex + i;
            if (frameIndex < group.frames.length && group.frames[frameIndex] && group.frames[frameIndex].imageData) {
                const opacity = this.onionSkinOpacity / (i * 1.5);
                this.onionCtx.globalAlpha = opacity;
                this.onionCtx.globalCompositeOperation = 'source-over';

                // Create temporary canvas for the frame
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = this.canvasWidth;
                tempCanvas.height = this.canvasHeight;
                const tempCtx = tempCanvas.getContext('2d');

                // Draw the frame
                tempCtx.putImageData(group.frames[frameIndex].imageData, 0, 0);

                // Apply blue tint
                tempCtx.globalCompositeOperation = 'source-atop';
                tempCtx.fillStyle = 'rgba(100, 100, 255, 0.8)';
                tempCtx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

                // Draw to onion skin canvas
                this.onionCtx.drawImage(tempCanvas, 0, 0);
            }
        }

        this.onionCtx.restore();
    }

    // Layer methods
    deleteLayer(index) {
        const currentFrame = this.getCurrentFrame();
        if (currentFrame && currentFrame.layers.length > 1 && currentFrame.layers[index]) {
            currentFrame.layers.splice(index, 1);
            if (this.activeLayerIndex >= currentFrame.layers.length) {
                this.activeLayerIndex = currentFrame.layers.length - 1;
            }
            this.updateLayersDisplay();
            this.redrawCanvas();
            this.hasUnsavedChanges = true;
        }
    }

    setLayerBlendMode(index, blendMode) {
        const currentFrame = this.getCurrentFrame();
        if (currentFrame && currentFrame.layers[index]) {
            currentFrame.layers[index].blendMode = blendMode;
            this.redrawCanvas();
            this.hasUnsavedChanges = true;
        }
    }

    setLayerOpacity(index, opacity) {
        const currentFrame = this.getCurrentFrame();
        if (currentFrame && currentFrame.layers[index]) {
            currentFrame.layers[index].opacity = parseFloat(opacity);
            this.redrawCanvas();
            this.hasUnsavedChanges = true;
        }
    }

    addLayer(name) {
        const currentFrame = this.getCurrentFrame();
        if (!currentFrame) return;

        // Create empty image data for new layer
        const emptyImageData = this.ctx.createImageData(this.canvasWidth, this.canvasHeight);

        const layer = {
            id: Date.now(),
            name: name,
            visible: true,
            opacity: 1.0,
            blendMode: 'source-over',
            data: new ImageData(
                new Uint8ClampedArray(emptyImageData.data),
                this.canvasWidth,
                this.canvasHeight
            )
        };

        currentFrame.layers.push(layer);
        this.activeLayerIndex = currentFrame.layers.length - 1;
        this.updateLayersDisplay();
        this.redrawCanvas();
        this.hasUnsavedChanges = true;
    }

    updateLayersDisplay() {
        // Clear but keep the add layer button
        const addLayerBtn = this.layersContainer.querySelector('button');
        this.layersContainer.innerHTML = '';

        if (addLayerBtn) {
            //this.layersContainer.appendChild(addLayerBtn);
        } else {
            const newAddLayerBtn = document.createElement('button');
            newAddLayerBtn.textContent = '+ Add Layer';
            newAddLayerBtn.style.cssText = `
            width: 100%;
            padding: 8px;
            background: #0078d4;
            color: white;
            border: none;
            border-radius: 4px;
            margin-bottom: 8px;
            cursor: pointer;
        `;
            newAddLayerBtn.addEventListener('click', () => {
                const name = prompt('Layer name:', `Layer ${this.getCurrentFrame().layers.length + 1}`);
                if (name) this.addLayer(name);
            });
            this.layersContainer.appendChild(newAddLayerBtn);
        }

        const currentFrame = this.getCurrentFrame();
        if (!currentFrame) return;

        // Display layers in reverse order (top layer first)
        const layers = [...currentFrame.layers].reverse();

        layers.forEach((layer, reverseIndex) => {
            const index = currentFrame.layers.length - 1 - reverseIndex;
            const layerDiv = document.createElement('div');
            layerDiv.style.cssText = `
            padding: 8px;
            border: 1px solid ${index === this.activeLayerIndex ? '#9C27B0' : '#555'};
            margin-bottom: 4px;
            background: ${index === this.activeLayerIndex ? '#333' : '#2a2a2a'};
            color: #fff;
            cursor: pointer;
            border-radius: 4px;
        `;

            // Create controls with proper event listeners
            const visibilityBtn = document.createElement('button');
            visibilityBtn.innerHTML = layer.visible ? '👁️' : '🚫';
            visibilityBtn.style.cssText = `
            background: none;
            border: none;
            color: ${layer.visible ? '#00ff00' : '#666'};
            cursor: pointer;
            margin-right: 4px;
            font-size: 12px;
        `;
            visibilityBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLayerVisibility(index);
            });

            // Layer ordering buttons
            const moveUpBtn = document.createElement('button');
            moveUpBtn.innerHTML = '↑';
            moveUpBtn.title = 'Move Layer Up';
            moveUpBtn.style.cssText = `
            background: none;
            border: none;
            color: ${index < currentFrame.layers.length - 1 ? '#00aaff' : '#666'};
            cursor: ${index < currentFrame.layers.length - 1 ? 'pointer' : 'not-allowed'};
            margin-right: 2px;
            font-size: 12px;
            font-weight: bold;
        `;
            moveUpBtn.disabled = index >= currentFrame.layers.length - 1;
            moveUpBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!moveUpBtn.disabled) {
                    this.moveLayerUp(index);
                }
            });

            const moveDownBtn = document.createElement('button');
            moveDownBtn.innerHTML = '↓';
            moveDownBtn.title = 'Move Layer Down';
            moveDownBtn.style.cssText = `
            background: none;
            border: none;
            color: ${index > 0 ? '#00aaff' : '#666'};
            cursor: ${index > 0 ? 'pointer' : 'not-allowed'};
            margin-right: 4px;
            font-size: 12px;
            font-weight: bold;
        `;
            moveDownBtn.disabled = index <= 0;
            moveDownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!moveDownBtn.disabled) {
                    this.moveLayerDown(index);
                }
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.style.cssText = `
            background: none;
            border: none;
            color: #ff6b6b;
            cursor: pointer;
            font-size: 12px;
        `;
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteLayer(index);
            });

            const blendSelect = document.createElement('select');
            blendSelect.style.cssText = `
            background: #444;
            color: #fff;
            border: 1px solid #666;
            padding: 2px;
            font-size: 10px;
        `;

            const blendModes = [
                { value: 'source-over', label: 'Normal' },
                { value: 'multiply', label: 'Multiply' },
                { value: 'screen', label: 'Screen' },
                { value: 'overlay', label: 'Overlay' },
                { value: 'darken', label: 'Darken' },
                { value: 'lighten', label: 'Lighten' },
                { value: 'color-dodge', label: 'Color Dodge' },
                { value: 'color-burn', label: 'Color Burn' },
                { value: 'hard-light', label: 'Hard Light' },
                { value: 'soft-light', label: 'Soft Light' },
                { value: 'difference', label: 'Difference' },
                { value: 'exclusion', label: 'Exclusion' }
            ];

            blendModes.forEach(mode => {
                const option = document.createElement('option');
                option.value = mode.value;
                option.textContent = mode.label;
                option.selected = layer.blendMode === mode.value;
                blendSelect.appendChild(option);
            });

            blendSelect.addEventListener('change', (e) => {
                this.setLayerBlendMode(index, e.target.value);
            });

            const opacitySlider = document.createElement('input');
            opacitySlider.type = 'range';
            opacitySlider.min = '0';
            opacitySlider.max = '1';
            opacitySlider.step = '0.1';
            opacitySlider.value = layer.opacity || 1;
            opacitySlider.style.cssText = 'flex: 1;';
            opacitySlider.addEventListener('change', (e) => {
                this.setLayerOpacity(index, e.target.value);
            });

            const opacityLabel = document.createElement('span');
            opacityLabel.textContent = `${Math.round((layer.opacity || 1) * 100)}%`;

            // Update opacity label when slider changes
            opacitySlider.addEventListener('input', (e) => {
                opacityLabel.textContent = `${Math.round(e.target.value * 100)}%`;
            });

            const headerDiv = document.createElement('div');
            headerDiv.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
        `;

            const nameSpan = document.createElement('span');
            nameSpan.style.fontWeight = 'bold';
            nameSpan.textContent = layer.name;

            const buttonsDiv = document.createElement('div');
            buttonsDiv.style.cssText = `
            display: flex;
            align-items: center;
            gap: 2px;
        `;
            buttonsDiv.appendChild(visibilityBtn);
            buttonsDiv.appendChild(moveUpBtn);
            buttonsDiv.appendChild(moveDownBtn);
            buttonsDiv.appendChild(deleteBtn);

            headerDiv.appendChild(nameSpan);
            headerDiv.appendChild(buttonsDiv);

            const blendDiv = document.createElement('div');
            blendDiv.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 11px;
        `;

            const blendLabel = document.createElement('label');
            blendLabel.textContent = 'Blend:';
            blendDiv.appendChild(blendLabel);
            blendDiv.appendChild(blendSelect);

            const opacityDiv = document.createElement('div');
            opacityDiv.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 11px;
            margin-top: 4px;
        `;

            const opacityLabelDiv = document.createElement('label');
            opacityLabelDiv.textContent = 'Opacity:';
            opacityDiv.appendChild(opacityLabelDiv);
            opacityDiv.appendChild(opacitySlider);
            opacityDiv.appendChild(opacityLabel);

            layerDiv.appendChild(headerDiv);
            layerDiv.appendChild(blendDiv);
            layerDiv.appendChild(opacityDiv);

            layerDiv.addEventListener('click', () => {
                this.activeLayerIndex = index;
                this.updateLayersDisplay();
            });

            this.layersContainer.appendChild(layerDiv);
        });

        // Update layer count
        const layerCountSpan = document.getElementById('layer-count');
        if (layerCountSpan) {
            layerCountSpan.textContent = currentFrame.layers.length;
        }
    }

    moveLayerUp(index) {
        const currentFrame = this.getCurrentFrame();
        if (!currentFrame || index >= currentFrame.layers.length - 1) return;

        // Swap layers
        const temp = currentFrame.layers[index];
        currentFrame.layers[index] = currentFrame.layers[index + 1];
        currentFrame.layers[index + 1] = temp;

        // Update active layer index if it was one of the moved layers
        if (this.activeLayerIndex === index) {
            this.activeLayerIndex = index + 1;
        } else if (this.activeLayerIndex === index + 1) {
            this.activeLayerIndex = index;
        }

        // Redraw and update UI
        this.redrawCanvas();
        this.updateLayersDisplay();
        this.hasUnsavedChanges = true;
    }

    moveLayerDown(index) {
        const currentFrame = this.getCurrentFrame();
        if (!currentFrame || index <= 0) return;

        // Swap layers
        const temp = currentFrame.layers[index];
        currentFrame.layers[index] = currentFrame.layers[index - 1];
        currentFrame.layers[index - 1] = temp;

        // Update active layer index if it was one of the moved layers
        if (this.activeLayerIndex === index) {
            this.activeLayerIndex = index - 1;
        } else if (this.activeLayerIndex === index - 1) {
            this.activeLayerIndex = index;
        }

        // Redraw and update UI
        this.redrawCanvas();
        this.updateLayersDisplay();
        this.hasUnsavedChanges = true;
    }

    toggleLayerVisibility(index) {
        const currentFrame = this.getCurrentFrame();
        if (currentFrame && currentFrame.layers[index]) {
            currentFrame.layers[index].visible = !currentFrame.layers[index].visible;
            this.updateLayersDisplay();
            this.redrawCanvas();
            this.hasUnsavedChanges = true;
        }
    }

    redrawCanvas() {
        const currentFrame = this.getCurrentFrame();
        if (!currentFrame) return;

        // Clear main canvas
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Composite all visible layers with proper blend modes and opacity
        currentFrame.layers.forEach(layer => {
            if (!layer.visible || !layer.data) return;

            try {
                this.ctx.save();

                // Apply layer opacity and blend mode
                this.ctx.globalAlpha = layer.opacity || 1.0;
                this.ctx.globalCompositeOperation = layer.blendMode || 'source-over';

                // Create a temporary canvas for this layer to properly composite it
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = this.canvasWidth;
                tempCanvas.height = this.canvasHeight;
                const tempCtx = tempCanvas.getContext('2d');

                // Put the layer data on the temp canvas
                tempCtx.putImageData(layer.data, 0, 0);

                // Draw the temp canvas to the main canvas (this respects blend modes and alpha)
                this.ctx.drawImage(tempCanvas, 0, 0);

                this.ctx.restore();
            } catch (error) {
                console.warn('Error rendering layer:', error);
            }
        });

        // Save the composited result back to frame
        try {
            currentFrame.imageData = this.ctx.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
        } catch (error) {
            console.warn('Error saving composited frame:', error);
        }

        this.updateOnionSkin();
    }

    // File operations
    async newAnimation() {
        if (this.hasUnsavedChanges) {
            if (!confirm('You have unsaved changes. Continue?')) return;
        }

        this.animationGroups.clear();
        this.currentGroupId = 'default';

        this.animationGroups.set('default', {
            id: 'default',
            name: 'Default',
            frames: [],
            currentFrameIndex: 0
        });

        this.currentFilePath = null;
        this.hasUnsavedChanges = false;
        this.projectName = 'Untitled Animation';

        this.addDefaultFrame();
        this.updateGroupsDisplay();
        this.updateTimelineDisplay();
        this.updateLayersDisplay();
        this.clearCanvas();
    }

    async saveAnimation() {
        try {
            const data = {
                projectName: this.projectName,
                canvasWidth: this.canvasWidth,
                canvasHeight: this.canvasHeight,
                frameRate: this.frameRate,
                animationGroups: Array.from(this.animationGroups.entries()).map(([id, group]) => ({
                    id,
                    name: group.name,
                    currentFrameIndex: group.currentFrameIndex,
                    frames: group.frames.map(frame => ({
                        id: frame.id,
                        layers: frame.layers.map(layer => ({
                            ...layer,
                            data: Array.from(layer.data.data)
                        })),
                        imageData: frame.imageData ? Array.from(frame.imageData.data) : null
                    }))
                })),
                currentGroupId: this.currentGroupId
            };

            let filePath = this.currentFilePath;
            
            if (!filePath) {
                const fileName = await this.showSaveFileDialog();
                if (!fileName) return;
                filePath = fileName;
                this.currentFilePath = filePath;
            }

            // Ensure the Animations directory exists
            const animationsDir = '/Animations';
            if (window.fileBrowser) {
                const dirExists = await window.fileBrowser.exists(animationsDir);
                if (!dirExists) {
                    await window.fileBrowser.createDirectory(animationsDir);
                }
                
                const success = await window.fileBrowser.writeFile(filePath, JSON.stringify(data, null, 2));
                if (success) {
                    this.hasUnsavedChanges = false;
                    this.showNotification('Animation saved successfully');
                    // Refresh file browser to show the new file
                    await window.fileBrowser.refreshFiles();
                } else {
                    this.showNotification('Failed to save animation', 'error');
                }
            }
        } catch (error) {
            console.error('Error saving animation:', error);
            this.showNotification('Error saving animation', 'error');
        }
    }

    async openAnimation() {
        try {
            if (this.hasUnsavedChanges) {
                if (!confirm('You have unsaved changes. Continue?')) return;
            }

            const filePath = await this.showOpenFileDialog();
            if (!filePath) return;

            if (window.fileBrowser) {
                const content = await window.fileBrowser.readFile(filePath);
                if (content) {
                    const data = JSON.parse(content);
                    this.loadAnimationData(data);
                    this.currentFilePath = filePath;
                    this.hasUnsavedChanges = false;
                    this.showNotification('Animation loaded successfully');
                } else {
                    this.showNotification('Failed to read animation file', 'error');
                }
            }
        } catch (error) {
            console.error('Error loading animation:', error);
            this.showNotification('Error loading animation', 'error');
        }
    }

    /**
     * Show save file dialog
     */
    async showSaveFileDialog() {
        return new Promise((resolve) => {
            const modal = this.createFileDialog('Save Animation', 'save', resolve);
            document.body.appendChild(modal);
        });
    }

    /**
     * Show open file dialog
     */
    async showOpenFileDialog() {
        return new Promise((resolve) => {
            const modal = this.createFileDialog('Open Animation', 'open', resolve);
            document.body.appendChild(modal);
        });
    }

    /**
     * Create file dialog modal
     */
    createFileDialog(title, mode, callback) {
        const modal = document.createElement('div');
        modal.className = 'animation-file-dialog-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const dialog = document.createElement('div');
        dialog.className = 'animation-file-dialog';
        dialog.style.cssText = `
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 8px;
            width: 600px;
            max-height: 700px;
            display: flex;
            flex-direction: column;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            padding: 16px;
            border-bottom: 1px solid #444;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #333;
            border-radius: 8px 8px 0 0;
        `;

        const titleEl = document.createElement('h3');
        titleEl.textContent = title;
        titleEl.style.cssText = `
            margin: 0;
            color: #fff;
            font-size: 16px;
        `;

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: #fff;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        header.appendChild(titleEl);
        header.appendChild(closeBtn);

        const content = document.createElement('div');
        content.style.cssText = `
            flex: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;

        if (mode === 'save') {
            this.createSaveDialogContent(content, callback, modal);
        } else {
            this.createOpenDialogContent(content, callback, modal);
        }

        dialog.appendChild(header);
        dialog.appendChild(content);
        modal.appendChild(dialog);

        // Close handlers
        closeBtn.addEventListener('click', () => {
            modal.remove();
            callback(null);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                callback(null);
            }
        });

        return modal;
    }

    /**
     * Create save dialog content
     */
    createSaveDialogContent(container, callback, modal) {
        const form = document.createElement('div');
        form.style.cssText = `
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        `;

        // File name input
        const nameGroup = document.createElement('div');
        nameGroup.innerHTML = `
            <label style="display: block; color: #fff; margin-bottom: 8px;">File Name:</label>
            <input type="text" id="fileName" value="${this.projectName || 'Untitled'}" 
                style="width: 100%; padding: 8px; background: #1a1a1a; color: #fff; border: 1px solid #555; border-radius: 4px;">
        `;

        // Directory selection
        const dirGroup = document.createElement('div');
        dirGroup.innerHTML = `
            <label style="display: block; color: #fff; margin-bottom: 8px;">Save to Directory:</label>
            <select id="directorySelect" style="width: 100%; padding: 8px; background: #1a1a1a; color: #fff; border: 1px solid #555; border-radius: 4px;">
                <option value="/Animations">Animations</option>
                <option value="/Animations/Projects">Animations/Projects</option>
                <option value="/">Root</option>
            </select>
        `;

        const buttons = document.createElement('div');
        buttons.style.cssText = `
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            margin-top: 20px;
        `;

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = `
            padding: 8px 16px;
            background: #666;
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.style.cssText = `
            padding: 8px 16px;
            background: #0078d4;
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;

        buttons.appendChild(cancelBtn);
        buttons.appendChild(saveBtn);

        form.appendChild(nameGroup);
        form.appendChild(dirGroup);
        form.appendChild(buttons);
        container.appendChild(form);

        // Event handlers
        cancelBtn.addEventListener('click', () => {
            modal.remove();
            callback(null);
        });

        saveBtn.addEventListener('click', () => {
            const fileName = document.getElementById('fileName').value.trim();
            const directory = document.getElementById('directorySelect').value;
            
            if (!fileName) {
                alert('Please enter a file name');
                return;
            }

            const finalFileName = fileName.endsWith('.anim') ? fileName : `${fileName}.anim`;
            const fullPath = directory === '/' ? `/${finalFileName}` : `${directory}/${finalFileName}`;
            
            modal.remove();
            callback(fullPath);
        });

        // Enter key handler
        document.getElementById('fileName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveBtn.click();
            }
        });

        // Focus the input
        setTimeout(() => {
            document.getElementById('fileName').focus();
            document.getElementById('fileName').select();
        }, 100);
    }

    /**
     * Create open dialog content
     */
    async createOpenDialogContent(container, callback, modal) {
        const content = document.createElement('div');
        content.style.cssText = `
            display: flex;
            flex-direction: column;
            height: 500px;
        `;

        // Search input
        const searchGroup = document.createElement('div');
        searchGroup.style.cssText = `
            padding: 16px;
            border-bottom: 1px solid #444;
        `;

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search animation files...';
        searchInput.style.cssText = `
            width: 100%;
            padding: 8px;
            background: #1a1a1a;
            color: #fff;
            border: 1px solid #555;
            border-radius: 4px;
        `;

        searchGroup.appendChild(searchInput);

        // File list
        const fileList = document.createElement('div');
        fileList.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 8px;
        `;

        // Buttons
        const buttons = document.createElement('div');
        buttons.style.cssText = `
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            padding: 16px;
            border-top: 1px solid #444;
        `;

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = `
            padding: 8px 16px;
            background: #666;
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;

        const openBtn = document.createElement('button');
        openBtn.textContent = 'Open';
        openBtn.disabled = true;
        openBtn.style.cssText = `
            padding: 8px 16px;
            background: #0078d4;
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            opacity: 0.5;
        `;

        buttons.appendChild(cancelBtn);
        buttons.appendChild(openBtn);

        content.appendChild(searchGroup);
        content.appendChild(fileList);
        content.appendChild(buttons);
        container.appendChild(content);

        // Load animation files
        let animationFiles = [];
        let selectedFile = null;

        if (window.fileBrowser && window.fileBrowser.db) {
            try {
                const transaction = window.fileBrowser.db.transaction(['files'], 'readonly');
                const store = transaction.objectStore('files');
                const allFiles = await new Promise(resolve => {
                    store.getAll().onsuccess = e => resolve(e.target.result);
                });

                animationFiles = allFiles.filter(file => 
                    file.type === 'file' && file.name.endsWith('.anim')
                ).sort((a, b) => b.modified - a.modified); // Sort by most recent first

            } catch (error) {
                console.error('Error loading animation files:', error);
            }
        }

        const renderFileList = (filteredFiles = animationFiles) => {
            fileList.innerHTML = '';

            if (filteredFiles.length === 0) {
                fileList.innerHTML = `
                    <div style="text-align: center; color: #888; padding: 40px;">
                        No animation files found
                    </div>
                `;
                return;
            }

            filteredFiles.forEach(file => {
                const item = document.createElement('div');
                item.className = 'animation-file-item';
                item.dataset.path = file.path;
                item.style.cssText = `
                    padding: 12px;
                    border: 1px solid #444;
                    border-radius: 4px;
                    margin-bottom: 8px;
                    cursor: pointer;
                    background: #333;
                    transition: all 0.2s ease;
                `;

                const fileName = file.name.replace('.anim', '');
                const modifiedDate = new Date(file.modified).toLocaleDateString();
                const filePath = file.path.substring(0, file.path.lastIndexOf('/')) || '/';

                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="color: #fff; font-weight: bold; margin-bottom: 4px;">
                                <i class="fas fa-film" style="margin-right: 8px; color: #769afd;"></i>
                                ${fileName}
                            </div>
                            <div style="color: #aaa; font-size: 12px;">
                                ${filePath} • Modified: ${modifiedDate}
                            </div>
                        </div>
                    </div>
                `;

                item.addEventListener('click', () => {
                    // Remove selection from other items
                    fileList.querySelectorAll('.animation-file-item').forEach(el => {
                        el.style.background = '#333';
                        el.style.borderColor = '#444';
                    });

                    // Select this item
                    item.style.background = '#0078d4';
                    item.style.borderColor = '#0078d4';
                    selectedFile = file.path;
                    openBtn.disabled = false;
                    openBtn.style.opacity = '1';
                });

                item.addEventListener('dblclick', () => {
                    selectedFile = file.path;
                    modal.remove();
                    callback(selectedFile);
                });

                fileList.appendChild(item);
            });
        };

        // Search functionality
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filtered = animationFiles.filter(file => 
                file.name.toLowerCase().includes(searchTerm) ||
                file.path.toLowerCase().includes(searchTerm)
            );
            renderFileList(filtered);
        });

        // Event handlers
        cancelBtn.addEventListener('click', () => {
            modal.remove();
            callback(null);
        });

        openBtn.addEventListener('click', () => {
            if (selectedFile) {
                modal.remove();
                callback(selectedFile);
            }
        });

        // Initial render
        renderFileList();
    }

    loadAnimationData(data) {
        this.projectName = data.projectName || 'Loaded Animation';
        this.canvasWidth = data.canvasWidth || 64;
        this.canvasHeight = data.canvasHeight || 64;
        this.frameRate = data.frameRate || 12;
        this.currentGroupId = data.currentGroupId || 'default';

        // Restore animation groups
        this.animationGroups.clear();
        data.animationGroups.forEach(groupData => {
            const group = {
                id: groupData.id,
                name: groupData.name,
                currentFrameIndex: groupData.currentFrameIndex,
                frames: groupData.frames.map(frameData => ({
                    id: frameData.id,
                    layers: frameData.layers.map(layerData => ({
                        ...layerData,
                        data: new ImageData(
                            new Uint8ClampedArray(layerData.data),
                            this.canvasWidth,
                            this.canvasHeight
                        )
                    })),
                    imageData: frameData.imageData ? new ImageData(
                        new Uint8ClampedArray(frameData.imageData),
                        this.canvasWidth,
                        this.canvasHeight
                    ) : null
                }))
            };
            this.animationGroups.set(group.id, group);
        });

        // Reset active layer
        this.activeLayerIndex = 0;

        // Update canvas size and UI
        this.updateCanvasSize();
        this.updateGroupsDisplay();
        this.selectFrame(this.getCurrentGroup().currentFrameIndex);
    }

    async exportSpriteSheet() {
        try {
            // Prompt for filename
            const fileName = prompt('Export filename (without extension):', this.projectName + '_spritesheet');
            if (!fileName) return;

            // Calculate sprite sheet dimensions
            const animGroups = Array.from(this.animationGroups.values());
            const maxFrames = Math.max(...animGroups.map(g => g.frames.length));
            const animCount = animGroups.length;

            const sheetWidth = maxFrames * this.canvasWidth;
            const sheetHeight = animCount * this.canvasHeight;

            // Create sprite sheet canvas
            const sheetCanvas = document.createElement('canvas');
            sheetCanvas.width = sheetWidth;
            sheetCanvas.height = sheetHeight;
            const sheetCtx = sheetCanvas.getContext('2d');

            // Keep transparent background
            sheetCtx.clearRect(0, 0, sheetWidth, sheetHeight);

            // Draw each animation group as a row
            animGroups.forEach((group, groupIndex) => {
                group.frames.forEach((frame, frameIndex) => {
                    if (frame.imageData) {
                        const x = frameIndex * this.canvasWidth;
                        const y = groupIndex * this.canvasHeight;

                        // Create temporary canvas for this frame
                        const tempCanvas = document.createElement('canvas');
                        tempCanvas.width = this.canvasWidth;
                        tempCanvas.height = this.canvasHeight;
                        const tempCtx = tempCanvas.getContext('2d');
                        tempCtx.putImageData(frame.imageData, 0, 0);

                        // Draw to sprite sheet
                        sheetCtx.drawImage(tempCanvas, x, y);
                    }
                });
            });

            // Ensure SpriteSheets directory exists
            const spriteSheetsDir = '/SpriteSheets';
            if (window.fileBrowser) {
                const dirExists = await window.fileBrowser.exists(spriteSheetsDir);
                if (!dirExists) {
                    await window.fileBrowser.createDirectory(spriteSheetsDir);
                }

                // Export as PNG
                sheetCanvas.toBlob(async (blob) => {
                    const reader = new FileReader();
                    reader.onload = async () => {
                        const dataUrl = reader.result;
                        const success = await window.fileBrowser.writeFile(`${spriteSheetsDir}/${fileName}.png`, dataUrl);
                        if (success) {
                            this.showNotification(`Sprite sheet exported as ${fileName}.png`);
                            // Refresh file browser
                            await window.fileBrowser.refreshFiles();
                        }
                    };
                    reader.readAsDataURL(blob);
                });

                // Also create metadata file
                const metadata = {
                    spriteWidth: this.canvasWidth,
                    spriteHeight: this.canvasHeight,
                    animations: animGroups.map((group, index) => ({
                        name: group.name,
                        row: index,
                        frameCount: group.frames.length,
                        frameRate: this.frameRate
                    }))
                };

                const success = await window.fileBrowser.writeFile(`${spriteSheetsDir}/${fileName}.json`, JSON.stringify(metadata, null, 2));
                if (success) {
                    await window.fileBrowser.refreshFiles();
                }
            }

        } catch (error) {
            console.error('Error exporting sprite sheet:', error);
            this.showNotification('Error exporting sprite sheet', 'error');
        }
    }

    // Utility methods
    updateCanvasSize() {
        const canvases = [this.canvas, this.onionCanvas, this.gridCanvas, this.backgroundCanvas].filter(c => c);

        canvases.forEach(canvas => {
            if (canvas.width !== this.canvasWidth || canvas.height !== this.canvasHeight) {
                canvas.width = this.canvasWidth;
                canvas.height = this.canvasHeight;
            }
            canvas.style.width = `${this.canvasWidth * this.zoom}px`;
            canvas.style.height = `${this.canvasHeight * this.zoom}px`;
        });

        if (this.canvasWrapper) {
            this.canvasWrapper.style.width = `${this.canvasWidth * this.zoom}px`;
            this.canvasWrapper.style.height = `${this.canvasHeight * this.zoom}px`;
        }

        this.drawTransparencyBackground();
        this.drawGrid();
    }

    updateTimelineDisplay() {
        this.framesContainer.innerHTML = '';

        const group = this.getCurrentGroup();
        if (!group) return;

        group.frames.forEach((frame, index) => {
            const frameDiv = document.createElement('div');
            frameDiv.style.cssText = `
                width: 60px;
                height: 40px;
                border: 2px solid ${index === group.currentFrameIndex ? '#9C27B0' : '#666'};
                background: #444;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #fff;
                font-size: 12px;
                position: relative;
                border-radius: 4px;
                margin-right: 4px;

                .animation-file-dialog-overlay {
                    backdrop-filter: blur(4px);
                }

                .animation-file-dialog {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                .animation-file-item:hover {
                    background: #404040 !important;
                    border-color: #666 !important;
                }

                .animation-file-item.selected {
                    background: #0078d4 !important;
                    border-color: #0078d4 !important;
                }

                /* Scrollbar styling for file list */
                .animation-file-dialog div::-webkit-scrollbar {
                    width: 8px;
                }

                .animation-file-dialog div::-webkit-scrollbar-track {
                    background: #1a1a1a;
                }

                .animation-file-dialog div::-webkit-scrollbar-thumb {
                    background: #555;
                    border-radius: 4px;
                }

                .animation-file-dialog div::-webkit-scrollbar-thumb:hover {
                    background: #777;
                }
            `;

            frameDiv.innerHTML = `
                <span>${index + 1}</span>
                ${index === group.currentFrameIndex ? '<div style="position: absolute; top: 2px; right: 2px; width: 6px; height: 6px; background: #9C27B0; border-radius: 50%;"></div>' : ''}
            `;

            frameDiv.addEventListener('click', () => this.selectFrameManual(index));
            this.framesContainer.appendChild(frameDiv);
        });

        // Update frame count
        const frameCountSpan = document.getElementById('frame-count');
        if (frameCountSpan) {
            frameCountSpan.textContent = group.frames.length;
        }
    }

    updateFrameCounter() {
        const frameSpan = document.getElementById('current-frame');
        if (frameSpan) {
            frameSpan.textContent = this.getCurrentGroup().currentFrameIndex + 1;
        }
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        this.saveFrameData();
        this.hasUnsavedChanges = true;
    }

    zoomIn() {
        this.zoom = Math.min(this.zoom * 1.2, 20);
        this.updateCanvasSize();
        this.updateZoomDisplay();
    }

    zoomOut() {
        this.zoom = Math.max(this.zoom / 1.2, 0.1);
        this.updateCanvasSize();
        this.updateZoomDisplay();
    }

    resetZoom() {
        this.zoom = this.canvasWidth <= 64 ? 8.0 : 1.0;
        this.updateCanvasSize();
        this.updateZoomDisplay();
    }

    updateZoomDisplay() {
        const zoomSpan = document.getElementById('zoom-level');
        if (zoomSpan) {
            zoomSpan.textContent = Math.round(this.zoom * 100) + '%';
        }
    }

    // History methods
    saveState() {
        // Save the current state of all layers in the current frame
        const currentFrame = this.getCurrentFrame();
        if (!currentFrame) return;

        if (this.historyIndex < this.maxHistorySteps - 1) {
            this.historyIndex++;

            // Save a deep copy of all layer data
            const frameState = {
                layers: currentFrame.layers.map(layer => ({
                    ...layer,
                    data: new ImageData(
                        new Uint8ClampedArray(layer.data.data),
                        layer.data.width,
                        layer.data.height
                    )
                })),
                imageData: this.ctx.getImageData(0, 0, this.canvasWidth, this.canvasHeight)
            };

            this.history[this.historyIndex] = frameState;
            this.history.length = this.historyIndex + 1;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const state = this.history[this.historyIndex];

            if (state) {
                const currentFrame = this.getCurrentFrame();
                if (currentFrame) {
                    // Restore layer data
                    currentFrame.layers = state.layers.map(layer => ({
                        ...layer,
                        data: new ImageData(
                            new Uint8ClampedArray(layer.data.data),
                            layer.data.width,
                            layer.data.height
                        )
                    }));

                    // Restore canvas
                    this.ctx.putImageData(state.imageData, 0, 0);

                    // Update frame image data
                    currentFrame.imageData = new ImageData(
                        new Uint8ClampedArray(state.imageData.data),
                        state.imageData.width,
                        state.imageData.height
                    );

                    // Update displays
                    this.updateLayersDisplay();
                    this.hasUnsavedChanges = true;
                }
            }
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const state = this.history[this.historyIndex];

            if (state) {
                const currentFrame = this.getCurrentFrame();
                if (currentFrame) {
                    // Restore layer data
                    currentFrame.layers = state.layers.map(layer => ({
                        ...layer,
                        data: new ImageData(
                            new Uint8ClampedArray(layer.data.data),
                            layer.data.width,
                            layer.data.height
                        )
                    }));

                    // Restore canvas
                    this.ctx.putImageData(state.imageData, 0, 0);

                    // Update frame image data
                    currentFrame.imageData = new ImageData(
                        new Uint8ClampedArray(state.imageData.data),
                        state.imageData.width,
                        state.imageData.height
                    );

                    // Update displays
                    this.updateLayersDisplay();
                    this.hasUnsavedChanges = true;
                }
            }
        }
    }

    showNotification(message, type = 'info') {
        console.log(`${type.toUpperCase()}: ${message}`);

        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#44ff44' : '#4444ff'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    onBeforeClose() {
        if (this.hasUnsavedChanges) {
            return confirm('You have unsaved changes. Close anyway?');
        }
        return true;
    }
}

// Export to global scope
window.AnimationToolWindow = AnimationToolWindow;
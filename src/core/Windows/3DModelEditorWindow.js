/**
 * 3DModelEditorWindow - A comprehensive 3D modeling tool
 *
 * This editor window provides:
 * - 3D viewport with camera controls
 * - Basic shape primitives (cube, sphere, cylinder, etc.)
 * - Point manipulation tools (select, move, scale vertices)
 * - Mesh saving/loading in .m3d format
 * - Integration with existing Camera3DRasterizer and engine systems
 */
class ModelEditor3DViewport {
    constructor(container, editor) {
        this.container = container;
        this.editor = editor;
        this.canvas = null;
        this.ctx = null;
        this.camera = null;
        this.mesh = null;
        this.isInitialized = false;

        this.mouse = {
            x: 0,
            y: 0,
            isDown: false,
            button: 0
        };

        this.cameraControls = {
            orbitDistance: 200,
            orbitAngle: { x: 0, y: 0 },
            pan: { x: 0, y: 0 },
            zoom: 1,
            isOrbiting: false,
            isPanning: false,
            lastMouse: { x: 0, y: 0 }
        };

        this.selection = {
            mode: 'vertex', // 'vertex', 'edge', 'face'
            selectedVertices: new Set(),
            selectedEdges: new Set(),
            selectedFaces: new Set(),
            hoveredVertex: -1,
            hoveredEdge: -1,
            hoveredFace: -1
        };

        this.transform = {
            mode: 'select', // 'select', 'move', 'rotate', 'scale'
            gizmo: null,
            isDragging: false
        };

        this.grid = {
            enabled: true,
            size: 50,
            subdivisions: 10,
            color: '#333333'
        };

        this.createCanvas();
        this.setupEventListeners();
    }

    createCanvas() {
        this.canvas = document.createElement('canvas');

        // Increase default canvas size for better visibility
        const defaultWidth = 1200;
        const defaultHeight = 900;

        // Use container size if available, otherwise use larger defaults
        this.canvas.width = this.container.clientWidth || defaultWidth;
        this.canvas.height = this.container.clientHeight || defaultHeight;

        // Ensure minimum size
        this.canvas.width = Math.max(this.canvas.width, 1000);
        this.canvas.height = Math.max(this.canvas.height, 700);

        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.background = '#1a1a1a';

        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        // Create camera for the viewport
        this.camera = new Camera3DRasterizer();
        this.camera._position = new Vector3(0, 0, 200);
        this.camera._rotation = new Vector3(0, 0, 0);
        this.camera.viewportWidth = this.canvas.width;
        this.camera.viewportHeight = this.canvas.height;
        this.camera._fieldOfView = 60;
        this.camera._nearPlane = 1;
        this.camera._farPlane = 1000;
        this.camera._isActive = true;

        // Initialize camera position for better viewing
        this.cameraControls.orbitDistance = 200;
        this.cameraControls.zoom = 1;
        this.updateCameraPosition();

        console.log('Camera initialized:', {
            position: this.camera._position,
            viewport: `${this.camera.viewportWidth}x${this.camera.viewportHeight}`,
            fov: this.camera._fieldOfView
        });

        // Create a default mesh
        this.createDefaultMesh();

        this.isInitialized = true;
    }

    createDefaultMesh() {
        // Create a simple cube as the default mesh
        this.mesh = {
            vertices: [
                new Vector3(-50, -50, -50),
                new Vector3(50, -50, -50),
                new Vector3(50, 50, -50),
                new Vector3(-50, 50, -50),
                new Vector3(-50, -50, 50),
                new Vector3(50, -50, 50),
                new Vector3(50, 50, 50),
                new Vector3(-50, 50, 50)
            ],
            edges: [
                [0, 1], [1, 2], [2, 3], [3, 0], // Bottom face
                [4, 5], [5, 6], [6, 7], [7, 4], // Top face
                [0, 4], [1, 5], [2, 6], [3, 7]  // Vertical edges
            ],
            faces: [
                [0, 1, 2, 3], // Bottom
                [4, 5, 6, 7], // Top
                [0, 1, 5, 4], // Front
                [1, 2, 6, 5], // Right
                [2, 3, 7, 6], // Back
                [3, 0, 4, 7]  // Left
            ],
            position: new Vector3(0, 0, 0),
            rotation: new Vector3(0, 0, 0),
            scale: new Vector3(1, 1, 1)
        };
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.onMouseWheel(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Resize observer
        const resizeObserver = new ResizeObserver(() => this.resize());
        resizeObserver.observe(this.container);
    }

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
        this.mouse.isDown = true;
        this.mouse.button = e.button;

        if (e.button === 0) { // Left click
            if (e.ctrlKey) {
                this.cameraControls.isOrbiting = true;
            } else if (e.shiftKey) {
                this.cameraControls.isPanning = true;
            } else {
                this.selectAtPoint(this.mouse.x, this.mouse.y);
            }
        } else if (e.button === 1) { // Middle click
            this.cameraControls.isPanning = true;
        }

        this.cameraControls.lastMouse = { x: this.mouse.x, y: this.mouse.y };
        e.preventDefault();
    }

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;

        if (this.mouse.isDown) {
            const deltaX = this.mouse.x - this.cameraControls.lastMouse.x;
            const deltaY = this.mouse.y - this.cameraControls.lastMouse.y;

            if (this.cameraControls.isOrbiting) {
                this.orbitCamera(deltaX, deltaY);
            } else if (this.cameraControls.isPanning) {
                this.panCamera(deltaX, deltaY);
            }
        }

        // Update hover state
        this.updateHover(this.mouse.x, this.mouse.y);

        this.cameraControls.lastMouse = { x: this.mouse.x, y: this.mouse.y };
    }

    onMouseUp(e) {
        this.mouse.isDown = false;
        this.cameraControls.isOrbiting = false;
        this.cameraControls.isPanning = false;
    }

    onMouseWheel(e) {
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoomCamera(zoomFactor);
        e.preventDefault();
    }

    orbitCamera(deltaX, deltaY) {
        this.cameraControls.orbitAngle.y += deltaX * 0.01;
        this.cameraControls.orbitAngle.x += deltaY * 0.01;

        // Clamp vertical rotation
        this.cameraControls.orbitAngle.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.cameraControls.orbitAngle.x));

        this.updateCameraPosition();
    }

    panCamera(deltaX, deltaY) {
        this.cameraControls.pan.x += deltaX * 0.5;
        this.cameraControls.pan.y += deltaY * 0.5;
        this.updateCameraPosition();
    }

    zoomCamera(factor) {
        this.cameraControls.zoom *= factor;
        this.cameraControls.zoom = Math.max(0.1, Math.min(5.0, this.cameraControls.zoom));
        this.updateCameraPosition();
    }

    updateCameraPosition() {
        const distance = this.cameraControls.orbitDistance * this.cameraControls.zoom;
        const x = Math.cos(this.cameraControls.orbitAngle.y) * Math.cos(this.cameraControls.orbitAngle.x) * distance;
        const y = Math.sin(this.cameraControls.orbitAngle.y) * Math.cos(this.cameraControls.orbitAngle.x) * distance;
        const z = Math.sin(this.cameraControls.orbitAngle.x) * distance;

        this.camera._position = new Vector3(x, y, z);
        this.camera._rotation = new Vector3(
            this.cameraControls.orbitAngle.x * (180 / Math.PI),
            0,
            this.cameraControls.orbitAngle.y * (180 / Math.PI)
        );
    }

    selectAtPoint(x, y) {
        // Convert screen coordinates to world coordinates
        const worldPos = this.screenToWorld(new Vector2(x, y));
        const threshold = 10; // Selection threshold in screen pixels

        // Clear previous selection
        this.selection.selectedVertices.clear();

        // Check vertices
        if (this.mesh && this.mesh.vertices) {
            for (let i = 0; i < this.mesh.vertices.length; i++) {
                const vertex = this.mesh.vertices[i];
                const screenPos = this.worldToScreen(vertex);

                if (screenPos) {
                    const distance = Math.sqrt(
                        Math.pow(x - screenPos.x, 2) +
                        Math.pow(y - screenPos.y, 2)
                    );

                    if (distance < threshold) {
                        this.selection.selectedVertices.add(i);
                        this.editor.onVertexSelected(i, vertex);
                        break;
                    }
                }
            }
        }
    }

    updateHover(x, y) {
        this.selection.hoveredVertex = -1;

        if (this.mesh && this.mesh.vertices) {
            for (let i = 0; i < this.mesh.vertices.length; i++) {
                const vertex = this.mesh.vertices[i];
                const screenPos = this.worldToScreen(vertex);

                if (screenPos) {
                    const distance = Math.sqrt(
                        Math.pow(x - screenPos.x, 2) +
                        Math.pow(y - screenPos.y, 2)
                    );

                    if (distance < 10) {
                        this.selection.hoveredVertex = i;
                        break;
                    }
                }
            }
        }
    }

    worldToScreen(worldPos) {
        if (!this.camera || !worldPos) {
            console.warn('Camera or world position is null');
            return null;
        }

        // Apply mesh transform
        let transformedPos = {
            x: worldPos.x,
            y: worldPos.y,
            z: worldPos.z
        };

        // Apply mesh scale
        if (this.mesh && this.mesh.scale) {
            transformedPos.x *= this.mesh.scale.x;
            transformedPos.y *= this.mesh.scale.y;
            transformedPos.z *= this.mesh.scale.z;
        }

        // Apply mesh rotation (simplified - in a full implementation you'd use proper 3D rotation)
        if (this.mesh && this.mesh.rotation) {
            const rotX = this.mesh.rotation.x * Math.PI / 180;
            const rotY = this.mesh.rotation.y * Math.PI / 180;
            const rotZ = this.mesh.rotation.z * Math.PI / 180;

            // Simple rotation around Z-axis for now
            if (rotZ !== 0) {
                const cos = Math.cos(rotZ);
                const sin = Math.sin(rotZ);
                const x = transformedPos.x * cos - transformedPos.y * sin;
                const y = transformedPos.x * sin + transformedPos.y * cos;
                transformedPos.x = x;
                transformedPos.y = y;
            }
        }

        // Apply mesh position
        if (this.mesh && this.mesh.position) {
            transformedPos.x += this.mesh.position.x;
            transformedPos.y += this.mesh.position.y;
            transformedPos.z += this.mesh.position.z;
        }

        // Apply camera pan offset
        transformedPos.x += this.cameraControls.pan.x;
        transformedPos.y += this.cameraControls.pan.y;

        // Project using camera
        const projected = this.camera.projectPoint(new Vector3(transformedPos.x, transformedPos.y, transformedPos.z));

        if (!projected) {
            console.warn(`Projection failed for point: ${transformedPos.x}, ${transformedPos.y}, ${transformedPos.z}`);
            return null;
        }

        // Check if projection is valid and within viewport
        if (projected.x >= 0 && projected.x <= this.canvas.width &&
            projected.y >= 0 && projected.y <= this.canvas.height) {
            return projected;
        }

        console.warn(`Projected point outside viewport: ${projected.x}, ${projected.y} (canvas: ${this.canvas.width}x${this.canvas.height})`);
        return null;
    }

    screenToWorld(screenPos) {
        // This is a simplified inverse projection
        // In a full implementation, you'd need proper unprojection
        return new Vector3(
            screenPos.x - this.canvas.width / 2,
            screenPos.y - this.canvas.height / 2,
            0
        );
    }

    resize() {
        if (!this.container) return;

        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;

        if (this.camera) {
            this.camera.viewportWidth = this.canvas.width;
            this.camera.viewportHeight = this.canvas.height;
        }
    }

    render() {
        if (!this.ctx || !this.camera || !this.mesh) return;

        // Clear
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid
        if (this.grid.enabled) {
            this.drawGrid();
        }

        // Draw mesh
        this.drawMesh();

        // Draw selection
        this.drawSelection();

        // Draw UI elements
        this.drawUI();
    }

    drawGrid() {
        const gridSize = this.grid.size;
        const subdivisions = this.grid.subdivisions;

        this.ctx.strokeStyle = this.grid.color;
        this.ctx.lineWidth = 1;

        // Calculate visible grid range
        const left = -this.canvas.width / 2;
        const right = this.canvas.width / 2;
        const top = -this.canvas.height / 2;
        const bottom = this.canvas.height / 2;

        // Draw main grid lines
        this.ctx.beginPath();
        for (let x = left - (left % gridSize); x <= right; x += gridSize) {
            this.ctx.moveTo(x, top);
            this.ctx.lineTo(x, bottom);
        }
        for (let y = top - (top % gridSize); y <= bottom; y += gridSize) {
            this.ctx.moveTo(left, y);
            this.ctx.lineTo(right, y);
        }
        this.ctx.stroke();

        // Draw subdivision lines
        this.ctx.strokeStyle = '#2a2a2a';
        this.ctx.lineWidth = 0.5;
        this.ctx.beginPath();
        for (let x = left - (left % (gridSize/subdivisions)); x <= right; x += gridSize/subdivisions) {
            if (Math.abs(x) % gridSize !== 0) {
                this.ctx.moveTo(x, top);
                this.ctx.lineTo(x, bottom);
            }
        }
        for (let y = top - (top % (gridSize/subdivisions)); y <= bottom; y += gridSize/subdivisions) {
            if (Math.abs(y) % gridSize !== 0) {
                this.ctx.moveTo(left, y);
                this.ctx.lineTo(right, y);
            }
        }
        this.ctx.stroke();
    }

    drawMesh() {
        if (!this.mesh || !this.mesh.vertices) {
            // Draw a placeholder message if no mesh
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('No mesh to display', this.canvas.width / 2, this.canvas.height / 2);
            return;
        }

        console.log(`Drawing mesh with ${this.mesh.vertices.length} vertices, ${this.mesh.edges?.length || 0} edges, ${this.mesh.faces?.length || 0} faces`);

        // Draw faces first (behind edges)
        if (this.mesh.faces && this.mesh.faces.length > 0) {
            console.log(`Drawing ${this.mesh.faces.length} faces`);
            this.mesh.faces.forEach((face, faceIndex) => {
                if (face.length >= 3) {
                    // Check if all vertices exist
                    const validVertices = face.filter(idx => idx < this.mesh.vertices.length);
                    if (validVertices.length >= 3) {
                        this.ctx.fillStyle = 'rgba(64, 128, 255, 0.3)';
                        this.ctx.strokeStyle = '#4080ff';
                        this.ctx.lineWidth = 2;

                        this.ctx.beginPath();

                        // Get screen positions for all vertices in the face
                        const screenPositions = validVertices.map((idx, i) => {
                            const vertex = this.mesh.vertices[idx];
                            const screenPos = this.worldToScreen(vertex);
                            if (i === 0) {
                                console.log(`Face ${faceIndex} vertex ${idx}: ${vertex.x},${vertex.y},${vertex.z} -> ${screenPos ? `${screenPos.x},${screenPos.y}` : 'null'}`);
                            }
                            return screenPos;
                        }).filter(pos => pos !== null);

                        if (screenPositions.length >= 3) {
                            this.ctx.moveTo(screenPositions[0].x, screenPositions[0].y);
                            for (let i = 1; i < screenPositions.length; i++) {
                                this.ctx.lineTo(screenPositions[i].x, screenPositions[i].y);
                            }
                            this.ctx.closePath();
                            this.ctx.fill();
                            this.ctx.stroke();
                        } else {
                            console.warn(`Face ${faceIndex} has insufficient valid screen positions: ${screenPositions.length}`);
                        }
                    } else {
                        console.warn(`Face ${faceIndex} has insufficient valid vertices: ${validVertices.length}`);
                    }
                }
            });
        } else {
            console.log('No faces to draw');
        }

        // Draw edges
        if (this.mesh.edges && this.mesh.edges.length > 0) {
            this.ctx.strokeStyle = '#666666';
            this.ctx.lineWidth = 1;

            this.mesh.edges.forEach((edge, edgeIndex) => {
                if (edge.length >= 2) {
                    const v1Idx = edge[0];
                    const v2Idx = edge[1];

                    if (v1Idx < this.mesh.vertices.length && v2Idx < this.mesh.vertices.length) {
                        const v1 = this.mesh.vertices[v1Idx];
                        const v2 = this.mesh.vertices[v2Idx];

                        const screenPos1 = this.worldToScreen(v1);
                        const screenPos2 = this.worldToScreen(v2);

                        if (screenPos1 && screenPos2) {
                            this.ctx.beginPath();
                            this.ctx.moveTo(screenPos1.x, screenPos1.y);
                            this.ctx.lineTo(screenPos2.x, screenPos2.y);
                            this.ctx.stroke();
                        }
                    }
                }
            });
        }

        // Draw vertices last (on top)
        if (this.mesh.vertices && this.mesh.vertices.length > 0) {
            this.mesh.vertices.forEach((vertex, index) => {
                if (vertex) {
                    const screenPos = this.worldToScreen(vertex);
                    if (screenPos) {
                        // Check if vertex is selected or hovered
                        const isSelected = this.selection.selectedVertices.has(index);
                        const isHovered = this.selection.hoveredVertex === index;

                        if (isSelected) {
                            this.ctx.fillStyle = '#ffff00';
                            this.ctx.strokeStyle = '#ff0000';
                            this.ctx.lineWidth = 3;
                        } else if (isHovered) {
                            this.ctx.fillStyle = '#ffffff';
                            this.ctx.strokeStyle = '#cccccc';
                            this.ctx.lineWidth = 2;
                        } else {
                            this.ctx.fillStyle = '#00ff00';
                            this.ctx.strokeStyle = '#ffffff';
                            this.ctx.lineWidth = 2;
                        }

                        this.ctx.beginPath();
                        this.ctx.arc(screenPos.x, screenPos.y, 6, 0, Math.PI * 2);
                        this.ctx.fill();
                        this.ctx.stroke();

                        // Draw vertex index for debugging
                        this.ctx.fillStyle = '#000000';
                        this.ctx.font = '10px Arial';
                        this.ctx.textAlign = 'center';
                        this.ctx.textBaseline = 'middle';
                        this.ctx.fillText(index.toString(), screenPos.x, screenPos.y);
                    }
                }
            });
        }
    }

    drawSelection() {
        // Draw selection rectangle if dragging
        if (this.mouse.isDown && !this.cameraControls.isOrbiting && !this.cameraControls.isPanning) {
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([5, 5]);

            const startX = this.cameraControls.lastMouse.x;
            const startY = this.cameraControls.lastMouse.y;

            this.ctx.strokeRect(
                Math.min(startX, this.mouse.x),
                Math.min(startY, this.mouse.y),
                Math.abs(this.mouse.x - startX),
                Math.abs(this.mouse.y - startY)
            );

            this.ctx.setLineDash([]);
        }
    }

    drawUI() {
        // Draw mode indicators
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 10, 200, 80);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';

        let y = 30;
        this.ctx.fillText(`Mode: ${this.transform.mode}`, 20, y);
        y += 15;
        this.ctx.fillText(`Selection: ${this.selection.mode}`, 20, y);
        y += 15;
        this.ctx.fillText(`Vertices: ${this.selection.selectedVertices.size}`, 20, y);
        y += 15;
        this.ctx.fillText(`Camera: ${this.cameraControls.zoom.toFixed(2)}x`, 20, y);
    }

    update() {
        if (this.isInitialized) {
            this.render();
        }
    }

    destroy() {
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        this.isInitialized = false;
    }
}

/**
 * 3D Model Editor Window - Main editor class
 */
class ModelEditorWindow extends EditorWindow {
    constructor() {
        super("3D Model Editor", {
            width: 1600,
            height: 1000,
            resizable: true,
            modal: false
        });

        this.viewport = null;
        this.currentMesh = null;
        this.selectedVertices = new Set();
        this.clipboard = null;

        this.setupUI();
        this.setupToolbar();
        this.setupPropertiesPanel();
        this.setupMenuBar();

        // Initialize viewport after UI is set up
        setTimeout(() => {
            this.initializeViewport();
        }, 100);
    }

    setupUI() {
        this.clearContent();

        // Create main layout
        const mainContainer = document.createElement('div');
        mainContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            height: 100%;
            background: #2d2d2d;
        `;

        // Create toolbar container
        this.toolbarContainer = document.createElement('div');
        this.toolbarContainer.style.cssText = `
            background: #3d3d3d;
            border-bottom: 1px solid #555;
            padding: 8px;
        `;

        // Create viewport container
        this.viewportContainer = document.createElement('div');
        this.viewportContainer.style.cssText = `
            flex: 1;
            position: relative;
            background: #1a1a1a;
            overflow: hidden;
            min-height: 600px;
            min-width: 800px;
        `;

        // Create properties panel
        this.propertiesPanel = document.createElement('div');
        this.propertiesPanel.style.cssText = `
            width: 300px;
            background: #2d2d2d;
            border-left: 1px solid #555;
            padding: 16px;
            overflow-y: auto;
        `;

        mainContainer.appendChild(this.toolbarContainer);
        mainContainer.appendChild(this.viewportContainer);

        // Create split layout for viewport and properties
        const contentWrapper = document.createElement('div');
        contentWrapper.style.cssText = `
            display: flex;
            flex: 1;
            overflow: hidden;
        `;
        contentWrapper.appendChild(this.viewportContainer);
        contentWrapper.appendChild(this.propertiesPanel);

        mainContainer.appendChild(contentWrapper);
        this.content.appendChild(mainContainer);
    }

    setupToolbar() {
        // Shape selection buttons
        const shapes = [
            { id: 'cube', label: 'Cube', icon: '■' },
            { id: 'sphere', label: 'Sphere', icon: '●' },
            { id: 'cylinder', label: 'Cylinder', icon: '○' },
            { id: 'cone', label: 'Cone', icon: '△' },
            { id: 'torus', label: 'Torus', icon: '◎' },
            { id: 'plane', label: 'Plane', icon: '□' }
        ];

        shapes.forEach(shape => {
            const button = this.addButton(`shape_${shape.id}`, shape.icon, {
                onClick: () => this.createShape(shape.id)
            });
            button.title = shape.label;
            button.style.cssText += `
                width: 40px;
                height: 40px;
                margin: 2px;
                font-size: 16px;
                font-weight: bold;
            `;
            this.toolbarContainer.appendChild(button);
        });

        // Separator
        const separator1 = document.createElement('div');
        separator1.style.cssText = `
            width: 1px;
            height: 30px;
            background: #666;
            margin: 0 8px;
        `;
        this.toolbarContainer.appendChild(separator1);

        // Transform tools
        const tools = [
            { id: 'select', label: 'Select', icon: '▼' },
            { id: 'move', label: 'Move', icon: '↕' },
            { id: 'rotate', label: 'Rotate', icon: '↻' },
            { id: 'scale', label: 'Scale', icon: '⤢' }
        ];

        tools.forEach(tool => {
            const button = this.addButton(`tool_${tool.id}`, tool.icon, {
                onClick: () => this.setTransformMode(tool.id)
            });
            button.title = tool.label;
            button.style.cssText += `
                width: 40px;
                height: 40px;
                margin: 2px;
                font-size: 16px;
            `;
            this.toolbarContainer.appendChild(button);
        });

        // Separator
        const separator2 = document.createElement('div');
        separator2.style.cssText = `
            width: 1px;
            height: 30px;
            background: #666;
            margin: 0 8px;
        `;
        this.toolbarContainer.appendChild(separator2);

        // File operations
        const fileButton = this.addButton('save_mesh', '💾', {
            onClick: () => this.saveMesh()
        });
        fileButton.title = 'Save Mesh';
        fileButton.style.cssText += `
            width: 40px;
            height: 40px;
            margin: 2px;
            font-size: 16px;
        `;
        this.toolbarContainer.appendChild(fileButton);

        const loadButton = this.addButton('load_mesh', '📁', {
            onClick: () => this.loadMesh()
        });
        loadButton.title = 'Load Mesh';
        loadButton.style.cssText += `
            width: 40px;
            height: 40px;
            margin: 2px;
            font-size: 16px;
        `;
        this.toolbarContainer.appendChild(loadButton);

        // Help button
        const helpButton = this.addButton('help', '?', {
            onClick: () => this.showHelp()
        });
        helpButton.title = 'Help & Shortcuts';
        helpButton.style.cssText += `
            width: 40px;
            height: 40px;
            margin: 2px;
            font-size: 16px;
            background: #0078d4;
        `;
        this.toolbarContainer.appendChild(helpButton);
    }

    setupPropertiesPanel() {
        // Mesh properties
        this.addInput('mesh_name', 'Mesh Name', {
            value: 'New Mesh',
            onChange: (value) => {
                if (this.currentMesh) {
                    this.currentMesh.name = value;
                }
            }
        });

        // Transform properties
        this.addInput('position_x', 'Position X', {
            type: 'number',
            value: 0,
            step: 1,
            onChange: (value) => {
                if (this.currentMesh) {
                    this.currentMesh.position.x = parseFloat(value) || 0;
                    this.refreshViewport();
                }
            }
        });

        this.addInput('position_y', 'Position Y', {
            type: 'number',
            value: 0,
            step: 1,
            onChange: (value) => {
                if (this.currentMesh) {
                    this.currentMesh.position.y = parseFloat(value) || 0;
                    this.refreshViewport();
                }
            }
        });

        this.addInput('position_z', 'Position Z', {
            type: 'number',
            value: 0,
            step: 1,
            onChange: (value) => {
                if (this.currentMesh) {
                    this.currentMesh.position.z = parseFloat(value) || 0;
                    this.refreshViewport();
                }
            }
        });

        this.addInput('scale_x', 'Scale X', {
            type: 'number',
            value: 1,
            step: 0.1,
            min: 0.1,
            max: 10,
            onChange: (value) => {
                if (this.currentMesh) {
                    this.currentMesh.scale.x = parseFloat(value) || 1;
                    this.refreshViewport();
                }
            }
        });

        this.addInput('scale_y', 'Scale Y', {
            type: 'number',
            value: 1,
            step: 0.1,
            min: 0.1,
            max: 10,
            onChange: (value) => {
                if (this.currentMesh) {
                    this.currentMesh.scale.y = parseFloat(value) || 1;
                    this.refreshViewport();
                }
            }
        });

        this.addInput('scale_z', 'Scale Z', {
            type: 'number',
            value: 1,
            step: 0.1,
            min: 0.1,
            max: 10,
            onChange: (value) => {
                if (this.currentMesh) {
                    this.currentMesh.scale.z = parseFloat(value) || 1;
                    this.refreshViewport();
                }
            }
        });

        // Vertex manipulation
        const vertexGroup = document.createElement('div');
        vertexGroup.style.cssText = `
            margin: 16px 0;
            padding: 12px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
        `;

        const vertexTitle = document.createElement('h4');
        vertexTitle.textContent = 'Vertex Operations';
        vertexTitle.style.cssText = `
            margin: 0 0 12px 0;
            color: #ffffff;
            font-size: 14px;
        `;
        vertexGroup.appendChild(vertexTitle);

        const extrudeButton = this.addButton('extrude_vertices', 'Extrude', {
            onClick: () => this.extrudeSelectedVertices()
        });
        extrudeButton.style.cssText = `
            width: 100%;
            margin: 4px 0;
            background: #0078d4;
        `;
        vertexGroup.appendChild(extrudeButton);

        const deleteButton = this.addButton('delete_vertices', 'Delete', {
            onClick: () => this.deleteSelectedVertices()
        });
        deleteButton.style.cssText = `
            width: 100%;
            margin: 4px 0;
            background: #d13438;
        `;
        vertexGroup.appendChild(deleteButton);

        this.propertiesPanel.appendChild(vertexGroup);

        // Mesh info
        this.meshInfo = document.createElement('div');
        this.meshInfo.style.cssText = `
            margin: 16px 0;
            padding: 12px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            color: #cccccc;
        `;
        this.propertiesPanel.appendChild(this.meshInfo);

        this.updateMeshInfo();
    }

    setupMenuBar() {
        // File menu
        const fileMenu = document.createElement('div');
        fileMenu.style.cssText = `
            position: absolute;
            top: 8px;
            left: 8px;
            z-index: 1000;
        `;

        const menuButton = document.createElement('button');
        menuButton.textContent = 'File';
        menuButton.style.cssText = `
            background: #3d3d3d;
            color: #ffffff;
            border: 1px solid #555;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;

        const menuDropdown = document.createElement('div');
        menuDropdown.style.cssText = `
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            background: #2d2d2d;
            border: 1px solid #555;
            border-radius: 4px;
            min-width: 150px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        `;

        const menuItems = [
            { label: 'New Mesh', action: () => this.newMesh() },
            { label: 'Save Mesh As...', action: () => this.saveMeshAs() },
            { label: 'Import Mesh', action: () => this.importMesh() },
            { label: 'Export Mesh', action: () => this.exportMesh() }
        ];

        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.textContent = item.label;
            menuItem.style.cssText = `
                padding: 8px 12px;
                color: #ffffff;
                cursor: pointer;
                border-bottom: 1px solid #444;
            `;

            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.background = '#444';
            });

            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.background = 'transparent';
            });

            menuItem.addEventListener('click', () => {
                item.action();
                menuDropdown.style.display = 'none';
            });

            menuDropdown.appendChild(menuItem);
        });

        menuButton.addEventListener('click', () => {
            menuDropdown.style.display = menuDropdown.style.display === 'none' ? 'block' : 'none';
        });

        fileMenu.appendChild(menuButton);
        fileMenu.appendChild(menuDropdown);
        this.viewportContainer.appendChild(fileMenu);

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!fileMenu.contains(e.target)) {
                menuDropdown.style.display = 'none';
            }
        });
    }

    initializeViewport() {
        if (this.viewportContainer) {
            console.log('Initializing 3D viewport...');
            this.viewport = new ModelEditor3DViewport(this.viewportContainer, this);
            console.log('3D viewport initialized');
        } else {
            console.error('Viewport container not found');
        }
    }

    createShape(shapeType) {
        if (!this.viewport) {
            console.error('Viewport not initialized');
            return;
        }

        console.log(`Creating shape: ${shapeType}`);

        let vertices = [];
        let edges = [];
        let faces = [];

        switch (shapeType) {
            case 'cube':
                vertices = [
                    new Vector3(-50, -50, -50), // 0: back-left-bottom
                    new Vector3(50, -50, -50),  // 1: back-right-bottom
                    new Vector3(50, 50, -50),   // 2: back-right-top
                    new Vector3(-50, 50, -50),  // 3: back-left-top
                    new Vector3(-50, -50, 50),  // 4: front-left-bottom
                    new Vector3(50, -50, 50),   // 5: front-right-bottom
                    new Vector3(50, 50, 50),    // 6: front-right-top
                    new Vector3(-50, 50, 50)    // 7: front-left-top
                ];
                edges = [
                    [0, 1], [1, 2], [2, 3], [3, 0], // back face
                    [4, 5], [5, 6], [6, 7], [7, 4], // front face
                    [0, 4], [1, 5], [2, 6], [3, 7]  // connecting edges
                ];
                faces = [
                    [0, 3, 2], [0, 2, 1], // back face
                    [4, 5, 6], [4, 6, 7], // front face
                    [0, 1, 5], [0, 5, 4], // bottom face
                    [3, 7, 6], [3, 6, 2], // top face
                    [0, 4, 7], [0, 7, 3], // left face
                    [1, 2, 6], [1, 6, 5]  // right face
                ];
                break;

            case 'sphere':
                const radius = 50;
                const segments = 12;

                // Create vertices using spherical coordinates
                for (let lat = 0; lat <= segments; lat++) {
                    const theta = lat * Math.PI / segments;
                    const sinTheta = Math.sin(theta);
                    const cosTheta = Math.cos(theta);

                    for (let lon = 0; lon <= segments; lon++) {
                        const phi = lon * 2 * Math.PI / segments;
                        const sinPhi = Math.sin(phi);
                        const cosPhi = Math.cos(phi);

                        const x = radius * sinTheta * cosPhi;
                        const y = radius * cosTheta;
                        const z = radius * sinTheta * sinPhi;

                        vertices.push(new Vector3(x, y, z));
                    }
                }

                // Create faces for sphere
                for (let lat = 0; lat < segments; lat++) {
                    for (let lon = 0; lon < segments; lon++) {
                        const first = lat * (segments + 1) + lon;
                        const second = first + segments + 1;

                        // Create two triangular faces with correct winding
                        faces.push([first, first + 1, second]);
                        faces.push([first + 1, second + 1, second]);
                    }
                }
                break;

            case 'cylinder':
                const cylRadius = 40;
                const cylHeight = 80;
                const cylSegments = 16;

                // Bottom center
                vertices.push(new Vector3(0, 0, -cylHeight/2));

                // Bottom vertices
                for (let i = 0; i < cylSegments; i++) {
                    const angle = (i / cylSegments) * Math.PI * 2;
                    const x = Math.cos(angle) * cylRadius;
                    const y = Math.sin(angle) * cylRadius;
                    vertices.push(new Vector3(x, y, -cylHeight/2));
                }

                // Top center
                vertices.push(new Vector3(0, 0, cylHeight/2));

                // Top vertices
                for (let i = 0; i < cylSegments; i++) {
                    const angle = (i / cylSegments) * Math.PI * 2;
                    const x = Math.cos(angle) * cylRadius;
                    const y = Math.sin(angle) * cylRadius;
                    vertices.push(new Vector3(x, y, cylHeight/2));
                }

                const bottomCenter = 0;
                const topCenter = 1 + cylSegments;

                // Bottom faces
                for (let i = 0; i < cylSegments; i++) {
                    const next = (i + 1) % cylSegments;
                    faces.push([bottomCenter, 1 + i, 1 + next]);
                }

                // Top faces
                for (let i = 0; i < cylSegments; i++) {
                    const next = (i + 1) % cylSegments;
                    faces.push([topCenter, 2 + cylSegments + next, 2 + cylSegments + i]);
                }

                // Side faces
                for (let i = 0; i < cylSegments; i++) {
                    const next = (i + 1) % cylSegments;
                    const bottomCurrent = 1 + i;
                    const bottomNext = 1 + next;
                    const topCurrent = 2 + cylSegments + i;
                    const topNext = 2 + cylSegments + next;

                    faces.push([bottomCurrent, bottomNext, topNext, topCurrent]);
                }

                // Create edges
                for (let i = 0; i < cylSegments; i++) {
                    const next = (i + 1) % cylSegments;
                    edges.push([bottomCenter, 1 + i]);
                    edges.push([topCenter, 2 + cylSegments + i]);
                    edges.push([1 + i, 1 + next]);
                    edges.push([2 + cylSegments + i, 2 + cylSegments + next]);
                    edges.push([1 + i, 2 + cylSegments + i]);
                }
                break;

            case 'cone':
                const coneRadius = 50;
                const coneHeight = 80;
                const coneSegments = 16;

                // Apex
                vertices.push(new Vector3(0, 0, coneHeight/2));

                // Base center
                vertices.push(new Vector3(0, 0, -coneHeight/2));

                // Base vertices
                for (let i = 0; i < coneSegments; i++) {
                    const angle = (i / coneSegments) * Math.PI * 2;
                    const x = Math.cos(angle) * coneRadius;
                    const y = Math.sin(angle) * coneRadius;
                    vertices.push(new Vector3(x, y, -coneHeight/2));
                }

                const apex = 0;
                const baseCenter = 1;

                // Base face
                for (let i = 0; i < coneSegments; i++) {
                    const next = (i + 1) % coneSegments;
                    faces.push([baseCenter, 2 + i, 2 + next]);
                }

                // Side faces
                for (let i = 0; i < coneSegments; i++) {
                    const next = (i + 1) % coneSegments;
                    const current = 2 + i;
                    const nextBase = 2 + next;

                    faces.push([apex, current, nextBase]);
                }

                // Create edges
                for (let i = 0; i < coneSegments; i++) {
                    const next = (i + 1) % coneSegments;
                    edges.push([apex, 2 + i]);
                    edges.push([baseCenter, 2 + i]);
                    edges.push([2 + i, 2 + next]);
                }
                break;

            case 'torus':
                const torusMajorRadius = 60;
                const torusMinorRadius = 20;
                const torusMajorSegments = 16;
                const torusMinorSegments = 8;

                for (let i = 0; i < torusMajorSegments; i++) {
                    const theta = (i / torusMajorSegments) * Math.PI * 2;
                    const centerX = Math.cos(theta) * torusMajorRadius;
                    const centerZ = Math.sin(theta) * torusMajorRadius;

                    for (let j = 0; j < torusMinorSegments; j++) {
                        const phi = (j / torusMinorSegments) * Math.PI * 2;
                        const x = centerX + Math.cos(phi) * Math.cos(theta) * torusMinorRadius;
                        const y = Math.sin(phi) * torusMinorRadius;
                        const z = centerZ + Math.cos(phi) * Math.sin(theta) * torusMinorRadius;

                        vertices.push(new Vector3(x, y, z));
                    }
                }

                // Create faces
                for (let i = 0; i < torusMajorSegments; i++) {
                    for (let j = 0; j < torusMinorSegments; j++) {
                        const current = i * torusMinorSegments + j;
                        const nextMajor = ((i + 1) % torusMajorSegments) * torusMinorSegments + j;
                        const nextMinor = i * torusMinorSegments + ((j + 1) % torusMinorSegments);
                        const nextBoth = ((i + 1) % torusMajorSegments) * torusMinorSegments + ((j + 1) % torusMinorSegments);

                        faces.push([current, nextMinor, nextBoth]);
                        faces.push([current, nextBoth, nextMajor]);
                    }
                }
                break;

            case 'plane':
                vertices = [
                    new Vector3(-75, -75, 0),
                    new Vector3(75, -75, 0),
                    new Vector3(75, 75, 0),
                    new Vector3(-75, 75, 0)
                ];
                edges = [
                    [0, 1], [1, 2], [2, 3], [3, 0]
                ];
                faces = [
                    [0, 1, 2, 3]
                ];
                break;

            default:
                console.warn(`Unknown shape type: ${shapeType}`);
                return;
        }

        // Ensure we have valid mesh data
        if (vertices.length === 0) {
            console.error('No vertices created for shape:', shapeType);
            return;
        }

        console.log(`Created ${shapeType} with ${vertices.length} vertices, ${edges.length} edges, ${faces.length} faces`);

        this.viewport.mesh = {
            vertices: vertices,
            edges: edges,
            faces: faces,
            position: new Vector3(0, 0, 0),
            rotation: new Vector3(0, 0, 0),
            scale: new Vector3(1, 1, 1)
        };

        this.currentMesh = this.viewport.mesh;
        this.updateMeshInfo();
        this.refreshViewport();

        // Update camera position to better view the new mesh
        this.fitCameraToMesh();
    }

    fitCameraToMesh() {
        if (!this.viewport || !this.viewport.mesh || !this.viewport.mesh.vertices) return;

        // Calculate bounding box
        const vertices = this.viewport.mesh.vertices;
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        vertices.forEach(vertex => {
            minX = Math.min(minX, vertex.x);
            maxX = Math.max(maxX, vertex.x);
            minY = Math.min(minY, vertex.y);
            maxY = Math.max(maxY, vertex.y);
            minZ = Math.min(minZ, vertex.z);
            maxZ = Math.max(maxZ, vertex.z);
        });

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const centerZ = (minZ + maxZ) / 2;

        const sizeX = maxX - minX;
        const sizeY = maxY - minY;
        const sizeZ = maxZ - minZ;
        const maxSize = Math.max(sizeX, sizeY, sizeZ);

        // Position camera to view the entire mesh
        const distance = maxSize * 1.5;
        this.viewport.cameraControls.orbitDistance = distance;
        this.viewport.cameraControls.zoom = 1;

        // Center the view
        this.viewport.cameraControls.pan.x = -centerX;
        this.viewport.cameraControls.pan.y = -centerY;

        this.viewport.updateCameraPosition();
    }

    setTransformMode(mode) {
        if (this.viewport) {
            this.viewport.transform.mode = mode;
        }
    }

    extrudeSelectedVertices() {
        if (!this.viewport || !this.viewport.mesh || this.selectedVertices.size === 0) return;

        const extrusionDistance = 20;
        const selectedArray = Array.from(this.selectedVertices);

        selectedArray.forEach(vertexIndex => {
            const vertex = this.viewport.mesh.vertices[vertexIndex];
            if (vertex) {
                // Create new vertex by extruding along normal
                const normal = this.calculateVertexNormal(vertexIndex);
                const newVertex = new Vector3(
                    vertex.x + normal.x * extrusionDistance,
                    vertex.y + normal.y * extrusionDistance,
                    vertex.z + normal.z * extrusionDistance
                );

                this.viewport.mesh.vertices.push(newVertex);

                // Create faces for extruded geometry
                // This is a simplified extrusion - in a full implementation,
                // you'd create proper faces connecting the original and extruded vertices
            }
        });

        this.refreshViewport();
    }

    deleteSelectedVertices() {
        if (!this.viewport || !this.viewport.mesh || this.selectedVertices.size === 0) return;

        const selectedArray = Array.from(this.selectedVertices);

        // Remove vertices (in reverse order to maintain indices)
        selectedArray.sort((a, b) => b - a).forEach(index => {
            this.viewport.mesh.vertices.splice(index, 1);
        });

        // Update faces and edges to account for removed vertices
        this.rebuildMeshTopology();

        this.selectedVertices.clear();
        this.refreshViewport();
    }

    calculateVertexNormal(vertexIndex) {
        // Simple normal calculation - average of adjacent face normals
        const vertex = this.viewport.mesh.vertices[vertexIndex];
        if (!vertex || !this.viewport.mesh.faces) return new Vector3(0, 0, 1);

        const normals = [];

        this.viewport.mesh.faces.forEach(face => {
            if (face.includes(vertexIndex)) {
                // Calculate face normal
                const v1 = this.viewport.mesh.vertices[face[0]];
                const v2 = this.viewport.mesh.vertices[face[1]];
                const v3 = this.viewport.mesh.vertices[face[2]];

                if (v1 && v2 && v3) {
                    const edge1 = new Vector3(v2.x - v1.x, v2.y - v1.y, v2.z - v1.z);
                    const edge2 = new Vector3(v3.x - v1.x, v3.y - v1.y, v3.z - v1.z);

                    const normal = new Vector3(
                        edge1.y * edge2.z - edge1.z * edge2.y,
                        edge1.z * edge2.x - edge1.x * edge2.z,
                        edge1.x * edge2.y - edge1.y * edge2.x
                    );

                    const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
                    if (length > 0) {
                        normal.x /= length;
                        normal.y /= length;
                        normal.z /= length;
                        normals.push(normal);
                    }
                }
            }
        });

        // Average all normals
        if (normals.length === 0) return new Vector3(0, 0, 1);

        const averageNormal = normals.reduce((acc, normal) => {
            return new Vector3(acc.x + normal.x, acc.y + normal.y, acc.z + normal.z);
        }, new Vector3(0, 0, 0));

        const length = Math.sqrt(averageNormal.x * averageNormal.x + averageNormal.y * averageNormal.y + averageNormal.z * averageNormal.z);
        if (length > 0) {
            averageNormal.x /= length;
            averageNormal.y /= length;
            averageNormal.z /= length;
        }

        return averageNormal;
    }

    rebuildMeshTopology() {
        // This is a simplified topology rebuild
        // In a full implementation, you'd properly update all face and edge indices
        // For now, we'll just clear the mesh and start fresh
        console.log('Rebuilding mesh topology...');
    }

    async saveMesh() {
        if (!this.viewport || !this.viewport.mesh) return;

        const filename = prompt('Enter filename for mesh:', 'MyMesh');
        if (!filename) return;

        try {
            // Create a temporary Mesh3D instance to use its save functionality
            const tempMesh3D = new Mesh3D();
            tempMesh3D.vertices = this.viewport.mesh.vertices;
            tempMesh3D.edges = this.viewport.mesh.edges || [];
            tempMesh3D.faces = this.viewport.mesh.faces || [];
            tempMesh3D.position = this.viewport.mesh.position;
            tempMesh3D.rotation = this.viewport.mesh.rotation;
            tempMesh3D.scale = this.viewport.mesh.scale;

            const success = await tempMesh3D.saveToM3DFile(filename);
            if (success) {
                alert(`Mesh saved as ${filename}.m3d`);
            } else {
                alert('Failed to save mesh');
            }
        } catch (error) {
            console.error('Error saving mesh:', error);
            alert('Error saving mesh: ' + error.message);
        }
    }

    async loadMesh() {
        if (!this.viewport) return;

        try {
            const files = await window.editor.fileBrowser.getAllFiles();
            const m3dFiles = files.filter(file => file.name.endsWith('.m3d'));

            if (m3dFiles.length === 0) {
                alert('No .m3d files found');
                return;
            }

            // Show file selection dialog
            const selectedFile = await this.showFileDialog(m3dFiles);
            if (!selectedFile) return;

            // Create a temporary Mesh3D instance to use its load functionality
            const tempMesh3D = new Mesh3D();
            const success = await tempMesh3D.loadFromM3DFile(selectedFile);

            if (success) {
                this.viewport.mesh = {
                    vertices: tempMesh3D.vertices,
                    edges: tempMesh3D.edges,
                    faces: tempMesh3D.faces,
                    position: tempMesh3D.position,
                    rotation: tempMesh3D.rotation,
                    scale: tempMesh3D.scale
                };

                this.currentMesh = this.viewport.mesh;
                this.updateMeshInfo();
                this.refreshViewport();

                alert(`Mesh loaded from ${selectedFile}`);
            } else {
                alert('Failed to load mesh');
            }
        } catch (error) {
            console.error('Error loading mesh:', error);
            alert('Error loading mesh: ' + error.message);
        }
    }

    async showFileDialog(files) {
        return new Promise((resolve) => {
            // Create a simple modal dialog for file selection
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;

            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: #2d2d2d;
                border: 1px solid #555;
                border-radius: 8px;
                padding: 20px;
                min-width: 400px;
                max-height: 400px;
                overflow-y: auto;
            `;

            const title = document.createElement('h3');
            title.textContent = 'Select M3D File';
            title.style.cssText = `
                margin: 0 0 16px 0;
                color: #ffffff;
                font-size: 16px;
            `;
            dialog.appendChild(title);

            const fileList = document.createElement('div');
            files.forEach(file => {
                const fileItem = document.createElement('div');
                fileItem.textContent = file.name;
                fileItem.style.cssText = `
                    padding: 8px;
                    color: #ffffff;
                    cursor: pointer;
                    border-bottom: 1px solid #444;
                `;

                fileItem.addEventListener('mouseenter', () => {
                    fileItem.style.background = '#444';
                });

                fileItem.addEventListener('mouseleave', () => {
                    fileItem.style.background = 'transparent';
                });

                fileItem.addEventListener('click', () => {
                    document.body.removeChild(modal);
                    resolve(file.name);
                });

                fileList.appendChild(fileItem);
            });

            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancel';
            cancelButton.style.cssText = `
                margin-top: 16px;
                padding: 8px 16px;
                background: #d13438;
                color: #ffffff;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            `;

            cancelButton.addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(null);
            });

            dialog.appendChild(fileList);
            dialog.appendChild(cancelButton);
            modal.appendChild(dialog);
            document.body.appendChild(modal);
        });
    }

    newMesh() {
        if (confirm('Create new mesh? Any unsaved changes will be lost.')) {
            this.createShape('cube');
        }
    }

    saveMeshAs() {
        this.saveMesh();
    }

    importMesh() {
        this.loadMesh();
    }

    exportMesh() {
        if (!this.viewport || !this.viewport.mesh) return;

        const dataStr = JSON.stringify(this.viewport.mesh, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'mesh_export.json';
        link.click();

        URL.revokeObjectURL(url);
    }

    onVertexSelected(index, vertex) {
        this.selectedVertices.add(index);

        // Update properties panel with vertex info
        const component = this.getComponent('vertex_info');
        if (component) {
            component.innerHTML = `
                <div>Selected Vertex: ${index}</div>
                <div>Position: (${vertex.x.toFixed(2)}, ${vertex.y.toFixed(2)}, ${vertex.z.toFixed(2)})</div>
            `;
        }
    }

    updateMeshInfo() {
        if (!this.viewport || !this.viewport.mesh) {
            this.meshInfo.innerHTML = `
                <div>No mesh loaded</div>
            `;
            return;
        }

        const mesh = this.viewport.mesh;
        this.meshInfo.innerHTML = `
            <div><strong>Mesh Information</strong></div>
            <div>Vertices: ${mesh.vertices ? mesh.vertices.length : 0}</div>
            <div>Edges: ${mesh.edges ? mesh.edges.length : 0}</div>
            <div>Faces: ${mesh.faces ? mesh.faces.length : 0}</div>
            <div>Position: (${mesh.position.x.toFixed(2)}, ${mesh.position.y.toFixed(2)}, ${mesh.position.z.toFixed(2)})</div>
            <div>Scale: (${mesh.scale.x.toFixed(2)}, ${mesh.scale.y.toFixed(2)}, ${mesh.scale.z.toFixed(2)})</div>
        `;
    }

    refreshViewport() {
        if (this.viewport) {
            console.log('Refreshing viewport...');
            this.viewport.update();
            this.updateMeshInfo();
        } else {
            console.warn('Viewport not available for refresh');
        }
    }

    onShow() {
        super.onShow();
        if (this.viewport) {
            setTimeout(() => this.viewport.resize(), 100);
        }
        this.setupKeyboardShortcuts();
    }

    setupKeyboardShortcuts() {
        this.keyboardHandler = (e) => {
            // Don't handle shortcuts if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            switch (e.key.toLowerCase()) {
                case '1':
                    this.createShape('cube');
                    break;
                case '2':
                    this.createShape('sphere');
                    break;
                case '3':
                    this.createShape('cylinder');
                    break;
                case '4':
                    this.createShape('cone');
                    break;
                case '5':
                    this.createShape('torus');
                    break;
                case '6':
                    this.createShape('plane');
                    break;

                case 'q':
                    this.setTransformMode('select');
                    break;
                case 'w':
                    this.setTransformMode('move');
                    break;
                case 'e':
                    this.setTransformMode('rotate');
                    break;
                case 'r':
                    this.setTransformMode('scale');
                    break;

                case 's':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.saveMesh();
                    }
                    break;

                case 'o':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.loadMesh();
                    }
                    break;

                case 'n':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.newMesh();
                    }
                    break;

                case 'delete':
                case 'backspace':
                    if (this.selectedVertices.size > 0) {
                        this.deleteSelectedVertices();
                    }
                    break;

                case 'escape':
                    this.selectedVertices.clear();
                    this.setTransformMode('select');
                    this.refreshViewport();
                    break;

                case 'g':
                    if (this.selectedVertices.size > 0) {
                        this.startVertexDrag();
                    }
                    break;

                case 'x':
                    if (this.selectedVertices.size > 0) {
                        this.extrudeSelectedVertices();
                    }
                    break;
            }
        };

        document.addEventListener('keydown', this.keyboardHandler);
    }

    onClose() {
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
        }
        super.onClose();
    }

    showHelp() {
        const helpContent = `
            <div style="font-family: Arial, sans-serif; color: #ffffff;">
                <h3 style="color: #0078d4; margin-top: 0;">3D Model Editor Help</h3>

                <h4>Shape Creation:</h4>
                <div>1 - Create Cube</div>
                <div>2 - Create Sphere</div>
                <div>3 - Create Cylinder</div>
                <div>4 - Create Cone</div>
                <div>5 - Create Torus</div>
                <div>6 - Create Plane</div>

                <h4>Transform Tools:</h4>
                <div>Q - Select Mode</div>
                <div>W - Move Mode</div>
                <div>E - Rotate Mode</div>
                <div>R - Scale Mode</div>

                <h4>File Operations:</h4>
                <div>Ctrl+S - Save Mesh</div>
                <div>Ctrl+O - Load Mesh</div>
                <div>Ctrl+N - New Mesh</div>

                <h4>Vertex Operations:</h4>
                <div>Click - Select Vertex</div>
                <div>G - Drag Selected Vertices</div>
                <div>X - Extrude Selected Vertices</div>
                <div>Delete/Backspace - Delete Selected Vertices</div>
                <div>Escape - Clear Selection</div>

                <h4>Camera Controls:</h4>
                <div>Left Click + Drag - Orbit Camera</div>
                <div>Middle Click + Drag - Pan Camera</div>
                <div>Mouse Wheel - Zoom Camera</div>
                <div>Ctrl + Left Click + Drag - Fast Orbit</div>
                <div>Shift + Left Click + Drag - Pan Camera</div>

                <h4>Mouse Controls:</h4>
                <div>Left Click - Select vertices or use current tool</div>
                <div>Right Click - Context menu (coming soon)</div>
                <div>Mouse Wheel - Zoom in/out</div>

                <h4>Tips:</h4>
                <div>• Use the toolbar buttons for quick shape creation</div>
                <div>• Select multiple vertices by clicking them</div>
                <div>• Use transform modes to manipulate selected vertices</div>
                <div>• Save your work regularly using Ctrl+S</div>
                <div>• Use the properties panel to fine-tune values</div>
            </div>
        `;

        // Create help modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            font-size: 14px;
        `;

        const helpDialog = document.createElement('div');
        helpDialog.style.cssText = `
            background: #2d2d2d;
            border: 1px solid #555;
            border-radius: 8px;
            padding: 20px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            color: #ffffff;
        `;

        helpDialog.innerHTML = helpContent;

        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style.cssText = `
            margin-top: 16px;
            padding: 8px 16px;
            background: #0078d4;
            color: #ffffff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            float: right;
        `;

        closeButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        helpDialog.appendChild(closeButton);
        modal.appendChild(helpDialog);
        document.body.appendChild(modal);

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    startVertexDrag() {
        if (this.selectedVertices.size === 0) return;

        this.isDraggingVertices = true;
        this.dragStartPosition = null;

        const dragHandler = (e) => {
            if (!this.dragStartPosition) {
                this.dragStartPosition = { x: e.clientX, y: e.clientY };
            }

            const deltaX = e.clientX - this.dragStartPosition.x;
            const deltaY = e.clientY - this.dragStartPosition.y;

            // Move selected vertices
            this.selectedVertices.forEach(index => {
                if (this.viewport.mesh.vertices[index]) {
                    this.viewport.mesh.vertices[index].x += deltaX * 0.1;
                    this.viewport.mesh.vertices[index].y += deltaY * 0.1;
                }
            });

            this.dragStartPosition = { x: e.clientX, y: e.clientY };
            this.refreshViewport();
        };

        const dragEndHandler = () => {
            this.isDraggingVertices = false;
            this.dragStartPosition = null;
            document.removeEventListener('mousemove', dragHandler);
            document.removeEventListener('mouseup', dragEndHandler);
        };

        document.addEventListener('mousemove', dragHandler);
        document.addEventListener('mouseup', dragEndHandler);
    }

    onResize(width, height) {
        super.onResize(width, height);
        if (this.viewport) {
            setTimeout(() => this.viewport.resize(), 100);
        }
    }
}

// Register the window class globally
window.ModelEditorWindow = ModelEditorWindow;
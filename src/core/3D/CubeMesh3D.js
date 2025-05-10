/**
 * CubeMesh3D - A specialized 3D mesh module for cubes with customizable properties
 * 
 * This module creates and renders a 3D cube mesh with configurable dimensions,
 * colors, and rendering options.
 */
class CubeMesh3D extends Module {
    /**
     * Create a new CubeMesh3D
     */
    constructor() {
        super("CubeMesh3D");
        
        // Cube properties
        this._size = 100;
        this._position = new Vector3(0, 0, 0);
        this._rotation = new Vector3(0, 0, 0);
        this._scale = new Vector3(1, 1, 1);
        
        // Appearance
        this._wireframeColor = "#FFFFFF";
        this._faceColor = "#3F51B5";
        this._renderMode = "wireframe"; // "wireframe", "solid", or "both"
        
        // Mesh data
        this.vertices = [];
        this.edges = [];
        this.faces = [];
        
        // Expose properties to the inspector
        this.exposeProperty("size", "number", 100, {
            min: 1,
            max: 500,
            onChange: () => this.updateCube()
        });
        
        this.exposeProperty("position", "vector3", this._position, {
            onChange: () => this.updateTransform()
        });
        
        this.exposeProperty("rotation", "vector3", this._rotation, {
            onChange: () => this.updateTransform()
        });
        
        this.exposeProperty("scale", "vector3", this._scale, {
            onChange: () => this.updateTransform()
        });
        
        this.exposeProperty("wireframeColor", "color", "#FFFFFF");
        this.exposeProperty("faceColor", "color", "#3F51B5");
        this.exposeProperty("renderMode", "enum", "wireframe", {
            options: ["wireframe", "solid", "both"]
        });
        
        // Initialize cube geometry
        this.updateCube();
    }
    
    /**
     * Update the cube geometry based on current size
     */
    updateCube() {
        const s = this.size / 2;
        
        this.vertices = [
            new Vector3(-s, -s, -s), // 0: back-bottom-left
            new Vector3(s, -s, -s),  // 1: back-bottom-right
            new Vector3(s, s, -s),   // 2: back-top-right
            new Vector3(-s, s, -s),  // 3: back-top-left
            new Vector3(-s, -s, s),  // 4: front-bottom-left
            new Vector3(s, -s, s),   // 5: front-bottom-right
            new Vector3(s, s, s),    // 6: front-top-right
            new Vector3(-s, s, s)    // 7: front-top-left
        ];
        
        this.edges = [
            [0, 1], [1, 2], [2, 3], [3, 0], // back face
            [4, 5], [5, 6], [6, 7], [7, 4], // front face
            [0, 4], [1, 5], [2, 6], [3, 7]  // connecting edges
        ];
        
        this.faces = [
            [0, 1, 2, 3], // back face
            [4, 5, 6, 7], // front face
            [0, 4, 7, 3], // left face
            [1, 5, 6, 2], // right face
            [3, 2, 6, 7], // top face
            [0, 1, 5, 4]  // bottom face
        ];
    }
    
    /**
     * Update transform values when properties change
     */
    updateTransform() {
        // This method can be used to perform additional actions when transform changes
        // For now, it's just a placeholder for future enhancements
    }
    
    /**
     * Draw the cube to the canvas
     * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on
     */
    draw(ctx) {
        // Find an active camera
        const camera = this.findActiveCamera();
        if (!camera) {
            // Draw a placeholder if no camera is available
            this.drawPlaceholder(ctx);
            return;
        }
        
        // Transform vertices based on mesh position/rotation/scale and game object transform
        const transformedVertices = this.transformVertices();
        
        // Project the 3D vertices to 2D screen space
        const projectedVertices = transformedVertices.map(vertex => 
            camera.projectPoint(vertex)
        );
        
        // Sort faces by depth for basic depth sorting (painter's algorithm)
        const sortedFaces = [...this.faces]
            .map((face, index) => {
                // Calculate average Z of the face vertices
                const avgZ = face.reduce((sum, vertexIndex) => {
                    return sum + transformedVertices[vertexIndex].z;
                }, 0) / face.length;
                
                return { index, avgZ };
            })
            .sort((a, b) => b.avgZ - a.avgZ) // Sort back-to-front
            .map(item => this.faces[item.index]);
        
        // Draw faces in sorted order
        if (this.renderMode === "solid" || this.renderMode === "both") {
            ctx.fillStyle = this.faceColor;
            
            for (const face of sortedFaces) {
                if (face.length < 3) continue; // Need at least 3 points to draw a face
                
                // Check if all vertices are visible
                const isVisible = face.every(vertexIndex => projectedVertices[vertexIndex] !== null);
                if (!isVisible) continue;
                
                // Draw the face
                ctx.beginPath();
                ctx.moveTo(projectedVertices[face[0]].x, projectedVertices[face[0]].y);
                
                for (let i = 1; i < face.length; i++) {
                    ctx.lineTo(projectedVertices[face[i]].x, projectedVertices[face[i]].y);
                }
                
                ctx.closePath();
                ctx.fill();
            }
        }
        
        // Draw edges
        if (this.renderMode === "wireframe" || this.renderMode === "both") {
            ctx.strokeStyle = this.wireframeColor;
            ctx.lineWidth = 1;
            
            for (const [from, to] of this.edges) {
                // Check if both vertices are visible
                if (projectedVertices[from] === null || projectedVertices[to] === null) {
                    continue;
                }
                
                ctx.beginPath();
                ctx.moveTo(projectedVertices[from].x, projectedVertices[from].y);
                ctx.lineTo(projectedVertices[to].x, projectedVertices[to].y);
                ctx.stroke();
            }
        }
    }
    
    /**
     * Draw a placeholder shape when no camera is available
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     */
    drawPlaceholder(ctx) {
        // Draw a simple cube wireframe
        ctx.strokeStyle = this.wireframeColor;
        ctx.lineWidth = 1;
        
        // Size based on scale
        const size = 25;
        
        // Draw front face
        ctx.beginPath();
        ctx.rect(-size, -size, size * 2, size * 2);
        ctx.stroke();
        
        // Draw back face (offset for perspective effect)
        ctx.beginPath();
        ctx.rect(-size * 0.7, -size * 0.7, size * 1.4, size * 1.4);
        ctx.stroke();
        
        // Draw connecting lines
        ctx.beginPath();
        ctx.moveTo(-size, -size);
        ctx.lineTo(-size * 0.7, -size * 0.7);
        ctx.moveTo(size, -size);
        ctx.lineTo(size * 0.7, -size * 0.7);
        ctx.moveTo(size, size);
        ctx.lineTo(size * 0.7, size * 0.7);
        ctx.moveTo(-size, size);
        ctx.lineTo(-size * 0.7, size * 0.7);
        ctx.stroke();
        
        // Draw "Cube3D" text
        ctx.fillStyle = this.wireframeColor;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Cube3D', 0, 0);
    }
    
    /**
     * Find the active camera in the scene
     * @returns {Camera3D|null} The active camera or null
     */
    findActiveCamera() {
        const allObjects = this.getAllGameObjects();
        
        for (const obj of allObjects) {
            const camera = obj.getModule("Camera3D");
            if (camera && camera.isActive) {
                return camera;
            }
        }
        
        return null;
    }
    
    /**
     * Get all game objects in the scene
     * @returns {Array<GameObject>} All game objects
     */
    getAllGameObjects() {
        if (!this.gameObject) return [];
        
        // Use the editor's method to get all game objects if available
        if (window.editor && window.editor.getAllGameObjects) {
            return window.editor.getAllGameObjects();
        }
        
        // Fallback to recursively finding game objects
        const allObjects = [];
        
        const scene = window.editor ? window.editor.activeScene : 
                    (window.engine ? window.engine.scene : null);
        
        if (scene && scene.gameObjects) {
            const findObjects = (objects) => {
                objects.forEach(obj => {
                    allObjects.push(obj);
                    if (obj.children && obj.children.length > 0) {
                        findObjects(obj.children);
                    }
                });
            };
            
            findObjects(scene.gameObjects);
        }
        
        return allObjects;
    }
    
    /**
     * Transform vertices based on mesh and game object transforms
     * @returns {Array<Vector3>} Transformed vertices
     */
    transformVertices() {
        if (!this.gameObject) return this.vertices;
        
        // Get the game object's world position, rotation, and scale
        const objPos = this.gameObject.getWorldPosition();
        const objRot = this.gameObject.getWorldRotation();
        const objScale = this.gameObject.getWorldScale();
        
        // Convert to 3D
        const objPos3D = new Vector3(objPos.x, objPos.y, 0);
        const objRot3D = new Vector3(0, 0, objRot * (Math.PI / 180)); // Convert to radians
        const objScale3D = new Vector3(objScale.x, objScale.y, 1);
        
        return this.vertices.map(vertex => {
            // Apply mesh scale
            let v = new Vector3(
                vertex.x * this.scale.x,
                vertex.y * this.scale.y,
                vertex.z * this.scale.z
            );
            
            // Apply mesh rotation
            v = v.rotateX(this.rotation.x * (Math.PI / 180));
            v = v.rotateY(this.rotation.y * (Math.PI / 180));
            v = v.rotateZ(this.rotation.z * (Math.PI / 180));
            
            // Apply mesh position
            v = v.add(this.position);
            
            // Apply game object transform
            // First scale
            v = new Vector3(
                v.x * objScale3D.x,
                v.y * objScale3D.y,
                v.z * objScale3D.z
            );
            
            // Then rotate (just Z rotation for now as GameObject is 2D)
            v = v.rotateZ(objRot3D.z);
            
            // Finally translate
            v = v.add(objPos3D);
            
            return v;
        });
    }
    
    /**
     * Draw in the editor
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     */
    drawInEditor(ctx) {
        // Use the same draw method for both runtime and editor
        this.draw(ctx);
    }
    
    // Getters and setters for properties
    get size() { return this._size; }
    set size(value) { 
        this._size = value;
        this.updateCube();
    }
    
    get position() { return this._position; }
    set position(value) { this._position = value; }
    
    get rotation() { return this._rotation; }
    set rotation(value) { this._rotation = value; }
    
    get scale() { return this._scale; }
    set scale(value) { this._scale = value; }
    
    get wireframeColor() { return this._wireframeColor; }
    set wireframeColor(value) { this._wireframeColor = value; }
    
    get faceColor() { return this._faceColor; }
    set faceColor(value) { this._faceColor = value; }
    
    get renderMode() { return this._renderMode; }
    set renderMode(value) { this._renderMode = value; }
}

// Register the CubeMesh3D module
window.CubeMesh3D = CubeMesh3D;
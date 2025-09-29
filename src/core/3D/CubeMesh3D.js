/**
 * CubeMesh3D - A specialized 3D mesh module for cubes with customizable properties
 * 
 * This module creates and renders a 3D cube mesh with configurable dimensions,
 * colors, and rendering options.
 */
class CubeMesh3D extends Module {
    static namespace = "WIP";

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

        // Axis visualization
        this._showAxisLines = false;
        this._axisLength = 150;

        // Mesh data
        this.vertices = [];
        this.edges = [];
        this.faces = [];

        // Expose properties to the inspector
        this.exposeProperty("size", "number", 100, {
            min: 1,
            max: 500,
            onChange: (val) => {
                this._size = val;
                this.updateCube();
            }
        });

        this.exposeProperty("position", "vector3", this._position, {
            onChange: (val) => this._position = val
        });

        this.exposeProperty("rotation", "vector3", this._rotation, {
            onChange: (val) => this._rotation = val
        });

        this.exposeProperty("scale", "vector3", this._scale, {
            onChange: (val) => this._scale = val
        });

        this.exposeProperty("wireframeColor", "color", "#FFFFFF", {
            onChange: (val) => this._wireframeColor = val
        });
        this.exposeProperty("faceColor", "color", "#3F51B5", {
            onChange: (val) => this._faceColor = val
        });
        this.exposeProperty("renderMode", "enum", "wireframe", {
            options: ["wireframe", "solid", "both"],
            onChange: (val) => this._renderMode = val
        });

        this.exposeProperty("showAxisLines", "boolean", false, {
            onChange: (val) => this._showAxisLines = val
        });

        this.exposeProperty("axisLength", "number", 150, {
            min: 50,
            max: 500,
            onChange: (val) => this._axisLength = val
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
            new Vector3(-s, s, -s),  // 1: back-bottom-right
            new Vector3(s, s, -s),   // 2: front-bottom-right
            new Vector3(s, -s, -s),  // 3: front-bottom-left
            new Vector3(-s, -s, s),  // 4: back-top-left
            new Vector3(-s, s, s),   // 5: back-top-right
            new Vector3(s, s, s),    // 6: front-top-right
            new Vector3(s, -s, s)    // 7: front-top-left
        ];

        this.edges = [
            [0, 1], [1, 2], [2, 3], [3, 0], // back face
            [4, 5], [5, 6], [6, 7], [7, 4], // front face
            [0, 4], [1, 5], [2, 6], [3, 7]  // connecting edges
        ];

        this.faces = [
            [0, 1, 2, 3], // bottom face (Z = -s)
            [4, 5, 6, 7], // top face (Z = s)
            [0, 4, 7, 3], // back face (Y = -s)
            [1, 5, 6, 2], // front face (Y = s)
            [3, 2, 6, 7], // right face (X = s)
            [0, 1, 5, 4]  // left face (X = -s)
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
        try {
            // Find an active camera
            const camera = this.findActiveCamera();
            //if (!camera) {
            // Draw a placeholder if no camera is available
            //this.drawPlaceholder(ctx);
            //return;
            // }

            // Use render texture method if camera supports it
            if (camera.getRenderTextureContext && camera.render3D) {
                this.drawToRenderTexture(camera.getRenderTextureContext(), camera);
            } else {
                // Fallback to direct drawing
                this.drawDirect(ctx, camera);
            }
        } catch (e) {

        }
    }

    /**
     * Draw directly to a canvas context (fallback method)
     * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on
     * @param {Camera3D} camera - The camera to use for projection
     */
    drawDirect(ctx, camera) {
        // Transform vertices based on mesh position/rotation/scale and game object transform
        const transformedVertices = this.transformVertices();

        // Project the 3D vertices to 2D screen space
        const projectedVertices = transformedVertices.map(vertex =>
            camera.projectPoint(vertex)
        );

        // Sort faces by depth for basic depth sorting (painter's algorithm)
        const sortedFaces = [...this.faces]
            .map((face, index) => {
                // Calculate average Y of the face vertices (camera space Y for depth in Z-up system)
                const avgY = face.reduce((sum, vertexIndex) => {
                    return sum + transformedVertices[vertexIndex].y;
                }, 0) / face.length;

                return { face, avgY };
            })
            .sort((a, b) => a.avgY - b.avgY) // Sort front-to-back (lower Y values first)
            .map(item => item.face);

        // Draw faces in sorted order
        if (this.renderMode === "solid" || this.renderMode === "both") {
            ctx.fillStyle = this.faceColor;

            for (const face of sortedFaces) {
                if (face.length < 3) continue; // Need at least 3 points to draw a face

                // Check if all vertices are visible
                const isVisible = face.every(vertexIndex =>
                    projectedVertices[vertexIndex] !== null &&
                    vertexIndex < projectedVertices.length
                );
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
                // Check if both vertices are valid and visible
                if (from >= projectedVertices.length ||
                    to >= projectedVertices.length ||
                    projectedVertices[from] === null ||
                    projectedVertices[to] === null) {
                    continue;
                }

                ctx.beginPath();
                ctx.moveTo(projectedVertices[from].x, projectedVertices[from].y);
                ctx.lineTo(projectedVertices[to].x, projectedVertices[to].y);
                ctx.stroke();
            }
        }

        // Draw axis lines if enabled
        if (this.showAxisLines && projectedVertices.length > 0) {
            // Use the center of the cube as origin (average of all vertices)
            let centerX = 0, centerY = 0;
            let validVertices = 0;

            for (const vertex of projectedVertices) {
                if (vertex !== null) {
                    centerX += vertex.x;
                    centerY += vertex.y;
                    validVertices++;
                }
            }

            if (validVertices > 0) {
                centerX /= validVertices;
                centerY /= validVertices;
                this.drawAxisLines(ctx, new Vector2(centerX, centerY));
            }
        }
    }

    /**
     * Draw the cube to a render texture
     * @param {CanvasRenderingContext2D} ctx - The render texture context
     * @param {Camera3D} camera - The camera to use for projection
     */
    drawToRenderTexture(ctx, camera) {
        // Transform vertices based on mesh position/rotation/scale and game object transform
        const transformedVertices = this.transformVertices();

        // Project the 3D vertices to 2D screen space
        const projectedVertices = transformedVertices.map(vertex =>
            camera.projectPoint(vertex)
        );

        // Filter out invalid projected vertices
        const validProjectedVertices = projectedVertices.map((vertex, index) => {
            if (vertex === null) {
                // Return a point outside the viewport for invalid vertices
                return new Vector2(-1000, -1000);
            }
            return vertex;
        });

        // Sort faces by depth for basic depth sorting (painter's algorithm)
        const sortedFaces = [...this.faces]
            .map((face, index) => {
                // Calculate average Y of the face vertices (camera space Y for depth in Z-up system)
                const avgY = face.reduce((sum, vertexIndex) => {
                    return sum + transformedVertices[vertexIndex].y;
                }, 0) / face.length;

                return { face, avgY };
            })
            .sort((a, b) => a.avgY - b.avgY) // Sort front-to-back (lower Y values first)
            .map(item => item.face);

        // Draw faces in sorted order
        if (this.renderMode === "solid" || this.renderMode === "both") {
            ctx.fillStyle = this.faceColor;

            for (const face of sortedFaces) {
                // Check if vertices are valid and get projected vertices
                const validVertices = [];
                for (const vertexIndex of face) {
                    if (vertexIndex < validProjectedVertices.length &&
                        validProjectedVertices[vertexIndex].x > -999) {
                        validVertices.push(validProjectedVertices[vertexIndex]);
                    }
                }

                if (validVertices.length < 3) continue;

                // Draw the face using valid vertices
                ctx.beginPath();
                ctx.moveTo(validVertices[0].x, validVertices[0].y);

                for (let i = 1; i < validVertices.length; i++) {
                    ctx.lineTo(validVertices[i].x, validVertices[i].y);
                }

                ctx.closePath();
                ctx.fill();
            }
        }

        // Draw edges
        if (this.renderMode === "wireframe" || this.renderMode === "both") {
            ctx.strokeStyle = this.wireframeColor;
            ctx.lineWidth = 1; // Decreased line width for better visibility

            for (const [from, to] of this.edges) {
                // Check if both vertices are valid and visible
                if (from >= validProjectedVertices.length ||
                    to >= validProjectedVertices.length ||
                    validProjectedVertices[from].x < -999 ||
                    validProjectedVertices[to].x < -999) {
                    continue;
                }

                const fromVertex = validProjectedVertices[from];
                const toVertex = validProjectedVertices[to];

                ctx.beginPath();
                ctx.moveTo(fromVertex.x, fromVertex.y);
                ctx.lineTo(toVertex.x, toVertex.y);
                ctx.stroke();
            }
        }

        // Draw axis lines if enabled
        if (this.showAxisLines) {
            this.drawAxisLines(ctx, validProjectedVertices[0]); // Use first vertex as origin
        }
    }

    /**
      * Draw colored axis lines for visualization
      * @param {CanvasRenderingContext2D} ctx - The render texture context
      * @param {Vector2} origin - The origin point to draw axes from
      */
    drawAxisLines(ctx, origin) {
        if (!origin) return;

        const axisLength = this.axisLength;
        const centerX = origin.x;
        const centerY = origin.y;

        // Define axis endpoints in 3D space (relative to origin) - Z-up coordinate system
        const axes = {
            x: new Vector3(axisLength, 0, 0),    // Red - X axis (forward/back)
            y: new Vector3(0, axisLength, 0),    // Blue - Y axis (left/right)
            z: new Vector3(0, 0, axisLength)     // Green - Z axis (up/down)
        };

        // Project axis endpoints to screen space
        const projectedAxes = {};
        for (const [axis, endpoint] of Object.entries(axes)) {
            const worldPoint = new Vector3(
                endpoint.x + this.position.x,
                endpoint.y + this.position.y,
                endpoint.z + this.position.z
            );
            projectedAxes[axis] = this.projectPointRelative(worldPoint, origin);
        }

        // Draw axis lines with colors
        const axisColors = {
            x: '#ff0000', // Red - X axis (forward/back)
            y: '#0000ff', // Blue - Y axis (left/right)
            z: '#00ff00'  // Green - Z axis (up/down)
        };

        const axisLabels = {
            x: 'X',
            y: 'Y',
            z: 'Z'
        };

        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const [axis, color] of Object.entries(axisColors)) {
            const endPoint = projectedAxes[axis];
            if (!endPoint) continue;

            // Draw axis line
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(endPoint.x, endPoint.y);
            ctx.stroke();

            // Draw axis label at the end
            ctx.fillStyle = color;
            ctx.fillText(axisLabels[axis], endPoint.x, endPoint.y);

            // Draw arrowhead (small triangle)
            this.drawArrowhead(ctx, centerX, centerY, endPoint.x, endPoint.y, color);
        }

        // Draw axis legend
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('X: Forward/Back (Red)', centerX + 10, centerY - 30);
        ctx.fillText('Y: Left/Right (Blue)', centerX + 10, centerY - 18);
        ctx.fillText('Z: Up/Down (Green)', centerX + 10, centerY - 6);
    }

    /**
      * Project a point relative to an origin for axis drawing
      * @param {Vector3} worldPoint - The world point to project
      * @param {Vector2} origin - The origin point
      * @returns {Vector2|null} The projected point
      */
    projectPointRelative(worldPoint, origin) {
        // Find active camera
        const camera = this.findActiveCamera();
        if (!camera) return null;

        // Project the point
        const projected = camera.projectPoint(worldPoint);
        return projected;
    }

    /**
      * Draw an arrowhead at the end of an axis line
      * @param {CanvasRenderingContext2D} ctx - The canvas context
      * @param {number} fromX - Start X coordinate
      * @param {number} fromY - Start Y coordinate
      * @param {number} toX - End X coordinate
      * @param {number} toY - End Y coordinate
      * @param {string} color - The color of the arrowhead
      */
    drawArrowhead(ctx, fromX, fromY, toX, toY, color) {
        const headLength = 8;
        const headAngle = Math.PI / 6; // 30 degrees

        // Calculate direction vector
        const dx = toX - fromX;
        const dy = toY - fromY;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length === 0) return;

        // Calculate unit vector
        const unitX = dx / length;
        const unitY = dy / length;

        // Calculate perpendicular vector for arrowhead
        const perpX = -unitY;
        const perpY = unitX;

        // Calculate arrowhead points
        const arrowX1 = toX - headLength * (unitX * Math.cos(headAngle) - perpX * Math.sin(headAngle));
        const arrowY1 = toY - headLength * (unitY * Math.cos(headAngle) - perpY * Math.sin(headAngle));
        const arrowX2 = toX - headLength * (unitX * Math.cos(headAngle) + perpX * Math.sin(headAngle));
        const arrowY2 = toY - headLength * (unitY * Math.cos(headAngle) + perpY * Math.sin(headAngle));

        // Draw arrowhead
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(arrowX1, arrowY1);
        ctx.moveTo(toX, toY);
        ctx.lineTo(arrowX2, arrowY2);
        ctx.stroke();
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
        const allObjects = this.getGameObjects();

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
    getGameObjects() {
        if (!this.gameObject) return [];


        return this.getAllGameObjects();

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
        // Get game object transforms if available
        let objPos = { x: 0, y: 0 };
        let objRot = 0;
        let objScale = { x: 1, y: 1 };

        if (this.gameObject) {
            objPos = this.gameObject.getWorldPosition ? this.gameObject.getWorldPosition() : { x: 0, y: 0 };
            objRot = this.gameObject.getWorldRotation ? this.gameObject.getWorldRotation() : 0;
            objScale = this.gameObject.getWorldScale ? this.gameObject.getWorldScale() : { x: 1, y: 1 };
        }

        // Determine game object world depth (Z). Prefer getWorldDepth(), then depth, then position.z, else 0.
        let objDepth = 0;
        if (this.gameObject) {
            if (typeof this.gameObject.getWorldDepth === 'function') {
                objDepth = this.gameObject.getWorldDepth();
            } else if (typeof this.gameObject.depth === 'number') {
                objDepth = this.gameObject.depth;
            } else if (this.gameObject.position && typeof this.gameObject.position.z === 'number') {
                objDepth = this.gameObject.position.z;
            }
        }

        // Convert to 3D (use game object depth for Z)
        const objPos3D = new Vector3(objPos.x, objPos.y, objDepth);
        const objScale3D = new Vector3(objScale.x, objScale.y, 1);

        return this.vertices.map(vertex => {
            // Start with the base vertex
            let v = vertex.clone ? vertex.clone() : new Vector3(vertex.x, vertex.y, vertex.z);

            // Step 1: Apply mesh scale
            v.x *= this.scale.x;
            v.y *= this.scale.y;
            v.z *= this.scale.z;

            // Step 2: Apply game object rotation first (convert degrees to radians)
            // In 2D-to-3D system, game object rotation is applied around Z-axis
            if (objRot !== 0) {
                const rotRad = objRot * (Math.PI / 180);
                v = this.rotateZ(v, rotRad);
            }

            // Step 3: Apply mesh rotation (convert degrees to radians)
            // X-axis: roll, Y-axis: yaw, Z-axis: pitch
            if (this.rotation.x !== 0) v = this.rotateX(v, this.rotation.x * (Math.PI / 180)); // Roll
            if (this.rotation.y !== 0) v = this.rotateY(v, this.rotation.y * (Math.PI / 180)); // Yaw
            if (this.rotation.z !== 0) v = this.rotateZ(v, this.rotation.z * (Math.PI / 180)); // Pitch

            // Step 4: Apply mesh position (translate)
            v.x += this.position.x;
            v.y += this.position.y;
            v.z += this.position.z;

            // Step 5: Apply game object scale
            v.x *= objScale3D.x;
            v.y *= objScale3D.y;
            v.z *= objScale3D.z;

            // Step 6: Apply game object position (translate) including depth
            v.x += objPos3D.x;
            v.y += objPos3D.y;
            v.z += objPos3D.z;

            return v;
        });
    }
    
    /**
     * Rotate a vector around the X axis
     * @param {Vector3} v - Vector to rotate
     * @param {number} angle - Angle in radians
     * @returns {Vector3} Rotated vector
     */
    rotateX(v, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector3(
            v.x,
            v.y * cos - v.z * sin,
            v.y * sin + v.z * cos
        );
    }

    /**
     * Rotate a vector around the Y axis
     * @param {Vector3} v - Vector to rotate
     * @param {number} angle - Angle in radians
     * @returns {Vector3} Rotated vector
     */
    rotateY(v, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector3(
            v.x * cos + v.z * sin,
            v.y,
            -v.x * sin + v.z * cos
        );
    }

    /**
     * Rotate a vector around the Z axis
     * @param {Vector3} v - Vector to rotate
     * @param {number} angle - Angle in radians
     * @returns {Vector3} Rotated vector
     */
    rotateZ(v, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector3(
            v.x * cos - v.y * sin,
            v.x * sin + v.y * cos,
            v.z
        );
    }

    /**
     * Draw in the editor
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     */
    drawInEditor(ctx) {
        // Use the same draw method for both runtime and editor
        this.draw(ctx);
    }

    /**
      * Serialize the cube mesh to JSON
      * @returns {Object} JSON representation of the cube mesh
      */
    toJSON() {
        return {
            _type: "CubeMesh3D",
            _size: this._size,
            _position: { x: this._position.x, y: this._position.y, z: this._position.z },
            _rotation: { x: this._rotation.x, y: this._rotation.y, z: this._rotation.z },
            _scale: { x: this._scale.x, y: this._scale.y, z: this._scale.z },
            _wireframeColor: this._wireframeColor,
            _faceColor: this._faceColor,
            _renderMode: this._renderMode,
            _showAxisLines: this._showAxisLines,
            _axisLength: this._axisLength
        };
    }

    /**
      * Deserialize the cube mesh from JSON
      * @param {Object} json - JSON representation of the cube mesh
      */
    fromJSON(json) {
        if (json._size !== undefined) {
            this._size = json._size;
            this.updateCube();
        }
        if (json._position) this._position = new Vector3(json._position.x, json._position.y, json._position.z);
        if (json._rotation) this._rotation = new Vector3(json._rotation.x, json._rotation.y, json._rotation.z);
        if (json._scale) this._scale = new Vector3(json._scale.x, json._scale.y, json._scale.z);
        if (json._wireframeColor !== undefined) this._wireframeColor = json._wireframeColor;
        if (json._faceColor !== undefined) this._faceColor = json._faceColor;
        if (json._renderMode !== undefined) this._renderMode = json._renderMode;
        if (json._showAxisLines !== undefined) this._showAxisLines = json._showAxisLines;
        if (json._axisLength !== undefined) this._axisLength = json._axisLength;
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

    get showAxisLines() { return this._showAxisLines; }
    set showAxisLines(value) { this._showAxisLines = value; }

    get axisLength() { return this._axisLength; }
    set axisLength(value) { this._axisLength = Math.max(50, Math.min(500, value)); }
}

// Register the CubeMesh3D module
window.CubeMesh3D = CubeMesh3D;
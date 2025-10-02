/**
 * Mesh3D - A 3D mesh renderer for the Dark Matter JS engine
 * 
 * This module renders 3D meshes using the 2D canvas API.
 */
class Mesh3D extends Module {
    static namespace = "3D";

    /**
     * Create a new Mesh3D
     */
    constructor() {
        super("Mesh3D");

        // Mesh data
        this.vertices = []; // Array of Vector3 objects
        this.edges = [];    // Array of pairs of vertex indices
        this.faces = [];    // Array of arrays of vertex indices

        // Mesh properties
        this.position = new Vector3(0, 0, 0);
        this.rotation = new Vector3(0, 0, 0);
        this.scale = new Vector3(1, 1, 1);

        // Appearance
        this.wireframeColor = "#FFFFFF";
        this.faceColor = "#3F51B5";
        this.renderMode = "solid"; // "wireframe", "solid", or "both"

        // Material system
        this.material = null; // Material instance for advanced texturing

        // Axis visualization
        this._showAxisLines = false;
        this._axisLength = 150;

        // Expose properties to the inspector
        this.exposeProperty("position", "vector3", this.position, {
            onChange: (val) => this.position = val
        });
        this.exposeProperty("rotation", "vector3", this.rotation, {
            onChange: (val) => this.rotation = val
        });
        this.exposeProperty("scale", "vector3", this.scale, {
            onChange: (val) => this.scale = val
        });
        this.exposeProperty("wireframeColor", "color", "#FFFFFF", {
            onChange: (val) => this.wireframeColor = val
        });
        this.exposeProperty("faceColor", "color", "#3F51B5", {
            onChange: (val) => this.faceColor = val
        });
        this.exposeProperty("renderMode", "enum", "wireframe", {
            options: ["wireframe", "solid", "both"],
            onChange: (val) => this.renderMode = val
        });

        this.exposeProperty("material", "module", null, {
            moduleType: "Material",
            onChange: (val) => this.material = val
        });

        this.exposeProperty("showAxisLines", "boolean", false, {
            onChange: (val) => this._showAxisLines = val
        });

        this.exposeProperty("axisLength", "number", 150, {
            min: 50,
            max: 500,
            onChange: (val) => this._axisLength = val
        });

        // Initialize with a default cube
        this.createCube(100);

        // Generate UV coordinates for texture mapping
        this.generateUVCoordinates();

        // Ensure material module exists on the game object
        this.ensureMaterialModule();
    }

    /**
     * Ensure the game object has a Material module
     */
    ensureMaterialModule() {
        if (!this.gameObject) return;

        // Check if material module already exists
        let materialModule = this.gameObject.getModule ? this.gameObject.getModule('Material') : null;
        if (!materialModule) {
            // Create and add a new material module
            materialModule = new Material();
            if (this.gameObject.addModule) {
                this.gameObject.addModule(materialModule);
            }
        }

        // Set the material reference
        this.material = materialModule;
    }

    /**
     * Generate UV coordinates for texture mapping
     */
    generateUVCoordinates() {
        this.uvCoordinates = [];

        for (let i = 0; i < this.vertices.length; i++) {
            const vertex = this.vertices[i];

            // Simple planar projection for UV mapping
            // This is a basic implementation - can be improved for different mesh types
            let u, v;

            if (Math.abs(vertex.x) > Math.abs(vertex.y) && Math.abs(vertex.x) > Math.abs(vertex.z)) {
                // X-dominant face
                u = (vertex.y + 1) / 2;
                v = (vertex.z + 1) / 2;
            } else if (Math.abs(vertex.y) > Math.abs(vertex.x) && Math.abs(vertex.y) > Math.abs(vertex.z)) {
                // Y-dominant face
                u = (vertex.x + 1) / 2;
                v = (vertex.z + 1) / 2;
            } else {
                // Z-dominant face
                u = (vertex.x + 1) / 2;
                v = (vertex.y + 1) / 2;
            }

            this.uvCoordinates.push(new Vector2(u, v));
        }
    }

    /**
     * Get material color for a face, considering texture if available
     * @param {Array<number>} face - Array of vertex indices
     * @param {Array<Vector3>} worldVertices - World-space vertex positions
     * @param {Camera3D} camera - Camera for view direction calculation
     * @param {Array<Vector3>} normals - Face normals (optional)
     * @returns {string} - CSS color string
     */
    getMaterialColor(face, worldVertices, camera, normals = null) {
        if (!this.material) {
            return this.faceColor;
        }

        // For simple flat shading, use face center
        const faceCenter = this.getFaceCenter(face, worldVertices);
        const normal = normals ? normals[0] : this.calculateFaceNormal(face, worldVertices);

        if (camera && camera.position) {
            const viewDir = camera.position.clone().sub(faceCenter).normalize();

            // Calculate UV coordinates for face center (simple average)
            const uvs = face.map(vertexIndex => this.uvCoordinates[vertexIndex] || new Vector2(0, 0));
            const avgU = uvs.reduce((sum, uv) => sum + uv.x, 0) / uvs.length;
            const avgV = uvs.reduce((sum, uv) => sum + uv.y, 0) / uvs.length;

            // Get lit color from material
            const litColor = this.material.getSimpleLitColor(faceCenter, normal, viewDir, new Vector2(avgU, avgV));

            return `rgba(${Math.round(litColor.r)}, ${Math.round(litColor.g)}, ${Math.round(litColor.b)}, ${litColor.a})`;
        }

        // Fallback to diffuse color if no camera
        return this.material.diffuseColor;
    }

    /**
     * Calculate face center from vertex indices
     * @param {Array<number>} face - Array of vertex indices
     * @param {Array<Vector3>} vertices - Array of vertex positions
     * @returns {Vector3} - Face center position
     */
    getFaceCenter(face, vertices) {
        const center = new Vector3(0, 0, 0);
        for (const vertexIndex of face) {
            if (vertexIndex < vertices.length) {
                center.add(vertices[vertexIndex]);
            }
        }
        center.divideScalar(face.length);
        return center;
    }

    /**
     * Calculate face normal from vertex positions
     * @param {Array<number>} face - Array of vertex indices
     * @param {Array<Vector3>} vertices - Array of vertex positions
     * @returns {Vector3} - Face normal vector
     */
    calculateFaceNormal(face, vertices) {
        if (face.length < 3) {
            return new Vector3(0, 0, 1);
        }

        // Use first three vertices to calculate normal
        const v1 = vertices[face[0]];
        const v2 = vertices[face[1]];
        const v3 = vertices[face[2]];

        if (!v1 || !v2 || !v3) {
            return new Vector3(0, 0, 1);
        }

        // Calculate two edges
        const edge1 = v2.clone().sub(v1);
        const edge2 = v3.clone().sub(v1);

        // Calculate cross product for normal
        const normal = edge1.clone().cross(edge2).normalize();

        return normal;
    }

    /**
     * Create a cube mesh
     * @param {number} size - Size of the cube
     */
    createCube(size = 100) {
        const s = size / 2;

        this.vertices = [
            new Vector3(-s, -s, -s), // 0: back-bottom-left
            new Vector3(-s, s, -s),  // 1: back-bottom-right
            new Vector3(s, s, -s),   // 2: back-top-right
            new Vector3(s, -s, -s),  // 3: back-top-left
            new Vector3(-s, -s, s),  // 4: front-bottom-left
            new Vector3(-s, s, s),   // 5: front-bottom-right
            new Vector3(s, s, s),    // 6: front-top-right
            new Vector3(s, -s, s)    // 7: front-top-left
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

        // Regenerate UV coordinates after changing mesh data
        this.generateUVCoordinates();
    }

    /**
     * Create a pyramid mesh
     * @param {number} baseSize - Size of the base
     * @param {number} height - Height of the pyramid
     */
    createPyramid(baseSize = 100, height = 150) {
        const s = baseSize / 2;
        const h = height / 2;

        this.vertices = [
            new Vector3(-s, -h, -s), // 0: base back-left
            new Vector3(s, -h, -s),  // 1: base back-right
            new Vector3(s, -h, s),   // 2: base front-right
            new Vector3(-s, -h, s),  // 3: base front-left
            new Vector3(0, h, 0)     // 4: apex
        ];

        this.edges = [
            [0, 1], [1, 2], [2, 3], [3, 0], // base
            [0, 4], [1, 4], [2, 4], [3, 4]  // edges to apex
        ];

        this.faces = [
            [0, 1, 2, 3], // base
            [0, 1, 4],    // back face
            [1, 2, 4],    // right face
            [2, 3, 4],    // front face
            [3, 0, 4]     // left face
        ];

        // Regenerate UV coordinates after changing mesh data
        this.generateUVCoordinates();
    }

    /**
     * Create a sphere mesh (approximation using triangles)
     * @param {number} radius - Radius of the sphere
     * @param {number} detail - Level of detail (segments)
     */
    createSphere(radius = 100, detail = 12) {
        // Reset mesh data
        this.vertices = [];
        this.edges = [];
        this.faces = [];

        // Create vertices using spherical coordinates
        for (let lat = 0; lat <= detail; lat++) {
            const theta = lat * Math.PI / detail;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let lon = 0; lon <= detail; lon++) {
                const phi = lon * 2 * Math.PI / detail;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);

                const x = radius * sinTheta * cosPhi;
                const y = radius * cosTheta;
                const z = radius * sinTheta * sinPhi;

                this.vertices.push(new Vector3(x, y, z));
            }
        }

        // Create faces and edges
        for (let lat = 0; lat < detail; lat++) {
            for (let lon = 0; lon < detail; lon++) {
                const first = lat * (detail + 1) + lon;
                const second = first + detail + 1;

                // Create two triangular faces
                this.faces.push([first, first + 1, second + 1]);
                this.faces.push([first, second + 1, second]);

                // Add edges
                this.edges.push([first, first + 1]);
                this.edges.push([first, second]);

                if (lat === detail - 1) {
                    this.edges.push([second, second + 1]);
                }

                if (lon === detail - 1) {
                    this.edges.push([first + 1, second + 1]);
                }
            }
        }

        // Regenerate UV coordinates after changing mesh data
        this.generateUVCoordinates();
    }

    /**
     * Create a custom mesh from vertices, edges, and faces
     * @param {Array<Vector3>} vertices - Array of 3D points
     * @param {Array<Array<number>>} edges - Array of vertex index pairs
     * @param {Array<Array<number>>} faces - Array of vertex index arrays
     */
    setMeshData(vertices, edges, faces) {
        this.vertices = vertices;
        this.edges = edges || [];
        this.faces = faces || [];

        // Regenerate UV coordinates after changing mesh data
        this.generateUVCoordinates();
    }

    /**
     * Draw the mesh to the canvas
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

        // Use render texture method if camera supports it
        if (camera.getRenderTextureContext && camera.render3D) {
            this.drawToRenderTexture(camera.getRenderTextureContext(), camera);
        } else {
            // Fallback to direct drawing
            this.drawDirect(ctx, camera);
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
                // Calculate centroid depth for more stable sorting
                const centroidX = face.reduce((sum, vertexIndex) => sum + transformedVertices[vertexIndex].x, 0) / face.length;
                const centroidY = face.reduce((sum, vertexIndex) => sum + transformedVertices[vertexIndex].y, 0) / face.length;
                const centroidZ = face.reduce((sum, vertexIndex) => sum + transformedVertices[vertexIndex].z, 0) / face.length;

                // Use centroid X as primary depth (camera looks along +X)
                // Add small offset based on face center to handle coplanar faces
                const sortDepth = centroidX + (centroidY + centroidZ) * 0.001;

                return { face, sortDepth };
            })
            .sort((a, b) => b.sortDepth - a.sortDepth) // Sort back-to-front (lower depth values first = closer to camera)
            .map(item => item.face);

        // Draw faces in sorted order
        if (this.renderMode === "solid" || this.renderMode === "both") {
            for (const face of sortedFaces) {
                if (face.length < 3) continue; // Need at least 3 points to draw a face

                // Check if all vertices are visible
                const isVisible = face.every(vertexIndex =>
                    projectedVertices[vertexIndex] !== null &&
                    vertexIndex < projectedVertices.length
                );
                if (!isVisible) continue;

                // Get lit material color for this face
                const faceColor = this.getMaterialColor(face, transformedVertices, camera);

                // Draw the face
                ctx.fillStyle = faceColor;
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
        if (this.showAxisLines) {
            this.drawAxisLines(ctx, projectedVertices);
        }
    }

    /**
     * Draw the mesh to a render texture
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

        // Sort faces by depth for basic depth sorting (painter's algorithm)
        const sortedFaces = [...this.faces]
            .map((face, index) => {
                // Calculate centroid depth for more stable sorting
                const centroidX = face.reduce((sum, vertexIndex) => sum + transformedVertices[vertexIndex].x, 0) / face.length;
                const centroidY = face.reduce((sum, vertexIndex) => sum + transformedVertices[vertexIndex].y, 0) / face.length;
                const centroidZ = face.reduce((sum, vertexIndex) => sum + transformedVertices[vertexIndex].z, 0) / face.length;

                // Use centroid X as primary depth (camera looks along +X)
                // Add small offset based on face center to handle coplanar faces
                const sortDepth = centroidX + (centroidY + centroidZ) * 0.001;

                return { face, sortDepth };
            })
            .sort((a, b) => b.sortDepth - a.sortDepth) // Sort back-to-front (lower depth values first = closer to camera)
            .map(item => item.face);

        // Draw faces in sorted order
        if (this.renderMode === "solid" || this.renderMode === "both") {
            for (const face of sortedFaces) {
                if (face.length < 3) continue; // Need at least 3 points to draw a face

                // Check if vertices are valid and get projected vertices
                const validVertices = [];
                for (const vertexIndex of face) {
                    if (vertexIndex < projectedVertices.length &&
                        projectedVertices[vertexIndex] !== null) {
                        validVertices.push(projectedVertices[vertexIndex]);
                    }
                }

                if (validVertices.length < 3) continue;

                // Get lit material color for this face
                const faceColor = this.getMaterialColor(face, transformedVertices, camera);

                // Draw the face using valid vertices
                ctx.fillStyle = faceColor;
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
            ctx.lineWidth = 2;

            for (const [from, to] of this.edges) {
                // Check if both vertices are valid and visible
                if (from >= projectedVertices.length ||
                    to >= projectedVertices.length ||
                    projectedVertices[from] === null ||
                    projectedVertices[to] === null) {
                    continue;
                }

                const fromVertex = projectedVertices[from];
                const toVertex = projectedVertices[to];

                ctx.beginPath();
                ctx.moveTo(fromVertex.x, fromVertex.y);
                ctx.lineTo(toVertex.x, toVertex.y);
                ctx.stroke();
            }
        }

        // Draw axis lines if enabled
        if (this.showAxisLines) {
            this.drawAxisLines(ctx, projectedVertices);
        }
    }

    /**
      * Draw colored axis lines for visualization
      * @param {CanvasRenderingContext2D} ctx - The render texture context
      * @param {Array<Vector2>} vertices - The projected vertices array
      */
    drawAxisLines(ctx, vertices) {
        if (vertices.length === 0) return;

        // Calculate center point from valid vertices
        let centerX = 0, centerY = 0;
        let validVertices = 0;

        for (const vertex of vertices) {
            if (vertex !== null) {
                centerX += vertex.x;
                centerY += vertex.y;
                validVertices++;
            }
        }

        if (validVertices === 0) return;

        centerX /= validVertices;
        centerY /= validVertices;

        const axisLength = this.axisLength;
        const centerPoint = new Vector2(centerX, centerY);

        // Define axis endpoints in 3D space (relative to mesh position) - Z-up coordinate system
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
            projectedAxes[axis] = this.projectPointRelative(worldPoint, centerPoint);
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

        // Draw "Mesh3D" text
        ctx.fillStyle = this.wireframeColor;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Mesh3D', 0, 0);
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
       * Serialize the mesh to JSON
       * @returns {Object} JSON representation of the mesh
       */
     toJSON() {
         return {
             _type: "Mesh3D",
             vertices: this.vertices.map(v => ({ x: v.x, y: v.y, z: v.z })),
             edges: this.edges.map(edge => [...edge]),
             faces: this.faces.map(face => [...face]),
             uvCoordinates: this.uvCoordinates.map(uv => ({ x: uv.x, y: uv.y })),
             position: { x: this.position.x, y: this.position.y, z: this.position.z },
             rotation: { x: this.rotation.x, y: this.rotation.y, z: this.rotation.z },
             scale: { x: this.scale.x, y: this.scale.y, z: this.scale.z },
             wireframeColor: this.wireframeColor,
             faceColor: this.faceColor,
             renderMode: this.renderMode,
             _showAxisLines: this._showAxisLines,
             _axisLength: this._axisLength,
             material: this.material ? this.material.toJSON() : null
         };
     }

    /**
       * Deserialize the mesh from JSON
       * @param {Object} json - JSON representation of the mesh
       */
     fromJSON(json) {
         if (json.vertices) {
             this.vertices = json.vertices.map(v => new Vector3(v.x, v.y, v.z));
         }
         if (json.edges) this.edges = json.edges;
         if (json.faces) this.faces = json.faces;
         if (json.uvCoordinates) {
             this.uvCoordinates = json.uvCoordinates.map(uv => new Vector2(uv.x, uv.y));
         } else {
             // Regenerate UV coordinates if not present
             this.generateUVCoordinates();
         }
         if (json.position) this.position = new Vector3(json.position.x, json.position.y, json.position.z);
         if (json.rotation) this.rotation = new Vector3(json.rotation.x, json.rotation.y, json.rotation.z);
         if (json.scale) this.scale = new Vector3(json.scale.x, json.scale.y, json.scale.z);
         if (json.wireframeColor !== undefined) this.wireframeColor = json.wireframeColor;
         if (json.faceColor !== undefined) this.faceColor = json.faceColor;
         if (json.renderMode !== undefined) this.renderMode = json.renderMode;
         if (json._showAxisLines !== undefined) this._showAxisLines = json._showAxisLines;
         if (json._axisLength !== undefined) this._axisLength = json._axisLength;

         // Deserialize material if present
         if (json.material) {
             if (!this.material) {
                 this.ensureMaterialModule();
             }
             if (this.material && this.material.fromJSON) {
                 this.material.fromJSON(json.material);
             }
         }
     }

    // Getters and setters for properties
    get showAxisLines() { return this._showAxisLines; }
    set showAxisLines(value) { this._showAxisLines = value; }

    get axisLength() { return this._axisLength; }
    set axisLength(value) { this._axisLength = Math.max(50, Math.min(500, value)); }
}

// Register the Mesh3D module
window.Mesh3D = Mesh3D;
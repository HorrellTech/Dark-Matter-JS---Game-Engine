/**
 * CubeMesh3D - A specialized 3D mesh module for cubes with customizable properties
 * 
 * This module creates and renders a 3D cube mesh with configurable dimensions,
 * colors, and rendering options.
 */
class CubeMesh3D extends Module {
    static namespace = "3D";

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

        this._subdivisions = 1; // Number of subdivisions per face

        // Mesh data
        this.vertices = [];
        this.edges = [];
        this.faces = [];

        // Material system
        this.material = null; // Material instance for advanced texturing

        // UV coordinates for texture mapping
        this.uvCoordinates = [];

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

        this.exposeProperty("subdivisions", "number", 1, {
            min: 1,
            max: 10,
            step: 1,
            onChange: (val) => {
                this._subdivisions = Math.floor(val);
                this.updateCube();
            }
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

        this.exposeProperty("material", "module", null, {
            moduleType: "Material",
            onChange: (val) => this.material = val
        });

        // Initialize cube geometry
        this.updateCube();

        // Ensure material module exists on the game object
        this.ensureMaterialModule();
    }

    start() {
        // Ensure material module exists on start
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
     */
    getMaterialColor(faceIndex) {
        if (!this.material) {
            return this._faceColor;
        }

        // For now, use the diffuse color
        // In a full implementation, this would sample the texture based on face UVs
        return this.material.diffuseColor;
    }

    /**
       * Update the cube geometry based on current size
       */
     updateCube() {
         const s = this.size / 2;
         const divs = this._subdivisions;

         this.vertices = [];
         this.edges = [];
         this.faces = [];

         // Generate all vertices first (shared vertices for proper mesh connectivity)
         const vertexMap = new Map();

         // Helper function to get or create vertex index
         const getVertexIndex = (x, y, z) => {
             const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;
             if (vertexMap.has(key)) {
                 return vertexMap.get(key);
             }
             const index = this.vertices.length;
             this.vertices.push(new Vector3(x, y, z));
             vertexMap.set(key, index);
             return index;
         };

         // Generate vertices for all 6 faces
         // Bottom face (Z = -s)
         for (let i = 0; i <= divs; i++) {
             for (let j = 0; j <= divs; j++) {
                 const x = -s + (2 * s * j) / divs;
                 const y = -s + (2 * s * i) / divs;
                 getVertexIndex(x, y, -s);
             }
         }

         // Top face (Z = s)
         for (let i = 0; i <= divs; i++) {
             for (let j = 0; j <= divs; j++) {
                 const x = -s + (2 * s * j) / divs;
                 const y = s - (2 * s * i) / divs; // Flip Y for correct winding
                 getVertexIndex(x, y, s);
             }
         }

         // Front face (Y = s)
         for (let i = 0; i <= divs; i++) {
             for (let j = 0; j <= divs; j++) {
                 const x = -s + (2 * s * j) / divs;
                 const z = -s + (2 * s * i) / divs;
                 getVertexIndex(x, s, z);
             }
         }

         // Back face (Y = -s)
         for (let i = 0; i <= divs; i++) {
             for (let j = 0; j <= divs; j++) {
                 const x = -s + (2 * s * j) / divs;
                 const z = s - (2 * s * i) / divs; // Flip Z for correct winding
                 getVertexIndex(x, -s, z);
             }
         }

         // Right face (X = s)
         for (let i = 0; i <= divs; i++) {
             for (let j = 0; j <= divs; j++) {
                 const y = -s + (2 * s * j) / divs;
                 const z = s - (2 * s * i) / divs; // Flip Z for correct winding
                 getVertexIndex(s, y, z);
             }
         }

         // Left face (X = -s)
         for (let i = 0; i <= divs; i++) {
             for (let j = 0; j <= divs; j++) {
                 const y = -s + (2 * s * j) / divs;
                 const z = -s + (2 * s * i) / divs;
                 getVertexIndex(-s, y, z);
             }
         }

         // Create faces using shared vertices
         // Bottom face (Z = -s)
         this.createSubdividedFace(-s, 'z', divs, (i, j) => {
             const x = -s + (2 * s * j) / divs;
             const y = -s + (2 * s * i) / divs;
             return getVertexIndex(x, y, -s);
         });

         // Top face (Z = s)
         this.createSubdividedFace(s, 'z', divs, (i, j) => {
             const x = -s + (2 * s * j) / divs;
             const y = s - (2 * s * i) / divs; // Flip Y for correct winding
             return getVertexIndex(x, y, s);
         });

         // Front face (Y = s)
         this.createSubdividedFace(s, 'y', divs, (i, j) => {
             const x = -s + (2 * s * j) / divs;
             const z = -s + (2 * s * i) / divs;
             return getVertexIndex(x, s, z);
         });

         // Back face (Y = -s)
         this.createSubdividedFace(-s, 'y', divs, (i, j) => {
             const x = -s + (2 * s * j) / divs;
             const z = s - (2 * s * i) / divs; // Flip Z for correct winding
             return getVertexIndex(x, -s, z);
         });

         // Right face (X = s)
         this.createSubdividedFace(s, 'x', divs, (i, j) => {
             const y = -s + (2 * s * j) / divs;
             const z = s - (2 * s * i) / divs; // Flip Z for correct winding
             return getVertexIndex(s, y, z);
         });

         // Left face (X = -s)
         this.createSubdividedFace(-s, 'x', divs, (i, j) => {
             const y = -s + (2 * s * j) / divs;
             const z = -s + (2 * s * i) / divs;
             return getVertexIndex(-s, y, z);
         });

         // Generate edges from faces (unique edges only)
         const edgeSet = new Set();
         for (const face of this.faces) {
             for (let i = 0; i < face.length; i++) {
                 const v1 = face[i];
                 const v2 = face[(i + 1) % face.length];
                 const edgeKey = v1 < v2 ? `${v1},${v2}` : `${v2},${v1}`;
                 edgeSet.add(edgeKey);
             }
         }

         this.edges = Array.from(edgeSet).map(key => key.split(',').map(Number));
     }

     /**
      * Create a subdivided face using shared vertices
      * @param {number} fixedCoord - The fixed coordinate value (e.g., Z = -s for bottom face)
      * @param {string} axis - The axis being fixed ('x', 'y', or 'z')
      * @param {number} divs - Number of subdivisions
      * @param {function} getVertexIndex - Function to get vertex index for i,j coordinates
      */
     createSubdividedFace(fixedCoord, axis, divs, getVertexIndex) {
         // Create triangular faces from grid (2 triangles per quad) - Counter-clockwise winding for outward-facing normals
         for (let i = 0; i < divs; i++) {
             for (let j = 0; j < divs; j++) {
                 const v1 = getVertexIndex(i, j);
                 const v2 = getVertexIndex(i + 1, j);
                 const v3 = getVertexIndex(i + 1, j + 1);
                 const v4 = getVertexIndex(i, j + 1);

                 // First triangle - Counter-clockwise winding (v1 -> v2 -> v3)
                 this.faces.push([v1, v2, v3]);
                 // Second triangle - Counter-clockwise winding (v1 -> v3 -> v4)
                 this.faces.push([v1, v3, v4]);
             }
         }
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
            this.drawPlaceholder(ctx);
            //return;
            // }

            // Use render texture method if camera supports it
            //if (camera.getRenderTextureContext && camera.render3D) {
                //this.drawToRenderTexture(camera.getRenderTextureContext(), camera);
            //} else {
                // Fallback to direct drawing
                //this.drawDirect(ctx, camera);
            //}
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
                // Calculate maximum depth for accurate sorting of subdivided faces
                let maxDepth = -Infinity;
                let centroidY = 0, centroidZ = 0;

                for (const vertexIndex of face) {
                    if (vertexIndex < transformedVertices.length) {
                        const vertex = transformedVertices[vertexIndex];
                        maxDepth = Math.max(maxDepth, vertex.x); // Use X as depth (camera looks along +X)
                        centroidY += vertex.y;
                        centroidZ += vertex.z;
                    }
                }

                centroidY /= face.length;
                centroidZ /= face.length;

                // Use maximum depth as primary sorting criteria for subdivided faces
                // Add small offset based on face center to handle coplanar faces
                const sortDepth = maxDepth + (centroidY + centroidZ) * 0.001;

                return { face, sortDepth };
            })
            .sort((a, b) => b.sortDepth - a.sortDepth) // Sort back-to-front (lower depth values first = closer to camera)
            .map(item => item.face);

        // Draw faces in sorted order
        if (this.renderMode === "solid" || this.renderMode === "both") {
            for (const face of sortedFaces) {
                // Use material color if available, otherwise fall back to faceColor
                const faceColor = this.material ? this.getMaterialColor(face) : this._faceColor;
                ctx.fillStyle = faceColor;
                if (face.length < 3) continue; // Need at least 3 points to draw a face

                // Check if all vertices are visible
                const isVisible = face.every(vertexIndex =>
                    projectedVertices[vertexIndex] !== null &&
                    vertexIndex < projectedVertices.length
                );
                if (!isVisible) continue;

                const faceVertices = face.map(idx => projectedVertices[idx]).filter(v => v !== null);
                if (faceVertices.length < 3) continue;

                // Triangulate faces with more than 3 vertices for proper rendering
                if (faceVertices.length === 3) {
                    // Triangle face - draw directly
                    ctx.beginPath();
                    ctx.moveTo(faceVertices[0].x, faceVertices[0].y);
                    ctx.lineTo(faceVertices[1].x, faceVertices[1].y);
                    ctx.lineTo(faceVertices[2].x, faceVertices[2].y);
                    ctx.closePath();
                    ctx.fill();
                } else if (faceVertices.length === 4) {
                    // Quad face - triangulate into two triangles
                    ctx.beginPath();
                    ctx.moveTo(faceVertices[0].x, faceVertices[0].y);
                    ctx.lineTo(faceVertices[1].x, faceVertices[1].y);
                    ctx.lineTo(faceVertices[2].x, faceVertices[2].y);
                    ctx.closePath();
                    ctx.fill();

                    ctx.beginPath();
                    ctx.moveTo(faceVertices[0].x, faceVertices[0].y);
                    ctx.lineTo(faceVertices[2].x, faceVertices[2].y);
                    ctx.lineTo(faceVertices[3].x, faceVertices[3].y);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    // Polygon with more vertices - triangulate using fan method
                    for (let i = 1; i < faceVertices.length - 1; i++) {
                        ctx.beginPath();
                        ctx.moveTo(faceVertices[0].x, faceVertices[0].y);
                        ctx.lineTo(faceVertices[i].x, faceVertices[i].y);
                        ctx.lineTo(faceVertices[i + 1].x, faceVertices[i + 1].y);
                        ctx.closePath();
                        ctx.fill();
                    }
                }
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
                // Calculate maximum depth for accurate sorting of subdivided faces
                let maxDepth = -Infinity;
                let centroidY = 0, centroidZ = 0;

                for (const vertexIndex of face) {
                    if (vertexIndex < transformedVertices.length) {
                        const vertex = transformedVertices[vertexIndex];
                        maxDepth = Math.max(maxDepth, vertex.x); // Use X as depth (camera looks along +X)
                        centroidY += vertex.y;
                        centroidZ += vertex.z;
                    }
                }

                centroidY /= face.length;
                centroidZ /= face.length;

                // Use maximum depth as primary sorting criteria for subdivided faces
                // Add small offset based on face center to handle coplanar faces
                const sortDepth = maxDepth + (centroidY + centroidZ) * 0.001;

                return { face, sortDepth };
            })
            .sort((a, b) => b.sortDepth - a.sortDepth) // Sort back-to-front (lower depth values first = closer to camera)
            .map(item => item.face);

        // Draw faces in sorted order
        if (this.renderMode === "solid" || this.renderMode === "both") {
            for (const face of sortedFaces) {
                // Use material color if available, otherwise fall back to faceColor
                const faceColor = this.material ? this.getMaterialColor(face) : this._faceColor;
                ctx.fillStyle = faceColor;
                // Check if vertices are valid and get projected vertices
                const validVertices = [];
                for (const vertexIndex of face) {
                    if (vertexIndex < validProjectedVertices.length &&
                        validProjectedVertices[vertexIndex].x > -999) {
                        validVertices.push(validProjectedVertices[vertexIndex]);
                    }
                }

                if (validVertices.length < 3) continue;

                // Triangulate faces with more than 3 vertices for proper rendering
                if (validVertices.length === 3) {
                    // Triangle face - draw directly
                    ctx.beginPath();
                    ctx.moveTo(validVertices[0].x, validVertices[0].y);
                    ctx.lineTo(validVertices[1].x, validVertices[1].y);
                    ctx.lineTo(validVertices[2].x, validVertices[2].y);
                    ctx.closePath();
                    ctx.fill();
                } else if (validVertices.length === 4) {
                    // Quad face - triangulate into two triangles
                    ctx.beginPath();
                    ctx.moveTo(validVertices[0].x, validVertices[0].y);
                    ctx.lineTo(validVertices[1].x, validVertices[1].y);
                    ctx.lineTo(validVertices[2].x, validVertices[2].y);
                    ctx.closePath();
                    ctx.fill();

                    ctx.beginPath();
                    ctx.moveTo(validVertices[0].x, validVertices[0].y);
                    ctx.lineTo(validVertices[2].x, validVertices[2].y);
                    ctx.lineTo(validVertices[3].x, validVertices[3].y);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    // Polygon with more vertices - triangulate using fan method
                    for (let i = 1; i < validVertices.length - 1; i++) {
                        ctx.beginPath();
                        ctx.moveTo(validVertices[0].x, validVertices[0].y);
                        ctx.lineTo(validVertices[i].x, validVertices[i].y);
                        ctx.lineTo(validVertices[i + 1].x, validVertices[i + 1].y);
                        ctx.closePath();
                        ctx.fill();
                    }
                }
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
        if (this.showAxisLines && validProjectedVertices.length > 0) {
            // Use the center of the cube as origin for axis lines
            let centerX = 0, centerY = 0;
            let validVertices = 0;

            for (const vertex of validProjectedVertices) {
                if (vertex && vertex.x > -999) {
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
      * Draw colored axis lines for visualization
      * @param {CanvasRenderingContext2D} ctx - The render texture context
      * @param {Vector2} origin - The origin point to draw axes from
      */
    drawAxisLines(ctx, origin) {
        if (!origin) return;

        const axisLength = this.axisLength;
        const centerX = origin.x;
        const centerY = origin.y;

        // Define axis endpoints in 3D space (relative to origin) - Standard right-handed system
        const axes = {
            x: new Vector3(axisLength, 0, 0),    // Red - X axis (right/left)
            y: new Vector3(0, axisLength, 0),    // Green - Y axis (up/down)
            z: new Vector3(0, 0, axisLength)     // Blue - Z axis (forward/back)
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

        // Draw axis lines with colors (standard right-handed system)
        const axisColors = {
            x: '#ff0000', // Red - X axis (right/left)
            y: '#00ff00', // Green - Y axis (up/down)
            z: '#0000ff'  // Blue - Z axis (forward/back)
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

        // Draw axis legend (standard right-handed system)
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('X: Right/Left (Red)', centerX + 10, centerY - 30);
        ctx.fillText('Y: Up/Down (Green)', centerX + 10, centerY - 18);
        ctx.fillText('Z: Forward/Back (Blue)', centerX + 10, centerY - 6);
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
        const size = this.size * Math.max(this.scale.x, this.scale.y) / 2;

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
            const camera = obj.getModule("Camera3DRasterizer") || obj.getModule("Camera3D");
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
            _axisLength: this._axisLength,
            _subdivisions: this._subdivisions
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
        //if (json._subdivisions !== undefined) this._subdivisions = json._subdivisions;
        this._subdivisions = 12;
    }

    // Getters and setters for properties
    get size() { return this._size; }
    set size(value) {
        this._size = value;
        this.updateCube();
    }

    get subdivisions() { return this._subdivisions; }
    set subdivisions(value) {
        this._subdivisions = Math.floor(Math.max(1, Math.min(10, value)));
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
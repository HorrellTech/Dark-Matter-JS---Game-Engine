/**
 * SphereMesh3D - A specialized 3D mesh module for spheres with customizable properties
 * 
 * This module creates and renders a 3D sphere mesh with configurable radius,
 * colors, and rendering options using UV sphere topology.
 */
class SphereMesh3D extends Module {
    static namespace = "3D";

    /**
     * Create a new SphereMesh3D
     */
    constructor() {
        super("SphereMesh3D");

        // Sphere properties
        this._radius = 50;
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

        // Sphere resolution
        this._segments = 16; // Horizontal segments (longitude)
        this._rings = 12;    // Vertical rings (latitude)

        // Mesh data
        this.vertices = [];
        this.edges = [];
        this.faces = [];

        // Material system
        this.material = null; // Material instance for advanced texturing

        // UV coordinates for texture mapping
        this.uvCoordinates = [];

        // Expose properties to the inspector
        this.exposeProperty("radius", "number", 50, {
            min: 1,
            max: 500,
            onChange: (val) => {
                this._radius = val;
                this.updateSphere();
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

        this.exposeProperty("segments", "number", 16, {
            min: 3,
            max: 64,
            step: 1,
            onChange: (val) => {
                this._segments = Math.floor(val);
                this.updateSphere();
            }
        });

        this.exposeProperty("rings", "number", 12, {
            min: 2,
            max: 64,
            step: 1,
            onChange: (val) => {
                this._rings = Math.floor(val);
                this.updateSphere();
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

        // Initialize sphere geometry
        this.updateSphere();

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
     * Update the sphere geometry based on current radius and resolution
     */
    updateSphere() {
        const r = this.radius;
        const segments = this._segments;
        const rings = this._rings;

        this.vertices = [];
        this.edges = [];
        this.faces = [];

        // Generate vertices using UV sphere topology
        // Top pole
        this.vertices.push(new Vector3(0, 0, r));

        // Generate vertices for each ring (excluding poles)
        for (let ring = 1; ring < rings; ring++) {
            const phi = Math.PI * ring / rings; // Latitude angle (0 to PI)
            const z = r * Math.cos(phi);
            const ringRadius = r * Math.sin(phi);

            for (let seg = 0; seg < segments; seg++) {
                const theta = 2 * Math.PI * seg / segments; // Longitude angle (0 to 2PI)
                const x = ringRadius * Math.cos(theta);
                const y = ringRadius * Math.sin(theta);
                this.vertices.push(new Vector3(x, y, z));
            }
        }

        // Bottom pole
        this.vertices.push(new Vector3(0, 0, -r));

        // Generate faces
        // Top cap (connecting to top pole) - Counter-clockwise winding
        for (let seg = 0; seg < segments; seg++) {
            const nextSeg = (seg + 1) % segments;
            this.faces.push([
                0, // Top pole
                1 + seg,
                1 + nextSeg
            ]);
        }

        // Middle quads
        for (let ring = 0; ring < rings - 2; ring++) {
            const currentRingStart = 1 + ring * segments;
            const nextRingStart = 1 + (ring + 1) * segments;

            for (let seg = 0; seg < segments; seg++) {
                const nextSeg = (seg + 1) % segments;

                // Create quad face (split into two triangles for better rendering) - Counter-clockwise winding
                this.faces.push([
                    currentRingStart + seg,
                    nextRingStart + seg,
                    nextRingStart + nextSeg,
                    currentRingStart + nextSeg
                ]);
            }
        }

        // Bottom cap (connecting to bottom pole) - Counter-clockwise winding
        const lastRingStart = 1 + (rings - 2) * segments;
        const bottomPoleIndex = this.vertices.length - 1;

        for (let seg = 0; seg < segments; seg++) {
            const nextSeg = (seg + 1) % segments;
            this.faces.push([
                bottomPoleIndex, // Bottom pole
                lastRingStart + nextSeg,
                lastRingStart + seg
            ]);
        }

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

        // Generate UV coordinates for texture mapping
        this.generateUVCoordinates();
    }

    /**
     * Generate UV coordinates for texture mapping
     */
    generateUVCoordinates() {
        this.uvCoordinates = [];

        for (let i = 0; i < this.vertices.length; i++) {
            const vertex = this.vertices[i];

            // Convert 3D spherical coordinates to 2D UV coordinates
            // Normalize the vertex position to get spherical coordinates
            const normalized = vertex.clone();
            const length = Math.sqrt(vertex.x * vertex.x + vertex.y * vertex.y + vertex.z * vertex.z);

            if (length > 0) {
                normalized.x /= length;
                normalized.y /= length;
                normalized.z /= length;
            }

            // Calculate UV coordinates using spherical mapping
            // U: longitude (0 to 1) - wraps around the sphere horizontally
            // V: latitude (0 to 1) - from bottom to top pole
            const u = 0.5 + (Math.atan2(normalized.x, normalized.z) / (2 * Math.PI));
            const v = 0.5 - (Math.asin(normalized.y) / Math.PI);

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
     * Draw the sphere to the canvas
     * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on
     */
    draw(ctx) {
        try {
            // Find an active camera
            const camera = this.findActiveCamera();

            // Use render texture method if camera supports it
            if (camera && camera.getRenderTextureContext && camera.render3D) {
                this.drawToRenderTexture(camera.getRenderTextureContext(), camera);
            } else if (camera) {
                // Fallback to direct drawing
                this.drawDirect(ctx, camera);
            }
        } catch (e) {
            // Silently fail
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
                // Use material color if available, otherwise fall back to faceColor
                const faceColor = this.material ? this.getMaterialColor(face) : this._faceColor;
                ctx.fillStyle = faceColor;
                if (face.length < 3) continue;

                const isVisible = face.every(vertexIndex =>
                    projectedVertices[vertexIndex] !== null &&
                    vertexIndex < projectedVertices.length
                );
                if (!isVisible) continue;

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
     * Draw the sphere to a render texture
     * @param {CanvasRenderingContext2D} ctx - The render texture context
     * @param {Camera3D} camera - The camera to use for projection
     */
    drawToRenderTexture(ctx, camera) {
        const transformedVertices = this.transformVertices();
        const projectedVertices = transformedVertices.map(vertex =>
            camera.projectPoint(vertex)
        );

        const validProjectedVertices = projectedVertices.map((vertex, index) => {
            if (vertex === null) {
                return new Vector2(-1000, -1000);
            }
            return vertex;
        });

        // Sort faces by depth
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

        // Draw faces
        if (this.renderMode === "solid" || this.renderMode === "both") {
            for (const face of sortedFaces) {
                // Use material color if available, otherwise fall back to faceColor
                const faceColor = this.material ? this.getMaterialColor(face) : this._faceColor;
                ctx.fillStyle = faceColor;
                const validVertices = [];
                for (const vertexIndex of face) {
                    if (vertexIndex < validProjectedVertices.length &&
                        validProjectedVertices[vertexIndex].x > -999) {
                        validVertices.push(validProjectedVertices[vertexIndex]);
                    }
                }

                if (validVertices.length < 3) continue;

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
            ctx.lineWidth = 1;

            for (const [from, to] of this.edges) {
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
            this.drawAxisLines(ctx, validProjectedVertices[0]);
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

        const axes = {
            x: new Vector3(axisLength, 0, 0),
            y: new Vector3(0, axisLength, 0),
            z: new Vector3(0, 0, axisLength)
        };

        const projectedAxes = {};
        for (const [axis, endpoint] of Object.entries(axes)) {
            const worldPoint = new Vector3(
                endpoint.x + this.position.x,
                endpoint.y + this.position.y,
                endpoint.z + this.position.z
            );
            projectedAxes[axis] = this.projectPointRelative(worldPoint, origin);
        }

        const axisColors = {
            x: '#ff0000',
            y: '#0000ff',
            z: '#00ff00'
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

            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(endPoint.x, endPoint.y);
            ctx.stroke();

            ctx.fillStyle = color;
            ctx.fillText(axisLabels[axis], endPoint.x, endPoint.y);

            this.drawArrowhead(ctx, centerX, centerY, endPoint.x, endPoint.y, color);
        }
    }

    /**
     * Project a point relative to an origin for axis drawing
     * @param {Vector3} worldPoint - The world point to project
     * @param {Vector2} origin - The origin point
     * @returns {Vector2|null} The projected point
     */
    projectPointRelative(worldPoint, origin) {
        const camera = this.findActiveCamera();
        if (!camera) return null;
        return camera.projectPoint(worldPoint);
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
        const headAngle = Math.PI / 6;

        const dx = toX - fromX;
        const dy = toY - fromY;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length === 0) return;

        const unitX = dx / length;
        const unitY = dy / length;
        const perpX = -unitY;
        const perpY = unitX;

        const arrowX1 = toX - headLength * (unitX * Math.cos(headAngle) - perpX * Math.sin(headAngle));
        const arrowY1 = toY - headLength * (unitY * Math.cos(headAngle) - perpY * Math.sin(headAngle));
        const arrowX2 = toX - headLength * (unitX * Math.cos(headAngle) + perpX * Math.sin(headAngle));
        const arrowY2 = toY - headLength * (unitY * Math.cos(headAngle) + perpY * Math.sin(headAngle));

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
    }

    /**
     * Transform vertices based on mesh and game object transforms
     * @returns {Array<Vector3>} Transformed vertices
     */
    transformVertices() {
        let objPos = { x: 0, y: 0 };
        let objRot = 0;
        let objScale = { x: 1, y: 1 };

        if (this.gameObject) {
            objPos = this.gameObject.getWorldPosition ? this.gameObject.getWorldPosition() : { x: 0, y: 0 };
            objRot = this.gameObject.getWorldRotation ? this.gameObject.getWorldRotation() : 0;
            objScale = this.gameObject.getWorldScale ? this.gameObject.getWorldScale() : { x: 1, y: 1 };
        }

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

        const objPos3D = new Vector3(objPos.x, objPos.y, objDepth);
        const objScale3D = new Vector3(objScale.x, objScale.y, 1);

        return this.vertices.map(vertex => {
            let v = vertex.clone ? vertex.clone() : new Vector3(vertex.x, vertex.y, vertex.z);

            // Apply mesh scale
            v.x *= this.scale.x;
            v.y *= this.scale.y;
            v.z *= this.scale.z;

            // Apply game object rotation
            if (objRot !== 0) {
                const rotRad = objRot * (Math.PI / 180);
                v = this.rotateZ(v, rotRad);
            }

            // Apply mesh rotation
            if (this.rotation.x !== 0) v = this.rotateX(v, this.rotation.x * (Math.PI / 180));
            if (this.rotation.y !== 0) v = this.rotateY(v, this.rotation.y * (Math.PI / 180));
            if (this.rotation.z !== 0) v = this.rotateZ(v, this.rotation.z * (Math.PI / 180));

            // Apply mesh position
            v.x += this.position.x;
            v.y += this.position.y;
            v.z += this.position.z;

            // Apply game object scale
            v.x *= objScale3D.x;
            v.y *= objScale3D.y;
            v.z *= objScale3D.z;

            // Apply game object position
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
        this.draw(ctx);
    }

    /**
     * Serialize the sphere mesh to JSON
     * @returns {Object} JSON representation of the sphere mesh
     */
    toJSON() {
        return {
            _type: "SphereMesh3D",
            _radius: this._radius,
            _position: { x: this._position.x, y: this._position.y, z: this._position.z },
            _rotation: { x: this._rotation.x, y: this._rotation.y, z: this._rotation.z },
            _scale: { x: this._scale.x, y: this._scale.y, z: this._scale.z },
            _wireframeColor: this._wireframeColor,
            _faceColor: this._faceColor,
            _renderMode: this._renderMode,
            _showAxisLines: this._showAxisLines,
            _axisLength: this._axisLength,
            _segments: this._segments,
            _rings: this._rings,
            material: this.material ? this.material.toJSON() : null
        };
    }

    /**
     * Deserialize the sphere mesh from JSON
     * @param {Object} json - JSON representation of the sphere mesh
     */
    fromJSON(json) {
        if (json._radius !== undefined) {
            this._radius = json._radius;
            this.updateSphere();
        }
        if (json._position) this._position = new Vector3(json._position.x, json._position.y, json._position.z);
        if (json._rotation) this._rotation = new Vector3(json._rotation.x, json._rotation.y, json._rotation.z);
        if (json._scale) this._scale = new Vector3(json._scale.x, json._scale.y, json._scale.z);
        if (json._wireframeColor !== undefined) this._wireframeColor = json._wireframeColor;
        if (json._faceColor !== undefined) this._faceColor = json._faceColor;
        if (json._renderMode !== undefined) this._renderMode = json._renderMode;
        if (json._showAxisLines !== undefined) this._showAxisLines = json._showAxisLines;
        if (json._axisLength !== undefined) this._axisLength = json._axisLength;
        if (json._segments !== undefined) this._segments = json._segments;
        if (json._rings !== undefined) this._rings = json._rings;
        if (json.material !== undefined) {
            if (this.material && json.material) {
                this.material.fromJSON(json.material);
            } else if (json.material) {
                // Create new material if one doesn't exist
                this.material = new Material();
                this.material.fromJSON(json.material);
            }
        }
    }

    // Getters and setters
    get radius() { return this._radius; }
    set radius(value) {
        this._radius = value;
        this.updateSphere();
    }

    get segments() { return this._segments; }
    set segments(value) {
        this._segments = Math.floor(Math.max(3, Math.min(64, value)));
        this.updateSphere();
    }

    get rings() { return this._rings; }
    set rings(value) {
        this._rings = Math.floor(Math.max(2, Math.min(64, value)));
        this.updateSphere();
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

// Register the SphereMesh3D module
window.SphereMesh3D = SphereMesh3D;
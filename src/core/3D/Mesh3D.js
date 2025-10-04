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

        // Shape selection
        this._shape = "cube"; // "cube", "pyramid", "sphere", "octahedron", "torus", "cone", "cylinder", "icosahedron", "quad", "plane", "custom"

        // Expose shape property
        this.exposeProperty("_shape", "enum", this._shape, {
            options: ["cube", "pyramid", "sphere", "octahedron", "torus", "cone", "cylinder", "icosahedron",
                "quadCube", "capsule", "prism", "tetrahedron", "quad", "plane", "custom"],
            onChange: (val) => {
                // console.log(`Mesh3D: Shape property changing from "${this._shape}" to "${val}"`);
                this._shape = val;
                this.updateShape();
            }
        });

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

        // Shape-specific properties
        this.cubeSize = 100;
        this.exposeProperty("cubeSize", "number", 100, {
            min: 10,
            max: 500,
            step: 10,
            onChange: (val) => {
                this.cubeSize = val;
                if (this._shape === "cube") this.createCube(val);
            }
        });

        this.pyramidBaseSize = 100;
        this.pyramidHeight = 150;
        this.exposeProperty("pyramidBaseSize", "number", 100, {
            min: 10,
            max: 500,
            step: 10,
            onChange: (val) => {
                this.pyramidBaseSize = val;
                if (this._shape === "pyramid") this.createPyramid(val, this.pyramidHeight);
            }
        });
        this.exposeProperty("pyramidHeight", "number", 150, {
            min: 10,
            max: 500,
            step: 10,
            onChange: (val) => {
                this.pyramidHeight = val;
                if (this._shape === "pyramid") this.createPyramid(this.pyramidBaseSize, val);
            }
        });

        this.sphereRadius = 100;
        this.sphereDetail = 12;
        this.exposeProperty("sphereRadius", "number", 100, {
            min: 10,
            max: 500,
            step: 10,
            onChange: (val) => {
                this.sphereRadius = val;
                if (this._shape === "sphere") this.createSphere(val, this.sphereDetail);
            }
        });
        this.exposeProperty("sphereDetail", "number", 12, {
            min: 6,
            max: 24,
            step: 1,
            onChange: (val) => {
                this.sphereDetail = val;
                if (this._shape === "sphere") this.createSphere(this.sphereRadius, val);
            }
        });

        this.octahedronSize = 100;
        this.exposeProperty("octahedronSize", "number", 100, {
            min: 10,
            max: 500,
            step: 10,
            onChange: (val) => {
                this.octahedronSize = val;
                if (this._shape === "octahedron") this.createOctahedron(val);
            }
        });

        this.planeSize = 200;
        this.exposeProperty("planeSize", "number", 200, {
            min: 10,
            max: 500,
            step: 10,
            onChange: (val) => {
                this.planeSize = val;
                if (this._shape === "plane") this.createPlane(val);
            }
        });

        // Quad Cube properties
        this.quadCubeSize = 100;
        this.quadCubeSubdivisions = 2;
        this.exposeProperty("quadCubeSize", "number", 100, {
            min: 10,
            max: 500,
            step: 10,
            onChange: (val) => {
                this.quadCubeSize = val;
                if (this._shape === "quadCube") this.createQuadCube(val, this.quadCubeSubdivisions);
            }
        });
        this.exposeProperty("quadCubeSubdivisions", "number", 2, {
            min: 1,
            max: 10,
            step: 1,
            onChange: (val) => {
                this.quadCubeSubdivisions = val;
                if (this._shape === "quadCube") this.createQuadCube(this.quadCubeSize, val);
            }
        });

        // Capsule properties
        this.capsuleRadius = 50;
        this.capsuleHeight = 150;
        this.capsuleSegments = 16;
        this.exposeProperty("capsuleRadius", "number", 50, {
            min: 10,
            max: 200,
            step: 5,
            onChange: (val) => {
                this.capsuleRadius = val;
                if (this._shape === "capsule") this.createCapsule(val, this.capsuleHeight, this.capsuleSegments);
            }
        });
        this.exposeProperty("capsuleHeight", "number", 150, {
            min: 20,
            max: 500,
            step: 10,
            onChange: (val) => {
                this.capsuleHeight = val;
                if (this._shape === "capsule") this.createCapsule(this.capsuleRadius, val, this.capsuleSegments);
            }
        });
        this.exposeProperty("capsuleSegments", "number", 16, {
            min: 6,
            max: 32,
            step: 1,
            onChange: (val) => {
                this.capsuleSegments = val;
                if (this._shape === "capsule") this.createCapsule(this.capsuleRadius, this.capsuleHeight, val);
            }
        });

        // Prism properties
        this.prismSides = 6;
        this.prismRadius = 100;
        this.prismHeight = 150;
        this.exposeProperty("prismSides", "number", 6, {
            min: 3,
            max: 12,
            step: 1,
            onChange: (val) => {
                this.prismSides = val;
                if (this._shape === "prism") this.createPrism(val, this.prismRadius, this.prismHeight);
            }
        });
        this.exposeProperty("prismRadius", "number", 100, {
            min: 10,
            max: 300,
            step: 10,
            onChange: (val) => {
                this.prismRadius = val;
                if (this._shape === "prism") this.createPrism(this.prismSides, val, this.prismHeight);
            }
        });
        this.exposeProperty("prismHeight", "number", 150, {
            min: 10,
            max: 500,
            step: 10,
            onChange: (val) => {
                this.prismHeight = val;
                if (this._shape === "prism") this.createPrism(this.prismSides, this.prismRadius, val);
            }
        });

        // Tetrahedron properties
        this.tetrahedronSize = 100;
        this.exposeProperty("tetrahedronSize", "number", 100, {
            min: 10,
            max: 500,
            step: 10,
            onChange: (val) => {
                this.tetrahedronSize = val;
                if (this._shape === "tetrahedron") this.createTetrahedron(val);
            }
        });

        this.torusMajorRadius = 100;
        this.torusMinorRadius = 40;
        this.torusMajorSegments = 16;
        this.torusMinorSegments = 8;
        this.exposeProperty("torusMajorRadius", "number", 100, {
            min: 20,
            max: 300,
            step: 10,
            onChange: (val) => {
                this.torusMajorRadius = val;
                if (this._shape === "torus") this.createTorus(val, this.torusMinorRadius, this.torusMajorSegments, this.torusMinorSegments);
            }
        });
        this.exposeProperty("torusMinorRadius", "number", 40, {
            min: 10,
            max: 100,
            step: 5,
            onChange: (val) => {
                this.torusMinorRadius = val;
                if (this._shape === "torus") this.createTorus(this.torusMajorRadius, val, this.torusMajorSegments, this.torusMinorSegments);
            }
        });
        this.exposeProperty("torusMajorSegments", "number", 16, {
            min: 8,
            max: 32,
            step: 1,
            onChange: (val) => {
                this.torusMajorSegments = val;
                if (this._shape === "torus") this.createTorus(this.torusMajorRadius, this.torusMinorRadius, val, this.torusMinorSegments);
            }
        });
        this.exposeProperty("torusMinorSegments", "number", 8, {
            min: 4,
            max: 16,
            step: 1,
            onChange: (val) => {
                this.torusMinorSegments = val;
                if (this._shape === "torus") this.createTorus(this.torusMajorRadius, this.torusMinorRadius, this.torusMajorSegments, val);
            }
        });

        this.coneRadius = 100;
        this.coneHeight = 150;
        this.coneSegments = 16;
        this.exposeProperty("coneRadius", "number", 100, {
            min: 10,
            max: 500,
            step: 10,
            onChange: (val) => {
                this.coneRadius = val;
                if (this._shape === "cone") this.createCone(val, this.coneHeight, this.coneSegments);
            }
        });
        this.exposeProperty("coneHeight", "number", 150, {
            min: 10,
            max: 500,
            step: 10,
            onChange: (val) => {
                this.coneHeight = val;
                if (this._shape === "cone") this.createCone(this.coneRadius, val, this.coneSegments);
            }
        });
        this.exposeProperty("coneSegments", "number", 16, {
            min: 6,
            max: 32,
            step: 1,
            onChange: (val) => {
                this.coneSegments = val;
                if (this._shape === "cone") this.createCone(this.coneRadius, this.coneHeight, val);
            }
        });

        this.cylinderRadius = 100;
        this.cylinderHeight = 150;
        this.cylinderSegments = 16;
        this.exposeProperty("cylinderRadius", "number", 100, {
            min: 10,
            max: 500,
            step: 10,
            onChange: (val) => {
                this.cylinderRadius = val;
                if (this._shape === "cylinder") this.createCylinder(val, this.cylinderHeight, this.cylinderSegments);
            }
        });
        this.exposeProperty("cylinderHeight", "number", 150, {
            min: 10,
            max: 500,
            step: 10,
            onChange: (val) => {
                this.cylinderHeight = val;
                if (this._shape === "cylinder") this.createCylinder(this.cylinderRadius, val, this.cylinderSegments);
            }
        });
        this.exposeProperty("cylinderSegments", "number", 16, {
            min: 6,
            max: 32,
            step: 1,
            onChange: (val) => {
                this.cylinderSegments = val;
                if (this._shape === "cylinder") this.createCylinder(this.cylinderRadius, this.cylinderHeight, val);
            }
        });

        this.icosahedronSize = 100;
        this.exposeProperty("icosahedronSize", "number", 100, {
            min: 10,
            max: 500,
            step: 10,
            onChange: (val) => {
                this.icosahedronSize = val;
                if (this._shape === "icosahedron") this.createIcosahedron(val);
            }
        });

        this.quadWidth = 200;
        this.quadHeight = 200;
        this.quadSubdivisionsX = 4;
        this.quadSubdivisionsY = 4;
        this.exposeProperty("quadWidth", "number", 200, {
            min: 10,
            max: 500,
            step: 10,
            onChange: (val) => {
                this.quadWidth = val;
                if (this._shape === "quad") this.createQuad(val, this.quadHeight, this.quadSubdivisionsX, this.quadSubdivisionsY);
            }
        });
        this.exposeProperty("quadHeight", "number", 200, {
            min: 10,
            max: 500,
            step: 10,
            onChange: (val) => {
                this.quadHeight = val;
                if (this._shape === "quad") this.createQuad(this.quadWidth, val, this.quadSubdivisionsX, this.quadSubdivisionsY);
            }
        });
        this.exposeProperty("quadSubdivisionsX", "number", 4, {
            min: 1,
            max: 20,
            step: 1,
            onChange: (val) => {
                this.quadSubdivisionsX = val;
                if (this._shape === "quad") this.createQuad(this.quadWidth, this.quadHeight, val, this.quadSubdivisionsY);
            }
        });
        this.exposeProperty("quadSubdivisionsY", "number", 4, {
            min: 1,
            max: 20,
            step: 1,
            onChange: (val) => {
                this.quadSubdivisionsY = val;
                if (this._shape === "quad") this.createQuad(this.quadWidth, this.quadHeight, this.quadSubdivisionsX, val);
            }
        });

        this.planeSize = 200;
        this.exposeProperty("planeSize", "number", 200, {
            min: 10,
            max: 500,
            step: 10,
            onChange: (val) => {
                this.planeSize = val;
                if (this._shape === "plane") this.createPlane(val);
            }
        });

        // Generate UV coordinates for texture mapping
        this.generateUVCoordinates();

        // Ensure material module exists on the game object
        this.ensureMaterialModule();
    }

    /**
     * Optional method for enhanced inspector UI using the Style helper
     * This will be called by the Inspector if it exists
     * @param {Style} style - Styling helper
     */
    style(style) {
        style.startGroup("Shape Selection", false, {
            backgroundColor: 'rgba(100,150,255,0.08)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("shape", "enum", this._shape, {
            label: "Mesh Shape",
            options: ["cube", "pyramid", "sphere", "octahedron", "torus", "cone", "cylinder", "icosahedron",
                "quadCube", "capsule", "prism", "tetrahedron", "quad", "plane", "custom"]
        });
        style.endGroup();

        style.addDivider();

        // Show properties based on selected shape
        if (this._shape === "cube") {
            style.startGroup("Cube Settings", false, {
                backgroundColor: 'rgba(255,100,100,0.08)',
                borderRadius: '6px',
                padding: '8px'
            });
            style.exposeProperty("cubeSize", "number", this.cubeSize, { label: "Size" });
            style.endGroup();
        }

        if (this._shape === "pyramid") {
            style.startGroup("Pyramid Settings", false, {
                backgroundColor: 'rgba(255,150,100,0.08)',
                borderRadius: '6px',
                padding: '8px'
            });
            style.exposeProperty("pyramidBaseSize", "number", this.pyramidBaseSize, { label: "Base Size" });
            style.exposeProperty("pyramidHeight", "number", this.pyramidHeight, { label: "Height" });
            style.endGroup();
        }

        if (this._shape === "sphere") {
            style.startGroup("Sphere Settings", false, {
                backgroundColor: 'rgba(100,255,100,0.08)',
                borderRadius: '6px',
                padding: '8px'
            });
            style.exposeProperty("sphereRadius", "number", this.sphereRadius, { label: "Radius" });
            style.exposeProperty("sphereDetail", "number", this.sphereDetail, { label: "Detail Level" });
            style.endGroup();
        }

        if (this._shape === "octahedron") {
            style.startGroup("Octahedron Settings", false, {
                backgroundColor: 'rgba(255,100,255,0.08)',
                borderRadius: '6px',
                padding: '8px'
            });
            style.exposeProperty("octahedronSize", "number", this.octahedronSize, { label: "Size" });
            style.endGroup();
        }

        if (this._shape === "torus") {
            style.startGroup("Torus Settings", false, {
                backgroundColor: 'rgba(100,255,255,0.08)',
                borderRadius: '6px',
                padding: '8px'
            });
            style.exposeProperty("torusMajorRadius", "number", this.torusMajorRadius, { label: "Major Radius" });
            style.exposeProperty("torusMinorRadius", "number", this.torusMinorRadius, { label: "Minor Radius" });
            style.exposeProperty("torusMajorSegments", "number", this.torusMajorSegments, { label: "Major Segments" });
            style.exposeProperty("torusMinorSegments", "number", this.torusMinorSegments, { label: "Minor Segments" });
            style.endGroup();
        }

        if (this._shape === "cone") {
            style.startGroup("Cone Settings", false, {
                backgroundColor: 'rgba(255,200,100,0.08)',
                borderRadius: '6px',
                padding: '8px'
            });
            style.exposeProperty("coneRadius", "number", this.coneRadius, { label: "Base Radius" });
            style.exposeProperty("coneHeight", "number", this.coneHeight, { label: "Height" });
            style.exposeProperty("coneSegments", "number", this.coneSegments, { label: "Segments" });
            style.endGroup();
        }

        if (this._shape === "cylinder") {
            style.startGroup("Cylinder Settings", false, {
                backgroundColor: 'rgba(150,150,255,0.08)',
                borderRadius: '6px',
                padding: '8px'
            });
            style.exposeProperty("cylinderRadius", "number", this.cylinderRadius, { label: "Radius" });
            style.exposeProperty("cylinderHeight", "number", this.cylinderHeight, { label: "Height" });
            style.exposeProperty("cylinderSegments", "number", this.cylinderSegments, { label: "Segments" });
            style.endGroup();
        }

        if (this._shape === "icosahedron") {
            style.startGroup("Icosahedron Settings", false, {
                backgroundColor: 'rgba(255,150,200,0.08)',
                borderRadius: '6px',
                padding: '8px'
            });
            style.exposeProperty("icosahedronSize", "number", this.icosahedronSize, { label: "Size" });
            style.endGroup();
        }

        if (this._shape === "quadCube") {
            style.startGroup("Quad Cube Settings", false, {
                backgroundColor: 'rgba(200,150,100,0.08)',
                borderRadius: '6px',
                padding: '8px'
            });
            style.exposeProperty("quadCubeSize", "number", this.quadCubeSize, { label: "Size" });
            style.exposeProperty("quadCubeSubdivisions", "number", this.quadCubeSubdivisions, { label: "Subdivisions" });
            style.endGroup();
        }

        if (this._shape === "capsule") {
            style.startGroup("Capsule Settings", false, {
                backgroundColor: 'rgba(150,255,200,0.08)',
                borderRadius: '6px',
                padding: '8px'
            });
            style.exposeProperty("capsuleRadius", "number", this.capsuleRadius, { label: "Radius" });
            style.exposeProperty("capsuleHeight", "number", this.capsuleHeight, { label: "Height" });
            style.exposeProperty("capsuleSegments", "number", this.capsuleSegments, { label: "Segments" });
            style.endGroup();
        }

        if (this._shape === "prism") {
            style.startGroup("Prism Settings", false, {
                backgroundColor: 'rgba(200,150,255,0.08)',
                borderRadius: '6px',
                padding: '8px'
            });
            style.exposeProperty("prismSides", "number", this.prismSides, { label: "Sides" });
            style.exposeProperty("prismRadius", "number", this.prismRadius, { label: "Radius" });
            style.exposeProperty("prismHeight", "number", this.prismHeight, { label: "Height" });
            style.endGroup();
        }

        if (this._shape === "tetrahedron") {
            style.startGroup("Tetrahedron Settings", false, {
                backgroundColor: 'rgba(255,200,150,0.08)',
                borderRadius: '6px',
                padding: '8px'
            });
            style.exposeProperty("tetrahedronSize", "number", this.tetrahedronSize, { label: "Size" });
            style.endGroup();
        }

        if (this._shape === "quad") {
            style.startGroup("Quad Settings", false, {
                backgroundColor: 'rgba(200,100,255,0.08)',
                borderRadius: '6px',
                padding: '8px'
            });
            style.exposeProperty("quadWidth", "number", this.quadWidth, { label: "Width" });
            style.exposeProperty("quadHeight", "number", this.quadHeight, { label: "Height" });
            style.exposeProperty("quadSubdivisionsX", "number", this.quadSubdivisionsX, { label: "X Subdivisions" });
            style.exposeProperty("quadSubdivisionsY", "number", this.quadSubdivisionsY, { label: "Y Subdivisions" });
            style.endGroup();
        }

        if (this._shape === "plane") {
            style.startGroup("Plane Settings", false, {
                backgroundColor: 'rgba(150,200,255,0.08)',
                borderRadius: '6px',
                padding: '8px'
            });
            style.exposeProperty("planeSize", "number", this.planeSize, { label: "Size" });
            style.endGroup();
        }

        if (this._shape === "custom") {
            style.startGroup("Custom Model Settings", false, {
                backgroundColor: 'rgba(255,255,100,0.08)',
                borderRadius: '6px',
                padding: '8px'
            });
            style.exposeProperty("sphereRadius", "number", this.sphereRadius, { label: "Base Radius" });
            style.exposeProperty("sphereDetail", "number", this.sphereDetail, { label: "Detail Level" });
            style.endGroup();
        }

        style.addDivider();

        style.startGroup("Appearance", false, {
            backgroundColor: 'rgba(200,200,200,0.08)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("wireframeColor", "color", this.wireframeColor, { label: "Wireframe Color" });
        style.exposeProperty("faceColor", "color", this.faceColor, { label: "Face Color" });
        style.exposeProperty("renderMode", "enum", this.renderMode, { label: "Render Mode" });
        style.endGroup();

        style.addDivider();

        style.startGroup("Transform", false, {
            backgroundColor: 'rgba(150,255,150,0.08)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("position", "vector3", this.position, { label: "Position" });
        style.exposeProperty("rotation", "vector3", this.rotation, { label: "Rotation" });
        style.exposeProperty("scale", "vector3", this.scale, { label: "Scale" });
        style.endGroup();

        style.addDivider();

        style.startGroup("Material & Lighting", false, {
            backgroundColor: 'rgba(255,150,255,0.08)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("material", "module", this.material, { label: "Material" });
        style.endGroup();

        style.addDivider();

        style.startGroup("Debug", false, {
            backgroundColor: 'rgba(255,255,150,0.08)',
            borderRadius: '6px',
            padding: '8px'
        });
        style.exposeProperty("_showAxisLines", "boolean", this._showAxisLines, { label: "Show Axis Lines" });
        style.exposeProperty("_axisLength", "number", this._axisLength, { label: "Axis Length" });
        style.endGroup();
    }

    start() {
        // Ensure material module exists on the game object
        this.ensureMaterialModule();

        this.updateShape();
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
            const viewDir = camera.position.clone().subtract(faceCenter).normalize();

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
        center.multiply(1 / face.length);
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
        const edge1 = v2.clone().subtract(v1);
        const edge2 = v3.clone().subtract(v1);

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

        // X=forward, Y=right, Z=up coordinate system
        this.vertices = [
            new Vector3(-s, -s, -s), // 0: back-left-bottom
            new Vector3(-s, s, -s),  // 1: back-right-bottom
            new Vector3(-s, s, s),   // 2: back-right-top
            new Vector3(-s, -s, s),  // 3: back-left-top
            new Vector3(s, -s, -s),  // 4: front-left-bottom
            new Vector3(s, s, -s),   // 5: front-right-bottom
            new Vector3(s, s, s),    // 6: front-right-top
            new Vector3(s, -s, s)    // 7: front-left-top
        ];

        this.edges = [
            [0, 1], [1, 2], [2, 3], [3, 0], // back face
            [4, 5], [5, 6], [6, 7], [7, 4], // front face
            [0, 4], [1, 5], [2, 6], [3, 7]  // connecting edges
        ];

        // Triangulated faces with correct winding (counter-clockwise from outside)
        this.faces = [
            // Back face (X = -s) - looking from behind
            [0, 3, 2], [0, 2, 1],
            // Front face (X = s) - looking from front
            [4, 5, 6], [4, 6, 7],
            // Bottom face (Z = -s) - looking from below
            [0, 1, 5], [0, 5, 4],
            // Top face (Z = s) - looking from above
            [3, 7, 6], [3, 6, 2],
            // Left face (Y = -s) - looking from left
            [0, 4, 7], [0, 7, 3],
            // Right face (Y = s) - looking from right
            [1, 2, 6], [1, 6, 5]
        ];

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

        // X=forward, Y=right, Z=up
        this.vertices = [
            new Vector3(-s, -s, -h), // 0: base back-left
            new Vector3(-s, s, -h),  // 1: base back-right
            new Vector3(s, s, -h),   // 2: base front-right
            new Vector3(s, -s, -h),  // 3: base front-left
            new Vector3(0, 0, h)     // 4: apex
        ];

        this.edges = [
            [0, 1], [1, 2], [2, 3], [3, 0], // base
            [0, 4], [1, 4], [2, 4], [3, 4]  // edges to apex
        ];

        this.faces = [
            [0, 1, 2, 3], // base (CCW from below)
            [0, 4, 1],    // left face
            [1, 4, 2],    // back face
            [2, 4, 3],    // right face
            [3, 4, 0]     // front face
        ];

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

        // Create faces and edges with correct counter-clockwise winding
        for (let lat = 0; lat < detail; lat++) {
            for (let lon = 0; lon < detail; lon++) {
                const first = lat * (detail + 1) + lon;
                const second = first + detail + 1;

                // Create two triangular faces with correct counter-clockwise winding (viewed from outside)
                // First triangle: first -> first+1 -> second (counter-clockwise from outside)
                this.faces.push([first, first + 1, second]);
                // Second triangle: second -> first+1 -> second+1 (counter-clockwise from outside)
                this.faces.push([second, first + 1, second + 1]);

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
     * Create an octahedron mesh
     * @param {number} size - Size of the octahedron
     */
    createOctahedron(size = 100) {
        const s = size / 2;

        this.vertices = [
            new Vector3(0, s, 0),   // 0: top
            new Vector3(s, 0, 0),   // 1: front
            new Vector3(0, 0, s),   // 2: right
            new Vector3(-s, 0, 0),  // 3: back
            new Vector3(0, 0, -s),  // 4: left
            new Vector3(0, -s, 0)   // 5: bottom
        ];

        this.edges = [
            [0, 1], [0, 2], [0, 3], [0, 4],
            [1, 2], [2, 3], [3, 4], [4, 1],
            [5, 1], [5, 2], [5, 3], [5, 4]
        ];

        this.faces = [
            [0, 2, 1], [0, 3, 2], [0, 4, 3], [0, 1, 4], // top faces
            [5, 1, 2], [5, 2, 3], [5, 3, 4], [5, 4, 1]  // bottom faces
        ];

        // Regenerate UV coordinates after changing mesh data
        this.generateUVCoordinates();
    }

    /**
      * Create a torus (donut) mesh
      * @param {number} majorRadius - Distance from center to tube center
      * @param {number} minorRadius - Radius of the tube
      * @param {number} majorSegments - Segments around the major radius
      * @param {number} minorSegments - Segments around the minor radius
      */
    createTorus(majorRadius = 100, minorRadius = 40, majorSegments = 16, minorSegments = 8) {
        this.vertices = [];
        this.edges = [];
        this.faces = [];

        // Generate vertices
        for (let i = 0; i < majorSegments; i++) {
            const theta = (i / majorSegments) * Math.PI * 2;
            const centerX = Math.cos(theta) * majorRadius;
            const centerZ = Math.sin(theta) * majorRadius;

            for (let j = 0; j < minorSegments; j++) {
                const phi = (j / minorSegments) * Math.PI * 2;
                const x = centerX + Math.cos(phi) * Math.cos(theta) * minorRadius;
                const y = Math.sin(phi) * minorRadius;
                const z = centerZ + Math.cos(phi) * Math.sin(theta) * minorRadius;

                this.vertices.push(new Vector3(x, y, z));
            }
        }

        // Generate faces and edges with correct winding order
        for (let i = 0; i < majorSegments; i++) {
            for (let j = 0; j < minorSegments; j++) {
                const current = i * minorSegments + j;
                const nextMajor = ((i + 1) % majorSegments) * minorSegments + j;
                const nextMinor = i * minorSegments + ((j + 1) % minorSegments);
                const nextBoth = ((i + 1) % majorSegments) * minorSegments + ((j + 1) % minorSegments);

                // Create faces with correct counter-clockwise winding (from outside)
                // First triangle: current -> nextMinor -> nextBoth
                this.faces.push([current, nextMinor, nextBoth]);
                // Second triangle: current -> nextBoth -> nextMajor
                this.faces.push([current, nextBoth, nextMajor]);

                // Create edges
                this.edges.push([current, nextMinor]);
                this.edges.push([current, nextMajor]);
            }
        }

        // Regenerate UV coordinates after changing mesh data
        this.generateUVCoordinates();
    }

    /**
     * Create a cone mesh
     * @param {number} radius - Base radius
     * @param {number} height - Height of the cone
     * @param {number} segments - Number of segments around the base
     */
    createCone(radius = 100, height = 150, segments = 16) {
        this.vertices = [];
        this.edges = [];
        this.faces = [];

        const h = height / 2;

        // Apex at top (X=forward, Y=right, Z=up)
        const apex = 0;
        this.vertices.push(new Vector3(0, 0, h));

        // Base center at bottom
        const baseCenter = 1;
        this.vertices.push(new Vector3(0, 0, -h));

        // Base vertices (circle in XY plane at Z = -h)
        for (let i = 0; i < segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            const x = Math.cos(theta) * radius;
            const y = Math.sin(theta) * radius;
            this.vertices.push(new Vector3(x, y, -h));
        }

        // Create side faces (triangles from apex to base edge)
        // CCW from outside: apex -> current -> next
        for (let i = 0; i < segments; i++) {
            const current = 2 + i; // Base vertex index
            const next = 2 + ((i + 1) % segments); // Next base vertex

            // Side triangle: apex -> current -> next (CCW from outside)
            this.faces.push([apex, current, next]);

            // Edges
            this.edges.push([apex, current]);
            this.edges.push([current, next]);
        }

        // Create base face (polygon at bottom, winding CCW from below)
        const baseFace = [];
        for (let i = segments - 1; i >= 0; i--) {
            baseFace.push(2 + i);
        }
        // When viewed from below (negative Z), this is now CCW
        this.faces.push(baseFace);

        // Add radial edges from base center to base vertices
        for (let i = 0; i < segments; i++) {
            this.edges.push([baseCenter, 2 + i]);
        }

        this.generateUVCoordinates();
    }

    /**
     * Create a cylinder mesh
     * @param {number} radius - Radius of the cylinder
     * @param {number} height - Height of the cylinder
     * @param {number} segments - Number of segments around the circumference
     */
    createCylinder(radius = 100, height = 150, segments = 16) {
        this.vertices = [];
        this.edges = [];
        this.faces = [];

        const h = height / 2;

        // Bottom vertices (circle in XY plane at Z = -h)
        for (let i = 0; i < segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            const x = Math.cos(theta) * radius;
            const y = Math.sin(theta) * radius;
            this.vertices.push(new Vector3(x, y, -h));
        }

        // Top vertices (circle in XY plane at Z = h)
        for (let i = 0; i < segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            const x = Math.cos(theta) * radius;
            const y = Math.sin(theta) * radius;
            this.vertices.push(new Vector3(x, y, h));
        }

        // Create bottom face (winding CCW from below)
        const bottomFace = [];
        for (let i = 0; i < segments; i++) {
            bottomFace.push(i);
        }
        bottomFace.reverse();
        this.faces.push(bottomFace);

        // Create top face (winding CCW from above)
        const topFace = [];
        for (let i = 0; i < segments; i++) {
            topFace.push(segments + i);
        }
        this.faces.push(topFace);

        // Create side faces (quads, CCW from outside)
        for (let i = 0; i < segments; i++) {
            const next = (i + 1) % segments;
            const bottomCurrent = i;
            const bottomNext = next;
            const topCurrent = segments + i;
            const topNext = segments + next;

            // Quad: bottom-current -> bottom-next -> top-next -> top-current (CCW)
            this.faces.push([bottomCurrent, bottomNext, topNext, topCurrent]);

            // Create edges
            this.edges.push([bottomCurrent, bottomNext]);
            this.edges.push([topCurrent, topNext]);
            this.edges.push([bottomCurrent, topCurrent]);
        }

        this.generateUVCoordinates();
    }

    /**
     * Create an icosahedron mesh (20-faced polyhedron)
     * @param {number} size - Size of the icosahedron
     */
    createIcosahedron(size = 100) {
        this.vertices = [];
        this.edges = [];
        this.faces = [];

        const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio
        const s = size / Math.sqrt(phi * phi + 1);

        // Generate vertices using golden ratio
        const vertexData = [
            [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
            [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
            [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
        ];

        for (const v of vertexData) {
            this.vertices.push(new Vector3(v[0] * s, v[1] * s, v[2] * s));
        }

        // Define faces (20 triangular faces)
        const faceData = [
            [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
            [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
            [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
            [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
        ];

        this.faces = faceData;

        // Generate edges from faces
        const edgeSet = new Set();
        for (const face of this.faces) {
            for (let i = 0; i < face.length; i++) {
                const a = Math.min(face[i], face[(i + 1) % face.length]);
                const b = Math.max(face[i], face[(i + 1) % face.length]);
                edgeSet.add(`${a},${b}`);
            }
        }

        for (const edge of edgeSet) {
            const [a, b] = edge.split(',').map(Number);
            this.edges.push([a, b]);
        }

        // Regenerate UV coordinates after changing mesh data
        this.generateUVCoordinates();
    }

    /**
     * Create a subdivided cube (quad cube)
     * @param {number} size - Size of the cube
     * @param {number} subdivisions - Number of subdivisions per face
     */
    createQuadCube(size = 100, subdivisions = 2) {
        this.vertices = [];
        this.edges = [];
        this.faces = [];

        const s = size / 2;

        // Helper function to add a subdivided face with proper winding
        const addSubdividedFace = (corners, reverseWinding = false) => {
            const vertexOffset = this.vertices.length;

            // corners is [c0, c1, c2, c3] - corner order determines face orientation
            const [c0, c1, c2, c3] = corners;

            // Generate vertices for this face
            for (let i = 0; i <= subdivisions; i++) {
                for (let j = 0; j <= subdivisions; j++) {
                    const u = i / subdivisions;
                    const v = j / subdivisions;

                    // Bilinear interpolation
                    const vertex = new Vector3(
                        c0.x * (1 - u) * (1 - v) + c1.x * u * (1 - v) + c2.x * u * v + c3.x * (1 - u) * v,
                        c0.y * (1 - u) * (1 - v) + c1.y * u * (1 - v) + c2.y * u * v + c3.y * (1 - u) * v,
                        c0.z * (1 - u) * (1 - v) + c1.z * u * (1 - v) + c2.z * u * v + c3.z * (1 - u) * v
                    );
                    this.vertices.push(vertex);
                }
            }

            // Generate faces with proper winding (CCW from outside)
            for (let i = 0; i < subdivisions; i++) {
                for (let j = 0; j < subdivisions; j++) {
                    const tl = vertexOffset + i * (subdivisions + 1) + j;
                    const tr = tl + 1;
                    const bl = tl + (subdivisions + 1);
                    const br = bl + 1;

                    if (reverseWinding) {
                        // Reverse winding: tl -> tr -> br -> bl
                        this.faces.push([tl, tr, br]);
                        this.faces.push([tl, br, bl]);
                    } else {
                        // Normal CCW winding from outside: tl -> bl -> br -> tr
                        this.faces.push([tl, bl, br]);
                        this.faces.push([tl, br, tr]);
                    }
                }
            }
        };

        // Front face (+X) - CCW from outside
        addSubdividedFace([
            new Vector3(s, -s, -s), // bottom-left
            new Vector3(s, s, -s),  // bottom-right
            new Vector3(s, s, s),   // top-right
            new Vector3(s, -s, s)   // top-left
        ], false);

        // Back face (-X) - CCW from outside
        addSubdividedFace([
            new Vector3(-s, s, -s),  // bottom-right (from back view)
            new Vector3(-s, -s, -s), // bottom-left
            new Vector3(-s, -s, s),  // top-left
            new Vector3(-s, s, s)    // top-right
        ], false);

        // Right face (+Y) - CCW from outside
        addSubdividedFace([
            new Vector3(s, s, -s),   // bottom-front
            new Vector3(-s, s, -s),  // bottom-back
            new Vector3(-s, s, s),   // top-back
            new Vector3(s, s, s)     // top-front
        ], false);

        // Left face (-Y) - CCW from outside
        addSubdividedFace([
            new Vector3(-s, -s, -s), // bottom-back (from left view)
            new Vector3(s, -s, -s),  // bottom-front
            new Vector3(s, -s, s),   // top-front
            new Vector3(-s, -s, s)   // top-back
        ], false);

        // Top face (+Z) - CCW from outside
        addSubdividedFace([
            new Vector3(-s, -s, s), // back-left
            new Vector3(s, -s, s),  // front-left
            new Vector3(s, s, s),   // front-right
            new Vector3(-s, s, s)   // back-right
        ], false);

        // Bottom face (-Z) - CCW from outside
        addSubdividedFace([
            new Vector3(s, -s, -s),  // front-left (from below)
            new Vector3(-s, -s, -s), // back-left
            new Vector3(-s, s, -s),  // back-right
            new Vector3(s, s, -s)    // front-right
        ], false);

        // Generate edges from faces
        const edgeSet = new Set();
        for (const face of this.faces) {
            for (let i = 0; i < face.length; i++) {
                const a = Math.min(face[i], face[(i + 1) % face.length]);
                const b = Math.max(face[i], face[(i + 1) % face.length]);
                edgeSet.add(`${a},${b}`);
            }
        }

        for (const edge of edgeSet) {
            const [a, b] = edge.split(',').map(Number);
            this.edges.push([a, b]);
        }

        this.generateUVCoordinates();
    }

    /**
     * Create a capsule mesh (cylinder with hemisphere caps)
     * @param {number} radius - Radius of the capsule
     * @param {number} height - Height of the cylindrical section
     * @param {number} segments - Number of segments
     */
    createCapsule(radius = 50, height = 150, segments = 16) {
        this.vertices = [];
        this.edges = [];
        this.faces = [];

        const h = height / 2;
        const rings = Math.floor(segments / 2);

        // Top hemisphere (Z > h)
        for (let lat = 0; lat <= rings; lat++) {
            const theta = (lat / rings) * (Math.PI / 2);
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let lon = 0; lon <= segments; lon++) {
                const phi = (lon / segments) * Math.PI * 2;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);

                const x = radius * sinTheta * cosPhi;
                const y = radius * sinTheta * sinPhi;
                const z = h + radius * cosTheta;

                this.vertices.push(new Vector3(x, y, z));
            }
        }

        // Cylindrical middle section - top ring (at Z = h)
        for (let lon = 0; lon <= segments; lon++) {
            const phi = (lon / segments) * Math.PI * 2;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);

            const x = radius * cosPhi;
            const y = radius * sinPhi;
            const z = h;

            this.vertices.push(new Vector3(x, y, z));
        }

        // Cylindrical middle section - bottom ring (at Z = -h)
        for (let lon = 0; lon <= segments; lon++) {
            const phi = (lon / segments) * Math.PI * 2;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);

            const x = radius * cosPhi;
            const y = radius * sinPhi;
            const z = -h;

            this.vertices.push(new Vector3(x, y, z));
        }

        // Bottom hemisphere (Z < -h)
        for (let lat = 0; lat <= rings; lat++) {
            const theta = (lat / rings) * (Math.PI / 2);
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let lon = 0; lon <= segments; lon++) {
                const phi = (lon / segments) * Math.PI * 2;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);

                const x = radius * sinTheta * cosPhi;
                const y = radius * sinTheta * sinPhi;
                const z = -h - radius * cosTheta;

                this.vertices.push(new Vector3(x, y, z));
            }
        }

        // Generate faces
        const topHemisphereOffset = 0;
        const topRingOffset = (rings + 1) * (segments + 1);
        const bottomRingOffset = topRingOffset + (segments + 1);
        const bottomHemisphereOffset = bottomRingOffset + (segments + 1);

        // Top hemisphere faces (CCW from outside)
        for (let lat = 0; lat < rings; lat++) {
            for (let lon = 0; lon < segments; lon++) {
                const first = topHemisphereOffset + lat * (segments + 1) + lon;
                const second = first + segments + 1;

                this.faces.push([first, second, first + 1]);
                this.faces.push([first + 1, second, second + 1]);
            }
        }

        // Cylindrical middle section (CCW from outside) - FIXED WINDING
        for (let lon = 0; lon < segments; lon++) {
            const topCurrent = topRingOffset + lon;
            const topNext = topRingOffset + lon + 1;
            const bottomCurrent = bottomRingOffset + lon;
            const bottomNext = bottomRingOffset + lon + 1;

            // Two triangles forming a quad (CCW from outside)
            this.faces.push([topCurrent, bottomCurrent, bottomNext]);
            this.faces.push([topCurrent, bottomNext, topNext]);
        }

        // Bottom hemisphere faces (CCW from outside)
        for (let lat = 0; lat < rings; lat++) {
            for (let lon = 0; lon < segments; lon++) {
                const first = bottomHemisphereOffset + lat * (segments + 1) + lon;
                const second = first + segments + 1;

                this.faces.push([first, first + 1, second]);
                this.faces.push([second, first + 1, second + 1]);
            }
        }

        // Generate edges
        const edgeSet = new Set();
        for (const face of this.faces) {
            for (let i = 0; i < face.length; i++) {
                const a = Math.min(face[i], face[(i + 1) % face.length]);
                const b = Math.max(face[i], face[(i + 1) % face.length]);
                edgeSet.add(`${a},${b}`);
            }
        }

        for (const edge of edgeSet) {
            const [a, b] = edge.split(',').map(Number);
            this.edges.push([a, b]);
        }

        this.generateUVCoordinates();
    }

    /**
     * Create a prism mesh (regular polygon extruded)
     * @param {number} sides - Number of sides
     * @param {number} radius - Radius of the base
     * @param {number} height - Height of the prism
     */
    createPrism(sides = 6, radius = 100, height = 150) {
        this.vertices = [];
        this.edges = [];
        this.faces = [];

        const h = height / 2;

        // Top vertices (circle in XY plane at Z = h)
        for (let i = 0; i < sides; i++) {
            const theta = (i / sides) * Math.PI * 2;
            const x = Math.cos(theta) * radius;
            const y = Math.sin(theta) * radius;
            this.vertices.push(new Vector3(x, y, h));
        }

        // Bottom vertices (circle in XY plane at Z = -h)
        for (let i = 0; i < sides; i++) {
            const theta = (i / sides) * Math.PI * 2;
            const x = Math.cos(theta) * radius;
            const y = Math.sin(theta) * radius;
            this.vertices.push(new Vector3(x, y, -h));
        }

        // Top face (CCW from above)
        const topFace = [];
        for (let i = 0; i < sides; i++) {
            topFace.push(i);
        }
        this.faces.push(topFace);

        // Bottom face (CCW from below)
        const bottomFace = [];
        for (let i = 0; i < sides; i++) {
            bottomFace.push(sides + i);
        }
        bottomFace.reverse();
        this.faces.push(bottomFace);

        // Side faces (quads, CCW from outside)
        for (let i = 0; i < sides; i++) {
            const next = (i + 1) % sides;
            const topCurrent = i;
            const topNext = next;
            const bottomCurrent = sides + i;
            const bottomNext = sides + next;

            // Quad face (CCW from outside): topCurrent -> bottomCurrent -> bottomNext -> topNext
            this.faces.push([topCurrent, bottomCurrent, bottomNext, topNext]);

            // Edges
            this.edges.push([topCurrent, topNext]);
            this.edges.push([bottomCurrent, bottomNext]);
            this.edges.push([topCurrent, bottomCurrent]);
        }

        this.generateUVCoordinates();
    }

    /**
     * Create a tetrahedron mesh (4-sided pyramid)
     * @param {number} size - Size of the tetrahedron
     */
    createTetrahedron(size = 100) {
        const s = size / Math.sqrt(2);

        // Create vertices in X=forward, Y=right, Z=up system
        this.vertices = [
            new Vector3(s, s, s),    // 0: front-right-top
            new Vector3(s, -s, -s),  // 1: front-left-bottom
            new Vector3(-s, s, -s),  // 2: back-right-bottom
            new Vector3(-s, -s, s)   // 3: back-left-top
        ];

        this.edges = [
            [0, 1], [0, 2], [0, 3],
            [1, 2], [1, 3], [2, 3]
        ];

        // All faces with CCW winding from outside
        this.faces = [
            [0, 1, 2], // Front-right face
            [0, 3, 1], // Front-top face
            [0, 2, 3], // Right-top face
            [3, 2, 1]  // Bottom-back face
        ];

        this.generateUVCoordinates();
    }

    /**
      * Create a subdivided quad (plane with subdivisions)
      * @param {number} width - Width of the quad
      * @param {number} height - Height of the quad
      * @param {number} subdivisionsX - Number of subdivisions along X axis
      * @param {number} subdivisionsY - Number of subdivisions along Y axis
      */
    createQuad(width = 200, height = 200, subdivisionsX = 4, subdivisionsY = 4) {
        this.vertices = [];
        this.edges = [];
        this.faces = [];

        const halfWidth = width / 2;
        const halfHeight = height / 2;

        // Generate vertices (ensure they lie flat on XY plane)
        for (let y = 0; y <= subdivisionsY; y++) {
            for (let x = 0; x <= subdivisionsX; x++) {
                const px = (x / subdivisionsX) * width - halfWidth;
                const py = (y / subdivisionsY) * height - halfHeight;
                // Force Z to 0 for flat plane
                this.vertices.push(new Vector3(px, py, 0));
            }
        }

        // Generate faces and edges
        for (let y = 0; y < subdivisionsY; y++) {
            for (let x = 0; x < subdivisionsX; x++) {
                const topLeft = y * (subdivisionsX + 1) + x;
                const topRight = topLeft + 1;
                const bottomLeft = (y + 1) * (subdivisionsX + 1) + x;
                const bottomRight = bottomLeft + 1;

                // Create quad face (counter-clockwise from front: top-left, top-right, bottom-right, bottom-left)
                this.faces.push([topLeft, topRight, bottomRight, bottomLeft]);

                // Create edges
                this.edges.push([topLeft, topRight]);
                this.edges.push([topLeft, bottomLeft]);
                if (x === subdivisionsX - 1) {
                    this.edges.push([topRight, bottomRight]);
                }
                if (y === subdivisionsY - 1) {
                    this.edges.push([bottomLeft, bottomRight]);
                }
            }
        }

        // Regenerate UV coordinates after changing mesh data
        this.generateUVCoordinates();
    }

    /**
      * Create a simple plane (single quad)
      * @param {number} size - Size of the plane
      */
    createPlane(size = 200) {
        const s = size / 2;

        // Plane in XY plane (perpendicular to Z axis)
        this.vertices = [
            new Vector3(-s, -s, 0), // back-left
            new Vector3(-s, s, 0),  // back-right
            new Vector3(s, s, 0),   // front-right
            new Vector3(s, -s, 0)   // front-left
        ];

        this.edges = [
            [0, 1], [1, 2], [2, 3], [3, 0]
        ];

        // Quad face (CCW from front/above)
        this.faces = [
            [3, 2, 1, 0]
        ];

        this.generateUVCoordinates();
    }

    /**
     * Create a custom editable model (starts as a sphere with vertex handles)
     * @param {number} radius - Initial radius
     * @param {number} detail - Detail level
     */
    createCustomModel(radius = 100, detail = 6) {
        // Start with a sphere as the base
        this.createSphere(radius, detail);

        // Mark this as a custom model
        this.isCustomModel = true;

        // Initialize vertex selection system
        this.selectedVertexIndex = -1;
        this.vertexHandleSize = 8;
        this.isDraggingVertex = false;

        // Store original vertices for reset functionality
        this.originalVertices = this.vertices.map(v => v.clone());
    }

    /**
      * Update the mesh shape based on current shape property
      */
    updateShape() {
        // Clear existing mesh data before creating new shape
        this.vertices = [];
        this.edges = [];
        this.faces = [];
        this.uvCoordinates = [];

        // Ensure _shape is set
        if (!this._shape) {
            // console.warn("Mesh3D: _shape is undefined, defaulting to cube");
            this._shape = "cube";
        }

        // Debug logging to track shape changes
        // console.log(`Mesh3D: Updating shape to: ${this._shape}`);
        // console.log(`Mesh3D: Current mesh data before update - vertices: ${this.vertices.length}, faces: ${this.faces.length}`);

        switch (this._shape) {
            case "cube":
                // console.log(`Mesh3D: Creating cube with size: ${this.cubeSize}`);
                this.createCube(this.cubeSize);
                break;
            case "pyramid":
                // console.log(`Mesh3D: Creating pyramid with base: ${this.pyramidBaseSize}, height: ${this.pyramidHeight}`);
                this.createPyramid(this.pyramidBaseSize, this.pyramidHeight);
                break;
            case "sphere":
                // console.log(`Mesh3D: Creating sphere with radius: ${this.sphereRadius}, detail: ${this.sphereDetail}`);
                this.createSphere(this.sphereRadius, this.sphereDetail);
                break;
            case "octahedron":
                // console.log(`Mesh3D: Creating octahedron with size: ${this.octahedronSize}`);
                this.createOctahedron(this.octahedronSize);
                break;
            case "torus":
                // console.log(`Mesh3D: Creating torus with major: ${this.torusMajorRadius}, minor: ${this.torusMinorRadius}`);
                this.createTorus(this.torusMajorRadius, this.torusMinorRadius, this.torusMajorSegments, this.torusMinorSegments);
                break;
            case "cone":
                // console.log(`Mesh3D: Creating cone with radius: ${this.coneRadius}, height: ${this.coneHeight}`);
                this.createCone(this.coneRadius, this.coneHeight, this.coneSegments);
                break;
            case "cylinder":
                // console.log(`Mesh3D: Creating cylinder with radius: ${this.cylinderRadius}, height: ${this.cylinderHeight}`);
                this.createCylinder(this.cylinderRadius, this.cylinderHeight, this.cylinderSegments);
                break;
            case "icosahedron":
                // console.log(`Mesh3D: Creating icosahedron with size: ${this.icosahedronSize}`);
                this.createIcosahedron(this.icosahedronSize);
                break;
            case "quad":
                // console.log(`Mesh3D: Creating quad with width: ${this.quadWidth}, height: ${this.quadHeight}`);
                this.createQuad(this.quadWidth, this.quadHeight, this.quadSubdivisionsX, this.quadSubdivisionsY);
                break;
            case "plane":
                // console.log(`Mesh3D: Creating plane with size: ${this.planeSize}`);
                this.createPlane(this.planeSize);
                break;
            case "quadCube":
                this.createQuadCube(this.quadCubeSize, this.quadCubeSubdivisions);
                break;
            case "capsule":
                this.createCapsule(this.capsuleRadius, this.capsuleHeight, this.capsuleSegments);
                break;
            case "prism":
                this.createPrism(this.prismSides, this.prismRadius, this.prismHeight);
                break;
            case "tetrahedron":
                this.createTetrahedron(this.tetrahedronSize);
                break;
            case "custom":
                // console.log(`Mesh3D: Creating custom editable model`);
                this.createCustomModel(this.sphereRadius, this.sphereDetail);
                break;
            default:
                // console.warn(`Mesh3D: Unknown shape "${this._shape}", defaulting to cube`);
                this.createCube(this.cubeSize);
        }

        // Ensure UV coordinates are generated for the new shape
        if (this.vertices.length > 0) {
            this.generateUVCoordinates();
            // console.log(`Mesh3D: Generated ${this.vertices.length} vertices, ${this.faces.length} faces for ${this._shape}`);
        } else {
            // console.warn(`Mesh3D: No vertices generated for shape ${this._shape}`);
        }
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

    drawGizmos(ctx) {
        ctx.save();
        ctx.translate(this.gameObject.position.x, this.gameObject.position.y);
        ctx.rotate((this.gameObject.angle * Math.PI) / 180);
        ctx.scale(this.gameObject.scale.x, this.gameObject.scale.y);
        this.draw2DVisualization(ctx);
        ctx.restore();
    }

    /**
     * Draw the mesh to the canvas
     * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on
     */
    draw(ctx) {
        // Find an active camera
        const camera = this.findActiveCamera();
        if (!camera) {
            return;
        }

        // Use render texture method if camera supports it
        if (camera.getRenderTextureContext && camera.render3D) {
            this.drawToRenderTexture(camera.getRenderTextureContext(), camera);
        } else {
            // Fallback to direct drawing
            this.drawDirect(ctx, camera);
        }

        // Draw vertex handles for custom models
        if (this.isCustomModel && this._shape === "custom") {
            this.drawVertexHandles(ctx, camera);
        }
    }

    /**
     * Draw a 2D visualization of the mesh shape when no camera is available
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     */
    draw2DVisualization(ctx) {
        ctx.strokeStyle = this.wireframeColor;
        ctx.fillStyle = this.faceColor;
        ctx.lineWidth = 2;

        switch (this._shape) {
            case "cube":
                this.draw2DCube(ctx);
                break;
            case "pyramid":
                this.draw2DPyramid(ctx);
                break;
            case "sphere":
                this.draw2DSphere(ctx);
                break;
            case "octahedron":
                this.draw2DOctahedron(ctx);
                break;
            case "torus":
                this.draw2DTorus(ctx);
                break;
            case "cone":
                this.draw2DCone(ctx);
                break;
            case "cylinder":
                this.draw2DCylinder(ctx);
                break;
            case "icosahedron":
                this.draw2DIcosahedron(ctx);
                break;
            case "quad":
            case "plane":
                this.draw2DPlane(ctx);
                break;
            case "custom":
                this.draw2DCustom(ctx);
                break;
            default:
                this.drawPlaceholder(ctx);
        }

        if (this._shape === "quadCube") {
            this.draw2DCube(ctx); // Reuse cube visualization
        }

        if (this._shape === "capsule") {
            this.draw2DCapsule(ctx);
        }

        if (this._shape === "prism") {
            this.draw2DPrism(ctx);
        }

        if (this._shape === "tetrahedron") {
            this.draw2DTetrahedron(ctx);
        }
    }

    /**
     * Draw 2D cube visualization - Top-down isometric view
     */
    draw2DCube(ctx) {
        const s = this.cubeSize / 2;
        const isoOffset = s * 0.4; // Isometric offset for depth

        // Draw top face (visible from top)
        ctx.fillStyle = this.faceColor;
        ctx.beginPath();
        ctx.moveTo(0, -s - isoOffset); // Top point
        ctx.lineTo(s, -isoOffset);      // Right point
        ctx.lineTo(0, s - isoOffset);   // Bottom point
        ctx.lineTo(-s, -isoOffset);     // Left point
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw front face (front side)
        ctx.fillStyle = this.faceColor;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(-s, -isoOffset);  // Top left
        ctx.lineTo(s, -isoOffset);   // Top right
        ctx.lineTo(s, s);            // Bottom right
        ctx.lineTo(-s, s);           // Bottom left
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw right face (right side)
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(s, -isoOffset);       // Top
        ctx.lineTo(0, s - isoOffset);    // Bottom inner
        ctx.lineTo(0, s + s - isoOffset); // Bottom outer
        ctx.lineTo(s, s);                // Front bottom
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.globalAlpha = 1.0;
    }

    /**
     * Draw 2D pyramid visualization - Top-down view
     */
    draw2DPyramid(ctx) {
        const base = this.pyramidBaseSize / 2;
        const isoOffset = this.pyramidHeight * 0.3; // Depth based on height

        // Draw apex point (top of pyramid)
        ctx.fillStyle = this.faceColor;
        ctx.globalAlpha = 0.9;

        // Draw front faces
        ctx.beginPath();
        ctx.moveTo(0, -isoOffset); // Apex
        ctx.lineTo(-base, base);   // Bottom left
        ctx.lineTo(base, base);    // Bottom right
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw back face
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(0, -isoOffset);  // Apex
        ctx.lineTo(-base, base);    // Left
        ctx.lineTo(-base, -base);   // Back left
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(0, -isoOffset);  // Apex
        ctx.lineTo(base, base);     // Right
        ctx.lineTo(base, -base);    // Back right
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw base square
        ctx.globalAlpha = 0.5;
        ctx.strokeRect(-base, -base, this.pyramidBaseSize, this.pyramidBaseSize);

        ctx.globalAlpha = 1.0;
    }

    /**
     * Draw 2D sphere visualization - Top-down view (equator circle)
     */
    draw2DSphere(ctx) {
        // Draw the sphere as a circle from top-down (equator view)
        ctx.fillStyle = this.faceColor;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(0, 0, this.sphereRadius / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.stroke();

        // Draw latitude lines (concentric circles)
        ctx.strokeStyle = this.wireframeColor;
        ctx.globalAlpha = 0.3;
        const segments = Math.min(this.sphereDetail, 8);
        for (let i = 1; i < segments; i++) {
            const radius = (i / segments) * (this.sphereRadius / 2);
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw longitude lines (cross)
        ctx.beginPath();
        ctx.moveTo(-this.sphereRadius / 2, 0);
        ctx.lineTo(this.sphereRadius / 2, 0);
        ctx.moveTo(0, -this.sphereRadius / 2);
        ctx.lineTo(0, this.sphereRadius / 2);
        ctx.stroke();

        ctx.globalAlpha = 1.0;
    }

    /**
     * Draw 2D octahedron visualization - Top-down view (diamond shape at equator)
     */
    draw2DOctahedron(ctx) {
        const s = this.octahedronSize;

        // Draw equator diamond (middle cross-section)
        ctx.fillStyle = this.faceColor;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s, 0);
        ctx.lineTo(0, s);
        ctx.lineTo(-s, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw inner lines to show 3D structure
        ctx.strokeStyle = this.wireframeColor;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(-s, 0);
        ctx.lineTo(s, 0);
        ctx.moveTo(0, -s);
        ctx.lineTo(0, s);
        ctx.stroke();

        ctx.globalAlpha = 1.0;
    }

    /**
     * Draw 2D torus visualization - Top-down view (donut shape)
     */
    draw2DTorus(ctx) {
        const major = this.torusMajorRadius;
        const minor = this.torusMinorRadius;

        // Fill the ring area
        ctx.fillStyle = this.faceColor;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(0, 0, major + minor, 0, Math.PI * 2);
        ctx.arc(0, 0, major - minor, 0, Math.PI * 2, true);
        ctx.fill();

        ctx.globalAlpha = 1.0;

        // Outer circle
        ctx.strokeStyle = this.wireframeColor;
        ctx.beginPath();
        ctx.arc(0, 0, major + minor, 0, Math.PI * 2);
        ctx.stroke();

        // Inner circle
        ctx.beginPath();
        ctx.arc(0, 0, major - minor, 0, Math.PI * 2);
        ctx.stroke();

        // Draw cross lines to show tube detail
        ctx.globalAlpha = 0.3;
        const segments = Math.min(this.torusMinorSegments, 8);
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x1 = Math.cos(angle) * (major - minor);
            const y1 = Math.sin(angle) * (major - minor);
            const x2 = Math.cos(angle) * (major + minor);
            const y2 = Math.sin(angle) * (major + minor);

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        ctx.globalAlpha = 1.0;
    }

    /**
     * Draw 2D cone visualization - Top-down view showing base circle and apex point
     */
    draw2DCone(ctx) {
        const r = this.coneRadius;
        const apexOffset = this.coneHeight * 0.2; // Visual offset for apex

        // Draw base circle
        ctx.fillStyle = this.faceColor;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.stroke();

        // Draw lines from apex to base edge (showing cone structure)
        ctx.strokeStyle = this.wireframeColor;
        ctx.globalAlpha = 0.5;
        const segments = 8;
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;

            ctx.beginPath();
            ctx.moveTo(0, -apexOffset); // Apex point
            ctx.lineTo(x, y);           // Base edge
            ctx.stroke();
        }

        // Draw apex point
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = this.wireframeColor;
        ctx.beginPath();
        ctx.arc(0, -apexOffset, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Draw 2D cylinder visualization - Top-down view showing circular cross-section
     */
    draw2DCylinder(ctx) {
        const r = this.cylinderRadius;

        // Draw cylinder as a circle from top (showing the circular cross-section)
        ctx.fillStyle = this.faceColor;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.stroke();

        // Draw lines to indicate cylindrical segments
        ctx.strokeStyle = this.wireframeColor;
        ctx.globalAlpha = 0.3;
        const segments = Math.min(this.cylinderSegments, 8);
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(x, y);
            ctx.stroke();
        }

        // Draw concentric circles to show height
        ctx.globalAlpha = 0.2;
        for (let i = 1; i <= 2; i++) {
            ctx.beginPath();
            ctx.arc(0, 0, (i / 3) * r, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.globalAlpha = 1.0;
    }

    /**
     * Draw 2D icosahedron visualization - Top-down view (pentagonal cross-section)
     */
    draw2DIcosahedron(ctx) {
        const s = this.icosahedronSize;
        const segments = 5; // Pentagon for icosahedron

        // Draw pentagonal cross-section
        ctx.fillStyle = this.faceColor;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * s;
            const y = Math.sin(angle) * s;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.stroke();

        // Draw inner star pattern
        ctx.strokeStyle = this.wireframeColor;
        ctx.globalAlpha = 0.4;
        for (let i = 0; i < segments; i++) {
            const angle1 = (i / segments) * Math.PI * 2 - Math.PI / 2;
            const angle2 = ((i + 2) % segments / segments) * Math.PI * 2 - Math.PI / 2;
            const x1 = Math.cos(angle1) * s;
            const y1 = Math.sin(angle1) * s;
            const x2 = Math.cos(angle2) * s;
            const y2 = Math.sin(angle2) * s;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        ctx.globalAlpha = 1.0;
    }

    /**
     * Draw 2D capsule visualization
     */
    draw2DCapsule(ctx) {
        const r = this.capsuleRadius;
        const h = this.capsuleHeight / 2;

        // Draw capsule body (rectangle)
        ctx.fillStyle = this.faceColor;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(-r, -h, r * 2, h * 2);
        ctx.globalAlpha = 1.0;
        ctx.strokeRect(-r, -h, r * 2, h * 2);

        // Draw top hemisphere
        ctx.beginPath();
        ctx.arc(0, -h, r, 0, Math.PI, true);
        ctx.fill();
        ctx.stroke();

        // Draw bottom hemisphere
        ctx.beginPath();
        ctx.arc(0, h, r, 0, Math.PI);
        ctx.fill();
        ctx.stroke();
    }

    /**
     * Draw 2D prism visualization
     */
    draw2DPrism(ctx) {
        const r = this.prismRadius;
        const sides = this.prismSides;

        // Draw polygon
        ctx.fillStyle = this.faceColor;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.stroke();

        // Draw center lines
        ctx.strokeStyle = this.wireframeColor;
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
    }

    /**
     * Draw 2D tetrahedron visualization
     */
    draw2DTetrahedron(ctx) {
        const s = this.tetrahedronSize;

        // Draw triangle from top view
        ctx.fillStyle = this.faceColor;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.866, s * 0.5);
        ctx.lineTo(-s * 0.866, s * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.stroke();

        // Draw internal lines
        ctx.strokeStyle = this.wireframeColor;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -s);
        ctx.moveTo(0, 0);
        ctx.lineTo(s * 0.866, s * 0.5);
        ctx.moveTo(0, 0);
        ctx.lineTo(-s * 0.866, s * 0.5);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }

    /**
     * Draw 2D plane/quad visualization - Top-down view showing full dimensions
     */
    draw2DPlane(ctx) {
        const w = this._shape === "quad" ? this.quadWidth / 2 : this.planeSize / 2;
        const h = this._shape === "quad" ? this.quadHeight / 2 : this.planeSize / 2;

        // Draw filled rectangle
        ctx.fillStyle = this.faceColor;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(-w, -h, w * 2, h * 2);
        ctx.globalAlpha = 1.0;
        ctx.strokeRect(-w, -h, w * 2, h * 2);

        // Draw subdivision lines for quad
        if (this._shape === "quad") {
            ctx.strokeStyle = this.wireframeColor;
            ctx.globalAlpha = 0.3;

            // Vertical lines
            for (let i = 1; i < this.quadSubdivisionsX; i++) {
                const x = -w + (i / this.quadSubdivisionsX) * w * 2;
                ctx.beginPath();
                ctx.moveTo(x, -h);
                ctx.lineTo(x, h);
                ctx.stroke();
            }

            // Horizontal lines
            for (let i = 1; i < this.quadSubdivisionsY; i++) {
                const y = -h + (i / this.quadSubdivisionsY) * h * 2;
                ctx.beginPath();
                ctx.moveTo(-w, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }

            ctx.globalAlpha = 1.0;
        } else {
            // Draw center cross for plane
            ctx.strokeStyle = this.wireframeColor;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.moveTo(-w, 0);
            ctx.lineTo(w, 0);
            ctx.moveTo(0, -h);
            ctx.lineTo(0, h);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
    }

    /**
     * Draw 2D custom model visualization - Top-down view with indicator
     */
    draw2DCustom(ctx) {
        // Calculate bounds of custom model
        let maxDist = 50; // Default
        if (this.vertices && this.vertices.length > 0) {
            maxDist = 0;
            for (const v of this.vertices) {
                const dist = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
                maxDist = Math.max(maxDist, dist);
            }
        }

        // Draw bounding circle
        ctx.strokeStyle = this.wireframeColor;
        ctx.fillStyle = this.faceColor;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(0, 0, maxDist, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.stroke();

        // Draw vertex count indicator
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const vertCount = this.vertices ? this.vertices.length : 0;
        ctx.fillText(`CUSTOM (${vertCount}v)`, 0, 0);
    }

    /**
     * Draw directly to a canvas context (fallback method)
     * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on
     * @param {Camera3D} camera - The camera to use for projection
     */
    drawDirect(ctx, camera) {
        const transformedVertices = this.transformVertices();
        const projectedVertices = transformedVertices.map(vertex =>
            camera.projectPoint(vertex)
        );

        // Calculate camera-to-face distance for proper depth sorting
        const sortedFaces = [...this.faces]
            .map((face, index) => {
                // Calculate average depth from camera
                let avgDepth = 0;
                let validVerts = 0;

                for (const vertexIndex of face) {
                    if (vertexIndex < transformedVertices.length) {
                        const vert = transformedVertices[vertexIndex];
                        // Distance along camera's forward direction (X-axis)
                        avgDepth += vert.x;
                        validVerts++;
                    }
                }

                if (validVerts > 0) {
                    avgDepth /= validVerts;
                }

                return { face, avgDepth };
            })
            .sort((a, b) => a.avgDepth - b.avgDepth) // Sort front-to-back (smaller X = closer)
            .map(item => item.face);

        // Draw faces in sorted order
        if (this.renderMode === "solid" || this.renderMode === "both") {
            for (const face of sortedFaces) {
                if (face.length < 3) continue;

                // Check if all vertices are visible
                const isVisible = face.every(vertexIndex =>
                    projectedVertices[vertexIndex] !== null &&
                    vertexIndex < projectedVertices.length
                );
                if (!isVisible) continue;

                // Backface culling check
                const normal = this.calculateFaceNormal(face, transformedVertices);
                const faceCenter = this.getFaceCenter(face, transformedVertices);
                const viewDir = camera.position ?
                    camera.position.clone().subtract(faceCenter).normalize() :
                    new Vector3(-1, 0, 0); // Default view direction if no camera position

                // If face normal points away from camera, skip it (backface)
                if (normal.dot(viewDir) < 0) continue;

                const faceColor = this.getMaterialColor(face, transformedVertices, camera);

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
        const transformedVertices = this.transformVertices();
        const projectedVertices = transformedVertices.map(vertex =>
            camera.projectPoint(vertex)
        );

        // Calculate camera-to-face distance for proper depth sorting
        const sortedFaces = [...this.faces]
            .map((face, index) => {
                // Calculate average depth from camera
                let avgDepth = 0;
                let validVerts = 0;

                for (const vertexIndex of face) {
                    if (vertexIndex < transformedVertices.length) {
                        const vert = transformedVertices[vertexIndex];
                        // Distance along camera's forward direction (X-axis)
                        avgDepth += vert.x;
                        validVerts++;
                    }
                }

                if (validVerts > 0) {
                    avgDepth /= validVerts;
                }

                return { face, avgDepth };
            })
            .sort((a, b) => a.avgDepth - b.avgDepth) // Sort front-to-back (smaller X = closer)
            .map(item => item.face);

        // Draw faces in sorted order
        if (this.renderMode === "solid" || this.renderMode === "both") {
            for (const face of sortedFaces) {
                if (face.length < 3) continue;

                const validVertices = [];
                for (const vertexIndex of face) {
                    if (vertexIndex < projectedVertices.length &&
                        projectedVertices[vertexIndex] !== null) {
                        validVertices.push(projectedVertices[vertexIndex]);
                    }
                }

                if (validVertices.length < 3) continue;

                // Backface culling check
                const normal = this.calculateFaceNormal(face, transformedVertices);
                const faceCenter = this.getFaceCenter(face, transformedVertices);
                const viewDir = camera.position ?
                    camera.position.clone().subtract(faceCenter).normalize() :
                    new Vector3(-1, 0, 0);

                // If face normal points away from camera, skip it (backface)
                if (normal.dot(viewDir) < 0) continue;

                const faceColor = this.getMaterialColor(face, transformedVertices, camera);

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

        // Debug logging to help diagnose camera issues
        // console.log(`Mesh3D: Looking for active camera among ${allObjects.length} game objects`);

        for (const obj of allObjects) {
            const camera = obj.getModule("Camera3DRasterizer") || obj.getModule("Camera3D");
            if (camera) {
                // console.log(`Mesh3D: Found camera on object ${obj.name || 'unnamed'}, isActive: ${camera.isActive}`);
                if (camera.isActive) {
                    // console.log(`Mesh3D: Found active camera!`);
                    return camera;
                }
            }
        }

        // console.log(`Mesh3D: No active camera found`);
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
     * Update method called each frame
     */
    update() {
        // Handle custom model interactions if enabled
        if (this.isCustomModel && this._shape === "custom") {
            this.handleCustomModelInput();
        }
    }

    /**
     * Handle input for custom model editing
     */
    handleCustomModelInput() {
        // Get input manager if available
        const inputManager = this.gameObject?.scene?.engine?.inputManager;
        if (!inputManager) return;

        const mouseX = inputManager.mouseX;
        const mouseY = inputManager.mouseY;

        // Handle mouse down
        if (inputManager.isMousePressed(0) && !this.isDraggingVertex) {
            this.onMouseDown(mouseX, mouseY);
        }

        // Handle mouse move while dragging
        if (this.isDraggingVertex && inputManager.isMouseDown(0)) {
            const deltaX = inputManager.mouseDeltaX || 0;
            const deltaY = inputManager.mouseDeltaY || 0;
            this.onMouseMove(mouseX, mouseY, deltaX, deltaY);
        }

        // Handle mouse up
        if (!inputManager.isMouseDown(0) && this.isDraggingVertex) {
            this.onMouseUp();
        }
    }

    /**
     * Draw vertex handles for custom model editing
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     * @param {Camera3D} camera - The active camera
     */
    drawVertexHandles(ctx, camera) {
        if (!this.isCustomModel) return;

        const transformedVertices = this.transformVertices();
        const projectedVertices = transformedVertices.map(vertex => camera.projectPoint(vertex));

        // Draw green squares at each vertex
        ctx.fillStyle = '#00ff00';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        for (let i = 0; i < projectedVertices.length; i++) {
            const projected = projectedVertices[i];
            if (!projected) continue;

            const halfSize = this.vertexHandleSize / 2;

            // Highlight selected vertex
            if (i === this.selectedVertexIndex) {
                ctx.fillStyle = '#ffff00';
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 3;
            } else {
                ctx.fillStyle = '#00ff00';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
            }

            ctx.fillRect(projected.x - halfSize, projected.y - halfSize, this.vertexHandleSize, this.vertexHandleSize);
            ctx.strokeRect(projected.x - halfSize, projected.y - halfSize, this.vertexHandleSize, this.vertexHandleSize);
        }
    }

    /**
     * Handle mouse down for vertex selection
     * @param {number} mouseX - Mouse X position
     * @param {number} mouseY - Mouse Y position
     * @returns {boolean} - True if a vertex was selected
     */
    onMouseDown(mouseX, mouseY) {
        if (!this.isCustomModel || this._shape !== "custom") return false;

        const camera = this.findActiveCamera();
        if (!camera) return false;

        const transformedVertices = this.transformVertices();
        const projectedVertices = transformedVertices.map(vertex => camera.projectPoint(vertex));

        // Check if click is near any vertex
        for (let i = 0; i < projectedVertices.length; i++) {
            const projected = projectedVertices[i];
            if (!projected) continue;

            const dx = mouseX - projected.x;
            const dy = mouseY - projected.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.vertexHandleSize) {
                this.selectedVertexIndex = i;
                this.isDraggingVertex = true;
                return true;
            }
        }

        this.selectedVertexIndex = -1;
        return false;
    }

    /**
     * Handle mouse move for vertex dragging
     * @param {number} mouseX - Mouse X position
     * @param {number} mouseY - Mouse Y position
     * @param {number} deltaX - Mouse movement X
     * @param {number} deltaY - Mouse movement Y
     * @returns {boolean} - True if vertex was moved
     */
    onMouseMove(mouseX, mouseY, deltaX, deltaY) {
        if (!this.isCustomModel || !this.isDraggingVertex || this.selectedVertexIndex === -1) return false;

        const camera = this.findActiveCamera();
        if (!camera) return false;

        // Move vertex in world space based on camera orientation
        const vertex = this.vertices[this.selectedVertexIndex];

        // Simple screen-space to world-space conversion
        // This is a basic implementation - could be improved with proper unprojection
        const moveScale = 1.0;
        vertex.x += deltaX * moveScale;
        vertex.y += deltaY * moveScale;

        return true;
    }

    /**
     * Handle mouse up to stop dragging
     */
    onMouseUp() {
        if (!this.isCustomModel) return false;

        const wasDragging = this.isDraggingVertex;
        this.isDraggingVertex = false;
        return wasDragging;
    }

    /**
     * Reset custom model to original sphere shape
     */
    resetCustomModel() {
        if (!this.isCustomModel || !this.originalVertices) return;

        this.vertices = this.originalVertices.map(v => v.clone());
        this.selectedVertexIndex = -1;
        this.isDraggingVertex = false;
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
            _shape: this._shape,
            cubeSize: this.cubeSize,
            pyramidBaseSize: this.pyramidBaseSize,
            pyramidHeight: this.pyramidHeight,
            sphereRadius: this.sphereRadius,
            sphereDetail: this.sphereDetail,
            octahedronSize: this.octahedronSize,
            torusMajorRadius: this.torusMajorRadius,
            torusMinorRadius: this.torusMinorRadius,
            torusMajorSegments: this.torusMajorSegments,
            torusMinorSegments: this.torusMinorSegments,
            coneRadius: this.coneRadius,
            coneHeight: this.coneHeight,
            coneSegments: this.coneSegments,
            cylinderRadius: this.cylinderRadius,
            cylinderHeight: this.cylinderHeight,
            cylinderSegments: this.cylinderSegments,
            icosahedronSize: this.icosahedronSize,
            quadCubeSize: this.quadCubeSize,
            quadCubeSubdivisions: this.quadCubeSubdivisions,
            capsuleRadius: this.capsuleRadius,
            capsuleHeight: this.capsuleHeight,
            capsuleSegments: this.capsuleSegments,
            prismSides: this.prismSides,
            prismRadius: this.prismRadius,
            prismHeight: this.prismHeight,
            tetrahedronSize: this.tetrahedronSize,
            quadWidth: this.quadWidth,
            quadHeight: this.quadHeight,
            quadSubdivisionsX: this.quadSubdivisionsX,
            quadSubdivisionsY: this.quadSubdivisionsY,
            planeSize: this.planeSize,
            isCustomModel: this.isCustomModel,
            originalVertices: this.originalVertices ? this.originalVertices.map(v => ({ x: v.x, y: v.y, z: v.z })) : null,
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

        // Restore shape and shape-specific properties
        if (json._shape !== undefined) this._shape = json._shape;
        if (json.cubeSize !== undefined) this.cubeSize = json.cubeSize;
        if (json.pyramidBaseSize !== undefined) this.pyramidBaseSize = json.pyramidBaseSize;
        if (json.pyramidHeight !== undefined) this.pyramidHeight = json.pyramidHeight;
        if (json.sphereRadius !== undefined) this.sphereRadius = json.sphereRadius;
        if (json.sphereDetail !== undefined) this.sphereDetail = json.sphereDetail;
        if (json.octahedronSize !== undefined) this.octahedronSize = json.octahedronSize;
        if (json.torusMajorRadius !== undefined) this.torusMajorRadius = json.torusMajorRadius;
        if (json.torusMinorRadius !== undefined) this.torusMinorRadius = json.torusMinorRadius;
        if (json.torusMajorSegments !== undefined) this.torusMajorSegments = json.torusMajorSegments;
        if (json.torusMinorSegments !== undefined) this.torusMinorSegments = json.torusMinorSegments;
        if (json.coneRadius !== undefined) this.coneRadius = json.coneRadius;
        if (json.coneHeight !== undefined) this.coneHeight = json.coneHeight;
        if (json.coneSegments !== undefined) this.coneSegments = json.coneSegments;
        if (json.cylinderRadius !== undefined) this.cylinderRadius = json.cylinderRadius;
        if (json.cylinderHeight !== undefined) this.cylinderHeight = json.cylinderHeight;
        if (json.cylinderSegments !== undefined) this.cylinderSegments = json.cylinderSegments;
        if (json.icosahedronSize !== undefined) this.icosahedronSize = json.icosahedronSize;
        if (json.quadCubeSize !== undefined) this.quadCubeSize = json.quadCubeSize;
        if (json.quadCubeSubdivisions !== undefined) this.quadCubeSubdivisions = json.quadCubeSubdivisions;
        if (json.capsuleRadius !== undefined) this.capsuleRadius = json.capsuleRadius;
        if (json.capsuleHeight !== undefined) this.capsuleHeight = json.capsuleHeight;
        if (json.capsuleSegments !== undefined) this.capsuleSegments = json.capsuleSegments;
        if (json.prismSides !== undefined) this.prismSides = json.prismSides;
        if (json.prismRadius !== undefined) this.prismRadius = json.prismRadius;
        if (json.prismHeight !== undefined) this.prismHeight = json.prismHeight;
        if (json.tetrahedronSize !== undefined) this.tetrahedronSize = json.tetrahedronSize;
        if (json.quadWidth !== undefined) this.quadWidth = json.quadWidth;
        if (json.quadHeight !== undefined) this.quadHeight = json.quadHeight;
        if (json.quadSubdivisionsX !== undefined) this.quadSubdivisionsX = json.quadSubdivisionsX;
        if (json.quadSubdivisionsY !== undefined) this.quadSubdivisionsY = json.quadSubdivisionsY;
        if (json.planeSize !== undefined) this.planeSize = json.planeSize;
        if (json.isCustomModel !== undefined) this.isCustomModel = json.isCustomModel;
        if (json.originalVertices) {
            this.originalVertices = json.originalVertices.map(v => new Vector3(v.x, v.y, v.z));
        }

        // Update shape after loading properties
        if (json._shape) {
            this.updateShape();
        }

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

    get shape() { return this._shape; }
    set shape(value) {
        // console.log(`Mesh3D: Shape setter called with value: ${value}`);
        this._shape = value;
    }
}

// Register the Mesh3D module
window.Mesh3D = Mesh3D;
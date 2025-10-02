/**
 * Camera3D - Module for 3D perspective cameras
 * 
 * This module provides 3D camera functionality with multiple rendering methods.
 * Supports: Painter's Algorithm, Z-Buffer, Scanline, and Raytracing.
 */
class Camera3D extends Module {
    static namespace = "WIP";

    constructor() {
        super("Camera3D");

        this._renderTextureGL = null;
        this._renderTextureGLCtx = null;
        this._useWebGLAcceleration = false;

        this._position = new Vector3(0, 0, 0);
        this._rotation = new Vector3(0, 0, 0);
        this._fieldOfView = 60;
        this._nearPlane = 0.1;
        this._farPlane = 5000;
        this._isActive = false;
        this._backgroundColor = "#000000";
        this._skyColor = "#87CEEB";  // Sky blue
        this._floorColor = "#8B4513"; // Brown
        this._backgroundType = "skyfloor"; // "skyfloor", "transparent", "solid"
        this._renderTextureWidth = 320;
        this._renderTextureHeight = 240;
        this._renderTextureSmoothing = false;
        this._renderTexture = null;
        this._renderTextureCtx = null;
        this.viewportWidth = 800;
        this.viewportHeight = 600;
        this.drawGizmoInRuntime = false;
        this._renderingMethod = "raster";
        this._enableBackfaceCulling = false;
        this._disableCulling = true;
        this._cullingFieldOfView = 60; // Use same FOV as main camera for consistent culling
        this._zBuffer = null;
        this._imageData = null;

        this._lightDirection = new Vector3(1, -1, -1); // Default light direction
        this._lightColor = "#ffffff";
        this._lightIntensity = 1.0;
        this._ambientIntensity = 0.3;

        // Depth of field properties
        this._depthOfFieldEnabled = false;
        this._focalDistance = 100;
        this._aperture = 50;
        this._maxBlurRadius = 3;

        this.exposeProperty("position", "vector3", this._position, {
            onChange: (val) => this._position = val
        });
        this.exposeProperty("rotation", "vector3", this._rotation, {
            onChange: (val) => this._rotation = val
        });
        this.exposeProperty("fieldOfView", "number", 60, {
            min: 1, max: 179, onChange: (val) => this._fieldOfView = val
        });
        this.exposeProperty("nearPlane", "number", 0.1, {
            min: 0.01, max: 10, step: 0.01, onChange: (val) => this._nearPlane = val
        });
        this.exposeProperty("farPlane", "number", 1000, {
            min: 10, max: 10000, step: 1, onChange: (val) => this._farPlane = val
        });
        this.exposeProperty("isActive", "boolean", false, {
            onChange: (val) => {
                this._isActive = val;
                if (val) this.setAsActiveCamera();
            }
        });

        this.exposeProperty("lightDirection", "vector3", this._lightDirection, {
            onChange: (val) => this._lightDirection = val
        });
        this.exposeProperty("lightColor", "color", "#ffffff", {
            onChange: (val) => this._lightColor = val
        });
        this.exposeProperty("lightIntensity", "number", 1.0, {
            min: 0, max: 2, step: 0.1, onChange: (val) => this._lightIntensity = val
        });
        this.exposeProperty("ambientIntensity", "number", 0.3, {
            min: 0, max: 1, step: 0.05, onChange: (val) => this._ambientIntensity = val
        });

        /*this.exposeProperty("depthOfFieldEnabled", "boolean", false, {
            onChange: (val) => this._depthOfFieldEnabled = val
        });
        this.exposeProperty("focalDistance", "number", 100, {
            min: 1, max: 1000, step: 1, onChange: (val) => this._focalDistance = val
        });
        this.exposeProperty("aperture", "number", 50, {
            min: 1, max: 200, step: 1, onChange: (val) => this._aperture = val
        });
        this.exposeProperty("maxBlurRadius", "number", 3, {
            min: 1, max: 10, step: 0.5, onChange: (val) => this._maxBlurRadius = val
        });*/

        this.exposeProperty("backgroundColor", "color", "#000000", {
            onChange: (val) => this._backgroundColor = val
        });
        this.exposeProperty("skyColor", "color", "#87CEEB", {
            onChange: (val) => this._skyColor = val
        });
        this.exposeProperty("floorColor", "color", "#8B4513", {
            onChange: (val) => this._floorColor = val
        });
        this.exposeProperty("backgroundType", "dropdown", "skyfloor", {
            options: ["skyfloor", "transparent", "solid"],
            onChange: (val) => this._backgroundType = val
        });
        this.exposeProperty("drawGizmoInRuntime", "boolean", false, {
            onChange: (val) => this.drawGizmoInRuntime = val
        });
        this.exposeProperty("renderTextureWidth", "number", 320, {
            min: 64, max: 2048, step: 64,
            onChange: (val) => {
                this._renderTextureWidth = this._renderingMethod === "raytrace" ? Math.min(val, 160) : val;
                this.updateRenderTexture();
            }
        });
        this.exposeProperty("renderTextureHeight", "number", 240, {
            min: 64, max: 2048, step: 64,
            onChange: (val) => {
                this._renderTextureHeight = this._renderingMethod === "raytrace" ? Math.min(val, 120) : val;
                this.updateRenderTexture();
            }
        });
        this.exposeProperty("renderTextureSmoothing", "boolean", false, {
            onChange: (val) => this._renderTextureSmoothing = val
        });
        this.exposeProperty("renderingMethod", "dropdown", "raster", {
            options: ["raster", "zbuffer", "depthpass", "painter", "hybrid", "webglcanvas", "doom", "ilpc", "fald"],
            onChange: (val) => {
                this._renderingMethod = val;
                if (val === "raytrace") {
                    this._renderTextureWidth = Math.min(this._renderTextureWidth, 160);
                    this._renderTextureHeight = Math.min(this._renderTextureHeight, 120);
                    this.updateRenderTexture();
                }
            }
        });
        this.exposeProperty("enableBackfaceCulling", "boolean", false, {
            onChange: (val) => this._enableBackfaceCulling = val
        });
        this.exposeProperty("disableCulling", "boolean", false, {
            onChange: (val) => this._disableCulling = val
        });
        this.exposeProperty("cullingFieldOfView", "number", 90, {
            min: 1, max: 179, onChange: (val) => this._cullingFieldOfView = val
        });

        this.updateRenderTexture();
    }

    setAsActiveCamera() {
        if (!this.gameObject) return;
        const allObjects = this.getGameObjects();
        allObjects.forEach(obj => {
            const camera = obj.getModule("Camera3D");
            if (camera && camera !== this) camera._isActive = false;
        });
        this._isActive = true;
    }

    getGameObjects() {
        if (!this.gameObject) return [];
        return this.getAllGameObjects();
    }

    projectPoint(point) {
        const cameraPoint = this.worldToCameraSpace(point);
        const depth = -cameraPoint.z;  // Use Z as depth (negative because camera looks down -Z)
        if (depth <= this.nearPlane || depth >= this.farPlane) return null;
        const aspect = this.viewportWidth / this.viewportHeight;
        const fovRadians = this.fieldOfView * (Math.PI / 180);
        const f = 1.0 / Math.tan(fovRadians * 0.5);
        if (depth < 1e-4) return null; // Increased from 1e-6 for better stability
        const ndcX = (cameraPoint.x / depth) * (f / aspect);  // X becomes screen X
        const ndcY = (cameraPoint.y / depth) * f;           // Y becomes screen Y
        const screenX = (ndcX * 0.5 + 0.5) * this.viewportWidth;
        const screenY = (0.5 - ndcY * 0.5) * this.viewportHeight;
        return new Vector2(screenX, screenY);
    }

    worldToCameraSpace(point) {
        const goPos = (this.gameObject && this.gameObject.getWorldPosition) ?
            this.gameObject.getWorldPosition() : { x: 0, y: 0 };
        let goDepth = 0;
        if (this.gameObject) {
            if (typeof this.gameObject.getWorldDepth === 'function') {
                goDepth = this.gameObject.getWorldDepth();
            } else if (typeof this.gameObject.depth === 'number') {
                goDepth = this.gameObject.depth;
            } else if (this.gameObject.position && this.gameObject.position.z) {
                goDepth = this.gameObject.position.z;
            }
        }
        const camWorldX = (goPos.x || 0) + (this._position.x || 0);
        const camWorldY = (goPos.y || 0) + (this._position.y || 0);
        const camWorldZ = goDepth + (this._position.z || 0);
        const cameraPos = new Vector3(camWorldX, camWorldY, camWorldZ);
        const parentAngleDeg = (this.gameObject && this.gameObject.getWorldRotation) ?
            this.gameObject.getWorldRotation() : 0;
        const yaw = (parentAngleDeg + (this._rotation.z || 0)) * (Math.PI / 180);
        const pitch = (this._rotation.y || 0) * (Math.PI / 180);
        const roll = (this._rotation.x || 0) * (Math.PI / 180);
        let relativePos = this.subtractVector3(point, cameraPos);
        relativePos = this.rotateVectorZ(relativePos, -yaw);
        relativePos = this.rotateVectorY(relativePos, -pitch);
        relativePos = this.rotateVectorX(relativePos, -roll);
        return relativePos;
    }

    createWebGLRenderTexture() {
        if (!this._useWebGLAcceleration) return false;

        try {
            // Create offscreen canvas for WebGL
            const glCanvas = document.createElement('canvas');
            glCanvas.width = this._renderTextureWidth;
            glCanvas.height = this._renderTextureHeight;

            // Try to get WebGL context
            const gl = glCanvas.getContext('webgl', {
                alpha: true,
                antialias: false,
                preserveDrawingBuffer: true,
                powerPreference: 'high-performance'
            }) || glCanvas.getContext('experimental-webgl', {
                alpha: true,
                antialias: false,
                preserveDrawingBuffer: true,
                powerPreference: 'high-performance'
            });

            if (!gl) {
                console.warn("WebGL not available, falling back to 2D canvas");
                return false;
            }

            this._renderTextureGL = glCanvas;
            this._renderTextureGLCtx = gl;

            // Initialize WebGL shaders for triangle rasterization
            this.initWebGLShaders();

            return true;
        } catch (e) {
            console.warn("WebGL initialization failed:", e);
            return false;
        }
    }

    initWebGLRaytracingShaders() {
        const gl = this._renderTextureGLCtx;

        // Enable float texture extension if available
        const floatExt = gl.getExtension('OES_texture_float');
        if (!floatExt) {
            console.warn('Float textures not supported, raytracing may not work correctly');
            return false;
        }

        // Vertex shader - simple fullscreen quad
        const vertexShaderSource = `
        attribute vec2 a_position;
        varying vec2 v_uv;
        
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_uv = a_position * 0.5 + 0.5;
        }
    `;

        // Fragment shader - GPU raytracer
        const fragmentShaderSource = `
        precision highp float;
        
        varying vec2 v_uv;
        
        // Camera uniforms
        uniform vec3 u_cameraPos;
        uniform mat3 u_cameraRotation;
        uniform float u_fov;
        uniform float u_nearPlane;
        uniform float u_farPlane;
        uniform vec2 u_resolution;
        
        // Lighting uniforms
        uniform vec3 u_lightDir;
        uniform vec3 u_lightColor;
        uniform float u_lightIntensity;
        uniform float u_ambientIntensity;
        
        // Background uniforms
        uniform vec3 u_skyColor;
        uniform vec3 u_floorColor;
        uniform float u_horizonY;
        uniform int u_backgroundType;
        uniform vec3 u_backgroundColor;
        
        // Triangle data
        uniform sampler2D u_triangleData;
        uniform int u_triangleCount;
        uniform float u_texWidth;
        
        // Ray-triangle intersection (Möller–Trumbore algorithm)
        bool rayTriangle(vec3 ro, vec3 rd, vec3 v0, vec3 v1, vec3 v2, out float t, out vec3 normal) {
            vec3 e1 = v1 - v0;
            vec3 e2 = v2 - v0;
            vec3 h = cross(rd, e2);
            float a = dot(e1, h);
            
            if (abs(a) < 0.0001) return false;
            
            float f = 1.0 / a;
            vec3 s = ro - v0;
            float u = f * dot(s, h);
            
            if (u < 0.0 || u > 1.0) return false;
            
            vec3 q = cross(s, e1);
            float v = f * dot(rd, q);
            
            if (v < 0.0 || u + v > 1.0) return false;
            
            t = f * dot(e2, q);
            
            if (t > 0.00001) {
                normal = normalize(cross(e1, e2));
                return true;
            }
            
            return false;
        }
        
        // Fetch triangle vertices from texture
        void getTriangle(int idx, out vec3 v0, out vec3 v1, out vec3 v2, out vec3 color) {
            float texHeight = ceil(float(u_triangleCount) * 5.0 / u_texWidth);
            
            // Each triangle takes 5 texels: v0, v1, v2, color, normal
            float baseIdx = float(idx) * 5.0;
            float row = floor(baseIdx / u_texWidth);
            float col = mod(baseIdx, u_texWidth);
            
            vec2 uv0 = vec2((col + 0.5) / u_texWidth, (row + 0.5) / texHeight);
            vec2 uv1 = vec2((col + 1.5) / u_texWidth, (row + 0.5) / texHeight);
            vec2 uv2 = vec2((col + 2.5) / u_texWidth, (row + 0.5) / texHeight);
            vec2 uvC = vec2((col + 3.5) / u_texWidth, (row + 0.5) / texHeight);
            
            v0 = texture2D(u_triangleData, uv0).xyz;
            v1 = texture2D(u_triangleData, uv1).xyz;
            v2 = texture2D(u_triangleData, uv2).xyz;
            color = texture2D(u_triangleData, uvC).xyz;
        }
        
        // Main raytracing function
        vec3 trace(vec3 ro, vec3 rd) {
            float minT = u_farPlane;
            vec3 hitColor = vec3(0.0);
            vec3 hitNormal = vec3(0.0, 0.0, 1.0);
            bool hit = false;
            
            // Test all triangles
            for (int i = 0; i < 4096; i++) {
                if (i >= u_triangleCount) break;
                
                vec3 v0, v1, v2, triColor;
                getTriangle(i, v0, v1, v2, triColor);
                
                float t;
                vec3 normal;
                if (rayTriangle(ro, rd, v0, v1, v2, t, normal)) {
                    if (t > u_nearPlane && t < minT && t < u_farPlane) {
                        minT = t;
                        hitColor = triColor;
                        hitNormal = normal;
                        hit = true;
                    }
                }
            }
            
            if (hit) {
                // Apply lighting
                vec3 lightDir = normalize(u_lightDir);
                float diffuse = max(0.0, -dot(hitNormal, lightDir)) * u_lightIntensity;
                float lighting = u_ambientIntensity + diffuse * (1.0 - u_ambientIntensity);
                return hitColor * lighting * u_lightColor;
            }
            
            // Background
            if (u_backgroundType == 0) {
                return mix(u_floorColor, u_skyColor, step(u_horizonY, v_uv.y));
            } else if (u_backgroundType == 2) {
                return u_backgroundColor;
            } else {
                return vec3(0.0);
            }
        }
        
        void main() {
            vec2 ndc = v_uv * 2.0 - 1.0;
            ndc.y = -ndc.y;
            
            float aspect = u_resolution.x / u_resolution.y;
            float tanHalfFov = tan(radians(u_fov) * 0.5);
            
            // Ray in camera space (X=forward, Y=right, Z=up)
            vec3 rayDir = normalize(vec3(
                1.0,
                ndc.x * tanHalfFov * aspect,
                ndc.y * tanHalfFov
            ));
            
            // Transform ray to world space
            rayDir = u_cameraRotation * rayDir;
            
            // Trace ray
            vec3 color = trace(u_cameraPos, rayDir);
            
            gl_FragColor = vec4(color, 1.0);
        }
    `;

        // Compile shaders
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);

        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            console.error('Vertex shader compile error:', gl.getShaderInfoLog(vertexShader));
            return false;
        }

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentShaderSource);
        gl.compileShader(fragmentShader);

        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            console.error('Fragment shader compile error:', gl.getShaderInfoLog(fragmentShader));
            return false;
        }

        // Create program
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Shader program link error:', gl.getProgramInfoLog(program));
            return false;
        }

        this._glRaytraceProgram = program;

        // Get uniform locations
        this._glRaytraceUniforms = {
            cameraPos: gl.getUniformLocation(program, 'u_cameraPos'),
            cameraRotation: gl.getUniformLocation(program, 'u_cameraRotation'),
            fov: gl.getUniformLocation(program, 'u_fov'),
            nearPlane: gl.getUniformLocation(program, 'u_nearPlane'),
            farPlane: gl.getUniformLocation(program, 'u_farPlane'),
            resolution: gl.getUniformLocation(program, 'u_resolution'),
            lightDir: gl.getUniformLocation(program, 'u_lightDir'),
            lightColor: gl.getUniformLocation(program, 'u_lightColor'),
            lightIntensity: gl.getUniformLocation(program, 'u_lightIntensity'),
            ambientIntensity: gl.getUniformLocation(program, 'u_ambientIntensity'),
            skyColor: gl.getUniformLocation(program, 'u_skyColor'),
            floorColor: gl.getUniformLocation(program, 'u_floorColor'),
            horizonY: gl.getUniformLocation(program, 'u_horizonY'),
            backgroundType: gl.getUniformLocation(program, 'u_backgroundType'),
            backgroundColor: gl.getUniformLocation(program, 'u_backgroundColor'),
            triangleData: gl.getUniformLocation(program, 'u_triangleData'),
            triangleCount: gl.getUniformLocation(program, 'u_triangleCount'),
            texWidth: gl.getUniformLocation(program, 'u_texWidth')
        };

        // Create fullscreen quad
        const quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            1, 1
        ]), gl.STATIC_DRAW);

        this._glRaytraceQuadBuffer = quadBuffer;
        this._glRaytracePositionAttrib = gl.getAttribLocation(program, 'a_position');

        return true;
    }

    // Initialize WebGL shaders for triangle rendering
    initWebGLShaders() {
        const gl = this._renderTextureGLCtx;

        // Vertex shader
        const vertexShaderSource = `
            attribute vec3 a_position;
            attribute vec3 a_color;
            varying vec3 v_color;
            uniform mat4 u_projection;
            
            void main() {
                gl_Position = u_projection * vec4(a_position, 1.0);
                v_color = a_color;
            }
        `;

        // Fragment shader
        const fragmentShaderSource = `
            precision mediump float;
            varying vec3 v_color;
            
            void main() {
                gl_FragColor = vec4(v_color, 1.0);
            }
        `;

        // Compile shaders
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentShaderSource);
        gl.compileShader(fragmentShader);

        // Create program
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        this._glProgram = program;
        this._glPositionAttrib = gl.getAttribLocation(program, 'a_position');
        this._glColorAttrib = gl.getAttribLocation(program, 'a_color');
        this._glProjectionUniform = gl.getUniformLocation(program, 'u_projection');

        // Enable depth testing
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
    }

    subtractVector3(a, b) {
        return new Vector3(a.x - b.x, a.y - b.y, a.z - b.z);
    }

    rotateVectorX(v, angle) {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        return new Vector3(v.x, v.y * cos - v.z * sin, v.y * sin + v.z * cos);
    }

    rotateVectorY(v, angle) {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        return new Vector3(v.x * cos + v.z * sin, v.y, -v.x * sin + v.z * cos);
    }

    rotateVectorZ(v, angle) {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        return new Vector3(v.x * cos - v.y * sin, v.x * sin + v.y * cos, v.z);
    }

    clipPolygonAgainstNearPlane(vertices, nearPlane) {
        if (!vertices || vertices.length === 0) return [];
        const out = [];
        const epsilon = 0.01; // Increased for better edge case handling

        for (let i = 0; i < vertices.length; i++) {
            const a = vertices[i];
            const b = vertices[(i + 1) % vertices.length];
            const aIn = a.x >= nearPlane - epsilon;
            const bIn = b.x >= nearPlane - epsilon;

            if (aIn && bIn) {
                // Both vertices in front of near plane
                out.push(b);
            } else if (aIn && !bIn) {
                // Edge crosses near plane, going out
                const t = (nearPlane - a.x) / (b.x - a.x);
                const clampedT = Math.max(0, Math.min(1, t));
                out.push(new Vector3(
                    nearPlane,
                    a.y + clampedT * (b.y - a.y),
                    a.z + clampedT * (b.z - a.z)
                ));
            } else if (!aIn && bIn) {
                // Edge crosses near plane, coming in
                const t = (nearPlane - a.x) / (b.x - a.x);
                const clampedT = Math.max(0, Math.min(1, t));
                out.push(new Vector3(
                    nearPlane,
                    a.y + clampedT * (b.y - a.y),
                    a.z + clampedT * (b.z - a.z)
                ));
                out.push(b);
            }
            // If both are behind (!aIn && !bIn), skip both vertices
        }

        return out;
    }

    clipPolygonAgainstFarPlane(vertices, farPlane) {
        if (!vertices || vertices.length === 0) return [];
        const out = [];
        const epsilon = 0.01; // Increased for better edge case handling

        for (let i = 0; i < vertices.length; i++) {
            const a = vertices[i];
            const b = vertices[(i + 1) % vertices.length];
            const aIn = a.x <= farPlane + epsilon;
            const bIn = b.x <= farPlane + epsilon;

            if (aIn && bIn) {
                out.push(b);
            } else if (aIn && !bIn) {
                const t = (farPlane - a.x) / (b.x - a.x);
                const clampedT = Math.max(0, Math.min(1, t));
                out.push(new Vector3(
                    farPlane,
                    a.y + clampedT * (b.y - a.y),
                    a.z + clampedT * (b.z - a.z)
                ));
            } else if (!aIn && bIn) {
                const t = (farPlane - a.x) / (b.x - a.x);
                const clampedT = Math.max(0, Math.min(1, t));
                out.push(new Vector3(
                    farPlane,
                    a.y + clampedT * (b.y - a.y),
                    a.z + clampedT * (b.z - a.z)
                ));
                out.push(b);
            }
        }

        return out;
    }

    projectCameraPoint(cameraPoint, useCullingFov = false) {
        const depth = cameraPoint.x;
        // Remove this check since we clip beforehand
        // if (depth <= this.nearPlane || depth >= this.farPlane) return null;
        if (depth <= 1e-4) return null; // Increased from 1e-6 for better stability

        const aspect = this.viewportWidth / this.viewportHeight;
        const fovToUse = useCullingFov ? this._cullingFieldOfView : this.fieldOfView;
        const fovRadians = fovToUse * (Math.PI / 180);
        const f = 1.0 / Math.tan(fovRadians * 0.5);
        const ndcX = (cameraPoint.y / depth) * (f / aspect);
        const ndcY = (cameraPoint.z / depth) * f;
        const screenX = (ndcX * 0.5 + 0.5) * this.viewportWidth;
        const screenY = (0.5 - ndcY * 0.5) * this.viewportHeight;
        return new Vector2(screenX, screenY);
    }

    isPointVisible(point, checkFOV = true) {
        const cameraPoint = this.worldToCameraSpace(point);

        // Check depth planes first
        if (cameraPoint.x < this.nearPlane || cameraPoint.x > this.farPlane) {
            return false;
        }

        // If FOV checking is disabled, just check depth planes
        if (!checkFOV || this._disableCulling) {
            return true;
        }

        // Calculate if point is within FOV with tolerance for edge cases
        const aspect = this.viewportWidth / this.viewportHeight;
        const fovRadians = this.fieldOfView * (Math.PI / 180);
        const tanHalfFov = Math.tan(fovRadians * 0.5);

        // Add small tolerance to handle floating point precision issues at edges
        const tolerance = 0.02; // 2% tolerance

        // Check if point is within horizontal FOV (with tolerance)
        // cameraPoint.y maps to horizontal screen position, so no aspect ratio needed
        const horizontalBound = Math.abs(cameraPoint.y) / cameraPoint.x;
        const maxHorizontal = tanHalfFov * (1 + tolerance);

        // Check if point is within vertical FOV (with tolerance)
        // cameraPoint.z maps to vertical screen position, apply aspect ratio
        const verticalBound = Math.abs(cameraPoint.z) / cameraPoint.x;
        const maxVertical = tanHalfFov * aspect * (1 + tolerance);

        return horizontalBound <= maxHorizontal && verticalBound <= maxVertical;
    }

    updateRenderTexture() {
        if (!this._renderTexture || this._renderTexture.width !== this._renderTextureWidth ||
            this._renderTexture.height !== this._renderTextureHeight) {
            this._renderTexture = document.createElement('canvas');
            this._renderTexture.width = this._renderTextureWidth;
            this._renderTexture.height = this._renderTextureHeight;
            this._renderTextureCtx = this._renderTexture.getContext('2d');
            this.viewportWidth = this._renderTextureWidth;
            this.viewportHeight = this._renderTextureHeight;
            this._zBuffer = new Float32Array(this._renderTextureWidth * this._renderTextureHeight);
            this._imageData = this._renderTextureCtx.createImageData(this._renderTextureWidth, this._renderTextureHeight);
        }

        // Try to create WebGL context for acceleration
        if (this._renderingMethod === "raster") {
            this.createWebGLRenderTexture();
        }
    }

    getRenderTexture() { return this._renderTexture; }
    getRenderTextureContext() { return this._renderTextureCtx; }

    clearRenderTexture() {
        if (!this._renderTextureCtx) return;
        this._renderTextureCtx.imageSmoothingEnabled = this._renderTextureSmoothing;

        // Handle different background types
        switch (this._backgroundType) {
            case "skyfloor":
                // Calculate dynamic horizon based on camera pitch and FOV for accuracy
                const fovRadians = this._fieldOfView * (Math.PI / 180);
                const pitchRadians = (this._rotation.y || 0) * (Math.PI / 180);
                const maxPitch = fovRadians / 2;
                const normalizedPitch = -Math.max(-1, Math.min(1, pitchRadians / maxPitch)); // Clamp to [-1, 1]
                const horizonOffset = normalizedPitch * 0.5; // Scale to [-0.5, 0.5]
                const horizonRatio = 0.5 + horizonOffset; // 0.5 when level, shifts based on pitch

                // Clamp horizon between 0 and 1 to avoid extreme cases
                const clampedHorizon = Math.max(0, Math.min(1, horizonRatio));
                const horizonY = Math.floor(this._renderTextureHeight * clampedHorizon);

                // Draw sky (from top to horizon)
                this._renderTextureCtx.fillStyle = this._skyColor;
                this._renderTextureCtx.fillRect(0, 0, this._renderTextureWidth, horizonY);

                // Draw floor (from horizon to bottom)
                this._renderTextureCtx.fillStyle = this._floorColor;
                this._renderTextureCtx.fillRect(0, horizonY, this._renderTextureWidth, this._renderTextureHeight - horizonY);
                break;

            case "transparent":
                // Don't clear the background - leave it transparent
                // This allows 2D drawing beneath the 3D canvas
                break;

            case "solid":
            default:
                // Fill with solid background color
                this._renderTextureCtx.fillStyle = this._backgroundColor;
                this._renderTextureCtx.fillRect(0, 0, this._renderTextureWidth, this._renderTextureHeight);
                break;
        }

        if (this._zBuffer) this._zBuffer.fill(Infinity);
    }

    updateViewport() {
        this.viewportWidth = this._renderTextureWidth;
        this.viewportHeight = this._renderTextureHeight;
    }

    calculateScreenNormal(vertices) {
        if (vertices.length < 3) return 0;
        const v0 = vertices[0], v1 = vertices[1], v2 = vertices[2];
        const edge1 = { x: v1.x - v0.x, y: v1.y - v0.y };
        const edge2 = { x: v2.x - v0.x, y: v2.y - v0.y };
        return edge1.x * edge2.y - edge1.y * edge2.x;
    }

    // Improved backface culling that works consistently across all rendering methods
    shouldCullFace(cameraSpaceVertices) {
        if (cameraSpaceVertices.length < 3) return true;

        const v0 = cameraSpaceVertices[0];
        const v1 = cameraSpaceVertices[1];
        const v2 = cameraSpaceVertices[2];

        // Calculate face normal in camera space using cross product
        // Camera looks along +X axis
        const edge1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
        const edge2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };

        // Cross product (edge1 x edge2) - use right-hand rule
        const normal = {
            x: edge1.y * edge2.z - edge1.z * edge2.y,
            y: edge1.z * edge2.x - edge1.x * edge2.z,
            z: edge1.x * edge2.y - edge1.y * edge2.x
        };

        // Normalize
        const normalLength = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
        if (normalLength < 1e-10) return true; // Degenerate triangle

        const normalizedNormal = {
            x: normal.x / normalLength,
            y: normal.y / normalLength,
            z: normal.z / normalLength
        };

        // View direction in camera space is along +X axis (camera looking towards +X)
        // For a face to be front-facing, its normal should point towards the camera (negative X)
        // So we want normalizedNormal.x < 0 for front faces
        // Cull if normalizedNormal.x >= 0 (backfaces pointing away)

        // Use the centroid for more accurate culling
        const centroidX = (v0.x + v1.x + v2.x) / 3;
        const centroidY = (v0.y + v1.y + v2.y) / 3;
        const centroidZ = (v0.z + v1.z + v2.z) / 3;

        // Vector from centroid to camera (at origin)
        const toCameraX = -centroidX;
        const toCameraY = -centroidY;
        const toCameraZ = -centroidZ;

        // Dot product with normal - if positive, face is front-facing
        const dot = normalizedNormal.x * toCameraX + normalizedNormal.y * toCameraY + normalizedNormal.z * toCameraZ;

        // Cull if dot < 0 (backface)
        return dot < -0.01; // Small epsilon for numerical stability
    }

    drawTexturedTriangle(ctx, vertices, uvs, texture) {
        if (!texture || vertices.length !== 3 || uvs.length !== 3) return;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        ctx.lineTo(vertices[1].x, vertices[1].y);
        ctx.lineTo(vertices[2].x, vertices[2].y);
        ctx.closePath();
        ctx.clip();
        const x0 = vertices[0].x, y0 = vertices[0].y;
        const x1 = vertices[1].x, y1 = vertices[1].y;
        const x2 = vertices[2].x, y2 = vertices[2].y;
        const u0 = uvs[0].x * texture.width, v0 = uvs[0].y * texture.height;
        const u1 = uvs[1].x * texture.width, v1 = uvs[1].y * texture.height;
        const u2 = uvs[2].x * texture.width, v2 = uvs[2].y * texture.height;
        const det = u0 * (v1 - v2) - u1 * (v0 - v2) + u2 * (v0 - v1);
        if (Math.abs(det) > 0.0001) {
            const a = (x0 * (v1 - v2) - x1 * (v0 - v2) + x2 * (v0 - v1)) / det;
            const b = (x0 * (u2 - u1) - x1 * (u2 - u0) + x2 * (u1 - u0)) / det;
            const c = (x0 * (u1 * v2 - u2 * v1) - x1 * (u0 * v2 - u2 * v0) + x2 * (u0 * v1 - u1 * v0)) / det;
            const d = (y0 * (v1 - v2) - y1 * (v0 - v2) + y2 * (v0 - v1)) / det;
            const e = (y0 * (u2 - u1) - y1 * (u2 - u0) + y2 * (u1 - u0)) / det;
            const f = (y0 * (u1 * v2 - u2 * v1) - y1 * (u0 * v2 - u2 * v0) + y2 * (u0 * v1 - u1 * v0)) / det;
            ctx.transform(a, d, b, e, c, f);
            ctx.drawImage(texture, 0, 0);
        }
        ctx.restore();
    }

    renderPainter() {
        const allObjects = this.getGameObjects();
        const allFaces = [];

        // Collect all faces with their data
        allObjects.forEach(obj => {
            if (!obj.active) return;
            const mesh = obj.getModule("Mesh3D") || obj.getModule("CubeMesh3D") || obj.getModule("SphereMesh3D");
            if (!mesh) return;

            const transformedVertices = mesh.transformVertices();
            if (!transformedVertices || !mesh.faces) return;

            let texture = null, uvCoords = null;
            if (mesh.texture && (mesh.texture instanceof Image || mesh.texture instanceof HTMLCanvasElement)) {
                texture = mesh.texture;
                uvCoords = mesh.uvCoords || mesh.generateDefaultUVs();
            }

            mesh.faces.forEach((face, faceIndex) => {
                const worldVerts = face.map(idx => transformedVertices[idx]).filter(Boolean);
                if (worldVerts.length < 3) return;

                let cameraVerts = worldVerts.map(v => this.worldToCameraSpace(v));

                // Clip against near and far planes
                cameraVerts = this.clipPolygonAgainstNearPlane(cameraVerts, this._nearPlane);
                if (cameraVerts.length < 3) return;

                cameraVerts = this.clipPolygonAgainstFarPlane(cameraVerts, this._farPlane);
                if (cameraVerts.length < 3) return;

                // Backface culling AFTER clipping
                if (this._enableBackfaceCulling && !this._disableCulling && this.shouldCullFace(cameraVerts)) return;

                // Project to screen - use extended FOV only when culling is enabled
                const useExtendedFOV = this._enableBackfaceCulling && !this._disableCulling;
                const projectedVerts = cameraVerts.map(cv => this.projectCameraPoint(cv, useExtendedFOV));

                // Filter out null projections
                const validProjectedVerts = projectedVerts.filter(v => v !== null);

                // Skip if we don't have enough valid vertices after projection
                if (validProjectedVerts.length < 3) return;

                // Use MINIMUM depth (closest vertex) for more accurate sorting
                // This ensures faces with any close vertex are drawn after faces that are entirely farther
                const sortDepth = Math.min(...cameraVerts.map(v => v.x));

                allFaces.push({
                    projectedVertices: validProjectedVerts,
                    cameraSpaceVertices: cameraVerts,
                    worldNormal: this.calculateFaceNormal(worldVerts[0], worldVerts[1], worldVerts[2]),
                    mesh,
                    texture,
                    faceUVs: texture && uvCoords && uvCoords[faceIndex] ? uvCoords[faceIndex] : null,
                    sortDepth
                });
            });
        });

        // Sort back-to-front (far to near) for proper painter's algorithm
        allFaces.sort((a, b) => b.sortDepth - a.sortDepth);

        const ctx = this._renderTextureCtx;
        this.clearRenderTexture();

        // Render each face
        allFaces.forEach(({ projectedVertices, worldNormal, mesh, texture, faceUVs }) => {
            // Calculate lighting
            const baseColor = mesh.faceColor || mesh._faceColor || "#888888";
            const litColor = this.calculateLighting(worldNormal, baseColor);

            ctx.save();

            if (texture && faceUVs && faceUVs.length >= 3) {
                // Textured rendering - triangulate the polygon
                for (let i = 1; i < projectedVertices.length - 1; i++) {
                    const triVerts = [projectedVertices[0], projectedVertices[i], projectedVertices[i + 1]];
                    const triUVs = [faceUVs[0], faceUVs[i], faceUVs[i + 1]];
                    this.drawTexturedTriangle(ctx, triVerts, triUVs, texture);
                }
            } else {
                // Solid color rendering
                if (mesh.renderMode === "solid" || mesh.renderMode === "both") {
                    ctx.fillStyle = `rgb(${litColor.r}, ${litColor.g}, ${litColor.b})`;
                    ctx.beginPath();
                    ctx.moveTo(projectedVertices[0].x, projectedVertices[0].y);
                    for (let i = 1; i < projectedVertices.length; i++) {
                        ctx.lineTo(projectedVertices[i].x, projectedVertices[i].y);
                    }
                    ctx.closePath();
                    ctx.fill();
                }
            }

            // Wireframe rendering
            if (mesh.renderMode === "wireframe" || mesh.renderMode === "both") {
                ctx.strokeStyle = mesh.wireframeColor || mesh._wireframeColor || "#ffffff";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(projectedVertices[0].x, projectedVertices[0].y);
                for (let i = 1; i < projectedVertices.length; i++) {
                    ctx.lineTo(projectedVertices[i].x, projectedVertices[i].y);
                }
                ctx.closePath();
                ctx.stroke();
            }

            ctx.restore();
        });
    }

    rasterizeTriangleWithDepth(ctx, v0, v1, v2, color) {
        const p0 = { x: Math.round(v0.screen.x), y: Math.round(v0.screen.y), z: v0.depth };
        const p1 = { x: Math.round(v1.screen.x), y: Math.round(v1.screen.y), z: v1.depth };
        const p2 = { x: Math.round(v2.screen.x), y: Math.round(v2.screen.y), z: v2.depth };

        const minX = Math.max(0, Math.min(p0.x, p1.x, p2.x));
        const maxX = Math.min(this._renderTextureWidth - 1, Math.max(p0.x, p1.x, p2.x));
        const minY = Math.max(0, Math.min(p0.y, p1.y, p2.y));
        const maxY = Math.min(this._renderTextureHeight - 1, Math.max(p0.y, p1.y, p2.y));

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const bary = this.barycentric(p0, p1, p2, x, y);
                if (bary.u >= 0 && bary.v >= 0 && bary.w >= 0) {
                    const depth = bary.u * p0.z + bary.v * p1.z + bary.w * p2.z;
                    const idx = y * this._renderTextureWidth + x;

                    if (depth >= this._nearPlane && depth <= this._farPlane && depth < this._zBuffer[idx]) {
                        this._zBuffer[idx] = depth;
                        ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
                        ctx.fillRect(x, y, 1, 1);
                    }
                }
            }
        }
    }

    // Combines spatial subdivision with Z-buffering for better performance
    renderHZB() {
        const allObjects = this.getGameObjects();
        const ctx = this._renderTextureCtx;
        const imgData = this._imageData;
        const data = imgData.data;
        const w = this._renderTextureWidth, h = this._renderTextureHeight;

        // Handle background clearing based on background type
        if (this._backgroundType === "transparent") {
            // For transparent background, only clear pixels that will have geometry
            // Leave non-geometry pixels as they are (transparent)
        } else {
            // For solid or sky/floor backgrounds, clear all pixels first
            if (this._backgroundType === "solid") {
                const bgColor = this.hexToRgb(this._backgroundColor);
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = bgColor.r; data[i + 1] = bgColor.g; data[i + 2] = bgColor.b; data[i + 3] = 255;
                }
            } else if (this._backgroundType === "skyfloor") {
                // Calculate dynamic horizon based on camera pitch and FOV for accuracy
                const fovRadians = this._fieldOfView * (Math.PI / 180);
                const pitchRadians = (this._rotation.y || 0) * (Math.PI / 180);
                const maxPitch = fovRadians / 2;
                const normalizedPitch = -Math.max(-1, Math.min(1, pitchRadians / maxPitch)); // Clamp to [-1, 1]
                const horizonOffset = normalizedPitch * 0.5; // Scale to [-0.5, 0.5]
                const horizonRatio = 0.5 + horizonOffset; // 0.5 when level, shifts based on pitch

                // Clamp horizon between 0 and 1 to avoid extreme cases
                const clampedHorizon = Math.max(0, Math.min(1, horizonRatio));
                const horizonY = Math.floor(h * clampedHorizon);

                for (let i = 0; i < data.length; i += 4) {
                    const y = Math.floor((i / 4) / w);
                    if (y < horizonY) {
                        data[i] = this.hexToRgb(this._skyColor).r;
                        data[i + 1] = this.hexToRgb(this._skyColor).g;
                        data[i + 2] = this.hexToRgb(this._skyColor).b;
                    } else {
                        data[i] = this.hexToRgb(this._floorColor).r;
                        data[i + 1] = this.hexToRgb(this._floorColor).g;
                        data[i + 2] = this.hexToRgb(this._floorColor).b;
                    }
                    data[i + 3] = 255;
                }
            }
        }

        // Build hierarchical structure (16x16 tiles)
        const tileSize = 16;
        const tilesX = Math.ceil(w / tileSize);
        const tilesY = Math.ceil(h / tileSize);
        const tiles = Array.from({ length: tilesY }, () =>
            Array.from({ length: tilesX }, () => ({ triangles: [], minDepth: Infinity }))
        );

        // Collect and bin triangles into tiles
        allObjects.forEach(obj => {
            if (!obj.active) return;
            const mesh = obj.getModule("Mesh3D") || obj.getModule("CubeMesh3D") || obj.getModule("SphereMesh3D");
            if (!mesh) return;
            const transformedVertices = mesh.transformVertices();
            if (!transformedVertices || !mesh.faces) return;
            const faceColor = mesh.faceColor || mesh._faceColor || "#888888";

            mesh.faces.forEach(face => {
                const cameraVerts = face.map(idx =>
                    idx < transformedVertices.length ? this.worldToCameraSpace(transformedVertices[idx]) : null
                ).filter(v => v);
                //const clippedVerts = this.clipPolygonAgainstNearPlane(cameraVerts, this._nearPlane);
                //if (clippedVerts.length < 3) return;


                const worldVerts = face.map(idx => transformedVertices[idx]).filter(v => v);
                const worldNormal = this.calculateFaceNormal(worldVerts[0], worldVerts[1], worldVerts[2]);
                const litColor = this.calculateLighting(worldNormal, faceColor);

                // Clip against near plane first
                const clippedVerts = this.clipPolygonAgainstNearPlane(cameraVerts, this._nearPlane);
                if (clippedVerts.length < 3) return;

                // Backface culling using consistent method (after clipping)
                if (this._enableBackfaceCulling && !this._disableCulling) {
                    if (this.shouldCullFace(clippedVerts)) {
                        return; // Cull if facing away from camera
                    }
                }
                const rgb = litColor;

                const clippedFar = clippedVerts.filter(v => v.x <= this._farPlane);
                if (clippedFar.length < 3) return;

                const useExtendedFOV = this._enableBackfaceCulling && !this._disableCulling;
                const screenVerts = clippedFar.map(cv => {
                    const proj = this.projectCameraPoint(cv, useExtendedFOV);
                    return proj ? { screen: proj, depth: cv.x } : null;
                }).filter(v => v);
                if (screenVerts.length < 3) {
                    // When culling is disabled, check if we have any valid projections
                    if (!this._disableCulling || screenVerts.length === 0) return;
                }

                // Triangulate and bin into tiles
                for (let i = 1; i < screenVerts.length - 1; i++) {
                    const tri = [screenVerts[0], screenVerts[i], screenVerts[i + 1]];
                    const minDepth = Math.min(tri[0].depth, tri[1].depth, tri[2].depth);

                    // Calculate bounding box in tile space
                    const minX = Math.floor(Math.min(tri[0].screen.x, tri[1].screen.x, tri[2].screen.x) / tileSize);
                    const maxX = Math.floor(Math.max(tri[0].screen.x, tri[1].screen.x, tri[2].screen.x) / tileSize);
                    const minY = Math.floor(Math.min(tri[0].screen.y, tri[1].screen.y, tri[2].screen.y) / tileSize);
                    const maxY = Math.floor(Math.max(tri[0].screen.y, tri[1].screen.y, tri[2].screen.y) / tileSize);

                    // Add triangle to overlapping tiles
                    for (let ty = Math.max(0, minY); ty <= Math.min(tilesY - 1, maxY); ty++) {
                        for (let tx = Math.max(0, minX); tx <= Math.min(tilesX - 1, maxX); tx++) {
                            tiles[ty][tx].triangles.push({ tri, color: rgb, minDepth });
                            tiles[ty][tx].minDepth = Math.min(tiles[ty][tx].minDepth, minDepth);
                        }
                    }
                }
            });
        });

        // Render tiles front-to-back with early Z rejection
        const tileOrder = [];
        for (let ty = 0; ty < tilesY; ty++) {
            for (let tx = 0; tx < tilesX; tx++) {
                if (tiles[ty][tx].triangles.length > 0) {
                    tileOrder.push({ tx, ty, depth: tiles[ty][tx].minDepth });
                }
            }
        }
        tileOrder.sort((a, b) => a.depth - b.depth);

        // Render each tile
        tileOrder.forEach(({ tx, ty }) => {
            const tile = tiles[ty][tx];
            const xStart = tx * tileSize;
            const yStart = ty * tileSize;
            const xEnd = Math.min(xStart + tileSize, w);
            const yEnd = Math.min(yStart + tileSize, h);

            // Sort triangles in tile by depth
            tile.triangles.sort((a, b) => a.minDepth - b.minDepth);

            // Rasterize triangles in tile
            tile.triangles.forEach(({ tri, color }) => {
                for (let y = yStart; y < yEnd; y++) {
                    for (let x = xStart; x < xEnd; x++) {
                        const p0 = { x: tri[0].screen.x, y: tri[0].screen.y, z: tri[0].depth };
                        const p1 = { x: tri[1].screen.x, y: tri[1].screen.y, z: tri[1].depth };
                        const p2 = { x: tri[2].screen.x, y: tri[2].screen.y, z: tri[2].depth };

                        const bary = this.barycentric(p0, p1, p2, x, y);
                        if (bary.u >= 0 && bary.v >= 0 && bary.w >= 0) {
                            const depth = bary.u * p0.z + bary.v * p1.z + bary.w * p2.z;
                            const idx = y * w + x;
                            if (depth >= this._nearPlane && depth <= this._farPlane && depth < this._zBuffer[idx]) {
                                this._zBuffer[idx] = depth;
                                const pixelIdx = idx * 4;
                                data[pixelIdx] = color.r;
                                data[pixelIdx + 1] = color.g;
                                data[pixelIdx + 2] = color.b;
                                data[pixelIdx + 3] = 255;
                            }
                        }
                    }
                }
            });
        });

        ctx.putImageData(imgData, 0, 0);
    }

    // Advanced depth-accurate rendering with hierarchical depth testing and depth of field
    renderDepthPass() {
        const allObjects = this.getGameObjects();
        const ctx = this._renderTextureCtx;
        const imgData = this._imageData;
        const data = imgData.data;
        const w = this._renderTextureWidth, h = this._renderTextureHeight;

        // Handle background clearing based on background type
        if (this._backgroundType === "transparent") {
            // For transparent background, only clear pixels that will have geometry
            // Leave non-geometry pixels as they are (transparent)
        } else {
            // For solid or sky/floor backgrounds, clear all pixels first
            if (this._backgroundType === "solid") {
                const bgColor = this.hexToRgb(this._backgroundColor);
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = bgColor.r; data[i + 1] = bgColor.g; data[i + 2] = bgColor.b; data[i + 3] = 255;
                }
            } else if (this._backgroundType === "skyfloor") {
                // Calculate dynamic horizon based on camera pitch and FOV for accuracy
                const fovRadians = this._fieldOfView * (Math.PI / 180);
                const pitchRadians = (this._rotation.y || 0) * (Math.PI / 180);
                const maxPitch = fovRadians / 2;
                const normalizedPitch = -Math.max(-1, Math.min(1, pitchRadians / maxPitch)); // Clamp to [-1, 1]
                const horizonOffset = normalizedPitch * 0.5; // Scale to [-0.5, 0.5]
                const horizonRatio = 0.5 + horizonOffset; // 0.5 when level, shifts based on pitch

                // Clamp horizon between 0 and 1 to avoid extreme cases
                const clampedHorizon = Math.max(0, Math.min(1, horizonRatio));
                const horizonY = Math.floor(h * clampedHorizon);

                for (let i = 0; i < data.length; i += 4) {
                    const y = Math.floor((i / 4) / w);
                    if (y < horizonY) {
                        data[i] = this.hexToRgb(this._skyColor).r;
                        data[i + 1] = this.hexToRgb(this._skyColor).g;
                        data[i + 2] = this.hexToRgb(this._skyColor).b;
                    } else {
                        data[i] = this.hexToRgb(this._floorColor).r;
                        data[i + 1] = this.hexToRgb(this._floorColor).g;
                        data[i + 2] = this.hexToRgb(this._floorColor).b;
                    }
                    data[i + 3] = 255;
                }
            }
        }
        this._zBuffer.fill(Infinity);

        // Pre-process triangles with accurate depth information
        const allTriangles = [];
        allObjects.forEach(obj => {
            if (!obj.active) return;
            const mesh = obj.getModule("Mesh3D") || obj.getModule("CubeMesh3D") || obj.getModule("SphereMesh3D");
            if (!mesh) return;
            const transformedVertices = mesh.transformVertices();
            if (!transformedVertices || !mesh.faces) return;
            const faceColor = mesh.faceColor || mesh._faceColor || "#888888";

            mesh.faces.forEach(face => {
                const worldVerts = face.map(idx =>
                    idx < transformedVertices.length ? transformedVertices[idx] : null
                ).filter(v => v);

                if (worldVerts.length < 3) return;
                const worldNormal = this.calculateFaceNormal(worldVerts[0], worldVerts[1], worldVerts[2]);

                const cameraVerts = face.map(idx =>
                    idx < transformedVertices.length ? this.worldToCameraSpace(transformedVertices[idx]) : null
                ).filter(v => v);

                if (cameraVerts.length < 3) return;

                for (let i = 1; i < cameraVerts.length - 1; i++) {
                    const v0 = cameraVerts[0], v1 = cameraVerts[i], v2 = cameraVerts[i + 1];

                    // Clip triangles against near plane first
                    const clippedV0 = this.clipPolygonAgainstNearPlane([v0], this._nearPlane);
                    const clippedV1 = this.clipPolygonAgainstNearPlane([v1], this._nearPlane);
                    const clippedV2 = this.clipPolygonAgainstNearPlane([v2], this._nearPlane);

                    if (clippedV0.length === 0 || clippedV1.length === 0 || clippedV2.length === 0) {
                        continue; // All vertices clipped away
                    }

                    // Use clipped vertices for backface culling
                    const clippedTriangle = [clippedV0[0] || v0, clippedV1[0] || v1, clippedV2[0] || v2];

                    // Backface culling using consistent method (after clipping)
                    if (this._enableBackfaceCulling && !this._disableCulling) {
                        if (this.shouldCullFace(clippedTriangle)) {
                            continue;
                        }
                    }

                    const rgb = this.calculateLighting(worldNormal, faceColor);
                    allTriangles.push({
                        v0, v1, v2, color: rgb, worldNormal,
                        worldVerts: [worldVerts[0], worldVerts[i], worldVerts[i + 1]]
                    });
                }
            });
        });

        // Build hierarchical Z-buffer for accurate depth testing
        const hzbSize = Math.max(w, h);
        const hzbLevels = Math.ceil(Math.log2(hzbSize)) + 1;
        const hzbBuffers = [];

        // Create hierarchical Z-buffer levels
        for (let level = 0; level < hzbLevels; level++) {
            const levelSize = Math.max(1, hzbSize >> level);
            hzbBuffers[level] = new Float32Array(levelSize * levelSize).fill(Infinity);
        }

        // Primary depth pass with hierarchical optimization
        this.renderDepthPassPrimary(allTriangles, data, w, h, hzbBuffers);

        // Depth of field effect
        this.applyDepthOfField(data, w, h);

        ctx.putImageData(imgData, 0, 0);
    }

    // Primary depth pass with hierarchical Z-buffer optimization
    renderDepthPassPrimary(triangles, data, w, h, hzbBuffers) {
        // Sort triangles by average depth (back to front for proper depth testing)
        triangles.sort((a, b) => {
            const depthA = (a.v0.x + a.v1.x + a.v2.x) / 3;
            const depthB = (b.v0.x + b.v1.x + b.v2.x) / 3;
            return depthB - depthA; // Back to front
        });

        triangles.forEach(tri => {
            const { v0, v1, v2, color } = tri;

            // Project to screen space
            const useExtendedFOV = this._enableBackfaceCulling && !this._disableCulling;
            const p0 = this.projectCameraPoint(v0, useExtendedFOV);
            const p1 = this.projectCameraPoint(v1, useExtendedFOV);
            const p2 = this.projectCameraPoint(v2, useExtendedFOV);

            if (!p0 || !p1 || !p2) return;

            // Calculate triangle bounds
            const minX = Math.max(0, Math.min(p0.x, p1.x, p2.x));
            const maxX = Math.min(w - 1, Math.max(p0.x, p1.x, p2.x));
            const minY = Math.max(0, Math.min(p0.y, p1.y, p2.y));
            const maxY = Math.min(h - 1, Math.max(p0.y, p1.y, p2.y));

            // Early hierarchical depth culling
            const triDepth = (v0.x + v1.x + v2.x) / 3;
            if (this.canCullTriangleHZB(minX, minY, maxX, maxY, triDepth, hzbBuffers)) {
                return;
            }

            // Rasterize triangle with accurate depth testing
            for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
                for (let x = Math.floor(minX); x <= Math.ceil(maxX); x++) {
                    const bary = this.barycentric(
                        { x: p0.x, y: p0.y, z: v0.x },
                        { x: p1.x, y: p1.y, z: v1.x },
                        { x: p2.x, y: p2.y, z: v2.x },
                        x, y
                    );

                    if (bary.u >= 0 && bary.v >= 0 && bary.w >= 0) {
                        const depth = bary.u * v0.x + bary.v * v1.x + bary.w * v2.x;
                        const idx = y * w + x;

                        // Hierarchical depth test
                        if (depth >= this._nearPlane && depth <= this._farPlane &&
                            depth < this._zBuffer[idx] &&
                            this.hierarchicalDepthTest(x, y, depth, hzbBuffers)) {

                            this._zBuffer[idx] = depth;
                            this.updateHZB(x, y, depth, hzbBuffers);

                            const pixelIdx = idx * 4;
                            data[pixelIdx] = color.r;
                            data[pixelIdx + 1] = color.g;
                            data[pixelIdx + 2] = color.b;
                            data[pixelIdx + 3] = 255;
                        }
                    }
                }
            }
        });
    }

    // Check if triangle can be culled using hierarchical Z-buffer
    canCullTriangleHZB(minX, minY, maxX, maxY, triDepth, hzbBuffers) {
        const levels = hzbBuffers.length;
        const startLevel = Math.max(0, Math.floor(Math.log2(Math.max(maxX - minX, maxY - minY))) - 2);

        for (let level = startLevel; level < levels; level++) {
            const levelSize = Math.max(1, hzbBuffers[0].length >> level);
            const scale = levelSize / Math.max(1, hzbBuffers[0].length >> (level + 1) || 1);

            const tileX = Math.floor((minX + maxX) * 0.5 / scale);
            const tileY = Math.floor((minY + maxY) * 0.5 / scale);

            if (tileX >= 0 && tileX < levelSize && tileY >= 0 && tileY < levelSize) {
                const hzbIdx = tileY * levelSize + tileX;
                if (hzbBuffers[level][hzbIdx] < triDepth) {
                    return true; // Triangle is behind HZB, cull it
                }
            }
        }
        return false;
    }

    // Hierarchical depth test
    hierarchicalDepthTest(x, y, depth, hzbBuffers) {
        const levels = hzbBuffers.length;

        for (let level = 0; level < levels; level++) {
            const levelSize = Math.max(1, hzbBuffers[0].length >> level);
            const tileX = Math.floor(x * levelSize / this._renderTextureWidth);
            const tileY = Math.floor(y * levelSize / this._renderTextureHeight);

            if (tileX >= 0 && tileX < levelSize && tileY >= 0 && tileY < levelSize) {
                const hzbIdx = tileY * levelSize + tileX;
                if (depth >= hzbBuffers[level][hzbIdx]) {
                    return false;
                }
            }
        }

        return true;
    }

    // Update hierarchical Z-buffer
    updateHZB(x, y, depth, hzbBuffers) {
        const levels = hzbBuffers.length;

        for (let level = 0; level < levels; level++) {
            const levelSize = Math.max(1, hzbBuffers[0].length >> level);
            const tileX = Math.floor(x * levelSize / this._renderTextureWidth);
            const tileY = Math.floor(y * levelSize / this._renderTextureHeight);

            if (tileX >= 0 && tileX < levelSize && tileY >= 0 && tileY < levelSize) {
                const hzbIdx = tileY * levelSize + tileX;
                hzbBuffers[level][hzbIdx] = Math.min(hzbBuffers[level][hzbIdx], depth);
            }
        }
    }

    // Apply depth of field effect
    applyDepthOfField(data, w, h) {
        if (!this._depthOfFieldEnabled) return;

        const tempBuffer = new Uint8ClampedArray(data);

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const idx = y * w + x;
                const depth = this._zBuffer[idx];

                if (depth === Infinity) continue;

                // Calculate blur amount based on depth difference from focal plane
                const depthDiff = Math.abs(depth - this._focalDistance);
                const blurRadius = Math.min(this._maxBlurRadius, (depthDiff / this._aperture));

                if (blurRadius < 1) continue;

                // Apply Gaussian blur
                let r = 0, g = 0, b = 0, samples = 0;
                const radius = Math.ceil(blurRadius);

                for (let by = -radius; by <= radius; by++) {
                    for (let bx = -radius; bx <= radius; bx++) {
                        const sx = x + bx;
                        const sy = y + by;

                        if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
                            const sIdx = sy * w + sx;
                            const distance = Math.sqrt(bx * bx + by * by);
                            const weight = Math.exp(-(distance * distance) / (2 * blurRadius * blurRadius));

                            r += tempBuffer[sIdx * 4] * weight;
                            g += tempBuffer[sIdx * 4 + 1] * weight;
                            b += tempBuffer[sIdx * 4 + 2] * weight;
                            samples += weight;
                        }
                    }
                }

                data[idx * 4] = Math.round(r / samples);
                data[idx * 4 + 1] = Math.round(g / samples);
                data[idx * 4 + 2] = Math.round(b / samples);
            }
        }
    }

    renderZBuffer() {
        const allObjects = this.getGameObjects();
        const ctx = this._renderTextureCtx;
        const imgData = this._imageData;
        const data = imgData.data;
        const w = this._renderTextureWidth, h = this._renderTextureHeight;

        // Initialize z-buffer
        if (this._zBuffer) this._zBuffer.fill(Infinity);

        // Handle background clearing
        if (this._backgroundType === "transparent") {
            // Leave transparent pixels
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] === 0) continue; // Skip already transparent
            }
        } else if (this._backgroundType === "solid") {
            const bgColor = this.hexToRgb(this._backgroundColor);
            for (let i = 0; i < data.length; i += 4) {
                data[i] = bgColor.r; data[i + 1] = bgColor.g; data[i + 2] = bgColor.b; data[i + 3] = 255;
            }
        } else if (this._backgroundType === "skyfloor") {
            const fovRadians = this._fieldOfView * (Math.PI / 180);
            const pitchRadians = (this._rotation.y || 0) * (Math.PI / 180);
            const maxPitch = fovRadians / 2;
            const normalizedPitch = -Math.max(-1, Math.min(1, pitchRadians / maxPitch));
            const horizonOffset = normalizedPitch * 0.5;
            const horizonRatio = 0.5 + horizonOffset;
            const clampedHorizon = Math.max(0, Math.min(1, horizonRatio));
            const horizonY = Math.floor(h * clampedHorizon);

            for (let i = 0; i < data.length; i += 4) {
                const y = Math.floor((i / 4) / w);
                if (y < horizonY) {
                    data[i] = this.hexToRgb(this._skyColor).r;
                    data[i + 1] = this.hexToRgb(this._skyColor).g;
                    data[i + 2] = this.hexToRgb(this._skyColor).b;
                } else {
                    data[i] = this.hexToRgb(this._floorColor).r;
                    data[i + 1] = this.hexToRgb(this._floorColor).g;
                    data[i + 2] = this.hexToRgb(this._floorColor).b;
                }
                data[i + 3] = 255;
            }
        }

        // Use Uint32Array for 4x faster pixel writes
        const buffer32 = new Uint32Array(imgData.data.buffer);

        // Collect all triangles with metadata
        const allTriangles = [];

        allObjects.forEach(obj => {
            if (!obj.active) return;
            const mesh = obj.getModule("Mesh3D") || obj.getModule("CubeMesh3D") || obj.getModule("SphereMesh3D");
            if (!mesh) return;
            const transformedVertices = mesh.transformVertices();
            if (!transformedVertices || !mesh.faces) return;
            const faceColor = mesh.faceColor || mesh._faceColor || "#888888";

            mesh.faces.forEach(face => {
                const cameraVerts = face.map(idx =>
                    idx < transformedVertices.length ? this.worldToCameraSpace(transformedVertices[idx]) : null
                ).filter(v => v);

                if (cameraVerts.length < 3) return;

                // Clip against near plane FIRST
                const clippedVerts = this.clipPolygonAgainstNearPlane(cameraVerts, this._nearPlane);
                if (clippedVerts.length < 3) return;

                // Backface culling AFTER clipping
                if (this._enableBackfaceCulling && !this._disableCulling) {
                    if (this.shouldCullFace(clippedVerts)) return;
                }

                // Calculate world vertices for normal (use original vertices for lighting)
                const worldVerts = face.map(idx => transformedVertices[idx]).filter(v => v);
                if (worldVerts.length < 3) return;
                const worldNormal = this.calculateFaceNormal(worldVerts[0], worldVerts[1], worldVerts[2]);
                const litColor = this.calculateLighting(worldNormal, faceColor);

                // Project clipped vertices
                const useExtendedFOV = this._enableBackfaceCulling && !this._disableCulling;
                const screenVerts = clippedVerts.map(cv => {
                    const proj = this.projectCameraPoint(cv, useExtendedFOV);
                    return proj ? { screen: proj, depth: cv.x } : null;
                }).filter(v => v);

                if (screenVerts.length < 3) return;

                // Pack color as 32-bit ABGR for fast writing
                const packedColor = (255 << 24) | (litColor.b << 16) | (litColor.g << 8) | litColor.r;

                // Triangulate polygon
                for (let i = 1; i < screenVerts.length - 1; i++) {
                    const tri = {
                        v0: screenVerts[0],
                        v1: screenVerts[i],
                        v2: screenVerts[i + 1],
                        packedColor: packedColor,
                        minDepth: Math.min(screenVerts[0].depth, screenVerts[i].depth, screenVerts[i + 1].depth),
                        avgDepth: (screenVerts[0].depth + screenVerts[i].depth + screenVerts[i + 1].depth) / 3
                    };

                    // Calculate tight screen-space bounding box
                    const x0 = tri.v0.screen.x, x1 = tri.v1.screen.x, x2 = tri.v2.screen.x;
                    const y0 = tri.v0.screen.y, y1 = tri.v1.screen.y, y2 = tri.v2.screen.y;

                    tri.bounds = {
                        minX: Math.max(0, Math.floor(Math.min(x0, x1, x2))),
                        maxX: Math.min(w - 1, Math.ceil(Math.max(x0, x1, x2))),
                        minY: Math.max(0, Math.floor(Math.min(y0, y1, y2))),
                        maxY: Math.min(h - 1, Math.ceil(Math.max(y0, y1, y2)))
                    };

                    // Skip degenerate triangles
                    if (tri.bounds.minX > tri.bounds.maxX || tri.bounds.minY > tri.bounds.maxY) continue;

                    // Calculate area for importance
                    const area = Math.abs((x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)) / 2;
                    if (area < 0.5) continue; // Skip tiny triangles

                    tri.screenArea = area;
                    allTriangles.push(tri);
                }
            });
        });

        // Sort front-to-back for early Z rejection
        allTriangles.sort((a, b) => a.minDepth - b.minDepth);

        // Optimized rasterization with scanline algorithm
        allTriangles.forEach(tri => {
            this.rasterizeTriangleZBuffer(tri, buffer32, this._zBuffer, w, h);
        });

        ctx.putImageData(imgData, 0, 0);
    }

    // Highly optimized scanline rasterizer with proper depth interpolation
    rasterizeTriangleZBuffer(tri, buffer32, zBuffer, w, h) {
        const { v0, v1, v2, packedColor, bounds } = tri;
        const { minX, maxX, minY, maxY } = bounds;

        // Convert to integer screen coordinates
        const x0 = Math.round(v0.screen.x), y0 = Math.round(v0.screen.y), z0 = v0.depth;
        const x1 = Math.round(v1.screen.x), y1 = Math.round(v1.screen.y), z1 = v1.depth;
        const x2 = Math.round(v2.screen.x), y2 = Math.round(v2.screen.y), z2 = v2.depth;

        // Edge setup for inside testing
        const dx01 = x1 - x0, dy01 = y1 - y0;
        const dx12 = x2 - x1, dy12 = y2 - y1;
        const dx20 = x0 - x2, dy20 = y0 - y2;

        // Calculate triangle area for barycentric coordinates
        const area = dx01 * (y2 - y0) - dy01 * (x2 - x0);
        if (Math.abs(area) < 0.5) return; // Degenerate triangle

        const invArea = 1.0 / area;
        const epsilon = 0.001; // Small depth bias to prevent z-fighting

        // Scanline rasterization with edge coherence
        for (let y = minY; y <= maxY; y++) {
            // Calculate edge functions at scanline start
            let e0 = dx01 * (y - y0) - dy01 * (minX - x0);
            let e1 = dx12 * (y - y1) - dy12 * (minX - x1);
            let e2 = dx20 * (y - y2) - dy20 * (minX - x2);

            // Edge increments
            const e0_step = -dy01;
            const e1_step = -dy12;
            const e2_step = -dy20;

            const rowOffset = y * w;

            for (let x = minX; x <= maxX; x++) {
                // Inside test
                if (e0 >= 0 && e1 >= 0 && e2 >= 0) {
                    // Calculate barycentric coordinates
                    const u = e0 * invArea;
                    const v = e1 * invArea;
                    const ww = 1 - u - v;

                    // Interpolate depth with perspective correction
                    const depth = u * z0 + v * z1 + ww * z2;
                    const idx = rowOffset + x;

                    // Depth test with epsilon for stability
                    if (depth >= this._nearPlane && depth <= this._farPlane && depth < zBuffer[idx] - epsilon) {
                        zBuffer[idx] = depth;
                        buffer32[idx] = packedColor;
                    }
                }

                // Increment edge values
                e0 += e0_step;
                e1 += e1_step;
                e2 += e2_step;
            }
        }
    }

    // WebGL-accelerated Z-buffer renderer
    renderZBufferWebGL() {
        const gl = this._renderTextureGLCtx;
        const allObjects = this.getGameObjects();

        // Clear buffers - handle different background types
        if (this._backgroundType === "solid") {
            const bgColor = this.hexToRgb(this._backgroundColor);
            gl.clearColor(bgColor.r / 255, bgColor.g / 255, bgColor.b / 255, 1.0);
        } else if (this._backgroundType === "skyfloor") {
            // For skyfloor, use a solid clear color (sky color) and let 2D rendering handle the gradient
            const skyColor = this.hexToRgb(this._skyColor);
            gl.clearColor(skyColor.r / 255, skyColor.g / 255, skyColor.b / 255, 1.0);
        } else {
            // Transparent
            gl.clearColor(0, 0, 0, 0);
        }

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(this._glProgram);

        // Build proper projection matrix for X=forward, Y=right, Z=up
        const aspect = this._renderTextureWidth / this._renderTextureHeight;
        const fovRadians = this._fieldOfView * (Math.PI / 180);
        const tanHalfFov = Math.tan(fovRadians / 2);
        const near = this._nearPlane;
        const far = this._farPlane;

        // Create perspective projection matrix that maps camera space to clip space
        // Camera space: X=depth(forward), Y=right, Z=up
        // Clip space: X=right, Y=up, Z=depth (with perspective divide)
        const projectionMatrix = new Float32Array([
            1 / (aspect * tanHalfFov), 0, 0, 0,                                    // Maps Y(right) to clip X
            0, 1 / tanHalfFov, 0, 0,                                              // Maps Z(up) to clip Y
            0, 0, -(far + near) / (far - near), -(2 * far * near) / (far - near), // Maps X(depth) to clip Z
            0, 0, -1, 0                                                            // Perspective divide by -X
        ]);

        gl.uniformMatrix4fv(this._glProjectionUniform, false, projectionMatrix);

        // Collect all triangles
        const allTriangles = [];

        allObjects.forEach(obj => {
            if (!obj.active) return;
            const mesh = obj.getModule("Mesh3D") || obj.getModule("CubeMesh3D") || obj.getModule("SphereMesh3D");
            if (!mesh) return;

            const transformedVertices = mesh.transformVertices();
            if (!transformedVertices || !mesh.faces) return;

            const faceColor = mesh.faceColor || mesh._faceColor || "#888888";

            mesh.faces.forEach(face => {
                const worldVerts = face.map(idx => transformedVertices[idx]).filter(v => v);
                if (worldVerts.length < 3) return;

                const cameraVerts = worldVerts.map(v => this.worldToCameraSpace(v));
                if (cameraVerts.length < 3) return;

                const worldNormal = this.calculateFaceNormal(worldVerts[0], worldVerts[1], worldVerts[2]);
                const litColor = this.calculateLighting(worldNormal, faceColor);

                // Clip against near plane
                const clippedVerts = this.clipPolygonAgainstNearPlane(cameraVerts, this._nearPlane);
                if (clippedVerts.length < 3) return;

                // Backface culling
                if (this._enableBackfaceCulling && !this._disableCulling) {
                    if (this.shouldCullFace(clippedVerts)) return;
                }

                // Triangulate polygon
                for (let i = 1; i < clippedVerts.length - 1; i++) {
                    allTriangles.push({
                        vertices: [clippedVerts[0], clippedVerts[i], clippedVerts[i + 1]],
                        color: litColor
                    });
                }
            });
        });

        if (allTriangles.length === 0) {
            // Copy WebGL canvas to 2D canvas even if empty
            this._renderTextureCtx.drawImage(this._renderTextureGL, 0, 0);
            return;
        }

        // Batch render all triangles
        const vertexData = [];
        const colorData = [];

        allTriangles.forEach(tri => {
            tri.vertices.forEach(v => {
                // Send vertices in camera space directly
                // X=depth, Y=right, Z=up (shader will transform with projection matrix)
                vertexData.push(v.x, v.y, v.z);
                colorData.push(tri.color.r / 255, tri.color.g / 255, tri.color.b / 255);
            });
        });

        // Create buffers
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this._glPositionAttrib);
        gl.vertexAttribPointer(this._glPositionAttrib, 3, gl.FLOAT, false, 0, 0);

        const colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorData), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this._glColorAttrib);
        gl.vertexAttribPointer(this._glColorAttrib, 3, gl.FLOAT, false, 0, 0);

        // Draw all triangles
        gl.drawArrays(gl.TRIANGLES, 0, vertexData.length / 3);

        // Copy WebGL canvas to 2D canvas
        this._renderTextureCtx.drawImage(this._renderTextureGL, 0, 0);
    }

    // Highly optimized triangle rasterization with scanline + early Z rejection
    rasterizeTriangleOptimized2(v0, v1, v2, color, data, w, h) {
        // Round to integer coordinates
        const p0 = { x: Math.round(v0.screen.x), y: Math.round(v0.screen.y), z: v0.depth };
        const p1 = { x: Math.round(v1.screen.x), y: Math.round(v1.screen.y), z: v1.depth };
        const p2 = { x: Math.round(v2.screen.x), y: Math.round(v2.screen.y), z: v2.depth };

        // Calculate bounding box
        const minX = Math.max(0, Math.min(p0.x, p1.x, p2.x));
        const maxX = Math.min(w - 1, Math.max(p0.x, p1.x, p2.x));
        const minY = Math.max(0, Math.min(p0.y, p1.y, p2.y));
        const maxY = Math.min(h - 1, Math.max(p0.y, p1.y, p2.y));

        // Early rejection if triangle is completely outside screen
        if (minX > maxX || minY > maxY) return;

        // Precompute edge equations for fast inside testing
        const v0x = p0.x, v0y = p0.y;
        const v1x = p1.x, v1y = p1.y;
        const v2x = p2.x, v2y = p2.y;

        // Edge equations: e = (x2-x1)(y-y1) - (y2-y1)(x-x1)
        const e0_dx = v1x - v0x, e0_dy = v1y - v0y;
        const e1_dx = v2x - v1x, e1_dy = v2y - v1y;
        const e2_dx = v0x - v2x, e2_dy = v0y - v2y;

        // Calculate triangle area for barycentric coordinates
        const area = e0_dx * (v2y - v0y) - e0_dy * (v2x - v0x);
        if (Math.abs(area) < 0.001) return; // Degenerate triangle

        const invArea = 1.0 / area;

        // Precompute color values
        const r = color.r, g = color.g, b = color.b;

        // Scanline rasterization with edge coherence
        for (let y = minY; y <= maxY; y++) {
            // Calculate edge values at start of scanline
            let w0 = e0_dx * (y - v0y) - e0_dy * (minX - v0x);
            let w1 = e1_dx * (y - v1y) - e1_dy * (minX - v1x);
            let w2 = e2_dx * (y - v2y) - e2_dy * (minX - v2x);

            // Edge increments for x-stepping
            const w0_step = -e0_dy;
            const w1_step = -e1_dy;
            const w2_step = -e2_dy;

            for (let x = minX; x <= maxX; x++) {
                // Inside test using edge equations
                if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
                    // Calculate barycentric coordinates for depth interpolation
                    const u = w0 * invArea;
                    const v = w1 * invArea;
                    const ww = 1 - u - v;

                    // Interpolate depth
                    const depth = p0.z * u + p1.z * v + p2.z * ww;

                    const idx = y * w + x;

                    // Depth test with early rejection
                    if (depth >= this._nearPlane && depth <= this._farPlane && depth < this._zBuffer[idx]) {
                        this._zBuffer[idx] = depth;
                        const pixelIdx = idx * 4;
                        data[pixelIdx] = r;
                        data[pixelIdx + 1] = g;
                        data[pixelIdx + 2] = b;
                        data[pixelIdx + 3] = 255;
                    }
                }

                // Increment edge values
                w0 += w0_step;
                w1 += w1_step;
                w2 += w2_step;
            }
        }
    }

    rasterizeTriangle(v0, v1, v2, color, data, w, h) {
        const p0 = { x: Math.round(v0.screen.x), y: Math.round(v0.screen.y), z: v0.depth };
        const p1 = { x: Math.round(v1.screen.x), y: Math.round(v1.screen.y), z: v1.depth };
        const p2 = { x: Math.round(v2.screen.x), y: Math.round(v2.screen.y), z: v2.depth };
        const minX = Math.max(0, Math.min(p0.x, p1.x, p2.x));
        const maxX = Math.min(w - 1, Math.max(p0.x, p1.x, p2.x));
        const minY = Math.max(0, Math.min(p0.y, p1.y, p2.y));
        const maxY = Math.min(h - 1, Math.max(p0.y, p1.y, p2.y));
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const bary = this.barycentric(p0, p1, p2, x, y);
                if (bary.u >= 0 && bary.v >= 0 && bary.w >= 0) {
                    const depth = bary.u * p0.z + bary.v * p1.z + bary.w * p2.z;
                    const idx = y * w + x;
                    if (depth >= this._nearPlane && depth <= this._farPlane && depth < this._zBuffer[idx]) {
                        this._zBuffer[idx] = depth;
                        const pixelIdx = idx * 4;
                        data[pixelIdx] = color.r; data[pixelIdx + 1] = color.g;
                        data[pixelIdx + 2] = color.b; data[pixelIdx + 3] = 255;
                    }
                }
            }
        }
    }

    barycentric(p0, p1, p2, x, y) {
        const denom = (p1.y - p2.y) * (p0.x - p2.x) + (p2.x - p1.x) * (p0.y - p2.y);
        if (Math.abs(denom) < 0.001) return { u: -1, v: -1, w: -1 };
        const u = ((p1.y - p2.y) * (x - p2.x) + (p2.x - p1.x) * (y - p2.y)) / denom;
        const v = ((p2.y - p0.y) * (x - p2.x) + (p0.x - p2.x) * (y - p2.y)) / denom;
        return { u, v, w: 1 - u - v };
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    renderScanline() {
        const allObjects = this.getGameObjects();
        const ctx = this._renderTextureCtx;
        const w = this._renderTextureWidth, h = this._renderTextureHeight;

        // Clear buffers
        this._zBuffer.fill(Infinity);
        this.clearRenderTexture();

        // Build edge table and active edge table
        const edgeTable = Array.from({ length: h }, () => []);
        const activeEdges = [];

        allObjects.forEach(obj => {
            if (!obj.active) return;
            const mesh = obj.getModule("Mesh3D") || obj.getModule("CubeMesh3D") || obj.getModule("SphereMesh3D");
            if (!mesh) return;
            const transformedVertices = mesh.transformVertices();
            if (!transformedVertices || !mesh.faces) return;

            mesh.faces.forEach(face => {
                const cameraVerts = face.map(idx =>
                    idx < transformedVertices.length ? this.worldToCameraSpace(transformedVertices[idx]) : null
                ).filter(v => v);

                if (cameraVerts.length < 3) return;

                const clippedVerts = this.clipPolygonAgainstNearPlane(cameraVerts, this._nearPlane);
                if (clippedVerts.length < 3) return;

                // Backface culling using consistent method (after clipping)
                if (this._enableBackfaceCulling && !this._disableCulling) {
                    if (this.shouldCullFace(clippedVerts)) {
                        return;
                    }
                }

                const useExtendedFOV = this._enableBackfaceCulling && !this._disableCulling;
                const screenVerts = clippedVerts.map(cv => {
                    const proj = this.projectCameraPoint(cv, useExtendedFOV);
                    return proj ? { screen: proj, depth: cv.x } : null;
                }).filter(v => v);

                if (screenVerts.length < 3) return;

                // Add edges to edge table for each triangle in the polygon
                for (let i = 1; i < screenVerts.length - 1; i++) {
                    const tri = [screenVerts[0], screenVerts[i], screenVerts[i + 1]];
                    this.addTriangleEdgesToEdgeTable(tri, edgeTable, h);
                }
            });
        });

        // Process scanlines using active edge table
        for (let y = 0; y < h; y++) {
            // Add edges that start at this scanline
            edgeTable[y].forEach(edge => {
                activeEdges.push(edge);
            });

            // Remove edges that end at this scanline
            for (let i = activeEdges.length - 1; i >= 0; i--) {
                if (Math.ceil(activeEdges[i].yEnd) <= y) {
                    activeEdges.splice(i, 1);
                }
            }

            if (activeEdges.length < 2) continue;

            // Sort active edges by x coordinate
            activeEdges.sort((a, b) => a.x - b.x);

            // Fill between edge pairs
            for (let i = 0; i < activeEdges.length - 1; i += 2) {
                const leftEdge = activeEdges[i];
                const rightEdge = activeEdges[i + 1];

                const xStart = Math.max(0, Math.ceil(leftEdge.x));
                const xEnd = Math.min(w - 1, Math.floor(rightEdge.x));

                if (xStart > xEnd) continue;

                // Calculate depth values for left and right edges
                const leftZ = leftEdge.z + (y - leftEdge.yStart) * leftEdge.zSlope;
                const rightZ = rightEdge.z + (y - rightEdge.yStart) * rightEdge.zSlope;

                // Fill scanline
                for (let x = xStart; x <= xEnd; x++) {
                    if (x < 0 || x >= w) continue;

                    const t = (xEnd - xStart) > 0 ? (x - xStart) / (xEnd - xStart) : 0;
                    const z = leftZ + t * (rightZ - leftZ);
                    const idx = y * w + x;

                    if (z >= this._nearPlane && z <= this._farPlane && z < this._zBuffer[idx]) {
                        this._zBuffer[idx] = z;

                        // Set pixel color (use a default color for now)
                        const color = leftEdge.color || "#888888";
                        ctx.fillStyle = color;
                        ctx.fillRect(x, y, 1, 1);
                    }
                }
            }

            // Update active edges for next scanline
            activeEdges.forEach(edge => {
                edge.x += edge.slope;
                edge.z += edge.zSlope;
            });
        }
    }

    // WebGL-accelerated raster rendering
    renderRasterWebGL() {
        const gl = this._renderTextureGLCtx;
        const allObjects = this.getGameObjects();

        // Clear buffers - handle different background types
        if (this._backgroundType === "solid") {
            const bgColor = this.hexToRgb(this._backgroundColor);
            gl.clearColor(bgColor.r / 255, bgColor.g / 255, bgColor.b / 255, 1.0);
        } else if (this._backgroundType === "skyfloor") {
            // For skyfloor, use a solid clear color (sky color) and let 2D rendering handle the gradient
            const skyColor = this.hexToRgb(this._skyColor);
            gl.clearColor(skyColor.r / 255, skyColor.g / 255, skyColor.b / 255, 1.0);
        } else {
            // Transparent
            gl.clearColor(0, 0, 0, 0);
        }

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(this._glProgram);

        // Build proper projection matrix for X=forward, Y=right, Z=up
        const aspect = this._renderTextureWidth / this._renderTextureHeight;
        const fovRadians = this._fieldOfView * (Math.PI / 180);
        const tanHalfFov = Math.tan(fovRadians / 2);
        const near = this._nearPlane;
        const far = this._farPlane;

        // Create perspective projection matrix that maps camera space to clip space
        // Camera space: X=depth(forward), Y=right, Z=up
        // Clip space: X=right, Y=up, Z=depth (with perspective divide)
        const projectionMatrix = new Float32Array([
            1 / (aspect * tanHalfFov), 0, 0, 0,                                    // Maps Y(right) to clip X
            0, 1 / tanHalfFov, 0, 0,                                              // Maps Z(up) to clip Y
            0, 0, -(far + near) / (far - near), -(2 * far * near) / (far - near), // Maps X(depth) to clip Z
            0, 0, -1, 0                                                            // Perspective divide by -X
        ]);

        gl.uniformMatrix4fv(this._glProjectionUniform, false, projectionMatrix);

        // Collect all triangles
        const allTriangles = [];

        allObjects.forEach(obj => {
            if (!obj.active) return;
            const mesh = obj.getModule("Mesh3D") || obj.getModule("CubeMesh3D") || obj.getModule("SphereMesh3D");
            if (!mesh) return;

            const transformedVertices = mesh.transformVertices();
            if (!transformedVertices || !mesh.faces) return;

            const faceColor = mesh.faceColor || mesh._faceColor || "#888888";

            mesh.faces.forEach(face => {
                const worldVerts = face.map(idx => transformedVertices[idx]).filter(v => v);
                if (worldVerts.length < 3) return;

                const cameraVerts = worldVerts.map(v => this.worldToCameraSpace(v));
                if (cameraVerts.length < 3) return;

                const worldNormal = this.calculateFaceNormal(worldVerts[0], worldVerts[1], worldVerts[2]);
                const litColor = this.calculateLighting(worldNormal, faceColor);

                // Clip against near plane
                const clippedVerts = this.clipPolygonAgainstNearPlane(cameraVerts, this._nearPlane);
                if (clippedVerts.length < 3) return;

                // Backface culling
                if (this._enableBackfaceCulling && !this._disableCulling) {
                    if (this.shouldCullFace(clippedVerts)) return;
                }

                // Triangulate polygon
                for (let i = 1; i < clippedVerts.length - 1; i++) {
                    allTriangles.push({
                        vertices: [clippedVerts[0], clippedVerts[i], clippedVerts[i + 1]],
                        color: litColor
                    });
                }
            });
        });

        if (allTriangles.length === 0) {
            // Copy WebGL canvas to 2D canvas even if empty
            this._renderTextureCtx.drawImage(this._renderTextureGL, 0, 0);
            return;
        }

        // Batch render all triangles
        const vertexData = [];
        const colorData = [];

        allTriangles.forEach(tri => {
            tri.vertices.forEach(v => {
                // Send vertices in camera space directly
                // X=depth, Y=right, Z=up (shader will transform with projection matrix)
                vertexData.push(v.x, v.y, v.z);
                colorData.push(tri.color.r / 255, tri.color.g / 255, tri.color.b / 255);
            });
        });

        // Create buffers
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this._glPositionAttrib);
        gl.vertexAttribPointer(this._glPositionAttrib, 3, gl.FLOAT, false, 0, 0);

        const colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorData), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this._glColorAttrib);
        gl.vertexAttribPointer(this._glColorAttrib, 3, gl.FLOAT, false, 0, 0);

        // Draw all triangles
        gl.drawArrays(gl.TRIANGLES, 0, vertexData.length / 3);

        // Copy WebGL canvas to 2D canvas
        this._renderTextureCtx.drawImage(this._renderTextureGL, 0, 0);
    }

    /**
 * Optimized pure raster rendering using scanline algorithm
 * Fast forward rasterization without Z-buffer overhead
 */
    renderRasterOptimized() {
        const allObjects = this.getGameObjects();
        const ctx = this._renderTextureCtx;
        const imgData = this._imageData;
        const data = imgData.data;
        const w = this._renderTextureWidth;
        const h = this._renderTextureHeight;

        // Use Uint32Array for faster pixel writes
        const buffer32 = new Uint32Array(imgData.data.buffer);

        // Clear background efficiently
        this.clearBackgroundFast(buffer32, w, h);

        // Collect all triangles
        const allTriangles = [];

        allObjects.forEach(obj => {
            if (!obj.active) return;
            const mesh = obj.getModule("Mesh3D") || obj.getModule("CubeMesh3D") || obj.getModule("SphereMesh3D");
            if (!mesh) return;

            const transformedVertices = mesh.transformVertices();
            if (!transformedVertices || !mesh.faces) return;
            const faceColor = mesh.faceColor || mesh._faceColor || "#888888";

            mesh.faces.forEach(face => {
                const worldVerts = face.map(idx => transformedVertices[idx]).filter(v => v);
                if (worldVerts.length < 3) return;

                const cameraVerts = worldVerts.map(v => this.worldToCameraSpace(v));
                if (cameraVerts.length < 3) return;

                // Clip against near plane
                const clippedVerts = this.clipPolygonAgainstNearPlane(cameraVerts, this._nearPlane);
                if (clippedVerts.length < 3) return;

                // Backface culling
                if (this._enableBackfaceCulling && !this._disableCulling) {
                    if (this.shouldCullFace(clippedVerts)) return;
                }

                const worldNormal = this.calculateFaceNormal(worldVerts[0], worldVerts[1], worldVerts[2]);
                const litColor = this.calculateLighting(worldNormal, faceColor);

                // Project vertices
                const useExtendedFOV = this._enableBackfaceCulling && !this._disableCulling;
                const screenVerts = clippedVerts.map(cv => {
                    const proj = this.projectCameraPoint(cv, useExtendedFOV);
                    return proj ? { screen: proj, depth: cv.x } : null;
                }).filter(v => v);

                if (screenVerts.length < 3) return;

                // Pack color as 32-bit value (ABGR format for little-endian)
                const packedColor = (255 << 24) | (litColor.b << 16) | (litColor.g << 8) | litColor.r;

                // Triangulate and add to list
                for (let i = 1; i < screenVerts.length - 1; i++) {
                    allTriangles.push({
                        v0: screenVerts[0],
                        v1: screenVerts[i],
                        v2: screenVerts[i + 1],
                        packedColor: packedColor,
                        avgDepth: (screenVerts[0].depth + screenVerts[i].depth + screenVerts[i + 1].depth) / 3
                    });
                }
            });
        });

        // Sort back-to-front for painter's algorithm
        allTriangles.sort((a, b) => b.avgDepth - a.avgDepth);

        // Rasterize all triangles
        allTriangles.forEach(tri => {
            this.rasterizeTriangleFast(tri, buffer32, w, h);
        });

        ctx.putImageData(imgData, 0, 0);
    }

    // Optimized pure raster renderer for better performance
    renderRasterHybrid() {
        const allObjects = this.getGameObjects();
        const imgData = this._imageData;
        const data = imgData.data;
        const w = this._renderTextureWidth;
        const h = this._renderTextureHeight;

        // Use Uint32Array for faster pixel writes (write 4 bytes at once)
        const buffer32 = new Uint32Array(imgData.data.buffer);
        const zbuffer = this._zBuffer;

        // Clear background with single color write
        const bgColor = this.hexToRgb(this._backgroundColor);
        const bgPixel = (255 << 24) | (bgColor.b << 16) | (bgColor.g << 8) | bgColor.r;

        for (let i = 0; i < buffer32.length; i++) {
            buffer32[i] = bgPixel;
        }
        zbuffer.fill(Infinity);

        // Collect triangles (unchanged)
        const allTriangles = [];

        allObjects.forEach(obj => {
            if (!obj.active) return;
            const mesh = obj.getModule("Mesh3D") || obj.getModule("CubeMesh3D") || obj.getModule("SphereMesh3D");
            if (!mesh) return;

            const transformedVertices = mesh.transformVertices();
            if (!transformedVertices || !mesh.faces) return;
            const faceColor = mesh.faceColor || mesh._faceColor || "#888888";

            mesh.faces.forEach(face => {
                const worldVerts = face.map(idx => transformedVertices[idx]).filter(v => v);
                if (worldVerts.length < 3) return;

                const cameraVerts = worldVerts.map(v => this.worldToCameraSpace(v));
                if (cameraVerts.length < 3) return;

                const worldNormal = this.calculateFaceNormal(worldVerts[0], worldVerts[1], worldVerts[2]);
                const litColor = this.calculateLighting(worldNormal, faceColor);

                let clippedVerts = this.clipPolygonAgainstNearPlane(cameraVerts, this._nearPlane);
                if (clippedVerts.length < 3) return;

                if (this._enableBackfaceCulling && !this._disableCulling) {
                    if (this.shouldCullFace(clippedVerts)) return;
                }

                const useExtendedFOV = this._enableBackfaceCulling && !this._disableCulling;
                const screenVerts = clippedVerts.map(cv => {
                    const proj = this.projectCameraPoint(cv, useExtendedFOV);
                    return proj ? { screen: proj, depth: cv.x } : null;
                }).filter(v => v);

                if (screenVerts.length < 3) return;

                for (let i = 1; i < screenVerts.length - 1; i++) {
                    allTriangles.push({
                        v0: screenVerts[0],
                        v1: screenVerts[i],
                        v2: screenVerts[i + 1],
                        color: litColor
                    });
                }
            });
        });

        // Pre-compute color as packed 32-bit value
        allTriangles.forEach(tri => {
            const c = tri.color;
            tri.packedColor = (255 << 24) | (c.b << 16) | (c.g << 8) | c.r;
        });

        // Rasterize with optimized inner loop
        allTriangles.forEach(tri => {
            this.rasterizeTriangleUltraFast(tri, buffer32, zbuffer, w, h);
        });

        this._renderTextureCtx.putImageData(imgData, 0, 0);
    }

    // Ultra-fast triangle rasterization using 32-bit writes
    rasterizeTriangleUltraFast(tri, buffer32, zbuffer, w, h) {
        const p0 = { x: Math.round(tri.v0.screen.x), y: Math.round(tri.v0.screen.y), z: tri.v0.depth };
        const p1 = { x: Math.round(tri.v1.screen.x), y: Math.round(tri.v1.screen.y), z: tri.v1.depth };
        const p2 = { x: Math.round(tri.v2.screen.x), y: Math.round(tri.v2.screen.y), z: tri.v2.depth };

        const minX = Math.max(0, Math.min(p0.x, p1.x, p2.x));
        const maxX = Math.min(w - 1, Math.max(p0.x, p1.x, p2.x));
        const minY = Math.max(0, Math.min(p0.y, p1.y, p2.y));
        const maxY = Math.min(h - 1, Math.max(p0.y, p1.y, p2.y));

        if (minX > maxX || minY > maxY) return;

        // Edge setup (once per triangle)
        const v0x = p0.x, v0y = p0.y;
        const v1x = p1.x, v1y = p1.y;
        const v2x = p2.x, v2y = p2.y;

        const e0_dx = v1x - v0x, e0_dy = v1y - v0y;
        const e1_dx = v2x - v1x, e1_dy = v2y - v1y;
        const e2_dx = v0x - v2x, e2_dy = v0y - v2y;

        const area = e0_dx * (v2y - v0y) - e0_dy * (v2x - v0x);
        if (Math.abs(area) < 0.001) return;

        const invArea = 1.0 / area;
        const packedColor = tri.packedColor;

        // Scanline loop with edge coherence
        for (let y = minY; y <= maxY; y++) {
            let w0 = e0_dx * (y - v0y) - e0_dy * (minX - v0x);
            let w1 = e1_dx * (y - v1y) - e1_dy * (minX - v1x);
            let w2 = e2_dx * (y - v2y) - e2_dy * (minX - v2x);

            const w0_step = -e0_dy;
            const w1_step = -e1_dy;
            const w2_step = -e2_dy;

            const rowOffset = y * w;

            for (let x = minX; x <= maxX; x++) {
                if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
                    const u = w0 * invArea;
                    const v = w1 * invArea;
                    const ww = 1 - u - v;

                    const depth = p0.z * u + p1.z * v + p2.z * ww;
                    const idx = rowOffset + x;

                    if (depth >= this._nearPlane && depth <= this._farPlane && depth < zbuffer[idx]) {
                        zbuffer[idx] = depth;
                        buffer32[idx] = packedColor;
                    }
                }

                w0 += w0_step;
                w1 += w1_step;
                w2 += w2_step;
            }
        }
    }

    // Optimized triangle rasterization with tight bounds and early rejection
    rasterizeTriangleOptimized(tri, data, width, height, tileX, tileY, tileEndX, tileEndY) {
        const { v0, v1, v2, color } = tri;

        // Calculate triangle bounds within tile
        const minX = Math.max(tileX, Math.floor(Math.min(v0.x, v1.x, v2.x)));
        const maxX = Math.min(tileEndX - 1, Math.ceil(Math.max(v0.x, v1.x, v2.x)));
        const minY = Math.max(tileY, Math.floor(Math.min(v0.y, v1.y, v2.y)));
        const maxY = Math.min(tileEndY - 1, Math.ceil(Math.max(v0.y, v1.y, v2.y)));

        if (minX > maxX || minY > maxY) return;

        // Precompute edge equations for faster inside testing
        const edge0 = this.computeEdgeFunction(v1, v2);
        const edge1 = this.computeEdgeFunction(v2, v0);
        const edge2 = this.computeEdgeFunction(v0, v1);

        // Calculate area (for barycentric coordinates)
        const area = edge0.c + edge1.c + edge2.c;
        if (Math.abs(area) < 0.001) return;

        const invArea = 1.0 / area;

        // Scanline rasterization with edge stepping
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                // Evaluate edge functions
                const w0 = edge0.a * x + edge0.b * y + edge0.c;
                const w1 = edge1.a * x + edge1.b * y + edge1.c;
                const w2 = edge2.a * x + edge2.b * y + edge2.c;

                // Inside test
                if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
                    // Calculate barycentric coordinates
                    const baryU = w0 * invArea;
                    const baryV = w1 * invArea;
                    const baryW = w2 * invArea;

                    // Interpolate depth
                    const depth = baryU * v0.z + baryV * v1.z + baryW * v2.z;
                    const idx = y * width + x;

                    // Depth test with early rejection
                    if (depth >= this._nearPlane && depth <= this._farPlane && depth < this._zBuffer[idx]) {
                        this._zBuffer[idx] = depth;
                        const pixelIdx = idx * 4;
                        data[pixelIdx] = color.r;
                        data[pixelIdx + 1] = color.g;
                        data[pixelIdx + 2] = color.b;
                        data[pixelIdx + 3] = 255;
                    }
                }
            }
        }
    }

    // Compute edge function coefficients for fast inside testing
    computeEdgeFunction(v0, v1) {
        const a = v0.y - v1.y;
        const b = v1.x - v0.x;
        const c = v0.x * v1.y - v0.y * v1.x;
        return { a, b, c };
    }

    // Ray-traced hybrid rendering with rasterized base and ray-traced enhancements
    renderRaytraceHybrid() {
        const allObjects = this.getGameObjects();
        const ctx = this._renderTextureCtx;
        const imgData = this._imageData;
        const data = imgData.data;
        const w = this._renderTextureWidth, h = this._renderTextureHeight;

        // Handle background clearing based on background type
        if (this._backgroundType === "transparent") {
            // For transparent background, only clear pixels that will have geometry
            // Leave non-geometry pixels as they are (transparent)
        } else {
            // For solid or sky/floor backgrounds, clear all pixels first
            if (this._backgroundType === "solid") {
                const bgColor = this.hexToRgb(this._backgroundColor);
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = bgColor.r; data[i + 1] = bgColor.g; data[i + 2] = bgColor.b; data[i + 3] = 255;
                }
            } else if (this._backgroundType === "skyfloor") {
                // Calculate dynamic horizon based on camera pitch and FOV for accuracy
                const fovRadians = this._fieldOfView * (Math.PI / 180);
                const pitchRadians = (this._rotation.y || 0) * (Math.PI / 180);
                const maxPitch = fovRadians / 2;
                const normalizedPitch = -Math.max(-1, Math.min(1, pitchRadians / maxPitch)); // Clamp to [-1, 1]
                const horizonOffset = normalizedPitch * 0.5; // Scale to [-0.5, 0.5]
                const horizonRatio = 0.5 + horizonOffset; // 0.5 when level, shifts based on pitch

                // Clamp horizon between 0 and 1 to avoid extreme cases
                const clampedHorizon = Math.max(0, Math.min(1, horizonRatio));
                const horizonY = Math.floor(h * clampedHorizon);

                for (let i = 0; i < data.length; i += 4) {
                    const y = Math.floor((i / 4) / w);
                    if (y < horizonY) {
                        data[i] = this.hexToRgb(this._skyColor).r;
                        data[i + 1] = this.hexToRgb(this._skyColor).g;
                        data[i + 2] = this.hexToRgb(this._skyColor).b;
                    } else {
                        data[i] = this.hexToRgb(this._floorColor).r;
                        data[i + 1] = this.hexToRgb(this._floorColor).g;
                        data[i + 2] = this.hexToRgb(this._floorColor).b;
                    }
                    data[i + 3] = 255;
                }
            }
        }
        this._zBuffer.fill(Infinity);

        // Collect triangles for both rasterization and ray tracing
        // Collect triangles for both rasterization and ray tracing
        const allTriangles = [];
        allObjects.forEach(obj => {
            if (!obj.active) return;
            const mesh = obj.getModule("Mesh3D") || obj.getModule("CubeMesh3D") || obj.getModule("SphereMesh3D");
            if (!mesh) return;
            const transformedVertices = mesh.transformVertices();
            if (!transformedVertices || !mesh.faces) return;
            const faceColor = mesh.faceColor || mesh._faceColor || "#888888";

            mesh.faces.forEach(face => {
                const worldVerts = face.map(idx =>
                    idx < transformedVertices.length ? transformedVertices[idx] : null
                ).filter(v => v);
                if (worldVerts.length < 3) return;

                const cameraVerts = worldVerts.map(v => this.worldToCameraSpace(v));
                if (cameraVerts.length < 3) return;

                const worldNormal = this.calculateFaceNormal(worldVerts[0], worldVerts[1], worldVerts[2]);

                for (let i = 1; i < cameraVerts.length - 1; i++) {
                    const v0 = cameraVerts[0], v1 = cameraVerts[i], v2 = cameraVerts[i + 1];

                    // Backface culling BEFORE clipping using original camera space vertices
                    if (this._enableBackfaceCulling && !this._disableCulling) {
                        if (this.shouldCullFace([v0, v1, v2])) {
                            continue; // Cull back-facing triangles
                        }
                    }

                    // Clip triangle against near plane
                    const clippedV0 = this.clipPolygonAgainstNearPlane([v0], this._nearPlane);
                    const clippedV1 = this.clipPolygonAgainstNearPlane([v1], this._nearPlane);
                    const clippedV2 = this.clipPolygonAgainstNearPlane([v2], this._nearPlane);

                    if (clippedV0.length > 0 && clippedV1.length > 0 && clippedV2.length > 0) {
                        allTriangles.push({
                            v0: clippedV0[0] || v0,
                            v1: clippedV1[0] || v1,
                            v2: clippedV2[0] || v2,
                            worldNormal,
                            baseColor: faceColor
                        });
                    }
                }
            });
        });

        // Build BVH for ray tracing
        const bvh = this.buildBVH(allTriangles, 8);

        // Rasterize base geometry
        allTriangles.forEach(tri => {
            const useExtendedFOV = this._enableBackfaceCulling && !this._disableCulling;
            const p0 = this.projectCameraPoint(tri.v0, useExtendedFOV);
            const p1 = this.projectCameraPoint(tri.v1, useExtendedFOV);
            const p2 = this.projectCameraPoint(tri.v2, useExtendedFOV);

            if (!p0 || !p1 || !p2) return;

            const screenTri = {
                v0: { x: p0.x, y: p0.y, z: tri.v0.x },
                v1: { x: p1.x, y: p1.y, z: tri.v1.x },
                v2: { x: p2.x, y: p2.y, z: tri.v2.x },
                color: this.calculateLighting(tri.worldNormal, tri.baseColor)
            };

            this.rasterizeTriangleOptimized(screenTri, data, w, h, 0, 0, w, h);
        });

        // Second pass: Ray-traced enhancements (reflections, shadows, etc.)
        // Only process pixels that have geometry and sample every 4th pixel for performance
        const rayStep = 4;
        const aspect = w / h;
        const fovRadians = this.fieldOfView * (Math.PI / 180);
        const tanHalfFov = Math.tan(fovRadians * 0.5);

        // Pre-filter triangles that are potentially visible for ray tracing
        const visibleTriangles = [];
        allTriangles.forEach(tri => {
            // Quick frustum check - only include triangles that might be visible
            // Camera looks along +X axis, so X coordinate represents depth
            const avgDepth = (tri.v0.x + tri.v1.x + tri.v2.x) / 3;

            // Check if triangle intersects frustum (between near and far planes)
            const vertices = [tri.v0, tri.v1, tri.v2];
            let inFrontNear = 0;
            let behindFar = 0;

            for (const vertex of vertices) {
                if (vertex.x >= this._nearPlane) inFrontNear++;
                if (vertex.x <= this._farPlane) behindFar++;
            }

            // Include triangle if it intersects the frustum
            const isInFrustum = !(behindFar === 0) && (inFrontNear === 3 || inFrontNear > 0);

            if (isInFrustum) {
                // Additional FOV check for better culling
                const useExtendedFov = !this._disableCulling;
                const p0 = this.projectCameraPoint(tri.v0, useExtendedFov);
                const p1 = this.projectCameraPoint(tri.v1, useExtendedFov);
                const p2 = this.projectCameraPoint(tri.v2, useExtendedFov);

                // If any vertex projects successfully, include triangle for ray tracing
                if (p0 || p1 || p2) {
                    visibleTriangles.push(tri);
                }
            }
        });

        for (let y = 0; y < h; y += rayStep) {
            for (let x = 0; x < w; x += rayStep) {
                const idx = y * w + x;
                const depth = this._zBuffer[idx];

                if (depth === Infinity || depth >= this._farPlane) continue;

                // Cast ray for this pixel
                const u = (x / w) * 2 - 1;
                const v = 1 - (y / h) * 2;
                const rayDirX = 1;
                const rayDirY = u * tanHalfFov * aspect;
                const rayDirZ = v * tanHalfFov;
                const rayLen = Math.sqrt(rayDirX * rayDirX + rayDirY * rayDirY + rayDirZ * rayDirZ);
                const rayDir = { x: rayDirX / rayLen, y: rayDirY / rayLen, z: rayDirZ / rayLen };
                const rayOrigin = { x: 0, y: 0, z: 0 };

                // Simple ambient occlusion approximation using pre-filtered triangles
                const aoSamples = 3;
                let occluded = 0;

                for (let i = 0; i < aoSamples; i++) {
                    const offset = { x: rayDir.x * depth, y: rayDir.y * depth, z: rayDir.z * depth };
                    const sampleOrigin = {
                        x: offset.x + (Math.random() - 0.5) * 0.5,
                        y: offset.y + (Math.random() - 0.5) * 0.5,
                        z: offset.z + (Math.random() - 0.5) * 0.5
                    };

                    const hit = this.traceRayBVH(sampleOrigin, this._lightDirection, bvh, 0.01, 10);
                    if (hit) occluded++;
                }

                const ao = 1.0 - (occluded / aoSamples) * 0.5;
                const pixelIdx = idx * 4;
                data[pixelIdx] = Math.round(data[pixelIdx] * ao);
                data[pixelIdx + 1] = Math.round(data[pixelIdx + 1] * ao);
                data[pixelIdx + 2] = Math.round(data[pixelIdx + 2] * ao);
            }
        }

        ctx.putImageData(imgData, 0, 0);
    }

    addTriangleEdgesToEdgeTable(tri, edgeTable, h) {
        // Calculate face normal and apply lighting
        const v0World = tri[0], v1World = tri[1], v2World = tri[2];
        const normal = this.calculateFaceNormal(
            { x: v0World.depth, y: v0World.screen.x, z: v0World.screen.y },
            { x: v1World.depth, y: v1World.screen.x, z: v1World.screen.y },
            { x: v2World.depth, y: v2World.screen.x, z: v2World.screen.y }
        );
        const litColor = this.calculateLighting(normal, "#888888");
        const colorStr = `rgb(${litColor.r}, ${litColor.g}, ${litColor.b})`;

        // Add all three edges of the triangle to the edge table
        const edges = [
            { v0: tri[0], v1: tri[1] },
            { v0: tri[1], v1: tri[2] },
            { v0: tri[2], v1: tri[0] }
        ];

        edges.forEach(edge => {
            let y0 = Math.round(edge.v0.screen.y);
            let y1 = Math.round(edge.v1.screen.y);
            let x0 = edge.v0.screen.x;
            let x1 = edge.v1.screen.x;
            let z0 = edge.v0.depth;
            let z1 = edge.v1.depth;

            // Make sure y0 <= y1
            if (y0 > y1) {
                [y0, y1, x0, x1, z0, z1] = [y1, y0, x1, x0, z1, z0];
            }

            // Skip horizontal edges
            if (y0 === y1) return;

            const yStart = Math.max(0, y0);
            const yEnd = Math.min(h - 1, y1);

            if (yStart >= yEnd) return;

            const deltaY = y1 - y0;
            const deltaX = x1 - x0;
            const deltaZ = z1 - z0;

            const slope = deltaX / deltaY;
            const zSlope = deltaZ / deltaY;

            // Add edge to edge table at starting y coordinate
            if (yStart < edgeTable.length) {
                edgeTable[yStart].push({
                    x: x0,
                    yStart: y0,
                    yEnd: y1,
                    slope: slope,
                    z: z0,
                    zSlope: zSlope,
                    color: colorStr
                });
            }
        });
    }

    renderWebGLRaytrace() {
        const gl = this._renderTextureGLCtx;

        if (!this._glRaytraceProgram) {
            const success = this.initWebGLRaytracingShaders();
            if (!success) {
                console.warn("Failed to initialize raytracing shaders, falling back to raster");
                this.renderRasterWebGL();
                return;
            }
        }

        const allObjects = this.getGameObjects();
        const triangles = [];

        allObjects.forEach(obj => {
            if (!obj.active) return;
            const mesh = obj.getModule("Mesh3D") || obj.getModule("CubeMesh3D") || obj.getModule("SphereMesh3D");
            if (!mesh) return;

            const transformedVertices = mesh.transformVertices();
            if (!transformedVertices || !mesh.faces) return;

            const faceColor = mesh.faceColor || mesh._faceColor || "#888888";

            mesh.faces.forEach(face => {
                const worldVerts = face.map(idx => transformedVertices[idx]).filter(v => v);
                if (worldVerts.length < 3) return;

                const cameraVerts = worldVerts.map(v => this.worldToCameraSpace(v));
                if (cameraVerts.length < 3) return;

                // Clip against near plane
                const clippedVerts = this.clipPolygonAgainstNearPlane(cameraVerts, this._nearPlane);
                if (clippedVerts.length < 3) return;

                // Backface culling
                if (this._enableBackfaceCulling && !this._disableCulling) {
                    if (this.shouldCullFace(clippedVerts)) return;
                }

                const worldNormal = this.calculateFaceNormal(worldVerts[0], worldVerts[1], worldVerts[2]);
                const litColor = this.calculateLighting(worldNormal, faceColor);

                for (let i = 1; i < clippedVerts.length - 1; i++) {
                    triangles.push({
                        v0: clippedVerts[0],
                        v1: clippedVerts[i],
                        v2: clippedVerts[i + 1],
                        color: litColor,
                        normal: worldNormal
                    });
                }
            });
        });

        if (triangles.length === 0) {
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            this._renderTextureCtx.drawImage(this._renderTextureGL, 0, 0);
            return;
        }

        // Pack triangle data
        const texWidth = 64;
        const texHeight = Math.ceil((triangles.length * 5) / texWidth);
        const triangleData = new Float32Array(texWidth * texHeight * 4);

        triangles.forEach((tri, idx) => {
            const baseIdx = idx * 20;

            // Vertex 0 (camera space)
            triangleData[baseIdx + 0] = tri.v0.x;
            triangleData[baseIdx + 1] = tri.v0.y;
            triangleData[baseIdx + 2] = tri.v0.z;
            triangleData[baseIdx + 3] = 1.0;

            // Vertex 1 (camera space)
            triangleData[baseIdx + 4] = tri.v1.x;
            triangleData[baseIdx + 5] = tri.v1.y;
            triangleData[baseIdx + 6] = tri.v1.z;
            triangleData[baseIdx + 7] = 1.0;

            // Vertex 2 (camera space)
            triangleData[baseIdx + 8] = tri.v2.x;
            triangleData[baseIdx + 9] = tri.v2.y;
            triangleData[baseIdx + 10] = tri.v2.z;
            triangleData[baseIdx + 11] = 1.0;

            // Color (pre-lit)
            triangleData[baseIdx + 12] = tri.color.r / 255;
            triangleData[baseIdx + 13] = tri.color.g / 255;
            triangleData[baseIdx + 14] = tri.color.b / 255;
            triangleData[baseIdx + 15] = 1.0;

            // Normal
            triangleData[baseIdx + 16] = tri.normal.x;
            triangleData[baseIdx + 17] = tri.normal.y;
            triangleData[baseIdx + 18] = tri.normal.z;
            triangleData[baseIdx + 19] = 0.0;
        });

        // Create texture ONCE and reuse it
        if (!this._glTriangleTexture) {
            this._glTriangleTexture = gl.createTexture();
            this._glTriangleTextureWidth = 0;
            this._glTriangleTextureHeight = 0;
        }

        gl.bindTexture(gl.TEXTURE_2D, this._glTriangleTexture);

        // Always update texture data every frame (not just when size changes)
        if (this._glTriangleTextureWidth !== texWidth || this._glTriangleTextureHeight !== texHeight) {
            // Reallocate texture
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texWidth, texHeight, 0, gl.RGBA, gl.FLOAT, triangleData);
            this._glTriangleTextureWidth = texWidth;
            this._glTriangleTextureHeight = texHeight;
        } else {
            // Update existing texture (this needs to happen every frame!)
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, texWidth, texHeight, gl.RGBA, gl.FLOAT, triangleData);
        }

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Calculate horizon for background
        const fovRadians = this._fieldOfView * (Math.PI / 180);
        const pitchRadians = (this._rotation.y || 0) * (Math.PI / 180);
        const maxPitch = fovRadians / 2;
        const normalizedPitch = -Math.max(-1, Math.min(1, pitchRadians / maxPitch));
        const horizonOffset = normalizedPitch * 0.5;
        const horizonRatio = 0.5 + horizonOffset;
        const clampedHorizon = Math.max(0, Math.min(1, horizonRatio));

        gl.useProgram(this._glRaytraceProgram);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._glRaytraceQuadBuffer);
        gl.enableVertexAttribArray(this._glRaytracePositionAttrib);
        gl.vertexAttribPointer(this._glRaytracePositionAttrib, 2, gl.FLOAT, false, 0, 0);

        // Camera is at origin in camera space (rays start from here)
        gl.uniform3f(this._glRaytraceUniforms.cameraPos, 0, 0, 0);

        // Camera rotation is identity in camera space (we already transformed to camera space)
        gl.uniformMatrix3fv(this._glRaytraceUniforms.cameraRotation, false, [
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ]);

        gl.uniform1f(this._glRaytraceUniforms.fov, this._fieldOfView);
        gl.uniform1f(this._glRaytraceUniforms.nearPlane, this._nearPlane);
        gl.uniform1f(this._glRaytraceUniforms.farPlane, this._farPlane);
        gl.uniform2f(this._glRaytraceUniforms.resolution, this._renderTextureWidth, this._renderTextureHeight);

        const lightLen = Math.sqrt(this._lightDirection.x ** 2 + this._lightDirection.y ** 2 + this._lightDirection.z ** 2);
        gl.uniform3f(this._glRaytraceUniforms.lightDir, this._lightDirection.x / lightLen, this._lightDirection.y / lightLen, this._lightDirection.z / lightLen);

        const lightColor = this.hexToRgb(this._lightColor);
        gl.uniform3f(this._glRaytraceUniforms.lightColor, lightColor.r / 255, lightColor.g / 255, lightColor.b / 255);

        gl.uniform1f(this._glRaytraceUniforms.lightIntensity, this._lightIntensity);
        gl.uniform1f(this._glRaytraceUniforms.ambientIntensity, this._ambientIntensity);

        const skyColor = this.hexToRgb(this._skyColor);
        const floorColor = this.hexToRgb(this._floorColor);
        const bgColor = this.hexToRgb(this._backgroundColor);

        gl.uniform3f(this._glRaytraceUniforms.skyColor, skyColor.r / 255, skyColor.g / 255, skyColor.b / 255);
        gl.uniform3f(this._glRaytraceUniforms.floorColor, floorColor.r / 255, floorColor.g / 255, floorColor.b / 255);
        gl.uniform1f(this._glRaytraceUniforms.horizonY, clampedHorizon);

        let bgType = 0;
        if (this._backgroundType === "transparent") bgType = 1;
        else if (this._backgroundType === "solid") bgType = 2;
        gl.uniform1i(this._glRaytraceUniforms.backgroundType, bgType);
        gl.uniform3f(this._glRaytraceUniforms.backgroundColor, bgColor.r / 255, bgColor.g / 255, bgColor.b / 255);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._glTriangleTexture);
        gl.uniform1i(this._glRaytraceUniforms.triangleData, 0);
        gl.uniform1i(this._glRaytraceUniforms.triangleCount, triangles.length);
        gl.uniform1f(this._glRaytraceUniforms.texWidth, texWidth);

        // Clear with appropriate background
        if (this._backgroundType === "transparent") {
            gl.clearColor(0, 0, 0, 0);
        } else {
            gl.clearColor(0, 0, 0, 1);
        }
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Draw the fullscreen quad
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // Check for GL errors
        const error = gl.getError();
        if (error !== gl.NO_ERROR) {
            console.error('WebGL error:', error);
        }

        // Copy to 2D canvas
        this._renderTextureCtx.drawImage(this._renderTextureGL, 0, 0);
    }

    calculateTriangleScreenBounds(tri, w, h, aspect, tanHalfFov) {
        const verts = [tri.v0, tri.v1, tri.v2];
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let anyVisible = false;

        for (const v of verts) {
            // Skip if behind camera
            if (v.x <= this._nearPlane || v.x >= this._farPlane) continue;

            // Project to screen space
            const ndcY = (v.y / v.x) / (tanHalfFov * aspect);
            const ndcZ = (v.z / v.x) / tanHalfFov;

            const screenX = (ndcY * 0.5 + 0.5) * w;
            const screenY = (0.5 - ndcZ * 0.5) * h;

            minX = Math.min(minX, screenX);
            maxX = Math.max(maxX, screenX);
            minY = Math.min(minY, screenY);
            maxY = Math.max(maxY, screenY);
            anyVisible = true;
        }

        if (!anyVisible) return null;

        // Clamp to screen with generous margin for edge cases
        return {
            minX: Math.max(0, Math.floor(minX) - 2),
            maxX: Math.min(w - 1, Math.ceil(maxX) + 2),
            minY: Math.max(0, Math.floor(minY) - 2),
            maxY: Math.min(h - 1, Math.ceil(maxY) + 2)
        };
    }

    rayTriangleIntersect(origin, dir, v0, v1, v2) {
        const edge1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
        const edge2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
        const h = {
            x: dir.y * edge2.z - dir.z * edge2.y,
            y: dir.z * edge2.x - dir.x * edge2.z,
            z: dir.x * edge2.y - dir.y * edge2.x
        };
        const a = edge1.x * h.x + edge1.y * h.y + edge1.z * h.z;
        if (Math.abs(a) < 0.0001) return null;
        const f = 1 / a;
        const s = { x: origin.x - v0.x, y: origin.y - v0.y, z: origin.z - v0.z };
        const u = f * (s.x * h.x + s.y * h.y + s.z * h.z);
        if (u < 0 || u > 1) return null;
        const q = {
            x: s.y * edge1.z - s.z * edge1.y,
            y: s.z * edge1.x - s.x * edge1.z,
            z: s.x * edge1.y - s.y * edge1.x
        };
        const v = f * (dir.x * q.x + dir.y * q.y + dir.z * q.z);
        if (v < 0 || u + v > 1) return null;
        const t = f * (edge2.x * q.x + edge2.y * q.y + edge2.z * q.z);
        return t > 0.0001 ? t : null;
    }

    /**
     * Doom-style raycasting renderer
     * Classic column-based raycasting similar to Doom (1993)
     * - One ray per screen column
     * - Vertical wall strips
     * - Fast rendering optimized for corridor/maze environments
     */
    renderDoom() {
        const ctx = this._renderTextureCtx;
        const imgData = this._imageData;
        const data = imgData.data;
        const w = this._renderTextureWidth;
        const h = this._renderTextureHeight;
        const halfH = h / 2;

        // Clear background with sky/floor
        const fovRadians = this._fieldOfView * (Math.PI / 180);
        const pitchRadians = (this._rotation.y || 0) * (Math.PI / 180);
        const maxPitch = fovRadians / 2;
        const normalizedPitch = -Math.max(-1, Math.min(1, pitchRadians / maxPitch));
        const horizonOffset = normalizedPitch * 0.5;
        const horizonRatio = 0.5 + horizonOffset;
        const clampedHorizon = Math.max(0, Math.min(1, horizonRatio));
        const horizonY = Math.floor(h * clampedHorizon);

        // Draw sky and floor
        const skyColor = this.hexToRgb(this._skyColor);
        const floorColor = this.hexToRgb(this._floorColor);

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const pixelIdx = (y * w + x) * 4;
                if (y < horizonY) {
                    data[pixelIdx] = skyColor.r;
                    data[pixelIdx + 1] = skyColor.g;
                    data[pixelIdx + 2] = skyColor.b;
                } else {
                    data[pixelIdx] = floorColor.r;
                    data[pixelIdx + 1] = floorColor.g;
                    data[pixelIdx + 2] = floorColor.b;
                }
                data[pixelIdx + 3] = 255;
            }
        }

        // Get camera world position and rotation
        const goPos = (this.gameObject && this.gameObject.getWorldPosition) ?
            this.gameObject.getWorldPosition() : { x: 0, y: 0 };
        let goDepth = 0;
        if (this.gameObject) {
            if (typeof this.gameObject.getWorldDepth === 'function') {
                goDepth = this.gameObject.getWorldDepth();
            } else if (typeof this.gameObject.depth === 'number') {
                goDepth = this.gameObject.depth;
            }
        }
        const camWorldX = (goPos.x || 0) + (this._position.x || 0);
        const camWorldY = (goPos.y || 0) + (this._position.y || 0);
        const camWorldZ = goDepth + (this._position.z || 0);

        const parentAngleDeg = (this.gameObject && this.gameObject.getWorldRotation) ?
            this.gameObject.getWorldRotation() : 0;
        const camYaw = (parentAngleDeg + (this._rotation.z || 0)) * (Math.PI / 180);

        // Collect wall segments from all geometry
        const allObjects = this.getGameObjects();
        const wallSegments = [];

        allObjects.forEach(obj => {
            if (!obj.active) return;
            const mesh = obj.getModule("CubeMesh3D");
            if (!mesh) return;

            const transformedVertices = mesh.transformVertices();
            if (!transformedVertices || !mesh.faces) return;

            const faceColor = mesh.faceColor || mesh._faceColor || "#888888";
            const baseColor = this.hexToRgb(faceColor);

            // For each face, extract wall-like edges (vertical segments)
            mesh.faces.forEach(face => {
                if (face.length < 3) return;

                const worldVerts = face.map(idx => transformedVertices[idx]).filter(v => v);
                if (worldVerts.length < 3) return;

                // Calculate face normal for lighting
                const normal = this.calculateFaceNormal(worldVerts[0], worldVerts[1], worldVerts[2]);
                const litColor = this.calculateLighting(normal, baseColor);

                // Check each edge of the face
                for (let i = 0; i < worldVerts.length; i++) {
                    const v0 = worldVerts[i];
                    const v1 = worldVerts[(i + 1) % worldVerts.length];

                    // Calculate vertical extent (Z difference)
                    const zDiff = Math.abs(v0.z - v1.z);
                    const xyDist = Math.sqrt((v0.x - v1.x) ** 2 + (v0.y - v1.y) ** 2);

                    // Only consider edges that form vertical walls
                    // Skip horizontal edges (floor/ceiling) and very short edges
                    if (zDiff > 0.1 && xyDist > 0.01) {
                        wallSegments.push({
                            x0: v0.x - camWorldX,
                            y0: v0.y - camWorldY,
                            z0: v0.z - camWorldZ,
                            x1: v1.x - camWorldX,
                            y1: v1.y - camWorldY,
                            z1: v1.z - camWorldZ,
                            color: litColor
                        });
                    }
                }
            });
        });

        // Cast one ray per column
        const aspect = w / h;
        const tanHalfFov = Math.tan(fovRadians * 0.5);

        for (let screenX = 0; screenX < w; screenX++) {
            // Calculate ray angle relative to camera
            const rayAngle = camYaw + Math.atan2(
                (screenX / w - 0.5) * 2 * tanHalfFov * aspect,
                1
            );

            const rayDirX = Math.cos(rayAngle);
            const rayDirY = Math.sin(rayAngle);

            // Find closest wall hit
            let closestDist = Infinity;
            let hitWall = null;
            let hitZ = 0;
            let wallT = 0; // Parameter along wall segment (0 to 1)

            wallSegments.forEach(wall => {
                // Convert wall to 2D line segment in world space
                const x1 = wall.x0, y1 = wall.y0;
                const x2 = wall.x1, y2 = wall.y1;

                // Ray-line segment intersection (2D)
                const dx = x2 - x1;
                const dy = y2 - y1;

                // Ray: (0,0) + t * (rayDirX, rayDirY)
                // Line: (x1,y1) + s * (dx, dy)

                const det = rayDirX * dy - rayDirY * dx;
                if (Math.abs(det) < 0.0001) return; // Parallel

                // Solve for t (distance along ray) and s (parameter along line segment)
                const t = (x1 * dy - y1 * dx) / det;
                const s = (x1 * rayDirY - y1 * rayDirX) / det;

                // Check if intersection is valid
                if (t <= 0 || t > this._farPlane) return; // Behind camera or too far
                if (s < 0 || s > 1) return; // Outside line segment

                // Calculate perpendicular distance (fisheye correction)
                const hitX = rayDirX * t;
                const hitY = rayDirY * t;
                const perpDist = Math.sqrt(hitX * hitX + hitY * hitY) * Math.cos(rayAngle - camYaw);

                if (perpDist < closestDist && perpDist > this._nearPlane) {
                    closestDist = perpDist;
                    hitWall = wall;
                    wallT = s;

                    // Interpolate Z coordinate along wall segment
                    hitZ = wall.z0 + s * (wall.z1 - wall.z0);
                }
            });

            // Draw the wall column if we hit something
            if (hitWall && closestDist < Infinity) {
                // Calculate wall height on screen
                const wallHeight = Math.abs(hitWall.z1 - hitWall.z0);
                const wallBottom = Math.min(hitWall.z0, hitWall.z1);
                const wallTop = Math.max(hitWall.z0, hitWall.z1);

                // Project wall heights to screen space
                const projectedWallHeight = (wallHeight / closestDist) * (h / (2 * tanHalfFov));
                const projectedWallBottom = halfH - ((wallBottom - camWorldZ) / closestDist) * (h / (2 * tanHalfFov));
                const projectedWallTop = halfH - ((wallTop - camWorldZ) / closestDist) * (h / (2 * tanHalfFov));

                // Clamp to screen bounds
                const drawTop = Math.max(0, Math.floor(projectedWallTop));
                const drawBottom = Math.min(h - 1, Math.ceil(projectedWallBottom));

                // Distance-based shading (fog effect)
                const shadeFactor = Math.max(0.2, 1.0 - closestDist / this._farPlane);
                const wallColor = {
                    r: Math.round(hitWall.color.r * shadeFactor),
                    g: Math.round(hitWall.color.g * shadeFactor),
                    b: Math.round(hitWall.color.b * shadeFactor)
                };

                // Draw the vertical wall strip
                for (let y = drawTop; y <= drawBottom; y++) {
                    const pixelIdx = (y * w + screenX) * 4;
                    data[pixelIdx] = wallColor.r;
                    data[pixelIdx + 1] = wallColor.g;
                    data[pixelIdx + 2] = wallColor.b;
                    data[pixelIdx + 3] = 255;
                }

                // Floor rendering (below wall) - use actual wall distance
                for (let y = drawBottom + 1; y < h; y++) {
                    const pixelIdx = (y * w + screenX) * 4;
                    const floorShadeFactor = Math.max(0.1, 1.0 - closestDist / this._farPlane);
                    data[pixelIdx] = Math.round(floorColor.r * floorShadeFactor);
                    data[pixelIdx + 1] = Math.round(floorColor.g * floorShadeFactor);
                    data[pixelIdx + 2] = Math.round(floorColor.b * floorShadeFactor);
                    data[pixelIdx + 3] = 255;
                }

                // Ceiling rendering (above wall) - use actual wall distance
                for (let y = 0; y < drawTop; y++) {
                    const pixelIdx = (y * w + screenX) * 4;
                    const ceilingShadeFactor = Math.max(0.1, 1.0 - closestDist / this._farPlane);
                    data[pixelIdx] = Math.round(skyColor.r * ceilingShadeFactor);
                    data[pixelIdx + 1] = Math.round(skyColor.g * ceilingShadeFactor);
                    data[pixelIdx + 2] = Math.round(skyColor.b * ceilingShadeFactor);
                    data[pixelIdx + 3] = 255;
                }
            }
        }

        ctx.putImageData(imgData, 0, 0);
    }

    // BVH Node class for acceleration structure
    createBVHNode() {
        return {
            bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
            triangles: [],
            left: null,
            right: null,
            isLeaf: false
        };
    }

    // Calculate axis-aligned bounding box for a triangle
    calculateTriangleBounds(v0, v1, v2) {
        const min = {
            x: Math.min(v0.x, v1.x, v2.x),
            y: Math.min(v0.y, v1.y, v2.y),
            z: Math.min(v0.z, v1.z, v2.z)
        };
        const max = {
            x: Math.max(v0.x, v1.x, v2.x),
            y: Math.max(v0.y, v1.y, v2.y),
            z: Math.max(v0.z, v1.z, v2.z)
        };
        return { min, max };
    }

    // Calculate bounding box for multiple triangles
    calculateBounds(triangles) {
        if (triangles.length === 0) return null;

        let min = { x: Infinity, y: Infinity, z: Infinity };
        let max = { x: -Infinity, y: -Infinity, z: -Infinity };

        triangles.forEach(tri => {
            const bounds = this.calculateTriangleBounds(tri.v0, tri.v1, tri.v2);
            min.x = Math.min(min.x, bounds.min.x);
            min.y = Math.min(min.y, bounds.min.y);
            min.z = Math.min(min.z, bounds.min.z);
            max.x = Math.max(max.x, bounds.max.x);
            max.y = Math.max(max.y, bounds.max.y);
            max.z = Math.max(max.z, bounds.max.z);
        });

        return { min, max };
    }

    // Check if ray intersects AABB
    rayAABBIntersect(origin, dir, min, max) {
        const invDir = {
            x: 1 / dir.x,
            y: 1 / dir.y,
            z: 1 / dir.z
        };

        const t1 = (min.x - origin.x) * invDir.x;
        const t2 = (max.x - origin.x) * invDir.x;
        const tmin = Math.min(t1, t2);
        const tmax = Math.max(t1, t2);

        const t1y = (min.y - origin.y) * invDir.y;
        const t2y = (max.y - origin.y) * invDir.y;
        const tminy = Math.min(t1y, t2y);
        const tmaxy = Math.max(t1y, t2y);

        if (tmin > tmaxy || tminy > tmax) return null;

        const finalTmin = Math.max(tmin, tminy);
        const finalTmax = Math.min(tmax, tmaxy);

        const t1z = (min.z - origin.z) * invDir.z;
        const t2z = (max.z - origin.z) * invDir.z;
        const tminz = Math.min(t1z, t2z);
        const tmaxz = Math.max(t1z, t2z);

        if (finalTmin > tmaxz || tminz > finalTmax) return null;

        const finalTminZ = Math.max(finalTmin, tminz);
        const finalTmaxZ = Math.min(finalTmax, tmaxz);

        return finalTmaxZ >= Math.max(finalTminZ, 0) ? finalTminZ : null;
    }

    // Build BVH acceleration structure
    buildBVH(triangles, maxTrianglesPerLeaf = 4) {
        if (triangles.length === 0) return null;

        const axisNames = ['x', 'y', 'z'];
        const root = this.createBVHNode();
        root.bounds = this.calculateBounds(triangles);
        root.triangles = triangles;

        if (triangles.length <= maxTrianglesPerLeaf) {
            root.isLeaf = true;
            return root;
        }

        // Find the longest axis for splitting
        const extent = {
            x: root.bounds.max.x - root.bounds.min.x,
            y: root.bounds.max.y - root.bounds.min.y,
            z: root.bounds.max.z - root.bounds.min.z
        };

        let splitAxis = 0;
        if (extent.y > extent.x) splitAxis = 1;
        if (extent.z > extent.y && extent.z > extent.x) splitAxis = 2;

        // Sort triangles by centroid along split axis
        const sortedTriangles = [...triangles].sort((a, b) => {
            const aCentroid = (a.v0[axisNames[splitAxis]] + a.v1[axisNames[splitAxis]] + a.v2[axisNames[splitAxis]]) / 3;
            const bCentroid = (b.v0[axisNames[splitAxis]] + b.v1[axisNames[splitAxis]] + b.v2[axisNames[splitAxis]]) / 3;
            return aCentroid - bCentroid;
        });

        const mid = Math.floor(sortedTriangles.length / 2);
        const leftTriangles = sortedTriangles.slice(0, mid);
        const rightTriangles = sortedTriangles.slice(mid);

        root.left = this.buildBVH(leftTriangles, maxTrianglesPerLeaf);
        root.right = this.buildBVH(rightTriangles, maxTrianglesPerLeaf);

        return root;
    }

    // Accelerated ray tracing using BVH
    traceRayBVH(origin, dir, bvhNode, tMin, tMax) {
        if (!bvhNode) return null;

        // Test ray against node bounds first
        const t = this.rayAABBIntersect(origin, dir, bvhNode.bounds.min, bvhNode.bounds.max);
        if (t === null || t > tMax || t < tMin) return null;

        // If this is a leaf node, test all triangles
        if (bvhNode.isLeaf) {
            let closestHit = null;
            let closestT = tMax;

            for (const tri of bvhNode.triangles) {
                const t = this.rayTriangleIntersect(origin, dir, tri.v0, tri.v1, tri.v2);
                if (t !== null && t < closestT && t >= tMin) {
                    closestT = t;
                    closestHit = tri;
                }
            }

            return closestHit;
        }

        // Test child nodes
        const leftHit = this.traceRayBVH(origin, dir, bvhNode.left, tMin, tMax);
        const rightHit = this.traceRayBVH(origin, dir, bvhNode.right, tMin, tMax);

        // Return the closer hit
        if (leftHit && rightHit) {
            return leftHit; // For simplicity, return first hit found
        }
        return leftHit || rightHit;
    }

    /**
 * Fast background clearing using 32-bit writes
 */
    clearBackgroundFast(buffer32, w, h) {
        if (this._backgroundType === "solid") {
            const bgColor = this.hexToRgb(this._backgroundColor);
            const bgPixel = (255 << 24) | (bgColor.b << 16) | (bgColor.g << 8) | bgColor.r;
            buffer32.fill(bgPixel);
        } else if (this._backgroundType === "skyfloor") {
            const fovRadians = this._fieldOfView * (Math.PI / 180);
            const pitchRadians = (this._rotation.y || 0) * (Math.PI / 180);
            const maxPitch = fovRadians / 2;
            const normalizedPitch = -Math.max(-1, Math.min(1, pitchRadians / maxPitch));
            const horizonOffset = normalizedPitch * 0.5;
            const horizonRatio = 0.5 + horizonOffset;
            const clampedHorizon = Math.max(0, Math.min(1, horizonRatio));
            const horizonY = Math.floor(h * clampedHorizon);

            const skyColor = this.hexToRgb(this._skyColor);
            const floorColor = this.hexToRgb(this._floorColor);
            const skyPixel = (255 << 24) | (skyColor.b << 16) | (skyColor.g << 8) | skyColor.r;
            const floorPixel = (255 << 24) | (floorColor.b << 16) | (floorColor.g << 8) | floorColor.r;

            for (let y = 0; y < h; y++) {
                const pixel = y < horizonY ? skyPixel : floorPixel;
                const rowStart = y * w;
                for (let x = 0; x < w; x++) {
                    buffer32[rowStart + x] = pixel;
                }
            }
        } else if (this._backgroundType === "transparent") {
            buffer32.fill(0); // Fully transparent
        }
    }

    /**
     * Ultra-fast scanline triangle rasterization
     * Uses edge-walking for maximum performance
     */
    rasterizeTriangleFast(tri, buffer32, w, h) {
        const p0 = { x: Math.round(tri.v0.screen.x), y: Math.round(tri.v0.screen.y) };
        const p1 = { x: Math.round(tri.v1.screen.x), y: Math.round(tri.v1.screen.y) };
        const p2 = { x: Math.round(tri.v2.screen.x), y: Math.round(tri.v2.screen.y) };

        // Calculate bounding box
        const minX = Math.max(0, Math.min(p0.x, p1.x, p2.x));
        const maxX = Math.min(w - 1, Math.max(p0.x, p1.x, p2.x));
        const minY = Math.max(0, Math.min(p0.y, p1.y, p2.y));
        const maxY = Math.min(h - 1, Math.max(p0.y, p1.y, p2.y));

        if (minX > maxX || minY > maxY) return;

        // Edge setup (once per triangle)
        const v0x = p0.x, v0y = p0.y;
        const v1x = p1.x, v1y = p1.y;
        const v2x = p2.x, v2y = p2.y;

        const e0_dx = v1x - v0x, e0_dy = v1y - v0y;
        const e1_dx = v2x - v1x, e1_dy = v2y - v1y;
        const e2_dx = v0x - v2x, e2_dy = v0y - v2y;

        // Check if triangle is degenerate
        const area = e0_dx * (v2y - v0y) - e0_dy * (v2x - v0x);
        if (Math.abs(area) < 0.5) return;

        const packedColor = tri.packedColor;

        // Scanline loop with edge coherence
        for (let y = minY; y <= maxY; y++) {
            // Calculate edge values at start of scanline
            let w0 = e0_dx * (y - v0y) - e0_dy * (minX - v0x);
            let w1 = e1_dx * (y - v1y) - e1_dy * (minX - v1x);
            let w2 = e2_dx * (y - v2y) - e2_dy * (minX - v2x);

            // Edge increments for x-stepping
            const w0_step = -e0_dy;
            const w1_step = -e1_dy;
            const w2_step = -e2_dy;

            const rowOffset = y * w;

            for (let x = minX; x <= maxX; x++) {
                // Inside test using edge equations
                if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
                    buffer32[rowOffset + x] = packedColor;
                }

                // Increment edge values
                w0 += w0_step;
                w1 += w1_step;
                w2 += w2_step;
            }
        }
    }

    render3D() {
        if (!this._renderTextureCtx || !this._isActive) return;
        this.clearRenderTexture();
        switch (this._renderingMethod) {
            case "painter": this.renderPainter(); break;
            case "zbuffer":
                if (this._renderTextureGLCtx) {
                    this.renderZBufferWebGL();
                } else {
                    this.renderZBuffer();
                }
                break;
            case "scanline": this.renderScanline(); break;
            case "hzb": this.renderHZB(); break;
            case "depthpass": this.renderDepthPass(); break;
            case "raster":
                if (this._renderTextureGLCtx) {
                    this.renderRasterWebGL();
                } else {
                    this.renderRasterOptimized();
                }
                break;
            case "hybrid": this.renderRaytraceHybrid(); break;
            case "webglcanvas":
                this.renderWebGLRaytrace();
                break;
            case "doom": this.renderDoom(); break;
            case "ilpc": this.renderILPC(); break;
            case "fald": this.renderFALD(); break;
            default: this.renderPainter();
        }
    }

    getRenderedTexture() {
        if (!this._isActive) return null;
        this.render3D();
        return this._renderTexture;
    }

    drawRenderedTexture(ctx, x = 0, y = 0, width = null, height = null) {
        if (!this._renderTexture || !this._isActive) return;
        ctx.imageSmoothingEnabled = this._renderTextureSmoothing;
        const drawWidth = width || this._renderTextureWidth;
        const drawHeight = height || this._renderTextureHeight;
        ctx.drawImage(this._renderTexture, x, y, drawWidth, drawHeight);
    }

    calculateLighting(normal, baseColor) {
        // Normalize light direction
        const len = Math.sqrt(this._lightDirection.x ** 2 + this._lightDirection.y ** 2 + this._lightDirection.z ** 2);
        const lightDir = {
            x: this._lightDirection.x / len,
            y: this._lightDirection.y / len,
            z: this._lightDirection.z / len
        };

        // Calculate diffuse lighting (Lambertian)
        const dotProduct = -(normal.x * lightDir.x + normal.y * lightDir.y + normal.z * lightDir.z);
        const diffuse = Math.max(0, dotProduct) * this._lightIntensity;

        // Combine ambient and diffuse
        const lighting = this._ambientIntensity + diffuse * (1 - this._ambientIntensity);

        // Apply light color
        const lightRgb = this.hexToRgb(this._lightColor);
        const baseRgb = typeof baseColor === 'string' ? this.hexToRgb(baseColor) : baseColor;

        return {
            r: Math.min(255, Math.round(baseRgb.r * lighting * (lightRgb.r / 255))),
            g: Math.min(255, Math.round(baseRgb.g * lighting * (lightRgb.g / 255))),
            b: Math.min(255, Math.round(baseRgb.b * lighting * (lightRgb.b / 255)))
        };
    }

    calculateFaceNormal(v0, v1, v2) {
        const e1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
        const e2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
        const normal = {
            x: e1.y * e2.z - e1.z * e2.y,
            y: e1.z * e2.x - e1.x * e2.z,
            z: e1.x * e2.y - e1.y * e2.x
        };
        const len = Math.sqrt(normal.x ** 2 + normal.y ** 2 + normal.z ** 2);
        if (len > 1e-10) {
            return { x: normal.x / len, y: normal.y / len, z: normal.z / len };
        }
        // Return a default normal if calculation fails (shouldn't happen with valid triangles)
        return { x: 0, y: 0, z: 1 };
    }

    /**
     * Fragment-Agnostic Layered Depth (FALD) Rendering
     * 
     * This rendering method combines:
     * 1. Coarse back-to-front painter's algorithm sorting
     * 2. Sparse depth grid for efficient occlusion testing
     * 3. Two-pass rendering with conflict resolution
     * 
     * Advantages:
     * - Near-perfect Z-ordering without full Z-buffer
     * - Leverages native ctx.fill() performance
     * - Low memory footprint with sparse depth grid
     * - Scalable performance based on conflict count
     */
    renderFALD() {
        const allObjects = this.getGameObjects();
        const ctx = this._renderTextureCtx;
        const imgData = this._imageData;
        const data = imgData.data;
        const w = this._renderTextureWidth;
        const h = this._renderTextureHeight;

        // Clear background
        this.clearFALDBackground(data, w, h);

        // Configuration for depth grid
        const CELL_SIZE = 16; // Pixels per depth cell
        const gridWidth = Math.ceil(w / CELL_SIZE);
        const gridHeight = Math.ceil(h / CELL_SIZE);

        // Initialize sparse depth grid
        const depthGrid = this.createDepthGrid(gridWidth, gridHeight);

        // Phase 1: Collect and prepare triangles
        const allTriangles = this.collectTrianglesForFALD(allObjects);

        if (allTriangles.length === 0) {
            ctx.putImageData(imgData, 0, 0);
            return;
        }

        // Phase 2: Spatial partitioning and coarse sorting
        const sortedChunks = this.partitionAndSortTriangles(allTriangles);

        // Phase 3: Pass 1 - Back-to-front rendering with depth tracking
        const conflictList = [];
        this.renderFALDPass1(sortedChunks, ctx, depthGrid, CELL_SIZE, conflictList, w, h);

        // Phase 4: Pass 2 - Front-to-back conflict resolution
        if (conflictList.length > 0) {
            this.renderFALDPass2(conflictList, ctx, depthGrid, CELL_SIZE, w, h);
        }

        ctx.putImageData(imgData, 0, 0);
    }

    /**
     * Clear background with appropriate color scheme
     */
    clearFALDBackground(data, w, h) {
        if (this._backgroundType === "transparent") {
            // Leave transparent
            for (let i = 0; i < data.length; i += 4) {
                data[i + 3] = 0; // Fully transparent
            }
        } else if (this._backgroundType === "solid") {
            const bgColor = this.hexToRgb(this._backgroundColor);
            for (let i = 0; i < data.length; i += 4) {
                data[i] = bgColor.r;
                data[i + 1] = bgColor.g;
                data[i + 2] = bgColor.b;
                data[i + 3] = 255;
            }
        } else if (this._backgroundType === "skyfloor") {
            const fovRadians = this._fieldOfView * (Math.PI / 180);
            const pitchRadians = (this._rotation.y || 0) * (Math.PI / 180);
            const maxPitch = fovRadians / 2;
            const normalizedPitch = -Math.max(-1, Math.min(1, pitchRadians / maxPitch));
            const horizonOffset = normalizedPitch * 0.5;
            const horizonRatio = 0.5 + horizonOffset;
            const clampedHorizon = Math.max(0, Math.min(1, horizonRatio));
            const horizonY = Math.floor(h * clampedHorizon);

            const skyColor = this.hexToRgb(this._skyColor);
            const floorColor = this.hexToRgb(this._floorColor);

            for (let i = 0; i < data.length; i += 4) {
                const y = Math.floor((i / 4) / w);
                if (y < horizonY) {
                    data[i] = skyColor.r;
                    data[i + 1] = skyColor.g;
                    data[i + 2] = skyColor.b;
                } else {
                    data[i] = floorColor.r;
                    data[i + 1] = floorColor.g;
                    data[i + 2] = floorColor.b;
                }
                data[i + 3] = 255;
            }
        }
    }

    /**
     * Create sparse depth grid structure
     */
    createDepthGrid(gridWidth, gridHeight) {
        const grid = [];
        for (let y = 0; y < gridHeight; y++) {
            grid[y] = [];
            for (let x = 0; x < gridWidth; x++) {
                grid[y][x] = {
                    minDepth: Infinity,
                    maxDepth: -Infinity,
                    polygonId: -1,
                    isDirty: false
                };
            }
        }
        return grid;
    }

    /**
     * Collect all triangles from the scene with necessary metadata
     */
    collectTrianglesForFALD(allObjects) {
        const triangles = [];
        let triangleId = 0;

        allObjects.forEach(obj => {
            if (!obj.active) return;
            const mesh = obj.getModule("Mesh3D") || obj.getModule("CubeMesh3D") || obj.getModule("SphereMesh3D");
            if (!mesh) return;

            const transformedVertices = mesh.transformVertices();
            if (!transformedVertices || !mesh.faces) return;
            const faceColor = mesh.faceColor || mesh._faceColor || "#888888";

            mesh.faces.forEach(face => {
                const worldVerts = face.map(idx => transformedVertices[idx]).filter(v => v);
                if (worldVerts.length < 3) return;

                const cameraVerts = worldVerts.map(v => this.worldToCameraSpace(v));
                if (cameraVerts.length < 3) return;

                // Clip against near plane BEFORE backface culling
                const clippedVerts = this.clipPolygonAgainstNearPlane(cameraVerts, this._nearPlane);
                if (clippedVerts.length < 3) return;

                // Backface culling using consistent method (after clipping)
                // This is the key fix - we need to cull based on the clipped vertices
                if (this._enableBackfaceCulling && !this._disableCulling) {
                    if (this.shouldCullFace(clippedVerts)) {
                        return; // Skip back-facing triangles
                    }
                }

                const worldNormal = this.calculateFaceNormal(worldVerts[0], worldVerts[1], worldVerts[2]);
                const litColor = this.calculateLighting(worldNormal, faceColor);

                // Triangulate the face
                for (let i = 1; i < clippedVerts.length - 1; i++) {
                    const tri = {
                        id: triangleId++,
                        v0: clippedVerts[0],
                        v1: clippedVerts[i],
                        v2: clippedVerts[i + 1],
                        color: litColor,
                        avgDepth: (clippedVerts[0].x + clippedVerts[i].x + clippedVerts[i + 1].x) / 3,
                        minDepth: Math.min(clippedVerts[0].x, clippedVerts[i].x, clippedVerts[i + 1].x),
                        maxDepth: Math.max(clippedVerts[0].x, clippedVerts[i].x, clippedVerts[i + 1].x),
                        screenBounds: null // Will be calculated during projection
                    };

                    triangles.push(tri);
                }
            });
        });

        return triangles;
    }

    /**
     * Partition triangles into spatial chunks and sort
     */
    partitionAndSortTriangles(triangles) {
        // For now, use a simple depth-based chunking
        // Sort all triangles by average depth (back to front)
        const sorted = [...triangles].sort((a, b) => b.avgDepth - a.avgDepth);

        // Group into chunks of roughly equal size
        const CHUNK_SIZE = 50; // Triangles per chunk
        const chunks = [];

        for (let i = 0; i < sorted.length; i += CHUNK_SIZE) {
            chunks.push(sorted.slice(i, i + CHUNK_SIZE));
        }

        return chunks;
    }

    /**
 * Pass 1: Back-to-front rendering with occlusion testing
 */
    renderFALDPass1(chunks, ctx, depthGrid, cellSize, conflictList, w, h) {
        const useExtendedFOV = this._enableBackfaceCulling && !this._disableCulling;
        const imgData = this._imageData;
        const data = imgData.data;

        // Process each chunk from back to front
        chunks.forEach(chunk => {
            chunk.forEach(tri => {
                // Project vertices to screen space
                const p0 = this.projectCameraPoint(tri.v0, useExtendedFOV);
                const p1 = this.projectCameraPoint(tri.v1, useExtendedFOV);
                const p2 = this.projectCameraPoint(tri.v2, useExtendedFOV);

                if (!p0 || !p1 || !p2) return;

                // Calculate screen bounds
                const minX = Math.max(0, Math.floor(Math.min(p0.x, p1.x, p2.x)));
                const maxX = Math.min(w - 1, Math.ceil(Math.max(p0.x, p1.x, p2.x)));
                const minY = Math.max(0, Math.floor(Math.min(p0.y, p1.y, p2.y)));
                const maxY = Math.min(h - 1, Math.ceil(Math.max(p0.y, p1.y, p2.y)));

                tri.screenBounds = { minX, maxX, minY, maxY };
                tri.projectedVerts = [p0, p1, p2];

                // Calculate which depth cells this triangle touches
                const cellMinX = Math.floor(minX / cellSize);
                const cellMaxX = Math.floor(maxX / cellSize);
                const cellMinY = Math.floor(minY / cellSize);
                const cellMaxY = Math.floor(maxY / cellSize);

                // Improved occlusion test: check multiple cells
                let visibleCellCount = 0;
                let totalCells = 0;
                let hasConflict = false;

                for (let cy = cellMinY; cy <= cellMaxY; cy++) {
                    for (let cx = cellMinX; cx <= cellMaxX; cx++) {
                        if (cy < 0 || cy >= depthGrid.length || cx < 0 || cx >= depthGrid[0].length) continue;

                        totalCells++;
                        const cell = depthGrid[cy][cx];

                        // If cell is uninitialized, triangle is visible in this cell
                        if (cell.minDepth === Infinity) {
                            visibleCellCount++;
                        }
                        // Use maxDepth for occlusion test - triangle must be COMPLETELY behind
                        // This prevents clipping when triangles have overlapping depth ranges
                        else if (tri.maxDepth < cell.minDepth - 0.1) {
                            // Triangle is fully behind in this cell - check next cell
                        }
                        else {
                            // Triangle is at least partially visible in this cell
                            visibleCellCount++;

                            // Check for depth conflicts - use a larger epsilon to reduce false conflicts
                            if (tri.minDepth < cell.minDepth - 0.05) {
                                hasConflict = true;
                            }
                        }
                    }
                }

                // Only skip if triangle is fully occluded in ALL cells it touches
                // Be more conservative - require fewer visible cells
                if (visibleCellCount === 0) {
                    return; // Skip fully occluded triangles
                }

                // If there's a conflict, add to conflict list for second pass
                if (hasConflict) {
                    conflictList.push(tri);
                }

                // Draw the triangle directly to ImageData
                this.rasterizeFALDTriangle(p0, p1, p2, tri.color, data, w, h);

                // Update depth grid more conservatively
                // Only update minDepth if we're significantly closer
                for (let cy = cellMinY; cy <= cellMaxY; cy++) {
                    for (let cx = cellMinX; cx <= cellMaxX; cx++) {
                        if (cy < 0 || cy >= depthGrid.length || cx < 0 || cx >= depthGrid[0].length) continue;

                        const cell = depthGrid[cy][cx];

                        // Use a larger epsilon to prevent z-fighting between coplanar triangles
                        const epsilon = 0.05;

                        // Only update if this triangle is actually closer
                        if (tri.minDepth < cell.minDepth - epsilon) {
                            cell.minDepth = tri.minDepth;
                            cell.polygonId = tri.id;
                            cell.isDirty = true;
                        }
                        // Always track the farthest point we've seen
                        if (tri.maxDepth > cell.maxDepth) {
                            cell.maxDepth = tri.maxDepth;
                        }
                    }
                }
            });
        });
    }

    /**
     * Pass 2: Front-to-back conflict resolution
     */
    renderFALDPass2(conflictList, ctx, depthGrid, cellSize, w, h) {
        // Sort conflicts front-to-back
        conflictList.sort((a, b) => a.avgDepth - b.avgDepth);

        const useExtendedFOV = this._enableBackfaceCulling && !this._disableCulling;
        const imgData = this._imageData;
        const data = imgData.data;

        conflictList.forEach(tri => {
            // Re-project if needed
            if (!tri.projectedVerts) {
                const p0 = this.projectCameraPoint(tri.v0, useExtendedFOV);
                const p1 = this.projectCameraPoint(tri.v1, useExtendedFOV);
                const p2 = this.projectCameraPoint(tri.v2, useExtendedFOV);

                if (!p0 || !p1 || !p2) return;
                tri.projectedVerts = [p0, p1, p2];
            }

            // Identify conflicting cells
            const [p0, p1, p2] = tri.projectedVerts;
            const { minX, maxX, minY, maxY } = tri.screenBounds;

            const cellMinX = Math.floor(minX / cellSize);
            const cellMaxX = Math.floor(maxX / cellSize);
            const cellMinY = Math.floor(minY / cellSize);
            const cellMaxY = Math.floor(maxY / cellSize);

            // Check which cells have conflicts
            const conflictCells = [];
            for (let cy = cellMinY; cy <= cellMaxY; cy++) {
                for (let cx = cellMinX; cx <= cellMaxX; cx++) {
                    if (cy < 0 || cy >= depthGrid.length || cx < 0 || cx >= depthGrid[0].length) continue;

                    const cell = depthGrid[cy][cx];
                    // If this triangle is closer than what's in the cell, it's a conflict
                    if (tri.minDepth < cell.minDepth - 0.01) { // Small epsilon for floating point
                        conflictCells.push({ cx, cy });
                    }
                }
            }

            // If there are conflicts, redraw this triangle
            if (conflictCells.length > 0) {
                this.rasterizeFALDTriangle(p0, p1, p2, tri.color, data, w, h);

                // Update depth grid
                conflictCells.forEach(({ cx, cy }) => {
                    const cell = depthGrid[cy][cx];
                    cell.minDepth = Math.min(cell.minDepth, tri.minDepth);
                    cell.maxDepth = Math.max(cell.maxDepth, tri.maxDepth);
                    cell.polygonId = tri.id;
                });
            }
        });
    }

    /**
 * Rasterize triangle directly to ImageData buffer
 * Uses edge function approach for fast inside testing
 */
    rasterizeFALDTriangle(p0, p1, p2, color, data, w, h) {
        // Round to integer coordinates
        const x0 = Math.round(p0.x), y0 = Math.round(p0.y);
        const x1 = Math.round(p1.x), y1 = Math.round(p1.y);
        const x2 = Math.round(p2.x), y2 = Math.round(p2.y);

        // Calculate bounding box
        const minX = Math.max(0, Math.min(x0, x1, x2));
        const maxX = Math.min(w - 1, Math.max(x0, x1, x2));
        const minY = Math.max(0, Math.min(y0, y1, y2));
        const maxY = Math.min(h - 1, Math.max(y0, y1, y2));

        // Early rejection
        if (minX > maxX || minY > maxY) return;

        // Edge function setup
        const e0_dx = x1 - x0, e0_dy = y1 - y0;
        const e1_dx = x2 - x1, e1_dy = y2 - y1;
        const e2_dx = x0 - x2, e2_dy = y0 - y2;

        // Precompute color values
        const r = color.r, g = color.g, b = color.b;

        // Scanline rasterization
        for (let y = minY; y <= maxY; y++) {
            // Calculate edge values at start of scanline
            let w0 = e0_dx * (y - y0) - e0_dy * (minX - x0);
            let w1 = e1_dx * (y - y1) - e1_dy * (minX - x1);
            let w2 = e2_dx * (y - y2) - e2_dy * (minX - x2);

            // Edge increments for x-stepping
            const w0_step = -e0_dy;
            const w1_step = -e1_dy;
            const w2_step = -e2_dy;

            for (let x = minX; x <= maxX; x++) {
                // Inside test using edge equations
                if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
                    const pixelIdx = (y * w + x) * 4;
                    data[pixelIdx] = r;
                    data[pixelIdx + 1] = g;
                    data[pixelIdx + 2] = b;
                    data[pixelIdx + 3] = 255;
                }

                // Increment edge values
                w0 += w0_step;
                w1 += w1_step;
                w2 += w2_step;
            }
        }
    }

    /**
     * Draw a triangle using native canvas fill (REMOVED - not used anymore)
     */
    drawFALDTriangle(ctx, p0, p1, p2, color) {
        // This method is no longer used, but keeping for reference
        ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.closePath();
        ctx.fill();
    }

    /**
 * Iterative Layered Point Cloud (ILPC) Rendering
 * Renders 3D scenes as adaptive point clouds with progressive refinement
 */
    renderILPC() {
        const allObjects = this.getGameObjects();
        const ctx = this._renderTextureCtx;
        const imgData = this._imageData;
        const data = imgData.data;
        const w = this._renderTextureWidth;
        const h = this._renderTextureHeight;

        // Clear background
        if (this._backgroundType === "transparent") {
            // Leave transparent
        } else if (this._backgroundType === "solid") {
            const bgColor = this.hexToRgb(this._backgroundColor);
            for (let i = 0; i < data.length; i += 4) {
                data[i] = bgColor.r;
                data[i + 1] = bgColor.g;
                data[i + 2] = bgColor.b;
                data[i + 3] = 255;
            }
        } else if (this._backgroundType === "skyfloor") {
            const fovRadians = this._fieldOfView * (Math.PI / 180);
            const pitchRadians = (this._rotation.y || 0) * (Math.PI / 180);
            const maxPitch = fovRadians / 2;
            const normalizedPitch = -Math.max(-1, Math.min(1, pitchRadians / maxPitch));
            const horizonOffset = normalizedPitch * 0.5;
            const horizonRatio = 0.5 + horizonOffset;
            const clampedHorizon = Math.max(0, Math.min(1, horizonRatio));
            const horizonY = Math.floor(h * clampedHorizon);

            for (let i = 0; i < data.length; i += 4) {
                const y = Math.floor((i / 4) / w);
                if (y < horizonY) {
                    data[i] = this.hexToRgb(this._skyColor).r;
                    data[i + 1] = this.hexToRgb(this._skyColor).g;
                    data[i + 2] = this.hexToRgb(this._skyColor).b;
                } else {
                    data[i] = this.hexToRgb(this._floorColor).r;
                    data[i + 1] = this.hexToRgb(this._floorColor).g;
                    data[i + 2] = this.hexToRgb(this._floorColor).b;
                }
                data[i + 3] = 255;
            }
        }

        // Initialize 2D depth map (stores timestamp and radius for occlusion)
        if (!this._ilpcDepthMap || this._ilpcDepthMap.length !== w * h) {
            this._ilpcDepthMap = new Array(w * h);
        }

        // Clear depth map
        for (let i = 0; i < this._ilpcDepthMap.length; i++) {
            this._ilpcDepthMap[i] = { timestamp: 0, radius: 0, depth: Infinity };
        }

        // Current frame timestamp
        const frameTimestamp = performance.now();

        // Collect and generate point cloud from all meshes
        const pointCloud = [];

        allObjects.forEach(obj => {
            if (!obj.active) return;
            const mesh = obj.getModule("Mesh3D") || obj.getModule("CubeMesh3D") || obj.getModule("SphereMesh3D");
            if (!mesh) return;

            const transformedVertices = mesh.transformVertices();
            if (!transformedVertices || !mesh.faces) return;

            const faceColor = mesh.faceColor || mesh._faceColor || "#888888";

            // Generate points from mesh faces
            mesh.faces.forEach(face => {
                const worldVerts = face.map(idx => transformedVertices[idx]).filter(v => v);
                if (worldVerts.length < 3) return;

                // Calculate face normal for lighting
                const worldNormal = this.calculateFaceNormal(worldVerts[0], worldVerts[1], worldVerts[2]);
                const litColor = this.calculateLighting(worldNormal, faceColor);

                // Transform to camera space
                const cameraVerts = worldVerts.map(v => this.worldToCameraSpace(v));

                // Backface culling
                if (this._enableBackfaceCulling && !this._disableCulling) {
                    if (this.shouldCullFace(cameraVerts)) return;
                }

                // Generate points for this face based on its area and distance
                const points = this.generatePointsFromFace(cameraVerts, worldVerts, litColor);
                pointCloud.push(...points);
            });
        });

        // Frustum culling - remove points outside view
        const frustumCulledPoints = pointCloud.filter(point => {
            return point.cameraPos.x >= this._nearPlane &&
                point.cameraPos.x <= this._farPlane;
        });

        // Sort points front-to-back by depth (camera X coordinate)
        frustumCulledPoints.sort((a, b) => a.cameraPos.x - b.cameraPos.x);

        // Calculate LOD pass count based on point density
        const totalPoints = frustumCulledPoints.length;
        const passCount = Math.min(3, Math.ceil(totalPoints / 1000) + 1);

        // Render in multiple passes for progressive refinement
        for (let pass = 0; pass < passCount; pass++) {
            const passRatio = (pass + 1) / passCount;
            const pointsThisPass = Math.ceil(totalPoints * passRatio);

            // Determine which points to render this pass
            let pointsToRender;
            if (pass === 0) {
                // First pass: evenly distributed sparse points
                pointsToRender = frustumCulledPoints.filter((_, idx) => idx % 4 === 0);
            } else if (pass === 1) {
                // Second pass: fill in more points
                pointsToRender = frustumCulledPoints.filter((_, idx) => idx % 2 === 0);
            } else {
                // Final pass: render all remaining points
                pointsToRender = frustumCulledPoints;
            }

            // Render points for this pass
            pointsToRender.forEach(point => {
                this.renderILPCPoint(point, data, w, h, frameTimestamp);
            });
        }

        ctx.putImageData(imgData, 0, 0);
    }

    /**
     * Generate point samples from a mesh face
     * Adaptive sampling based on face size and distance
     */
    generatePointsFromFace(cameraVerts, worldVerts, color) {
        if (cameraVerts.length < 3) return [];

        const points = [];

        // Calculate average depth
        const avgDepth = cameraVerts.reduce((sum, v) => sum + v.x, 0) / cameraVerts.length;

        // Calculate face area in camera space (approximate)
        const v0 = cameraVerts[0];
        const v1 = cameraVerts[1];
        const v2 = cameraVerts[2];

        const edge1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
        const edge2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };

        // Cross product magnitude / 2 = triangle area
        const crossX = edge1.y * edge2.z - edge1.z * edge2.y;
        const crossY = edge1.z * edge2.x - edge1.x * edge2.z;
        const crossZ = edge1.x * edge2.y - edge1.y * edge2.x;
        const area = Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ) / 2;

        // Adaptive point density based on distance and area
        // Closer and larger faces get more points
        const distanceFactor = Math.max(1, avgDepth / 50);
        const pointDensity = Math.max(1, Math.ceil((area * 20) / distanceFactor));
        const numPoints = Math.min(pointDensity, 50); // Cap at 50 points per face

        // Generate points using barycentric coordinates
        for (let i = 0; i < numPoints; i++) {
            // Random barycentric coordinates
            let u = Math.random();
            let v = Math.random();

            // Ensure point is inside triangle
            if (u + v > 1) {
                u = 1 - u;
                v = 1 - v;
            }
            const w = 1 - u - v;

            // Interpolate position in camera space
            const cameraPos = {
                x: u * cameraVerts[0].x + v * cameraVerts[1].x + w * cameraVerts[2].x,
                y: u * cameraVerts[0].y + v * cameraVerts[1].y + w * cameraVerts[2].y,
                z: u * cameraVerts[0].z + v * cameraVerts[1].z + w * cameraVerts[2].z
            };

            // Calculate importance (edge points are more important)
            const importance = Math.min(u, v, w) < 0.1 ? 2 : 1;

            points.push({
                cameraPos,
                color,
                importance,
                radius: Math.max(1, 10 / avgDepth) // Screen-space radius based on depth
            });
        }

        return points;
    }

    /**
     * Render a single point with occlusion culling
     */
    renderILPCPoint(point, data, w, h, timestamp) {
        const { cameraPos, color, radius } = point;

        // Project to screen space
        const useExtendedFOV = this._enableBackfaceCulling && !this._disableCulling;
        const projected = this.projectCameraPoint(cameraPos, useExtendedFOV);

        if (!projected) return;

        const cx = Math.round(projected.x);
        const cy = Math.round(projected.y);

        // Check bounds
        if (cx < 0 || cx >= w || cy < 0 || cy >= h) return;

        // Calculate screen-space radius (perspective scaling)
        const screenRadius = Math.max(1, Math.ceil(radius / cameraPos.x));

        // Occlusion culling - check if this point is occluded
        const depthMapIdx = cy * w + cx;
        const existing = this._ilpcDepthMap[depthMapIdx];

        // If an existing point completely covers this one, skip it
        if (existing && existing.timestamp === timestamp) {
            const depthDiff = cameraPos.x - existing.depth;
            const radiusDiff = existing.radius - screenRadius;

            // Skip if behind existing point and fully covered
            if (depthDiff > 0 && radiusDiff >= screenRadius) {
                return;
            }
        }

        // Draw the point
        const halfRadius = Math.floor(screenRadius / 2);
        const minX = Math.max(0, cx - halfRadius);
        const maxX = Math.min(w - 1, cx + halfRadius);
        const minY = Math.max(0, cy - halfRadius);
        const maxY = Math.min(h - 1, cy + halfRadius);

        // Draw as a small filled circle/square
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                // Optional: circular points (check distance from center)
                const dx = x - cx;
                const dy = y - cy;
                const distSq = dx * dx + dy * dy;

                if (distSq <= screenRadius * screenRadius) {
                    const pixelIdx = (y * w + x) * 4;

                    // Soft edges for better blending
                    const falloff = 1.0 - Math.sqrt(distSq) / screenRadius;
                    const alpha = Math.min(1, falloff * 1.5);

                    // Blend with existing pixel
                    const existingR = data[pixelIdx];
                    const existingG = data[pixelIdx + 1];
                    const existingB = data[pixelIdx + 2];

                    data[pixelIdx] = Math.round(existingR * (1 - alpha) + color.r * alpha);
                    data[pixelIdx + 1] = Math.round(existingG * (1 - alpha) + color.g * alpha);
                    data[pixelIdx + 2] = Math.round(existingB * (1 - alpha) + color.b * alpha);
                    data[pixelIdx + 3] = 255;
                }
            }
        }

        // Update depth map at point center
        this._ilpcDepthMap[depthMapIdx] = {
            timestamp,
            radius: screenRadius,
            depth: cameraPos.x
        };
    }

    start() {
        this.updateViewport();
        this.updateRenderTexture();
        const cameras = this.getGameObjects()
            .map(obj => obj.getModule("Camera3D"))
            .filter(cam => cam !== null);
        if (cameras.length === 1 && cameras[0] === this) this._isActive = true;
    }

    beginLoop() { this.updateViewport(); }
    draw(ctx) { }
    drawGizmos(ctx) {
        ctx.save();
        ctx.translate(this.gameObject.position.x, this.gameObject.position.y);
        ctx.rotate((this.gameObject.angle * Math.PI) / 180);

        // Draw a small camera icon at (0, 0)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-3, -3, 6, 6); // Small body
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#000000';
        ctx.fill(); // Lens

        // Draw frustum showing FOV, near, and far planes
        const halfFovRad = (this._fieldOfView / 2) * (Math.PI / 180);
        const near = this._nearPlane * 10; // Scale for visibility
        const far = this._farPlane * 0.1; // Scale down far plane
        const nearHalfWidth = near * Math.tan(halfFovRad);
        const farHalfWidth = far * Math.tan(halfFovRad);

        ctx.strokeStyle = '#ffff00'; // Yellow lines
        ctx.lineWidth = 1;
        ctx.beginPath();

        // Lines from camera to near plane
        ctx.moveTo(0, 0);
        ctx.lineTo(near, -nearHalfWidth);
        ctx.moveTo(0, 0);
        ctx.lineTo(near, nearHalfWidth);

        // Near plane
        ctx.moveTo(near, -nearHalfWidth);
        ctx.lineTo(near, nearHalfWidth);

        // Lines from near to far plane
        ctx.moveTo(near, -nearHalfWidth);
        ctx.lineTo(far, -farHalfWidth);
        ctx.moveTo(near, nearHalfWidth);
        ctx.lineTo(far, farHalfWidth);

        // Far plane
        ctx.moveTo(far, -farHalfWidth);
        ctx.lineTo(far, farHalfWidth);

        ctx.stroke();

        ctx.restore();
    }

    toJSON() {
        return {
            _type: "Camera3D", _position: { x: this._position.x, y: this._position.y, z: this._position.z },
            _rotation: { x: this._rotation.x, y: this._rotation.y, z: this._rotation.z },
            _fieldOfView: this._fieldOfView, _nearPlane: this._nearPlane, _farPlane: this._farPlane,
            _isActive: this._isActive, _backgroundColor: this._backgroundColor,
            _renderTextureWidth: this._renderTextureWidth, _renderTextureHeight: this._renderTextureHeight,
            _renderTextureSmoothing: this._renderTextureSmoothing, drawGizmoInRuntime: this.drawGizmoInRuntime,
            _renderingMethod: this._renderingMethod, _enableBackfaceCulling: this._enableBackfaceCulling,
            _cullingFieldOfView: this._cullingFieldOfView,
            _lightDirection: { x: this._lightDirection.x, y: this._lightDirection.y, z: this._lightDirection.z },
            _lightColor: this._lightColor,
            _lightIntensity: this._lightIntensity,
            _ambientIntensity: this._ambientIntensity,
            _depthOfFieldEnabled: this._depthOfFieldEnabled,
            _focalDistance: this._focalDistance,
            _aperture: this._aperture,
            _maxBlurRadius: this._maxBlurRadius,
            _skyColor: this._skyColor,
            _floorColor: this._floorColor,
            _backgroundType: this._backgroundType
        };
    }

    fromJSON(json) {
        if (json._position) this._position = new Vector3(json._position.x, json._position.y, json._position.z);
        if (json._rotation) this._rotation = new Vector3(json._rotation.x, json._rotation.y, json._rotation.z);
        if (json._fieldOfView !== undefined) this._fieldOfView = json._fieldOfView;
        if (json._nearPlane !== undefined) this._nearPlane = json._nearPlane;
        if (json._farPlane !== undefined) this._farPlane = json._farPlane;
        if (json._isActive !== undefined) this._isActive = json._isActive;
        if (json._backgroundColor !== undefined) this._backgroundColor = json._backgroundColor;
        if (json._renderTextureWidth !== undefined) this._renderTextureWidth = json._renderTextureWidth;
        if (json._renderTextureHeight !== undefined) this._renderTextureHeight = json._renderTextureHeight;
        if (json._renderTextureSmoothing !== undefined) this._renderTextureSmoothing = json._renderTextureSmoothing;
        if (json.drawGizmoInRuntime !== undefined) this.drawGizmoInRuntime = json.drawGizmoInRuntime;
        if (json._renderingMethod !== undefined) this._renderingMethod = json._renderingMethod;
        if (json._enableBackfaceCulling !== undefined) this._enableBackfaceCulling = json._enableBackfaceCulling;
        if (json._cullingFieldOfView !== undefined) this._cullingFieldOfView = json._cullingFieldOfView;
        if (json._lightDirection) this._lightDirection = new Vector3(json._lightDirection.x, json._lightDirection.y, json._lightDirection.z);
        if (json._lightColor !== undefined) this._lightColor = json._lightColor;
        if (json._lightIntensity !== undefined) this._lightIntensity = json._lightIntensity;
        if (json._ambientIntensity !== undefined) this._ambientIntensity = json._ambientIntensity;
        if (json._depthOfFieldEnabled !== undefined) this._depthOfFieldEnabled = json._depthOfFieldEnabled;
        if (json._focalDistance !== undefined) this._focalDistance = json._focalDistance;
        if (json._aperture !== undefined) this._aperture = json._aperture;
        if (json._maxBlurRadius !== undefined) this._maxBlurRadius = json._maxBlurRadius;
        if (json._skyColor !== undefined) { this._skyColor = json._skyColor; } else { this._skyColor = "#87CEEB"; }
        if (json._floorColor !== undefined) { this._floorColor = json._floorColor; } else { this._floorColor = "#8B4513"; }
        if (json._backgroundType !== undefined) { this._backgroundType = json._backgroundType; } else { this._backgroundType = "skyfloor"; }
        this.updateRenderTexture();
    }

    get renderTextureWidth() { return this._renderTextureWidth; }
    set renderTextureWidth(value) { this._renderTextureWidth = Math.max(64, Math.min(2048, value)); this.updateRenderTexture(); }
    get renderTextureHeight() { return this._renderTextureHeight; }
    set renderTextureHeight(value) { this._renderTextureHeight = Math.max(64, Math.min(2048, value)); this.updateRenderTexture(); }
    get renderTextureSmoothing() { return this._renderTextureSmoothing; }
    set renderTextureSmoothing(value) { this._renderTextureSmoothing = value; }
    get backgroundColor() { return this._backgroundColor; }
    set backgroundColor(value) { this._backgroundColor = value; }
    get position() { return this._position; }
    set position(value) { this._position = value; }
    get rotation() { return this._rotation; }
    set rotation(value) { this._rotation = value; }
    get fieldOfView() { return this._fieldOfView; }
    set fieldOfView(value) { this._fieldOfView = Math.max(1, Math.min(179, value)); }
    get nearPlane() { return this._nearPlane; }
    set nearPlane(value) { this._nearPlane = Math.max(0.01, value); }
    get farPlane() { return this._farPlane; }
    set farPlane(value) { this._farPlane = Math.max(1, value); }
    get isActive() { return this._isActive; }
    set isActive(value) { this._isActive = value; }
    get cullingFieldOfView() { return this._cullingFieldOfView; }
    set cullingFieldOfView(value) { this._cullingFieldOfView = Math.max(1, Math.min(179, value)); }
}

window.Camera3D = Camera3D;

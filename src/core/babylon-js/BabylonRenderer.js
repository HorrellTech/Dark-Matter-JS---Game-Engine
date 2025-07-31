class BabylonRenderer extends Module {
    constructor() {
        super("BabylonRenderer");
        
        this.scene = null;
        this.engine = null;
        this.canvas = null;
        this.camera = null;
        
        // Expose properties to the Inspector
        this.exposeProperty("clearColor", "color", "#000000", {
            description: "Background color of the scene",
            onChange: (value) => {
                if (this.scene) {
                    this.scene.clearColor = BABYLON.Color3.FromHexString(value);
                }
            }
        });
        
        this.exposeProperty("enableShadows", "boolean", true, {
            description: "Enable shadows in the scene",
            onChange: (value) => {
                if (this.scene) {
                    this.scene.shadowsEnabled = value;
                }
            }
        });
    }
    
    async preload() {
        // Load Babylon.js script if not already loaded
        if (!window.BABYLON) {
            await this.loadScript("https://cdn.babylonjs.com/babylon.js");
            await this.loadScript("https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js");
        }
    }
    
    start() {
        if (!this.gameObject) return;
        
        // Get the game canvas
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) return;
        
        // Check for WebGL support first
        if (!BABYLON.Engine.isSupported()) {
            console.warn("WebGL is not supported in this browser. Babylon.js cannot initialize.");
            // Set a flag that this renderer failed to initialize
            this.initialized = false;
            
            // Optionally create a 2D fallback or show a message to the user
            this.createFallbackRenderer();
            return;
        }
        
        // Initialize Babylon engine and scene
        try {
            this.engine = new BABYLON.Engine(this.canvas, true);
            this.scene = new BABYLON.Scene(this.engine);
            this.scene.clearColor = BABYLON.Color3.FromHexString(this.clearColor);
            
            // Create a default camera
            this.camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 5, -10), this.scene);
            this.camera.setTarget(BABYLON.Vector3.Zero());
            this.camera.attachControl(this.canvas, true);
            
            // Create a default light
            const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), this.scene);
            
            // Handle resizing
            window.addEventListener('resize', () => {
                this.engine.resize();
            });
            
            this.initialized = true;
        } catch (error) {
            console.error("Failed to initialize Babylon.js:", error);
            this.initialized = false;
            this.createFallbackRenderer();
        }
    }

    createFallbackRenderer() {
        // Create a fallback using Canvas 2D or display error message
        const ctx = this.canvas.getContext('2d');
        if (ctx) {
            // Store the 2D context for later use in draw()
            this.ctx2d = ctx;
            
            // Show a message on the canvas
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.fillStyle = 'red';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('WebGL not supported - 3D rendering unavailable', 
                         this.canvas.width / 2, this.canvas.height / 2);
        }
    }
    
    loop() {
        if (this.engine && this.scene) {
            this.scene.render();
        }
    }
    
    onDestroy() {
        if (this.engine) {
            this.engine.dispose();
        }
    }
    
    loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
}

///window.BabylonRenderer = BabylonRenderer;
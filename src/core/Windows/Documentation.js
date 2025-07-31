class Documentation {
    constructor() {
        this.container = null;
        this.currentSection = null;
        this.currentTopic = null;

        // Define the documentation structure - easy to extend
        this.docs = {
            "Getting Started": {
                icon: "fas fa-rocket",
                description: "Learn how to use Dark Matter JS",
                topics: {
                    "User Interface": {
                        content: `
                            <h2>User Interface Guide</h2>
                            <p>The Dark Matter JS editor is divided into several key areas:</p>
                            
                            <div class="doc-section">
                                <h3>Main Toolbar</h3>
                                <img src="assets/docs/toolbar.png" class="doc-image" alt="Toolbar" onerror="this.style.display='none'">
                                <ul>
                                    <li><i class="fas fa-file"></i> <strong>New Project</strong>: Create a blank project</li>
                                    <li><i class="fas fa-folder-open"></i> <strong>Load Project</strong>: Open an existing project</li>
                                    <li><i class="fas fa-save"></i> <strong>Save Project</strong>: Save your current project</li>
                                    <li><i class="fas fa-file-export"></i> <strong>Export Project</strong>: Export your game for distribution</li>
                                    <li><i class="fas fa-play"></i> <strong>Play</strong>: Run your game in the game view</li>
                                    <li><i class="fas fa-stop"></i> <strong>Stop</strong>: Stop the running game</li>
                                    <li><i class="fas fa-cog"></i> <strong>Settings</strong>: Configure engine settings</li>
                                </ul>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Hierarchy Panel</h3>
                                <p>Located on the left side, shows all game objects in your scene.</p>
                                <ul>
                                    <li><strong>Right-click</strong>: Open context menu to create, duplicate, or delete objects</li>
                                    <li><strong>Click</strong>: Select an object</li>
                                    <li><strong>Drag & Drop</strong>: Rearrange objects or create parent-child relationships</li>
                                </ul>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Scene View</h3>
                                <p>The central area where you visually edit your game.</p>
                                <ul>
                                    <li><strong>Click & Drag</strong>: Move objects</li>
                                    <li><strong>Mouse Wheel</strong>: Zoom in/out</li>
                                    <li><strong>Right-click + Drag</strong>: Pan the view</li>
                                    <li><strong>Grid Controls</strong>: Toggle grid visibility and snap-to-grid at the top</li>
                                </ul>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Inspector Panel</h3>
                                <p>Located on the right side, shows properties of the selected object.</p>
                                <ul>
                                    <li><strong>Transform</strong>: Edit position, rotation, and scale</li>
                                    <li><strong>Modules</strong>: Configure components attached to the object</li>
                                    <li><strong>Add Module</strong>: Attach new functionality to the object</li>
                                </ul>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Project Browser</h3>
                                <p>Located at the bottom, allows you to manage project files.</p>
                                <ul>
                                    <li><strong>Double-click</strong>: Open files in the editor</li>
                                    <li><strong>Right-click</strong>: Create new files or folders</li>
                                    <li><strong>Drag & Drop</strong>: Organize your files</li>
                                </ul>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Console</h3>
                                <p>Located at the bottom (switch tabs), shows debugging information.</p>
                                <ul>
                                    <li><strong>Command Input</strong>: Enter JavaScript commands to test</li>
                                    <li><strong>Clear Button</strong>: Remove all console messages</li>
                                </ul>
                            </div>
                        `
                    },
                    "First Project": {
                        content: `
                            <h2>Creating Your First Project</h2>
                            
                            <div class="doc-section">
                                <h3>Step 1: Create a New Project</h3>
                                <p>Click the <i class="fas fa-file"></i> New Project button in the toolbar to start with a blank project.</p>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Step 2: Create a Game Object</h3>
                                <p>Right-click in the Hierarchy panel and select "Create Empty" to add a new game object.</p>
                                <p>Name your object something descriptive, like "Player".</p>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Step 3: Add a Sprite</h3>
                                <p>With your object selected, click "Add Module" in the Inspector panel.</p>
                                <p>Choose "SpriteRenderer" from the list.</p>
                                <p>In the SpriteRenderer properties, click "Select Image" to assign a sprite.</p>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Step 4: Position Your Object</h3>
                                <p>Use the Transform properties in the Inspector to set the position of your object.</p>
                                <p>Alternatively, drag the object in the Scene view.</p>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Step 5: Test Your Game</h3>
                                <p>Click the <i class="fas fa-play"></i> Play button to run your game and see your object in action.</p>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Step 6: Save Your Project</h3>
                                <p>Click the <i class="fas fa-save"></i> Save Project button to store your work.</p>
                            </div>
                        `
                    },
                    "Editor Shortcuts": {
                        content: `
                            <h2>Keyboard Shortcuts</h2>
                            <p>Speed up your workflow with these helpful keyboard shortcuts:</p>
                            
                            <div class="doc-section">
                                <h3>General</h3>
                                <table class="shortcuts-table">
                                    <tr>
                                        <td><kbd>Ctrl</kbd> + <kbd>N</kbd></td>
                                        <td>New Project</td>
                                    </tr>
                                    <tr>
                                        <td><kbd>Ctrl</kbd> + <kbd>O</kbd></td>
                                        <td>Open Project</td>
                                    </tr>
                                    <tr>
                                        <td><kbd>Ctrl</kbd> + <kbd>S</kbd></td>
                                        <td>Save Project</td>
                                    </tr>
                                    <tr>
                                        <td><kbd>F5</kbd></td>
                                        <td>Play Game</td>
                                    </tr>
                                    <tr>
                                        <td><kbd>ESC</kbd></td>
                                        <td>Stop Game</td>
                                    </tr>
                                    <tr>
                                        <td><kbd>F1</kbd></td>
                                        <td>Open Documentation</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Editing</h3>
                                <table class="shortcuts-table">
                                    <tr>
                                        <td><kbd>Delete</kbd></td>
                                        <td>Delete Selected Object</td>
                                    </tr>
                                    <tr>
                                        <td><kbd>Ctrl</kbd> + <kbd>D</kbd></td>
                                        <td>Duplicate Selected Object</td>
                                    </tr>
                                    <tr>
                                        <td><kbd>Q</kbd></td>
                                        <td>Select Tool</td>
                                    </tr>
                                    <tr>
                                        <td><kbd>W</kbd></td>
                                        <td>Move Tool</td>
                                    </tr>
                                    <tr>
                                        <td><kbd>E</kbd></td>
                                        <td>Rotate Tool</td>
                                    </tr>
                                    <tr>
                                        <td><kbd>R</kbd></td>
                                        <td>Scale Tool</td>
                                    </tr>
                                </table>
                            </div>

                            <div class="doc-section">
                                <h3>Scene Navigation</h3>
                                <table class="shortcuts-table">
                                    <tr>
                                        <td><kbd>F</kbd></td>
                                        <td>Frame Selected Object</td>
                                    </tr>
                                    <tr>
                                        <td><kbd>Alt</kbd> + <kbd>Mouse Drag</kbd></td>
                                        <td>Orbit Camera</td>
                                    </tr>
                                    <tr>
                                        <td><kbd>Mouse Wheel</kbd></td>
                                        <td>Zoom In/Out</td>
                                    </tr>
                                </table>
                            </div>
                        `
                    }
                }
            },
            "Core Concepts": {
                icon: "fas fa-cube",
                description: "Fundamental building blocks of the engine",
                topics: {
                    "Game Objects": {
                        content: `
                            <h2>Game Objects</h2>
                            <p>Game objects are the fundamental building blocks in Dark Matter JS. They serve as containers for modules and can be organized in parent-child hierarchies.</p>
                            
                            <div class="doc-section">
                                <h3>Creating Game Objects</h3>
                                <p>There are several ways to create game objects in the editor:</p>
                                <ul>
                                    <li>Right-click in the Hierarchy and select "Create Empty"</li>
                                    <li>Right-click in the Hierarchy and select a primitive object type</li>
                                    <li>Duplicate an existing object with Ctrl+D or right-click > Duplicate</li>
                                </ul>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Object Properties</h3>
                                <p>All game objects have these core properties:</p>
                                <ul>
                                    <li><strong>Name</strong>: The identifier shown in the hierarchy</li>
                                    <li><strong>Position</strong>: X and Y coordinates in the scene</li>
                                    <li><strong>Rotation</strong>: Angular orientation in degrees</li>
                                    <li><strong>Scale</strong>: Size multiplier on X and Y axes</li>
                                    <li><strong>Active</strong>: Whether the object is enabled</li>
                                    <li><strong>Tag</strong>: Optional category label for filtering</li>
                                </ul>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Parent-Child Relationships</h3>
                                <p>Objects can be nested to create hierarchies:</p>
                                <ul>
                                    <li>Drag and drop one object onto another in the Hierarchy</li>
                                    <li>Child objects inherit transformations from their parents</li>
                                    <li>Moving a parent will move all its children</li>
                                </ul>
                            </div>
                        `
                    },
                    "Modules": {
                        content: `
                            <h2>Modules</h2>
                            <p>Modules are components that add behavior and functionality to game objects. They follow a similar pattern to Unity's component system.</p>
                            
                            <div class="doc-section">
                                <h3>Adding Modules</h3>
                                <p>To add a module to a game object:</p>
                                <ol>
                                    <li>Select the game object in the Hierarchy</li>
                                    <li>In the Inspector, click the "Add Module" button</li>
                                    <li>Choose a module type from the dropdown menu</li>
                                </ol>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Built-in Modules</h3>
                                <p>Dark Matter JS includes several built-in modules:</p>
                                <ul>
                                    <li><strong>SpriteRenderer</strong>: Displays images and animations</li>
                                    <li><strong>RigidBody</strong>: Adds physics behavior (Coming soon)</li>
                                    <li><strong>Collider</strong>: Handles collision detection (Coming soon)</li>
                                    <li><strong>AudioSource</strong>: Plays sound effects (Coming soon)</li>
                                </ul>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Module Properties</h3>
                                <p>Each module has its own set of properties that appear in the Inspector when you select an object:</p>
                                <ul>
                                    <li>Edit values directly in the Inspector</li>
                                    <li>Changes take effect immediately in Edit mode</li>
                                    <li>Use the checkbox next to a module name to enable/disable it</li>
                                </ul>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Removing Modules</h3>
                                <p>To remove a module:</p>
                                <ol>
                                    <li>Select the game object</li>
                                    <li>In the Inspector, find the module</li>
                                    <li>Click the "X" button in the module's header</li>
                                </ol>
                            </div>
                        `
                    },
                    "Scenes": {
                        content: `
                            <h2>Scenes</h2>
                            <p>Scenes contain collections of game objects that make up a level, menu, or any distinct part of your game.</p>
                            
                            <div class="doc-section">
                                <h3>Working with Scenes</h3>
                                <p>The Scene Manager allows you to:</p>
                                <ul>
                                    <li><strong>Create new scenes</strong>: Start with a blank canvas</li>
                                    <li><strong>Save scenes</strong>: Store your work for later</li>
                                    <li><strong>Load scenes</strong>: Open previously saved scenes</li>
                                    <li><strong>Switch scenes</strong>: Change between different game sections</li>
                                </ul>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Scene Navigation</h3>
                                <p>In the Scene view, you can:</p>
                                <ul>
                                    <li><strong>Zoom</strong>: Use the mouse wheel</li>
                                    <li><strong>Pan</strong>: Hold right-click and drag</li>
                                    <li><strong>Frame object</strong>: Select an object and press F</li>
                                </ul>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Scene Settings</h3>
                                <p>Each scene can have its own settings:</p>
                                <ul>
                                    <li><strong>Background color</strong>: Set the clear color</li>
                                    <li><strong>Gravity</strong>: Set the physics gravity direction and strength</li>
                                    <li><strong>Grid settings</strong>: Customize the editor grid</li>
                                </ul>
                            </div>
                        `
                    }
                }
            },
            "Working with Assets": {
                icon: "fas fa-images",
                description: "Managing game resources",
                topics: {
                    "Importing Assets": {
                        content: `
                            <h2>Importing Assets</h2>
                            
                            <div class="doc-section">
                                <h3>Supported File Types</h3>
                                <p>Dark Matter JS supports several file types:</p>
                                <ul>
                                    <li><strong>Images</strong>: PNG, JPG, GIF</li>
                                    <li><strong>Audio</strong>: MP3, WAV, OGG</li>
                                    <li><strong>Text</strong>: TXT, JSON</li>
                                    <li><strong>Scripts</strong>: JS</li>
                                </ul>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Adding Assets to Project</h3>
                                <p>Use the Project browser to manage your assets:</p>
                                <ol>
                                    <li>Open the Project tab in the bottom panel</li>
                                    <li>Right-click in the empty space</li>
                                    <li>Select "Import Assets" from the menu</li>
                                    <li>Choose files from your computer</li>
                                </ol>
                                <p>Alternatively, you can drag-and-drop files directly from your file explorer into the Project browser.</p>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Organizing Assets</h3>
                                <p>Keep your project organized with folders:</p>
                                <ol>
                                    <li>Right-click in the Project browser</li>
                                    <li>Select "Create Folder"</li>
                                    <li>Give your folder a name</li>
                                    <li>Drag assets into folders to organize them</li>
                                </ol>
                            </div>
                        `
                    },
                    "Using Assets": {
                        content: `
                            <h2>Using Assets in Your Game</h2>
                            
                            <div class="doc-section">
                                <h3>Images and Sprites</h3>
                                <p>To use an image as a sprite:</p>
                                <ol>
                                    <li>Select a game object</li>
                                    <li>Add a SpriteRenderer module</li>
                                    <li>Click "Select Sprite" in the module properties</li>
                                    <li>Choose your image from the asset browser</li>
                                </ol>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Audio Files</h3>
                                <p>To play audio in your game:</p>
                                <ol>
                                    <li>Select a game object</li>
                                    <li>Add an AudioSource module</li>
                                    <li>Click "Select Audio Clip" in the module properties</li>
                                    <li>Choose your audio file from the asset browser</li>
                                </ol>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Text and Data Files</h3>
                                <p>To load text or data files:</p>
                                <p>Create a custom module that loads and uses the data in its Start or Preload methods.</p>
                            </div>
                        `
                    }
                }
            },
            "Scripting": {
                icon: "fas fa-code",
                description: "Creating custom behaviors",
                topics: {
                    "Creating Scripts": {
                        content: `
                            <h2>Creating Custom Scripts</h2>
                            
                            <div class="doc-section">
                                <h3>Creating a New Script</h3>
                                <ol>
                                    <li>In the Project browser, right-click and select "Create > JavaScript File"</li>
                                    <li>Name your script (use CamelCase, like "PlayerController")</li>
                                    <li>Double-click to open in the Script Editor</li>
                                </ol>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Script Template</h3>
                                <p>New scripts will use this basic template:</p>
                                <pre><code>class MyScript extends Module {
    constructor() {
        super("MyScript");
        
        // Expose properties to the inspector
        this.exposeProperty("speed", "number", 5);
    }
    
    start() {
        // Called when the module is first activated
        console.log("Module started!");
    }
    
    loop(deltaTime) {
        // Called every frame with the time since last frame
        // Game logic goes here
    }
}</code></pre>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Registering Scripts</h3>
                                <p>For your script to appear in the "Add Module" dropdown:</p>
                                <pre><code>// Add this at the end of your script file
ModuleRegistry.registerModule("MyScript", MyScript);</code></pre>
                            </div>
                        `
                    },
                    "Lifecycle Methods": {
                        content: `
                            <h2>Script Lifecycle Methods</h2>
                            <p>When creating custom scripts, you can implement these lifecycle methods:</p>
                            
                            <div class="doc-section">
                                <h3>Initialization Methods</h3>
                                <ul>
                                    <li><code>preload()</code>: Called before the game starts, use for loading assets</li>
                                    <li><code>start()</code>: Called when the module is first activated</li>
                                </ul>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Update Methods</h3>
                                <ul>
                                    <li><code>beginLoop()</code>: Called at the beginning of each frame</li>
                                    <li><code>loop(deltaTime)</code>: Called every frame with the time since last frame</li>
                                    <li><code>endLoop()</code>: Called at the end of each frame</li>
                                </ul>
                                <p>Example usage:</p>
                                <pre><code>loop(deltaTime) {
    // Move the object every frame
    this.gameObject.position.x += this.speed * deltaTime;
}</code></pre>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Rendering and Cleanup</h3>
                                <ul>
                                    <li><code>draw(ctx)</code>: Called when the module should render</li>
                                    <li><code>onDestroy()</code>: Called when the module is being destroyed</li>
                                </ul>
                                <p>Example custom drawing:</p>
                                <pre><code>draw(ctx) {
    ctx.save();
    ctx.translate(this.gameObject.position.x, this.gameObject.position.y);
    ctx.rotate(this.gameObject.rotation);
    
    // Draw a custom shape
    ctx.fillStyle = "red";
    ctx.fillRect(-25, -25, 50, 50);
    
    ctx.restore();
}</code></pre>
                            </div>
                        `
                    },
                    "Inspector Properties": {
                        content: `
                            <h2>Adding Properties to the Inspector</h2>
                            
                            <div class="doc-section">
                                <h3>Exposing Properties</h3>
                                <p>Make script properties editable in the Inspector with <code>exposeProperty()</code>:</p>
                                <pre><code>constructor() {
    super("MyScript");
    
    // Basic property: name, type, default value
    this.exposeProperty("speed", "number", 5);
    
    // With constraints: min, max values
    this.exposeProperty("health", "number", 100, { min: 0, max: 100 });
    
    // Color picker
    this.exposeProperty("color", "color", "#ff0000");
    
    // Dropdown options
    this.exposeProperty("direction", "enum", "up", {
        options: ["up", "down", "left", "right"]
    });
}</code></pre>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Supported Property Types</h3>
                                <ul>
                                    <li><code>"number"</code>: Numeric value with optional min/max</li>
                                    <li><code>"boolean"</code>: True/false checkbox</li>
                                    <li><code>"string"</code>: Text input</li>
                                    <li><code>"color"</code>: Color picker</li>
                                    <li><code>"enum"</code>: Dropdown with options</li>
                                    <li><code>"vector2"</code>: 2D coordinates (x,y)</li>
                                    <li><code>"asset"</code>: Reference to a project asset</li>
                                </ul>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Responding to Property Changes</h3>
                                <p>Detect when properties change in the Inspector:</p>
                                <pre><code>constructor() {
    super("MyScript");
    this.exposeProperty("speed", "number", 5, {
        onChange: (newValue) => this.onSpeedChanged(newValue)
    });
}

onSpeedChanged(newSpeed) {
    console.log("Speed changed to: " + newSpeed);
    // Do something with the new value
}</code></pre>
                            </div>
                        `
                    }
                }
            },
            "Graphics & Audio": {
                icon: "fas fa-paint-brush",
                description: "Visual and sound effects",
                topics: {
                    "Drawing": {
                        content: `
                            <h2>Drawing and Rendering</h2>
                            
                            <div class="doc-section">
                                <h3>Using SpriteRenderer</h3>
                                <p>The easiest way to display images:</p>
                                <ol>
                                    <li>Select a game object</li>
                                    <li>Add a SpriteRenderer module</li>
                                    <li>Set the sprite image</li>
                                    <li>Adjust properties like color, flip, and sorting order</li>
                                </ol>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Custom Drawing</h3>
                                <p>Create custom visual effects by implementing the <code>draw()</code> method:</p>
                                <pre><code>draw(ctx) {
    // Save the current context state
    ctx.save();
    
    // Apply the game object's transform
    ctx.translate(this.gameObject.position.x, this.gameObject.position.y);
    ctx.rotate(this.gameObject.rotation);
    ctx.scale(this.gameObject.scale.x, this.gameObject.scale.y);
    
    // Draw shapes
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.fill();
    
    // Restore the context
    ctx.restore();
}</code></pre>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Drawing Text</h3>
                                <p>Display text in your game:</p>
                                <pre><code>draw(ctx) {
    ctx.save();
    ctx.translate(this.gameObject.position.x, this.gameObject.position.y);
    
    // Configure text style
    ctx.font = "20px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Draw the text
    ctx.fillText(this.message, 0, 0);
    
    ctx.restore();
}</code></pre>
                            </div>
                        `
                    },
                    "Audio": {
                        content: `
                            <h2>Playing Audio</h2>
                            
                            <div class="doc-section">
                                <h3>Using AudioSource</h3>
                                <p>The AudioSource module handles sound playback:</p>
                                <ol>
                                    <li>Select a game object</li>
                                    <li>Add an AudioSource module</li>
                                    <li>Select an audio clip</li>
                                    <li>Configure properties like volume, loop, and playback speed</li>
                                </ol>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Playing Sounds from Scripts</h3>
                                <p>Control audio playback from your custom scripts:</p>
                                <pre><code>start() {
    // Find the AudioSource component
    this.audioSource = this.gameObject.getModule("AudioSource");
}

playSound() {
    // Play the audio
    if (this.audioSource) {
        this.audioSource.play();
    }
}

stopSound() {
    // Stop the audio
    if (this.audioSource) {
        this.audioSource.stop();
    }
}</code></pre>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Audio Properties</h3>
                                <p>Adjust audio settings during gameplay:</p>
                                <pre><code>loop(deltaTime) {
    if (this.audioSource) {
        // Adjust volume based on distance
        const distance = this.calculateDistance();
        this.audioSource.volume = Math.max(0, 1 - distance / 100);
        
        // Change pitch based on speed
        this.audioSource.pitch = 1.0 + this.speed / 10;
    }
}</code></pre>
                            </div>
                        `
                    }
                }
            },
            "Input & Controls": {
                icon: "fas fa-gamepad",
                description: "Handling user interactions",
                topics: {
                    "Keyboard & Mouse": {
                        content: `
                            <h2>Keyboard and Mouse Input</h2>
                            
                            <div class="doc-section">
                                <h3>Keyboard Input</h3>
                                <p>Check for keyboard input in your scripts:</p>
                                <pre><code>loop(deltaTime) {
    // Check if a key is currently held down
    if (window.input.isKeyDown("ArrowRight")) {
        this.gameObject.position.x += this.speed * deltaTime;
    }
    
    // Check if a key was just pressed this frame
    if (window.input.isKeyPressed("Space")) {
        this.jump();
    }
    
    // Check if a key was just released this frame
    if (window.input.isKeyReleased("E")) {
        this.interact();
    }
}</code></pre>
                                <p>Common key names:</p>
                                <ul>
                                    <li>Arrow keys: "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"</li>
                                    <li>Letters: "A" to "Z" (uppercase)</li>
                                    <li>Numbers: "0" to "9"</li>
                                    <li>Space bar: "Space"</li>
                                    <li>Modifiers: "Shift", "Control", "Alt"</li>
                                </ul>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Mouse Input</h3>
                                <p>Access mouse position and buttons:</p>
                                <pre><code>loop(deltaTime) {
    // Get current mouse position
    const mousePos = window.input.mousePosition;
    
    // Check if mouse button is down
    if (window.input.isMouseButtonDown(0)) {  // Left button
        this.shoot(mousePos);
    }
    
    // Check if mouse button was just pressed
    if (window.input.isMouseButtonPressed(2)) {  // Right button
        this.openContextMenu(mousePos);
    }
    
    // Get mouse wheel movement
    const scrollAmount = window.input.wheelDelta;
    if (scrollAmount !== 0) {
        this.zoom(scrollAmount);
    }
}</code></pre>
                                <p>Mouse button values:</p>
                                <ul>
                                    <li>0: Left button</li>
                                    <li>1: Middle button (wheel)</li>
                                    <li>2: Right button</li>
                                </ul>
                            </div>
                        `
                    },
                    "Touch & Mobile": {
                        content: `
                            <h2>Touch Input</h2>
                            
                            <div class="doc-section">
                                <h3>Basic Touch Detection</h3>
                                <p>Detect touch input on mobile devices:</p>
                                <pre><code>loop(deltaTime) {
    // Check if the screen is being touched
    if (window.input.isTouching()) {
        // Get the primary touch position
        const touchPos = window.input.primaryTouch;
        this.moveTowards(touchPos);
    }
}</code></pre>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Multi-Touch</h3>
                                <p>Handle multiple simultaneous touches:</p>
                                <pre><code>loop(deltaTime) {
    // Get all current touches
    const touches = window.input.touches;
    
    // Process each touch point
    if (touches.length >= 2) {
        // Implement pinch-to-zoom with two fingers
        const touch1 = touches[0];
        const touch2 = touches[1];
        this.handlePinchGesture(touch1, touch2);
    }
}</code></pre>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Touch Events</h3>
                                <p>Detect touch start and end events:</p>
                                <pre><code>loop(deltaTime) {
    // Check for new touches this frame
    if (window.input.isTouchStarted()) {
        console.log("New touch detected!");
    }
    
    // Check for touches that ended this frame
    if (window.input.isTouchEnded()) {
        console.log("Touch ended!");
    }
}</code></pre>
                            </div>
                        `
                    }
                }
            },
            "AI Prompting": {
                icon: "fas fa-robot",
                description: "Using AI to enhance gameplay",
                topics: {
                    "Prompty for ANY AI chatbot": {
                        content: this.generateAIPromptContent()
                    }
                }
            },
            "Keywords Reference": {
                icon: "fas fa-code",
                description: "Complete reference for all available functions and modules",
                topics: {
                    "Core Functions": {
                        content: this.generateKeywordsContent("Core")
                    },
                    "Input Functions": {
                        content: this.generateKeywordsContent("Input")
                    },
                    "Physics Functions": {
                        content: this.generateKeywordsContent("Physics")
                    },
                    "Math Functions": {
                        content: this.generateKeywordsContent("Math")
                    },
                    "Animation Modules": {
                        content: this.generateKeywordsContent("Animation")
                    },
                    "UI Modules": {
                        content: this.generateKeywordsContent("UI")
                    },
                    "Effects Modules": {
                        content: this.generateKeywordsContent("Effects")
                    },
                    "Audio Modules": {
                        content: this.generateKeywordsContent("Audio")
                    },
                    "Logic Modules": {
                        content: this.generateKeywordsContent("Logic")
                    },
                    "Attributes Modules": {
                        content: this.generateKeywordsContent("Attributes")
                    },
                    "Controllers Modules": {
                        content: this.generateKeywordsContent("Controllers")
                    },
                    "Drawing Modules": {
                        content: this.generateKeywordsContent("Drawing")
                    },
                    "Colliders Modules": {
                        content: this.generateKeywordsContent("Colliders")
                    },
                    "Utility Modules": {
                        content: this.generateKeywordsContent("Utility")
                    },
                    "Visual Modules": {
                        content: this.generateKeywordsContent("Visual")
                    }
                }
            }
        };

        // Add CSS styles for documentation
        this.addStyles();
    }

    addStyles() {
        // Create style element if it doesn't exist
        if (!document.getElementById('doc-modal-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'doc-modal-styles';
            styleElement.textContent = `
                .documentation-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.8);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                }
                
                .documentation-content {
                    width: 90%;
                    height: 90%;
                    max-width: 1200px;
                    max-height: 800px;
                    display: flex;
                    flex-direction: column;
                    background-color: #1e1e1e;
                    border-radius: 6px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
                }
                
                .documentation-header {
                    padding: 15px;
                    background: linear-gradient(to right, #1a1a1a, #252525, #1a1a1a);
                    border-bottom: 1px solid #333;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .documentation-title {
                    font-size: 24px;
                    margin: 0;
                    color: #ffffff;
                }
                
                .documentation-body {
                    display: flex;
                    flex: 1;
                    overflow: hidden;
                }
                
                .doc-sidebar {
                    width: 250px;
                    border-right: 1px solid #333;
                    overflow-y: auto;
                    background: #252525;
                }
                
                .doc-category {
                    border-bottom: 1px solid #333;
                }
                
                .doc-category-header {
                    padding: 12px 15px;
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    color: #cccccc;
                    font-weight: 500;
                    transition: background 0.2s;
                }
                
                .doc-category-header:hover {
                    background: #2a2a2a;
                }
                
                .doc-category-header.active {
                    background: #0e639c;
                    color: white;
                }
                
                .doc-category-header i {
                    margin-right: 10px;
                    width: 16px;
                    text-align: center;
                }
                
                .doc-category-description {
                    font-size: 12px;
                    color: #999;
                    margin-top: 4px;
                }
                
                .doc-topics {
                    overflow: hidden;
                    max-height: 0;
                    transition: max-height 0.3s ease;
                }
                
                .doc-topics.expanded {
                    max-height: 500px;
                }
                
                .doc-topic {
                    padding: 10px 15px 10px 35px;
                    cursor: pointer;
                    color: #aaaaaa;
                    transition: background 0.2s, color 0.2s;
                }
                
                .doc-topic:hover {
                    background: #2a2a2a;
                    color: #ffffff;
                }
                
                .doc-topic.active {
                    background: #333;
                    color: #ffffff;
                    border-left: 3px solid #0e639c;
                }
                
                .doc-content {
                    flex: 1;
                    padding: 20px;
                    overflow-y: auto;
                    color: #cccccc;
                }
                
                .doc-content h2 {
                    margin-top: 0;
                    color: #ffffff;
                    border-bottom: 1px solid #333;
                    padding-bottom: 10px;
                    margin-bottom: 20px;
                }
                
                .doc-content h3 {
                    color: #cccccc;
                    margin-top: 25px;
                    margin-bottom: 10px;
                }
                
                .doc-content p {
                    line-height: 1.6;
                    margin-bottom: 15px;
                }
                
                .doc-content ul, .doc-content ol {
                    margin-bottom: 15px;
                    padding-left: 25px;
                }
                
                .doc-content li {
                    margin-bottom: 5px;
                }
                
                .doc-content pre {
                    background: #252525;
                    border: 1px solid #333;
                    border-radius: 4px;
                    padding: 10px;
                    overflow-x: auto;
                    margin: 15px 0;
                }
                
                .doc-content code {
                    font-family: 'Consolas', 'Monaco', monospace;
                    font-size: 14px;
                    color: #e6e6e6;
                }
                
                .doc-section {
                    margin-bottom: 25px;
                }
                
                .doc-image {
                    max-width: 100%;
                    border: 1px solid #333;
                    border-radius: 4px;
                    margin: 10px 0;
                }
                
                .documentation-footer {
                    padding: 15px;
                    background-color: #252525;
                    border-top: 1px solid #333;
                    display: flex;
                    justify-content: flex-end;
                }
                
                .doc-btn {
                    background: #2a2a2a;
                    border: 1px solid #444;
                    border-radius: 4px;
                    color: #cccccc;
                    padding: 8px 15px;
                    margin-left: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .doc-btn:hover {
                    background: #333;
                    color: #ffffff;
                }
                
                .doc-btn.primary {
                    background: #0e639c;
                    border-color: #1177bb;
                    color: white;
                }
                
                .doc-btn.primary:hover {
                    background: #1177bb;
                }
                
                .shortcuts-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 15px 0;
                }
                
                .shortcuts-table td {
                    padding: 8px 15px;
                    border-bottom: 1px solid #333;
                }
                
                .shortcuts-table tr:last-child td {
                    border-bottom: none;
                }
                
                kbd {
                    background: #333;
                    border: 1px solid #555;
                    border-radius: 3px;
                    padding: 3px 6px;
                    font-family: 'Consolas', 'Monaco', monospace;
                    font-size: 12px;
                    box-shadow: 0 2px 0 #222;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
            `;
            document.head.appendChild(styleElement);
        }
    }

    generateAIPromptContent() {
        try {
            return `
            <h2>Using AI to Enhance Gameplay</h2>
            <p>Dark Matter JS supports AI-generated content to enhance gameplay experiences.</p>

            <div class="doc-section">
                <h3>AI Prompting</h3>
                <p>Use AI to generate content, behaviors, and more. You can use this prompt with any AI chatbot that supports text input.</p>
                
                <h4>PROMPT:</h4>
                <pre><code>You are an AI assistant specialized expert in the Dark Matter JS game engine module system.

**Module System Basics:**
- Modules extend GameObject functionality
- GameObjects have: position (Vector2), scale (Vector2), angle (degrees), size (Vector2)
- All modules extend the Module base class
- Use this.gameObject to access the GameObject
- Access other modules: this.gameObject.getModule("ModuleName")
- Access viewport through 'window.engine.viewport.x', 'window.engine.viewport.y', 'window.engine.viewport.width', 'window.engine.viewport.height'

**Module Template:**
\`\`\`javascript
class MyModule extends Module {
    static namespace = "Category";
    static description = "Brief description";
    static allowMultiple = false; // or true

    constructor() {
        super("MyModule");

        this.speed = 100; // Default speed
        
        // Expose properties for inspector
        this.exposeProperty("speed", "number", 100, {
            description: "Movement speed",
            onChange: (val) => {
                this.speed = val; // Update speed when property changes
            }
        });
    }

    start() {
        // Initialize when game starts
    }

    loop(deltaTime) {
        // Update logic every frame
        // deltaTime is in seconds
        this.gameObject.position.x += this.speed * deltaTime;
    }

    draw(ctx) {
        // Render to canvas
    }

    drawGizmos(ctx) {
        // Draw debug gizmos (optional)
    }

    toJSON() { // Serialize module state
        return {
            speed: this.speed
        };
    }

    fromJSON(data) { // Deserialize module state
        this.speed = data.speed || 100; // Default to 100 if not provided
    }
}

window.MyModule = MyModule; // Register globally
\`\`\`

**Common Property Types:**
- "number", "string", "boolean", "color"
- "enum" (needs options: ["A", "B", "C"])
- "vector2" (for Vector2 objects)

**Available Input:**
- window.input.keyDown("w") - check if key held
- window.input.keyPressed("space") - check if key just pressed
- window.input.mouseDown("left") - mouse button states

**Transform Access:**
- this.gameObject.position (Vector2)
- this.gameObject.angle (degrees)
- this.gameObject.scale (Vector2)
- this.gameObject.getWorldPosition()

Provide working, complete modules. Keep code concise but functional.
REQUEST: {USER_PROMPT_HERE}</code></pre>
                
                <p>Make sure to handle AI responses properly and validate the data before using it in your game.</p>
            </div>
        `;
        } catch (e) {
            console.error("Error generating AI prompt content:", e);
            return "<h2>AI Prompting</h2><p>Error loading content.</p>";
        }
    }

    /**
     * Generate content for keywords documentation based on group
     * @param {string} group - The group name to generate content for
     * @returns {string} HTML content for the group
     */
    generateKeywordsContent(group) {
        if (!window.DarkMatterDocs) {
            return `<h2>${group} Functions</h2><p>Keywords documentation not available.</p>`;
        }

        let content = `<h2>${group} Functions</h2>`;

        // Get all functions in this group
        const functions = window.getFunctionsByGroup ? window.getFunctionsByGroup(group) : [];

        if (functions.length === 0) {
            // If no functions found by group, try to find by category name
            for (const [categoryName, categoryData] of Object.entries(window.DarkMatterDocs)) {
                if (categoryData.group === group || categoryName === group) {
                    for (const [funcName, funcData] of Object.entries(categoryData.functions)) {
                        functions.push({
                            category: categoryName,
                            name: funcName,
                            ...funcData
                        });
                    }
                }
            }
        }

        if (functions.length === 0) {
            return content + `<p>No functions found for group: ${group}</p>`;
        }

        // Generate content for each function
        functions.forEach(func => {
            content += `
                <div class="doc-section">
                    <h3>${func.name}</h3>
                    <p>${func.description}</p>
                    
                    ${func.example ? `
                        <h4>Example:</h4>
                        <pre><code>${func.example}</code></pre>
                    ` : ''}
                    
                    ${func.properties && func.properties.length > 0 ? `
                        <h4>Properties:</h4>
                        <ul>
                            ${func.properties.map(prop => `
                                <li><strong>${prop.name}</strong> (${prop.type}): ${prop.description}</li>
                            `).join('')}
                        </ul>
                    ` : ''}
                    
                    ${func.methods && func.methods.length > 0 ? `
                        <h4>Methods:</h4>
                        <ul>
                            ${func.methods.map(method => `
                                <li><strong>${method.name}</strong>: ${method.description}</li>
                            `).join('')}
                        </ul>
                    ` : ''}
                    
                    ${func.params && func.params.length > 0 ? `
                        <h4>Parameters:</h4>
                        <ul>
                            ${func.params.map(param => `
                                <li><strong>${param.name}</strong> (${param.type}): ${param.description}</li>
                            `).join('')}
                        </ul>
                    ` : ''}
                    
                    ${func.returns ? `
                        <h4>Returns:</h4>
                        <p><strong>${func.returns.type}</strong>: ${func.returns.description}</p>
                    ` : ''}
                </div>
            `;
        });

        return content;
    }

    show() {
        // Create container
        this.container = document.createElement('div');
        this.container.className = 'documentation-modal';
        this.container.style.animation = 'fadeIn 0.3s forwards';

        // Create content structure
        const content = `
            <div class="documentation-content">
                <div class="documentation-header">
                    <h1 class="documentation-title">Dark Matter JS Documentation</h1>
                </div>
                
                <div class="documentation-body">
                    <div class="doc-sidebar">
                        ${this.generateSidebar()}
                    </div>
                    
                    <div class="doc-content">
                        <div class="doc-welcome">
                            <h2>Welcome to Dark Matter JS</h2>
                            <p>Welcome to the Dark Matter JS documentation. Use the sidebar to navigate through different topics.</p>
                            <p>Dark Matter JS is a powerful 2D game engine that makes it easy to create games directly in your browser.</p>
                            
                            <div class="doc-section">
                                <h3>Getting Started</h3>
                                <p>If this is your first time using Dark Matter JS, we recommend starting with:</p>
                                <ul>
                                    <li><strong>User Interface Guide</strong> - Learn how to navigate the editor</li>
                                    <li><strong>Creating Your First Project</strong> - A step-by-step tutorial</li>
                                    <li><strong>Core Concepts</strong> - Understanding the main components</li>
                                </ul>
                            </div>
                            
                            <div class="doc-section">
                                <h3>Key Features</h3>
                                <ul>
                                    <li>Component-based architecture</li>
                                    <li>Visual scene editor</li>
                                    <li>Built-in sprite rendering</li>
                                    <li>Custom scripting system</li>
                                    <li>Asset management</li>
                                    <li>Physics (coming soon)</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="documentation-footer">
                    <button class="doc-btn primary" id="docCloseBtn">Close</button>
                </div>
            </div>
        `;

        this.container.innerHTML = content;
        document.body.appendChild(this.container);

        // Add event listeners
        this.setupEventListeners();

        // Show the first category by default
        const firstCategory = this.container.querySelector('.doc-category-header');
        if (firstCategory) {
            this.toggleCategory(firstCategory);
        }
    }

    generateSidebar() {
        let sidebar = '';

        // Generate categories and topics
        for (const [categoryName, category] of Object.entries(this.docs)) {
            sidebar += `
                <div class="doc-category">
                    <div class="doc-category-header" data-category="${categoryName}">
                        <div>
                            <i class="${category.icon}"></i>
                            ${categoryName}
                        </div>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="doc-category-description">${category.description}</div>
                    <div class="doc-topics" id="topics-${categoryName.replace(/\s+/g, '-').replace(/&/g, 'and').toLowerCase()}">
            `;

            // Add topics for this category
            for (const [topicName, topic] of Object.entries(category.topics)) {
                sidebar += `
                    <div class="doc-topic" data-category="${categoryName}" data-topic="${topicName}">
                        ${topicName}
                    </div>
                `;
            }

            sidebar += `
                    </div>
                </div>
            `;
        }

        return sidebar;
    }

    setupEventListeners() {
        // Close button
        const closeButton = this.container.querySelector('#docCloseBtn');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.close());
        }

        // Category headers
        const categoryHeaders = this.container.querySelectorAll('.doc-category-header');
        categoryHeaders.forEach(header => {
            header.addEventListener('click', () => this.toggleCategory(header));
        });

        // Topics
        const topics = this.container.querySelectorAll('.doc-topic');
        topics.forEach(topic => {
            topic.addEventListener('click', () => this.showTopic(topic));
        });
    }

    toggleCategory(header) {
        const categoryName = header.dataset.category;
        const topicsContainer = this.container.querySelector(`#topics-${categoryName.replace(/\s+/g, '-').replace(/&/g, 'and').toLowerCase()}`);

        // Toggle active state
        const isActive = header.classList.contains('active');

        // Reset all categories
        this.container.querySelectorAll('.doc-category-header').forEach(h => {
            h.classList.remove('active');
            h.querySelector('.fas').className = 'fas fa-chevron-down';
        });

        this.container.querySelectorAll('.doc-topics').forEach(t => {
            t.classList.remove('expanded');
        });

        // Expand this category if it wasn't active
        if (!isActive) {
            header.classList.add('active');
            header.querySelector('.fas').className = 'fas fa-chevron-up';
            topicsContainer.classList.add('expanded');

            // Show the first topic by default
            const firstTopic = topicsContainer.querySelector('.doc-topic');
            if (firstTopic) {
                this.showTopic(firstTopic);
            }
        }
    }

    showTopic(topicElement) {
        // Get the topic content
        const categoryName = topicElement.dataset.category;
        const topicName = topicElement.dataset.topic;

        // Reset active topics
        this.container.querySelectorAll('.doc-topic').forEach(t => {
            t.classList.remove('active');
        });

        // Set this topic as active
        topicElement.classList.add('active');

        // Update content area
        const contentContainer = this.container.querySelector('.doc-content');
        const topicContent = this.docs[categoryName].topics[topicName].content;

        contentContainer.innerHTML = topicContent;

        // Syntax highlighting could be added here if needed
    }

    close() {
        // Add closing animation
        this.container.style.animation = 'fadeOut 0.3s forwards';

        // Remove from DOM after animation completes
        setTimeout(() => {
            if (this.container && this.container.parentElement) {
                this.container.parentElement.removeChild(this.container);
            }
        }, 300);
    }
}
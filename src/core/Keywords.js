/**
 * Keywords and Function Documentation for Dark Matter JS Engine
 */
const DarkMatterDocs = {
    // GameObject Functions
    GameObject: {
        group: "Core",
        functions: {
            addTag: {
                description: "Add a tag to the GameObject, useful for grouping and identification",
                example: `this.gameObject.addTag("player");`,
                params: [{ name: "tag", type: "string", description: "The tag to add" }],
                returns: { type: "void", description: "No return value" }
            },

            hasTag: {
                description: "Check if the GameObject has a specific tag",
                example: `const collisions = this.gameObject.checkForCollisions();

collisions.forEach(other => {
    if(other.gameObject.hasTag("enemy")) {
        // Code to inflict damage
    }
});`,
                params: [{ name: "tag", type: "string", description: "The tag to check for" }],
                returns: { type: "boolean", description: "True if the tag is present" }
            },

            addChild: {
                description: "Add a child GameObject to create a parent-child relationship",
                example: `const child = new GameObject("Child");
parentObject.addChild(child);`,
                params: [{ name: "child", type: "GameObject", description: "The child object to add" }]
            },

            addModule: {
                description: "Add a module/component to the GameObject to extend its functionality",
                example: `const rigidBody = gameObject.addModule(new RigidBody());
rigidBody.gravity = 500;`,
                params: [{ name: "module", type: "Module", description: "The module instance to add" }],
                returns: { type: "Module", description: "The added module instance" }
            },

            getModule: {
                description: "Get a module of a specific type from the GameObject",
                example: `const rigidBody = this.gameObject.getModule("RigidBody");
if(rigidBody) rigidBody.setVelocity(new Vector2(0, 10));`,
                params: [{ name: "type", type: "string", description: "The type/name of the module to get" }],
                returns: { type: "Module|null", description: "The found module or null" }
            },

            setPosition: {
                description: "Set the position of the GameObject in world space",
                example: `gameObject.setPosition(new Vector2(100, 200));`,
                params: [{ name: "position", type: "Vector2", description: "The new position" }]
            },

            checkForCollisions: {
                description: "Check for collisions with other GameObjects that have useCollisions enabled",
                example: `const collisions = this.gameObject.checkForCollisions();

collisions.forEach(other => {
    if(other.gameObject.hasTag("enemy")) {
        // Code to inflict damage
    }
});`,
                params: [],
                returns: { type: "Array<GameObject>", description: "Array of collided GameObjects" }
            },

            checkPolygonCollisions: {
                description: "Check for collisions with other GameObjects using polygon collision",
                example: `const collisions = this.gameObject.checkPolygonCollisions();

collisions.forEach(other => {
    if(other.gameObject.hasTag("enemy")) {
        // Code to inflict damage
    }
});`,
                params: [],
                returns: { type: "Array<GameObject>", description: "Array of collided GameObjects" }
            },

            polygonContainsPoint: {
                description: "Check if a point is inside the GameObject's polygon",
                example: `if(this.gameObject.polygonContainsPoint(window.input.mousePosition.x, window.input.mousePosition.y)) {
    // Code to execute if the point is inside the polygon
}`,
                params: [{ name: "x", type: "number", description: "The x coordinate of the point" },
                { name: "y", type: "number", description: "The y coordinate of the point" }],
                returns: { type: "boolean", description: "True if the point is inside the polygon" }
            }
        }
    },

    // Prefab Functions
    Prefab: {
        group: "Core",
        functions: {
            instantiatePrefab: {
                description: "Create a new instance of a prefab",
                example: `const player = window.engine.instantiatePrefab("Player");
player.setPosition(new Vector2(100, 200));`,
                params: [{ name: "name", type: "string", description: "The name of the prefab to create" },
                { name: "x", type: "number", description: "Optional  x position to place the prefab" },
                { name: "y", type: "number", description: "Optional  y position to place the prefab" },
                { name: "parent", type: "GameObject|null", description: "Optional parent GameObject to attach the prefab to" }
                ],
                returns: { type: "GameObject", description: "The created prefab instance" }
            }
        }
    },

    Modules: {
        group: "Modules",
        functions: {
            Module: {
                description: "Base class for all modules. Modules extend GameObject functionality and can be attached, enabled/disabled, cloned, and serialized.",
                example: `class MyModule extends Module {
    constructor() {
        super("MyModule");

        this.speed = 100; // Movement speed

        this.exposeProperty("speed", "number", 100, 
        { min: 0, max: 1000, step: 10,
          description: "Movement speed in pixels per second",
          onChange: (value) => { this.speed = value; } // Important to update internal value
        });
    }
    start() { /* Called when activated */ }
    loop(dt) { /* Called every frame */ }
    draw(ctx) { /* Custom rendering */ }
}`,
                methods: [
                    { name: "preload()", description: "Load assets etc before game starts" },
                    { name: "start()", description: "Called when module is activated" },
                    { name: "beginLoop()", description: "Called at start of each frame" },
                    { name: "loop(deltaTime)", description: "Main update logic" },
                    { name: "endLoop()", description: "Called at end of each frame" },
                    { name: "draw(ctx)", description: "Render module visuals" },
                    { name: "onDestroy()", description: "Cleanup when destroyed" },
                    { name: "enable()", description: "Enable the module" },
                    { name: "disable()", description: "Disable the module" },
                    { name: "toggle()", description: "Toggle enabled state" },
                    { name: "getModule(type)", description: "Get another module by type" },
                    { name: "exposeProperty(name, type, default, options)", description: "Expose property to inspector" },
                    { name: "setProperty(name, value)", description: "Set property value" },
                    { name: "getProperty(name, default)", description: "Get property value" },
                    { name: "attachTo(gameObject)", description: "Attach module to GameObject" },
                    { name: "clone(newGameObject)", description: "Clone module instance" },
                    { name: "toJSON()", description: "Serialize module for saving module properties" },
                    { name: "fromJSON(json)", description: "Deserialize module for loading module properties" }
                ]
            },
            ExposeProperties: {
                description: "Expose properties to the inspector panel",
                example: `this.exposeProperty("speed", "number", 100,
{ min: 0, max: 1000, step: 10,
    description: "Movement speed in pixels per second",
    onChange: (value) => { this.speed = value; } // Important to update internal value
});`,
                methods: [
                    { name: "exposeProperty(name, type, default, options)", description: "Expose property to inspector" }
                ]
            },
            style: {
                description: "Define custom inspector UI for the module",
                example: `style(style) {
    style.startGroup("Movement Settings", false, { backgroundColor: 'rgba(180,220,180,0.07)', padding: 8, borderRadius: 6 });
    style.exposeProperty("speed", "number", this.speed, { label: "Speed" });
    style.exposeProperty("jumpHeight", "number", this.jumpHeight, { label: "Jump Height" });
    style.endGroup();
    
    style.addDivider();

    style.addButton("Reset Position", () => {
        this.gameObject.setPosition(new Vector2(0, 0));
    }, { style: "background-color: #f44336; color: white;" });

    style.addHelpText("Adjust movement parameters above. Use the button to reset position.", { color: "#888" });
}`,
            },
            allowMultiple: {
                description: "Set whether multiple instances of this module type can be added to a single GameObject",
                example: `class MyModule extends Module {
                static allowMultiple = false; // Only one instance allowed

    constructor() {
        super("MyModule");
    }
}`
            },
            namespace: {
                description: "Set a custom namespace for the module to avoid name conflicts",
                example: `class MyModule extends Module {
    static namespace = "Custom"; // Custom namespace
    constructor() {
        super("MyModule");
    }
}`
            }
        }
    },

    Drawing: {
        group: "Drawing",
        functions: {
            getMainCanvas: {
                description: "Get the main canvas element for drawing to",
                example: `draw(ctx) {
    ctx = window.engine.getMainCanvas();

    ctx.save();

    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, 100, 100);
    ctx.restore();
}`,
                returns: { type: "HTMLCanvasElement", description: "The main canvas element" }
            },
            getGuiCanvas: {
                description: "Get the GUI canvas element for drawing to",
                example: `draw(ctx) {
    ctx = window.engine.getGuiCanvas();

    ctx.save();

    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, 100, 100);
    ctx.restore();
}`,
                returns: { type: "HTMLCanvasElement", description: "The GUI canvas element" }
            },
            getBackgroundCanvas: {
                description: "Get the background canvas element for drawing to",
                example: `draw(ctx) {
    ctx = window.engine.getBackgroundCanvas();

    ctx.save();

    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, 100, 100);
    ctx.restore();
}`,
                returns: { type: "HTMLCanvasElement", description: "The background canvas element" }
            }
        }
    },

    // Input Functions
    Input: {
        group: "Input",
        functions: {
            keyDown: {
                description: "Check if a key is currently being held down",
                example: `if(window.input.keyDown("Space")) {
    player.jump();
}`,
                params: [{ name: "keyCode", type: "string", description: "Key to check (e.g. 'Space', 'ArrowLeft')" }],
                returns: { type: "boolean", description: "True if key is down" }
            },

            keyPressed: {
                description: "Check if a key was first pressed this frame",
                example: `if(window.input.keyPressed("E")) {
    player.interact();
}`,
                params: [{ name: "keyCode", type: "string", description: "Key to check" }],
                returns: { type: "boolean", description: "True if key was just pressed" }
            },

            mouseDown: {
                description: "Check if a mouse button is currently pressed",
                example: `if(window.input.mouseDown("left")) {
    fireWeapon();
}`,
                params: [{ name: "button", type: "string", description: "Mouse button ('left', 'right', 'middle')" }],
                returns: { type: "boolean", description: "True if button is down" }
            },

            mousePressed: {
                description: "Check if a mouse button was just pressed this frame",
                example: `if(window.input.mousePressed("left")) {
    selectObject();
}`,
                params: [{ name: "button", type: "string", description: "Mouse button to check" }],
                returns: { type: "boolean", description: "True if button was just pressed" }
            },

            getMousePosition: {
                description: "Get the current mouse position",
                example: `const mousePos = window.input.getMousePosition(true); // world space
gameObject.lookAt(mousePos);`,
                params: [{ name: "worldSpace", type: "boolean", description: "If true, returns world coordinates" }],
                returns: { type: "Vector2", description: "Mouse position" }
            },

            isTapped: {
                description: "Check if a tap gesture occurred this frame (mobile)",
                example: `if(window.input.isTapped()) {
    handleTap();
}`,
                returns: { type: "boolean", description: "True if tap occurred" }
            },

            getTouchCount: {
                description: "Get the number of active touch points",
                example: `if(window.input.getTouchCount() === 2) {
    handlePinchZoom();
}`,
                returns: { type: "number", description: "Number of active touches" }
            }
        }
    },

    // Math Utilities
    Math: {
        group: "Math",
        functions: {
            Vector2: {
                description: "Create a 2D vector for position, direction, or velocity",
                example: `const velocity = new Vector2(5, 0);
gameObject.position.add(velocity.multiply(deltaTime));`,
                params: [
                    { name: "x", type: "number", description: "X component" },
                    { name: "y", type: "number", description: "Y component" }
                ]
            },

            lerp: {
                description: "Linearly interpolate between two values",
                example: `const smoothedPosition = Vector2.lerp(current, target, 0.1);
gameObject.position = smoothedPosition;`,
                params: [
                    { name: "start", type: "number|Vector2", description: "Starting value" },
                    { name: "end", type: "number|Vector2", description: "Target value" },
                    { name: "t", type: "number", description: "Interpolation factor (0-1)" }
                ]
            }
        }
    },

    MatterMath: {
        group: "Math & Utility",
        functions: {
            pi: {
                description: "Returns the value of PI (3.14159...)",
                example: "const circumference = 2 * matterMath.pi() * radius;",
                returns: { type: "number", description: "The value of PI" }
            },
            pi2: {
                description: "Returns 2 * PI (6.28318...)",
                example: "const fullCircle = matterMath.pi2();",
                returns: { type: "number", description: "2 * PI" }
            },
            time: {
                description: "Returns current timestamp in milliseconds",
                example: "const startTime = matterMath.time();",
                returns: { type: "number", description: "Current timestamp in ms" }
            },
            dt: {
                description: "Returns delta time scaled by rate",
                example: "const scaledDelta = matterMath.dt(0.5); // Half speed",
                params: [{ name: "rate", type: "number", description: "Rate to scale delta time by (default: 0.1)" }],
                returns: { type: "number", description: "Scaled delta time" }
            },
            setTimescale: {
                description: "Sets the timescale for calculations",
                example: "matterMath.setTimescale(2.0); // Double speed",
                params: [{ name: "timescale", type: "number", description: "New timescale value" }]
            },
            getTimescale: {
                description: "Gets the current timescale",
                example: "const currentScale = matterMath.getTimescale();",
                returns: { type: "number", description: "Current timescale" }
            },
            ts: {
                description: "Alias for getTimescale()",
                example: "const scale = matterMath.ts();",
                returns: { type: "number", description: "Current timescale" }
            },
            listCreate: {
                description: "Creates a new array/list",
                example: "const myList = matterMath.listCreate();",
                returns: { type: "Array", description: "New empty array" }
            },
            listAdd: {
                description: "Adds a value to a list",
                example: "matterMath.listAdd(myList, \"item\");",
                params: [
                    { name: "id", type: "Array", description: "The list to add to" },
                    { name: "value", type: "any", description: "Value to add" }
                ]
            },
            listSet: {
                description: "Sets a value at a position in a list",
                example: "matterMath.listSet(myList, 0, \"new value\");",
                params: [
                    { name: "id", type: "Array", description: "The list to modify" },
                    { name: "pos", type: "number", description: "Position to set" },
                    { name: "value", type: "any", description: "Value to set" }
                ]
            },
            listGet: {
                description: "Gets a value from a list at a position",
                example: "const item = matterMath.listGet(myList, 0);",
                params: [
                    { name: "id", type: "Array", description: "The list to get from" },
                    { name: "pos", type: "number", description: "Position to get" }
                ],
                returns: { type: "any", description: "Value at position" }
            },
            array2dCreate: {
                description: "Creates a 2D array initialized with a value",
                example: "const grid = matterMath.array2dCreate(10, 10, 0);",
                params: [
                    { name: "width", type: "number", description: "Width of array" },
                    { name: "height", type: "number", description: "Height of array" },
                    { name: "defaultValue", type: "any", description: "Initial value for all cells" }
                ],
                returns: { type: "Array[]", description: "2D array" }
            },
            array2dSet: {
                description: "Sets a value in a 2D array",
                example: "matterMath.array2dSet(grid, 5, 3, 1);",
                params: [
                    { name: "array", type: "Array[]", description: "2D array" },
                    { name: "x", type: "number", description: "X coordinate" },
                    { name: "y", type: "number", description: "Y coordinate" },
                    { name: "value", type: "any", description: "Value to set" }
                ]
            },
            array2dGet: {
                description: "Gets a value from a 2D array",
                example: "const value = matterMath.array2dGet(grid, 5, 3);",
                params: [
                    { name: "array", type: "Array[]", description: "2D array" },
                    { name: "x", type: "number", description: "X coordinate" },
                    { name: "y", type: "number", description: "Y coordinate" }
                ],
                returns: { type: "any", description: "Value at coordinates" }
            },
            array3dCreate: {
                description: "Creates a 3D array initialized with a value",
                example: "const cube = matterMath.array3dCreate(5, 5, 5, 0);",
                params: [
                    { name: "width", type: "number", description: "Width of array" },
                    { name: "height", type: "number", description: "Height of array" },
                    { name: "depth", type: "number", description: "Depth of array" },
                    { name: "defaultValue", type: "any", description: "Initial value for all cells" }
                ],
                returns: { type: "Array[][]", description: "3D array" }
            },
            array3dSet: {
                description: "Sets a value in a 3D array",
                example: "matterMath.array3dSet(cube, 2, 3, 1, 5);",
                params: [
                    { name: "array", type: "Array[][]", description: "3D array" },
                    { name: "x", type: "number", description: "X coordinate" },
                    { name: "y", type: "number", description: "Y coordinate" },
                    { name: "z", type: "number", description: "Z coordinate" },
                    { name: "value", type: "any", description: "Value to set" }
                ]
            },
            array3dGet: {
                description: "Gets a value from a 3D array",
                example: "const value = matterMath.array3dGet(cube, 2, 3, 1);",
                params: [
                    { name: "array", type: "Array[][]", description: "3D array" },
                    { name: "x", type: "number", description: "X coordinate" },
                    { name: "y", type: "number", description: "Y coordinate" },
                    { name: "z", type: "number", description: "Z coordinate" }
                ],
                returns: { type: "any", description: "Value at coordinates" }
            },
            arrayClear: {
                description: "Clears an array",
                example: "const cleared = matterMath.arrayClear(myArray);",
                params: [{ name: "array", type: "Array", description: "Array to clear" }],
                returns: { type: "Array", description: "Empty array" }
            },
            dcos: {
                description: "Returns cosine of x degrees",
                example: "const x = matterMath.dcos(45); // cos(45°)",
                params: [{ name: "x", type: "number", description: "Angle in degrees" }],
                returns: { type: "number", description: "Cosine value" }
            },
            degtorad: {
                description: "Converts degrees to radians",
                example: "const radians = matterMath.degtorad(180); // π",
                params: [{ name: "x", type: "number", description: "Angle in degrees" }],
                returns: { type: "number", description: "Angle in radians" }
            },
            radtodeg: {
                description: "Converts radians to degrees",
                example: "const degrees = matterMath.radtodeg(Math.PI); // 180",
                params: [{ name: "x", type: "number", description: "Angle in radians" }],
                returns: { type: "number", description: "Angle in degrees" }
            },
            snap: {
                description: "Snaps a position to grid size",
                example: "const snapped = matterMath.snap(127, 32); // 128",
                params: [
                    { name: "position", type: "number", description: "Position to snap" },
                    { name: "grid_size", type: "number", description: "Grid size" }
                ],
                returns: { type: "number", description: "Snapped position" }
            },
            pointDistance: {
                description: "Distance between two points",
                example: "const dist = matterMath.pointDistance(0, 0, 3, 4); // 5",
                params: [
                    { name: "x1", type: "number", description: "First point X" },
                    { name: "y1", type: "number", description: "First point Y" },
                    { name: "x2", type: "number", description: "Second point X" },
                    { name: "y2", type: "number", description: "Second point Y" }
                ],
                returns: { type: "number", description: "Distance between points" }
            },
            pointDirection: {
                description: "Angle from one point to another",
                example: "const angle = matterMath.pointDirection(0, 0, 1, 1);",
                params: [
                    { name: "x1", type: "number", description: "First point X" },
                    { name: "y1", type: "number", description: "First point Y" },
                    { name: "x2", type: "number", description: "Second point X" },
                    { name: "y2", type: "number", description: "Second point Y" }
                ],
                returns: { type: "number", description: "Angle in degrees" }
            },
            angleDifference: {
                description: "Smallest difference between two angles",
                example: "const diff = matterMath.angleDifference(350, 10); // 20",
                params: [
                    { name: "angle1", type: "number", description: "First angle" },
                    { name: "angle2", type: "number", description: "Second angle" }
                ],
                returns: { type: "number", description: "Angle difference (0-180)" }
            },
            lengthDirX: {
                description: "X offset for length/direction",
                example: "const x = matterMath.lengthDirX(100, 45);",
                params: [
                    { name: "length", type: "number", description: "Length/magnitude" },
                    { name: "direction", type: "number", description: "Direction in degrees" }
                ],
                returns: { type: "number", description: "X component" }
            },
            lengthDirY: {
                description: "Y offset for length/direction",
                example: "const y = matterMath.lengthDirY(100, 45);",
                params: [
                    { name: "length", type: "number", description: "Length/magnitude" },
                    { name: "direction", type: "number", description: "Direction in degrees" }
                ],
                returns: { type: "number", description: "Y component" }
            },
            lerp: {
                description: "Linear interpolation between two values",
                example: "const middle = matterMath.lerp(0, 100, 0.5); // 50",
                params: [
                    { name: "from", type: "number", description: "Start value" },
                    { name: "to", type: "number", description: "End value" },
                    { name: "amount", type: "number", description: "Amount (0-1)" }
                ],
                returns: { type: "number", description: "Interpolated value" }
            },
            random: {
                description: "Random float between 1 and max",
                example: "const num = matterMath.random(10); // 1-10",
                params: [{ name: "max", type: "number", description: "Maximum value" }],
                returns: { type: "number", description: "Random float" }
            },
            randomRange: {
                description: "Random float between min and max",
                example: "const num = matterMath.randomRange(5, 15);",
                params: [
                    { name: "min", type: "number", description: "Minimum value" },
                    { name: "max", type: "number", description: "Maximum value" }
                ],
                returns: { type: "number", description: "Random float" }
            },
            irandom: {
                description: "Random integer between 1 and max",
                example: "const dice = matterMath.irandom(6); // 1-6",
                params: [{ name: "max", type: "number", description: "Maximum value" }],
                returns: { type: "number", description: "Random integer" }
            },
            irandomRange: {
                description: "Random integer between min and max",
                example: "const num = matterMath.irandomRange(10, 20);",
                params: [
                    { name: "min", type: "number", description: "Minimum value" },
                    { name: "max", type: "number", description: "Maximum value" }
                ],
                returns: { type: "number", description: "Random integer" }
            },
            randomBool: {
                description: "Random true or false",
                example: "const coinFlip = matterMath.randomBool();",
                returns: { type: "boolean", description: "Random boolean" }
            },
            choose: {
                description: "Randomly chooses one of the items",
                example: "const item = matterMath.choose(\"red\", \"blue\", \"green\");",
                params: [{ name: "...items", type: "any", description: "Items to choose from" }],
                returns: { type: "any", description: "Randomly chosen item" }
            },
            stringReplaceAll: {
                description: "Replaces all occurrences in a string",
                example: "const result = matterMath.stringReplaceAll(\"hello world\", \"l\", \"x\");",
                params: [
                    { name: "str", type: "string", description: "Original string" },
                    { name: "find", type: "string", description: "String to find" },
                    { name: "replace", type: "string", description: "Replacement string" }
                ],
                returns: { type: "string", description: "Modified string" }
            },
            toString: {
                description: "Converts a value to string",
                example: "const str = matterMath.toString(123);",
                params: [{ name: "val", type: "any", description: "Value to convert" }],
                returns: { type: "string", description: "String representation" }
            },
            toInt: {
                description: "Converts a string to an integer",
                example: "const num = matterMath.toInt(\"123\");",
                params: [{ name: "val", type: "string", description: "Value to convert" }],
                returns: { type: "number", description: "Integer value" }
            },
            sine: {
                description: "Returns a pulsing value using sine",
                example: "const pulse = matterMath.sine(1000, 10);",
                params: [
                    { name: "delay", type: "number", description: "Delay/period" },
                    { name: "max", type: "number", description: "Maximum value" }
                ],
                returns: { type: "number", description: "Sine wave value" }
            },
            sinePositive: {
                description: "Returns a positive pulsing value",
                example: "const pulse = matterMath.sinePositive(1000, 10);",
                params: [
                    { name: "delay", type: "number", description: "Delay/period" },
                    { name: "max", type: "number", description: "Maximum value" }
                ],
                returns: { type: "number", description: "Positive sine wave value" }
            },
            sineNegative: {
                description: "Returns a negative pulsing value",
                example: "const pulse = matterMath.sineNegative(1000, 10);",
                params: [
                    { name: "delay", type: "number", description: "Delay/period" },
                    { name: "max", type: "number", description: "Maximum value" }
                ],
                returns: { type: "number", description: "Negative sine wave value" }
            },
            interpolate: {
                description: "Linear interpolation",
                example: "const value = matterMath.interpolate(0, 100, 0.5);",
                params: [
                    { name: "start", type: "number", description: "Start value" },
                    { name: "end", type: "number", description: "End value" },
                    { name: "t", type: "number", description: "Interpolation factor (0-1)" }
                ],
                returns: { type: "number", description: "Interpolated value" }
            },
            smoothstep: {
                description: "Smoothstep interpolation",
                example: "const smooth = matterMath.smoothstep(0.5);",
                params: [{ name: "t", type: "number", description: "Input value (0-1)" }],
                returns: { type: "number", description: "Smoothed value" }
            },
            sineInterpolation: {
                description: "Sine-based interpolation",
                example: "const smooth = matterMath.sineInterpolation(0.5);",
                params: [{ name: "t", type: "number", description: "Input value (0-1)" }],
                returns: { type: "number", description: "Sine interpolated value" }
            },
            clamp: {
                description: "Clamps a value between min and max",
                example: "const clamped = matterMath.clamp(150, 0, 100); // 100",
                params: [
                    { name: "value", type: "number", description: "Value to clamp" },
                    { name: "min", type: "number", description: "Minimum value" },
                    { name: "max", type: "number", description: "Maximum value" }
                ],
                returns: { type: "number", description: "Clamped value" }
            },
            keepPositive: {
                description: "Returns absolute value",
                example: "const positive = matterMath.keepPositive(-5); // 5",
                params: [{ name: "x", type: "number", description: "Input value" }],
                returns: { type: "number", description: "Absolute value" }
            },
            keepNegative: {
                description: "Returns negative absolute value",
                example: "const negative = matterMath.keepNegative(5); // -5",
                params: [{ name: "x", type: "number", description: "Input value" }],
                returns: { type: "number", description: "Negative absolute value" }
            },
            rotateSmooth: {
                description: "Smoothly rotates an angle toward another",
                example: "const newAngle = matterMath.rotateSmooth(currentAngle, targetAngle, 5);",
                params: [
                    { name: "direction", type: "number", description: "Current direction" },
                    { name: "targetDirection", type: "number", description: "Target direction" },
                    { name: "speed", type: "number", description: "Rotation speed" }
                ],
                returns: { type: "number", description: "New direction" }
            },
            executeString: {
                description: "Executes JS code from a string",
                example: "matterMath.executeString(\"console.log('Hello')\");",
                params: [{ name: "string", type: "string", description: "JavaScript code to execute" }]
            },
            rgb: {
                description: "Returns an RGB color string",
                example: "const color = matterMath.rgb(255, 0, 0); // \"rgb(255,0,0)\"",
                params: [
                    { name: "r", type: "number", description: "Red component (0-255)" },
                    { name: "g", type: "number", description: "Green component (0-255)" },
                    { name: "b", type: "number", description: "Blue component (0-255)" }
                ],
                returns: { type: "string", description: "RGB color string" }
            },
            hsl: {
                description: "Returns an HSL color string",
                example: "const color = matterMath.hsl(120, 1, 0.5); // \"hsl(120,100%,50%)\"",
                params: [
                    { name: "h", type: "number", description: "Hue (0-360)" },
                    { name: "s", type: "number", description: "Saturation (0-1)" },
                    { name: "l", type: "number", description: "Lightness (0-1)" }
                ],
                returns: { type: "string", description: "HSL color string" }
            }
        }
    },

    // Animation Modules
    Animation: {
        group: "Animation",
        functions: {
            Tween: {
                description: "Animate object properties over time with easing functions",
                example: `const tween = gameObject.addModule(new Tween());
tween.targetProperty = "position.x";
tween.startValue = 0;
tween.endValue = 100;
tween.duration = 2.0;
tween.easing = "easeInOutQuad";
tween.play();`,
                properties: [
                    { name: "targetProperty", type: "string", description: "Property to animate (e.g., 'position.x', 'rotation')" },
                    { name: "startValue", type: "number", description: "Starting value" },
                    { name: "endValue", type: "number", description: "Ending value" },
                    { name: "duration", type: "number", description: "Animation duration in seconds" },
                    { name: "easing", type: "string", description: "Easing function (linear, easeInQuad, etc.)" },
                    { name: "loop", type: "boolean", description: "Loop the animation" },
                    { name: "pingPong", type: "boolean", description: "Reverse direction each loop" }
                ],
                methods: [
                    { name: "play()", description: "Start the animation" },
                    { name: "stop()", description: "Stop the animation" },
                    { name: "pause()", description: "Pause the animation" },
                    { name: "resume()", description: "Resume the animation" }
                ]
            },

            Timer: {
                description: "Execute actions after specified time intervals",
                example: `const timer = gameObject.addModule(new Timer());
timer.duration = 3.0;
timer.actionType = "destroy";
timer.startTimer();`,
                properties: [
                    { name: "duration", type: "number", description: "Timer duration in seconds" },
                    { name: "repeat", type: "boolean", description: "Repeat the timer" },
                    { name: "actionType", type: "string", description: "Action to perform (log, destroy, disable, enable, custom)" },
                    { name: "customMessage", type: "string", description: "Message for log or custom actions" }
                ],
                methods: [
                    { name: "startTimer()", description: "Start the timer" },
                    { name: "stopTimer()", description: "Stop the timer" },
                    { name: "pauseTimer()", description: "Pause the timer" },
                    { name: "getRemainingTime()", description: "Get remaining time in seconds" }
                ]
            }
        }
    },

    // UI Modules
    UI: {
        group: "UI",
        functions: {
            Button: {
                description: "Interactive button with click events and visual states",
                example: `const button = gameObject.addModule(new Button());
button.text = "Click Me!";
button.width = 120;
button.height = 40;
button.actionType = "log";
button.actionMessage = "Button was clicked!";`,
                properties: [
                    { name: "text", type: "string", description: "Button text" },
                    { name: "width", type: "number", description: "Button width in pixels" },
                    { name: "height", type: "number", description: "Button height in pixels" },
                    { name: "backgroundColor", type: "color", description: "Background color" },
                    { name: "hoverColor", type: "color", description: "Color when hovered" },
                    { name: "pressedColor", type: "color", description: "Color when pressed" },
                    { name: "actionType", type: "string", description: "Action to perform (log, destroy, disable, enable, toggle, custom)" },
                    { name: "targetObjectName", type: "string", description: "Name of target object for actions" }
                ]
            },

            Text: {
                description: "Display formatted text with various styling options",
                example: `const text = gameObject.addModule(new Text());
text.text = "Hello World!";
text.fontSize = 24;
text.color = "#ffffff";
text.showBackground = true;
text.backgroundColor = "#000000";`,
                properties: [
                    { name: "text", type: "string", description: "Text to display" },
                    { name: "fontSize", type: "number", description: "Font size in pixels" },
                    { name: "fontFamily", type: "string", description: "Font family" },
                    { name: "color", type: "color", description: "Text color" },
                    { name: "textAlign", type: "string", description: "Text alignment (left, center, right)" },
                    { name: "showBackground", type: "boolean", description: "Show background behind text" },
                    { name: "showOutline", type: "boolean", description: "Show text outline" },
                    { name: "showShadow", type: "boolean", description: "Show text shadow" }
                ],
                methods: [
                    { name: "setText(text)", description: "Set the text content" },
                    { name: "getText()", description: "Get the text content" }
                ]
            }
        }
    },

    // Effects Modules
    Effects: {
        group: "Effects",
        functions: {
            ParticleSystem: {
                description: "Create particle effects like fire, smoke, explosions",
                example: `const particles = gameObject.addModule(new ParticleSystem());
particles.emissionRate = 20;
particles.particleLifetime = 2.0;
particles.startColor = "#ff4444";
particles.endColor = "#ffaa00";
particles.startVelocityY = -50;
particles.gravity = 100;
particles.startEmission();`,
                properties: [
                    { name: "emissionRate", type: "number", description: "Particles emitted per second" },
                    { name: "maxParticles", type: "number", description: "Maximum number of particles" },
                    { name: "particleLifetime", type: "number", description: "How long particles live" },
                    { name: "startSize", type: "number", description: "Initial particle size" },
                    { name: "endSize", type: "number", description: "Final particle size" },
                    { name: "startColor", type: "color", description: "Initial particle color" },
                    { name: "endColor", type: "color", description: "Final particle color" },
                    { name: "gravity", type: "number", description: "Gravity force applied to particles" },
                    { name: "emissionShape", type: "string", description: "Emission shape (point, circle, rectangle)" }
                ],
                methods: [
                    { name: "startEmission()", description: "Start emitting particles" },
                    { name: "stopEmission()", description: "Stop emitting particles" },
                    { name: "clearParticles()", description: "Remove all existing particles" }
                ]
            }
        }
    },

    // Audio Modules
    Audio: {
        group: "Audio",
        functions: {
            AudioPlayer: {
                description: "Play audio files with advanced controls and spatial audio",
                example: `const audio = gameObject.addModule(new AudioPlayer());
audio.audioAsset.path = "assets/sounds/music.mp3";
audio.volume = 0.8;
audio.loop = true;
audio.play();`,
                properties: [
                    { name: "audioAsset", type: "AssetReference", description: "Audio file to play" },
                    { name: "volume", type: "number", description: "Playback volume (0-1)" },
                    { name: "loop", type: "boolean", description: "Loop the audio" },
                    { name: "playRate", type: "number", description: "Playback speed (1.0 = normal)" },
                    { name: "autoplay", type: "boolean", description: "Automatically play when scene starts" },
                    { name: "spatialBlend", type: "number", description: "2D (0) vs 3D (1) sound blend" },
                    { name: "minDistance", type: "number", description: "Minimum distance for 3D audio" },
                    { name: "maxDistance", type: "number", description: "Maximum distance for 3D audio" }
                ],
                methods: [
                    { name: "play(options)", description: "Play the audio with optional parameters" },
                    { name: "stop()", description: "Stop audio playback" },
                    { name: "pause()", description: "Pause audio playback" },
                    { name: "resume()", description: "Resume playback from paused state" },
                    { name: "setVolume(value, fadeTime)", description: "Set volume with optional fade" }
                ]
            }
        }
    },

    // Physics Modules
    BasicPhysics: {
        group: "Physics",
        functions: {
            addForce: {
                description: "Apply a force to the physics object (affects velocity)",
                example: `const physics = this.gameObject.getModule("BasicPhysics");
physics.addForce(10, 0);`,
                params: [
                    { name: "x", type: "number", description: "Force in X direction" },
                    { name: "y", type: "number", description: "Force in Y direction" }
                ],
                returns: { type: "void", description: "No return value" }
            },
            setVelocity: {
                description: "Set the velocity of the physics object",
                example: `const physics = this.gameObject.getModule("BasicPhysics");
physics.setVelocity(0, 100);`,
                params: [
                    { name: "x", type: "number", description: "Velocity in X direction" },
                    { name: "y", type: "number", description: "Velocity in Y direction" }
                ],
                returns: { type: "void", description: "No return value" }
            },
            setAngularVelocity: {
                description: "Set the angular velocity (rotation speed)",
                example: `const physics = this.gameObject.getModule("BasicPhysics");
physics.setAngularVelocity(45);`,
                params: [
                    { name: "angVel", type: "number", description: "Angular velocity in degrees/sec" }
                ],
                returns: { type: "void", description: "No return value" }
            },
            getSpeed: {
                description: "Get the current speed (magnitude of velocity)",
                example: `const physics = this.gameObject.getModule("BasicPhysics");
const speed = physics.getSpeed();`,
                params: [],
                returns: { type: "number", description: "Current speed" }
            }
        }
    },

    // Logic Modules
    Logic: {
        group: "Logic",
        functions: {
            BehaviorTrigger: {
                description: "Trigger actions based on events like collisions and key presses",
                example: `const trigger = gameObject.addModule(new BehaviorTrigger());
trigger.triggerType = "collision";
trigger.actionType = "destroy";
trigger.actionTarget = "other";`,
                properties: [
                    { name: "triggerType", type: "string", description: "What causes the trigger (collision, key, mouse, timer)" },
                    { name: "triggerKey", type: "string", description: "Key that activates the trigger" },
                    { name: "actionType", type: "string", description: "Action to take (destroy, spawn, animate, toggle, message)" },
                    { name: "actionTarget", type: "string", description: "What object the action affects (self, other, byName)" },
                    { name: "targetName", type: "string", description: "Name of target object" },
                    { name: "cooldown", type: "number", description: "Cooldown between triggers (seconds)" }
                ],
                methods: [
                    { name: "tryTriggerAction(other)", description: "Manually trigger the action" },
                    { name: "executeAction(other)", description: "Execute the configured action" }
                ]
            }
        }
    },

    // Attributes Modules
    Attributes: {
        group: "Attributes",
        functions: {
            SimpleHealth: {
                description: "Basic health and damage system for GameObjects",
                example: `const health = gameObject.addModule(new SimpleHealth());
health.maxHealth = 100;
health.showHealthBar = true;
health.applyDamage(25);`,
                properties: [
                    { name: "maxHealth", type: "number", description: "Maximum health" },
                    { name: "currentHealth", type: "number", description: "Current health" },
                    { name: "invulnerabilityTime", type: "number", description: "Invulnerability time after taking damage" },
                    { name: "showHealthBar", type: "boolean", description: "Whether health is displayed in game" },
                    { name: "healthBarColor", type: "color", description: "Color of health bar" }
                ],
                methods: [
                    { name: "applyDamage(amount, source)", description: "Apply damage to this object" },
                    { name: "heal(amount)", description: "Heal this object" },
                    { name: "die(source)", description: "Kill this object immediately" },
                    { name: "resetHealth()", description: "Reset health to maximum" }
                ]
            }
        }
    },

    // Controllers Modules
    Controllers: {
        group: "Controllers",
        functions: {
            CameraController: {
                description: "Controls the game's camera view with smooth movement and zoom",
                example: `const camera = gameObject.addModule(new CameraController());
camera.followSpeed = 5.0;
camera.zoom = 1.5;
camera.shake(10, 0.5);`,
                properties: [
                    { name: "followOwner", type: "boolean", description: "Whether camera follows this GameObject" },
                    { name: "followSpeed", type: "number", description: "How quickly the camera follows its target" },
                    { name: "zoom", type: "number", description: "Camera zoom level (1.0 = 100%)" },
                    { name: "positionDamping", type: "number", description: "Smoothness of camera movement (0-1)" },
                    { name: "zoomDamping", type: "number", description: "Smoothness of camera zoom (0-1)" },
                    { name: "offset", type: "Vector2", description: "Camera offset from this GameObject" }
                ],
                methods: [
                    { name: "jumpToTarget()", description: "Immediately move camera to target" },
                    { name: "moveTo(position, immediate)", description: "Move camera to specific position" },
                    { name: "setZoom(zoomLevel, immediate)", description: "Set camera zoom level" },
                    { name: "shake(intensity, duration)", description: "Apply camera shake effect" },
                    { name: "setBounds(x, y, width, height)", description: "Set camera bounds" }
                ]
            },

            KeyboardController: {
                description: "Keyboard-based movement and input with customizable controls",
                example: `const keyboard = gameObject.addModule(new KeyboardController());
keyboard.speed = 200;
keyboard.useAcceleration = true;
keyboard.upKey = "w";`,
                properties: [
                    { name: "speed", type: "number", description: "Movement speed in pixels per second" },
                    { name: "useAcceleration", type: "boolean", description: "Enable smooth acceleration/deceleration" },
                    { name: "acceleration", type: "number", description: "Acceleration rate (0-1)" },
                    { name: "moveMode", type: "string", description: "Movement style (direct, rotate-and-move)" },
                    { name: "upKey", type: "string", description: "Key for upward movement" },
                    { name: "downKey", type: "string", description: "Key for downward movement" },
                    { name: "leftKey", type: "string", description: "Key for leftward movement" },
                    { name: "rightKey", type: "string", description: "Key for rightward movement" }
                ],
                methods: [
                    { name: "resetControls()", description: "Reset all controls to default values" }
                ]
            }
        }
    },

    // Drawing Modules
    Drawing: {
        group: "Drawing",
        functions: {
            DrawCircle: {
                description: "Draw a filled circle at the GameObject's position",
                example: `const circle = gameObject.addModule(new DrawCircle());
circle.radius = 50;
circle.color = "#ff0000";
circle.outline = true;`,
                properties: [
                    { name: "radius", type: "number", description: "Circle radius" },
                    { name: "offset", type: "Vector2", description: "Offset from center" },
                    { name: "color", type: "color", description: "Fill color" },
                    { name: "fill", type: "boolean", description: "Fill circle" },
                    { name: "outline", type: "boolean", description: "Show outline" },
                    { name: "outlineColor", type: "color", description: "Outline color" },
                    { name: "outlineWidth", type: "number", description: "Outline thickness" }
                ]
            },

            DrawRectangle: {
                description: "Draw a filled rectangle at the GameObject's position",
                example: `const rect = gameObject.addModule(new DrawRectangle());
rect.width = 100;
rect.height = 50;
rect.color = "#00ff00";`,
                properties: [
                    { name: "width", type: "number", description: "Rectangle width" },
                    { name: "height", type: "number", description: "Rectangle height" },
                    { name: "offset", type: "Vector2", description: "Offset from center" },
                    { name: "color", type: "color", description: "Fill color" },
                    { name: "fill", type: "boolean", description: "Fill rectangle" },
                    { name: "outline", type: "boolean", description: "Show outline" },
                    { name: "outlineColor", type: "color", description: "Outline color" },
                    { name: "outlineWidth", type: "number", description: "Outline thickness" }
                ]
            },

            DrawPolygon: {
                description: "Draw a filled polygon at the GameObject's position",
                example: `const poly = gameObject.addModule(new DrawPolygon());
poly.vertices = [new Vector2(0, -50), new Vector2(50, 50), new Vector2(-50, 50)];
poly.color = "#0000ff";`,
                properties: [
                    { name: "vertices", type: "Array<Vector2>", description: "Array of Vector2 points (min 3)" },
                    { name: "offset", type: "Vector2", description: "Offset from center" },
                    { name: "color", type: "color", description: "Fill color" },
                    { name: "fill", type: "boolean", description: "Fill polygon" },
                    { name: "outline", type: "boolean", description: "Show outline" },
                    { name: "outlineColor", type: "color", description: "Outline color" },
                    { name: "outlineWidth", type: "number", description: "Outline thickness" }
                ],
                methods: [
                    { name: "setVertex(index, value)", description: "Set a vertex at a specific index" },
                    { name: "addVertex(vertex, index)", description: "Add a new vertex to the polygon" },
                    { name: "removeVertex(index)", description: "Remove a vertex at the specified index" }
                ]
            }
        }
    },

    // Matter.js Physics Modules
    "Matter.js": {
        group: "Physics",
        functions: {
            RigidBody: {
                description: "Physics component that adds a physical body to a GameObject\n" +
                    "Uses the Matter.js physics engine for realistic simulation\n\n" +
                    "Rigidbody uses the GameObjects bounding box for collisions by default.",
                example: `const body = gameObject.addModule(new RigidBody());
body.bodyType = "dynamic";
body.density = 1;
body.setVelocity(new Vector2(0, -10));`,
                properties: [
                    { name: "bodyType", type: "string", description: "Body type (dynamic, static, kinematic)" },
                    { name: "shape", type: "string", description: "Body shape (rectangle, circle, polygon)" },
                    { name: "width", type: "number", description: "Width for rectangle shape" },
                    { name: "height", type: "number", description: "Height for rectangle shape" },
                    { name: "radius", type: "number", description: "Radius for circle shape" },
                    { name: "density", type: "number", description: "Density (mass = density * area)" },
                    { name: "friction", type: "number", description: "Friction coefficient" },
                    { name: "restitution", type: "number", description: "Bounciness (0 to 1)" },
                    { name: "fixedRotation", type: "boolean", description: "Prevent rotation" }
                ],
                methods: [
                    { name: "applyForce(force)", description: "Apply a force to the center of the body" },
                    { name: "applyImpulse(impulse)", description: "Apply an impulse to the center of the body" },
                    { name: "setVelocity(velocity)", description: "Set the linear velocity of the body" },
                    { name: "getVelocity()", description: "Get the current linear velocity" },
                    { name: "setAngularVelocity(angularVelocity)", description: "Set the angular velocity" },
                    { name: "getAngularVelocity()", description: "Get the current angular velocity" }
                ]
            }
        }
    },

    // Utility Modules
    Utility: {
        group: "Utility",
        functions: {
            FollowTarget: {
                description: "Make an object follow another object or position",
                example: `const follower = gameObject.addModule(new FollowTarget());
follower.targetName = "Player";
follower.followMode = "smooth";
follower.followSpeed = 5.0;
follower.offset = new Vector2(0, -50);`,
                properties: [
                    { name: "targetName", type: "string", description: "Name of target object to follow" },
                    { name: "followMode", type: "string", description: "Follow mode (smooth, instant, physics)" },
                    { name: "followSpeed", type: "number", description: "Speed of following" },
                    { name: "minDistance", type: "number", description: "Minimum distance to maintain" },
                    { name: "maxDistance", type: "number", description: "Maximum distance before following" },
                    { name: "offset", type: "Vector2", description: "Offset from target position" },
                    { name: "lookAtTarget", type: "boolean", description: "Rotate to face the target" }
                ],
                methods: [
                    { name: "setTarget(name)", description: "Set a new target by name" },
                    { name: "setTargetPosition(x, y)", description: "Set a fixed position to follow" }
                ]
            },

            Spawner: {
                description: "Spawn objects at intervals or on events",
                example: `const spawner = gameObject.addModule(new Spawner());
spawner.prefabName = "Enemy";
spawner.spawnInterval = 2.0;
spawner.maxSpawns = 10;
spawner.startSpawning();`,
                properties: [
                    { name: "prefabName", type: "string", description: "Name of object to spawn" },
                    { name: "spawnInterval", type: "number", description: "Time between spawns" },
                    { name: "maxSpawns", type: "number", description: "Maximum objects to spawn" },
                    { name: "spawnRadius", type: "number", description: "Random spawn radius" },
                    { name: "autoStart", type: "boolean", description: "Start spawning automatically" }
                ],
                methods: [
                    { name: "startSpawning()", description: "Start the spawning process" },
                    { name: "stopSpawning()", description: "Stop spawning" },
                    { name: "spawnNow()", description: "Spawn an object immediately" }
                ]
            }
        }
    },

    // Visual Modules
    Visual: {
        group: "Visual",
        functions: {
            SpriteRenderer: {
                description: "Render sprites with various scaling and display options",
                example: `const renderer = gameObject.addModule(new SpriteRenderer());
renderer.imageAsset.path = "assets/player.png";
renderer.width = 64;
renderer.height = 64;
renderer.scaleMode = "fit";`,
                properties: [
                    { name: "imageAsset", type: "AssetReference", description: "Sprite image to display" },
                    { name: "width", type: "number", description: "Width of the sprite in pixels" },
                    { name: "height", type: "number", description: "Height of the sprite in pixels" },
                    { name: "scaleMode", type: "string", description: "How the image should be scaled (stretch, fit, fill, tile, 9-slice)" },
                    { name: "color", type: "color", description: "Tint color for the sprite" },
                    { name: "flipX", type: "boolean", description: "Flip sprite horizontally" },
                    { name: "flipY", type: "boolean", description: "Flip sprite vertically" },
                    { name: "pivot", type: "Vector2", description: "Pivot point for rotation" }
                ],
                methods: [
                    { name: "setSprite(path)", description: "Set the sprite image by path" },
                    { name: "loadImage()", description: "Load the sprite image from asset reference" }
                ]
            },

            SpriteSheetRenderer: {
                description: "Render sprites from a sprite sheet with frame selection",
                example: `const spriteSheet = gameObject.addModule(new SpriteSheetRenderer());
spriteSheet.imageAsset.path = "assets/character_sheet.png";
spriteSheet.columns = 4;
spriteSheet.rows = 4;
spriteSheet.currentColumn = 1;
spriteSheet.currentRow = 0;`,
                properties: [
                    { name: "imageAsset", type: "AssetReference", description: "Sprite sheet image" },
                    { name: "columns", type: "number", description: "Number of columns in the sprite sheet" },
                    { name: "rows", type: "number", description: "Number of rows in the sprite sheet" },
                    { name: "currentColumn", type: "number", description: "Current column in the sprite sheet" },
                    { name: "currentRow", type: "number", description: "Current row in the sprite sheet" },
                    { name: "width", type: "number", description: "Display width in pixels" },
                    { name: "height", type: "number", description: "Display height in pixels" },
                    { name: "color", type: "color", description: "Tint color for the sprite" },
                    { name: "flipX", type: "boolean", description: "Flip sprite horizontally" },
                    { name: "flipY", type: "boolean", description: "Flip sprite vertically" }
                ],
                methods: [
                    { name: "setSprite(path)", description: "Set the sprite sheet image by path" },
                    { name: "setFrameByIndex(frameIndex)", description: "Navigate to a specific frame by index" },
                    { name: "getCurrentFrameIndex()", description: "Get the current frame index" }
                ]
            }
        }
    },

    // Scene Management
    Scene: {
        group: "Core",
        functions: {
            createGameObject: {
                description: "Create a new GameObject in the current scene",
                example: `const player = scene.createGameObject("Player");
player.addModule(new PlayerController());`,
                params: [{ name: "name", type: "string", description: "Name of the new object" }],
                returns: { type: "GameObject", description: "The created GameObject" }
            },

            findGameObject: {
                description: "Find a GameObject by name",
                example: `const player = scene.findGameObject("Player");
if(player) player.setActive(true);`,
                params: [{ name: "name", type: "string", description: "Name to search for" }],
                returns: { type: "GameObject|null", description: "The found GameObject or null" }
            },

            findGameObjectByName: {
                description: "Find a GameObject by name (alias for findGameObject)",
                example: `const enemy = scene.findGameObjectByName("Enemy");
if(enemy) enemy.destroy();`,
                params: [{ name: "name", type: "string", description: "Name to search for" }],
                returns: { type: "GameObject|null", description: "The found GameObject or null" }
            }
        }
    },

    // Engine Features
    Engine: {
        group: "Core",
        functions: {
            loadScene: {
                description: "Load and switch to a different scene",
                example: `engine.loadScene(newScene);
engine.start();`,
                params: [{ name: "scene", type: "Scene", description: "Scene to load" }]
            },

            start: {
                description: "Start the game engine",
                example: `engine.start();`,
                returns: { type: "Promise", description: "Promise that resolves when engine starts" }
            },

            stop: {
                description: "Stop the game engine",
                example: `engine.stop();`
            },

            pause: {
                description: "Pause the game engine",
                example: `engine.pause();`
            },

            resume: {
                description: "Resume the game engine",
                example: `engine.resume();`
            }
        }
    },

    AI: {
        group: "AI Prompt",
        functions: {
            AIPrompt: {
                description: "Use this prompt in AI Chatbots to create AI modules for the Dark Matter JS game engine.",
                example: `You are an AI assistant specialized expert in the Dark Matter JS game engine module system.

**Module System Basics:**
- Modules extend GameObject functionality
- GameObjects have: position (Vector2), scale (Vector2), angle (degrees), size (Vector2)
- All modules extend the Module base class
- Use this.gameObject to access the GameObject
- Access other modules: this.gameObject.getModule("ModuleName")
- Access viewport through 'window.engine.viewport.x', 'window.engine.viewport.y', 'window.engine.viewport.width', 'window.engine.viewport.height'
- Viewport x and y are viewport center coordinates

**Module Template:**

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

USER PROMPT: `,
            }
        }
    }
};

// Make documentation available globally
window.DarkMatterDocs = DarkMatterDocs;

/**
 * Helper function to get documentation for a specific function
 * @param {string} category - The category name
 * @param {string} funcName - The function name
 * @returns {Object|null} Documentation object or null if not found
 */
function getDocumentation(category, funcName) {
    if (DarkMatterDocs[category] && DarkMatterDocs[category].functions[funcName]) {
        return DarkMatterDocs[category].functions[funcName];
    }
    return null;
}

/**
 * Helper function to get all functions in a group
 * @param {string} groupName - The group name to search for
 * @returns {Array} Array of functions in that group
 */
function getFunctionsByGroup(groupName) {
    const functions = [];
    for (const category in DarkMatterDocs) {
        if (DarkMatterDocs[category].group === groupName) {
            for (const funcName in DarkMatterDocs[category].functions) {
                functions.push({
                    category,
                    name: funcName,
                    ...DarkMatterDocs[category].functions[funcName]
                });
            }
        }
    }
    return functions;
}

/**
 * Get all available documentation groups
 * @returns {Array<string>} Array of group names
 */
function getDocumentationGroups() {
    const groups = new Set();
    for (const category in DarkMatterDocs) {
        groups.add(DarkMatterDocs[category].group);
    }
    return Array.from(groups);
}

// Export helper functions
window.getDocumentation = getDocumentation;
window.getFunctionsByGroup = getFunctionsByGroup;
window.getDocumentationGroups = getDocumentationGroups;
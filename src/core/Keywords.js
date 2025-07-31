/**
 * Keywords and Function Documentation for Dark Matter JS Engine
 */
const DarkMatterDocs = {
    // GameObject Functions
    GameObject: {
        group: "Core",
        functions: {
            addModule: {
                description: "Add a module/component to the GameObject",
                example: `const sprite = gameObject.addModule(new SpriteRenderer());
sprite.setSprite("player.png");`,
                params: [{name: "module", type: "Module", description: "The module instance to add"}],
                returns: {type: "Module", description: "The added module instance"}
            },
            
            addChild: {
                description: "Add a child GameObject to create a parent-child relationship",
                example: `const child = new GameObject("Child");
parentObject.addChild(child);`,
                params: [{name: "child", type: "GameObject", description: "The child object to add"}]
            },

            getModule: {
                description: "Get a module of a specific type from the GameObject",
                example: `const rigidBody = gameObject.getModule("RigidBody");
if(rigidBody) rigidBody.setVelocity(new Vector2(0, 10));`,
                params: [{name: "type", type: "string", description: "The type/name of the module to get"}],
                returns: {type: "Module|null", description: "The found module or null"}
            },

            setPosition: {
                description: "Set the position of the GameObject in world space",
                example: `gameObject.setPosition(new Vector2(100, 200));`,
                params: [{name: "position", type: "Vector2", description: "The new position"}]
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
                params: [{name: "keyCode", type: "string", description: "Key to check (e.g. 'Space', 'ArrowLeft')"}],
                returns: {type: "boolean", description: "True if key is down"}
            },

            keyPressed: {
                description: "Check if a key was first pressed this frame",
                example: `if(window.input.keyPressed("E")) {
    player.interact();
}`,
                params: [{name: "keyCode", type: "string", description: "Key to check"}],
                returns: {type: "boolean", description: "True if key was just pressed"}
            },

            mouseDown: {
                description: "Check if a mouse button is currently pressed",
                example: `if(window.input.mouseDown("left")) {
    fireWeapon();
}`,
                params: [{name: "button", type: "string", description: "Mouse button ('left', 'right', 'middle')"}],
                returns: {type: "boolean", description: "True if button is down"}
            },

            mousePressed: {
                description: "Check if a mouse button was just pressed this frame",
                example: `if(window.input.mousePressed("left")) {
    selectObject();
}`,
                params: [{name: "button", type: "string", description: "Mouse button to check"}],
                returns: {type: "boolean", description: "True if button was just pressed"}
            },

            getMousePosition: {
                description: "Get the current mouse position",
                example: `const mousePos = window.input.getMousePosition(true); // world space
gameObject.lookAt(mousePos);`,
                params: [{name: "worldSpace", type: "boolean", description: "If true, returns world coordinates"}],
                returns: {type: "Vector2", description: "Mouse position"}
            },

            isTapped: {
                description: "Check if a tap gesture occurred this frame (mobile)",
                example: `if(window.input.isTapped()) {
    handleTap();
}`,
                returns: {type: "boolean", description: "True if tap occurred"}
            },

            getTouchCount: {
                description: "Get the number of active touch points",
                example: `if(window.input.getTouchCount() === 2) {
    handlePinchZoom();
}`,
                returns: {type: "number", description: "Number of active touches"}
            }
        }
    },

    // Physics Functions
    Physics: {
        group: "Physics",
        functions: {
            raycast: {
                description: "Cast a ray and check for collisions",
                example: `const hit = Raycast.cast(origin, direction, 100);
if(hit) console.log("Hit object:", hit.object.name);`,
                params: [
                    {name: "origin", type: "Vector2", description: "Starting point"},
                    {name: "direction", type: "Vector2", description: "Direction to cast"},
                    {name: "maxDistance", type: "number", description: "Maximum distance to check"}
                ],
                returns: {type: "RaycastHit|null", description: "Hit information if collision occurred"}
            },

            checkCollision: {
                description: "Check if two objects are colliding",
                example: `if(gameObject.collidesWith(otherObject)) {
    handleCollision();
}`,
                params: [{name: "other", type: "GameObject", description: "Other object to check against"}],
                returns: {type: "boolean", description: "True if objects are colliding"}
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
                    {name: "x", type: "number", description: "X component"},
                    {name: "y", type: "number", description: "Y component"}
                ]
            },

            lerp: {
                description: "Linearly interpolate between two values",
                example: `const smoothedPosition = Vector2.lerp(current, target, 0.1);
gameObject.position = smoothedPosition;`,
                params: [
                    {name: "start", type: "number|Vector2", description: "Starting value"},
                    {name: "end", type: "number|Vector2", description: "Target value"},
                    {name: "t", type: "number", description: "Interpolation factor (0-1)"}
                ]
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
                    {name: "targetProperty", type: "string", description: "Property to animate (e.g., 'position.x', 'rotation')"},
                    {name: "startValue", type: "number", description: "Starting value"},
                    {name: "endValue", type: "number", description: "Ending value"},
                    {name: "duration", type: "number", description: "Animation duration in seconds"},
                    {name: "easing", type: "string", description: "Easing function (linear, easeInQuad, etc.)"},
                    {name: "loop", type: "boolean", description: "Loop the animation"},
                    {name: "pingPong", type: "boolean", description: "Reverse direction each loop"}
                ],
                methods: [
                    {name: "play()", description: "Start the animation"},
                    {name: "stop()", description: "Stop the animation"},
                    {name: "pause()", description: "Pause the animation"},
                    {name: "resume()", description: "Resume the animation"}
                ]
            },

            Timer: {
                description: "Execute actions after specified time intervals",
                example: `const timer = gameObject.addModule(new Timer());
timer.duration = 3.0;
timer.actionType = "destroy";
timer.startTimer();`,
                properties: [
                    {name: "duration", type: "number", description: "Timer duration in seconds"},
                    {name: "repeat", type: "boolean", description: "Repeat the timer"},
                    {name: "actionType", type: "string", description: "Action to perform (log, destroy, disable, enable, custom)"},
                    {name: "customMessage", type: "string", description: "Message for log or custom actions"}
                ],
                methods: [
                    {name: "startTimer()", description: "Start the timer"},
                    {name: "stopTimer()", description: "Stop the timer"},
                    {name: "pauseTimer()", description: "Pause the timer"},
                    {name: "getRemainingTime()", description: "Get remaining time in seconds"}
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
                    {name: "text", type: "string", description: "Button text"},
                    {name: "width", type: "number", description: "Button width in pixels"},
                    {name: "height", type: "number", description: "Button height in pixels"},
                    {name: "backgroundColor", type: "color", description: "Background color"},
                    {name: "hoverColor", type: "color", description: "Color when hovered"},
                    {name: "pressedColor", type: "color", description: "Color when pressed"},
                    {name: "actionType", type: "string", description: "Action to perform (log, destroy, disable, enable, toggle, custom)"},
                    {name: "targetObjectName", type: "string", description: "Name of target object for actions"}
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
                    {name: "text", type: "string", description: "Text to display"},
                    {name: "fontSize", type: "number", description: "Font size in pixels"},
                    {name: "fontFamily", type: "string", description: "Font family"},
                    {name: "color", type: "color", description: "Text color"},
                    {name: "textAlign", type: "string", description: "Text alignment (left, center, right)"},
                    {name: "showBackground", type: "boolean", description: "Show background behind text"},
                    {name: "showOutline", type: "boolean", description: "Show text outline"},
                    {name: "showShadow", type: "boolean", description: "Show text shadow"}
                ],
                methods: [
                    {name: "setText(text)", description: "Set the text content"},
                    {name: "getText()", description: "Get the text content"}
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
                    {name: "emissionRate", type: "number", description: "Particles emitted per second"},
                    {name: "maxParticles", type: "number", description: "Maximum number of particles"},
                    {name: "particleLifetime", type: "number", description: "How long particles live"},
                    {name: "startSize", type: "number", description: "Initial particle size"},
                    {name: "endSize", type: "number", description: "Final particle size"},
                    {name: "startColor", type: "color", description: "Initial particle color"},
                    {name: "endColor", type: "color", description: "Final particle color"},
                    {name: "gravity", type: "number", description: "Gravity force applied to particles"},
                    {name: "emissionShape", type: "string", description: "Emission shape (point, circle, rectangle)"}
                ],
                methods: [
                    {name: "startEmission()", description: "Start emitting particles"},
                    {name: "stopEmission()", description: "Stop emitting particles"},
                    {name: "clearParticles()", description: "Remove all existing particles"}
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
                    {name: "audioAsset", type: "AssetReference", description: "Audio file to play"},
                    {name: "volume", type: "number", description: "Playback volume (0-1)"},
                    {name: "loop", type: "boolean", description: "Loop the audio"},
                    {name: "playRate", type: "number", description: "Playback speed (1.0 = normal)"},
                    {name: "autoplay", type: "boolean", description: "Automatically play when scene starts"},
                    {name: "spatialBlend", type: "number", description: "2D (0) vs 3D (1) sound blend"},
                    {name: "minDistance", type: "number", description: "Minimum distance for 3D audio"},
                    {name: "maxDistance", type: "number", description: "Maximum distance for 3D audio"}
                ],
                methods: [
                    {name: "play(options)", description: "Play the audio with optional parameters"},
                    {name: "stop()", description: "Stop audio playback"},
                    {name: "pause()", description: "Pause audio playback"},
                    {name: "resume()", description: "Resume playback from paused state"},
                    {name: "setVolume(value, fadeTime)", description: "Set volume with optional fade"}
                ]
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
                    {name: "triggerType", type: "string", description: "What causes the trigger (collision, key, mouse, timer)"},
                    {name: "triggerKey", type: "string", description: "Key that activates the trigger"},
                    {name: "actionType", type: "string", description: "Action to take (destroy, spawn, animate, toggle, message)"},
                    {name: "actionTarget", type: "string", description: "What object the action affects (self, other, byName)"},
                    {name: "targetName", type: "string", description: "Name of target object"},
                    {name: "cooldown", type: "number", description: "Cooldown between triggers (seconds)"}
                ],
                methods: [
                    {name: "tryTriggerAction(other)", description: "Manually trigger the action"},
                    {name: "executeAction(other)", description: "Execute the configured action"}
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
                    {name: "maxHealth", type: "number", description: "Maximum health"},
                    {name: "currentHealth", type: "number", description: "Current health"},
                    {name: "invulnerabilityTime", type: "number", description: "Invulnerability time after taking damage"},
                    {name: "showHealthBar", type: "boolean", description: "Whether health is displayed in game"},
                    {name: "healthBarColor", type: "color", description: "Color of health bar"}
                ],
                methods: [
                    {name: "applyDamage(amount, source)", description: "Apply damage to this object"},
                    {name: "heal(amount)", description: "Heal this object"},
                    {name: "die(source)", description: "Kill this object immediately"},
                    {name: "resetHealth()", description: "Reset health to maximum"}
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
                    {name: "followOwner", type: "boolean", description: "Whether camera follows this GameObject"},
                    {name: "followSpeed", type: "number", description: "How quickly the camera follows its target"},
                    {name: "zoom", type: "number", description: "Camera zoom level (1.0 = 100%)"},
                    {name: "positionDamping", type: "number", description: "Smoothness of camera movement (0-1)"},
                    {name: "zoomDamping", type: "number", description: "Smoothness of camera zoom (0-1)"},
                    {name: "offset", type: "Vector2", description: "Camera offset from this GameObject"}
                ],
                methods: [
                    {name: "jumpToTarget()", description: "Immediately move camera to target"},
                    {name: "moveTo(position, immediate)", description: "Move camera to specific position"},
                    {name: "setZoom(zoomLevel, immediate)", description: "Set camera zoom level"},
                    {name: "shake(intensity, duration)", description: "Apply camera shake effect"},
                    {name: "setBounds(x, y, width, height)", description: "Set camera bounds"}
                ]
            },

            KeyboardController: {
                description: "Keyboard-based movement and input with customizable controls",
                example: `const keyboard = gameObject.addModule(new KeyboardController());
keyboard.speed = 200;
keyboard.useAcceleration = true;
keyboard.upKey = "w";`,
                properties: [
                    {name: "speed", type: "number", description: "Movement speed in pixels per second"},
                    {name: "useAcceleration", type: "boolean", description: "Enable smooth acceleration/deceleration"},
                    {name: "acceleration", type: "number", description: "Acceleration rate (0-1)"},
                    {name: "moveMode", type: "string", description: "Movement style (direct, rotate-and-move)"},
                    {name: "upKey", type: "string", description: "Key for upward movement"},
                    {name: "downKey", type: "string", description: "Key for downward movement"},
                    {name: "leftKey", type: "string", description: "Key for leftward movement"},
                    {name: "rightKey", type: "string", description: "Key for rightward movement"}
                ],
                methods: [
                    {name: "resetControls()", description: "Reset all controls to default values"}
                ]
            },

            SimpleMovementController: {
                description: "Basic character movement controller for 2D games",
                example: `const movement = gameObject.addModule(new SimpleMovementController());
movement.speed = 200;
movement.usePhysics = false;
movement.controlScheme = "wasd";`,
                properties: [
                    {name: "speed", type: "number", description: "Movement speed in pixels per second"},
                    {name: "usePhysics", type: "boolean", description: "Use physics-based movement (requires RigidBody)"},
                    {name: "allowDiagonal", type: "boolean", description: "Enable diagonal movement"},
                    {name: "acceleration", type: "number", description: "Acceleration factor (1 = instant)"},
                    {name: "deceleration", type: "number", description: "Deceleration factor when no input"},
                    {name: "controlScheme", type: "string", description: "Input control scheme (arrows, wasd, both)"}
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
                    {name: "radius", type: "number", description: "Circle radius"},
                    {name: "offset", type: "Vector2", description: "Offset from center"},
                    {name: "color", type: "color", description: "Fill color"},
                    {name: "fill", type: "boolean", description: "Fill circle"},
                    {name: "outline", type: "boolean", description: "Show outline"},
                    {name: "outlineColor", type: "color", description: "Outline color"},
                    {name: "outlineWidth", type: "number", description: "Outline thickness"}
                ]
            },

            DrawRectangle: {
                description: "Draw a filled rectangle at the GameObject's position",
                example: `const rect = gameObject.addModule(new DrawRectangle());
rect.width = 100;
rect.height = 50;
rect.color = "#00ff00";`,
                properties: [
                    {name: "width", type: "number", description: "Rectangle width"},
                    {name: "height", type: "number", description: "Rectangle height"},
                    {name: "offset", type: "Vector2", description: "Offset from center"},
                    {name: "color", type: "color", description: "Fill color"},
                    {name: "fill", type: "boolean", description: "Fill rectangle"},
                    {name: "outline", type: "boolean", description: "Show outline"},
                    {name: "outlineColor", type: "color", description: "Outline color"},
                    {name: "outlineWidth", type: "number", description: "Outline thickness"}
                ]
            },

            DrawPolygon: {
                description: "Draw a filled polygon at the GameObject's position",
                example: `const poly = gameObject.addModule(new DrawPolygon());
poly.vertices = [new Vector2(0, -50), new Vector2(50, 50), new Vector2(-50, 50)];
poly.color = "#0000ff";`,
                properties: [
                    {name: "vertices", type: "Array<Vector2>", description: "Array of Vector2 points (min 3)"},
                    {name: "offset", type: "Vector2", description: "Offset from center"},
                    {name: "color", type: "color", description: "Fill color"},
                    {name: "fill", type: "boolean", description: "Fill polygon"},
                    {name: "outline", type: "boolean", description: "Show outline"},
                    {name: "outlineColor", type: "color", description: "Outline color"},
                    {name: "outlineWidth", type: "number", description: "Outline thickness"}
                ],
                methods: [
                    {name: "setVertex(index, value)", description: "Set a vertex at a specific index"},
                    {name: "addVertex(vertex, index)", description: "Add a new vertex to the polygon"},
                    {name: "removeVertex(index)", description: "Remove a vertex at the specified index"}
                ]
            }
        }
    },

    // Colliders Modules
    Colliders: {
        group: "Colliders",
        functions: {
            BoundingBoxCollider: {
                description: "Custom bounding box collision detection",
                example: `const collider = gameObject.addModule(new BoundingBoxCollider());
collider.width = 50;
collider.height = 50;
collider.isTrigger = false;`,
                properties: [
                    {name: "width", type: "number", description: "Width of the collider"},
                    {name: "height", type: "number", description: "Height of the collider"},
                    {name: "offset", type: "Vector2", description: "Offset from the GameObject center"},
                    {name: "showCollider", type: "boolean", description: "Whether to show the collider in the editor"},
                    {name: "isTrigger", type: "boolean", description: "Trigger colliders don't cause physics responses"}
                ]
            }
        }
    },

    // Matter.js Physics Modules
    "Matter.js": {
        group: "Physics",
        functions: {
            RigidBody: {
                description: "Physics component that adds a physical body to a GameObject",
                example: `const body = gameObject.addModule(new RigidBody());
body.bodyType = "dynamic";
body.density = 1;
body.setVelocity(new Vector2(0, -10));`,
                properties: [
                    {name: "bodyType", type: "string", description: "Body type (dynamic, static, kinematic)"},
                    {name: "shape", type: "string", description: "Body shape (rectangle, circle, polygon)"},
                    {name: "width", type: "number", description: "Width for rectangle shape"},
                    {name: "height", type: "number", description: "Height for rectangle shape"},
                    {name: "radius", type: "number", description: "Radius for circle shape"},
                    {name: "density", type: "number", description: "Density (mass = density * area)"},
                    {name: "friction", type: "number", description: "Friction coefficient"},
                    {name: "restitution", type: "number", description: "Bounciness (0 to 1)"},
                    {name: "fixedRotation", type: "boolean", description: "Prevent rotation"}
                ],
                methods: [
                    {name: "applyForce(force)", description: "Apply a force to the center of the body"},
                    {name: "applyImpulse(impulse)", description: "Apply an impulse to the center of the body"},
                    {name: "setVelocity(velocity)", description: "Set the linear velocity of the body"},
                    {name: "getVelocity()", description: "Get the current linear velocity"},
                    {name: "setAngularVelocity(angularVelocity)", description: "Set the angular velocity"},
                    {name: "getAngularVelocity()", description: "Get the current angular velocity"}
                ]
            },

            Collider: {
                description: "A sensor-only collider for detecting overlaps without physics response",
                example: `const collider = gameObject.addModule(new Collider());
collider.shape = "rectangle";
collider.width = 100;
collider.height = 100;`,
                properties: [
                    {name: "shape", type: "string", description: "Collider shape (rectangle, circle, polygon)"},
                    {name: "width", type: "number", description: "Width for rectangle"},
                    {name: "height", type: "number", description: "Height for rectangle"},
                    {name: "radius", type: "number", description: "Radius for circle"},
                    {name: "vertices", type: "Array", description: "Vertices for polygon"},
                    {name: "offset", type: "Vector2", description: "Offset from the game object's position"}
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
                    {name: "targetName", type: "string", description: "Name of target object to follow"},
                    {name: "followMode", type: "string", description: "Follow mode (smooth, instant, physics)"},
                    {name: "followSpeed", type: "number", description: "Speed of following"},
                    {name: "minDistance", type: "number", description: "Minimum distance to maintain"},
                    {name: "maxDistance", type: "number", description: "Maximum distance before following"},
                    {name: "offset", type: "Vector2", description: "Offset from target position"},
                    {name: "lookAtTarget", type: "boolean", description: "Rotate to face the target"}
                ],
                methods: [
                    {name: "setTarget(name)", description: "Set a new target by name"},
                    {name: "setTargetPosition(x, y)", description: "Set a fixed position to follow"}
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
                    {name: "prefabName", type: "string", description: "Name of object to spawn"},
                    {name: "spawnInterval", type: "number", description: "Time between spawns"},
                    {name: "maxSpawns", type: "number", description: "Maximum objects to spawn"},
                    {name: "spawnRadius", type: "number", description: "Random spawn radius"},
                    {name: "autoStart", type: "boolean", description: "Start spawning automatically"}
                ],
                methods: [
                    {name: "startSpawning()", description: "Start the spawning process"},
                    {name: "stopSpawning()", description: "Stop spawning"},
                    {name: "spawnNow()", description: "Spawn an object immediately"}
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
                    {name: "imageAsset", type: "AssetReference", description: "Sprite image to display"},
                    {name: "width", type: "number", description: "Width of the sprite in pixels"},
                    {name: "height", type: "number", description: "Height of the sprite in pixels"},
                    {name: "scaleMode", type: "string", description: "How the image should be scaled (stretch, fit, fill, tile, 9-slice)"},
                    {name: "color", type: "color", description: "Tint color for the sprite"},
                    {name: "flipX", type: "boolean", description: "Flip sprite horizontally"},
                    {name: "flipY", type: "boolean", description: "Flip sprite vertically"},
                    {name: "pivot", type: "Vector2", description: "Pivot point for rotation"}
                ],
                methods: [
                    {name: "setSprite(path)", description: "Set the sprite image by path"},
                    {name: "loadImage()", description: "Load the sprite image from asset reference"}
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
                    {name: "imageAsset", type: "AssetReference", description: "Sprite sheet image"},
                    {name: "columns", type: "number", description: "Number of columns in the sprite sheet"},
                    {name: "rows", type: "number", description: "Number of rows in the sprite sheet"},
                    {name: "currentColumn", type: "number", description: "Current column in the sprite sheet"},
                    {name: "currentRow", type: "number", description: "Current row in the sprite sheet"},
                    {name: "width", type: "number", description: "Display width in pixels"},
                    {name: "height", type: "number", description: "Display height in pixels"},
                    {name: "color", type: "color", description: "Tint color for the sprite"},
                    {name: "flipX", type: "boolean", description: "Flip sprite horizontally"},
                    {name: "flipY", type: "boolean", description: "Flip sprite vertically"}
                ],
                methods: [
                    {name: "setSprite(path)", description: "Set the sprite sheet image by path"},
                    {name: "setFrameByIndex(frameIndex)", description: "Navigate to a specific frame by index"},
                    {name: "getCurrentFrameIndex()", description: "Get the current frame index"}
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
                params: [{name: "name", type: "string", description: "Name of the new object"}],
                returns: {type: "GameObject", description: "The created GameObject"}
            },

            findGameObject: {
                description: "Find a GameObject by name",
                example: `const player = scene.findGameObject("Player");
if(player) player.setActive(true);`,
                params: [{name: "name", type: "string", description: "Name to search for"}],
                returns: {type: "GameObject|null", description: "The found GameObject or null"}
            },

            findGameObjectByName: {
                description: "Find a GameObject by name (alias for findGameObject)",
                example: `const enemy = scene.findGameObjectByName("Enemy");
if(enemy) enemy.destroy();`,
                params: [{name: "name", type: "string", description: "Name to search for"}],
                returns: {type: "GameObject|null", description: "The found GameObject or null"}
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
                params: [{name: "scene", type: "Scene", description: "Scene to load"}]
            },

            start: {
                description: "Start the game engine",
                example: `engine.start();`,
                returns: {type: "Promise", description: "Promise that resolves when engine starts"}
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
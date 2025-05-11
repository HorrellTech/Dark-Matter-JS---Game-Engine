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

            mousePosition: {
                description: "Get the current mouse position in world coordinates",
                example: `const mousePos = window.input.mousePosition;
gameObject.lookAt(mousePos);`,
                returns: {type: "Vector2", description: "Mouse position in world space"}
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

    // Module System
    Modules: {
        group: "Components",
        functions: {
            RigidBody: {
                description: "Add physics behavior to a GameObject",
                example: `const body = gameObject.addModule(new RigidBody());
body.setVelocity(new Vector2(0, -10)); // Apply gravity`,
                properties: [
                    {name: "mass", type: "number", description: "Mass of the body"},
                    {name: "isStatic", type: "boolean", description: "If true, body is immovable"}
                ]
            },

            SpriteRenderer: {
                description: "Render sprites and animations",
                example: `const renderer = gameObject.addModule(new SpriteRenderer());
renderer.setSprite("assets/player.png");
renderer.setAnimation("walk", [0, 1, 2, 3], 0.1);`,
                properties: [
                    {name: "sprite", type: "string", description: "Path to sprite image"},
                    {name: "flipX", type: "boolean", description: "Flip sprite horizontally"}
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
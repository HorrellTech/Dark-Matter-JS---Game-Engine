/**
 * Module - Base class for all game object modules
 * 
 * Modules can be attached to GameObjects to extend their functionality.
 * Each module goes through a specific lifecycle and can override methods
 * to implement custom behavior at different stages.
 * 
 * Lifecycle:
 * 1. preload - Called before the game starts, used for loading assets
 * 2. start - Called once when the module is first activated
 * 3. beginLoop - Called at the start of each frame
 * 4. loop - Called every frame (main update logic)
 * 5. endLoop - Called at the end of each frame
 * 6. draw - Called when the module should render
 * 7. onDestroy - Called when the module is being destroyed
 * 
 * 
 * NOTE: If you want to draw to a position relative to the viewport, you need to make sure
 * to set the gameObject's position to (0, 0) inside the module's loop method, to prevent any offset.
 * 
 * 
  ICON URL ADDITION(for module icon)
 class MyCustomModule extends Module {
    static iconUrl = 'path/to/icon.png';
    
    constructor() {
        super("MyCustomModule");
        // Module code
    }
}

class MyCustomModule extends Module {
    static iconClass = 'fa-star'; // Just the icon name
    // OR
    static iconClass = 'fas fa-star'; // Full class
    
    constructor() {
        super("MyCustomModule");
        // Module code
    }
}
 */
class Module {
    static allowMultiple = true; // Allow multiple instances of this module type
    static drawInEditor = true; // Whether this module should be drawn in the editor
    static namespace = "Core"; // Namespace for module categorization
    static description = "Base module class for game objects"; // Description of the module
    static iconClass = "fas fa-cube"; // Default icon class for the module

    /**
     * Create a new Module
     * @param {string} name - The name of this module instance
     */
    constructor(name = "Module") {
        this.type = this.constructor.name; // Module type

        /** @type {string} Name of the module */
        this.name = name;

        /** @type {GameObject} GameObject this module is attached to */
        this.gameObject = null;

        /** @type {boolean} Whether this module is active */
        this.enabled = true;

        this.ignoreGameObjectTransform = false; // If true, this module will not be affected by the gameObject's transform

        /** @type {Object} Custom properties for this module */
        this.properties = {};

        /** @type {Array<string>} Required modules for this module */
        this._requirements = [];
    }

    /**
     * Called before the game starts, used for loading assets
     * Override this to load resources needed by your module
     * @returns {Promise<void>}
     */
    async preload() {
        // Override in subclass to implement custom loading behavior
    }

    /**
     * Called once when the module is first activated
     * Use this for initialization logic
     */
    start() {
        // Override in subclass but provide safety
        if (!this.gameObject) {
            console.warn(`Module ${this.name} has no gameObject reference during start()`);
        }
    }

    /**
     * Called at the start of each frame
     * Useful for pre-update operations
     */
    beginLoop() {
        // Override in subclass to implement early frame behavior
    }

    /**
     * Called every frame (main update logic)
     * Use this for your main logic
     * @param {number} deltaTime - Time in seconds since the last frame
     */
    loop(deltaTime) {
        // Override in subclass but provide safety
        if (!this.gameObject) {
            console.warn(`Module ${this.name} has no gameObject reference during loop()`);
            this.enabled = false; // Disable to prevent further errors
        }
    }

    /**
     * Called at the end of each frame
     * Useful for post-update operations
     */
    endLoop() {
        // Override in subclass to implement late frame behavior  
    }

    /**
     * Called when the module should render
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
     */
    draw(ctx) {
        // Override in subclass to implement rendering behavior
    }

    /**
     * Called when the module is being destroyed
     * Use this to clean up resources
     */
    onDestroy() {
        // Override in subclass to implement cleanup behavior
    }

    /**
     * Called when the module is attached to a GameObject
     * @param {GameObject} gameObject - The GameObject this module is attached to
     */
    onAttach(gameObject) {
        // This is called when the module is added to a GameObject
        // Override in subclasses if needed
    }

    onEnable() {
        // Called when the module is enabled
        // Override in subclasses if needed
    }

    onDisable() {
        // Called when the module is disabled
        // Override in subclasses if needed
    }

    /**
     * Define required modules for this module
     * Modules listed here will be automatically added before this module
     * @param {...string} moduleNames - List of module names required by this module
     */
    requires(...moduleNames) {
        if (!this._requirements) {
            this._requirements = [];
        }
        this._requirements.push(...moduleNames);
        return this;
    }

    /**
     * Get all required modules for this module
     * @returns {Array<string>} Array of required module names
     */
    getRequirements() {
        return this._requirements || [];
    }

    /**
     * Get the world position of the attached GameObject
     * @returns {Vector2} World position 
     */
    getWorldPosition() {
        return this.gameObject ? this.gameObject.getWorldPosition() : new Vector2();
    }

    /**
     * Get the local position of the attached GameObject
     * @returns {Vector2} Local position
     */
    getLocalPosition() {
        return this.gameObject ? this.gameObject.position : new Vector2();
    }

    /**
     * Set the local position of the attached GameObject
     * @param {Vector2} position - New local position
     */
    setLocalPosition(position) {
        if (this.gameObject) {
            this.gameObject.position = position;
        }
    }

    set gameObject(go) {
        this._gameObject = go;

        // When a module's gameObject reference changes, we need to update
        // all internal properties that might reference the old gameObject
        if (go && this._previousGameObject && this._previousGameObject !== go) {
            this._updateInternalReferences(this._previousGameObject, go);
        }

        this._previousGameObject = go;
    }

    get gameObject() {
        return this._gameObject;
    }

    /**
     * Clone this module instance
     * @returns {Module} A new instance of this module with the same properties
     */
    clone(newGameObject = null) {
        // 1) create a fresh instance
        const cloned = new this.constructor(this.name);

        // Deep copy image asset and embedded image data
        if (this._image && this._isImageLoaded) {
            // If image is embedded, copy the data URL
            cloned._image = this._image;
            cloned._isImageLoaded = true;
            cloned._imageWidth = this._imageWidth;
            cloned._imageHeight = this._imageHeight;

            if (this.imageAsset && this.imageAsset.embedded) {
                cloned.imageAsset = {
                    path: null,
                    type: 'image',
                    embedded: true,
                    load: () => Promise.resolve(this._image)
                };
            } else if (this.imageAsset) {
                // Copy asset reference
                cloned.imageAsset = { ...this.imageAsset };
            }
        }

        // 2) copy all your own data except any gameObject pointers
        const keys = new Set([
            ...Object.getOwnPropertyNames(this),
            ...Object.keys(this)
        ]);
        keys.delete('gameObject');
        keys.delete('_gameObject');
        keys.delete('_previousGameObject');
        keys.delete('constructor');

        for (const key of keys) {
            const v = this[key];
            if (v == null || typeof v === 'function') {
                cloned[key] = v;
            }
            else if (Array.isArray(v)) {
                cloned[key] = v.map(item =>
                    (item && typeof item.clone === 'function')
                        ? item.clone()
                        : item
                );
            }
            else if (typeof v.clone === 'function') {
                cloned[key] = v.clone();
            }
            else if (typeof v === 'object') {
                cloned[key] = JSON.parse(JSON.stringify(v));
            }
            else {
                cloned[key] = v;
            }
        }

        // 3) reset any stale pointers
        cloned._gameObject = null;
        cloned._previousGameObject = null;

        // 4) if caller supplied an owner, bind now
        if (newGameObject) {
            cloned.attachTo(newGameObject);
        }

        return cloned;
    }

    /**
     * Helper: Deep clone an array
     * @private
     */
    deepCloneArray(arr) {
        if (!arr) return arr;

        return arr.map(item => {
            if (item === null || item === undefined || typeof item !== 'object') {
                return item;
            }
            else if (typeof item.clone === 'function') {
                return item.clone();
            }
            else if (Array.isArray(item)) {
                return this.deepCloneArray(item);
            }
            else if (!(item instanceof HTMLElement)) {
                return this.deepCloneObject(item);
            }
            return item;
        });
    }

    /**
     * Helper: Deep clone an object
     * @private
     */
    deepCloneObject(obj) {
        if (!obj) return obj;
        if (typeof obj.clone === 'function') return obj.clone();
        if (obj instanceof HTMLElement) return obj;

        const clone = Object.create(Object.getPrototypeOf(obj));

        for (const key in obj) {
            if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

            const value = obj[key];

            if (value === null || value === undefined || typeof value !== 'object') {
                clone[key] = value;
            }
            else if (typeof value.clone === 'function') {
                clone[key] = value.clone();
            }
            else if (Array.isArray(value)) {
                clone[key] = this.deepCloneArray(value);
            }
            else if (!(value instanceof HTMLElement)) {
                clone[key] = this.deepCloneObject(value);
            }
            else {
                clone[key] = value;
            }
        }

        return clone;
    }

    /**
     * Register a module class to be available in the Add Module dropdown
     * @param {Class} moduleClass - The module class to register
     */
    registerModuleClass(moduleClass) {
        if (!moduleClass || !(moduleClass.prototype instanceof Module)) {
            console.error('Not a valid module class:', moduleClass);
            return;
        }

        // Check if already registered
        const alreadyRegistered = this.availableModules.some(mod =>
            mod.name === moduleClass.name || mod === moduleClass);

        if (!alreadyRegistered) {
            this.availableModules.push(moduleClass);
            console.log(`Registered module: ${moduleClass.name}`);

            // Update the dropdown if it's open
            if (this.moduleDropdown &&
                this.moduleDropdown.style.display !== 'none') {
                this.populateModuleDropdown();
            }
        }
    }

    /**
     * Get the list of exposed properties that should be editable in the Inspector
     * @returns {Array<Object>} Array of property descriptors
     */
    getExposedProperties() {
        // Start with properties explicitly marked as exposed
        let exposed = this.exposedProperties || [];

        // Also include any properties in this.properties object
        for (const key in this.properties) {
            if (!exposed.some(prop => prop.name === key)) {
                exposed.push({
                    name: key,
                    type: typeof this.properties[key],
                    value: this.properties[key]
                });
            }
        }

        return exposed;
    }

    /**
     * Register a property to be exposed in the Inspector
     * @param {string} name - Property name
     * @param {string} type - Property type (string, number, boolean, etc.)
     * @param {any} defaultValue - Default value
     * @param {Object} options - Additional options (min, max, step, etc.)
     */
    exposeProperty(name, type, defaultValue, options = {}) {
        if (!this.exposedProperties) {
            this.exposedProperties = [];
        }

        this.exposedProperties.push({
            name,
            type,
            value: defaultValue,
            options
        });

        // Store the value in a private property with a different name
        // to avoid conflicts with getters/setters
        const privatePropName = `_${name}`;

        // Initialize the private property with the default value or current value
        if (this[privatePropName] === undefined) {
            this[privatePropName] = this[name] !== undefined ? this[name] : defaultValue;
        }

        // Create property accessor that uses the private property
        if (!Object.getOwnPropertyDescriptor(this, name)) {
            Object.defineProperty(this, name, {
                get: function () {
                    return this[privatePropName];
                },
                set: function (value) {
                    const oldValue = this[privatePropName];
                    this[privatePropName] = value;

                    // Call onChange handler if specified
                    const propDef = this.exposedProperties?.find(p => p.name === name);
                    if (propDef?.options?.onChange && oldValue !== value) {
                        propDef.options.onChange.call(this, value);
                    }
                },
                enumerable: true,
                configurable: true
            });
        }

        // Ensure the initial value is set properly
        if (this[name] !== this[privatePropName]) {
            this[name] = this[privatePropName];
        }
    }

    /**
     * Enable this module
     */
    enable() {
        this.enabled = true;
        this.onEnable();
    }

    /**
     * Disable this module
     */
    disable() {
        this.enabled = false;
        this.onDisable();
    }

    /**
     * Toggle this module's enabled state
     */
    toggle() {
        this.enabled = !this.enabled;

        if (this.enabled) {
            this.onEnable();
        } else {
            this.onDisable();
        }
    }

    /**
     * Get a module from the parent GameObject by type/class
     * @param {class} moduleType - The class/type of module to find
     * @returns {Module} The found module or null
     */
    getModule(moduleType) {
        if (!this.gameObject) return null;

        return this.gameObject.modules.find(module => module instanceof moduleType);
    }

    /**
     * Set a property value
     * @param {string} name - Property name
     * @param {any} value - New value
     */
    setProperty(name, value) {
        const privatePropName = `_${name}`;

        if (this.hasOwnProperty(privatePropName)) {
            // If we have a private property, use it
            this[privatePropName] = value;
        } else {
            // Otherwise set directly
            this[name] = value;
        }

        // Call onChange handler if specified in property options
        const propDef = this.exposedProperties?.find(p => p.name === name);
        if (propDef?.options?.onChange) {
            propDef.options.onChange.call(this, value);
        }
    }

    /**
     * Get a property value
     * @param {string} key - Property name
     * @param {any} defaultValue - Default value if property doesn't exist
     * @returns {any} The property value or default value
     */
    getProperty(name, defaultValue) {
        const privatePropName = `_${name}`;

        if (this.hasOwnProperty(privatePropName)) {
            // If we have a private property, use it
            return this[privatePropName];
        }

        // Otherwise get directly
        return this[name] !== undefined ? this[name] : defaultValue;
    }

    /**
     * Reassign this module to a new GameObject,
     * update internal refs and call onAttach.
     * @param {GameObject} newGameObject
     */
    attachTo(newGameObject) {
        // clear any stale pointer
        this._previousGameObject = null;
        // set the new owner
        this._gameObject = newGameObject;   // calls our setter
        // keep _previousGameObject in sync
        this._previousGameObject = newGameObject;

        if (typeof this.onAttach === 'function') {
            this.onAttach(newGameObject);
        }
    }

    /**
     * Serialize this module to JSON
     * @returns {Object} Serialized module data
     */
    toJSON() {
        // Basic module data
        const data = {
            name: this.name,
            type: this.constructor.name,
            enabled: this.enabled,
            requirements: this._requirements
        };

        // Serialize regular properties object
        data.properties = { ...this.properties };

        // Serialize exposed properties (both from exposedProperties and custom getters/setters)
        data.exposedValues = {};

        // Handle properties registered via exposeProperty
        if (Array.isArray(this.exposedProperties)) {
            for (const prop of this.exposedProperties) {
                const propName = prop.name;
                // Get the current value using our getter
                const value = this[propName];

                // Only serialize non-undefined values
                if (value !== undefined) {
                    // Special handling for objects that have their own toJSON method
                    if (value && typeof value === 'object' && typeof value.toJSON === 'function') {
                        data.exposedValues[propName] = value.toJSON();
                    } else if (value instanceof Vector2) {
                        // Special case for Vector2 objects
                        data.exposedValues[propName] = { x: value.x, y: value.y };
                    } else {
                        // For primitive values and regular objects
                        data.exposedValues[propName] = value;
                    }
                }
            }
        }

        // Allow subclasses to add their own serialization
        if (typeof this._serializeCustomData === 'function') {
            const customData = this._serializeCustomData();
            if (customData && typeof customData === 'object') {
                data.customData = customData;
            }
        }

        return data;
    }

    /**
     * Deserialize from JSON data
     * @param {Object} json - Serialized module data 
     */
    fromJSON(json) {
        if (!json) return this;

        // Restore basic properties
        this.name = json.name || this.name;
        this.enabled = json.enabled !== undefined ? json.enabled : this.enabled;
        this._requirements = json.requirements || this._requirements || [];

        // Restore regular properties object
        this.properties = json.properties || {};

        // Restore exposed property values
        if (json.exposedValues) {
            for (const propName in json.exposedValues) {
                const value = json.exposedValues[propName];

                // Handle Vector2 values
                if (value && typeof value === 'object' &&
                    'x' in value && 'y' in value &&
                    typeof this[propName] === 'object' &&
                    this[propName] instanceof Vector2) {
                    this[propName].x = value.x;
                    this[propName].y = value.y;
                }
                // Handle objects with fromJSON method
                else if (this[propName] &&
                    typeof this[propName] === 'object' &&
                    typeof this[propName].fromJSON === 'function' &&
                    value) {
                    this[propName].fromJSON(value);
                }
                // Regular values
                else {
                    // Use setProperty if available, otherwise set directly
                    if (typeof this.setProperty === 'function') {
                        this.setProperty(propName, value);
                    } else {
                        this[propName] = value;
                    }
                }
            }
        }

        // Allow subclasses to handle custom data
        if (json.customData && typeof this._deserializeCustomData === 'function') {
            this._deserializeCustomData(json.customData);
        }

        return this;
    }

    /**
     * Update all internal references to the old gameObject with the new one
     * @param {GameObject} oldGO - The old GameObject reference
     * @param {GameObject} newGO - The new GameObject reference
     */
    _updateInternalReferences(oldGO, newGO) {
        if (!oldGO || !newGO || oldGO === newGO) return;

        // Recursively scan all properties
        const scanObject = (obj) => {
            if (!obj || typeof obj !== 'object') return;

            // Skip DOM elements and functions
            if (obj instanceof HTMLElement) return;

            // Use a WeakSet to track visited objects to avoid circular references
            const visited = new WeakSet();

            const traverse = (o) => {
                if (!o || typeof o !== 'object' || visited.has(o)) return;
                visited.add(o);

                // Check all enumerable properties of the object
                for (const key in o) {
                    try {
                        const value = o[key];

                        // If the value is the old GameObject, replace it with the new one
                        if (value === oldGO) {
                            o[key] = newGO;
                            continue;
                        }

                        // Recursively traverse objects and arrays
                        if (value && typeof value === 'object' && !visited.has(value)) {
                            traverse(value);
                        }
                    } catch (err) {
                        // Some properties may not be accessible, just skip them
                    }
                }

                // Check non-enumerable properties as well (for properties defined with Object.defineProperty)
                const propNames = Object.getOwnPropertyNames(o);
                for (const propName of propNames) {
                    try {
                        if (propName === 'constructor' || propName === 'prototype' || propName === '__proto__') {
                            continue;
                        }

                        const desc = Object.getOwnPropertyDescriptor(o, propName);
                        if (desc && desc.get && !desc.configurable) {
                            // We can't modify non-configurable getters/setters
                            continue;
                        }

                        const value = o[propName];
                        if (value === oldGO) {
                            o[propName] = newGO;
                            continue;
                        }

                        if (value && typeof value === 'object' && !visited.has(value)) {
                            traverse(value);
                        }
                    } catch (err) {
                        // Some properties may not be accessible, just skip them
                    }
                }
            };

            traverse(obj);
        };

        // Check own properties first
        for (const key in this) {
            if (key !== 'gameObject' && key !== '_gameObject' && key !== '_previousGameObject') {
                const value = this[key];
                if (value === oldGO) {
                    this[key] = newGO;
                } else if (value && typeof value === 'object') {
                    scanObject(value);
                }
            }
        }
    }

    /**
     * Override in subclasses to serialize additional module-specific data
     * @protected
     * @returns {Object|null} Custom serialized data
     */
    _serializeCustomData() {
        return null; // Default implementation
    }

    /**
     * Override in subclasses to deserialize module-specific data
     * @protected
     * @param {Object} data - Custom data to deserialize
     */
    _deserializeCustomData(data) {
        // Default implementation does nothing
    }
}

// Make the Module class available globally
window.Module = Module;
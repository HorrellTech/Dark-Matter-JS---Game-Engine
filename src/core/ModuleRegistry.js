/**
 * ModuleRegistry - Central registry for all module types available in the engine
 * Used for tracking available modules across the editor
 */
class ModuleRegistry {
    constructor() {
        this.modules = new Map();
        this.listeners = [];
    }

    /**
     * Register a module class with the registry
     * @param {Class} moduleClass - The module class to register
     * @returns {boolean} True if successfully registered
     */
    register(moduleClass) {
        if (!moduleClass || !(moduleClass.prototype instanceof Module)) {
            console.error('Cannot register invalid module class:', moduleClass);
            return false;
        }

        // Skip if already registered
        if (this.modules.has(moduleClass.name)) {
            return false;
        }

        // Register the module
        this.modules.set(moduleClass.name, moduleClass);
        console.log(`Registered module: ${moduleClass.name}`);
        
        // Notify listeners
        this.notifyListeners('register', moduleClass);
        return true;
    }

    /**
     * Unregister a module class
     * @param {string|Class} moduleNameOrClass - Module name or class to unregister
     * @returns {boolean} True if successfully unregistered
     */
    unregister(moduleNameOrClass) {
        const moduleName = typeof moduleNameOrClass === 'string' 
            ? moduleNameOrClass 
            : moduleNameOrClass.name;
        
        const moduleClass = this.modules.get(moduleName);
        if (!moduleClass) {
            return false;
        }
        
        this.modules.delete(moduleName);
        console.log(`Unregistered module: ${moduleName}`);
        
        // Notify listeners
        this.notifyListeners('unregister', moduleClass);
        return true;
    }

    /**
     * Get a module class by name
     * @param {string} name - Name of the module class
     * @returns {Class|null} The module class, or null if not found
     */
    getModuleClass(name) {
        return this.modules.get(name) || null;
    }

    /**
     * Get all registered module classes
     * @returns {Array<Class>} Array of module classes
     */
    getAllModules() {
        return Array.from(this.modules.values());
    }

    /**
     * Add a listener for registry events
     * @param {Function} callback - Callback function(event, moduleClass)
     */
    addListener(callback) {
        if (typeof callback === 'function' && !this.listeners.includes(callback)) {
            this.listeners.push(callback);
        }
    }

    /**
     * Remove a listener
     * @param {Function} callback - The callback to remove
     */
    removeListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index !== -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * Notify all listeners of an event
     * @param {string} eventName - Name of the event ('register', 'unregister')
     * @param {Class} moduleClass - The module class involved
     */
    notifyListeners(eventName, moduleClass) {
        this.listeners.forEach(callback => {
            try {
                callback(eventName, moduleClass);
            } catch (error) {
                console.error('Error in module registry listener:', error);
            }
        });
    }
}

// Create and export the global registry
window.moduleRegistry = new ModuleRegistry();
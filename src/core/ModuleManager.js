/**
 * ModulesManager - Handles registration and initialization of modules
 */
class ModulesManager {
    constructor() {
        this.loadedModules = new Map();
        
        // Define core modules that should always be available
        this.coreModules = [
            'NullModule'
            //'BabylonRenderer'
        ];
    }

    /**
     * Initialize all core modules
     */
    initializeCoreModules() {
        console.log("Initializing core modules...");
        
        // Ensure moduleRegistry exists
        if (!window.moduleRegistry) {
            console.error("ModuleRegistry not found, modules cannot be loaded");
            return;
        }
        
        // Load core modules
        for (const moduleName of this.coreModules) {
            // Check if module constructor exists in window
            if (window[moduleName]) {
                //console.log(`Registering core module: ${moduleName}`);
                window.moduleRegistry.register(window[moduleName]);
                this.loadedModules.set(moduleName, window[moduleName]);
            } else {
                //console.error(`Core module not found: ${moduleName}`);
            }
        }
        
        //console.log("Core modules initialized");
    }

    /**
     * Get available modules for adding to GameObjects
     * @returns {Array} Array of module names
     */
    getAvailableModules() {
        return Array.from(this.loadedModules.keys());
    }
    
    /**
     * Create a new instance of a module
     * @param {string} moduleName - The name of the module to create
     * @returns {Module|null} The created module or null if not found
     */
    createModule(moduleName) {
        const ModuleClass = this.loadedModules.get(moduleName);
        
        if (ModuleClass) {
            try {
                return new ModuleClass();
            } catch (error) {
                console.error(`Error creating module ${moduleName}:`, error);
                return null;
            }
        }
        
        return null;
    }
}

// Make the ModulesManager available globally
window.modulesManager = new ModulesManager();
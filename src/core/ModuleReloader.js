/**
 * ModuleReloader - Handles dynamic reloading of modules without requiring browser refresh
 */
class ModuleReloader {
    constructor() {
        this.moduleRegistry = window.moduleRegistry || null;
        this.scriptCache = new Map(); // Store the latest script content
    }

    /**
     * Reload a specific module class from its script content
     * @param {string} className - The module class name
     * @param {string} scriptContent - The script content
     * @returns {boolean} Success status
     */
    reloadModuleClass(className, scriptContent) {
        try {
            // Cache the script content
            this.scriptCache.set(className, scriptContent);
            
            // Create a new function to evaluate the script in the global scope
            const scriptFunction = new Function(`
                try {
                    ${scriptContent}
                    return ${className};
                } catch (error) {
                    console.error("Error evaluating module script:", error);
                    return null;
                }
            `);
            
            // Execute the script to get the class
            const ModuleClass = scriptFunction();
            
            if (!ModuleClass) {
                console.error(`Failed to reload module ${className}: Script did not return a class`);
                return false;
            }
            
            // Register the class globally
            window[className] = ModuleClass;
            
            // Register with moduleRegistry if available
            if (this.moduleRegistry) {
                this.moduleRegistry.register(ModuleClass);
            } else {
                console.warn("ModuleRegistry not available, could not register updated module");
            }
            
            console.log(`Successfully reloaded module: ${className}`);
            return true;
        } catch (error) {
            console.error(`Error reloading module ${className}:`, error);
            return false;
        }
    }
    
    /**
     * Update all instances of a module type with new class implementation
     * @param {string} className - Module class name to update
     * @param {Array<GameObject>} gameObjects - Array of GameObjects to search through
     * @returns {number} Number of module instances updated
     */
    updateModuleInstances(className, gameObjects) {
        let updatedCount = 0;
        
        const ModuleClass = window[className];
        if (!ModuleClass) {
            console.error(`Cannot update instances of ${className}: Class not found`);
            return 0;
        }
        
        // Helper function to traverse the game object hierarchy
        const traverseAndUpdate = (objects) => {
            objects.forEach(obj => {
                // Find matching modules
                obj.modules.forEach((module, index) => {
                    if (module.constructor.name === className) {
                        // Store the module's current properties
                        const oldProps = {};
                        Object.keys(module).forEach(key => {
                            if (key !== 'constructor' && typeof module[key] !== 'function') {
                                oldProps[key] = module[key];
                            }
                        });
                        
                        // Create a new module instance
                        const newModule = new ModuleClass();
                        
                        // Copy over important references and properties
                        newModule.gameObject = obj;
                        newModule.enabled = module.enabled;
                        newModule.id = module.id; // Keep the same ID
                        
                        // Copy over all other properties from old module
                        Object.keys(oldProps).forEach(key => {
                            if (key !== 'gameObject' && key !== 'constructor') {
                                newModule[key] = oldProps[key];
                            }
                        });
                        
                        // Replace the module in the object's modules array
                        obj.modules[index] = newModule;
                        updatedCount++;
                    }
                });
                
                // Recursively process children
                if (obj.children && obj.children.length > 0) {
                    traverseAndUpdate(obj.children);
                }
            });
        };
        
        traverseAndUpdate(gameObjects);
        return updatedCount;
    }
}

// Create global instance
window.moduleReloader = new ModuleReloader();
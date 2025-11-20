/**
 * ModuleReloader - Handles dynamic reloading of modules without requiring browser refresh
 */
class ModuleReloader {
    constructor() {
        this.moduleRegistry = window.moduleRegistry || null;
        this.scriptCache = new Map(); // Store the latest script content
    }

    /**
     * Deep clone a value, handling special cases like Vector2, Vector3, etc.
     */
    deepCloneValue(value) {
        if (value === null || value === undefined) {
            return value;
        }

        // Handle primitives
        if (typeof value !== 'object') {
            return value;
        }

        // Handle Date
        if (value instanceof Date) {
            return new Date(value.getTime());
        }

        // Handle Vector2
        if (value.constructor && value.constructor.name === 'Vector2') {
            return new Vector2(value.x, value.y);
        }

        // Handle Vector3
        if (value.constructor && value.constructor.name === 'Vector3') {
            return new Vector3(value.x, value.y, value.z);
        }

        // Handle Arrays
        if (Array.isArray(value)) {
            return value.map(item => this.deepCloneValue(item));
        }

        // Handle plain objects
        if (value.constructor === Object || !value.constructor) {
            const cloned = {};
            for (const key in value) {
                if (value.hasOwnProperty(key)) {
                    cloned[key] = this.deepCloneValue(value[key]);
                }
            }
            return cloned;
        }

        // For other objects (like GameObjects, custom classes), return the reference
        // We don't want to clone these
        return value;
    }

    /**
     * Reload a specific module class from its script content
     * @param {string} className - The module class name
     * @param {string} scriptContent - The script content
     * @returns {boolean} Success status
     */
    reloadModuleClass(className, scriptContent) {
        try {
            if(className === 'EditorWindow' || className.endsWith('EditorWindow')) {
                //console.warn('EditorWindow classes should not be reloaded as modules:', className);
                return false;
            }
            // Cache the script content
            this.scriptCache.set(className, scriptContent);

            // Check for ES module syntax
            if (/^\s*(import|export)\s/m.test(scriptContent)) {
                console.error(`Module script for ${className} contains ES module syntax (import/export). Cannot reload dynamically.`);
                return false;
            }

            // Wrap in IIFE to avoid leaking variables
            const wrappedScript = `
            try {
                (function() {
                    ${scriptContent}
                })();
                return ${className};
            } catch (error) {
                console.error("Error evaluating module script:", error);
                return null;
            }
        `;

            // Create a new function to evaluate the script in the global scope
            const scriptFunction = new Function(wrappedScript);

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

            console.log(`✅ Successfully reloaded module class: ${className}`);
            return true;
        } catch (error) {
            console.error(`❌ Error reloading module ${className}:`, error);
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
            console.error(`❌ Cannot update instances of ${className}: Class not found`);
            return 0;
        }

        console.log(`🔄 Starting module instance update for: ${className}`);

        // Helper function to traverse the game object hierarchy
        const traverseAndUpdate = (objects) => {
            objects.forEach(obj => {
                // Find matching modules
                for (let index = 0; index < obj.modules.length; index++) {
                    const module = obj.modules[index];
                    
                    if (module.constructor.name === className) {
                        console.log(`🔄 Replacing module ${className} on GameObject: ${obj.name} (ID: ${obj.id})`);
                        
                        // STEP 1: Extract current property values (exposed properties)
                        const savedProperties = new Map();
                        
                        // Get exposed properties if available
                        if (module.exposedProperties && Array.isArray(module.exposedProperties)) {
                            module.exposedProperties.forEach(prop => {
                                const propName = prop.name;
                                let value;
                                
                                // Try to get the value using various methods
                                if (typeof module.getProperty === 'function') {
                                    value = module.getProperty(propName);
                                } else if (module.hasOwnProperty(`_${propName}`)) {
                                    value = module[`_${propName}`];
                                } else if (module.hasOwnProperty(propName)) {
                                    value = module[propName];
                                }
                                
                                // Deep clone the value to avoid reference issues
                                savedProperties.set(propName, this.deepCloneValue(value));
                                console.log(`  📦 Saved property: ${propName} =`, value);
                            });
                        }
                        
                        // Also save any properties object
                        if (module.properties && typeof module.properties === 'object') {
                            Object.keys(module.properties).forEach(key => {
                                if (!savedProperties.has(key)) {
                                    savedProperties.set(key, this.deepCloneValue(module.properties[key]));
                                    console.log(`  📦 Saved properties.${key} =`, module.properties[key]);
                                }
                            });
                        }

                        // Save critical state
                        const savedState = {
                            id: module.id,
                            enabled: module.enabled,
                            type: module.type || className,
                            name: module.name
                        };

                        // STEP 2: Call onDestroy on the old module
                        if (typeof module.onDestroy === 'function') {
                            try {
                                module.onDestroy();
                                console.log(`  ✅ Called onDestroy on old ${className}`);
                            } catch (error) {
                                console.error(`  ❌ Error calling onDestroy:`, error);
                            }
                        }

                        // STEP 3: Create a new module instance
                        const newModule = new ModuleClass();
                        console.log(`  🆕 Created new instance of ${className}`);

                        // STEP 4: Set the gameObject reference FIRST (critical!)
                        newModule.gameObject = obj;
                        
                        // STEP 5: Restore saved state
                        newModule.id = savedState.id;
                        newModule.enabled = savedState.enabled;
                        newModule.type = savedState.type;
                        if (savedState.name) {
                            newModule.name = savedState.name;
                        }

                        // STEP 6: Replace the module in the array BEFORE setting properties
                        // This ensures that any code that looks up the module will find the new one
                        obj.modules[index] = newModule;
                        console.log(`  🔄 Replaced module in GameObject.modules array`);

                        // STEP 7: Call awake on the new module to initialize defaults
                        if (typeof newModule.awake === 'function') {
                            try {
                                newModule.awake();
                                console.log(`  ✅ Called awake on new ${className}`);
                            } catch (error) {
                                console.error(`  ❌ Error calling awake:`, error);
                            }
                        }

                        // STEP 8: Restore saved property values (AFTER awake, so defaults are set first)
                        savedProperties.forEach((value, propName) => {
                            try {
                                // Use setProperty if available
                                if (typeof newModule.setProperty === 'function') {
                                    newModule.setProperty(propName, value);
                                    console.log(`  ✅ Restored ${propName} via setProperty`);
                                }
                                // Try private property
                                else if (newModule.hasOwnProperty(`_${propName}`)) {
                                    newModule[`_${propName}`] = value;
                                    console.log(`  ✅ Restored _${propName}`);
                                }
                                // Direct assignment
                                else {
                                    newModule[propName] = value;
                                    console.log(`  ✅ Restored ${propName} directly`);
                                }
                                
                                // Also update properties object if it exists
                                if (newModule.properties && typeof newModule.properties === 'object') {
                                    newModule.properties[propName] = value;
                                }
                            } catch (error) {
                                console.warn(`  ⚠️ Could not restore property ${propName}:`, error);
                            }
                        });

                        // STEP 9: Call start if the game is running
                        if (window.editor && window.editor.engine && window.editor.engine.isRunning) {
                            if (typeof newModule.start === 'function') {
                                try {
                                    newModule.start();
                                    console.log(`  ✅ Called start on new ${className}`);
                                } catch (error) {
                                    console.error(`  ❌ Error calling start:`, error);
                                }
                            }
                        }

                        updatedCount++;
                        console.log(`  ✅ Successfully replaced ${className} on ${obj.name}`);
                    }
                }

                // Recursively process children
                if (obj.children && obj.children.length > 0) {
                    traverseAndUpdate(obj.children);
                }
            });
        };

        traverseAndUpdate(gameObjects);
        
        console.log(`🎉 Module reload complete: Updated ${updatedCount} instance(s) of ${className}`);
        
        // STEP 10: Force refresh the inspector if an object is selected
        if (window.editor && window.editor.inspector && window.editor.inspector.inspectedObject) {
            console.log(`🔄 Refreshing inspector for currently selected object...`);
            
            // Force re-inspection to get fresh module references
            const currentObject = window.editor.inspector.inspectedObject;
            window.editor.inspector.inspectedObject = null;
            
            // Use requestAnimationFrame to ensure the inspector updates after the module replacement
            requestAnimationFrame(() => {
                window.editor.inspector.inspectObject(currentObject);
                console.log(`✅ Inspector refreshed`);
            });
        }
        
        return updatedCount;
    }
}

// Create global instance
window.moduleReloader = new ModuleReloader();
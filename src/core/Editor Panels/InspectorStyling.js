/**
 * InspectorStyling - Provides utilities for custom styling of module properties in the Inspector
 * 
 * This class offers a fluent API for defining how module properties should be displayed
 * in the Inspector panel, allowing for custom layouts, grouping, colors, and interactive elements.
 */

// Check if we're in the editor environment
const isEditorEnvironment = () => {
    return typeof window !== 'undefined' && 
           (window.editor || 
            document.querySelector('.editor-container') || 
            document.getElementById('inspector'));
};

// Create a Style helper class that's safe to use in any context
class Style {
    constructor(module) {
        this.module = module;
    }

    /**
     * Start a collapsible group for properties
     * @param {string} name - Group name
     * @param {boolean} [collapsed=false] - Whether the group starts collapsed
     * @param {Object} [options] - Additional styling options
     * @returns {Style} This style instance for chaining
     */
    startGroup(name, collapsed = false, options = {}) {
        if (isEditorEnvironment() && typeof this.module.startGroup === 'function') {
            this.module.startGroup(name, collapsed, options);
        }
        return this;
    }

    /**
     * End the current property group
     * @returns {Style} This style instance for chaining
     */
    endGroup() {
        if (isEditorEnvironment() && typeof this.module.endGroup === 'function') {
            this.module.endGroup();
        }
        return this;
    }

    /**
     * Add a divider line
     * @param {Object} [options] - Optional styling options
     * @returns {Style} This style instance for chaining
     */
    addDivider(options = {}) {
        if (isEditorEnvironment() && typeof this.module.addDivider === 'function') {
            this.module.addDivider(options);
        }
        return this;
    }

    /**
     * Add a header directly (not tied to a specific property)
     * @param {string|Object} header - Header text or config object
     * @param {string} [id] - Optional ID for the header
     * @returns {Style} This style instance for chaining
     */
    addHeader(header, id) {
        if (isEditorEnvironment() && typeof this.module.addHeader === 'function') {
            this.module.addHeader(header, id);
        }
        return this;
    }

    /**
     * Add a button to the inspector
     * @param {string} label - Button text
     * @param {Function} onClick - Click handler function
     * @param {Object} [options] - Additional styling options
     * @returns {Style} This style instance for chaining
     */
    addButton(label, onClick, options = {}) {
        if (isEditorEnvironment() && typeof this.module.addButton === 'function') {
            this.module.addButton(label, onClick, options);
        }
        return this;
    }

    /**
     * Add help text to the inspector
     * @param {string} text - Help text content
     * @param {Object} [options] - Styling options
     * @returns {Style} This style instance for chaining
     */
    addHelpText(text, options = {}) {
        if (isEditorEnvironment() && typeof this.module.addHelpText === 'function') {
            this.module.addHelpText(text, options);
        }
        return this;
    }

    /**
     * Add space/padding in the inspector
     * @param {string|number} height - Space height in pixels or CSS value
     * @returns {Style} This style instance for chaining
     */
    addSpace(height = '10px') {
        if (isEditorEnvironment() && typeof this.module.addSpace === 'function') {
            this.module.addSpace(height);
        }
        return this;
    }

    /**
     * Add a color block to the inspector
     * @param {string} color - CSS color value
     * @param {Object} [options] - Additional styling options
     * @returns {Style} This style instance for chaining
     */
    addColorBlock(color, options = {}) {
        if (isEditorEnvironment() && typeof this.module.addColorBlock === 'function') {
            this.module.addColorBlock(color, options);
        }
        return this;
    }

    /**
     * Expose a property with styling
     * @param {string} name - Property name
     * @param {string} type - Property type
     * @param {any} defaultValue - Default value
     * @param {Object} options - Property options including styling
     * @returns {Style} This style instance for chaining
     */
    exposeProperty(name, type, defaultValue, options = {}) {
        if (typeof this.module.exposeProperty === 'function') {
            this.module.exposeProperty(name, type, defaultValue, options);
        }
        return this;
    }
}

// Only define extended styling features if we're in the editor
if (isEditorEnvironment()) {
    // Store the original exposeProperty method to extend it
    const originalExposeProperty = Module.prototype.exposeProperty;

    /**
     * Enhanced exposeProperty with styling support
     * @param {string} name - Property name
     * @param {string} type - Property type (string, number, boolean, etc.)
     * @param {any} defaultValue - Default value
     * @param {Object} options - Additional options including styling
     */
    Module.prototype.exposeProperty = function(name, type, defaultValue, options = {}) {
        // Extract styling options if present
        const styling = options.style || {};
        
        // Process header if specified
        if (styling.header) {
            this._processHeaderStyling(styling.header, name);
        }
        
        // Process group if specified
        if (styling.group) {
            this._ensurePropertyGroups();
            this._propertyGroups[name] = styling.group;
        }
        
        // Process range and slider
        if (type === 'number' && styling.range) {
            options.min = styling.range[0];
            options.max = styling.range[1];
            
            if (styling.slider) {
                options.slider = true;
                options.step = styling.step || (styling.range[1] - styling.range[0]) / 100;
            }
        }
        
        // Process custom label
        if (styling.label) {
            options.label = styling.label;
        }
        
        // Process tooltip/description
        if (styling.tooltip) {
            options.description = styling.tooltip;
        }
        
        // Process help text
        if (styling.help) {
            options.helpText = styling.help;
        }
        
        // Process color styling
        if (styling.color) {
            options.textColor = styling.color;
        }
        
        // Call the original method with enhanced options
        return originalExposeProperty.call(this, name, type, defaultValue, options);
    };

    /**
     * Process header styling
     * @private
     */
    Module.prototype._processHeaderStyling = function(headerConfig, propertyName) {
        // Ensure we have a place to store header info
        if (!this._propertyHeaders) {
            this._propertyHeaders = {};
        }
        
        let header = headerConfig;
        
        // Handle case where header is a simple string
        if (typeof headerConfig === 'string') {
            header = {
                text: headerConfig
            };
        }
        
        // Store the header info associated with this property
        this._propertyHeaders[propertyName] = header;
    };

    /**
     * Ensure we have a property groups object
     * @private
     */
    Module.prototype._ensurePropertyGroups = function() {
        if (!this._propertyGroups) {
            this._propertyGroups = {};
        }
    };

    /**
     * Add a header directly (not tied to a specific property)
     * @param {string|Object} header - Header text or config object
     * @param {string} [id] - Optional ID for the header
     */
    Module.prototype.addHeader = function(header, id) {
        if (!isEditorEnvironment()) return this;
        
        // Ensure we have a place to store headers
        if (!this._independentHeaders) {
            this._independentHeaders = [];
        }
        
        // Process the header config
        let headerConfig = header;
        
        if (typeof header === 'string') {
            headerConfig = {
                text: header,
                id: id || `header_${Date.now()}`
            };
        }
        
        this._independentHeaders.push(headerConfig);
        return this;
    };

    /**
     * Add a divider line
     * @param {Object} [options] - Optional styling options
     */
    Module.prototype.addDivider = function(options = {}) {
        if (!isEditorEnvironment()) return this;
        
        // Ensure we have a place to store dividers
        if (!this._dividers) {
            this._dividers = [];
        }
        
        this._dividers.push({
            id: `divider_${Date.now()}`,
            options: options
        });
        
        return this;
    };

    /**
     * Start a collapsible group for properties
     * @param {string} name - Group name
     * @param {boolean} [collapsed=false] - Whether the group starts collapsed
     * @param {Object} [options] - Additional styling options
     */
    Module.prototype.startGroup = function(name, collapsed = false, options = {}) {
        if (!isEditorEnvironment()) return this;
        
        // Ensure we have a stack for active groups
        if (!this._activeGroups) {
            this._activeGroups = [];
        }
        
        const groupId = options.id || `group_${Date.now()}`;
        
        const group = {
            id: groupId,
            name: name,
            collapsed: collapsed,
            options: options
        };
        
        this._activeGroups.push(group);
        
        // Ensure we have a list of group definitions
        if (!this._groupDefinitions) {
            this._groupDefinitions = [];
        }
        
        this._groupDefinitions.push(group);
        
        return this;
    };

    /**
     * End the current property group
     */
    Module.prototype.endGroup = function() {
        if (!isEditorEnvironment()) return this;
        
        if (this._activeGroups && this._activeGroups.length > 0) {
            this._activeGroups.pop();
        }
        
        return this;
    };

    /**
     * Add a button to the inspector
     * @param {string} label - Button text
     * @param {Function} onClick - Click handler function
     * @param {Object} [options] - Additional styling options
     */
    Module.prototype.addButton = function(label, onClick, options = {}) {
        if (!isEditorEnvironment()) return this;
        
        // Ensure we have a place to store buttons
        if (!this._buttons) {
            this._buttons = [];
        }
        
        const buttonId = options.id || `button_${Date.now()}`;
        
        this._buttons.push({
            id: buttonId,
            label: label,
            onClick: onClick,
            options: options,
            group: this._activeGroups?.length > 0 ? this._activeGroups[this._activeGroups.length - 1] : null
        });
        
        return this;
    };

    /**
     * Add help text to the inspector
     * @param {string} text - Help text content
     * @param {Object} [options] - Styling options
     */
    Module.prototype.addHelpText = function(text, options = {}) {
        if (!isEditorEnvironment()) return this;
        
        // Ensure we have a place to store help texts
        if (!this._helpTexts) {
            this._helpTexts = [];
        }
        
        this._helpTexts.push({
            id: options.id || `help_${Date.now()}`,
            text: text,
            options: options,
            group: this._activeGroups?.length > 0 ? this._activeGroups[this._activeGroups.length - 1] : null
        });
        
        return this;
    };

    /**
     * Add space/padding in the inspector
     * @param {string|number} height - Space height in pixels or CSS value
     */
    Module.prototype.addSpace = function(height = '10px') {
        if (!isEditorEnvironment()) return this;
        
        // Ensure we have a place to store spaces
        if (!this._spaces) {
            this._spaces = [];
        }
        
        this._spaces.push({
            id: `space_${Date.now()}`,
            height: typeof height === 'number' ? `${height}px` : height,
            group: this._activeGroups?.length > 0 ? this._activeGroups[this._activeGroups.length - 1] : null
        });
        
        return this;
    };

    /**
     * Add a color block to the inspector
     * @param {string} color - CSS color value
     * @param {Object} [options] - Additional styling options
     */
    Module.prototype.addColorBlock = function(color, options = {}) {
        if (!isEditorEnvironment()) return this;
        
        // Ensure we have a place to store color blocks
        if (!this._colorBlocks) {
            this._colorBlocks = [];
        }
        
        options.color = color || options.color || '#3498db';
        
        this._colorBlocks.push({
            id: options.id || `colorBlock_${Date.now()}`,
            options: options,
            group: this._activeGroups?.length > 0 ? this._activeGroups[this._activeGroups.length - 1] : null
        });
        
        return this;
    };

    // Extend the original getExposedProperties method to include styling elements
    const originalGetExposedProperties = Module.prototype.getExposedProperties;
    
    Module.prototype.getExposedProperties = function() {
        if (!isEditorEnvironment()) {
            return originalGetExposedProperties.call(this);
        }
        
        // Get the base properties
        let properties = originalGetExposedProperties.call(this);
        
        // Add headers directly attached to properties
        if (this._propertyHeaders) {
            for (const propName in this._propertyHeaders) {
                const header = this._propertyHeaders[propName];
                
                // Find the index of the property this header should precede
                const propIndex = properties.findIndex(p => p.name === propName);
                
                if (propIndex !== -1) {
                    // Insert the header right before the property
                    properties.splice(propIndex, 0, {
                        type: '_header',
                        name: `header_${propName}`,
                        text: header.text,
                        options: header
                    });
                }
            }
        }
        
        // Add independent headers
        if (this._independentHeaders) {
            for (const header of this._independentHeaders) {
                properties.push({
                    type: '_header',
                    name: header.id,
                    text: header.text,
                    options: header
                });
            }
        }
        
        // Add dividers
        if (this._dividers) {
            for (const divider of this._dividers) {
                properties.push({
                    type: '_divider',
                    name: divider.id,
                    options: divider.options
                });
            }
        }
        
        // Add group markers based on _groupDefinitions
        if (this._groupDefinitions) {
            // Keep track of which properties are in which groups
            const propertyGroups = {};
            
            if (this._propertyGroups) {
                // Build a map of group name -> properties
                for (const propName in this._propertyGroups) {
                    const groupName = this._propertyGroups[propName];
                    
                    if (!propertyGroups[groupName]) {
                        propertyGroups[groupName] = [];
                    }
                    
                    // Find the property in our properties array
                    const propIndex = properties.findIndex(p => p.name === propName);
                    
                    if (propIndex !== -1) {
                        propertyGroups[groupName].push({
                            property: properties[propIndex],
                            index: propIndex
                        });
                    }
                }
            }
            
            // Add group start/end markers
            for (const group of this._groupDefinitions) {
                const groupProps = propertyGroups[group.name] || [];
                
                if (groupProps.length > 0) {
                    // Find the index to insert the group start marker (before the first property)
                    let startIndex = Math.min(...groupProps.map(p => p.index));
                    
                    // Insert the group start marker
                    properties.splice(startIndex, 0, {
                        type: '_groupStart',
                        name: group.id,
                        group: group
                    });
                    
                    // Adjust indices for the inserted marker
                    for (let i = 0; i < groupProps.length; i++) {
                        if (groupProps[i].index >= startIndex) {
                            groupProps[i].index++;
                        }
                    }
                    
                    // Find the index to insert the group end marker (after the last property)
                    let endIndex = Math.max(...groupProps.map(p => p.index)) + 1;
                    
                    // Insert the group end marker
                    properties.splice(endIndex, 0, {
                        type: '_groupEnd',
                        name: `${group.id}_end`,
                        groupId: group.id
                    });
                }
            }
        }
        
        // Add buttons
        if (this._buttons) {
            for (const button of this._buttons) {
                properties.push({
                    type: '_button',
                    name: button.id,
                    label: button.label,
                    onClick: button.onClick,
                    options: button.options,
                    group: button.group
                });
            }
        }
        
        // Add help texts
        if (this._helpTexts) {
            for (const helpText of this._helpTexts) {
                properties.push({
                    type: '_helpText',
                    name: helpText.id,
                    text: helpText.text,
                    options: helpText.options,
                    group: helpText.group
                });
            }
        }
        
        // Add spaces
        if (this._spaces) {
            for (const space of this._spaces) {
                properties.push({
                    type: '_space',
                    name: space.id,
                    height: space.height,
                    group: space.group
                });
            }
        }
        
        // Add color blocks
        if (this._colorBlocks) {
            for (const colorBlock of this._colorBlocks) {
                properties.push({
                    type: '_colorBlock',
                    name: colorBlock.id,
                    options: colorBlock.options,
                    group: colorBlock.group
                });
            }
        }
        
        return properties;
    };
}

// Make Style available globally
window.Style = Style;

// Add a convenience method to Module to get a Style instance
Module.prototype.getStyle = function() {
    return new Style(this);
};

// Log status
if (!isEditorEnvironment()) {
    console.log('InspectorStyling is disabled outside of the editor environment');
}
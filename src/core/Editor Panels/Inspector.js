class Inspector {
    constructor(containerId, editorInstance) {
        this.container = document.getElementById(containerId);
        this.editor = editorInstance;
        this.inspectedObject = null;
        this.lockedObject = null;
        this.scrollContainer = null;
        this.modulesList = null;
        this.availableModules = [];

        // Initialize UI
        this.initializeUI();

        // Find available modules
        this.detectAvailableModules();

        // Set up drop targets
        this.setupModuleDropTarget();

        // Listen for panel resize events
        window.addEventListener('panelsResized', () => {
            // Adjust scroll container height if needed
            if (this.scrollContainer) {
                this.scrollContainer.style.maxHeight =
                    (this.container.offsetHeight - this.container.querySelector('.inspector-header').offsetHeight) + 'px';
            }
        });

        this.showNoObjectMessage();
    }

    /**
     * Initialize the inspector UI
     */
    initializeUI() {
        this.container.innerHTML = `
            <div class="inspector-container">
                <div class="inspector-header">
                    <div class="no-object-message">No GameObject selected</div>
                    <div class="object-header" style="display: none;">
                        <div class="header-row">
                            <input type="checkbox" class="object-active-toggle" title="Enable/Disable GameObject">
                            <input type="text" class="object-name-input" placeholder="Name">
                            <button class="lock-button" title="Lock Inspector">
                                <i class="fas fa-unlock"></i>
                            </button>
                        </div>
                        <div class="parent-info">
                            <span class="parent-label">Parent:</span>
                            <span class="parent-name">None</span>
                            <button class="unparent-button" title="Remove from parent">
                                <i class="fas fa-unlink"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="inspector-scroll-container">
                    <div class="modules-list"></div>
                    <div class="add-module-container">
                        <button class="add-module-button">
                            <i class="fas fa-plus"></i> Add Module
                        </button>
                        <div class="module-dropdown" style="display: none;"></div>
                    </div>
                </div>
            </div>
        `;

        // Get references to important elements
        this.objectHeader = this.container.querySelector('.object-header');
        this.noObjectMessage = this.container.querySelector('.no-object-message');
        this.nameInput = this.container.querySelector('.object-name-input');
        this.activeToggle = this.container.querySelector('.object-active-toggle');
        this.lockButton = this.container.querySelector('.lock-button');
        this.parentName = this.container.querySelector('.parent-name');
        this.unparentButton = this.container.querySelector('.unparent-button');
        this.scrollContainer = this.container.querySelector('.inspector-scroll-container');
        this.modulesList = this.container.querySelector('.modules-list');
        this.addModuleButton = this.container.querySelector('.add-module-button');
        this.moduleDropdown = this.container.querySelector('.module-dropdown');

        // Set up event listeners
        this.setupEventListeners();

        // Listen for panel resize events
        window.addEventListener('panelsResized', () => {
            // Adjust content height if needed
            if (this.content) {
                this.content.style.maxHeight =
                    (this.container.offsetHeight - this.toolbar.offsetHeight) + 'px';
            }
        });
    }

    /**
     * Setup event listeners for inspector UI elements
     */
    setupEventListeners() {
        // Name input change
        this.nameInput.addEventListener('change', () => {
            if (!this.inspectedObject) return;

            const newName = this.nameInput.value.trim();
            if (newName && newName !== this.inspectedObject.name) {
                this.inspectedObject.rename(newName);

                // Update hierarchy if available
                if (this.editor.hierarchy) {
                    this.editor.hierarchy.refreshHierarchy();
                }
            } else {
                // Reset to original name if empty
                this.nameInput.value = this.inspectedObject.name;
            }
        });

        // Active toggle
        this.activeToggle.addEventListener('change', () => {
            if (!this.inspectedObject) return;

            this.inspectedObject.active = this.activeToggle.checked;

            // Update hierarchy and canvas
            if (this.editor.hierarchy) {
                this.editor.hierarchy.refreshHierarchy();
            }
            this.editor.refreshCanvas();
        });

        // Lock button
        this.lockButton.addEventListener('click', () => {
            if (!this.inspectedObject) return;

            if (this.lockedObject === this.inspectedObject) {
                // Unlock
                this.lockedObject = null;
                this.lockButton.innerHTML = '<i class="fas fa-unlock"></i>';
                this.lockButton.title = 'Lock Inspector';
            } else {
                // Lock
                this.lockedObject = this.inspectedObject;
                this.lockButton.innerHTML = '<i class="fas fa-lock"></i>';
                this.lockButton.title = 'Unlock Inspector';
            }
        });

        // Unparent button
        this.unparentButton.addEventListener('click', () => {
            if (!this.inspectedObject || !this.inspectedObject.parent) return;

            if (this.editor.hierarchy) {
                this.editor.hierarchy.moveToRoot(this.inspectedObject);
                this.updateParentInfo();
            }
        });

        // Add module button
        this.addModuleButton.addEventListener('click', () => {
            this.toggleModuleDropdown();
        });

        // Close module dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.addModuleButton.contains(e.target) &&
                !this.moduleDropdown.contains(e.target)) {
                this.moduleDropdown.style.display = 'none';
            }
        });
    }

    rgbaToHex(r, g, b, a = 1) {
        // Ensure values are within valid ranges
        r = Math.max(0, Math.min(255, Math.round(r)));
        g = Math.max(0, Math.min(255, Math.round(g)));
        b = Math.max(0, Math.min(255, Math.round(b)));
        a = Math.max(0, Math.min(1, a));

        // Convert alpha from 0-1 to 0-255
        const alpha = Math.round(a * 255);

        // Convert to hex
        const toHex = (n) => n.toString(16).padStart(2, '0');

        // Include alpha in hex only if it's not fully opaque (a < 1)
        if (a < 1) {
            return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(alpha)}`;
        } else {
            return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        }
    }

    rgbaStringToHex(color) {
        // Handle object-based color representations (e.g., {r, g, b, a})
        if (typeof color === 'object' && color !== null && 'r' in color && 'g' in color && 'b' in color) {
            return this.rgbaToHex(color.r, color.g, color.b, color.a || 1);
        }

        const namedColors = {
            'lightgreen': '#90EE90',
            'light green': '#90EE90',
            'green': '#008000',
            'red': '#FF0000',
            'blue': '#0000FF',
            'white': '#FFFFFF',
            'black': '#000000'
            // Add more color names as needed
        };

        // Check for named colors first
        if (typeof color === 'string' && namedColors[color.toLowerCase()]) {
            return namedColors[color.toLowerCase()];
        }

        // Try to parse as RGBA string (support floats for alpha)Can we add a failsafe for if its a hex value taken in and just use that, or any other color values?
        const rgbaMatch = color.match(/(\d+(?:\.\d+)?)/g);
        if (rgbaMatch && rgbaMatch.length >= 3) {
            const [r, g, b, a] = rgbaMatch.map(Number);
            return this.rgbaToHex(r, g, b, a);
        }

        // Fallback: return the input if it's a string, otherwise default to white
        return typeof color === 'string' ? color : '#ffffff';
    }

    createAddComponentButton() {
        const addComponentBtn = document.createElement('button');
        addComponentBtn.className = 'add-component-btn';
        addComponentBtn.innerHTML = '<i class="fas fa-plus"></i> Add Component';

        // Create dropdown for available modules
        const dropdown = document.createElement('div');
        dropdown.className = 'component-dropdown';

        // Get modules from the ModulesManager or ModuleRegistry
        if (window.modulesManager) {
            const availableModules = window.modulesManager.getAvailableModules();

            availableModules.forEach(moduleName => {
                const option = document.createElement('div');
                option.className = 'component-option';
                option.textContent = moduleName;
                option.addEventListener('click', () => {
                    this.addModuleToSelectedObject(moduleName);
                });
                dropdown.appendChild(option);
            });
        } else if (window.moduleRegistry) {
            const availableModules = window.moduleRegistry.getAllModules();

            availableModules.forEach(ModuleClass => {
                const option = document.createElement('div');
                option.className = 'component-option';
                option.textContent = ModuleClass.name;
                option.addEventListener('click', () => {
                    this.addModuleToInspectedObject(ModuleClass);
                });
                dropdown.appendChild(option);
            });
        } else {
            // Fallback to hardcoded list if manager not available
            ['RigidBody', 'Collider', 'SpriteRenderer'].forEach(moduleName => {
                const option = document.createElement('div');
                option.className = 'component-option';
                option.textContent = moduleName;
                option.addEventListener('click', () => {
                    if (window[moduleName]) {
                        const module = new window[moduleName]();
                        this.inspectedObject.addModule(module);
                        this.showObjectInspector();
                    }
                });
                dropdown.appendChild(option);
            });
        }

        addComponentBtn.appendChild(dropdown);

        // Show/hide dropdown on click
        addComponentBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('visible');
        });

        // Hide dropdown when clicking elsewhere
        document.addEventListener('click', () => {
            dropdown.classList.remove('visible');
        });

        return addComponentBtn;
    }

    // Add this method to handle adding a module by class
    addModuleToInspectedObject(ModuleClass) {
        if (!this.inspectedObject || !ModuleClass) return;

        try {
            const module = new ModuleClass();
            this.inspectedObject.addModule(module);
            this.showObjectInspector();
            console.log(`Added ${ModuleClass.name} to ${this.inspectedObject.name}`);
        } catch (error) {
            console.error(`Error creating module ${ModuleClass.name}:`, error);
        }
    }

    /**
     * Setup module drop functionality
     */
    setupModuleDropTarget() {
        // Make the modules list and add module button droppable
        const dropTargets = [this.modulesList, this.addModuleButton];

        dropTargets.forEach(target => {
            target.addEventListener('dragover', (e) => {
                if (!this.inspectedObject) return;
                if (!e.dataTransfer.types.includes('application/module-script')) return;

                e.preventDefault();
                e.stopPropagation();
                target.classList.add('module-drop-target');
                e.dataTransfer.dropEffect = 'copy';
            });

            target.addEventListener('dragleave', (e) => {
                target.classList.remove('module-drop-target');
            });

            target.addEventListener('drop', async (e) => {
                if (!this.inspectedObject) return;

                e.preventDefault();
                e.stopPropagation();
                target.classList.remove('module-drop-target');

                const scriptPath = e.dataTransfer.getData('application/module-script');
                if (!scriptPath) return;

                try {
                    const fileBrowser = this.editor.fileBrowser || window.fileBrowser;
                    if (!fileBrowser) throw new Error('FileBrowser not found');

                    const ModuleClass = await fileBrowser.loadModuleScript(scriptPath);
                    if (!ModuleClass) throw new Error('Failed to load module class');

                    // Add module to game object
                    const module = this.addModuleToGameObject(ModuleClass);
                    if (module) {
                        this.showObjectInspector();
                    }
                } catch (error) {
                    console.error('Error adding module:', error);
                }
            });
        });
    }

    /**
     * Toggle the module dropdown menu
     */
    async toggleModuleDropdown() {
        if (this.moduleDropdown.style.display === 'none') {
            this.moduleDropdown.style.display = 'block';
            this.moduleDropdown.innerHTML = '<div class="dropdown-message">Loading modules...</div>';

            // --- Start of new positioning logic ---
            this.moduleDropdown.style.position = 'fixed'; // Use fixed positioning
            this.moduleDropdown.style.zIndex = '10000'; // Ensure it's on top

            const buttonRect = this.addModuleButton.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            const windowWidth = window.innerWidth;

            const dropdownMaxWidth = 350;
            const dropdownMaxHeight = 400; // Default max height
            const margin = 10; // Margin from window edges or button

            // Set width
            let dropdownWidth = Math.min(dropdownMaxWidth, windowWidth - buttonRect.left - margin);
            if (buttonRect.left + dropdownWidth > windowWidth - margin) {
                dropdownWidth = windowWidth - buttonRect.left - margin;
            }
            this.moduleDropdown.style.width = `${dropdownWidth}px`;
            this.moduleDropdown.style.left = `${buttonRect.left}px`;

            // Decide direction and set vertical position and max-height
            if (buttonRect.bottom < windowHeight / 2 || (windowHeight - buttonRect.bottom) > buttonRect.top) {
                // Open downwards
                this.moduleDropdown.style.top = `${buttonRect.bottom + 2}px`; // 2px gap
                this.moduleDropdown.style.bottom = 'auto';
                const availableSpace = windowHeight - buttonRect.bottom - margin - 2;
                this.moduleDropdown.style.maxHeight = `${Math.min(dropdownMaxHeight, availableSpace)}px`;
            } else {
                // Open upwards
                this.moduleDropdown.style.bottom = `${windowHeight - buttonRect.top + 2}px`; // 2px gap
                this.moduleDropdown.style.top = 'auto';
                const availableSpace = buttonRect.top - margin - 2;
                this.moduleDropdown.style.maxHeight = `${Math.min(dropdownMaxHeight, availableSpace)}px`;
            }
            // --- End of new positioning logic ---

            this.moduleDropdown.style.overflowY = 'auto';

            try {
                this.availableModules = []; // Clear before scanning

                const fileBrowser = this.editor?.fileBrowser || window.fileBrowser;
                if (fileBrowser && typeof fileBrowser.scanForModuleScripts === 'function') {
                    console.log("Scanning for module scripts...");
                    await fileBrowser.scanForModuleScripts(); // Populates via registerModuleClass
                }

                // Detect additional modules from global scope (e.g., built-ins)
                this.detectAvailableModules(); // Appends to what scanForModuleScripts found

                console.log(`Total available modules after all scans: ${this.availableModules.length}`);
                this.populateModuleDropdown(); // Ensure this calls the hierarchical version
            } catch (error) {
                console.error('Error loading modules:', error);
                this.moduleDropdown.innerHTML = '<div class="dropdown-message error">Error loading modules</div>';
            }
        } else {
            this.moduleDropdown.style.display = 'none';
        }
    }

    /**
     * Add a module to the selected GameObject
     */
    addModuleToGameObject(moduleClass) {
        if (!this.inspectedObject || !moduleClass) return;

        try {
            // Create new instance
            const module = new moduleClass();

            // Set the module type name if not set
            if (!module.type) {
                module.type = moduleClass.name;
            }

            // IMPORTANT: Explicitly set the gameObject reference in the module
            // to ensure all internal properties are updated
            module.gameObject = this.inspectedObject;

            // Add to GameObject
            const addedModule = this.inspectedObject.addModule(module);

            // Ensure reference is correct
            console.log("Added module gameObject reference:", addedModule.gameObject === this.inspectedObject);

            // Refresh inspector UI
            this.showObjectInspector();

            // Refresh canvas
            if (this.editor) {
                this.editor.refreshCanvas();
            }

            return module;
        } catch (error) {
            console.error(`Error adding module ${moduleClass.name}:`, error);
            return null;
        }
    }

    /**
     * Find available module types
     */
    detectAvailableModules() {
        console.log("Detecting available modules...");
        //this.availableModules = []; // Reset before detection

        if (typeof Module !== 'undefined') {
            for (const key in window) {
                try {
                    const obj = window[key];
                    if (typeof obj === 'function' &&
                        obj.prototype instanceof Module &&
                        obj !== Module) {
                        // Check if we already have this module class by name
                        const exists = this.availableModules.some(m => m.moduleClass.name === obj.name);
                        if (!exists) {
                            const namespace = obj.namespace || 'General'; // Default to General if undefined
                            console.log(`Found module class: ${obj.name}` + (namespace ? ` (Namespace: ${namespace})` : ''));
                            this.availableModules.push({ moduleClass: obj, namespace: namespace });
                        }
                    }
                } catch (e) { /* Ignore */ }
            }
        }
        console.log(`Total available modules found: ${this.availableModules.length}`);
    }

    /**
     * Inspect a GameObject
     */
    inspectObject(gameObject) {
        // If inspector is locked, don't change the inspected object
        if (this.lockedObject && gameObject) return;

        // If no GameObject is provided, clear the inspector
        if (!gameObject) {
            this.showNoObjectMessage();
            return;
        }

        // Store the previous object reference
        const previousObject = this.inspectedObject;

        // Update the inspected object
        this.inspectedObject = gameObject;

        // Show appropriate UI based on whether an object is selected
        if (!gameObject) {
            this.showNoObjectMessage();
        } else {
            this.showObjectInspector();

            // Update all module values after UI is built
            if (gameObject.modules) {
                gameObject.modules.forEach(module => {
                    setTimeout(() => this.updateModuleValues(module), 0);
                });
            }
        }

        // If the object changed, refresh the canvas to show selection state
        if (previousObject !== gameObject && this.editor) {
            this.editor.refreshCanvas();
        }
    }

    /**
     * Show "no object selected" message
     */
    showNoObjectMessage() {
        // First make sure the inspectedObject is null
        this.inspectedObject = null;

        // Hide the "Add Module" button container
        const addModuleContainer = this.container.querySelector('.add-module-container');
        if (addModuleContainer) {
            addModuleContainer.style.display = 'none';
        }

        // Hide object header and show "no object" message
        this.noObjectMessage.style.display = 'block';
        this.objectHeader.style.display = 'none';

        // Clear the entire modules list
        this.modulesList.innerHTML = '';

        // Add a more descriptive message with instructions
        this.modulesList.innerHTML = `
          <div class="no-selection-message">
            <i class="fas fa-info-circle"></i>
            <p>Select a GameObject in the scene or hierarchy to view and edit its properties.</p>
            <p class="hint">Tip: Right-click in the scene to create a new GameObject.</p>
          </div>
        `;
    }

    /**
     * Show inspector for the selected object
     */
    showObjectInspector() {
        this.noObjectMessage.style.display = 'none';
        this.objectHeader.style.display = 'block';

        // Show the "Add Module" button container when an object is selected
        const addModuleContainer = this.container.querySelector('.add-module-container');
        if (addModuleContainer) {
            addModuleContainer.style.display = 'block';
        }

        // Update header information
        this.nameInput.value = this.inspectedObject.name;
        this.activeToggle.checked = this.inspectedObject.active;

        // Update lock button state
        if (this.lockedObject === this.inspectedObject) {
            this.lockButton.innerHTML = '<i class="fas fa-lock"></i>';
            this.lockButton.title = 'Unlock Inspector';
        } else {
            this.lockButton.innerHTML = '<i class="fas fa-unlock"></i>';
            this.lockButton.title = 'Lock Inspector';
        }

        // Update parent info
        this.updateParentInfo();

        // Clear and rebuild modules list
        this.modulesList.innerHTML = '';

        // Always add transform module first
        this.addTransformModule();

        // Add all other modules
        if (this.inspectedObject.modules) {
            this.inspectedObject.modules.forEach(module => {
                this.addModuleUI(module);
            });
        }
    }

    /**
     * Update parent information in the UI
     */
    updateParentInfo() {
        if (!this.inspectedObject) return;

        const parent = this.inspectedObject.parent;
        if (parent) {
            this.parentName.textContent = parent.name;
            this.unparentButton.style.display = 'inline-block';
        } else {
            this.parentName.textContent = 'None';
            this.unparentButton.style.display = 'none';
        }
    }

    /**
     * Add the built-in transform module UI
     */
    addTransformModule() {
        if (!this.inspectedObject) return;

        const transformModule = document.createElement('div');
        transformModule.className = 'module-container transform-module';

        // Check if transform module should be collapsed (from saved state)
        const isCollapsed = this.getModuleCollapseState('transform');

        transformModule.innerHTML = `
            <div class="module-header">
                <div class="module-title">
                    <i class="fas fa-arrows-alt"></i>
                    <span title="Transform: Position, scale, rotation and depth">Transform</span>
                </div>
                <div class="module-actions">
                    <button class="module-collapse" title="${isCollapsed ? 'Expand' : 'Collapse'}">
                        <i class="fas ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}"></i>
                    </button>
                </div>
            </div>
            <div class="module-content" style="${isCollapsed ? 'display: none;' : ''}">
                <div class="property-row">
                    <label title="X position in world space">Position X</label>
                    <input type="number" class="position-x" value="${this.inspectedObject.position.x}" step="1" title="X position in world space">
                </div>
                <div class="property-row">
                    <label title="Y position in world space">Position Y</label>
                    <input type="number" class="position-y" value="${this.inspectedObject.position.y}" step="1" title="Y position in world space">
                </div>
                <div class="property-row">
                    <label title="Process collisions">Use Bounding Box Collision</label>
                    <input type="checkbox" class="use-collision" ${this.inspectedObject.useCollisions ? 'checked' : ''}>
                </div>

                <div class="property-row">
                    <label title="Use Polygon Collision">Use Polygon Collision</label>
                    <input type="checkbox" class="use-polygon-collision" ${this.inspectedObject.usePolygonCollision ? 'checked' : ''}>
                </div>
                <div class="property-row">
                    <label title="Polygon Point Count">Polygon Points</label>
                    <input type="number" class="polygon-points" value="${this.inspectedObject.polygonPointCount}">
                </div>
                <div class="property-row">
                    <label title="Polygon Angle Offset">Polygon Angle Offset</label>
                    <input type="number" class="polygon-angle-offset" value="${this.inspectedObject.polygonAngleOffset}" step="1" title="Polygon Angle Offset">
                </div>

                <div class="property-row">
                    <label title="Width of the collider">Width</label>
                    <input type="number" class="width" value="${this.inspectedObject.size.x}" step="1" title="Width of the object">
                </div>
                <div class="property-row">
                    <label title="Height of the collider">Height</label>
                    <input type="number" class="height" value="${this.inspectedObject.size.y}" step="1" title="Height of the object">
                </div>

                <div class="property-row">
                    <label title="X scale factor">Scale X</label>
                    <input type="number" class="scale-x" value="${this.inspectedObject.scale.x}" step="0.1" title="X scale factor">
                </div>
                <div class="property-row">
                    <label title="Y scale factor">Scale Y</label>
                    <input type="number" class="scale-y" value="${this.inspectedObject.scale.y}" step="0.1" title="Y scale factor">
                </div>
                <div class="property-row">
                    <label title="Rotation angle in degrees">Angle</label>
                    <input type="number" class="rotation" value="${this.inspectedObject.angle}" step="1" title="Rotation angle in degrees">
                </div>
                <div class="property-row">
                    <label title="Render depth/layer">Depth</label>
                    <input type="number" class="depth" value="${this.inspectedObject.depth}" step="1" title="Render depth/layer">
                </div>
                <div class="property-row">
                    <label title="Adjust depth based on Y position(Good for 2.5D/isometric games)">Depth to -y</label>
                    <input type="checkbox" class="depth-to-y" ${this.inspectedObject.depthToY ? 'checked' : ''}>
                </div>
                <div class="property-row">
                    <label title="Color in editor view">Color</label>
                    <input type="color" class="editor-color" value="${this.rgbaStringToHex(this.inspectedObject.editorColor)}" title="Color in editor view">
                </div>
            </div>
        `;

        this.modulesList.appendChild(transformModule);



        // Add collapse button event listener with touch support
        const collapseButton = transformModule.querySelector('.module-collapse');
        const handleCollapseToggle = () => {
            const moduleContent = transformModule.querySelector('.module-content');
            const isCollapsed = moduleContent.style.display === 'none';

            // Toggle collapse state
            moduleContent.style.display = isCollapsed ? '' : 'none';
            collapseButton.innerHTML = `<i class="fas ${isCollapsed ? 'fa-chevron-up' : 'fa-chevron-down'}"></i>`;
            collapseButton.title = isCollapsed ? 'Collapse' : 'Expand';

            // Save collapse state
            this.saveModuleCollapseState('transform', !isCollapsed);
        };

        collapseButton.addEventListener('click', handleCollapseToggle);
        collapseButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            handleCollapseToggle();
        }, { passive: false });

        // Add existing event listeners...
        const posXInput = transformModule.querySelector('.position-x');
        const posYInput = transformModule.querySelector('.position-y');
        const useCollisionInput = transformModule.querySelector('.use-collision');
        const usePolygonCollisionInput = transformModule.querySelector('.use-polygon-collision');
        const polygonPointsInput = transformModule.querySelector('.polygon-points');
        const polygonAngleOffsetInput = transformModule.querySelector('.polygon-angle-offset');
        const widthInput = transformModule.querySelector('.width');
        const heightInput = transformModule.querySelector('.height');
        const scaleXInput = transformModule.querySelector('.scale-x');
        const scaleYInput = transformModule.querySelector('.scale-y');
        const rotationInput = transformModule.querySelector('.rotation');
        const depthInput = transformModule.querySelector('.depth');
        const depthToYInput = transformModule.querySelector('.depth-to-y');
        const colorInput = transformModule.querySelector('.editor-color');

        // Add color change listener
        colorInput.addEventListener('change', () => {
            if (!this.inspectedObject) return;

            // Update the object's color - ensure consistent format
            const newColor = colorInput.value;
            this.inspectedObject.editorColor = newColor;

            // Update the hierarchy icon color
            const hierarchyIcon = document.querySelector(
                `.hierarchy-item[data-id="${this.inspectedObject.id}"] .hierarchy-icon i`
            );
            if (hierarchyIcon) {
                hierarchyIcon.style.color = newColor;
            }

            this.editor.refreshCanvas();
        });

        // Add other existing listeners...
        scaleXInput.addEventListener('change', () => {
            if (!this.inspectedObject) return;
            this.inspectedObject.scale.x = parseFloat(scaleXInput.value);
            this.editor.refreshCanvas();
        });

        scaleYInput.addEventListener('change', () => {
            if (!this.inspectedObject) return;
            this.inspectedObject.scale.y = parseFloat(scaleYInput.value);
            this.editor.refreshCanvas();
        });

        posXInput.addEventListener('change', () => {
            if (!this.inspectedObject) return;
            this.inspectedObject.position.x = parseFloat(posXInput.value);
            this.editor.refreshCanvas();
        });

        useCollisionInput.addEventListener('change', () => {
            if (!this.inspectedObject) return;
            this.inspectedObject.useCollisions = useCollisionInput.checked;
            this.editor.refreshCanvas();
        });

        widthInput.addEventListener('change', () => {
            if (!this.inspectedObject) return;
            this.inspectedObject.size.x = parseFloat(widthInput.value);
            this.inspectedObject.generatePolygonPoints();
            this.editor.refreshCanvas();
        });

        heightInput.addEventListener('change', () => {
            if (!this.inspectedObject) return;
            this.inspectedObject.size.y = parseFloat(heightInput.value);
            this.inspectedObject.generatePolygonPoints();
            this.editor.refreshCanvas();
        });

        usePolygonCollisionInput.addEventListener('change', () => {
            if (!this.inspectedObject) return;
            this.inspectedObject.usePolygonCollision = usePolygonCollisionInput.checked;
            this.inspectedObject.generatePolygonPoints();
            this.editor.refreshCanvas();
        });

        polygonPointsInput.addEventListener('change', () => {
            if (!this.inspectedObject) return;
            let val = parseInt(polygonPointsInput.value);
            if (isNaN(val) || val < 3) val = 3;
            this.inspectedObject.polygonPointCount = val;
            polygonPointsInput.value = val;
            this.inspectedObject.generatePolygonPoints();
            this.editor.refreshCanvas();
        });

        polygonAngleOffsetInput.addEventListener('change', () => {
            if (!this.inspectedObject) return;
            this.inspectedObject.polygonAngleOffset = parseFloat(polygonAngleOffsetInput.value);
            this.inspectedObject.generatePolygonPoints();
            this.editor.refreshCanvas();
        });

        posYInput.addEventListener('change', () => {
            if (!this.inspectedObject) return;
            this.inspectedObject.position.y = parseFloat(posYInput.value);
            this.editor.refreshCanvas();
        });

        rotationInput.addEventListener('change', () => {
            if (!this.inspectedObject) return;
            this.inspectedObject.angle = parseFloat(rotationInput.value);
            this.editor.refreshCanvas();
        });

        depthInput.addEventListener('change', () => {
            if (!this.inspectedObject) return;
            this.inspectedObject.depth = parseFloat(depthInput.value);
            this.editor.refreshCanvas();
        });

        depthToYInput.addEventListener('change', () => {
            if (!this.inspectedObject) return;
            this.inspectedObject.depthToY = depthToYInput.checked;
            this.editor.refreshCanvas();
        });
    }

    updateTransformValues() {
        if (!this.inspectedObject) return;

        const transformModule = this.modulesList.querySelector('.transform-module');
        if (!transformModule) return;

        const pos = this.inspectedObject.position;
        const scale = this.inspectedObject.scale;

        transformModule.querySelector('.position-x').value = pos.x;
        transformModule.querySelector('.position-y').value = pos.y;
        transformModule.querySelector('.use-collision').checked = this.inspectedObject.useCollisions;
        transformModule.querySelector('.use-polygon-collision').checked = this.inspectedObject.usePolygonCollision;
        transformModule.querySelector('.polygon-points').value = this.inspectedObject.polygonPointCount;
        transformModule.querySelector('.width').value = this.inspectedObject.size.x;
        transformModule.querySelector('.height').value = this.inspectedObject.size.y;
        transformModule.querySelector('.scale-x').value = scale.x;
        transformModule.querySelector('.scale-y').value = scale.y;
        transformModule.querySelector('.rotation').value = this.inspectedObject.angle;
        transformModule.querySelector('.depth').value = this.inspectedObject.depth;
        transformModule.querySelector('.depth-to-y').checked = this.inspectedObject.depthToY;
        transformModule.querySelector('.editor-color').value = this.rgbaStringToHex(this.inspectedObject.editorColor) || '#ffffff';

        // Update hierarchy icon color
        const hierarchyIcon = document.querySelector(
            `.hierarchy-item[data-id="${this.inspectedObject.id}"] .hierarchy-icon i`
        );
        if (hierarchyIcon) {
            hierarchyIcon.style.color = this.inspectedObject.editorColor;
        }
    }

    /**
     * Add UI for a specific module
     */
    addModuleUI(module) {
        if (!module) return;

        const moduleContainer = document.createElement('div');
        moduleContainer.className = 'module-container';
        moduleContainer.dataset.moduleId = module.id;

        const moduleColor = module.constructor.color || null;
        if (moduleColor) {
            moduleContainer.style.setProperty('--module-color', moduleColor);
            // Simple luminance check for dark/light text
            const rgb = moduleColor.startsWith('#') ? moduleColor.substring(1) : moduleColor;
            const r = parseInt(rgb.substr(0, 2), 16), g = parseInt(rgb.substr(2, 2), 16), b = parseInt(rgb.substr(4, 2), 16);
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            moduleContainer.style.setProperty('--module-text-color', luminance > 0.5 ? '#222' : '#fff');
            // Generate lighter/darker backgrounds for inputs
            function shade(hex, percent) {
                let R = parseInt(hex.substring(0, 2), 16);
                let G = parseInt(hex.substring(2, 4), 16);
                let B = parseInt(hex.substring(4, 6), 16);
                R = Math.min(255, Math.max(0, Math.floor(R * (100 + percent) / 100)));
                G = Math.min(255, Math.max(0, Math.floor(G * (100 + percent) / 100)));
                B = Math.min(255, Math.max(0, Math.floor(B * (100 + percent) / 100)));
                return "#" + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
            }
            const base = rgb.length === 6 ? rgb : "23272b";
            moduleContainer.style.setProperty('--module-input-bg', shade(base, luminance > 0.5 ? -10 : 15));
            moduleContainer.style.setProperty('--module-input-border', shade(base, luminance > 0.5 ? -25 : 30));
        } else {
            moduleContainer.style.removeProperty('--module-color');
            moduleContainer.style.removeProperty('--module-text-color');
            moduleContainer.style.removeProperty('--module-input-bg');
            moduleContainer.style.removeProperty('--module-input-border');
        }

        // Get module display name and description
        const moduleDisplayName = module.type || module.constructor.name || 'Unknown Module';
        const moduleDescription = module.constructor.description || '';
        const combinedTooltip = moduleDescription ? `${moduleDisplayName}: ${moduleDescription}` : moduleDisplayName;

        // Check if this is a placeholder
        const isPlaceholder = module.isPlaceholder === true || module.constructor.isPlaceholder === true;

        // Check if this module should be collapsed (from saved state)
        const isCollapsed = this.getModuleCollapseState(module.id);

        // Handle custom icon if specified in the module
        let iconHtml = '<i class="fas fa-puzzle-piece"></i>'; // Default icon

        // Check for iconClass in module constructor or instance
        const iconClass = module.constructor.iconClass || module.iconClass;
        if (iconClass) {
            if (iconClass.startsWith('fa-')) {
                // Font Awesome icon
                iconHtml = `<i class="fas ${iconClass}"></i>`;
            } else {
                // Assume it's a full icon class including the 'fas' part
                iconHtml = `<i class="${iconClass}"></i>`;
            }
        }

        // Check for custom iconUrl in module constructor or instance
        const iconUrl = module.constructor.iconUrl || module.iconUrl;
        if (iconUrl) {
            iconHtml = `<img src="${iconUrl}" class="module-icon" alt="${moduleDisplayName} icon">`;
        }

        // Special warning for placeholder modules
        let placeholderHtml = '';
        if (isPlaceholder) {
            placeholderHtml = `
            <div class="module-placeholder-info">
                <i class="fas fa-exclamation-triangle"></i>
                <span>This module type is not currently loaded. Data has been preserved, but functionality is limited.</span>
                <button class="placeholder-actions-btn" title="View Placeholder Options">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
                <div class="placeholder-actions-menu">
                    <div class="placeholder-action" data-action="reimport">
                        <i class="fas fa-file-import"></i> Reimport Module
                    </div>
                    <div class="placeholder-action" data-action="reimplement">
                        <i class="fas fa-code"></i> Create Implementation
                    </div>
                    <div class="placeholder-action" data-action="view-data">
                        <i class="fas fa-database"></i> View Data
                    </div>
                    <div class="placeholder-action" data-action="remove">
                        <i class="fas fa-trash"></i> Remove Module
                    </div>
                </div>
            </div>
            `;

            // Mark module container for styling
            moduleContainer.classList.add('placeholder-module');
        }

        // Rest of your existing code...

        moduleContainer.innerHTML = `
            <div class="module-header">
                <div class="module-title">
                    <div class="module-drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-lines"></i>
                    </div>
                    ${iconHtml}
                    <span title="${combinedTooltip}">${moduleDisplayName}</span>
                    ${isPlaceholder ? '<span class="placeholder-badge">PLACEHOLDER</span>' : ''}
                </div>
                <div class="module-actions">
                    <button class="module-toggle" title="${module.enabled ? 'Disable' : 'Enable'} Module">
                        <i class="fas ${module.enabled ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                    </button>
                    <button class="module-collapse" title="${isCollapsed ? 'Expand' : 'Collapse'}">
                        <i class="fas ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}"></i>
                    </button>
                    <button class="module-remove" title="Remove Module">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="module-content" style="${!module.enabled ? 'opacity: 0.5;' : ''}${isCollapsed ? 'display: none;' : ''}">
                ${placeholderHtml}
                ${this.generateModulePropertiesUI(module)}
            </div>
        `;

        // Set up event listeners (existing code)
        const toggleButton = moduleContainer.querySelector('.module-toggle');
        const removeButton = moduleContainer.querySelector('.module-remove');
        const collapseButton = moduleContainer.querySelector('.module-collapse');

        if (toggleButton) {
            toggleButton.addEventListener('click', () => {
                module.enabled = !module.enabled;

                // Update UI to reflect the new state
                toggleButton.innerHTML = `<i class="fas ${module.enabled ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>`;
                toggleButton.title = `${module.enabled ? 'Disable' : 'Enable'} Module`;

                // Update the module content opacity
                const moduleContent = moduleContainer.querySelector('.module-content');
                if (moduleContent) {
                    moduleContent.style.opacity = module.enabled ? '1' : '0.5';
                }

                this.editor.refreshCanvas();
            });
        }

        if (removeButton) {
            removeButton.addEventListener('click', () => {
                if (confirm(`Remove ${module.type} module?`)) {
                    // First remove from DOM
                    moduleContainer.remove();

                    // Then remove from GameObject
                    this.inspectedObject.removeModule(module);

                    // Refresh canvas
                    this.editor.refreshCanvas();
                }
            });
        }

        if (collapseButton) {
            collapseButton.addEventListener('click', () => {
                const moduleContent = moduleContainer.querySelector('.module-content');
                const isCollapsed = moduleContent.style.display === 'none';
                moduleContent.style.display = isCollapsed ? '' : 'none';
                collapseButton.innerHTML = `<i class="fas ${isCollapsed ? 'fa-chevron-up' : 'fa-chevron-down'}"></i>`;
                collapseButton.title = isCollapsed ? 'Collapse' : 'Expand';
                this.saveModuleCollapseState(module.id, !isCollapsed);
            });
        }

        // Add placeholder-specific event listeners
        if (isPlaceholder) {
            const actionsButton = moduleContainer.querySelector('.placeholder-actions-btn');
            const actionsMenu = moduleContainer.querySelector('.placeholder-actions-menu');

            if (actionsButton) {
                actionsButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    actionsMenu.classList.toggle('visible');
                });
            }

            // Hide menu when clicking elsewhere
            document.addEventListener('click', () => {
                if (actionsMenu) actionsMenu.classList.remove('visible');
            });

            // Handle action menu clicks
            const actionButtons = moduleContainer.querySelectorAll('.placeholder-action');
            actionButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();

                    const action = btn.dataset.action;
                    switch (action) {
                        case 'reimport':
                            this.handlePlaceholderReimport(module);
                            break;
                        case 'reimplement':
                            this.handlePlaceholderReimplement(module);
                            break;
                        case 'view-data':
                            this.handlePlaceholderViewData(module);
                            break;
                        case 'remove':
                            if (confirm(`Remove ${moduleDisplayName} module?`)) {
                                this.inspectedObject.removeModule(module);
                                moduleContainer.remove();
                                this.editor.refreshCanvas();
                            }
                            break;
                    }

                    // Hide menu after action
                    actionsMenu.classList.remove('visible');
                });
            });
        }

        // Setup module property listeners AFTER adding the module container to DOM
        this.modulesList.appendChild(moduleContainer);

        // Load image previews for this module
        this.loadImagePreviews(moduleContainer);

        // Add this line to setup drag events for reordering:
        this.setupModuleDragEvents(moduleContainer);

        // Add this line to set up property listeners:
        this.setupModulePropertyListeners(moduleContainer, module);

        // Remainder of your existing function
        return moduleContainer;
    }

    /**
     * Set up drag events for module reordering
     * @param {HTMLElement} moduleElement - The module container element
     */
    setupModuleDragEvents(moduleElement) {
        // Make sure the module element has the correct dataset attribute
        if (!moduleElement.dataset.moduleId && moduleElement.getAttribute('data-module-id')) {
            moduleElement.dataset.moduleId = moduleElement.getAttribute('data-module-id');
        }

        // Drag handle for better UX
        const dragHandle = moduleElement.querySelector('.module-drag-handle');
        const moduleHeader = moduleElement.querySelector('.module-header');

        if (dragHandle) {
            // Support both mouse and touch events
            const startDrag = (e) => {
                // Set draggable attribute just before drag starts
                moduleElement.setAttribute('draggable', 'true');

                // Add grabbing cursor to indicate dragging is possible
                dragHandle.style.cursor = 'grabbing';

                // Prevent event propagation to avoid other handlers
                e.stopPropagation();
            };

            const endDrag = () => {
                moduleElement.setAttribute('draggable', 'false');
                if (dragHandle) dragHandle.style.cursor = 'grab';
            };

            // Mouse events
            dragHandle.addEventListener('mousedown', startDrag);

            // Touch events
            dragHandle.addEventListener('touchstart', startDrag, { passive: false });

            // Reset draggable attribute after any interaction ends
            document.addEventListener('mouseup', endDrag, { once: true });
            document.addEventListener('touchend', endDrag, { once: true });
        }

        // Make the module header draggable too
        if (moduleHeader) {
            const headerStartDrag = (e) => {
                // Only allow drag from the header, not from buttons within it
                if (e.target === moduleHeader || e.target.classList.contains('module-title')) {
                    moduleElement.setAttribute('draggable', 'true');
                }
            };

            moduleHeader.addEventListener('mousedown', headerStartDrag);
            moduleHeader.addEventListener('touchstart', headerStartDrag, { passive: false });
        }

        // Drag start event
        moduleElement.addEventListener('dragstart', (e) => {
            console.log('Module drag started:', moduleElement.dataset.moduleId);

            // Store the module ID as drag data
            e.dataTransfer.setData('text/plain', moduleElement.dataset.moduleId);
            e.dataTransfer.effectAllowed = 'move';

            // Add a class to the module being dragged
            moduleElement.classList.add('module-dragging');

            // Delay adding dragging styles for better visual effect
            setTimeout(() => {
                moduleElement.style.opacity = '0.4';
            }, 0);
        });

        // Drag end event
        moduleElement.addEventListener('dragend', () => {
            console.log('Module drag ended');
            // Remove the dragging class and reset opacity
            moduleElement.classList.remove('module-dragging');
            moduleElement.style.opacity = '1';

            // Reset draggable state
            setTimeout(() => {
                moduleElement.setAttribute('draggable', 'false');
            }, 100);
        });

        // Drag over event (needed for drop to work)
        moduleElement.addEventListener('dragover', (e) => {
            e.preventDefault();

            // Check if we're dragging a module
            const draggingElement = document.querySelector('.module-dragging');
            if (!draggingElement || draggingElement === moduleElement) return;

            // Determine drop position (before or after this module)
            const rect = moduleElement.getBoundingClientRect();
            const middleY = rect.y + rect.height / 2;
            const isAbove = e.clientY < middleY;

            // Remove previous indicators
            moduleElement.classList.remove('drop-above', 'drop-below');

            // Add indicator where the module would be dropped
            moduleElement.classList.add(isAbove ? 'drop-above' : 'drop-below');

            e.dataTransfer.dropEffect = 'move';
        });

        // Drag leave event
        moduleElement.addEventListener('dragleave', () => {
            // Remove drop indicators
            moduleElement.classList.remove('drop-above', 'drop-below');
        });

        // Drop event
        moduleElement.addEventListener('drop', (e) => {
            e.preventDefault();
            console.log('Module drop detected');

            // Remove drop indicators
            moduleElement.classList.remove('drop-above', 'drop-below');

            // Get the dragged module ID
            const draggedModuleId = e.dataTransfer.getData('text/plain');
            console.log('Dropped module ID:', draggedModuleId);

            if (!draggedModuleId) return;

            const draggedElement = document.querySelector(`.module-container[data-module-id="${draggedModuleId}"]`);
            if (!draggedElement || draggedElement === moduleElement) return;

            // Determine if dropping above or below
            const rect = moduleElement.getBoundingClientRect();
            const middleY = rect.y + rect.height / 2;
            const isAbove = e.clientY < middleY;

            // Reorder in the DOM
            if (isAbove) {
                moduleElement.parentNode.insertBefore(draggedElement, moduleElement);
            } else {
                moduleElement.parentNode.insertBefore(draggedElement, moduleElement.nextSibling);
            }

            // Update the module order in the GameObject
            this.updateModuleOrder();
        });
    }

    /**
     * Update the module order in the GameObject based on DOM order
     */
    updateModuleOrder() {
        if (!this.inspectedObject) return;

        // Get all module elements in their current DOM order
        const moduleElements = Array.from(this.modulesList.querySelectorAll('.module-container:not(.transform-module)'));

        // Extract module IDs in order
        const moduleIds = moduleElements.map(el => el.dataset.moduleId).filter(id => id);

        // Reorder the modules in the GameObject
        this.inspectedObject.reorderModules(moduleIds);

        // Refresh canvas
        this.editor.refreshCanvas();
    }

    /**
     * Save the collapse state of a module
     * @param {string} moduleId - The module ID or special name (like 'transform')
     * @param {boolean} isCollapsed - Whether the module is collapsed
     */
    saveModuleCollapseState(moduleId, isCollapsed) {
        try {
            // Get existing states from localStorage
            let collapseStates = {};
            const savedStates = localStorage.getItem('moduleCollapseStates');
            if (savedStates) {
                collapseStates = JSON.parse(savedStates);
            }

            // Update state for this module
            collapseStates[moduleId] = isCollapsed;

            // Save back to localStorage
            localStorage.setItem('moduleCollapseStates', JSON.stringify(collapseStates));
        } catch (e) {
            console.warn('Failed to save module collapse state:', e);
        }
    }

    /**
     * Get the collapse state of a module
     * @param {string} moduleId - The module ID or special name (like 'transform')
     * @returns {boolean} Whether the module should be collapsed
     */
    getModuleCollapseState(moduleId) {
        try {
            // Get states from localStorage
            const savedStates = localStorage.getItem('moduleCollapseStates');
            if (savedStates) {
                const collapseStates = JSON.parse(savedStates);
                // Return the state if it exists, otherwise default to not collapsed
                return collapseStates[moduleId] || false;
            }
        } catch (e) {
            console.warn('Failed to get module collapse state:', e);
        }
        return false; // Default to not collapsed
    }

    saveGroupCollapseState(groupId, isCollapsed) {
        try {
            let states = JSON.parse(localStorage.getItem('inspectorGroupCollapseStates') || '{}');
            states[groupId] = isCollapsed;
            localStorage.setItem('inspectorGroupCollapseStates', JSON.stringify(states));
        } catch (e) { }
    }
    getGroupCollapseState(groupId) {
        try {
            const states = JSON.parse(localStorage.getItem('inspectorGroupCollapseStates') || '{}');
            return states[groupId] || false;
        } catch (e) { return false; }
    }

    /**
     * Generate UI for a module based on its exposed properties
     * @param {Module} module - The module to generate UI for
     * @returns {string} HTML for the module properties
     */
    generateModulePropertiesUI(module) {
        // If this is a placeholder module, use the placeholder UI
        if (module.isPlaceholder || module.constructor.isPlaceholder) {
            return this.generatePlaceholderPropertiesUI(module);
        }

        // Use custom UI for SpriteRenderer
        if (module instanceof SpriteRenderer && typeof this.generateSpriteRendererUI === 'function') {
            return this.generateSpriteRendererUI(module);
        }

        // If module has a style() method, use it for custom inspector UI
        if (typeof module.style === 'function') {
            // Create a style helper object
            const styleHelper = {
                html: '',
                exposeProperty: (name, type, value, options = {}) => {
                    styleHelper.html += this.generatePropertyUI({ name, type, value, options }, module);
                    return styleHelper;
                },
                startGroup: (label, collapsible = true, styleOptions = {}) => {
                    const groupId = `group-${Math.random().toString(36).substr(2, 8)}`;
                    const collapsed = collapsible ? this.getGroupCollapseState(groupId) : false;
                    styleHelper.html += `
                        <div class="property-group" id="${groupId}" style="${styleOptions ? Object.entries(styleOptions).map(([k, v]) => `${k}:${v}`).join(';') : ''}">
                            <div class="group-label" style="cursor:pointer;">
                                ${label}
                                ${collapsible ? `<button class="group-collapse-btn" data-group-id="${groupId}" title="${collapsed ? 'Expand' : 'Collapse'}" style="float:right;background:none;border:none;color:#a2b3c4;"><i class="fas ${collapsed ? 'fa-chevron-down' : 'fa-chevron-up'}"></i></button>` : ''}
                            </div>
                            <div class="group-content" style="display:${collapsed ? 'none' : 'block'};">
                    `;
                    if (!styleHelper._groups) styleHelper._groups = [];
                    styleHelper._groups.push({ groupId, collapsible });
                    return styleHelper;
                },
                endGroup: () => {
                    styleHelper.html += `</div></div>`;
                    return styleHelper;
                },
                addDivider: () => {
                    styleHelper.html += `<hr class="property-divider">`;
                    return styleHelper;
                },
                addHeader: (header, id) => {
                    let text = typeof header === 'string' ? header : header.text;
                    let color = header?.color || '';
                    styleHelper.html += `<div class="property-header" style="${color ? `color:${color};` : ''}">${text}</div>`;
                    return styleHelper;
                },
                addButton: (label, onClick, options = {}) => {
                    const buttonId = `btn-${module.id}-${Date.now()}`;
                    const customStyle = options.style || '';

                    // Store the button handler for later use
                    if (!module._styleButtonHandlers) {
                        module._styleButtonHandlers = {};
                    }
                    module._styleButtonHandlers[buttonId] = onClick;

                    styleHelper.html += `<button id="${buttonId}" class="property-btn" style="margin: 4px 0; padding: 6px 12px; ${customStyle}">${label}</button>`;
                },
                addHelpText: (text, options = {}) => {
                    let color = options?.color || '';
                    styleHelper.html += `<div class="property-help" style="${color ? `color:${color};` : ''}">${text}</div>`;
                    return styleHelper;
                },
                addSpace: (px = '10px') => {
                    styleHelper.html += `<div style="height:${typeof px === 'number' ? px + 'px' : px};"></div>`;
                    return styleHelper;
                },
                addColorBlock: (color = '#3498db', options = {}) => {
                    styleHelper.html += `<div class="property-color-block" style="background:${color};height:20px;border-radius:4px;margin:4px 0;"></div>`;
                    return styleHelper;
                },
                addDropdown: (name, value, optionsArr, onChange, extra = {}) => {
                    const inputId = `dropdown-${Math.random().toString(36).substr(2, 8)}`;
                    styleHelper.html += `
                            <div class="property-row">
                                <label for="${inputId}">${extra.label || this.formatPropertyName?.(name) || name}</label>
                                <select id="${inputId}" class="property-input" data-prop-name="${name}">
                                    ${optionsArr.map(opt => `<option value="${opt}" ${opt === value ? 'selected' : ''}>${this.formatPropertyName?.(opt) || opt}</option>`).join('')}
                                </select>
                            </div>
                    `;
                    if (!styleHelper._dropdowns) styleHelper._dropdowns = [];
                    styleHelper._dropdowns.push({ inputId, onChange });
                    return styleHelper;
                },
                addSlider: (name, value, min = 0, max = 100, step = 1, onChange, extra = {}) => {
                    const inputId = `slider-${Math.random().toString(36).substr(2, 8)}`;
                    styleHelper.html += `
                        <div class="property-row">
                            <label for="${inputId}">${extra.label || this.formatPropertyName?.(name) || name}</label>
                            <input type="range" id="${inputId}" class="property-slider" data-prop-name="${name}"
                                min="${min}" max="${max}" step="${step}" value="${value}">
                            <span class="slider-value">${value}</span>
                        </div>
                `;
                    if (!styleHelper._sliders) styleHelper._sliders = [];
                    styleHelper._sliders.push({ inputId, onChange });
                    return styleHelper;
                },
                addImageDrop: (name, value, options = {}) => {
                    const inputId = `image-drop-${Math.random().toString(36).substr(2, 8)}`;
                    styleHelper.html += `
                        <div class="property-row">
                            <label for="${inputId}">${options.label || this.formatPropertyName?.(name) || name}</label>
                            <div id="${inputId}" class="image-drop-area" data-prop-name="${name}">
                                ${value ? `<img src="${value}" alt="Image Preview">` : '<span>Drop an image here or click to select</span>'}
                            </div>
                        </div>
                    `;
                    return styleHelper;
                }
            };

            // Call the module's style method
            module.style(styleHelper);

            setTimeout(() => {
                if (styleHelper._buttons) {
                    styleHelper._buttons.forEach(({ btnId, onClick }) => {
                        const btn = document.getElementById(btnId);
                        if (btn && typeof onClick === 'function') btn.onclick = onClick;
                    });
                }
                if (styleHelper._dropdowns) {
                    styleHelper._dropdowns.forEach(({ inputId, onChange }) => {
                        const el = document.getElementById(inputId);
                        if (el && typeof onChange === 'function') {
                            el.onchange = () => onChange(el.value);
                        }
                    });
                }
                if (styleHelper._sliders) {
                    styleHelper._sliders.forEach(({ inputId, onChange }) => {
                        const el = document.getElementById(inputId);
                        if (el && typeof onChange === 'function') {
                            el.oninput = () => {
                                el.nextElementSibling.textContent = el.value;
                                onChange(parseFloat(el.value));
                            };
                        }
                    });
                }
            }, 0);

            return styleHelper.html;
        }

        // For generic modules, first try to use exposedProperties
        let exposedProps = module.getExposedProperties ? module.getExposedProperties() : [];

        // If no exposed properties and module has a properties object, use that directly
        if ((!exposedProps || exposedProps.length === 0) && module.properties && Object.keys(module.properties).length > 0) {
            exposedProps = Object.entries(module.properties).map(([key, value]) => {
                return {
                    name: key,
                    type: typeof value,
                    value: value
                };
            });
        }

        if (!exposedProps || exposedProps.length === 0) {
            return '<div class="property-message">No editable properties</div>';
        }

        // Generate UI for each property
        const html = exposedProps.map(prop => {
            return this.generatePropertyUI(prop, module);
        }).join('');

        return html;
    }

    /**
     * Load image previews for all image elements in a container
     */
    async loadImagePreviews(container) {
        const imageElements = container.querySelectorAll('.preview-image[data-path], img[data-path]');

        for (const img of imageElements) {
            const path = img.dataset.path;
            if (path && path !== 'No image selected') {
                try {
                    const fileBrowser = this.editor?.fileBrowser;
                    if (fileBrowser) {
                        const content = await fileBrowser.readFile(path);
                        if (content && typeof content === 'string' && content.startsWith('data:image/')) {
                            img.src = content;
                            img.style.display = 'block';
                            const fallback = img.nextElementSibling;
                            if (fallback && fallback.classList.contains('image-fallback')) {
                                fallback.style.display = 'none';
                            }
                        }
                    }
                } catch (error) {
                    console.warn('Failed to load image preview:', path, error);
                    // Show fallback
                    img.style.display = 'none';
                    const fallback = img.nextElementSibling;
                    if (fallback && fallback.classList.contains('image-fallback')) {
                        fallback.style.display = 'flex';
                    }
                }
            }
        }
    }

    /**
     * Generate UI for SpriteRenderer module
     */
    generateSpriteRendererUI(module) {
        // Create image preview display
        const hasImage = module.imageAsset && (typeof module.imageAsset === 'string' ? module.imageAsset : module.imageAsset.path);

        // For previews, we'll load the image asynchronously
        let imageSrc = '';
        let imagePath = 'No image selected';

        if (hasImage) {
            imagePath = typeof module.imageAsset === 'string' ? module.imageAsset : module.imageAsset.path;
            // Set a placeholder, we'll load the actual image after DOM creation
            imageSrc = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMzMzIi8+CjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjNTU1Ii8+Cjx0ZXh0IHg9IjMyIiB5PSIzNiIgZmlsbD0iI2FhYSIgZm9udC1zaXplPSI4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5JTUc8L3RleHQ+Cjwvc3ZnPg==';
        }

        return `
            <div class="property-row">
                <label>Image</label>
                <div class="image-selector" data-module-id="${module.id}">
                    <div class="image-preview ${hasImage ? '' : 'empty'}" 
                        title="${hasImage ? `Path: ${imagePath}` : 'Drag an image here or click to select'}"
                        data-property="imageAsset">
                        ${hasImage ?
                `<img src="${imageSrc}" alt="Sprite" 
                            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <div class="image-fallback" style="display:none;">
                                <i class="fas fa-image"></i>
                                <span>Image Error</span>
                            </div>
                            <div class="image-path">${this.formatImagePath(imagePath)}</div>`
                : '<i class="fas fa-image"></i><div>No Image</div>'}
                    </div>
                    <div class="image-actions">
                        <button class="select-image-button" title="Select an image">
                            <i class="fas fa-folder-open"></i> Select
                        </button>
                        <button class="clear-image-button" title="Clear image" ${hasImage ? '' : 'disabled'}>
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="property-row">
                <label title="Width of the sprite in pixels">Width</label>
                <input type="number" class="property-input" data-prop-name="width" value="${module.width || 0}" step="1" min="1">
            </div>
            <div class="property-row">
                <label title="Height of the sprite in pixels">Height</label>
                <input type="number" class="property-input" data-prop-name="height" value="${module.height || 0}" step="1" min="1">
            </div>
            
            <!-- Scale Mode Dropdown -->
            <div class="property-row">
                <label title="How the image should be scaled to fit the dimensions">Scale Mode</label>
                <select class="property-input scale-mode-dropdown" data-prop-name="scaleMode">
                    <option value="stretch" ${module.scaleMode === 'stretch' ? 'selected' : ''}>Stretch</option>
                    <option value="fit" ${module.scaleMode === 'fit' ? 'selected' : ''}>Fit (preserve aspect ratio)</option>
                    <option value="fill" ${module.scaleMode === 'fill' ? 'selected' : ''}>Fill (preserve aspect ratio, may crop)</option>
                    <option value="tile" ${module.scaleMode === 'tile' ? 'selected' : ''}>Tile (repeat image)</option>
                    <option value="9-slice" ${module.scaleMode === '9-slice' ? 'selected' : ''}>9-Slice (stretchable borders)</option>
                </select>
            </div>
            
            ${module.scaleMode === '9-slice' ? `
            <!-- 9-Slice Border Controls -->
            <div class="property-row">
                <label title="Left border size for 9-slice">Border Left</label>
                <input type="number" class="property-input" data-prop-name="sliceBorder.left" value="${module.sliceBorder.left}" min="0" max="100" step="1">
            </div>
            <div class="property-row">
                <label title="Right border size for 9-slice">Border Right</label>
                <input type="number" class="property-input" data-prop-name="sliceBorder.right" value="${module.sliceBorder.right}" min="0" max="100" step="1">
            </div>
            <div class="property-row">
                <label title="Top border size for 9-slice">Border Top</label>
                <input type="number" class="property-input" data-prop-name="sliceBorder.top" value="${module.sliceBorder.top}" min="0" max="100" step="1">
            </div>
            <div class="property-row">
                <label title="Bottom border size for 9-slice">Border Bottom</label>
                <input type="number" class="property-input" data-prop-name="sliceBorder.bottom" value="${module.sliceBorder.bottom}" min="0" max="100" step="1">
            </div>
            ` : ''}
            
            <!-- Color Tint -->
            <div class="property-row">
                <label title="Tint color for the sprite">Color</label>
                <input type="color" class="property-input" data-prop-name="color" value="${module.color || '#ffffff'}">
            </div>
            
            <!-- Flip Options -->
            <div class="property-row">
                <label title="Flip the sprite horizontally">Flip X</label>
                <input type="checkbox" class="property-input" data-prop-name="flipX" ${module.flipX ? 'checked' : ''}>
            </div>
            
            <div class="property-row">
                <label title="Flip the sprite vertically">Flip Y</label>
                <input type="checkbox" class="property-input" data-prop-name="flipY" ${module.flipY ? 'checked' : ''}>
            </div>
            
            <!-- Pivot Point (displayed as vector) -->
            <div class="property-row vector-property">
                <div class="vector-header">
                    <label title="Pivot point for rotation (0,0 = top left, 1,1 = bottom right)">Pivot</label>
                    <div class="vector-preview">
                    (${module.pivot.x.toFixed(2)}, ${module.pivot.y.toFixed(2)})
                    </div>
                    <button class="vector-collapse"
                            data-target="pivot-${module.id}"
                            data-vector-id="pivot-${module.id}"
                            title="Expand">
                    <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
                <div class="vector-components" id="pivot-${module.id}" style="display:none">
                    <div class="vector-component">
                    <label title="X coordinate">X</label>
                    <input type="number" class="component-input"
                            data-prop-name="pivot"
                            data-component="x"
                            value="${module.pivot.x}" step="0.1" min="0" max="1"
                            title="Pivot X coordinate (0 = left, 1 = right)">
                    </div>
                    <div class="vector-component">
                    <label title="Y coordinate">Y</label>
                    <input type="number" class="component-input"
                            data-prop-name="pivot"
                            data-component="y"
                            value="${module.pivot.y}" step="0.1" min="0" max="1"
                            title="Pivot Y coordinate (0 = top, 1 = bottom)">
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Format an image path for display (truncate if too long)
     */
    formatImagePath(path) {
        // Handle null, undefined, or non-string values
        if (!path || typeof path !== 'string') return 'No image';

        if (path.length <= 20) return path;

        // Extract filename
        const parts = path.split('/');
        const filename = parts.pop();

        // Show only first folder and filename if path is long
        return parts.length > 0 ? `…/${filename}` : filename;
    }

    /**
     * Refresh the available modules list and update the module dropdown UI
     */
    async refreshModuleList() {
        // Clear and rescan available modules
        this.availableModules = [];
        this.detectAvailableModules();

        // If dropdown is open, repopulate it
        if (this.moduleDropdown && this.moduleDropdown.style.display === 'block') {
            this.populateModuleDropdown();
        }
    }

    refreshModuleUI(module) {
        if (!module || !this.inspectedObject) return;

        // Find the module container
        const moduleContainer = this.modulesList.querySelector(`.module-container[data-module-id="${module.id}"]`);
        if (!moduleContainer) return;

        // Remove the old content
        const oldContent = moduleContainer.querySelector('.module-content');
        if (oldContent) {
            // Save the current display state
            const wasCollapsed = oldContent.style.display === 'none';

            // Remove the content
            oldContent.remove();

            // Create new content
            const newContent = document.createElement('div');
            newContent.className = 'module-content';
            newContent.style.opacity = module.enabled ? '1' : '0.5';
            if (wasCollapsed) {
                newContent.style.display = 'none';
            }

            // Generate module properties UI
            newContent.innerHTML = this.generateModulePropertiesUI(module);

            // Add after the header
            const header = moduleContainer.querySelector('.module-header');
            header.after(newContent);

            // Setup new event listeners
            this.setupModulePropertyListeners(moduleContainer, module);
        }
    }

    /**
     * Show image selector dialog for any module
     * @param { Module } module - The module
     * @param { string } propertyName - The property name(optional, defaults to 'imageAsset')
     */
    showImageSelector(module, propertyName = 'imageAsset') {
        // Create the image selector dialog
        const dialog = document.createElement('div');
        dialog.className = 'image-selector-dialog';
        dialog.innerHTML = `
        <div class="image-selector-content">
            <div class="image-selector-header">
                <h3>Select Image for ${module.type}</h3>
                <button class="image-selector-close"><i class="fas fa-times"></i></button>
            </div>
            <div class="image-selector-tabs">
                <button class="image-tab active" data-tab="project">Project Images</button>
                <button class="image-tab" data-tab="url">From URL</button>
                <button class="image-tab" data-tab="upload">Upload</button>
            </div>
            <div class="image-selector-body">
                <div class="image-tab-content active" data-tab="project">
                    <div class="project-images-grid">
                        <div class="loading-message">Loading images...</div>
                    </div>
                </div>
                <div class="image-tab-content" data-tab="url">
                    <div class="url-input-container">
                        <label>Image URL:</label>
                        <input type="text" class="url-input" placeholder="https://example.com/image.png">
                        <button class="load-url-button">Load</button>
                    </div>
                </div>
                <div class="image-tab-content" data-tab="upload">
                    <div class="upload-container">
                        <div class="upload-dropzone">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>Drag and drop an image file here</p>
                            <p>or</p>
                            <button class="upload-button">Select File</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="image-selector-footer">
                <button class="cancel-button">Cancel</button>
            </div>
        </div>
    `;

        // Add styles for the dialog (reuse existing styles)
        const existingStyle = document.getElementById('image-selector-styles');
        if (!existingStyle) {
            const style = document.createElement('style');
            style.id = 'image-selector-styles';
            style.innerHTML = `
            /* Image selector dialog styles */
            .image-selector-dialog {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            .image-selector-content {
                background-color: #2a2a2a;
                border-radius: 4px;
                width: 80%;
                max-width: 800px;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
            }
            .image-selector-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                border-bottom: 1px solid #444;
            }
            .image-selector-header h3 {
                margin: 0;
                color: #eee;
            }
            .image-selector-close {
                background: none;
                border: none;
                color: #eee;
                cursor: pointer;
                font-size: 18px;
            }
            .image-selector-tabs {
                display: flex;
                border-bottom: 1px solid #444;
            }
            .image-tab {
                background: none;
                border: none;
                color: #ccc;
                padding: 10px 20px;
                cursor: pointer;
                border-bottom: 3px solid transparent;
            }
            .image-tab.active {
                color: #fff;
                border-bottom-color: #0078D7;
            }
            .image-selector-body {
                padding: 20px;
                flex: 1;
                min-height: 300px;
                overflow-y: auto;
            }
            .image-tab-content {
                display: none;
            }
            .image-tab-content.active {
                display: block;
            }
            .project-images-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                gap: 15px;
            }
            .project-image-item {
                border: 2px solid transparent;
                border-radius: 4px;
                cursor: pointer;
                position: relative;
                aspect-ratio: 1/1;
                overflow: hidden;
                background: #333;
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            .project-image-item:hover {
                border-color: #666;
            }
            .project-image-item.selected {
                border-color: #0078D7;
            }
            .project-image-thumbnail {
                height: 70%;
                width: 100%;
                object-fit: contain;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .project-image-thumbnail img {
                max-width: 100%;
                max-height: 100%;
            }
            .project-image-name {
                padding: 5px;
                text-align: center;
                color: #eee;
                font-size: 12px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                width: 100%;
            }
            .loading-message {
                text-align: center;
                color: #ccc;
                padding: 40px 0;
            }
            .url-input-container, .upload-container {
                padding: 20px;
                display: flex;
                flex-direction: column;
            }
            .url-input {
                padding: 8px;
                margin: 10px 0;
                background: #333;
                border: 1px solid #555;
                color: #eee;
            }
            .load-url-button, .upload-button {
                padding: 8px 15px;
                background: #0078D7;
                color: #fff;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 10px;
                align-self: flex-start;
            }
            .upload-dropzone {
                border: 3px dashed #555;
                border-radius: 8px;
                padding: 40px 20px;
                text-align: center;
                color: #ccc;
            }
            .upload-dropzone i {
                font-size: 48px;
                margin-bottom: 15px;
                color: #555;
            }
            .upload-dropzone.drag-over {
                border-color: #0078D7;
                background-color: rgba(0, 120, 215, 0.05);
            }
            .image-selector-footer {
                padding: 15px 20px;
                border-top: 1px solid #444;
                display: flex;
                justify-content: flex-end;
            }
            .cancel-button {
                padding: 8px 15px;
                background: #444;
                color: #eee;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
        `;
            document.head.appendChild(style);
        }

        document.body.appendChild(dialog);

        // Set up tab switching
        const tabs = dialog.querySelectorAll('.image-tab');
        const tabContents = dialog.querySelectorAll('.image-tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                tab.classList.add('active');
                const tabName = tab.dataset.tab;
                dialog.querySelector(`.image-tab-content[data-tab="${tabName}"]`).classList.add('active');
            });
        });

        // Load project images
        this.loadProjectImagesGeneric(dialog.querySelector('.project-images-grid'), module, propertyName);

        // Set up URL tab functionality
        const urlInput = dialog.querySelector('.url-input');
        const loadUrlButton = dialog.querySelector('.load-url-button');

        loadUrlButton.addEventListener('click', async () => {
            const url = urlInput.value.trim();
            if (url) {
                try {
                    this.setModuleImageProperty(module, propertyName, url);
                    this.refreshModuleUI(module);
                    this.editor?.refreshCanvas();
                    this.closeDialog(dialog);
                } catch (error) {
                    console.error('Failed to load image from URL:', error);
                    alert('Failed to load image. Please check the URL and try again.');
                }
            }
        });

        // Set up upload tab functionality
        const uploadDropzone = dialog.querySelector('.upload-dropzone');
        const uploadButton = dialog.querySelector('.upload-button');

        uploadDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadDropzone.classList.add('drag-over');
        });

        uploadDropzone.addEventListener('dragleave', () => {
            uploadDropzone.classList.remove('drag-over');
        });

        uploadDropzone.addEventListener('drop', async (e) => {
            e.preventDefault();
            uploadDropzone.classList.remove('drag-over');

            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                await this.handleImageUpload(file, module, propertyName);
                this.closeDialog(dialog);
            }
        });

        uploadButton.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';

            input.onchange = async (e) => {
                if (e.target.files && e.target.files[0]) {
                    await this.handleImageUpload(e.target.files[0], module, propertyName);
                    this.closeDialog(dialog);
                }
            };

            input.click();
        });

        // Set up close button and cancel button
        const closeButton = dialog.querySelector('.image-selector-close');
        const cancelButton = dialog.querySelector('.cancel-button');

        const closeHandler = () => {
            this.closeDialog(dialog);
        };

        closeButton.addEventListener('click', closeHandler);
        cancelButton.addEventListener('click', closeHandler);
    }

    /**
    * Close the image selector dialog
    */
    closeDialog(dialog) {
        if (dialog && dialog.parentNode) {
            document.body.removeChild(dialog);
        }
    }

    /**
 * Handle image upload for any module
 */
    async handleImageUpload(file, module, propertyName = 'imageAsset') {
        if (!file.type.startsWith('image/')) {
            alert('The selected file is not an image.');
            return;
        }

        try {
            const fileBrowser = this.editor?.fileBrowser;
            if (!fileBrowser) {
                console.warn('FileBrowser not available for image upload');
                return;
            }

            const path = `${fileBrowser.currentPath}/${file.name}`;

            // Check if file already exists
            let exists = false;
            try {
                await fileBrowser.readFile(path);
                exists = true;
            } catch (e) {
                exists = false;
            }

            if (!exists) {
                await fileBrowser.handleFileUpload(file);
            } else {
                // Optionally, ask the user if they want to overwrite
                const overwrite = confirm(`File "${file.name}" already exists. Overwrite?`);
                if (overwrite) {
                    await fileBrowser.handleFileUpload(file, { overwrite: true });
                }
                // If not overwriting, just use the existing file
            }

            // Set the image property
            this.setModuleImageProperty(module, propertyName, path);

            this.refreshModuleUI(module);
            this.editor?.refreshCanvas();
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Failed to upload image. Please try again.');
        }
    }

    /**
     * Load project images for the image selector (generic version)
     */
    async loadProjectImagesGeneric(container, module, propertyName) {
        container.innerHTML = '<div class="loading-message">Loading images...</div>';

        try {
            const fileBrowser = this.editor?.fileBrowser;
            if (!fileBrowser) {
                container.innerHTML = '<div class="loading-message">File Browser not available</div>';
                return;
            }

            // Get all files
            const allFiles = await fileBrowser.getAllFiles();

            // Filter for image files using the Inspector's isImagePath method
            const imageFiles = allFiles.filter(file => {
                return file.type === 'file' && this.isImagePath(file.path);
            });

            if (imageFiles.length === 0) {
                container.innerHTML = '<div class="loading-message">No images found in project</div>';
                return;
            }

            // Clear container
            container.innerHTML = '';

            // Get current image value for selection highlighting
            let currentImagePath = '';
            if (typeof module.getProperty === 'function') {
                const value = module.getProperty(propertyName);
                currentImagePath = typeof value === 'string' ? value : (value?.path || '');
            } else if (propertyName in module) {
                const value = module[propertyName];
                currentImagePath = typeof value === 'string' ? value : (value?.path || '');
            }

            // Add image items
            imageFiles.forEach(file => {
                const item = document.createElement('div');
                item.className = 'project-image-item';
                item.dataset.path = file.path;

                // Check if this is the currently selected image
                if (currentImagePath === file.path) {
                    item.classList.add('selected');
                }

                const filename = file.name || file.path.split('/').pop();

                item.innerHTML = `
        <div class="project-image-thumbnail">
            <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIGZpbGw9IiMzMzMiLz4=" 
                 alt="${filename}" 
                 class="preview-image" 
                 data-path="${file.path}">
        </div>
        <div class="project-image-name" title="${file.path}">${filename}</div>
    `;

                // Load the actual image preview asynchronously
                this.loadImagePreviewForElement(item.querySelector('.preview-image'), file.path);

                item.addEventListener('click', async () => {
                    // Remove selected class from all items
                    container.querySelectorAll('.project-image-item').forEach(i => {
                        i.classList.remove('selected');
                    });

                    // Add selected class to this item
                    item.classList.add('selected');

                    // Set the image property using the file path
                    this.setModuleImageProperty(module, propertyName, file.path);

                    // Refresh UI
                    this.refreshModuleUI(module);
                    this.editor?.refreshCanvas();

                    // Close dialog after a short delay
                    setTimeout(() => {
                        const dialog = container.closest('.image-selector-dialog');
                        if (dialog) {
                            this.closeDialog(dialog);
                        }
                    }, 300);
                });

                container.appendChild(item);
            });

            console.log(`Found ${imageFiles.length} image files in project`);
        } catch (error) {
            console.error('Error loading project images:', error);
            container.innerHTML = '<div class="loading-message error">Error loading images: ' + error.message + '</div>';
        }
    }

    /**
     * Load image preview for a specific element
     */
    async loadImagePreviewForElement(imgElement, path) {
        try {
            const content = await this.editor.fileBrowser.readFile(path);
            if (content && typeof content === 'string' && content.startsWith('data:image/')) {
                imgElement.src = content;
            }
        } catch (error) {
            console.warn('Failed to load image preview:', path, error);
            imgElement.style.display = 'none';
        }
    }

    /**
     * Load project images for the image selector
     */
    async loadProjectImages(container, module) {
        container.innerHTML = '<div class="loading-message">Loading images...</div>';

        try {
            const fileBrowser = this.editor?.fileBrowser;
            if (!fileBrowser) {
                container.innerHTML = '<div class="loading-message">File Browser not available</div>';
                return;
            }

            // Get all files
            const allFiles = await fileBrowser.getAllFiles();

            // Filter for image files
            const imageFiles = allFiles.filter(file => {
                return file.type === 'file' && module.isImagePath(file.path);
            });

            if (imageFiles.length === 0) {
                container.innerHTML = '<div class="loading-message">No images found in project</div>';
                return;
            }

            // Clear container
            container.innerHTML = '';

            // Add image items
            imageFiles.forEach(file => {
                const item = document.createElement('div');
                item.className = 'project-image-item';
                item.dataset.path = file.path;

                // Check if this is the currently selected image
                if (module.imageAsset && module.imageAsset.path === file.path) {
                    item.classList.add('selected');
                }

                const filename = file.name || file.path.split('/').pop();

                item.innerHTML = `
                    <div class="project-image-thumbnail">
                        <img src="${file.path}" alt="${filename}">
                    </div>
                    <div class="project-image-name" title="${file.path}">${filename}</div>
                `;

                item.addEventListener('click', async () => {
                    // Remove selected class from all items
                    container.querySelectorAll('.project-image-item').forEach(i => {
                        i.classList.remove('selected');
                    });

                    // Add selected class to this item
                    item.classList.add('selected');

                    // Set the sprite to this path
                    await module.setSprite(file.path);

                    // Refresh UI
                    this.refreshModuleUI(module);
                    this.editor.refreshCanvas();

                    // Close dialog after a short delay to provide visual feedback
                    setTimeout(() => {
                        const dialog = container.closest('.image-selector-dialog');
                        if (dialog) {
                            const style = document.head.querySelector('style:last-child');
                            this.closeDialog(dialog, style);
                        }
                    }, 300);
                });

                container.appendChild(item);
            });
        } catch (error) {
            console.error('Error loading project images:', error);
            container.innerHTML = '<div class="loading-message error">Error loading images</div>';
        }
    }

    /**
     * Register a module class to be available in the Add Module dropdown
     * @param {Class} moduleClass - The module class to register
     */
    registerModuleClass(moduleClass) {
        if (moduleClass.prototype instanceof EditorWindow) {
            //console.warn('EditorWindow classes should not be registered as modules:', moduleClass.name);
            return;
        }
        if (!moduleClass || typeof moduleClass !== 'function') {
            console.error('Invalid module class:', moduleClass);
            return;
        }
        if (!(moduleClass.prototype instanceof Module)) {
            console.error('Class must extend Module:', moduleClass.name);
            return;
        }

        const existing = this.availableModules.find(m => m.moduleClass.name === moduleClass.name);
        if (!existing) {
            const namespace = moduleClass.namespace || 'General'; // Default to General
            this.availableModules.push({ moduleClass: moduleClass, namespace: namespace });
            console.log(`Registered module: ${moduleClass.name}` + (namespace ? ` (Namespace: ${namespace})` : ''));

            // If dropdown is open, refresh it
            if (this.moduleDropdown.style.display === 'block') {
                this.populateModuleDropdown();
            }
        }
    }

    /**
     * Generate UI for a specific property
     * @param {Object} prop - Property descriptor
     * @param {Module} module - The module the property belongs to
     * @returns {string} HTML for the property UI
     */
    generatePropertyUI(prop, module) {
        if (prop.type === '_header') {
            // Render header with optional color and custom styles
            const color = prop.options?.color || prop.options?.textColor || '';
            const customStyle = prop.options?.style || '';
            const combinedStyle = `${color ? `color:${color};` : ''}${customStyle}`;
            return `<div class="property-header" style="${combinedStyle}">${prop.text}</div>`;
        }
        if (prop.type === '_divider') {
            const customStyle = prop.options?.style || '';
            return `<hr class="property-divider" style="${customStyle}">`;
        }
        if (prop.type === '_helpText') {
            const color = prop.options?.color || '';
            const customStyle = prop.options?.style || '';
            const combinedStyle = `${color ? `color:${color};` : ''}${customStyle}`;
            return `<div class="property-help" style="${combinedStyle}">${prop.text}</div>`;
        }
        if (prop.type === '_groupStart') {
            const groupColor = prop.group.options?.color ? `border-left:4px solid ${prop.group.options.color};padding-left:8px;` : '';
            const customStyle = prop.group.options?.style || '';
            const combinedStyle = `${groupColor}${customStyle}`;
            return `<div class="property-group" style="${combinedStyle}"><div class="group-label">${prop.group.name}</div>`;
        }
        if (prop.type === '_groupEnd') {
            return `</div>`;
        }
        if (prop.type === '_space') {
            const customStyle = prop.options?.style || '';
            return `<div style="height:${prop.height};${customStyle}"></div>`;
        }
        if (prop.type === '_colorBlock') {
            const color = prop.options?.color || '#3498db';
            const customStyle = prop.options?.style || '';
            const combinedStyle = `background:${color};height:20px;border-radius:4px;margin:4px 0;${customStyle}`;
            return `<div class="property-color-block" style="${combinedStyle}"></div>`;
        }
        if (prop.type === '_button') {
            // Button will be wired up after insertion
            const customStyle = prop.options?.style || '';
            return `<button id="${prop.name}" class="property-btn" style="${customStyle}">${prop.label}</button>`;
        }

        // Get the property value, trying different access methods
        let value;
        if (typeof module.getProperty === 'function') {
            value = module.getProperty(prop.name, prop.value);
        } else if (prop.name in module) {
            value = module[prop.name];
        } else if (module.properties && prop.name in module.properties) {
            value = module.properties[prop.name];
        } else {
            value = prop.value;
        }

        // Add drag and drop styles on first call
        this.addDragAndDropStyles();

        const inputId = `prop-${module.id}-${prop.name}`;

        // Get description for tooltip from options if available
        const tooltip = prop.options?.description || `${this.formatPropertyName(prop.name)}`;

        // Get custom styles for the property row and input
        const rowStyle = prop.options?.rowStyle || '';
        const inputStyle = prop.options?.inputStyle || prop.options?.style || '';
        const labelStyle = prop.options?.labelStyle || '';

        // Check if the property is a Vector2 or Vector3
        if (value instanceof Vector2 || value instanceof Vector3 ||
            (value && typeof value === 'object' && 'x' in value && 'y' in value)) {
            // Generate collapsible vector fields
            return this.generateVectorUI(prop, module, value);
        }

        // Add slider if requested
        let sliderHtml = '';
        if (prop.options?.slider) {
            const sliderStyle = prop.options?.sliderStyle || '';
            sliderHtml = `
            <input type="range" id="${inputId}-slider" class="property-slider"
                data-prop-name="${prop.name}"
                min="${prop.options.min ?? 0}" max="${prop.options.max ?? 100}"
                step="${prop.options.step ?? 0.01}" value="${value}"
                style="${sliderStyle}">
            `;
        }

        let dropdownHtml = '';
        if (prop.type === 'dropdown' || (prop.type === 'enum' && prop.options?.options)) {
            const options = prop.options?.options || [];
            dropdownHtml = `
            <select id="${inputId}" class="property-input" data-prop-name="${prop.name}" 
                title="${tooltip}" style="${inputStyle}">
                ${options.map(option => {
                // Handle both simple strings and objects with value/label
                let optionValue, optionLabel;
                if (typeof option === 'object' && option !== null) {
                    optionValue = option.value !== undefined ? option.value : option;
                    optionLabel = option.label || this.formatPropertyName(String(optionValue));
                } else {
                    optionValue = option;
                    optionLabel = this.formatPropertyName(String(option));
                }

                return `<option value="${optionValue}" ${value == optionValue ? 'selected' : ''}>
                        ${optionLabel}
                    </option>`;
            }).join('')}
            </select>
            `;
        }

        // Handle asset properties
        if (prop.type === 'asset') {
            const assetType = prop.options?.assetType || 'image';
            const inputId = `prop-${module.id}-${prop.name}`;

            // Get current value
            let value = this.getModuleProperty(module, prop.name);
            let path = '';
            if (typeof value === 'string') {
                path = value;
            } else if (value && typeof value === 'object' && 'path' in value) {
                path = value.path;
            }

            return `
                <div class="property-row" style="${prop.options?.rowStyle || ''}">
                    <label for="${inputId}" title="${prop.options?.description || ''}">${prop.options?.label || this.formatPropertyName(prop.name)}</label>
                    <div class="asset-selector-container" data-prop-name="${prop.name}" data-asset-type="${assetType}">
                        <div class="asset-preview" 
                            data-property-type="asset"
                            data-asset-type="${assetType}"
                            title="Drag an ${assetType} here or click to select">
                            ${this.generateAssetPreview(path, assetType)}
                        </div>
                        <div class="asset-actions">
                            <button class="asset-btn select-btn" title="Select ${assetType.charAt(0).toUpperCase() + assetType.slice(1)}" type="button">
                                <i class="fas fa-folder-open"></i>
                            </button>
                            <button class="asset-btn clear-btn" title="Clear ${assetType}" type="button" ${!path ? 'disabled' : ''}>
                                <i class="fas fa-times"></i>
                            </button>
                            ${window.assetManager ? `
                            <select class="asset-dropdown" title="Quick select from project assets">
                                <option value="">-- Select ${assetType} --</option>
                                ${this.generateAssetOptions(assetType, path)}
                            </select>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }

        let helpHtml = '';
        if (prop.options?.helpText) {
            const helpStyle = prop.options?.helpStyle || '';
            helpHtml = `<div class="property-help" style="${helpStyle}">${prop.options.helpText}</div>`;
        }

        let labelHtml = `<label for="${inputId}" title="${tooltip}" style="${prop.options?.textColor ? `color:${prop.options.textColor};` : ''}${labelStyle}">${prop.options?.label || this.formatPropertyName(prop.name)}</label>`;

        switch (prop.type) {
            case 'number':
                return `
                <div class="property-row" style="${rowStyle}">
                    <label for="${inputId}" title="${tooltip}" style="${prop.options?.textColor ? `color:${prop.options.textColor};` : ''}${labelStyle}">${prop.options?.label || this.formatPropertyName(prop.name)}</label>
                    <input type="number" id="${inputId}" class="property-input"
                        data-prop-name="${prop.name}"
                        value="${value}"
                        title="${tooltip}"
                        style="${inputStyle}"
                        ${prop.options?.min !== undefined ? `min="${prop.options.min}"` : ''}
                        ${prop.options?.max !== undefined ? `max="${prop.options.max}"` : ''}
                        ${prop.options?.step !== undefined ? `step="${prop.options.step}"` : 'step="any"'}
                    >
                    ${sliderHtml}
                    ${helpHtml}
                </div>
            `;
            case 'boolean':
                return `
                <div class="property-row" style="${rowStyle}">
                    <label for="${inputId}" title="${tooltip}" style="${labelStyle}">${this.formatPropertyName(prop.name)}</label>
                    <input type="checkbox" id="${inputId}" class="property-input" 
                        data-prop-name="${prop.name}" ${value ? 'checked' : ''}
                        title="${tooltip}" style="${inputStyle}">
                    ${helpHtml}
                </div>
            `;
            case 'color':
                return `
                <div class="property-row" style="${rowStyle}">
                    <label for="${inputId}" title="${tooltip}" style="${labelStyle}">${this.formatPropertyName(prop.name)}</label>
                    <input type="color" id="${inputId}" class="property-input" 
                        data-prop-name="${prop.name}" value="${value || '#ffffff'}"
                        title="${tooltip}" style="${inputStyle}">
                    ${helpHtml}
                </div>
            `;
            case 'enum':
            case 'dropdown':
            case 'select':
                const options = prop.options?.options || [];
                return `
                <div class="property-row" style="${rowStyle}">
                    <label for="${inputId}" title="${tooltip}" style="${labelStyle}">${this.formatPropertyName(prop.name)}</label>
                    <select id="${inputId}" class="property-input" data-prop-name="${prop.name}"
                        title="${tooltip}" style="${inputStyle}">
                        ${options.map(option => {
                    // Handle both simple strings and objects with value/label
                    let optionValue, optionLabel;
                    if (typeof option === 'object' && option !== null) {
                        optionValue = option.value !== undefined ? option.value : option;
                        optionLabel = option.label || this.formatPropertyName(String(optionValue));
                    } else {
                        optionValue = option;
                        optionLabel = this.formatPropertyName(String(option));
                    }

                    return `<option value="${optionValue}" ${value == optionValue ? 'selected' : ''}>
                                ${optionLabel}
                            </option>`;
                }).join('')}
                    </select>
                    ${helpHtml}
                </div>
            `;
            case 'keys':
            case 'keycode': {
                let keyOptions = window.input?.keys;
                // Ensure keyOptions is always an array
                if (!Array.isArray(keyOptions)) {
                    if (keyOptions && typeof keyOptions === 'object') {
                        keyOptions = Object.values(keyOptions);
                    } else {
                        keyOptions = [];
                    }
                }
                return `
        <div class="property-row">
            <label for="${inputId}" title="${tooltip}">${this.formatPropertyName(prop.name)}</label>
            <select id="${inputId}" class="property-input" data-prop-name="${prop.name}">
                ${keyOptions.map(opt => `<option value="${opt.value}" ${value == opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
            </select>
        </div>
    `;
            }
            case 'vector2':
                return this.generateVectorUI(prop, module, value);
            case 'vector3':
                return this.generateVectorUI(prop, module, value);
            case 'polygon':
                return this.generatePolygonUI(prop, module);

            case 'gameobject':
                const objName = value ? (value.name || 'Unnamed GameObject') : 'None';
                const objId = value ? value.id : null;
                return `
                <div class="property-row" style="${rowStyle}">
                    <label for="${inputId}" title="${tooltip}" style="${labelStyle}">${prop.options?.label || this.formatPropertyName(prop.name)}</label>
                    <div class="gameobject-field" data-prop-name="${prop.name}" data-object-id="${objId || ''}" style="${inputStyle}">
                        <div class="gameobject-preview" 
                            title="Drag a GameObject here or click to select">
                            <i class="fas fa-cube gameobject-icon"></i>
                            <span class="gameobject-name">${objName}</span>
                        </div>
                        <div class="gameobject-actions">
                            <button class="asset-btn select-btn" title="Select GameObject">
                                <i class="fas fa-search"></i>
                            </button>
                            <button class="asset-btn clear-btn" title="Clear Reference" ${!value ? 'disabled' : ''}>
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    ${prop.options?.helpText ? `<div class="property-help" style="${prop.options?.helpStyle || ''}">${prop.options.helpText}</div>` : ''}
                </div>
            `;

            case 'button':
                return `
                    <div class="property-row" style="${rowStyle}">
                        <button id="${inputId}" class="property-button" 
                            data-prop-name="${prop.name}"
                            title="${tooltip}" style="${inputStyle}">
                            ${prop.options?.label || this.formatPropertyName(prop.name)}
                        </button>
                        ${helpHtml}
                    </div>
                `;

            case 'range':
            case 'slider':
                const min = prop.options?.min ?? 0;
                const max = prop.options?.max ?? 100;
                const step = prop.options?.step ?? 1;
                const rangeStyle = prop.options?.rangeStyle || inputStyle;
                const valueStyle = prop.options?.valueStyle || '';
                return `
                <div class="property-row" style="${rowStyle}">
                    <label for="${inputId}" title="${tooltip}" style="${labelStyle}">${prop.options?.label || this.formatPropertyName(prop.name)}</label>
                    <div class="range-container">
                        <input type="range" id="${inputId}" class="property-range" 
                            data-prop-name="${prop.name}"
                            min="${min}" max="${max}" step="${step}" value="${value}"
                            title="${tooltip}" style="${rangeStyle}">
                        <div class="range-value" style="${valueStyle}">${value}</div>
                    </div>
                    ${prop.options?.helpText ? `<div class="property-help" style="${prop.options?.helpStyle || ''}">${prop.options.helpText}</div>` : ''}
                </div>
            `;

            case 'file':
                const fileName = value ? (typeof value === 'string' ? value.split('/').pop() : 'File selected') : 'No file selected';
                const fileTypes = prop.options?.accept || '*';
                return `
                <div class="property-row" style="${rowStyle}">
                    <label for="${inputId}" title="${tooltip}" style="${labelStyle}">${prop.options?.label || this.formatPropertyName(prop.name)}</label>
                    <div class="file-input-container" data-prop-name="${prop.name}" style="${inputStyle}">
                        <div class="file-preview" title="Drag a file here or click to select">
                            <i class="fas fa-file"></i>
                            <span class="file-name">${fileName}</span>
                        </div>
                        <div class="file-actions">
                            <button class="asset-btn select-btn" title="Select File">
                                <i class="fas fa-folder-open"></i>
                            </button>
                            <button class="asset-btn clear-btn" title="Clear File" ${!value ? 'disabled' : ''}>
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <input type="file" class="hidden-file-input" accept="${fileTypes}" style="display: none;">
                    </div>
                    ${prop.options?.helpText ? `<div class="property-help" style="${prop.options?.helpStyle || ''}">${prop.options.helpText}</div>` : ''}
                </div>
            `;

            case 'array':
                return this.generateArrayUI(prop, module, value);

            case 'object':
                return this.generateObjectUI(prop, module, value);

            case 'curve':
                return this.generateCurveUI(prop, module, value);

            case 'gradient':
                return this.generateGradientUI(prop, module, value);

            case 'code':
                return this.generateCodeUI(prop, module, value);

            default:
                // For text inputs, set title to the current value for full text on hover
                return `
                <div class="property-row" style="${rowStyle}">
                    <label for="${inputId}" title="${tooltip}" style="${labelStyle}">${prop.options?.label || this.formatPropertyName(prop.name)}</label>
                    <input type="text" id="${inputId}" class="property-input" 
                        data-prop-name="${prop.name}" value="${value}"
                        title="${value}" style="${inputStyle}">
                    ${helpHtml}
                </div>
            `;
        }
    }

    /**
    * Generate UI for array properties
    */
    generateArrayUI(prop, module, value) {
        const arrayId = `array-${module.id}-${prop.name}`;
        const items = Array.isArray(value) ? value : [];
        const itemType = prop.options?.itemType || 'string';
        const minItems = prop.options?.minItems || 0;
        const maxItems = prop.options?.maxItems || 999;

        let itemsHtml = '';
        items.forEach((item, index) => {
            itemsHtml += `
            <div class="array-item" data-index="${index}">
                <div class="array-item-content">
                    <span class="array-index">${index}</span>
                    ${this.generateArrayItemInput(prop, module, item, index, itemType)}
                    <button class="remove-array-item" data-index="${index}" ${items.length <= minItems ? 'disabled' : ''}>
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
        });

        return `
        <div class="property-row array-property">
            <div class="array-header">
                <label>${this.formatPropertyName(prop.name)} (${items.length})</label>
                <button class="add-array-item" data-prop-name="${prop.name}" ${items.length >= maxItems ? 'disabled' : ''}>
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <div class="array-items" id="${arrayId}">
                ${itemsHtml}
            </div>
        </div>
    `;
    }

    /**
     * Generate input for array item
     */
    generateArrayItemInput(prop, module, item, index, itemType) {
        const inputId = `array-item-${module.id}-${prop.name}-${index}`;

        switch (itemType) {
            case 'number':
                return `<input type="number" class="array-item-input" data-prop-name="${prop.name}" data-index="${index}" value="${item || 0}">`;
            case 'boolean':
                return `<input type="checkbox" class="array-item-input" data-prop-name="${prop.name}" data-index="${index}" ${item ? 'checked' : ''}>`;
            case 'color':
                return `<input type="color" class="array-item-input" data-prop-name="${prop.name}" data-index="${index}" value="${item || '#ffffff'}">`;
            default:
                return `<input type="text" class="array-item-input" data-prop-name="${prop.name}" data-index="${index}" value="${item || ''}">`;
        }
    }

    /**
     * Generate UI for object properties
     */
    generateObjectUI(prop, module, value) {
        const objId = `object-${module.id}-${prop.name}`;
        const obj = value || {};
        const schema = prop.options?.schema || {};

        let fieldsHtml = '';
        for (const [key, fieldDef] of Object.entries(schema)) {
            const fieldValue = obj[key];
            const fieldType = fieldDef.type || 'string';

            fieldsHtml += `
            <div class="object-field">
                <label>${this.formatPropertyName(key)}</label>
                ${this.generateObjectFieldInput(prop, module, key, fieldValue, fieldType)}
            </div>
        `;
        }

        return `
        <div class="property-row object-property">
            <div class="object-header">
                <label>${this.formatPropertyName(prop.name)}</label>
            </div>
            <div class="object-fields" id="${objId}">
                ${fieldsHtml}
            </div>
        </div>
    `;
    }

    /**
     * Generate input for object field
     */
    generateObjectFieldInput(prop, module, key, value, fieldType) {
        const inputId = `object-field-${module.id}-${prop.name}-${key}`;

        switch (fieldType) {
            case 'number':
                return `<input type="number" class="object-field-input" data-prop-name="${prop.name}" data-field="${key}" value="${value || 0}">`;
            case 'boolean':
                return `<input type="checkbox" class="object-field-input" data-prop-name="${prop.name}" data-field="${key}" ${value ? 'checked' : ''}>`;
            case 'color':
                return `<input type="color" class="object-field-input" data-prop-name="${prop.name}" data-field="${key}" value="${value || '#ffffff'}">`;
            default:
                return `<input type="text" class="object-field-input" data-prop-name="${prop.name}" data-field="${key}" value="${value || ''}">`;
        }
    }

    /**
     * Generate UI for curve properties (simplified curve editor)
     */
    generateCurveUI(prop, module, value) {
        const curveId = `curve-${module.id}-${prop.name}`;

        return `
        <div class="property-row curve-property">
            <label>${this.formatPropertyName(prop.name)}</label>
            <div class="curve-editor" id="${curveId}" data-prop-name="${prop.name}">
                <canvas class="curve-canvas" width="200" height="100"></canvas>
                <div class="curve-controls">
                    <button class="curve-preset" data-preset="linear">Linear</button>
                    <button class="curve-preset" data-preset="ease">Ease</button>
                    <button class="curve-preset" data-preset="bounce">Bounce</button>
                </div>
            </div>
        </div>
    `;
    }

    /**
     * Generate UI for gradient properties
     */
    generateGradientUI(prop, module, value) {
        const gradientId = `gradient-${module.id}-${prop.name}`;

        return `
        <div class="property-row gradient-property">
            <label>${this.formatPropertyName(prop.name)}</label>
            <div class="gradient-editor" id="${gradientId}" data-prop-name="${prop.name}">
                <div class="gradient-preview"></div>
                <div class="gradient-stops">
                    <div class="gradient-stop" data-position="0">
                        <input type="color" value="#000000">
                        <span>0%</span>
                    </div>
                    <div class="gradient-stop" data-position="100">
                        <input type="color" value="#ffffff">
                        <span>100%</span>
                    </div>
                </div>
                <button class="add-gradient-stop">
                    <i class="fas fa-plus"></i> Add Stop
                </button>
            </div>
        </div>
    `;
    }

    /**
     * Generate UI for code properties
     */
    generateCodeUI(prop, module, value) {
        const codeId = `code-${module.id}-${prop.name}`;
        const currentCode = value || prop.options?.defaultCode || '// Enter your JavaScript code here\n// Available variables:\n// - this: the module instance\n// - gameObject: the attached game object\n// - engine: the game engine\n// - input: input manager\n// - deltaTime: time since last frame\n\nconsole.log("Code executed!");';

        return `
        <div class="property-row code-property">
            <label>${this.formatPropertyName(prop.name)}</label>
            <div class="code-editor-container" id="${codeId}" data-prop-name="${prop.name}">
                <div class="code-editor-toolbar">
                    <button class="code-format-btn" title="Format Code">
                        <i class="fas fa-code"></i>
                    </button>
                    <button class="code-run-btn" title="Test Run Code">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="code-clear-btn" title="Clear Code">
                        <i class="fas fa-trash"></i>
                    </button>
                    <div class="code-status"></div>
                </div>
                <div class="code-editor-wrapper">
                    <textarea class="code-editor-textarea"
                              placeholder="Enter your JavaScript code here..."
                              spellcheck="false">${currentCode}</textarea>
                </div>
                <div class="code-help">
                    <details>
                        <summary>Available Variables & Context</summary>
                        <div class="code-help-content">
                            <strong>Available in your code:</strong>
                            <ul>
                                <li><code>this</code> - The module instance</li>
                                <li><code>gameObject</code> - The GameObject this module is attached to</li>
                                <li><code>engine</code> - The game engine</li>
                                <li><code>input</code> - Input manager</li>
                                <li><code>deltaTime</code> - Time since last frame</li>
                                <li><code>module</code> - Alias for 'this'</li>
                            </ul>
                            <strong>Examples:</strong>
                            <pre>gameObject.position.x += 100 * deltaTime;
this.someProperty = "modified";
console.log("Module name:", this.name);</pre>
                        </div>
                    </details>
                </div>
            </div>
        </div>
        `;
    }

    /**
     * Render a collapsible list editor for a polygon (Vector2[]) property
     */
    generatePolygonUI(prop, module) {
        const id = `prop-${module.id}-${prop.name}`;
        const verts = module[prop.name] || [];
        const min = prop.options?.minItems || 3;
        const collapsed = this.getVectorCollapseState(id) ?? true;

        // List header + controls
        let html = `
        <div class="property-row polygon-property">
        <label>${this.formatPropertyName(prop.name)}</label>
        <button class="vector-collapse" data-target="${id}" data-vector-id="${id}" title="${collapsed ? 'Expand' : 'Collapse'}">
            <i class="fas ${collapsed ? 'fa-chevron-down' : 'fa-chevron-up'}"></i>
        </button>
        </div>
        <div class="vector-components" id="${id}" style="${collapsed ? 'display:none' : ''}">`;

        verts.forEach((v, i) => {
            html += `
        <div class="vector-component">
            <label>${i + 1}</label>
            <input type="number" class="component-input" data-prop-name="${prop.name}" data-component="${i}:x" value="${v.x}" step="1">
            <input type="number" class="component-input" data-prop-name="${prop.name}" data-component="${i}:y" value="${v.y}" step="1">
            <button class="remove-vertex" data-index="${i}" data-prop-name="${prop.name}" ${verts.length <= min ? 'disabled' : ''}>×</button>
        </div>`;
        });

        html += `
        <button class="add-vertex" data-prop-name="${prop.name}">
            <i class="fas fa-plus"></i> Add Point
        </button>
        </div>`;

        return html;
    }

    inspectMultipleObjects(objects) {
        // Hide object header and modules
        this.noObjectMessage.style.display = 'none';
        this.objectHeader.style.display = 'none';
        this.modulesList.innerHTML = `
            <div class="multiple-selection-message">
                <i class="fas fa-object-group"></i>
                <h3>${objects.length} objects selected</h3>
                <p>Multi-object editing is not yet supported.<br>
                You can move, duplicate, or delete all selected objects.</p>
            </div>
        `;
        // Optionally, add batch actions here
    }

    /**
     * Populate the dropdown with available modules, structured as a hierarchical tree.
     */
    populateModuleDropdown() {
        this.moduleDropdown.innerHTML = ''; // Clear previous content

        // --- Add search box at the top ---
        const searchContainer = document.createElement('div');
        searchContainer.style.padding = '8px';
        searchContainer.style.background = '#23272b';
        searchContainer.style.borderBottom = '1px solid #444';
        searchContainer.className = 'module-dropdown-search-sticky';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search modules...';
        searchInput.style.width = '100%';
        searchInput.style.padding = '6px 10px';
        searchInput.style.borderRadius = '4px';
        searchInput.style.border = '1px solid #444';
        searchInput.style.background = '#23272b';
        searchInput.style.color = '#e0e6f0';
        searchInput.style.fontSize = '1em';

        searchContainer.appendChild(searchInput);
        this.moduleDropdown.appendChild(searchContainer);

        // --- Create a container for the modules list ---
        const modulesListContainer = document.createElement('div');
        modulesListContainer.className = 'module-dropdown-list';
        this.moduleDropdown.appendChild(modulesListContainer);

        // --- Filtering logic ---
        let filterText = '';
        searchInput.addEventListener('input', () => {
            filterText = searchInput.value.trim().toLowerCase();
            renderFilteredModules();
        });

        // --- Render modules with filter ---
        const renderFilteredModules = () => {
            modulesListContainer.innerHTML = ''; // Only clear the modules list

            // Filter modules by name or description
            let filteredModules = this.availableModules;
            if (filterText) {
                filteredModules = filteredModules.filter(m =>
                    m.moduleClass.name.toLowerCase().includes(filterText) ||
                    (m.moduleClass.description && m.moduleClass.description.toLowerCase().includes(filterText))
                );
            }

            if (filteredModules.length === 0) {
                const message = document.createElement('div');
                message.className = 'dropdown-message';
                message.textContent = 'No modules found';
                modulesListContainer.appendChild(message);
                return;
            }

            // Group by namespace
            const namespaceTree = {};
            const generalModules = [];
            filteredModules.forEach(moduleInfo => {
                const namespace = moduleInfo.namespace;
                const moduleClass = moduleInfo.moduleClass;
                if (!namespace || namespace.toLowerCase() === 'general') {
                    generalModules.push(moduleClass);
                    return;
                }
                const parts = namespace.split('/');
                let currentLevel = namespaceTree;
                parts.forEach(part => {
                    if (!currentLevel[part]) {
                        currentLevel[part] = { _children: {}, _modules: [] };
                    }
                    currentLevel = currentLevel[part];
                });
                currentLevel._modules.push(moduleClass);
            });

            // Render tree (same as before)
            const renderNode = (node, parentElement, level, pathPrefix = '') => {
                const folderNames = Object.keys(node._children || {}).sort();
                folderNames.forEach(folderName => {
                    const currentPath = pathPrefix ? `${pathPrefix}/${folderName}` : folderName;
                    const folderElement = document.createElement('div');
                    folderElement.className = 'module-dropdown-folder';
                    folderElement.style.paddingLeft = `${level * 15}px`;

                    const header = document.createElement('div');
                    header.className = 'module-dropdown-folder-header';

                    const icon = document.createElement('i');
                    const isCollapsed = this.getFolderCollapseState(currentPath);
                    icon.className = `fas ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-down'}`;

                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = folderName;

                    header.appendChild(icon);
                    header.appendChild(nameSpan);
                    folderElement.appendChild(header);

                    const content = document.createElement('div');
                    content.className = 'module-dropdown-folder-content';
                    if (isCollapsed) {
                        content.style.display = 'none';
                    }
                    folderElement.appendChild(content);
                    parentElement.appendChild(folderElement);

                    /*header.addEventListener('click', () => {
                        const currentlyCollapsed = content.style.display === 'none';
                        content.style.display = currentlyCollapsed ? 'block' : 'none';
                        icon.className = `fas ${currentlyCollapsed ? 'fa-chevron-down' : 'fa-chevron-right'}`;
                        this.saveFolderCollapseState(currentPath, !currentlyCollapsed);
                    });*/

                    const handleFolderToggle = () => {
                        const currentlyCollapsed = content.style.display === 'none';
                        content.style.display = currentlyCollapsed ? 'block' : 'none';
                        icon.className = `fas ${currentlyCollapsed ? 'fa-chevron-down' : 'fa-chevron-right'}`;
                        this.saveFolderCollapseState(currentPath, !currentlyCollapsed);
                    };

                    header.addEventListener('click', handleFolderToggle);
                    header.addEventListener('touchend', (e) => {
                        e.preventDefault();
                        handleFolderToggle();
                    }, { passive: false });

                    renderNode(node._children[folderName], content, level + 1, currentPath);
                });

                (node._modules || []).sort((a, b) => a.name.localeCompare(b.name)).forEach(moduleClass => {
                    const item = document.createElement('div');
                    item.className = 'module-dropdown-item';
                    item.style.paddingLeft = `${(level * 15) + 15}px`;

                    // Get description if available
                    const description = moduleClass.description || '';
                    let iconHtml = '';
                    const iconClass = moduleClass.iconClass;
                    const iconColor = moduleClass.iconColor || '';
                    if (iconClass) {
                        if (iconClass.startsWith('fa-')) {
                            iconHtml = `<i class="fas ${iconClass}" style="margin-right:8px;${iconColor ? `color:${iconColor};` : ''}"></i>`;
                        } else {
                            iconHtml = `<i class="${iconClass}" style="margin-right:8px;${iconColor ? `color:${iconColor};` : ''}"></i>`;
                        }
                    } else {
                        iconHtml = `<i class="fas fa-puzzle-piece" style="margin-right:8px;${iconColor ? `color:${iconColor};` : ''}"></i>`;
                    }
                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'module-dropdown-item-name';
                    nameSpan.textContent = moduleClass.name;
                    item.innerHTML = `${iconHtml}`;
                    item.appendChild(nameSpan);
                    if (description) {
                        const descSpan = document.createElement('span');
                        descSpan.className = 'module-dropdown-item-description';
                        descSpan.textContent = description;
                        descSpan.style.display = 'none';
                        item.appendChild(descSpan);
                        item.addEventListener('mouseenter', () => {
                            descSpan.style.display = 'block';
                        });
                        item.addEventListener('mouseleave', () => {
                            descSpan.style.display = 'none';
                        });
                    }
                    /*item.addEventListener('click', () => {
                        const module = this.addModuleToGameObject(moduleClass);
                        if (module) {
                            this.moduleDropdown.style.display = 'none';
                        }
                    });*/

                    const handleModuleSelect = () => {
                        const module = this.addModuleToGameObject(moduleClass);
                        if (module) {
                            this.moduleDropdown.style.display = 'none';
                        }
                    };

                    item.addEventListener('click', handleModuleSelect);
                    item.addEventListener('touchend', (e) => {
                        e.preventDefault();
                        handleModuleSelect();
                    }, { passive: false });
                    parentElement.appendChild(item);
                });
            };

            const rootNodeForRendering = { _children: namespaceTree, _modules: [] };
            renderNode(rootNodeForRendering, modulesListContainer, 0);

            // General modules
            if (generalModules.length > 0) {
                if (Object.keys(namespaceTree).length > 0 && generalModules.length > 0) {
                    const separator = document.createElement('hr');
                    separator.className = 'module-dropdown-separator';
                    modulesListContainer.appendChild(separator);
                }
                const generalHeader = document.createElement('div');
                generalHeader.className = 'module-dropdown-namespace';
                generalHeader.textContent = 'General';
                generalHeader.style.paddingLeft = `5px`;
                modulesListContainer.appendChild(generalHeader);

                generalModules.sort((a, b) => a.name.localeCompare(b.name)).forEach(moduleClass => {
                    const item = document.createElement('div');
                    item.className = 'module-dropdown-item';
                    item.textContent = moduleClass.name;
                    item.style.paddingLeft = `20px`;
                    item.addEventListener('click', () => {
                        const module = this.addModuleToGameObject(moduleClass);
                        if (module) {
                            this.moduleDropdown.style.display = 'none';
                        }
                    });
                    modulesListContainer.appendChild(item);
                });
            }
        };

        // Initial render
        renderFilteredModules();
    }

    saveFolderCollapseState(folderPath, isCollapsed) {
        try {
            let states = JSON.parse(localStorage.getItem('moduleFolderCollapseStates') || '{}');
            states[folderPath] = isCollapsed;
            localStorage.setItem('moduleFolderCollapseStates', JSON.stringify(states));
        } catch (e) {
            console.warn('Failed to save folder collapse state:', e);
        }
    }

    getFolderCollapseState(folderPath) {
        try {
            const states = JSON.parse(localStorage.getItem('moduleFolderCollapseStates') || '{}');
            return states[folderPath] === undefined ? true : states[folderPath]; // Default to collapsed
        } catch (e) {
            console.warn('Failed to get folder collapse state:', e);
            return true; // Default to collapsed on error
        }
    }

    /**
     * Generate UI for Vector2 or Vector3 properties
     * @param {Object} prop - Property descriptor
     * @param {Module} module - The module the property belongs to
     * @param {Vector2|Vector3} vector - The vector value
     * @returns {string} HTML for the vector UI
     */
    generateVectorUI(prop, module, vector) {
        const propName = prop.name;
        const collapsibleId = `vector-${module.id}-${propName}`;
        const isCollapsed = this.getVectorCollapseState(collapsibleId);
        const isVector3 = vector.z !== undefined;

        // Get tooltip from options if available
        const tooltip = prop.options?.description || `${this.formatPropertyName(propName)}`;

        // Get custom styles
        const rowStyle = prop.options?.rowStyle || '';
        const headerStyle = prop.options?.headerStyle || '';
        const componentStyle = prop.options?.componentStyle || prop.options?.inputStyle || prop.options?.style || '';
        const labelStyle = prop.options?.labelStyle || '';

        return `
    <div class="property-row vector-property" style="${rowStyle}">
        <div class="vector-header" style="${headerStyle}">
            <label title="${tooltip}" style="${labelStyle}">${this.formatPropertyName(propName)}</label>
            <div class="vector-preview">
                (${vector.x.toFixed(1)}, ${vector.y.toFixed(1)}${isVector3 ? `, ${vector.z.toFixed(1)}` : ''})
            </div>
            <button class="vector-collapse"
                    data-target="${collapsibleId}"
                    data-vector-id="${collapsibleId}"
                    title="${isCollapsed ? 'Expand' : 'Collapse'}">
                <i class="fas ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}"></i>
            </button>
        </div>
        <div class="vector-components" id="${collapsibleId}" style="display:${isCollapsed ? 'none' : 'flex'}; flex-direction:row;">
            <div class="vector-component">
                <label title="X coordinate">X</label>
                <input type="number" class="component-input"
                    data-prop-name="${propName}"
                    data-component="x"
                    value="${vector.x}" step="1"
                    title="${tooltip} (X coordinate)"
                    style="${componentStyle}">
            </div>
            <div class="vector-component">
                <label title="Y coordinate">Y</label>
                <input type="number" class="component-input"
                    data-prop-name="${propName}"
                    data-component="y"
                    value="${vector.y}" step="1"
                    title="${tooltip} (Y coordinate)"
                    style="${componentStyle}">
            </div>
            ${isVector3 ? `
            <div class="vector-component">
                <label title="Z coordinate">Z</label>
                <input type="number" class="component-input"
                    data-prop-name="${propName}"
                    data-component="z"
                    value="${vector.z}" step="1"
                    title="${tooltip} (Z coordinate)"
                    style="${componentStyle}">
            </div>` : ''}
        </div>
    </div>
    `;
    }

    /**
     * Format a property name for display (camelCase to Title Case)
     * @param {string} name - Property name
     * @returns {string} Formatted name
     */
    formatPropertyName(name) {
        // Handle non-string inputs
        if (typeof name !== 'string') {
            if (name && typeof name === 'object' && name.label) {
                return name.label; // Use label from object
            }
            if (name && typeof name === 'object' && name.value !== undefined) {
                return String(name.value); // Use value from object
            }
            return String(name); // Convert to string as fallback
        }

        return name
            .replace(/([A-Z])/g, ' $1') // Add space before capital letters
            .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
    }

    /**
     * Save the collapse state of a vector property
     * @param {string} vectorId - The vector's unique identifier
     * @param {boolean} isCollapsed - Whether the vector is collapsed
     */
    saveVectorCollapseState(vectorId, isCollapsed) {
        try {
            // Get existing states from localStorage
            let collapseStates = {};
            const savedStates = localStorage.getItem('vectorCollapseStates');
            if (savedStates) {
                collapseStates = JSON.parse(savedStates);
            }

            // Update state for this vector
            collapseStates[vectorId] = isCollapsed;

            // Save back to localStorage
            localStorage.setItem('vectorCollapseStates', JSON.stringify(collapseStates));
        } catch (e) {
            console.warn('Failed to save vector collapse state:', e);
        }
    }

    /**
     * Get the collapse state of a vector property
     * @param {string} vectorId - The vector's unique identifier
     * @returns {boolean} Whether the vector should be collapsed
     */
    getVectorCollapseState(vectorId) {
        try {
            // Get states from localStorage
            const savedStates = localStorage.getItem('vectorCollapseStates');
            if (savedStates) {
                const collapseStates = JSON.parse(savedStates);
                // Use nullish coalescing to default to true (collapsed) if undefined
                return collapseStates[vectorId] ?? true;
            }
        } catch (e) {
            console.warn('Failed to get vector collapse state:', e);
        }
        return true; // Default to collapsed
    }

    /**
     * Setup event listeners for module properties
     * @param {HTMLElement} container - Module container element
     * @param {Module} module - Module instance
     */
    setupModulePropertyListeners(container, module) {
        console.log("Setting up module property listeners for:", module.type, module);

        // Define the update function outside the event handlers for consistent use
        const updateGameObject = () => {
            if (this.editor && this.editor.refreshCanvas) {
                this.editor.refreshCanvas();
            }
        };

        // Helper function to add both mouse and touch event listeners
        const addClickListener = (element, handler) => {
            element.addEventListener('click', handler);
            element.addEventListener('touchend', (e) => {
                e.preventDefault();
                handler(e);
            }, { passive: false });
        };

        // Helper function to add input listeners that work on touch devices
        const addInputListener = (input, handler) => {
            input.addEventListener('input', handler);
            input.addEventListener('change', handler);

            // For touch devices, also listen to blur to catch final values
            input.addEventListener('blur', handler);
        };

        // Prefab drop targets - NEW FUNCTIONALITY
        container.querySelectorAll('input[type="text"]').forEach(input => {
            const propName = input.dataset.propName;
            if (propName && (propName.toLowerCase().includes('prefab') || propName.toLowerCase().includes('asset'))) {
                this.setupPrefabDropTarget(input, module, propName);
            }
        });

        // Image drop targets - Updated to handle both data attributes
        container.querySelectorAll('[data-property-type="image"], [data-asset-type="image"], .image-drop-target').forEach(element => {
            this.setupImageDropTarget(element, module);
        });

        // Asset selector handling
        container.querySelectorAll('.asset-selector-container').forEach(assetContainer => {
            const propName = assetContainer.dataset.propName;
            const assetType = assetContainer.dataset.assetType;
            const selectBtn = assetContainer.querySelector('.select-btn');
            const clearBtn = assetContainer.querySelector('.clear-btn');
            const dropdown = assetContainer.querySelector('.asset-dropdown');
            const preview = assetContainer.querySelector('.asset-preview');

            // Setup drag and drop
            if (preview) {
                this.setupAssetDropTarget(preview, module, propName, assetType);
            }

            // Select button
            if (selectBtn) {
                selectBtn.addEventListener('click', () => {
                    this.showAssetSelector(module, propName, assetType);
                });
            }

            // Clear button
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    this.clearAssetProperty(module, propName);
                    this.refreshModuleUI(module);
                    this.editor?.refreshCanvas();
                });
            }

            // Dropdown selection
            if (dropdown) {
                dropdown.addEventListener('change', (e) => {
                    if (e.target.value) {
                        this.setAssetProperty(module, propName, e.target.value);
                        this.refreshModuleUI(module);
                        this.editor?.refreshCanvas();
                    }
                });
            }
        });

        // Set up select and clear buttons for image assets
        container.querySelectorAll('.image-drop-target').forEach(dropTarget => {
            const propName = dropTarget.dataset.propName;
            const selectBtn = dropTarget.querySelector('.select-btn');
            const clearBtn = dropTarget.querySelector('.clear-btn');

            if (selectBtn) {
                selectBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showImageSelector(module, propName);
                });
            }

            if (clearBtn) {
                clearBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Clear the image
                    if (typeof module.setProperty === 'function') {
                        module.setProperty(propName, null);
                    } else {
                        module[propName] = null;
                    }

                    // Update UI
                    this.refreshModuleUI(module);
                    updateGameObject();
                });
            }
        });

        // Handle keys/keycode dropdowns
        container.querySelectorAll('.property-input[data-prop-name]').forEach(input => {
            if ((input.dataset.propName === 'keys' || input.dataset.propName === 'keycode')) {
                input.addEventListener('change', () => {
                    const propName = input.dataset.propName;
                    const value = input.value;
                    this.updateModuleProperty(module, propName, value);
                    if (typeof module.style === 'function') {
                        this.refreshModuleUI(module);
                    }
                    if (this.editor && this.editor.refreshCanvas) {
                        this.editor.refreshCanvas();
                    }
                });
            }
        });

        // GameObject drop targets
        container.querySelectorAll('.gameobject-field').forEach(element => {
            this.setupGameObjectDropTarget(element, module);
        });

        // SpriteRenderer special handlers
        if (module instanceof SpriteRenderer) {
            this.setupSpriteRendererListeners(container, module);
        }

        // Collapse toggle for ANY vector block
        container.querySelectorAll('.vector-collapse').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const targetId = btn.dataset.target;
                const tgt = document.getElementById(targetId);

                if (!tgt) {
                    console.error(`Target element not found: ${targetId}`);
                    return;
                }

                const collapsed = tgt.style.display === 'none';
                console.log(`Toggling vector collapse for ${targetId}: was ${collapsed ? 'collapsed' : 'expanded'}`);

                // Toggle display
                tgt.style.display = collapsed ? 'block' : 'none';

                // Update icon
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.className = `fas ${collapsed ? 'fa-chevron-up' : 'fa-chevron-down'}`;
                }
                btn.title = collapsed ? 'Collapse' : 'Expand';

                // Save state
                this.saveVectorCollapseState(btn.dataset.vectorId, !collapsed);
            });
        });

        // Handle button clicks
        container.querySelectorAll('.property-button, .property-btn').forEach(button => {
            button.addEventListener('click', () => {
                const buttonId = button.id;
                const propName = button.dataset.propName || buttonId;

                // Look for the onClick handler in the module's exposed properties
                if (module.getExposedProperties) {
                    const exposedProps = module.getExposedProperties();
                    const buttonProp = exposedProps.find(prop =>
                        prop.name === propName ||
                        prop.name === buttonId ||
                        (prop.type === 'button' && prop.label === button.textContent)
                    );

                    if (buttonProp && buttonProp.options && buttonProp.options.onClick) {
                        try {
                            buttonProp.options.onClick();
                        } catch (error) {
                            console.error('Error executing button onClick handler:', error);
                        }
                    }
                }

                // Also check for style-based buttons
                if (module._styleButtonHandlers && module._styleButtonHandlers[buttonId]) {
                    try {
                        module._styleButtonHandlers[buttonId]();
                    } catch (error) {
                        console.error('Error executing style button handler:', error);
                    }
                }
            });
        });

        // Add Point button for polygon properties
        container.querySelectorAll('.add-vertex').forEach(button => {
            button.addEventListener('click', () => {
                const propName = button.dataset.propName;
                if (!propName || !module[propName]) return;

                // Get the polygon
                const polygon = module[propName];

                // Calculate a new vertex position
                const len = polygon.length;
                let newVertex;

                if (len >= 2) {
                    const last = polygon[len - 1];
                    const secondLast = polygon[len - 2];

                    const dx = last.x - secondLast.x;
                    const dy = last.y - secondLast.y;

                    const length = Math.sqrt(dx * dx + dy * dy);
                    const scale = 30; // Distance from last vertex

                    if (length > 0) {
                        newVertex = new Vector2(
                            last.x + (dx / length) * scale,
                            last.y + (dy / length) * scale
                        );
                    } else {
                        newVertex = new Vector2(last.x + 30, last.y);
                    }
                } else if (len === 1) {
                    newVertex = new Vector2(polygon[0].x + 30, polygon[0].y);
                } else {
                    newVertex = new Vector2(0, 0);
                }

                // Add the new vertex
                if (typeof module.addVertex === 'function') {
                    module.addVertex(newVertex);
                } else {
                    polygon.push(newVertex);

                    // If there's no addVertex method, we need to update the property manually
                    if (typeof module.setProperty === 'function') {
                        module.setProperty(propName, polygon);
                    }
                }

                // Refresh UI and update
                this.refreshModuleUI(module);
                updateGameObject();
            });
        });

        // Remove vertex button for polygon properties
        container.querySelectorAll('.remove-vertex').forEach(button => {
            button.addEventListener('click', () => {
                const index = parseInt(button.dataset.index);
                const propName = button.dataset.propName;

                if (isNaN(index) || !propName || !module[propName]) return;

                const polygon = module[propName];

                if (polygon.length <= 3) {
                    console.warn('Cannot remove vertex: polygon must have at least 3 vertices');
                    return;
                }

                // Remove the vertex
                if (typeof module.removeVertex === 'function') {
                    module.removeVertex(index);
                } else {
                    polygon.splice(index, 1);

                    // If there's no removeVertex method, update property manually
                    if (typeof module.setProperty === 'function') {
                        module.setProperty(propName, polygon);
                    }
                }

                // Refresh UI and update
                this.refreshModuleUI(module);
                updateGameObject();
            });
        });

        // Unified handler for vector components (Vector2/3 & polygon)
        container.querySelectorAll('.component-input').forEach(input => {
            input.addEventListener('change', () => {
                const propName = input.dataset.propName;
                const component = input.dataset.component;
                const raw = parseFloat(input.value) || 0;

                let current = typeof module.getProperty === 'function'
                    ? module.getProperty(propName)
                    : module[propName];

                // Ensure we have a valid object to modify
                if (!current) {
                    console.warn(`Property ${propName} is undefined on module`, module);
                    return;
                }

                console.log(`Updating vector component: ${propName}.${component} = ${raw}`);

                if (Array.isArray(current)) {
                    const [i, key] = component.split(':');
                    current[+i][key] = raw;
                } else {
                    current[component] = raw;
                }

                // Try different ways to update the property
                if (typeof module.setProperty === 'function') {
                    module.setProperty(propName, current);
                } else {
                    module[propName] = current;
                }

                if (typeof module.style === 'function') {
                    this.refreshModuleUI(module);
                }

                // Force immediate update
                updateGameObject();

                // Also update any preview displays in the UI
                const previewEl = container.querySelector(`[data-target="${input.closest('.vector-components').id}"] .vector-preview`);
                if (previewEl && current) {
                    // Format based on vector type
                    if ('z' in current) {
                        previewEl.textContent = `(${current.x.toFixed(1)}, ${current.y.toFixed(1)}, ${current.z.toFixed(1)})`;
                    } else {
                        previewEl.textContent = `(${current.x.toFixed(1)}, ${current.y.toFixed(1)})`;
                    }
                }
            });
        });

        // Handle checkboxes
        container.querySelectorAll('.property-input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const propName = checkbox.dataset.propName;
                const value = checkbox.checked;

                console.log(`Checkbox changed: ${propName} = ${value}`);

                if (typeof module.setProperty === 'function') {
                    module.setProperty(propName, value);
                } else if (propName in module) {
                    module[propName] = value;
                } else if (module.properties) {
                    module.properties[propName] = value;
                }

                if (typeof module.style === 'function') {
                    this.refreshModuleUI(module);
                }

                // IMPORTANT: Update game object for immediate effect
                updateGameObject();
            });
        });

        // Range/Slider inputs
        container.querySelectorAll('.property-range').forEach(range => {
            const valueDisplay = range.parentElement.querySelector('.range-value');

            range.addEventListener('input', () => {
                if (valueDisplay) {
                    valueDisplay.textContent = range.value;
                }
                this.updateModuleProperty(module, range.dataset.propName, parseFloat(range.value));
                updateGameObject();
                if (typeof module.style === 'function') {
                    this.refreshModuleUI(module);
                }
            });
        });

        // Toggle switches
        container.querySelectorAll('.toggle-switch input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateModuleProperty(module, checkbox.dataset.propName, checkbox.checked);
                updateGameObject();
                if (typeof module.style === 'function') {
                    this.refreshModuleUI(module);
                }
            });
        });

        // Handle color inputs
        container.querySelectorAll('.property-input[type="color"]').forEach(colorInput => {
            colorInput.addEventListener('input', () => {
                const propName = colorInput.dataset.propName;
                const value = colorInput.value;

                console.log(`Color changed: ${propName} = ${value}`);

                if (typeof module.setProperty === 'function') {
                    module.setProperty(propName, value);
                } else if (propName in module) {
                    module[propName] = value;
                } else if (module.properties) {
                    module.properties[propName] = value;
                }

                // Update game object for live preview
                updateGameObject();
            });

            // Also handle change event for final value
            colorInput.addEventListener('change', () => {
                updateGameObject();
            });
        });

        // Color inputs (enhanced)
        container.querySelectorAll('.color-input-group').forEach(group => {
            const colorPicker = group.querySelector('.color-picker');
            const textInput = group.querySelector('.color-text-input');

            if (colorPicker && textInput) {
                colorPicker.addEventListener('input', () => {
                    textInput.value = colorPicker.value;
                    this.updateModuleProperty(module, colorPicker.dataset.propName, colorPicker.value);
                    updateGameObject();
                });

                textInput.addEventListener('change', () => {
                    if (/^#[0-9A-Fa-f]{6}$/.test(textInput.value)) {
                        colorPicker.value = textInput.value;
                        this.updateModuleProperty(module, colorPicker.dataset.propName, textInput.value);
                        updateGameObject();
                    } else {
                        textInput.value = colorPicker.value; // Reset to valid value
                    }
                });
            }
        });

        // Generic number/text/select inputs
        container.querySelectorAll('.property-input:not([type="checkbox"]):not([type="color"])').forEach(input => {
            input.addEventListener('change', () => {
                const propName = input.dataset.propName;
                let value;

                if (input.type === 'number') {
                    value = parseFloat(input.value);
                    if (isNaN(value)) value = 0;
                } else {
                    value = input.value;
                }

                console.log(`Property changed: ${propName} = ${value}`);

                if (typeof module.setProperty === 'function') {
                    module.setProperty(propName, value);
                } else if (propName in module) {
                    module[propName] = value;
                } else if (module.properties) {
                    module.properties[propName] = value;
                }

                if (typeof module.style === 'function') {
                    this.refreshModuleUI(module);
                }

                // IMPORTANT: Update game object for immediate effect
                updateGameObject();
            });

            // For text inputs, update the title to show full text on hover
            if (input.type === 'text') {
                input.addEventListener('input', () => {
                    input.title = input.value;
                });
            }
        });

        container.querySelectorAll('.property-button, .property-btn').forEach(button => {
            button.addEventListener('click', () => {
                const propName = button.dataset.propName;
                const btnId = button.dataset.btnId;

                // Call the module's button handler if it exists
                if (typeof module.onButtonClick === 'function') {
                    module.onButtonClick(propName, btnId);
                }

                // Look for specific handler method
                const handlerName = `on${propName.charAt(0).toUpperCase()}${propName.slice(1)}Click`;
                if (typeof module[handlerName] === 'function') {
                    module[handlerName]();
                }

                updateGameObject();
            });
        });

        // File inputs
        container.querySelectorAll('.file-input-container').forEach(fileContainer => {
            const fileInput = fileContainer.querySelector('.hidden-file-input');
            const selectBtn = fileContainer.querySelector('.select-btn');
            const clearBtn = fileContainer.querySelector('.clear-btn');
            const preview = fileContainer.querySelector('.file-preview');

            selectBtn?.addEventListener('click', () => {
                fileInput?.click();
            });

            fileInput?.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    const file = e.target.files[0];
                    this.handleFileSelection(fileContainer, module, file);
                }
            });

            clearBtn?.addEventListener('click', () => {
                this.clearFileSelection(fileContainer, module);
            });

            // File drop support
            this.setupFileDropTarget(preview, fileContainer, module);
        });

        // Array controls
        container.querySelectorAll('.add-array-item').forEach(button => {
            button.addEventListener('click', () => {
                this.addArrayItem(button.dataset.propName, module, container);
            });
        });

        container.querySelectorAll('.remove-array-item').forEach(button => {
            button.addEventListener('click', () => {
                this.removeArrayItem(button.dataset.propName, button.dataset.index, module, container);
            });
        });

        // Array item inputs
        container.querySelectorAll('.array-item-input').forEach(input => {
            input.addEventListener('change', () => {
                this.updateArrayItem(input.dataset.propName, input.dataset.index, input, module);
                updateGameObject();
            });
        });

        // Object field inputs
        container.querySelectorAll('.object-field-input').forEach(input => {
            input.addEventListener('change', () => {
                this.updateObjectField(input.dataset.propName, input.dataset.field, input, module);
                updateGameObject();
            });
        });
    }

    updateModuleValues(module) {
        if (!this.inspectedObject || !module) return;

        const moduleContainer = this.modulesList.querySelector(`.module-container[data-module-id="${module.id}"]`);
        if (!moduleContainer) return;

        // Update all property inputs
        moduleContainer.querySelectorAll('.property-input').forEach(input => {
            const propName = input.dataset.propName;
            if (!propName) return;

            let value = typeof module.getProperty === 'function'
                ? module.getProperty(propName)
                : module[propName];

            if (input.type === 'checkbox') {
                input.checked = !!value;
            } else if (input.type === 'color') {
                input.value = value || '#ffffff';
            } else if (input.type === 'number') {
                input.value = value || 0;
            } else {
                input.value = value || '';
            }
        });

        // Update vector component inputs and previews
        moduleContainer.querySelectorAll('.component-input').forEach(input => {
            const propName = input.dataset.propName;
            const component = input.dataset.component;

            let current = typeof module.getProperty === 'function'
                ? module.getProperty(propName)
                : module[propName];

            if (!current) return;

            if (Array.isArray(current)) {
                const [i, key] = component.split(':');
                input.value = current[+i]?.[key] ?? 0;
            } else {
                input.value = current[component] ?? 0;
            }
        });

        // Update vector previews
        moduleContainer.querySelectorAll('.vector-preview').forEach(preview => {
            const collapseBtn = preview.closest('.vector-header')?.querySelector('.vector-collapse');
            if (!collapseBtn) return;

            const targetId = collapseBtn.dataset.target;
            const vectorComponents = document.getElementById(targetId);
            if (!vectorComponents) return;

            const firstInput = vectorComponents.querySelector('.component-input');
            if (!firstInput) return;

            const propName = firstInput.dataset.propName;
            let current = typeof module.getProperty === 'function'
                ? module.getProperty(propName)
                : module[propName];

            if (!current) return;

            // Format based on vector type
            if ('z' in current) {
                preview.textContent = `(${current.x.toFixed(1)}, ${current.y.toFixed(1)}, ${current.z.toFixed(1)})`;
            } else {
                preview.textContent = `(${current.x.toFixed(1)}, ${current.y.toFixed(1)})`;
            }
        });
    }

    /**
 * Setup prefab drop target for text inputs
 */
    setupPrefabDropTarget(input, module, propName) {
        // Visual feedback for drop targets
        input.style.position = 'relative';

        input.addEventListener('dragover', (e) => {
            if (this.isPrefabDragEvent(e.dataTransfer)) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                input.style.backgroundColor = 'rgba(0, 120, 215, 0.2)';
                input.style.borderColor = '#0078D7';
            }
        });

        input.addEventListener('dragleave', () => {
            input.style.backgroundColor = '';
            input.style.borderColor = '';
        });

        input.addEventListener('drop', async (e) => {
            if (this.isPrefabDragEvent(e.dataTransfer)) {
                e.preventDefault();
                input.style.backgroundColor = '';
                input.style.borderColor = '';

                try {
                    const prefabName = await this.getPrefabPathFromDropEvent(e.dataTransfer);
                    if (prefabName) {
                        // Validate the prefab exists using the engine's method
                        if (window.engine && window.engine.hasPrefab(prefabName)) {
                            input.value = prefabName;
                            this.updateModuleProperty(module, propName, prefabName);
                            this.editor?.refreshCanvas();

                            console.log(`Set prefab "${prefabName}" for property "${propName}"`);
                        } else {
                            console.error(`Prefab "${prefabName}" not found in available prefabs`);
                            input.style.backgroundColor = 'rgba(220, 53, 69, 0.2)';
                            setTimeout(() => {
                                input.style.backgroundColor = '';
                            }, 1000);
                        }
                    }
                } catch (error) {
                    console.error('Error handling prefab drop:', error);
                }
            }
        });
    }

    /**
     * Check if the drag event contains a prefab file
     */
    isPrefabDragEvent(dataTransfer) {
        // Check for files (from OS)
        if (dataTransfer.items && dataTransfer.items.length > 0) {
            for (let item of dataTransfer.items) {
                if (item.kind === 'file') {
                    const file = item.getAsFile();
                    if (file && file.name.toLowerCase().endsWith('.prefab')) {
                        return true;
                    }
                }
            }
        }

        // Check for JSON data (from internal file browser)
        if (dataTransfer.types.includes('application/json')) {
            try {
                const jsonData = dataTransfer.getData('application/json');
                const data = JSON.parse(jsonData);
                // Check if it's a prefab file
                if (data.path && data.path.toLowerCase().endsWith('.prefab')) {
                    return true;
                }
                // Check if it has prefab metadata
                if (data.metadata && data.modules) {
                    return true;
                }
            } catch (e) {
                // Not valid JSON
            }
        }

        return false;
    }

    /**
     * Extract prefab path from drop event
     */
    async getPrefabPathFromDropEvent(dataTransfer) {
        // Check for files directly dropped
        if (dataTransfer.files && dataTransfer.files.length > 0) {
            const file = dataTransfer.files[0];
            if (file.name.toLowerCase().endsWith('.prefab')) {
                return file.name.replace('.prefab', '');
            }
        }

        // Check for JSON data (from internal drag & drop from file browser)
        const jsonData = dataTransfer.getData('application/json');
        if (jsonData) {
            try {
                const data = JSON.parse(jsonData);

                // If it's a file object with a prefab path
                if (data.path && data.path.toLowerCase().endsWith('.prefab')) {
                    return this.extractPrefabName(data.path);
                }

                // If it's direct prefab data
                if (data.metadata && data.metadata.name) {
                    return data.metadata.name;
                }
            } catch (e) {
                console.warn('Error parsing dropped JSON data:', e);
            }
        }

        return null;
    }

    /**
     * Extract prefab name from path (remove path and extension)
     */
    extractPrefabName(path) {
        if (!path) return '';

        // Get filename from path
        let filename = path.split('/').pop().split('\\').pop();

        // Remove .prefab extension if present
        if (filename.toLowerCase().endsWith('.prefab')) {
            filename = filename.slice(0, -7);
        }

        return filename;
    }

    /**
    * Setup GameObject drop target
    */
    setupGameObjectDropTarget(element, module) {
        const propName = element.dataset.propName;

        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (e.dataTransfer.types.includes('application/gameobject-id')) {
                element.classList.add('drag-over');
                e.dataTransfer.dropEffect = 'link';
            }
        });

        element.addEventListener('dragleave', () => {
            element.classList.remove('drag-over');
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
            element.classList.remove('drag-over');

            const gameObjectId = e.dataTransfer.getData('application/gameobject-id');
            if (gameObjectId && this.editor.activeScene) {
                const gameObject = this.editor.activeScene.findGameObjectById(gameObjectId);
                if (gameObject) {
                    this.updateModuleProperty(module, propName, gameObject);
                    this.refreshModuleUI(module);
                    this.editor.refreshCanvas();
                }
            }
        });

        // Clear button
        const clearBtn = element.querySelector('.clear-btn');
        clearBtn?.addEventListener('click', () => {
            this.updateModuleProperty(module, propName, null);
            this.refreshModuleUI(module);
            this.editor.refreshCanvas();
        });
    }

    /**
     * Setup file drop target
     */
    setupFileDropTarget(dropArea, container, module) {
        dropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropArea.classList.add('drag-over');
        });

        dropArea.addEventListener('dragleave', () => {
            dropArea.classList.remove('drag-over');
        });

        dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            dropArea.classList.remove('drag-over');

            if (e.dataTransfer.files.length > 0) {
                this.handleFileSelection(container, module, e.dataTransfer.files[0]);
            }
        });
    }

    /**
     * Handle file selection
     */
    async handleFileSelection(container, module, file) {
        const propName = container.dataset.propName;
        const fileName = container.querySelector('.file-name');
        const clearBtn = container.querySelector('.clear-btn');

        try {
            // Upload file if FileBrowser is available
            if (this.editor?.fileBrowser) {
                await this.editor.fileBrowser.handleFileUpload(file);
                const filePath = `${this.editor.fileBrowser.currentPath}/${file.name}`;

                this.updateModuleProperty(module, propName, filePath);
                if (fileName) fileName.textContent = file.name;
                if (clearBtn) clearBtn.disabled = false;
            } else {
                // Fallback to just the file name
                this.updateModuleProperty(module, propName, file.name);
                if (fileName) fileName.textContent = file.name;
                if (clearBtn) clearBtn.disabled = false;
            }

            this.editor?.refreshCanvas();
        } catch (error) {
            console.error('Error handling file:', error);
        }
    }

    /**
     * Clear file selection
     */
    clearFileSelection(container, module) {
        const propName = container.dataset.propName;
        const fileName = container.querySelector('.file-name');
        const clearBtn = container.querySelector('.clear-btn');

        this.updateModuleProperty(module, propName, null);
        if (fileName) fileName.textContent = 'No file selected';
        if (clearBtn) clearBtn.disabled = true;

        this.editor?.refreshCanvas();
    }

    /**
     * Add array item
     */
    addArrayItem(propName, module, container) {
        const currentArray = this.getModuleProperty(module, propName) || [];
        currentArray.push(''); // Add empty item

        this.updateModuleProperty(module, propName, currentArray);
        this.refreshModuleUI(module);
    }

    /**
     * Remove array item
     */
    removeArrayItem(propName, index, module, container) {
        const currentArray = this.getModuleProperty(module, propName) || [];
        currentArray.splice(parseInt(index), 1);

        this.updateModuleProperty(module, propName, currentArray);
        this.refreshModuleUI(module);
    }

    /**
     * Update array item
     */
    updateArrayItem(propName, index, input, module) {
        const currentArray = this.getModuleProperty(module, propName) || [];
        let value = input.value;

        if (input.type === 'number') {
            value = parseFloat(value) || 0;
        } else if (input.type === 'checkbox') {
            value = input.checked;
        }

        currentArray[parseInt(index)] = value;
        this.updateModuleProperty(module, propName, currentArray);
    }

    /**
     * Update object field
     */
    updateObjectField(propName, fieldName, input, module) {
        const currentObj = this.getModuleProperty(module, propName) || {};
        let value = input.value;

        if (input.type === 'number') {
            value = parseFloat(value) || 0;
        } else if (input.type === 'checkbox') {
            value = input.checked;
        }

        currentObj[fieldName] = value;
        this.updateModuleProperty(module, propName, currentObj);
    }

    /**
     * Helper to update module property
     */
    updateModuleProperty(module, propName, value) {
        if (typeof module.setProperty === 'function') {
            module.setProperty(propName, value);
        } else {
            module[propName] = value;
        }
    }

    /**
     * Helper to get module property
     */
    getModuleProperty(module, propName) {
        if (typeof module.getProperty === 'function') {
            return module.getProperty(propName);
        }
        return module[propName];
    }

    /**
     * Check if the drag event contains an image
     * @param {DataTransfer} dataTransfer - The drag data
     * @returns {boolean} - True if this appears to be an image drag
     */
    isImageDragEvent(dataTransfer) {
        // Check for files (from OS)
        if (dataTransfer.items && dataTransfer.items.length > 0) {
            for (let i = 0; i < dataTransfer.items.length; i++) {
                if (dataTransfer.items[i].kind === 'file' &&
                    dataTransfer.items[i].type.startsWith('image/')) {
                    return true;
                }
            }
        }

        // Check for JSON data (from internal file browser)
        if (dataTransfer.types.includes('application/json')) {
            return true;
        }

        // Check for plain text URLs that might be images
        if (dataTransfer.types.includes('text/plain')) {
            return true;
        }

        return false;
    }

    /**
     * Extract an image path from a drop event
     * @param {DataTransfer} dataTransfer - The drop data
     * @returns {Promise<string|null>} - The image path or null if not found
     */
    async getImagePathFromDropEvent(dataTransfer) {
        // Check for files directly dropped
        if (dataTransfer.files && dataTransfer.files.length > 0) {
            const file = dataTransfer.files[0];

            // Validate it's an image
            if (!file.type.startsWith('image/')) {
                console.warn('Dropped file is not an image:', file.type);
                return null;
            }

            // Get the FileBrowser instance
            const fileBrowser = this.editor?.fileBrowser || window.fileBrowser;
            if (!fileBrowser) {
                console.warn('FileBrowser not available for image upload');
                return null;
            }

            // Upload to FileBrowser
            await fileBrowser.handleFileUpload(file);

            // Return the path to the uploaded file
            return `${fileBrowser.currentPath}/${file.name}`;
        }

        // Check for JSON data (from internal drag & drop from file browser)
        const jsonData = dataTransfer.getData('application/json');
        if (jsonData) {
            try {
                const items = JSON.parse(jsonData);
                if (items && items.length > 0) {
                    // Get the first item's path
                    const path = items[0].path;
                    if (path && this.isImagePath(path)) {
                        return path;
                    }
                }
            } catch (e) {
                console.error('Error parsing drag JSON data:', e);
            }
        }

        // Check for plain text (from copy link etc)
        const textData = dataTransfer.getData('text/plain');
        if (textData && this.isImagePath(textData)) {
            return textData;
        }

        return null;
    }

    /**
 * Check if a path is an image file based on extension
 * @param {string} path - File path to check
 * @returns {boolean} - True if it's an image path
 */
    isImagePath(path) {
        if (!path || typeof path !== 'string') return false;
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'];
        const lowercasePath = path.toLowerCase();
        return imageExtensions.some(ext => lowercasePath.endsWith(ext));
    }

    /**
     * Update the Inspector CSS to support image drop targets
     */
    addDragAndDropStyles() {
        // Check if styles already exist
        if (document.getElementById('inspector-drag-drop-styles')) return;

        const styleElement = document.createElement('style');
        styleElement.id = 'inspector-drag-drop-styles';
        styleElement.textContent = `
            /* Image drop target styles (existing) */
            .image-drop-target {
            position: relative;
            border: 2px dashed #555;
            border-radius: 4px;
            min-height: 60px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            transition: all 0.2s ease;
            padding: 8px;
            background: #333;
        }
        
        .image-drop-target:hover {
            border-color: #0078D7;
            background: #3a3a3a;
        }
        
        .image-drop-target.drag-over {
            border-color: #0078D7;
            background-color: rgba(0, 120, 215, 0.1);
        }
        
        .image-drop-target .drop-hint {
            color: #888;
            font-style: italic;
            flex: 1;
        }
        
        .image-drop-target .image-path {
            color: #ccc;
            font-size: 12px;
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .image-drop-target .image-actions {
            display: flex;
            gap: 4px;
            margin-left: 8px;
        }
        
        .image-drop-target .asset-btn {
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #444;
            border: none;
            border-radius: 4px;
            color: #fff;
            cursor: pointer;
            transition: background 0.2s;
        }
        
        .image-drop-target .asset-btn:hover:not(:disabled) {
            background: #555;
        }
        
        .image-drop-target .asset-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
            
            .property-input[data-property-type="image"],
            .property-input[data-asset-type="image"] {
                background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="%23888" d="M447.1 32h-384C28.64 32-.0091 60.65-.0091 96v320c0 35.35 28.65 64 63.1 64h384c35.35 0 64-28.65 64-64V96C511.1 60.65 483.3 32 447.1 32zM111.1 96c26.51 0 48 21.49 48 48S138.5 192 111.1 192s-48-21.49-48-48S85.48 96 111.1 96zM446.1 407.6C443.3 412.8 437.9 416 432 416H82.01c-6.021 0-11.53-3.379-14.26-8.75c-2.73-5.367-2.215-11.81 1.334-16.68l70-96C142.1 290.4 146.9 288 152 288s9.916 2.441 12.93 6.574l32.46 44.51l93.3-139.1C293.7 194.7 298.7 192 304 192s10.35 2.672 13.31 7.125l128 192C448.6 396 448.9 402.3 446.1 407.6z"/></svg>');
                background-repeat: no-repeat;
                background-position: right 8px center;
                background-size: 16px;
                padding-right: 32px;
            }
    
            /* ----- VECTOR COMPONENT STYLING ----- */
            /* Vector property container */
            .vector-property {
                margin-bottom: 12px;
            }
            
            /* Vector header styling */
            .vector-header {
                display: flex;
                align-items: center;
                width: 100%;
                padding: 4px 0;
                border-bottom: 1px solid #444;
            }
            
            .vector-preview {
                margin: 0 8px;
                opacity: 0.7;
                font-size: 0.9em;
                color: #aaa;
            }
            
            .vector-collapse {
                cursor: pointer;
                background: none;
                border: none;
                color: #aaa;
                font-size: 14px;
                padding: 2px 6px;
                margin-left: auto;
            }
            
            .vector-collapse:hover {
                color: #fff;
            }
            
            /* Vector components container - horizontal layout with background */
            .vector-components {
                display: flex;
                flex-direction: row;
                width: 100%;
                padding: 8px;
                gap: 8px;
                margin-top: 4px;
                background-color: rgba(40, 40, 40, 0.5);
                border-radius: 4px;
            }
            
            /* Individual component (X, Y, Z) - vertical layout */
            .vector-component {
                display: flex;
                flex-direction: column;
                width: 60px; /* Fixed narrower width */
                max-width: 60px;
                min-width: 60px;
            }
            
            /* Component labels */
            .vector-component label {
                width: 100%;
                text-align: center;
                font-weight: bold;
                color: #aaa;
                margin-bottom: 4px;
                font-size: 12px;
            }
            
            /* Component inputs */
            .vector-component input {
                width: 100%;
                max-width: 60px;
            }
            
            /* ----- POLYGON SPECIFIC STYLES ----- */
            .polygon-property .vector-component {
                display: grid;
                grid-template-columns: 30px 1fr 1fr 30px;
                gap: 8px;
                width: auto;
                max-width: none;
            }
            
            .remove-vertex {
                width: 24px;
                height: 24px;
                padding: 0;
                background: none;
                border: none;
                color: #f44;
                cursor: pointer;
                font-size: 16px;
                opacity: 0.7;
            }
            
            .remove-vertex:hover:not([disabled]) {
                opacity: 1;
            }
            
            .remove-vertex[disabled] {
                opacity: 0.3;
                cursor: not-allowed;
            }
            
            .add-vertex {
                margin-top: 6px;
                padding: 4px 8px;
                background: #444;
                border: none;
                border-radius: 4px;
                color: #fff;
                cursor: pointer;
                font-size: 12px;
                align-self: flex-start;
            }
            
            .add-vertex:hover {
                background: #555;
            }

            /* --- Improved Property Group Styling --- */
            .property-group {
                background: #23272b;
                border-radius: 8px;
                padding: 12px 16px 12px 16px;
                margin-bottom: 16px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            }
            .property-group .group-label {
                font-weight: bold;
                color: #fff;
                margin-bottom: 8px;
                font-size: 1.05em;
            }

            /* --- Slider Styling --- */
            .property-input, .property-slider, .property-row select {
                background: #23272b;
                color: #e0e6f0;
                border: 1px solid #3a3f4b;
                border-radius: 4px;
                padding: 6px 10px;
                font-size: 1em;
            }
            .property-input:focus, .property-row select:focus {
                border-color: #0078D7;
                outline: none;
            }

            .slider-value {
                min-width: 48px;
                max-width: 60px;
                text-align: right;
                font-family: 'Consolas', 'Menlo', 'monospace';
                color: #b3c0d6;
                background: #23272b;
                border-radius: 4px;
                margin-left: 8px;
                padding: 2px 6px;
                font-size: 1em;
                transition: background 0.2s;
                box-sizing: border-box;
            }

            .property-slider {
                flex: 1 1 auto;
                margin: 0 12px 0 0;
                min-width: 120px;
                max-width: 220px;
                box-sizing: border-box;
            }

            /* Help text styling */
            .property-help {
                font-style: italic;
                font-family: 'Segoe UI', 'Roboto', 'Arial', sans-serif;
                color: #b3c0d6;
                font-size: 0.85em;           /* Smaller font */
                margin: 6px 0 2px 0;
                letter-spacing: 0.01em;
                border: 1px solid #444;      /* Add border */
                border-radius: 4px;          /* Rounded corners */
                background: #3e4246ff;         /* Optional: subtle background */
                padding: 4px 8px;            /* Padding inside border */
            }

            /* --- Dropdown Styling --- */
            .property-input[type="select"], .property-input select {
                flex: 1 1 auto;
                min-width: 120px;
                max-width: 220px;
                margin-left: 0;
                margin-right: 0;
                padding: 6px 10px;
                box-sizing: border-box;
            }
            .property-input select:focus {
                border-color: #0078D7;
                outline: none;
            }
                
            /* Module color theming */
            .module-container {
                background: var(--module-color, #23272b);
                border-left: 6px solid var(--module-color, #444);
                color: var(--module-text-color, #e0e6f0);
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                margin-bottom: 16px;
                transition: background 0.2s, border-color 0.2s;
            }
            .module-container .module-header {
                background: linear-gradient(90deg, var(--module-color, #23272b) 80%, rgba(0,0,0,0.05));
                color: var(--module-text-color, #fff);
                border-radius: 8px 8px 0 0;
            }
            .module-container .module-content {
                background: rgba(0,0,0,0.07);
                border-radius: 0 0 8px 8px;
            }
            .module-container .property-row label,
            .module-container .property-header,
            .module-container .group-label {
                color: var(--module-text-color, #e0e6f0);
            }

            .module-container .property-input,
            .module-container .property-slider,
            .module-container .property-row select {
                background: var(--module-input-bg, #23272b);
                color: var(--module-text-color, #e0e6f0);
                border: 1px solid var(--module-input-border, #3a3f4b);
                border-radius: 4px;
                padding: 6px 10px;
                font-size: 1em;
                transition: background 0.2s, border-color 0.2s;
            } 

            /* --- Improved Property Group Styling --- */
            .property-group {
                background: var(--module-color, #23272b);
                border-radius: 8px;
                padding: 12px 16px 12px 16px;
                margin-bottom: 16px;
                box-shadow:
                    -12px 0 24px -8px color-mix(in srgb, var(--module-color, #23272b) 60%, #000 60%),
                    0 2px 8px rgba(36, 36, 36, 0.08);
                border-left: 4px solid color-mix(in srgb, var(--module-color, #23272b) 60%, #000 60%);
            }
            .property-group .group-label {
                font-weight: bold;
                color: var(--module-text-color, #fff);
                margin-bottom: 8px;
                font-size: 1.05em;
            }
            .module-title {
                font-weight: bold;
            }
            .property-header {
                color: var(--module-text-color, #e0e6f0);
            }
            .property-help {
                color: var(--module-text-color, #b3c0d6);
            }
            .property-color-block {
                border: 1px solid var(--module-input-border, #3a3f4b);
            }

            /* Enhanced Property Styling */
        .property-row {
            margin-bottom: 12px;
            padding: 8px 0;
        }

        .property-input-group {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
        }

        /* Toggle Switch */
        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 50px;
            height: 24px;
        }

        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #555;
            transition: 0.3s;
            border-radius: 24px;
        }

        .toggle-slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: 0.3s;
            border-radius: 50%;
        }

        input:checked + .toggle-slider {
            background-color: #0078D7;
        }

        input:checked + .toggle-slider:before {
            transform: translateX(26px);
        }

        /* Color Input Group */
        .color-input-group {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .color-picker {
            width: 40px;
            height: 30px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }

        .color-text-input {
            width: 80px;
            font-family: monospace;
            text-transform: uppercase;
        }

        /* Image Asset Container */
        .image-asset-container {
            display: flex;
            align-items: center;
            gap: 8px;
            border: 1px solid #444;
            border-radius: 4px;
            padding: 4px;
            background: #2a2a2a;
        }

        .image-preview-area {
            flex: 1;
            min-height: 60px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border: 2px dashed #555;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
        }

        .image-preview-area:hover {
            border-color: #0078D7;
        }

        .image-preview-area.drag-over {
            border-color: #0078D7;
            background-color: rgba(0, 120, 215, 0.1);
        }

        .image-preview-area.has-image {
            border-style: solid;
            border-color: #666;
        }

        .asset-thumbnail {
            max-width: 50px;
            max-height: 50px;
            object-fit: contain;
        }

        .image-path-display {
            font-size: 10px;
            color: #aaa;
            text-align: center;
            margin-top: 2px;
        }

        .image-asset-actions {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .asset-btn {
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #444;
            border: none;
            border-radius: 4px;
            color: #fff;
            cursor: pointer;
            transition: background 0.2s;
        }

        .asset-btn:hover:not(:disabled) {
            background: #555;
        }

        .asset-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* GameObject Field */
        .gameobject-field {
            display: flex;
            align-items: center;
            gap: 8px;
            border: 1px solid #444;
            border-radius: 4px;
            padding: 4px;
            background: #2a2a2a;
        }

        .gameobject-preview {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px;
            border: 2px dashed #555;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .gameobject-preview:hover {
            border-color: #0078D7;
        }

        .gameobject-field.drag-over .gameobject-preview {
            border-color: #0078D7;
            background-color: rgba(0, 120, 215, 0.1);
        }

        .gameobject-icon {
            color: #888;
        }

        .gameobject-name {
            color: #ccc;
            font-style: italic;
        }

        .gameobject-actions {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        /* Button Styles */
        .property-button {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .property-button.primary {
            background: #0078D7;
            color: white;
        }

        .property-button.primary:hover {
            background: #106ebe;
        }

        .property-button.secondary {
            background: #666;
            color: white;
        }

        .property-button.secondary:hover {
            background: #777;
        }

        .property-button.danger {
            background: #d73502;
            color: white;
        }

        .property-button.danger:hover {
            background: #c42d02;
        }

        /* Range/Slider */
        .range-container {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
        }

        .property-range {
            flex: 1;
            height: 6px;
            border-radius: 3px;
            background: #444;
            outline: none;
            cursor: pointer;
        }

        .property-range::-webkit-slider-thumb {
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #0078D7;
            cursor: pointer;
        }

        .range-value {
            min-width: 40px;
            text-align: right;
            color: #ccc;
            font-family: monospace;
        }

        /* File Input */
        .file-input-container {
            display: flex;
            align-items: center;
            gap: 8px;
            border: 1px solid #444;
            border-radius: 4px;
            padding: 4px;
            background: #2a2a2a;
        }

        .file-preview {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px;
            border: 2px dashed #555;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .file-preview:hover {
            border-color: #0078D7;
        }

        .file-preview.drag-over {
            border-color: #0078D7;
            background-color: rgba(0, 120, 215, 0.1);
        }

        .file-name {
            color: #ccc;
            font-size: 12px;
        }

        .file-actions {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        /* Array Properties */
        .array-property {
            border: 1px solid #444;
            border-radius: 4px;
            padding: 8px;
            background: rgba(0, 0, 0, 0.2);
        }

        .array-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid #555;
        }

        .add-array-item {
            background: #0078D7;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            cursor: pointer;
            font-size: 12px;
        }

        .add-array-item:hover:not(:disabled) {
            background: #106ebe;
        }

        .array-item {
            margin-bottom: 4px;
        }

        .array-item-content {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 4px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
        }

        .array-index {
            min-width: 20px;
            text-align: center;
            color: #888;
            font-size: 12px;
        }

        .array-item-input {
            flex: 1;
            background: #333;
            border: 1px solid #555;
            border-radius: 4px;
            padding: 4px 8px;
            color: #fff;
        }

        .remove-array-item {
            background: #d73502;
            color: white;
            border: none;
            border-radius: 4px;
            width: 24px;
            height: 24px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .remove-array-item:hover:not(:disabled) {
            background: #c42d02;
        }

        /* Object Properties */
        .object-property {
            border: 1px solid #444;
            border-radius: 4px;
            padding: 8px;
            background: rgba(0, 0, 0, 0.2);
        }

        .object-header {
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid #555;
        }

        .object-field {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
        }

        .object-field label {
            min-width: 80px;
            color: #ccc;
        }

        .object-field-input {
            flex: 1;
            background: #333;
            border: 1px solid #555;
            border-radius: 4px;
            padding: 4px 8px;
            color: #fff;
        }

        /* Textarea */
        .property-textarea {
            resize: vertical;
            min-height: 60px;
            font-family: 'Consolas', 'Monaco', monospace;
        }

        /* Select dropdown */
        .property-select {
            background: #333;
            border: 1px solid #555;
            border-radius: 4px;
            padding: 6px 10px;
            color: #fff;
        }

        /* Curve Editor (placeholder) */
        .curve-editor {
            border: 1px solid #444;
            border-radius: 4px;
            padding: 8px;
            background: rgba(0, 0, 0, 0.2);
        }

        .curve-canvas {
            width: 100%;
            background: #1a1a1a;
            border-radius: 4px;
            cursor: crosshair;
        }

        .curve-controls {
            display: flex;
            gap: 4px;
            margin-top: 4px;
        }

        .curve-preset {
            background: #444;
            color: #fff;
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            cursor: pointer;
            font-size: 11px;
        }

        .curve-preset:hover {
            background: #555;
        }

        /* Gradient Editor (placeholder) */
        .gradient-editor {
            border: 1px solid #444;
            border-radius: 4px;
            padding: 8px;
            background: rgba(0, 0, 0, 0.2);
        }

        .gradient-preview {
            height: 20px;
            border-radius: 4px;
            background: linear-gradient(to right, #000000, #ffffff);
            margin-bottom: 8px;
        }

        .gradient-stops {
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
        }

        .gradient-stop {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
        }

        .gradient-stop input[type="color"] {
            width: 30px;
            height: 30px;
            border: none;
            border-radius: 4px;
        }

        .gradient-stop span {
            font-size: 11px;
            color: #aaa;
        }

        .add-gradient-stop {
            background: #0078D7;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            cursor: pointer;
            font-size: 12px;
        }

        /* Make property text smaller and reduce gaps */
    .property-row {
        margin-bottom: 6px !important;
        padding: 4px 0 !important;
        font-size: 0.92em !important;
    }
    .property-row label,
    .property-header,
    .property-help,
    .group-label {
        font-size: 0.92em !important;
        line-height: 1.2 !important;
    }
    .property-input,
    .property-slider,
    .property-row select {
        font-size: 0.92em !important;
        padding: 4px 8px !important;
    }
    .property-header {
        margin-bottom: 4px !important;
    }
    .property-help {
        margin: 4px 0 2px 0 !important;
        padding: 3px 6px !important;
        font-size: 0.85em !important;
    }
    .property-group {
        padding: 8px 12px 8px 12px !important;
        margin-bottom: 10px !important;
    }
    .module-container {
        margin-bottom: 10px !important;
    }
    /* Reduce gap for vector components */
    .vector-components {
        gap: 4px !important;
        padding: 6px !important;
    }
    .vector-component label {
        font-size: 0.85em !important;
        margin-bottom: 2px !important;
    }

    .module-dropdown-search-sticky {
    position: sticky;
    top: 0;
    z-index: 2;
    background: #23272b;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.module-dropdown {
    overflow-y: auto;
    max-height: 400px;
}

.asset-path-display {
            font-size: 10px;
            color: #aaa;
            text-align: center;
            margin-top: 2px;
            word-break: break-all;
            max-width: 64px;
        }

        /* Project image items in selector */
        .project-image-item {
            border: 2px solid transparent;
            border-radius: 4px;
            cursor: pointer;
            position: relative;
            width: 80px;
            height: 100px;
            overflow: hidden;
            background: #333;
            display: flex;
            flex-direction: column;
            align-items: center;
            transition: all 0.2s ease;
        }

        .project-image-item:hover {
            border-color: #666;
        }

        .project-image-item.selected {
            border-color: #0078D7;
            background: rgba(0, 120, 215, 0.1);
        }

        .project-image-thumbnail {
            width: 64px;
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 4px;
        }

        .project-image-thumbnail img {
            width: 64px;
            height: 64px;
            object-fit: contain;
        }
        `;

        document.head.appendChild(styleElement);
    }

    /**
     * Check if drag event contains valid assets for the specified type
     */
    isValidAssetDrag(dataTransfer, assetType) {
        // Check for files (from OS)
        if (dataTransfer.items && dataTransfer.items.length > 0) {
            for (let item of dataTransfer.items) {
                if (item.kind === 'file') {
                    const file = item.getAsFile();
                    if (file && this.isValidAssetFile(file, assetType)) {
                        return true;
                    }
                }
            }
        }

        // Check for JSON data (from internal file browser)
        if (dataTransfer.types.includes('application/json')) {
            try {
                const jsonData = dataTransfer.getData('application/json');
                const data = JSON.parse(jsonData);
                // Check if it's a valid asset file
                if (data.path && this.isValidAssetPath(data.path, assetType)) {
                    return true;
                }
            } catch (e) {
                // Not valid JSON
            }
        }

        return false;
    }

    /**
     * Check if a file is valid for the specified asset type
     */
    isValidAssetFile(file, assetType) {
        if (!file || !file.type) return false;

        switch (assetType) {
            case 'image':
                return file.type.startsWith('image/');
            case 'audio':
                return file.type.startsWith('audio/');
            case 'video':
                return file.type.startsWith('video/');
            case 'text':
                return file.type.startsWith('text/');
            default:
                return true; // Accept any file for generic assets
        }
    }

    /**
     * Check if a path is valid for the specified asset type
     */
    isValidAssetPath(path, assetType) {
        if (!path || typeof path !== 'string') return false;

        const lowerPath = path.toLowerCase();

        switch (assetType) {
            case 'image':
                const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'];
                return imageExtensions.some(ext => lowerPath.endsWith(ext));
            case 'audio':
                const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];
                return audioExtensions.some(ext => lowerPath.endsWith(ext));
            case 'video':
                const videoExtensions = ['.mp4', '.webm', '.ogv', '.mov', '.avi'];
                return videoExtensions.some(ext => lowerPath.endsWith(ext));
            case 'text':
                const textExtensions = ['.txt', '.json', '.xml', '.csv'];
                return textExtensions.some(ext => lowerPath.endsWith(ext));
            default:
                return true;
        }
    }

    /**
     * Extract asset path from drop event
     */
    async getAssetPathFromDrop(dataTransfer, assetType) {
        // Check for files directly dropped from OS
        if (dataTransfer.files && dataTransfer.files.length > 0) {
            const file = dataTransfer.files[0];

            // Validate it's the correct asset type
            if (!this.isValidAssetFile(file, assetType)) {
                console.warn(`Dropped file is not a valid ${assetType}:`, file.type);
                return null;
            }

            // Handle through asset manager if available
            if (window.assetManager && typeof window.assetManager.addAsset === 'function') {
                try {
                    const assetPath = await window.assetManager.addAsset(file, assetType);
                    return assetPath;
                } catch (error) {
                    console.error('Error adding asset via asset manager:', error);
                }
            }

            // Fallback to file browser
            const fileBrowser = this.editor?.fileBrowser || window.fileBrowser;
            if (fileBrowser && typeof fileBrowser.handleFileUpload === 'function') {
                try {
                    await fileBrowser.handleFileUpload(file);
                    const assetPath = `${fileBrowser.currentPath}/${file.name}`;

                    // Register with asset manager if available
                    if (window.assetManager && typeof window.assetManager.registerAsset === 'function') {
                        window.assetManager.registerAsset(assetPath, assetType);
                    }

                    return assetPath;
                } catch (error) {
                    console.error('Error uploading file via file browser:', error);
                }
            }

            console.warn('No asset manager or file browser available for file upload');
            return null;
        }

        // Check for JSON data (from internal drag & drop from file browser)
        const jsonData = dataTransfer.getData('application/json');
        if (jsonData) {
            try {
                const data = JSON.parse(jsonData);

                // Handle array of items (from file browser)
                if (Array.isArray(data) && data.length > 0) {
                    const item = data[0];
                    if (item.path && this.isValidAssetPath(item.path, assetType)) {
                        // Register with asset manager if available
                        if (window.assetManager && typeof window.assetManager.registerAsset === 'function') {
                            window.assetManager.registerAsset(item.path, assetType);
                        }
                        // Return the asset path (not a URL)
                        return item.path;
                    }
                }

                // Handle single item
                if (data.path && this.isValidAssetPath(data.path, assetType)) {
                    // Register with asset manager if available
                    if (window.assetManager && typeof window.assetManager.registerAsset === 'function') {
                        window.assetManager.registerAsset(data.path, assetType);
                    }
                    // Return the asset path (not a URL)
                    return data.path;
                }
            } catch (e) {
                console.warn('Error parsing dropped JSON data:', e);
            }
        }

        // Check for plain text (URLs) - but convert to asset path if possible
        const textData = dataTransfer.getData('text/plain');
        if (textData && this.isValidAssetPath(textData, assetType)) {
            // For URLs, register with asset manager if available
            if (window.assetManager && typeof window.assetManager.registerAsset === 'function') {
                window.assetManager.registerAsset(textData, assetType);
            }
            return textData;
        }

        return null;
    }

    /**
     * Get assets from file browser (fallback when asset manager is not available)
     */
    async getAssetsFromFileBrowser(assetType) {
        const fileBrowser = this.editor?.fileBrowser || window.fileBrowser;
        if (!fileBrowser || typeof fileBrowser.getAllFiles !== 'function') {
            return [];
        }

        try {
            const allFiles = await fileBrowser.getAllFiles();
            return allFiles
                .filter(file => file.type === 'file' && this.isValidAssetPath(file.path, assetType))
                .map(file => ({
                    path: file.path,
                    name: file.name || file.path.split('/').pop(),
                    displayName: file.name || file.path.split('/').pop()
                }));
        } catch (error) {
            console.error('Error getting assets from file browser:', error);
            return [];
        }
    }

    /**
     * Generate asset grid item HTML
     */
    generateAssetGridItem(asset, assetType) {
        const name = asset.name || asset.path.split('/').pop();

        switch (assetType) {
            case 'image':
                return `
                    <div class="asset-thumbnail-container">
                        <img src="${asset.path}" alt="${name}" class="asset-thumbnail" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="asset-fallback" style="display:none;">
                            <i class="fas fa-image"></i>
                        </div>
                    </div>
                    <div class="asset-name" title="${asset.path}">${name}</div>
                `;
            case 'audio':
                return `
                    <div class="asset-thumbnail-container">
                        <div class="asset-icon">
                            <i class="fas fa-music"></i>
                        </div>
                    </div>
                    <div class="asset-name" title="${asset.path}">${name}</div>
                `;
            case 'video':
                return `
                    <div class="asset-thumbnail-container">
                        <div class="asset-icon">
                            <i class="fas fa-video"></i>
                        </div>
                    </div>
                    <div class="asset-name" title="${asset.path}">${name}</div>
                `;
            default:
                return `
                    <div class="asset-thumbnail-container">
                        <div class="asset-icon">
                            <i class="fas fa-file"></i>
                        </div>
                    </div>
                    <div class="asset-name" title="${asset.path}">${name}</div>
                `;
        }
    }

    /**
     * Close asset dialog
     */
    closeAssetDialog(dialog) {
        if (dialog && dialog.parentNode) {
            document.body.removeChild(dialog);
        }
    }

    /**
     * Upload new asset
     */
    async uploadNewAsset(assetType, module, propName, dialog) {
        const input = document.createElement('input');
        input.type = 'file';

        // Set accept attribute based on asset type
        switch (assetType) {
            case 'image':
                input.accept = 'image/*';
                break;
            case 'audio':
                input.accept = 'audio/*';
                break;
            case 'video':
                input.accept = 'video/*';
                break;
            case 'text':
                input.accept = '.txt,.json,.xml,.csv';
                break;
        }

        input.onchange = async (e) => {
            if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];

                try {
                    let assetPath;

                    // Try asset manager first
                    if (window.assetManager && typeof window.assetManager.addAsset === 'function') {
                        assetPath = await window.assetManager.addAsset(file, assetType);
                    }
                    // Fallback to file browser
                    else {
                        const fileBrowser = this.editor?.fileBrowser || window.fileBrowser;
                        if (fileBrowser && typeof fileBrowser.handleFileUpload === 'function') {
                            await fileBrowser.handleFileUpload(file);
                            assetPath = `${fileBrowser.currentPath}/${file.name}`;

                            // Register with asset manager if available
                            if (window.assetManager && typeof window.assetManager.registerAsset === 'function') {
                                window.assetManager.registerAsset(assetPath, assetType);
                            }
                        }
                    }

                    if (assetPath) {
                        this.setAssetProperty(module, propName, assetPath);
                        this.refreshModuleUI(module);
                        this.editor?.refreshCanvas();
                        this.closeAssetDialog(dialog);
                    } else {
                        alert('Failed to upload asset. No asset manager or file browser available.');
                    }
                } catch (error) {
                    console.error('Error uploading asset:', error);
                    alert(`Error uploading asset: ${error.message}`);
                }
            }
        };

        input.click();
    }

    /**
    * Set up drag and drop for image properties
    * @param {HTMLElement} element - The element that should accept image drops
    * @param {Module} module - The module with the image property
    */
    setupImageDropTarget(element, module) {
        const propertyName = element.dataset.propName || element.dataset.property;
        if (!propertyName) return;

        // Make the element visually show it's a drop target
        element.classList.add('image-drop-target');

        // Handle dragover to show visual feedback
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Check if it's likely an image being dragged
            const isValidDrag = this.isImageDragEvent(e.dataTransfer);
            if (isValidDrag) {
                element.classList.add('drag-over');
                e.dataTransfer.dropEffect = 'copy';
            }
        });

        // Remove highlight when drag leaves
        element.addEventListener('dragleave', () => {
            element.classList.remove('drag-over');
        });

        // Handle the actual drop
        element.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            element.classList.remove('drag-over');

            try {
                const imagePath = await this.getImagePathFromDropEvent(e.dataTransfer);
                if (!imagePath) return false;

                // Try the module's specialized image setter first
                if (typeof module.setParticleImage === 'function' && propertyName === 'imageAsset') {
                    await module.setParticleImage(imagePath);
                }
                // Special handling for SpriteRenderer modules
                else if (module instanceof SpriteRenderer && propertyName === 'imageAsset') {
                    await module.setSprite(imagePath);
                }
                // Special handling for modules with setSprite method
                else if (typeof module.setSprite === 'function' && propertyName === 'imageAsset') {
                    await module.setSprite(imagePath);
                }
                // Check if module has a specific image drop handler
                else if (typeof module.handleImageDrop === 'function') {
                    const result = await module.handleImageDrop(e.dataTransfer);
                    if (!result) {
                        // Fallback to generic property setting
                        this.setModuleImageProperty(module, propertyName, imagePath);
                    }
                }
                // Generic property setting
                else {
                    this.setModuleImageProperty(module, propertyName, imagePath);
                }

                // Refresh UI and canvas
                this.refreshModuleUI(module);
                this.editor?.refreshCanvas();

                return true;
            } catch (error) {
                console.error('Error handling image drop:', error);
                return false;
            }
        });

        // Make it clickable to open file browser
        element.addEventListener('click', (e) => {
            // Don't trigger on button clicks
            if (e.target.closest('button')) return;

            this.showImageSelector(module, propertyName);
        });
    }

    /**
     * Generic method to set an image property on a module
     * @param {Module} module - The module
     * @param {string} propertyName - The property name
     * @param {string} imagePath - The image path
     */
    setModuleImageProperty(module, propertyName, imagePath) {
        // Try the module's setProperty method first
        if (typeof module.setProperty === 'function') {
            module.setProperty(propertyName, imagePath);
        }
        // Fallback to direct property assignment
        else {
            module[propertyName] = imagePath;
        }
    }

    /**
     * Setup listeners for SpriteRenderer properties
     */
    setupSpriteRendererListeners(container, module) {
        // Find the image preview element
        const imagePreview = container.querySelector('.image-preview');
        const selectImageButton = container.querySelector('.select-image-button');
        const clearImageButton = container.querySelector('.clear-image-button');

        // Set up the image preview drag and drop
        if (imagePreview) {
            // Use the module's own setupDragAndDrop method if available
            if (typeof module.setupDragAndDrop === 'function') {
                module.setupDragAndDrop(imagePreview);
            } else {
                // Fallback to our own drag and drop setup
                this.setupImageDropTarget(imagePreview, module);
            }
        }

        // Set up select button
        if (selectImageButton) {
            selectImageButton.addEventListener('click', () => {
                if (typeof this.showImageSelector === 'function') {
                    this.showImageSelector(module);
                } else if (typeof module.loadImageFromFile === 'function') {
                    module.loadImageFromFile();
                }
            });
        }

        // Set up clear button
        if (clearImageButton) {
            clearImageButton.addEventListener('click', () => {
                if (typeof module.setSprite === 'function') {
                    module.setSprite(null);
                    this.refreshModuleUI(module);
                    this.editor.refreshCanvas();
                }
            });
        }

        // Standard property handlers for other inputs
        container.querySelectorAll('.property-input').forEach(input => {
            if (!input) return;

            input.addEventListener('change', () => {
                const propName = input.dataset.propName;
                if (!propName) return;

                let value;
                if (input.type === 'checkbox') {
                    value = input.checked;
                } else if (input.type === 'number') {
                    value = parseFloat(input.value);
                    if (isNaN(value)) value = 0;
                } else {
                    value = input.value;
                }

                // Use setProperty if available, otherwise direct assignment
                if (typeof module.setProperty === 'function') {
                    module.setProperty(propName, value);
                } else {
                    module[propName] = value;
                }

                this.editor.refreshCanvas();
            });
        });
    }

    /**
     * Handle placeholder module reimport action
     */
    async handlePlaceholderReimport(module) {
        // Show a dialog to browse for the module file
        if (!window.fileBrowser) {
            alert("File browser not available. Please create or import the module file manually.");
            return;
        }

        try {
            // Open file browsing dialog
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.js';

            fileInput.onchange = async (e) => {
                if (e.target.files.length === 0) return;

                const file = e.target.files[0];
                const reader = new FileReader();

                reader.onload = async (event) => {
                    const content = event.target.result;

                    // Check if the file contains a class with the correct name
                    const moduleName = module.type;
                    if (!content.includes(`class ${moduleName}`)) {
                        alert(`This file does not contain a class named ${moduleName}. Please select the correct file.`);
                        return;
                    }

                    try {
                        // Create the file in the project
                        const path = `/modules/${moduleName}.js`;
                        await window.fileBrowser.createFile(path, content);

                        // Try to load the module
                        const ModuleClass = await window.fileBrowser.loadModuleScript(path);

                        if (ModuleClass) {
                            // Replace the placeholder with the real module
                            this.replacePlaceholderModule(module, ModuleClass);
                            alert(`Successfully reimported module: ${moduleName}`);
                        } else {
                            alert(`Failed to load module: ${moduleName}`);
                        }
                    } catch (error) {
                        console.error("Module reimport error:", error);
                        alert(`Error during reimport: ${error.message}`);
                    }
                };

                reader.readAsText(file);
            };

            fileInput.click();
        } catch (error) {
            console.error("Failed to open file dialog:", error);
            alert(`Error: ${error.message}`);
        }
    }

    /**
 * Setup asset drop target
 */
    setupAssetDropTarget(element, module, propName, assetType) {
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (this.isValidAssetDrag(e.dataTransfer, assetType)) {
                element.classList.add('drag-over');
                e.dataTransfer.dropEffect = 'copy';
            }
        });

        element.addEventListener('dragleave', () => {
            element.classList.remove('drag-over');
        });

        element.addEventListener('drop', async (e) => {
            e.preventDefault();
            element.classList.remove('drag-over');

            try {
                const assetPath = await this.getAssetPathFromDrop(e.dataTransfer, assetType);
                if (assetPath) {
                    this.setAssetProperty(module, propName, assetPath);
                    this.refreshModuleUI(module);
                    this.editor?.refreshCanvas();
                }
            } catch (error) {
                console.error('Error handling asset drop:', error);
            }
        });
    }

    /**
     * Show asset selector dialog
     */
    showAssetSelector(module, propName, assetType) {
        // Create the asset selector dialog
        const dialog = document.createElement('div');
        dialog.className = 'asset-selector-dialog';
        dialog.innerHTML = `
        <div class="asset-selector-content">
            <div class="asset-selector-header">
                <h3>Select ${assetType.charAt(0).toUpperCase() + assetType.slice(1)} for ${module.type}</h3>
                <button class="asset-selector-close"><i class="fas fa-times"></i></button>
            </div>
            <div class="asset-selector-body">
                <div class="asset-search">
                    <input type="text" placeholder="Search assets..." class="asset-search-input">
                </div>
                <div class="project-assets-grid">
                    <div class="loading-message">Loading assets...</div>
                </div>
            </div>
            <div class="asset-selector-footer">
                <button class="upload-new-btn">Upload New</button>
                <button class="cancel-btn">Cancel</button>
            </div>
        </div>
    `;

        document.body.appendChild(dialog);
        this.loadAssetsForSelector(dialog, module, propName, assetType);

        // Setup event listeners
        const closeBtn = dialog.querySelector('.asset-selector-close');
        const cancelBtn = dialog.querySelector('.cancel-btn');
        const uploadBtn = dialog.querySelector('.upload-new-btn');

        closeBtn.addEventListener('click', () => this.closeAssetDialog(dialog));
        cancelBtn.addEventListener('click', () => this.closeAssetDialog(dialog));
        uploadBtn.addEventListener('click', () => this.uploadNewAsset(assetType, module, propName, dialog));
    }

    /**
     * Load assets for the selector
     */
    async loadAssetsForSelector(dialog, module, propName, assetType) {
        const grid = dialog.querySelector('.project-assets-grid');

        try {
            const assets = window.assetManager ?
                window.assetManager.getAvailableAssetPaths(assetType) :
                await this.getAssetsFromFileBrowser(assetType);

            if (assets.length === 0) {
                grid.innerHTML = `<div class="no-assets-message">No ${assetType} assets found</div>`;
                return;
            }

            grid.innerHTML = '';

            assets.forEach(asset => {
                const item = document.createElement('div');
                item.className = 'asset-grid-item';
                item.innerHTML = this.generateAssetGridItem(asset, assetType);

                item.addEventListener('click', () => {
                    this.setAssetProperty(module, propName, asset.path);
                    this.refreshModuleUI(module);
                    this.editor?.refreshCanvas();
                    this.closeAssetDialog(dialog);
                });

                grid.appendChild(item);
            });

        } catch (error) {
            console.error('Error loading assets:', error);
            grid.innerHTML = '<div class="error-message">Error loading assets</div>';
        }
    }

    /**
     * Set asset property on module
     */
    setAssetProperty(module, propName, assetPath) {
        // Check if module has a specific setter method
        const setterName = `set${propName.charAt(0).toUpperCase()}${propName.slice(1)}`;
        if (typeof module[setterName] === 'function') {
            module[setterName](assetPath);

            // Register with AssetManager for export
            this.registerAssetForExport(module, propName, assetPath);
            return;
        }

        // Check for custom asset selection handler
        const exposedProps = module.getExposedProperties ? module.getExposedProperties() : [];
        const prop = exposedProps.find(p => p.name === propName);
        if (prop && prop.options && prop.options.onAssetSelected) {
            prop.options.onAssetSelected(assetPath);

            // Register with AssetManager for export
            this.registerAssetForExport(module, propName, assetPath);
            return;
        }

        // Fallback to generic property setting
        if (typeof module.setProperty === 'function') {
            module.setProperty(propName, assetPath);
        } else {
            module[propName] = assetPath;
        }

        // Register with AssetManager for export
        this.registerAssetForExport(module, propName, assetPath);
    }

    /**
     * Register an asset with the AssetManager for export
     * @param {Module} module - The module with the asset
     * @param {string} propName - The property name (e.g., 'imageAsset')
     * @param {string} assetPath - The path to the asset
     */
    registerAssetForExport(module, propName, assetPath) {
        if (!assetPath || !window.assetManager) return;
        
        // Determine asset type from property name or module properties
        let assetType = 'generic';
        if (propName.includes('image') || propName.includes('Image')) {
            assetType = 'image';
        } else if (propName.includes('audio') || propName.includes('Audio')) {
            assetType = 'audio';
        } else if (propName.includes('video') || propName.includes('Video')) {
            assetType = 'video';
        } else if (module[propName] && module[propName].type) {
            assetType = module[propName].type;
        }
        
        // Generate asset ID
        const assetId = assetPath.replace(/^[\/\\]+/, '').replace(/[\/\\]/g, '_');
        
        console.log(`Registering ${assetType} asset for export: ${assetPath} (ID: ${assetId})`);
        
        // Check if already registered
        if (window.assetManager.hasAsset(assetId)) {
            console.log(`Asset already registered: ${assetId}`);
            return;
        }
        
        // Get the actual asset element from the module
        let assetElement = null;
        
        if (assetType === 'image' && module._image) {
            assetElement = module._image;
        } else if (assetType === 'audio' && module._audio) {
            assetElement = module._audio;
        }
        
        if (assetElement) {
            window.assetManager.addAsset(assetId, assetElement, assetType, {
                path: assetPath,
                originalPath: assetPath
            }).catch(error => {
                console.warn(`Failed to register ${assetType} asset for export:`, error);
            });
        } else {
            console.warn(`Could not find ${assetType} element on module for export registration`);
        }
    }

    /**
     * Clear asset property
     */
    clearAssetProperty(module, propName) {
        this.setAssetProperty(module, propName, null);
    }

    /**
     * Handle placeholder view data action
     */
    handlePlaceholderViewData(module) {
        if (!module._originalData && !module.toJSON) {
            alert("No data available for this module.");
            return;
        }

        const data = module._originalData || module.toJSON();

        // Create a dialog to display the data
        const dialog = document.createElement('div');
        dialog.className = 'module-data-dialog';
        dialog.innerHTML = `
            <div class="module-data-content">
                <div class="module-data-header">
                    <h3>Module Data: ${module.type}</h3>
                    <button class="close-button"><i class="fas fa-times"></i></button>
                </div>
                <div class="module-data-body">
                    <pre>${JSON.stringify(data, null, 2)}</pre>
                </div>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .module-data-dialog {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                z-index: 10000;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .module-data-content {
                background: #2a2a2a;
                border-radius: 4px;
                width: 80%;
                max-width: 800px;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
            }
            .module-data-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 15px;
                border-bottom: 1px solid #444;
            }
            .module-data-header h3 {
                margin: 0;
                color: #eee;
            }
            .close-button {
                background: none;
                border: none;
                color: #eee;
                cursor: pointer;
            }
            .module-data-body {
                padding: 15px;
                overflow: auto;
                max-height: calc(80vh - 50px);
            }
            .module-data-body pre {
                margin: 0;
                color: #eee;
                white-space: pre-wrap;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(dialog);

        // Add close button event
        dialog.querySelector('.close-button').addEventListener('click', () => {
            document.body.removeChild(dialog);
        });
    }

    /**
     * Replace a placeholder module with a real implementation
     */
    replacePlaceholderModule(placeholderModule, RealModuleClass) {
        if (!this.inspectedObject) return;

        try {
            // Get original data from placeholder
            const originalData = placeholderModule._originalData || placeholderModule.toJSON();

            // Create new instance of real module
            const newModule = new RealModuleClass();

            // Copy properties from original data
            if (originalData) {
                for (const key in originalData) {
                    if (key !== 'gameObject' && key !== 'type' && key !== 'name' &&
                        key !== 'isPlaceholder' && key !== '_originalData') {
                        try {
                            newModule[key] = originalData[key];
                        } catch (e) {
                            console.warn(`Could not copy property ${key} to new module`);
                        }
                    }
                }
            }

            // Remove the placeholder
            this.inspectedObject.removeModule(placeholderModule);

            // Add the real module
            this.inspectedObject.addModule(newModule);

            // Refresh the inspector
            this.showObjectInspector();

            // Refresh canvas
            if (this.editor) {
                this.editor.refreshCanvas();
            }
        } catch (error) {
            console.error("Error replacing placeholder module:", error);
            alert(`Failed to replace placeholder: ${error.message}`);
        }
    }

    /**
     * Handle placeholder module reimplement action - create a new implementation
     */
    async handlePlaceholderReimplement(module) {
        try {
            const moduleName = module.type;
            const namespace = module.constructor.namespace || 'General';

            // Create a template for the module
            const template = this.generateModuleTemplate(moduleName, namespace, module);

            // Create the file in the project
            const path = `/modules/${moduleName}.js`;

            if (window.fileBrowser) {
                // Check if file already exists
                try {
                    const existing = await window.fileBrowser.readFile(path);
                    if (existing) {
                        const overwrite = confirm(`Module file ${path} already exists. Overwrite?`);
                        if (!overwrite) return;
                    }
                } catch (e) {
                    // File doesn't exist, which is fine
                }

                // Create the file
                await window.fileBrowser.createFile(path, template);

                // Open in script editor if available
                if (window.scriptEditor) {
                    window.scriptEditor.loadFile(path, template);
                    window.scriptEditor.open();
                } else {
                    alert(`Module template created at ${path}. Please edit it to implement the functionality.`);
                }

                // Try to load the module
                try {
                    const ModuleClass = await window.fileBrowser.loadModuleScript(path);
                    if (ModuleClass) {
                        // Replace the placeholder with the real module
                        this.replacePlaceholderModule(module, ModuleClass);
                    }
                } catch (e) {
                    console.warn("Could not automatically load the new module:", e);
                }
            } else {
                // No file browser, just show the template
                alert("File browser not available. Here's the template you can use:");
                console.log(template);
            }
        } catch (error) {
            console.error("Failed to create module implementation:", error);
            alert(`Error: ${error.message}`);
        }
    }

    /**
     * Generate a template for a module implementation
     */
    generateModuleTemplate(moduleName, namespace, placeholder) {
        let template = `/**
    * ${moduleName} - Custom module for Dark Matter JS
    * @namespace ${namespace}
    * @extends Module
    */
    class ${moduleName} extends Module {
        static namespace = "${namespace}";
        static description = "Reimplemented module from placeholder";
        
        constructor() {
            super("${moduleName}");
            
            // Add properties based on the placeholder data
    `;

        // Add properties based on the original data
        const originalData = placeholder._originalData || {};

        // Add property initialization
        for (const key in originalData) {
            if (key !== 'gameObject' && key !== 'type' && key !== 'name' &&
                key !== 'isPlaceholder' && key !== '_originalData' &&
                key !== 'id' && key !== 'enabled') {

                const value = originalData[key];
                let valueStr = '';

                if (value === null) {
                    valueStr = 'null';
                } else if (value === undefined) {
                    valueStr = 'undefined';
                } else if (typeof value === 'string') {
                    valueStr = `"${value.replace(/"/g, '\\"')}"`;
                } else if (typeof value === 'object') {
                    if (Array.isArray(value)) {
                        valueStr = '[]';
                    } else if ('x' in value && 'y' in value) {
                        valueStr = `new Vector2(${value.x}, ${value.y})`;
                    } else {
                        valueStr = '{}';
                    }
                } else {
                    valueStr = String(value);
                }

                template += `        this.${key} = ${valueStr};\n`;
            }
        }

        // Add more template code
        template += `
            // TODO: Add property exposure for the inspector
            // Example: this.exposeProperty("speed", "number", this.speed, { min: 0, max: 10 });
        }
        
        /**
         * Called once when the module is first activated
         */
        start() {
            console.log("${moduleName} started on " + this.gameObject.name);
        }
        
        /**
         * Called every frame (main update logic)
         * @param {number} deltaTime - Time in seconds since the last frame
         */
        loop(deltaTime) {
            // Main logic here
        }
        
        /**
         * Convert to JSON for serialization
         */
        toJSON() {
            return {
                ...super.toJSON(),
                // Add any custom properties that need serialization
            };
        }
    }

    // Register the module globally
    window.${moduleName} = ${moduleName};
    `;

        return template;
    }

    /**
     * Generate module properties UI for placeholder modules
     */
    generatePlaceholderPropertiesUI(module) {
        if (!module._originalData) return '<div class="no-properties">No properties available for this placeholder module.</div>';

        const originalData = module._originalData;
        let html = '';

        // Extract and display properties
        for (const key in originalData) {
            if (key !== 'gameObject' && key !== 'type' && key !== 'name' &&
                key !== 'isPlaceholder' && key !== '_originalData' &&
                key !== 'id' && key !== 'enabled') {

                const value = originalData[key];
                let displayValue = '';

                if (value === null) {
                    displayValue = 'null';
                } else if (value === undefined) {
                    displayValue = 'undefined';
                } else if (typeof value === 'string') {
                    displayValue = `"${value}"`;
                } else if (typeof value === 'object') {
                    if (Array.isArray(value)) {
                        displayValue = `Array[${value.length}]`;
                    } else if ('x' in value && 'y' in value) {
                        displayValue = `Vector2(${value.x}, ${value.y})`;
                    } else {
                        displayValue = 'Object';
                    }
                } else {
                    displayValue = String(value);
                }

                html += `
                <div class="property-row placeholder-property">
                    <label>${this.formatPropertyName(key)}</label>
                    <div class="placeholder-value">${displayValue}</div>
                </div>
                `;
            }
        }

        return html || '<div class="no-properties">No properties available for this placeholder module.</div>';
    }

    /**
     * Generate asset preview HTML
     */
    generateAssetPreview(path, assetType) {
        if (!path) {
            return `<span class="drop-hint">Drop ${assetType} here</span>`;
        }

        switch (assetType) {
            case 'image':
                // Use a placeholder initially and load async
                const placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIGZpbGw9IiMzMzMiLz4=';

                return `
            <div class="image-preview-container">
                <img src="${placeholder}" 
                     data-path="${path}"
                     alt="Asset Preview" 
                     class="asset-thumbnail" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="asset-fallback" style="display:none;">
                    <i class="fas fa-image"></i>
                    <span>Image Error</span>
                </div>
                <div class="asset-path-display">${this.formatImagePath(path)}</div>
            </div>
            `;
            case 'audio':
                return `
            <div class="audio-preview-container">
                <i class="fas fa-music"></i>
                <div class="asset-path-display">${this.formatImagePath(path)}</div>
            </div>
            `;
            default:
                return `
            <div class="generic-preview-container">
                <i class="fas fa-file"></i>
                <div class="asset-path-display">${this.formatImagePath(path)}</div>
            </div>
            `;
        }
    }

    /**
     * Get the proper URL for an asset path
     */
    getAssetUrl(path) {
        if (!path) return '';

        // If it's already a data URL, return as-is
        if (path.startsWith('data:') || path.startsWith('blob:') || path.startsWith('http')) {
            return path;
        }

        // Return a placeholder and load async
        const placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIGZpbGw9IiMzMzMiLz4=';

        // Load the actual image asynchronously
        setTimeout(async () => {
            try {
                const content = await this.editor.fileBrowser.readFile(path);
                if (content && typeof content === 'string' && content.startsWith('data:image/')) {
                    // Find all img elements with this path and update them
                    document.querySelectorAll(`img[data-path="${path}"]`).forEach(img => {
                        img.src = content;
                    });
                }
            } catch (error) {
                console.warn('Could not load image preview:', path, error);
            }
        }, 0);

        return placeholder;
    }

    /**
     * Get image preview from FileBrowser (async helper)
     */
    async getImagePreviewFromFileBrowser(path) {
        try {
            const content = await this.editor.fileBrowser.readFile(path);
            if (content && typeof content === 'string' && content.startsWith('data:image/')) {
                return content;
            }
        } catch (error) {
            console.warn('Could not load image preview from FileBrowser:', path, error);
        }
        return '';
    }

    /**
     * Generate dropdown options for assets
     */
    generateAssetOptions(assetType, currentPath) {
        if (!window.assetManager) return '';

        const assets = window.assetManager.getAvailableAssetPaths(assetType);
        return assets.map(asset =>
            `<option value="${asset.path}" ${asset.path === currentPath ? 'selected' : ''}>${asset.displayName}</option>`
        ).join('');
    }

    /**
     * Update the transform module values when object changes
     */
    updateTransformValues() {
        if (!this.inspectedObject) return;

        const transformModule = this.modulesList.querySelector('.transform-module');
        if (!transformModule) return;

        transformModule.querySelector('.position-x').value = this.inspectedObject.position.x;
        transformModule.querySelector('.position-y').value = this.inspectedObject.position.y;
        transformModule.querySelector('.rotation').value = this.inspectedObject.angle;
        transformModule.querySelector('.depth').value = this.inspectedObject.depth;
    }
}

class AssetSelector {
    static createImageDropdown(currentPath, onSelect) {
        const assets = window.assetManager ?
            window.assetManager.getAvailableAssetPaths('image') : [];

        const select = document.createElement('select');
        select.className = 'asset-dropdown';

        // Add empty option
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '-- Select Image --';
        select.appendChild(emptyOption);

        // Add asset options
        assets.forEach(asset => {
            const option = document.createElement('option');
            option.value = asset.path;
            option.textContent = asset.displayName;
            option.selected = asset.path === currentPath;
            select.appendChild(option);
        });

        select.addEventListener('change', (e) => {
            if (onSelect) onSelect(e.target.value);
        });

        return select;
    }
}
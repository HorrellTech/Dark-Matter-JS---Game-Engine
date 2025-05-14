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
     * Populate the dropdown with available modules, grouped by namespace
     */
    populateModuleDropdown() { // This is the hierarchical version to modify
        this.moduleDropdown.innerHTML = ''; // Clear previous content

        if (!this.availableModules || this.availableModules.length === 0) {
            const message = document.createElement('div');
            message.className = 'dropdown-message';
            message.textContent = 'No modules available';
            this.moduleDropdown.appendChild(message);
            return;
        }

        // 1. Build the hierarchical tree data structure
        const namespaceTree = {};
        const generalModules = [];

        this.availableModules.forEach(moduleInfo => {
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

        // 2. Render the tree
        const renderNode = (node, parentElement, level, pathPrefix = '') => {
            // Sort folder names alphabetically
            const folderNames = Object.keys(node._children || {}).sort();
            
            folderNames.forEach(folderName => {
                const currentPath = pathPrefix ? `${pathPrefix}/${folderName}` : folderName;
                const folderElement = document.createElement('div');
                folderElement.className = 'module-dropdown-folder';
                // folderElement.style.paddingLeft = `${level * 15}px`; // Padding handled by folder-header

                const header = document.createElement('div');
                header.className = 'module-dropdown-folder-header';
                header.style.paddingLeft = `${level * 15 + 10}px`; // Indent header
                
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

                header.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent closing dropdown
                    const currentlyCollapsed = content.style.display === 'none';
                    content.style.display = currentlyCollapsed ? 'block' : 'none';
                    icon.className = `fas ${currentlyCollapsed ? 'fa-chevron-down' : 'fa-chevron-right'}`;
                    this.saveFolderCollapseState(currentPath, !currentlyCollapsed);
                });

                renderNode(node._children[folderName], content, level + 1, currentPath);
            });

            // Sort modules within this folder/namespace alphabetically
            (node._modules || []).sort((a, b) => a.name.localeCompare(b.name)).forEach(moduleClass => {
                const item = document.createElement('div');
                item.className = 'module-dropdown-item';
                const description = moduleClass.description || '';
                item.title = description || moduleClass.name; // Tooltip for full description or name
                item.style.paddingLeft = `${(level * 15) + 20}px`; // Indent module items further

                const nameSpan = document.createElement('span');
                nameSpan.className = 'module-dropdown-item-name';
                nameSpan.textContent = moduleClass.name;
                item.appendChild(nameSpan);

                if (description) {
                    const descSpan = document.createElement('span');
                    descSpan.className = 'module-dropdown-item-description';
                    // Truncate long descriptions for display
                    descSpan.textContent = description.length > 60 ? description.substring(0, 57) + '...' : description;
                    item.appendChild(descSpan);
                }

                item.addEventListener('click', () => {
                    const module = this.addModuleToGameObject(moduleClass);
                    if (module) {
                        this.moduleDropdown.style.display = 'none';
                    }
                });
                parentElement.appendChild(item);
            });
        };
        
        // Create a root node for rendering
        const rootNodeForRendering = { _children: namespaceTree, _modules: [] };
        renderNode(rootNodeForRendering, this.moduleDropdown, 0);

        // Add "General" modules at the end, if any
        if (generalModules.length > 0) {
            if (Object.keys(namespaceTree).length > 0 && generalModules.length > 0) {
                const separator = document.createElement('hr');
                separator.className = 'module-dropdown-separator';
                this.moduleDropdown.appendChild(separator);
            }
            const generalHeader = document.createElement('div');
            generalHeader.className = 'module-dropdown-namespace';
            generalHeader.textContent = 'General';
            // generalHeader.style.paddingLeft = `5px`; // Using class style
            this.moduleDropdown.appendChild(generalHeader);

            generalModules.sort((a, b) => a.name.localeCompare(b.name)).forEach(moduleClass => {
                const item = document.createElement('div');
                item.className = 'module-dropdown-item';
                const description = moduleClass.description || '';
                item.title = description || moduleClass.name;
                item.style.paddingLeft = `20px`; // Indent items under "General"

                const nameSpan = document.createElement('span');
                nameSpan.className = 'module-dropdown-item-name';
                nameSpan.textContent = moduleClass.name;
                item.appendChild(nameSpan);

                if (description) {
                    const descSpan = document.createElement('span');
                    descSpan.className = 'module-dropdown-item-description';
                    descSpan.textContent = description.length > 60 ? description.substring(0, 57) + '...' : description;
                    item.appendChild(descSpan);
                }

                item.addEventListener('click', () => {
                    const module = this.addModuleToGameObject(moduleClass);
                    if (module) {
                        this.moduleDropdown.style.display = 'none';
                    }
                });
                this.moduleDropdown.appendChild(item);
            });
        }
        // console.log('Namespace tree:', namespaceTree, 'General modules:', generalModules);
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
            
            // Add to GameObject
            this.inspectedObject.addModule(module);
            
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
        
        // Store the previous object reference
        const previousObject = this.inspectedObject;
        
        // Update the inspected object
        this.inspectedObject = gameObject;
        
        // Show appropriate UI based on whether an object is selected
        if (!gameObject) {
            this.showNoObjectMessage();
        } else {
            this.showObjectInspector();
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
        // Hide the "Add Module" button container when no object is selected
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
                    <span>Transform</span>
                </div>
                <div class="module-actions">
                    <button class="module-collapse" title="${isCollapsed ? 'Expand' : 'Collapse'}">
                        <i class="fas ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}"></i>
                    </button>
                </div>
            </div>
            <div class="module-content" style="${isCollapsed ? 'display: none;' : ''}">
                <div class="property-row">
                    <label>Position X</label>
                    <input type="number" class="position-x" value="${this.inspectedObject.position.x}" step="1">
                </div>
                <div class="property-row">
                    <label>Position Y</label>
                    <input type="number" class="position-y" value="${this.inspectedObject.position.y}" step="1">
                </div>
                <div class="property-row">
                    <label>Scale X</label>
                    <input type="number" class="scale-x" value="${this.inspectedObject.scale.x}" step="0.1">
                </div>
                <div class="property-row">
                    <label>Scale Y</label>
                    <input type="number" class="scale-y" value="${this.inspectedObject.scale.y}" step="0.1">
                </div>
                <div class="property-row">
                    <label>Rotation</label>
                    <input type="number" class="rotation" value="${this.inspectedObject.angle}" step="1">
                </div>
                <div class="property-row">
                    <label>Depth</label>
                    <input type="number" class="depth" value="${this.inspectedObject.depth}" step="1">
                </div>
                <div class="property-row">
                    <label>Color</label>
                    <input type="color" class="editor-color" value="${this.inspectedObject.editorColor}">
                </div>
            </div>
        `;
        
        this.modulesList.appendChild(transformModule);
        
        // Add collapse button event listener
        const collapseButton = transformModule.querySelector('.module-collapse');
        collapseButton.addEventListener('click', () => {
            const moduleContent = transformModule.querySelector('.module-content');
            const isCollapsed = moduleContent.style.display === 'none';
            
            // Toggle collapse state
            moduleContent.style.display = isCollapsed ? '' : 'none';
            collapseButton.innerHTML = `<i class="fas ${isCollapsed ? 'fa-chevron-up' : 'fa-chevron-down'}"></i>`;
            collapseButton.title = isCollapsed ? 'Collapse' : 'Expand';
            
            // Save collapse state
            this.saveModuleCollapseState('transform', !isCollapsed);
        });
        
        // Add existing event listeners...
        const posXInput = transformModule.querySelector('.position-x');
        const posYInput = transformModule.querySelector('.position-y');
        const scaleXInput = transformModule.querySelector('.scale-x');
        const scaleYInput = transformModule.querySelector('.scale-y');
        const rotationInput = transformModule.querySelector('.rotation');
        const depthInput = transformModule.querySelector('.depth');
        const colorInput = transformModule.querySelector('.editor-color');
        
        // Add color change listener
        colorInput.addEventListener('change', () => {
            if (!this.inspectedObject) return;
            
            // Update the object's color
            this.inspectedObject.editorColor = colorInput.value;
            
            // Update the hierarchy icon color
            const hierarchyIcon = document.querySelector(
                `.hierarchy-item[data-id="${this.inspectedObject.id}"] .hierarchy-icon i`
            );
            if (hierarchyIcon) {
                hierarchyIcon.style.color = colorInput.value;
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
    }

    updateTransformValues() {
        if (!this.inspectedObject) return;
        
        const transformModule = this.modulesList.querySelector('.transform-module');
        if (!transformModule) return;
        
        const pos = this.inspectedObject.position;
        const scale = this.inspectedObject.scale;
        
        transformModule.querySelector('.position-x').value = pos.x;
        transformModule.querySelector('.position-y').value = pos.y;
        transformModule.querySelector('.scale-x').value = scale.x;
        transformModule.querySelector('.scale-y').value = scale.y;
        transformModule.querySelector('.rotation').value = this.inspectedObject.angle;
        transformModule.querySelector('.depth').value = this.inspectedObject.depth;
        transformModule.querySelector('.editor-color').value = this.inspectedObject.editorColor || '#ffffff';
        
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
        moduleContainer.draggable = true; // Make modules draggable
        
        // Try to find module icon
        let iconHtml = '<i class="fas fa-puzzle-piece"></i>'; // Default icon
        
        /*if (this.editor?.fileBrowser) {
            const files = this.editor.fileBrowser.getAllFiles();
            const moduleClassName = module.constructor.name;
            
            // Look for icon file with pattern: moduleName_icon.*
            const iconFile = files.find(file => {
                const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
                return nameWithoutExt === `${moduleClassName}_icon` && 
                    /\.(png|jpg|jpeg|gif|ico)$/i.test(file.name);
            });
            
            if (iconFile) {
                iconHtml = `<img src="${iconFile.path}" class="module-icon" alt="${module.type} icon">`;
            }
        }*/

        // Set module type display name - handle missing/undefined modules
        const moduleDisplayName = module.type || module.constructor.name || 'Unknown Module';
        const isMissingModule = module.missingModule === true;
        
        // Check if this module should be collapsed (from saved state)
        const isCollapsed = this.getModuleCollapseState(module.id);
        
        // Prepare requirements section
        let requirementsHtml = '';
        const requirements = module.getRequirements ? module.getRequirements() : [];
        if (requirements.length > 0) {
            let requirementsList = requirements.map(req => `<span class="requirement-badge">${req}</span>`).join('');
            
            requirementsHtml = `
            <div class="module-requirements">
                <span>Requires:</span> ${requirementsList}
            </div>
            `;
        }

        // Add warning for missing modules
        let warningHtml = '';
        if (isMissingModule) {
            warningHtml = `
            <div class="module-warning">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Module class not found. Data preserved but functionality is limited.</span>
            </div>
            `;
            moduleContainer.classList.add('missing-module');
        }
        
        moduleContainer.innerHTML = `
            <div class="module-header">
                <div class="module-title">
                    <div class="module-drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-lines"></i>
                    </div>
                    ${iconHtml}
                    <span>${module.type}</span>
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
                ${warningHtml}
                ${requirementsHtml}
                ${this.generateModulePropertiesUI(module)}
            </div>
        `;
        
        this.modulesList.appendChild(moduleContainer);
        
        // Add event listeners
        const toggleButton = moduleContainer.querySelector('.module-toggle');
        const removeButton = moduleContainer.querySelector('.module-remove');
        const collapseButton = moduleContainer.querySelector('.module-collapse');
        
        toggleButton.addEventListener('click', () => {
            module.enabled = !module.enabled;
            toggleButton.innerHTML = `<i class="fas ${module.enabled ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>`;
            toggleButton.title = `${module.enabled ? 'Disable' : 'Enable'} Module`;
            
            const moduleContent = moduleContainer.querySelector('.module-content');
            moduleContent.style.opacity = module.enabled ? '1' : '0.5';
            
            this.editor.refreshCanvas();
        });
        
        collapseButton.addEventListener('click', () => {
            const moduleContent = moduleContainer.querySelector('.module-content');
            const isCollapsed = moduleContent.style.display === 'none';
            
            // Toggle collapse state
            moduleContent.style.display = isCollapsed ? '' : 'none';
            collapseButton.innerHTML = `<i class="fas ${isCollapsed ? 'fa-chevron-up' : 'fa-chevron-down'}"></i>`;
            collapseButton.title = isCollapsed ? 'Collapse' : 'Expand';
            
            // Save collapse state
            this.saveModuleCollapseState(module.id, !isCollapsed);
        });
        
        removeButton.addEventListener('click', () => {
            if (confirm(`Remove ${module.type} module?`)) {
                this.inspectedObject.removeModule(module);
                moduleContainer.remove();
                this.editor.refreshCanvas();
            }
        });
        
        // Add event listeners for module-specific properties
        this.setupModulePropertyListeners(moduleContainer, module);
        
        // Set up drag and drop for reordering
        this.setupModuleDragEvents(moduleContainer);
        
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
            // Make the drag handle initiate dragging
            dragHandle.addEventListener('mousedown', (e) => {
                // Set draggable attribute just before drag starts
                moduleElement.setAttribute('draggable', 'true');
                
                // Add grabbing cursor to indicate dragging is possible
                dragHandle.style.cursor = 'grabbing';
                
                // Prevent event propagation to avoid other handlers
                e.stopPropagation();
            });
            
            // Reset draggable attribute after mouseup anywhere
            document.addEventListener('mouseup', () => {
                moduleElement.setAttribute('draggable', 'false');
                if (dragHandle) dragHandle.style.cursor = 'grab';
            }, { once: true });
        }

        // Make the module header draggable too
        if (moduleHeader) {
            moduleHeader.addEventListener('mousedown', (e) => {
                // Only allow drag from the header, not from buttons within it
                if (e.target === moduleHeader || e.target.classList.contains('module-title')) {
                    moduleElement.setAttribute('draggable', 'true');
                }
            });
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

    /**
     * Generate UI for a module based on its exposed properties
     * @param {Module} module - The module to generate UI for
     * @returns {string} HTML for the module properties
     */
    generateModulePropertiesUI(module) {
        // Handle specific module types first
        if (module instanceof SpriteRenderer) {
            return this.generateSpriteRendererUI(module);
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
     * Generate UI for SpriteRenderer module
     */
    generateSpriteRendererUI(module) {
        return `
            <div class="property-row">
                <label>Image</label>
                <div class="image-selector">
                    <div class="image-preview" style="${module.image ? '' : 'display: none;'}">
                        ${module.image ? `<img src="${module.imageSrc}" alt="Sprite">` : ''}
                    </div>
                    <button class="select-image-button">Select Image</button>
                </div>
            </div>
            <div class="property-row">
                <label>Width</label>
                <input type="number" class="sprite-width" value="${module.width || 0}" step="1">
            </div>
            <div class="property-row">
                <label>Height</label>
                <input type="number" class="sprite-height" value="${module.height || 0}" step="1">
            </div>
        `;
    }

    /**
     * Register a module class to be available in the Add Module dropdown
     * @param {Class} moduleClass - The module class to register
     */
    registerModuleClass(moduleClass) {
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
     * Generate UI for a module based on its exposed properties
     * @param {Module} module - The module to generate UI for
     * @returns {string} HTML for the module properties
     */
    generateModulePropertiesUI(module) {
        // Handle specific module types first
        if (module instanceof SpriteRenderer) {
            return this.generateSpriteRendererUI(module);
        }
        
        // For generic modules, use exposed properties
        const exposedProps = module.getExposedProperties ? module.getExposedProperties() : [];
        
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
     * Generate UI for a specific property
     * @param {Object} prop - Property descriptor
     * @param {Module} module - The module the property belongs to
     * @returns {string} HTML for the property UI
     */
    generatePropertyUI(prop, module) {
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

        const inputId = `prop-${module.id}-${prop.name}`;
        
        // Check if the property is a Vector2 or Vector3
        if (value instanceof Vector2 || value instanceof Vector3 || 
            (value && typeof value === 'object' && 'x' in value && 'y' in value)) {
            // Generate collapsible vector fields
            return this.generateVectorUI(prop, module, value);
        }
        
        switch (prop.type) {
            case 'number':
                return `
                    <div class="property-row">
                        <label for="${inputId}">${this.formatPropertyName(prop.name)}</label>
                        <input type="number" id="${inputId}" class="property-input" 
                            data-prop-name="${prop.name}" 
                            value="${value}" 
                            ${prop.options?.min !== undefined ? `min="${prop.options.min}"` : ''}
                            ${prop.options?.max !== undefined ? `max="${prop.options.max}"` : ''}
                            ${prop.options?.step !== undefined ? `step="${prop.options.step}"` : 'step="any"'}>
                    </div>
                `;
            case 'boolean':
                return `
                    <div class="property-row">
                        <label for="${inputId}">${this.formatPropertyName(prop.name)}</label>
                        <input type="checkbox" id="${inputId}" class="property-input" 
                            data-prop-name="${prop.name}" ${value ? 'checked' : ''}>
                    </div>
                `;
            case 'color':
                return `
                    <div class="property-row">
                        <label for="${inputId}">${this.formatPropertyName(prop.name)}</label>
                        <input type="color" id="${inputId}" class="property-input" 
                            data-prop-name="${prop.name}" value="${value}">
                    </div>
                `;
            case 'enum':
                const options = prop.options?.options || [];
                return `
                    <div class="property-row">
                        <label for="${inputId}">${this.formatPropertyName(prop.name)}</label>
                        <select id="${inputId}" class="property-input" data-prop-name="${prop.name}">
                            ${options.map(option => `
                                <option value="${option}" ${value === option ? 'selected' : ''}>
                                    ${this.formatPropertyName(option)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                `;
            case 'vector2':
                return this.generateVectorUI(prop, module, value);
            case 'vector3':
                return this.generateVectorUI(prop, module, value);
            default:
                return `
                    <div class="property-row">
                        <label for="${inputId}">${this.formatPropertyName(prop.name)}</label>
                        <input type="text" id="${inputId}" class="property-input" 
                            data-prop-name="${prop.name}" value="${value}">
                    </div>
                `;
        }
    }

    /**
     * Populate the dropdown with available modules, structured as a hierarchical tree.
     */
    populateModuleDropdown() {
        this.moduleDropdown.innerHTML = ''; // Clear previous content

        if (!this.availableModules || this.availableModules.length === 0) {
            const message = document.createElement('div');
            message.className = 'dropdown-message';
            message.textContent = 'No modules available';
            this.moduleDropdown.appendChild(message);
            return;
        }

        // 1. Build the hierarchical tree data structure
        const namespaceTree = {};
        const generalModules = [];

        this.availableModules.forEach(moduleInfo => {
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

        // 2. Render the tree
        const renderNode = (node, parentElement, level, pathPrefix = '') => {
            // Sort folder names alphabetically
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

                header.addEventListener('click', () => {
                    const currentlyCollapsed = content.style.display === 'none';
                    content.style.display = currentlyCollapsed ? 'block' : 'none';
                    icon.className = `fas ${currentlyCollapsed ? 'fa-chevron-down' : 'fa-chevron-right'}`;
                    this.saveFolderCollapseState(currentPath, !currentlyCollapsed);
                });

                renderNode(node._children[folderName], content, level + 1, currentPath);
            });

            // Sort modules within this folder/namespace alphabetically
            (node._modules || []).sort((a, b) => a.name.localeCompare(b.name)).forEach(moduleClass => {
                const item = document.createElement('div');
                item.className = 'module-dropdown-item';
                item.textContent = moduleClass.name;
                item.style.paddingLeft = `${(level * 15) + 15}px`; // Indent module items further

                item.addEventListener('click', () => {
                    const module = this.addModuleToGameObject(moduleClass);
                    if (module) {
                        this.moduleDropdown.style.display = 'none';
                    }
                });
                parentElement.appendChild(item);
            });
        };
        
        // Create a root node for rendering
        const rootNodeForRendering = { _children: namespaceTree, _modules: [] };
        renderNode(rootNodeForRendering, this.moduleDropdown, 0);

        // Add "General" modules at the end, if any
        if (generalModules.length > 0) {
            if (Object.keys(namespaceTree).length > 0 && generalModules.length > 0) { // Add separator if there were other namespaces
                const separator = document.createElement('hr');
                separator.className = 'module-dropdown-separator';
                this.moduleDropdown.appendChild(separator);
            }
            const generalHeader = document.createElement('div');
            generalHeader.className = 'module-dropdown-namespace'; // Use existing style or create a new one
            generalHeader.textContent = 'General';
            generalHeader.style.paddingLeft = `5px`; // Minimal indent for top-level group
            this.moduleDropdown.appendChild(generalHeader);

            generalModules.sort((a, b) => a.name.localeCompare(b.name)).forEach(moduleClass => {
                const item = document.createElement('div');
                item.className = 'module-dropdown-item';
                item.textContent = moduleClass.name;
                item.style.paddingLeft = `20px`; // Indent items under "General"

                item.addEventListener('click', () => {
                    const module = this.addModuleToGameObject(moduleClass);
                    if (module) {
                        this.moduleDropdown.style.display = 'none';
                    }
                });
                this.moduleDropdown.appendChild(item);
            });
        }
        console.log('Namespace tree:', namespaceTree, 'General modules:', generalModules);
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
        const isVector3 = vector instanceof Vector3;
        const propName = prop.name;
        const inputId = `prop-${module.id}-${propName}`;
        const collapsibleId = `vector-${module.id}-${propName}`;
        
        // Get collapse state from local storage or default to collapsed
        const isCollapsed = this.getVectorCollapseState(module.id + propName);
        
        // Generate HTML for the vector UI
        return `
            <div class="property-row vector-property">
                <div class="vector-header">
                    <label for="${inputId}">${this.formatPropertyName(propName)}</label>
                    <div class="vector-preview">(${vector.x.toFixed(1)}, ${vector.y.toFixed(1)}${isVector3 ? `, ${vector.z.toFixed(1)}` : ''})</div>
                    <button class="vector-collapse" title="${isCollapsed ? 'Expand' : 'Collapse'}" data-target="${collapsibleId}">
                        <i class="fas ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}"></i>
                    </button>
                </div>
                <div class="vector-components" id="${collapsibleId}" style="${isCollapsed ? 'display: none;' : ''}">
                    <div class="vector-component">
                        <label>X</label>
                        <input type="number" class="component-input" 
                            data-prop-name="${propName}" 
                            data-component="x" 
                            value="${vector.x}" 
                            step="1">
                    </div>
                    <div class="vector-component">
                        <label>Y</label>
                        <input type="number" class="component-input" 
                            data-prop-name="${propName}" 
                            data-component="y" 
                            value="${vector.y}" 
                            step="1">
                    </div>
                    ${isVector3 ? `
                    <div class="vector-component">
                        <label>Z</label>
                        <input type="number" class="component-input" 
                            data-prop-name="${propName}" 
                            data-component="z" 
                            value="${vector.z}" 
                            step="1">
                    </div>
                    ` : ''}
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
                // Return the state if it exists, otherwise default to collapsed
                return collapseStates[vectorId] !== undefined ? collapseStates[vectorId] : true;
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
        // Handle special module types first
        if (module instanceof SpriteRenderer) {
            this.setupSpriteRendererListeners(container, module);
        }
        
        // Handle vector collapsible buttons
        const vectorCollapseButtons = container.querySelectorAll('.vector-collapse');
        vectorCollapseButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.dataset.target;
                const vectorComponents = container.querySelector(`#${targetId}`);
                const isCollapsed = vectorComponents.style.display === 'none';
                
                // Toggle collapse state
                vectorComponents.style.display = isCollapsed ? '' : 'none';
                button.innerHTML = `<i class="fas ${isCollapsed ? 'fa-chevron-up' : 'fa-chevron-down'}"></i>`;
                button.title = isCollapsed ? 'Collapse' : 'Expand';
                
                // Save collapse state
                if (button.dataset.vectorId) {
                    this.saveVectorCollapseState(button.dataset.vectorId, !isCollapsed);
                }
            });
        });
        
        // Handle vector component inputs
        const componentInputs = container.querySelectorAll('.component-input');
        componentInputs.forEach(input => {
            const propName = input.dataset.propName;
            const component = input.dataset.component;
            
            input.addEventListener('change', () => {
                if (!module[propName]) {
                    // If property doesn't exist directly, look in module.properties
                    if (module.properties && module.properties[propName]) {
                        if (!module.properties[propName][component]) {
                            module.properties[propName][component] = 0;
                        }
                        module.properties[propName][component] = parseFloat(input.value);
                    }
                } else {
                    // Direct property access
                    if (module[propName] && module[propName][component] !== undefined) {
                        module[propName][component] = parseFloat(input.value);
                    }
                }
                
                this.editor.refreshCanvas();
            });
        });
        
        // Handle generic property inputs
        const inputs = container.querySelectorAll('.property-input');
        inputs.forEach(input => {
            const propName = input.dataset.propName;
            
            input.addEventListener('change', () => {
                let value;
                
                // Handle different input types
                if (input.type === 'checkbox') {
                    value = input.checked;
                } else if (input.type === 'number') {
                    value = parseFloat(input.value);
                } else if (input.type === 'color') {
                    value = input.value;
                } else if (input.tagName === 'SELECT') {
                    value = input.value;
                } else {
                    value = input.value;
                }
                
                // Try to set property using setProperty method first
                if (typeof module.setProperty === 'function') {
                    module.setProperty(propName, value);
                } 
                // Then try direct property access
                else if (propName in module) {
                    module[propName] = value;
                }
                // Finally fall back to module.properties
                else if (module.properties) {
                    module.properties[propName] = value;
                }
                
                this.editor.refreshCanvas();
            });
        });
    }

    /**
     * Setup listeners for SpriteRenderer properties
     */
    setupSpriteRendererListeners(container, module) {
        const selectImageButton = container.querySelector('.select-image-button');
        const widthInput = container.querySelector('.sprite-width');
        const heightInput = container.querySelector('.sprite-height');
        
        selectImageButton.addEventListener('click', () => {
            // In a real implementation, this would open a file dialog
            const imageSrc = prompt('Enter image URL:', module.imageSrc || '');
            if (imageSrc) {
                module.loadImage(imageSrc)
                    .then(() => {
                        const preview = container.querySelector('.image-preview');
                        preview.style.display = 'block';
                        preview.innerHTML = `<img src="${module.imageSrc}" alt="Sprite">`;
                        
                        // Update width and height inputs
                        widthInput.value = module.width;
                        heightInput.value = module.height;
                        
                        this.editor.refreshCanvas();
                    })
                    .catch(err => {
                        console.error('Error loading image:', err);
                        alert('Failed to load image.');
                    });
            }
        });
        
        widthInput.addEventListener('change', () => {
            module.width = parseFloat(widthInput.value);
            this.editor.refreshCanvas();
        });
        
        heightInput.addEventListener('change', () => {
            module.height = parseFloat(heightInput.value);
            this.editor.refreshCanvas();
        });
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
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
populateModuleDropdown() {
    this.moduleDropdown.innerHTML = ''; 

    if (!this.availableModules.length) {
        const msg = document.createElement('div');
        msg.className = 'dropdown-message';
        msg.textContent = 'No modules available';
        this.moduleDropdown.appendChild(msg);
        return;
    }

    // Build namespace tree
    const nsTree = {}, general = [];
    this.availableModules.forEach(({ namespace, moduleClass }) => {
        if (!namespace || namespace.toLowerCase()==='general') {
            general.push(moduleClass);
        } else {
            const parts = namespace.split('/');
            let cur = nsTree;
            parts.forEach(p => { cur[p] = cur[p]||{ _children:{},_modules:[] }; cur = cur[p]._children; });
            cur._modules = cur._modules||[];
            cur._modules.push(moduleClass);
        }
    });

    // Recursive render
    const render = (node, parentEl, level=0) => {
        // folders
        Object.keys(node._children||{}).sort().forEach(folder => {
            const frame = document.createElement('div');
            frame.className = 'module-dropdown-folder';
            const hdr = document.createElement('div');
            hdr.className = 'module-dropdown-folder-header';
            hdr.style.paddingLeft = `${10 + level*15}px`;
            const icon = document.createElement('i');
            const collapsed = this.getFolderCollapseState(folder);
            icon.className = `fas ${collapsed?'fa-chevron-right':'fa-chevron-down'}`;
            hdr.append(icon, document.createTextNode(folder));
            frame.appendChild(hdr);

            const content = document.createElement('div');
            content.className = 'module-dropdown-folder-content';
            if (collapsed) content.style.display = 'none';
            frame.appendChild(content);
            parentEl.appendChild(frame);

            hdr.addEventListener('click', e => {
                e.stopPropagation();
                const show = content.style.display==='none';
                content.style.display = show?'block':'none';
                icon.className = `fas ${show?'fa-chevron-down':'fa-chevron-right'}`;
                this.saveFolderCollapseState(folder, !show);
            });
            render(node._children[folder], content, level+1);
        });

        // modules
        (node._modules||[]).sort((a,b)=>a.name.localeCompare(b.name))
        .forEach(ModuleClass => {
            const desc = ModuleClass.description||'';
            const item = document.createElement('div');
            item.className = 'module-dropdown-item';
            item.style.paddingLeft = `${20 + level*15}px`;
            item.title = desc||ModuleClass.name;

            const name = document.createElement('span');
            name.className = 'module-dropdown-item-name';
            name.textContent = ModuleClass.name;
            item.appendChild(name);

            if (desc) {
                const d = document.createElement('span');
                d.className = 'module-dropdown-item-description';
                d.textContent = desc.length>60?desc.slice(0,57)+'...':desc;
                item.appendChild(d);
            }

            item.addEventListener('click', () => {
                if (this.addModuleToGameObject(ModuleClass)) {
                    this.moduleDropdown.style.display = 'none';
                }
            });
            parentEl.appendChild(item);
        });
    };

    render({ _children: nsTree, _modules: [] }, this.moduleDropdown);

    // "General" at the end
    if (general.length) {
        if (Object.keys(nsTree).length) {
            const hr = document.createElement('hr');
            hr.className = 'module-dropdown-separator';
            this.moduleDropdown.appendChild(hr);
        }
        const hdr = document.createElement('div');
        hdr.className = 'module-dropdown-namespace';
        hdr.textContent = 'General';
        this.moduleDropdown.appendChild(hdr);

        general.sort((a,b)=>a.name.localeCompare(b.name)).forEach(ModuleClass => {
            const desc = ModuleClass.description||'';
            const item = document.createElement('div');
            item.className = 'module-dropdown-item';
            item.style.paddingLeft = '20px';
            item.title = desc||ModuleClass.name;

            const name = document.createElement('span');
            name.className = 'module-dropdown-item-name';
            name.textContent = ModuleClass.name;
            item.appendChild(name);

            if (desc) {
                const d = document.createElement('span');
                d.className = 'module-dropdown-item-description';
                d.textContent = desc.length>60?desc.slice(0,57)+'...':desc;
                item.appendChild(d);
            }

            item.addEventListener('click', () => {
                if (this.addModuleToGameObject(ModuleClass)) {
                    this.moduleDropdown.style.display = 'none';
                }
            });
            this.moduleDropdown.appendChild(item);
        });
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
                    <label title="X scale factor">Scale X</label>
                    <input type="number" class="scale-x" value="${this.inspectedObject.scale.x}" step="0.1" title="X scale factor">
                </div>
                <div class="property-row">
                    <label title="Y scale factor">Scale Y</label>
                    <input type="number" class="scale-y" value="${this.inspectedObject.scale.y}" step="0.1" title="Y scale factor">
                </div>
                <div class="property-row">
                    <label title="Rotation angle in degrees">Rotation</label>
                    <input type="number" class="rotation" value="${this.inspectedObject.angle}" step="1" title="Rotation angle in degrees">
                </div>
                <div class="property-row">
                    <label title="Render depth/layer">Depth</label>
                    <input type="number" class="depth" value="${this.inspectedObject.depth}" step="1" title="Render depth/layer">
                </div>
                <div class="property-row">
                    <label title="Color in editor view">Color</label>
                    <input type="color" class="editor-color" value="${this.inspectedObject.editorColor}" title="Color in editor view">
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
        // If this is a placeholder module, use the placeholder UI
        if (module.isPlaceholder || module.constructor.isPlaceholder) {
            return this.generatePlaceholderPropertiesUI(module);
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
        // Create image preview display
        const hasImage = module.imageAsset && (typeof module.imageAsset === 'string' ? module.imageAsset : module.imageAsset.path);
        const imageSrc = module._image ? module._image.src : '';
        const imagePath = typeof module.imageAsset === 'string' ? module.imageAsset : 
                        (module.imageAsset && module.imageAsset.path ? module.imageAsset.path : 'No image selected');
        
        return `
            <div class="property-row">
                <label>Image</label>
                <div class="image-selector" data-module-id="${module.id}">
                    <div class="image-preview ${hasImage ? '' : 'empty'}" 
                        title="${hasImage ? `Path: ${imagePath}` : 'Drag an image here or click to select'}"
                        data-property="imageAsset">
                        ${hasImage ? 
                            `<img src="${imageSrc}" alt="Sprite">
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
     * Show image selector dialog for SpriteRenderer
     */
    showImageSelector(module) {
        // Create the image selector dialog
        const dialog = document.createElement('div');
        dialog.className = 'image-selector-dialog';
        dialog.innerHTML = `
            <div class="image-selector-content">
                <div class="image-selector-header">
                    <h3>Select Image</h3>
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
        
        // Add styles for the dialog
        const style = document.createElement('style');
        style.innerHTML = `
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
        this.loadProjectImages(dialog.querySelector('.project-images-grid'), module);
        
        // Set up URL tab functionality
        const urlInput = dialog.querySelector('.url-input');
        const loadUrlButton = dialog.querySelector('.load-url-button');
        
        loadUrlButton.addEventListener('click', async () => {
            const url = urlInput.value.trim();
            if (url) {
                try {
                    await module.loadImageFromUrl(url);
                    this.refreshModuleUI(module);
                    this.editor.refreshCanvas();
                    this.closeDialog(dialog, style);
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
                await this.handleImageUpload(file, module);
                this.closeDialog(dialog, style);
            }
        });
        
        uploadButton.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            
            input.onchange = async (e) => {
                if (e.target.files && e.target.files[0]) {
                    await this.handleImageUpload(e.target.files[0], module);
                    this.closeDialog(dialog, style);
                }
            };
            
            input.click();
        });
        
        // Set up close button and cancel button
        const closeButton = dialog.querySelector('.image-selector-close');
        const cancelButton = dialog.querySelector('.cancel-button');
        
        const closeHandler = () => {
            this.closeDialog(dialog, style);
        };
        
        closeButton.addEventListener('click', closeHandler);
        cancelButton.addEventListener('click', closeHandler);
    }

    /**
     * Close the image selector dialog
     */
    closeDialog(dialog, style) {
        document.body.removeChild(dialog);
        document.head.removeChild(style);
    }

    /**
     * Handle image upload for SpriteRenderer
     */
    async handleImageUpload(file, module) {
        if (!file.type.startsWith('image/')) {
            alert('The selected file is not an image.');
            return;
        }
        
        try {
            // Get the FileBrowser instance
            const fileBrowser = this.editor?.fileBrowser;
            if (!fileBrowser) {
                console.warn('FileBrowser not available for image upload');
                return;
            }
            
            // Upload to FileBrowser
            await fileBrowser.handleFileUpload(file);
            
            // Set the sprite to this path
            const path = `${fileBrowser.currentPath}/${file.name}`;
            await module.setSprite(path);
            
            // Refresh UI
            this.refreshModuleUI(module);
            this.editor.refreshCanvas();
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Failed to upload image. Please try again.');
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

        // Add drag and drop styles on first call
        this.addDragAndDropStyles();

        const inputId = `prop-${module.id}-${prop.name}`;
        
        // Get description for tooltip from options if available
        const tooltip = prop.options?.description || `${this.formatPropertyName(prop.name)}`;
        
        // Check if the property is a Vector2 or Vector3
        if (value instanceof Vector2 || value instanceof Vector3 || 
            (value && typeof value === 'object' && 'x' in value && 'y' in value)) {
            // Generate collapsible vector fields
            return this.generateVectorUI(prop, module, value);
        }

        // Handle image assets specially
        if (prop.type === 'image' || prop.type === 'asset' && prop.options?.assetType === 'image') {
            const inputId = `prop-${module.id}-${prop.name}`;
            const tooltip = prop.options?.description || `${this.formatPropertyName(prop.name)}`;
            
            // Get current value
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
            
            // Get path from value (handle both string paths and AssetReference objects)
            const path = value?.path || value || '';
            
            return `
                <div class="property-row">
                    <label for="${inputId}" title="${tooltip}">${this.formatPropertyName(prop.name)}</label>
                    <div class="image-drop-target" 
                        data-property="${prop.name}" 
                        ${prop.options?.assetType ? `data-asset-type="${prop.options.assetType}"` : 'data-property-type="image"'}
                        title="Drag an image here or click to select">
                        ${path ? `
                            <div class="image-path">${this.formatImagePath(path)}</div>
                        ` : ''}
                    </div>
                    <input type="text" id="${inputId}" class="property-input" 
                        data-prop-name="${prop.name}" 
                        ${prop.options?.assetType ? `data-asset-type="${prop.options.assetType}"` : 'data-property-type="image"'}
                        value="${path}" title="${tooltip}">
                </div>
            `;
        }
        
        switch (prop.type) {
            case 'number':
                return `
                    <div class="property-row">
                        <label for="${inputId}" title="${tooltip}">${this.formatPropertyName(prop.name)}</label>
                        <input type="number" id="${inputId}" class="property-input" 
                            data-prop-name="${prop.name}" 
                            value="${value}" 
                            title="${tooltip}"
                            ${prop.options?.min !== undefined ? `min="${prop.options.min}"` : ''}
                            ${prop.options?.max !== undefined ? `max="${prop.options.max}"` : ''}
                            ${prop.options?.step !== undefined ? `step="${prop.options.step}"` : 'step="any"'}>
                    </div>
                `;
            case 'boolean':
                return `
                    <div class="property-row">
                        <label for="${inputId}" title="${tooltip}">${this.formatPropertyName(prop.name)}</label>
                        <input type="checkbox" id="${inputId}" class="property-input" 
                            data-prop-name="${prop.name}" ${value ? 'checked' : ''}
                            title="${tooltip}">
                    </div>
                `;
            case 'color':
                return `
                    <div class="property-row">
                        <label for="${inputId}" title="${tooltip}">${this.formatPropertyName(prop.name)}</label>
                        <input type="color" id="${inputId}" class="property-input" 
                            data-prop-name="${prop.name}" value="${value || '#ffffff'}"
                            title="${tooltip}">
                    </div>
                `;
            case 'enum':
                const options = prop.options?.options || [];
                return `
                    <div class="property-row">
                        <label for="${inputId}" title="${tooltip}">${this.formatPropertyName(prop.name)}</label>
                        <select id="${inputId}" class="property-input" data-prop-name="${prop.name}"
                            title="${tooltip}">
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
            case 'polygon':
                return this.generatePolygonUI(prop, module);
            default:
                return `
                    <div class="property-row">
                        <label for="${inputId}" title="${tooltip}">${this.formatPropertyName(prop.name)}</label>
                        <input type="text" id="${inputId}" class="property-input" 
                            data-prop-name="${prop.name}" value="${value}"
                            title="${tooltip}">
                    </div>
                `;
        }
    }

    /**
     * Render a collapsible list editor for a polygon (Vector2[]) property
     */
    generatePolygonUI(prop, module) {
        const id     = `prop-${module.id}-${prop.name}`;
        const verts  = module[prop.name] || [];
        const min    = prop.options?.minItems || 3;
        const collapsed = this.getVectorCollapseState(id) ?? true;

        // List header + controls
        let html = `
        <div class="property-row polygon-property">
        <label>${this.formatPropertyName(prop.name)}</label>
        <button class="vector-collapse" data-target="${id}" data-vector-id="${id}" title="${collapsed?'Expand':'Collapse'}">
            <i class="fas ${collapsed?'fa-chevron-down':'fa-chevron-up'}"></i>
        </button>
        </div>
        <div class="vector-components" id="${id}" style="${collapsed?'display:none':''}">`;

        verts.forEach((v, i) => {
        html += `
        <div class="vector-component">
            <label>${i+1}</label>
            <input type="number" class="component-input" data-prop-name="${prop.name}" data-component="${i}:x" value="${v.x}" step="1">
            <input type="number" class="component-input" data-prop-name="${prop.name}" data-component="${i}:y" value="${v.y}" step="1">
            <button class="remove-vertex" data-index="${i}" data-prop-name="${prop.name}" ${verts.length<=min?'disabled':''}>×</button>
        </div>`;
        });

        html += `
        <button class="add-vertex" data-prop-name="${prop.name}">
            <i class="fas fa-plus"></i> Add Point
        </button>
        </div>`;

        return html;
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
        const propName = prop.name;
        const collapsibleId = `vector-${module.id}-${propName}`;
        const isCollapsed = this.getVectorCollapseState(collapsibleId);
        const isVector3 = vector.z !== undefined;
        
        // Get tooltip from options if available
        const tooltip = prop.options?.description || `${this.formatPropertyName(propName)}`;
    
        return `
        <div class="property-row vector-property">
            <div class="vector-header">
                <label title="${tooltip}">${this.formatPropertyName(propName)}</label>
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
        
            <div class="vector-components" id="${collapsibleId}" style="${isCollapsed ? 'display:none' : ''}">
                <div class="vector-component">
                    <label title="X coordinate">X</label>
                    <input type="number" class="component-input"
                        data-prop-name="${propName}"
                        data-component="x"
                        value="${vector.x}" step="1"
                        title="${tooltip} (X coordinate)">
                </div>
                <div class="vector-component">
                    <label title="Y coordinate">Y</label>
                    <input type="number" class="component-input"
                        data-prop-name="${propName}"
                        data-component="y"
                        value="${vector.y}" step="1"
                        title="${tooltip} (Y coordinate)">
                </div>
                ${isVector3 ? `
                <div class="vector-component">
                    <label title="Z coordinate">Z</label>
                    <input type="number" class="component-input"
                        data-prop-name="${propName}"
                        data-component="z"
                        value="${vector.z}" step="1"
                        title="${tooltip} (Z coordinate)">
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
            // Mark the scene as dirty for auto-save
            if (this.editor && this.editor.activeScene) {
                this.editor.activeScene.dirty = true;
            }
            
            // Force a proper sync by directly calling the engine's sync method
            if (window.engine && window.engine.running) {
                if (window.gameEditorSync) {
                    window.gameEditorSync.syncEditorToGame();
                } else if (window.engine.syncFromEditor) {
                    window.engine.syncFromEditor();
                }
            }
            
            // Refresh the editor canvas to show changes
            if (this.editor) {
                this.editor.refreshCanvas();
            }
        };
    
        // First, set up image drag and drop for any property that expects an image
        container.querySelectorAll('[data-property-type="image"], [data-asset-type="image"]').forEach(element => {
            this.setupImageDropTarget(element, module);
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
                
                // IMPORTANT: Update game object for immediate effect
                updateGameObject();
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
                
                // IMPORTANT: Update game object for immediate effect
                updateGameObject();
            });
        });
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
        if (!path) return false;
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
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
                min-height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .image-drop-target:hover {
                border-color: #0078D7;
            }
            
            .image-drop-target.drag-over {
                border-color: #0078D7;
                background-color: rgba(0, 120, 215, 0.05);
            }
            
            .image-drop-target::after {
                content: "Drag image here";
                position: absolute;
                color: #888;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s ease;
            }
            
            .image-drop-target:empty::after,
            .image-drop-target.drag-over::after {
                opacity: 1;
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
        `;
        
        document.head.appendChild(styleElement);
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
                
                // Update the module property
                if (typeof module.setProperty === 'function') {
                    module.setProperty(propertyName, imagePath);
                } else if (typeof module.setSprite === 'function' && propertyName === 'imageAsset') {
                    await module.setSprite(imagePath);
                } else {
                    module[propertyName] = imagePath;
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
        
        // Make it clickable to open file browser if module supports it
        if (typeof module.loadImageFromFile === 'function') {
            element.addEventListener('click', () => {
                module.loadImageFromFile();
            });
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
        
        // Set up the image preview drag and drop if the module has setupDragAndDrop method
        if (imagePreview && typeof module.setupDragAndDrop === 'function') {
            module.setupDragAndDrop(imagePreview);
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
        
        // Standard property handlers for width and height inputs
        container.querySelectorAll('.property-input').forEach(input => {
            if (!input) return;
            
            input.addEventListener('change', () => {
                const propName = input.dataset.propName;
                if (!propName) return;
                
                let value;
                if (input.type === 'number') {
                    value = parseFloat(input.value);
                    if (isNaN(value)) value = 0;
                } else {
                    value = input.value;
                }
                
                module[propName] = value;
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
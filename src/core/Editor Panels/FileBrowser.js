class FileBrowser {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentPath = '';
        this.items = [];
        this.selectedItems = new Set();
        this.dbName = 'DARKMATTERJSDB_001' + Math.random().toString(36).substring(2, 15);
        this.dbVersion = 1;
        this.fileTypes = {}; // Initialize fileTypes object first
        this.isInitializing = false; // Track initialization state

        // Editor window registry
        this.editorWindows = new Map(); // Store registered EditorWindow classes

        // Add clipboard state
        this.clipboard = {
            items: [],
            operation: null // 'copy' or 'cut'
        };

        this.initializeUI();
        this.initializeDB().then(() => {
            // Initialize directory tree after DB is ready
            this.directoryTree = new DirectoryTree(this);
            this.treePanel.appendChild(this.directoryTree.container);
            this.directoryTree.initialize();

            // Register file types
            this.fileTypes['.scene'] = {
                icon: 'fa-gamepad',
                color: '#64B5F6',
                onDoubleClick: (file) => this.openSceneFile(file)
            };

            this.fileTypes['.spritecode'] = {
                icon: 'fa-palette',
                color: '#3b82f6',
                onDoubleClick: (file) => {
                    if (window.spriteCode) {
                        window.spriteCode.openModal();
                        window.spriteCode.loadDrawingFromFile(file.path);
                    }
                }
            };

            this.fileTypes['.doc'] = {
                icon: 'fa-book',
                color: '#4CAF50',
                onDoubleClick: (file) => this.showDocModal(file)
            };

            // Scan for existing EditorWindow scripts
            this.scanForEditorWindowScripts();
        });

        if (!this.assetManager) {
            if (window.assetManager) {
                this.assetManager = window.assetManager;
                // IMPORTANT: Connect the FileBrowser to the existing AssetManager
                this.assetManager.fileBrowser = this;
            } else {
                this.assetManager = new AssetManager(this);
                window.assetManager = this.assetManager; // Make it global
            }
        }

        // Register file types after initialization
        this.fileTypes['.scene'] = {
            icon: 'fa-gamepad',
            color: '#64B5F6',
            onDoubleClick: (file) => this.openSceneFile(file)
        };

        this.fileTypes['.spritecode'] = {
            icon: 'fa-palette',
            color: '#3b82f6',
            onDoubleClick: (file) => {
                if (window.spriteCode) {
                    window.spriteCode.openModal();
                    window.spriteCode.loadDrawingFromFile(file.path);
                }
            }
        };
    }

    async initializeDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                this.loadContent('/');
                resolve();
            };

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('files')) {
                    const store = db.createObjectStore('files', { keyPath: 'path' });
                    store.createIndex('parentPath', 'parentPath', { unique: false });

                    // Create root folder
                    store.add({
                        name: '',
                        path: '/',
                        parentPath: null,
                        type: 'folder',
                        created: Date.now()
                    });
                }
            };
        });
    }

    initializeUI() {
        // Create container for the file browser
        this.fbContainer = document.createElement('div');
        this.fbContainer.id = 'fileBrowserContainer';
        this.fbContainer.style.display = 'flex';
        this.fbContainer.style.flexDirection = 'column';
        this.fbContainer.style.height = '100%';
        this.fbContainer.style.overflow = 'hidden';

        // Create toolbar
        this.toolbar = document.createElement('div');
        this.toolbar.className = 'file-browser-toolbar';
        this.toolbar.style.flexShrink = '0'; // Prevent toolbar from shrinking
        this.toolbar.innerHTML = `
            <button class="fb-button" id="fbNewFolder" title="New Folder"><i class="fas fa-folder-plus"></i></button>
            <div class="fb-separator"></div>
            <button class="fb-button" id="fbNewScript" title="New Script"><i class="fas fa-file-code"></i></button>
            <button class="fb-button" id="fbNewDoc" title="New Documentation File"><i class="fas fa-book"></i></button>
            <button class="fb-button" id="fbNewTextFile" title="New Text File"><i class="fas fa-file-alt"></i></button>
            <button class="fb-button" id="fbNewScene" title="New Scene"><i class="fas fa-file"></i></button>
            <div class="fb-separator"></div>
            <button class="fb-button" id="fbUploadFile" title="Upload File"><i class="fas fa-file-upload"></i></button>
            <button class="fb-button" id="fbDeleteItem" title="Delete"><i class="fas fa-trash"></i></button>
            <div class="fb-separator"></div>
            <button class="fb-button" id="fbExportAssets" title="Export Assets"><i class="fas fa-file-export"></i></button>
            <button class="fb-button" id="fbImportAssets" title="Import Assets"><i class="fas fa-file-import"></i></button>
        `;

        this.breadcrumb = document.createElement('div');
        this.breadcrumb.className = 'fb-breadcrumb';
        this.toolbar.appendChild(this.breadcrumb);

        // Create EditorWindow tools toolbar
        this.createEditorWindowToolbar();

        // Create the split container for directory tree and file browser
        this.splitContainer = document.createElement('div');
        this.splitContainer.className = 'fb-split-container';
        this.splitContainer.style.display = 'flex';
        this.splitContainer.style.flex = '1';
        this.splitContainer.style.overflow = 'hidden';

        // Create the tree panel container
        this.treePanel = document.createElement('div');
        this.treePanel.className = 'fb-tree-panel';
        this.treePanel.style.width = '25%'; // Default width
        this.treePanel.style.borderRight = '1px solid #1e1e1e';
        this.treePanel.style.overflow = 'auto';

        // Create the content area (file browser)
        this.content = document.createElement('div');
        this.content.className = 'file-browser-content';
        this.content.style.flex = '1';
        this.content.style.overflow = 'auto';

        // Create a resizer handle for the tree panel
        this.treePanelResizer = document.createElement('div');
        this.treePanelResizer.className = 'fb-tree-resizer';
        this.treePanelResizer.style.width = '5px';
        this.treePanelResizer.style.cursor = 'col-resize';
        this.treePanelResizer.style.backgroundColor = '#1e1e1e';

        // Add components to container
        this.splitContainer.appendChild(this.treePanel);
        this.splitContainer.appendChild(this.treePanelResizer);
        this.splitContainer.appendChild(this.content);

        // Add to main container
        this.fbContainer.appendChild(this.toolbar);
        this.fbContainer.appendChild(this.editorWindowToolbar); // EditorWindow toolbar
        this.fbContainer.appendChild(this.splitContainer);

        // IMPORTANT: Append to the DOM before setting up event listeners
        this.container.appendChild(this.fbContainer);

        // Setup event listeners
        this.setupEventListeners();

        // Set up resizer for tree panel
        this.setupTreePanelResizer();

        // Set up module drop target functionality
        this.setupModuleDropTarget();
    }

    setupEventListeners() {
        // Toolbar button events
        document.getElementById('fbNewFolder').addEventListener('click', () => this.promptNewFolder());
        document.getElementById('fbNewScript').addEventListener('click', () => this.promptNewScript());
        document.getElementById('fbNewTextFile').addEventListener('click', () => this.promptNewTextFile());
        document.getElementById('fbNewScene').addEventListener('click', () => this.promptNewSceneFile());
        document.getElementById('fbUploadFile').addEventListener('click', () => this.uploadFile());
        document.getElementById('fbDeleteItem').addEventListener('click', () => this.deleteSelected());
        document.getElementById('fbNewDoc')?.addEventListener('click', () => this.promptNewDoc());

        // Breadcrumb navigation
        this.breadcrumb.addEventListener('click', (e) => {
            const crumb = e.target.closest('.fb-crumb');
            if (crumb) {
                this.navigateTo(crumb.dataset.path || '/');
            }
        });

        // Context menu
        this.content.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const item = e.target.closest('.fb-item');

            // Select the item if right-clicked
            if (item && !this.selectedItems.has(item)) {
                this.selectItem(item, !e.ctrlKey);
            }

            this.showContextMenu(e, item);
        });

        // Item selection
        this.content.addEventListener('click', (e) => {
            const item = e.target.closest('.fb-item');
            if (!item) return;

            this.selectItem(item, !e.ctrlKey);

            // If it's a JS file, ensure it's registered as a module
            if (item.dataset.type === 'file' && item.dataset.name.endsWith('.js')) {
                this.ensureModuleRegistered(item.dataset.path);
            }
        });

        document.getElementById('fbExportAssets').addEventListener('click', () => {
            if (!this.assetManager) {
                this.assetManager = new AssetManager(this);
            }
            this.assetManager.showExportModal();
        });

        document.getElementById('fbImportAssets').addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.dmjs';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (!this.assetManager) {
                        this.assetManager = new AssetManager(this);
                    }
                    await this.assetManager.importAssets(file);
                }
            };
            input.click();
        });

        // Double-click to open folders
        this.content.addEventListener('dblclick', (e) => {
            const item = e.target.closest('.fb-item');
            if (!item) return;

            if (item.dataset.type === 'folder') {
                this.navigateTo(item.dataset.path);
            } else {
                // Handle file open (e.g., edit scripts)
                this.openFile(item.dataset.path);
            }
        });

        this.content.addEventListener('keydown', (e) => {
            // Only process if target is the content div (to avoid interfering with other inputs)
            if (e.target !== this.content) return;

            // Ctrl+C: Copy
            if (e.ctrlKey && e.key === 'c') {
                e.preventDefault();
                this.copySelectedToClipboard();
            }

            // Ctrl+X: Cut
            if (e.ctrlKey && e.key === 'x') {
                e.preventDefault();
                this.cutSelectedToClipboard();
            }

            // Ctrl+V: Paste
            if (e.ctrlKey && e.key === 'v') {
                e.preventDefault();
                this.pasteFromClipboard();
            }
        });

        this.content.addEventListener('dragover', (e) => {
            e.preventDefault();
            const target = e.target.closest('.fb-item');

            // Clear previous drag-over styling
            this.content.querySelectorAll('.drag-over').forEach(el =>
                el.classList.remove('drag-over'));

            // Check if we're dragging a GameObject from hierarchy
            if (e.dataTransfer.types.includes('application/hierarchy-object')) {
                // Only allow dropping into folders or the file browser background
                if (target && target.dataset.type === 'folder') {
                    target.classList.add('drag-over');
                    e.dataTransfer.dropEffect = 'copy';
                } else if (!target) {
                    // Dropping onto the file browser background
                    this.content.classList.add('drag-over-background');
                    e.dataTransfer.dropEffect = 'copy';
                }
                return;
            }

            // Only allow dropping into folders for regular file operations
            if (target && target.dataset.type === 'folder') {
                target.classList.add('drag-over');
                e.dataTransfer.dropEffect = 'move';
            }
        });

        this.content.addEventListener('dragleave', (e) => {
            const target = e.target.closest('.fb-item');
            if (target) {
                target.classList.remove('drag-over');
            }
            this.content.classList.remove('drag-over-background');
        });

        this.content.addEventListener('drop', (e) => {
            e.preventDefault();

            // Clear drag-over styling
            this.content.querySelectorAll('.drag-over').forEach(el =>
                el.classList.remove('drag-over'));
            this.content.classList.remove('drag-over-background');

            const target = e.target.closest('.fb-item');

            // Handle GameObject drops from hierarchy
            if (e.dataTransfer.types.includes('application/hierarchy-object')) {
                try {
                    const hierarchyData = JSON.parse(e.dataTransfer.getData('application/hierarchy-object'));
                    if (hierarchyData.type === 'gameObject') {
                        this.handleGameObjectDrop(hierarchyData, target);
                    }
                } catch (err) {
                    console.error('Error processing hierarchy drag data:', err);
                }
                return;
            }

            // Handle file uploads from OS
            if (e.dataTransfer.files.length > 0) {
                this.handleFileDrop(e.dataTransfer.files);
                return;
            }

            // Handle internal drag-drop
            if (target && target.dataset.type === 'folder') {
                try {
                    const items = JSON.parse(e.dataTransfer.getData('application/json'));
                    this.moveItems(items, target.dataset.path);
                } catch (err) {
                    console.error('Error processing drag data:', err);
                }
            }
        });

        // Make the content div focusable to receive keyboard events
        this.content.setAttribute('tabindex', '0');

        // Add dataset attributes for draggable module files
        this.content.addEventListener('dragstart', (e) => {
            const item = e.target.closest('.fb-item');
            if (!item) return;

            // For regular file operations (already implemented)
            if (!this.selectedItems.has(item)) {
                this.selectItem(item, !e.ctrlKey);
            }

            e.dataTransfer.setData('application/json', JSON.stringify(
                Array.from(this.selectedItems).map(el => ({
                    path: el.dataset.path,
                    type: el.dataset.type,
                    name: el.dataset.name
                }))
            ));

            // For module script files, add specific data
            if (item.dataset.type === 'file' && item.dataset.name.endsWith('.js')) {
                // Add a special data type for module scripts
                e.dataTransfer.setData('application/module-script', item.dataset.path);

                // Ensure the module is registered when dragging starts
                this.ensureModuleRegistered(item.dataset.path);

                // Create a custom ghost image for dragging
                const ghostImage = document.createElement('div');
                ghostImage.className = 'drag-ghost-module';
                ghostImage.innerHTML = `<i class="fas fa-puzzle-piece"></i> ${item.dataset.name}`;
                ghostImage.style.backgroundColor = '#333';
                ghostImage.style.color = '#fff';
                ghostImage.style.padding = '8px 12px';
                ghostImage.style.borderRadius = '4px';
                ghostImage.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
                ghostImage.style.position = 'absolute';
                ghostImage.style.top = '-1000px';
                document.body.appendChild(ghostImage);

                e.dataTransfer.setDragImage(ghostImage, 15, 15);

                // Clean up the ghost image after drag
                setTimeout(() => {
                    document.body.removeChild(ghostImage);
                }, 100);
            }

            // For prefab files, add specific data
            if (item.dataset.type === 'file' && item.dataset.name.endsWith('.prefab')) {
                // Add a special data type for prefab files
                e.dataTransfer.setData('application/prefab-file', item.dataset.path);

                // Create a custom ghost image for dragging
                const ghostImage = document.createElement('div');
                ghostImage.className = 'drag-ghost-prefab';
                ghostImage.innerHTML = `<i class="fas fa-cube"></i> ${item.dataset.name}`;
                ghostImage.style.backgroundColor = '#9C27B0';
                ghostImage.style.color = '#fff';
                ghostImage.style.padding = '8px 12px';
                ghostImage.style.borderRadius = '4px';
                ghostImage.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
                ghostImage.style.position = 'absolute';
                ghostImage.style.top = '-1000px';
                document.body.appendChild(ghostImage);

                e.dataTransfer.setDragImage(ghostImage, 15, 15);

                // Clean up the ghost image after drag
                setTimeout(() => {
                    document.body.removeChild(ghostImage);
                }, 100);
            }

            e.dataTransfer.effectAllowed = 'copyMove';
        });

        this.content.addEventListener('dragover', (e) => {
            e.preventDefault();
            const target = e.target.closest('.fb-item');

            // Clear previous drag-over styling
            this.content.querySelectorAll('.drag-over').forEach(el =>
                el.classList.remove('drag-over'));

            // Only allow dropping into folders
            if (target && target.dataset.type === 'folder') {
                target.classList.add('drag-over');
                e.dataTransfer.dropEffect = 'move';
            }
        });

        this.content.addEventListener('dragleave', (e) => {
            const target = e.target.closest('.fb-item');
            if (target) {
                target.classList.remove('drag-over');
            }
        });

        this.content.addEventListener('drop', (e) => {
            e.preventDefault();

            // Clear drag-over styling
            this.content.querySelectorAll('.drag-over').forEach(el =>
                el.classList.remove('drag-over'));

            const target = e.target.closest('.fb-item');

            // Handle file uploads from OS
            if (e.dataTransfer.files.length > 0) {
                this.handleFileDrop(e.dataTransfer.files);
                return;
            }

            // Handle internal drag-drop
            if (target && target.dataset.type === 'folder') {
                try {
                    const items = JSON.parse(e.dataTransfer.getData('application/json'));
                    this.moveItems(items, target.dataset.path);
                } catch (err) {
                    console.error('Error processing drag data:', err);
                }
            }
        });

        // TOUCH EVENTS

        // Add touch event listeners for item selection
        this.content.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.content.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.content.addEventListener('touchend', (e) => this.handleTouchEnd(e));

        // Add touch support for tree panel resizer
        this.treePanelResizer.addEventListener('touchstart', (e) => this.handleTreePanelTouchStart(e));
        document.addEventListener('touchmove', (e) => this.handleTreePanelTouchMove(e));
        document.addEventListener('touchend', (e) => this.handleTreePanelTouchEnd(e));
    }

    /**
     * Create the EditorWindow tools toolbar
     */
    createEditorWindowToolbar() {
        this.editorWindowToolbar = document.createElement('div');
        this.editorWindowToolbar.className = 'editor-window-toolbar';
        this.editorWindowToolbar.style.cssText = `
            display: flex;
            align-items: center;
            padding: 6px 12px;
            background: #2a2a2a;
            border-bottom: 1px solid #444;
            flex-shrink: 0;
            min-height: 32px;
            flex-wrap: wrap;
            gap: 8px;
        `;

        // Create title for the toolbar
        const toolbarTitle = document.createElement('span');
        toolbarTitle.textContent = 'Workspace Tools:';
        toolbarTitle.style.cssText = `
            color: #aaa;
            font-size: 12px;
            font-weight: 500;
            margin-right: 8px;
        `;

        this.editorWindowToolbar.appendChild(toolbarTitle);

        // Container for EditorWindow buttons
        this.editorWindowButtonsContainer = document.createElement('div');
        this.editorWindowButtonsContainer.style.cssText = `
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
        `;

        this.editorWindowToolbar.appendChild(this.editorWindowButtonsContainer);

        // Initially show "No tools available" message
        this.updateEditorWindowToolbar();
    }

    /**
     * Update the EditorWindow toolbar with available tools
     */
    updateEditorWindowToolbar() {
        // Clear existing buttons
        this.editorWindowButtonsContainer.innerHTML = '';

        if (this.editorWindows.size === 0) {
            const noToolsMessage = document.createElement('span');
            noToolsMessage.textContent = 'No workspace tools available';
            noToolsMessage.style.cssText = `
                color: #666;
                font-size: 11px;
                font-style: italic;
            `;
            this.editorWindowButtonsContainer.appendChild(noToolsMessage);
            return;
        }

        // Create buttons for each registered EditorWindow
        this.editorWindows.forEach((WindowClass, className) => {
            const button = document.createElement('button');
            button.className = 'editor-window-tool-btn';
            button.title = WindowClass.description || `Open ${className}`;

            // Use class properties for styling if available
            const icon = WindowClass.icon || 'fa-window-maximize';
            const color = WindowClass.color || '#64B5F6';

            button.innerHTML = `<i class="fas ${icon}"></i> ${className}`;
            button.style.cssText = `
                padding: 4px 8px;
                background: ${color}20;
                border: 1px solid ${color}40;
                color: ${color};
                border-radius: 4px;
                font-size: 11px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 4px;
                transition: all 0.2s ease;
            `;

            // Hover effects
            button.addEventListener('mouseenter', () => {
                button.style.background = `${color}30`;
                button.style.borderColor = `${color}60`;
            });

            button.addEventListener('mouseleave', () => {
                button.style.background = `${color}20`;
                button.style.borderColor = `${color}40`;
            });

            // Click handler to launch the EditorWindow
            button.addEventListener('click', () => {
                this.launchEditorWindow(WindowClass);
            });

            this.editorWindowButtonsContainer.appendChild(button);
        });
    }

    /**
     * Launch an EditorWindow instance
     * @param {Class} WindowClass - The EditorWindow class to instantiate
     */
    launchEditorWindow(WindowClass) {
        try {
            // Create new instance
            const windowInstance = new WindowClass();

            // Show the window
            windowInstance.show();

            // Store reference for cleanup if needed
            if (!window.activeEditorWindows) {
                window.activeEditorWindows = new Set();
            }
            window.activeEditorWindows.add(windowInstance);

            // Clean up reference when window is closed
            const originalOnClose = windowInstance.onClose.bind(windowInstance);
            windowInstance.onClose = function () {
                if (window.activeEditorWindows) {
                    window.activeEditorWindows.delete(windowInstance);
                }
                originalOnClose();
            };

            this.showNotification(`Opened ${WindowClass.name}`, 'success');
        } catch (error) {
            console.error('Error launching EditorWindow:', error);
            this.showNotification(`Error opening ${WindowClass.name}: ${error.message}`, 'error');
        }
    }

    /**
     * Register an EditorWindow class
     * @param {Class} WindowClass - EditorWindow class to register
     */
    registerEditorWindow(WindowClass) {
        if (!WindowClass || typeof WindowClass !== 'function') {
            console.warn('Invalid EditorWindow class provided');
            return;
        }

        // Check if it extends EditorWindow
        if (!this.isEditorWindowClass(WindowClass)) {
            console.warn(`${WindowClass.name} does not extend EditorWindow`);
            return;
        }

        this.editorWindows.set(WindowClass.name, WindowClass);
        this.updateEditorWindowToolbar();

        console.log(`Registered EditorWindow: ${WindowClass.name}`);
    }

    /**
     * Unregister an EditorWindow class
     * @param {string} className - Name of the class to unregister
     */
    unregisterEditorWindow(className) {
        if (this.editorWindows.has(className)) {
            this.editorWindows.delete(className);
            this.updateEditorWindowToolbar();
            console.log(`Unregistered EditorWindow: ${className}`);
        }
    }

    /**
     * Check if a class extends EditorWindow
     * @param {Class} WindowClass - Class to check
     * @returns {boolean} True if it extends EditorWindow
     */
    isEditorWindowClass(WindowClass) {
        if (!WindowClass || typeof WindowClass !== 'function') {
            return false;
        }

        // Check if EditorWindow is available
        if (typeof window.EditorWindow !== 'function') {
            return false;
        }

        // Check prototype chain
        let currentClass = WindowClass;
        while (currentClass) {
            if (currentClass === window.EditorWindow) {
                return true;
            }
            currentClass = Object.getPrototypeOf(currentClass);
        }

        return false;
    }

    /**
     * Scan for existing EditorWindow scripts in the file system
     */
    async scanForEditorWindowScripts() {
        if (!this.db) return;

        try {
            console.log('Scanning for EditorWindow scripts...');

            // Get all JavaScript files
            const transaction = this.db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');
            const allFiles = await new Promise(resolve => {
                store.getAll().onsuccess = e => resolve(e.target.result);
            });

            const jsFiles = allFiles.filter(file =>
                file.type === 'file' && file.name.endsWith('.js')
            );

            // Check each JS file for EditorWindow extension
            for (const file of jsFiles) {
                await this.checkAndRegisterEditorWindow(file.path, file.content);
            }

            console.log(`EditorWindow scan complete. Found ${this.editorWindows.size} tools.`);
        } catch (error) {
            console.error('Error scanning for EditorWindow scripts:', error);
        }
    }

    /**
     * Check if a script extends EditorWindow and register it
     * @param {string} filePath - Path to the script file
     * @param {string} content - Script content (optional, will read if not provided)
     */
    async checkAndRegisterEditorWindow(filePath, content = null) {
        try {
            // Read content if not provided
            if (!content) {
                content = await this.readFile(filePath);
            }

            if (!content) return;

            // Quick check if it might extend EditorWindow
            if (!content.includes('extends EditorWindow')) {
                return;
            }

            // Extract class name from file
            const fileName = filePath.split('/').pop().split('\\').pop();
            const className = fileName.replace('.js', '');

            // Load the script if not already loaded
            if (!window[className]) {
                await this.loadModuleScript(filePath);
            }

            // Check if the class is now available and extends EditorWindow
            const WindowClass = window[className];
            if (WindowClass && this.isEditorWindowClass(WindowClass)) {
                this.registerEditorWindow(WindowClass);
            }

        } catch (error) {
            console.error(`Error checking EditorWindow script ${filePath}:`, error);
        }
    }

    /**
     * Handle dropping a GameObject from the hierarchy to create a prefab
     * @param {Object} hierarchyData - Data about the dragged GameObject
     * @param {Element} target - The drop target element (folder or null for background)
     */
    async handleGameObjectDrop(hierarchyData, target) {
        try {
            // Get the editor and hierarchy manager
            const editor = window.editor;
            if (!editor || !editor.hierarchy) {
                throw new Error('Editor or hierarchy manager not available');
            }

            // Find the GameObject by ID
            const gameObject = editor.hierarchy.findGameObjectById(hierarchyData.id);
            if (!gameObject) {
                throw new Error(`GameObject with ID ${hierarchyData.id} not found`);
            }

            // Determine target directory
            let targetPath;
            if (target && target.dataset.type === 'folder') {
                // Dropped onto a specific folder
                targetPath = target.dataset.path;
            } else {
                // Dropped onto file browser background - use current directory or create Prefabs folder
                if (this.currentPath === '/') {
                    targetPath = `${this.currentPath}/Prefabs`;
                } else {
                    targetPath = `${this.currentPath}`;
                }
            }

            // Create the prefab
            const prefabPath = await editor.hierarchy.createPrefabFromGameObject(gameObject, targetPath);

            if (prefabPath) {
                // Show success notification
                this.showNotification(`Prefab created from ${gameObject.name}`, 'success');

                // Refresh the file browser to show the new prefab
                await this.refreshFiles();

                // If we're in the target directory, select the new prefab file
                if (this.currentPath === targetPath) {
                    setTimeout(() => {
                        const prefabFileName = prefabPath.split('/').pop();
                        const prefabElement = this.content.querySelector(`[data-name="${prefabFileName}"]`);
                        if (prefabElement) {
                            this.selectItem(prefabElement, true);
                        }
                    }, 100);
                }
            }

        } catch (error) {
            console.error('Error handling GameObject drop:', error);
            this.showNotification(`Error creating prefab: ${error.message}`, 'error');
        }
    }

    setupTreePanelResizer() {
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        this.treePanelResizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = this.treePanel.offsetWidth;
            document.body.style.cursor = 'col-resize';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const containerWidth = this.splitContainer.offsetWidth;
            const newWidth = startWidth + (e.clientX - startX);

            // Limit width to a reasonable range (10% to 50% of container)
            const minWidth = containerWidth * 0.1;
            const maxWidth = containerWidth * 0.5;
            const clampedWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));

            this.treePanel.style.width = `${clampedWidth}px`;
            e.preventDefault();
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
            }
        });
    }

    async promptNewSceneFile() {
        if (!this.db) {
            this.showNotification('File system not initialized yet. Please wait...', 'warning');
            return;
        }

        const name = await this.promptDialog('New Scene', 'Enter scene name:');
        if (!name) return; // User cancelled

        // Ensure filename ends with .scene
        const fileName = name.endsWith('.scene') ? name : `${name}.scene`;

        // Create default scene JSON
        const defaultScene = {
            name: name.replace('.scene', ''),
            settings: {
                viewportWidth: 1280,
                viewportHeight: 720,
                viewportX: 0,
                viewportY: 0,
                backgroundColor: "#1e1e1e",
                gridEnabled: true,
                gridSize: 32,
                snapToGrid: false,
                gravity: { x: 0, y: 1 },
                physicsEnabled: true,
                physicsDebugDraw: false
            },
            gameObjects: []
        };

        // Create the filepath
        const normalizedPath = this.normalizePath(this.currentPath);
        const filePath = normalizedPath === '/'
            ? `/${fileName}`
            : `${normalizedPath}/${fileName}`;

        // Save the file
        const success = await this.createFile(filePath, JSON.stringify(defaultScene, null, 2));
        if (success) {
            this.showNotification(`Created scene file: ${fileName}`, 'info');
            await this.loadContent(this.currentPath);
        } else {
            this.showNotification(`Failed to create scene file: ${fileName}`, 'error');
        }
    }

    async promptNewMarkdown() {
        if (!this.db) {
            this.showNotification('File system not initialized yet. Please wait...', 'warning');
            return;
        }

        const name = await this.promptDialog('New Markdown File', 'Enter markdown file name:');
        if (!name) return; // User cancelled

        try {
            // Normalize path
            const normalizedPath = this.normalizePath(this.currentPath);

            // Ensure filename has .md extension
            const fileName = name.endsWith('.md') ? name : `${name}.md`;

            // Generate template for markdown file
            const templateContent = `# ${name.replace(/\.md$/, '')}

## Getting Started

Replace this with your documentation content.

### Features

- Item 1
- Item 2
- Item 3

### Installation

Instructions for installation here.

### Usage

Usage instructions here.

### Examples

\`\`\`javascript
// Code examples go here
const example = "Hello World";
\`\`\`

### Additional Resources

- [Link 1](https://example.com)
- [Link 2](https://example.com)
`;

            // Create the filepath
            const filePath = normalizedPath === '/'
                ? `/${fileName}`
                : `${normalizedPath}/${fileName}`;

            // Create the file
            const success = await this.createFile(filePath, templateContent);

            if (success) {
                this.showNotification(`Created markdown file: ${fileName}`, 'info');
                await this.loadContent(this.currentPath);
            } else {
                this.showNotification(`Failed to create markdown file: ${fileName}`, 'error');
            }
        } catch (error) {
            console.error('Failed to create markdown file:', error);
            this.showNotification(`Failed to create markdown file: ${error.message}`, 'error');
        }
    }

    /**
     * Show the export assets modal
     */
    showExportAssetsModal() {
        if (this.assetManager) {
            this.assetManager.showExportModal();
        } else {
            console.error("AssetManager not initialized");
            this.showNotification("Asset manager not available", "error");
        }
    }

    /**
     * Import assets from a .asset file
     */
    importAssets() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.asset';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (this.assetManager) {
                await this.assetManager.importAssets(file);
            } else {
                console.error("AssetManager not initialized");
                this.showNotification("Asset manager not available", "error");
            }
        };

        input.click();
    }

    async openSceneFile(file) {
        // Get editor instance
        const editor = window.editor;
        if (!editor || !editor.sceneManager) {
            console.error('Editor or SceneManager not available');
            return;
        }

        // Check for unsaved changes before loading
        if (await editor.sceneManager.checkUnsavedChanges()) {
            await editor.sceneManager.loadScene(file.path);
        }
    }



    /**
     * Show context menu for an item
     * @param {Event} e - Context menu event
     * @param {Object} item - File or folder item
     */
    showContextMenu(e, item) {
        e.preventDefault();

        // Remove any existing context menus
        const existingMenu = document.querySelector('.fb-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        // Create context menu
        const menu = document.createElement('div');
        menu.className = 'fb-context-menu';
        menu.style.top = `${e.clientY}px`;
        menu.style.left = `${e.clientX}px`;

        // Common actions
        let menuHTML = '';

        // File-specific actions
        if (item && item.type === 'file') {
            // Check if it's an image file
            const isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(item.name);

            // Check if it's a script file
            const isScript = item.name.endsWith('.js');

            const isMarkdown = item.name.endsWith('.md');

            // Add open action
            menuHTML += `<div class="fb-menu-item fb-menu-open">Open</div>`;

            // Add copy link action
            menuHTML += `<div class="fb-menu-item fb-menu-copy-link">Copy Link</div>`;

            // Preview images
            if (isImage) {
                menuHTML += `<div class="fb-menu-item fb-menu-preview">Preview Image</div>`;
            }

            // For script files, add run action
            if (isScript) {
                menuHTML += `<div class="fb-menu-item fb-menu-run">Run Script</div>`;
            }

            // Add separator
            menuHTML += `<div class="context-menu-separator"></div>`;
        }

        // Different menu if no item is selected (background context menu)
        if (!item) {
            // If we have items in clipboard, show paste option
            if (this.clipboard.items && this.clipboard.items.length > 0) {
                menuHTML += `<div class="fb-menu-item fb-menu-paste">Paste</div>
                <div class="context-menu-separator"></div>`;
            }

            menuHTML += `
                <div class="fb-menu-item fb-menu-new-folder">New Folder</div>
                <div class="fb-menu-item fb-menu-new-script">New Script</div>
                <div class="fb-menu-item fb-menu-upload">Upload File</div>
            `;
        } else {
            // Common actions for files and folders
            menuHTML += `
                <div class="fb-menu-item fb-menu-rename">Rename</div>
                <div class="fb-menu-item fb-menu-delete">Delete</div>
                <div class="context-menu-separator"></div>
                <div class="fb-menu-item fb-menu-copy-link">Copy Link</div>
                <div class="context-menu-separator"></div>
                <div class="fb-menu-item fb-menu-edit">Edit</div>
                <div class="context-menu-separator"></div>
                <div class="fb-menu-item fb-menu-copy">Copy</div>
                <div class="fb-menu-item fb-menu-cut">Cut</div>
            `;
        }

        menu.innerHTML = menuHTML;
        document.body.appendChild(menu);

        // Adjust position if menu goes off-screen
        const menuRect = menu.getBoundingClientRect();
        if (menuRect.right > window.innerWidth) {
            menu.style.left = `${window.innerWidth - menuRect.width - 5}px`;
        }
        if (menuRect.bottom > window.innerHeight) {
            menu.style.top = `${window.innerHeight - menuRect.height - 5}px`;
        }

        // Add event listeners for menu items
        if (item) {
            // Item-specific menu actions
            menu.querySelector('.fb-menu-open')?.addEventListener('click', () => {
                this.openFile(item.path);
                menu.remove();
            });

            menu.querySelector('.fb-menu-copy-link')?.addEventListener('click', () => {
                this.copySelectedToClipboard(item.path);
                menu.remove();
            });

            menu.querySelector('.fb-menu-copy')?.addEventListener('click', () => {
                this.copySelectedToClipboard();
                menu.remove();
            });

            menu.querySelector('.fb-menu-cut')?.addEventListener('click', () => {
                this.cutSelectedToClipboard();
                menu.remove();
            });

            menu.querySelector('.fb-menu-delete')?.addEventListener('click', () => {
                // Get the actual name from the dataset
                const itemName = item.dataset.name;

                if (confirm(`Delete ${itemName}?`)) {
                    this.deleteItem(item.dataset.path).then(() => this.refreshFiles());
                }
                menu.remove();
            });

            menu.querySelector('.fb-menu-edit')?.addEventListener('click', () => {
                this.editFile(item.dataset.path);
                menu.remove();
            });

            // Add rename listener
            menu.querySelector('.fb-menu-rename')?.addEventListener('click', () => {
                this.promptRename(item);
                menu.remove();
            });
        } else {
            // Background menu actions
            menu.querySelector('.fb-menu-new-folder')?.addEventListener('click', () => {
                this.promptNewFolder();
                menu.remove();
            });

            menu.querySelector('.fb-menu-new-script')?.addEventListener('click', () => {
                this.promptNewScript();
                menu.remove();
            });

            menu.querySelector('.fb-menu-upload')?.addEventListener('click', () => {
                this.uploadFile();
                menu.remove();
            });

            menu.querySelector('.fb-menu-paste')?.addEventListener('click', () => {
                this.pasteFromClipboard();
                menu.remove();
            });
        }

        // Close the menu when clicking outside
        document.addEventListener('click', function onClickOutside() {
            menu.remove();
            document.removeEventListener('click', onClickOutside);
        });

        // Prevent the menu from closing when clicking inside it
        menu.addEventListener('click', e => {
            e.stopPropagation();
        });
    }

    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     */
    copyToClipboard(text) {
        // Create a temporary input element
        const input = document.createElement('input');
        input.style.position = 'fixed';
        input.style.opacity = 0;
        input.value = text;
        document.body.appendChild(input);

        // Select the text
        input.select();
        input.setSelectionRange(0, 99999);

        // Copy the text
        document.execCommand('copy');

        // Remove the temporary element
        document.body.removeChild(input);

        // Show notification
        this.showNotification(`Path copied to clipboard: ${text}`, 'info');
    }

    async promptNewDoc() {
        if (!this.db) {
            this.showNotification('File system not initialized yet. Please wait...', 'warning');
            return;
        }

        const name = await this.promptDialog('New Documentation File', 'Enter documentation file name:');
        if (!name) return; // User cancelled

        try {
            // Normalize path
            const normalizedPath = this.normalizePath(this.currentPath);

            // Ensure filename has .doc extension
            const fileName = name.endsWith('.doc') ? name : `${name}.doc`;

            // Generate template for documentation file (JSON structure)
            const templateContent = JSON.stringify({
                "Getting Started": {
                    "Introduction": "# Welcome to Your Documentation\n\nThis is a sample documentation file.\n\n## Features\n\n- Easy to edit\n- Supports Markdown formatting\n- Organized by categories and topics",
                    "Installation": "## Installation\n\n1. Create a new documentation file\n2. Add categories and topics\n3. Use Markdown for content formatting\n\n> **Tip**: You can use the SpriteCodeDocs modal to view and edit your documentation."
                },
                "API Reference": {
                    "Overview": "# API Overview\n\nThis section contains API documentation.\n\n## Endpoints\n\n- `GET /api/data` - Retrieve data\n- `POST /api/data` - Create new data",
                    "Authentication": "## Authentication\n\nUse Bearer tokens for API access.\n\n```javascript\nfetch('/api/data', {\n  headers: {\n    'Authorization': 'Bearer YOUR_TOKEN'\n  }\n});\n```"
                }
            }, null, 2);

            // Create the filepath
            const filePath = normalizedPath === '/'
                ? `/${fileName}`
                : `${normalizedPath}/${fileName}`;

            // Create the file
            const success = await this.createFile(filePath, templateContent);

            if (success) {
                this.showNotification(`Created documentation file: ${fileName}`, 'info');
                await this.loadContent(this.currentPath);
            } else {
                this.showNotification(`Failed to create documentation file: ${fileName}`, 'error');
            }
        } catch (error) {
            console.error('Failed to create documentation file:', error);
            this.showNotification(`Failed to create documentation file: ${error.message}`, 'error');
        }
    }

    async promptNewFolder() {
        const name = await this.promptDialog('New Folder', 'Enter folder name:');
        if (!name) return; // User cancelled

        // Normalize current path
        const normalizedPath = this.normalizePath(this.currentPath);

        // Create path for new folder
        const folderPath = normalizedPath === '/'
            ? `/${name}`
            : `${normalizedPath}/${name}`;

        await this.createDirectory(folderPath);
    }

    async promptNewScript() {
        if (!this.db) {
            this.showNotification('File system not initialized yet. Please wait...', 'warning');
            return;
        }

        const name = await this.promptDialog('New Script', 'Enter script name:');
        if (!name) return; // User cancelled

        try {
            // Normalize path
            const normalizedPath = this.normalizePath(this.currentPath);

            // Ensure filename has .js extension
            const fileName = name.endsWith('.js') ? name : `${name}.js`;
            // Ensure class name is PascalCase for consistency
            const baseName = name.replace(/\.js$/, '');
            const className = baseName;//.charAt(0).toUpperCase() + baseName.slice(1);

            // Generate template code for the new module
            const templateCode = this.generateModuleTemplate(className);

            // Create the filepath
            const filePath = normalizedPath === '/'
                ? `/${fileName}`
                : `${normalizedPath}/${fileName}`;

            // Explicitly create a file
            const success = await this.createFile(filePath, templateCode);

            if (success) {
                this.showNotification(`Created script: ${fileName}`, 'info');

                // Automatically load and register the new module
                await this.loadAndRegisterModule(filePath, templateCode);
            }
        } catch (error) {
            console.error('Failed to create script:', error);
            this.showNotification(`Failed to create script: ${error.message}`, 'error');
        }
    }

    async promptNewTextFile() {
        if (!this.db) {
            this.showNotification('File system not initialized yet. Please wait...', 'warning');
            return;
        }

        const name = await this.promptDialog('New Text File', 'Enter text file name:');
        if (!name) return; // User cancelled

        try {
            // Normalize path
            const normalizedPath = this.normalizePath(this.currentPath);

            // Ensure filename has .txt extension
            const fileName = name.endsWith('.txt') ? name : `${name}.txt`;

            // Create the filepath
            const filePath = normalizedPath === '/'
                ? `/${fileName}`
                : `${normalizedPath}/${fileName}`;

            // Explicitly create a file
            const success = await this.createFile(filePath, '');

            if (success) {
                this.showNotification(`Created text file: ${fileName}`, 'info');

                // Automatically load and register the new module
                //await this.loadAndRegisterModule(filePath, '');
            }
        } catch (error) {
            console.error('Failed to create text file:', error);
            this.showNotification(`Failed to create text file: ${error.message}`, 'error');
        }
    }

    /**
      * Helper method to check if a name already exists in a parent directory
      * @param {string} parentPath - The parent directory path
      * @param {string} name - The name to check for
      * @returns {Promise<boolean>} - True if the name already exists in the parent directory
      */
    async checkNameClash(parentPath, name) {
        if (!this.db) return false;

        try {
            const transaction = this.db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');
            const index = store.index('parentPath');

            const siblings = await new Promise(resolve => {
                index.getAll(parentPath).onsuccess = e => resolve(e.target.result || []);
            });

            return siblings.some(item => item.name === name);
        } catch (error) {
            console.error('Error checking name clash:', error);
            return false; // Assume no clash if there's an error
        }
    }

    async debugShowAllFiles() {
        if (!this.db) return;

        try {
            const transaction = this.db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');

            const allFiles = await new Promise(resolve => {
                store.getAll().onsuccess = e => resolve(e.target.result);
            });

            console.group('All Files in Database');
            console.table(allFiles.map(file => ({
                name: file.name,
                path: file.path,
                parentPath: file.parentPath,
                type: file.type
            })));

            // Highlight potential issues
            const pathsSet = new Set();
            const duplicates = [];

            allFiles.forEach(file => {
                if (pathsSet.has(file.path)) {
                    duplicates.push(file.path);
                }
                pathsSet.add(file.path);
            });

            if (duplicates.length) {
                console.warn('Duplicate paths found:', duplicates);
            }

            // Check for orphaned items (items with non-existent parent paths)
            const orphans = allFiles.filter(file => {
                if (file.parentPath === '/' || file.parentPath === null) return false;
                return !allFiles.some(parent => parent.path === file.parentPath);
            });

            if (orphans.length) {
                console.warn('Orphaned items found:', orphans);
            }

            console.groupEnd();
        } catch (error) {
            console.error('Error listing all files:', error);
        }
    }

    generateModuleTemplate(className) {
        // Convert to PascalCase if it's not already
        const pascalCaseName = className;//.charAt(0).toUpperCase() + className.slice(1);

        return `/**
* ${pascalCaseName} - Custom module for Dark Matter JS
* 
* Description: Replace this with a description of what your module does
* 
* @extends Module
*/

class ${pascalCaseName} extends Module {
    static namespace = "Generic"; // Change to the appropriate namespace
    static icon = "fa-cog"; // Change to an appropriate icon class
    static color = "#aec7e4ff"; // Change to an appropriate color
    static description = "A brief description of what this module does"; // Change to your module's description
    static allowMultiple = false; // Change to true if multiple instances are allowed
    static drawInEditor = true; // Change to false if this module should not be drawn in the editor, only gizmos will be drawn (good if drawing is slowing down the editor)

    /**
     * Create a new ${pascalCaseName}
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        // Call the parent constructor with the module name
        super("${pascalCaseName}");
        
        // Initialize your module properties here
        this.speed = options.speed || 5;
        this.direction = options.direction || 0;
        
        // Store serializable properties and expose them to the Inspector
        this.exposeProperty("speed", "number", this.speed, { min: 0, max: 20, step: 0.1,
            description: "Movement speed of the object",
            onChange: (newValue) => { this.speed = newValue; }        
        });
        this.exposeProperty("direction", "number", this.direction, { min: 0, max: 360, step: 1,
            description: "Movement direction of the object",
            onChange: (newValue) => { this.direction = newValue; }
        });

        // Example of a private variable (not exposed to Inspector)
        this._internalCounter = 0;
    }

    /**
     * Called before the game starts, used for loading assets
     * @returns {Promise<void>}
     */
    async preload() {
        // Load any resources your module needs before the game starts
    }

    /**
     * Called once when the module is first activated
     * Use this for initialization logic
     */
    start() {
        // Initialize your module behavior here
        console.log(\`${pascalCaseName} module started on \${this.gameObject.name}\`);
    }

    /**
     * Called every frame (main update logic)
     * @param {number} deltaTime - Time in seconds since the last frame
     */
    loop(deltaTime) {
        // Example of using exposed properties
        const radians = this.direction * Math.PI / 180;
        const position = this.getLocalPosition();
        this.setLocalPosition(new Vector2(
            position.x + Math.cos(radians) * this.speed * deltaTime,
            position.y + Math.sin(radians) * this.speed * deltaTime
        ));
        
        // Update internal state
        this._internalCounter += deltaTime;
    }

    /**
     * Called when the module should render
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
     */
    draw(ctx) {
        // Add custom rendering logic here
        // Position and angle are relative to the parent game object
        ctx.save();
        ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    /**
     * Called when a property changes in the Inspector
     * This is an example of a custom property change handler
     */
    onDirectionChanged(newValue) {
        console.log(\`Direction changed to \${newValue} degrees\`);
    }

    /**
     * Called when the module is being destroyed
     * Use this to clean up resources
     */
    onDestroy() {
        console.log(\`${pascalCaseName} module destroyed on \${this.gameObject?.name}\`);
    }

    /**
     * Serialize the module to JSON
     * 
     * This keeps properties saved with the scene
     */
    toJSON() {
        return {
            ...super.toJSON(),

            speed: this.speed,
            direction: this.direction
        };
    }

    /**
     * Deserialize the module from JSON
     * 
     * This restores properties when loading a scene
     */
    fromJSON(data) {
        super.fromJSON(data);

        if (!data) return;

        this.speed = data.speed || 5;
        this.direction = data.direction || 0;
    }
}

// Export the class globally for the engine to use
window.${pascalCaseName} = ${pascalCaseName};
`;
    }

    async promptRename(item) {
        const newName = await this.promptDialog('Rename', 'Enter new name:', item.dataset.name);
        if (newName && newName !== item.dataset.name) {
            this.renameItem(item.dataset.path, newName);
        }
    }

    async uploadFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.click();

        input.onchange = () => {
            Array.from(input.files).forEach(file => {
                this.handleFileUpload(file);
            });
        };
    }

    async handleFileUpload(file) {
        return new Promise((resolve) => {
            if (file.type.startsWith('image/')) {
                // Show image resize confirmation modal
                this.showImageResizeModal(file, async (shouldResize, targetSize) => {
                    if (shouldResize) {
                        const resizedDataUrl = await this.resizeImage(file, targetSize);
                        await this.createFile(`${this.currentPath}/${file.name}`, resizedDataUrl);
                        this.showNotification(`Image resized and uploaded: ${file.name}`, 'success');
                    } else {
                        // Upload original image
                        const reader = new FileReader();
                        reader.onload = async (e) => {
                            await this.createFile(`${this.currentPath}/${file.name}`, e.target.result);
                            this.showNotification(`Image uploaded: ${file.name}`, 'info');
                        };
                        reader.readAsDataURL(file);
                    }
                    resolve();
                });
            } else if (file.type.startsWith('audio/')) {
                // Show audio compression confirmation modal
                this.showAudioCompressionModal(file, async (shouldCompress, quality) => {
                    if (shouldCompress) {
                        const compressedDataUrl = await this.compressAudio(file, quality);
                        await this.createFile(`${this.currentPath}/${file.name}`, compressedDataUrl);
                        this.showNotification(`Audio compressed and uploaded: ${file.name}`, 'success');
                    } else {
                        // Upload original audio
                        const reader = new FileReader();
                        reader.onload = async (e) => {
                            await this.createFile(`${this.currentPath}/${file.name}`, e.target.result);
                            this.showNotification(`Audio uploaded: ${file.name}`, 'info');
                        };
                        reader.readAsDataURL(file);
                    }
                    resolve();
                });
            } else {
                // For non-image/audio files, read as text with proper encoding
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        // Ensure we have the complete file content
                        const content = e.target.result;
                        if (content === null || content === undefined) {
                            console.warn(`Failed to read content for file: ${file.name}`);
                            resolve();
                            return;
                        }

                        // For very large files, ensure we're not truncating
                        console.log(`Reading file ${file.name} with size: ${content.length} characters`);
                        await this.createFile(`${this.currentPath}/${file.name}`, content);
                        resolve();
                    } catch (error) {
                        console.error(`Error processing file ${file.name}:`, error);
                        resolve();
                    }
                };

                reader.onerror = (error) => {
                    console.error(`FileReader error for ${file.name}:`, error);
                    resolve();
                };

                // Use readAsText with explicit encoding for better compatibility
                reader.readAsText(file, 'UTF-8');
            }
        });
    }

    /**
 * Show modal to confirm image resize
 * @param {File} file - The image file
 * @param {Function} callback - Callback with (shouldResize, targetSize)
 */
    showImageResizeModal(file, callback) {
        const modal = document.createElement('div');
        modal.className = 'media-modal-overlay';
        modal.innerHTML = `
        <div class="media-modal-content" style="max-width: 500px;">
            <div class="media-modal-header">
                <h3 class="media-modal-title">Resize Image</h3>
                <button class="media-modal-close">&times;</button>
            </div>
            <div class="media-modal-body">
                <p>Would you like to resize this image to reduce file size?</p>
                <p style="color: #aaa; font-size: 12px; margin-top: 10px;">
                    Original: ${file.name} (${(file.size / 1024).toFixed(2)} KB)
                </p>
                <div style="margin-top: 20px;">
                    <label style="display: block; margin-bottom: 10px;">Target Size:</label>
                    <select id="imageSizeSelect" style="width: 100%; padding: 8px; background: #2a2a2a; color: #fff; border: 1px solid #444; border-radius: 4px;">
                        <option value="64">64x64 (Recommended)</option>
                        <option value="128">128x128</option>
                        <option value="256">256x256</option>
                        <option value="512">512x512</option>
                        <option value="1024">1024x1024</option>
                    </select>
                </div>
            </div>
            <div class="media-modal-footer">
                <button class="modal-btn-cancel">Upload Original</button>
                <button class="modal-btn-ok">Resize & Upload</button>
            </div>
        </div>
    `;
        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('.media-modal-close');
        const cancelBtn = modal.querySelector('.modal-btn-cancel');
        const okBtn = modal.querySelector('.modal-btn-ok');
        const sizeSelect = modal.querySelector('#imageSizeSelect');

        const cleanup = () => modal.remove();

        closeBtn.onclick = () => {
            cleanup();
            callback(false);
        };

        cancelBtn.onclick = () => {
            cleanup();
            callback(false);
        };

        okBtn.onclick = () => {
            const targetSize = parseInt(sizeSelect.value);
            cleanup();
            callback(true, targetSize);
        };

        setTimeout(() => modal.classList.add('visible'), 10);
    }

    /**
     * Handle file selection in the browser
     * @param {string} filePath - Path to the selected file
     */
    handleFileSelection(filePath) {
        const extension = filePath.split('.').pop().toLowerCase();

        // Handle different file types
        switch (extension) {
            case 'js':
                // Check if the file might be a module
                this.checkAndHandleModuleFile(filePath);
                break;
            case 'scene':
                this.loadScene(filePath);
                break;
            // Handle other file types as needed
        }
    }

    /**
 * Resize an image to target dimensions
 * @param {File} file - Image file
 * @param {number} targetSize - Target width/height (square)
 * @returns {Promise<string>} Data URL of resized image
 */
    async resizeImage(file, targetSize) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = targetSize;
                    canvas.height = targetSize;
                    const ctx = canvas.getContext('2d');

                    // Calculate scaling to maintain aspect ratio
                    const scale = Math.min(targetSize / img.width, targetSize / img.height);
                    const scaledWidth = img.width * scale;
                    const scaledHeight = img.height * scale;
                    const x = (targetSize - scaledWidth) / 2;
                    const y = (targetSize - scaledHeight) / 2;

                    // Fill with transparency
                    ctx.clearRect(0, 0, targetSize, targetSize);

                    // Draw scaled image
                    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

                    // Convert to data URL with quality compression
                    const dataUrl = canvas.toDataURL('image/png', 0.9);
                    resolve(dataUrl);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Compress audio file
     * @param {File} file - Audio file
     * @param {number} quality - Compression quality (0.0 - 1.0)
     * @returns {Promise<string>} Data URL of compressed audio
     */
    async compressAudio(file, quality) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const arrayBuffer = e.target.result;
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                    // Create offline context for rendering
                    const sampleRate = Math.floor(audioBuffer.sampleRate * quality);
                    const offlineContext = new OfflineAudioContext(
                        audioBuffer.numberOfChannels,
                        audioBuffer.duration * sampleRate,
                        sampleRate
                    );

                    // Create buffer source
                    const source = offlineContext.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(offlineContext.destination);
                    source.start();

                    // Render audio
                    const renderedBuffer = await offlineContext.startRendering();

                    // Convert to WAV format (simpler than MP3 encoding)
                    const wav = this.audioBufferToWav(renderedBuffer);
                    const blob = new Blob([wav], { type: 'audio/wav' });

                    // Convert blob to data URL
                    const dataUrlReader = new FileReader();
                    dataUrlReader.onload = (event) => {
                        resolve(event.target.result);
                    };
                    dataUrlReader.onerror = reject;
                    dataUrlReader.readAsDataURL(blob);
                } catch (error) {
                    console.error('Audio compression error:', error);
                    // Fallback to original file
                    const fallbackReader = new FileReader();
                    fallbackReader.onload = (event) => resolve(event.target.result);
                    fallbackReader.readAsDataURL(file);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Convert AudioBuffer to WAV format
     * @param {AudioBuffer} buffer - Audio buffer
     * @returns {ArrayBuffer} WAV file data
     */
    audioBufferToWav(buffer) {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;

        const bytesPerSample = bitDepth / 8;
        const blockAlign = numChannels * bytesPerSample;

        const data = [];
        for (let i = 0; i < buffer.length; i++) {
            for (let channel = 0; channel < numChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
                data.push(sample < 0 ? sample * 0x8000 : sample * 0x7FFF);
            }
        }

        const dataLength = data.length * bytesPerSample;
        const headerLength = 44;
        const totalLength = headerLength + dataLength;

        const arrayBuffer = new ArrayBuffer(totalLength);
        const view = new DataView(arrayBuffer);

        // RIFF header
        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, totalLength - 8, true);
        this.writeString(view, 8, 'WAVE');

        // fmt chunk
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);

        // data chunk
        this.writeString(view, 36, 'data');
        view.setUint32(40, dataLength, true);

        // Write audio data
        let offset = 44;
        for (let i = 0; i < data.length; i++) {
            view.setInt16(offset, data[i], true);
            offset += 2;
        }

        return arrayBuffer;
    }

    /**
     * Write string to DataView
     * @param {DataView} view - DataView
     * @param {number} offset - Byte offset
     * @param {string} string - String to write
     */
    writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    /**
     * Show modal to confirm audio compression
     * @param {File} file - The audio file
     * @param {Function} callback - Callback with (shouldCompress, quality)
     */
    showAudioCompressionModal(file, callback) {
        const modal = document.createElement('div');
        modal.className = 'media-modal-overlay';
        modal.innerHTML = `
        <div class="media-modal-content" style="max-width: 500px;">
            <div class="media-modal-header">
                <h3 class="media-modal-title">Compress Audio</h3>
                <button class="media-modal-close">&times;</button>
            </div>
            <div class="media-modal-body">
                <p>Would you like to compress this audio file to reduce file size?</p>
                <p style="color: #aaa; font-size: 12px; margin-top: 10px;">
                    Original: ${file.name} (${(file.size / 1024).toFixed(2)} KB)
                </p>
                <div style="margin-top: 20px;">
                    <label style="display: block; margin-bottom: 10px;">Audio Quality:</label>
                    <select id="audioQualitySelect" style="width: 100%; padding: 8px; background: #2a2a2a; color: #fff; border: 1px solid #444; border-radius: 4px;">
                        <option value="0.5">Low (Smallest Size)</option>
                        <option value="0.7" selected>Medium (Recommended)</option>
                        <option value="0.9">High (Better Quality)</option>
                    </select>
                </div>
            </div>
            <div class="media-modal-footer">
                <button class="modal-btn-cancel">Upload Original</button>
                <button class="modal-btn-ok">Compress & Upload</button>
            </div>
        </div>
    `;
        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('.media-modal-close');
        const cancelBtn = modal.querySelector('.modal-btn-cancel');
        const okBtn = modal.querySelector('.modal-btn-ok');
        const qualitySelect = modal.querySelector('#audioQualitySelect');

        const cleanup = () => modal.remove();

        closeBtn.onclick = () => {
            cleanup();
            callback(false);
        };

        cancelBtn.onclick = () => {
            cleanup();
            callback(false);
        };

        okBtn.onclick = () => {
            const quality = parseFloat(qualitySelect.value);
            cleanup();
            callback(true, quality);
        };

        setTimeout(() => modal.classList.add('visible'), 10);
    }

    /**
     * Check if a JS file is a module and handle it accordingly
     * @param {string} filePath - Path to the JS file
     */
    async checkAndHandleModuleFile(filePath) {
        try {
            const content = await this.readFile(filePath);
            if (!content) return;

            // Simple check - if it extends Module, treat it as a module
            if (content.includes('extends Module')) {
                await this.handleModuleFileSelect(filePath);
            } else {
                // Regular JS file
                this.editFile(filePath);
            }
        } catch (error) {
            console.error('Error checking module file:', error);
        }
    }

    async handleFileDrop(files) {
        Array.from(files).forEach(file => {
            this.handleFileUpload(file);
        });
    }

    async editFile(path) {
        const file = await this.getFile(path);
        if (!file) {
            this.showNotification(`File not found: ${path}`, 'error');
            return;
        }

        try {
            // Check if ScriptEditor.js is loaded
            if (!window.ScriptEditor) {
                console.log("ScriptEditor not found, attempting to load it dynamically...");
                try {
                    // Use relative path (consistent with loadScriptIfNeeded)
                    await this.loadScriptFromUrl('src/core/ScriptEditor.js');
                    await new Promise(resolve => setTimeout(resolve, 200));
                    if (!window.ScriptEditor) {
                        throw new Error("ScriptEditor class still not available after loading");
                    }
                    console.log("ScriptEditor loaded successfully");
                } catch (err) {
                    console.error("Failed to load ScriptEditor.js:", err);
                    this.showNotification("Cannot load Script Editor. Please check console for details.", "error");
                    return;
                }
            }

            // Initialize ScriptEditor if needed
            if (!window.scriptEditor) {
                try {
                    window.scriptEditor = new window.ScriptEditor();
                    console.log("ScriptEditor initialized on demand");
                } catch (err) {
                    console.error("Error instantiating ScriptEditor:", err);
                    this.showNotification("Failed to initialize Script Editor", "error");
                    return;
                }
            }

            // Open the file in the editor
            window.scriptEditor.loadFile(path, file.content);
        } catch (error) {
            console.error("Failed to open file in editor:", error);
            this.showNotification("Failed to open file in editor", "error");
        }
    }

    /**
     * Get all files in the file system
     * @returns {Promise<Array>} Array of file objects
     */
    async getAllFiles() {
        if (!this.db) return [];

        return new Promise((resolve) => {
            const transaction = this.db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');

            store.getAll().onsuccess = (e) => {
                const files = e.target.result;
                resolve(files.filter(file => file.type === 'file'));
            };
        });
    }

    selectItem(item, exclusive = true) {
        if (exclusive) {
            this.selectedItems.forEach(selected =>
                selected.classList.remove('selected'));
            this.selectedItems.clear();
        }

        item.classList.add('selected');
        this.selectedItems.add(item);
    }



    async loadScene(filePath) {
        try {
            // Get the editor instance
            const editor = window.editor;
            if (!editor || !editor.sceneManager) {
                throw new Error('Editor not available');
            }

            // Delegate to scene manager
            await editor.sceneManager.loadScene(filePath);
            return true;
        } catch (error) {
            console.error('Error loading scene in FileBrowser:', error);
            return false;
        }
    }

    async createFile(path, content, overwrite = false) {
        if (!path || path === '/') {
            console.error('Invalid file path');
            return false;
        }

        // Normalize path
        path = this.normalizePath(path);

        try {
            const name = path.split('/').pop();
            const parentPathArray = path.split('/').slice(0, -1);
            const parentPath = parentPathArray.length === 1 ? '/' : parentPathArray.join('/');

            // Check if file exists first (in a separate transaction)
            const existingFile = await this.getFile(path);

            if (existingFile && !overwrite) {
                throw new Error('File already exists');
            }

            // Ensure parent directory exists
            if (parentPath !== '/' && parentPath !== '') {
                const parentExists = await this.exists(parentPath);
                if (!parentExists) {
                    await this.createDirectory(parentPath);
                }
            }

            // Create a new transaction for file creation 
            // (after all parent directory operations are complete)
            const transaction = this.db.transaction(['files'], 'readwrite');
            const store = transaction.objectStore('files');

            const newFile = {
                name,
                path,
                parentPath,
                type: 'file',
                content,
                created: existingFile ? existingFile.created : Date.now(),
                modified: Date.now()
            };

            // Create a promise for the transaction result
            const result = await new Promise((resolve, reject) => {
                const request = existingFile ? store.put(newFile) : store.add(newFile);

                request.onsuccess = () => resolve(true);
                request.onerror = (e) => {
                    console.error("Error in IndexedDB operation:", e.target.error);
                    reject(e.target.error);
                };

                // Add transaction complete handler
                transaction.oncomplete = () => resolve(true);
                transaction.onerror = (e) => reject(e.target.error);
            });

            // Only reload content if we're not overwriting
            if (!overwrite) {
                await this.loadContent(this.currentPath);
            }

            if (result && path.endsWith('.js')) {
                // Check if the new file is an EditorWindow
                await this.checkAndRegisterEditorWindow(path, content);
            }

            return result;
        } catch (error) {
            console.error('Failed to create/update file:', error);
            return false;
        }
    }

    async getFile(path) {
        if (!this.db || !path || typeof path !== 'string') return null;

        return new Promise((resolve) => {
            const transaction = this.db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');

            const request = store.get(path);
            request.onsuccess = (e) => {
                const result = e.target.result;
                if (result) {
                    // Ensure we're getting the complete content
                    console.log(`Retrieved file ${path}: ${result.content ? result.content.length : 0} characters`);
                }
                resolve(result);
            };
            request.onerror = (e) => {
                console.error('Error getting file:', path, e.target.error);
                resolve(null);
            };
        });
    }

    async deleteSelected() {
        if (this.selectedItems.size === 0) return;

        // Count files and folders for more informative prompt
        let fileCount = 0;
        let folderCount = 0;

        Array.from(this.selectedItems).forEach(item => {
            if (item.dataset.type === 'folder') {
                folderCount++;
            } else {
                fileCount++;
            }
        });

        // Create a more specific confirmation message
        let message = 'Delete ';
        if (fileCount > 0) {
            message += `${fileCount} file${fileCount !== 1 ? 's' : ''}`;
        }
        if (folderCount > 0) {
            if (fileCount > 0) message += ' and ';
            message += `${folderCount} folder${folderCount !== 1 ? 's' : ''}`;
        }
        message += '?';

        // Add warning for folders
        if (folderCount > 0) {
            message += '\n\nWARNING: Deleting folders will also delete all contents!';
        }

        if (!confirm(message)) return;

        try {
            const promises = Array.from(this.selectedItems).map(item =>
                this.deleteItem(item.dataset.path)
            );

            await Promise.all(promises);
            await this.loadContent(this.currentPath);
        } catch (error) {
            console.error('Failed to delete items:', error);
            this.showNotification('Error deleting items', 'error');
        }
    }

    async deleteItem(path) {
        if (!this.db) return false;

        try {
            // First, check if the item exists and get its type
            const item = await this.getFile(path);
            if (!item) {
                console.warn(`Item not found for deletion: ${path}`);
                return false;
            }

            // Save parent path before deleting the item for tree refresh
            const parentPath = item.parentPath;
            const isFolder = item.type === 'folder';

            const transaction = this.db.transaction(['files'], 'readwrite');
            const store = transaction.objectStore('files');

            // Only recursively delete children if it's a folder
            if (isFolder) {
                const index = store.index('parentPath');
                const children = await this.getAllItems(index, path);

                // Delete all children first
                for (const child of children) {
                    await this.deleteItem(child.path);
                }
            }

            // Check if we're deleting an EditorWindow script
            if (path.endsWith('.js')) {
                const fileName = path.split('/').pop().split('\\').pop();
                const className = fileName.replace('.js', '');

                // Unregister if it was an EditorWindow
                if (this.editorWindows.has(className)) {
                    this.unregisterEditorWindow(className);
                }
            }

            // Finally delete the item itself
            await new Promise((resolve, reject) => {
                const request = store.delete(path);
                request.onsuccess = () => resolve();
                request.onerror = (e) => reject(e.target.error);
            });

            console.log(`Successfully deleted: ${path}`);

            // Refresh the parent folder in the directory tree if this was a folder
            // or if the parent path is not the current path
            if (this.directoryTree && (isFolder || parentPath !== this.currentPath)) {
                await this.directoryTree.refreshFolder(parentPath);
            }

            if (path.endsWith('.js')) {
                // Check if the updated file is an EditorWindow
                await this.checkAndRegisterEditorWindow(path, content);
            }

            return true;
        } catch (error) {
            console.error(`Failed to delete item ${path}:`, error);
            return false;
        }
    }

    async renameItem(path, newName) {
        const transaction = this.db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');

        try {
            const item = await new Promise((resolve) => {
                store.get(path).onsuccess = (e) => resolve(e.target.result);
            });

            if (!item) throw new Error('Item not found');

            // Calculate new path
            const parentPath = item.parentPath;
            const newPath = `${parentPath}/${newName}`;

            // Create updated item
            const updatedItem = {
                ...item,
                name: newName,
                path: newPath,
                modified: Date.now()
            };

            // Remove old and add new
            await new Promise((resolve) => {
                store.delete(path).onsuccess = () => {
                    store.add(updatedItem).onsuccess = () => resolve();
                }
            });

            // If it was a folder, refresh the parent folder in the directory tree
            if (item.type === 'folder' && this.directoryTree) {
                await this.directoryTree.refreshFolder(item.parentPath);
            }

            await this.loadContent(this.currentPath);
        } catch (error) {
            console.error('Failed to rename item:', error);
        }
    }

    async updateChildPaths(store, oldParentPath, newParentPath) {
        const index = store.index('parentPath');
        const children = await new Promise((resolve) => {
            index.getAll(oldParentPath).onsuccess = (e) => resolve(e.target.result);
        });

        for (const child of children) {
            const newPath = child.path.replace(oldParentPath, newParentPath);
            const updatedChild = {
                ...child,
                path: newPath,
                parentPath: newParentPath
            };

            await new Promise((resolve) => {
                store.delete(child.path).onsuccess = () => {
                    store.add(updatedChild).onsuccess = () => resolve();
                }
            });

            // Recursively update if folder
            if (child.type === 'folder') {
                await this.updateChildPaths(store, child.path, newPath);
            }
        }
    }

    async moveItems(items, targetPath) {
        const transaction = this.db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');

        for (const item of items) {
            const sourcePath = item.path;
            const newPath = `${targetPath}/${item.name}`;

            // Skip if moving to itself
            if (sourcePath === targetPath || newPath === sourcePath) continue;

            try {
                const dbItem = await new Promise((resolve) => {
                    store.get(sourcePath).onsuccess = (e) => resolve(e.target.result);
                });

                if (!dbItem) continue;

                const updatedItem = {
                    ...dbItem,
                    path: newPath,
                    parentPath: targetPath
                };

                await new Promise((resolve) => {
                    store.delete(sourcePath).onsuccess = () => {
                        store.add(updatedItem).onsuccess = () => resolve();
                    }
                });

                // Update children if it's a folder
                if (dbItem.type === 'folder') {
                    await this.updateChildPaths(store, sourcePath, newPath);
                }
            } catch (error) {
                console.error(`Failed to move item ${sourcePath}:`, error);
            }
        }

        await this.loadContent(this.currentPath);
    }

    /**
 * Load a module script and register it with the system
 * @param {string} scriptPath - Path to the module script
 * @returns {Promise<Class>} The module class
 */
    async loadModuleScript(scriptPath) {
        try {
            const content = await this.readFile(scriptPath);
            if (!content) {
                //throw new Error(`Could not read file: ${scriptPath}`);
            }

            // Basic syntax check (optional, can be improved)
            try {
                new Function(content);
            } catch (syntaxError) {
                this.showNotification(`Syntax error in module: ${syntaxError.message}`, 'error');
                throw syntaxError;
            }

            // Get the class name from the file name
            const fileName = scriptPath.split('/').pop().split('\\').pop();
            // Remove extension and ensure first character is uppercase for class name
            const className = fileName.replace('.js', '');
            const pascalClassName = className;//.charAt(0).toUpperCase() + className.slice(1);

            console.log(`Loading module: ${scriptPath}, expected class name: ${pascalClassName}`);

            // Check if the module class is already loaded
            if (window[pascalClassName] && typeof window[pascalClassName] === 'function') {
                console.log(`Module ${pascalClassName} already loaded, skipping...`);
                return window[pascalClassName];
            }

            // Create a unique ID for the script
            const scriptId = `module-script-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // To ensure the script properly exports to window, we'll wrap the content
            // with a specific pattern that forces the export
            const wrappedContent = `
(function() {
    try {
        ${content}
        if (typeof ${className} !== 'undefined' && !window.${className}) {
            window.${className} = ${className};
            console.log("Module ${className} exported to window");
        }
        if (typeof ${pascalClassName} !== 'undefined' && !window.${pascalClassName}) {
            window.${pascalClassName} = ${pascalClassName};
            console.log("Module ${pascalClassName} exported to window");
        }
    } catch (e) {
        console.error("Error executing module script " + "${fileName}" + ":", e);
        throw e;
    }
})();
`;

            // Add this line for debugging:
            //console.log("Injected module script content:", wrappedContent);

            // Execute script in a controlled environment
            const moduleClass = await new Promise((resolve, reject) => {
                // Create and execute the script
                const scriptElement = document.createElement('script');
                scriptElement.id = scriptId;
                scriptElement.type = 'text/javascript';
                scriptElement.textContent = wrappedContent;

                // Handle script errors
                scriptElement.onerror = (e) => {
                    reject(new Error(`Failed to execute script: ${e.message}`));
                };

                // Add to DOM to execute
                document.head.appendChild(scriptElement);

                // Wait a moment for script to execute
                setTimeout(() => {
                    // Check for class using both naming conventions
                    if (window[className] && typeof window[className] === 'function') {
                        resolve(window[className]);
                    } else if (window[pascalClassName] && typeof window[pascalClassName] === 'function') {
                        resolve(window[pascalClassName]);
                    } else {
                        // Look for any class that extends Module
                        const keys = Object.keys(window);
                        for (const key of keys) {
                            if (typeof window[key] === 'function' &&
                                window[key].prototype &&
                                window[key].prototype instanceof Module) {
                                console.log(`Found module class with name ${key} instead of ${className}`);
                                resolve(window[key]);
                                return;
                            }
                        }
                        reject(new Error(`Script did not export class to window.${pascalClassName} or window.${className}`));
                    }

                    // Clean up
                    if (scriptElement.parentNode) {
                        scriptElement.parentNode.removeChild(scriptElement);
                    }
                }, 200); // Wait a bit longer to ensure script execution
            });

            // Register with inspector
            if (moduleClass && window.editor && window.editor.inspector) {
                window.editor.inspector.registerModuleClass(moduleClass);
            }

            // Show success notification
            this.showNotification(`Module loaded: ${moduleClass.name}`);
            return moduleClass;
        } catch (error) {
            console.error('Error in loadModuleScript:', error);
            this.showNotification(`Error loading module: ${error.message}`, 'error');
            throw error;
        } finally {
            // Clean up script elements
            const scriptElements = document.head.querySelectorAll('script[id^="module-script-"]');
            scriptElements.forEach(el => {
                if (el && el.parentNode) {
                    el.parentNode.removeChild(el);
                }
            });
        }
    }

    /**
     * Ensure a module is registered when dragging or clicking
     * @param {string} filePath - Path to the module file
     */
    async ensureModuleRegistered(filePath) {
        try {
            const content = await this.readFile(filePath);
            if (content && content.includes('extends Module')) {
                await this.loadAndRegisterModule(filePath, content);
            }
        } catch (error) {
            console.error('Error ensuring module is registered:', error);
        }
    }

    /**
     * Load and register a module immediately after creation
     * @param {string} filePath - Path to the module file
     * @param {string} content - Module content
     */
    async loadAndRegisterModule(filePath, content) {
        try {
            // Extract class name from file path
            const fileName = filePath.split('/').pop().split('\\').pop();
            const className = fileName.replace('.js', '');
            const pascalClassName = className;//className.charAt(0).toUpperCase() + className.slice(1);

            console.log(`Auto-registering new module: ${pascalClassName}`);

            // Check if it's an EditorWindow first
            if (content.includes('extends EditorWindow')) {
                // Use ModuleReloader to load the EditorWindow class
                if (window.moduleReloader) {
                    const success = window.moduleReloader.reloadModuleClass(pascalClassName, content);

                    if (success && window[pascalClassName]) {
                        // Register as EditorWindow
                        this.registerEditorWindow(window[pascalClassName]);
                        this.showNotification(`EditorWindow tool ${pascalClassName} registered and ready to use`, 'success');
                        return;
                    }
                }
            } else if (content.includes('extends Module')) {
                // Use ModuleReloader to load the module
                if (window.moduleReloader) {
                    const success = window.moduleReloader.reloadModuleClass(pascalClassName, content);

                    if (success) {
                        // Register with ModuleRegistry if available
                        if (window.moduleRegistry && window[pascalClassName]) {
                            window.moduleRegistry.register(window[pascalClassName]);
                        }

                        // Update inspector if available
                        if (window.editor && window.editor.inspector) {
                            window.editor.inspector.refreshModuleList();
                        }

                        this.showNotification(`Module ${pascalClassName} registered and ready to use`, 'success');
                    } else {
                        console.warn(`Failed to auto-register module: ${pascalClassName}`);
                    }
                } else {
                    console.warn("ModuleReloader not available, cannot auto-register module");
                }
            }
        } catch (error) {
            console.error('Error auto-registering module/EditorWindow:', error);
        }
    }

    /**
     * Load a script from a URL
     */
    loadScriptFromUrl(url) {
        console.log(`Loading script from URL: ${url}`);
        return new Promise((resolve, reject) => {
            // Check if script is already loaded
            const existingScript = document.querySelector(`script[src="${url}"]`);
            if (existingScript) {
                console.log(`Script ${url} already in page, waiting for it to load...`);
                setTimeout(resolve, 100); // Give it a moment and assume it will load
                return;
            }

            // Create a new script element
            const script = document.createElement('script');
            script.src = url;
            script.type = 'text/javascript';

            // Set up event handlers
            script.onload = () => {
                console.log(`Script loaded successfully: ${url}`);
                resolve();
            };

            script.onerror = (e) => {
                console.error(`Failed to load script: ${url}`, e);
                reject(new Error(`Failed to load script: ${url}`));
            };

            // Add to document
            document.head.appendChild(script);
        });
    }

    /**
     * Read a file from IndexedDB
     */
    async readFile(path) {
        if (!this.db) return null;

        return new Promise((resolve) => {
            const transaction = this.db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');

            store.get(path).onsuccess = (e) => {
                const file = e.target.result;
                resolve(file ? file.content : null);
            };
        });
    }

    /**
     * Show a notification toast
     */
    showNotification(message, type = "info") {
        console.log(`${type.toUpperCase()}: ${message}`);
        // Create a temporary notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;

        // Create notification content with close button
        notification.innerHTML = `
            <span class="notification-message">${message}</span>
            <button class="notification-close" aria-label="Close notification">&times;</button>
        `;

        document.body.appendChild(notification);

        // Add click handler for close button
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        });

        // Auto-remove after a delay
        const autoRemoveTimer = setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('fade-out');
                setTimeout(() => {
                    if (notification.parentNode) {
                        document.body.removeChild(notification);
                    }
                }, 500);
            }
        }, 3000);

        // Clear the auto-remove timer if manually closed
        closeBtn.addEventListener('click', () => {
            clearTimeout(autoRemoveTimer);
        });
    }

    /**
     * Handle module file selection
     * @param {string} filePath - Path to the selected file
     */
    handleModuleFileSelect(filePath) {
        if (filePath.endsWith('.js')) {
            this.loadModuleScript(filePath)
                .then(ModuleClass => {
                    // Show a toast notification or other feedback
                    this.showNotification(`Module loaded: ${ModuleClass.name}`);
                })
                .catch(error => {
                    this.showNotification(`Error loading module: ${error.message}`, 'error');
                });
        }
    }

    /**
     * Scan for module scripts in the file system
     */
    async scanForModuleScripts() {
        if (!this.db) return;

        try {
            // Use a transaction to get all files
            const transaction = this.db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');
            const allFiles = await new Promise(resolve => {
                store.getAll().onsuccess = e => resolve(e.target.result);
            });

            // Filter for JavaScript files
            const jsFiles = allFiles.filter(file =>
                file.type === 'file' && file.name.endsWith('.js')
            );

            // Check each file and load if it's a module
            for (const file of jsFiles) {
                const content = await this.readFile(file.path);
                if (content && content.includes('extends Module')) {
                    try {
                        await this.loadModuleScript(file.path);
                    } catch (error) {
                        console.warn(`Failed to load module ${file.path}:`, error);
                    }
                }
            }

            console.log('Module script scan complete');
        } catch (error) {
            console.error('Error scanning for module scripts:', error);
        }
    }

    async loadContent(path) {
        this.content.innerHTML = '';
        if (!this.db) return;

        // Normalize path to ensure consistent format
        path = this.normalizePath(path);
        console.log(`Loading content for path: ${path}`);

        try {
            const transaction = this.db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');
            const index = store.index('parentPath');

            // Get items with exact parent path match
            const items = await new Promise((resolve) => {
                index.getAll(path).onsuccess = (e) => {
                    const results = e.target.result;
                    console.log(`Retrieved ${results.length} items with parentPath=${path}`);
                    resolve(results);
                };
            });

            // Sort: folders first, then alphabetically
            items.sort((a, b) => {
                if (a.type === 'folder' && b.type !== 'folder') return -1;
                if (a.type !== 'folder' && b.type === 'folder') return 1;
                return a.name.localeCompare(b.name);
            });

            // Clear and rebuild UI
            this.items = [];
            this.selectedItems.clear();
            this.currentPath = path;
            this.updateBreadcrumb();

            // Create items
            items.forEach(item => this.renderItem(item));

            console.log(`Loaded ${items.length} items in ${path}`);

            // Debug: show actual paths
            console.log("Items loaded:", items.map(i => ({
                name: i.name,
                path: i.path,
                parentPath: i.parentPath,
                type: i.type
            })));
        } catch (error) {
            console.error('Failed to load content:', error);
        }
    }

    async writeFile(path, content) {
        if (!this.db) return false;

        try {
            // Normalize path
            path = this.normalizePath(path);

            const name = path.split('/').pop();
            const parentPathArray = path.split('/').slice(0, -1);
            const parentPath = parentPathArray.length === 1 ? '/' : parentPathArray.join('/');

            // Ensure the parent directory exists
            if (parentPath !== '/') {
                const parentExists = await this.exists(parentPath);
                if (!parentExists) {
                    // Create parent directories recursively
                    await this.createDirectory(parentPath);
                }
            }

            if (path.endsWith('.js')) {
                // Check if the updated file is an EditorWindow
                await this.checkAndRegisterEditorWindow(path, content);
            }

            // Now create or update the file
            return await this.createFile(path, content, true);
        } catch (error) {
            console.error('Error writing file:', error);
            return false;
        }
    }

    normalizePath(path) {
        if (!path) return '/';

        // Ensure path starts with a slash
        if (!path.startsWith('/')) {
            path = '/' + path;
        }

        // Remove duplicate slashes
        path = path.replace(/\/+/g, '/');

        // Remove trailing slash unless it's the root path
        if (path.length > 1 && path.endsWith('/')) {
            path = path.slice(0, -1);
        }

        return path;
    }

    renderItem(item) {
        const element = document.createElement('div');
        element.className = 'fb-item';
        element.draggable = true;
        element.dataset.path = item.path;
        element.dataset.type = item.type;
        element.dataset.name = item.name;

        let icon = 'fa-file';
        let previewHTML = ''; // Changed variable name for clarity

        if (item.type === 'folder') {
            icon = 'fa-folder';
        } else {
            const extension = item.name.split('.').pop().toLowerCase();
            if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp'].includes(extension)) {
                if (item.content && typeof item.content === 'string' && item.content.startsWith('data:image')) {
                    previewHTML = `<div class="fb-preview-img"><img src="${item.content}" alt="${item.name}" loading="lazy"></div>`;
                    element.classList.add('has-preview');
                } else {
                    // console.warn(`Item ${item.name} looks like an image but content is not a data URL:`, item.content);
                    icon = 'fa-file-image';
                }
            } else if (extension === 'js') {
                icon = 'fa-file-code';

                // Check if it's a module script
                if (item.content && item.content.includes('extends Module')) {
                    // Try to get the module class from window
                    const className = item.name.replace('.js', '');
                    const pascalClassName = className.charAt(0).toUpperCase() + className.slice(1);
                    let ModuleClass = window[className];
                    if (!ModuleClass) ModuleClass = window[pascalClassName];

                    /*if (ModuleClass && typeof ModuleClass.prototype.draw === 'function') {
                        try {
                            const canvas = document.createElement('canvas');
                            canvas.width = 800;
                            canvas.height = 800;
                            const ctx = canvas.getContext('2d');
                            const instance = new ModuleClass();
                            instance.draw(ctx);
                            const dataUrl = canvas.toDataURL();
                            // Place preview above the file name, stretched to icon size
                            previewHTML = `<div class="fb-preview-img" style="width:48px;height:48px;display:flex;align-items:center;
                            justify-content:center;">
                    <img src="${dataUrl}" alt="${item.name}" style="width:100%;height:100%;object-fit:contain;">
                </div>`;
                            element.classList.add('has-preview');
                            icon = ''; // Hide code icon if preview is available
                        } catch (err) {
                            icon = 'fa-file-code';
                        }
                    }*/
                }
            } else if (extension === 'prefab') {
                icon = 'fa-cube';
                element.classList.add('prefab-file');
            } else if (extension === 'scene') {
                icon = 'fa-gamepad';
            } else if (extension === 'doc') {
                icon = 'fa-book';
            } else if (extension === 'json') {
                icon = 'fa-file-code'; // Or a different icon if you prefer
            } else if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(extension)) {
                icon = 'fa-file-audio';
            }
            // Add more file types as needed
        }

        /*element.innerHTML = `
            <i class="fas ${icon}"></i>
            <span class="fb-item-name" title="${item.name}">${item.name}</span>
            ${previewHTML}
        `;*/

        element.innerHTML = `
            ${previewHTML || (icon ? `<i class="fas ${icon}" style="font-size:32px;display:block;text-align:center;width:32px;height:32px;"></i>` : '')}
            <span class="fb-item-name" title="${item.name}">${item.name}</span>
        `;

        this.content.appendChild(element);
        this.items.push({ ...item, element });
    }

    async openFile(path) {
        const file = await this.getFile(path);
        if (!file) {
            this.showNotification(`File not found: ${path}`, 'error');
            return;
        }

        const fileName = file.name.toLowerCase();

        // --- Prefab file handling ---
        if (fileName.endsWith('.prefab')) {
            // Open prefab file in Script Editor (like scripts)
            try {
                // Check if ScriptEditor.js is loaded first
                if (!window.ScriptEditor) {
                    console.log("ScriptEditor not found, attempting to load it dynamically...");
                    try {
                        await this.loadScriptFromUrl('/src/core/ScriptEditor.js');
                        await new Promise(resolve => setTimeout(resolve, 200));
                        if (!window.ScriptEditor) {
                            throw new Error("ScriptEditor class still not available after loading");
                        }
                    } catch (err) {
                        console.error("Failed to load ScriptEditor.js:", err);
                        this.showNotification("Cannot load Script Editor. Please check console for details.", "error");
                        return;
                    }
                }

                if (!window.scriptEditor) {
                    try {
                        window.scriptEditor = new window.ScriptEditor();
                        console.log("ScriptEditor initialized on demand");
                    } catch (err) {
                        console.error("Error instantiating ScriptEditor:", err);
                        this.showNotification("Failed to initialize Script Editor", "error");
                        return;
                    }
                }

                window.scriptEditor.loadFile(path, file.content);
            } catch (error) {
                console.error("Failed to initialize ScriptEditor:", error);
                this.showNotification("Failed to initialize script editor", "error");
            }
            return;
        }

        if (fileName.endsWith('.md')) {
            // Double-click opens the markdown viewer
            // IMPORTANT: Pass the full content, not a truncated version
            this.showMarkdownModal(file);
            return;
        }

        if (fileName.endsWith('.doc')) {
            // Double-click opens the documentation viewer
            this.showDocModal(file);
            return;
        }

        if (fileName.endsWith('.scene')) {
            await this.openSceneFile(file);
        } else if (fileName.endsWith('.spritecode')) {
            // Open in SpriteCode editor
            if (window.spriteCode) {
                window.spriteCode.openModal();
                window.spriteCode.loadDrawingFromFile(file.path);
            } else {
                this.showNotification('SpriteCode editor not available', 'error');
            }
        } else if (/\.(png|jpg|jpeg|gif|svg|ico|webp)$/i.test(fileName)) {
            this.showImagePreviewModal(file);
        } else if (/\.(mp3|wav|ogg|aac|flac)$/i.test(fileName)) {
            this.showAudioPlayerModal(file);
        } else if (this.isEditableFile(file.name)) {
            try {
                // Check if ScriptEditor.js is loaded first
                if (!window.ScriptEditor) {
                    console.log("ScriptEditor not found, attempting to load it dynamically...");
                    try {
                        // Try to load the script directly
                        await this.loadScriptFromUrl('/src/core/ScriptEditor.js');

                        // Wait a moment to ensure the script is initialized
                        await new Promise(resolve => setTimeout(resolve, 200));

                        // Check if it's available now
                        if (!window.ScriptEditor) {
                            throw new Error("ScriptEditor class still not available after loading");
                        }
                    } catch (err) {
                        console.error("Failed to load ScriptEditor.js:", err);
                        this.showNotification("Cannot load Script Editor. Please check console for details.", "error");
                        return;
                    }
                }

                // Now try to initialize ScriptEditor
                if (!window.scriptEditor) {
                    try {
                        window.scriptEditor = new window.ScriptEditor();
                        console.log("ScriptEditor initialized on demand");
                    } catch (err) {
                        console.error("Error instantiating ScriptEditor:", err);
                        this.showNotification("Failed to initialize Script Editor", "error");
                        return;
                    }
                }

                // Now open the file with the editor
                window.scriptEditor.loadFile(path, file.content);
            } catch (error) {
                console.error("Failed to initialize ScriptEditor:", error);
                this.showNotification("Failed to initialize script editor", "error");
            }
        } else {
            this.showNotification(`Cannot open file type: ${file.name}`, 'info');
            console.log(`Opening unhandled file type: ${path}`);
        }
    }

    async loadScriptIfNeeded(scriptName) {
        // Check if script is already in page
        const existingScript = document.querySelector(`script[src*="${scriptName}.js"]`);
        if (existingScript) return;

        console.log(`Dynamically loading ${scriptName}.js`);

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            // Fix the path to use the correct directory structure
            script.src = `src/core/${scriptName}.js`; // Remove the leading slash
            script.onload = () => {
                console.log(`${scriptName}.js loaded successfully`);
                resolve();
            };
            script.onerror = (err) => {
                console.error(`Failed to load ${scriptName}.js:`, err);
                reject(new Error(`Failed to load ${scriptName}.js`));
            };
            document.head.appendChild(script);
        });
    }

    async exists(path) {
        if (!this.db) return false;

        return new Promise((resolve) => {
            const transaction = this.db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');

            store.get(path).onsuccess = (e) => {
                resolve(!!e.target.result);
            };
        });
    }

    async createDirectory(path) {
        if (!this.db) return false;

        try {
            // Normalize path to ensure consistency
            path = this.normalizePath(path);
            if (path === '/') {
                // Root already exists after DB init
                return true;
            }

            // Check if directory already exists
            const exists = await this.exists(path);
            if (exists) {
                console.log(`Directory already exists: ${path}`);
                return true;
            }

            const name = path.split('/').pop();
            const parentPathArray = path.split('/').slice(0, -1);
            const parentPath = parentPathArray.length === 1 ? '/' : parentPathArray.join('/');

            // Ensure parent directories exist first (recursive)
            if (parentPath !== '/' && parentPath !== '') {
                const parentExists = await this.exists(parentPath);
                if (!parentExists) {
                    const parentCreated = await this.createDirectory(parentPath);
                    if (!parentCreated) {
                        return false;
                    }
                }
            }

            // Double check if folder with same name exists in parent directory
            // This prevents duplicates due to race conditions
            const nameClashCheck = await this.checkNameClash(parentPath, name);
            if (nameClashCheck) {
                console.warn(`A folder with name "${name}" already exists in ${parentPath}`);
                this.showNotification(`Folder "${name}" already exists`, 'warning');
                return false;
            }

            // Create folder object
            const newFolder = {
                name,
                path,
                parentPath,
                type: 'folder',
                created: Date.now()
            };

            // Create a transaction for this specific operation
            const result = await new Promise((resolve) => {
                const transaction = this.db.transaction(['files'], 'readwrite');
                const store = transaction.objectStore('files');

                transaction.oncomplete = () => {
                    console.log(`Created directory: ${path}`);
                    resolve(true);
                };

                transaction.onerror = (e) => {
                    // If it's a ConstraintError, treat as success (directory already exists)
                    if (e.target.error && e.target.error.name === 'ConstraintError') {
                        console.warn(`Directory already exists (ConstraintError): ${path}`);
                        resolve(true);
                    } else {
                        console.error(`Error creating directory ${path}:`, e.target.error);
                        resolve(false);
                    }
                };

                try {
                    store.add(newFolder);
                } catch (err) {
                    // If it's a ConstraintError, treat as success
                    if (err.name === 'ConstraintError') {
                        console.warn(`Directory already exists (ConstraintError): ${path}`);
                        resolve(true);
                    } else {
                        console.error("Error in store.add:", err);
                        resolve(false);
                    }
                }
            });

            if (result) {
                // Refresh the UI to show the new folder
                this.refreshFiles();

                // Also refresh the parent folder in the directory tree
                if (this.directoryTree) {
                    await this.directoryTree.refreshFolder(path);
                }
            }

            return result;
        } catch (error) {
            console.error('Error creating directory:', error);
            return false;
        }
    }

    showImagePreviewModal(file) {
        const existingModal = document.getElementById('imagePreviewModal');
        if (existingModal) existingModal.remove();

        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'imagePreviewModal';
        modalOverlay.className = 'media-modal-overlay';

        let currentScale = 1;
        let posX = 0;
        let posY = 0;
        let isDragging = false;
        let startX, startY;

        modalOverlay.innerHTML = `
            <div class="media-modal-content">
                <div class="media-modal-header">
                    <h3 class="media-modal-title">${file.name}</h3>
                    <button class="media-modal-close">&times;</button>
                </div>
                <div class="media-modal-body">
                    <div class="image-preview-container">
                        <img src="${file.content}" alt="${file.name}" style="transform: scale(${currentScale}) translate(${posX}px, ${posY}px);">
                    </div>
                </div>
                <div class="media-modal-footer">
                    <button id="zoomInBtn"><i class="fas fa-search-plus"></i> Zoom In</button>
                    <button id="zoomOutBtn"><i class="fas fa-search-minus"></i> Zoom Out</button>
                    <button id="resetZoomBtn"><i class="fas fa-sync-alt"></i> Reset</button>
                </div>
            </div>
        `;
        document.body.appendChild(modalOverlay);

        const modalContent = modalOverlay.querySelector('.media-modal-content');
        const img = modalOverlay.querySelector('img');
        const closeBtn = modalOverlay.querySelector('.media-modal-close');
        const zoomInBtn = modalOverlay.querySelector('#zoomInBtn');
        const zoomOutBtn = modalOverlay.querySelector('#zoomOutBtn');
        const resetZoomBtn = modalOverlay.querySelector('#resetZoomBtn');

        const updateTransform = () => {
            img.style.transform = `scale(${currentScale}) translate(${posX}px, ${posY}px)`;
        };

        zoomInBtn.onclick = () => { currentScale *= 1.2; updateTransform(); };
        zoomOutBtn.onclick = () => { currentScale /= 1.2; updateTransform(); };
        resetZoomBtn.onclick = () => { currentScale = 1; posX = 0; posY = 0; updateTransform(); };
        closeBtn.onclick = () => modalOverlay.remove();
        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) modalOverlay.remove();
        };

        img.onmousedown = (e) => {
            if (e.button !== 0) return; // Only left click
            isDragging = true;
            img.classList.add('grabbing');
            startX = e.clientX - posX * currentScale; // Adjust for current translation and scale
            startY = e.clientY - posY * currentScale;
            e.preventDefault();
        };

        window.onmousemove = (e) => {
            if (!isDragging) return;
            // Divide by currentScale to make mouse movement feel natural regardless of zoom level
            posX = (e.clientX - startX) / currentScale;
            posY = (e.clientY - startY) / currentScale;
            updateTransform();
        };

        window.onmouseup = () => {
            if (isDragging) {
                isDragging = false;
                img.classList.remove('grabbing');
            }
        };

        img.onwheel = (e) => {
            e.preventDefault();
            const zoomFactor = 1.1;
            if (e.deltaY < 0) { // Zoom in
                currentScale *= zoomFactor;
            } else { // Zoom out
                currentScale /= zoomFactor;
            }
            // Basic zoom towards mouse pointer (can be improved)
            // For simplicity, this example zooms towards center
            updateTransform();
        };


        // Show modal
        setTimeout(() => modalOverlay.classList.add('visible'), 10);
    }

    showAudioPlayerModal(file) {
        const existingModal = document.getElementById('audioPlayerModal');
        if (existingModal) existingModal.remove();

        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'audioPlayerModal';
        modalOverlay.className = 'media-modal-overlay';
        modalOverlay.innerHTML = `
            <div class="media-modal-content">
                <div class="media-modal-header">
                    <h3 class="media-modal-title">${file.name}</h3>
                    <button class="media-modal-close">&times;</button>
                </div>
                <div class="media-modal-body">
                    <div class="audio-player-container">
                        <audio controls autoplay src="${file.content}"></audio>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalOverlay);

        const closeBtn = modalOverlay.querySelector('.media-modal-close');
        closeBtn.onclick = () => modalOverlay.remove();
        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) modalOverlay.remove();
        };

        // Show modal
        setTimeout(() => modalOverlay.classList.add('visible'), 10);
    }

    getRootPath() {
        return '/';
    }

    async stat(path) {
        if (!this.db) return null;

        const transaction = this.db.transaction(['files'], 'readonly');
        const store = transaction.objectStore('files');

        return new Promise((resolve) => {
            store.get(path).onsuccess = (e) => {
                resolve(e.target.result);
            };
        });
    }

    showMarkdownModal(file) {
        const existingModal = document.getElementById('markdownViewerModal');
        if (existingModal) existingModal.remove();

        if (!file || !file.content) {
            console.error('File or file content is missing:', file);
            this.showNotification('Cannot display markdown: file content missing', 'error');
            return;
        }

        console.log(`showMarkdownModal ENTRY: content length = ${file.content.length}`);
        console.log(`showMarkdownModal ENTRY: first 50 chars = ${file.content.substring(0, 50)}`);

        // Store content immediately in a local variable
        const markdownContent = file.content;

        console.log(`Stored in local var: ${markdownContent.length} characters`);

        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'markdownViewerModal';
        modalOverlay.className = 'media-modal-overlay';
        modalOverlay.innerHTML = `
    <div class="media-modal-content" style="max-width: 1080px; max-height: 98vh; display: flex; flex-direction: column;">
        <div class="media-modal-header" style="flex-shrink: 0;">
            <h3 class="media-modal-title">${file.name}</h3>
            <button class="media-modal-close">&times;</button>
        </div>
        <div class="media-modal-body" style="flex: 1; overflow-x: hidden; overflow-y: auto; padding: 20px; min-height: 0;">  <!-- Added overflow-y: auto for explicit vertical scrolling -->
            <div id="markdownContent" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #e0e0e0; width: 100%;">
                Loading...
            </div>
        </div>
    </div>
`;
        document.body.appendChild(modalOverlay);

        const closeBtn = modalOverlay.querySelector('.media-modal-close');
        closeBtn.onclick = () => modalOverlay.remove();
        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) modalOverlay.remove();
        };

        console.log(`About to call loadAndRenderMarkdown with ${markdownContent.length} chars`);
        this.loadAndRenderMarkdown(markdownContent);

        setTimeout(() => {
            modalOverlay.classList.add('visible');
            //const bodyDiv = modalOverlay.querySelector('.media-modal-body');
            //if (bodyDiv) bodyDiv.scrollTop = 0;
        }, 10);
    }

    /**
     * Custom markdown parser to replace marked.js
     * @param {string} markdown - Markdown text to parse
     * @returns {string} HTML string
     */
    parseMarkdown(markdown) {
        if (!markdown || typeof markdown !== 'string') {
            return '';
        }

        // Split into lines for processing
        const lines = markdown.split('\n');
        const html = [];
        let inCodeBlock = false;
        let codeBlockContent = [];
        let inList = false;
        let listItems = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];

            // Handle code blocks
            if (line.trim().startsWith('```')) {
                if (inCodeBlock) {
                    // End code block
                    html.push(`<pre><code>${this.escapeHtml(codeBlockContent.join('\n'))}</code></pre>`);
                    inCodeBlock = false;
                    codeBlockContent = [];
                } else {
                    // Start code block
                    if (inList) {
                        html.push('</ul>');
                        inList = false;
                    }
                    inCodeBlock = true;
                }
                continue;
            }

            if (inCodeBlock) {
                codeBlockContent.push(line);
                continue;
            }

            // Handle headers
            const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (headerMatch) {
                if (inList) {
                    html.push('</ul>');
                    inList = false;
                }
                const level = headerMatch[1].length;
                const text = this.parseInlineElements(headerMatch[2]);
                html.push(`<h${level}>${text}</h${level}>`);
                continue;
            }

            // Handle horizontal rules
            if (line.trim().match(/^[-*_]{3,}$/)) {
                if (inList) {
                    html.push('</ul>');
                    inList = false;
                }
                html.push('<hr>');
                continue;
            }

            // Handle blockquotes
            if (line.trim().startsWith('>')) {
                if (inList) {
                    html.push('</ul>');
                    inList = false;
                }
                const quoteText = line.trim().substring(1).trim();
                html.push(`<blockquote>${this.parseInlineElements(quoteText)}</blockquote>`);
                continue;
            }

            // Handle lists
            const listMatch = line.match(/^(\s*)([-*+])\s+(.+)$/);
            if (listMatch) {
                const indent = listMatch[1].length;
                const marker = listMatch[2];
                const text = listMatch[3];

                if (!inList) {
                    html.push('<ul>');
                    inList = true;
                }

                html.push(`<li>${this.parseInlineElements(text)}</li>`);
                continue;
            }

            // Handle empty lines
            if (line.trim() === '') {
                if (inList) {
                    html.push('</ul>');
                    inList = false;
                }
                continue;
            }

            // Handle paragraphs
            if (inList) {
                html.push('</ul>');
                inList = false;
            }
            html.push(`<p>${this.parseInlineElements(line)}</p>`);
        }

        // Close any open lists
        if (inList) {
            html.push('</ul>');
        }

        return html.join('\n');
    }

    /**
     * Parse inline markdown elements (bold, italic, code, links)
     * @param {string} text - Text to parse
     * @returns {string} HTML string
     */
    parseInlineElements(text) {
        if (!text) return '';

        // Escape HTML first
        //text = this.escapeHtml(text);

        // Handle inline code
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Handle links
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

        // Handle bold and italic (process ** first, then *)
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

        return text;
    }

    /**
     * Escape HTML characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    loadAndRenderMarkdown(markdownContent) {
        console.log('=== loadAndRenderMarkdown START ===');
        console.log('Type of markdownContent:', typeof markdownContent);
        console.log('Is null/undefined?', markdownContent == null);

        // Validate content exists and is a string
        if (!markdownContent || typeof markdownContent !== 'string') {
            console.error('Invalid markdown content:', typeof markdownContent, markdownContent ? markdownContent.length : 0);
            const contentDiv = document.getElementById('markdownContent');
            if (contentDiv) {
                contentDiv.innerHTML = `<p style="color: #ff6b6b;">Error: Invalid markdown content</p>`;
            }
            return;
        }

        const originalLength = markdownContent.length;
        console.log(`Original content length: ${originalLength}`);

        // Store content in a constant that cannot be modified
        const fullMarkdownContent = String(markdownContent);

        console.log(`Stored content length: ${fullMarkdownContent.length}`);
        console.log('First 300 chars:', fullMarkdownContent.substring(0, 300));
        console.log('Last 300 chars:', fullMarkdownContent.substring(fullMarkdownContent.length - 300));

        // Render directly - no chunking needed
        this.renderMarkdownDirectly(fullMarkdownContent);
    }

    ensureMarkedLibrary(callback) {
        if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
            callback();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
        script.crossOrigin = 'anonymous';

        script.onload = () => {
            setTimeout(callback, 100);
        };

        script.onerror = (e) => {
            console.error('Failed to load marked.js', e);
            this.showMarkdownError('Failed to load markdown parser');
        };

        document.head.appendChild(script);
    }

    /**
     * Render markdown content in chunks for better performance with large files
     */
    async renderMarkdownInChunks(fullContent, config) {
        const chunks = this.chunkMarkdownContent(fullContent, config.chunkSize);
        const totalChunks = chunks.length;

        console.log(`Splitting content into ${totalChunks} chunks`);

        // Show progress indicator if enabled
        let progressDiv;
        if (config.showProgress) {
            progressDiv = this.showChunkingProgress(0, totalChunks);
        }

        try {
            // Process chunks sequentially to avoid overwhelming the browser
            const htmlParts = [];

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                console.log(`Processing chunk ${chunk.chunkNumber}/${totalChunks} (${chunk.startIndex}-${chunk.endIndex})`);

                // Update progress
                if (progressDiv) {
                    this.updateChunkingProgress(progressDiv, i + 1, totalChunks);
                }

                // Render this chunk
                const chunkHtml = await this.renderMarkdownChunk(chunk.content, chunk.chunkNumber);
                htmlParts.push(chunkHtml);

                // Yield control to browser to prevent freezing
                if (i < chunks.length - 1) {
                    await this.yieldToBrowser();
                }
            }

            // Combine all HTML parts
            const completeHtml = htmlParts.join('');
            console.log(`Chunked rendering complete. Total HTML length: ${completeHtml.length}`);

            // Display the complete content
            this.displayMarkdownContent(completeHtml);

            // Remove progress indicator
            if (progressDiv) {
                progressDiv.remove();
            }

        } catch (error) {
            console.error('Error in chunked rendering:', error);
            if (progressDiv) {
                progressDiv.remove();
            }
            // Use showNotification instead of the missing showMarkdownError
            this.showNotification(`Chunked rendering failed: ${error.message}`, 'error');
        }
    }

    /**
     * Display the final markdown HTML content
     */
    displayMarkdownContent(htmlContent) {
        const contentDiv = document.getElementById('markdownContent');
        if (!contentDiv) {
            console.error('markdownContent div not found');
            return;
        }

        // Log for debugging
        console.log('Setting HTML length:', htmlContent.length);
        console.log('Setting HTML starts with:', htmlContent.substring(0, 500));

        contentDiv.innerHTML = htmlContent;
        this.styleMarkdownContent(contentDiv);

        // Force a layout reflow and ensure scrolling resets after rendering
        requestAnimationFrame(() => {
            // Force reflow to ensure height calculations are complete
            contentDiv.offsetHeight;

            // Reset scroll on the modal body (the scrollable container)
            const modalBody = contentDiv.closest('.media-modal-body');
            if (modalBody) {
                modalBody.scrollTop = 0;
            }
            // Removed contentDiv.scrollTop reset since the body handles scrolling now
        });
    }

    /**
     * Show progress indicator for chunked rendering
     */
    showChunkingProgress(current, total) {
        const progressDiv = document.createElement('div');
        progressDiv.id = 'markdownProgress';
        progressDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 20px;
        border-radius: 8px;
        z-index: 10000;
        text-align: center;
        border: 2px solid #64B5F6;
    `;

        progressDiv.innerHTML = `
        <div style="margin-bottom: 10px;">
            <i class="fas fa-spinner fa-spin"></i>
        </div>
        <div>Rendering markdown content...</div>
        <div style="margin-top: 10px; font-size: 12px; color: #aaa;">
            Chunk <span id="currentChunk">0</span> of ${total}
        </div>
        <div style="margin-top: 5px;">
            <div style="width: 200px; height: 4px; background: #333; margin: 0 auto;">
                <div id="progressBar" style="height: 100%; width: 0%; background: #64B5F6; transition: width 0.3s;"></div>
            </div>
        </div>
    `;

        document.body.appendChild(progressDiv);
        return progressDiv;
    }

    /**
     * Update the chunking progress indicator
     */
    updateChunkingProgress(progressDiv, current, total) {
        const currentChunkSpan = progressDiv.querySelector('#currentChunk');
        const progressBar = progressDiv.querySelector('#progressBar');

        if (currentChunkSpan) {
            currentChunkSpan.textContent = current;
        }

        if (progressBar) {
            const percentage = (current / total) * 100;
            progressBar.style.width = `${percentage}%`;
        }
    }

    /**
     * Yield control to browser to prevent UI freezing
     */
    yieldToBrowser() {
        return new Promise(resolve => {
            setTimeout(resolve, 0);
        });
    }

    /**
     * Render a single markdown chunk
     */
    renderMarkdownChunk(chunkContent, chunkNumber) {
        return new Promise((resolve, reject) => {
            try {
                // Use custom parser instead of marked
                const htmlContent = this.parseMarkdown(chunkContent);
                resolve(htmlContent);

            } catch (error) {
                console.error(`Error rendering chunk ${chunkNumber}:`, error);
                reject(error);
            }
        });
    }

    /**
     * Render markdown content directly (for smaller files)
     */
    renderMarkdownDirectly(markdownContent) {
        try {
            // Use custom parser
            const htmlContent = this.parseMarkdown(markdownContent);

            // Display the content
            this.displayMarkdownContent(htmlContent);

        } catch (error) {
            console.error('Error in direct rendering:', error);
            this.showNotification(`Rendering failed: ${error.message}`, 'error');
        }
    }

    /**
 * Break large markdown content into smaller chunks for progressive loading
 * @param {string} content - The full markdown content
 * @param {number} chunkSize - Size of each chunk in characters (default: 50KB)
 * @returns {Array} Array of content chunks with metadata
 */
    chunkMarkdownContent(content, chunkSize = 50000) {
        const chunks = [];
        const totalLength = content.length;

        for (let i = 0; i < totalLength; i += chunkSize) {
            const chunkContent = content.slice(i, i + chunkSize);
            const chunkInfo = {
                content: chunkContent,
                startIndex: i,
                endIndex: Math.min(i + chunkSize, totalLength),
                chunkNumber: Math.floor(i / chunkSize) + 1,
                isLastChunk: (i + chunkSize) >= totalLength
            };
            chunks.push(chunkInfo);
        }

        return chunks;
    }

    styleMarkdownContent(contentDiv) {
        // Set base styles on the container first to prevent layout shifts
        contentDiv.style.cssText = `
        /* Removed flex: 1 to prevent it from filling the body and interfering with body-level scrolling */
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        line-height: 1.6;
        color: #e0e0e0;
        width: 100%;
        padding: 0;  /* Keep padding removed as before */
        margin-top: 0;
    `;

        // Style headings
        contentDiv.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
            heading.style.cssText = `
            margin-top: ${heading.tagName === 'H1' ? '0' : '24px'};
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
            border-bottom: ${heading.tagName === 'H1' || heading.tagName === 'H2' ? '1px solid #444' : 'none'};
            padding-bottom: ${heading.tagName === 'H1' || heading.tagName === 'H2' ? '10px' : '0'};
        `;

            if (heading.tagName === 'H1') {
                heading.style.fontSize = '32px';
                heading.style.color = '#64B5F6';
            } else if (heading.tagName === 'H2') {
                heading.style.fontSize = '24px';
                heading.style.color = '#81C784';
            } else if (heading.tagName === 'H3') {
                heading.style.fontSize = '20px';
                heading.style.color = '#FFB74D';
            }
        });

        // Style paragraphs
        contentDiv.querySelectorAll('p').forEach(p => {
            p.style.marginBottom = '12px';
        });

        // Style code blocks
        contentDiv.querySelectorAll('pre').forEach(pre => {
            pre.style.cssText = `
            background: #1e1e1e;
            border: 1px solid #444;
            border-radius: 6px;
            padding: 16px;
            overflow-x: auto;
            margin: 16px 0;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.4;
        `;
        });

        // Style inline code
        contentDiv.querySelectorAll('code').forEach(code => {
            if (!code.parentElement.tagName === 'PRE') {
                code.style.cssText = `
                background: #2a2a2a;
                border: 1px solid #444;
                border-radius: 3px;
                padding: 2px 6px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                color: #FFB74D;
            `;
            }
        });

        // Style lists
        contentDiv.querySelectorAll('ul, ol').forEach(list => {
            list.style.cssText = `
            margin: 12px 0;
            padding-left: 24px;
        `;
        });

        contentDiv.querySelectorAll('li').forEach(li => {
            li.style.marginBottom = '8px';
        });

        // Style blockquotes
        contentDiv.querySelectorAll('blockquote').forEach(bq => {
            bq.style.cssText = `
            border-left: 4px solid #64B5F6;
            background: rgba(100, 181, 246, 0.1);
            padding: 12px 16px;
            margin: 16px 0;
            border-radius: 4px;
        `;
        });

        // Style links
        contentDiv.querySelectorAll('a').forEach(link => {
            link.style.cssText = `
            color: #64B5F6;
            text-decoration: none;
            cursor: pointer;
            border-bottom: 1px solid transparent;
            transition: border-color 0.2s;
        `;
            link.addEventListener('mouseenter', () => {
                link.style.borderBottomColor = '#64B5F6';
            });
            link.addEventListener('mouseleave', () => {
                link.style.borderBottomColor = 'transparent';
            });
            link.addEventListener('click', (e) => {
                e.preventDefault();
                window.open(link.href, '_blank');
            });
        });

        // Style tables
        contentDiv.querySelectorAll('table').forEach(table => {
            table.style.cssText = `
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
        `;

            table.querySelectorAll('th, td').forEach(cell => {
                cell.style.cssText = `
                border: 1px solid #444;
                padding: 10px 12px;
                text-align: left;
            `;
            });

            table.querySelectorAll('th').forEach(th => {
                th.style.cssText = `
                border: 1px solid #444;
                padding: 10px 12px;
                background: #2a2a2a;
                font-weight: 600;
            `;
            });
        });

        // Style horizontal rules
        contentDiv.querySelectorAll('hr').forEach(hr => {
            hr.style.cssText = `
            border: none;
            border-top: 2px solid #444;
            margin: 24px 0;
        `;
        });
    }

    isEditableFile(filename) {
        const textExtensions = ['.js', '.json', '.txt', '.html', '.css'];
        return textExtensions.some(ext => filename.toLowerCase().endsWith(ext));
    }

    /**
     * Show the documentation modal for .doc files
     * @param {Object} file - The file object containing path, name, and content
     */
    showDocModal(file) {
        try {
            const data = JSON.parse(file.content);
            if (window.SpriteCodeDocs) {
                const docs = new window.SpriteCodeDocs();
                docs.loadFromJSONObject(data);
                docs.open();
            } else {
                this.showNotification('SpriteCodeDocs not available', 'error');
            }
        } catch (e) {
            console.error('Error parsing documentation JSON:', e);
            this.showNotification('Invalid documentation file format', 'error');
        }
    }

    /**
     * Show a save dialog
     * @param {Object} options - Dialog options
     * @returns {Promise<string>} Selected file path
     */
    async showSaveDialog(options) {
        const defaultName = options.defaultPath ?
            options.defaultPath.split('/').pop().split('\\').pop() :
            'untitled.scene';

        const name = await this.promptDialog('Save File', 'Enter file name:', defaultName);
        if (!name) return null;

        // Ensure parent directory exists
        const parentDir = options.defaultPath ?
            options.defaultPath.substring(0, options.defaultPath.lastIndexOf('/')) :
            this.currentPath;

        if (parentDir !== '/') {
            await this.ensureDirectoryExists(parentDir);
        }

        // Return the full path
        return `${parentDir}/${name}`;
    }

    /**
     * Show an open dialog
     * @param {Object} options - Dialog options
     * @returns {Promise<string>} Selected file path
     */
    async showOpenDialog(options) {
        // For now, just use the current selected file
        if (this.selectedItems.size !== 1) {
            alert('Please select exactly one file to open');
            return null;
        }

        const selectedItem = this.selectedItems.values().next().value;
        if (selectedItem.dataset.type !== 'file') {
            alert('Please select a file to open');
            return null;
        }

        return selectedItem.dataset.path;
    }

    /**
     * Ensure a directory exists, creating it if necessary
     * @param {string} path - Directory path
     */
    async ensureDirectoryExists(path) {
        try {
            const exists = await this.exists(path);
            if (!exists) {
                // Create directory and parents using our corrected createDirectory method
                await this.createDirectory(path);
            }
            return true;
        } catch (error) {
            console.error('Error ensuring directory exists:', error);
            return false;
        }
    }

    /**
     * Copy selected items to clipboard
     */
    copySelectedToClipboard() {
        if (this.selectedItems.size === 0) {
            this.showNotification('No items selected', 'warning');
            return;
        }

        this.clipboard.items = Array.from(this.selectedItems).map(item => ({
            path: item.dataset.path,
            name: item.dataset.name,
            type: item.dataset.type
        }));
        this.clipboard.operation = 'copy';

        const count = this.clipboard.items.length;
        this.showNotification(`${count} item${count !== 1 ? 's' : ''} copied to clipboard`, 'info');
    }

    /**
     * Cut selected items to clipboard
     */
    cutSelectedToClipboard() {
        if (this.selectedItems.size === 0) {
            this.showNotification('No items selected', 'warning');
            return;
        }

        this.clipboard.items = Array.from(this.selectedItems).map(item => ({
            path: item.dataset.path,
            name: item.dataset.name,
            type: item.dataset.type
        }));
        this.clipboard.operation = 'cut';

        const count = this.clipboard.items.length;
        this.showNotification(`${count} item${count !== 1 ? 's' : ''} cut to clipboard`, 'info');

        // Visual indication of cut items
        this.selectedItems.forEach(item => {
            item.classList.add('fb-item-cut');
        });
    }

    /**
     * Paste items from clipboard to current directory
     */
    async pasteFromClipboard() {
        if (!this.clipboard.items || this.clipboard.items.length === 0) {
            this.showNotification('Clipboard is empty', 'warning');
            return;
        }

        const targetPath = this.currentPath;
        console.log(`Pasting into ${targetPath}`);

        try {
            // Process clipboard items
            for (const item of this.clipboard.items) {
                // Check if pasting into the same folder as the source
                const sourceParentPath = item.path.substring(0, item.path.lastIndexOf('/'));
                if (sourceParentPath === targetPath) {
                    // Skip if trying to paste in same folder during a cut operation
                    if (this.clipboard.operation === 'cut') {
                        continue;
                    }

                    // For copy operation, create a copy with a new name
                    await this.duplicateItem(item.path, targetPath);
                } else {
                    if (this.clipboard.operation === 'copy') {
                        // Copy item to new location
                        await this.copyItem(item.path, `${targetPath}/${item.name}`);
                    } else {
                        // Move item to new location
                        await this.moveItem(item.path, `${targetPath}/${item.name}`);
                    }
                }
            }

            // Clear the cut style if it was a cut operation
            if (this.clipboard.operation === 'cut') {
                document.querySelectorAll('.fb-item-cut').forEach(el => {
                    el.classList.remove('fb-item-cut');
                });

                // Clear clipboard after cut & paste
                this.clipboard.items = [];
                this.clipboard.operation = null;
            }

            // Refresh file browser
            await this.loadContent(this.currentPath);

            const operationText = this.clipboard.operation === 'cut' ? 'moved' : 'copied';
            this.showNotification(`Items ${operationText} successfully`, 'success');
        } catch (error) {
            console.error('Error pasting items:', error);
            this.showNotification(`Error pasting items: ${error.message}`, 'error');
        }
    }

    /**
     * Copy an item (file or folder) to a new location
     * @param {string} sourcePath - Source path
     * @param {string} destPath - Destination path
     */
    async copyItem(sourcePath, destPath) {
        try {
            console.log(`Copying from ${sourcePath} to ${destPath}`);
            const sourceItem = await this.getFile(sourcePath);
            if (!sourceItem) {
                console.error(`Source item not found: ${sourcePath}`);
                throw new Error(`Source item not found: ${sourcePath}`);
            }

            // Get destination folder path and filename
            const destName = destPath.split('/').pop();
            const destFolder = destPath.substring(0, destPath.lastIndexOf('/'));

            // Check if destination already exists and generate new name if needed
            if (await this.exists(destPath)) {
                console.log(`Destination already exists: ${destPath}. Generating unique name.`);

                // Extract base name and extension
                let baseName = destName;
                let extension = '';

                if (sourceItem.type === 'file' && destName.includes('.')) {
                    const parts = destName.split('.');
                    extension = '.' + parts.pop();
                    baseName = parts.join('.');
                }

                // Generate unique name with copy suffix
                let newName = `${baseName} (copy)${extension}`;
                let counter = 1;

                // Find a unique name
                while (await this.exists(`${destFolder}/${newName}`)) {
                    counter++;
                    newName = `${baseName} (copy ${counter})${extension}`;
                }

                // Update destination path with new name
                destPath = `${destFolder}/${newName}`;
                console.log(`Generated unique destination path: ${destPath}`);
            }

            if (sourceItem.type === 'file') {
                // For files, just copy the content directly with the updated path
                await this.createFile(destPath, sourceItem.content, false);
            } else {
                // For folders, first create the destination folder
                await this.createDirectory(destPath);

                // Then manually get all children
                const transaction = this.db.transaction(['files'], 'readonly');
                const store = transaction.objectStore('files');
                const index = store.index('parentPath');

                // Get all children with this parent path
                const children = await new Promise(resolve => {
                    index.getAll(sourcePath).onsuccess = e => resolve(e.target.result || []);
                });

                console.log(`Found ${children.length} children to copy from ${sourcePath}`);

                // Recursively copy all children
                for (const child of children) {
                    const childDestPath = destPath + child.path.substring(sourcePath.length);
                    await this.copyItem(child.path, childDestPath);
                }
            }

            return true;
        } catch (error) {
            console.error(`Error copying ${sourcePath} to ${destPath}:`, error);
            throw error;
        }
    }

    /**
     * Move an item to a new location
     * @param {string} sourcePath - Source path
     * @param {string} destPath - Destination path
     */
    async moveItem(sourcePath, destPath) {
        try {
            const sourceItem = await this.getFile(sourcePath);
            if (!sourceItem) throw new Error(`Source item not found: ${sourcePath}`);

            // Calculate new parent path for the destination
            const destParentPath = destPath.substring(0, destPath.lastIndexOf('/'));
            const destName = destPath.split('/').pop();

            // Create a copy of the item with the new path information
            const updatedItem = {
                ...sourceItem,
                name: destName,
                path: destPath,
                parentPath: destParentPath,
                modified: Date.now()
            };

            // First, add the new item
            const transaction = this.db.transaction(['files'], 'readwrite');
            const store = transaction.objectStore('files');

            await new Promise((resolve, reject) => {
                const request = store.add(updatedItem);
                request.onsuccess = resolve;
                request.onerror = (e) => reject(e.target.error);
            });

            // For folders, need to recursively update all children
            if (sourceItem.type === 'folder') {
                await this.updateChildPaths(store, sourcePath, destPath);
            }

            // Delete the original item
            await new Promise((resolve, reject) => {
                const request = store.delete(sourcePath);
                request.onsuccess = resolve;
                request.onerror = (e) => reject(e.target.error);
            });

            return true;
        } catch (error) {
            console.error(`Error moving ${sourcePath} to ${destPath}:`, error);
            throw error;
        }
    }

    /**
     * Create a duplicate of an item with a copy suffix
     * @param {string} sourcePath - The path of the item to duplicate
     * @param {string} destFolderPath - The folder to create the copy in
     */
    async duplicateItem(sourcePath, destFolderPath) {
        try {
            const sourceItem = await this.getFile(sourcePath);
            if (!sourceItem) throw new Error(`Source item not found: ${sourcePath}`);

            // Generate a unique name for the duplicate
            let baseName = sourceItem.name;
            let extension = '';

            // Extract extension for files
            if (sourceItem.type === 'file' && baseName.includes('.')) {
                const parts = baseName.split('.');
                extension = '.' + parts.pop();
                baseName = parts.join('.');
            }

            // Generate a new name with copy suffix
            let newName = `${baseName} - Copy${extension}`;
            let counter = 1;

            // Check if the name already exists and create a unique one if needed
            while (await this.checkNameClash(destFolderPath, newName)) {
                counter++;
                newName = `${baseName} - Copy (${counter})${extension}`;
            }

            // Create the destination path
            const destPath = `${destFolderPath}/${newName}`;

            // Use the copyItem method to duplicate
            await this.copyItem(sourcePath, destPath);

            return destPath;
        } catch (error) {
            console.error(`Error duplicating ${sourcePath}:`, error);
            throw error;
        }
    }

    /**
     * Reset the entire filesystem database (use with caution)
     * @returns {Promise<boolean>} Success indicator
     */
    async resetDatabase(promptUser = true) {
        if (promptUser && !confirm('WARNING: This will delete ALL files and folders. This action cannot be undone. Continue?')) {
            return false;
        }

        this.isInitializing = true; // Block UI actions

        try {
            // Delete the old database
            if (this.db) {
                this.db.close();
                this.db = null;
            }
            // Delete IndexedDB
            await new Promise((resolve, reject) => {
                const req = indexedDB.deleteDatabase(this.dbName);
                req.onsuccess = resolve;
                req.onerror = reject;
                req.onblocked = resolve;
            });

            // Re-initialize DB and create root folder
            await this.initializeDB();
            // Check if root exists, if not, create it
            const rootExists = await this.exists('/');
            if (!rootExists) {
                await this.createDirectory('/');
            }
            this.currentPath = '/';
            await this.navigateTo('/');
            this.showNotification("File system has been reset", "info");
            return true;
        } catch (error) {
            this.showNotification('Error resetting file system', 'error');
            return false;
        } finally {
            this.isInitializing = false; // Allow UI actions again
        }
    }

    /**
     * Refresh file list
     */
    async refreshFiles() {
        // Clear current content first
        this.content.innerHTML = '';
        this.items = [];
        this.selectedItems.clear();

        // Reload content for current path
        await this.loadContent(this.currentPath);

        // Update breadcrumb navigation
        this.updateBreadcrumb();

        // Refresh the directory tree
        if (this.directoryTree) {
            await this.directoryTree.refresh();
        }
    }

    async promptDialog(title, message, defaultValue = '') {
        return new Promise(resolve => {
            const dialog = document.createElement('div');
            dialog.className = 'fb-dialog';
            dialog.innerHTML = `
                <div class="fb-dialog-content">
                    <h3>${title}</h3>
                    <p>${message}</p>
                    <input type="text" value="${defaultValue}">
                    <div class="fb-dialog-buttons">
                        <button class="fb-button cancel">Cancel</button>
                        <button class="fb-button ok">OK</button>
                    </div>
                </div>
            `;

            document.body.appendChild(dialog);

            const input = dialog.querySelector('input');
            const cancelBtn = dialog.querySelector('.fb-button.cancel');
            const okBtn = dialog.querySelector('.fb-button.ok');

            // Handle Enter key
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    handleOk();
                } else if (e.key === 'Escape') {
                    handleCancel();
                }
            });

            function handleCancel() {
                dialog.remove();
                resolve(null);
            }

            function handleOk() {
                const value = input.value.trim();
                if (value) {
                    dialog.remove();
                    resolve(value);
                }
            }

            cancelBtn.onclick = handleCancel;
            okBtn.onclick = handleOk;

            // Set focus after a slight delay to ensure the dialog is visible
            setTimeout(() => input.focus(), 50);
        });
    }

    async navigateTo(path) {
        // Normalize path consistently
        path = this.normalizePath(path);
        console.log(`Navigating to: ${path}`);

        // Update current path
        this.currentPath = path;

        // Clear selection
        this.selectedItems.clear();

        // Load content with the normalized path
        await this.loadContent(path);

        // Update UI
        this.updateBreadcrumb();

        // Update tree selection
        if (this.directoryTree) {
            this.directoryTree.container.querySelectorAll('.tree-item').forEach(item => {
                item.classList.toggle('selected', item.dataset.path === path);
            });
        }
    }

    setupModuleDropTarget() {
        // This is a stub - FileBrowser doesn't need to handle module dropping
        // The actual functionality is implemented in the Inspector class
        console.log('Module drop target functionality is handled by Inspector');
    }

    /**
     * Get all items with the specified parent path
     * @param {IDBIndex} index - The parentPath index
     * @param {string} path - The parent path to look for
     * @returns {Promise<Array>} - Array of items with matching parent path
     */
    getAllItems(index, path) {
        path = this.normalizePath(path);

        return new Promise((resolve) => {
            const request = index.getAll(path);
            request.onsuccess = () => {
                console.log(`Found ${request.result.length} items with parent path ${path}`);
                resolve(request.result);
            };
            request.onerror = (e) => {
                console.error(`Error getting items for ${path}:`, e.target.error);
                resolve([]);
            };
        });
    }

    /**
     * Clean up the database by removing duplicate entries and orphaned files
     */
    async cleanupDatabase() {
        if (!this.db) return;

        try {
            console.log("Starting database cleanup...");

            // Get all items
            const transaction = this.db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');

            const allItems = await new Promise(resolve => {
                store.getAll().onsuccess = e => resolve(e.target.result);
            });

            console.log(`Found ${allItems.length} total items in database`);

            // Find duplicates (items with same path)
            const pathMap = new Map();
            const duplicates = [];

            allItems.forEach(item => {
                if (pathMap.has(item.path)) {
                    duplicates.push(item);
                } else {
                    pathMap.set(item.path, item);
                }
            });

            // Find orphans (items whose parent doesn't exist)
            const orphans = allItems.filter(item => {
                // Skip root items
                if (item.parentPath === '/' || item.parentPath === null) return false;

                // Check if parent exists
                return !pathMap.has(item.parentPath);
            });

            console.log(`Found ${duplicates.length} duplicates and ${orphans.length} orphans`);

            // Remove duplicates and orphans if they exist
            if (duplicates.length > 0 || orphans.length > 0) {
                const writeTransaction = this.db.transaction(['files'], 'readwrite');
                const writeStore = writeTransaction.objectStore('files');

                const itemsToDelete = [...duplicates, ...orphans];

                for (const item of itemsToDelete) {
                    await new Promise(resolve => {
                        writeStore.delete(item.path).onsuccess = resolve;
                    });
                }

                await new Promise(resolve => {
                    writeTransaction.oncomplete = resolve;
                });

                console.log(`Removed ${itemsToDelete.length} problematic items`);
                this.showNotification(`Database cleanup complete: Removed ${itemsToDelete.length} items`, 'info');

                // Refresh the file browser
                await this.refreshFiles();
            } else {
                console.log("No issues found in database");
                this.showNotification("Database appears to be clean", 'info');
            }
        } catch (error) {
            console.error("Error during database cleanup:", error);
            this.showNotification("Error during database cleanup", 'error');
        }
    }

    updateBreadcrumb() {
        // Always start with root
        let html = '<span class="fb-crumb" data-path="/">Root</span>';

        if (this.currentPath === '/') {
            this.breadcrumb.innerHTML = html;
            return;
        }

        // Split path into parts, ignoring empty strings
        const parts = this.currentPath.split('/').filter(Boolean);
        let currentPath = '';

        // Build breadcrumb trail
        parts.forEach(part => {
            currentPath += '/' + part;
            html += `<span class="fb-crumb-separator">/</span>
                    <span class="fb-crumb" data-path="${currentPath}">${part}</span>`;
        });

        this.breadcrumb.innerHTML = html;
    }

    handleMouseDown(e) {
        if (e.button === 0) { // Left click// Use the adjusted mouse position
            const screenPos = this.getAdjustedMousePosition(e);
            const worldPos = this.screenToWorldPosition(screenPos);

            // Check for prefab drop from file browser
            if (e.dataTransfer && e.dataTransfer.getData('application/prefab-file')) {
                const prefabPath = e.dataTransfer.getData('application/prefab-file');
                this.instantiatePrefabAtPosition(prefabPath, worldPos);
                return;
            }

            // First check if we're interacting with the viewport
            if (this.isOnViewportMoveHandle(worldPos)) {
                this.viewportInteraction.dragging = true;
                this.viewportInteraction.startPos = worldPos.clone();
                this.viewportInteraction.initialViewport = {
                    x: this.activeScene.settings.viewportX || 0,
                    y: this.activeScene.settings.viewportY || 0
                };

                // Add global document event listeners for smoother dragging
                document.addEventListener('mousemove', this.handleDocumentMouseMove);
                document.addEventListener('mouseup', this.handleDocumentMouseUp);

                return;
            }

        }
    }

    /**
     * Instantiate a prefab at the specified world position
     * @param {string} prefabPath - Path to the prefab file
     * @param {Vector2} worldPos - World position to instantiate at
     */
    async instantiatePrefabAtPosition(prefabPath, worldPos) {
        try {
            if (!this.fileBrowser) {
                console.error('File browser not available');
                return;
            }

            // Read prefab file
            const content = await this.fileBrowser.readFile(prefabPath);
            if (!content) {
                console.error('Could not read prefab file:', prefabPath);
                return;
            }

            const prefabData = JSON.parse(content);

            // Use hierarchy's prefab manager to instantiate
            if (this.hierarchy && this.hierarchy.prefabManager) {
                const instantiated = this.hierarchy.prefabManager.instantiatePrefab(prefabData, worldPos);

                // Refresh hierarchy and select the new object
                this.hierarchy.refreshHierarchy();
                this.hierarchy.selectGameObject(instantiated);
                this.refreshCanvas();

                // Mark scene as dirty
                this.activeScene.markDirty();

                // Trigger auto-save if available
                //if (window.autoSaveManager) {
                //window.autoSaveManager.autoSave();
                // }
            }

        } catch (error) {
            console.error('Error instantiating prefab:', error);
        }
    }

    // TOUCH METHODS
    handleTouchStart(e) {
        const touch = e.touches[0];
        const item = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.fb-item');
        if (!item) return;

        this.selectItem(item, true);
    }

    handleTouchMove(e) {
        // Prevent default scrolling behavior during touch interactions
        e.preventDefault();
    }

    handleTouchEnd(e) {
        const touch = e.changedTouches[0];
        const item = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.fb-item');
        if (item && this.selectedItems.has(item)) {
            // Handle double-tap to open files or folders
            const now = Date.now();
            if (this.lastTouchItem === item && now - this.lastTouchTime < 300) {
                if (item.dataset.type === 'folder') {
                    this.navigateTo(item.dataset.path);
                } else {
                    this.openFile(item.dataset.path);
                }
            }
            this.lastTouchItem = item;
            this.lastTouchTime = now;
        }
    }

    handleTreePanelTouchStart(e) {
        const touch = e.touches[0];
        this.isResizing = true;
        this.startX = touch.clientX;
        this.startWidth = this.treePanel.offsetWidth;
        document.body.style.cursor = 'col-resize';
        e.preventDefault();
    }

    handleTreePanelTouchMove(e) {
        if (!this.isResizing) return;

        const touch = e.touches[0];
        const containerWidth = this.splitContainer.offsetWidth;
        const newWidth = this.startWidth + (touch.clientX - this.startX);

        // Limit width to a reasonable range (10% to 50% of container)
        const minWidth = containerWidth * 0.1;
        const maxWidth = containerWidth * 0.5;
        const clampedWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));

        this.treePanel.style.width = `${clampedWidth}px`;
        e.preventDefault();
    }

    handleTreePanelTouchEnd(e) {
        if (this.isResizing) {
            this.isResizing = false;
            document.body.style.cursor = '';
        }
    }
}
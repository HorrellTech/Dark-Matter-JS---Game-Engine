class FileBrowser {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentPath = '';
        this.items = [];
        this.selectedItems = new Set();
        this.dbName = 'FileSystemDB';
        this.dbVersion = 1;
        this.initializeUI();
        this.initializeDB();
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
            <button class="fb-button" id="fbNewScript" title="New Script"><i class="fas fa-file-code"></i></button>
            <button class="fb-button" id="fbUploadFile" title="Upload File"><i class="fas fa-file-upload"></i></button>
            <button class="fb-button" id="fbDeleteItem" title="Delete"><i class="fas fa-trash"></i></button>
        `;

        this.breadcrumb = document.createElement('div');
        this.breadcrumb.className = 'fb-breadcrumb';
        this.toolbar.appendChild(this.breadcrumb);

        // Create content area with proper scrolling
        this.content = document.createElement('div');
        this.content.className = 'file-browser-content';
        this.content.style.overflowY = 'auto';
        this.content.style.flexGrow = '1';

        // Add to container
        this.fbContainer.appendChild(this.toolbar);
        this.fbContainer.appendChild(this.content);
        this.container.appendChild(this.fbContainer);

        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Toolbar button events
        document.getElementById('fbNewFolder').addEventListener('click', () => this.promptNewFolder());
        document.getElementById('fbNewScript').addEventListener('click', () => this.promptNewScript());
        document.getElementById('fbUploadFile').addEventListener('click', () => this.uploadFile());
        document.getElementById('fbDeleteItem').addEventListener('click', () => this.deleteSelected());

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

        // Drag and drop between folders
        this.content.addEventListener('dragstart', (e) => {
            const item = e.target.closest('.fb-item');
            if (!item) return;
            
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
            e.dataTransfer.effectAllowed = 'move';
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
    }

    showContextMenu(e, item) {
        // Remove any existing context menus first
        document.querySelectorAll('.fb-context-menu').forEach(menu => menu.remove());
    
        const menu = document.createElement('div');
        menu.className = 'fb-context-menu';
        
        const menuItems = [];
        
        // Add item-specific actions
        if (item) {
            if (item.dataset.type === 'folder') {
                menuItems.push(
                    { label: 'Open', action: () => this.navigateTo(item.dataset.path) },
                    { label: 'Rename', action: () => this.promptRename(item) }
                );
            } else if (item.dataset.type === 'file') {
                const isScript = item.dataset.name.endsWith('.js');
                
                menuItems.push(
                    { label: isScript ? 'Edit Script' : 'Open', action: () => this.openFile(item.dataset.path) },
                    { label: 'Rename', action: () => this.promptRename(item) }
                );
            }
            
            menuItems.push({ label: 'Delete', action: () => this.deleteSelected() });
            menuItems.push({ label: '──────────', disabled: true });
        }
        
        // Add general actions
        menuItems.push(
            { label: 'New Folder', action: () => this.promptNewFolder() },
            { label: 'New Script', action: () => this.promptNewScript() },
            { label: 'Upload File', action: () => this.uploadFile() }
        );
        
        // Render menu items
        menu.innerHTML = menuItems.map(item => 
            `<div class="fb-menu-item${item.disabled ? ' disabled' : ''}">${item.label}</div>`
        ).join('');
        
        // First add menu to the DOM (invisible) so we can measure its height
        menu.style.visibility = 'hidden';
        document.body.appendChild(menu);
        
        // Calculate position considering menu height and footer position
        const menuHeight = menu.offsetHeight;
        const footerTop = document.querySelector('.footer').getBoundingClientRect().top;
        const availableHeight = footerTop - 10; // 10px buffer
        
        // Position menu horizontally
        let leftPos = e.pageX;
        const rightEdge = leftPos + menu.offsetWidth;
        if (rightEdge > window.innerWidth) {
            leftPos = window.innerWidth - menu.offsetWidth - 5;
        }
        menu.style.left = `${leftPos}px`;
        
        // Position menu vertically
        let topPos = e.pageY;
        if (topPos + menuHeight > availableHeight) {
            // Position menu above the click point if it would otherwise go below the footer
            topPos = Math.max(e.pageY - menuHeight, 10);
        }
        menu.style.top = `${topPos}px`;
        
        // Make menu visible
        menu.style.visibility = 'visible';
        
        // Setup click handlers
        const menuElements = menu.querySelectorAll('.fb-menu-item:not(.disabled)');
        menuElements.forEach((element, index) => {
            const action = menuItems[index].action;
            if (action) {
                element.addEventListener('click', action);
            }
        });
        
        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);
    }

    async promptNewFolder() {
        const name = await this.promptDialog('New Folder', 'Enter folder name:');
        if (name) {
            this.createDirectory(`${this.currentPath}/${name}`);
        }
    }
    
    async promptNewScript() {
        const name = await this.promptDialog('New Script', 'Enter script name:');
        if (!name) return; // User cancelled
        
        try {
            const fileName = name.endsWith('.js') ? name : `${name}.js`;
            const className = name.replace(/\.js$/, '');
            
            // Generate template code for the new module
            const templateCode = this.generateModuleTemplate(className);
            
            // Explicitly create a file, not a directory
            await this.createFile(`${this.currentPath}/${fileName}`, templateCode);
        } catch (error) {
            console.error('Failed to create script:', error);
        }
    }

    generateModuleTemplate(className) {
        // Convert to PascalCase if it's not already
        const pascalCaseName = className.charAt(0).toUpperCase() + className.slice(1);
        
        return `/**
* ${pascalCaseName} - Custom module for Dark Matter JS
* 
* Description: Replace this with a description of what your module does
* 
* @extends Module
*/

class ${pascalCaseName} extends Module {
    /**
     * Create a new ${pascalCaseName}
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        // Call the parent constructor with the module name
        super("${pascalCaseName}");
        
        // Initialize your module properties here. eg. 'this.exampleProperty = options.exampleProperty || "default value";'

        
        // Store serializable properties. eg 'this.setProperty("exampleProperty", this.exampleProperty);'
    }

    /**
     * Called before the game starts, used for loading assets
     * @returns {Promise<void>}
     */
    async preload() {
        // Load any resources your module needs before the game starts
        // Example: await this.loadImage("path/to/image.png");

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
        // Add your per-frame logic here
        // Example: Move the object
        // const position = this.getLocalPosition();
        // this.setLocalPosition(new Vector2(position.x + 1 * deltaTime, position.y));
        
    }

    /**
     * Called when the module should render
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
     */
    draw(ctx) {
        // Add custom rendering logic here
        // Example: Draw a circle
        // ctx.fillStyle = 'red';
        // ctx.beginPath();
        // ctx.arc(0, 0, 10, 0, Math.PI * 2);
        // ctx.fill();

    }

    /**
     * Called when the module is being destroyed
     * Use this to clean up resources
     */
    onDestroy() {
        // Clean up any resources or event listeners
        console.log(\`${pascalCaseName} module destroyed on \${this.gameObject?.name}\`);
        
    }

    /**
     * Custom method example - add your own methods here
     * @param {string} message - Example parameter
     */
    exampleMethod(message) {
        console.log(\`${pascalCaseName}: \${message}\`);
    }

    /**
     * Override to handle serialization from JSON
     * @param {Object} json - The JSON data to restore from
     */
    fromJSON(json) {
        super.fromJSON(json);
        
        // Restore properties from serialized data
        this.exampleProperty = this.getProperty("exampleProperty", "default value");
    }
}

// Register the module with the engine (if you have a module registry system)
// ModuleRegistry.register("${pascalCaseName}", ${pascalCaseName});

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
        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target.result;
            this.createFile(`${this.currentPath}/${file.name}`, content);
        };
        reader.readAsText(file);
    }

    async handleFileDrop(files) {
        Array.from(files).forEach(file => {
            this.handleFileUpload(file);
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

    async createDirectory(path) {
        if (!path || path === '/') {
            console.error('Invalid directory path');
            return false;
        }
        
        const name = path.split('/').pop();
        const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
        
        const newFolder = {
            name,
            path,
            parentPath,
            type: 'folder',
            created: Date.now()
        };
    
        const transaction = this.db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');
        
        try {
            // Check if path already exists
            const existing = await new Promise(resolve => {
                store.get(path).onsuccess = e => resolve(e.target.result);
            });
            
            if (existing) {
                console.error('Directory already exists:', path);
                return false;
            }
            
            await new Promise((resolve, reject) => {
                const request = store.add(newFolder);
                request.onsuccess = () => resolve();
                request.onerror = (e) => reject(e.target.error);
            });
            
            await this.loadContent(this.currentPath);
            return true;
        } catch (error) {
            console.error('Failed to create folder:', error);
            return false;
        }
    }
    
    async createFile(path, content, overwrite = false) {
        if (!path || path === '/') {
            console.error('Invalid file path');
            return false;
        }
        
        const name = path.split('/').pop();
        const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
        
        const transaction = this.db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');
        
        try {
            // Check if path exists
            const existingFile = await new Promise(resolve => {
                store.get(path).onsuccess = e => resolve(e.target.result);
            });
            
            if (existingFile && !overwrite) {
                throw new Error('File already exists');
            }
            
            const newFile = {
                name,
                path,
                parentPath,
                type: 'file',  // Ensure this is always 'file' not 'folder'
                content,
                created: existingFile ? existingFile.created : Date.now(),
                modified: Date.now()
            };
    
            await new Promise((resolve, reject) => {
                const request = existingFile ? 
                    store.put(newFile) : 
                    store.add(newFile);
                    
                request.onsuccess = () => resolve();
                request.onerror = (e) => reject(e.target.error);
            });
            
            // Only reload content if we're not overwriting
            // This prevents the editor from closing when saving
            if (!overwrite) {
                await this.loadContent(this.currentPath);
            }
            
            return true;
        } catch (error) {
            console.error('Failed to create/update file:', error);
            return false;
        }
    }

    async deleteSelected() {
        if (this.selectedItems.size === 0) return;
        
        if (!confirm(`Delete ${this.selectedItems.size} item(s)?`)) return;

        try {
            const promises = Array.from(this.selectedItems).map(item => 
                this.deleteItem(item.dataset.path)
            );
            
            await Promise.all(promises);
            await this.loadContent(this.currentPath);
        } catch (error) {
            console.error('Failed to delete items:', error);
        }
    }

    async deleteItem(path) {
        const transaction = this.db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');
        
        try {
            // Recursively delete if it's a folder
            const index = store.index('parentPath');
            const items = await this.getAllItems(index, path);
            for (const item of items) {
                await this.deleteItem(item.path);
            }
            
            // Use a Promise to ensure deletion completes before continuing
            await new Promise((resolve, reject) => {
                const request = store.delete(path);
                request.onsuccess = () => resolve();
                request.onerror = (e) => reject(e.target.error);
            });
            
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
            
            // If folder, update all child paths
            if (item.type === 'folder') {
                await this.updateChildPaths(store, path, newPath);
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

    async loadContent(path) {
        this.content.innerHTML = '';
        if (!this.db) return;
        
        const transaction = this.db.transaction(['files'], 'readonly');
        const store = transaction.objectStore('files');
        const index = store.index('parentPath');
        
        try {
            const items = await new Promise((resolve) => {
                index.getAll(path).onsuccess = (e) => resolve(e.target.result);
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
            
        } catch (error) {
            console.error('Failed to load content:', error);
        }
    }

    renderItem(item) {
        const element = document.createElement('div');
        element.className = 'fb-item';
        element.draggable = true;
        element.dataset.path = item.path;
        element.dataset.type = item.type;
        element.dataset.name = item.name;
        
        let icon = 'fa-file';
        
        if (item.type === 'folder') {
            icon = 'fa-folder';
        } else if (item.name.endsWith('.js')) {
            icon = 'fa-file-code';
        } else if (item.name.endsWith('.json')) {
            icon = 'fa-file-code';
        } else if (item.name.match(/\.(png|jpg|jpeg|gif|svg)$/i)) {
            icon = 'fa-file-image';
        } else if (item.name.match(/\.(mp3|wav|ogg)$/i)) {
            icon = 'fa-file-audio';
        }
        
        element.innerHTML = `
            <i class="fas ${icon}"></i>
            <span class="fb-item-name" title="${item.name}">${item.name}</span>
        `;
    
        this.content.appendChild(element);
        this.items.push({ ...item, element });
    }

    openFile(path) {
        // Get the file content from IndexedDB
        const transaction = this.db.transaction(['files'], 'readonly');
        const store = transaction.objectStore('files');
        
        store.get(path).onsuccess = (e) => {
            const file = e.target.result;
            if (file) {
                // Check if it's a text-based file we can edit
                if (this.isEditableFile(file.name)) {
                    // Initialize the script editor if not already done
                    if (!window.scriptEditor) {
                        window.scriptEditor = new ScriptEditor();
                    }
                    
                    // Open the file in the editor
                    window.scriptEditor.loadFile(path, file.content);
                } else {
                    // For non-text files, just log for now
                    console.log(`Opening file: ${path}`);
                    // Here you could implement preview for images, etc.
                }
            }
        };
    }

    isEditableFile(filename) {
        const textExtensions = ['.js', '.json', '.txt', '.html', '.css', '.md'];
        return textExtensions.some(ext => filename.toLowerCase().endsWith(ext));
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
        this.currentPath = path;
        this.selectedItems.clear();
        await this.loadContent(path);
        this.updateBreadcrumb();
    }

    getAllItems(index, path) {
        return new Promise((resolve) => {
            const request = index.getAll(path);
            request.onsuccess = () => resolve(request.result);
        });
    }

    updateBreadcrumb() {
        const parts = this.currentPath.split('/').filter(Boolean);
        let html = '<span class="fb-crumb" data-path="">Root</span>';
        let currentPath = '';
        
        parts.forEach(part => {
            currentPath += '/' + part;
            html += `<span class="fb-crumb-separator">/</span>
                    <span class="fb-crumb" data-path="${currentPath}">${part}</span>`;
        });
        
        this.breadcrumb.innerHTML = html;
    }
}
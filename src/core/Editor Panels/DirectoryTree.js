/**
 * Directory Tree component that shows folders in a hierarchical structure
 * Works alongside FileBrowser to provide navigation
 */
class DirectoryTree {
    constructor(fileBrowser) {
        this.fileBrowser = fileBrowser;
        this.container = null;
        this.treeRoot = null;
        this.expandedPaths = new Set(['/']); // Root is expanded by default
        this.initialized = false;
        
        this.init();
    }
    
    init() {
        // Create container
        this.container = document.createElement('div');
        this.container.className = 'directory-tree';
        
        // Create tree root
        this.treeRoot = document.createElement('div');
        this.treeRoot.className = 'tree-root';
        this.container.appendChild(this.treeRoot);
        
        // Set up basic event handlers
        this.container.addEventListener('click', this.handleClick.bind(this));
        
        // Set up context menu and drag/drop support
        this.setupEventListeners();
        
        // Show loading state initially
        this.showLoadingState();
    }

    /**
     * Add support for context menu in the directory tree
     */
    setupEventListeners() {
        // Add context menu handler
        this.container.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            const treeItem = e.target.closest('.tree-item');
            if (!treeItem) {
                // Show the default (background) context menu
                this.fileBrowser.showContextMenu(e);
                return;
            }
            
            // Create a synthetic item object for the folder with required properties
            const folderItem = {
                dataset: {
                    path: treeItem.dataset.path,
                    type: 'folder',
                    name: treeItem.querySelector('.tree-label').textContent
                },
                type: 'folder'
            };
            
            // Pass both the event and the folder item to the FileBrowser's context menu
            this.fileBrowser.showContextMenu(e, folderItem);
        });
        
        // Add drag and drop support
        this.setupDragAndDrop();
    }

    /**
     * Set up drag and drop functionality for the directory tree
     */
    setupDragAndDrop() {
        // Handle dragover events (folders only accept drops)
        this.container.addEventListener('dragover', (e) => {
            e.preventDefault();
            const treeItem = e.target.closest('.tree-item');
            
            // Clear any existing drag-over states
            this.container.querySelectorAll('.drag-over').forEach(el => 
                el.classList.remove('drag-over'));
            
            // Add drag-over styling to the target folder
            if (treeItem) {
                treeItem.classList.add('drag-over');
                e.dataTransfer.dropEffect = 'move';
            }
        });
        
        // Handle dragleave events
        this.container.addEventListener('dragleave', (e) => {
            const treeItem = e.target.closest('.tree-item');
            if (treeItem) {
                treeItem.classList.remove('drag-over');
            }
        });
        
        // Handle drop events
        this.container.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Remove all drag-over states
            this.container.querySelectorAll('.drag-over').forEach(el => 
                el.classList.remove('drag-over'));
            
            const treeItem = e.target.closest('.tree-item');
            if (!treeItem) return;
            
            const targetPath = treeItem.dataset.path;
            
            // Handle dropped files
            if (e.dataTransfer.files.length > 0) {
                // Upload files to the target directory
                Array.from(e.dataTransfer.files).forEach(file => {
                    // Save the current path
                    const currentPath = this.fileBrowser.currentPath;
                    
                    // Temporarily change path to target directory
                    this.fileBrowser.currentPath = targetPath;
                    
                    // Upload the file to the target directory
                    this.fileBrowser.handleFileUpload(file).then(() => {
                        // Restore original path after upload
                        this.fileBrowser.currentPath = currentPath;
                        
                        // Refresh the directory view if it's expanded
                        if (this.expandedPaths.has(targetPath)) {
                            this.refreshFolder(targetPath);
                        }
                    });
                });
                return;
            }
            
            // Handle internal drag-drop
            try {
                const itemsJson = e.dataTransfer.getData('application/json');
                if (itemsJson) {
                    const items = JSON.parse(itemsJson);
                    this.fileBrowser.moveItems(items, targetPath).then(() => {
                        // Refresh the directory tree after the move
                        this.refreshFolder(targetPath);
                    });
                }
            } catch (err) {
                console.error('Error processing drag data in tree:', err);
            }
        });
    }
    
    /**
     * Show a loading state in the tree
     */
    showLoadingState() {
        const loadingItem = document.createElement('div');
        loadingItem.className = 'tree-loading';
        loadingItem.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        loadingItem.style.padding = '10px';
        loadingItem.style.color = '#aaa';
        loadingItem.style.fontStyle = 'italic';
        loadingItem.style.fontSize = '12px';
        loadingItem.style.textAlign = 'center';
        
        this.treeRoot.innerHTML = '';
        this.treeRoot.appendChild(loadingItem);
    }
    
    /**
     * Initialize the tree structure
     * Call this after the FileBrowser's database is ready
     */
    async initialize() {
        if (this.initialized) return;
        if (!this.fileBrowser.db) {
            console.warn('FileBrowser database not ready. Tree initialization delayed.');
            setTimeout(() => this.initialize(), 500);
            return;
        }
        
        try {
            await this.refresh();
            this.initialized = true;
        } catch (error) {
            console.error('Error initializing directory tree:', error);
            
            // Show error state
            this.treeRoot.innerHTML = '';
            const errorItem = document.createElement('div');
            errorItem.className = 'tree-error';
            errorItem.innerHTML = '<i class="fas fa-exclamation-circle"></i> Failed to load directory tree';
            errorItem.style.padding = '10px';
            errorItem.style.color = '#ff6b6b';
            errorItem.style.fontSize = '12px';
            errorItem.style.textAlign = 'center';
            this.treeRoot.appendChild(errorItem);
            
            // Add a retry button
            const retryBtn = document.createElement('button');
            retryBtn.innerText = 'Retry';
            retryBtn.style.marginTop = '8px';
            retryBtn.style.padding = '4px 8px';
            retryBtn.style.background = '#333';
            retryBtn.style.border = '1px solid #555';
            retryBtn.style.borderRadius = '3px';
            retryBtn.style.color = '#fff';
            retryBtn.style.cursor = 'pointer';
            retryBtn.onclick = () => this.initialize();
            errorItem.appendChild(retryBtn);
        }
    }
    
    async refresh() {
        this.treeRoot.innerHTML = ''; // Clear existing tree
        
        if (!this.fileBrowser.db) {
            this.showLoadingState();
            return;
        }
        
        try {
            // Start by adding root
            const rootItem = await this.createTreeItem('/', 'Root', null, true);
            this.treeRoot.appendChild(rootItem);
            
            // If root is expanded, load its children
            if (this.expandedPaths.has('/')) {
                await this.loadChildren('/', rootItem);
            }
        } catch (error) {
            console.error('Error refreshing directory tree:', error);
        }
    }
    
    async createTreeItem(path, name, parentPath, isRoot = false) {
        const item = document.createElement('div');
        item.className = 'tree-item';
        item.dataset.path = path;
        item.dataset.type = 'folder'; // All tree items are folders
        item.dataset.name = isRoot ? 'Root' : name;
        
        // Make the tree item folder a valid drop target
        if (!isRoot) {
            // Root shouldn't be draggable
            item.draggable = false; // Tree items are not draggable, only act as drop targets
        }
        
        const isExpanded = this.expandedPaths.has(path);
        const hasChildren = await this.hasChildren(path);
        
        let iconClass = 'fa-folder';
        if (isExpanded) {
            iconClass = 'fa-folder-open';
            item.classList.add('expanded');
        }
        
        // Highlight if this is the current path in file browser
        if (path === this.fileBrowser.currentPath) {
            item.classList.add('selected');
        }
        
        // Create content wrapper with proper structure
        const itemContent = document.createElement('div');
        itemContent.className = 'tree-item-content';
        
        // Add indentation based on depth for proper cascading look
        if (!isRoot) {
            const depth = path.split('/').filter(Boolean).length;
            itemContent.style.paddingLeft = `${depth * 16}px`;
        } else {
            item.classList.add('root-item');
        }
        
        // Create expand/collapse toggle if has children
        if (hasChildren) {
            const toggle = document.createElement('span');
            toggle.className = 'tree-toggle';
            toggle.innerHTML = isExpanded ? '▼' : '►';
            itemContent.appendChild(toggle);
        } else {
            // Add spacing if no children for alignment
            const spacer = document.createElement('span');
            spacer.className = 'tree-toggle-spacer';
            spacer.innerHTML = '&nbsp;&nbsp;';
            itemContent.appendChild(spacer);
        }
        
        // Create icon and label
        if (isRoot) {
            // Special styling for root with dashes instead of icon
            /*const rootPrefix = document.createElement('span');
            rootPrefix.className = 'tree-root-prefix';
            rootPrefix.textContent = '-- ';
            rootPrefix.style.color = '#888';
            rootPrefix.style.fontWeight = 'bold';
            itemContent.appendChild(rootPrefix);*/
            // Special root icon instead of folder
            const icon = document.createElement('i');
            // Use a database/storage icon for root
            icon.className = 'fas fa-database';
            // Use a different color for root
            icon.style.color = '#7289da'; // A distinct blue-purple color
            itemContent.appendChild(icon);
        } else {
            // Normal folder icon for non-root items
            const icon = document.createElement('i');
            icon.className = `fas ${iconClass}`;
            icon.style.color = '#ffd700'; // Match folder color from file browser
            itemContent.appendChild(icon);
        }
        
        const label = document.createElement('span');
        label.className = 'tree-label';
        label.textContent = isRoot ? 'Root' : name;
        
        itemContent.appendChild(label);
        
        // Add the content wrapper to the item
        item.appendChild(itemContent);
        
        // Children container (initially empty)
        const children = document.createElement('div');
        children.className = 'tree-children';
        if (!isExpanded) {
            children.style.display = 'none';
        }
        item.appendChild(children);
        
        return item;
    }
    
    async hasChildren(path) {
        if (!this.fileBrowser.db) return false;
        
        try {
            const transaction = this.fileBrowser.db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');
            const index = store.index('parentPath');
            
            // Only look for folders
            const folders = await new Promise(resolve => {
                const request = index.getAll(path);
                request.onsuccess = e => {
                    const results = e.target.result || [];
                    const folderResults = results.filter(item => item.type === 'folder');
                    resolve(folderResults);
                };
                request.onerror = () => resolve([]);
            });
            
            return folders.length > 0;
        } catch (error) {
            console.error(`Error checking if ${path} has children:`, error);
            return false;
        }
    }
    
    async loadChildren(path, parentElement) {
        if (!this.fileBrowser.db) return;
        
        try {
            const childrenContainer = parentElement.querySelector('.tree-children');
            if (!childrenContainer) return;
            
            // Clear existing children
            childrenContainer.innerHTML = '';
            
            // Load folders at this path
            const transaction = this.fileBrowser.db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');
            const index = store.index('parentPath');
            
            const folders = await new Promise(resolve => {
                const request = index.getAll(path);
                request.onsuccess = e => {
                    const results = e.target.result || [];
                    const folderResults = results.filter(item => item.type === 'folder');
                    resolve(folderResults);
                };
                request.onerror = () => resolve([]);
            });
            
            // Sort folders alphabetically
            folders.sort((a, b) => a.name.localeCompare(b.name));
            
            // Show folders or empty state
            if (folders.length === 0) {
                const emptyState = document.createElement('div');
                emptyState.className = 'tree-empty';
                emptyState.innerHTML = '<span style="color: #666; font-style: italic; padding-left: 24px; font-size: 11px;">No folders</span>';
                childrenContainer.appendChild(emptyState);
            } else {
                // Create tree items for each folder
                for (const folder of folders) {
                    const treeItem = await this.createTreeItem(folder.path, folder.name, folder.parentPath);
                    childrenContainer.appendChild(treeItem);
                    
                    // If the folder is expanded, load its children recursively
                    if (this.expandedPaths.has(folder.path)) {
                        await this.loadChildren(folder.path, treeItem);
                    }
                }
            }
            
            // Show or hide children container based on expanded state
            childrenContainer.style.display = this.expandedPaths.has(path) ? 'block' : 'none';
        } catch (error) {
            console.error(`Error loading children for ${path}:`, error);
            
            // Show error state
            const childrenContainer = parentElement.querySelector('.tree-children');
            if (childrenContainer) {
                childrenContainer.innerHTML = '<div class="tree-error" style="color: #ff6b6b; padding-left: 24px; font-size: 11px;"><i class="fas fa-exclamation-circle"></i> Error loading folders</div>';
            }
        }
    }
    
    handleClick(e) {
        const treeItem = e.target.closest('.tree-item');
        if (!treeItem) return;
        
        const path = treeItem.dataset.path;
        
        // If clicking the toggle, expand/collapse
        if (e.target.classList.contains('tree-toggle')) {
            this.toggleExpand(path, treeItem);
            e.stopPropagation();
            return;
        }
        
        // Navigate to the clicked folder
        this.fileBrowser.navigateTo(path);
        
        // Update selected state
        this.container.querySelectorAll('.tree-item').forEach(item => {
            item.classList.remove('selected');
        });
        treeItem.classList.add('selected');
    }    
    
    async toggleExpand(path, treeItem) {
        const childrenContainer = treeItem.querySelector('.tree-children');
        const toggle = treeItem.querySelector('.tree-toggle');
        const icon = treeItem.querySelector('.fas');
        
        if (this.expandedPaths.has(path)) {
            // Collapse
            this.expandedPaths.delete(path);
            treeItem.classList.remove('expanded');
            if (toggle) toggle.innerHTML = '►';
            if (icon) icon.className = 'fas fa-folder';
            if (childrenContainer) childrenContainer.style.display = 'none';
        } else {
            // Expand
            this.expandedPaths.add(path);
            treeItem.classList.add('expanded');
            if (toggle) toggle.innerHTML = '▼';
            if (icon) icon.className = 'fas fa-folder-open';
            if (childrenContainer) childrenContainer.style.display = 'block';
            
            // Load children if container is empty
            if (childrenContainer && !childrenContainer.children.length) {
                // Show loading indicator
                childrenContainer.innerHTML = '<div class="tree-loading" style="color: #999; padding-left: 24px; font-size: 11px;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
                
                await this.loadChildren(path, treeItem);
            }
        }
    }
    
    // Call when a folder is created, deleted, or renamed
    async refreshFolder(path) {
        // Find the parent path
        const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
        
        // Find the parent item in the tree
        const parentItem = this.container.querySelector(`.tree-item[data-path="${parentPath}"]`);
        if (parentItem && this.expandedPaths.has(parentPath)) {
            await this.loadChildren(parentPath, parentItem);
        }
        
        // If this was a completely new top-level folder, refresh everything
        if (parentPath === '/' && !parentItem) {
            await this.refresh();
        }
    }
}
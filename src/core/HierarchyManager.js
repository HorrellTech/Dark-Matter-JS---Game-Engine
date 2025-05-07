class HierarchyManager {
    constructor(containerId, editorInstance) {
        this.container = document.getElementById(containerId);
        this.editor = editorInstance;
        this.draggedItem = null;
        this.draggedObject = null;
        this.draggedOver = null;
        this.dropIndicator = null; // Element to show where item will be dropped
        this.selectedObject = null;
        this.initializeUI();
        this.createDropIndicator();
        
        // Listen for panel resize events
        window.addEventListener('panelsResized', () => {
            // Adjust hierarchy list height if needed
            if (this.listContainer) {
                this.listContainer.style.maxHeight = 
                    (this.container.offsetHeight - this.container.querySelector('.hierarchy-toolbar').offsetHeight) + 'px';
            }
        });
    }

    initializeUI() {
        this.container.innerHTML = `
            <div class="hierarchy-toolbar">
                <button class="hierarchy-button" id="addGameObject" title="Add GameObject">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="hierarchy-button" id="removeGameObject" title="Remove GameObject">
                    <i class="fas fa-minus"></i>
                </button>
                <button class="hierarchy-button" id="duplicateGameObject" title="Duplicate GameObject">
                    <i class="fas fa-clone"></i>
                </button>
            </div>
            <div class="hierarchy-list"></div>
        `;
    
        // Add a class to the container to enable flex layout
        this.container.classList.add('hierarchy-container');
        
        this.listContainer = this.container.querySelector('.hierarchy-list');
        
        // Setup toolbar button event listeners
        document.getElementById('addGameObject').addEventListener('click', () => this.addGameObject());
        document.getElementById('removeGameObject').addEventListener('click', () => this.removeSelectedGameObject());
        document.getElementById('duplicateGameObject').addEventListener('click', () => this.duplicateSelectedGameObject());
    
        // Context menu for right-clicks on any part of the hierarchy panel
        this.container.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            // Determine if we're right-clicking on a hierarchy item
            const hierarchyItem = e.target.closest('.hierarchy-item');
            if (hierarchyItem) {
                // Find the game object that corresponds to this hierarchy item
                const gameObjectId = hierarchyItem.dataset.id;
                const clickedObj = this.findGameObjectById(gameObjectId);
                
                if (clickedObj) {
                    // Select the object first
                    this.selectGameObject(clickedObj);
                    
                    // Show object-specific context menu
                    this.showObjectContextMenu(e, clickedObj);
                }
            } else {
                // Show general context menu when right-clicking on empty area
                this.showGeneralContextMenu(e);
            }
        });
        
        // Add drop event handler for the entire list container (for dropping onto root)
        this.setupListContainerDropTarget();
    
        // Create a drop indicator element for showing drop position
        this.createDropIndicator();
        
        // Add event to the whole document to handle dragging
        document.addEventListener('dragover', this.handleDocumentDragOver.bind(this));
        document.addEventListener('dragleave', this.handleDocumentDragLeave.bind(this));
    }
    
    createDropIndicator() {
        // Create a visual indicator for drop position
        this.dropIndicator = document.createElement('div');
        this.dropIndicator.className = 'hierarchy-drop-indicator';
        this.dropIndicator.style.display = 'none';
        document.body.appendChild(this.dropIndicator);
        
        // Set up auto-scrolling during drag
        this.scrollInterval = null;
    }

    setupDragAutoScroll() {
        // Clear any existing scroll interval
        if (this.scrollInterval) {
            clearInterval(this.scrollInterval);
            this.scrollInterval = null;
        }
        
        // Create new scroll interval
        this.scrollInterval = setInterval(() => {
            if (!this.draggedItem) return;
            
            const containerRect = this.listContainer.getBoundingClientRect();
            const mousePos = this.lastMousePos;
            
            if (!mousePos) return;
            
            // Scroll speed (pixels per tick)
            const scrollSpeed = 5;
            const scrollThreshold = 40; // Pixels from edge to start scrolling
            
            // Scroll up when near top
            if (mousePos.y < containerRect.top + scrollThreshold) {
                this.listContainer.scrollTop -= scrollSpeed;
            }
            // Scroll down when near bottom 
            else if (mousePos.y > containerRect.bottom - scrollThreshold) {
                this.listContainer.scrollTop += scrollSpeed;
            }
        }, 16); // ~60fps
    }
    
    setupListContainerDropTarget() {
        // Make the entire list container a drop target for deparenting objects
        this.listContainer.addEventListener('dragover', (e) => {
            // When dragging over the list container
            e.preventDefault();
            e.stopPropagation(); // Stop propagation to prevent conflicts
            
            // Only process if there's a dragged object
            if (!this.draggedObject) return;
            
            const target = e.target;
            
            // If we're directly over the container (not over an item), show root drop zone
            if (target === this.listContainer || !target.closest('.hierarchy-item')) {
                // If mouse is at the top of container, allow dropping as first root item
                const rect = this.listContainer.getBoundingClientRect();
                const mouseY = e.clientY;
                const threshold = 10; // Pixels from the top to consider "top position"
                
                if (mouseY < rect.top + threshold) {
                    // Position for inserting at the top of the root
                    this.showDropIndicator(rect.left, rect.top);
                    this.dragDropTarget = {
                        target: 'root-top',
                        position: 'before'
                    };
                } else {
                    // Position for inserting at the end of the root
                    this.listContainer.classList.add('drag-over-root');
                    this.hideDropIndicator();
                    this.dragDropTarget = {
                        target: 'root',
                        position: 'inside'
                    };
                }
                
                e.dataTransfer.dropEffect = 'move';
            }
        });
        
        this.listContainer.addEventListener('dragleave', (e) => {
            // Only remove highlight if we're actually leaving the container
            if (!this.listContainer.contains(e.relatedTarget)) {
                this.listContainer.classList.remove('drag-over-root');
                this.hideDropIndicator();
            }
        });
        
        this.listContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            this.listContainer.classList.remove('drag-over-root');
            this.hideDropIndicator();
            
            // Get the dragged object
            let draggedObj = this.draggedObject;
            if (!draggedObj) {
                const draggedObjectId = e.dataTransfer.getData('application/game-object-id');
                draggedObj = this.findGameObjectById(draggedObjectId);
            }
            
            if (!draggedObj) return;
            
            // Get the drop target from our stored state
            if (this.dragDropTarget) {
                if (this.dragDropTarget.target === 'root' || 
                    this.dragDropTarget.target === 'root-top') {
                    // Move to root level
                    this.moveToRoot(draggedObj);
                    
                    // If it's root-top, we need to reorder (make it the first item)
                    if (this.dragDropTarget.target === 'root-top') {
                        // Remove and then add at the beginning
                        const index = this.editor.scene.gameObjects.indexOf(draggedObj);
                        if (index !== -1) {
                            this.editor.scene.gameObjects.splice(index, 1);
                            this.editor.scene.gameObjects.unshift(draggedObj);
                        }
                    }
                    
                    this.refreshHierarchy();
                    this.editor.refreshCanvas();
                }
            }
        });
    }
    
    handleDocumentDragOver(e) {
        // Only process if we're dragging a hierarchy item
        if (!this.draggedObject) return;
        
        // Store last mouse position for auto-scrolling
        this.lastMousePos = { x: e.clientX, y: e.clientY };
        
        // Check if we're over the hierarchy panel
        const hierarchyRect = this.container.getBoundingClientRect();
        if (e.clientX < hierarchyRect.left || e.clientX > hierarchyRect.right ||
            e.clientY < hierarchyRect.top || e.clientY > hierarchyRect.bottom) {
            // Outside hierarchy panel
            this.hideDropIndicator();
            this.listContainer.classList.remove('drag-over-root');
            return;
        }
    }
    
    handleDocumentDragLeave(e) {
        // Check if we left to go outside the document
        if (e.clientX <= 0 || e.clientY <= 0 ||
            e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
            this.hideDropIndicator();
        }
    }
    
    showObjectContextMenu(e, gameObject) {
        if (!this.editor) return;
        
        this.editor.showContextMenu(e, [
            { 
                label: 'Rename',
                action: () => this.promptRenameGameObject(gameObject)
            },
            { 
                label: 'Duplicate',
                action: () => this.duplicateSelectedGameObject()
            },
            { 
                label: 'Delete',
                action: () => this.confirmDeleteGameObject(gameObject)
            },
            { label: '──────────', disabled: true },
            { 
                label: 'Add Child GameObject',
                action: () => {
                    // Make sure GameObject class is available
                    if (typeof GameObject !== 'undefined') {
                        const child = new GameObject('New GameObject');
                        gameObject.addChild(child);
                        gameObject.expanded = true; // Ensure parent is expanded
                        this.refreshHierarchy();
                        this.selectGameObject(child);
                        this.editor.refreshCanvas();
                    } else {
                        console.error("GameObject class is not defined");
                    }
                }
            }
        ]);
    }
    
    showGeneralContextMenu(e) {
        if (!this.editor) return;
        
        this.editor.showContextMenu(e, [
            { 
                label: 'Add GameObject',
                action: () => this.addGameObject()
            },
            { 
                label: 'Paste',
                action: () => {/* TODO: Implement clipboard */},
                disabled: true // Disabled until clipboard is implemented
            },
            { label: '──────────', disabled: true },
            { 
                label: 'Collapse All',
                action: () => this.collapseAll()
            },
            { 
                label: 'Expand All',
                action: () => this.expandAll()
            }
        ]);
    }

    /**
     * Collapse all expanded items in hierarchy
     */
    collapseAll() {
        this.traverseGameObjects(this.editor.scene.gameObjects, obj => {
            obj.expanded = false;
        });
        this.refreshHierarchy();
    }

    /**
     * Expand all items in hierarchy
     */
    expandAll() {
        this.traverseGameObjects(this.editor.scene.gameObjects, obj => {
            obj.expanded = true;
        });
        this.refreshHierarchy();
    }

    /**
     * Helper function to traverse all game objects recursively
     */
    traverseGameObjects(objects, callback) {
        if (!objects) return;
        
        objects.forEach(obj => {
            callback(obj);
            if (obj.children && obj.children.length > 0) {
                this.traverseGameObjects(obj.children, callback);
            }
        });
    }

    /**
     * Rebuild the hierarchy UI from the scene objects
     */
    refreshHierarchy() {
        this.listContainer.innerHTML = '';
        if (!this.editor || !this.editor.scene) return;
        
        // Build the hierarchy starting with root objects
        this.editor.scene.gameObjects.forEach(obj => {
            if (!obj.parent) {
                this.createHierarchyItem(obj, this.listContainer);
            }
        });
    }

    /**
     * Create a UI item for a GameObject with its children
     */
    createHierarchyItem(gameObject, parentContainer) {
        const item = document.createElement('div');
        item.className = 'hierarchy-item';
        item.dataset.id = gameObject.id || Math.random().toString(36).substring(2, 10);
        gameObject.id = item.dataset.id; // Ensure GameObject has an ID
        
        const hasChildren = gameObject.children && gameObject.children.length > 0;
        
        // Mark as selected if this is the selected object
        if (this.selectedObject === gameObject) {
            item.classList.add('selected');
        }

        // Mark as active/inactive
        if (!gameObject.active) {
            item.classList.add('inactive');
        }
        
        // Create item content
        item.innerHTML = `
            <div class="hierarchy-item-header">
                <span class="hierarchy-toggle ${hasChildren ? '' : 'hidden'}">
                    <i class="fas ${gameObject.expanded ? 'fa-caret-down' : 'fa-caret-right'}"></i>
                </span>
                <span class="hierarchy-icon">
                    <i class="fas fa-cube" style="color: ${gameObject.editorColor}"></i>
                </span>
                <span class="hierarchy-name" contenteditable="false">${gameObject.name}</span>
                <span class="hierarchy-visibility">
                    <i class="fas ${gameObject.active ? 'fa-eye' : 'fa-eye-slash'}"></i>
                </span>
            </div>
        `;
        
        // Create container for children
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'hierarchy-children';
        childrenContainer.style.display = gameObject.expanded ? 'block' : 'none';
        item.appendChild(childrenContainer);
        
        // Add children if expanded
        if (hasChildren && gameObject.expanded) {
            gameObject.children.forEach(child => {
                this.createHierarchyItem(child, childrenContainer);
            });
        }
        
        // Get the name element for future reference
        const nameElement = item.querySelector('.hierarchy-name');
        
        // Add click event
        item.querySelector('.hierarchy-item-header').addEventListener('click', (e) => {
            // Toggle expand/collapse if clicking the toggle button
            if (e.target.closest('.hierarchy-toggle')) {
                this.toggleExpandGameObject(gameObject);
            } 
            // Toggle visibility if clicking the visibility icon
            else if (e.target.closest('.hierarchy-visibility')) {
                this.toggleGameObjectVisibility(gameObject);
            }
            // If clicking directly on the name, enable editing
            else if (e.target === nameElement) {
                // Only enable editing if the object is already selected
                if (this.selectedObject === gameObject) {
                    this.startNameEditing(nameElement, gameObject);
                } else {
                    // Otherwise just select the object
                    this.selectGameObject(gameObject);
                }
            }
            // Otherwise select the game object
            else {
                this.selectGameObject(gameObject);
            }
            
            e.stopPropagation();
        });
        
        // Add double-click event for renaming (keeping this for backwards compatibility)
        nameElement.addEventListener('dblclick', (e) => {
            this.startNameEditing(nameElement, gameObject);
            e.stopPropagation();
        });
        
        // Setup drag and drop
        this.setupDragAndDrop(item, gameObject);
        
        // Add to parent container
        parentContainer.appendChild(item);
    }

    /**
    * Start inline editing of a GameObject name
    */
    startNameEditing(nameElement, gameObject) {
        // Make the name element editable
        nameElement.contentEditable = "true";
        nameElement.focus();
        
        // Select all text
        document.execCommand('selectAll', false, null);
        
        // Add blur event to save changes
        const saveOnBlur = () => {
            const newName = nameElement.textContent.trim();
            if (newName && newName !== gameObject.name) {
                gameObject.rename(newName);
                
                // Update inspector if this is the selected object
                if (this.selectedObject === gameObject && this.editor.inspector) {
                    this.editor.inspector.inspectObject(gameObject);
                }
            } else {
                // Reset to original name if empty or unchanged
                nameElement.textContent = gameObject.name;
            }
            
            // Make non-editable again
            nameElement.contentEditable = "false";
            nameElement.removeEventListener('blur', saveOnBlur);
            nameElement.removeEventListener('keydown', handleKeys);
        };
        
        // Handle Enter and Escape keys
        const handleKeys = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                nameElement.blur(); // Save by triggering blur
            } else if (e.key === 'Escape') {
                nameElement.textContent = gameObject.name; // Reset to original
                nameElement.blur();
            }
        };
        
        nameElement.addEventListener('blur', saveOnBlur);
        nameElement.addEventListener('keydown', handleKeys);
    }
    
    /**
     * Setup drag and drop for hierarchy items
     */
    setupDragAndDrop(item, gameObject) {
        item.draggable = true;
        
        item.addEventListener('dragstart', (e) => {
            // Prevent event bubbling to parent items
            e.stopPropagation();
            
            // Save references to the dragged elements
            this.draggedItem = item;
            this.draggedObject = gameObject;
    
            // Setup auto-scrolling during drag
            this.setupDragAutoScroll();
            
            // Add visual indicator
            item.classList.add('dragging');
            
            // Set the drag data and allowed effect
            e.dataTransfer.setData('application/game-object-id', gameObject.id);
            e.dataTransfer.effectAllowed = 'move';
            
            // Create a custom ghost image that looks more like the original item
            const ghostElement = item.querySelector('.hierarchy-item-header').cloneNode(true);
            ghostElement.style.width = `${item.offsetWidth}px`;
            ghostElement.style.padding = '4px 8px';
            ghostElement.style.background = '#2a2a2a';
            ghostElement.style.border = '1px solid #555';
            ghostElement.style.borderRadius = '3px';
            ghostElement.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
            document.body.appendChild(ghostElement);
            e.dataTransfer.setDragImage(ghostElement, 20, 10);
            
            // Clean up ghost element after a short delay
            setTimeout(() => {
                document.body.removeChild(ghostElement);
            }, 0);
            
            // Select the object being dragged
            this.selectGameObject(gameObject);
        });

        item.addEventListener('dragend', () => {
            // Clear visual states
            item.classList.remove('dragging');
            
            // Reset drag state
            this.draggedItem = null;
            this.draggedObject = null;
            this.dragDropTarget = null;
            
            // Stop auto-scrolling
            if (this.scrollInterval) {
                clearInterval(this.scrollInterval);
                this.scrollInterval = null;
            }
            
            // Clean up all visual indicators
            document.querySelectorAll('.hierarchy-item.drag-over').forEach(el => {
                el.classList.remove('drag-over');
            });
            this.listContainer.classList.remove('drag-over-root');
            this.hideDropIndicator();
        });
        
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Don't allow dropping onto self or a child
            if (this.draggedObject && this.isChildOf(gameObject, this.draggedObject)) {
                e.dataTransfer.dropEffect = 'none';
                item.classList.remove('drag-over');
                this.hideDropIndicator();
                return;
            }
            
            // Calculate drop position (before, after, or inside)
            const rect = item.getBoundingClientRect();
            const mouseY = e.clientY;
            const mouseYRelative = mouseY - rect.top;
            const height = rect.height;
            
            // Determine drop position based on mouse location
            let dropPosition;
            if (mouseYRelative < height * 0.25) {
                // Top 25% - drop before this item
                dropPosition = 'before';
                this.showDropIndicator(rect.left, rect.top);
            } else if (mouseYRelative > height * 0.75) {
                // Bottom 25% - drop after this item
                dropPosition = 'after';
                this.showDropIndicator(rect.left, rect.bottom);
            } else {
                // Middle 50% - drop inside this item
                dropPosition = 'inside';
                this.hideDropIndicator();
                item.classList.add('drag-over');
            }
            
            // Store the current drop target info
            this.dragDropTarget = {
                target: gameObject,
                position: dropPosition
            };
            
            e.dataTransfer.dropEffect = 'move';
        });
        
        item.addEventListener('dragleave', (e) => {
            // Only remove visual indicators if we're actually leaving this item
            if (!item.contains(e.relatedTarget)) {
                item.classList.remove('drag-over');
                
                // Only hide indicator if we're not going to another valid drop target
                if (!e.relatedTarget || !e.relatedTarget.closest('.hierarchy-item')) {
                    this.hideDropIndicator();
                }
            }
        });
        
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Clean up visual indicators
            item.classList.remove('drag-over');
            this.hideDropIndicator();
            
            // Get the dragged object
            let draggedObj = this.draggedObject;
            if (!draggedObj) {
                const draggedObjectId = e.dataTransfer.getData('application/game-object-id');
                draggedObj = this.findGameObjectById(draggedObjectId);
            }
            
            if (!draggedObj || draggedObj === gameObject) return;
            
            // Don't allow dropping onto a descendant
            if (this.isChildOf(gameObject, draggedObj)) {
                console.error("Cannot create circular reference in hierarchy");
                return;
            }
            
            // Handle drop based on the position
            if (this.dragDropTarget && this.dragDropTarget.target === gameObject) {
                const position = this.dragDropTarget.position;
                
                if (position === 'inside') {
                    // Reparent: Make the dragged object a child of the target
                    this.reparentGameObject(draggedObj, gameObject);
                    
                    // Expand the new parent to show the dragged item
                    if (!gameObject.expanded) {
                        gameObject.expanded = true;
                    }
                } else if (position === 'before' || position === 'after') {
                    // Get the parent of the target (could be null for root items)
                    const targetParent = gameObject.parent;
                    
                    // If target is a root item
                    if (!targetParent) {
                        // Move to root first
                        this.moveToRoot(draggedObj);
                        
                        // Then reorder in the root array
                        const targetIndex = this.editor.scene.gameObjects.indexOf(gameObject);
                        const currentIndex = this.editor.scene.gameObjects.indexOf(draggedObj);
                        
                        if (currentIndex !== -1) {
                            // Remove from current position
                            this.editor.scene.gameObjects.splice(currentIndex, 1);
                            
                            // Adjust target index if needed
                            const adjustedIndex = position === 'before' ? 
                                (targetIndex > currentIndex ? targetIndex - 1 : targetIndex) :
                                (targetIndex > currentIndex ? targetIndex : targetIndex + 1);
                            
                            // Insert at new position
                            this.editor.scene.gameObjects.splice(
                                adjustedIndex,
                                0,
                                draggedObj
                            );
                        }
                    } else {
                        // Make it a sibling of the target (child of target's parent)
                        this.reparentGameObject(draggedObj, targetParent);
                        
                        // Then reorder within the parent's children array
                        const targetIndex = targetParent.children.indexOf(gameObject);
                        const currentIndex = targetParent.children.indexOf(draggedObj);
                        
                        if (currentIndex !== -1) {
                            // Remove from current position
                            targetParent.children.splice(currentIndex, 1);
                            
                            // Adjust target index if needed
                            const adjustedIndex = position === 'before' ? 
                                (targetIndex > currentIndex ? targetIndex - 1 : targetIndex) :
                                (targetIndex > currentIndex ? targetIndex : targetIndex + 1);
                            
                            // Insert at new position
                            targetParent.children.splice(
                                adjustedIndex,
                                0,
                                draggedObj
                            );
                        }
                    }
                }
                
                // Refresh the hierarchy after any change
                this.refreshHierarchy();
                this.editor.refreshCanvas();
            }
        });
    }
    
    showDropIndicator(x, y) {
        // Show line indicator for insertion points
        if (!this.dropIndicator) return;
        
        // Get the container's position and width
        const containerRect = this.listContainer.getBoundingClientRect();
        
        // Position the indicator
        this.dropIndicator.style.left = `${containerRect.left}px`;
        this.dropIndicator.style.width = `${containerRect.width}px`;
        this.dropIndicator.style.top = `${y}px`;
        this.dropIndicator.style.display = 'block';
        
        // Make sure the indicator is visible by scrolling if necessary
        if (y < containerRect.top) {
            this.listContainer.scrollTop -= (containerRect.top - y);
        } else if (y > containerRect.bottom) {
            this.listContainer.scrollTop += (y - containerRect.bottom);
        }
    }
    
    hideDropIndicator() {
        if (this.dropIndicator) {
            this.dropIndicator.style.display = 'none';
        }
    }
    
    /**
     * Find a GameObject by ID
     */
    findGameObjectById(id) {
        // Helper function to search recursively
        const findInArray = (objects) => {
            for (const obj of objects) {
                if (obj.id === id) return obj;
                if (obj.children && obj.children.length > 0) {
                    const found = findInArray(obj.children);
                    if (found) return found;
                }
            }
            return null;
        };
        
        return findInArray(this.editor.scene.gameObjects);
    }
    
    /**
     * Check if potentialChild is a child of obj (recursively)
     */
    isChildOf(potentialChild, obj) {
        if (!obj || !potentialChild) return false;
        if (obj === potentialChild) return true;
        
        if (!obj.children || obj.children.length === 0) return false;
        
        return obj.children.some(child => this.isChildOf(potentialChild, child));
    }
    
    /**
     * Change the parent of a GameObject
     */
    reparentGameObject(obj, newParent) {
        if (!obj || !newParent) return;
        if (obj === newParent) return;
        
        // Check if this would create a circular reference
        if (this.isChildOf(newParent, obj)) {
            console.error("Cannot create circular reference in hierarchy");
            return;
        }
        
        // Remove from current parent
        if (obj.parent) {
            const index = obj.parent.children.indexOf(obj);
            if (index !== -1) {
                obj.parent.children.splice(index, 1);
            }
            obj.parent = null;
        } else {
            // Remove from root if it's a root object
            const index = this.editor.scene.gameObjects.indexOf(obj);
            if (index !== -1) {
                this.editor.scene.gameObjects.splice(index, 1);
            }
        }
        
        // Add to new parent
        newParent.addChild(obj);
        
        // Refresh the hierarchy
        this.refreshHierarchy();
        this.editor.refreshCanvas();
    }
    
    /**
     * Move an object to the root level
     */
    moveToRoot(obj) {
        if (!obj) return;
        
        // Already at root level
        if (!obj.parent) return;
        
        // Remove from current parent
        const index = obj.parent.children.indexOf(obj);
        if (index !== -1) {
            obj.parent.children.splice(index, 1);
        }
        obj.parent = null;
        
        // Add to root
        this.editor.scene.gameObjects.push(obj);
        
        // Refresh the hierarchy
        this.refreshHierarchy();
        this.editor.refreshCanvas();
    }
    
    /**
     * Add a new GameObject to the scene
     */
    addGameObject(name = "New GameObject", position = null) {
        if (!this.editor || !this.editor.scene) return;
        
        const obj = new GameObject(name);
        
        // Set position based on camera center if no position specified
        if (!position) {
            const cameraCenter = new Vector2(
                -this.editor.camera.position.x / this.editor.camera.zoom,
                -this.editor.camera.position.y / this.editor.camera.zoom
            );
            obj.position = cameraCenter;
        } else {
            obj.position = position;
        }
        
        // If there's a selected object, add as child, otherwise add to root
        if (this.selectedObject) {
            this.selectedObject.addChild(obj);
        } else {
            this.editor.scene.gameObjects.push(obj);
        }
        
        this.refreshHierarchy();
        this.selectGameObject(obj);
        this.editor.refreshCanvas();
        
        return obj;
    }
    
    /**
     * Remove the selected GameObject with confirmation
     */
    removeSelectedGameObject() {
        if (!this.selectedObject) return;
        this.confirmDeleteGameObject(this.selectedObject);
    }
    
    /**
     * Duplicate the selected GameObject
     */
    duplicateSelectedGameObject() {
        if (!this.selectedObject) return;
        
        // Use the clone method
        const duplicate = this.selectedObject.clone();
        
        // Add to same parent as original
        if (this.selectedObject.parent) {
            this.selectedObject.parent.addChild(duplicate);
        } else {
            this.editor.scene.gameObjects.push(duplicate);
        }
        
        // Refresh hierarchy and select the new object
        this.refreshHierarchy();
        this.selectGameObject(duplicate);
        this.editor.refreshCanvas();
    }
    
    /**
     * Toggle expand/collapse a GameObject in the hierarchy
     */
    toggleExpandGameObject(gameObject) {
        gameObject.expanded = !gameObject.expanded;
        this.refreshHierarchy();
    }
    
    /**
     * Toggle visibility of a GameObject
     */
    toggleGameObjectVisibility(gameObject) {
        gameObject.active = !gameObject.active;
        this.refreshHierarchy();
        this.editor.refreshCanvas();
    }
    
    /**
     * Select a GameObject
     */
    selectGameObject(gameObject) {
        // Deselect previous
        if (this.selectedObject) {
            this.selectedObject.setSelected(false);
        }
        
        // Select new
        this.selectedObject = gameObject;
        gameObject.setSelected(true);
        
        // Update UI
        document.querySelectorAll('.hierarchy-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        const itemElement = document.querySelector(`.hierarchy-item[data-id="${gameObject.id}"]`);
        if (itemElement) {
            itemElement.classList.add('selected');
        }
        
        // Update inspector
        if (this.editor.inspector) {
            this.editor.inspector.inspectObject(gameObject);
        }
        
        this.editor.refreshCanvas();
    }
    
    /**
     * Prompt the user to rename the selected GameObject
     */
    promptRenameSelectedGameObject() {
        if (!this.selectedObject) return;
        
        this.promptRenameGameObject(this.selectedObject);
    }
    
    /**
     * Prompt the user to rename a GameObject
     */
    promptRenameGameObject(gameObject) {
        const newName = prompt('Enter new name for the GameObject:', gameObject.name);
        if (newName && newName !== gameObject.name) {
            gameObject.rename(newName);
            this.refreshHierarchy();
            
            // Also update inspector if this is the selected object
            if (this.selectedObject === gameObject && this.editor.inspector) {
                this.editor.inspector.inspectObject(gameObject);
            }
        }
    }

    /**
     * Check if potentialChild is a child of obj (recursively)
     */
    isChildOf(potentialChild, obj) {
        if (!obj || !potentialChild) return false;
        if (obj === potentialChild) return true;
        
        // Check parent chain
        let current = potentialChild.parent;
        while (current) {
            if (current === obj) return true;
            current = current.parent;
        }
        
        return false;
    }

    /**
     * Confirm deletion of a GameObject
     */
    confirmDeleteGameObject(gameObject) {
        let message = `Are you sure you want to delete "${gameObject.name}"?`;
        if (gameObject.children && gameObject.children.length > 0) {
            message += `\nThis will also delete ${gameObject.children.length} child object(s).`;
        }
        
        if (confirm(message)) {
            this.deleteGameObject(gameObject);
        }
    }
    
    /**
     * Delete a GameObject and its children
     */
    deleteGameObject(gameObject) {
        if (!gameObject) return;
        
        // Remove from parent or scene
        if (gameObject.parent) {
            gameObject.parent.removeChild(gameObject);
        } else if (this.editor.scene) {
            // Remove from root
            const index = this.editor.scene.gameObjects.indexOf(gameObject);
            if (index !== -1) {
                this.editor.scene.gameObjects.splice(index, 1);
            }
        }
        
        // Update selected object
        if (this.selectedObject === gameObject) {
            this.selectedObject = null;
        }
        
        this.refreshHierarchy();
        this.editor.refreshCanvas();
    }
}
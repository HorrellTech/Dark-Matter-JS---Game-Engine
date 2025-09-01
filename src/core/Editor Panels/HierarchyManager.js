class HierarchyManager {
    constructor(containerId, editorInstance) {
        this.container = document.getElementById(containerId);
        this.editor = editorInstance;
        this.draggedItem = null;
        this.draggedObject = null;
        this.draggedOver = null;
        this.dropIndicator = null; // Element to show where item will be dropped
        this.selectedObject = null;
        this.selectedObjects = [];
        this.prefabManager = new PrefabManager(this); // Add prefab manager

        this.initializeUI();
        this.createDropIndicator();

        // Assuming you have an "Add GameObject" button in your hierarchy UI
        const addGameObjectButton = this.container.querySelector('.add-object-button'); // Or whatever its selector is
        if (addGameObjectButton) {
            addGameObjectButton.addEventListener('click', () => {
                const position = this.editor.getWorldCenterOfView();
                this.addGameObject("New GameObject", position);
            });
        }

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
                <button class="hierarchy-button" id="createPrefab" title="Create Prefab">
                    <i class="fas fa-cube"></i>
                </button>
            </div>
            <div class="hierarchy-list"></div>
        `;

        // Add a class to the container to enable flex layout
        this.container.classList.add('hierarchy-container');

        this.listContainer = this.container.querySelector('.hierarchy-list');

        this.listContainer.addEventListener('click', (e) => {
            // Only handle clicks directly on the list container, not its children
            if (e.target === this.listContainer) {
                // If we have a currently selected object, deselect it
                if (this.selectedObject) {
                    this.selectedObject.setSelected(false);
                    this.selectedObject = null;

                    // Update hierarchy UI
                    document.querySelectorAll('.hierarchy-item').forEach(item => {
                        item.classList.remove('selected');
                    });

                    // Inform the inspector
                    if (this.editor.inspector) {
                        this.editor.inspector.inspectObject(null);
                    }

                    // Refresh the canvas
                    this.editor.refreshCanvas();
                }
            }
        });

        // Setup toolbar button event listeners
        document.getElementById('addGameObject').addEventListener('click', () => {
            const position = this.editor.getWorldCenterOfView();
            this.addGameObject("New GameObject", position);
        });
        document.getElementById('removeGameObject').addEventListener('click', () => {
            this.removeSelectedGameObject();
        });
        document.getElementById('duplicateGameObject').addEventListener('click', () => {
            this.duplicateSelectedGameObject();
        });
        document.getElementById('createPrefab').addEventListener('click', () => {
            this.createPrefabFromSelected();
        });

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

            // Check for prefab files being dragged
            if (e.dataTransfer.types.includes('application/prefab-file')) {
                this.listContainer.classList.add('drag-over-prefab');
                e.dataTransfer.dropEffect = 'copy';
                return;
            }

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
                this.listContainer.classList.remove('drag-over-prefab');
                this.hideDropIndicator();
            }
        });

        this.listContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();

            this.listContainer.classList.remove('drag-over-root');
            this.listContainer.classList.remove('drag-over-prefab');
            this.hideDropIndicator();

            // Handle prefab drops
            if (e.dataTransfer.types.includes('application/prefab-file')) {
                const prefabPath = e.dataTransfer.getData('application/prefab-file');
                this.instantiatePrefabAtCenter(prefabPath);
                return;
            }

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
                label: 'Create Prefab',
                action: () => this.createPrefabFromSelected()
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
                action: () => {/* TODO: Implement clipboard */ },
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

            // Multi-select logic
            if (e.ctrlKey) {
                if (this.selectedObjects.includes(gameObject)) {
                    // Deselect
                    this.selectedObjects = this.selectedObjects.filter(obj => obj !== gameObject);
                    gameObject.setSelected(false);
                } else {
                    // Add to selection
                    this.selectedObjects.push(gameObject);
                    gameObject.setSelected(true);
                }
            } else {
                // Single select (clear previous)
                this.selectedObjects.forEach(obj => obj.setSelected(false));
                this.selectedObjects = [gameObject];
                gameObject.setSelected(true);
            }

            // Update UI
            document.querySelectorAll('.hierarchy-item').forEach(item => {
                item.classList.remove('selected');
            });
            this.selectedObjects.forEach(obj => {
                const itemElement = document.querySelector(`.hierarchy-item[data-id="${obj.id}"]`);
                if (itemElement) itemElement.classList.add('selected');
            });

            // Update inspector
            if (this.editor.inspector) {
                if (this.selectedObjects.length === 1) {
                    this.editor.inspector.inspectObject(this.selectedObjects[0]);
                } else if (this.selectedObjects.length > 1) {
                    this.editor.inspector.inspectMultipleObjects(this.selectedObjects);
                } else {
                    this.editor.inspector.showNoObjectMessage();
                }
            }

            this.editor.refreshCanvas();

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

                    // Mark scene as dirty
                    this.editor.activeScene.markDirty();

                    // Trigger auto-save if available
                    if (window.autoSaveManager) {
                        window.autoSaveManager.autoSave();
                    }
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
            e.dataTransfer.setData('application/hierarchy-object', JSON.stringify({
                id: gameObject.id,
                name: gameObject.name,
                type: 'gameObject'
            }));
            e.dataTransfer.effectAllowed = 'copyMove';

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

        // Mark scene as dirty
        this.editor.activeScene.markDirty();

        // Trigger auto-save if available
        if (window.autoSaveManager) {
            window.autoSaveManager.autoSave();
        }
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

        // Mark scene as dirty
        this.editor.activeScene.markDirty();

        // Trigger auto-save if available
        if (window.autoSaveManager) {
            window.autoSaveManager.autoSave();
        }
    }

    /**
     * Create a prefab from the selected GameObject
     */
    async createPrefabFromSelected() {
        if (!this.selectedObject) {
            this.showNotification('No GameObject selected', 'warning');
            return;
        }

        try {
            await this.prefabManager.createPrefab(this.selectedObject);
        } catch (error) {
            console.error('Error creating prefab:', error);
            this.showNotification(`Error creating prefab: ${error.message}`, 'error');
        }
    }

    async createPrefabFromGameObject(gameObject, targetPath = null) {
        try {
            if (!gameObject) {
                throw new Error('No GameObject provided');
            }

            // Ensure we have a file browser instance
            if (!this.editor.fileBrowser) {
                throw new Error('File browser not available');
            }

            // Determine target directory - use Prefabs folder or create it
            let prefabsDir = targetPath || '/Prefabs';

            // Ensure the Prefabs directory exists
            const prefabsDirExists = await this.editor.fileBrowser.exists(prefabsDir);
            if (!prefabsDirExists) {
                console.log(`Creating Prefabs directory at: ${prefabsDir}`);
                await this.editor.fileBrowser.createDirectory(prefabsDir);
            }

            // Generate prefab file name
            const baseName = gameObject.name.replace(/[^a-zA-Z0-9_-]/g, '_'); // Sanitize name
            const prefabFileName = `${baseName}.prefab`;
            const prefabFilePath = `${prefabsDir}/${prefabFileName}`;

            // Check if file already exists and generate unique name if needed
            let finalPrefabPath = prefabFilePath;
            let counter = 1;
            while (await this.editor.fileBrowser.exists(finalPrefabPath)) {
                const uniqueName = `${baseName}_${counter}.prefab`;
                finalPrefabPath = `${prefabsDir}/${uniqueName}`;
                counter++;
            }

            // Create prefab data - implement our own serialization
            const prefabData = this.serializeGameObjectToPrefab(gameObject);

            // Save prefab to file system
            const success = await this.editor.fileBrowser.createFile(
                finalPrefabPath,
                JSON.stringify(prefabData, null, 2)
            );

            if (success) {
                this.showNotification(`Prefab created: ${finalPrefabPath.split('/').pop()}`, 'success');

                // Refresh file browser if it's showing the Prefabs directory
                if (this.editor.fileBrowser.currentPath === prefabsDir) {
                    await this.editor.fileBrowser.refreshFiles();
                }

                return finalPrefabPath;
            } else {
                throw new Error('Failed to save prefab file');
            }

        } catch (error) {
            console.error('Error creating prefab from GameObject:', error);
            this.showNotification(`Error creating prefab: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Add a new GameObject to the scene
     */
    addGameObject(name = "New GameObject", position = null) {
        if (!this.editor || !this.editor.scene) return;

        const obj = new GameObject(name);

        // Set position based on camera center if no position specified
        if (position instanceof Vector2) {
            obj.position.x = position.x;
            obj.position.y = position.y;
        } else {
            // If position is still null (e.g. called from somewhere else without it),
            // then default to the center of the camera's view.
            const centerViewPos = this.editor.getWorldCenterOfView();
            obj.position.x = centerViewPos.x;
            obj.position.y = centerViewPos.y;
        }

        // If there's a selected object, add as child, otherwise add to root
        if (this.selectedObject) {
            this.selectedObject.addChild(obj);
            this.selectedObject.expanded = true; // Ensure parent is expanded
        } else {
            this.editor.scene.gameObjects.push(obj);
        }

        this.refreshHierarchy();
        this.selectGameObject(obj);
        this.editor.refreshCanvas();

        // Mark scene as dirty
        this.editor.activeScene.markDirty();

        // Trigger auto-save if available
        if (window.autoSaveManager) {
            window.autoSaveManager.autoSave();
        }

        return obj;
    }

    /**
     * Remove the selected GameObject with confirmation
     */
    removeSelectedGameObject() {
        if (!this.selectedObject) return;
        this.confirmDeleteGameObject(this.selectedObject);

        // Mark scene as dirty
        this.editor.activeScene.markDirty();

        // Trigger auto-save if available
        if (window.autoSaveManager) {
            window.autoSaveManager.autoSave();
        }
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

        // Mark scene as dirty
        this.editor.activeScene.markDirty();

        // Trigger auto-save if available
        //if (window.autoSaveManager) {
        //    window.autoSaveManager.autoSave();
        //}
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
 * Serialize a GameObject and its children to prefab data
 * @param {GameObject} gameObject - The GameObject to serialize
 * @returns {Object} Prefab data object
 */
    serializeGameObjectToPrefab(gameObject) {
        const prefabData = {
            metadata: {
                name: gameObject.name,
                created: Date.now(),
                version: "1.0.0"
            },
            gameObject: this.serializeGameObject(gameObject)
        };

        return prefabData;
    }

    /**
     * Recursively serialize a GameObject and its children
     * @param {GameObject} gameObject - The GameObject to serialize
     * @returns {Object} Serialized GameObject data
     */
    serializeGameObject(gameObject) {
        const serializedData = {
            name: gameObject.name,
            position: {
                x: gameObject.position.x,
                y: gameObject.position.y
            },
            rotation: gameObject.rotation,
            scale: {
                x: gameObject.scale.x,
                y: gameObject.scale.y
            },
            active: gameObject.active,
            editorColor: gameObject.editorColor,
            modules: [],
            children: []
        };

        // Serialize modules
        if (gameObject.modules && gameObject.modules.length > 0) {
            gameObject.modules.forEach(module => {
                try {
                    const moduleData = {
                        type: module.constructor.name,
                        properties: {}
                    };

                    // Get all exposed properties
                    if (module.exposedProperties) {
                        Object.keys(module.exposedProperties).forEach(propName => {
                            if (module.hasOwnProperty(propName)) {
                                moduleData.properties[propName] = module[propName];
                            }
                        });
                    }

                    serializedData.modules.push(moduleData);
                } catch (error) {
                    console.warn(`Failed to serialize module ${module.constructor.name}:`, error);
                }
            });
        }

        // Serialize children recursively
        if (gameObject.children && gameObject.children.length > 0) {
            gameObject.children.forEach(child => {
                serializedData.children.push(this.serializeGameObject(child));
            });
        }

        return serializedData;
    }

    /**
 * Deserialize a GameObject from prefab data
 * @param {Object} data - Serialized GameObject data
 * @returns {GameObject} The deserialized GameObject
 */
    deserializeGameObject(data) {
        // Create new GameObject
        const gameObject = new GameObject(data.name);

        // Set basic properties
        gameObject.position.x = data.position?.x || 0;
        gameObject.position.y = data.position?.y || 0;
        gameObject.rotation = data.rotation || 0;
        gameObject.scale.x = data.scale?.x || 1;
        gameObject.scale.y = data.scale?.y || 1;
        gameObject.active = data.active !== undefined ? data.active : true;
        gameObject.editorColor = data.editorColor || '#ffffff';

        // Deserialize modules
        if (data.modules && data.modules.length > 0) {
            data.modules.forEach(moduleData => {
                try {
                    const ModuleClass = window[moduleData.type];
                    if (ModuleClass && typeof ModuleClass === 'function') {
                        const module = new ModuleClass();

                        // Set properties
                        if (moduleData.properties) {
                            Object.keys(moduleData.properties).forEach(propName => {
                                if (module.hasOwnProperty(propName)) {
                                    module[propName] = moduleData.properties[propName];
                                }
                            });
                        }

                        gameObject.addModule(module);
                    } else {
                        console.warn(`Module class not found: ${moduleData.type}`);
                    }
                } catch (error) {
                    console.error(`Error deserializing module ${moduleData.type}:`, error);
                }
            });
        }

        // Deserialize children recursively
        if (data.children && data.children.length > 0) {
            data.children.forEach(childData => {
                const child = this.deserializeGameObject(childData);
                gameObject.addChild(child);
            });
        }

        return gameObject;
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
        if (gameObject) {
            gameObject.setSelected(true);
        }

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
            if (gameObject) {
                this.editor.inspector.inspectObject(gameObject);
            } else {
                this.editor.inspector.showNoObjectMessage();
            }
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

        // Mark scene as dirty
        this.editor.activeScene.markDirty();

        // Trigger auto-save if available
        if (window.autoSaveManager) {
            window.autoSaveManager.autoSave();
        }
    }

    /**
     * Instantiate a prefab at the center of the editor viewport
     * @param {string} prefabPath - Path to the prefab file
     */
    async instantiatePrefabAtCenter(prefabPath) {
        try {
            if (!this.editor.fileBrowser) {
                console.error('File browser not available');
                return;
            }

            // Read prefab file
            const content = await this.editor.fileBrowser.readFile(prefabPath);
            if (!content) {
                console.error('Could not read prefab file:', prefabPath);
                return;
            }

            const prefabData = JSON.parse(content);

            // Instantiate at center of viewport
            const centerPosition = this.editor.getWorldCenterOfView();
            const instantiated = this.instantiatePrefabFromData(prefabData, centerPosition);

            // Refresh hierarchy and select the new object
            this.refreshHierarchy();
            this.selectGameObject(instantiated);
            this.editor.refreshCanvas();

            // Mark scene as dirty
            this.editor.activeScene.markDirty();

            // Trigger auto-save if available
            if (window.autoSaveManager) {
                window.autoSaveManager.autoSave();
            }

            this.showNotification(`Instantiated prefab: ${prefabData.metadata?.name || prefabData.name}`, 'success');

        } catch (error) {
            console.error('Error instantiating prefab:', error);
            this.showNotification(`Error instantiating prefab: ${error.message}`, 'error');
        }
    }

    /**
     * Instantiate a GameObject from prefab data
     * @param {Object} prefabData - The prefab data
     * @param {Vector2} position - Position to instantiate at
     * @returns {GameObject} The instantiated GameObject
     */
    instantiatePrefabFromData(prefabData, position) {
        // Handle both old and new prefab formats
        const gameObjectData = prefabData.gameObject || prefabData;

        const instantiated = this.deserializeGameObject(gameObjectData);

        // Set position - this is the key part for canvas drops
        if (position) {
            instantiated.position.x = position.x;
            instantiated.position.y = position.y;
        }

        // Add to scene
        this.editor.scene.gameObjects.push(instantiated);

        return instantiated;
    }

    /**
     * Show a notification message
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;

        // Set background color based on type
        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#4CAF50';
                break;
            case 'warning':
                notification.style.backgroundColor = '#FF9800';
                break;
            case 'error':
                notification.style.backgroundColor = '#F44336';
                break;
            default:
                notification.style.backgroundColor = '#2196F3';
        }

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Animate out and remove
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}
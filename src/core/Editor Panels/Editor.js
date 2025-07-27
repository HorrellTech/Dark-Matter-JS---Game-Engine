class Editor {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.scene = {
            gameObjects: []
        };
        this.grid = new EditorGrid(this.canvas);
        this.camera = {
            position: new Vector2(this.canvas.width / 2, this.canvas.height / 2),
            zoom: 1
        };
        this.dragInfo = {
            dragging: false,
            startPos: null,
            object: null,
            dragMode: null // 'x', 'y', 'free'
        };
        this.contextMenu = null;
        this.transformHandles = {
            size: 40,        // Size of the transform handles
            arrowSize: 8,    // Size of arrow heads
            rotationRadius: 60, // Radius of rotation circle
            centerBoxSize: 12,
            xColor: '#E57373',
            yColor: '#81C784',
            rotationColor: '#64B5F6',
            activeAxis: null,
            rotationStartAngle: 0
        };

        // Viewport interaction properties
        this.viewportInteraction = {
            dragging: false,
            resizing: false,
            settings: false,
            startPos: null,
            initialViewport: null
        };

        // Viewport icon animation properties
        this.viewportAnimation = {
            moveHandleScale: 1.0,
            settingsHandleScale: 1.0,
            targetMoveScale: 1.0,
            targetSettingsScale: 1.0,
            animationSpeed: 0.15  // Speed of animation (0-1, higher is faster)
        };

        this.mousePosition = new Vector2(0, 0);
        this.showMouseCoordinates = true;

        this.scenes = [];
        this.activeScene = null;
        this.sceneBuffer = new SceneBuffer();
        this.createDefaultScene();

        // Initialize hierarchy first
        this.hierarchy = new HierarchyManager('gameObjectHierarchy', this);

        // Now initialize scene manager
        this.sceneManager = new SceneManager(this);
        // Initialize scene manager UI after hierarchy exists
        this.sceneManager.initializeUI();

        // Initialize file browser
        this.fileBrowser = window.fileBrowser || null;

        // Set up the inspector
        this.inspector = new Inspector('moduleSettings', this);

        this.initEditor();
    }

    initEditor() {
        // Setup canvas event listeners
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.handleMouseWheel.bind(this));
        this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));

        // Add touch event handlers for panning
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));

        // Add navigation arrows
        this.addNavigationButtons();

        // Add zoom buttons
        this.setupZoomButtons();

        // Track mouse position even when not dragging
        this.canvas.addEventListener('mousemove', (e) => {
            const screenPos = new Vector2(e.offsetX, e.offsetY);
            this.mousePosition = this.screenToWorldPosition(screenPos);
            this.refreshCanvas();
        });

        // Create a single bound handler for mousemove
        const boundMouseMoveHandler = this.handleMouseMove.bind(this);
        this.canvas.addEventListener('mousemove', boundMouseMoveHandler);

        // Mouse leave - hide coordinates when mouse exits canvas
        this.canvas.addEventListener('mouseleave', () => {
            this.showMouseCoordinates = false;
            this.refreshCanvas();
        });

        // Mouse enter - show coordinates when mouse enters canvas
        this.canvas.addEventListener('mouseenter', () => {
            this.showMouseCoordinates = true;
            this.refreshCanvas();
        });

        // Prevent default middle-mouse scrolling behavior
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 1) { // Middle button
                e.preventDefault();
            }
        });

        // Set up the hierarchy manager
        this.hierarchy = new HierarchyManager('gameObjectHierarchy', this);

        // Set up the inspector
        this.inspector = new Inspector('moduleSettings', this);

        // Add event listener for shift key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Shift') {
                this.shiftKeyDown = true;

                // If we're already dragging an object and press shift, switch to free mode
                if (this.dragInfo.dragging && this.dragInfo.object) {
                    this.dragInfo.dragMode = 'free';
                }

                // Refresh to update cursor visualization
                this.refreshCanvas();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'Shift') {
                this.shiftKeyDown = false;

                // Reset to axis-based movement if we're dragging
                if (this.dragInfo.dragging && this.dragInfo.object) {
                    this.dragInfo.dragMode = this.transformHandles.activeAxis;
                }

                // Refresh to update cursor visualization
                this.refreshCanvas();
            }
        });

        // Set up animation loop for smoother icon animations
        this.animationLoop();

        // Initial render
        this.refreshCanvas();

        // Add window resize handler specifically for editor canvas
        window.addEventListener('resize', () => {
            this.refreshCanvas();
        });

        // Also listen for panel resize events
        window.addEventListener('panelsResized', () => {
            this.refreshCanvas();
        });
    }

    animationLoop() {
        // Check if any animations are in progress
        const moveAnimating = Math.abs(this.viewportAnimation.moveHandleScale -
            this.viewportAnimation.targetMoveScale) > 0.01;

        const settingsAnimating = Math.abs(this.viewportAnimation.settingsHandleScale -
            this.viewportAnimation.targetSettingsScale) > 0.01;

        // If anything is animating, refresh the canvas
        if (moveAnimating || settingsAnimating) {
            this.refreshCanvas();
        }

        // Continue the animation loop
        requestAnimationFrame(() => this.animationLoop());
    }

    /**
     * Set up zoom control buttons
     */
    setupZoomButtons() {
        const zoomInButton = document.getElementById('zoomInButton');
        const zoomOutButton = document.getElementById('zoomOutButton');
        const resetZoomButton = document.getElementById('resetZoomButton');

        if (zoomInButton) {
            zoomInButton.addEventListener('click', () => {
                this.zoomIn();
            });
        }

        if (zoomOutButton) {
            zoomOutButton.addEventListener('click', () => {
                this.zoomOut();
            });
        }

        if (resetZoomButton) {
            resetZoomButton.addEventListener('click', () => {
                this.resetCamera();
            });
        }
    }

    /**
     * Update the zoom level display
     */
    updateZoomLevelDisplay() {
        const zoomLevel = document.getElementById('zoomLevel');
        if (zoomLevel) {
            // Format as percentage with no decimal places
            const percentage = Math.round(this.camera.zoom * 100);
            zoomLevel.textContent = `${percentage}%`;
        }
    }

    /**
     * Zoom in by a fixed amount, centered on the viewport
     */
    zoomIn() {
        // Calculate center of the viewport
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Store old zoom for calculations
        const oldZoom = this.camera.zoom;

        // Increase zoom by 20%
        this.camera.zoom = Math.min(5, this.camera.zoom * 1.2);

        // Adjust camera position to keep viewport centered
        if (oldZoom !== this.camera.zoom) {
            const dx = (centerX - this.camera.position.x);
            const dy = (centerY - this.camera.position.y);

            this.camera.position.x = centerX - dx * (this.camera.zoom / oldZoom);
            this.camera.position.y = centerY - dy * (this.camera.zoom / oldZoom);

            this.refreshCanvas();
            this.updateZoomLevelDisplay();
        }
    }

    /**
     * Zoom out by a fixed amount, centered on the viewport
     */
    zoomOut() {
        // Calculate center of the viewport
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Store old zoom for calculations
        const oldZoom = this.camera.zoom;

        // Decrease zoom by 20%
        this.camera.zoom = Math.max(0.1, this.camera.zoom / 1.2);

        // Adjust camera position to keep viewport centered
        if (oldZoom !== this.camera.zoom) {
            const dx = (centerX - this.camera.position.x);
            const dy = (centerY - this.camera.position.y);

            this.camera.position.x = centerX - dx * (this.camera.zoom / oldZoom);
            this.camera.position.y = centerY - dy * (this.camera.zoom / oldZoom);

            this.refreshCanvas();
            this.updateZoomLevelDisplay();
        }
    }

    /**
     * Get the world coordinates of the center of the current canvas view.
     * @returns {Vector2} The world coordinates of the view center.
     */
    getWorldCenterOfView() {
        const screenCenterX = this.canvas.width / 2;
        const screenCenterY = this.canvas.height / 2;
        return this.screenToWorldPosition(new Vector2(screenCenterX, screenCenterY));
    }

    /**
     * Resize and position the canvas to fit the container while maintaining aspect ratio
     * This ensures no scrollbars appear and the canvas is centered
     */
    resizeCanvas() {
        if (!this.canvas) return;

        const container = this.canvas.parentElement;
        if (!container) return;

        // Get container dimensions
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        if (containerWidth === 0 || containerHeight === 0) return;

        // Get scene settings for viewport dimensions
        const viewportWidth = this.scene?.settings?.viewportWidth || 800;
        const viewportHeight = this.scene?.settings?.viewportHeight || 600;

        // Calculate aspect ratios
        const containerAspect = containerWidth / containerHeight;
        const viewportAspect = viewportWidth / viewportHeight;

        let width, height;

        // Determine dimensions to fit within container while maintaining aspect ratio
        if (containerAspect > viewportAspect) {
            // Container is wider than needed - constrain by height
            height = containerHeight;
            width = height * viewportAspect;
        } else {
            // Container is taller than needed - constrain by width
            width = containerWidth;
            height = width / viewportAspect;
        }

        // Set canvas size
        this.canvas.width = viewportWidth;
        this.canvas.height = viewportHeight;

        // Set display size (CSS)
        this.canvas.style.width = `${Math.floor(width)}px`;
        this.canvas.style.height = `${Math.floor(height)}px`;

        // Center the canvas in the container
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = `${Math.floor((containerWidth - width) / 2)}px`;
        this.canvas.style.top = `${Math.floor((containerHeight - height) / 2)}px`;

        // Update the viewport settings if needed
        if (this.scene && this.scene.settings) {
            this.scene.settings.containerWidth = containerWidth;
            this.scene.settings.containerHeight = containerHeight;
        }
    }

    refreshCanvas() {
        // Get the parent container dimensions directly
        const container = this.canvas.parentElement;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();

        // Always set canvas dimensions to match container, even if they seem unchanged
        // This helps with mobile panel state changes
        this.canvas.width = containerRect.width;
        this.canvas.height = containerRect.height;

        // Update camera position if this is the first time setting up or after significant size changes
        if (!this.initialSizeSet) {
            this.camera.position = new Vector2(this.canvas.width / 2, this.canvas.height / 2);
            this.initialSizeSet = true;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.activeScene) return;

        // Fill with scene background color
        this.ctx.fillStyle = this.activeScene.settings.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid if enabled
        if (this.activeScene.settings.gridEnabled) {
            this.grid.size = this.activeScene.settings.gridSize;
            this.grid.draw(this.camera.zoom, this.camera.position);
        }

        // Apply camera transform
        this.ctx.save();
        this.ctx.translate(this.camera.position.x, this.camera.position.y);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);

        // Draw viewport bounds
        this.drawSceneViewport();

        // Draw all game objects from activeScene
        if (this.activeScene && this.activeScene.gameObjects) {
            this.activeScene.gameObjects.forEach(obj => {
                obj.drawInEditor(this.ctx);

                // Draw gizmos for each module if available
                if (obj.modules && Array.isArray(obj.modules)) {
                    obj.modules.forEach(module => {
                        if (typeof module.drawGizmos === "function") {
                            module.drawGizmos(this.ctx);
                        }
                    });
                }
            });
        }

        // Draw transform handles for selected object
        if (this.hierarchy && this.hierarchy.selectedObject && this.hierarchy.selectedObject.active) {
            this.drawTransformHandles(this.hierarchy.selectedObject);
        }

        this.ctx.restore();

        // Draw mouse coordinates (outside the transformed context)
        if (this.showMouseCoordinates) {
            this.drawMouseCoordinates();
        }
    }

    /**
     * Add navigation buttons to the editor view
     */
    addNavigationButtons() {
        // Create container for navigation arrows
        const navContainer = document.createElement('div');
        navContainer.className = 'navigation-arrows';

        // Define the buttons: direction, icon, x-movement, y-movement
        const buttons = [
            { dir: 'up', icon: 'fa-arrow-up', x: 0, y: 1 },
            { dir: 'right', icon: 'fa-arrow-right', x: -1, y: 0 },
            { dir: 'down', icon: 'fa-arrow-down', x: 0, y: -1 },
            { dir: 'left', icon: 'fa-arrow-left', x: 1, y: 0 }
        ];

        // Create each button
        buttons.forEach(btn => {
            const button = document.createElement('div');
            button.className = `nav-button ${btn.dir}`;
            button.innerHTML = `<i class="fas ${btn.icon}"></i>`;

            // Navigation speed (pixels per frame)
            const moveSpeed = 10;
            let isMoving = false;
            let moveInterval = null;

            // Start movement on mouse down or touch start
            const startMove = () => {
                if (isMoving) return;

                isMoving = true;
                moveInterval = setInterval(() => {
                    // Move the camera in the specified direction
                    this.camera.position.x += btn.x * moveSpeed;
                    this.camera.position.y += btn.y * moveSpeed;
                    this.refreshCanvas();
                }, 16); // ~60fps
            };

            // Stop movement on mouse up or touch end
            const stopMove = () => {
                if (!isMoving) return;

                isMoving = false;
                clearInterval(moveInterval);
            };

            // Add event listeners for both mouse and touch
            button.addEventListener('mousedown', startMove);
            button.addEventListener('touchstart', startMove);
            button.addEventListener('mouseup', stopMove);
            button.addEventListener('mouseleave', stopMove);
            button.addEventListener('touchend', stopMove);

            // Add to container
            navContainer.appendChild(button);
        });

        // Add the container to the editor canvas container
        const editorCanvasContainer = document.querySelector('.editor-canvas-container');
        if (editorCanvasContainer) {
            editorCanvasContainer.appendChild(navContainer);
        }
    }

    createDefaultScene() {
        // Create a new buffered scene
        const scene = this.sceneBuffer.createNewScene();
        this.scenes.push(scene);
        this.setActiveScene(scene);
    }

    handleDocumentMouseMove = (e) => {
        if (this.viewportInteraction.dragging) {
            // Get canvas-relative coordinates
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const screenPos = new Vector2(x, y);
            const worldPos = this.screenToWorldPosition(screenPos);
            const delta = worldPos.subtract(this.viewportInteraction.startPos);

            // Update viewport position
            this.activeScene.settings.viewportX = this.viewportInteraction.initialViewport.x + delta.x;
            this.activeScene.settings.viewportY = this.viewportInteraction.initialViewport.y + delta.y;

            // Snap to grid if enabled
            if (this.grid.snapToGrid) {
                this.activeScene.settings.viewportX = this.grid.snapValue(this.activeScene.settings.viewportX);
                this.activeScene.settings.viewportY = this.grid.snapValue(this.activeScene.settings.viewportY);
            }

            // Mark scene as modified
            this.activeScene.dirty = true;

            this.refreshCanvas();
        }
    }

    handleDocumentMouseUp = (e) => {
        if (this.viewportInteraction.dragging) {
            this.viewportInteraction.dragging = false;
            this.viewportInteraction.startPos = null;
            this.viewportInteraction.initialViewport = null;

            document.body.classList.remove('viewport-dragging');

            // Remove document-level event listeners
            document.removeEventListener('mousemove', this.handleDocumentMouseMove);
            document.removeEventListener('mouseup', this.handleDocumentMouseUp);

            // Mark scene as modified
            if (this.activeScene) {
                this.activeScene.dirty = true;
            }

            this.refreshCanvas();
        }
    }

    /**
     * Handle touch start events for panning
     */
    handleTouchStart(e) {
        // Prevent default behavior to avoid scrolling the page
        //e.preventDefault();
    
        const rect = this.canvas.getBoundingClientRect();

        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const screenPos = new Vector2(
                (touch.clientX - rect.left) * (this.canvas.width / rect.width),
                (touch.clientY - rect.top) * (this.canvas.height / rect.height)
            );
            const worldPos = this.screenToWorldPosition(screenPos);

            // --- Viewport Move Handle Touch ---
            if (this.isOnViewportMoveHandle(worldPos)) {
                this.viewportInteraction.dragging = true;
                this.viewportInteraction.startPos = worldPos.clone();
                this.viewportInteraction.initialViewport = {
                    x: this.activeScene.settings.viewportX || 0,
                    y: this.activeScene.settings.viewportY || 0
                };
                return;
            }

            // --- Viewport Settings Handle Touch ---
            if (this.isOnViewportSettingsHandle(worldPos)) {
                this.showViewportSettings();
                return;
            }

            this.touchData = {
                startPos: screenPos.clone(),
                startWorldPos: worldPos.clone(),
                startTime: Date.now(),
                moved: false,
                totalDistance: 0
            };

            const clickedObj = this.findObjectAtPosition(worldPos);

            // Clear both flags first
            this.dragInfo.object = null;
            this.dragInfo.isPanning = false;

            if (clickedObj) {
                // Start dragging the object
                this.dragInfo.dragging = true;
                this.dragInfo.object = clickedObj;
                this.dragInfo.startPos = worldPos;
                this.dragInfo.objectStartPos = clickedObj.position.clone();
                this.dragInfo.dragMode = 'free';

                if (this.hierarchy) {
                    this.hierarchy.selectGameObject(clickedObj);
                }
            } else {
                // Start camera panning
                this.dragInfo.dragging = true;
                this.dragInfo.isPanning = true;
                this.dragInfo.startPos = screenPos;
                this.dragInfo.cameraStartPos = this.camera.position instanceof Vector2 ?
                    this.camera.position.clone() :
                    new Vector2(this.camera.position.x, this.camera.position.y);
            }
        } else if (e.touches.length === 2) {
            // Two finger touch - prepare for pinch zoom
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];

            const rect = this.canvas.getBoundingClientRect();
            const pos1 = new Vector2(
                (touch1.clientX - rect.left) * (this.canvas.width / rect.width),
                (touch1.clientY - rect.top) * (this.canvas.height / rect.height)
            );
            const pos2 = new Vector2(
                (touch2.clientX - rect.left) * (this.canvas.width / rect.width),
                (touch2.clientY - rect.top) * (this.canvas.height / rect.height)
            );

            this.pinchData = {
                initialDistance: pos1.distance(pos2),
                initialZoom: this.camera.zoom,
                center: new Vector2((pos1.x + pos2.x) / 2, (pos1.y + pos2.y) / 2)
            };

            // Stop any current dragging
            this.dragInfo.dragging = false;
            this.dragInfo.isPanning = false;
        }
    }

    /**
     * Handle touch move events for panning
     */
    handleTouchMove(e) {
        // Prevent default behavior
        e.preventDefault();

        if (e.touches.length === 1 && this.dragInfo.dragging) {
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const screenPos = new Vector2(
                (touch.clientX - rect.left) * (this.canvas.width / rect.width),
                (touch.clientY - rect.top) * (this.canvas.height / rect.height)
            );
            const worldPos = this.screenToWorldPosition(screenPos);

            if (this.touchData) {
                const distance = screenPos.distance(this.touchData.startPos);
                this.touchData.totalDistance += distance;
                this.touchData.moved = distance > 5;
            }

            // --- Viewport Dragging ---
            if (this.viewportInteraction.dragging) {
                const delta = worldPos.subtract(this.viewportInteraction.startPos);
                this.activeScene.settings.viewportX = this.viewportInteraction.initialViewport.x + delta.x;
                this.activeScene.settings.viewportY = this.viewportInteraction.initialViewport.y + delta.y;
                if (this.grid.snapToGrid) {
                    this.activeScene.settings.viewportX = this.grid.snapValue(this.activeScene.settings.viewportX);
                    this.activeScene.settings.viewportY = this.grid.snapValue(this.activeScene.settings.viewportY);
                }
                this.activeScene.dirty = true;
                this.refreshCanvas();
                return;
            }

            if (this.dragInfo.isPanning) {
                // Camera panning
                const delta = screenPos.subtract(this.dragInfo.startPos);
                this.camera.position = this.dragInfo.cameraStartPos.add(delta);
                this.refreshCanvas();
            } else if (this.dragInfo.object) {
                // Object dragging
                const worldPos = this.screenToWorldPosition(screenPos);
                const delta = worldPos.subtract(this.dragInfo.startPos);

                this.dragInfo.object.position = this.dragInfo.objectStartPos.add(delta);

                if (this.grid.snapToGrid) {
                    this.dragInfo.object.position = this.grid.snapPosition(this.dragInfo.object.position);
                }

                if (this.inspector) {
                    this.inspector.updateTransformValues();
                }

                this.refreshCanvas();
            }
        } else if (e.touches.length === 2 && this.pinchData) {
            // Handle pinch zoom
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];

            const rect = this.canvas.getBoundingClientRect();
            const pos1 = new Vector2(
                (touch1.clientX - rect.left) * (this.canvas.width / rect.width),
                (touch1.clientY - rect.top) * (this.canvas.height / rect.height)
            );
            const pos2 = new Vector2(
                (touch2.clientX - rect.left) * (this.canvas.width / rect.width),
                (touch2.clientY - rect.top) * (this.canvas.height / rect.height)
            );

            const currentDistance = pos1.distance(pos2);
            const zoomFactor = currentDistance / this.pinchData.initialDistance;
            const newZoom = Math.max(0.1, Math.min(5, this.pinchData.initialZoom * zoomFactor));

            // Apply zoom centered on pinch point
            const oldZoom = this.camera.zoom;
            this.camera.zoom = newZoom;

            // Adjust camera position to keep pinch center fixed
            const center = this.pinchData.center;
            const dx = (center.x - this.camera.position.x);
            const dy = (center.y - this.camera.position.y);

            this.camera.position.x = center.x - dx * (this.camera.zoom / oldZoom);
            this.camera.position.y = center.y - dy * (this.camera.zoom / oldZoom);

            this.updateZoomLevelDisplay();
            this.refreshCanvas();
        }
    }

    /**
     * Handle touch end events for panning
     */
    handleTouchEnd(e) {
        // Prevent default behavior
        //e.preventDefault();

        if (this.dragInfo.dragging) {
            // --- End viewport dragging ---
            if (this.viewportInteraction.dragging) {
                this.viewportInteraction.dragging = false;
                this.viewportInteraction.startPos = null;
                this.viewportInteraction.initialViewport = null;
                if (this.activeScene) this.activeScene.dirty = true;
                this.refreshCanvas();
                return;
            }

            // Check if this was a tap (short duration, minimal movement)
            if (this.touchData && !this.touchData.moved) {
                const duration = Date.now() - this.touchData.startTime;
                if (duration < 300) {
                    // This was a tap - handle selection
                    const worldPos = this.touchData.startWorldPos;
                    const clickedObj = this.findObjectAtPosition(worldPos);

                    if (clickedObj && this.hierarchy) {
                        this.hierarchy.selectGameObject(clickedObj);
                    } else if (this.hierarchy && this.hierarchy.selectedObject) {
                        // Deselect if tapping empty space
                        this.hierarchy.selectedObject.setSelected(false);
                        this.hierarchy.selectedObject = null;

                        // Update hierarchy UI
                        document.querySelectorAll('.hierarchy-item').forEach(item => {
                            item.classList.remove('selected');
                        });
                    }
                }
            }

            // Reset drag state
            this.dragInfo.dragging = false;
            this.dragInfo.isPanning = false;
            this.dragInfo.object = null;
            this.dragInfo.dragMode = null;
        }

        // Reset pinch data
        if (this.pinchData) {
            this.pinchData = null;
        }

        // Reset touch data
        if (this.touchData) {
            this.touchData = null;
        }

        this.refreshCanvas();
    }

    setActiveScene(scene) {
        this.activeScene = scene;
        this.scene = scene; // Keep these in sync

        window.activeScene = scene;

        // Deselect any selected game objects
        if (this.hierarchy && this.hierarchy.selectedObject) {
            this.hierarchy.selectedObject.setSelected(false);
            this.hierarchy.selectedObject = null;

            // Update hierarchy UI
            document.querySelectorAll('.hierarchy-item').forEach(item => {
                item.classList.remove('selected');
            });

            // Show "no object selected" in inspector
            if (this.inspector) {
                this.inspector.showNoObjectMessage();
            }
        }

        // Update references in hierarchy and inspector
        if (this.hierarchy) {
            this.hierarchy.scene = scene;
            this.hierarchy.refreshHierarchy();
        }

        // Update window title to show current scene
        document.title = `Dark Matter JS - ${scene.name}${scene.dirty ? '*' : ''}`;

        this.refreshCanvas();
    }

    drawSceneViewport() {
        if (!this.activeScene) return;

        const settings = this.activeScene.settings;

        // Draw viewport rectangle using its actual coordinates
        this.ctx.save();

        // Make sure it's visible with a semi-transparent fill
        this.ctx.fillStyle = 'rgba(0, 100, 0, 0.05)';
        this.ctx.fillRect(
            settings.viewportX || 0,
            settings.viewportY || 0,
            settings.viewportWidth,
            settings.viewportHeight
        );

        // Draw the border with a dashed line
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 1.5 / this.camera.zoom;
        this.ctx.setLineDash([5 / this.camera.zoom, 5 / this.camera.zoom]);
        this.ctx.strokeRect(
            settings.viewportX || 0,
            settings.viewportY || 0,
            settings.viewportWidth,
            settings.viewportHeight
        );
        this.ctx.setLineDash([]);

        // Get mouse position for hover effects
        const worldMouse = this.mousePosition;

        // Define base handle size and hover effect
        const handleSize = 10 / this.camera.zoom;
        const hoverScale = 1.3;

        // Check if mouse is hovering over handles
        const isOverMoveHandle = this.isOnViewportMoveHandle(worldMouse);
        const isOverSettingsHandle = this.isOnViewportSettingsHandle(worldMouse);

        // Update target scales based on hover state
        this.viewportAnimation.targetMoveScale = isOverMoveHandle ? hoverScale : 1.0;
        this.viewportAnimation.targetSettingsScale = isOverSettingsHandle ? hoverScale : 1.0;

        // Smoothly interpolate current scale toward target scale
        this.viewportAnimation.moveHandleScale += (this.viewportAnimation.targetMoveScale -
            this.viewportAnimation.moveHandleScale) *
            this.viewportAnimation.animationSpeed;

        this.viewportAnimation.settingsHandleScale += (this.viewportAnimation.targetSettingsScale -
            this.viewportAnimation.settingsHandleScale) *
            this.viewportAnimation.animationSpeed;

        // Calculate actual sizes with animation
        const actualMoveSize = handleSize * this.viewportAnimation.moveHandleScale;
        const actualSettingsSize = handleSize * this.viewportAnimation.settingsHandleScale;

        // Draw move handle in the top-left corner
        const moveX = (settings.viewportX || 0) + handleSize;
        const moveY = (settings.viewportY || 0) + handleSize;

        // Draw move handle background with color transition
        const moveHandleNormal = '#4CAF50';
        const moveHandleHover = '#5CCC60';
        const moveHandleColor = this.blendColors(moveHandleNormal, moveHandleHover,
            (this.viewportAnimation.moveHandleScale - 1.0) / (hoverScale - 1.0));

        this.ctx.fillStyle = moveHandleColor;
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 1 / this.camera.zoom;

        this.ctx.beginPath();
        this.ctx.arc(moveX, moveY, actualMoveSize, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Draw move icon (four-direction arrows)
        this.ctx.fillStyle = '#FFFFFF';
        const iconSize = actualMoveSize * 0.7;

        // Draw arrows for move handle
        this.ctx.save();
        this.ctx.translate(moveX, moveY);

        // Draw four arrows pointing in different directions
        for (let i = 0; i < 4; i++) {
            this.ctx.save();
            this.ctx.rotate(i * Math.PI / 2);

            // Draw arrow
            this.ctx.beginPath();
            this.ctx.moveTo(0, -iconSize * 0.3);
            this.ctx.lineTo(iconSize * 0.5, -iconSize * 0.7);
            this.ctx.lineTo(0, -iconSize);
            this.ctx.lineTo(-iconSize * 0.5, -iconSize * 0.7);
            this.ctx.closePath();
            this.ctx.fill();

            this.ctx.restore();
        }

        this.ctx.restore();

        // Draw settings gear in the top-right corner
        const settingsX = (settings.viewportX || 0) + settings.viewportWidth - handleSize;
        const settingsY = (settings.viewportY || 0) + handleSize;

        // Draw settings handle background with color transition
        const settingsHandleNormal = '#4CAF50';
        const settingsHandleHover = '#5CCC60';
        const settingsHandleColor = this.blendColors(settingsHandleNormal, settingsHandleHover,
            (this.viewportAnimation.settingsHandleScale - 1.0) / (hoverScale - 1.0));

        this.ctx.fillStyle = settingsHandleColor;
        this.ctx.beginPath();
        this.ctx.arc(settingsX, settingsY, actualSettingsSize, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Draw gear icon
        this.ctx.fillStyle = '#FFFFFF';
        this.drawGearIcon(settingsX, settingsY, actualSettingsSize * 0.7);

        // Add a label in the top-middle
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        const labelX = (settings.viewportX || 0) + settings.viewportWidth / 2;
        const labelY = (settings.viewportY || 0) + handleSize * 2.5;
        const labelWidth = 120 / this.camera.zoom;
        const labelHeight = 20 / this.camera.zoom;

        this.ctx.fillRect(
            labelX - labelWidth / 2,
            labelY - labelHeight / 2,
            labelWidth,
            labelHeight
        );

        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = `${12 / this.camera.zoom}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            `${settings.viewportWidth} x ${settings.viewportHeight}`,
            labelX,
            labelY
        );

        this.ctx.restore();
    }

    /**
     * Blend two hex colors using a factor (0-1)
     * @param {string} color1 - First color hex code
     * @param {string} color2 - Second color hex code
     * @param {number} factor - Blend factor (0 = color1, 1 = color2)
     * @returns {string} - Blended color
     */
    blendColors(color1, color2, factor) {
        // Ensure factor is between 0 and 1
        factor = Math.max(0, Math.min(1, factor));

        // Convert hex to RGB
        const hexToRgb = hex => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return [r, g, b];
        };

        // Convert RGB to hex
        const rgbToHex = rgb => {
            return '#' + rgb.map(v => {
                const hex = Math.round(v).toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            }).join('');
        };

        // Get RGB values for colors
        const c1 = hexToRgb(color1);
        const c2 = hexToRgb(color2);

        // Blend colors
        const blended = c1.map((v, i) => v + factor * (c2[i] - v));

        return rgbToHex(blended);
    }

    drawGearIcon(x, y, size) {
        const outerRadius = size;
        const innerRadius = size * 0.6;
        const toothCount = 8;

        this.ctx.beginPath();
        for (let i = 0; i < toothCount; i++) {
            const angle = (Math.PI * 2 * i) / toothCount;
            const nextAngle = (Math.PI * 2 * (i + 0.5)) / toothCount;
            const nextNextAngle = (Math.PI * 2 * (i + 1)) / toothCount;

            // Outer point
            this.ctx.lineTo(
                x + Math.cos(angle) * outerRadius,
                y + Math.sin(angle) * outerRadius
            );

            // Inner point
            this.ctx.lineTo(
                x + Math.cos(nextAngle) * innerRadius,
                y + Math.sin(nextAngle) * innerRadius
            );
        }
        this.ctx.closePath();
        this.ctx.fill();

        // Draw a small circle in the center
        this.ctx.beginPath();
        this.ctx.arc(x, y, size * 0.2, 0, Math.PI * 2);
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fill();
    }

    drawMouseCoordinates() {
        const padding = 10;
        const backgroundHeight = 24;
        const backgroundWidth = 120;
        const fontSize = 12;

        // Format coordinates with 2 decimal places
        const xText = `X: ${this.mousePosition.x.toFixed(2)}`;
        const yText = `Y: ${this.mousePosition.y.toFixed(2)}`;

        // Position in top-right corner
        const x = this.canvas.width - backgroundWidth - padding;
        const y = padding;

        // Draw background
        this.ctx.fillStyle = 'rgba(20, 20, 20, 0.7)';
        this.ctx.fillRect(x, y, backgroundWidth, backgroundHeight);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, backgroundWidth, backgroundHeight);

        // Draw text
        this.ctx.font = `${fontSize}px monospace`;
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';

        // X coordinate in same color as X axis handle
        this.ctx.fillStyle = this.transformHandles.xColor;
        this.ctx.fillText(xText, x + 10, y + backgroundHeight / 2 - 2);

        // Y coordinate in same color as Y axis handle
        this.ctx.fillStyle = this.transformHandles.yColor;
        this.ctx.fillText(yText, x + 70, y + backgroundHeight / 2 - 2);
    }

    drawTransformHandles(gameObject) {
        const worldPos = gameObject.getWorldPosition();
        const handleSize = this.transformHandles.size / this.camera.zoom;
        const arrowSize = this.transformHandles.arrowSize / this.camera.zoom;
        const rotationRadius = this.transformHandles.rotationRadius / this.camera.zoom;

        // Draw rotation circle
        this.ctx.beginPath();
        this.ctx.arc(worldPos.x, worldPos.y, rotationRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = this.transformHandles.rotationColor;
        this.ctx.lineWidth = 2 / this.camera.zoom;
        this.ctx.setLineDash([5 / this.camera.zoom, 5 / this.camera.zoom]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw X axis
        this.ctx.beginPath();
        this.ctx.moveTo(worldPos.x, worldPos.y);
        this.ctx.lineTo(worldPos.x + handleSize, worldPos.y);
        this.ctx.strokeStyle = this.transformHandles.xColor;
        this.ctx.lineWidth = 2 / this.camera.zoom;
        this.ctx.stroke();

        // Draw X arrow head
        this.ctx.beginPath();
        this.ctx.moveTo(worldPos.x + handleSize, worldPos.y);
        this.ctx.lineTo(worldPos.x + handleSize - arrowSize, worldPos.y - arrowSize / 2);
        this.ctx.lineTo(worldPos.x + handleSize - arrowSize, worldPos.y + arrowSize / 2);
        this.ctx.closePath();
        this.ctx.fillStyle = this.transformHandles.xColor;
        this.ctx.fill();

        // Draw Y axis
        this.ctx.beginPath();
        this.ctx.moveTo(worldPos.x, worldPos.y);
        this.ctx.lineTo(worldPos.x, worldPos.y - handleSize);
        this.ctx.strokeStyle = this.transformHandles.yColor;
        this.ctx.lineWidth = 2 / this.camera.zoom;
        this.ctx.stroke();

        // Draw Y arrow head
        this.ctx.beginPath();
        this.ctx.moveTo(worldPos.x, worldPos.y - handleSize);
        this.ctx.lineTo(worldPos.x - arrowSize / 2, worldPos.y - handleSize + arrowSize);
        this.ctx.lineTo(worldPos.x + arrowSize / 2, worldPos.y - handleSize + arrowSize);
        this.ctx.closePath();
        this.ctx.fillStyle = this.transformHandles.yColor;
        this.ctx.fill();

        // Draw rotation handle if dragging rotation
        if (this.dragInfo.dragMode === 'rotate') {
            const currentAngle = Math.atan2(
                this.mousePosition.y - worldPos.y,
                this.mousePosition.x - worldPos.x
            );
            this.ctx.beginPath();
            this.ctx.arc(worldPos.x, worldPos.y, rotationRadius,
                this.transformHandles.rotationStartAngle,
                currentAngle);
            this.ctx.strokeStyle = this.transformHandles.rotationColor;
            this.ctx.lineWidth = 3 / this.camera.zoom;
            this.ctx.stroke();
        }

        // Draw center handle (white box) for free movement
        const centerBoxSize = this.transformHandles.centerBoxSize / this.camera.zoom;
        this.ctx.beginPath();
        this.ctx.rect(
            worldPos.x - centerBoxSize / 2,
            worldPos.y - centerBoxSize / 2,
            centerBoxSize,
            centerBoxSize
        );

        if (this.shiftKeyDown || this.dragInfo.dragMode === 'free') {
            // Highlight when shift is down or in free move mode
            this.ctx.fillStyle = '#FFFFFF';
        } else {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        }
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 1 / this.camera.zoom;
        this.ctx.fill();
        this.ctx.stroke();

        // Highlight the active axis if dragging
        if (this.dragInfo.dragging && this.dragInfo.object === gameObject) {
            const activeHandleColor = this.dragInfo.dragMode === 'x' ?
                this.transformHandles.xColor :
                this.transformHandles.yColor;

            // Draw a circle around the handle being dragged
            if (this.dragInfo.dragMode === 'x' || this.dragInfo.dragMode === 'y') {
                const handlePos = this.dragInfo.dragMode === 'x' ?
                    new Vector2(worldPos.x + handleSize, worldPos.y) :
                    new Vector2(worldPos.x, worldPos.y - handleSize);

                this.ctx.beginPath();
                this.ctx.arc(handlePos.x, handlePos.y, arrowSize * 1.5, 0, Math.PI * 2);
                this.ctx.strokeStyle = activeHandleColor;
                this.ctx.lineWidth = 1.5 / this.camera.zoom;
                this.ctx.stroke();
            } else if (this.dragInfo.dragMode === 'free') {
                // Highlight the center box when in free move mode
                this.ctx.beginPath();
                this.ctx.rect(
                    worldPos.x - centerBoxSize / 2 - 2 / this.camera.zoom,
                    worldPos.y - centerBoxSize / 2 - 2 / this.camera.zoom,
                    centerBoxSize + 4 / this.camera.zoom,
                    centerBoxSize + 4 / this.camera.zoom
                );
                this.ctx.strokeStyle = '#FFFFFF';
                this.ctx.lineWidth = 1.5 / this.camera.zoom;
                this.ctx.stroke();
            }
        }
    }

    /**
     * Get the correct mouse position relative to the canvas, accounting for CSS scaling
     * @param {MouseEvent} e - The mouse event
     * @returns {Vector2} - The corrected mouse position
     */
    getAdjustedMousePosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return new Vector2(
            (e.clientX - rect.left) * scaleX,
            (e.clientY - rect.top) * scaleY
        );
    }

    handleMouseDown(e) {
        if (e.button === 0) { // Left click// Use the adjusted mouse position
            const screenPos = this.getAdjustedMousePosition(e);
            const worldPos = this.screenToWorldPosition(screenPos);

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

            // Check if clicking on settings gear
            if (this.isOnViewportSettingsHandle(worldPos)) {
                this.showViewportSettings();
                return;
            }

            // Check for transform handle interaction if an object is selected
            if (this.hierarchy && this.hierarchy.selectedObject) {
                const selectedObj = this.hierarchy.selectedObject;
                const objPos = selectedObj.getWorldPosition();
                const handleSize = this.transformHandles.size / this.camera.zoom;
                const rotationRadius = this.transformHandles.rotationRadius / this.camera.zoom;
                const centerBoxSize = this.transformHandles.centerBoxSize / this.camera.zoom;

                // Check rotation handle
                const toMouse = worldPos.subtract(objPos);
                const distanceFromCenter = toMouse.magnitude();
                if (Math.abs(distanceFromCenter - rotationRadius) < 10 / this.camera.zoom) {
                    this.dragInfo.dragging = true;
                    this.dragInfo.object = selectedObj;
                    this.dragInfo.startPos = worldPos;
                    this.dragInfo.dragMode = 'rotate';
                    this.transformHandles.rotationStartAngle = Math.atan2(
                        toMouse.y,
                        toMouse.x
                    );
                    this.dragInfo.startAngle = selectedObj.angle;
                    return;
                }

                // Check X handle first
                const xHandlePos = new Vector2(objPos.x + handleSize, objPos.y);
                if (worldPos.distance(xHandlePos) < this.transformHandles.arrowSize * 1.5 / this.camera.zoom) {
                    this.dragInfo.dragging = true;
                    this.dragInfo.object = selectedObj;
                    this.dragInfo.startPos = worldPos;
                    this.dragInfo.objectStartPos = selectedObj.position.clone();
                    this.dragInfo.dragMode = 'x';
                    this.transformHandles.activeAxis = 'x';
                    return;
                }

                // Check Y handle
                const yHandlePos = new Vector2(objPos.x, objPos.y - handleSize);
                if (worldPos.distance(yHandlePos) < this.transformHandles.arrowSize * 1.5 / this.camera.zoom) {
                    this.dragInfo.dragging = true;
                    this.dragInfo.object = selectedObj;
                    this.dragInfo.startPos = worldPos;
                    this.dragInfo.objectStartPos = selectedObj.position.clone();
                    this.dragInfo.dragMode = 'y';
                    this.transformHandles.activeAxis = 'y';
                    return;
                }

                // Check center box (always enable free movement if shift is down)
                if (this.shiftKeyDown || (
                    worldPos.x > objPos.x - centerBoxSize / 2 &&
                    worldPos.x < objPos.x + centerBoxSize / 2 &&
                    worldPos.y > objPos.y - centerBoxSize / 2 &&
                    worldPos.y < objPos.y + centerBoxSize / 2
                )) {
                    this.dragInfo.dragging = true;
                    this.dragInfo.object = selectedObj;
                    this.dragInfo.startPos = worldPos;
                    this.dragInfo.objectStartPos = selectedObj.position.clone();
                    this.dragInfo.dragMode = 'free';
                    return;
                }
            }

            // If not a transform handle interaction, check for object selection
            const clickedObj = this.findObjectAtPosition(worldPos);

            if (clickedObj) {
                // Start dragging the object in free mode
                this.dragInfo.dragging = true;
                this.dragInfo.object = clickedObj;
                this.dragInfo.startPos = worldPos;
                this.dragInfo.objectStartPos = clickedObj.position.clone();
                this.dragInfo.dragMode = 'free';

                // Also select the object
                if (this.hierarchy) {
                    this.hierarchy.selectGameObject(clickedObj);
                }
            } else {
                // Deselect if clicking empty space
                if (this.hierarchy && this.hierarchy.selectedObject) {
                    this.hierarchy.selectedObject.setSelected(false);
                    this.hierarchy.selectedObject = null;

                    // Update hierarchy UI
                    document.querySelectorAll('.hierarchy-item').forEach(item => {
                        item.classList.remove('selected');
                    });

                    // Show "no object selected" in inspector
                    if (this.inspector) {
                        this.inspector.showNoObjectMessage();
                    }

                    this.refreshCanvas();
                }
            }
        } else if (e.button === 1) { // Middle click
            // Prevent default scrolling behavior
            e.preventDefault();

            // Start panning the camera
            this.dragInfo.dragging = true;
            this.dragInfo.isPanning = true;
            this.dragInfo.startPos = new Vector2(e.offsetX, e.offsetY);
            this.dragInfo.cameraStartPos = this.camera.position instanceof Vector2 ?
                this.camera.position.clone() :
                new Vector2(this.camera.position.x, this.camera.position.y);
        }
    }

    handleMouseMove(e) {
        //if (!this.dragInfo.dragging) return;

        const screenPos = this.getAdjustedMousePosition(e);
        const worldPos = this.screenToWorldPosition(screenPos);
        this.mousePosition = worldPos.clone();

        this.updateCursor(worldPos);

        // Handle viewport dragging first
        if (this.viewportInteraction.dragging) {
            e.preventDefault(); // Prevent selection during drag

            document.body.classList.add('viewport-dragging');

            const currentPos = worldPos;
            const delta = currentPos.subtract(this.viewportInteraction.startPos);

            // Update viewport position
            this.activeScene.settings.viewportX = this.viewportInteraction.initialViewport.x + delta.x;
            this.activeScene.settings.viewportY = this.viewportInteraction.initialViewport.y + delta.y;

            // Snap to grid if enabled
            if (this.grid.snapToGrid) {
                this.activeScene.settings.viewportX = this.grid.snapValue(this.activeScene.settings.viewportX);
                this.activeScene.settings.viewportY = this.grid.snapValue(this.activeScene.settings.viewportY);
            }

            // Mark scene as modified
            this.activeScene.dirty = true;

            // Sync to game if running
            if (this.engine && this.engine.running) {
                syncEditorToGame();
            }

            this.refreshCanvas();
            return;
        }

        // If not dragging, just refresh canvas to update hover effects on handles
        if (!this.dragInfo.dragging) {
            this.refreshCanvas();
            return;
        }

        if (this.dragInfo.dragMode === 'rotate') {
            const objPos = this.dragInfo.object.getWorldPosition();
            const currentAngle = Math.atan2(
                worldPos.y - objPos.y,
                worldPos.x - objPos.x
            );
            const startAngle = this.transformHandles.rotationStartAngle;
            const angleDiff = (currentAngle - startAngle) * (180 / Math.PI);

            this.dragInfo.object.angle = this.dragInfo.startAngle + angleDiff;

            // Update inspector if available
            if (this.inspector) {
                this.inspector.updateTransformValues();
            }

            this.refreshCanvas();
            return;
        } else if (this.dragInfo.isPanning) {
            // Pan the camera using adjusted coordinates
            const currentPos = this.getAdjustedMousePosition(e);
            const delta = new Vector2(
                currentPos.x - this.dragInfo.startPos.x,
                currentPos.y - this.dragInfo.startPos.y
            );

            this.camera.position = this.dragInfo.cameraStartPos.add(delta);
            this.refreshCanvas();
        } else if (this.dragInfo.object) {
            // Always use adjusted mouse position for correct zoom handling
            const screenPos = this.getAdjustedMousePosition(e);
            const worldPos = this.screenToWorldPosition(screenPos);

            // Convert world position to local position relative to parent
            let localPos = worldPos;
            if (this.dragInfo.object.parent) {
                localPos = this.dragInfo.object.parent.worldToLocalPosition(worldPos);
            }

            // Calculate delta in local space
            let newPosition = localPos;

            // If dragging started from a specific offset, preserve it
            if (this.dragInfo.objectStartPos) {
                const startWorldPos = this.dragInfo.object.parent
                    ? this.dragInfo.object.parent.worldToLocalPosition(this.dragInfo.startPos)
                    : this.dragInfo.startPos;
                const offset = this.dragInfo.objectStartPos.subtract(startWorldPos);

                newPosition = newPosition.add(offset);
            }

            // Axis constraints
            if (!this.shiftKeyDown && this.dragInfo.dragMode === 'x') {
                newPosition.y = this.dragInfo.object.position.y;
            } else if (!this.shiftKeyDown && this.dragInfo.dragMode === 'y') {
                newPosition.x = this.dragInfo.object.position.x;
            }

            // Apply movement to object
            this.dragInfo.object.position = newPosition;

            // Snap to grid if enabled
            if (this.grid.snapToGrid) {
                this.dragInfo.object.position = this.grid.snapPosition(this.dragInfo.object.position);
            }

            this.refreshCanvas();
        }

        if (this.inspector) {
            this.inspector.updateTransformValues();
        }
    }

    isOnViewportMoveHandle(worldPos) {
        if (!this.activeScene) return false;

        const settings = this.activeScene.settings;
        const handleSize = 10 / this.camera.zoom;
        const moveX = (settings.viewportX || 0) + handleSize;
        const moveY = (settings.viewportY || 0) + handleSize;

        // Slightly larger detection radius for easier interaction
        return worldPos.distance(new Vector2(moveX, moveY)) <= handleSize * 1.5;
    }

    isOnViewportSettingsHandle(worldPos) {
        if (!this.activeScene) return false;

        const settings = this.activeScene.settings;
        const handleSize = 10 / this.camera.zoom;
        const settingsX = (settings.viewportX || 0) + settings.viewportWidth - handleSize;
        const settingsY = (settings.viewportY || 0) + handleSize;

        // Slightly larger detection radius for easier interaction
        return worldPos.distance(new Vector2(settingsX, settingsY)) <= handleSize * 1.5;
    }

    showViewportSettings() {
        const settings = this.activeScene.settings;

        // Create a modal dialog
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Viewport Settings</h3>
                    <span class="close-button">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="form-row">
                        <label>Width:</label>
                        <input type="number" id="viewport-width" value="${settings.viewportWidth}" min="1" step="1">
                    </div>
                    <div class="form-row">
                        <label>Height:</label>
                        <input type="number" id="viewport-height" value="${settings.viewportHeight}" min="1" step="1">
                    </div>
                    <div class="form-row">
                        <label>X Position:</label>
                        <input type="number" id="viewport-x" value="${settings.viewportX || 0}" step="1">
                    </div>
                    <div class="form-row">
                        <label>Y Position:</label>
                        <input type="number" id="viewport-y" value="${settings.viewportY || 0}" step="1">
                    </div>
                    <div class="form-row checkbox-row">
                        <label>Snap to Grid:</label>
                        <input type="checkbox" id="viewport-snap" ${this.grid.snapToGrid ? 'checked' : ''}>
                    </div>
                    <div class="form-row">
                        <label>Background Color:</label>
                        <input type="color" id="viewport-bg-color" value="${settings.backgroundColor || '#000000'}">
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="reset-viewport">Reset to Origin</button>
                    <button id="cancel-viewport">Cancel</button>
                    <button id="save-viewport">Apply</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event handlers
        const closeBtn = modal.querySelector('.close-button');
        const cancelBtn = modal.querySelector('#cancel-viewport');
        const saveBtn = modal.querySelector('#save-viewport');
        const resetBtn = modal.querySelector('#reset-viewport');

        const closeModal = () => {
            document.body.removeChild(modal);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        saveBtn.addEventListener('click', () => {
            // Get values from form
            const width = parseInt(modal.querySelector('#viewport-width').value) || 800;
            const height = parseInt(modal.querySelector('#viewport-height').value) || 600;
            const x = parseInt(modal.querySelector('#viewport-x').value) || 0;
            const y = parseInt(modal.querySelector('#viewport-y').value) || 0;
            const snapToGrid = modal.querySelector('#viewport-snap').checked;
            const bgColor = modal.querySelector('#viewport-bg-color').value;

            // Update settings
            settings.viewportWidth = width;
            settings.viewportHeight = height;
            settings.viewportX = x;
            settings.viewportY = y;
            settings.backgroundColor = bgColor;

            // Update grid snapping
            this.grid.snapToGrid = snapToGrid;

            // Mark scene as modified
            this.activeScene.dirty = true;

            // Close modal and refresh canvas
            closeModal();
            this.refreshCanvas();
        });

        resetBtn.addEventListener('click', () => {
            // Reset viewport to origin
            modal.querySelector('#viewport-x').value = 0;
            modal.querySelector('#viewport-y').value = 0;
        });
    }

    updateCursor(worldPos) {
        // Check viewport handles first
        if (this.isOnViewportMoveHandle(worldPos)) {
            this.canvas.style.cursor = 'move';
            return;
        }

        if (this.isOnViewportSettingsHandle(worldPos)) {
            this.canvas.style.cursor = 'pointer';
            return;
        }

        // Check if mouse is over a transform handle and change cursor accordingly
        const selectedObj = this.hierarchy.selectedObject;
        if (!selectedObj) {
            this.canvas.style.cursor = 'default';
            return;
        }

        const objPos = selectedObj.getWorldPosition();
        const handleSize = this.transformHandles.size / this.camera.zoom;
        const centerBoxSize = this.transformHandles.centerBoxSize / this.camera.zoom;

        // Check X handle
        const xHandlePos = new Vector2(objPos.x + handleSize, objPos.y);
        if (worldPos.distance(xHandlePos) < this.transformHandles.arrowSize * 1.5 / this.camera.zoom) {
            this.canvas.style.cursor = 'ew-resize';
            return;
        }

        // Check Y handle
        const yHandlePos = new Vector2(objPos.x, objPos.y - handleSize);
        if (worldPos.distance(yHandlePos) < this.transformHandles.arrowSize * 1.5 / this.camera.zoom) {
            this.canvas.style.cursor = 'ns-resize';
            return;
        }

        // Check center box or if shift is down
        if (this.shiftKeyDown || (
            worldPos.x > objPos.x - centerBoxSize / 2 &&
            worldPos.x < objPos.x + centerBoxSize / 2 &&
            worldPos.y > objPos.y - centerBoxSize / 2 &&
            worldPos.y < objPos.y + centerBoxSize / 2
        )) {
            this.canvas.style.cursor = 'move';
            return;
        }

        this.canvas.style.cursor = 'default';
    }

    handleMouseUp(e) {
        document.body.classList.remove('viewport-dragging');

        // Clear viewport interaction state
        if (this.viewportInteraction.dragging) {
            this.viewportInteraction.dragging = false;
            this.viewportInteraction.startPos = null;
            this.viewportInteraction.initialViewport = null;

            // Mark scene as modified
            if (this.activeScene) {
                this.activeScene.dirty = true;
            }
        }

        this.dragInfo.dragging = false;
        this.dragInfo.isPanning = false;
        this.dragInfo.object = null;
        this.dragInfo.dragMode = null;
        this.transformHandles.activeAxis = null;
    }

    handleMouseWheel(e) {
        // Prevent default scrolling
        e.preventDefault();

        // Get the cursor position in screen space
        const cursorPos = this.getAdjustedMousePosition(e);

        // Calculate new zoom level
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1; // 0.9 for zoom out, 1.1 for zoom in
        const oldZoom = this.camera.zoom;
        this.camera.zoom = Math.max(0.1, Math.min(5, this.camera.zoom * zoomFactor));

        // Adjust camera position to keep the point under cursor fixed
        // This is the key calculation:
        // We want to adjust the camera so that the world point under the cursor stays fixed
        const dx = (cursorPos.x - this.camera.position.x);
        const dy = (cursorPos.y - this.camera.position.y);

        this.camera.position.x = cursorPos.x - dx * (this.camera.zoom / oldZoom);
        this.camera.position.y = cursorPos.y - dy * (this.camera.zoom / oldZoom);

        // Refresh the canvas to show the new view
        this.refreshCanvas();
    }

    handleContextMenu(e) {
        e.preventDefault();

        const screenPos = this.getAdjustedMousePosition(e);
        const worldPos = this.screenToWorldPosition(screenPos);

        const clickedObj = this.findObjectAtPosition(worldPos); // Moved this up

        let menuItems = [];

        if (clickedObj) {
            // Select the object first
            if (this.hierarchy) {
                this.hierarchy.selectGameObject(clickedObj);
            }

            // Show object-specific context menu
            menuItems = [
                {
                    label: 'Rename',
                    action: () => {
                        if (this.hierarchy) this.hierarchy.promptRenameGameObject(clickedObj);
                    }
                },
                {
                    label: 'Duplicate',
                    action: () => {
                        if (this.hierarchy) this.hierarchy.duplicateSelectedGameObject();
                    }
                },
                {
                    label: 'Delete',
                    action: () => {
                        if (this.hierarchy) this.hierarchy.removeSelectedGameObject();
                    }
                },
                { label: '──────────', disabled: true },
                {
                    label: 'Add Child GameObject',
                    action: () => {
                        if (this.hierarchy) {
                            const child = new GameObject('New GameObject');
                            clickedObj.addChild(child);
                            this.hierarchy.refreshHierarchy();
                            this.hierarchy.selectGameObject(child);
                            this.refreshCanvas();
                        }
                    }
                }
            ];
        } else {
            // Show general context menu
            menuItems = [
                {
                    label: 'Add GameObject at Cursor',
                    action: () => {
                        if (this.hierarchy) {
                            this.hierarchy.addGameObject("New GameObject", worldPos); // Use click position
                        }
                    }
                },
                {
                    label: 'Add GameObject at View Center',
                    action: () => {
                        if (this.hierarchy) {
                            const centerViewPos = this.getWorldCenterOfView();
                            this.hierarchy.addGameObject("New GameObject", centerViewPos);
                        }
                    }
                },
                {
                    label: 'Reset Camera',
                    action: () => {
                        this.resetCamera();
                    }
                }
            ];
        }

        this.showContextMenu(e, menuItems);
    }

    /**
     * Display a context menu at the mouse position
     */
    showContextMenu(e, menuItems) {
        // Remove any existing context menus
        this.closeContextMenu();

        // Create the menu
        const menu = document.createElement('div');
        menu.className = 'context-menu';

        // Add menu items
        menu.innerHTML = menuItems.map(item => {
            if (item.disabled && item.label.includes('──────────')) {
                // Handle separator line
                return `<div class="context-menu-separator"></div>`;
            }
            return `<div class="context-menu-item${item.disabled ? ' disabled' : ''}">${item.label}</div>`;
        }).join('');

        // Position the menu
        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;

        // Add to document
        document.body.appendChild(menu);

        // Setup click handlers for menu items
        const menuElements = menu.querySelectorAll('.context-menu-item:not(.disabled)');
        menuElements.forEach((element, index) => {
            const menuItem = menuItems.filter(item => !item.disabled || (item.disabled && !item.label.includes('──────────')))[index];
            if (menuItem && menuItem.action) {
                element.addEventListener('click', () => {
                    menuItem.action();
                    this.closeContextMenu();
                });
            }
        });

        // Store reference to the menu
        this.contextMenu = menu;

        // Use a separate handler function for document click
        this.documentClickHandler = this.handleDocumentClick.bind(this);

        // Add event listener with a slight delay to prevent immediate closing
        setTimeout(() => {
            document.addEventListener('click', this.documentClickHandler);
            document.addEventListener('contextmenu', this.documentClickHandler);
        }, 10);
    }

    closeContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.remove();
            this.contextMenu = null;

            // Remove event listeners - important to use the same function reference
            if (this.documentClickHandler) {
                document.removeEventListener('click', this.documentClickHandler);
                document.removeEventListener('contextmenu', this.documentClickHandler);
            }
        }
    }

    handleDocumentClick(e) {
        if (this.contextMenu && !this.contextMenu.contains(e.target)) {
            this.closeContextMenu();
        }
    }

    /**
     * Find the topmost GameObject at a specific world position
     */
    findObjectAtPosition(worldPos) {
        // Search from top to bottom (reverse draw order)
        const sortedObjects = this.getAllGameObjects().sort((a, b) => b.depth - a.depth);

        return sortedObjects.find(obj => {
            if (!obj.active) return false;

            // Simple circle hitbox check
            const objPos = obj.getWorldPosition();
            const distance = worldPos.distance(objPos);
            return distance <= 20; // 20 is the circle radius
        });
    }

    /**
     * Get all GameObjects in the scene (including children)
     */
    getAllGameObjects() {
        return this.scene.gameObjects.reduce((all, obj) => {
            return [...all, obj, ...this.getChildrenRecursive(obj)];
        }, []);
    }

    /**
     * Get all children of a GameObject recursively
     */
    getChildrenRecursive(obj) {
        return obj.children.reduce((all, child) => {
            return [...all, child, ...this.getChildrenRecursive(child)];
        }, []);
    }

    /**
     * Convert screen coordinates to world coordinates
     */
    screenToWorldPosition(screenPos) {
        return new Vector2(
            (screenPos.x - this.camera.position.x) / this.camera.zoom,
            (screenPos.y - this.camera.position.y) / this.camera.zoom
        );
    }

    /**
     * Convert world coordinates to screen coordinates
     */
    worldToScreenPosition(worldPos) {
        return new Vector2(
            worldPos.x * this.camera.zoom + this.camera.position.x,
            worldPos.y * this.camera.zoom + this.camera.position.y
        );
    }

    /**
     * Reset the camera to the default position
     */
    resetCamera() {
        // Save old position and zoom for animation
        const oldPosition = this.camera.position instanceof Vector2 ?
            this.camera.position.clone() :
            new Vector2(this.camera.position.x, this.camera.position.y);

        const oldZoom = this.camera.zoom;
        const targetPosition = new Vector2(this.canvas.width / 2, this.canvas.height / 2);
        const targetZoom = 1;

        // Animate the camera reset
        let startTime = null;
        const duration = 300; // Animation duration in ms

        const animateReset = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min(1, (timestamp - startTime) / duration);

            // Ease in-out function for smoother animation
            const easeInOut = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            const easedProgress = easeInOut(progress);

            // Interpolate position and zoom
            this.camera.position.x = oldPosition.x + (targetPosition.x - oldPosition.x) * easedProgress;
            this.camera.position.y = oldPosition.y + (targetPosition.y - oldPosition.y) * easedProgress;
            this.camera.zoom = oldZoom + (targetZoom - oldZoom) * easedProgress;

            this.refreshCanvas();
            this.updateZoomLevelDisplay();

            if (progress < 1) {
                requestAnimationFrame(animateReset);
            }
        };

        requestAnimationFrame(animateReset);
    }
}
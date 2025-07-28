// Initialize editor components
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Initializing documentation system...');
        if (!window.docModal && window.DocumentationModal) {
            window.docModal = new DocumentationModal();
            console.log('Documentation system initialized');
        }
    } catch (error) {
        console.error('Failed to initialize documentation:', error);
    }

    // Initialize the registry and module system first
    if (!window.moduleRegistry) {
        window.moduleRegistry = new ModuleRegistry();
    }

    // Initialize modules manager and core modules
    if (window.modulesManager) {
        window.modulesManager.initializeCoreModules();
    }

    if (window.moduleReloader && window.moduleRegistry) {
        window.moduleReloader.moduleRegistry = window.moduleRegistry;
        console.log("Connected ModuleReloader to ModuleRegistry");
    }

    const startScreen = new StartScreen('0.2.1');

    initializeMobileSupport();

    // Setup mobile touch handling
    setupMobileTouchHandling();

    // Tab functionality
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });

    // Initialize editor
    const editor = new Editor('editorCanvas');

    // Add this after initializing the editor but before other game-related code

    // Initialize physics manager
    window.physicsManager = new PhysicsManager();

    // Modify the engine to update physics
    const originalEngineUpdate = Engine.prototype.update;
    Engine.prototype.update = function(deltaTime) {
        // Update physics first
        if (window.physicsManager) {
            window.physicsManager.update(deltaTime);
        }
        
        // Call the original update method
        originalEngineUpdate.call(this, deltaTime);
    };

    // Add debug drawing to the engine's draw method
    const originalEngineDraw = Engine.prototype.draw;
    Engine.prototype.draw = function() {
        // Call the original draw method
        originalEngineDraw.call(this);
        
        // Draw physics debug visualization
        if (window.physicsManager && this.ctx) {
            window.physicsManager.drawDebug(this.ctx);
        }
    };

    // Add physics reset when stopping the game
    const originalEngineStop = Engine.prototype.stop;
    Engine.prototype.stop = function() {
        // Call the original stop method
        originalEngineStop.call(this);
        
        // Reset physics when stopping the game
        if (window.physicsManager) {
            window.physicsManager.reset();
        }
    };

    // Add some test objects
    const scene = new Scene("Default Scene");

    //const rootObj = new GameObject("Root Object");
    //rootObj.position = new Vector2(400, 300);
    //scene.gameObjects.push(rootObj);

    editor.scenes.push(scene);
    editor.setActiveScene(scene);

    // Refresh hierarchy
    editor.hierarchy.refreshHierarchy();

    // Context menu for hierarchy
    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.style.display = 'none';
    document.body.appendChild(contextMenu);

    // Initialize file browser with proper error handling and retry logic
    let fileBrowser;
    
    function initializeFileBrowser() {
        console.log('Attempting to initialize FileBrowser...', typeof FileBrowser);
        
        if (typeof FileBrowser === 'undefined') {
            console.warn('FileBrowser class not found, will retry...');
            return false;
        }
        
        // Check if container exists and has dimensions
        const container = document.getElementById('fileBrowserContainer');
        if (!container) {
            console.warn('FileBrowser container not found, will retry...');
            return false;
        }
        
        // Ensure container has proper dimensions
        const containerRect = container.getBoundingClientRect();
        if (containerRect.width === 0 || containerRect.height === 0) {
            console.warn(`FileBrowser container has invalid dimensions: ${containerRect.width} ${containerRect.height}, will retry...`);
            return false;
        }
        
        try {
            fileBrowser = new FileBrowser('fileBrowserContainer');
            window.fileBrowser = fileBrowser;
            console.log('FileBrowser initialized successfully');
            
            // Connect editor and fileBrowser
            if (editor) {
                editor.fileBrowser = fileBrowser;
                fileBrowser.editor = editor;
                
                // Scan for existing module scripts after a short delay to ensure DB is ready
                setTimeout(() => {
                    if (fileBrowser.scanForModuleScripts) {
                        fileBrowser.scanForModuleScripts();
                    }
                }, 1000);
            }
            
            return true;
        } catch (error) {
            console.error('Error initializing FileBrowser:', error);
            return false;
        }
    }
    
    // Wait a bit for the DOM to be fully rendered and styled
    setTimeout(() => {
        // Try to initialize immediately
        if (!initializeFileBrowser()) {
            // If failed, retry with increasing delays
            let retryCount = 0;
            const maxRetries = 10; // Increased max retries
            
            const retryInit = () => {
                retryCount++;
                console.log(`Retrying FileBrowser initialization (attempt ${retryCount}/${maxRetries})...`);
                
                if (initializeFileBrowser()) {
                    console.log('FileBrowser initialization successful on retry');
                    return;
                }
                
                if (retryCount < maxRetries) {
                    setTimeout(retryInit, 200 + (retryCount * 100)); // Progressive delay
                } else {
                    console.error('Failed to initialize FileBrowser after maximum retries');
                    // Show user-friendly error
                    const container = document.getElementById('fileBrowserContainer');
                    if (container) {
                        container.innerHTML = `
                            <div style="padding: 20px; text-align: center; color: #ff6b6b;">
                                <i class="fas fa-exclamation-triangle"></i>
                                <p>Failed to initialize File Browser</p>
                                <button onclick="location.reload()" style="padding: 8px 16px; background: #333; border: 1px solid #555; color: white; border-radius: 4px; cursor: pointer;">
                                    Reload Page
                                </button>
                            </div>
                        `;
                    }
                }
            };
            
            setTimeout(retryInit, 200);
        }
    }, 100); // Initial delay to ensure DOM is fully rendered

    // Make editor globally accessible
    window.editor = editor;
    
    // Ensure editor.sceneManager is available
    if (!editor.sceneManager && window.SceneManager) {
        editor.sceneManager = new SceneManager(editor);
    }

    if (!window.scriptEditor) {
        console.log("Initializing Script Editor...");
        const initResult = initScriptEditor();
        if (initResult instanceof Promise) {
            initResult.then(success => {
                if (!success) {
                    console.error("ERROR: Failed to initialize script editor");
                }
            });
        } else if (!initResult) {
            console.error("ERROR: Failed to initialize script editor");
        }
    }

    let projectManager;

    // Function to initialize ProjectManager and connect toolbar buttons
    const initializeProjectManager = () => {
        if (window.ProjectManager && editor && editor.sceneManager && window.fileBrowser && !projectManager) {
            projectManager = new ProjectManager(editor, editor.sceneManager, window.fileBrowser);
            console.log('ProjectManager initialized successfully');
            
            // Connect toolbar buttons after ProjectManager is initialized
            connectProjectManagerButtons();
            return true;
        }
        return false;
    };

    // Function to connect toolbar buttons to ProjectManager
    const connectProjectManagerButtons = () => {
        const newProjectButton = document.querySelector('.toolbar-button[title="New Project"]');
        const loadProjectButton = document.querySelector('.toolbar-button[title="Load Project"]');
        const saveProjectButton = document.querySelector('.toolbar-button[title="Save Project"]');

        if (projectManager) {
            if (newProjectButton) {
                newProjectButton.addEventListener('click', () => projectManager.newProject());
            } else {
                console.warn("New Project button not found.");
            }
            if (loadProjectButton) {
                loadProjectButton.addEventListener('click', () => projectManager.loadProject());
            } else {
                console.warn("Load Project button not found.");
            }
            if (saveProjectButton) {
                saveProjectButton.addEventListener('click', () => projectManager.saveProject());
            } else {
                console.warn("Save Project button not found.");
            }
            console.log('ProjectManager toolbar buttons connected successfully');
        } else {
            console.error("ProjectManager not available for button connections.");
        }
    };

    // Try to initialize ProjectManager immediately
    if (!initializeProjectManager()) {
        // If not successful, set up periodic checking
        const checkInterval = setInterval(() => {
            if (initializeProjectManager()) {
                clearInterval(checkInterval);
            }
        }, 100);
        
        // Stop checking after 10 seconds and show error
        setTimeout(() => {
            clearInterval(checkInterval);
            if (!projectManager) {
                console.error("ProjectManager failed to initialize after timeout - toolbar buttons won't work.");
            }
        }, 10000);
    }

    // Wait a bit to ensure indexedDB is ready
    setTimeout(() => {
        if (window.fileBrowser) {
            window.fileBrowser.scanForModuleScripts();
        } else {
            console.log('FileBrowser not available for module script scanning');
        }
    }, 500);

    // Hide context menu when clicking elsewhere
    document.addEventListener('click', () => {
        contextMenu.style.display = 'none';
    });

    // Initialize AutoSaveManager after editor is initialized
    if (!window.autoSaveManager) {
        window.autoSaveManager = new AutoSaveManager(window.editor);
        
        // Automatically restore previous session when starting
        window.autoSaveManager.loadState().then(success => {
            if (!success && window.editor.scenes.length === 0) {
                // If no saved state or failed to load, create a default scene
                const scene = new Scene("Default Scene");
                window.editor.scenes.push(scene);
                window.editor.setActiveScene(scene);
                window.editor.hierarchy.refreshHierarchy();
            }
        });
    }

    // Add this near the beginning of your main initialization code
    function initializeMobileSupport() {
        // Check if panel manager exists, create if needed
        if (!window.panelManager) {
            console.log("Creating panel manager from app.js");
            window.panelManager = new PanelManager();
        }
        
        // Add a console command for easy testing
        window.testMobileMode = function() {
            if (window.panelManager) {
                window.panelManager.testMobileMode();
            } else {
                console.error("PanelManager not initialized");
            }
        };
        
        // Add mobile detection
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
            console.log("Mobile device detected, enabling mobile mode");
            if (window.panelManager) {
                window.panelManager.checkMobileMode();
            }
        }
    }

    // Panel resize functionality
    function initResize(resizer, panel, isHorizontal) {
        /*let startPos = 0;
        let startSize = 0;

        function startResize(e) {
            startPos = isHorizontal ? e.clientY : e.clientX;
            startSize = isHorizontal ? panel.offsetHeight : panel.offsetWidth;

            // Prevent text selection during resize
            document.body.style.userSelect = 'none';
            document.body.style.webkitUserSelect = 'none';
            document.body.style.msUserSelect = 'none';
        
            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', stopResize);
        }

        function resize(e) {
            const currentPos = isHorizontal ? e.clientY : e.clientX;
            const diff = isHorizontal ? startPos - currentPos : currentPos - startPos;
            const newSize = Math.max(32, startSize + diff);
            
            if (isHorizontal) {
                panel.style.height = newSize + 'px';
            } else {
                panel.style.width = newSize + 'px';
            }

            // Refresh canvas when done resizing
            if (editor) editor.refreshCanvas();
        }

        function stopResize() {
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);

            // Restore text selection after resize
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
            document.body.style.msUserSelect = '';
            
            // Refresh canvas when done resizing
            if (editor) editor.refreshCanvas();
        }

        resizer.addEventListener('mousedown', startResize);*/
    }

    // Initialize resizers
    /*document.querySelectorAll('.resizer-v').forEach(resizer => {
        initResize(resizer, resizer.parentElement, false);
    });
    document.querySelectorAll('.resizer-h').forEach(resizer => {
        initResize(resizer, resizer.parentElement, true);
    });*/

    // Grid controls
    document.getElementById('showGrid').addEventListener('change', (e) => {
        editor.grid.showGrid = e.target.checked;
        editor.refreshCanvas();
    });

    document.getElementById('gridSize').addEventListener('change', (e) => {
        editor.grid.gridSize = parseInt(e.target.value);
        editor.refreshCanvas();
    });

    document.getElementById('snapToGrid').addEventListener('change', (e) => {
        editor.grid.snapToGrid = e.target.checked;
    });

    // Canvas tabs
    document.querySelectorAll('.canvas-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.canvas-tab, .canvas-view').forEach(el => 
                el.classList.remove('active')
            );
            tab.classList.add('active');
            document.getElementById(tab.dataset.canvas + 'View').classList.add('active');
            
            // If switching to game view and game isn't running, start it
            if (tab.dataset.canvas === 'game') {
                // Resize the game canvas immediately
                engine.resizeCanvas();
                
                // If game was previously running but paused due to tab switch,
                // resume it rather than restarting
                if (engine.wasRunning && !engine.running) {
                    engine.resume();
                }
            } 
            // If switching to editor, don't stop the game, just update editor view
            else if (tab.dataset.canvas === 'editor' && editor) {
                // Sync game object positions from engine to editor
                if (engine.running) {
                    syncGameToEditor();
                }
                editor.refreshCanvas();
            }
        });
    });

    // Ensure ScriptEditor is properly initialized
    function initScriptEditor() {
        // Check if script file is already loaded
        if (typeof window.ScriptEditor === 'function') {
            if (!window.scriptEditor) {
                try {
                    window.scriptEditor = new ScriptEditor();
                    console.log("ScriptEditor successfully initialized");
                    return true;
                } catch (err) {
                    console.error("Error initializing ScriptEditor:", err);
                }
            } else {
                console.log("ScriptEditor already initialized");
                return true;
            }
        } else {
            console.warn("ScriptEditor class not found, attempting to load it dynamically");
            
            // Dynamically load the script
            return new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = './core/ScriptEditor.js';
                script.onload = () => {
                    console.log("ScriptEditor.js loaded, initializing...");
                    setTimeout(() => {
                        if (typeof window.ScriptEditor === 'function') {
                            try {
                                window.scriptEditor = new ScriptEditor();
                                console.log("ScriptEditor successfully initialized after loading");
                                resolve(true);
                            } catch (err) {
                                console.error("Error initializing ScriptEditor after loading:", err);
                                resolve(false);
                            }
                        } else {
                            console.error("ScriptEditor class still not available after script load");
                            resolve(false);
                        }
                    }, 100); // Small delay to ensure script is fully processed
                };
                script.onerror = () => {
                    console.error("Failed to load ScriptEditor.js");
                    resolve(false);
                };
                document.body.appendChild(script);
            });
        }
        
        return false;
    }

    // Set up canvas tab switching
    function setupCanvasTabs() {
        document.querySelectorAll('.canvas-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                // Deactivate all tabs and views
                document.querySelectorAll('.canvas-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.canvas-view').forEach(view => view.classList.remove('active'));
                
                // Activate the clicked tab and its associated view
                tab.classList.add('active');
                const viewId = tab.getAttribute('data-canvas') + 'View';
                document.getElementById(viewId).classList.add('active');
                
                // If switching to editor view, refresh the canvas
                if (viewId === 'editorView' && window.editor) {
                    setTimeout(() => {
                        window.editor.refreshCanvas();
                    }, 0);
                }
                
                // If switching to game view, resize the game canvas
                if (viewId === 'gameView' && window.engine) {
                    setTimeout(() => {
                        window.engine.resizeCanvas();
                    }, 0);
                }
            });
        });
    }

    function syncGameToEditor() {
        if (!engine.running || !engine.activeScene || !editor.activeScene) return;
        
        // Create a mapping function to find corresponding objects
        function findMatchingEditorObject(gameObj, editorObjects) {
            return editorObjects.find(obj => obj.id === gameObj.id);
        }
        
        // Recursively sync position and rotation data
        function syncObjectData(gameObj, editorObj) {
            if (!gameObj || !editorObj) return;
            
            // Copy transforms from game to editor
            editorObj.position = new Vector2(gameObj.position.x, gameObj.position.y);
            editorObj.rotation = gameObj.rotation;
            editorObj.scale = new Vector2(gameObj.scale.x, gameObj.scale.y);
            
            // Sync children
            if (gameObj.children && editorObj.children) {
                gameObj.children.forEach(childGameObj => {
                    const childEditorObj = findMatchingEditorObject(childGameObj, editorObj.children);
                    if (childEditorObj) {
                        syncObjectData(childGameObj, childEditorObj);
                    }
                });
            }
        }
        
        // Sync each root game object
        engine.activeScene.gameObjects.forEach(gameObj => {
            const editorObj = findMatchingEditorObject(gameObj, editor.activeScene.gameObjects);
            if (editorObj) {
                syncObjectData(gameObj, editorObj);
            }
        });
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        if (editor) {
            // Resize canvas to fit container
            const container = editor.canvas.parentElement;
            editor.canvas.width = container.clientWidth;
            editor.canvas.height = container.clientHeight;
            editor.refreshCanvas();
        }
    });

    // Dispatch an initial resize event to set canvas size
    window.dispatchEvent(new Event('resize'));

    // Initialize console output
    const consoleOutput = document.querySelector('.console-output');
    const clearConsoleButton = document.getElementById('clearConsole');

    // Console message types
    const messageTypes = ['log', 'info', 'warn', 'error'];

    // Store original console methods
    const originalConsole = {};
    messageTypes.forEach(type => {
        originalConsole[type] = console[type];
    });

    // Helper to format timestamp
    function getTimestamp() {
        const now = new Date();
        return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    }

    // Add keyboard shortcut for play/stop (F5/Escape)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F5') {
            e.preventDefault(); // Prevent browser refresh
            if (!engine.running) {
                playButton.click();
            }
        } else if (e.key === 'Escape') {
            if (engine.running) {
                stopButton.click();
            }
        }
    });

    // Override console methods
    messageTypes.forEach(type => {
        console[type] = (...args) => {
            // Call original method
            originalConsole[type].apply(console, args);
            
            // Create message element
            const message = document.createElement('div');
            message.className = `console-message ${type}`;
            
            // Add timestamp
            const timestamp = document.createElement('span');
            timestamp.className = 'console-timestamp';
            timestamp.textContent = getTimestamp();
            message.appendChild(timestamp);
            
            // Add message content
            const content = document.createElement('span');
            content.textContent = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            message.appendChild(content);
            
            // Add to console output
            consoleOutput.appendChild(message);
            
            // Auto-scroll to bottom
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
        };
    });

    // Clear console button handler
    clearConsoleButton.addEventListener('click', () => {
        consoleOutput.innerHTML = '';
    });

    // Optional: Add input handling
    const consoleInput = document.querySelector('.console-input-field');
    consoleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
            try {
                // Log the input
                console.log('>', e.target.value);
                
                // Evaluate the input
                const result = eval(e.target.value);
                if (result !== undefined) {
                    console.log(result);
                }
            } catch (error) {
                console.error(error);
            }
            
            // Clear input
            e.target.value = '';
        }
    });

    // Zen Mode button handler
    const zenModeButton = document.getElementById('zenModeButton');
    if (zenModeButton) {
        zenModeButton.addEventListener('click', () => {
            // Toggle fullscreen for the document
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().then(() => {
                    zenModeButton.innerHTML = '<i class="fas fa-sun"></i>';
                });
            } else {
                document.exitFullscreen().then(() => {
                    zenModeButton.innerHTML = '<i class="fas fa-moon"></i>';
                });
            }
        });

        // Update icon when fullscreen changes
        document.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement) {
                zenModeButton.innerHTML = '<i class="fas fa-sun"></i>';
            } else {
                zenModeButton.innerHTML = '<i class="fas fa-moon"></i>';
            }
        });
    } else {
        console.warn("Zen Mode button not found.");
    }

    // PLAY
    // Initialize the engine
    const gameCanvas = document.getElementById('gameCanvas');
    const engine = new Engine(gameCanvas);
    engine.editor = editor;
    
    // Store engine reference in editor for convenience
    editor.engine = engine;
    
    // Set up play/stop buttons
    const playButton = document.querySelector('.toolbar-button[title="Play"]');
    const stopButton = document.querySelector('.toolbar-button[title="Stop"]');
    
    if (playButton && stopButton) {
        playButton.addEventListener('click', async () => {
            console.log("Play button clicked");
            
            if (!editor.activeScene) {
                console.error('No active scene to play');
                return;
            }
            
            // First add visual feedback - button active state
            playButton.classList.add('active');
            stopButton.classList.remove('active');
            
            // Switch to game tab if needed
            const gameTab = document.querySelector('[data-canvas="game"]');
            if (gameTab) gameTab.click();
            
            // If game was paused, resume it instead of restarting
            if (engine.wasRunning) {
                console.log("Resuming previously running game");
                engine.resume();
                return;
            }
            
            // Debug log
            console.log(`Starting game with scene: ${editor.activeScene.name}`);
            console.log(`Scene has ${editor.activeScene.gameObjects.length} root objects`);
            
            // Load and start the scene
            engine.loadScene(editor.activeScene);
            engine.resizeCanvas();
            
            try {
                // Start the game with loading indicator
                document.body.classList.add('game-loading');
                await engine.start();
                document.getElementById('gameCanvas').focus(); // Give focus to the game canvas
            } catch (error) {
                console.error('Error starting game:', error);
                playButton.classList.remove('active');
            } finally {
                document.body.classList.remove('game-loading');
            }
        });
        
        stopButton.addEventListener('click', () => {
            console.log("Stop button clicked");
            
            if (engine.running) {
                // Visual feedback - button active state
                playButton.classList.remove('active');
                stopButton.classList.add('active');

                // Switch to editor tab
                const editorTab = document.querySelector('[data-canvas="editor"]');
                if (editorTab) editorTab.click();
                
                // Refresh editor canvas
                editor.refreshCanvas();
                
                // Stop the game
                engine.stop();
                
                // After a brief delay, remove the active state from the stop button
                setTimeout(() => {
                    stopButton.classList.remove('active');
                }, 500);
            }
        });
    }

    function setupGameViewControls() {
        const fullscreenButton = document.getElementById('fullscreenButton');
        const scaleModeSelect = document.getElementById('scaleModeSelect');
        const maintainAspectRatio = document.getElementById('maintainAspectRatio');
        const pixelPerfect = document.getElementById('pixelPerfect');
        const smoothingEnabled = document.getElementById('smoothingEnabled');
        const fpsCounter = document.getElementById('fpsCounter');
        const resolutionDisplay = document.getElementById('resolutionDisplay');
        const gameView = document.getElementById('gameView');
        
        // Fullscreen toggle
        fullscreenButton.addEventListener('click', () => {
            if (!engine.running) return;
            
            const isFullscreen = gameView.classList.toggle('fullscreen-mode');
            engine.renderConfig.fullscreen = isFullscreen;
            
            // Update button icon
            fullscreenButton.innerHTML = isFullscreen ? 
                '<i class="fas fa-compress"></i>' : 
                '<i class="fas fa-expand"></i>';
                
            // Trigger resize
            engine.resizeCanvas();
            updateResolutionDisplay();
        });
        
        // Scaling mode
        scaleModeSelect.addEventListener('change', () => {
            engine.renderConfig.scaleMode = scaleModeSelect.value;
            engine.resizeCanvas();
            updateResolutionDisplay();
        });
        
        // Aspect ratio
        maintainAspectRatio.addEventListener('change', () => {
            engine.renderConfig.maintainAspectRatio = maintainAspectRatio.checked;
            engine.resizeCanvas();
            updateResolutionDisplay();
        });
        
        // Pixel perfect
        pixelPerfect.addEventListener('change', () => {
            engine.renderConfig.pixelPerfect = pixelPerfect.checked;
            engine.resizeCanvas();
            updateResolutionDisplay();
        });
        
        // Image smoothing
        smoothingEnabled.addEventListener('change', () => {
            engine.renderConfig.smoothing = smoothingEnabled.checked;
            engine.resizeCanvas();
        });
        
        // Set up FPS counter
        let lastTime = performance.now();
        let frameCount = 0;
        
        function updateFPS() {
            if (!engine.running) {
                fpsCounter.textContent = '0 FPS';
                return;
            }
            
            const now = performance.now();
            frameCount++;
            
            if (now - lastTime >= 1000) {
                const fps = Math.round((frameCount * 1000) / (now - lastTime));
                fpsCounter.textContent = `${fps} FPS`;
                frameCount = 0;
                lastTime = now;
            }
            
            requestAnimationFrame(updateFPS);
        }
        
        // Start FPS counter
        updateFPS();
        
        // Initialize resolution display
        updateResolutionDisplay();
    }

    // Update resolution display
    function updateResolutionDisplay() {
        const resolutionDisplay = document.getElementById('resolutionDisplay');
        if (!resolutionDisplay || !engine.canvas) return;
        
        const canvasWidth = engine.canvas.width;
        const canvasHeight = engine.canvas.height;
        
        // If in pixel-perfect mode, show both logical and physical resolution
        if (engine.renderConfig.pixelPerfect) {
            const viewportWidth = engine.scene?.settings?.viewportWidth || 800;
            const viewportHeight = engine.scene?.settings?.viewportHeight || 600;
            resolutionDisplay.textContent = `${viewportWidth}×${viewportHeight} → ${canvasWidth}×${canvasHeight}`;
        } else {
            resolutionDisplay.textContent = `${canvasWidth}×${canvasHeight}`;
        }
    }

    function setupMobileTouchHandling() {
        // Add touch events for canvas interaction
        const editorCanvas = document.getElementById('editorCanvas');
        
        if (editorCanvas && window.editor) {
            let touchStartPos = null;
            let touchStartTime = 0;
            
            editorCanvas.addEventListener('touchstart', (e) => {
                // Prevent default to avoid scrolling
                e.preventDefault();
                
                if (e.touches.length === 1) {
                    const touch = e.touches[0];
                    touchStartPos = { 
                        x: touch.clientX, 
                        y: touch.clientY 
                    };
                    touchStartTime = Date.now();
                    
                    // Simulate mousedown for object selection
                    const pointerEvent = new PointerEvent('pointerdown', {
                        clientX: touch.clientX,
                        clientY: touch.clientY,
                        bubbles: true,
                        pointerType: 'touch'
                    });
                    editorCanvas.dispatchEvent(pointerEvent);
                }
                
                // Handle pinch zoom with two fingers
                if (e.touches.length === 2) {
                    const touch1 = e.touches[0];
                    const touch2 = e.touches[1];
                    
                    // Calculate initial distance between fingers
                    const initialDistance = Math.hypot(
                        touch1.clientX - touch2.clientX, 
                        touch1.clientY - touch2.clientY
                    );
                    
                    window.editor._pinchZoomData = {
                        initialDistance: initialDistance,
                        initialZoom: window.editor.camera.zoom
                    };
                }
            });
            
            editorCanvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
                
                // Handle single finger panning
                if (e.touches.length === 1 && touchStartPos) {
                    const touch = e.touches[0];
                    const deltaX = touch.clientX - touchStartPos.x;
                    const deltaY = touch.clientY - touchStartPos.y;
                    
                    // If we've moved enough, simulate drag for panning
                    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                        touchStartPos = { 
                            x: touch.clientX, 
                            y: touch.clientY 
                        };
                        
                        // Simulate mousemove for panning
                        const pointerEvent = new PointerEvent('pointerdown', {
                            clientX: touch.clientX,
                            clientY: touch.clientY,
                            bubbles: true,
                            pointerType: 'touch'
                        });
                        editorCanvas.dispatchEvent(pointerEvent);
                    }
                }
                
                // Handle pinch zoom
                if (e.touches.length === 2 && window.editor._pinchZoomData) {
                    const touch1 = e.touches[0];
                    const touch2 = e.touches[1];
                    
                    // Calculate new distance between fingers
                    const newDistance = Math.hypot(
                        touch1.clientX - touch2.clientX, 
                        touch1.clientY - touch2.clientY
                    );
                    
                    // Calculate zoom factor based on pinch
                    const pinchRatio = newDistance / window.editor._pinchZoomData.initialDistance;
                    const newZoom = window.editor._pinchZoomData.initialZoom * pinchRatio;
                    
                    // Apply zoom with constraints
                    window.editor.camera.zoom = Math.max(0.1, Math.min(10, newZoom));
                    window.editor.updateZoomLevelDisplay();
                    window.editor.refreshCanvas();
                }
            });
            
            editorCanvas.addEventListener('touchend', (e) => {
                // Handle touch ending
                if (e.touches.length === 0) {
                    // Check if this was a tap (quick touch)
                    const touchDuration = Date.now() - touchStartTime;
                    
                    if (touchDuration < 300 && touchStartPos) {
                        // Simulate click for selection
                        const pointerEvent = new PointerEvent('pointerdown', {
                        clientX: touch.clientX,
                        clientY: touch.clientY,
                        bubbles: true,
                        pointerType: 'touch'
                    });
                    editorCanvas.dispatchEvent(pointerEvent);
                    }
                    
                    // Reset touch data
                    touchStartPos = null;
                    touchStartTime = 0;
                    window.editor._pinchZoomData = null;
                }
            });
        }
        
        // Make toolbar and buttons more touch-friendly
        document.querySelectorAll('.toolbar-button, .tab-button, .canvas-tab').forEach(button => {
            button.style.minHeight = '32px';
            button.style.minWidth = '32px';

            button.addEventListener('touchend', (e) => {
                e.preventDefault(); // Prevent double-activation
                button.click();     // Manually trigger click
            });
        });
    }

    // Add event listeners for modal buttons here
    const docButton = document.querySelector('.toolbar-button[title="Documentation"]'); // Replace with actual selector
    if (docButton && window.docModal) {
        docButton.addEventListener('click', () => {
            console.log('Documentation button clicked');
            window.docModal.open();
        });
    } else {
        console.warn("Documentation button or modal not found.");
    }

    const settingsButton = document.querySelector('.toolbar-button[title="Settings"]');
    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            console.log('Settings button clicked');
            if (window.settingsModal) {
                window.settingsModal.open();
            } else {
                console.error('Settings modal not initialized');
            }
        });
    } else {
         console.warn("Settings button not found.");
    }

    // Connect export button
    const exportButton = document.querySelector('.toolbar-button[title="Export Project"]');
    if (exportButton && window.exportManager) {
        exportButton.addEventListener('click', () => {
            console.log('Export button clicked');
            window.exportManager.showExportDialog();
        });
    } else {
        console.warn("Export button or export manager not found.");
    }

    // Call this after engine initialization
    setupGameViewControls();
    
    // Add canvas tab handlers
    document.querySelectorAll('.canvas-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            // If switching to editor while game is running, stop the game
            if (tab.dataset.canvas === 'editor' && engine.running) {
                engine.stop();
            }
            
            // If switching to game, make sure canvas is sized correctly
            if (tab.dataset.canvas === 'game') {
                engine.resizeCanvas();
            }
        });
    });
    
    // Handle window resize for game canvas
    window.addEventListener('resize', () => {
        if (engine.running) {
            engine.resizeCanvas();
        }
    });

    // Global touch-to-click handler for interactive elements
    document.addEventListener('touchend', function(e) {
        // Match any interactive UI component
        let target = e.target.closest(
            '[class*="button"], [class*="tab"], [class*="item"], [class*="control"], [class*="action"], [class*="icon"], [class*="link"], ' +
            'button, [role="button"], [role="tab"], [role="menuitem"], [data-action],' +
            ' [data-toggle], [data-target], [data-action], [class*="clickable"], [class*="checkbox"], [class*="radio"]'
        );
        if (!target) return;
        e.preventDefault();
        target.click();
    }, { passive: false });

    setTimeout(() => {
        if (window.editor) {
            window.editor.refreshCanvas();
            
            // Add resize observer to maintain proper canvas rendering
            const resizeObserver = new ResizeObserver(entries => {
                for (const entry of entries) {
                    if (entry.target.id === 'editorView' && entry.target.classList.contains('active')) {
                        window.editor.refreshCanvas();
                    }
                }
            });
            
            const editorView = document.getElementById('editorView');
            if (editorView) {
                resizeObserver.observe(editorView);
            }
        }
    }, 500);
});
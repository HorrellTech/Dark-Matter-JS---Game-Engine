// Initialize editor components
document.addEventListener('DOMContentLoaded', () => {
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

    // Initialize file browser with the container ID and make it available globally
    this.fileBrowser = window.fileBrowser || new FileBrowser('fileBrowserContainer');
    window.fileBrowser = this.fileBrowser;
    
    // Connect the editor reference to the file browser
    this.fileBrowser.editor = this;
    
    // Scan for existing module scripts
    this.fileBrowser.scanForModuleScripts();

    // Wait a bit to ensure indexedDB is ready
    setTimeout(() => {
        if (window.fileBrowser) {
            window.fileBrowser.scanForModuleScripts();
        }
    }, 500);

    // Hide context menu when clicking elsewhere
    document.addEventListener('click', () => {
        contextMenu.style.display = 'none';
    });

    // Panel resize functionality
    function initResize(resizer, panel, isHorizontal) {
        let startPos = 0;
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

        resizer.addEventListener('mousedown', startResize);
    }

    // Initialize resizers
    document.querySelectorAll('.resizer-v').forEach(resizer => {
        initResize(resizer, resizer.parentElement, false);
    });
    document.querySelectorAll('.resizer-h').forEach(resizer => {
        initResize(resizer, resizer.parentElement, true);
    });

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
            if (!editor.activeScene) {
                console.error('No active scene to play');
                return;
            }
            
            // Visual feedback - button active state
            playButton.classList.add('active');
            stopButton.classList.remove('active');
            
            // If game was paused, resume it instead of restarting
            if (engine.wasRunning) {
                engine.resume();
                return;
            }
            
            // Debug log to help troubleshoot
            console.log(`Starting game with scene: ${editor.activeScene.name}`);
            console.log(`Scene has ${editor.activeScene.gameObjects.length} root objects`);
            
            // Load and start the scene
            engine.loadScene(editor.activeScene);
            
            // Make sure the game canvas is properly sized
            engine.resizeCanvas();
            
            try {
                // Start the game with a loading indicator
                document.body.classList.add('game-loading');
                await engine.start();
            } catch (error) {
                console.error('Error starting game:', error);
            } finally {
                document.body.classList.remove('game-loading');
            }
        });
        
        stopButton.addEventListener('click', () => {
            if (engine.running) {
                // Visual feedback - button active state
                playButton.classList.remove('active');
                stopButton.classList.add('active');
                
                // Stop the game
                engine.stop();
                
                // After a brief delay, remove the active state from the stop button
                setTimeout(() => {
                    stopButton.classList.remove('active');
                }, 500);
            }
        });
    }
    
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
});
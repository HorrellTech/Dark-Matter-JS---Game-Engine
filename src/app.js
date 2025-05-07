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
    const rootObj = new GameObject("Root Object");
    rootObj.position = new Vector2(400, 300);
    editor.scene.gameObjects.push(rootObj);

    const child1 = new GameObject("Child 1");
    child1.position = new Vector2(50, 0);
    rootObj.addChild(child1);

    const child2 = new GameObject("Child 2");
    child2.position = new Vector2(-50, 0);
    rootObj.addChild(child2);

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
            
            // Refresh canvas when tab is switched
            if (tab.dataset.canvas === 'editor' && editor) {
                editor.refreshCanvas();
            }
        });
    });

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
});
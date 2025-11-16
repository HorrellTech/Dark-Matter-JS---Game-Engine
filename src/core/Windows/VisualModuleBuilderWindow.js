/**
 * VisualModuleBuilderWindow - Node-based visual programming interface for creating modules
 * 
 * Features:
 * - Drag-and-drop node-based interface
 * - Reference to existing modules and their properties/methods
 * - Visual connection system for logic flow
 * - Export to "Visual Modules" directory
 * - Save/Load projects to "Visual Module Builder Proj" directory (.vmb files)
 * - Intuitive, organized GUI
 */
class VisualModuleBuilderWindow extends EditorWindow {
    static namespace = "Tools";
    static description = "Visual node-based module creator";
    static icon = "fas fa-project-diagram";
    static color = "#aa64ca";

    constructor() {
        super("Visual Module Builder", {
            width: window.innerWidth,
            height: window.innerHeight,
            resizable: true,
            modal: false,
            closable: true,
            className: 'visual-module-builder'
        });

        // Load documentation script if not already loaded
        this.loadDocumentationScript();
        this.loadNodeBuilderScript();

        // Canvas and nodes
        this.canvas = null;
        this.ctx = null;
        this.nodes = [];
        this.connections = [];
        this.selectedNode = null;
        this.draggedNode = null;
        this.dragOffset = { x: 0, y: 0 };

        this.useRoundConnectors = false; // Set to false for triangular connectors

        // ========== NEW: MULTI-SELECTION ==========
        this.selectedNodes = new Set(); // Track multiple selected nodes
        this.draggedNodes = new Set(); // Track nodes being dragged together

        this.libraryDragStart = null; // Track where library node drag started
        this.isLibraryDragging = false;

        // Connection state
        this.connectingFrom = null;
        this.hoveredPort = null;

        this.codeMirrorEditor = null;

        // Pan and zoom
        this.panOffset = { x: 0, y: 0 };
        this.zoom = 1.0;
        this.isPanning = false;
        this.lastMousePos = { x: 0, y: 0 };

        this.isBoxSelecting = false;
        this.boxSelectStart = { x: 0, y: 0 };
        this.boxSelectEnd = { x: 0, y: 0 };

        // Grid settings
        this.gridSize = 20;
        this.snapToGrid = true;

        // Animation
        this.animationTime = 0;

        // ========== NEW: SIMPLIFIED CONNECTOR OPTION ==========
        this.simplifiedConnectors = localStorage.getItem('vmb_simplifiedConnectors') === 'true' || false;

        // Text editing state
        this.editingNode = null;
        this.editingElement = null;

        // ========== NEW: CLIPBOARD SYSTEM ==========
        this.clipboard = null; // Store copied node(s)
        this.clipboardOffset = { x: 20, y: 20 }; // Offset for pasted nodes

        this.iconList = this.setupIconDropdown();

        // Group state
        this.currentGroup = null; // null = root canvas
        this.groupHistory = []; // Stack for navigating into/out of groups

        // Category collapse state
        this.collapsedCategories = new Set();

        // Node library
        this.nodeLibrary = this.buildNodeLibrary();

        this.isActive = true;
        this.animationFrameId = null;

        // Connection color setting
        this.connectionColor = localStorage.getItem('vmb_connectionColor') || '#00ffff';

        // ========== NEW: TEST PANEL ==========
        this.testPanelVisible = false;
        this.testEngine = null;
        this.testGameObject = null;
        this.testCanvas = null;
        this.testCtx = null;

        // ========== NEW: CODE/NODE TAB SYSTEM ==========
        this.currentTab = 'nodes'; // 'nodes' or 'code'
        this.codeEditor = null;
        this.codeEditorContent = '';
        this.lastValidNodeState = null; // Store last valid state
        this.codeTabContainer = null;
        this.nodeTabContainer = null;

        // Store bound event handlers for cleanup
        this.boundHandlers = {
            keydown: null,
            mouseup: null,
            resize: null
        };

        // Cache node library globally for examples (without creating a new window)
        if (!window._VMBNodeLibrary) {
            window._VMBNodeLibrary = this.nodeLibrary;
        }

        Object.keys(this.buildNodeLibrary()).forEach(cat => this.collapsedCategories.add(cat));

        // Module data
        this.moduleName = "CustomModule";
        this.moduleNamespace = "Custom";
        this.moduleDescription = "A custom visual module";
        this.moduleIcon = "fas fa-cube";
        this.moduleColor = "#4CAF50";
        this.allowMultiple = true;
        this.drawInEditor = true;

        // Node library
        this.nodeLibrary = this.buildNodeLibrary();

        // Project state
        this.projectPath = null;
        this.hasUnsavedChanges = false;

        this.availableModules = []; // Store loaded module metadata
        this.requiredModules = new Set(); // Track which modules are required

        // Node group panels
        this.showGroupPanels = true; // Toggle for showing/hiding group panels
        this.groupPanels = []; // Store panel data { bounds, color, label, nodes, customColor, customLabel }
        this.draggedGroupPanel = null; // Currently dragged group panel
        this.groupPanelDragOffset = { x: 0, y: 0 }; // Offset for group dragging

        // ========== NEW: UNDO/REDO SYSTEM ==========
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoSteps = 50; // Limit undo history

        // ========== NEW: MINIMAP ==========
        this.showMinimap = true;
        this.minimapCanvas = null;
        this.minimapCtx = null;
        this.minimapScale = 0.1; // How much to scale down the view
        this.minimapPadding = 10;

        // ========== NEW: COMMAND PALETTE ==========
        this.commandPalette = null;
        this.commandPaletteVisible = false;

        // ========== NEW: COMMENT/ANNOTATION SYSTEM ==========
        this.nodeComments = new Map(); // Map of nodeId -> comment text
        this.hoveredCommentButton = null;

        // ========== NEW: LIVE PREVIEW/DEBUGGING ==========
        this.livePreviewActive = false;
        this.previewModuleInstance = null;
        this.previewWindow = null;

        this.setupUI();
        this.setupCanvas();
        this.setupCanvasEventListeners();
        this.loadAvailableModules();
        this.setupModuleRefreshListener();

        this.newProject();

        // Save initial state for undo/redo
        this.saveState();
    }

    setupModuleRefreshListener() {
        if (window.engine && window.engine.moduleRegistry) {
            window.engine.moduleRegistry.addListener((event, moduleClass) => {
                console.log(`Module ${event}: ${moduleClass.name}`);
                this.loadAvailableModules();
            });
        }
    }

    setupIconDropdown() {
        return ([
            // Shapes & Objects
            'fas fa-cube', 'fas fa-cubes', 'fas fa-box', 'fas fa-boxes', 'fas fa-square',
            'fas fa-circle', 'fas fa-circle-notch', 'fas fa-ring', 'fas fa-shapes',

            // Stars & Awards
            'fas fa-star', 'fas fa-star-half', 'fas fa-certificate', 'fas fa-trophy',
            'fas fa-medal', 'fas fa-award', 'fas fa-ribbon', 'fas fa-crown',

            // Hearts & Emotions
            'fas fa-heart', 'fas fa-heart-pulse', 'fas fa-face-smile', 'fas fa-face-grin',
            'fas fa-face-laugh', 'fas fa-face-angry', 'fas fa-face-sad-tear',

            // Gaming & Entertainment
            'fas fa-gamepad', 'fas fa-dice', 'fas fa-dice-d6', 'fas fa-dice-d20',
            'fas fa-chess', 'fas fa-chess-knight', 'fas fa-puzzle-piece', 'fas fa-ghost',

            // Magic & Fantasy
            'fas fa-magic', 'fas fa-wand-magic', 'fas fa-wand-magic-sparkles', 'fas fa-hat-wizard',
            'fas fa-gem', 'fas fa-diamond', 'fas fa-sparkles', 'fas fa-crystal-ball',

            // Weapons & Combat
            'fas fa-sword', 'fas fa-shield', 'fas fa-shield-halved', 'fas fa-crosshairs',
            'fas fa-bullseye', 'fas fa-bomb', 'fas fa-burst', 'fas fa-explosion',

            // Technology & Science
            'fas fa-robot', 'fas fa-microchip', 'fas fa-memory', 'fas fa-server',
            'fas fa-flask', 'fas fa-atom', 'fas fa-dna', 'fas fa-microscope',

            // Nature & Weather
            'fas fa-tree', 'fas fa-seedling', 'fas fa-leaf', 'fas fa-fire', 'fas fa-fire-flame-curved',
            'fas fa-droplet', 'fas fa-water', 'fas fa-sun', 'fas fa-moon', 'fas fa-cloud',
            'fas fa-cloud-sun', 'fas fa-cloud-moon', 'fas fa-bolt', 'fas fa-bolt-lightning',
            'fas fa-snowflake', 'fas fa-icicles', 'fas fa-wind', 'fas fa-tornado',

            // Animals & Creatures
            'fas fa-bug', 'fas fa-spider', 'fas fa-crow', 'fas fa-dove', 'fas fa-dragon',
            'fas fa-fish', 'fas fa-frog', 'fas fa-hippo', 'fas fa-horse', 'fas fa-cat',
            'fas fa-dog', 'fas fa-otter', 'fas fa-kiwi-bird',

            // Space & Astronomy
            'fas fa-rocket', 'fas fa-satellite', 'fas fa-satellite-dish', 'fas fa-shuttle-space',
            'fas fa-meteor', 'fas fa-moon', 'fas fa-star', 'fas fa-planet-ringed',

            // People & Body
            'fas fa-user', 'fas fa-users', 'fas fa-user-ninja', 'fas fa-user-astronaut',
            'fas fa-user-secret', 'fas fa-ghost', 'fas fa-skull', 'fas fa-skull-crossbones',
            'fas fa-eye', 'fas fa-eye-slash', 'fas fa-hand', 'fas fa-hand-fist',

            // Transportation
            'fas fa-car', 'fas fa-car-side', 'fas fa-truck', 'fas fa-van-shuttle',
            'fas fa-bicycle', 'fas fa-motorcycle', 'fas fa-plane', 'fas fa-helicopter',
            'fas fa-ship', 'fas fa-anchor', 'fas fa-train', 'fas fa-space-shuttle',

            // Buildings & Locations
            'fas fa-house', 'fas fa-building', 'fas fa-city', 'fas fa-castle',
            'fas fa-dungeon', 'fas fa-fort', 'fas fa-mountain', 'fas fa-volcano',
            'fas fa-landmark', 'fas fa-store', 'fas fa-warehouse', 'fas fa-industry',

            // Tools & Equipment
            'fas fa-hammer', 'fas fa-wrench', 'fas fa-screwdriver', 'fas fa-gear',
            'fas fa-gears', 'fas fa-toolbox', 'fas fa-magnet', 'fas fa-compass',

            // Symbols & UI
            'fas fa-cog', 'fas fa-bolt', 'fas fa-lightbulb', 'fas fa-key',
            'fas fa-lock', 'fas fa-unlock', 'fas fa-flag', 'fas fa-flag-checkered',
            'fas fa-bookmark', 'fas fa-tag', 'fas fa-tags', 'fas fa-barcode',

            // Time & Calendar
            'fas fa-clock', 'fas fa-stopwatch', 'fas fa-hourglass', 'fas fa-hourglass-half',
            'fas fa-calendar', 'fas fa-calendar-day', 'fas fa-bell', 'fas fa-alarm-clock',

            // Media & Creative
            'fas fa-camera', 'fas fa-video', 'fas fa-image', 'fas fa-images',
            'fas fa-music', 'fas fa-guitar', 'fas fa-drum', 'fas fa-volume-high',
            'fas fa-headphones', 'fas fa-microphone', 'fas fa-film', 'fas fa-clapperboard',
            'fas fa-palette', 'fas fa-paint-brush', 'fas fa-pen', 'fas fa-pencil',

            // Food & Drink
            'fas fa-pizza-slice', 'fas fa-burger', 'fas fa-hotdog', 'fas fa-apple-whole',
            'fas fa-carrot', 'fas fa-candy-cane', 'fas fa-ice-cream', 'fas fa-cookie',
            'fas fa-mug-hot', 'fas fa-wine-glass', 'fas fa-martini-glass', 'fas fa-beer-mug-empty',

            // Sports & Fitness
            'fas fa-futbol', 'fas fa-basketball', 'fas fa-baseball', 'fas fa-football',
            'fas fa-bowling-ball', 'fas fa-golf-ball-tee', 'fas fa-dumbbell', 'fas fa-person-running',

            // Medical & Health
            'fas fa-heart-pulse', 'fas fa-briefcase-medical', 'fas fa-suitcase-medical',
            'fas fa-pills', 'fas fa-syringe', 'fas fa-vial', 'fas fa-biohazard',

            // Business & Finance
            'fas fa-briefcase', 'fas fa-chart-line', 'fas fa-chart-pie', 'fas fa-chart-bar',
            'fas fa-coins', 'fas fa-dollar-sign', 'fas fa-piggy-bank', 'fas fa-wallet',

            // Communication
            'fas fa-envelope', 'fas fa-message', 'fas fa-comment', 'fas fa-comments',
            'fas fa-phone', 'fas fa-mobile', 'fas fa-tower-cell', 'fas fa-wifi',

            // Arrows & Directions
            'fas fa-arrow-up', 'fas fa-arrow-down', 'fas fa-arrow-left', 'fas fa-arrow-right',
            'fas fa-arrow-rotate-right', 'fas fa-arrows-rotate', 'fas fa-location-arrow',
            'fas fa-share', 'fas fa-angle-up', 'fas fa-angle-down',

            // Actions & Controls
            'fas fa-play', 'fas fa-pause', 'fas fa-stop', 'fas fa-forward',
            'fas fa-backward', 'fas fa-power-off', 'fas fa-plus', 'fas fa-minus',
            'fas fa-xmark', 'fas fa-check', 'fas fa-ban', 'fas fa-trash',

            // Files & Documents
            'fas fa-file', 'fas fa-file-code', 'fas fa-file-image', 'fas fa-file-pdf',
            'fas fa-folder', 'fas fa-folder-open', 'fas fa-book', 'fas fa-newspaper',

            // Code & Development
            'fas fa-code', 'fas fa-terminal', 'fas fa-laptop-code', 'fas fa-database',
            'fas fa-bug', 'fas fa-brackets-curly', 'fas fa-hashtag', 'fas fa-at',

            // Miscellaneous
            'fas fa-shopping-cart', 'fas fa-gift', 'fas fa-cake-candles', 'fas fa-balloon',
            'fas fa-paw', 'fas fa-fingerprint', 'fas fa-qrcode', 'fas fa-barcode',
            'fas fa-battery-full', 'fas fa-plug', 'fas fa-wifi', 'fas fa-signal'
        ]);
    }

    buildNodeLibrary() {
        // Delegate to VMBExampleModules for the static node library
        return VMBExampleModules.buildNodeLibrary();
    }

    /**
     * Setup the main UI
     */
    setupUI() {
        this.clearContent();

        // Main container with flex layout
        const mainContainer = document.createElement('div');
        mainContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            height: 100%;
            gap: 8px;
        `;

        // Top toolbar
        const toolbar = this.createToolbar();
        mainContainer.appendChild(toolbar);

        // ========== NEW: TAB BAR ==========
        const tabBar = this.createTabBar();
        mainContainer.appendChild(tabBar);

        // Middle section: sidebar + canvas/code container
        const middleSection = document.createElement('div');
        middleSection.style.cssText = `
            display: flex;
            flex: 1;
            gap: 8px;
            overflow: hidden;
        `;

        // Left sidebar - Node library (only visible in nodes tab)
        const sidebar = this.createSidebar();
        sidebar.id = 'vmb-sidebar';
        middleSection.appendChild(sidebar);

        // Main content area container (canvas or code editor)
        const contentContainer = document.createElement('div');
        contentContainer.style.cssText = `
            flex: 1;
            background: #1a1a1a;
            border-radius: 4px;
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;

        // ========== NODE TAB CONTAINER ==========
        this.nodeTabContainer = document.createElement('div');
        this.nodeTabContainer.style.cssText = `
            width: 100%;
            height: 100%;
            display: ${this.currentTab === 'nodes' ? 'block' : 'none'};
        `;

        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = `
            width: 100%;
            height: 100%;
            cursor: grab;
        `;
        this.nodeTabContainer.appendChild(this.canvas);
        contentContainer.appendChild(this.nodeTabContainer);

        // ========== CODE TAB CONTAINER ==========
        this.codeTabContainer = document.createElement('div');
        this.codeTabContainer.style.cssText = `
            width: 100%;
            height: 100%;
            display: ${this.currentTab === 'code' ? 'flex' : 'none'};
            flex-direction: column;
            background: #1e1e1e;
            padding: 10px;
            overflow: hidden;
        `;

        // Code editor toolbar
        const codeToolbar = document.createElement('div');
        codeToolbar.style.cssText = `
            display: flex;
            gap: 8px;
            margin-bottom: 10px;
            padding: 8px;
            background: #2a2a2a;
            border-radius: 4px;
        `;

        const copyCodeBtn = this.createButton('Copy Code', 'fas fa-copy', () => {
            const code = this.codeMirrorEditor ? this.codeMirrorEditor.getValue() : this.codeEditor.value;
            navigator.clipboard.writeText(code);
            this.logToConsole('Code copied to clipboard!', 'success');
        });
        codeToolbar.appendChild(copyCodeBtn);

        const formatCodeBtn = this.createButton('Format Code', 'fas fa-magic', () => {
            if (this.codeMirrorEditor) {
                try {
                    const formatted = this.formatJavaScript(this.codeMirrorEditor.getValue());
                    this.codeMirrorEditor.setValue(formatted);
                    this.logToConsole('Code formatted!', 'success');
                } catch (e) {
                    this.logToConsole('Failed to format code: ' + e.message, 'error');
                }
            }
        });
        codeToolbar.appendChild(formatCodeBtn);

        const validateCodeBtn = this.createButton('Validate', 'fas fa-check-circle', () => {
            this.validateCodeSyntax();
        });
        codeToolbar.appendChild(validateCodeBtn);

        this.codeTabContainer.appendChild(codeToolbar);

        // Code editor container for CodeMirror
        const editorContainer = document.createElement('div');
        editorContainer.id = 'vmb-code-editor-container';
        editorContainer.style.cssText = `
            flex: 1;
            width: 100%;
            background: #1e1e1e;
            border: 1px solid #3e3e3e;
            border-radius: 4px;
            overflow: hidden;
        `;

        // Create textarea for CodeMirror
        this.codeEditor = document.createElement('textarea');
        this.codeEditor.id = 'vmb-code-editor';
        this.codeEditor.style.cssText = `
            width: 100%;
            height: 100%;
            display: none; // Will be replaced by CodeMirror
        `;

        editorContainer.appendChild(this.codeEditor);
        this.codeTabContainer.appendChild(editorContainer);
        contentContainer.appendChild(this.codeTabContainer);

        middleSection.appendChild(contentContainer);
        mainContainer.appendChild(middleSection);

        // Bottom section: properties panel + console panel side by side
        const bottomSection = document.createElement('div');
        bottomSection.style.cssText = `
            display: flex;
            gap: 8px;
            height: 180px;
        `;

        // Properties panel at bottom left
        const propertiesPanel = this.createPropertiesPanel();
        propertiesPanel.style.height = '100%';
        bottomSection.appendChild(propertiesPanel);

        // Console panel at bottom right
        const consolePanel = this.createConsolePanel();
        consolePanel.style.height = '100%';
        bottomSection.appendChild(consolePanel);

        mainContainer.appendChild(bottomSection);

        this.addContent(mainContainer);
    }

    /**
     * Create the tab bar for switching between nodes and code view
     */
    createTabBar() {
        const tabBar = document.createElement('div');
        tabBar.className = 'vmb-tab-bar';
        tabBar.style.cssText = `
            display: flex;
            gap: 4px;
            padding: 0 8px;
            background: #2a2a2a;
            border-radius: 4px;
        `;

        const createTab = (name, label, icon) => {
            const tab = document.createElement('div');
            tab.className = 'vmb-tab';
            tab.dataset.tabName = name; // Add data attribute for easy selection
            tab.style.cssText = `
                padding: 8px 16px;
                background: ${this.currentTab === name ? '#4CAF50' : '#333'};
                border: 1px solid ${this.currentTab === name ? '#66BB6A' : '#555'};
                border-radius: 4px 4px 0 0;
                color: #fff;
                font-size: 13px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.2s;
                user-select: none;
            `;

            const iconEl = document.createElement('i');
            iconEl.className = icon;
            tab.appendChild(iconEl);

            const labelEl = document.createElement('span');
            labelEl.textContent = label;
            tab.appendChild(labelEl);

            tab.addEventListener('click', () => this.switchTab(name));

            tab.addEventListener('mouseenter', () => {
                if (this.currentTab !== name) {
                    tab.style.background = '#444';
                }
            });

            tab.addEventListener('mouseleave', () => {
                if (this.currentTab !== name) {
                    tab.style.background = '#333';
                }
            });

            return tab;
        };

        const nodesTab = createTab('nodes', 'Nodes', 'fas fa-project-diagram');
        const codeTab = createTab('code', 'Code', 'fas fa-code');

        tabBar.appendChild(nodesTab);
        tabBar.appendChild(codeTab);

        return tabBar;
    }

    /**
     * Switch between nodes and code tabs
     */
    async switchTab(tabName) {
        if (this.currentTab === tabName) return;

        const previousTab = this.currentTab;

        if (tabName === 'code') {
            // Switching TO code view - generate code from nodes
            try {
                // Generate code FIRST
                this.generateNodeDefinitionCode();

                console.log('Generated code length:', this.codeEditor.value.length);
                console.log('Code preview:', this.codeEditor.value.substring(0, 200));

                // Update tab state
                this.currentTab = tabName;
                this.nodeTabContainer.style.display = 'none';
                this.codeTabContainer.style.display = 'flex';

                // Hide sidebar in code view
                const sidebar = document.getElementById('vmb-sidebar');
                if (sidebar) sidebar.style.display = 'none';

                // Initialize CodeMirror if not already done
                if (!this.codeMirrorEditor && this.codeEditor) {
                    console.log('Initializing CodeMirror...');
                    await this.initCodeMirrorForVMB();
                }

                // Set the generated code in CodeMirror
                if (this.codeMirrorEditor) {
                    const generatedCode = this.codeEditor.value || '// No code generated';
                    console.log('Setting CodeMirror value, length:', generatedCode.length);
                    this.codeMirrorEditor.setValue(generatedCode);
                    setTimeout(() => {
                        this.codeMirrorEditor.refresh();
                    }, 50);
                } else {
                    console.error('CodeMirror editor not initialized!');
                }

                this.logToConsole('Switched to code view', 'info');

                // DON'T call setupUI() here - it will destroy the CodeMirror instance!
                // Instead just update the tab buttons
                this.updateTabButtons();

            } catch (error) {
                this.logToConsole(`Failed to generate code: ${error.message}`, 'error');
                console.error('Code generation error:', error);
            }

        } else if (tabName === 'nodes') {
            // Switching TO nodes view - parse code and update nodes
            const codeValue = this.codeMirrorEditor ? this.codeMirrorEditor.getValue().trim() : this.codeEditor?.value?.trim() || '';

            // Failsafe: If code is empty or unchanged from last generation, just switch without parsing
            if (!codeValue || codeValue === this.codeEditorContent.trim()) {
                this.currentTab = tabName;
                this.nodeTabContainer.style.display = 'block';
                this.codeTabContainer.style.display = 'none';

                // Show sidebar in nodes view
                const sidebar = document.getElementById('vmb-sidebar');
                if (sidebar) sidebar.style.display = 'block';

                this.logToConsole('Switched to nodes view', 'info');
                this.updateTabButtons();
                
                // Force canvas to resize and render after switching tabs
                setTimeout(() => {
                    if (this.boundHandlers.resize) {
                        this.boundHandlers.resize();
                    }
                    this.render();
                }, 50);
                return;
            }

            // Code has changed, try to parse it
            try {
                // Save current state before attempting to parse
                const backupNodes = JSON.parse(JSON.stringify(this.nodes));
                const backupConnections = JSON.parse(JSON.stringify(this.connections));
                const backupMetadata = {
                    moduleName: this.moduleName,
                    moduleNamespace: this.moduleNamespace,
                    moduleDescription: this.moduleDescription,
                    moduleIcon: this.moduleIcon,
                    moduleColor: this.moduleColor,
                    allowMultiple: this.allowMultiple,
                    drawInEditor: this.drawInEditor
                };

                this.parseNodeDefinitionCode(codeValue);

                this.currentTab = tabName;
                this.nodeTabContainer.style.display = 'block';
                this.codeTabContainer.style.display = 'none';

                // Show sidebar in nodes view
                const sidebar = document.getElementById('vmb-sidebar');
                if (sidebar) sidebar.style.display = 'block';

                this.logToConsole('Code parsed successfully and nodes updated!', 'success');
                this.updateTabButtons();

                // Force canvas to resize and render after switching tabs
                setTimeout(() => {
                    if (this.boundHandlers.resize) {
                        this.boundHandlers.resize();
                    }
                    this.render();
                }, 50);

            } catch (error) {
                // If there's an error, restore backup and stay in code view
                this.logToConsole(`Code parsing error: ${error.message}. Fix the code before switching to nodes view.`, 'error');
                console.error('Parse error:', error);
                alert(`Cannot switch to nodes view due to errors:\n\n${error.message}\n\nPlease fix the code and try again.`);
                // Stay in code view - don't switch
                return;
            }
        }
    }

    /**
     * Update tab button styling without recreating the entire UI
     */
    updateTabButtons() {
        // Use this.content (from EditorWindow) instead of this.modal
        if (!this.content) {
            console.warn('Content element not available yet');
            return;
        }

        const tabBar = this.content.querySelector('.vmb-tab-bar');
        if (!tabBar) {
            console.warn('Tab bar not found in content');
            return;
        }

        const tabs = tabBar.querySelectorAll('.vmb-tab');
        tabs.forEach(tab => {
            const tabName = tab.dataset.tabName;
            if (tabName === this.currentTab) {
                tab.style.background = '#4CAF50';
                tab.style.borderColor = '#66BB6A';
            } else {
                tab.style.background = '#333';
                tab.style.borderColor = '#555';
            }
        });
    }

    /**
     * Initialize CodeMirror for the Visual Module Builder code editor
     */
    async initCodeMirrorForVMB() {
        console.log('initCodeMirrorForVMB called');

        // Dynamically load CodeMirror if not already loaded
        if (!window.CodeMirror) {
            console.log('Loading CodeMirror dependencies...');
            await this.loadCodeMirrorDependencies();
            console.log('CodeMirror loaded:', !!window.CodeMirror);
        }

        const editorTextArea = this.codeEditor;
        if (!editorTextArea) {
            console.error('Code editor textarea not found');
            return;
        }

        console.log('Creating CodeMirror instance from textarea');

        try {
            this.codeMirrorEditor = CodeMirror.fromTextArea(editorTextArea, {
                mode: "javascript",
                theme: "dracula",
                lineNumbers: true,
                autoCloseBrackets: true,
                matchBrackets: true,
                indentUnit: 4,
                tabSize: 4,
                indentWithTabs: false,
                foldGutter: true,
                gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
                extraKeys: {
                    "Ctrl-S": () => {
                        this.logToConsole('Auto-save not needed in code mode. Switch to Nodes tab to parse changes.', 'info');
                        return false;
                    },
                    "Ctrl-F": "findPersistent",
                    "Ctrl-H": "replace",
                    "Ctrl-Space": "autocomplete"
                }
            });

            console.log('CodeMirror instance created:', !!this.codeMirrorEditor);

            // Set initial value
            const initialValue = this.codeEditor.value || '// Code will appear here';
            this.codeMirrorEditor.setValue(initialValue);
            console.log('CodeMirror initial value set, length:', initialValue.length);

            // Setup change event
            this.codeMirrorEditor.on("change", () => {
                // Update the hidden textarea for compatibility
                this.codeEditor.value = this.codeMirrorEditor.getValue();
            });

            // Refresh after a short delay to ensure proper rendering
            setTimeout(() => {
                if (this.codeMirrorEditor) {
                    this.codeMirrorEditor.refresh();
                    console.log('CodeMirror refreshed');
                }
            }, 100);

        } catch (error) {
            console.error('Error creating CodeMirror instance:', error);
            this.logToConsole('Failed to initialize code editor: ' + error.message, 'error');
        }
    }

    /**
     * Load CodeMirror dependencies
     */
    async loadCodeMirrorDependencies() {
        // Create and load CodeMirror CSS
        const loadCSS = (url) => {
            return new Promise((resolve) => {
                // Check if already loaded
                if (document.querySelector(`link[href="${url}"]`)) {
                    resolve();
                    return;
                }
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = url;
                link.onload = () => resolve();
                link.onerror = () => resolve(); // Continue even if load fails
                document.head.appendChild(link);
            });
        };

        // Create and load script
        const loadScript = (url) => {
            return new Promise((resolve) => {
                // Check if already loaded
                if (document.querySelector(`script[src="${url}"]`)) {
                    resolve();
                    return;
                }
                const script = document.createElement('script');
                script.src = url;
                script.onload = () => resolve();
                script.onerror = () => resolve(); // Continue even if load fails
                document.body.appendChild(script);
            });
        };

        // Load required CSS files
        await Promise.all([
            loadCSS("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/codemirror.min.css"),
            loadCSS("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/theme/dracula.min.css"),
            loadCSS("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/fold/foldgutter.min.css"),
            loadCSS("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/hint/show-hint.min.css"),
            loadCSS("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/dialog/dialog.min.css")
        ]);

        // Load required JS files
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/codemirror.min.js");

        // Load modes
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/mode/javascript/javascript.min.js");

        // Load addons
        await Promise.all([
            // Editing addons
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/edit/closebrackets.min.js"),
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/edit/matchbrackets.min.js"),

            // Search addons
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/search/search.min.js"),
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/search/searchcursor.min.js"),
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/dialog/dialog.min.js"),

            // Fold addons
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/fold/foldcode.min.js"),
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/fold/foldgutter.min.js"),
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/fold/brace-fold.min.js"),

            // Hint addons
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/hint/show-hint.min.js"),
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/hint/javascript-hint.min.js"),

            // Other addons
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.3/addon/selection/active-line.min.js")
        ]);
    }

    /**
     * Generate JavaScript code that represents the current node setup
     */
    generateNodeDefinitionCode() {
        try {
            const nodeDefs = this.serializeNodesToDefinition();
            const connDefs = this.serializeConnectionsToDefinition();

            let code = `// Visual Module Builder - Node Definition Code
// This code uses the VMB API to create nodes and connections.
// You can edit this code or paste AI-generated node definitions here.
// When switching back to the Nodes tab, the code will be executed.

// Get the Visual Module Builder instance
const vmb = window.vmbInstance;

// Clear existing nodes and connections
vmb.clearCanvas();

// Store node references for connecting
const nodes = {};

// Create nodes using the API
`;

            // Generate node creation code
            nodeDefs.forEach(nodeDef => {
                // Convert ID to string and make it a valid JavaScript variable name
                // Prefix with 'node_' to ensure it doesn't start with a number
                let varName = String(nodeDef.id).replace(/[^a-zA-Z0-9_]/g, '_');
                if (/^\d/.test(varName)) {
                    varName = 'node_' + varName;
                }

                // Escape the node type properly - use JSON.stringify to handle quotes/special chars
                const escapedType = JSON.stringify(nodeDef.type);

                if (nodeDef.options && Object.keys(nodeDef.options).length > 0) {
                    code += `nodes.${varName} = vmb.createAndAddNode(${escapedType}, ${nodeDef.x}, ${nodeDef.y}, ${JSON.stringify(nodeDef.options, null, 4)});\n`;
                } else {
                    code += `nodes.${varName} = vmb.createAndAddNode(${escapedType}, ${nodeDef.x}, ${nodeDef.y});\n`;
                }
            });

            code += `\n// Create connections using the API\n`;

            // Generate connection code
            connDefs.forEach(connDef => {
                // Convert IDs to strings and make them valid JavaScript variable names
                // Prefix with 'node_' to ensure they don't start with numbers
                let fromVar = String(connDef.fromNodeId).replace(/[^a-zA-Z0-9_]/g, '_');
                let toVar = String(connDef.toNodeId).replace(/[^a-zA-Z0-9_]/g, '_');
                if (/^\d/.test(fromVar)) fromVar = 'node_' + fromVar;
                if (/^\d/.test(toVar)) toVar = 'node_' + toVar;

                code += `vmb.connectNodes(nodes.${fromVar}, ${connDef.fromPort}, nodes.${toVar}, ${connDef.toPort});\n`;
            });

            code += `\n// Update module metadata\n`;
            code += `vmb.moduleName = ${JSON.stringify(this.moduleName)};\n`;
            code += `vmb.moduleNamespace = ${JSON.stringify(this.moduleNamespace)};\n`;
            code += `vmb.moduleDescription = ${JSON.stringify(this.moduleDescription)};\n`;
            code += `vmb.moduleIcon = ${JSON.stringify(this.moduleIcon)};\n`;
            code += `vmb.moduleColor = ${JSON.stringify(this.moduleColor)};\n`;
            code += `vmb.allowMultiple = ${this.allowMultiple};\n`;
            code += `vmb.drawInEditor = ${this.drawInEditor};\n`;

            code += `\n// Mark as having unsaved changes\n`;
            code += `vmb.hasUnsavedChanges = true;\n`;
            code += `vmb.saveState();\n`;

            code += `\n// Log success\n`;
            code += `vmb.logToConsole('Nodes created successfully from code!', 'success');\n`;

            // Ensure codeEditor exists
            if (!this.codeEditor) {
                throw new Error('Code editor not initialized');
            }

            this.codeEditor.value = code;
            this.codeEditorContent = code;
            this.lastValidNodeState = {
                nodes: JSON.parse(JSON.stringify(this.nodes)),
                connections: JSON.parse(JSON.stringify(this.connections))
            };

        } catch (error) {
            console.error('Error generating code:', error);
            // Set a default message if code generation fails
            if (this.codeEditor) {
                this.codeEditor.value = `// Error generating code: ${error.message}\n// Please check the console for details.`;
            }
            throw error;
        }
    }

    /**
     * Serialize nodes to a simple definition format
     */
    serializeNodesToDefinition() {
        return this.nodes.map(node => {
            // Build the options object based on node properties
            const options = {};

            if (node.label !== this.getNodeDefinition(node.type)?.label) {
                options.label = node.label;
            }
            if (node.value !== undefined && node.value !== '') {
                options.value = node.value;
            }
            if (node.exposeProperty) {
                options.exposeProperty = node.exposeProperty;
            }
            if (node.groupName) {
                options.groupName = node.groupName;
            }
            if (node.selectedProperty && node.selectedProperty !== 'none') {
                options.selectedProperty = node.selectedProperty;
            }
            if (node.dropdownValue && node.dropdownValue !== '==') {
                options.dropdownValue = node.dropdownValue;
            }
            if (node.wrapFlowInBraces !== undefined && !node.wrapFlowInBraces) {
                options.wrapFlowInBraces = node.wrapFlowInBraces;
            }

            return {
                id: node.id,
                type: node.type,
                x: node.x,
                y: node.y,
                options: Object.keys(options).length > 0 ? options : undefined
            };
        });
    }

    /**
     * Serialize connections to a simple definition format
     */
    serializeConnectionsToDefinition() {
        return this.connections.map(conn => ({
            fromNodeId: conn.from.node.id,
            fromPort: conn.from.portIndex,
            toNodeId: conn.to.node.id,
            toPort: conn.to.portIndex
        }));
    }

    /**
     * Parse JavaScript code and recreate nodes from definitions
     */
    parseNodeDefinitionCode(code) {
        // Validate code is not empty
        if (!code || code.trim() === '') {
            throw new Error('Code is empty. Nothing to parse.');
        }

        // First, validate the syntax
        try {
            new Function(code);
        } catch (error) {
            throw new Error(`Syntax error: ${error.message}`);
        }

        // Store reference to this instance globally for code access
        window.vmbInstance = this;

        // Save current state for potential rollback
        const backupNodes = JSON.parse(JSON.stringify(this.nodes));
        const backupConnections = JSON.parse(JSON.stringify(this.connections));
        const backupMetadata = {
            moduleName: this.moduleName,
            moduleNamespace: this.moduleNamespace,
            moduleDescription: this.moduleDescription,
            moduleIcon: this.moduleIcon,
            moduleColor: this.moduleColor,
            allowMultiple: this.allowMultiple,
            drawInEditor: this.drawInEditor
        };

        try {
            // Execute the code
            const func = new Function(code);
            func();

            this.hasUnsavedChanges = true;
            this.codeEditorContent = code;

        } catch (error) {
            // Restore previous state if execution failed
            this.nodes = backupNodes;
            this.connections = backupConnections;
            this.moduleName = backupMetadata.moduleName;
            this.moduleNamespace = backupMetadata.moduleNamespace;
            this.moduleDescription = backupMetadata.moduleDescription;
            this.moduleIcon = backupMetadata.moduleIcon;
            this.moduleColor = backupMetadata.moduleColor;
            this.allowMultiple = backupMetadata.allowMultiple;
            this.drawInEditor = backupMetadata.drawInEditor;

            throw new Error(`Execution error: ${error.message}`);
        }
    }

    /**
     * Create a node from a definition object
     */
    createNodeFromDefinition(nodeDef) {
        const node = {
            id: nodeDef.id || this.generateNodeId(),
            type: nodeDef.type,
            x: nodeDef.x || 0,
            y: nodeDef.y || 0,
            label: nodeDef.label || nodeDef.type,
            value: nodeDef.value,
            inputs: nodeDef.inputs || [],
            outputs: nodeDef.outputs || [],
            color: nodeDef.color || '#555',
            icon: nodeDef.icon || '',
            expanded: nodeDef.expanded !== undefined ? nodeDef.expanded : true,
            groupName: nodeDef.groupName || null,
            exposeProperty: nodeDef.exposeProperty || false,
            propertyType: nodeDef.propertyType || 'number',
            dropdownOptions: nodeDef.dropdownOptions || [],
            selectedOption: nodeDef.selectedOption || '',
            isGroup: nodeDef.isGroup || false,
            groupData: nodeDef.groupData || null
        };

        this.nodes.push(node);
        return node;
    }

    /**
     * Validate JavaScript syntax without executing
     */
    validateCodeSyntax(code) {
        if (!code) code = this.codeEditor?.value || '';

        try {
            // Try to parse as a function to check syntax
            new Function(code);
            console.log('✓ Code syntax is valid', 'success');
            return true;
        } catch (error) {
            console.error(`✗ Syntax error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Simple JavaScript code formatter
     */
    formatJavaScript(code) {
        const formatted = JSCodeFormatter.format(code, {
            indentSize: 4,
            indentChar: ' '
        });
        return formatted;
    }

    /**
     * Helper to create a button
     */
    createButton(text, icon, onClick) {
        const btn = document.createElement('button');
        btn.style.cssText = `
            padding: 6px 12px;
            background: #4CAF50;
            border: 1px solid #66BB6A;
            border-radius: 4px;
            color: #fff;
            font-size: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
        `;

        if (icon) {
            const iconEl = document.createElement('i');
            iconEl.className = icon;
            btn.appendChild(iconEl);
        }

        if (text) {
            const textEl = document.createElement('span');
            textEl.textContent = text;
            btn.appendChild(textEl);
        }

        btn.addEventListener('click', onClick);
        btn.addEventListener('mouseenter', () => {
            btn.style.background = '#66BB6A';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.background = '#4CAF50';
        });

        return btn;
    }

    /**
     * Generate a unique node ID
     */
    generateNodeId() {
        return 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Snap a value to the grid
     */
    snapToGridValue(value) {
        if (!this.snapToGrid) return value;
        return Math.round(value / this.gridSize) * this.gridSize;
    }

    /**
     * Snap a position to the grid
     */
    snapPositionToGrid(x, y) {
        if (!this.snapToGrid) return { x, y };
        return {
            x: this.snapToGridValue(x),
            y: this.snapToGridValue(y)
        };
    }

    /**
     * Create the top toolbar
     */
    createToolbar() {
        const toolbar = document.createElement('div');
        toolbar.style.cssText = `
        display: flex;
        gap: 8px;
        padding: 8px;
        background: #2a2a2a;
        border-radius: 4px;
        flex-wrap: wrap;
        align-items: center;
    `;

        // Example selector
        const exampleLabel = document.createElement('label');
        exampleLabel.textContent = 'Example:';
        exampleLabel.style.cssText = 'color: #fff; font-size: 12px; margin-right: 4px;';
        toolbar.appendChild(exampleLabel);

        const exampleSelect = document.createElement('select');
        exampleSelect.style.cssText = `
        padding: 4px 8px;
        background: #333;
        border: 1px solid #555;
        border-radius: 4px;
        color: #fff;
        font-size: 12px;
        cursor: pointer;
    `;

        // Add options
        const examples = VMBExampleModules.getExampleNames();
        examples.forEach(example => {
            const option = document.createElement('option');
            option.value = example.value;
            option.textContent = example.label;
            exampleSelect.appendChild(option);
        });

        exampleSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                this.loadExample(e.target.value);
                // Reset to placeholder
                setTimeout(() => {
                    e.target.value = '';
                }, 100);
            }
        });
        toolbar.appendChild(exampleSelect);

        // Divider
        const divider1 = document.createElement('div');
        divider1.style.cssText = 'width: 1px; height: 20px; background: #555; margin: 0 8px;';
        toolbar.appendChild(divider1);

        // Module name input
        const nameLabel = document.createElement('label');
        nameLabel.textContent = 'Module Name:';
        nameLabel.style.cssText = 'color: #fff; font-size: 12px; margin-right: 4px;';
        toolbar.appendChild(nameLabel);

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = this.moduleName;
        nameInput.style.cssText = `
        padding: 4px 8px;
        background: #333;
        border: 1px solid #555;
        border-radius: 4px;
        color: #fff;
        font-size: 12px;
        width: 150px;
    `;
        nameInput.addEventListener('input', (e) => {
            this.moduleName = e.target.value;
            this.hasUnsavedChanges = true;
        });
        toolbar.appendChild(nameInput);

        // Divider
        const divider = () => {
            const div = document.createElement('div');
            div.style.cssText = 'width: 1px; height: 20px; background: #555; margin: 0 8px;';
            return div;
        };
        toolbar.appendChild(divider());

        // Snap to Grid Toggle
        const snapLabel = document.createElement('label');
        snapLabel.style.cssText = `
        color: #fff;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        padding: 4px 8px;
        background: ${this.snapToGrid ? '#4CAF50' : '#444'};
        border: 1px solid ${this.snapToGrid ? '#66BB6A' : '#666'};
        border-radius: 4px;
        transition: all 0.2s;
    `;

        const snapCheckbox = document.createElement('input');
        snapCheckbox.type = 'checkbox';
        snapCheckbox.checked = this.snapToGrid;
        snapCheckbox.style.cssText = 'cursor: pointer;';

        const snapText = document.createElement('span');
        snapText.innerHTML = '<i class="fas fa-border-all" style="margin-right: 4px;" title="Snap to Grid"></i>';

        snapCheckbox.addEventListener('change', (e) => {
            this.snapToGrid = e.target.checked;
            snapLabel.style.background = this.snapToGrid ? '#4CAF50' : '#444';
            snapLabel.style.borderColor = this.snapToGrid ? '#66BB6A' : '#666';
        });

        snapLabel.appendChild(snapCheckbox);
        snapLabel.appendChild(snapText);
        toolbar.appendChild(snapLabel);

        // Group Panels Toggle
        const groupPanelsLabel = document.createElement('label');
        groupPanelsLabel.style.cssText = `
        color: #fff;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        padding: 4px 8px;
        background: ${this.showGroupPanels ? '#4CAF50' : '#444'};
        border: 1px solid ${this.showGroupPanels ? '#66BB6A' : '#666'};
        border-radius: 4px;
        transition: all 0.2s;
    `;

        const groupPanelsCheckbox = document.createElement('input');
        groupPanelsCheckbox.type = 'checkbox';
        groupPanelsCheckbox.checked = this.showGroupPanels;
        groupPanelsCheckbox.style.cssText = 'cursor: pointer;';

        const groupPanelsText = document.createElement('span');
        groupPanelsText.innerHTML = '<i class="fas fa-layer-group" style="margin-right: 4px;" title="Group Panels"></i>';

        groupPanelsCheckbox.addEventListener('change', (e) => {
            this.showGroupPanels = e.target.checked;
            groupPanelsLabel.style.background = this.showGroupPanels ? '#4CAF50' : '#444';
            groupPanelsLabel.style.borderColor = this.showGroupPanels ? '#66BB6A' : '#666';
        });

        groupPanelsLabel.appendChild(groupPanelsCheckbox);
        groupPanelsLabel.appendChild(groupPanelsText);
        toolbar.appendChild(groupPanelsLabel);

        // ========== NEW: MINIMAP TOGGLE ==========
        const minimapLabel = document.createElement('label');
        minimapLabel.style.cssText = `
        color: #fff;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        padding: 4px 8px;
        background: ${this.showMinimap ? '#4CAF50' : '#444'};
        border: 1px solid ${this.showMinimap ? '#66BB6A' : '#666'};
        border-radius: 4px;
        transition: all 0.2s;
    `;

        const minimapCheckbox = document.createElement('input');
        minimapCheckbox.type = 'checkbox';
        minimapCheckbox.checked = this.showMinimap;
        minimapCheckbox.style.cssText = 'cursor: pointer;';

        const minimapText = document.createElement('span');
        minimapText.innerHTML = '<i class="fas fa-map" style="margin-right: 4px;" title="Minimap"></i>';

        minimapCheckbox.addEventListener('change', (e) => {
            this.showMinimap = e.target.checked;
            minimapLabel.style.background = this.showMinimap ? '#4CAF50' : '#444';
            minimapLabel.style.borderColor = this.showMinimap ? '#66BB6A' : '#666';

            if (this.minimapCanvas) {
                this.minimapCanvas.style.display = this.showMinimap ? 'block' : 'none';
            }
        });

        minimapLabel.appendChild(minimapCheckbox);
        minimapLabel.appendChild(minimapText);
        toolbar.appendChild(minimapLabel);

        // ========== NEW: SIMPLIFIED CONNECTORS TOGGLE ==========
        const simplifiedLabel = document.createElement('label');
        simplifiedLabel.style.cssText = `
        color: #fff;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        padding: 4px 8px;
        background: ${this.simplifiedConnectors ? '#4CAF50' : '#444'};
        border: 1px solid ${this.simplifiedConnectors ? '#66BB6A' : '#666'};
        border-radius: 4px;
        transition: all 0.2s;
    `;

        const simplifiedCheckbox = document.createElement('input');
        simplifiedCheckbox.type = 'checkbox';
        simplifiedCheckbox.checked = this.simplifiedConnectors;
        simplifiedCheckbox.style.cssText = 'cursor: pointer;';

        const simplifiedText = document.createElement('span');
        simplifiedText.innerHTML = '<i class="fas fa-minus" style="margin-right: 4px;" title="Simplified Connectors"></i>';

        simplifiedCheckbox.addEventListener('change', (e) => {
            this.simplifiedConnectors = e.target.checked;
            localStorage.setItem('vmb_simplifiedConnectors', e.target.checked.toString());
            simplifiedLabel.style.background = this.simplifiedConnectors ? '#4CAF50' : '#444';
            simplifiedLabel.style.borderColor = this.simplifiedConnectors ? '#66BB6A' : '#666';
        });

        simplifiedLabel.appendChild(simplifiedCheckbox);
        simplifiedLabel.appendChild(simplifiedText);
        toolbar.appendChild(simplifiedLabel);

        toolbar.appendChild(divider());

        // Connection Color Picker
        const connectionColorLabel = document.createElement('label');
        connectionColorLabel.style.cssText = `
        color: #fff;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        padding: 4px 8px;
        background: #444;
        border: 1px solid #666;
        border-radius: 4px;
        transition: all 0.2s;
    `;

        const connectionColorText = document.createElement('span');
        connectionColorText.innerHTML = '<i class="fas fa-palette" style="margin-right: 4px;" title="Connection Color"></i>';

        const connectionColorInput = document.createElement('input');
        connectionColorInput.type = 'color';
        connectionColorInput.value = this.connectionColor;
        connectionColorInput.style.cssText = `
        width: 30px;
        height: 20px;
        border: none;
        cursor: pointer;
        background: transparent;
    `;

        connectionColorInput.addEventListener('change', (e) => {
            this.connectionColor = e.target.value;
            localStorage.setItem('vmb_connectionColor', this.connectionColor);
        });

        connectionColorLabel.appendChild(connectionColorText);
        connectionColorLabel.appendChild(connectionColorInput);
        toolbar.appendChild(connectionColorLabel);

        toolbar.appendChild(divider());

        // Action buttons
        const buttons = [
            { text: '', icon: '📄', action: () => this.newProject(), title: 'New Project' },
            { text: '', icon: '💾', action: () => this.saveProject(), title: 'Save Project' },
            { text: '', icon: '📂', action: () => this.loadProject(), title: 'Load Project' },
            { text: '', icon: '⬇️', action: () => this.saveProjectToDesktop(), title: 'Save to Desktop' },
            { text: '', icon: '⬆️', action: () => this.loadProjectFromDesktop(), title: 'Load from Desktop' },
            { text: '', icon: '↶', action: () => this.undo(), title: 'Undo (Ctrl+Z)' },
            { text: '', icon: '↷', action: () => this.redo(), title: 'Redo (Ctrl+Shift+Z)' },
            //{ text: 'Command', icon: '⌘', action: () => this.toggleCommandPalette(), title: 'Command Palette (Ctrl+Space)' },
            { text: '', icon: '📤', action: () => this.exportModule(), highlight: true, title: 'Export Module' },
            { text: '', icon: '✓', action: () => this.validateGraph(), title: 'Validate Graph (check for errors)' },
            { text: '', icon: '🗑️', action: () => this.clearCanvas(), title: 'Clear Canvas' },
            { text: '', icon: '❓', action: () => this.showHelp(), title: 'Show Documentation' }
        ];

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.innerHTML = `${btn.icon} ${btn.text}`;
            button.title = btn.title || '';
            button.style.cssText = btn.style || `
            padding: 6px 12px;
            background: ${btn.highlight ? '#4CAF50' : '#444'};
            border: 1px solid ${btn.highlight ? '#66BB6A' : '#666'};
            border-radius: 4px;
            color: #fff;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
        `;
            button.addEventListener('mouseenter', () => {
                button.style.background = btn.highlight ? '#66BB6A' : '#555';
            });
            button.addEventListener('mouseleave', () => {
                button.style.background = btn.highlight ? '#4CAF50' : '#444';
            });
            button.addEventListener('click', btn.action);
            toolbar.appendChild(button);
        });

        return toolbar;
    }

    /**
     * Create the left sidebar with node library
     */
    createSidebar() {
        const sidebar = document.createElement('div');
        sidebar.className = 'vmb-sidebar';
        sidebar.style.cssText = `
        width: 220px;
        background: #2a2a2a;
        border-radius: 4px;
        overflow-y: auto;
        padding: 8px;
    `;

        const title = document.createElement('div');
        title.textContent = 'Node Library';
        title.style.cssText = `
        color: #fff;
        font-weight: bold;
        margin-bottom: 12px;
        font-size: 14px;
        padding-bottom: 8px;
        border-bottom: 1px solid #444;
    `;
        sidebar.appendChild(title);

        // Custom Node Toolbar
        const customNodeToolbar = document.createElement('div');
        customNodeToolbar.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid #444;
    `;

        // Create Custom Node Button
        const createNodeBtn = document.createElement('button');
        createNodeBtn.innerHTML = '✨ Create Custom Node';
        createNodeBtn.style.cssText = `
        padding: 8px 10px;
        background: #4CAF50;
        border: 1px solid #66BB6A;
        border-radius: 4px;
        color: #fff;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
        font-weight: 500;
    `;
        createNodeBtn.addEventListener('mouseenter', () => {
            createNodeBtn.style.background = '#66BB6A';
        });
        createNodeBtn.addEventListener('mouseleave', () => {
            createNodeBtn.style.background = '#4CAF50';
        });
        createNodeBtn.addEventListener('click', () => this.showNodeBuilder());
        customNodeToolbar.appendChild(createNodeBtn);

        // Button Container for Export/Import
        const importExportContainer = document.createElement('div');
        importExportContainer.style.cssText = `
        display: flex;
        gap: 6px;
    `;

        // Export Nodes Button
        const exportNodesBtn = document.createElement('button');
        exportNodesBtn.innerHTML = '📤 Export';
        exportNodesBtn.title = 'Export custom nodes to share';
        exportNodesBtn.style.cssText = `
        padding: 6px 10px;
        background: #2196F3;
        border: 1px solid #42A5F5;
        border-radius: 4px;
        color: #fff;
        cursor: pointer;
        font-size: 11px;
        transition: all 0.2s;
        flex: 1;
    `;
        exportNodesBtn.addEventListener('mouseenter', () => {
            exportNodesBtn.style.background = '#42A5F5';
        });
        exportNodesBtn.addEventListener('mouseleave', () => {
            exportNodesBtn.style.background = '#2196F3';
        });
        exportNodesBtn.addEventListener('click', () => this.exportCustomNodes());
        importExportContainer.appendChild(exportNodesBtn);

        // Import Nodes Button
        const importNodesBtn = document.createElement('button');
        importNodesBtn.innerHTML = '📥 Import';
        importNodesBtn.title = 'Import custom nodes from file';
        importNodesBtn.style.cssText = `
        padding: 6px 10px;
        background: #FF9800;
        border: 1px solid #FFA726;
        border-radius: 4px;
        color: #fff;
        cursor: pointer;
        font-size: 11px;
        transition: all 0.2s;
        flex: 1;
    `;
        importNodesBtn.addEventListener('mouseenter', () => {
            importNodesBtn.style.background = '#FFA726';
        });
        importNodesBtn.addEventListener('mouseleave', () => {
            importNodesBtn.style.background = '#FF9800';
        });
        importNodesBtn.addEventListener('click', () => this.importCustomNodes());
        importExportContainer.appendChild(importNodesBtn);

        //customNodeToolbar.appendChild(importExportContainer);
        //sidebar.appendChild(customNodeToolbar);

        // Search box
        const searchBox = document.createElement('input');
        searchBox.type = 'text';
        searchBox.placeholder = 'Search nodes...';
        searchBox.style.cssText = `
        width: 100%;
        padding: 6px 8px;
        background: #333;
        border: 1px solid #555;
        border-radius: 4px;
        color: #fff;
        font-size: 12px;
        margin-bottom: 12px;
        box-sizing: border-box;
    `;
        searchBox.addEventListener('input', (e) => this.filterNodes(e.target.value));
        sidebar.appendChild(searchBox);

        // Node categories
        Object.keys(this.nodeLibrary).forEach(category => {
            const categoryDiv = this.createNodeCategory(category, this.nodeLibrary[category]);
            sidebar.appendChild(categoryDiv);
        });

        return sidebar;
    }

    /**
     * Export custom nodes to a file
     */
    async exportCustomNodes() {
        // Collect custom node definitions from the node library
        const customNodes = [];
        for (const category in this.nodeLibrary) {
            for (const nodeDef of this.nodeLibrary[category]) {
                if (nodeDef.custom) {
                    // Save custom node definition (excluding the codeGen function which will be recreated)
                    customNodes.push({
                        category: category,
                        type: nodeDef.type,
                        label: nodeDef.label,
                        color: nodeDef.color,
                        icon: nodeDef.icon,
                        inputs: nodeDef.inputs,
                        outputs: nodeDef.outputs,
                        hasInput: nodeDef.hasInput,
                        hasToggle: nodeDef.hasToggle,
                        hasDropdown: nodeDef.hasDropdown,
                        dropdownOptions: nodeDef.dropdownOptions,
                        defaultValue: nodeDef.defaultValue,
                        hasColorPicker: nodeDef.hasColorPicker,
                        hasExposeCheckbox: nodeDef.hasExposeCheckbox,
                        isGroup: nodeDef.isGroup,
                        wrapFlowNode: nodeDef.wrapFlowNode,
                        codeGenString: nodeDef.codeGen ? nodeDef.codeGen.toString() : null
                    });
                }
            }
        }

        if (customNodes.length === 0) {
            this.showNotification('No custom nodes to export.', 'warning');
            return;
        }

        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            customNodes: customNodes
        };

        // Create a downloadable file
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `custom-nodes-${Date.now()}.vmbn`; // VMB Nodes file
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification(`Exported ${customNodes.length} custom node(s) successfully!`, 'success');
    }

    /**
     * Import custom nodes from a file
     */
    async importCustomNodes() {
        // Create file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.vmbn,.json';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const importData = JSON.parse(text);

                if (!importData.customNodes || !Array.isArray(importData.customNodes)) {
                    throw new Error('Invalid custom nodes file format.');
                }

                let importedCount = 0;
                let skippedCount = 0;

                for (const customNodeData of importData.customNodes) {
                    // Check if node type already exists
                    let nodeExists = false;
                    for (const category in this.nodeLibrary) {
                        if (this.nodeLibrary[category].find(n => n.type === customNodeData.type)) {
                            nodeExists = true;
                            break;
                        }
                    }

                    if (nodeExists) {
                        skippedCount++;
                        console.log(`Skipped duplicate node type: ${customNodeData.type}`);
                        continue;
                    }

                    // Recreate the codeGen function
                    let codeGenFunction = null;
                    if (customNodeData.codeGenString) {
                        try {
                            codeGenFunction = eval(`(${customNodeData.codeGenString})`);
                        } catch (e) {
                            console.error(`Failed to restore codeGen for custom node ${customNodeData.type}:`, e);
                        }
                    }

                    // Create the node definition
                    const nodeDef = {
                        type: customNodeData.type,
                        label: customNodeData.label,
                        color: customNodeData.color,
                        icon: customNodeData.icon,
                        inputs: customNodeData.inputs || [],
                        outputs: customNodeData.outputs || [],
                        hasInput: customNodeData.hasInput || false,
                        hasToggle: customNodeData.hasToggle || false,
                        hasDropdown: customNodeData.hasDropdown || false,
                        dropdownOptions: customNodeData.dropdownOptions || [],
                        defaultValue: customNodeData.defaultValue,
                        hasColorPicker: customNodeData.hasColorPicker || false,
                        hasExposeCheckbox: customNodeData.hasExposeCheckbox || false,
                        isGroup: customNodeData.isGroup || false,
                        wrapFlowNode: customNodeData.wrapFlowNode !== undefined ? customNodeData.wrapFlowNode : true,
                        codeGen: codeGenFunction,
                        custom: true
                    };

                    // Add to the appropriate category (or create it if it doesn't exist)
                    const category = customNodeData.category || 'Custom';
                    if (!this.nodeLibrary[category]) {
                        this.nodeLibrary[category] = [];
                    }
                    this.nodeLibrary[category].push(nodeDef);
                    importedCount++;
                }

                // Rebuild the sidebar to show new nodes
                const sidebarContainer = this.container.querySelector('.vmb-sidebar');
                if (sidebarContainer) {
                    const newSidebar = this.createSidebar();
                    sidebarContainer.parentNode.replaceChild(newSidebar, sidebarContainer);
                    newSidebar.className = 'vmb-sidebar';
                }

                let message = `Imported ${importedCount} custom node(s)`;
                if (skippedCount > 0) {
                    message += ` (${skippedCount} skipped - already exists)`;
                }
                this.showNotification(message, 'success');

            } catch (error) {
                console.error('Import error:', error);
                this.showNotification(`Error importing nodes: ${error.message}`, 'error');
            }
        };

        input.click();
    }

    /**
     * Create a node category section
     */
    createNodeCategory(categoryName, nodes) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'node-category';
        categoryDiv.style.cssText = 'margin-bottom: 8px;';

        const header = document.createElement('div');
        header.style.cssText = `
        color: #aaa;
        font-size: 11px;
        font-weight: bold;
        text-transform: uppercase;
        margin-bottom: 8px;
        letter-spacing: 0.5px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px;
        border-radius: 4px;
        transition: background 0.2s;
    `;

        const isCollapsed = this.collapsedCategories.has(categoryName);

        const arrow = document.createElement('span');
        arrow.textContent = isCollapsed ? '▶' : '▼';
        arrow.style.cssText = 'font-size: 8px; transition: transform 0.2s;';

        const title = document.createElement('span');
        title.textContent = categoryName;

        header.appendChild(arrow);
        header.appendChild(title);

        header.addEventListener('mouseenter', () => {
            header.style.background = '#333';
        });

        header.addEventListener('mouseleave', () => {
            header.style.background = 'transparent';
        });

        header.addEventListener('click', () => {
            const nowCollapsed = !this.collapsedCategories.has(categoryName);
            if (nowCollapsed) {
                this.collapsedCategories.add(categoryName);
                arrow.textContent = '▶';
                nodesContainer.style.display = 'none';
            } else {
                this.collapsedCategories.delete(categoryName);
                arrow.textContent = '▼';
                nodesContainer.style.display = 'block';
            }
        });

        categoryDiv.appendChild(header);

        const nodesContainer = document.createElement('div');
        nodesContainer.style.display = isCollapsed ? 'none' : 'block';

        nodes.forEach(node => {
            const nodeItem = document.createElement('div');
            nodeItem.className = 'node-library-item';
            nodeItem.dataset.nodeType = node.type;

            // FIX: Add icon support
            if (node.icon) {
                nodeItem.innerHTML = `<i class="${node.icon}" style="margin-right: 6px;"></i>${node.label}`;
            } else {
                nodeItem.textContent = node.label;
            }

            nodeItem.style.cssText = `
            padding: 8px;
            background: ${node.color}33;
            border: 1px solid ${node.color};
            border-radius: 4px;
            color: #fff;
            cursor: grab;
            margin-bottom: 4px;
            font-size: 12px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
        `;

            nodeItem.addEventListener('mouseenter', () => {
                nodeItem.style.background = `${node.color}55`;
                nodeItem.style.transform = 'translateX(4px)';
            });

            nodeItem.addEventListener('mouseleave', () => {
                nodeItem.style.background = `${node.color}33`;
                nodeItem.style.transform = 'translateX(0)';
            });

            nodeItem.addEventListener('mousedown', (e) => {
                this.startNodeDrag(node, e);
            });

            nodesContainer.appendChild(nodeItem);
        });

        categoryDiv.appendChild(nodesContainer);

        return categoryDiv;
    }

    /**
     * Create the bottom properties panel
     */
    createPropertiesPanel() {
        const panel = document.createElement('div');
        panel.id = 'properties-panel';
        panel.style.cssText = `
        flex: 1;
        background: #2a2a2a;
        border-radius: 4px;
        padding: 12px;
        overflow-y: auto;
    `;

        const title = document.createElement('div');
        title.textContent = 'Module Properties';
        title.style.cssText = `
        color: #fff;
        font-weight: bold;
        margin-bottom: 12px;
        font-size: 14px;
        padding-bottom: 8px;
        border-bottom: 1px solid #444;
    `;
        panel.appendChild(title);

        // Create property inputs
        const properties = [
            { label: 'Namespace', key: 'moduleNamespace', type: 'text' },
            { label: 'Description', key: 'moduleDescription', type: 'text' },
            { label: 'Icon Class', key: 'moduleIcon', type: 'icon-select' },
            { label: 'Color', key: 'moduleColor', type: 'color' },
            { label: 'Allow Multiple', key: 'allowMultiple', type: 'checkbox' },
            { label: 'Draw In Editor', key: 'drawInEditor', type: 'checkbox' }
        ];

        properties.forEach(prop => {
            const row = document.createElement('div');
            row.style.cssText = `
            display: flex;
            align-items: center;
            margin-bottom: 8px;
            gap: 8px;
        `;

            const label = document.createElement('label');
            label.textContent = prop.label + ':';
            label.style.cssText = `
            color: #aaa;
            font-size: 12px;
            min-width: 120px;
        `;
            row.appendChild(label);

            if (prop.type === 'checkbox') {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = this[prop.key];
                checkbox.addEventListener('change', (e) => {
                    this[prop.key] = e.target.checked;
                    this.hasUnsavedChanges = true;
                });
                row.appendChild(checkbox);
            } else if (prop.type === 'color') {
                const colorContainer = document.createElement('div');
                colorContainer.style.cssText = `
                flex: 1;
                display: flex;
                align-items: center;
                gap: 8px;
            `;

                const colorInput = document.createElement('input');
                colorInput.type = 'color';
                colorInput.value = this[prop.key] || '#4CAF50';
                colorInput.style.cssText = `
                width: 40px;
                height: 28px;
                border: 1px solid #555;
                border-radius: 4px;
                cursor: pointer;
                background: none;
            `;
                colorInput.addEventListener('input', (e) => {
                    this[prop.key] = e.target.value;
                    this.hasUnsavedChanges = true;
                    textInput.value = e.target.value;
                });

                const textInput = document.createElement('input');
                textInput.type = 'text';
                textInput.value = this[prop.key] || '#4CAF50';
                textInput.style.cssText = `
                flex: 1;
                padding: 4px 8px;
                background: #333;
                border: 1px solid #555;
                border-radius: 4px;
                color: #fff;
                font-size: 12px;
                font-family: monospace;
            `;
                textInput.addEventListener('input', (e) => {
                    if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                        this[prop.key] = e.target.value;
                        colorInput.value = e.target.value;
                        this.hasUnsavedChanges = true;
                    }
                });

                colorContainer.appendChild(colorInput);
                colorContainer.appendChild(textInput);
                row.appendChild(colorContainer);
            } else if (prop.type === 'icon-select') {
                // Icon selector with datalist
                const iconContainer = document.createElement('div');
                iconContainer.style.cssText = `
                flex: 1;
                display: flex;
                align-items: center;
                gap: 4px;
            `;

                const input = document.createElement('input');
                input.type = 'text';
                input.value = this[prop.key];
                input.setAttribute('list', 'icon-list');
                input.placeholder = 'e.g., fas fa-cube';
                input.style.cssText = `
                flex: 1;
                padding: 4px 8px;
                background: #333;
                border: 1px solid #555;
                border-radius: 4px 0 0 4px;
                color: #fff;
                font-size: 12px;
            `;
                input.addEventListener('input', (e) => {
                    this[prop.key] = e.target.value;
                    this.hasUnsavedChanges = true;
                    previewIcon.className = e.target.value;
                });

                const dropdownBtn = document.createElement('button');
                dropdownBtn.innerHTML = '▼';
                dropdownBtn.title = 'Show all icons';
                dropdownBtn.style.cssText = `
                padding: 4px 8px;
                background: #444;
                border: 1px solid #555;
                border-left: none;
                border-radius: 0;
                color: #fff;
                cursor: pointer;
                font-size: 10px;
                transition: all 0.2s;
            `;
                dropdownBtn.addEventListener('mouseenter', () => {
                    dropdownBtn.style.background = '#555';
                });
                dropdownBtn.addEventListener('mouseleave', () => {
                    dropdownBtn.style.background = '#444';
                });
                dropdownBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showIconDropdown(input, previewIcon, prop.key);
                });

                if (!document.getElementById('icon-list')) {
                    const datalist = document.createElement('datalist');
                    datalist.id = 'icon-list';
                    const commonIcons = this.iconList;
                    commonIcons.forEach(icon => {
                        const option = document.createElement('option');
                        option.value = icon;
                        datalist.appendChild(option);
                    });
                    document.body.appendChild(datalist);
                }

                const previewIcon = document.createElement('i');
                previewIcon.className = this[prop.key];
                previewIcon.style.cssText = `
                color: #fff;
                font-size: 16px;
                width: 20px;
                text-align: center;
            `;

                const helpBtn = document.createElement('button');
                helpBtn.innerHTML = '❓';
                helpBtn.title = 'Browse Font Awesome icons';
                helpBtn.style.cssText = `
                padding: 4px 8px;
                background: #2196F3;
                border: 1px solid #42A5F5;
                border-radius: 0 4px 4px 0;
                color: #fff;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
            `;
                helpBtn.addEventListener('mouseenter', () => {
                    helpBtn.style.background = '#42A5F5';
                });
                helpBtn.addEventListener('mouseleave', () => {
                    helpBtn.style.background = '#2196F3';
                });
                helpBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.open('https://fontawesome.com/search?o=r&m=free', '_blank');
                });

                iconContainer.appendChild(input);
                iconContainer.appendChild(dropdownBtn);
                iconContainer.appendChild(previewIcon);
                iconContainer.appendChild(helpBtn);
                row.appendChild(iconContainer);
            } else {
                const input = document.createElement('input');
                input.type = 'text';
                input.value = this[prop.key];
                input.style.cssText = `
                flex: 1;
                padding: 4px 8px;
                background: #333;
                border: 1px solid #555;
                border-radius: 4px;
                color: #fff;
                font-size: 12px;
            `;
                input.addEventListener('input', (e) => {
                    this[prop.key] = e.target.value;
                    this.hasUnsavedChanges = true;
                });
                row.appendChild(input);
            }

            panel.appendChild(row);
        });

        return panel;
    }

    /**
     * Show icon dropdown menu
     */
    showIconDropdown(inputElement, previewIcon, propertyKey, callback = null) {
        // Remove existing dropdown if any
        const existingDropdown = document.querySelector('.icon-dropdown-menu');
        if (existingDropdown) {
            existingDropdown.remove();
            return;
        }

        const rect = inputElement.getBoundingClientRect();
        const dropdown = document.createElement('div');
        dropdown.className = 'icon-dropdown-menu';

        // Calculate position (drop up instead of down)
        const dropdownHeight = 300;
        const dropdownWidth = Math.max(rect.width + 100, 350);

        dropdown.style.cssText = `
        position: fixed;
        left: ${rect.left}px;
        bottom: ${window.innerHeight - rect.top + 2}px;
        width: ${dropdownWidth}px;
        height: ${dropdownHeight}px;
        background: #2a2a2a;
        border: 1px solid #555;
        border-radius: 4px;
        overflow-y: auto;
        z-index: 10001;
        box-shadow: 0 -4px 12px rgba(0,0,0,0.5);
        padding: 4px;
    `;

        const commonIcons = this.iconList;

        commonIcons.forEach(iconClass => {
            const item = document.createElement('div');
            item.style.cssText = `
            padding: 8px 10px;
            cursor: pointer;
            border-radius: 4px;
            transition: background 0.2s;
            display: flex;
            align-items: center;
            gap: 12px;
            color: #fff;
            font-size: 12px;
        `;

            // Icon preview with larger size
            const icon = document.createElement('i');
            icon.className = iconClass;
            icon.style.cssText = `
            width: 24px; 
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            color: #64B5F6;
        `;

            const text = document.createElement('span');
            text.textContent = iconClass;
            text.style.cssText = 'flex: 1; font-family: monospace;';

            item.appendChild(icon);
            item.appendChild(text);

            item.addEventListener('mouseenter', () => {
                item.style.background = '#444';
            });

            item.addEventListener('mouseleave', () => {
                item.style.background = 'transparent';
            });

            item.addEventListener('click', () => {
                inputElement.value = iconClass;
                if (propertyKey) {
                    this[propertyKey] = iconClass;
                    this.hasUnsavedChanges = true;
                }
                if (callback) {
                    callback(iconClass);
                }
                previewIcon.className = iconClass;
                dropdown.remove();
            });

            dropdown.appendChild(item);
        });

        document.body.appendChild(dropdown);

        // Close dropdown when clicking outside
        const closeDropdown = (e) => {
            if (!dropdown.contains(e.target) && e.target !== inputElement) {
                dropdown.remove();
                document.removeEventListener('mousedown', closeDropdown);
            }
        };

        setTimeout(() => {
            document.addEventListener('mousedown', closeDropdown);
        }, 100);
    }

    /**
     * Create the console panel for validation messages
     */
    createConsolePanel() {
        const panel = document.createElement('div');
        panel.id = 'console-panel';
        panel.style.cssText = `
        flex: 1;
        background: #1a1a1a;
        border-radius: 4px;
        padding: 8px;
        overflow-y: auto;
        font-family: monospace;
        font-size: 11px;
        display: flex;
        flex-direction: column;
    `;

        const header = document.createElement('div');
        header.style.cssText = `
        color: #fff;
        font-weight: bold;
        margin-bottom: 8px;
        font-size: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid #444;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;

        const titleText = document.createElement('span');
        titleText.textContent = 'Console';
        header.appendChild(titleText);

        const buttonGroup = document.createElement('div');
        buttonGroup.style.cssText = 'display: flex; gap: 4px;';

        // ========== NEW: TEST MODULE BUTTON ==========
        const testBtn = document.createElement('button');
        testBtn.textContent = 'Test Module';
        testBtn.title = 'Test the module in a live preview (Ctrl+T)';
        testBtn.style.cssText = `
        padding: 2px 8px;
        background: #2196F3;
        border: 1px solid #42A5F5;
        border-radius: 3px;
        color: #fff;
        cursor: pointer;
        font-size: 10px;
        transition: all 0.2s;
    `;
        testBtn.addEventListener('mouseenter', () => testBtn.style.background = '#42A5F5');
        testBtn.addEventListener('mouseleave', () => testBtn.style.background = '#2196F3');
        testBtn.addEventListener('click', () => this.toggleTestPanel());
        //buttonGroup.appendChild(testBtn);

        const clearBtn = document.createElement('button');
        clearBtn.textContent = 'Clear';
        clearBtn.style.cssText = `
        padding: 2px 8px;
        background: #444;
        border: 1px solid #666;
        border-radius: 3px;
        color: #fff;
        cursor: pointer;
        font-size: 10px;
    `;
        clearBtn.addEventListener('click', () => {
            const messages = panel.querySelector('.console-messages');
            if (messages) messages.innerHTML = '';
        });
        buttonGroup.appendChild(clearBtn);

        header.appendChild(buttonGroup);
        panel.appendChild(header);

        // ========== NEW: SPLIT CONTAINER FOR CONSOLE AND TEST PANEL ==========
        const splitContainer = document.createElement('div');
        splitContainer.style.cssText = `
        display: flex;
        flex: 1;
        gap: 8px;
        min-height: 0;
    `;

        // Console messages
        const messagesContainer = document.createElement('div');
        messagesContainer.style.cssText = 'flex: 1; overflow-y: auto;';
        const messagesDiv = document.createElement('div');
        messagesDiv.className = 'console-messages';
        messagesContainer.appendChild(messagesDiv);
        splitContainer.appendChild(messagesContainer);

        // ========== NEW: TEST PANEL CANVAS ==========
        const testPanelContainer = document.createElement('div');
        testPanelContainer.id = 'test-panel-container';
        testPanelContainer.style.cssText = `
        flex: 1;
        background: #000;
        border-radius: 4px;
        border: 2px solid #2196F3;
        display: none;
        flex-direction: column;
        overflow: hidden;
    `;

        const testPanelHeader = document.createElement('div');
        testPanelHeader.style.cssText = `
        background: #2196F3;
        color: #fff;
        padding: 4px 8px;
        font-size: 11px;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;

        const testPanelTitle = document.createElement('span');
        testPanelTitle.textContent = 'Module Test Preview';
        testPanelHeader.appendChild(testPanelTitle);

        const refreshTestBtn = document.createElement('button');
        refreshTestBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        refreshTestBtn.title = 'Refresh the test module';
        refreshTestBtn.style.cssText = `
        padding: 2px 6px;
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.3);
        border-radius: 3px;
        color: #fff;
        cursor: pointer;
        font-size: 9px;
    `;
        refreshTestBtn.addEventListener('click', () => this.refreshTestModule());
        testPanelHeader.appendChild(refreshTestBtn);

        testPanelContainer.appendChild(testPanelHeader);

        const testCanvasWrapper = document.createElement('div');
        testCanvasWrapper.style.cssText = 'flex: 1; position: relative; overflow: hidden;';

        this.testCanvas = document.createElement('canvas');
        this.testCanvas.width = 400;
        this.testCanvas.height = 300;
        this.testCanvas.style.cssText = 'width: 100%; height: 100%; image-rendering: pixelated;';
        testCanvasWrapper.appendChild(this.testCanvas);

        testPanelContainer.appendChild(testCanvasWrapper);
        splitContainer.appendChild(testPanelContainer);

        panel.appendChild(splitContainer);

        this.consolePanel = messagesDiv;
        this.testPanelContainer = testPanelContainer;
        return panel;
    }

    /**
     * Setup canvas rendering
     */
    setupCanvas() {
        this.ctx = this.canvas.getContext('2d');

        // Prevent text selection while dragging
        this.canvas.style.userSelect = 'none';
        this.canvas.style.webkitUserSelect = 'none';

        // ========== NEW: CREATE MINIMAP CANVAS ==========
        this.createMinimap();

        // Handle canvas resize
        const resizeCanvas = () => {
            const rect = this.canvas.getBoundingClientRect();
            // NEW: Store old dimensions for scaling
            const oldWidth = this.canvas.width || rect.width;
            const oldHeight = this.canvas.height || rect.height;

            // Set canvas internal resolution to match display size
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;

            // Re-render to avoid stretched canvas
            this.render();
        };

        this.boundHandlers.resize = resizeCanvas;

        resizeCanvas();
        window.addEventListener('resize', this.boundHandlers.resize);

        // Start render loop
        this.renderLoop();
    }

    /**
     * Called when the window is resized
     * @param {number} width - New width
     * @param {number} height - New height
     */
    onResize(width, height) {
        // Trigger canvas resize when window is resized
        if (this.canvas && this.boundHandlers.resize) {
            this.boundHandlers.resize();
        }
    }

    /**
     * Override parent's setupEventListeners to prevent errors
     */
    setupEventListeners() {
        // Call parent implementation if it exists
        if (super.setupEventListeners) {
            super.setupEventListeners();
        }
        // Canvas-specific listeners will be set up later in setupCanvasEventListeners
    }

    /**
     * Setup event listeners for canvas interaction
     */
    setupCanvasEventListeners() {
        //if (!this.isOpen) return;

        // Add null check to prevent errors
        if (!this.canvas) {
            console.warn('Canvas not ready for event listeners');
            return;
        }

        this.canvas.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleCanvasMouseUp(e));

        // Store bound handlers for cleanup
        this.boundHandlers.mouseup = (e) => this.handleDocumentMouseUp(e);
        document.addEventListener('mouseup', this.boundHandlers.mouseup);

        this.canvas.addEventListener('wheel', (e) => this.handleCanvasWheel(e));
        this.canvas.addEventListener('contextmenu', (e) => this.handleCanvasContextMenu(e));

        // Keyboard shortcuts
        this.boundHandlers.keydown = (e) => {
            if (!this.isOpen) return;

            // Ctrl+C / Cmd+C - Copy
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && (this.selectedNode || this.selectedNodes.size > 0)) {
                e.preventDefault();
                const nodeToCopy = this.selectedNode || Array.from(this.selectedNodes)[0];
                this.copyNode(nodeToCopy);
            }
            // Ctrl+V / Cmd+V - Paste
            else if ((e.ctrlKey || e.metaKey) && e.key === 'v' && this.clipboard && !e.repeat) {
                e.preventDefault();
                const rect = this.canvas.getBoundingClientRect();
                const centerX = (rect.width / 2 - this.panOffset.x) / this.zoom;
                const centerY = (rect.height / 2 - this.panOffset.y) / this.zoom;
                this.pasteNode(centerX, centerY);
            }
            // Ctrl+D / Cmd+D - Duplicate
            else if ((e.ctrlKey || e.metaKey) && e.key === 'd' && (this.selectedNode || this.selectedNodes.size > 0) && !e.repeat) {
                e.preventDefault();
                const nodeToDuplicate = this.selectedNode || Array.from(this.selectedNodes)[0];
                this.duplicateNode(nodeToDuplicate);
            }
            // Delete / Backspace - Delete node(s)
            else if ((e.key === 'Delete') && (this.selectedNode || this.selectedNodes.size > 0)) {
                // Don't delete if we're editing text
                if (this.editingElement) return;
                e.preventDefault();

                if (this.selectedNodes.size > 0) {
                    const nodesToDelete = Array.from(this.selectedNodes);
                    nodesToDelete.forEach(node => this.deleteNode(node));
                } else if (this.selectedNode) {
                    this.deleteNode(this.selectedNode);
                }

                this.selectedNode = null;
                this.selectedNodes.clear();
                this.saveState();
            }
            // Ctrl+T / Cmd+T - Toggle test panel
            else if ((e.ctrlKey || e.metaKey) && e.key === 't') {
                e.preventDefault();
                this.toggleTestPanel();
            }
            // Ctrl+Z / Cmd+Z - Undo
            else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            }
            // Ctrl+Shift+Z / Cmd+Shift+Z or Ctrl+Y / Cmd+Y - Redo
            else if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
                ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
                e.preventDefault();
                this.redo();
            }
            // Ctrl+A / Cmd+A - Select all nodes
            else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                this.selectedNodes.clear();
                this.nodes.forEach(node => this.selectedNodes.add(node));
                this.selectedNode = this.nodes[0];
                this.showNotification(`Selected ${this.nodes.length} nodes`, 'info');
            }
        };
        document.addEventListener('keydown', this.boundHandlers.keydown);
    }

    /**
     * Handle canvas mouse down
     */
    handleCanvasMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.panOffset.x) / this.zoom;
        const y = (e.clientY - rect.top - this.panOffset.y) / this.zoom;

        // Check for group panel button clicks FIRST
        if (this.showGroupPanels) {
            const panelButtonHit = this.getGroupPanelButtonHit(x, y);
            if (panelButtonHit) {
                this.handleGroupPanelButtonClick(panelButtonHit, e);
                return;
            }
        }

        // Check for delete button click
        for (const node of this.nodes) {
            if (node.deleteButton) {
                const dx = x - node.deleteButton.x;
                const dy = y - node.deleteButton.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= node.deleteButton.radius) {
                    if (confirm('Delete this node and all its connections?')) {
                        this.deleteNode(node);
                    }
                    return;
                }
            }

            // Check for comment button click
            if (node.commentButton) {
                const dx = x - node.commentButton.x;
                const dy = y - node.commentButton.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= node.commentButton.radius) {
                    this.editNodeComment(node);
                    return;
                }
            }

            // Check for open group button click
            if (node.openGroupButton) {
                const dx = x - node.openGroupButton.x;
                const dy = y - node.openGroupButton.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= node.openGroupButton.radius) {
                    this.openGroup(node);
                    return;
                }
            }

            // Check for edit name button click
            if (node.editNameButton) {
                const dx = x - node.editNameButton.x;
                const dy = y - node.editNameButton.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= node.editNameButton.radius) {
                    this.editGroupName(node);
                    return;
                }
            }
        }

        const interactiveClick = this.checkInteractiveElement(x, y, e);
        if (interactiveClick) {
            return;
        }

        const portHit = this.getPortAtPosition(x, y);
        if (portHit) {
            this.startConnection(portHit);
            return;
        }

        const clickedNode = this.getNodeAtPosition(x, y);
        if (clickedNode) {
            // ========== NEW: MULTI-SELECTION WITH CTRL+CLICK ==========
            if (e.ctrlKey || e.metaKey) {
                // Toggle node in selection
                if (this.selectedNodes.has(clickedNode)) {
                    this.selectedNodes.delete(clickedNode);
                } else {
                    this.selectedNodes.add(clickedNode);
                }
                this.selectedNode = clickedNode; // Keep for backwards compatibility
            } else {
                // If clicking on an already selected node, prepare to drag all selected
                if (!this.selectedNodes.has(clickedNode)) {
                    // Clear selection and select only this node
                    this.selectedNodes.clear();
                    this.selectedNodes.add(clickedNode);
                }
                this.selectedNode = clickedNode;
            }

            // Prepare for dragging all selected nodes
            this.draggedNodes.clear();
            this.selectedNodes.forEach(node => {
                this.draggedNodes.add({
                    node: node,
                    offsetX: x - node.x,
                    offsetY: y - node.y
                });
            });

            return;
        }

        // Check for box selection BEFORE panning
        if ((e.ctrlKey || e.metaKey) && e.button === 0) {
            // Start box selection instead of panning
            this.isBoxSelecting = true;
            this.boxSelectStart = { x, y };
            this.boxSelectEnd = { x, y };

            // Clear selection if not holding shift as well
            if (!e.shiftKey) {
                this.selectedNode = null;
                this.selectedNodes.clear();
            }
            return;
        }

        // Start panning with middle mouse, right-click, OR holding shift+left-click, OR just left-click on empty space
        if (e.button === 1 || e.button === 2 || (e.shiftKey && e.button === 0) || e.button === 0) {
            e.preventDefault(); // Prevent default behavior
            this.isPanning = true;
            this.canvas.style.cursor = 'grabbing';
            this.lastMousePos = { x: e.clientX, y: e.clientY };

            // Clear selection if not holding Ctrl
            if (!(e.ctrlKey || e.metaKey)) {
                this.selectedNode = null;
                this.selectedNodes.clear();
            }
            return;
        }
    }

    /**
     * Handle canvas mouse move
     */
    handleCanvasMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.panOffset.x) / this.zoom;
        const y = (e.clientY - rect.top - this.panOffset.y) / this.zoom;

        // Handle group panel dragging with proper zoom handling
        if (this.draggedGroupPanel) {
            // Calculate delta in canvas space (already accounts for zoom)
            const deltaX = x - this.groupPanelDragStart.x;
            const deltaY = y - this.groupPanelDragStart.y;

            const newPanelX = this.groupPanelInitialBounds.x + deltaX;
            const newPanelY = this.groupPanelInitialBounds.y + deltaY;

            const actualDeltaX = newPanelX - this.draggedGroupPanel.bounds.x;
            const actualDeltaY = newPanelY - this.draggedGroupPanel.bounds.y;

            // Move all nodes in the group WITHOUT snapping during drag
            this.draggedGroupPanel.nodes.forEach(node => {
                node.x += actualDeltaX;
                node.y += actualDeltaY;
            });

            // Update panel bounds
            this.draggedGroupPanel.bounds.x = newPanelX;
            this.draggedGroupPanel.bounds.y = newPanelY;

            this.hasUnsavedChanges = true;
            this.lastMousePos = { x: e.clientX, y: e.clientY };
            return;
        }

        // Handle panning FIRST before updating lastMousePos
        if (this.isPanning) {
            const dx = e.clientX - this.lastMousePos.x;
            const dy = e.clientY - this.lastMousePos.y;
            this.panOffset.x += dx;
            this.panOffset.y += dy;
            this.lastMousePos = { x: e.clientX, y: e.clientY };

            // Update text editor position if it's open
            if (this.editingElement && this.editingNode) {
                this.updateTextEditorPosition(
                    this.editingElement,
                    this.editingNodeCanvasX,
                    this.editingNodeCanvasY,
                    this.editingNodeCanvasWidth,
                    this.editingNodeCanvasHeight
                );
            }

            return;
        }

        // ========== NEW: HANDLE BOX SELECTION ==========
        if (this.isBoxSelecting) {
            this.boxSelectEnd = { x, y };

            // Select all nodes within the rectangle
            const minX = Math.min(this.boxSelectStart.x, this.boxSelectEnd.x);
            const maxX = Math.max(this.boxSelectStart.x, this.boxSelectEnd.x);
            const minY = Math.min(this.boxSelectStart.y, this.boxSelectEnd.y);
            const maxY = Math.max(this.boxSelectStart.y, this.boxSelectEnd.y);

            // If shift is held, add to selection, otherwise replace
            if (!e.shiftKey) {
                this.selectedNodes.clear();
            }

            this.nodes.forEach(node => {
                // Check if node center is within selection box
                const nodeCenterX = node.x + node.width / 2;
                const nodeCenterY = node.y + node.height / 2;

                if (nodeCenterX >= minX && nodeCenterX <= maxX &&
                    nodeCenterY >= minY && nodeCenterY <= maxY) {
                    this.selectedNodes.add(node);
                }
            });

            return;
        }

        // Store actual mouse position for connection drawing (after panning check)
        this.lastMousePos = { x: e.clientX, y: e.clientY };

        // Update hovered port
        this.hoveredPort = this.getPortAtPosition(x, y);

        // ========== NEW: HANDLE MULTI-NODE DRAGGING ==========
        if (this.draggedNodes.size > 0 && !this.isPanning) {
            this.draggedNodes.forEach(dragInfo => {
                const newX = x - dragInfo.offsetX;
                const newY = y - dragInfo.offsetY;

                // Apply snap to grid
                const snapped = this.snapPositionToGrid(newX, newY);
                dragInfo.node.x = snapped.x;
                dragInfo.node.y = snapped.y;
            });

            this.hasUnsavedChanges = true;
            return;
        }

        // Update cursor
        const nodeHit = this.getNodeAtPosition(x, y);
        const portHit = this.getPortAtPosition(x, y);
        const interactiveHit = this.getInteractiveElementAtPosition(x, y);

        // Check if hovering over any button
        let isButtonHover = false;

        this.hoveredCommentButton = null;

        // Check panel buttons (grip, collapse, expand, label)
        const panelHit = this.showGroupPanels ? this.getGroupPanelButtonHit(x, y) : null;
        const isGripHover = panelHit?.button === 'grip';

        if (panelHit && (panelHit.button === 'collapse' || panelHit.button === 'expand' || panelHit.button === 'label')) {
            isButtonHover = true;
        }

        // Check node buttons (delete, open group, edit name)
        if (!isButtonHover) {
            for (const node of this.nodes) {
                // Check delete button
                if (node.deleteButton) {
                    const dx = x - node.deleteButton.x;
                    const dy = y - node.deleteButton.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist <= node.deleteButton.radius) {
                        isButtonHover = true;
                        break;
                    }
                }

                // Check open group button
                if (node.openGroupButton) {
                    const dx = x - node.openGroupButton.x;
                    const dy = y - node.openGroupButton.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist <= node.openGroupButton.radius) {
                        isButtonHover = true;
                        break;
                    }
                }

                if (node.commentButton) {
                    const dx = x - node.commentButton.x;
                    const dy = y - node.commentButton.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist <= node.commentButton.radius) {
                        isButtonHover = true;
                        this.hoveredCommentButton = node;
                        break;
                    }
                }

                // Check edit name button
                if (node.editNameButton) {
                    const dx = x - node.editNameButton.x;
                    const dy = y - node.editNameButton.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist <= node.editNameButton.radius) {
                        isButtonHover = true;
                        break;
                    }
                }
            }
        }

        // Set cursor based on what's under the mouse
        if (portHit || this.connectingFrom) {
            this.canvas.style.cursor = 'crosshair';
        } else if (interactiveHit) {
            this.canvas.style.cursor = 'text';
        } else if (isButtonHover) {
            this.canvas.style.cursor = 'pointer';
        } else if (isGripHover) {
            this.canvas.style.cursor = 'move';
        } else if (nodeHit) {
            this.canvas.style.cursor = 'move';
        } else {
            this.canvas.style.cursor = 'grab';
        }
    }

    /**
     * Handle canvas mouse up
     */
    handleCanvasMouseUp(e) {
        const hadChanges = this.draggedNodes.size > 0 || this.draggedGroupPanel !== null;

        // Check if this was a library node being placed
        if (this.libraryDragStart && this.draggedNodes.size === 1) {
            const dragDistance = Math.sqrt(
                Math.pow(e.clientX - this.libraryDragStart.x, 2) +
                Math.pow(e.clientY - this.libraryDragStart.y, 2)
            );

            // If drag distance is very small (< 5 pixels), treat it as a click
            // and place the node at the center of the viewport
            if (dragDistance < 5) {
                const node = Array.from(this.draggedNodes)[0].node;

                // Calculate center of viewport in canvas coordinates
                const rect = this.canvas.getBoundingClientRect();
                const viewportCenterX = (rect.width / 2 - this.panOffset.x) / this.zoom;
                const viewportCenterY = (rect.height / 2 - this.panOffset.y) / this.zoom;

                // Snap to grid
                const snapped = this.snapPositionToGrid(viewportCenterX, viewportCenterY);
                node.x = snapped.x;
                node.y = snapped.y;
            } else {
                // It was a drag, snap the final position to grid
                const node = Array.from(this.draggedNodes)[0].node;
                const snapped = this.snapPositionToGrid(node.x, node.y);
                node.x = snapped.x;
                node.y = snapped.y;
            }

            this.libraryDragStart = null;
            this.isLibraryDragging = false;
        }

        if (this.connectingFrom) {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left - this.panOffset.x) / this.zoom;
            const y = (e.clientY - rect.top - this.panOffset.y) / this.zoom;

            const portHit = this.getPortAtPosition(x, y);
            if (portHit) {
                this.completeConnection(portHit);
                this.saveState(); // Save state after creating connection
            }
            this.connectingFrom = null;
        }

        // Snap group panel nodes to grid on release
        if (this.draggedGroupPanel) {
            this.draggedGroupPanel.nodes.forEach(node => {
                const snapped = this.snapPositionToGrid(node.x, node.y);
                node.x = snapped.x;
                node.y = snapped.y;
            });

            // Recalculate panel bounds based on snapped node positions
            const bounds = this.calculateGroupBounds(new Set(this.draggedGroupPanel.nodes));
            this.draggedGroupPanel.bounds = bounds;
        }

        // Save state if something was dragged
        if (hadChanges) {
            this.saveState();
        }

        this.draggedNode = null;
        this.draggedNodes.clear();
        this.draggedGroupPanel = null;
        this.isPanning = false;
        this.isBoxSelecting = false;
        this.canvas.style.cursor = 'grab';
    }

    /**
     * Handle document mouse up (catches releases outside canvas)
     */
    handleDocumentMouseUp(e) {
        // Snap group panel nodes to grid on release (even if released outside canvas)
        if (this.draggedGroupPanel) {
            this.draggedGroupPanel.nodes.forEach(node => {
                const snapped = this.snapPositionToGrid(node.x, node.y);
                node.x = snapped.x;
                node.y = snapped.y;
            });

            // Recalculate panel bounds based on snapped node positions
            const bounds = this.calculateGroupBounds(new Set(this.draggedGroupPanel.nodes));
            this.draggedGroupPanel.bounds = bounds;
        }

        // Stop panning and dragging even if mouse is released outside canvas
        this.draggedNode = null;
        this.draggedGroupPanel = null;
        this.isPanning = false;
        if (this.canvas) {
            this.canvas.style.cursor = 'grab';
        }
    }

    handleCanvasContextMenu(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.panOffset.x) / this.zoom;
        const y = (e.clientY - rect.top - this.panOffset.y) / this.zoom;

        const portHit = this.getPortAtPosition(x, y);
        if (portHit) {
            this.showPortContextMenu(e, portHit);
            return;
        }

        const nodeHit = this.getNodeAtPosition(x, y);
        if (nodeHit) {
            this.showNodeContextMenu(e, nodeHit, x, y);
            return;
        }

        // Show canvas context menu for paste
        this.showCanvasContextMenu(e, x, y);
    }

    /**
 * Show context menu for a node
 */
    showNodeContextMenu(event, node, canvasX, canvasY) {
        const menu = document.createElement('div');
        menu.style.cssText = `
        position: fixed;
        left: ${event.clientX}px;
        top: ${event.clientY}px;
        background: #2a2a2a;
        border: 1px solid #555;
        border-radius: 4px;
        padding: 4px;
        z-index: 10001;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        min-width: 150px;
    `;

        // Copy option
        const copyOption = this.createContextMenuItem('Copy', 'fas fa-copy', () => {
            this.copyNode(node);
            menu.remove();
        });

        // Duplicate option
        const duplicateOption = this.createContextMenuItem('Duplicate', 'fas fa-clone', () => {
            this.duplicateNode(node);
            menu.remove();
        });

        // Delete option
        const deleteOption = this.createContextMenuItem('Delete', 'fas fa-trash', () => {
            this.deleteNode(node);
            this.saveState();
            menu.remove();
        }, '#f44336');

        // Separator
        const separator = document.createElement('div');
        separator.style.cssText = `
        height: 1px;
        background: #555;
        margin: 4px 0;
    `;

        // Comment option
        const commentOption = this.createContextMenuItem('Add Comment', 'fas fa-comment', () => {
            this.editNodeComment(node);
            menu.remove();
        });

        menu.appendChild(copyOption);
        menu.appendChild(duplicateOption);
        menu.appendChild(separator.cloneNode());
        menu.appendChild(commentOption);
        menu.appendChild(separator);
        menu.appendChild(deleteOption);

        document.body.appendChild(menu);

        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('mousedown', closeMenu);
            }
        };

        setTimeout(() => {
            document.addEventListener('mousedown', closeMenu);
        }, 100);
    }

    /**
     * Show context menu for canvas (empty space)
     */
    showCanvasContextMenu(event, canvasX, canvasY) {
        if (!this.clipboard) return; // Only show if we have something to paste

        const menu = document.createElement('div');
        menu.style.cssText = `
        position: fixed;
        left: ${event.clientX}px;
        top: ${event.clientY}px;
        background: #2a2a2a;
        border: 1px solid #555;
        border-radius: 4px;
        padding: 4px;
        z-index: 10001;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        min-width: 150px;
    `;

        // Paste option
        const pasteOption = this.createContextMenuItem('Paste', 'fas fa-paste', () => {
            this.pasteNode(canvasX, canvasY);
            menu.remove();
        });

        menu.appendChild(pasteOption);

        document.body.appendChild(menu);

        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('mousedown', closeMenu);
            }
        };

        setTimeout(() => {
            document.addEventListener('mousedown', closeMenu);
        }, 100);
    }

    /**
     * Create a context menu item
     */
    createContextMenuItem(label, icon, onClick, color = '#fff') {
        const item = document.createElement('div');
        item.style.cssText = `
        padding: 8px 12px;
        color: ${color};
        cursor: pointer;
        font-size: 12px;
        border-radius: 4px;
        transition: background 0.2s;
        display: flex;
        align-items: center;
        gap: 8px;
    `;

        if (icon) {
            const iconEl = document.createElement('i');
            iconEl.className = icon;
            iconEl.style.width = '14px';
            item.appendChild(iconEl);
        }

        const textEl = document.createElement('span');
        textEl.textContent = label;
        item.appendChild(textEl);

        item.addEventListener('mouseenter', () => item.style.background = '#444');
        item.addEventListener('mouseleave', () => item.style.background = 'transparent');
        item.addEventListener('click', onClick);

        return item;
    }

    /**
     * Copy a node to clipboard
     */
    copyNode(node) {
        if (!this.isOpen) return;
        // ========== NEW: COPY MULTIPLE NODES ==========
        if (this.selectedNodes.size > 1) {
            // Copy all selected nodes
            const nodesToCopy = Array.from(this.selectedNodes);
            this.clipboard = {
                nodes: nodesToCopy.map(n => JSON.parse(JSON.stringify(n))),
                connections: this.connections.filter(conn =>
                    nodesToCopy.includes(conn.from.node) && nodesToCopy.includes(conn.to.node)
                ).map(conn => ({
                    fromNodeId: conn.from.node.id,
                    fromPortIndex: conn.from.portIndex,
                    toNodeId: conn.to.node.id,
                    toPortIndex: conn.to.portIndex
                }))
            };
            this.showNotification(`Copied ${nodesToCopy.length} nodes`, 'success');
        } else {
            // Copy single node (original behavior)
            this.clipboard = JSON.parse(JSON.stringify({
                node: node,
                connections: this.connections.filter(conn =>
                    conn.from.node.id === node.id
                ).map(conn => ({
                    fromPortIndex: conn.from.portIndex,
                    toNodeOffset: {
                        x: conn.to.node.x - node.x,
                        y: conn.to.node.y - node.y
                    },
                    toNodeId: conn.to.node.id,
                    toPortIndex: conn.to.portIndex
                }))
            }));
            this.showNotification(`Copied node: ${node.label}`, 'success');
        }
    }

    /**
     * Paste a node from clipboard
     */
    pasteNode(x, y) {
        if (!this.isOpen) return;

        if (!this.clipboard) {
            this.showNotification('Nothing to paste', 'warning');
            return;
        }

        // Prevent concurrent paste operations
        if (this.isPasting) return;
        this.isPasting = true;

        // ========== NEW: PASTE MULTIPLE NODES ==========
        if (this.clipboard.nodes) {
            // Pasting multiple nodes
            const oldToNewIdMap = new Map();
            const newNodes = [];

            // Calculate center of clipboard nodes
            let centerX = 0, centerY = 0;
            this.clipboard.nodes.forEach(n => {
                centerX += n.x;
                centerY += n.y;
            });
            centerX /= this.clipboard.nodes.length;
            centerY /= this.clipboard.nodes.length;

            // Create new nodes
            this.clipboard.nodes.forEach(nodeToPaste => {
                const offsetX = nodeToPaste.x - centerX;
                const offsetY = nodeToPaste.y - centerY;

                const newNode = {
                    ...JSON.parse(JSON.stringify(nodeToPaste)),
                    id: this.generateNodeId(),
                    x: x + offsetX,
                    y: y + offsetY
                };

                oldToNewIdMap.set(nodeToPaste.id, newNode.id);
                this.nodes.push(newNode);
                newNodes.push(newNode);
            });

            // Recreate connections between pasted nodes
            this.clipboard.connections.forEach(conn => {
                const fromNodeId = oldToNewIdMap.get(conn.fromNodeId);
                const toNodeId = oldToNewIdMap.get(conn.toNodeId);

                if (fromNodeId && toNodeId) {
                    const fromNode = this.nodes.find(n => n.id === fromNodeId);
                    const toNode = this.nodes.find(n => n.id === toNodeId);

                    if (fromNode && toNode) {
                        this.connections.push({
                            from: {
                                node: fromNode,
                                portIndex: conn.fromPortIndex,
                                isOutput: true
                            },
                            to: {
                                node: toNode,
                                portIndex: conn.toPortIndex,
                                isOutput: false
                            }
                        });
                    }
                }
            });

            // Select the pasted nodes
            this.selectedNodes.clear();
            newNodes.forEach(n => this.selectedNodes.add(n));
            this.selectedNode = newNodes[0];

            this.hasUnsavedChanges = true;
            this.saveState();
            this.showNotification(`Pasted ${newNodes.length} nodes`, 'success');
        } else {
            // Pasting single node (original behavior)
            const clipData = JSON.parse(JSON.stringify(this.clipboard));
            const nodeToPaste = clipData.node;

            const newNode = {
                ...nodeToPaste,
                id: this.generateNodeId(),
                x: x,
                y: y
            };

            if (newNode.groupData) {
                newNode.groupData = JSON.parse(JSON.stringify(nodeToPaste.groupData));
                const idMap = new Map();
                newNode.groupData.nodes.forEach(n => {
                    const oldId = n.id;
                    n.id = this.generateNodeId();
                    idMap.set(oldId, n.id);
                });
                newNode.groupData.connections.forEach(conn => {
                    conn.from.node.id = idMap.get(conn.from.node.id);
                    conn.to.node.id = idMap.get(conn.to.node.id);
                });
            }

            this.nodes.push(newNode);
            this.selectedNode = newNode;
            this.selectedNodes.clear();
            this.selectedNodes.add(newNode);
            this.hasUnsavedChanges = true;
            this.saveState();

            this.showNotification(`Pasted node: ${newNode.label}`, 'success');
        }

        // Reset the paste flag
        this.isPasting = false;
    }

    /**
     * Duplicate a node (copy + paste at offset)
     */
    duplicateNode(node) {
        if (!this.isOpen) return;
        this.copyNode(node);
        this.pasteNode(node.x + this.clipboardOffset.x, node.y + this.clipboardOffset.y);
    }

    showPortContextMenu(event, port) {
        const menu = document.createElement('div');
        menu.style.cssText = `
        position: fixed;
        left: ${event.clientX}px;
        top: ${event.clientY}px;
        background: #2a2a2a;
        border: 1px solid #555;
        border-radius: 4px;
        padding: 4px;
        z-index: 10001;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    `;

        const removeInputs = document.createElement('div');
        removeInputs.textContent = 'Remove Input Connections';
        removeInputs.style.cssText = `
        padding: 8px 12px;
        color: #fff;
        cursor: pointer;
        font-size: 12px;
        border-radius: 4px;
        transition: background 0.2s;
    `;
        removeInputs.addEventListener('mouseenter', () => removeInputs.style.background = '#444');
        removeInputs.addEventListener('mouseleave', () => removeInputs.style.background = 'transparent');
        removeInputs.addEventListener('click', () => {
            this.removePortConnections(port, false);
            menu.remove();
        });

        const removeOutputs = document.createElement('div');
        removeOutputs.textContent = 'Remove Output Connections';
        removeOutputs.style.cssText = `
        padding: 8px 12px;
        color: #fff;
        cursor: pointer;
        font-size: 12px;
        border-radius: 4px;
        transition: background 0.2s;
    `;
        removeOutputs.addEventListener('mouseenter', () => removeOutputs.style.background = '#444');
        removeOutputs.addEventListener('mouseleave', () => removeOutputs.style.background = 'transparent');
        removeOutputs.addEventListener('click', () => {
            this.removePortConnections(port, true);
            menu.remove();
        });

        const removeAll = document.createElement('div');
        removeAll.textContent = 'Remove All Connections';
        removeAll.style.cssText = `
        padding: 8px 12px;
        color: #f44336;
        cursor: pointer;
        font-size: 12px;
        border-radius: 4px;
        transition: background 0.2s;
    `;
        removeAll.addEventListener('mouseenter', () => removeAll.style.background = '#444');
        removeAll.addEventListener('mouseleave', () => removeAll.style.background = 'transparent');
        removeAll.addEventListener('click', () => {
            this.removePortConnections(port, false);
            this.removePortConnections(port, true);
            menu.remove();
        });

        menu.appendChild(removeInputs);
        menu.appendChild(removeOutputs);
        menu.appendChild(removeAll);

        document.body.appendChild(menu);

        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('mousedown', closeMenu);
            }
        };

        setTimeout(() => {
            document.addEventListener('mousedown', closeMenu);
        }, 100);
    }

    removePortConnections(port, isOutput) {
        const portIndex = port.portIndex;
        const nodeId = port.node.id;

        this.connections = this.connections.filter(conn => {
            if (isOutput) {
                return !(conn.from.node.id === nodeId && conn.from.portIndex === portIndex);
            } else {
                return !(conn.to.node.id === nodeId && conn.to.portIndex === portIndex);
            }
        });

        this.hasUnsavedChanges = true;
    }

    /**
     * Handle canvas wheel (zoom)
     */
    handleCanvasWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(3, this.zoom * delta));

        // Zoom towards mouse position
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomChange = newZoom / this.zoom;
        this.panOffset.x = mouseX - (mouseX - this.panOffset.x) * zoomChange;
        this.panOffset.y = mouseY - (mouseY - this.panOffset.y) * zoomChange;

        this.zoom = newZoom;

        // Update text editor position if it's open
        if (this.editingElement && this.editingNode) {
            this.updateTextEditorPosition(
                this.editingElement,
                this.editingNodeCanvasX,
                this.editingNodeCanvasY,
                this.editingNodeCanvasWidth,
                this.editingNodeCanvasHeight
            );
        }
    }

    /**
     * Get set of node IDs that are in collapsed groups
     */
    getCollapsedNodeIds() {
        const collapsedNodeIds = new Set();
        if (this.showGroupPanels) {
            this.groupPanels.forEach(panel => {
                if (panel.collapsed) {
                    panel.nodes.forEach(node => collapsedNodeIds.add(node.id));
                }
            });
        }
        return collapsedNodeIds;
    }

    /**
     * Check if clicking on an interactive element and handle it
     */
    checkInteractiveElement(x, y, event) {
        const collapsedNodeIds = this.getCollapsedNodeIds();

        for (const node of this.nodes) {
            // Skip nodes in collapsed groups
            if (collapsedNodeIds.has(node.id)) {
                continue;
            }

            // Check expose checkbox
            if (node.hasExposeCheckbox) {
                const checkboxY = node.y + node.height - (node.hasInput || node.hasToggle || node.hasDropdown || node.hasColorPicker || node.hasPropertyDropdown ? 56 : 28);
                const checkboxX = node.x + 10;

                if (x >= checkboxX && x <= checkboxX + 16 &&
                    y >= checkboxY && y <= checkboxY + 16) {
                    node.exposeProperty = !node.exposeProperty;

                    // Add or remove onChange output based on expose state
                    if (!node.exposeProperty) {
                        delete node.groupName;
                        delete node.groupNameBounds;
                    }

                    // Recalculate node height
                    node.height = this.calculateNodeHeight(node);
                    this.hasUnsavedChanges = true;
                    this.saveState(); // NEW: Save state after expose checkbox toggle
                    event.preventDefault();
                    return true;
                }

                // Check group name input
                if (node.exposeProperty && node.groupNameBounds) {
                    const bounds = node.groupNameBounds;
                    if (x >= bounds.x && x <= bounds.x + bounds.w &&
                        y >= bounds.y && y <= bounds.y + bounds.h) {
                        this.editGroupNameProperty(node, bounds.x, bounds.y, bounds.w, bounds.h);
                        event.preventDefault();
                        return true;
                    }
                }
            }

            // Check input box
            if (node.hasInput) {
                const inputY = node.y + node.height - 28;
                const inputX = node.x + 10;
                const inputW = node.width - 20;
                const inputH = 20;

                if (x >= inputX && x <= inputX + inputW &&
                    y >= inputY && y <= inputY + inputH) {
                    this.openTextEditor(node, inputX, inputY, inputW, inputH);
                    event.preventDefault();
                    return true;
                }
            }

            // Check toggle
            if (node.hasToggle) {
                const toggleY = node.y + node.height - 28;
                const toggleX = node.x + node.width / 2 - 15;

                if (x >= toggleX && x <= toggleX + 30 &&
                    y >= toggleY && y <= toggleY + 20) {
                    node.value = !node.value;
                    this.hasUnsavedChanges = true;
                    this.saveState(); // NEW: Save state after toggle change
                    event.preventDefault();
                    return true;
                }
            }

            // Check dropdown
            if (node.hasDropdown) {
                const dropdownY = node.y + node.height - 28;
                const dropdownX = node.x + 10;
                const dropdownW = node.width - 20;

                if (x >= dropdownX && x <= dropdownX + dropdownW &&
                    y >= dropdownY && y <= dropdownY + 20) {
                    this.openDropdownMenu(node, dropdownX, dropdownY, dropdownW, 20);
                    // NOTE: saveState() will be called in openDropdownMenu when option is selected
                    this.hasUnsavedChanges = true;
                    event.preventDefault();
                    return true;
                }
            }

            // Check color picker
            if (node.hasColorPicker) {
                const colorY = node.y + node.height - 28;
                const colorX = node.x + 10;
                const colorW = node.width - 20;
                const colorH = 20;

                if (x >= colorX && x <= colorX + colorW &&
                    y >= colorY && y <= colorY + colorH) {
                    this.openColorPicker(node, colorX, colorY, colorW, colorH);
                    // NOTE: saveState() will be called when color picker is closed
                    event.preventDefault();
                    return true;
                }
            }

            // Check property dropdown
            if (node.hasPropertyDropdown) {
                const dropdownY = node.y + node.height - 28;
                const dropdownX = node.x + 10;
                const dropdownW = node.width - 20;

                if (x >= dropdownX && x <= dropdownX + dropdownW &&
                    y >= dropdownY && y <= dropdownY + 20) {
                    this.cyclePropertyDropdownValue(node);
                    // NOTE: saveState() is now called in cyclePropertyDropdownValue
                    this.hasUnsavedChanges = true;
                    event.preventDefault();
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Get interactive element at position
     */
    getInteractiveElementAtPosition(x, y) {
        const collapsedNodeIds = this.getCollapsedNodeIds();

        for (const node of this.nodes) {
            // Skip nodes in collapsed groups
            if (collapsedNodeIds.has(node.id)) {
                continue;
            }

            if (node.hasInput || node.hasToggle || node.hasDropdown || node.hasColorPicker || node.hasPropertyDropdown) {
                const elementY = node.y + node.height - 28;
                const elementX = node.hasToggle ? node.x + node.width / 2 - 15 : node.x + 10;
                const elementW = node.hasToggle ? 30 : node.width - 20;
                const elementH = 20;

                if (x >= elementX && x <= elementX + elementW &&
                    y >= elementY && y <= elementY + elementH) {
                    const type = node.hasInput ? 'input' :
                        (node.hasToggle ? 'toggle' :
                            (node.hasDropdown ? 'dropdown' :
                                (node.hasColorPicker ? 'colorPicker' :
                                    (node.hasPropertyDropdown ? 'propertyDropdown' : null))));
                    return { node, type };
                }
            }
        }
        return null;
    }

    /**
     * Edit group name property for the style() method
     */
    editGroupNameProperty(node, x, y, width, height) {
        this.closeTextEditor();

        const screenX = x * this.zoom + this.panOffset.x;
        const screenY = y * this.zoom + this.panOffset.y;
        const screenW = width * this.zoom;
        const screenH = height * this.zoom;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = node.groupName || '';
        input.placeholder = 'Group';
        input.style.cssText = `
        position: absolute;
        left: ${screenX}px;
        top: ${screenY}px;
        width: ${screenW}px;
        height: ${screenH}px;
        background: #333;
        border: 2px solid #00ffff;
        border-radius: 4px;
        color: #fff;
        font-size: ${9 * this.zoom}px;
        font-family: monospace;
        padding: 2px 4px;
        box-sizing: border-box;
        z-index: 10000;
        outline: none;
    `;

        const canvasRect = this.canvas.getBoundingClientRect();
        input.style.left = (canvasRect.left + screenX) + 'px';
        input.style.top = (canvasRect.top + screenY) + 'px';

        document.body.appendChild(input);
        input.focus();
        input.select();

        this.editingNode = node;
        this.editingElement = input;

        input.addEventListener('input', (e) => {
            node.groupName = e.target.value;
            this.hasUnsavedChanges = true;
        });

        const closeEditor = () => {
            // Only close if the element still exists and hasn't been closed
            if (this.editingElement && this.editingElement.parentNode) {
                this.saveState(); // NEW: Save state when closing editor
                this.closeTextEditor();
            }
        };

        input.addEventListener('blur', closeEditor);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
                e.preventDefault(); // Prevent default behavior
                closeEditor();
            }
            e.stopPropagation(); // Prevent canvas shortcuts
        });

        input.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
    }

    getNodeIcon(type) {
        const template = this.findNodeTemplate(type);
        return template ? template.icon || '' : '';
    }

    /**
     * Start dragging a node from the library
     */
    startNodeDrag(nodeTemplate, e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - this.panOffset.x) / this.zoom;
        const mouseY = (e.clientY - rect.top - this.panOffset.y) / this.zoom;

        // Snap width and height to grid
        const width = this.snapToGridValue(180);
        const height = this.snapToGridValue(this.calculateNodeHeight(nodeTemplate));

        // Create node at mouse position initially
        const newNode = {
            id: this.generateNodeId(),
            type: nodeTemplate.type,
            label: nodeTemplate.label,
            color: nodeTemplate.color,
            icon: this.getNodeIcon(nodeTemplate.type),
            x: mouseX, // Start at mouse position (will be updated during drag or on mouseup)
            y: mouseY,
            width: width,
            height: height,
            inputs: nodeTemplate.inputs || [],
            outputs: nodeTemplate.outputs || [],
            hasInput: nodeTemplate.hasInput || false,
            hasToggle: nodeTemplate.hasToggle || false,
            hasDropdown: nodeTemplate.hasDropdown || false,
            hasColorPicker: nodeTemplate.hasColorPicker || false,
            hasPropertyDropdown: nodeTemplate.hasPropertyDropdown || false,
            hasExposeCheckbox: nodeTemplate.hasExposeCheckbox || false,
            isGroup: nodeTemplate.isGroup || false,
            value: nodeTemplate.hasInput ? '' : (nodeTemplate.hasToggle ? false : (nodeTemplate.hasColorPicker ? '#ffffff' : null)),
            dropdownValue: nodeTemplate.dropdownOptions ? (nodeTemplate.defaultValue || nodeTemplate.dropdownOptions[0]) : '==',
            dropdownOptions: nodeTemplate.dropdownOptions || null,
            selectedProperty: null,
            exposeProperty: false,
            groupName: ''
        };

        if (newNode.isGroup) {
            newNode.nodes = [];
        }

        this.nodes.push(newNode);

        // Set up for dragging: center the node on the mouse cursor
        // The offset is from the node's top-left corner to the mouse position
        this.draggedNodes.clear();
        this.draggedNodes.add({
            node: newNode,
            offsetX: width / 2,  // Center the node horizontally on cursor
            offsetY: height / 2  // Center the node vertically on cursor
        });

        // Track the initial mouse position to detect if this is a drag or just a click
        this.libraryDragStart = { x: e.clientX, y: e.clientY };
        this.isLibraryDragging = false;

        this.hasUnsavedChanges = true;
    }

    /**
     * Get all exposed properties in the project
     */
    getAllExposedProperties() {
        const properties = [];
        const seen = new Set();

        // Helper function to traverse nodes recursively
        const traverseNodes = (nodes, connections) => {
            if (!nodes) return;

            nodes.forEach(node => {
                // Check setProperty nodes with exposeProperty flag
                if (node.type === 'setProperty' && node.exposeProperty) {
                    const nameConn = connections.find(c =>
                        c.to.node.id === node.id && c.to.portIndex === node.inputs.indexOf('name')
                    );

                    if (nameConn && nameConn.from.node.type === 'string') {
                        const propName = nameConn.from.node.value || 'property';
                        if (!seen.has(propName)) {
                            seen.add(propName);
                            properties.push(propName);
                        }
                    }
                }

                // Recursively check group nodes
                if (node.isGroup && node.groupData) {
                    traverseNodes(node.groupData.nodes, node.groupData.connections);
                }
            });
        };

        // Start with root level nodes
        traverseNodes(this.nodes, this.connections);

        return properties;
    }

    /**
     * Get the value for an output port with special handling for setProperty propName output
     */
    getOutputPortValue(node, portIndex, removeUnwantedChars = false) {
        // Special case: setProperty node's propName output (index 1)
        if (node.type === 'setProperty' && portIndex === 1) {
            // Get the property name from the 'name' input
            const nameConn = this.connections.find(c =>
                c.to.node.id === node.id && c.to.portIndex === node.inputs.indexOf('name')
            );

            if (nameConn && nameConn.from.node.type === 'string') {
                let value = nameConn.from.node.value || 'property';
                if (removeUnwantedChars) {
                    value = this.cleanupString(value);
                }
                return `'${value}'`;
            }
            return "'property'";
        }

        // Default behavior for other nodes
        const nodeTemplate = this.findNodeTemplate(node.type);
        if (nodeTemplate && nodeTemplate.codeGen) {
            const ctx = {
                nodes: this.nodes,
                connections: this.connections,
                getInputValue: (n, portName) => this.getInputValue(n, portName, removeUnwantedChars),
                generateGroupCode: (n) => this.generateGroupContentCode(n.groupData.nodes, n.groupData.connections, ''),
                indent: ''
            };
            let result = nodeTemplate.codeGen(node, ctx);

            if (removeUnwantedChars && typeof result === 'string') {
                result = this.cleanupString(result);
            }

            return result;
        }

        return 'undefined';
    }

    /**
     * Clean up a string by removing quotes and non-alphabetic characters from the start
     */
    cleanupString(str) {
        if (typeof str !== 'string') return str;

        // Remove surrounding quotes (single or double)
        let cleaned = str.replace(/^['"]|['"]$/g, '');

        // Remove non-alphabetic characters from the beginning
        cleaned = cleaned.replace(/^[^a-zA-Z]+/, '');

        // Replace spaces with camelCase, but keep the first word lowercase
        cleaned = cleaned.replace(/ (\w)/g, (_, c) => c.toUpperCase());

        return cleaned;
    }

    /**
     * Find node template by type
     */
    findNodeTemplate(type) {
        for (const category in this.nodeLibrary) {
            const found = this.nodeLibrary[category].find(n => n.type === type);
            if (found) return found;
        }
        return null;
    }

    /**
     * Generate unique node ID
     */
    generateNodeId() {
        return 'node_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    }

    /**
     * Get node at position
     */
    getNodeAtPosition(x, y) {
        const collapsedNodeIds = this.getCollapsedNodeIds();

        for (let i = this.nodes.length - 1; i >= 0; i--) {
            const node = this.nodes[i];

            // Skip nodes in collapsed groups
            if (collapsedNodeIds.has(node.id)) {
                continue;
            }

            if (x >= node.x && x <= node.x + node.width &&
                y >= node.y && y <= node.y + node.height) {
                return node;
            }
        }
        return null;
    }

    /**
     * Get port at position
     */
    getPortAtPosition(x, y) {
        const collapsedNodeIds = this.getCollapsedNodeIds();
        const portRadius = 10; // Increased hit area

        for (const node of this.nodes) {
            // Skip nodes in collapsed groups
            if (collapsedNodeIds.has(node.id)) {
                continue;
            }

            // Check input ports
            for (let index = 0; index < node.inputs.length; index++) {
                const portPos = this.getInputPortPosition(node, index);
                const dist = Math.sqrt((x - portPos.x) ** 2 + (y - portPos.y) ** 2);
                if (dist <= portRadius) {
                    return { node, portIndex: index, isOutput: false, label: node.inputs[index] };
                }
            }

            // Check output ports
            for (let index = 0; index < node.outputs.length; index++) {
                const portPos = this.getOutputPortPosition(node, index);
                const dist = Math.sqrt((x - portPos.x) ** 2 + (y - portPos.y) ** 2);
                if (dist <= portRadius) {
                    return { node, portIndex: index, isOutput: true, label: node.outputs[index] };
                }
            }
        }

        return null;
    }
    /**
     * Get input port position
     */
    getInputPortPosition(node, index) {
        const portLabel = node.inputs[index];

        // Flow ports go at the top center
        if (portLabel === 'flow') {
            return {
                x: node.x + node.width / 2,
                y: node.y
            };
        }

        // Regular data ports on the left
        const nonFlowInputs = node.inputs.filter(p => p !== 'flow');
        const nonFlowIndex = node.inputs.slice(0, index).filter(p => p !== 'flow').length;

        return {
            x: node.x,
            y: node.y + 40 + (nonFlowIndex * 24)
        };
    }

    /**
     * Get output port position
     */
    getOutputPortPosition(node, index) {
        const portLabel = node.outputs[index];

        // Flow ports go at the bottom center
        if (portLabel === 'flow') {
            return {
                x: node.x + node.width / 2,
                y: node.y + node.height
            };
        }

        // Regular data ports on the right
        const nonFlowOutputs = node.outputs.filter(p => p !== 'flow');
        const nonFlowIndex = node.outputs.slice(0, index).filter(p => p !== 'flow').length;

        return {
            x: node.x + node.width,
            y: node.y + 40 + (nonFlowIndex * 24)
        };
    }

    /**
     * Start creating a connection
     */
    startConnection(port) {
        this.connectingFrom = port;
    }

    /**
     * Complete a connection
     */
    completeConnection(targetPort) {
        if (!this.connectingFrom) return;

        // Can't connect output to output or input to input
        if (this.connectingFrom.isOutput === targetPort.isOutput) return;

        // Can't connect to same node
        if (this.connectingFrom.node.id === targetPort.node.id) return;

        // Get port labels
        const fromPortLabel = this.connectingFrom.isOutput ?
            this.connectingFrom.node.outputs[this.connectingFrom.portIndex] :
            this.connectingFrom.node.inputs[this.connectingFrom.portIndex];
        const toPortLabel = targetPort.isOutput ?
            targetPort.node.outputs[targetPort.portIndex] :
            targetPort.node.inputs[targetPort.portIndex];

        // Define flow-type ports
        const flowTypes = ['flow', 'true', 'false', 'exec', 'onChange', 'onComplete', 'onError', 'onSuccess', 'onFailure', 'then', 'catch', 'finally', 'callback', 'return'];
        const fromIsFlow = flowTypes.includes(fromPortLabel);
        const toIsFlow = flowTypes.includes(toPortLabel);

        if (fromIsFlow || toIsFlow) {
            if (!fromIsFlow || !toIsFlow) {
                this.showNotification('Flow connectors can only connect to other flow connectors!', 'error');
                return;
            }
        }

        // Create connection
        const connection = {
            id: this.generateNodeId(),
            from: this.connectingFrom.isOutput ? this.connectingFrom : targetPort,
            to: this.connectingFrom.isOutput ? targetPort : this.connectingFrom
        };

        // Remove existing connection to the same input
        this.connections = this.connections.filter(conn =>
            !(conn.to.node.id === connection.to.node.id &&
                conn.to.portIndex === connection.to.portIndex)
        );

        this.connections.push(connection);
        this.hasUnsavedChanges = true;
        this.saveState(); // Save state after creating connection
    }

    /**
     * Delete a node and its connections
     */
    deleteNode(node) {
        // ========== NEW: DELETE MULTIPLE NODES ==========
        if (this.selectedNodes.size > 1 && this.selectedNodes.has(node)) {
            // Delete all selected nodes
            const nodesToDelete = Array.from(this.selectedNodes);
            nodesToDelete.forEach(n => {
                if (n.isGroupInput || n.isGroupOutput) {
                    this.showNotification('Cannot delete group input/output nodes!', 'warning');
                    return;
                }
                this.nodes = this.nodes.filter(nd => nd.id !== n.id);
                this.connections = this.connections.filter(c =>
                    c.from.node.id !== n.id && c.to.node.id !== n.id
                );
            });
            this.selectedNodes.clear();
            this.selectedNode = null;
            this.showNotification(`Deleted ${nodesToDelete.length} nodes`, 'success');
            this.hasUnsavedChanges = true;
            this.saveState();
            return;
        }

        // Prevent deletion of special group input/output nodes
        if (node.isGroupInput || node.isGroupOutput) {
            this.showNotification('Cannot delete group input/output nodes!', 'warning');
            return;
        }

        this.nodes = this.nodes.filter(n => n.id !== node.id);
        this.connections = this.connections.filter(c =>
            c.from.node.id !== node.id && c.to.node.id !== node.id
        );
        this.selectedNode = null;
        this.selectedNodes.delete(node);
        this.hasUnsavedChanges = true;
        this.saveState();
    }

    /**
     * Filter nodes by search term
     */
    filterNodes(searchTerm) {
        const categories = document.querySelectorAll('.node-category');
        const term = searchTerm.toLowerCase();

        categories.forEach(category => {
            const items = category.querySelectorAll('.node-library-item');
            let visibleCount = 0;

            items.forEach(item => {
                const label = item.textContent.toLowerCase();
                if (label.includes(term)) {
                    item.style.display = 'block';
                    visibleCount++;
                } else {
                    item.style.display = 'none';
                }
            });

            // Hide category if no visible items
            category.style.display = visibleCount > 0 ? 'block' : 'none';
        });
    }

    /**
     * Render loop
     */
    renderLoop() {
        if (!this.isActive) return; // Stop if window is closed

        // Use actual time delta instead of fixed increment
        const currentTime = performance.now() / 1000; // Convert to seconds
        if (!this.lastAnimationTime) {
            this.lastAnimationTime = currentTime;
        }
        const deltaTime = currentTime - this.lastAnimationTime;
        this.lastAnimationTime = currentTime;

        this.animationTime += deltaTime; // Use actual delta time
        this.render();
        this.animationFrameId = requestAnimationFrame(() => this.renderLoop());
    }

    /**
     * Render the canvas
     */
    render() {
        if (!this.ctx) return;

        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply transform
        ctx.save();
        ctx.translate(this.panOffset.x, this.panOffset.y);
        ctx.scale(this.zoom, this.zoom);

        // Draw grid
        this.drawGrid(ctx);

        // Draw group panels (underneath everything except grid)
        if (this.showGroupPanels) {
            this.updateGroupPanels();
            this.drawGroupPanels(ctx);
        }

        // Get collapsed node IDs once for this render
        const collapsedNodeIds = this.getCollapsedNodeIds();

        // Draw connections FIRST (underneath nodes) - FILTER OUT connections in collapsed groups
        this.connections.forEach(conn => {
            // Hide connection if BOTH endpoints are in collapsed groups
            const fromNodeCollapsed = collapsedNodeIds.has(conn.from.node.id);
            const toNodeCollapsed = collapsedNodeIds.has(conn.to.node.id);

            if (!fromNodeCollapsed || !toNodeCollapsed) {
                // Draw if at least one endpoint is visible
                this.drawConnection(ctx, conn);
            }
        });

        // Draw connecting line if in progress
        if (this.connectingFrom) {
            this.drawConnectingLine(ctx);
        }

        this.nodes.forEach(node => {
            // Skip drawing nodes that are in collapsed groups
            if (!collapsedNodeIds.has(node.id)) {
                this.drawNode(ctx, node);
            }
        });

        // ========== NEW: DRAW BOX SELECTION RECTANGLE ==========
        if (this.isBoxSelecting) {
            const minX = Math.min(this.boxSelectStart.x, this.boxSelectEnd.x);
            const maxX = Math.max(this.boxSelectStart.x, this.boxSelectEnd.x);
            const minY = Math.min(this.boxSelectStart.y, this.boxSelectEnd.y);
            const maxY = Math.max(this.boxSelectStart.y, this.boxSelectEnd.y);

            ctx.strokeStyle = 'rgba(100, 150, 255, 0.8)';
            ctx.fillStyle = 'rgba(100, 150, 255, 0.1)';
            ctx.lineWidth = 2 / this.zoom; // Adjust line width based on zoom
            ctx.setLineDash([5 / this.zoom, 5 / this.zoom]); // Dashed line

            ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
            ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

            ctx.setLineDash([]); // Reset line dash
        }

        ctx.restore();

        // Draw UI overlay (zoom level)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '12px monospace';
        ctx.fillText(`Zoom: ${(this.zoom * 100).toFixed(0)}%`, 10, this.canvas.height - 10);

        // ========== NEW: RENDER MINIMAP ==========
        this.renderMinimap();
    }

    /**
     * Draw grid background
     */
    drawGrid(ctx) {
        const gridSize = this.gridSize; // Use the gridSize property
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;

        const startX = Math.floor(-this.panOffset.x / this.zoom / gridSize) * gridSize;
        const startY = Math.floor(-this.panOffset.y / this.zoom / gridSize) * gridSize;
        const endX = startX + (this.canvas.width / this.zoom) + gridSize;
        const endY = startY + (this.canvas.height / this.zoom) + gridSize;

        for (let x = startX; x < endX; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }

        for (let y = startY; y < endY; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
        }
    }

    /**
     * Draw a node
     */
    drawNode(ctx, node) {
        // ========== NEW: HIGHLIGHT MULTI-SELECTED NODES ==========
        const isSelected = this.selectedNodes.has(node) || this.selectedNode === node;

        if (isSelected) {
            ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
            ctx.shadowBlur = 15;
        }

        ctx.fillStyle = '#2a2a2a';
        ctx.strokeStyle = isSelected ? '#fff' : '#444';
        ctx.lineWidth = isSelected ? 2 : 1;
        this.roundRect(ctx, node.x, node.y, node.width, node.height, 8);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;

        ctx.fillStyle = node.color;
        this.roundRect(ctx, node.x, node.y, node.width, 32, 8, true, false);
        ctx.fill();

        // Delete button (X)
        const deleteX = node.x + node.width - 16;
        const deleteY = node.y + 16;
        ctx.fillStyle = 'rgba(244, 67, 54, 0.8)';
        ctx.beginPath();
        ctx.arc(deleteX, deleteY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(deleteX - 4, deleteY - 4);
        ctx.lineTo(deleteX + 4, deleteY + 4);
        ctx.moveTo(deleteX + 4, deleteY - 4);
        ctx.lineTo(deleteX - 4, deleteY + 4);
        ctx.stroke();

        node.deleteButton = { x: deleteX, y: deleteY, radius: 8 };

        // Open group button for group nodes
        if (node.isGroup) {
            const openX = node.x + node.width - 36;
            const openY = node.y + 16;
            ctx.fillStyle = 'rgba(33, 150, 243, 0.8)';
            ctx.beginPath();
            ctx.arc(openX, openY, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('→', openX, openY + 3);

            node.openGroupButton = { x: openX, y: openY, radius: 8 };
        }

        // Edit name button for group nodes
        if (node.isGroup) {
            const editX = node.x + (node.width / 2) - 24;
            const editY = node.y;
            ctx.fillStyle = 'rgba(156, 39, 176, 0.8)';
            ctx.beginPath();
            ctx.arc(editX, editY, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('✎', editX, editY + 3);

            node.editNameButton = { x: editX, y: editY, radius: 8 };
        }

        // FIX: Draw node icon if available (using Font Awesome)
        if (node.icon) {
            this.drawFontAwesomeIcon(ctx, node.icon, node.x + 16, node.y + 16, 32, 'rgba(255, 255, 255, 0.7)');
        }

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x + node.width / 2, node.y + 20);

        // Draw input ports
        if (node.inputs && Array.isArray(node.inputs)) {
            node.inputs.forEach((input, index) => {
                const pos = this.getInputPortPosition(node, index);
                const isFlowPort = input === 'flow';
                this.drawPort(ctx, pos.x, pos.y, false, node, index, isFlowPort);

                // Position label based on whether it's a flow port or data port
                if (input === 'flow') {
                    // Flow port at top - label inside node
                    ctx.fillStyle = '#ccc';
                    ctx.font = '9px Arial';
                    ctx.textAlign = 'center';
                    //ctx.fillText('▼', pos.x, pos.y - 12);
                } else {
                    // Data port on left - label to the right
                    ctx.fillStyle = '#ccc';
                    ctx.font = '11px Arial';
                    ctx.textAlign = 'left';

                    // Check if this input has a connection
                    const connection = this.connections.find(c =>
                        c.to.node.id === node.id && c.to.portIndex === index
                    );

                    if (connection) {
                        // Get the source node and output port
                        const sourceNode = connection.from.node;
                        const sourcePortIndex = connection.from.portIndex;
                        const sourceOutput = sourceNode.outputs[sourcePortIndex];

                        // Get the value to display
                        let displayValue = '';

                        // For property reference nodes, show the property name
                        if (sourceNode.type === 'property' && sourceNode.value) {
                            displayValue = sourceNode.value;
                        }
                        // For method reference nodes, show the method name
                        else if (sourceNode.type === 'method' && sourceNode.value) {
                            displayValue = sourceNode.value;
                        }
                        // For variable nodes (number, string, boolean, color), show their value
                        else if (['number', 'string', 'boolean', 'color'].includes(sourceNode.type) && sourceNode.value !== undefined && sourceNode.value !== null) {
                            displayValue = sourceNode.value;
                        }
                        // For const/let variables, show the variable name
                        else if (['const', 'let'].includes(sourceNode.type) && sourceNode.value) {
                            displayValue = sourceNode.value;
                        }
                        // For other nodes with values
                        else if (sourceNode.value !== undefined && sourceNode.value !== null) {
                            displayValue = sourceNode.value;
                        }
                        // If no specific value, show the output port name
                        else if (sourceOutput) {
                            displayValue = sourceOutput;
                        }

                        // Format the value for display
                        if (typeof displayValue === 'string' && displayValue.length > 15) {
                            displayValue = displayValue.substring(0, 12) + '...';
                        } else if (typeof displayValue === 'boolean') {
                            displayValue = displayValue ? 'true' : 'false';
                        } else if (typeof displayValue === 'number') {
                            displayValue = displayValue.toString();
                        }

                        // Draw input label with value in parentheses
                        ctx.fillText(`${input} (${displayValue})`, pos.x + 12, pos.y + 4);
                    } else {
                        // No connection - just show the input label
                        ctx.fillText(input, pos.x + 12, pos.y + 4);
                    }
                }
            });
        }

        // Draw output ports
        if (node.outputs && Array.isArray(node.outputs)) {
            node.outputs.forEach((output, index) => {
                const pos = this.getOutputPortPosition(node, index);
                const isFlowPort = output === 'flow';
                this.drawPort(ctx, pos.x, pos.y, true, node, index, isFlowPort);

                // Position label based on whether it's a flow port or data port
                if (output === 'flow') {
                    // Flow port at bottom - label inside node
                    ctx.fillStyle = '#ccc';
                    ctx.font = '9px Arial';
                    ctx.textAlign = 'center';
                    //ctx.fillText('▼', pos.x, pos.y + 12);
                } else {
                    // Data port on right - label to the left
                    ctx.fillStyle = '#ccc';
                    ctx.font = '11px Arial';
                    ctx.textAlign = 'right';

                    // Show the output label
                    ctx.fillText(output, pos.x - 12, pos.y + 4);

                    // If this is an onChange/callback output and the node has a value, show it
                    const isCallbackOutput = ['onChange', 'onComplete', 'onError', 'onSuccess', 'onFailure', 'then', 'catch', 'finally', 'callback'].includes(output);
                    if (isCallbackOutput && node.value !== undefined && node.value !== null) {
                        ctx.fillStyle = '#888';
                        ctx.font = '9px monospace';
                        ctx.textAlign = 'right';
                        let displayValue = node.value;

                        // Format the value for display
                        if (typeof displayValue === 'string' && displayValue.length > 15) {
                            displayValue = displayValue.substring(0, 12) + '...';
                        } else if (typeof displayValue === 'boolean') {
                            displayValue = displayValue ? 'true' : 'false';
                        } else if (typeof displayValue === 'number') {
                            displayValue = displayValue.toString();
                        }

                        ctx.fillText(`(${displayValue})`, pos.x - 12, pos.y + 16);
                    }
                }
            });
        }

        // Render exposed property controls
        let offsetY = node.y + node.height - 28;

        if (node.hasExposeCheckbox) {
            const checkboxY = offsetY;
            const checkboxX = node.x + 10;

            // Checkbox
            ctx.fillStyle = node.exposeProperty ? '#4CAF50' : '#333';
            ctx.fillRect(checkboxX, checkboxY, 16, 16);
            ctx.strokeStyle = '#555';
            ctx.strokeRect(checkboxX, checkboxY, 16, 16);

            if (node.exposeProperty) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(checkboxX + 3, checkboxY + 8);
                ctx.lineTo(checkboxX + 7, checkboxY + 12);
                ctx.lineTo(checkboxX + 13, checkboxY + 4);
                ctx.stroke();
            }

            // Label
            ctx.fillStyle = '#ccc';
            ctx.font = '10px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('Expose', checkboxX + 20, checkboxY + 12);

            // Group name input if exposed
            if (node.exposeProperty) {
                const groupInputX = checkboxX + 70;
                const groupInputW = node.width - 110;
                ctx.fillStyle = '#333';
                ctx.fillRect(groupInputX, checkboxY, groupInputW, 16);
                ctx.strokeStyle = '#555';
                ctx.strokeRect(groupInputX, checkboxY, groupInputW, 16);
                ctx.fillStyle = '#fff';
                ctx.font = '9px monospace';
                ctx.textAlign = 'left';
                const groupText = node.groupName || 'Group';
                ctx.fillText(groupText, groupInputX + 4, checkboxY + 11);

                // Store bounds for interaction
                node.groupNameBounds = { x: groupInputX, y: checkboxY, w: groupInputW, h: 16 };
            }

            offsetY -= 28;
        }

        if (node.hasInput) {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#333';
            const inputY = offsetY;
            ctx.fillRect(node.x + 10, inputY, node.width - 40, 20);
            ctx.strokeStyle = '#555';
            ctx.strokeRect(node.x + 10, inputY, node.width - 40, 20);
            ctx.fillStyle = '#fff';
            ctx.font = '11px monospace';
            const displayValue = node.value || '0';
            ctx.fillText(displayValue, node.x + node.width / 2, inputY + 14);
        }

        if (node.hasToggle) {
            const toggleY = offsetY;
            const toggleX = node.x + node.width / 2 - 15;
            ctx.fillStyle = node.value ? '#4CAF50' : '#666';
            this.roundRect(ctx, toggleX, toggleY, 30, 20, 10);
            ctx.fill();
            ctx.strokeStyle = '#444';
            ctx.strokeRect(toggleX, toggleY, 30, 20);
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(toggleX + (node.value ? 20 : 10), toggleY + 10, 7, 0, Math.PI * 2);
            ctx.fill();
        }

        if (node.hasDropdown) {
            const dropdownY = offsetY;
            ctx.fillStyle = '#333';
            ctx.fillRect(node.x + 10, dropdownY, node.width - 40, 20);
            ctx.strokeStyle = '#555';
            ctx.strokeRect(node.x + 10, dropdownY, node.width - 40, 20);
            ctx.fillStyle = '#fff';
            ctx.font = '11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(node.dropdownValue || '==', node.x + node.width / 2, dropdownY + 14);
        }

        if (node.hasColorPicker) {
            const colorY = offsetY;
            const colorX = node.x + 10;
            const colorW = node.width - 40;

            // Draw color swatch
            ctx.fillStyle = node.value || '#ffffff';
            ctx.fillRect(colorX, colorY, colorW, 20);
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 1;
            ctx.strokeRect(colorX, colorY, colorW, 20);

            // Draw color value text
            ctx.fillStyle = this.getContrastColor(node.value || '#ffffff');
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(node.value || '#ffffff', node.x + node.width / 2, colorY + 14);
        }

        if (node.hasPropertyDropdown) {
            const dropdownY = offsetY;
            const dropdownX = node.x + 10;
            const dropdownW = node.width - 40;

            // Get all exposed properties
            const exposedProps = this.getAllExposedProperties();
            const selectedProp = node.selectedProperty || (exposedProps.length > 0 ? exposedProps[0] : 'none');

            // Draw dropdown background
            ctx.fillStyle = '#333';
            ctx.fillRect(dropdownX, dropdownY, dropdownW, 20);
            ctx.strokeStyle = '#555';
            ctx.strokeRect(dropdownX, dropdownY, dropdownW, 20);

            // Draw selected property
            ctx.fillStyle = '#fff';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(selectedProp, node.x + node.width / 2, dropdownY + 14);

            // Draw dropdown arrow
            ctx.fillStyle = '#999';
            ctx.font = '8px Arial';
            ctx.fillText('▼', dropdownX + dropdownW - 10, dropdownY + 13);
        }

        // ========== NEW: Comment/Annotation button ==========
        const commentX = node.x + node.width - 16;
        const commentY = node.y + node.height - 16;
        const hasComment = this.nodeComments.has(node.id);

        ctx.fillStyle = hasComment ? 'rgba(255, 152, 0, 0.8)' : 'rgba(100, 100, 100, 0.6)';
        ctx.beginPath();
        ctx.arc(commentX, commentY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('💬', commentX, commentY + 4);

        node.commentButton = { x: commentX, y: commentY, radius: 8 };

        // ========== NEW: Draw comment tooltip on hover ==========
        if (this.hoveredCommentButton === node && hasComment) {
            this.drawCommentTooltip(ctx, node, commentX, commentY);
        }

        ctx.textAlign = 'left';
    }

    /**
     * Draw Font Awesome icon on canvas
     * Creates an off-screen element to render the icon, then draws it to canvas
     */
    drawFontAwesomeIcon(ctx, iconClass, x, y, size, color) {
        // Cache for icon images to avoid recreating them every frame
        if (!this.iconCache) {
            this.iconCache = {};
        }

        const cacheKey = `${iconClass}_${size}_${color}`;

        if (!this.iconCache[cacheKey]) {
            // Create off-screen element
            const tempDiv = document.createElement('div');
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px';
            tempDiv.style.width = `${size * 2}px`;
            tempDiv.style.height = `${size * 2}px`;
            tempDiv.style.fontSize = `${size}px`;
            tempDiv.style.color = color;
            tempDiv.style.display = 'flex';
            tempDiv.style.alignItems = 'center';
            tempDiv.style.justifyContent = 'center';

            const icon = document.createElement('i');
            icon.className = iconClass;
            tempDiv.appendChild(icon);
            document.body.appendChild(tempDiv);

            // Create canvas from the element
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = size * 2;
            tempCanvas.height = size * 2;
            const tempCtx = tempCanvas.getContext('2d');

            // Use html2canvas or similar approach - but simpler: use SVG
            // Since Font Awesome 6 uses SVG, we can extract it
            const computedStyle = window.getComputedStyle(icon, ':before');
            const content = computedStyle.getPropertyValue('content');

            // Draw the icon text using the Font Awesome font
            tempCtx.font = `900 ${size}px "Font Awesome 6 Free"`;
            tempCtx.fillStyle = color;
            tempCtx.textAlign = 'center';
            tempCtx.textBaseline = 'middle';

            // Extract unicode character from content
            if (content && content !== 'none') {
                const char = content.replace(/['"]/g, '');
                tempCtx.fillText(char, size, size);
            }

            document.body.removeChild(tempDiv);

            this.iconCache[cacheKey] = tempCanvas;
        }

        // Draw cached icon
        ctx.drawImage(this.iconCache[cacheKey], x - size / 2, y - size / 2, size, size);
    }

    /**
     * Sanitize node data to ensure all required properties exist
     */
    sanitizeNode(node) {
        return {
            ...node,
            inputs: Array.isArray(node.inputs) ? node.inputs : [],
            outputs: Array.isArray(node.outputs) ? node.outputs : [],
            width: node.width || 180,
            height: node.height || 120,
            x: node.x || 0,
            y: node.y || 0
        };
    }

    /**
     * Draw a port
     */
    drawPort(ctx, x, y, isOutput, node, portIndex, isFlowPort = false) {
        // Check if we should use round connectors (default to true if not set)
        const useRoundConnectors = this.useRoundConnectors !== undefined ? this.useRoundConnectors : true;

        // FIX: Proper hover detection by comparing actual port node ID and port index
        const isHovered = this.hoveredPort &&
            this.hoveredPort.node.id === node.id &&
            this.hoveredPort.portIndex === portIndex &&
            this.hoveredPort.isOutput === isOutput;

        // Check if this port is connected
        const isConnected = isOutput ?
            this.connections.some(c => c.from.node.id === node.id && c.from.portIndex === portIndex) :
            this.connections.some(c => c.to.node.id === node.id && c.to.portIndex === portIndex);

        // Determine the color to use
        const lineColor = isFlowPort ? '#ff00ff' : this.connectionColor;

        // Set shadow/glow based on state
        if (isHovered) {
            ctx.shadowColor = lineColor;
            ctx.shadowBlur = 15;
        } else if (isConnected) {
            ctx.shadowColor = lineColor;
            ctx.shadowBlur = 8;
        } else {
            ctx.shadowBlur = 0;
        }

        // Fill color: white when hovered, line color when connected, gray when disconnected
        if (isHovered) {
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = lineColor;
        } else if (isConnected) {
            ctx.fillStyle = lineColor;
            ctx.strokeStyle = lineColor;
        } else {
            ctx.fillStyle = '#666';
            ctx.strokeStyle = '#888';
        }

        ctx.lineWidth = 1;

        if (useRoundConnectors) {
            // Draw circular port
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else {
            // Draw triangular port
            const size = 4; // Triangle size
            ctx.beginPath();

            if (isFlowPort) {
                // Flow ports: up for input, down for output
                if (isOutput) {
                    // Output flow: triangle pointing down
                    ctx.moveTo(x, y + size);           // Bottom point
                    ctx.lineTo(x - size, y - size);    // Top left
                    ctx.lineTo(x + size, y - size);    // Top right
                } else {
                    // Input flow: triangle pointing up
                    ctx.moveTo(x, y - size);           // Top point
                    ctx.lineTo(x - size, y + size);    // Bottom left
                    ctx.lineTo(x + size, y + size);    // Bottom right
                }
            } else {
                // Data ports: left for input, right for output
                if (isOutput) {
                    // Output data: triangle pointing right
                    ctx.moveTo(x + size, y);           // Right point
                    ctx.lineTo(x - size, y - size);    // Top left
                    ctx.lineTo(x - size, y + size);    // Bottom left
                } else {
                    // Input data: triangle pointing left
                    ctx.moveTo(x - size, y);           // Left point
                    ctx.lineTo(x + size, y - size);    // Top right
                    ctx.lineTo(x + size, y + size);    // Bottom right
                }
            }

            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        ctx.shadowBlur = 0;
    }

    /**
     * Draw a connection between nodes
     */
    drawConnection(ctx, conn) {
        const fromPos = this.getOutputPortPosition(conn.from.node, conn.from.portIndex);
        const toPos = this.getInputPortPosition(conn.to.node, conn.to.portIndex);

        // If connection is flow, make it purple
        const fromPortLabel = conn.from.node.outputs[conn.from.portIndex];
        const toPortLabel = conn.to.node.inputs[conn.to.portIndex];
        const isFlowConnection = (fromPortLabel === 'flow' && toPortLabel === 'flow');

        const color = isFlowConnection ? '#ff00ff' : this.connectionColor;

        // ========== NEW: SIMPLIFIED CONNECTOR OPTION ==========
        if (this.simplifiedConnectors) {
            this.drawSimpleConnection(ctx, fromPos, toPos, color);
        } else {
            this.drawNeonBezierConnection(ctx, fromPos, toPos, color, this.animationTime);
        }
    }

    /**
     * Draw a simple straight/bezier line connection (no animation)
     */
    drawSimpleConnection(ctx, from, to, color) {
        // Defensive checks
        if (!from || !to) return;
        if (!isFinite(from.x) || !isFinite(from.y) || !isFinite(to.x) || !isFinite(to.y)) {
            return;
        }

        const isFlowConnection = (color === '#ff00ff');

        let cp1x, cp1y, cp2x, cp2y;

        if (isFlowConnection) {
            // Flow connections: vertical bezier curves
            const verticalOffset = Math.min(Math.abs(to.y - from.y) * 0.5, 100);
            cp1x = from.x;
            cp1y = from.y + verticalOffset;
            cp2x = to.x;
            cp2y = to.y - verticalOffset;
        } else {
            // Data connections: horizontal bezier curves
            const distance = Math.abs(to.x - from.x);
            const cpOffset = Math.min(distance * 0.5, 100);
            cp1x = from.x + cpOffset;
            cp1y = from.y;
            cp2x = to.x - cpOffset;
            cp2y = to.y;
        }

        // If control points are not finite, bail out
        if (!isFinite(cp1x) || !isFinite(cp1y) || !isFinite(cp2x) || !isFinite(cp2y)) {
            return;
        }

        // Draw single smooth line
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, to.x, to.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    /**
     * Draw the connecting line while dragging
     */
    drawConnectingLine(ctx) {
        const fromPort = this.connectingFrom;
        const fromPos = fromPort.isOutput ?
            this.getOutputPortPosition(fromPort.node, fromPort.portIndex) :
            this.getInputPortPosition(fromPort.node, fromPort.portIndex);

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = (this.lastMousePos.x - rect.left - this.panOffset.x) / this.zoom;
        const mouseY = (this.lastMousePos.y - rect.top - this.panOffset.y) / this.zoom;

        // Convert hex color to rgba with pulsing effect
        const hexColor = this.connectionColor.startsWith('#') ? this.connectionColor : '#00ffff';
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        const pulseColor = `rgba(${r}, ${g}, ${b}, ${0.5 + Math.sin(this.animationTime * 5) * 0.3})`;
        this.drawNeonBezierConnection(ctx, fromPos, { x: mouseX, y: mouseY }, pulseColor, this.animationTime, true);
    }

    /**
     * Draw a neon bezier curve connection with animated ball
     */
    drawNeonBezierConnection(ctx, from, to, color, time, isPreview = false) {
        // Defensive checks - ensure input coords are finite
        if (!from || !to) return;
        if (!isFinite(from.x) || !isFinite(from.y) || !isFinite(to.x) || !isFinite(to.y)) {
            // Don't attempt to draw with invalid coordinates
            return;
        }

        // Check if this is a flow connection (purple color indicates flow)
        const isFlowConnection = (color === '#ff00ff');

        let cp1x, cp1y, cp2x, cp2y;

        if (isFlowConnection) {
            // Flow connections: vertical bezier curves
            // From goes down, To goes up
            const verticalOffset = Math.min(Math.abs(to.y - from.y) * 0.5, 100);

            cp1x = from.x;
            cp1y = from.y + verticalOffset;
            cp2x = to.x;
            cp2y = to.y - verticalOffset;
        } else {
            // Data connections: horizontal bezier curves (original behavior)
            const distance = Math.abs(to.x - from.x);
            const cpOffset = Math.min(distance * 0.5, 100);

            cp1x = from.x + cpOffset;
            cp1y = from.y;
            cp2x = to.x - cpOffset;
            cp2y = to.y;
        }

        // If control points are not finite, bail out
        if (!isFinite(cp1x) || !isFinite(cp1y) || !isFinite(cp2x) || !isFinite(cp2y)) {
            return;
        }

        // Draw outer glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, to.x, to.y);
        ctx.stroke();

        // Draw main line
        ctx.shadowBlur = 10;
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, to.x, to.y);
        ctx.stroke();

        // Draw inner bright line
        ctx.shadowBlur = 5;
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, to.x, to.y);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Animated ball traveling along the path
        if (!isPreview) {
            const t = (time % 2) / 2; // Loop every 2 seconds

            // Calculate position on bezier curve
            const mt = 1 - t;
            const ballX = mt * mt * mt * from.x +
                3 * mt * mt * t * cp1x +
                3 * mt * t * t * cp2x +
                t * t * t * to.x;
            const ballY = mt * mt * mt * from.y +
                3 * mt * mt * t * cp1y +
                3 * mt * t * t * cp2y +
                t * t * t * to.y;

            // Validate ball coordinates before using createRadialGradient or arc
            if (isFinite(ballX) && isFinite(ballY)) {
                try {
                    const gradient = ctx.createRadialGradient(ballX, ballY, 0, ballX, ballY, 8);
                    gradient.addColorStop(0, '#ffffff');
                    gradient.addColorStop(0.3, color);
                    gradient.addColorStop(1, color + '00'); // Use line color with transparency

                    ctx.shadowColor = color;
                    ctx.shadowBlur = 20;
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(ballX, ballY, 8, 0, Math.PI * 2);
                    ctx.fill();

                    // Inner bright core
                    ctx.shadowBlur = 10;
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(ballX, ballY, 3, 0, Math.PI * 2);
                    ctx.fill();
                } catch (err) {
                    // If gradient creation still fails for some unexpected reason, silently skip it.
                    // This prevents uncaught exceptions from breaking the render loop.
                    console.warn('Skipped neon-ball drawing due to invalid gradient parameters.', err);
                } finally {
                    ctx.shadowBlur = 0;
                }
            }
        }
    }

    /**
     * Draw a bezier curve connection
     */
    drawBezierConnection(ctx, from, to, color) {
        const distance = Math.abs(to.x - from.x);
        const cpOffset = Math.min(distance * 0.5, 100);

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.bezierCurveTo(
            from.x + cpOffset, from.y,
            to.x - cpOffset, to.y,
            to.x, to.y
        );
        ctx.stroke();

        // Arrow
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const arrowSize = 8;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(
            to.x - arrowSize * Math.cos(angle - Math.PI / 6),
            to.y - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            to.x - arrowSize * Math.cos(angle + Math.PI / 6),
            to.y - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
    }

    /**
     * Draw rounded rectangle
     */
    roundRect(ctx, x, y, width, height, radius, fillTop = false, fillBottom = false) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    openGroup(groupNode) {
        if (!groupNode.groupData) {
            groupNode.groupData = {
                nodes: [],
                connections: [],
                groupInputConnections: [],
                groupOutputConnections: [],
                panOffset: { x: 0, y: 0 },
                zoom: 1.0
            };
        }

        // Save current canvas state
        this.groupHistory.push({
            nodes: this.nodes,
            connections: this.connections,
            panOffset: this.panOffset,
            zoom: this.zoom,
            currentGroup: this.currentGroup
        });

        // Load group canvas
        this.currentGroup = groupNode;
        this.nodes = groupNode.groupData.nodes;

        // FIX: Rebuild connections with proper node references
        // The saved connections have references to old node objects,
        // we need to map them to the newly loaded nodes
        const nodeMap = new Map();
        this.nodes.forEach(node => nodeMap.set(node.id, node));

        this.connections = (groupNode.groupData.connections || []).map(conn => {
            // Handle both serialized format (with nodeId) and object reference format
            const fromNodeId = conn.from.nodeId || conn.from.node?.id;
            const toNodeId = conn.to.nodeId || conn.to.node?.id;

            const fromNode = nodeMap.get(fromNodeId);
            const toNode = nodeMap.get(toNodeId);

            if (!fromNode || !toNode) {
                console.warn('Failed to restore connection:', conn);
                return null;
            }

            return {
                from: {
                    node: fromNode,
                    portIndex: conn.from.portIndex,
                    isOutput: true
                },
                to: {
                    node: toNode,
                    portIndex: conn.to.portIndex,
                    isOutput: false
                }
            };
        }).filter(conn => conn !== null); // Remove any failed connections

        this.panOffset = groupNode.groupData.panOffset;
        this.zoom = groupNode.groupData.zoom;

        // Add a special "Group Input" node if it doesn't exist
        this.ensureGroupInputNode(groupNode);

        // IMPORTANT FIX: Restore connections to/from groupInput and groupOutput nodes
        // After creating the special nodes, restore their connections
        const groupInputNode = this.nodes.find(n => n.isGroupInput);
        const groupOutputNode = this.nodes.find(n => n.isGroupOutput);

        // Restore groupInput connections
        if (groupInputNode && groupNode.groupData.groupInputConnections) {
            groupNode.groupData.groupInputConnections.forEach(conn => {
                const toNode = nodeMap.get(conn.toNodeId);
                if (toNode) {
                    this.connections.push({
                        from: {
                            node: groupInputNode,
                            portIndex: conn.portIndex,
                            isOutput: true
                        },
                        to: {
                            node: toNode,
                            portIndex: conn.toPortIndex,
                            isOutput: false
                        }
                    });
                }
            });
        }

        // Restore groupOutput connections
        if (groupOutputNode && groupNode.groupData.groupOutputConnections) {
            groupNode.groupData.groupOutputConnections.forEach(conn => {
                const fromNode = nodeMap.get(conn.fromNodeId);
                if (fromNode) {
                    this.connections.push({
                        from: {
                            node: fromNode,
                            portIndex: conn.fromPortIndex,
                            isOutput: true
                        },
                        to: {
                            node: groupOutputNode,
                            portIndex: conn.portIndex,
                            isOutput: false
                        }
                    });
                }
            });
        }

        this.showNotification(`Opened group: ${groupNode.label}`, 'info');
        this.updateGroupBreadcrumb();
    }

    /**
     * Ensure the group has a special input node that represents the group's input connector
     */
    ensureGroupInputNode(groupNode) {
        // Check if the group has a flow input (most groups do)
        const hasFlowInput = groupNode.inputs && groupNode.inputs.includes('flow');

        if (!hasFlowInput) return; // No input connector, no need for input node

        // Check if we already have a group input node
        const existingInputNode = this.nodes.find(n => n.type === 'groupInput');

        if (!existingInputNode) {
            // Create the group input node
            const inputNode = {
                id: 'groupInput_' + groupNode.id,
                type: 'groupInput',
                label: 'Group Input',
                color: '#4a148c',
                icon: 'fas fa-sign-in-alt',
                x: 100,
                y: 50,
                width: 180,
                height: 80,
                inputs: [],
                outputs: ['flow'], // Output that will connect to internal nodes
                hasInput: false,
                hasToggle: false,
                hasDropdown: false,
                hasColorPicker: false,
                hasPropertyDropdown: false,
                hasExposeCheckbox: false,
                isGroup: false,
                isGroupInput: true, // Special flag
                value: null,
                dropdownValue: null,
                dropdownOptions: null,
                selectedProperty: null,
                exposeProperty: false,
                groupName: ''
            };

            this.nodes.unshift(inputNode); // Add at the beginning
        }

        // Also check if we need a group output node
        const hasFlowOutput = groupNode.outputs && groupNode.outputs.includes('flow');

        if (hasFlowOutput) {
            const existingOutputNode = this.nodes.find(n => n.type === 'groupOutput');

            if (!existingOutputNode) {
                const outputNode = {
                    id: 'groupOutput_' + groupNode.id,
                    type: 'groupOutput',
                    label: 'Group Output',
                    color: '#1a237e',
                    icon: 'fas fa-sign-out-alt',
                    x: 400,
                    y: 50,
                    width: 180,
                    height: 80,
                    inputs: ['flow'], // Input that will receive from internal nodes
                    outputs: [],
                    hasInput: false,
                    hasToggle: false,
                    hasDropdown: false,
                    hasColorPicker: false,
                    hasPropertyDropdown: false,
                    hasExposeCheckbox: false,
                    isGroup: false,
                    isGroupOutput: true, // Special flag
                    value: null,
                    dropdownValue: null,
                    dropdownOptions: null,
                    selectedProperty: null,
                    exposeProperty: false,
                    groupName: ''
                };

                this.nodes.push(outputNode);
            }
        }
    }

    exitGroup() {
        if (this.groupHistory.length === 0) return;

        // Save current group state
        if (this.currentGroup) {
            // Filter out the special group input/output nodes before saving
            const filteredNodes = this.nodes.filter(n => !n.isGroupInput && !n.isGroupOutput);

            // IMPORTANT FIX: We need to keep connections that involve groupInput/groupOutput nodes
            // but we need to save them in a way that preserves the connection to internal nodes
            const internalConnections = this.connections.filter(c => {
                // Keep connections where BOTH nodes are internal (not groupInput/groupOutput)
                const fromIsInternal = filteredNodes.find(n => n.id === c.from.node.id);
                const toIsInternal = filteredNodes.find(n => n.id === c.to.node.id);
                return fromIsInternal && toIsInternal;
            });

            // Save connections FROM groupInput TO internal nodes
            const groupInputConnections = this.connections.filter(c => {
                return c.from.node.isGroupInput && filteredNodes.find(n => n.id === c.to.node.id);
            }).map(c => ({
                type: 'groupInput',
                portIndex: c.from.portIndex,
                toNodeId: c.to.node.id,
                toPortIndex: c.to.portIndex
            }));

            // Save connections FROM internal nodes TO groupOutput
            const groupOutputConnections = this.connections.filter(c => {
                return c.to.node.isGroupOutput && filteredNodes.find(n => n.id === c.from.node.id);
            }).map(c => ({
                type: 'groupOutput',
                portIndex: c.to.portIndex,
                fromNodeId: c.from.node.id,
                fromPortIndex: c.from.portIndex
            }));

            // Save state with all connection types
            this.currentGroup.groupData = {
                nodes: filteredNodes,
                connections: internalConnections.map(c => ({
                    from: {
                        nodeId: c.from.node.id,
                        portIndex: c.from.portIndex,
                        node: c.from.node  // Keep reference for immediate re-entry
                    },
                    to: {
                        nodeId: c.to.node.id,
                        portIndex: c.to.portIndex,
                        node: c.to.node  // Keep reference for immediate re-entry
                    }
                })),
                groupInputConnections: groupInputConnections,
                groupOutputConnections: groupOutputConnections,
                panOffset: this.panOffset,
                zoom: this.zoom
            };
        }

        // Restore previous canvas state
        const previousState = this.groupHistory.pop();
        this.nodes = previousState.nodes;
        this.connections = previousState.connections;
        this.panOffset = previousState.panOffset;
        this.zoom = previousState.zoom;
        this.currentGroup = previousState.currentGroup;

        this.showNotification('Exited group', 'info');
        this.updateGroupBreadcrumb();
    }

    updateGroupBreadcrumb() {
        // Remove existing breadcrumb if any
        const existingBreadcrumb = document.querySelector('.group-breadcrumb');
        if (existingBreadcrumb) {
            existingBreadcrumb.remove();
        }

        if (this.currentGroup || this.groupHistory.length > 0) {
            const breadcrumb = document.createElement('div');
            breadcrumb.className = 'group-breadcrumb';
            breadcrumb.style.cssText = `
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(42, 42, 42, 0.9);
            padding: 8px 12px;
            border-radius: 4px;
            color: #fff;
            font-size: 12px;
            display: flex;
            gap: 8px;
            align-items: center;
            z-index: 100;
        `;

            const backButton = document.createElement('button');
            backButton.innerHTML = '← Back';
            backButton.style.cssText = `
            padding: 4px 8px;
            background: #444;
            border: 1px solid #666;
            border-radius: 4px;
            color: #fff;
            cursor: pointer;
            font-size: 11px;
        `;
            backButton.addEventListener('click', () => this.exitGroup());

            const label = document.createElement('span');
            label.textContent = this.currentGroup ? `Group: ${this.currentGroup.label}` : 'Main Canvas';

            breadcrumb.appendChild(backButton);
            breadcrumb.appendChild(label);

            this.canvas.parentElement.appendChild(breadcrumb);
        }
    }

    /**
     * Load available modules and extract their methods
     */
    async loadAvailableModules() {
        this.availableModules = [];

        if (window.engine && window.engine.moduleRegistry) {
            const modules = Array.from(window.engine.moduleRegistry.getAllModules());

            for (const ModuleClass of modules) {
                const moduleInfo = {
                    name: ModuleClass.name,
                    class: ModuleClass,
                    namespace: ModuleClass.namespace || 'Custom',
                    description: ModuleClass.description || '',
                    iconClass: ModuleClass.iconClass || 'fas fa-cube',
                    methods: []
                };

                // Extract public methods (not starting with _)
                const prototype = ModuleClass.prototype;
                const methodNames = Object.getOwnPropertyNames(prototype)
                    .filter(name => {
                        // Exclude constructor and private methods
                        if (name === 'constructor' || name.startsWith('_')) return false;

                        // Only include functions
                        const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
                        return descriptor && typeof descriptor.value === 'function';
                    });

                // Analyze each method
                for (const methodName of methodNames) {
                    const method = prototype[methodName];
                    const methodInfo = this.analyzeMethod(method, methodName, ModuleClass.name);
                    moduleInfo.methods.push(methodInfo);
                }

                this.availableModules.push(moduleInfo);
            }

            console.log(`Loaded ${this.availableModules.length} modules with methods`, this.availableModules);

            // Rebuild node library with module methods
            this.rebuildNodeLibraryWithModules();

            // Refresh the sidebar
            if (this.sidebar) {
                this.createSidebar();
            }
        }
    }

    /**
     * Analyze a method to determine its parameters
     */
    analyzeMethod(method, methodName, moduleName) {
        const methodStr = method.toString();

        // Extract parameter names using regex
        const paramsMatch = methodStr.match(/\(([^)]*)\)/);
        let params = [];

        if (paramsMatch && paramsMatch[1].trim()) {
            params = paramsMatch[1]
                .split(',')
                .map(p => p.trim().split('=')[0].trim()) // Remove default values
                .filter(p => p && p !== 'this');
        }

        return {
            name: methodName,
            moduleName: moduleName,
            params: params,
            paramCount: params.length
        };
    }

    /**
     * Add a "Require Module" node to the Modules category
     */
    addRequireModuleNode() {
        if (!this.nodeLibrary['Modules']) {
            this.nodeLibrary['Modules'] = [];
        }

        // Get list of available modules
        const moduleNames = this.availableModules.map(m => m.name);

        this.nodeLibrary['Modules'].unshift({
            type: 'require_module',
            label: 'Require Module',
            color: '#FF5722',
            icon: 'fas fa-link',
            inputs: [],
            outputs: [],
            hasDropdown: true,
            dropdownOptions: moduleNames,
            defaultValue: moduleNames[0] || '',
            category: 'Modules',
            description: 'Declare a required module for this custom module'
        });
    }

    /**
     * Rebuild node library with module method nodes
     */
    rebuildNodeLibraryWithModules() {
        // Keep existing categories
        const baseLibrary = this.buildNodeLibrary();

        // Add Module Methods category with subcategories per module
        const moduleMethods = {};

        for (const moduleInfo of this.availableModules) {
            const categoryName = `Module: ${moduleInfo.name}`;
            moduleMethods[categoryName] = [];

            for (const method of moduleInfo.methods) {
                // Create input ports for method parameters
                const inputs = ['flow'];
                const inputLabels = [''];

                method.params.forEach(param => {
                    inputs.push('value');
                    inputLabels.push(param);
                });

                // Add module instance input
                inputs.push('value');
                inputLabels.push('module');

                moduleMethods[categoryName].push({
                    type: `module_method_${moduleInfo.name}_${method.name}`,
                    label: method.name,
                    color: '#9C27B0',
                    icon: moduleInfo.iconClass,
                    inputs: inputs,
                    inputLabels: inputLabels,
                    outputs: ['flow', 'value'],
                    outputLabels: ['', 'result'],
                    category: categoryName,
                    moduleInfo: {
                        moduleName: moduleInfo.name,
                        methodName: method.name,
                        params: method.params
                    }
                });
            }
        }

        // Merge with base library
        this.nodeLibrary = { ...baseLibrary, ...moduleMethods };
    }

    /**
     * Export the module to a .js file
     */
    async exportModule() {
        if (!this.moduleName) {
            alert('Please enter a module name!');
            return;
        }

        // Validate before export
        this.validateGraph();

        // Generate module code
        const code = this.generateModuleCode();

        // Ensure Visual Modules directory exists
        if (window.fileBrowser) {
            await window.fileBrowser.ensureDirectoryExists('Visual Modules');

            // Save the module file
            const fileName = `${this.moduleName}.js`;
            const filePath = `Visual Modules/${fileName}`;

            try {
                await window.fileBrowser.createFile(filePath, code, true);
                this.showNotification(`Module exported successfully to ${filePath}!`, 'success');

                // Try to register the module
                if (window.engine && window.engine.moduleRegistry) {
                    await window.fileBrowser.loadModuleScript(filePath);
                    this.showNotification(`Module "${this.moduleName}" registered!`, 'success');
                }
            } catch (error) {
                this.showNotification(`Error exporting module: ${error.message}`, 'error');
            }
        }
    }

    /**
     * Check if a node has a flow input connection
     */
    hasFlowInput(node) {
        const flowInputIndex = node.inputs.indexOf('flow');
        if (flowInputIndex === -1) return false;

        return this.connections.some(conn =>
            conn.to.node.id === node.id && conn.to.portIndex === flowInputIndex
        );
    }

    /**
     * Sanitize a label to be a valid method name
     */
    sanitizeMethodName(label) {
        return label.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
    }

    /**
     * Generate code for a method block node
     */
    generateMethodBlockCode(methodNode, indent) {
        if (!methodNode.groupData || !methodNode.groupData.nodes) {
            return `${indent}// Empty method\n`;
        }

        return this.generateGroupContentCode(methodNode.groupData.nodes, methodNode.groupData.connections, indent);
    }

    /**
     * Generate code for a group as a standalone method
     */
    generateGroupAsMethod(groupNode, indent) {
        if (!groupNode.groupData || !groupNode.groupData.nodes) {
            return `${indent}// Empty group\n`;
        }

        return this.generateGroupContentCode(groupNode.groupData.nodes, groupNode.groupData.connections, indent);
    }

    /**
     * Generate code for group content (used by both inline groups and method groups)
     */
    generateGroupContentCode(nodes, connections, indent) {
        if (!nodes || nodes.length === 0) {
            return `${indent}// Empty`;
        }

        let code = '';
        const visited = new Set();
        const ctx = {
            nodes: nodes,
            connections: connections,
            getInputValue: (node, portName, removeUnwantedChars = false) =>
                this.getInputValueFromContext(node, portName, nodes, connections, removeUnwantedChars),
            getOutputValue: (node, portName, removeUnwantedChars = false) =>
                this.getOutputValueFromContext(node, portName, nodes, connections, removeUnwantedChars),
            generateGroupCode: (node) =>
                this.generateGroupContentCode(node.groupData.nodes, node.groupData.connections, indent),
            indent: indent
        };

        // Filter out special group input/output nodes for code generation
        const codeNodes = nodes.filter(n => !n.isGroupInput && !n.isGroupOutput);

        // Find entry points - nodes that connect from the group input node OR have no flow input
        const groupInputNode = nodes.find(n => n.isGroupInput);
        const groupOutputNode = nodes.find(n => n.isGroupOutput);
        let entryNodes = [];

        if (groupInputNode) {
            // Find nodes connected to the group input's flow output
            const flowOutputIndex = 0; // Group input only has one output
            const connectedNodes = connections
                .filter(c => c.from.node.id === groupInputNode.id && c.from.portIndex === flowOutputIndex)
                .map(c => c.to.node);
            entryNodes = connectedNodes;
        } else {
            // Fallback: find nodes without flow inputs
            entryNodes = codeNodes.filter(n => {
                const flowInputIndex = n.inputs?.indexOf('flow');
                if (flowInputIndex === -1 || flowInputIndex === undefined) return true;

                return !connections.some(conn =>
                    conn.to.node.id === n.id && conn.to.portIndex === flowInputIndex
                );
            });
        }

        // FIX: Mark the group output node so we don't generate duplicate output code
        if (groupOutputNode) {
            visited.add(groupOutputNode.id);
        }

        // Generate code for each entry point
        entryNodes.forEach(node => {
            code += this.generateNodeCodeRecursive(node, indent, visited, ctx, codeNodes, connections);
        });

        return code || `${indent}// No code generated`;
    }

    /**
     * Generate code for a flow node and its descendants
     */
    generateCodeForFlowNode(startNode, indent) {
        const visited = new Set();
        const ctx = {
            nodes: this.nodes,
            connections: this.connections,
            getInputValue: (node, portName) => this.getInputValue(node, portName),
            getOutputValue: (node, portName) => this.getOutputValue(node, portName),
            generateGroupCode: (node) => this.generateGroupContentCode(node.groupData.nodes, node.groupData.connections, indent),
            indent: indent
        };

        let code = this.generateNodeCodeRecursive(startNode, indent, visited, ctx, this.nodes, this.connections);

        // Also process any nodes that weren't visited (non-flow nodes like variables, getters, etc.)
        // These might be used as inputs but not directly in the flow
        this.nodes.forEach(node => {
            if (!visited.has(node.id) && this.isValueNode(node.type)) {
                // Skip isolated value nodes - they're only relevant when connected
            }
        });

        return code;
    }

    /**
     * Check if a node type is a value-only node (used for inputs, not flow)
     */
    isValueNode(nodeType) {
        return ['number', 'string', 'boolean', 'getProperty', 'getPosition', 'getRotation',
            'getScale', 'getName', 'getGameObject', 'compare', 'and', 'or', 'not',
            'add', 'subtract', 'multiply', 'divide', 'modulo', 'random', 'abs',
            'sqrt', 'pow', 'sin', 'cos'].includes(nodeType);
    }

    /**
     * Recursively generate code for a node and its connected flow nodes
     */
    generateNodeCodeRecursive(node, indent, visited, ctx, nodes, connections) {
        if (!node || visited.has(node.id)) return '';

        // FIX: Skip group input/output nodes during code generation
        if (node.isGroupInput || node.isGroupOutput) {
            // Mark as visited but don't generate code
            visited.add(node.id);

            // If it's a group output, find what connects to it and continue the flow
            if (node.isGroupOutput && node.inputs && node.inputs.includes('flow')) {
                const flowInputIndex = node.inputs.indexOf('flow');
                // Find nodes that connect TO this group output (these should flow through)
                const incomingConnections = connections.filter(c =>
                    c.to.node.id === node.id && c.to.portIndex === flowInputIndex
                );

                // Continue processing those nodes
                let code = '';
                incomingConnections.forEach(conn => {
                    const sourceNode = conn.from.node;
                    if (!visited.has(sourceNode.id)) {
                        code += this.generateNodeCodeRecursive(sourceNode, indent, visited, ctx, nodes, connections);
                    }
                });
                return code;
            }

            // For group input, continue to connected nodes
            if (node.isGroupInput && node.outputs && node.outputs.includes('flow')) {
                const flowOutputIndex = node.outputs.indexOf('flow');
                const outgoingConnections = connections.filter(c =>
                    c.from.node.id === node.id && c.from.portIndex === flowOutputIndex
                );

                let code = '';
                outgoingConnections.forEach(conn => {
                    const targetNode = conn.to.node;
                    if (!visited.has(targetNode.id)) {
                        code += this.generateNodeCodeRecursive(targetNode, indent, visited, ctx, nodes, connections);
                    }
                });
                return code;
            }

            return '';
        }

        visited.add(node.id);

        let code = '';

        // Get node template for code generation
        const nodeTemplate = this.getNodeTemplate(node.type);
        if (nodeTemplate && nodeTemplate.codeGen) {
            const generatedCode = nodeTemplate.codeGen(node, ctx);

            if (generatedCode) {
                // Special handling for if statements and other control flow nodes
                if (node.type === 'if') {
                    code += `${indent}${generatedCode} {\n`;

                    // Find 'true' branch connection
                    const trueBranchIndex = node.outputs.indexOf('true');
                    if (trueBranchIndex !== -1) {
                        const trueConnections = connections.filter(c =>
                            c.from.node.id === node.id && c.from.portIndex === trueBranchIndex
                        );

                        if (trueConnections.length > 0) {
                            const trueNode = trueConnections[0].to.node;
                            // Create a new visited set for the true branch to avoid conflicts
                            const trueBranchVisited = new Set(visited);
                            code += this.generateNodeCodeRecursive(trueNode, indent + '    ', trueBranchVisited, ctx, nodes, connections);
                        }
                    }

                    code += `${indent}}\n`;

                    // Find 'false' branch connection
                    const falseBranchIndex = node.outputs.indexOf('false');
                    if (falseBranchIndex !== -1) {
                        const falseConnections = connections.filter(c =>
                            c.from.node.id === node.id && c.from.portIndex === falseBranchIndex
                        );

                        if (falseConnections.length > 0) {
                            const falseNode = falseConnections[0].to.node;
                            code += `${indent}else {\n`;
                            // Create a new visited set for the false branch to avoid conflicts
                            const falseBranchVisited = new Set(visited);
                            code += this.generateNodeCodeRecursive(falseNode, indent + '    ', falseBranchVisited, ctx, nodes, connections);
                            code += `${indent}}\n`;
                        }
                    }

                    // DON'T return here - continue to check for flow output
                    // return code;  // REMOVE THIS LINE
                } else if (node.type === 'group' && node.isGroup && node.groupData) {
                    // Normal group node with flow connection - inline the content
                    code += `${indent}// Group: ${node.label}\n`;
                    code += this.generateGroupContentCode(node.groupData.nodes, node.groupData.connections, indent);
                } else {
                    // FIX: Only output as statement if node has flow input or output
                    // Value-only nodes should only be used when referenced, not output standalone
                    const hasFlowInput = node.inputs && node.inputs.includes('flow');
                    const hasFlowOutput = node.outputs && node.outputs.includes('flow');

                    if (hasFlowInput || hasFlowOutput) {
                        code += `${indent}${generatedCode}\n`;
                    }
                    // Otherwise, skip - this is a value node that will be used as input elsewhere
                }
            }
        }

        // Find next flow connection (only follow 'flow' output port)
        const flowOutputIndex = node.outputs.indexOf('flow');
        if (flowOutputIndex !== -1) {
            const nextConnections = connections.filter(c =>
                c.from.node.id === node.id && c.from.portIndex === flowOutputIndex
            );

            // Process ALL connected flow nodes in sequence
            nextConnections.forEach((connection, index) => {
                const nextNode = connection.to.node;

                // Check if this node type should wrap flow outputs in braces
                const nodeTemplate = this.getNodeTemplate(node.type);
                const shouldWrap = nodeTemplate && nodeTemplate.wrapFlowNode;

                if (shouldWrap) {
                    // Wrap connected flow nodes in braces with increased indent
                    code += `${indent}{\n`;
                    code += this.generateNodeCodeRecursive(nextNode, indent + '    ', visited, ctx, nodes, connections);
                    code += `${indent}}\n`;
                } else {
                    // Default behavior - inline at same indent level
                    code += this.generateNodeCodeRecursive(nextNode, indent, visited, ctx, nodes, connections);
                }
            });
        }

        return code;
    }

    /**
     * Generate JavaScript code from visual nodes
     */
    generateModuleCode() {
        const className = this.moduleName;
        const namespace = this.moduleNamespace;
        const description = this.moduleDescription;
        const iconClass = this.moduleIcon;
        const moduleColor = this.moduleColor || '#2c3f4eff';
        const allowMultiple = this.allowMultiple;
        const drawInEditor = this.drawInEditor;

        // Find event nodes
        const constructorNode = this.nodes.find(n => n.type === 'constructor');
        const startNode = this.nodes.find(n => n.type === 'start');
        const loopNode = this.nodes.find(n => n.type === 'loop');
        const drawNode = this.nodes.find(n => n.type === 'draw');
        const destroyNode = this.nodes.find(n => n.type === 'onDestroy');
        const methodNodes = this.nodes.filter(n => n.type === 'method');

        // Find ALL setProperty nodes (both exposed and non-exposed)
        const allSetPropertyNodes = this.nodes.filter(n => n.type === 'setProperty');
        const exposedSetPropertyNodes = allSetPropertyNodes.filter(n => n.exposeProperty);

        const exposedVariableNodes = this.nodes.filter(n =>
            ['numberVar', 'stringVar', 'booleanVar', 'colorVar', 'vector2Var', 'assetVar', 'scriptVar'].includes(n.type)
            && n.exposeProperty
        );

        // Group ALL setProperty nodes for constructor initialization
        // Use a Set to track property names and prevent duplicates
        const groupedAllSetProperty = {};
        const seenPropertyNames = new Set();

        allSetPropertyNodes.forEach(node => {
            const nameConn = this.connections.find(c =>
                c.to.node.id === node.id && c.to.portIndex === node.inputs.indexOf('name')
            );

            let propName = null;
            if (nameConn && nameConn.from.node.type === 'string') {
                propName = nameConn.from.node.value || 'property';
            } else {
                // No connection - use a safe default name based on node ID
                propName = `property_${node.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
            }

            // Sanitize property name
            propName = this.sanitizePropertyName(propName);

            // Skip if we've already seen this property name
            if (seenPropertyNames.has(propName)) {
                return;
            }
            seenPropertyNames.add(propName);

            const groupName = node.groupName || 'General';
            if (!groupedAllSetProperty[groupName]) {
                groupedAllSetProperty[groupName] = [];
            }
            groupedAllSetProperty[groupName].push(node);
        });

        // Group only EXPOSED nodes (setProperty + variables) for inspector registration
        const allExposedNodes = [...exposedSetPropertyNodes, ...exposedVariableNodes];
        const groupedExposed = {};
        allExposedNodes.forEach(node => {
            const groupName = node.groupName || 'General';
            if (!groupedExposed[groupName]) {
                groupedExposed[groupName] = [];
            }
            groupedExposed[groupName].push(node);
        });

        let code = `/**
* ${className} - Visual Module
* Generated by Visual Module Builder
* ${description}
*/
class ${className} extends Module {
    static allowMultiple = ${allowMultiple};
    static namespace = "${namespace}";
    static description = "${description}";
    static iconClass = "${iconClass}";
    static color = "${moduleColor}";
    
    constructor() {
        super("${className}");

`;

        if (constructorNode) {
            code += `        // CONSTRUCTOR EVENT
`;
            code += this.generateCodeForFlowNode(constructorNode, '        ');
            code += `\n`;
        }

        // Add ALL setProperty properties to constructor (both exposed and non-exposed)
        if (Object.keys(groupedAllSetProperty).length > 0) {
            code += `
        /**
         * PROPERTIES
         * All setProperty nodes are initialized in the constructor with default values.
         */
`;

            for (const [groupName, nodes] of Object.entries(groupedAllSetProperty)) {
                code += `        // ${groupName} Group\n`;
                nodes.forEach(node => {
                    let propName = null;
                    let defaultValue = '""';

                    const nameConn = this.connections.find(c =>
                        c.to.node.id === node.id && c.to.portIndex === node.inputs.indexOf('name')
                    );

                    // Get property name from connection or use default
                    if (nameConn && nameConn.from.node.type === 'string') {
                        propName = nameConn.from.node.value || 'property';
                    } else {
                        // No connection - use a safe default name based on node ID
                        propName = `property_${node.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
                    }

                    // Sanitize property name to ensure it's a valid JavaScript identifier
                    propName = this.sanitizePropertyName(propName);

                    const valueConn = this.connections.find(c =>
                        c.to.node.id === node.id && c.to.portIndex === node.inputs.indexOf('value')
                    );

                    if (valueConn) {
                        const valueNode = valueConn.from.node;
                        if (valueNode.type === 'string') {
                            defaultValue = `"${valueNode.value || ''}"`;
                        } else if (valueNode.type === 'number') {
                            defaultValue = valueNode.value || '0';
                        } else if (valueNode.type === 'boolean') {
                            defaultValue = valueNode.value ? 'true' : 'false';
                        } else if (valueNode.type === 'color') {
                            defaultValue = `"${valueNode.value || '#ffffff'}"`;
                        } else if (valueNode.type === 'vector2') {
                            defaultValue = `new Vector2(${valueNode.value?.x || 0}, ${valueNode.value?.y || 0})`;
                        } else {
                            // For any other node type (like randomName), use its codeGen function
                            const nodeTemplate = this.getNodeTemplate(valueNode.type);
                            if (nodeTemplate && nodeTemplate.codeGen) {
                                const ctx = {
                                    nodes: this.nodes,
                                    connections: this.connections,
                                    getInputValue: (n, p) => this.getInputValue(n, p),
                                    getOutputValue: (n, p) => this.getOutputValue(n, p),
                                    generateGroupCode: (n) => this.generateGroupContentCode(n.groupData.nodes, n.groupData.connections, '        '),
                                    indent: '        '
                                };
                                defaultValue = nodeTemplate.codeGen(valueNode, ctx) || '""';
                            }
                        }
                    }

                    // Always add property to constructor
                    code += `        this.${propName} = ${defaultValue};\n`;
                });
            }

            // Add this.exposeProperty calls for each property
            code += `
        /**
         * PROPERTY REGISTRATION
         * Each property is registered with the engine's inspector system using exposeProperty().
         * The onChange callbacks ensure that the internal property values stay synchronized
         * when modified through the inspector UI.
         */
`;
            for (const [groupName, nodes] of Object.entries(groupedExposed)) {
                nodes.forEach(node => {
                    let propName = null;
                    let defaultValue = '""';
                    let propType = 'string';
                    let options = '';

                    // Handle setProperty nodes
                    if (node.type === 'setProperty') {
                        const nameConn = this.connections.find(c =>
                            c.to.node.id === node.id && c.to.portIndex === node.inputs.indexOf('name')
                        );

                        if (nameConn && nameConn.from.node.type === 'string') {
                            propName = nameConn.from.node.value || 'property';

                            const valueConn = this.connections.find(c =>
                                c.to.node.id === node.id && c.to.portIndex === node.inputs.indexOf('value')
                            );

                            if (valueConn) {
                                const valueNode = valueConn.from.node;
                                if (valueNode.type === 'string') {
                                    propType = 'string';
                                    defaultValue = `"${valueNode.value || ''}"`;
                                } else if (valueNode.type === 'number') {
                                    propType = 'number';
                                    defaultValue = valueNode.value || '0';
                                    options = ', { min: -999999, max: 999999, onChange: (val) => { this.' + propName + ' = val; } }';
                                } else if (valueNode.type === 'boolean') {
                                    propType = 'boolean';
                                    defaultValue = valueNode.value ? 'true' : 'false';
                                    options = ', { onChange: (val) => { this.' + propName + ' = val; } }';
                                } else if (valueNode.type === 'color') {
                                    propType = 'color';
                                    defaultValue = `"${valueNode.value || '#ffffff'}"`;
                                    options = ', { onChange: (val) => { this.' + propName + ' = val; } }';
                                } else if (valueNode.type === 'vector2') {
                                    propType = 'vector2';
                                    defaultValue = `new Vector2(${valueNode.value?.x || 0}, ${valueNode.value?.y || 0})`;
                                    options = ', { onChange: (val) => { this.' + propName + ' = new Vector2(val.x, val.y); } }';
                                } else {
                                    // For any other node type (like randomName), generate its code and infer type
                                    const nodeTemplate = this.getNodeTemplate(valueNode.type);
                                    if (nodeTemplate && nodeTemplate.codeGen) {
                                        const ctx = {
                                            nodes: this.nodes,
                                            connections: this.connections,
                                            getInputValue: (n, p) => this.getInputValue(n, p),
                                            getOutputValue: (n, p) => this.getOutputValue(n, p),
                                            generateGroupCode: (n) => this.generateGroupContentCode(n.groupData.nodes, n.groupData.connections, '        '),
                                            indent: '        '
                                        };
                                        defaultValue = nodeTemplate.codeGen(valueNode, ctx) || '""';

                                        // Infer type based on node type or default to string
                                        if (valueNode.type === 'randomName') {
                                            propType = 'string'; // randomName generates strings
                                        } else {
                                            propType = 'string'; // Default to string for unknown types
                                        }

                                        options = ', { onChange: (val) => { this.' + propName + ' = val; } }';
                                    }
                                }
                            }

                            // Add onChange for string type if not already added
                            if (!options) {
                                options = ', { onChange: (val) => { this.' + propName + ' = val; } }';
                            }
                        }
                    }
                    // Handle variable nodes
                    else {
                        propName = node.groupName || 'property';

                        if (node.type === 'numberVar') {
                            propType = 'number';
                            defaultValue = node.value || '0';
                            options = ', { min: 0, max: 100, onChange: (val) => { this.' + propName + ' = val; } }';
                        } else if (node.type === 'stringVar') {
                            propType = 'string';
                            defaultValue = `"${node.value || ''}"`;
                            options = ', { onChange: (val) => { this.' + propName + ' = val; } }';
                        } else if (node.type === 'booleanVar') {
                            propType = 'boolean';
                            defaultValue = node.value ? 'true' : 'false';
                            options = ', { onChange: (val) => { this.' + propName + ' = val; } }';
                        } else if (node.type === 'colorVar') {
                            propType = 'color';
                            defaultValue = `"${node.value || '#ffffff'}"`;
                            options = ', { onChange: (val) => { this.' + propName + ' = val; } }';
                        } else if (node.type === 'vector2Var') {
                            propType = 'vector2';
                            defaultValue = `new Vector2(0, 0)`;
                            options = ', { onChange: (val) => { this.' + propName + ' = new Vector2(val.x, val.y); } }';
                        } else if (node.type === 'assetVar') {
                            propType = 'asset';
                            defaultValue = 'null';
                            options = ', { onChange: (val) => { this.' + propName + ' = val; } }';
                        } else if (node.type === 'scriptVar') {
                            propType = 'script';
                            defaultValue = `""`;
                            options = ', { onChange: (val) => { this.' + propName + ' = val; } }';
                        }
                    }

                    if (propName) {
                        code += `        this.exposeProperty("${propName}", "${propType}", ${defaultValue}${options});\n`;
                    }
                });
            }
        }

        code += `    }\n`;

        // Generate style method with exposed properties
        if (Object.keys(groupedExposed).length > 0) {
            code += `
    /**
     * INSPECTOR STYLE CONFIGURATION
     * Defines how properties are displayed in the inspector panel.
     * Properties are organized into collapsible groups with custom styling.
     * Each group can have its own background color, border radius, and padding.
     */
    style(style) {
`;

            for (const [groupName, nodes] of Object.entries(groupedExposed)) {
                code += `        // "${groupName}" group contains ${nodes.length} ${nodes.length === 1 ? 'property' : 'properties'}\n`;
                code += `        style.startGroup("${groupName}", false, {\n`;
                code += `            backgroundColor: 'rgba(100,150,255,0.1)',\n`;
                code += `            borderRadius: '6px',\n`;
                code += `            padding: '8px'\n`;
                code += `        });\n`;

                nodes.forEach(node => {
                    let propName = null;
                    let propType = 'string';
                    let options = '';

                    if (node.type === 'setProperty') {
                        const nameConn = this.connections.find(c =>
                            c.to.node.id === node.id && c.to.portIndex === node.inputs.indexOf('name')
                        );

                        if (nameConn && nameConn.from.node.type === 'string') {
                            propName = nameConn.from.node.value || 'property';

                            const valueConn = this.connections.find(c =>
                                c.to.node.id === node.id && c.to.portIndex === node.inputs.indexOf('value')
                            );

                            if (valueConn) {
                                const valueNode = valueConn.from.node;
                                if (valueNode.type === 'string') {
                                    propType = 'string';
                                } else if (valueNode.type === 'number') {
                                    propType = 'number';
                                    options = ', { min: -999999, max: 999999';
                                } else if (valueNode.type === 'boolean') {
                                    propType = 'boolean';
                                } else if (valueNode.type === 'color') {
                                    propType = 'color';
                                } else if (valueNode.type === 'vector2') {
                                    propType = 'vector2';
                                }
                            }

                            if (!options) {
                                options = ', { onChange: (val) => { this.' + propName + ' = val; }';
                            } else {
                                options += ', onChange: (val) => { this.' + propName + ' = val; }';
                            }

                            if (options) {
                                options += ' }';
                            }
                        }
                    }
                    else {
                        propName = node.groupName || 'property';

                        if (node.type === 'numberVar') {
                            propType = 'number';
                            options = ', { min: 0, max: 100, onChange: (val) => { this.' + propName + ' = val; } }';
                        } else if (node.type === 'stringVar') {
                            propType = 'string';
                            options = ', { onChange: (val) => { this.' + propName + ' = val; } }';
                        } else if (node.type === 'booleanVar') {
                            propType = 'boolean';
                            options = ', { onChange: (val) => { this.' + propName + ' = val; } }';
                        } else if (node.type === 'colorVar') {
                            propType = 'color';
                            options = ', { onChange: (val) => { this.' + propName + ' = val; } }';
                        } else if (node.type === 'vector2Var') {
                            propType = 'vector2';
                            options = ', { onChange: (val) => { this.' + propName + ' = new Vector2(val.x, val.y); } }';
                        } else if (node.type === 'assetVar') {
                            propType = 'asset';
                            options = ', { onChange: (val) => { this.' + propName + ' = val; } }';
                        } else if (node.type === 'scriptVar') {
                            propType = 'script';
                            options = ', { onChange: (val) => { this.' + propName + ' = val; } }';
                        }
                    }

                    if (propName) {
                        code += `        style.exposeProperty("${propName}", "${propType}", this.${propName}${options});\n`;
                    }
                });

                code += `        style.endGroup();\n\n`;
            }

            code += `    }\n`;
        }

        // Generate start method
        if (startNode) {
            code += `
    /**
     * START METHOD
     * Called once when the module is first initialized.
     * Use this for setting up initial state, loading resources, or
     * performing one-time setup operations.
     */
    start() {
`;
            code += this.generateCodeForFlowNode(startNode, '        ');
            code += `    }\n`;
        }

        // Generate loop method
        if (loopNode) {
            code += `
    /**
     * LOOP METHOD
     * Called every frame during the game loop.
     * @param {number} deltaTime - Time elapsed since the last frame (in seconds)
     * Use deltaTime for frame-rate independent movement and animations.
     */
    loop(deltaTime) {
`;
            code += this.generateCodeForFlowNode(loopNode, '        ');
            code += `    }\n`;
        }

        // Generate draw method
        if (drawNode) {
            code += `
    /**
     * DRAW METHOD
     * Called every frame after loop() for rendering operations.
     * @param {CanvasRenderingContext2D} ctx - The 2D rendering context
     * All drawing operations (shapes, text, images) should be placed here.
     */
    draw(ctx) {
`;
            code += `       ctx.save();\n`;
            code += this.generateCodeForFlowNode(drawNode, '        ');
            code += `       ctx.restore();\n`;
            code += `    }\n`;
        }

        // Generate onDestroy method
        if (destroyNode) {
            code += `
    /**
     * ON DESTROY METHOD
     * Called when the module is being removed or the game object is destroyed.
     * Use this for cleanup operations: removing listeners, clearing intervals,
     * releasing resources, or saving final state.
     */
    onDestroy() {
`;
            code += this.generateCodeForFlowNode(destroyNode, '        ');
            code += `    }\n`;
        }

        // Generate custom methods from method blocks
        if (methodNodes.length > 0) {
            code += `
    /**
     * CUSTOM METHODS (${methodNodes.length} total)
     * User-defined methods created in the visual editor.
     * These can be called from other nodes or methods within this module.
     */
`;
            methodNodes.forEach(methodNode => {
                let methodSignature = methodNode.value.toString() || 'customMethod()';
                if (methodSignature.includes('(') === false) {
                    // Ensure parentheses for no-arg methods
                    methodSignature += '()';
                }
                code += `    ${methodSignature} {\n`;
                code += this.generateMethodBlockCode(methodNode, '        ');
                code += `    }\n\n`;
            });
        }

        // Generate methods from normal groups WITHOUT flow connections (not method blocks)
        const groupsWithoutFlow = this.nodes.filter(n => n.isGroup && n.type === 'group' && !this.hasFlowInput(n));
        if (groupsWithoutFlow.length > 0) {
            code += `
    /**
     * GROUP METHODS (${groupsWithoutFlow.length} total)
     * Methods generated from standalone groups in the visual editor.
     * Groups without flow connections are automatically converted to callable methods.
     */
`;
            groupsWithoutFlow.forEach(groupNode => {
                const methodName = this.sanitizeMethodName(groupNode.label);
                code += `    ${methodName}() {\n`;
                code += this.generateGroupAsMethod(groupNode, '        ');
                code += `    }\n\n`;
            });
        }

        // Generate toJSON method
        if (Object.keys(groupedExposed).length > 0) {
            const propertyNames = [];
            for (const [groupName, nodes] of Object.entries(groupedExposed)) {
                nodes.forEach(node => {
                    let propName = null;

                    if (node.type === 'setProperty') {
                        const nameConn = this.connections.find(c =>
                            c.to.node.id === node.id && c.to.portIndex === node.inputs.indexOf('name')
                        );
                        if (nameConn && nameConn.from.node.type === 'string') {
                            propName = nameConn.from.node.value || 'property';
                        }
                    } else {
                        propName = node.groupName || 'property';
                    }

                    if (propName && !propertyNames.includes(propName)) {
                        propertyNames.push(propName);
                    }
                });
            }

            code += `
    /**
     * SERIALIZATION (toJSON)
     * Converts the module's current state to a JSON object for saving.
     * This includes all ${propertyNames.length} exposed ${propertyNames.length === 1 ? 'property' : 'properties'} and their current values.
     * Called automatically when saving scenes or exporting game objects.
     */
    toJSON() {
        return {
            ...super.toJSON(),
`;

            propertyNames.forEach(propName => {
                code += `            ${propName}: this.${propName},\n`;
            });

            code += `        };\n`;
            code += `    }\n`;

            // Generate fromJSON method
            code += `
    /**
     * DESERIALIZATION (fromJSON)
     * Restores the module's state from a saved JSON object.
     * Loads all ${propertyNames.length} exposed ${propertyNames.length === 1 ? 'property' : 'properties'} with fallback to default values.
     * Called automatically when loading scenes or instantiating saved game objects.
     * @param {Object} data - The saved module data
     */
    fromJSON(data) {
        super.fromJSON(data);

        if (!data) return;

`;

            // Restore each property with default values
            for (const [groupName, nodes] of Object.entries(groupedExposed)) {
                nodes.forEach(node => {
                    let propName = null;
                    let defaultValue = '""';

                    if (node.type === 'setProperty') {
                        const nameConn = this.connections.find(c =>
                            c.to.node.id === node.id && c.to.portIndex === node.inputs.indexOf('name')
                        );
                        if (nameConn && nameConn.from.node.type === 'string') {
                            propName = nameConn.from.node.value || 'property';

                            const valueConn = this.connections.find(c =>
                                c.to.node.id === node.id && c.to.portIndex === node.inputs.indexOf('value')
                            );

                            if (valueConn) {
                                const valueNode = valueConn.from.node;
                                if (valueNode.type === 'string') {
                                    defaultValue = `"${valueNode.value || ''}"`;
                                } else if (valueNode.type === 'number') {
                                    defaultValue = valueNode.value || '0';
                                } else if (valueNode.type === 'boolean') {
                                    defaultValue = valueNode.value ? 'true' : 'false';
                                } else if (valueNode.type === 'color') {
                                    defaultValue = `"${valueNode.value || '#ffffff'}"`;
                                } else if (valueNode.type === 'vector2') {
                                    defaultValue = `new Vector2(${valueNode.value?.x || 0}, ${valueNode.value?.y || 0})`;
                                }
                            }
                        }
                    } else {
                        propName = node.groupName || 'property';

                        if (node.type === 'numberVar') {
                            defaultValue = node.value || '0';
                        } else if (node.type === 'stringVar') {
                            defaultValue = `"${node.value || ''}"`;
                        } else if (node.type === 'booleanVar') {
                            defaultValue = node.value ? 'true' : 'false';
                        } else if (node.type === 'colorVar') {
                            defaultValue = `"${node.value || '#ffffff'}"`;
                        } else if (node.type === 'vector2Var') {
                            defaultValue = `new Vector2(0, 0)`;
                        } else if (node.type === 'assetVar') {
                            defaultValue = 'null';
                        } else if (node.type === 'scriptVar') {
                            defaultValue = `""`;
                        }
                    }

                    if (propName && !propertyNames.slice(0, propertyNames.indexOf(propName)).includes(propName)) {
                        code += `        this.${propName} = data.${propName} !== undefined ? data.${propName} : ${defaultValue};\n`;
                    }
                });
            }

            code += `    }\n`;
        }

        code += `}\n\n`;
        code += `// Register the module with the engine\n`;
        code += `// This makes ${className} available globally and to the module system\n`;
        code += `window.${className} = ${className};\n`;

        const formatter = new JSCodeFormatter({
            indentSize: 4,
            indentChar: ' '
        });

        const formatted = formatter.format(code);

        return formatted;
    }

    /**
     * Sanitize a property name to be a valid JavaScript identifier
     */
    sanitizePropertyName(name) {
        if (!name || typeof name !== 'string') return 'property';

        // Remove quotes
        name = name.replace(/^['"]|['"]$/g, '');

        // Replace spaces and special characters with underscores
        name = name.replace(/[^a-zA-Z0-9_$]/g, '_');

        // Ensure it doesn't start with a number
        if (/^[0-9]/.test(name)) {
            name = '_' + name;
        }

        // Ensure it's not empty after sanitization
        if (!name || name === '_') {
            name = 'property';
        }

        return name;
    }

    /**
     * Get node template by type
     */
    getNodeTemplate(type) {
        for (const category in this.nodeLibrary) {
            const template = this.nodeLibrary[category].find(n => n.type === type);
            if (template) return template;
        }
        return null;
    }

    /**
     * Get input value for a node port from a specific context
     */
    getInputValueFromContext(node, portName, nodes, connections, removeUnwantedChars = false) {
        const portIndex = node.inputs.indexOf(portName);
        if (portIndex === -1) return null;

        // Find connection to this input
        const connection = connections.find(c =>
            c.to.node.id === node.id && c.to.portIndex === portIndex
        );

        if (connection) {
            const sourceNode = connection.from.node;
            const nodeTemplate = this.getNodeTemplate(sourceNode.type);

            if (nodeTemplate && nodeTemplate.codeGen) {
                const ctx = {
                    nodes: nodes,
                    connections: connections,
                    getInputValue: (n, p, clean = false) => this.getInputValueFromContext(n, p, nodes, connections, clean),
                    getOutputValue: (n, p, clean = false) => this.getOutputValueFromContext(n, p, nodes, connections, clean),
                    generateGroupCode: (n) => this.generateGroupContentCode(n.groupData.nodes, n.groupData.connections, '        '),
                    indent: '        '
                };
                let result = nodeTemplate.codeGen(sourceNode, ctx);
                if (removeUnwantedChars && typeof result === 'string') {
                    result = this.cleanupString(result);
                }
                return result;
            }
        }

        return null;
    }

    /**
     * Generate code for a specific node and its connected nodes (OLD METHOD - keep for compatibility)
     */
    generateCodeForNode(node, indent = '') {
        let code = `// ${node.label}\n${indent}`;

        // Find connections from this node's flow output
        const flowOutput = node.outputs.indexOf('flow');
        if (flowOutput !== -1) {
            const nextConnections = this.connections.filter(c =>
                c.from.node.id === node.id && c.from.portIndex === flowOutput
            );

            if (nextConnections.length > 0) {
                const nextNode = nextConnections[0].to.node;
                code += this.generateNodeCode(nextNode, indent);
            }
        }

        return code;
    }

    /**
     * Generate code for a specific node type (OLD METHOD - keep for compatibility)
     */
    generateNodeCode(node, indent = '') {
        const nodeTemplate = this.getNodeTemplate(node.type);
        if (nodeTemplate && nodeTemplate.codeGen) {
            const ctx = {
                nodes: this.nodes,
                connections: this.connections,
                getInputValue: (n, p) => this.getInputValue(n, p),
                getOutputValue: (n, p) => this.getOutputValue(n, p),
                generateGroupCode: (n) => this.generateGroupContentCode(n.groupData.nodes, n.groupData.connections, '        '),
                indent: '        '
            };
            return nodeTemplate.codeGen(node, ctx);
        }

        // Fallback to old implementation
        switch (node.type) {
            case 'setProperty':
                return `${indent}this.properties['${this.getInputValue(node, 'name')}'] = ${this.getInputValue(node, 'value')};\n`;

            case 'getPosition':
                return `${indent}const x = this.gameObject.position.x;\n${indent}const y = this.gameObject.position.y;\n`;

            case 'setPosition':
                return `${indent}this.gameObject.position.x = ${this.getInputValue(node, 'x')};\n${indent}this.gameObject.position.y = ${this.getInputValue(node, 'y')};\n`;

            case 'fillRect':
                return `${indent}ctx.fillStyle = '${this.getInputValue(node, 'color')}';\n${indent}ctx.fillRect(${this.getInputValue(node, 'x')}, ${this.getInputValue(node, 'y')}, ${this.getInputValue(node, 'w')}, ${this.getInputValue(node, 'h')});\n`;

            case 'fillCircle':
                return `${indent}ctx.fillStyle = '${this.getInputValue(node, 'color')}';\n${indent}ctx.beginPath();\n${indent}ctx.arc(${this.getInputValue(node, 'x')}, ${this.getInputValue(node, 'y')}, ${this.getInputValue(node, 'radius')}, 0, Math.PI * 2);\n${indent}ctx.fill();\n`;

            case 'drawText':
                return `${indent}ctx.fillStyle = '${this.getInputValue(node, 'color')}';\n${indent}ctx.fillText('${this.getInputValue(node, 'text')}', ${this.getInputValue(node, 'x')}, ${this.getInputValue(node, 'y')});\n`;

            case 'number':
                return node.value || '0';

            case 'string':
                return `'${node.value || ''}'`;

            case 'boolean':
                return node.value ? 'true' : 'false';

            default:
                return `${indent}// TODO: Implement ${node.type}\n`;
        }
    }

    /**
     * Get output value for a node port from a specific context
     */
    getOutputValueFromContext(node, portName, nodes, connections, removeUnwantedChars = false) {
        const portIndex = node.outputs.indexOf(portName);
        if (portIndex === -1) return '';

        // Find connection from this output
        const connection = connections.find(c =>
            c.from.node.id === node.id && c.from.portIndex === portIndex
        );

        if (connection) {
            const targetNode = connection.to.node;

            // Check if target node has a flow input - if so, generate flow code
            const hasFlowInput = targetNode.inputs && targetNode.inputs.includes('flow');

            if (hasFlowInput) {
                // Generate flow code for this node and its connected chain
                const visited = new Set();
                const ctx = {
                    nodes: nodes,
                    connections: connections,
                    getInputValue: (n, p, clean = false) => this.getInputValueFromContext(n, p, nodes, connections, clean),
                    getOutputValue: (n, p, clean = false) => this.getOutputValueFromContext(n, p, nodes, connections, clean),
                    generateGroupCode: (n) => this.generateGroupContentCode(
                        n.groupData.nodes,
                        n.groupData.connections,
                        '    '
                    ),
                    indent: '    '
                };

                // Generate the code chain starting from this node
                let code = this.generateNodeCodeRecursive(
                    targetNode,
                    '    ',
                    visited,
                    ctx,
                    nodes,
                    connections
                );

                let result = code.trim();
                if (removeUnwantedChars && typeof result === 'string') {
                    result = this.cleanupString(result);
                }
                return result;
            } else {
                // Not a flow node - generate as a value expression
                const nodeTemplate = this.getNodeTemplate(targetNode.type);

                if (nodeTemplate && nodeTemplate.codeGen) {
                    const ctx = {
                        nodes: nodes,
                        connections: connections,
                        getInputValue: (n, p, clean = false) => this.getInputValueFromContext(n, p, nodes, connections, clean),
                        getOutputValue: (n, p, clean = false) => this.getOutputValueFromContext(n, p, nodes, connections, clean),
                        generateGroupCode: (n) => this.generateGroupContentCode(
                            n.groupData.nodes,
                            n.groupData.connections,
                            '    '
                        ),
                        indent: '    '
                    };

                    let result = nodeTemplate.codeGen(targetNode, ctx);
                    if (removeUnwantedChars && typeof result === 'string') {
                        result = this.cleanupString(result);
                    }
                    return result;
                }

                // Fallback for simple value nodes
                if (targetNode.type === 'number') {
                    return targetNode.value || '0';
                } else if (targetNode.type === 'string') {
                    let value = `'${targetNode.value || ''}'`;
                    if (removeUnwantedChars) {
                        value = this.cleanupString(value);
                    }
                    return value;
                } else if (targetNode.type === 'boolean') {
                    return targetNode.value ? 'true' : 'false';
                }
            }
        }

        return '';
    }

    /**
     * Get input value for a node port
     */
    getInputValue(node, portName, removeUnwantedChars = false) {
        const portIndex = node.inputs.indexOf(portName);
        if (portIndex === -1) return null;

        // Find connection to this input
        const connection = this.connections.find(c =>
            c.to.node.id === node.id && c.to.portIndex === portIndex
        );

        if (connection) {
            const sourceNode = connection.from.node;
            const sourcePortIndex = connection.from.portIndex;
            const nodeTemplate = this.getNodeTemplate(sourceNode.type);

            if (nodeTemplate && nodeTemplate.codeGen) {
                const ctx = {
                    nodes: this.nodes,
                    connections: this.connections,
                    getInputValue: (n, p, clean = false) => this.getInputValue(n, p, clean),
                    getOutputValue: (n, p, clean = false) => this.getOutputValue(n, p, clean),
                    generateGroupCode: (n) => this.generateGroupContentCode(n.groupData.nodes, n.groupData.connections, '        '),
                    indent: '        ',
                    sourcePortIndex: sourcePortIndex,
                    sourcePortName: sourceNode.outputs[sourcePortIndex]
                };

                const baseValue = nodeTemplate.codeGen(sourceNode, ctx);

                // Handle multiple outputs - check if the node has multiple outputs
                if (sourceNode.outputs && sourceNode.outputs.length > 1) {
                    const outputPortName = sourceNode.outputs[sourcePortIndex];

                    // ========== NEW: AUTO-DETECT FLOW + SINGLE VALUE PATTERN ==========
                    // Count non-flow outputs
                    const nonFlowOutputs = sourceNode.outputs.filter(out => out !== 'flow');

                    // If node has flow + exactly one data output, treat as single output
                    // (e.g., ['flow', 'result'] or ['flow', 'value', 'x', 'y'])
                    const hasFlow = sourceNode.outputs.includes('flow');
                    const isSingleValueWithFlow = hasFlow && nonFlowOutputs.length === 1;

                    // If it's a flow + single value pattern OR has directOutput flag, return directly
                    if (isSingleValueWithFlow || nodeTemplate.directOutput) {
                        // Return the base value directly without appending .portName
                        if (removeUnwantedChars && typeof baseValue === 'string') {
                            return this.cleanupString(baseValue);
                        }
                        return baseValue;
                    }

                    // Check if this node has a multiOutputAccess function or if we should auto-append
                    if (nodeTemplate.multiOutputAccess) {
                        let result = nodeTemplate.multiOutputAccess(baseValue, outputPortName, sourceNode, ctx);
                        if (removeUnwantedChars && typeof result === 'string') {
                            result = this.cleanupString(result);
                        }
                        return result;
                    } else {
                        // Default behavior: append .portName to access the property
                        let result = `${baseValue}.${outputPortName}`;
                        if (removeUnwantedChars && typeof result === 'string') {
                            result = this.cleanupString(result);
                        }
                        return result;
                    }
                }

                if (removeUnwantedChars && typeof baseValue === 'string') {
                    return this.cleanupString(baseValue);
                }
                return baseValue;
            }

            // Fallback for nodes without templates (backwards compatibility)
            if (sourceNode.type === 'number' || sourceNode.type === 'string' || sourceNode.type === 'boolean') {
                if (sourceNode.type === 'string') {
                    let value = `'${sourceNode.value || ''}'`;
                    if (removeUnwantedChars) {
                        value = this.cleanupString(value);
                    }
                    return value;
                }
                return sourceNode.value || null;
            }
        }

        return null;
    }

    /**
     * Get output value for a node port - generates code for nodes connected to this output
     * This allows output ports to act like "code injection points" where connected nodes
     * will have their code generated and inserted at the call site
     */
    getOutputValue(node, portName, removeUnwantedChars = false) {
        const portIndex = node.outputs.indexOf(portName);
        if (portIndex === -1) return null;

        // Find connection from this output
        const connection = this.connections.find(c =>
            c.from.node.id === node.id && c.from.portIndex === portIndex
        );

        if (connection) {
            const targetNode = connection.to.node;

            // Check if target node has a flow input - if so, generate flow code
            const hasFlowInput = targetNode.inputs && targetNode.inputs.includes('flow');

            if (hasFlowInput) {
                // Generate flow code for this node and its connected chain
                const visited = new Set();
                const ctx = {
                    nodes: this.nodes,
                    connections: this.connections,
                    getInputValue: (n, p, clean = false) => this.getInputValue(n, p, clean),
                    getOutputValue: (n, p, clean = false) => this.getOutputValue(n, p, clean),
                    generateGroupCode: (n) => this.generateGroupContentCode(
                        n.groupData.nodes,
                        n.groupData.connections,
                        '    '
                    ),
                    indent: '    '
                };

                // Generate the code chain starting from this node
                let code = this.generateNodeCodeRecursive(
                    targetNode,
                    '    ',
                    visited,
                    ctx,
                    this.nodes,
                    this.connections
                );

                // Remove the indentation from the first line if needed
                let result = code.trim();
                if (removeUnwantedChars && typeof result === 'string') {
                    result = this.cleanupString(result);
                }
                return result;
            } else {
                // Not a flow node - generate as a value expression
                const nodeTemplate = this.getNodeTemplate(targetNode.type);

                if (nodeTemplate && nodeTemplate.codeGen) {
                    const ctx = {
                        nodes: this.nodes,
                        connections: this.connections,
                        getInputValue: (n, p, clean = false) => this.getInputValue(n, p, clean),
                        getOutputValue: (n, p, clean = false) => this.getOutputValue(n, p, clean),
                        generateGroupCode: (n) => this.generateGroupContentCode(
                            n.groupData.nodes,
                            n.groupData.connections,
                            '    '
                        ),
                        indent: '    '
                    };

                    let result = nodeTemplate.codeGen(targetNode, ctx);
                    if (removeUnwantedChars && typeof result === 'string') {
                        result = this.cleanupString(result);
                    }
                    return result;
                }

                // Fallback for simple value nodes
                if (targetNode.type === 'number') {
                    return targetNode.value || null;
                } else if (targetNode.type === 'string') {
                    let value = `'${targetNode.value || ''}'`;
                    if (removeUnwantedChars) {
                        value = this.cleanupString(value);
                    }
                    return value;
                } else if (targetNode.type === 'boolean') {
                    return targetNode.value ? 'true' : 'false';
                }
            }
        }

        return null;
    }

    /**
     * New project
     */
    async newProject() {
        if (this.hasUnsavedChanges) {
            if (!confirm('You have unsaved changes. Create new project anyway?')) {
                return;
            }
        }

        this.clearCanvas();

        this.nodes = [];
        this.connections = [];
        this.selectedNode = null;
        this.projectPath = null;
        this.hasUnsavedChanges = false;
        this.moduleName = "CustomModule";
        this.moduleNamespace = "Custom";
        this.moduleDescription = "A custom visual module";

        // Reset to nodes tab and clear CodeMirror
        this.currentTab = 'nodes';
        this.codeMirrorEditor = null;

        // Refresh UI
        this.setupUI();
        this.setupCanvas();
        this.setupCanvasEventListeners();
        this.showNotification('New project created', 'success');
    }

    /**
     * Save project to .vmb file
     */
    async saveProject() {
        if (!window.fileBrowser) {
            alert('File browser not available!');
            return;
        }

        await window.fileBrowser.ensureDirectoryExists('Visual Module Builder Proj');

        let savePath = this.projectPath;
        if (!savePath) {
            savePath = prompt('Enter project name:', this.moduleName);
            if (!savePath) return;
            savePath = `Visual Module Builder Proj/${savePath}.vmb`;
        }

        // **FIX: Save the current state and return to main canvas before saving**
        const wasInGroup = this.currentGroup !== null;
        const savedCurrentGroup = this.currentGroup;
        const savedNodes = this.nodes;
        const savedConnections = this.connections;
        const savedPanOffset = this.panOffset;
        const savedZoom = this.zoom;
        const savedHistory = [...this.groupHistory];

        // If we're in a group, save its state and exit all groups to get to the root
        if (wasInGroup) {
            // Save current group state first
            if (this.currentGroup) {
                // Filter out the special group input/output nodes before saving
                const filteredNodes = this.nodes.filter(n => !n.isGroupInput && !n.isGroupOutput);
                const filteredConnections = this.connections.filter(c => {
                    const fromNodeValid = filteredNodes.find(n => n.id === c.from.node.id);
                    const toNodeValid = filteredNodes.find(n => n.id === c.to.node.id);
                    return fromNodeValid && toNodeValid;
                });

                this.currentGroup.groupData = {
                    nodes: filteredNodes,
                    connections: filteredConnections.map(c => ({
                        from: {
                            nodeId: c.from.node.id,
                            portIndex: c.from.portIndex,
                            node: c.from.node
                        },
                        to: {
                            nodeId: c.to.node.id,
                            portIndex: c.to.portIndex,
                            node: c.to.node
                        }
                    })),
                    panOffset: this.panOffset,
                    zoom: this.zoom
                };
            }

            // Exit all groups to get to root
            while (this.groupHistory.length > 0) {
                const previousState = this.groupHistory.pop();
                this.nodes = previousState.nodes;
                this.connections = previousState.connections;
                this.panOffset = previousState.panOffset;
                this.zoom = previousState.zoom;
                this.currentGroup = previousState.currentGroup;
            }
        }

        // Collect custom node definitions from the node library
        const customNodes = [];
        for (const category in this.nodeLibrary) {
            for (const nodeDef of this.nodeLibrary[category]) {
                if (nodeDef.custom) {
                    // Save custom node definition (excluding the codeGen function which will be recreated)
                    customNodes.push({
                        category: category,
                        type: nodeDef.type,
                        label: nodeDef.label,
                        color: nodeDef.color,
                        icon: nodeDef.icon,
                        inputs: nodeDef.inputs,
                        outputs: nodeDef.outputs,
                        hasInput: nodeDef.hasInput,
                        hasToggle: nodeDef.hasToggle,
                        hasDropdown: nodeDef.hasDropdown,
                        hasColorPicker: nodeDef.hasColorPicker,
                        hasExposeCheckbox: nodeDef.hasExposeCheckbox,
                        isGroup: nodeDef.isGroup,
                        wrapFlowNode: nodeDef.wrapFlowNode,
                        codeGenString: nodeDef.codeGen ? nodeDef.codeGen.toString() : null
                    });
                }
            }
        }

        const projectData = {
            version: '1.0',
            moduleName: this.moduleName,
            moduleNamespace: this.moduleNamespace,
            moduleDescription: this.moduleDescription,
            moduleIcon: this.moduleIcon,
            moduleColor: this.moduleColor,
            allowMultiple: this.allowMultiple,
            drawInEditor: this.drawInEditor,
            nodes: this.nodes,
            connections: this.connections.map(c => ({
                from: {
                    nodeId: c.from.node.id,
                    portIndex: c.from.portIndex
                },
                to: {
                    nodeId: c.to.node.id,
                    portIndex: c.to.portIndex
                }
            })),
            panOffset: this.panOffset,
            zoom: this.zoom,
            groupPanels: this.groupPanels,
            customNodes: customNodes,
            nodeComments: Array.from(this.nodeComments.entries()) // ========== NEW: Save comments ==========
        };

        try {
            await window.fileBrowser.createFile(savePath, JSON.stringify(projectData, null, 2), true);
            this.projectPath = savePath;
            this.hasUnsavedChanges = false;
            this.showNotification(`Project saved to ${savePath}!`, 'success');
        } catch (error) {
            this.showNotification(`Error saving project: ${error.message}`, 'error');
        }

        // **FIX: Restore the group state if we were in a group**
        if (wasInGroup) {
            // Restore the group history and current state
            this.groupHistory = savedHistory;
            this.nodes = savedNodes;
            this.connections = savedConnections;
            this.panOffset = savedPanOffset;
            this.zoom = savedZoom;
            this.currentGroup = savedCurrentGroup;

            // Update the breadcrumb to show we're back in the group
            this.updateGroupBreadcrumb();
        }
    }

    /**
     * Load project from .vmb file
     */
    async loadProject() {
        if (!window.fileBrowser) {
            alert('File browser not available!');
            return;
        }

        try {
            // Get all .vmb files from the project directory
            await window.fileBrowser.ensureDirectoryExists('Visual Module Builder Proj');
            const allFiles = await window.fileBrowser.getAllFiles();

            // Filter for .vmb files in the Visual Module Builder Proj directory
            // Check for both 'Visual Module Builder Proj/' and without leading slash
            const vmbFiles = allFiles
                .filter(file => {
                    const normalizedPath = file.path.replace(/\\/g, '/');
                    return (normalizedPath.startsWith('Visual Module Builder Proj/') ||
                        normalizedPath.includes('/Visual Module Builder Proj/')) &&
                        normalizedPath.endsWith('.vmb');
                })
                .map(file => ({
                    name: file.name,
                    path: file.path
                }));

            if (vmbFiles.length === 0) {
                this.showNotification('No Visual Module Builder projects found.', 'warning');
                console.log('All files:', allFiles); // Debug: show all files
                return;
            }

            // Show file picker modal
            const selectedPath = await this.showFilePickerModal(vmbFiles, 'Load Visual Module Builder Project');

            if (!selectedPath) {
                return; // User cancelled
            }

            // Load the selected file
            const file = await window.fileBrowser.getFile(selectedPath);
            if (!file) {
                this.showNotification('Failed to load project file.', 'error');
                return;
            }

            const projectData = JSON.parse(file.content);

            // Restore custom nodes first (before loading nodes that might reference them)
            if (projectData.customNodes && Array.isArray(projectData.customNodes)) {
                for (const customNodeData of projectData.customNodes) {
                    // Recreate the codeGen function from string
                    let codeGenFunction = null;
                    if (customNodeData.codeGenString) {
                        try {
                            // Use Function constructor to recreate the function
                            codeGenFunction = eval(`(${customNodeData.codeGenString})`);
                        } catch (e) {
                            console.error(`Failed to restore codeGen for custom node ${customNodeData.type}:`, e);
                        }
                    }

                    // Create the node definition
                    const nodeDef = {
                        type: customNodeData.type,
                        label: customNodeData.label,
                        color: customNodeData.color,
                        icon: customNodeData.icon,
                        inputs: customNodeData.inputs || [],
                        outputs: customNodeData.outputs || [],
                        hasInput: customNodeData.hasInput || false,
                        hasToggle: customNodeData.hasToggle || false,
                        hasDropdown: customNodeData.hasDropdown || false,
                        hasColorPicker: customNodeData.hasColorPicker || false,
                        hasExposeCheckbox: customNodeData.hasExposeCheckbox || false,
                        isGroup: customNodeData.isGroup || false,
                        wrapFlowNode: customNodeData.wrapFlowNode !== undefined ? customNodeData.wrapFlowNode : true,
                        codeGen: codeGenFunction,
                        custom: true
                    };

                    // Add to node library if not already present
                    if (!this.nodeLibrary[customNodeData.category]) {
                        this.nodeLibrary[customNodeData.category] = [];
                    }

                    // Check if node already exists in the category
                    const existingIndex = this.nodeLibrary[customNodeData.category].findIndex(n => n.type === customNodeData.type);
                    if (existingIndex >= 0) {
                        // Replace existing definition
                        this.nodeLibrary[customNodeData.category][existingIndex] = nodeDef;
                    } else {
                        // Add new definition
                        this.nodeLibrary[customNodeData.category].push(nodeDef);
                    }
                }
            }

            this.moduleName = projectData.moduleName;
            this.moduleNamespace = projectData.moduleNamespace;
            this.moduleDescription = projectData.moduleDescription;
            this.moduleIcon = projectData.moduleIcon;
            this.moduleColor = projectData.moduleColor || '#4CAF50';
            this.allowMultiple = projectData.allowMultiple;
            this.drawInEditor = projectData.drawInEditor;
            this.nodes = projectData.nodes.map(node => this.sanitizeNode(node));

            this.connections = projectData.connections.map(c => ({
                from: {
                    node: this.nodes.find(n => n.id === c.from.nodeId),
                    portIndex: c.from.portIndex,
                    isOutput: true
                },
                to: {
                    node: this.nodes.find(n => n.id === c.to.nodeId),
                    portIndex: c.to.portIndex,
                    isOutput: false
                }
            }));

            // ========== NEW: Restore comments ==========
            this.nodeComments = new Map();
            if (projectData.nodeComments && Array.isArray(projectData.nodeComments)) {
                projectData.nodeComments.forEach(([nodeId, comment]) => {
                    this.nodeComments.set(nodeId, comment);
                });
            }

            this.panOffset = projectData.panOffset || { x: 0, y: 0 };
            this.zoom = projectData.zoom || 1.0;
            this.hasUnsavedChanges = false;
            this.projectPath = selectedPath;

            // Reset to nodes tab and clear CodeMirror
            this.currentTab = 'nodes';
            this.codeMirrorEditor = null;

            this.setupUI();
            this.setupCanvas(); // Add this line to reinitialize canvas
            this.setupCanvasEventListeners(); // Add this line to reattach event listeners
            this.showNotification('Project loaded successfully!', 'success');
        } catch (error) {
            console.error('Error loading project:', error);
            this.showNotification(`Error loading project: ${error.message}`, 'error');
        }
    }

    /**
     * Save project to desktop as downloadable file
     */
    async saveProjectToDesktop() {
        // **Save the current state and return to main canvas before saving**
        const wasInGroup = this.currentGroup !== null;
        const savedCurrentGroup = this.currentGroup;
        const savedNodes = this.nodes;
        const savedConnections = this.connections;
        const savedPanOffset = this.panOffset;
        const savedZoom = this.zoom;
        const savedHistory = [...this.groupHistory];

        // If we're in a group, save its state and exit all groups to get to the root
        if (wasInGroup) {
            // Save current group state first
            if (this.currentGroup) {
                // Filter out the special group input/output nodes before saving
                const filteredNodes = this.nodes.filter(n => !n.isGroupInput && !n.isGroupOutput);
                const filteredConnections = this.connections.filter(c => {
                    const fromNodeValid = filteredNodes.find(n => n.id === c.from.node.id);
                    const toNodeValid = filteredNodes.find(n => n.id === c.to.node.id);
                    return fromNodeValid && toNodeValid;
                });

                this.currentGroup.groupData = {
                    nodes: filteredNodes,
                    connections: filteredConnections.map(c => ({
                        from: {
                            nodeId: c.from.node.id,
                            portIndex: c.from.portIndex,
                            node: c.from.node
                        },
                        to: {
                            nodeId: c.to.node.id,
                            portIndex: c.to.portIndex,
                            node: c.to.node
                        }
                    })),
                    panOffset: this.panOffset,
                    zoom: this.zoom
                };
            }

            // Exit all groups to get to root
            while (this.groupHistory.length > 0) {
                const previousState = this.groupHistory.pop();
                this.nodes = previousState.nodes;
                this.connections = previousState.connections;
                this.panOffset = previousState.panOffset;
                this.zoom = previousState.zoom;
                this.currentGroup = previousState.currentGroup;
            }
        }

        // Collect custom node definitions
        const customNodes = [];
        for (const category in this.nodeLibrary) {
            for (const nodeDef of this.nodeLibrary[category]) {
                if (nodeDef.custom) {
                    customNodes.push({
                        category: category,
                        type: nodeDef.type,
                        label: nodeDef.label,
                        color: nodeDef.color,
                        icon: nodeDef.icon,
                        inputs: nodeDef.inputs,
                        outputs: nodeDef.outputs,
                        hasInput: nodeDef.hasInput,
                        hasToggle: nodeDef.hasToggle,
                        hasDropdown: nodeDef.hasDropdown,
                        hasColorPicker: nodeDef.hasColorPicker,
                        hasExposeCheckbox: nodeDef.hasExposeCheckbox,
                        isGroup: nodeDef.isGroup,
                        wrapFlowNode: nodeDef.wrapFlowNode,
                        codeGenString: nodeDef.codeGen ? nodeDef.codeGen.toString() : null
                    });
                }
            }
        }

        const projectData = {
            version: '1.0',
            moduleName: this.moduleName,
            moduleNamespace: this.moduleNamespace,
            moduleDescription: this.moduleDescription,
            moduleIcon: this.moduleIcon,
            moduleColor: this.moduleColor,
            allowMultiple: this.allowMultiple,
            drawInEditor: this.drawInEditor,
            nodes: this.nodes,
            connections: this.connections.map(c => ({
                from: {
                    nodeId: c.from.node.id,
                    portIndex: c.from.portIndex
                },
                to: {
                    nodeId: c.to.node.id,
                    portIndex: c.to.portIndex
                }
            })),
            panOffset: this.panOffset,
            zoom: this.zoom,
            groupPanels: this.groupPanels,
            customNodes: customNodes,
            nodeComments: Array.from(this.nodeComments.entries())
        };

        try {
            // Create blob and download
            const jsonString = JSON.stringify(projectData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.moduleName || 'VMB_Project'}_${Date.now()}.vmb`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.hasUnsavedChanges = false;
            this.showNotification(`Project downloaded to desktop!`, 'success');
        } catch (error) {
            this.showNotification(`Error saving to desktop: ${error.message}`, 'error');
        }

        // **Restore the group state if we were in a group**
        if (wasInGroup) {
            this.groupHistory = savedHistory;
            this.nodes = savedNodes;
            this.connections = savedConnections;
            this.panOffset = savedPanOffset;
            this.zoom = savedZoom;
            this.currentGroup = savedCurrentGroup;
            this.updateGroupBreadcrumb();
        }
    }

    /**
     * Load project from desktop file
     */
    async loadProjectFromDesktop() {
        // Create file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.vmb,.json';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const projectData = JSON.parse(text);

                // Restore custom nodes first
                if (projectData.customNodes && Array.isArray(projectData.customNodes)) {
                    for (const customNodeData of projectData.customNodes) {
                        let codeGenFunction = null;
                        if (customNodeData.codeGenString) {
                            try {
                                codeGenFunction = eval(`(${customNodeData.codeGenString})`);
                            } catch (e) {
                                console.error(`Failed to restore codeGen for custom node ${customNodeData.type}:`, e);
                            }
                        }

                        const nodeDef = {
                            type: customNodeData.type,
                            label: customNodeData.label,
                            color: customNodeData.color,
                            icon: customNodeData.icon,
                            inputs: customNodeData.inputs || [],
                            outputs: customNodeData.outputs || [],
                            hasInput: customNodeData.hasInput || false,
                            hasToggle: customNodeData.hasToggle || false,
                            hasDropdown: customNodeData.hasDropdown || false,
                            hasColorPicker: customNodeData.hasColorPicker || false,
                            hasExposeCheckbox: customNodeData.hasExposeCheckbox || false,
                            isGroup: customNodeData.isGroup || false,
                            wrapFlowNode: customNodeData.wrapFlowNode !== undefined ? customNodeData.wrapFlowNode : true,
                            codeGen: codeGenFunction,
                            custom: true
                        };

                        if (!this.nodeLibrary[customNodeData.category]) {
                            this.nodeLibrary[customNodeData.category] = [];
                        }

                        const existingIndex = this.nodeLibrary[customNodeData.category].findIndex(n => n.type === customNodeData.type);
                        if (existingIndex >= 0) {
                            this.nodeLibrary[customNodeData.category][existingIndex] = nodeDef;
                        } else {
                            this.nodeLibrary[customNodeData.category].push(nodeDef);
                        }
                    }
                }

                this.moduleName = projectData.moduleName;
                this.moduleNamespace = projectData.moduleNamespace;
                this.moduleDescription = projectData.moduleDescription;
                this.moduleIcon = projectData.moduleIcon;
                this.moduleColor = projectData.moduleColor || '#4CAF50';
                this.allowMultiple = projectData.allowMultiple;
                this.drawInEditor = projectData.drawInEditor;
                this.nodes = projectData.nodes.map(node => this.sanitizeNode(node));

                this.connections = projectData.connections.map(c => ({
                    from: {
                        node: this.nodes.find(n => n.id === c.from.nodeId),
                        portIndex: c.from.portIndex,
                        isOutput: true
                    },
                    to: {
                        node: this.nodes.find(n => n.id === c.to.nodeId),
                        portIndex: c.to.portIndex,
                        isOutput: false
                    }
                }));

                // Restore comments
                this.nodeComments = new Map();
                if (projectData.nodeComments && Array.isArray(projectData.nodeComments)) {
                    projectData.nodeComments.forEach(([nodeId, comment]) => {
                        this.nodeComments.set(nodeId, comment);
                    });
                }

                // Restore group panels
                if (projectData.groupPanels) {
                    this.groupPanels = projectData.groupPanels;
                }

                this.panOffset = projectData.panOffset || { x: 0, y: 0 };
                this.zoom = projectData.zoom || 1.0;
                this.hasUnsavedChanges = false;
                this.projectPath = null; // Clear internal path since loaded from desktop

                // Reset to nodes tab and clear CodeMirror
                this.currentTab = 'nodes';
                this.codeMirrorEditor = null;

                this.setupUI();
                this.setupCanvas();
                this.setupCanvasEventListeners();
                this.showNotification(`Project loaded from desktop successfully!`, 'success');
            } catch (error) {
                console.error('Error loading project from desktop:', error);
                this.showNotification(`Error loading project: ${error.message}`, 'error');
            }
        };

        input.click();
    }

    /**
     * Load an example module
     */
    loadExample(exampleName) {
        if (this.hasUnsavedChanges) {
            if (!confirm('You have unsaved changes. Load example anyway?')) {
                return;
            }
        }

        const examples = VMBExampleModules.getExamples();
        const example = examples[exampleName];

        if (!example) {
            this.showNotification(`Example "${exampleName}" not found!`, 'error');
            return;
        }

        // Helper function to normalize node data
        const normalizeNode = (node) => {
            const normalized = { ...node };

            // Convert inputs/outputs from object arrays to string arrays if needed
            if (normalized.inputs && Array.isArray(normalized.inputs)) {
                if (normalized.inputs.length > 0 && typeof normalized.inputs[0] === 'object') {
                    normalized.inputs = normalized.inputs.map(inp => inp.label || inp.type || 'input');
                }
            }

            if (normalized.outputs && Array.isArray(normalized.outputs)) {
                if (normalized.outputs.length > 0 && typeof normalized.outputs[0] === 'object') {
                    normalized.outputs = normalized.outputs.map(out => out.label || out.type || 'output');
                }
            }

            // Handle nested nodes in groups
            if (normalized.nodes && Array.isArray(normalized.nodes)) {
                normalized.nodes = normalized.nodes.map(normalizeNode);
            }

            // Sanitize the node to ensure all required properties
            return this.sanitizeNode(normalized);
        };

        // Load example data
        this.moduleName = example.moduleName;
        this.moduleNamespace = example.moduleNamespace;
        this.moduleDescription = example.moduleDescription;
        this.moduleIcon = example.moduleIcon;
        this.moduleColor = example.moduleColor;
        this.allowMultiple = example.allowMultiple;
        this.drawInEditor = example.drawInEditor;

        // Deep clone and normalize nodes
        const clonedNodes = JSON.parse(JSON.stringify(example.nodes));
        this.nodes = clonedNodes.map(normalizeNode);

        // Build a map of all nodes (including nested ones) for connection reconstruction
        const nodeMap = new Map();
        const collectNodes = (nodes) => {
            nodes.forEach(node => {
                nodeMap.set(node.id, node);
                if (node.nodes && Array.isArray(node.nodes)) {
                    collectNodes(node.nodes);
                }
            });
        };
        collectNodes(this.nodes);

        // Reconstruct connections with proper node references
        this.connections = [];
        if (example.connections && Array.isArray(example.connections)) {
            example.connections.forEach(conn => {
                const fromNode = nodeMap.get(conn.from);
                const toNode = nodeMap.get(conn.to);

                if (fromNode && toNode) {
                    this.connections.push({
                        from: {
                            node: fromNode,
                            portIndex: conn.fromPort || 0
                        },
                        to: {
                            node: toNode,
                            portIndex: conn.toPort || 0
                        }
                    });
                }
            });
        }

        this.selectedNode = null;
        this.projectPath = null;
        this.hasUnsavedChanges = false;
        this.panOffset = { x: 0, y: 0 };
        this.zoom = 1.0;

        this.currentTab = 'nodes';
        this.codeMirrorEditor = null;

        // Refresh UI
        this.setupUI();
        // Re-setup canvas after UI recreation
        this.setupCanvas();
        this.setupCanvasEventListeners();

        this.showNotification(`Example "${example.moduleName}" loaded!`, 'success');
    }

    /**
     * Show a modal to pick a file from a list
     * @param {Array} files - Array of file objects with { name, path }
     * @param {string} title - Modal title
     * @returns {Promise<string|null>} - Selected file path or null if cancelled
     */
    showFilePickerModal(files, title = "Select File") {
        return new Promise(resolve => {
            // Remove any existing modal
            const existingModal = document.getElementById('vmbFilePickerModal');
            if (existingModal) {
                existingModal.remove();
            }

            // Create overlay
            const overlay = document.createElement('div');
            overlay.id = 'vmbFilePickerModal';
            overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.85);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

            // Modal content
            const modal = document.createElement('div');
            modal.style.cssText = `
            background: #222;
            border: 1px solid #555;
            border-radius: 8px;
            padding: 24px;
            min-width: 400px;
            max-width: 600px;
            max-height: 70vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        `;

            const header = document.createElement('h2');
            header.textContent = title;
            header.style.cssText = `
            color: #64B5F6;
            margin: 0 0 16px 0;
            font-size: 18px;
        `;

            const fileList = document.createElement('div');
            fileList.style.cssText = `
            overflow-y: auto;
            flex: 1;
            margin-bottom: 16px;
        `;

            if (files.length === 0) {
                fileList.innerHTML = '<div style="color: #ccc; text-align: center; padding: 20px;">No files found.</div>';
            } else {
                const ul = document.createElement('ul');
                ul.style.cssText = `
                list-style: none;
                padding: 0;
                margin: 0;
            `;

                files.forEach(file => {
                    const li = document.createElement('li');
                    li.style.cssText = `
                    padding: 12px;
                    border-bottom: 1px solid #333;
                    cursor: pointer;
                    color: #fff;
                    transition: background 0.2s;
                `;
                    li.innerHTML = `
                    <i class="fas fa-file-code" style="margin-right: 8px; color: #64B5F6;"></i>
                    ${file.name}
                `;

                    li.addEventListener('mouseenter', () => {
                        li.style.background = '#2a2a2a';
                    });
                    li.addEventListener('mouseleave', () => {
                        li.style.background = 'transparent';
                    });
                    li.addEventListener('click', () => {
                        overlay.remove();
                        resolve(file.path);
                    });

                    ul.appendChild(li);
                });

                fileList.appendChild(ul);
            }

            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 8px;
        `;

            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancel';
            cancelButton.style.cssText = `
            background: #444;
            color: #fff;
            border: 1px solid #666;
            border-radius: 4px;
            padding: 8px 16px;
            cursor: pointer;
            font-size: 14px;
        `;
            cancelButton.addEventListener('mouseenter', () => {
                cancelButton.style.background = '#555';
            });
            cancelButton.addEventListener('mouseleave', () => {
                cancelButton.style.background = '#444';
            });
            cancelButton.addEventListener('click', () => {
                overlay.remove();
                resolve(null);
            });

            buttonContainer.appendChild(cancelButton);

            modal.appendChild(header);
            modal.appendChild(fileList);
            modal.appendChild(buttonContainer);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            // ESC key closes modal
            overlay.tabIndex = 0;
            overlay.focus();
            overlay.onkeydown = (e) => {
                if (e.key === 'Escape') {
                    overlay.remove();
                    resolve(null);
                }
            };

            // Click outside to close
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                    resolve(null);
                }
            };
        });
    }

    close() {
        super.close();

        // ========== NEW: Stop live preview on close ==========
        this.stopLivePreview();

        // Stop animation loop
        this.isActive = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }

    /**
     * Helper to find node by ID (including nested nodes in groups)
     */
    findNodeById(id) {
        const search = (nodes) => {
            for (const node of nodes) {
                if (node.id === id) return node;
                if (node.nodes && Array.isArray(node.nodes)) {
                    const found = search(node.nodes);
                    if (found) return found;
                }
            }
            return null;
        };
        return search(this.nodes);
    }

    /**
     * Clear canvas
     */
    clearCanvas() {
        if (this.nodes.length === 0) return;

        if (confirm('Clear all nodes and connections?')) {
            this.nodes = [];
            this.connections = [];
            this.selectedNode = null;
            this.hasUnsavedChanges = true;
        }
    }

    /**
     * Log message to console panel
     */
    logToConsole(message, type = 'info') {
        if (!this.consolePanel) return;

        const entry = document.createElement('div');
        entry.style.cssText = `
        padding: 4px 8px;
        margin-bottom: 2px;
        border-radius: 3px;
        background: ${type === 'error' ? 'rgba(244, 67, 54, 0.2)' :
                type === 'warning' ? 'rgba(255, 152, 0, 0.2)' :
                    'rgba(33, 150, 243, 0.2)'};
        border-left: 3px solid ${type === 'error' ? '#f44336' :
                type === 'warning' ? '#FF9800' :
                    '#2196F3'};
        color: ${type === 'error' ? '#ffcdd2' :
                type === 'warning' ? '#ffe0b2' :
                    '#bbdefb'};
    `;

        const timestamp = new Date().toLocaleTimeString();
        entry.textContent = `[${timestamp}] ${message}`;

        this.consolePanel.appendChild(entry);
        this.consolePanel.scrollTop = this.consolePanel.scrollHeight;
    }

    /**
     * Validate the node graph and report issues
     */
    validateGraph() {
        if (!this.consolePanel) return;

        console.log('Running validation...', 'info');
        let issueCount = 0;

        this.nodes.forEach(node => {
            // Convert node.id to string to ensure compatibility with string methods
            const nodeIdStr = String(node.id);
            const shortId = nodeIdStr.substring(0, 8);

            // Check for nodes with no connections
            const hasInputConnections = this.connections.some(c => c.to.node.id === node.id);
            const hasOutputConnections = this.connections.some(c => c.from.node.id === node.id);

            // Skip event nodes (they don't need input connections)
            const isEventNode = ['start', 'loop', 'draw', 'onDestroy'].includes(node.type);

            if (!hasInputConnections && !hasOutputConnections && !isEventNode) {
                this.logToConsole(`⚠ Node "${node.label}" (ID: ${shortId}...) has no connections`, 'warning');
                issueCount++;
            }

            // Check for nodes with required inputs that aren't connected
            if (node.inputs.length > 0) {
                node.inputs.forEach((inputName, index) => {
                    // Skip 'flow' inputs for this check
                    if (inputName === 'flow') return;

                    const isConnected = this.connections.some(c =>
                        c.to.node.id === node.id && c.to.portIndex === index
                    );

                    if (!isConnected) {
                        this.logToConsole(`⚠ Node "${node.label}" input "${inputName}" is not connected`, 'warning');
                        issueCount++;
                    }
                });
            }

            // Check for nodes with no outputs connected (excluding variables with no outputs)
            if (node.outputs.length > 0) {
                let hasNonFlowOutput = false;
                node.outputs.forEach((outputName, index) => {
                    // Skip 'flow' outputs for this check
                    if (outputName === 'flow') return;

                    hasNonFlowOutput = true;
                    const isConnected = this.connections.some(c =>
                        c.from.node.id === node.id && c.from.portIndex === index
                    );
                    if (!isConnected) {
                        this.logToConsole(`⚠ Node "${node.label}" output "${outputName}" is not connected`, 'warning');
                        issueCount++;
                    }
                });
            }

            // Special check for variable nodes with no outputs (like number, string, boolean, color)
            const isVariableWithNoOutputs = ['number', 'string', 'boolean', 'color'].includes(node.type);
            if (isVariableWithNoOutputs) {
                const hasOutputValue = node.outputs.some((outputName) => outputName === 'value');
                if (hasOutputValue) {
                    const isValueConnected = this.connections.some(c =>
                        c.from.node.id === node.id && c.from.portIndex === node.outputs.indexOf('value')
                    );
                    if (!isValueConnected) {
                        this.logToConsole(`ℹ Variable node "${node.label}" has no output connections - its value may not be used`, 'info');
                    }
                }
            }

            // Check for const/let variables with no variable output connections
            const isVariableDeclaration = ['const', 'let'].includes(node.type);
            if (isVariableDeclaration) {
                const variableOutputIndex = node.outputs.indexOf('variable');
                if (variableOutputIndex !== -1) {
                    const isVariableConnected = this.connections.some(c =>
                        c.from.node.id === node.id && c.from.portIndex === variableOutputIndex
                    );
                    if (!isVariableConnected) {
                        this.logToConsole(`ℹ Variable declaration "${node.value || node.label}" has no variable output connections - it may not be used`, 'info');
                    }
                }
            }
        });

        if (issueCount === 0) {
            this.logToConsole('✓ No issues found!', 'success');
        } else {
            this.logToConsole(`⚠ Found ${issueCount} potential issues`, 'warning');
        }
    }

    /**
     * Open text editor for node input
     */
    openTextEditor(node, x, y, width, height) {
        this.closeTextEditor();

        // Store the canvas-space coordinates for repositioning
        this.editingNodeCanvasX = x;
        this.editingNodeCanvasY = y;
        this.editingNodeCanvasWidth = width;
        this.editingNodeCanvasHeight = height;

        // Create input element
        const input = document.createElement('input');
        input.type = 'text';
        input.value = node.value || '';

        // Initial positioning
        this.updateTextEditorPosition(input, x, y, width, height);

        // Add to body
        document.body.appendChild(input);
        input.focus();
        input.select();

        // Store references
        this.editingNode = node;
        this.editingElement = input;

        // Handle input changes
        input.addEventListener('input', (e) => {
            node.value = e.target.value;
            this.hasUnsavedChanges = true;
        });

        // Handle blur and enter key
        const closeEditor = () => {
            // Only close if the element still exists
            if (this.editingElement) {
                this.saveState(); // NEW: Save state when closing text editor
                this.closeTextEditor();
            }
        };

        input.addEventListener('blur', closeEditor);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
                closeEditor();
            }
            e.stopPropagation(); // Prevent canvas shortcuts
        });

        // Prevent canvas interactions while editing
        input.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
    }

    /**
     * Update text editor position based on current zoom and pan
     */
    updateTextEditorPosition(input, canvasX, canvasY, canvasWidth, canvasHeight) {
        // Convert canvas coordinates to screen coordinates
        const screenX = canvasX * this.zoom + this.panOffset.x;
        const screenY = canvasY * this.zoom + this.panOffset.y;
        const screenW = canvasWidth * this.zoom;
        const screenH = canvasHeight * this.zoom;

        // Get canvas position
        const canvasRect = this.canvas.getBoundingClientRect();

        input.style.cssText = `
            position: absolute;
            left: ${canvasRect.left + screenX}px;
            top: ${canvasRect.top + screenY}px;
            width: ${screenW}px;
            height: ${screenH}px;
            background: #333;
            border: 2px solid #00ffff;
            border-radius: 4px;
            color: #fff;
            font-size: ${11 * this.zoom}px;
            font-family: monospace;
            padding: 2px 4px;
            box-sizing: border-box;
            z-index: 10000;
            outline: none;
        `;
    }

    /**
     * Edit node comment/annotation
     */
    editNodeComment(node) {
        const currentComment = this.nodeComments.get(node.id) || '';
        const newComment = prompt('Enter comment/annotation for this node:', currentComment);

        if (newComment !== null) {
            if (newComment.trim()) {
                this.nodeComments.set(node.id, newComment.trim());
                this.showNotification('Comment added!', 'success');
            } else {
                this.nodeComments.delete(node.id);
                this.showNotification('Comment removed!', 'info');
            }
            this.hasUnsavedChanges = true;
            this.saveState();
        }
    }

    /**
     * Draw comment tooltip as a speech bubble
     */
    drawCommentTooltip(ctx, node, bubbleX, bubbleY) {
        const comment = this.nodeComments.get(node.id);
        if (!comment) return;

        // Speech bubble styling
        const padding = 12;
        const maxWidth = 250;
        const lineHeight = 16;

        // Measure text and wrap
        ctx.font = '11px Arial';
        const words = comment.split(' ');
        const lines = [];
        let currentLine = '';

        words.forEach(word => {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth - padding * 2) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });
        if (currentLine) lines.push(currentLine);

        const bubbleWidth = Math.min(maxWidth, Math.max(...lines.map(l => ctx.measureText(l).width)) + padding * 2);
        const bubbleHeight = lines.length * lineHeight + padding * 2;

        // Position bubble above and to the left of the button
        const bx = bubbleX - bubbleWidth - 10;
        const by = bubbleY - bubbleHeight / 2;

        // Draw speech bubble tail (small triangle)
        ctx.fillStyle = '#2a2a2a';
        ctx.beginPath();
        ctx.moveTo(bx + bubbleWidth, by + bubbleHeight / 2 - 6);
        ctx.lineTo(bx + bubbleWidth + 8, by + bubbleHeight / 2);
        ctx.lineTo(bx + bubbleWidth, by + bubbleHeight / 2 + 6);
        ctx.closePath();
        ctx.fill();

        // Draw speech bubble with glowing outline
        ctx.shadowColor = this.connectionColor;
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#2a2a2a';
        ctx.strokeStyle = this.connectionColor;
        ctx.lineWidth = 2;
        this.roundRect(ctx, bx, by, bubbleWidth, bubbleHeight, 8);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw text
        ctx.fillStyle = '#fff';
        ctx.font = '11px Arial';
        ctx.textAlign = 'left';
        lines.forEach((line, i) => {
            ctx.fillText(line, bx + padding, by + padding + (i + 1) * lineHeight - 4);
        });
    }

    /**
     * Test the module in live preview mode
     */
    async testModule() {
        if (!this.moduleName) {
            this.showNotification('Please enter a module name first!', 'warning');
            return;
        }

        this.logToConsole('🔬 Starting live preview...', 'info');

        try {
            // Generate module code
            const code = this.generateModuleCode();

            // Create a temporary module class
            const tempModuleCode = code.replace(
                `class ${this.moduleName}`,
                `class ${this.moduleName}`
            );

            // Execute the code to create the class
            eval(code);

            // Get the preview class
            const PreviewModuleClass = eval(`${this.moduleName}`);

            // Create or update preview window
            if (!this.previewWindow || !this.previewWindow.isOpen) {
                this.previewWindow = new ModulePreviewWindow(this);
            }

            // Update the preview with the new module
            this.previewWindow.updateModule(PreviewModuleClass);

            this.livePreviewActive = true;
            this.logToConsole('✅ Live preview active! Module running in preview window.', 'success');
            this.showNotification('Live preview started! Check the preview window.', 'success');

        } catch (error) {
            this.logToConsole(`❌ Live preview error: ${error.message}`, 'error');
            console.error('Live preview error:', error);
            this.showNotification('Live preview failed! Check console for details.', 'error');
        }
    }

    /**
     * Stop live preview
     */
    stopLivePreview() {
        if (this.previewWindow && this.previewWindow.isOpen) {
            this.previewWindow.close();
            this.previewWindow = null;
        }

        this.livePreviewActive = false;
        this.logToConsole('🛑 Live preview stopped.', 'info');
    }

    /**
     * Open color picker for a node
     */
    openColorPicker(node, x, y, width, height) {
        this.closeTextEditor();

        const screenX = x * this.zoom + this.panOffset.x;
        const screenY = y * this.zoom + this.panOffset.y;
        const screenW = width * this.zoom;
        const screenH = height * this.zoom;

        const container = document.createElement('div');
        container.style.cssText = `
        position: absolute;
        left: ${screenX}px;
        top: ${screenY}px;
        display: flex;
        gap: 4px;
        z-index: 10000;
    `;

        const canvasRect = this.canvas.getBoundingClientRect();
        container.style.left = (canvasRect.left + screenX) + 'px';
        container.style.top = (canvasRect.top + screenY) + 'px';

        // Color input
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = node.value || '#ffffff';
        colorInput.style.cssText = `
        width: ${screenW * 0.3}px;
        height: ${screenH}px;
        border: 2px solid #00ffff;
        border-radius: 4px;
        cursor: pointer;
        background: none;
    `;

        // Text input for hex value
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = node.value || '#ffffff';
        textInput.style.cssText = `
        width: ${screenW * 0.7 - 8}px;
        height: ${screenH}px;
        background: #333;
        border: 2px solid #00ffff;
        border-radius: 4px;
        color: #fff;
        font-size: ${10 * this.zoom}px;
        font-family: monospace;
        padding: 2px 4px;
        box-sizing: border-box;
        outline: none;
    `;

        colorInput.addEventListener('input', (e) => {
            node.value = e.target.value;
            textInput.value = e.target.value;
            this.hasUnsavedChanges = true;
        });

        // Track if color picker dialog is open
        let colorPickerOpen = false;
        let blurTimeoutId = null;

        colorInput.addEventListener('click', () => {
            colorPickerOpen = true;
        });

        textInput.addEventListener('input', (e) => {
            if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                node.value = e.target.value;
                colorInput.value = e.target.value;
                this.hasUnsavedChanges = true;
            }
        });

        container.appendChild(colorInput);
        container.appendChild(textInput);
        document.body.appendChild(container);
        textInput.focus();
        textInput.select();

        this.editingNode = node;
        this.editingElement = container;

        const closeEditor = () => {
            if (blurTimeoutId) {
                clearTimeout(blurTimeoutId);
                blurTimeoutId = null;
            }
            this.saveState(); // NEW: Save state when closing color picker
            this.closeTextEditor();
        };

        colorInput.addEventListener('blur', () => {
            // Delay closing to allow color picker dialog to open
            blurTimeoutId = setTimeout(() => {
                if (!colorPickerOpen) {
                    closeEditor();
                }
            }, 200);
        });

        colorInput.addEventListener('change', () => {
            // Color was selected, mark picker as closed
            colorPickerOpen = false;
        });

        textInput.addEventListener('blur', () => {
            setTimeout(() => {
                // Only close if focus didn't move to color input
                if (document.activeElement !== colorInput && !colorPickerOpen) {
                    closeEditor();
                }
            }, 200);
        });

        textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
                closeEditor();
            }
            e.stopPropagation();
        });

        container.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });

        // Close editor when clicking outside
        const outsideClickHandler = (e) => {
            if (!container.contains(e.target)) {
                closeEditor();
                document.removeEventListener('mousedown', outsideClickHandler);
            }
        };

        // Add slight delay before attaching outside click handler
        setTimeout(() => {
            document.addEventListener('mousedown', outsideClickHandler);
        }, 100);
    }

    /**
     * Cycle through available properties for property dropdown
     */
    cyclePropertyDropdownValue(node) {
        const exposedProps = this.getAllExposedProperties();

        if (exposedProps.length === 0) {
            node.selectedProperty = 'none';
            this.showNotification('No exposed properties available. Create a "Set Property" node with "Expose" checked.', 'warning');
            return;
        }

        const currentIndex = exposedProps.indexOf(node.selectedProperty);
        const nextIndex = (currentIndex + 1) % exposedProps.length;
        node.selectedProperty = exposedProps[nextIndex];
        this.saveState(); // NEW: Save state after property dropdown change
    }

    /**
     * Get contrast color for text (black or white) based on background
     */
    getContrastColor(hexColor) {
        // Remove # and handle shorthand
        let hex = hexColor.replace('#', '');

        // Handle 8-digit hex (with alpha)
        if (hex.length === 8) {
            hex = hex.substring(0, 6);
        }

        // Convert 3-digit hex to 6-digit
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }

        // Convert hex to RGB
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);

        // Calculate luminance using relative luminance formula
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        // Return black for bright colors, white for dark colors
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    /**
     * Open a dropdown menu for selecting values
     */
    openDropdownMenu(node, x, y, width, height) {
        this.closeTextEditor();
        this.closeDropdownMenu();

        const screenX = x * this.zoom + this.panOffset.x;
        const screenY = (y + height) * this.zoom + this.panOffset.y;
        const screenW = width * this.zoom;

        const container = document.createElement('div');
        container.className = 'vmb-dropdown-menu';
        container.style.cssText = `
            position: absolute;
            left: ${screenX}px;
            top: ${screenY}px;
            width: ${screenW}px;
            max-height: 300px;
            overflow-y: auto;
            background: #2a2a2a;
            border: 2px solid #00ffff;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            z-index: 10001;
            padding: 4px;
        `;

        const canvasRect = this.canvas.getBoundingClientRect();
        container.style.left = (canvasRect.left + screenX) + 'px';
        container.style.top = (canvasRect.top + screenY) + 'px';

        // Get dropdown options
        const options = node.dropdownOptions || ['==', '!=', '>', '<', '>=', '<='];
        const currentValue = node.dropdownValue || options[0];

        // Create option elements
        options.forEach(option => {
            const optionDiv = document.createElement('div');
            optionDiv.textContent = option;
            optionDiv.style.cssText = `
                padding: 6px 10px;
                color: ${option === currentValue ? '#00ffff' : '#fff'};
                background: ${option === currentValue ? '#333' : 'transparent'};
                cursor: pointer;
                border-radius: 3px;
                font-family: monospace;
                font-size: 11px;
                transition: background 0.1s;
            `;

            optionDiv.addEventListener('mouseenter', () => {
                if (option !== currentValue) {
                    optionDiv.style.background = '#333';
                }
            });

            optionDiv.addEventListener('mouseleave', () => {
                if (option !== currentValue) {
                    optionDiv.style.background = 'transparent';
                }
            });

            optionDiv.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                node.dropdownValue = option;
                this.hasUnsavedChanges = true;
                this.saveState();
                this.closeDropdownMenu();
            });

            container.appendChild(optionDiv);
        });

        document.body.appendChild(container);
        this.currentDropdownMenu = container;

        // Close on click outside
        const closeOnClickOutside = (e) => {
            if (!container.contains(e.target)) {
                this.closeDropdownMenu();
                document.removeEventListener('mousedown', closeOnClickOutside);
            }
        };

        setTimeout(() => {
            document.addEventListener('mousedown', closeOnClickOutside);
        }, 100);

        // Prevent canvas interactions
        container.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });

        container.addEventListener('wheel', (e) => {
            e.stopPropagation();
        });
    }

    /**
     * Close the dropdown menu
     */
    closeDropdownMenu() {
        if (this.currentDropdownMenu) {
            this.currentDropdownMenu.remove();
            this.currentDropdownMenu = null;
        }
    }

    /**
     * Close text editor (update to also close dropdown)
     */
    closeTextEditor() {
        if (this.editingElement) {
            // Store reference and clear immediately to prevent re-entry
            const elementToRemove = this.editingElement;
            this.editingElement = null;
            this.editingNode = null;

            // Now safely remove from DOM
            if (elementToRemove.parentNode) {
                elementToRemove.remove();
            }
        }
        this.closeDropdownMenu();
    }

    /**
     * Edit group name
     */
    editGroupName(node) {
        const newName = prompt('Enter group name:', node.label);
        if (newName && newName.trim()) {
            // For method nodes, convert to camelCase
            if (node.type === 'method') {
                node.label = this.toCamelCase(newName);
            } else {
                node.label = newName.trim();
            }
            this.hasUnsavedChanges = true;
            this.logToConsole(`Renamed ${node.type === 'method' ? 'method' : 'group'} to "${node.label}"`, 'info');
        }
    }

    /**
     * Convert a title string to camelCase for method names
     */
    toCamelCase(str) {
        return str
            .trim()
            .split(/\s+/)
            .map((word, index) => {
                // First word is lowercase, subsequent words are title case
                if (index === 0) {
                    return word.charAt(0).toLowerCase() + word.slice(1).toLowerCase();
                } else {
                    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                }
            })
            .join('');
    }

    /**
     * Cycle dropdown value
     */
    cycleDropdownValue(node) {
        const values = node.dropdownOptions || ['==', '!=', '<', '>', '<=', '>='];
        const currentIndex = values.indexOf(node.dropdownValue);
        const nextIndex = (currentIndex + 1) % values.length;
        node.dropdownValue = values[nextIndex];
        this.saveState(); // NEW: Save state after cycling dropdown
    }

    showNodeBuilder() {
        // Ensure the node builder script is loaded
        this.loadNodeBuilderScript();

        // Show the node builder UI
        if (window.visualModuleBuilderNodeBuilder && typeof window.visualModuleBuilderNodeBuilder.show === 'function') {
            window.visualModuleBuilderNodeBuilder.show(this);
        } else {
            this.showNotification('Node Builder is not available.', 'error');
        }
    }

    /**
     * Load the node builder
     */
    loadNodeBuilderScript() {
        // Check if already loaded
        if (window.visualModuleBuilderNodeBuilder) {
            return;
        }

        // Create and load the script
        const script = document.createElement('script');
        script.src = 'src/core/Windows/VisualModuleBuilderNodeBuilder.js';
        script.onload = () => {
            console.log('Visual Module Builder Node Builder loaded successfully');
        };
        script.onerror = () => {
            console.error('Failed to load Visual Module Builder Node Builder');
        };
        document.head.appendChild(script);
    }

    /**
     * Load the documentation script dynamically
     */
    loadDocumentationScript() {
        // Check if already loaded
        if (typeof window.showVisualModuleBuilderHelp === 'function') {
            return;
        }

        // Create and load the script
        const script = document.createElement('script');
        script.src = 'src/core/Windows/VisualModuleBuilderDocumentation.js';
        script.onload = () => {
            console.log('Visual Module Builder Documentation loaded successfully');
        };
        script.onerror = () => {
            console.error('Failed to load Visual Module Builder Documentation');
        };
        document.head.appendChild(script);
    }

    /**
     * Show help modal
     */
    showHelp() {
        // Check if documentation function is available
        if (typeof window.showVisualModuleBuilderHelp === 'function') {
            window.showVisualModuleBuilderHelp();
        } else {
            // Fallback to simple alert if documentation script hasn't loaded yet
            const helpText = `
    Visual Module Builder Help

    CONTROLS:
    - Drag nodes from the library to add them to the canvas
    - Click and drag nodes to move them
    - Click on output ports (right side) and drag to input ports (left side) to create connections
    - Middle mouse or left click + drag on empty space to pan
    - Scroll wheel to zoom in/out
    - Delete key to remove selected node
    - Ctrl+S to save project

    NODE TYPES:
    - Events: Start, Loop, Draw, OnDestroy - Entry points for your module
    - Variables: Get/Set properties, constants
    - Logic: Conditionals, comparisons, boolean operations
    - Math: Basic arithmetic operations
    - GameObject: Position, finding objects, instantiation
    - Drawing: Shapes, text rendering

    WORKFLOW:
    1. Set module name and properties at the top
    2. Add event nodes (Start, Loop, Draw)
    3. Connect logic and data flow nodes
    4. Test by exporting the module
    5. Save your project for later editing

    The exported module will be saved to "Visual Modules" directory and automatically registered with the engine.
            `.trim();

            alert(helpText);

            // Try to load the documentation script for next time
            this.loadDocumentationScript();
        }
    }

    /**
     * Find all connected node groups using union-find algorithm
     */
    findConnectedGroups() {
        const nodeToGroup = new Map();
        const groups = [];

        // Initialize each node in its own group
        this.nodes.forEach(node => {
            const groupId = groups.length;
            nodeToGroup.set(node, groupId);
            groups.push(new Set([node]));
        });

        // Helper to find root group
        const findRoot = (nodeId) => {
            let id = nodeId;
            while (groups[id].size === 0) {
                id = nodeToGroup.get(Array.from(groups[id])[0]);
            }
            return id;
        };

        // Merge groups based on connections
        this.connections.forEach(conn => {
            const fromGroup = nodeToGroup.get(conn.from.node);
            const toGroup = nodeToGroup.get(conn.to.node);

            if (fromGroup !== toGroup) {
                // Merge smaller group into larger
                const smallerGroup = groups[fromGroup].size < groups[toGroup].size ? fromGroup : toGroup;
                const largerGroup = smallerGroup === fromGroup ? toGroup : fromGroup;

                // Move all nodes from smaller to larger
                groups[smallerGroup].forEach(node => {
                    groups[largerGroup].add(node);
                    nodeToGroup.set(node, largerGroup);
                });
                groups[smallerGroup].clear();
            }
        });

        // Return only non-empty groups with more than one node
        return groups.filter(g => g.size > 1);
    }

    /**
     * Calculate bounds for a group of nodes
     */
    calculateGroupBounds(nodeSet) {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        nodeSet.forEach(node => {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x + node.width);
            maxY = Math.max(maxY, node.y + node.height);
        });

        const padding = 48;
        return {
            x: minX - padding,
            y: minY - padding,
            width: (maxX - minX) + (padding * 2),
            height: (maxY - minY) + (padding * 2)
        };
    }

    /**
     * Update group panels data
     */
    updateGroupPanels() {
        const groups = this.findConnectedGroups();
        const newGroupPanels = groups.map((nodeSet, index) => {
            const bounds = this.calculateGroupBounds(nodeSet);
            const baseColor = this.generateGroupColor(index);

            // Check if any node in this group has a groupPanelName
            let existingGroupName = null;
            for (const node of nodeSet) {
                if (node.groupPanelName) {
                    existingGroupName = node.groupPanelName;
                    break;
                }
            }

            // Check if we already have a panel for this group (by matching nodes)
            const existingPanel = this.groupPanels.find(panel => {
                // Compare node sets
                if (panel.nodes.length !== nodeSet.size) return false;
                const panelNodeIds = new Set(panel.nodes.map(n => n.id));
                for (const node of nodeSet) {
                    if (!panelNodeIds.has(node.id)) return false;
                }
                return true;
            });

            // Determine the label to use
            const panelLabel = existingGroupName || existingPanel?.customLabel || `Group ${index + 1}`;

            // Apply the group name to all nodes in this group
            nodeSet.forEach(node => {
                node.groupPanelName = panelLabel;
            });

            return {
                bounds,
                color: existingPanel?.customColor || baseColor,
                label: panelLabel,
                nodes: Array.from(nodeSet),
                customColor: existingPanel?.customColor,
                customLabel: panelLabel,
                collapsed: existingPanel?.collapsed || false // Preserve collapsed state
            };
        });

        this.groupPanels = newGroupPanels;
    }

    /**
     * Generate a color for a group
     */
    generateGroupColor(index) {
        const colors = [
            'rgba(76, 175, 80, 0.15)',   // Green
            'rgba(33, 150, 243, 0.15)',  // Blue
            'rgba(156, 39, 176, 0.15)',  // Purple
            'rgba(255, 152, 0, 0.15)',   // Orange
            'rgba(244, 67, 54, 0.15)',   // Red
            'rgba(0, 188, 212, 0.15)',   // Cyan
            'rgba(255, 235, 59, 0.15)',  // Yellow
            'rgba(233, 30, 99, 0.15)',   // Pink
        ];
        return colors[index % colors.length];
    }

    /**
     * Get lighter color for outline
     */
    getLighterColor(rgbaColor) {
        // Parse rgba color
        const match = rgbaColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (!match) return rgbaColor;

        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        const a = match[4] ? parseFloat(match[4]) : 1;

        // Make it lighter and more opaque for outline
        return `rgba(${Math.min(r + 60, 255)}, ${Math.min(g + 60, 255)}, ${Math.min(b + 60, 255)}, ${Math.min(a * 3, 0.6)})`;
    }

    /**
     * Draw all group panels
     */
    drawGroupPanels(ctx) {
        this.groupPanels.forEach((panel, index) => {
            const { bounds, color, label, collapsed } = panel;

            // If collapsed, draw compact version
            if (collapsed) {
                const collapsedWidth = 200;
                const collapsedHeight = 80;
                const collapsedX = bounds.x;
                const collapsedY = bounds.y;

                // Draw compact panel
                ctx.fillStyle = color;
                this.roundRect(ctx, collapsedX, collapsedY, collapsedWidth, collapsedHeight, 12);
                ctx.fill();

                // Draw dashed outline
                ctx.strokeStyle = this.getLighterColor(color);
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 4]);
                this.roundRect(ctx, collapsedX, collapsedY, collapsedWidth, collapsedHeight, 12);
                ctx.stroke();
                ctx.setLineDash([]);

                // Draw grip handle at top center
                const gripX = collapsedX + collapsedWidth / 2;
                const gripY = collapsedY + 16;
                const gripWidth = 60;
                const gripHeight = 20;

                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                this.roundRect(ctx, gripX - gripWidth / 2, gripY - gripHeight / 2, gripWidth, gripHeight, 4);
                ctx.fill();

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                for (let i = 0; i < 3; i++) {
                    const lineY = gripY - 4 + i * 4;
                    ctx.beginPath();
                    ctx.moveTo(gripX - 15, lineY);
                    ctx.lineTo(gripX + 15, lineY);
                    ctx.stroke();
                }

                panel.grip = { x: gripX, y: gripY, width: gripWidth, height: gripHeight };

                // Draw buttons (REMOVE colorButton, keep only expand and label)
                const buttonY = collapsedY + 20;
                const expandButtonX = collapsedX + 20;
                const labelButtonX = collapsedX + collapsedWidth - 30;

                // Expand button (left side)
                ctx.fillStyle = 'rgba(76, 175, 80, 0.8)';
                ctx.beginPath();
                ctx.arc(expandButtonX, buttonY, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('▼', expandButtonX, buttonY + 4);

                // Label button (REMOVED COLOR BUTTON)
                ctx.fillStyle = 'rgba(156, 39, 176, 0.8)';
                ctx.beginPath();
                ctx.arc(labelButtonX, buttonY, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.fillText('✎', labelButtonX, buttonY + 4);

                panel.expandButton = { x: expandButtonX, y: buttonY, radius: 10 };
                panel.labelButton = { x: labelButtonX, y: buttonY, radius: 10 };
                // REMOVED: panel.colorButton

                // Draw label in center
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(label, collapsedX + collapsedWidth / 2, collapsedY + collapsedHeight - 20);
                ctx.font = '11px Arial';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.fillText(`${panel.nodes.length} nodes hidden`, collapsedX + collapsedWidth / 2, collapsedY + collapsedHeight - 5);

                // Store collapsed bounds
                panel.collapsedBounds = {
                    x: collapsedX,
                    y: collapsedY,
                    width: collapsedWidth,
                    height: collapsedHeight
                };

                return;
            }

            // Normal expanded panel
            // Draw filled rounded rectangle
            ctx.fillStyle = color;
            this.roundRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, 12);
            ctx.fill();

            // Draw dashed outline with lighter color
            ctx.strokeStyle = this.getLighterColor(color);
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 4]);
            this.roundRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, 12);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw grip handle at top center
            const gripX = bounds.x + bounds.width / 2;
            const gripY = bounds.y + 16;
            const gripWidth = 60;
            const gripHeight = 20;

            // Grip background
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            this.roundRect(ctx, gripX - gripWidth / 2, gripY - gripHeight / 2, gripWidth, gripHeight, 4);
            ctx.fill();

            // Grip dots/lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            for (let i = 0; i < 3; i++) {
                const lineY = gripY - 4 + i * 4;
                ctx.beginPath();
                ctx.moveTo(gripX - 15, lineY);
                ctx.lineTo(gripX + 15, lineY);
                ctx.stroke();
            }

            // Store grip position for interaction
            panel.grip = {
                x: gripX,
                y: gripY,
                width: gripWidth,
                height: gripHeight
            };

            // Draw edit buttons in top-right corner (REMOVE colorButton)
            const buttonY = bounds.y + 20;
            const collapseButtonX = bounds.x + 20;
            const labelButtonX = bounds.x + bounds.width - 30;

            // Collapse button (left side)
            ctx.fillStyle = 'rgba(255, 152, 0, 0.8)';
            ctx.beginPath();
            ctx.arc(collapseButtonX, buttonY, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('▲', collapseButtonX, buttonY + 4);

            // Label button (REMOVED COLOR BUTTON)
            ctx.fillStyle = 'rgba(156, 39, 176, 0.8)';
            ctx.beginPath();
            ctx.arc(labelButtonX, buttonY, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('✎', labelButtonX, buttonY + 4);

            // Store button positions for interaction
            panel.collapseButton = { x: collapseButtonX, y: buttonY, radius: 10 };
            panel.labelButton = { x: labelButtonX, y: buttonY, radius: 10 };
            // REMOVED: panel.colorButton

            // Draw label at bottom
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(label, bounds.x + bounds.width / 2, bounds.y + bounds.height - 10);
        });
    }

    /**
     * Check if a point is inside a group panel button
     */
    getGroupPanelButtonHit(x, y) {
        for (let i = 0; i < this.groupPanels.length; i++) {
            const panel = this.groupPanels[i];

            // Check grip first
            if (panel.grip) {
                const gripLeft = panel.grip.x - panel.grip.width / 2;
                const gripRight = panel.grip.x + panel.grip.width / 2;
                const gripTop = panel.grip.y - panel.grip.height / 2;
                const gripBottom = panel.grip.y + panel.grip.height / 2;

                if (x >= gripLeft && x <= gripRight && y >= gripTop && y <= gripBottom) {
                    return { panel, button: 'grip', index: i };
                }
            }

            // Check collapse/expand button
            if (panel.collapseButton) {
                const dx = x - panel.collapseButton.x;
                const dy = y - panel.collapseButton.y;
                if (Math.sqrt(dx * dx + dy * dy) <= panel.collapseButton.radius) {
                    return { panel, button: 'collapse', index: i };
                }
            }

            if (panel.expandButton) {
                const dx = x - panel.expandButton.x;
                const dy = y - panel.expandButton.y;
                if (Math.sqrt(dx * dx + dy * dy) <= panel.expandButton.radius) {
                    return { panel, button: 'expand', index: i };
                }
            }

            if (panel.labelButton) {
                const dx = x - panel.labelButton.x;
                const dy = y - panel.labelButton.y;
                if (Math.sqrt(dx * dx + dy * dy) <= panel.labelButton.radius) {
                    return { panel, button: 'label', index: i };
                }
            }
        }
        return null;
    }

    /**
     * Handle group panel button click
     */
    handleGroupPanelButtonClick(hit, mouseEvent) {
        const { panel, button, index } = hit;

        if (button === 'collapse') {
            panel.collapsed = true;
            return;
        } else if (button === 'expand') {
            panel.collapsed = false;
            return;
        } else if (button === 'grip') {
            // Start dragging the group
            const rect = this.canvas.getBoundingClientRect();
            const x = (mouseEvent.clientX - rect.left - this.panOffset.x) / this.zoom;
            const y = (mouseEvent.clientY - rect.top - this.panOffset.y) / this.zoom;

            this.draggedGroupPanel = panel;

            // Store initial mouse position in canvas space (already transformed)
            this.groupPanelDragStart = { x, y };

            // Store initial bounds
            this.groupPanelInitialBounds = {
                x: panel.bounds.x,
                y: panel.bounds.y
            };

            return;
        } else if (button === 'color') {
            // Show color picker at mouse position
            const input = document.createElement('input');
            input.type = 'color';
            // Convert rgba to hex
            const match = panel.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (match) {
                const r = parseInt(match[1]).toString(16).padStart(2, '0');
                const g = parseInt(match[2]).toString(16).padStart(2, '0');
                const b = parseInt(match[3]).toString(16).padStart(2, '0');
                input.value = `#${r}${g}${b}`;
            }
            input.style.position = 'fixed';
            input.style.left = `${mouseEvent.clientX}px`;
            input.style.top = `${mouseEvent.clientY}px`;
            input.style.zIndex = '10000';
            document.body.appendChild(input);

            input.addEventListener('change', (e) => {
                const hex = e.target.value;
                const r = parseInt(hex.substr(1, 2), 16);
                const g = parseInt(hex.substr(3, 2), 16);
                const b = parseInt(hex.substr(5, 2), 16);
                const newColor = `rgba(${r}, ${g}, ${b}, 0.15)`;
                panel.color = newColor;
                panel.customColor = newColor; // Store as custom color
                document.body.removeChild(input);
            });

            input.addEventListener('blur', () => {
                setTimeout(() => {
                    if (document.body.contains(input)) {
                        document.body.removeChild(input);
                    }
                }, 100);
            });

            // Trigger click after a short delay to ensure it's rendered
            setTimeout(() => input.click(), 10);
        } else if (button === 'label') {
            // Show prompt for new label
            const newLabel = prompt('Enter group label:', panel.label);
            if (newLabel !== null && newLabel.trim() !== '') {
                const trimmedLabel = newLabel.trim();
                panel.label = trimmedLabel;
                panel.customLabel = trimmedLabel;

                // Update all nodes in this panel with the new group name
                panel.nodes.forEach(node => {
                    node.groupPanelName = trimmedLabel;
                });

                this.hasUnsavedChanges = true;
            }
        }
    }

    /**
     * Show a notification
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            border-radius: 4px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Called before closing
     */
    onBeforeClose() {
        // Stop the animation loop
        this.isActive = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Stop test module
        this.stopTestModule();

        // Remove event listeners
        if (this.boundHandlers.resize) {
            window.removeEventListener('resize', this.boundHandlers.resize);
        }
        if (this.boundHandlers.mouseup) {
            document.removeEventListener('mouseup', this.boundHandlers.mouseup);
        }
        if (this.boundHandlers.keydown) {
            document.removeEventListener('keydown', this.boundHandlers.keydown);
        }

        // Clear the canvas context
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Close any open text editor
        this.closeTextEditor();

        // Check for unsaved changes
        if (this.hasUnsavedChanges) {
            return confirm('You have unsaved changes. Close anyway?');
        }
        return true;
    }

    destroy() {
        // Stop animation loop
        this.isActive = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        // Stop test module
        this.stopTestModule();

        // NEW: Remove event listeners
        if (this.boundHandlers.resize) {
            window.removeEventListener('resize', this.boundHandlers.resize);
        }
        if (this.boundHandlers.keydown) {
            document.removeEventListener('keydown', this.boundHandlers.keydown);
        }
        if (this.boundHandlers.mouseup) {
            document.removeEventListener('mouseup', this.boundHandlers.mouseup);
        }

        // Clear references
        this.nodes = [];
        this.connections = [];
        this.selectedNodes.clear();
        this.draggedNodes.clear();
        this.canvas = null;
        this.ctx = null;
        this.testCanvas = null;
        this.testCtx = null;

        // Call parent destroy if it exists
        if (super.destroy) {
            super.destroy();
        }
    }

    /**
     * ========== NEW: UNDO/REDO SYSTEM ==========
     */

    /**
     * Save current state to undo stack
     */
    saveState() {
        const state = {
            nodes: JSON.parse(JSON.stringify(this.nodes)),
            connections: this.connections.map(conn => ({
                from: { nodeId: conn.from.node.id, portIndex: conn.from.portIndex },
                to: { nodeId: conn.to.node.id, portIndex: conn.to.portIndex }
            })),
            panOffset: { ...this.panOffset },
            zoom: this.zoom,
            moduleName: this.moduleName,
            moduleNamespace: this.moduleNamespace,
            moduleDescription: this.moduleDescription,
            moduleIcon: this.moduleIcon,
            moduleColor: this.moduleColor,
            allowMultiple: this.allowMultiple,
            drawInEditor: this.drawInEditor
        };

        this.undoStack.push(state);

        // Limit stack size
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }

        // Clear redo stack when new action is performed
        this.redoStack = [];
    }

    /**
     * Undo the last action
     */
    undo() {
        if (this.undoStack.length <= 1) {
            this.showNotification('Nothing to undo', 'warning');
            return;
        }

        // Save current state to redo stack
        const currentState = this.undoStack.pop();
        this.redoStack.push(currentState);

        // Restore previous state
        const previousState = this.undoStack[this.undoStack.length - 1];
        this.restoreState(previousState);

        this.showNotification('Undo successful', 'success');
    }

    /**
     * Redo the last undone action
     */
    redo() {
        if (this.redoStack.length === 0) {
            this.showNotification('Nothing to redo', 'warning');
            return;
        }

        const state = this.redoStack.pop();
        this.undoStack.push(state);
        this.restoreState(state);

        this.showNotification('Redo successful', 'success');
    }

    /**
     * Restore a saved state
     */
    restoreState(state) {
        this.nodes = JSON.parse(JSON.stringify(state.nodes));

        // Rebuild connections with proper node references
        const nodeMap = new Map();
        this.nodes.forEach(node => nodeMap.set(node.id, node));

        this.connections = state.connections.map(conn => {
            const fromNode = nodeMap.get(conn.from.nodeId);
            const toNode = nodeMap.get(conn.to.nodeId);

            if (!fromNode || !toNode) return null;

            return {
                from: { node: fromNode, portIndex: conn.from.portIndex, isOutput: true },
                to: { node: toNode, portIndex: conn.to.portIndex, isOutput: false }
            };
        }).filter(conn => conn !== null);

        this.panOffset = { ...state.panOffset };
        this.zoom = state.zoom;
        this.moduleName = state.moduleName;
        this.moduleNamespace = state.moduleNamespace;
        this.moduleDescription = state.moduleDescription;
        this.moduleIcon = state.moduleIcon;
        this.moduleColor = state.moduleColor;
        this.allowMultiple = state.allowMultiple;
        this.drawInEditor = state.drawInEditor;

        this.selectedNode = null;
        this.hasUnsavedChanges = true;
    }

    /**
 * ========== NEW: MINIMAP FEATURE ==========
 */

    /**
     * Create minimap canvas
     */
    createMinimap() {
        const canvasContainer = this.canvas.parentElement;

        this.minimapCanvas = document.createElement('canvas');
        this.minimapCanvas.width = 200;
        this.minimapCanvas.height = 150;
        this.minimapCanvas.style.cssText = `
        position: absolute;
        bottom: 20px;
        right: 20px;
        background: rgba(26, 26, 26, 0.9);
        border: 2px solid #555;
        border-radius: 8px;
        z-index: 100;
        cursor: pointer;
        display: ${this.showMinimap ? 'block' : 'none'};
    `;

        canvasContainer.appendChild(this.minimapCanvas);
        this.minimapCtx = this.minimapCanvas.getContext('2d');

        // Add click handler to jump to position
        this.minimapCanvas.addEventListener('click', (e) => {
            const rect = this.minimapCanvas.getBoundingClientRect();
            const clickX = (e.clientX - rect.left) / rect.width;
            const clickY = (e.clientY - rect.top) / rect.height;

            // Calculate the bounds of all nodes
            const bounds = this.calculateNodeBounds();

            // Convert minimap click to canvas coordinates
            const targetX = bounds.minX + (bounds.maxX - bounds.minX) * clickX;
            const targetY = bounds.minY + (bounds.maxY - bounds.minY) * clickY;

            // Center the view on the clicked position
            this.panOffset.x = this.canvas.width / 2 - targetX * this.zoom;
            this.panOffset.y = this.canvas.height / 2 - targetY * this.zoom;
        });
    }

    /**
 * Calculate bounds of all nodes
 */
    calculateNodeBounds() {
        if (this.nodes.length === 0) {
            return { minX: 0, minY: 0, maxX: 1000, maxY: 1000, width: 1000, height: 1000 };
        }

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        this.nodes.forEach(node => {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x + node.width);
            maxY = Math.max(maxY, node.y + node.height);
        });

        // Add padding
        const padding = 100;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;

        return {
            minX, minY, maxX, maxY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    /**
     * Render minimap
     */
    renderMinimap() {
        if (!this.showMinimap || !this.minimapCtx) return;

        const ctx = this.minimapCtx;
        const width = this.minimapCanvas.width;
        const height = this.minimapCanvas.height;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Calculate bounds
        const bounds = this.calculateNodeBounds();
        const scaleX = width / bounds.width;
        const scaleY = height / bounds.height;
        const scale = Math.min(scaleX, scaleY) * 0.9;

        const offsetX = (width - bounds.width * scale) / 2 - bounds.minX * scale;
        const offsetY = (height - bounds.height * scale) / 2 - bounds.minY * scale;

        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);

        // Draw nodes
        this.nodes.forEach(node => {
            ctx.fillStyle = node.color || '#4CAF50';
            ctx.fillRect(node.x, node.y, node.width, node.height);
        });

        // Draw connections
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
        ctx.lineWidth = 2 / scale;
        this.connections.forEach(conn => {
            const fromPos = this.getOutputPortPosition(conn.from.node, conn.from.portIndex);
            const toPos = this.getInputPortPosition(conn.to.node, conn.to.portIndex);

            ctx.beginPath();
            ctx.moveTo(fromPos.x, fromPos.y);
            ctx.lineTo(toPos.x, toPos.y);
            ctx.stroke();
        });

        // Draw viewport rectangle
        const viewX = -this.panOffset.x / this.zoom;
        const viewY = -this.panOffset.y / this.zoom;
        const viewW = this.canvas.width / this.zoom;
        const viewH = this.canvas.height / this.zoom;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 / scale;
        ctx.strokeRect(viewX, viewY, viewW, viewH);

        ctx.restore();
    }

    /**
     * ========== NEW: COMMAND PALETTE ==========
     */

    /**
     * Toggle command palette visibility
     */
    toggleCommandPalette() {
        if (this.commandPaletteVisible) {
            this.closeCommandPalette();
        } else {
            this.openCommandPalette();
        }
    }

    /**
     * Open command palette
     */
    openCommandPalette() {
        if (this.commandPalette) {
            this.commandPalette.remove();
        }

        this.commandPaletteVisible = true;

        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10000;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 100px;
    `;

        // Create palette container
        const palette = document.createElement('div');
        palette.style.cssText = `
        background: #2a2a2a;
        border: 2px solid #555;
        border-radius: 8px;
        width: 600px;
        max-height: 500px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    `;

        // Search input
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search nodes... (type to filter)';
        searchInput.style.cssText = `
        padding: 12px 16px;
        background: #333;
        border: none;
        border-bottom: 2px solid #555;
        color: #fff;
        font-size: 16px;
        outline: none;
        border-radius: 8px 8px 0 0;
    `;

        // Results container
        const resultsContainer = document.createElement('div');
        resultsContainer.style.cssText = `
        overflow-y: auto;
        max-height: 400px;
        padding: 8px;
    `;

        // Build node list
        const allNodes = [];
        Object.keys(this.nodeLibrary).forEach(category => {
            this.nodeLibrary[category].forEach(node => {
                allNodes.push({ ...node, category });
            });
        });

        let selectedIndex = 0;

        const renderResults = (filter = '') => {
            resultsContainer.innerHTML = '';
            selectedIndex = 0;

            const filtered = allNodes.filter(node => {
                const searchText = `${node.label} ${node.category} ${node.type}`.toLowerCase();
                return searchText.includes(filter.toLowerCase());
            });

            if (filtered.length === 0) {
                const noResults = document.createElement('div');
                noResults.textContent = 'No nodes found';
                noResults.style.cssText = 'padding: 16px; color: #999; text-align: center;';
                resultsContainer.appendChild(noResults);
                return;
            }

            filtered.forEach((node, index) => {
                const item = document.createElement('div');
                item.style.cssText = `
                padding: 12px 16px;
                cursor: pointer;
                border-radius: 4px;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 12px;
                background: ${index === selectedIndex ? '#444' : 'transparent'};
            `;

                const icon = document.createElement('i');
                if (node.icon) {
                    icon.className = node.icon;
                    icon.style.cssText = `color: ${node.color}; font-size: 20px; width: 24px;`;
                }

                const labelContainer = document.createElement('div');
                labelContainer.style.flex = '1';

                const label = document.createElement('div');
                label.textContent = node.label;
                label.style.cssText = 'color: #fff; font-size: 14px; font-weight: 500;';

                const category = document.createElement('div');
                category.textContent = node.category;
                category.style.cssText = 'color: #999; font-size: 11px; margin-top: 2px;';

                labelContainer.appendChild(label);
                labelContainer.appendChild(category);

                item.appendChild(icon);
                item.appendChild(labelContainer);

                item.addEventListener('mouseenter', () => {
                    selectedIndex = index;
                    renderResults(filter);
                });

                item.addEventListener('click', () => {
                    this.addNodeFromPalette(node);
                    this.closeCommandPalette();
                });

                resultsContainer.appendChild(item);
            });
        };

        searchInput.addEventListener('input', (e) => {
            renderResults(e.target.value);
        });

        searchInput.addEventListener('keydown', (e) => {
            const items = resultsContainer.children;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                renderResults(searchInput.value);
                items[selectedIndex]?.scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                renderResults(searchInput.value);
                items[selectedIndex]?.scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const filtered = allNodes.filter(node => {
                    const searchText = `${node.label} ${node.category} ${node.type}`.toLowerCase();
                    return searchText.includes(searchInput.value.toLowerCase());
                });
                if (filtered[selectedIndex]) {
                    this.addNodeFromPalette(filtered[selectedIndex]);
                    this.closeCommandPalette();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.closeCommandPalette();
            }
        });

        // Initial render
        renderResults();

        palette.appendChild(searchInput);
        palette.appendChild(resultsContainer);
        overlay.appendChild(palette);
        document.body.appendChild(overlay);

        this.commandPalette = overlay;

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeCommandPalette();
            }
        });

        // Focus search input
        setTimeout(() => searchInput.focus(), 50);
    }

    /**
     * Close command palette
     */
    closeCommandPalette() {
        if (this.commandPalette) {
            this.commandPalette.remove();
            this.commandPalette = null;
        }
        this.commandPaletteVisible = false;
    }

    /**
     * Add a node from the command palette
     */
    addNodeFromPalette(nodeTemplate) {
        // Add node at center of viewport
        const viewCenterX = (-this.panOffset.x + this.canvas.width / 2) / this.zoom;
        const viewCenterY = (-this.panOffset.y + this.canvas.height / 2) / this.zoom;

        const snapped = this.snapPositionToGrid(viewCenterX - 90, viewCenterY - 60);

        const newNode = {
            id: this.generateNodeId(),
            type: nodeTemplate.type,
            label: nodeTemplate.label,
            color: nodeTemplate.color,
            icon: this.getNodeIcon(nodeTemplate.type),
            x: snapped.x,
            y: snapped.y,
            width: this.snapToGridValue(180),
            height: this.snapToGridValue(this.calculateNodeHeight(nodeTemplate)),
            inputs: nodeTemplate.inputs || [],
            outputs: nodeTemplate.outputs || [],
            hasInput: nodeTemplate.hasInput || false,
            hasToggle: nodeTemplate.hasToggle || false,
            hasDropdown: nodeTemplate.hasDropdown || false,
            hasColorPicker: nodeTemplate.hasColorPicker || false,
            hasPropertyDropdown: nodeTemplate.hasPropertyDropdown || false,
            hasExposeCheckbox: nodeTemplate.hasExposeCheckbox || false,
            isGroup: nodeTemplate.isGroup || false,
            value: nodeTemplate.hasInput ? '' : (nodeTemplate.hasToggle ? false : (nodeTemplate.hasColorPicker ? '#ffffff' : null)),
            dropdownValue: nodeTemplate.dropdownOptions ? (nodeTemplate.defaultValue || nodeTemplate.dropdownOptions[0]) : '==',
            dropdownOptions: nodeTemplate.dropdownOptions || null,
            selectedProperty: null,
            exposeProperty: false,
            groupName: ''
        };

        if (newNode.isGroup) {
            newNode.nodes = [];
        }

        this.nodes.push(newNode);
        this.selectedNode = newNode;
        this.hasUnsavedChanges = true;
        this.saveState();

        this.showNotification(`Added ${nodeTemplate.label}`, 'success');
    }

    // ========================================
    // PUBLIC API METHODS FOR NODE CREATION
    // ========================================

    /**
     * Get the color for a node type from the node library
     * @param {string} type - The node type
     * @returns {string} The color hex code
     */
    getNodeColor(type) {
        for (const category in this.nodeLibrary) {
            const node = this.nodeLibrary[category].find(n => n.type === type);
            if (node) {
                return node.color;
            }
        }
        return '#666666'; // Default fallback color
    }

    /**
     * Get the node definition from the library
     * @param {string} type - The node type
     * @returns {object|null} The node definition or null if not found
     */
    getNodeDefinition(type) {
        for (const category in this.nodeLibrary) {
            const node = this.nodeLibrary[category].find(n => n.type === type);
            if (node) {
                return { ...node };
            }
        }
        return null;
    }

    /**
     * Toggle test panel visibility
     */
    toggleTestPanel() {
        this.testPanelVisible = !this.testPanelVisible;

        if (this.testPanelContainer) {
            this.testPanelContainer.style.display = this.testPanelVisible ? 'flex' : 'none';
        }

        if (this.testPanelVisible) {
            this.refreshTestModule();
        } else {
            this.stopTestModule();
        }
    }

    /**
     * Refresh/reload the test module
     */
    refreshTestModule() {
        if (!this.moduleName) {
            this.showNotification('Please enter a module name first!', 'warning');
            return;
        }

        this.logToConsole('🔬 Refreshing test module...', 'info');

        try {
            // Stop existing test
            this.stopTestModule();

            // Generate module code
            const code = this.generateModuleCode();

            // Execute the code to create the class
            eval(code);

            // Get the module class
            const TestModuleClass = eval(`${this.moduleName}`);

            // Create a minimal engine instance
            this.testEngine = this.createTestEngine();

            // Create test game object
            this.testGameObject = new GameObject('TestObject', this.testEngine);

            this.testEngine.addGameObject(this.testGameObject);

            this.testGameObject.x = this.testCanvas.width / 2;
            this.testGameObject.y = this.testCanvas.height / 2;
            this.testGameObject.width = 50;
            this.testGameObject.height = 50;

            // Add the test module to the game object
            const moduleInstance = this.testGameObject.addModule(TestModuleClass);

            // Call start if it exists
            if (moduleInstance.start) {
                moduleInstance.start();
            }

            // Start test loop
            this.startTestLoop();

            this.logToConsole('✅ Test module loaded successfully!', 'success');
            this.showNotification('Test module loaded!', 'success');

        } catch (error) {
            this.logToConsole(`❌ Test error: ${error.message}`, 'error');
            console.error('Test module error:', error);
            this.showNotification('Test failed! Check console for details.', 'error');
        }
    }

    /**
     * Create a minimal test engine
     */
    createTestEngine() {
        const testCanvas = this.testCanvas;
        const testCtx = testCanvas.getContext('2d');

        const testEngine = new Engine(testCanvas, { makeGlobal: false });
        const testInput = new InputManager();

        testEngine.input = testInput;

        return testEngine
    }

    /**
     * Start the test render loop
     */
    startTestLoop() {
        let lastTime = performance.now();

        const testLoop = () => {
            if (!this.testPanelVisible || !this.testGameObject) {
                return;
            }

            const currentTime = performance.now();
            const deltaTime = (currentTime - lastTime) / 1000;
            lastTime = currentTime;

            this.testEngine.deltaTime = deltaTime;
            this.testEngine.time += deltaTime;

            // Clear canvas
            const ctx = this.testEngine.ctx;
            ctx.fillStyle = '#27272bff';
            ctx.fillRect(0, 0, this.testCanvas.width, this.testCanvas.height);

            // Update module
            const moduleInstance = Object.values(this.testGameObject.modules)[0];
            if (moduleInstance) {
                if (moduleInstance.beginLoop) {
                    moduleInstance.beginLoop();
                }

                if (moduleInstance.loop) {
                    moduleInstance.loop(this.testEngine.deltaTime);
                }

                if (moduleInstance.update) {
                    moduleInstance.update();
                }

                if (moduleInstance.endLoop) {
                    moduleInstance.endLoop();
                }

                if (moduleInstance.draw) {
                    ctx.save();
                    moduleInstance.draw(ctx);
                    ctx.restore();
                }
            }

            // Draw game object
            ctx.save();
            ctx.translate(this.testGameObject.x, this.testGameObject.y);
            ctx.rotate(this.testGameObject.angle * Math.PI / 180);
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(-this.testGameObject.width / 2, -this.testGameObject.height / 2,
                this.testGameObject.width, this.testGameObject.height);
            ctx.restore();

            // Draw info
            ctx.fillStyle = '#fff';
            ctx.font = '10px monospace';
            ctx.fillText(`FPS: ${(1 / deltaTime).toFixed(0)}`, 10, 20);
            ctx.fillText(`Time: ${this.testEngine.time.toFixed(2)}s`, 10, 35);

            requestAnimationFrame(testLoop);
        };

        testLoop();
    }

    /**
     * Stop the test module
     */
    stopTestModule() {
        if (this.testGameObject) {
            this.testGameObject.destroy();
        }

        this.testEngine = null;
        this.testGameObject = null;

        // Clear canvas
        if (this.testCanvas && this.testCtx) {
            this.testCtx.clearRect(0, 0, this.testCanvas.width, this.testCanvas.height);
        }
    }

    /**
     * Load a JavaScript module file and convert it to visual nodes
     */
    async loadJavaScriptModule() {
        try {
            if (this.hasUnsavedChanges) {
                if (!confirm('You have unsaved changes. Load JavaScript module anyway?')) {
                    return;
                }
            }

            // Get all JavaScript files
            await window.fileBrowser.ensureDirectoryExists('Visual Modules');
            const allFiles = await window.fileBrowser.getAllFiles();

            // Filter for .js files that likely contain modules
            const jsFiles = allFiles
                .filter(file => {
                    const normalizedPath = file.path.replace(/\\/g, '/');
                    return normalizedPath.endsWith('.js');
                })
                .map(file => ({
                    name: file.name,
                    path: file.path
                }));

            if (jsFiles.length === 0) {
                this.showNotification('No JavaScript files found.', 'warning');
                return;
            }

            // Show file picker modal
            const selectedPath = await this.showFilePickerModal(jsFiles, 'Load JavaScript Module');

            if (!selectedPath) {
                return; // User cancelled
            }

            // Load the selected file
            const file = await window.fileBrowser.getFile(selectedPath);
            if (!file) {
                this.showNotification('Failed to load JavaScript file.', 'error');
                return;
            }

            // Check if it's a module file
            if (!file.content.includes('extends Module')) {
                this.showNotification('Selected file does not appear to be a Module.', 'warning');
                return;
            }

            // Parse the JavaScript module
            await this.parseJavaScriptToNodes(file.content);

            this.showNotification('JavaScript module loaded successfully!', 'success');
        } catch (error) {
            console.error('Error loading JavaScript module:', error);
            this.showNotification(`Error loading JavaScript module: ${error.message}`, 'error');
        }
    }

    /**
     * Parse JavaScript module code and convert to visual nodes
     */
    async parseJavaScriptToNodes(jsCode) {
        // Clear existing canvas
        this.nodes = [];
        this.connections = [];
        this.selectedNode = null;
        this.panOffset = { x: 0, y: 0 };
        this.zoom = 1.0;

        // Extract module metadata
        const classMatch = jsCode.match(/class\s+(\w+)\s+extends\s+Module/);
        const moduleName = classMatch ? classMatch[1] : 'CustomModule';

        const namespaceMatch = jsCode.match(/static\s+namespace\s*=\s*["']([^"']+)["']/);
        const namespace = namespaceMatch ? namespaceMatch[1] : 'Custom';

        const descriptionMatch = jsCode.match(/static\s+description\s*=\s*["']([^"']+)["']/);
        const description = descriptionMatch ? descriptionMatch[1] : '';

        const iconMatch = jsCode.match(/static\s+iconClass\s*=\s*["']([^"']+)["']/);
        const icon = iconMatch ? iconMatch[1] : 'fas fa-cube';

        const colorMatch = jsCode.match(/static\s+color\s*=\s*["']([^"']+)["']/);
        const color = colorMatch ? colorMatch[1] : '#4CAF50';

        const allowMultipleMatch = jsCode.match(/static\s+allowMultiple\s*=\s*(true|false)/);
        const allowMultiple = allowMultipleMatch ? allowMultipleMatch[1] === 'true' : true;

        const drawInEditorMatch = jsCode.match(/static\s+drawInEditor\s*=\s*(true|false)/);
        const drawInEditor = drawInEditorMatch ? drawInEditorMatch[1] === 'true' : true;

        // Set module metadata
        this.moduleName = moduleName;
        this.moduleNamespace = namespace;
        this.moduleDescription = description;
        this.moduleIcon = icon;
        this.moduleColor = color;
        this.allowMultiple = allowMultiple;
        this.drawInEditor = drawInEditor;

        // Parse methods and create groups
        const methods = this.extractMethods(jsCode);

        let currentX = 100;
        let currentY = 100;
        const groupSpacing = 100;
        const methodSpacing = 300;

        for (const method of methods) {
            // Create a group for each method
            const groupNode = this.createGroupForMethod(method, currentX, currentY);
            this.nodes.push(groupNode);

            // Collapse the group by default
            groupNode.collapsed = true;

            // Move to next position
            currentY += groupNode.height + groupSpacing;
        }

        // Refresh UI
        this.setupUI();
        this.setupCanvas();
        this.setupCanvasEventListeners();

        this.hasUnsavedChanges = false;
        this.projectPath = null;
    }

    /**
     * Extract methods from JavaScript code
     */
    extractMethods(jsCode) {
        const methods = [];

        // Match all method definitions in the class
        const methodRegex = /(?:async\s+)?(\w+)\s*\([^)]*\)\s*{/g;
        const constructorRegex = /constructor\s*\([^)]*\)\s*{/;
        const startRegex = /start\s*\(\s*\)\s*{/;
        const loopRegex = /loop\s*\(\s*\)\s*{/;
        const drawRegex = /draw\s*\([^)]*\)\s*{/;
        const onDestroyRegex = /onDestroy\s*\(\s*\)\s*{/;

        let match;

        // Find constructor
        if (constructorRegex.test(jsCode)) {
            const constructorContent = this.extractMethodContent(jsCode, 'constructor');
            methods.push({
                name: 'constructor',
                type: 'constructor',
                content: constructorContent,
                properties: this.extractPropertiesFromConstructor(constructorContent)
            });
        }

        // Find start method
        if (startRegex.test(jsCode)) {
            const startContent = this.extractMethodContent(jsCode, 'start');
            methods.push({
                name: 'start',
                type: 'start',
                content: startContent
            });
        }

        // Find loop method
        if (loopRegex.test(jsCode)) {
            const loopContent = this.extractMethodContent(jsCode, 'loop');
            methods.push({
                name: 'loop',
                type: 'loop',
                content: loopContent
            });
        }

        // Find draw method
        if (drawRegex.test(jsCode)) {
            const drawContent = this.extractMethodContent(jsCode, 'draw');
            methods.push({
                name: 'draw',
                type: 'draw',
                content: drawContent
            });
        }

        // Find onDestroy method
        if (onDestroyRegex.test(jsCode)) {
            const onDestroyContent = this.extractMethodContent(jsCode, 'onDestroy');
            methods.push({
                name: 'onDestroy',
                type: 'onDestroy',
                content: onDestroyContent
            });
        }

        // Find custom methods
        while ((match = methodRegex.exec(jsCode)) !== null) {
            const methodName = match[1];

            // Skip lifecycle methods and constructor
            if (['constructor', 'start', 'loop', 'draw', 'onDestroy', 'preload', 'beginLoop', 'endLoop'].includes(methodName)) {
                continue;
            }

            const methodContent = this.extractMethodContent(jsCode, methodName);
            methods.push({
                name: methodName,
                type: 'custom',
                content: methodContent
            });
        }

        return methods;
    }

    /**
     * Extract method content from code
     */
    extractMethodContent(jsCode, methodName) {
        const regex = new RegExp(`(?:async\\s+)?${methodName}\\s*\\([^)]*\\)\\s*{`, 'g');
        const match = regex.exec(jsCode);

        if (!match) return '';

        const startIndex = match.index + match[0].length;
        let braceCount = 1;
        let endIndex = startIndex;

        for (let i = startIndex; i < jsCode.length; i++) {
            if (jsCode[i] === '{') braceCount++;
            if (jsCode[i] === '}') braceCount--;

            if (braceCount === 0) {
                endIndex = i;
                break;
            }
        }

        return jsCode.substring(startIndex, endIndex).trim();
    }

    /**
     * Extract properties from constructor code
     */
    extractPropertiesFromConstructor(constructorContent) {
        const properties = [];
        const propertyRegex = /this\.(\w+)\s*=\s*(.+?);/g;

        let match;
        while ((match = propertyRegex.exec(constructorContent)) !== null) {
            const propName = match[1];
            const propValue = match[2].trim();

            // Determine property type from value
            let propType = 'string';
            let parsedValue = propValue;

            if (propValue === 'true' || propValue === 'false') {
                propType = 'boolean';
                parsedValue = propValue === 'true';
            } else if (!isNaN(propValue) && propValue !== '') {
                propType = 'number';
                parsedValue = parseFloat(propValue);
            } else if (propValue.startsWith('"') || propValue.startsWith("'")) {
                propType = 'string';
                parsedValue = propValue.replace(/["']/g, '');
            } else if (propValue.startsWith('#')) {
                propType = 'color';
            } else if (propValue.includes('new Vector2')) {
                propType = 'vector2';
            }

            properties.push({
                name: propName,
                type: propType,
                value: parsedValue
            });
        }

        return properties;
    }

    /**
     * Create a collapsed group node for a method
     */
    createGroupForMethod(method, x, y) {
        const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create inner nodes based on method type
        const innerNodes = [];
        const innerConnections = [];

        let nodeX = 20;
        let nodeY = 20;
        const nodeSpacing = 150;

        // Create event node (start, loop, draw, etc.)
        let eventNode = null;

        if (method.type === 'start') {
            eventNode = this.createNode('start', nodeX, nodeY);
            innerNodes.push(eventNode);
        } else if (method.type === 'loop') {
            eventNode = this.createNode('loop', nodeX, nodeY);
            innerNodes.push(eventNode);
        } else if (method.type === 'draw') {
            eventNode = this.createNode('draw', nodeX, nodeY);
            innerNodes.push(eventNode);
        } else if (method.type === 'onDestroy') {
            eventNode = this.createNode('onDestroy', nodeX, nodeY);
            innerNodes.push(eventNode);
        } else if (method.type === 'custom') {
            eventNode = this.createNode('method', nodeX, nodeY);
            eventNode.value = method.name;
            innerNodes.push(eventNode);
        }

        // For constructor, create property nodes
        if (method.type === 'constructor' && method.properties) {
            nodeY = 20;
            for (const prop of method.properties) {
                // Create setProperty node
                const setPropNode = this.createNode('setProperty', nodeX, nodeY);
                setPropNode.exposeProperty = true;
                innerNodes.push(setPropNode);

                // Create property name node
                const nameNode = this.createNode('string', nodeX + nodeSpacing, nodeY);
                nameNode.value = prop.name;
                innerNodes.push(nameNode);

                // Create property value node
                const valueNode = this.createNode(prop.type === 'boolean' ? 'boolean' :
                    prop.type === 'number' ? 'number' :
                        prop.type === 'color' ? 'color' : 'string',
                    nodeX + nodeSpacing * 2, nodeY);
                valueNode.value = prop.value;
                innerNodes.push(valueNode);

                // Connect nodes
                innerConnections.push({
                    from: { node: nameNode, portIndex: 0 },
                    to: { node: setPropNode, portIndex: setPropNode.inputs.indexOf('name') }
                });
                innerConnections.push({
                    from: { node: valueNode, portIndex: 0 },
                    to: { node: setPropNode, portIndex: setPropNode.inputs.indexOf('value') }
                });

                nodeY += 100;
            }
        }

        // Create group node
        const groupNode = {
            id: groupId,
            type: 'group',
            label: method.name.charAt(0).toUpperCase() + method.name.slice(1),
            x: x,
            y: y,
            width: 400,
            height: 300,
            inputs: ['flow'],
            outputs: ['flow'],
            color: method.type === 'start' ? '#4CAF50' :
                method.type === 'loop' ? '#2196F3' :
                    method.type === 'draw' ? '#FF9800' :
                        method.type === 'onDestroy' ? '#f44336' :
                            method.type === 'constructor' ? '#9C27B0' : '#607D8B',
            nodes: innerNodes,
            connections: innerConnections,
            collapsed: true,
            groupData: {
                nodes: innerNodes,
                connections: innerConnections
            }
        };

        return groupNode;
    }

    /**
     * Create a new node of the specified type
     * @param {string} type - The node type (e.g., 'start', 'number', 'add')
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {object} options - Additional options (value, label override, etc.)
     * @returns {object} The created node
     */
    createNode(type, x, y, options = {}) {
        const definition = this.getNodeDefinition(type);
        if (!definition) {
            console.error(`Node type "${type}" not found in library`);
            return null;
        }

        // Snap position to grid
        const snapped = this.snapPositionToGrid(x, y);

        // Snap width and height to grid
        const width = this.snapToGridValue(options.width || 180);
        const height = this.snapToGridValue(this.calculateNodeHeight(definition));

        const node = {
            id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: type,
            label: options.label || definition.label,
            color: this.getNodeColor(type),
            x: snapped.x,
            y: snapped.y,
            width: width,
            height: height,
            inputs: definition.inputs ? [...definition.inputs] : [],
            outputs: definition.outputs ? [...definition.outputs] : [],
            hasInput: definition.hasInput || false,
            hasToggle: definition.hasToggle || false,
            hasColorPicker: definition.hasColorPicker || false,
            hasDropdown: definition.hasDropdown || false,
            hasPropertyDropdown: definition.hasPropertyDropdown || false,
            hasExposeCheckbox: definition.hasExposeCheckbox || false,
            isGroup: definition.isGroup || false,
            value: options.value !== undefined ? options.value : (definition.hasToggle ? false : ''),
            exposeProperty: options.exposeProperty || false,
            groupName: options.groupName || '',
            selectedProperty: options.selectedProperty || 'none',
            dropdownValue: options.dropdownValue || '==',
            wrapFlowInBraces: options.wrapFlowInBraces !== undefined ? options.wrapFlowInBraces : true, // New property
            nodes: [],
            codeGen: definition.codeGen
        };

        return node;
    }

    /**
     * Add a node to the canvas
     * @param {object} node - The node to add (created with createNode)
     * @returns {object} The added node
     */
    addNode(node) {
        if (!node) return null;
        this.nodes.push(node);
        this.hasUnsavedChanges = true;
        return node;
    }

    /**
     * Create and add a node in one call
     * @param {string} type - The node type
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {object} options - Additional options
     * @returns {object} The created and added node
     */
    createAndAddNode(type, x, y, options = {}) {
        const node = this.createNode(type, x, y, options);
        if (node) {
            return this.addNode(node);
        }
        return null;
    }

    /**
     * Connect two nodes together
     * @param {object} fromNode - Source node
     * @param {number} fromPortIndex - Output port index
     * @param {object} toNode - Destination node
     * @param {number} toPortIndex - Input port index
     * @returns {object} The created connection
     */
    connectNodes(fromNode, fromPortIndex, toNode, toPortIndex) {
        const connection = {
            from: {
                node: fromNode,
                portIndex: fromPortIndex
            },
            to: {
                node: toNode,
                portIndex: toPortIndex
            }
        };

        this.connections.push(connection);
        this.hasUnsavedChanges = true;
        return connection;
    }

    /**
     * Clear all nodes and connections
     */
    clearCanvas() {
        this.nodes = [];
        this.connections = [];
        this.selectedNode = null;
        this.hasUnsavedChanges = true;
    }

    /**
     * Get all nodes of a specific type
     * @param {string} type - The node type to find
     * @returns {array} Array of nodes matching the type
     */
    getNodesByType(type) {
        return this.nodes.filter(n => n.type === type);
    }

    /**
     * Find a node by its ID
     * @param {number} id - The node ID
     * @returns {object|null} The node or null if not found
     */
    getNodeById(id) {
        return this.nodes.find(n => n.id === id) || null;
    }

    /**
     * Helper to calculate node height based on inputs/outputs
     */
    calculateNodeHeight(definition) {
        const inputCount = definition.inputs ? definition.inputs.length : 0;
        const outputCount = definition.outputs ? definition.outputs.length : 0;
        const maxPorts = Math.max(inputCount, outputCount);

        let baseHeight = 48; // Minimum height
        if (definition.hasInput || definition.hasToggle || definition.hasColorPicker ||
            definition.hasDropdown || definition.hasPropertyDropdown || definition.hasExposeCheckbox) {
            baseHeight += 30; // Extra space for input/controls
        }

        // Add height for ports (excluding flow ports which are at top/bottom)
        const dataInputs = definition.inputs ? definition.inputs.filter(i => i !== 'flow').length : 0;
        const dataOutputs = definition.outputs ? definition.outputs.filter(o => o !== 'flow').length : 0;
        const maxDataPorts = Math.max(dataInputs, dataOutputs);

        if (maxDataPorts > 0) {
            baseHeight += maxDataPorts * 30;
        }

        return baseHeight;
    }

    // ========================================
    // END PUBLIC API METHODS
    // ========================================
}

// Register the window
window.VisualModuleBuilderWindow = VisualModuleBuilderWindow;

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .visual-module-builder * {
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
    }
    
    .visual-module-builder input,
    .visual-module-builder textarea {
        user-select: text;
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
    }
`;
document.head.appendChild(style);

// Auto-register with FileBrowser when it's ready
window.addEventListener('load', () => {
    // Wait a bit for FileBrowser to initialize
    setTimeout(() => {
        if (window.fileBrowser && window.fileBrowser.registerEditorWindow) {
            window.fileBrowser.registerEditorWindow(VisualModuleBuilderWindow);
        }
    }, 1000);
});